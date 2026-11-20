// playground_map_surface: the map surface concern of the browser
// playground controller.
//
// Responsibility:
// The camera and GPU surface: camera pose and gestures, pointer and keyboard
// input, the raster/vector paint path, the render pump, the map controls,
// canvas sizing, and page teardown.
//
// Public exports:
//   defineMapSurface
//   installMapSurfacePhase1
//   installMapSurfacePhase2
//   installMapSurfacePhase3
//   installMapSurfacePhase4
//   installMapSurfacePhase5
//   installMapSurfacePhase6
//   installMapSurfacePhase7
//   installMapSurfacePhase8
//   installMapSurfacePhase9
//
// Every function reads shared state through the `runtime` object passed to
// `defineMapSurface` and calls helpers from other concerns through
// `runtime.services`, so this module imports no sibling concern module and
// the concern graph stays acyclic.

import {
  DEVICE_LOCATION_STATUS_IDENTIFIER,
  DEVICE_LOCATION_STOP_IDENTIFIER,
  RASTER_RETRY_BACKGROUND_COLOR,
  RASTER_RETRY_STATUS_TEXT,
  raster_descriptor_declares_live_source,
} from './map_layers.mjs';
import {
  TILE_LAYER_MODES,
} from './tile_switch.mjs';
import {
  MAP_CONTROL_ZOOM_STEP,
  MAP_CONTROL_ZOOM_REPEAT_INTERVAL_MILLISECONDS,
  COMPASS_VISIBILITY_BEARING_THRESHOLD_DEGREES,
  EASED_CAMERA_MOVE_DURATION_MILLISECONDS,
  NAVIGATION_FOLLOW_PITCH_3D_DEGREES,
  FOLLOW_BEARING_SNAP_DISTANCE_DEGREES,
  bearing_off_north_degrees,
  scale_bar_distance_label_text,
  select_scale_bar_scale,
  signed_angular_difference_degrees,
} from './map_controls.mjs';
import {
  ui_label_text,
} from './ui_strings.mjs';

export function defineMapSurface(runtime) {
  function prefers_reduced_motion() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia(runtime.shared.REDUCED_MOTION_MEDIA_QUERY).matches;
  }

  function eased_camera_move_duration_milliseconds() {
    return runtime.services.prefers_reduced_motion()
      ? 0
      : EASED_CAMERA_MOVE_DURATION_MILLISECONDS;
  }

  // The wasm surface reports Rust-side misses (Option::None) and
  // validation failures as thrown JavaScript exceptions; the playground
  // treats both as "no result" so a single culled point never aborts the
  // whole frame.
  function resolved_or_null(invoke) {
    try {
      return invoke();
    } catch (projection_failure) {
      return null;
    }
  }

  /** The page camera's pose as plain numbers, for the seams that need
   * components rather than the binding. */
  function camera_pose() {
    const center = runtime.state.camera_state.center();
    return {
      latitude: center.latitude,
      longitude: center.longitude,
      zoom: runtime.state.camera_state.zoomLevel(),
      bearing: runtime.state.camera_state.bearingDegrees(),
      pitch: runtime.state.camera_state.pitchDegrees(),
    };
  }

  /** Adopts `camera` as the page's camera and syncs the zoom, bearing and
   * pitch controls and their labels from its getters. */
  function adopt_camera(camera) {
    runtime.state.camera_state = camera;
    runtime.shared.controls.zoom.value = camera.zoomLevel();
    runtime.shared.controls.bearing.value = camera.bearingDegrees();
    runtime.shared.controls.pitch.value = camera.pitchDegrees();
    runtime.services.refresh_control_labels();
  }

  /** Adopts the current pose with the named components replaced, leaving
   * every other component at its current value. */
  function update_camera(changes) {
    const pose = runtime.services.camera_pose();
    runtime.services.adopt_camera(new window.mapTest.MapCamera(
      changes.latitude ?? pose.latitude,
      changes.longitude ?? pose.longitude,
      changes.zoom ?? pose.zoom,
      changes.bearing ?? pose.bearing,
      changes.pitch ?? pose.pitch,
    ));
  }

  /** A fresh binding for the current pose. A seam that takes a camera as
   * a parameter consumes the instance, so every hand-off builds a copy
   * instead of spending the page's stored camera. */
  function build_camera() {
    const pose = runtime.services.camera_pose();
    return new window.mapTest.MapCamera(
      pose.latitude,
      pose.longitude,
      pose.zoom,
      pose.bearing,
      pose.pitch,
    );
  }

  function refresh_control_labels() {
    runtime.shared.value_labels.zoom.textContent = runtime.state.camera_state.zoomLevel().toFixed(1);
    runtime.shared.value_labels.bearing.textContent = `${runtime.state.camera_state.bearingDegrees().toFixed(0)}°`;
    runtime.shared.value_labels.pitch.textContent = `${runtime.state.camera_state.pitchDegrees().toFixed(0)}°`;
  }

  function tile_corner_degrees(tile_x, tile_y, zoom_level) {
    const tile_count = runtime.shared.TILE_COUNT_AT_ZOOM_ZERO * 2 ** zoom_level;
    const west_degrees = (tile_x / tile_count) * runtime.shared.DEGREES_AT_ZOOM_ZERO - 180;
    const east_degrees = ((tile_x + 1) / tile_count) * runtime.shared.DEGREES_AT_ZOOM_ZERO - 180;
    const north_radians = Math.PI * (1 - (2 * tile_y) / tile_count);
    const south_radians = Math.PI * (1 - (2 * (tile_y + 1)) / tile_count);
    const north_degrees = (Math.atan(Math.sinh(north_radians)) * 180) / Math.PI;
    const south_degrees = (Math.atan(Math.sinh(south_radians)) * 180) / Math.PI;
    return [
      [north_degrees, west_degrees], [north_degrees, east_degrees],
      [south_degrees, east_degrees], [south_degrees, west_degrees],
    ];
  }

  function draw_background(context, theme_name) {
    context.fillStyle = runtime.shared.SCENE_BACKGROUND_BY_THEME[theme_name] ?? runtime.shared.SCENE_BACKGROUND_FALLBACK;
    context.fillRect(0, 0, runtime.shared.overlay_canvas.width, runtime.shared.overlay_canvas.height);
    context.strokeStyle = runtime.shared.BACKGROUND_GRID_BY_THEME[theme_name] ?? runtime.shared.BACKGROUND_GRID_FALLBACK;
    for (let x = 0; x < runtime.shared.overlay_canvas.width; x += runtime.shared.CANVAS_GRID_SIZE) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, runtime.shared.overlay_canvas.height); context.stroke();
    }
    for (let y = 0; y < runtime.shared.overlay_canvas.height; y += runtime.shared.CANVAS_GRID_SIZE) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(runtime.shared.overlay_canvas.width, y); context.stroke();
    }
  }

  function draw_tile_grid(context, camera, theme_name) {
    const projection_arguments = [
      runtime.shared.overlay_canvas.width, runtime.shared.overlay_canvas.height, runtime.shared.FIELD_OF_VIEW_DEGREES,
    ];
    const visible_tiles = runtime.services.resolved_or_null(() =>
      camera.visibleTileKeys(
        runtime.shared.overlay_canvas.width,
        runtime.shared.overlay_canvas.height,
        runtime.shared.FIELD_OF_VIEW_DEGREES,
        camera.tileZoomLevel(),
      )) ?? [];
    context.lineWidth = 1.5;
    context.font = '10px system-ui';
    for (const tile of visible_tiles) {
      const corners = runtime.services.tile_corner_degrees(tile.tileX, tile.tileY, tile.zoomLevel);
      const screen_points = corners
        .map(([latitude, longitude]) => runtime.services.resolved_or_null(() =>
          camera.projectToScreen(latitude, longitude, ...projection_arguments)))
        .filter(Boolean);
      if (screen_points.length < 3) continue;
      context.beginPath();
      context.moveTo(screen_points[0].x, screen_points[0].y);
      for (const point of screen_points.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      context.fillStyle = runtime.shared.TILE_FILL_BY_THEME[theme_name] ?? runtime.shared.TILE_FILL_BY_THEME_FALLBACK;
      context.fill();
      context.strokeStyle = runtime.shared.TILE_STROKE_BY_THEME[theme_name] ?? runtime.shared.TILE_STROKE_BY_THEME_FALLBACK;
      context.stroke();
      context.fillStyle = runtime.shared.TILE_STROKE_BY_THEME[theme_name] ?? runtime.shared.TILE_STROKE_BY_THEME_FALLBACK;
      context.fillText(`${tile.tileX}, ${tile.tileY}`, screen_points[0].x + 3, screen_points[0].y + 12);
    }
  }

  function paint_overlay(camera) {
    const context = runtime.shared.overlay_canvas.getContext('2d');
    const theme_name = runtime.services.current_theme_name();
    context.clearRect(0, 0, runtime.shared.overlay_canvas.width, runtime.shared.overlay_canvas.height);
    if (runtime.state.renderer_mode !== 'gpu') {
      // Degraded path: the overlay is the whole scene.
      runtime.services.draw_background(context, theme_name);
      runtime.services.draw_tile_grid(context, camera, theme_name);
    } else if (runtime.shared.controls.overlay.checked) {
      // GPU path: the overlay carries only the opt-in debug grid.
      runtime.services.draw_tile_grid(context, camera, theme_name);
    }
  }

  // Phone width compresses the readout to its first line only
  // (docs/ReferenceAppUX.md §1); the full facts return with the width.
  function update_readout(camera) {
    const pose = runtime.services.camera_pose();
    if (
      window.matchMedia(runtime.shared.PHONE_WIDTH_MEDIA_QUERY).matches ||
      window.matchMedia(runtime.shared.SHORT_VIEWPORT_HEIGHT_MEDIA_QUERY).matches
    ) {
      runtime.shared.readout_element.textContent =
        `mode ${runtime.state.renderer_mode} — center ` +
        `${pose.latitude.toFixed(5)}, ${pose.longitude.toFixed(5)}`;
      return;
    }
    if (runtime.state.renderer_mode === 'gpu' && runtime.state.last_frame_statistics) {
      runtime.shared.readout_element.textContent =
        `mode gpu (${runtime.state.renderer_detail})` +
        `\ncenter ${pose.latitude.toFixed(5)}, ${pose.longitude.toFixed(5)}` +
        `\nzoom ${pose.zoom.toFixed(1)}  bearing ${pose.bearing.toFixed(0)}°  pitch ${pose.pitch.toFixed(0)}°` +
        `\ntiles requested ${runtime.state.last_frame_statistics.requestedTiles} / drawn ${runtime.state.last_frame_statistics.drawnTiles} / missing ${runtime.state.last_frame_statistics.missingTiles} / fragments ${runtime.state.last_frame_statistics.drawnFragments}` +
        `\nfetch zoom level ${runtime.state.last_frame_statistics.tileZoomLevel}` +
        `\ntile resolution ${runtime.state.last_frame_statistics.tileResolution}` +
        `\noverlays triangles ${runtime.state.last_frame_statistics.overlayTriangles}`;
    } else if (runtime.state.renderer_mode === 'overlay') {
      const visible_tiles = runtime.services.resolved_or_null(() =>
        camera.visibleTileKeys(
          runtime.shared.overlay_canvas.width,
          runtime.shared.overlay_canvas.height,
          runtime.shared.FIELD_OF_VIEW_DEGREES,
          camera.tileZoomLevel(),
        )) ?? [];
      runtime.shared.readout_element.textContent =
        `mode overlay (${runtime.state.renderer_detail})` +
        `\ncenter ${pose.latitude.toFixed(5)}, ${pose.longitude.toFixed(5)}` +
        `\nzoom ${pose.zoom.toFixed(1)}  bearing ${pose.bearing.toFixed(0)}°  pitch ${pose.pitch.toFixed(0)}°` +
        `\ntiles visible @z${camera.tileZoomLevel()}: ${visible_tiles.length}`;
    }
  }

  // One render step: schedule + draw a GPU frame when the WebGPU canvas
  // is up (awaited through the serialized frame queue), repaint the 2D
  // overlay, refresh the scale bar, the compass and the readout.
  function schedule_render() {
    // A frame before the bound surface exists would read `window.mapTest`
    // as undefined (`build_camera`). Readiness draws the first frame.
    if (!runtime.state.map_surface_ready) {
      return;
    }
    // Every camera path funnels through here; the traffic layer restarts
    // its settle debounce when the pose it last asked about changed.
    runtime.services.note_camera_pose_for_traffic();
    if (runtime.state.is_page_teardown_requested) {
      return;
    }
    // A hidden tab keeps at most one frame queued; becoming visible
    // schedules that frame again.
    if (runtime.state.is_page_hidden) {
      runtime.state.render_queued = true;
      return;
    }
    if (runtime.state.render_busy) {
      runtime.state.render_queued = true;
      return;
    }
    runtime.services.run_render_step();
  }

  // A rejected `renderFrame` must never freeze the page: report the
  // failure, drop to the 2D tile-grid overlay (the documented degradation
  // path) and keep the render loop running, so the map still pans.
  function degrade_to_overlay_after_frame_failure(frame_failure) {
    const failure_text = String(frame_failure?.message ?? frame_failure);
    runtime.state.gpu_map_canvas = null;
    runtime.state.renderer_mode = 'overlay';
    runtime.state.renderer_detail = `WebGPU frame failed: ${failure_text}`;
    runtime.services.show_error_report('Render frame', failure_text);
    runtime.shared.status_line_element.setAttribute('data-readiness', 'degraded');
    runtime.shared.status_line_element.textContent =
      `${ui_label_text('readiness.chip_degraded_prefix')}2D grid`;
    runtime.services.set_overlay_controls_enabled(
      false,
      'Scene overlays draw on the WebGPU surface only; this session ' +
        `uses the 2D tile grid (${runtime.state.renderer_detail}).`,
    );
    runtime.shared.follow_demo_start_control.disabled = true;
    runtime.shared.follow_demo_live_line.textContent =
      'Simulated trips need the 3D map renderer; this browser is using ' +
      'the 2D fallback.';
    runtime.services.refresh_map_layers_panel();
  }

  /**
   * Surfaces a raster base that requested tiles and drew none: the frame
   * statistics, not a thrown frame, decide, so the retry state appears
   * after an ordinary failed fetch. The canvas paints the neutral paper
   * clear so the map never reads as a black outage; a frame that draws
   * again restores the normal raster background.
   */
  function update_raster_base_retry_state(frame_statistics) {
    if (runtime.state.renderer_mode !== 'gpu' || runtime.state.gpu_map_canvas === null) return;
    if (runtime.state.current_tile_mode !== TILE_LAYER_MODES.raster) {
      runtime.state.raster_retry_background_active = false;
      return;
    }
    const requested_tile_count = frame_statistics?.requestedTiles ?? 0;
    const drawn_tile_count = frame_statistics?.drawnTiles ?? 0;
    // The canvas reports a held retry schedule when it listed raster
    // tiles, drew none and will ask again; the zero-drawn comparison keeps
    // the page honest against a canvas that predates that field.
    const raster_frame_stalled =
      frame_statistics?.rasterTilesRetrying === true
      || (requested_tile_count > 0 && drawn_tile_count === 0);
    if (raster_frame_stalled && !runtime.state.raster_retry_background_active) {
      runtime.state.raster_retry_background_active = true;
      runtime.state.gpu_map_canvas.setBackgroundColor(
        RASTER_RETRY_BACKGROUND_COLOR.red,
        RASTER_RETRY_BACKGROUND_COLOR.green,
        RASTER_RETRY_BACKGROUND_COLOR.blue,
        RASTER_RETRY_BACKGROUND_COLOR.alpha,
      );
      runtime.services.set_base_map_status(RASTER_RETRY_STATUS_TEXT);
      runtime.services.schedule_render();
    } else if (!raster_frame_stalled && runtime.state.raster_retry_background_active) {
      runtime.state.raster_retry_background_active = false;
      runtime.services.apply_raster_base_clear_color();
      if (runtime.shared.base_map_status_element.textContent === RASTER_RETRY_STATUS_TEXT) {
        runtime.services.set_base_map_status(null);
      }
      runtime.services.schedule_render();
    }
  }

  async function run_render_step() {
    runtime.state.render_busy = true;
    try {
      if (runtime.state.renderer_mode === 'gpu' && runtime.state.gpu_map_canvas) {
        // The view adopts the page's camera, and the frame consumes its
        // own camera argument by value, so the page hands a copy.
        const frame_camera = runtime.services.build_camera();
        runtime.state.gpu_map_canvas.setCamera(frame_camera);
        const frame_start_milliseconds = performance.now();
        try {
          runtime.state.last_frame_statistics = await runtime.state.gpu_map_canvas.renderFrame(
            frame_camera, runtime.shared.FIELD_OF_VIEW_DEGREES);
          runtime.services.record_frame_performance(
            runtime.state.last_frame_statistics,
            performance.now() - frame_start_milliseconds,
          );
          runtime.services.update_raster_base_retry_state(runtime.state.last_frame_statistics);
          runtime.state.frame_draw_count += 1;
          runtime.services.pump_toward_settled_frame(runtime.state.last_frame_statistics);
        } catch (frame_failure) {
          runtime.services.degrade_to_overlay_after_frame_failure(frame_failure);
        }
      }
      const camera = runtime.services.build_camera();
      runtime.services.refresh_scale_bar(camera);
      runtime.services.paint_overlay(camera);
      runtime.services.refresh_compass_control();
      runtime.services.update_readout(camera);
      runtime.services.refresh_performance_readout();
      runtime.shared.diagnostics_facts_element.textContent = runtime.services.diagnostics_facts_text();
      if (runtime.state.current_tile_mode === TILE_LAYER_MODES.vector) {
        runtime.services.refresh_vector_base_status();
      }
    } finally {
      runtime.state.render_busy = false;
    }
    if (runtime.state.is_page_teardown_requested) {
      runtime.services.release_page_renderer();
      return;
    }
    if (runtime.state.render_queued) {
      runtime.state.render_queued = false;
      runtime.services.schedule_render();
    }
  }

  // The settled pump (§5.3's frame-settled discipline on the on-demand
  // render loop): a frame with missing tiles re-renders at a bounded
  // cadence — the fetches drain the same-origin fixtures frame by frame,
  // and unavailable fixtures never settle, so the retries stay bounded
  // and the count publishes as a frame fact (§4.1).
  function pump_toward_settled_frame(frame_statistics) {
    if (!frame_statistics) {
      runtime.state.consecutive_missing_tile_renders = 0;
      return;
    }
    // A zoom cross-fade is an animation: the next frame comes on the
    // browser's animation cadence, not the missing-tile retry cadence.
    if (frame_statistics.zoomTransitionRunning) {
      runtime.state.consecutive_missing_tile_renders = 0;
      requestAnimationFrame(() => runtime.services.schedule_render());
      return;
    }
    if (frame_statistics.missingTiles === 0) {
      runtime.state.consecutive_missing_tile_renders = 0;
      return;
    }
    runtime.state.consecutive_missing_tile_renders += 1;
    if (runtime.state.consecutive_missing_tile_renders > runtime.shared.SETTLED_PUMP_MAXIMUM_RETRY_RENDERS) return;
    runtime.state.settled_pump_rerender_count += 1;
    setTimeout(() => runtime.services.schedule_render(), runtime.shared.SETTLED_PUMP_RETRY_DELAY_MILLISECONDS);
  }

  // --- Round 11: the control cluster, scale bar, compass, pump, follow
  // demo and diagnostics (docs/ReferenceAppUX.md §4.2/§4.1/§5.3). ---

  // The scale bar (§4.2): the camera's ground answer — the
  // flat-centered approximation the contract documents — selects the
  // §2.4 ladder distance; a missing answer renders no bar (exactly the
  // native scale bar's rule).
  function refresh_scale_bar(camera) {
    // The bar is laid out in CSS pixels by the stylesheet, so the ground
    // answer is asked for the CSS viewport: on a high-density canvas the
    // drawing buffer's pixels are smaller than the bar's own unit.
    const ground_answer = runtime.services.resolved_or_null(() =>
      camera.groundMetersPerScreenPixel(
        window.innerWidth, window.innerHeight, runtime.shared.FIELD_OF_VIEW_DEGREES)) ?? null;
    runtime.state.scale_bar_selection = select_scale_bar_scale(ground_answer);
    runtime.shared.scale_bar_element.hidden = !runtime.state.scale_bar_selection;
    if (runtime.state.scale_bar_selection) {
      runtime.shared.scale_bar_label_element.textContent =
        scale_bar_distance_label_text(runtime.state.scale_bar_selection.distanceMeters);
      runtime.shared.scale_bar_line_element.style.width =
        `${Math.round(runtime.state.scale_bar_selection.widthPixels)}px`;
    }
  }

  // The compass control (§4.2): visible once the bearing is off north by
  // the token threshold; the letter rotates opposite the bearing, so it
  // always points at true north on the screen. During a guided trip the
  // control stays visible while north-up holds (M73): it is the toggle
  // that returns the camera to course-up, so hiding it at bearing 0
  // would strand the visitor in the mode.
  function refresh_compass_control() {
    const off_north_degrees_value =
      bearing_off_north_degrees(runtime.state.camera_state.bearingDegrees());
    const is_holding_north_up =
      runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_ENGAGED
        && runtime.shared.follow_camera.isNorthUp();
    runtime.shared.compass_control.hidden =
      !is_holding_north_up
      && off_north_degrees_value < COMPASS_VISIBILITY_BEARING_THRESHOLD_DEGREES;
    runtime.shared.compass_north_letter.style.transform =
      `rotate(${-runtime.state.camera_state.bearingDegrees()}deg)`;
  }

  // The my-location control's re-center affordance (§4.2/§5.3): while a
  // gesture-broken follow waits for an explicit re-engage, the control
  // takes the cluster's active look and names the act.
  function refresh_my_location_control() {
    const is_recentering =
      runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE;
    runtime.shared.my_location_control.classList.toggle('recentering', is_recentering);
    runtime.shared.my_location_control.setAttribute(
      'aria-label',
      is_recentering ? 'Re-center on my location' : 'Center on my location');
  }

  function request_pump_step() {
    if (runtime.state.pump_step_requested) return;
    runtime.state.pump_step_requested = true;
    requestAnimationFrame(runtime.services.pump_step);
  }

  function pump_step(now_milliseconds) {
    runtime.state.pump_step_requested = false;
    let pump_running = false;
    if (runtime.shared.pitch_swing_ease.is_running) {
      const [eased_pitch, pitch_finished] = runtime.shared.pitch_swing_ease.advance(now_milliseconds);
      runtime.services.update_camera({ pitch: eased_pitch });
      if (!pitch_finished) pump_running = true;
    }
    if (runtime.shared.compass_renorth_ease.is_running) {
      const [eased_bearing, renorth_finished] =
        runtime.shared.compass_renorth_ease.advance(now_milliseconds);
      runtime.services.update_camera({ bearing: eased_bearing });
      if (!renorth_finished) pump_running = true;
    }
    if (runtime.state.camera_preset_animation !== null) {
      const preset_move = runtime.state.camera_preset_animation;
      const fraction = preset_move.duration_milliseconds <= 0
        ? 1
        : (now_milliseconds - preset_move.start_milliseconds)
          / preset_move.duration_milliseconds;
      // The interpolation curve clamps the fraction and applies the
      // smoothstep easing, answering the endpoints verbatim.
      runtime.services.adopt_camera(window.mapTest.MapCamera.interpolate(
        preset_move.start_camera,
        preset_move.target_camera,
        fraction,
      ));
      if (fraction < 1) {
        pump_running = true;
      } else {
        runtime.state.camera_preset_animation = null;
      }
    }
    const follow_bearing_target = runtime.shared.follow_camera.targetBearingDegrees;
    if (runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_ENGAGED &&
        follow_bearing_target !== null) {
      const chase_delta_degrees = signed_angular_difference_degrees(
        follow_bearing_target, runtime.state.camera_state.bearingDegrees());
      if (Math.abs(chase_delta_degrees) <= FOLLOW_BEARING_SNAP_DISTANCE_DEGREES) {
        runtime.services.update_camera({ bearing: follow_bearing_target });
      } else {
        runtime.services.update_camera({
          bearing: runtime.shared.follow_bearing_chase.advance(
            runtime.state.camera_state.bearingDegrees(), follow_bearing_target, now_milliseconds),
        });
        pump_running = true;
      }
    }
    // The puck's motion rides the same pump: draw the pose for this
    // frame and stay scheduled while the motion is still running.
    const location_pose = runtime.shared.location_pose_animator.poseAt(now_milliseconds);
    if (location_pose && runtime.state.current_location_indicator !== null) {
      runtime.services.draw_location_pose(location_pose);
      if (location_pose.isAnimating) pump_running = true;
    }
    runtime.services.refresh_control_labels();
    runtime.services.schedule_render();
    if (pump_running) runtime.services.request_pump_step();
  }

  // The zoom controls (§4.2): one step per activation; while held they
  // repeat the step at the §2.4 cadence until release. Activation rides
  // the press (so a hold never double-steps at release); a keyboard or
  // synthesized activation steps through the click alone.
  function step_zoom_by_control(direction_zoom_levels) {
    runtime.services.update_camera({
      zoom: Math.min(runtime.shared.MAXIMUM_ZOOM_LEVEL, Math.max(
        runtime.shared.MINIMUM_ZOOM_LEVEL,
        runtime.state.camera_state.zoomLevel() + direction_zoom_levels * MAP_CONTROL_ZOOM_STEP)),
    });
    runtime.services.schedule_render();
  }

  function attach_zoom_control(zoom_control, direction_zoom_levels) {
    let stepped_while_held = false;
    let hold_interval_id = null;
    const stop_hold = () => {
      if (hold_interval_id !== null) clearInterval(hold_interval_id);
      hold_interval_id = null;
    };
    zoom_control.addEventListener('pointerdown', () => {
      stepped_while_held = true;
      stop_hold();
      runtime.services.step_zoom_by_control(direction_zoom_levels);
      hold_interval_id = setInterval(
        () => runtime.services.step_zoom_by_control(direction_zoom_levels),
        MAP_CONTROL_ZOOM_REPEAT_INTERVAL_MILLISECONDS);
    });
    for (const hold_ending_event_name of ['pointerup', 'pointerleave', 'pointercancel']) {
      zoom_control.addEventListener(hold_ending_event_name, stop_hold);
    }
    zoom_control.addEventListener('click', () => {
      if (!stepped_while_held) runtime.services.step_zoom_by_control(direction_zoom_levels);
      stepped_while_held = false;
    });
  }

  // The gesture-input camera seam (M3's `CameraInteraction` trait,
  // applied by the `camera_*` wasm pose helpers): the page keeps the
  // §5.1 platform glue — pointer capture, the pointer-position
  // bookkeeping and delta computation, the wheel-to-zoom delta shaping,
  // and the documented fixture zoom range ([0, 20] against the camera's
  // own [0, 24] clamp) — and every camera mutation crosses the seam, so
  // the page owns no camera math. The seam answers the full pose;
  // applying it keeps the sliders agreeing with the camera (§4.2). No
  // inertia runs after a gesture today; if one is added it stays
  // JS-side like the rest of the recognition glue (documented at the
  // seam). Answers whether a pose was applied, so callers whose gesture
  // produced no pose still end in a scheduled frame.
  function apply_camera_pose(pose) {
    if (!pose) return false;
    runtime.services.adopt_camera(new window.mapTest.MapCamera(
      pose.latitude,
      pose.longitude,
      pose.zoomLevel,
      pose.bearingDegrees,
      pose.pitchDegrees,
    ));
    runtime.services.schedule_render();
    return true;
  }

  function move_center_by_ground_delta(delta_x_pixels, delta_y_pixels) {
    runtime.services.apply_camera_pose(runtime.services.resolved_or_null(() =>
      runtime.services.build_camera().panByScreenPixels(
        delta_x_pixels,
        delta_y_pixels,
        runtime.shared.overlay_canvas.width, runtime.shared.overlay_canvas.height, runtime.shared.FIELD_OF_VIEW_DEGREES,
      )));
  }

  function set_camera_gesture_active(active) {
    if (runtime.state.gpu_map_canvas && typeof runtime.state.gpu_map_canvas.setCameraGestureActive === 'function') {
      runtime.state.gpu_map_canvas.setCameraGestureActive(active);
    }
  }

  function end_camera_gesture() {
    if (runtime.state.camera_gesture_settle_timer !== null) {
      clearTimeout(runtime.state.camera_gesture_settle_timer);
      runtime.state.camera_gesture_settle_timer = null;
    }
    runtime.services.set_camera_gesture_active(false);
    runtime.services.schedule_render();
  }

  function note_camera_gesture_in_progress(
    settleDelayMilliseconds = runtime.shared.CAMERA_GESTURE_SETTLE_DELAY_MILLISECONDS,
  ) {
    runtime.services.set_camera_gesture_active(true);
    if (runtime.state.camera_gesture_settle_timer !== null) {
      clearTimeout(runtime.state.camera_gesture_settle_timer);
    }
    runtime.state.camera_gesture_settle_timer = setTimeout(
      runtime.services.end_camera_gesture,
      settleDelayMilliseconds,
    );
  }

  // The pointer's position in the canvas' own physical pixels (the canvas
  // backing store can differ from its laid-out size).
  function pointer_to_canvas_pixels(event) {
    const canvas_rectangle = runtime.shared.overlay_canvas.getBoundingClientRect();
    return {
      x_pixels: (event.clientX - canvas_rectangle.left)
        * (runtime.shared.overlay_canvas.width / canvas_rectangle.width),
      y_pixels: (event.clientY - canvas_rectangle.top)
        * (runtime.shared.overlay_canvas.height / canvas_rectangle.height),
    };
  }

  // Zooms one level around a pointer position: the platform-recognised
  // double click / double tap, applied through the contract's focal zoom
  // member like the wheel and the cluster's zoom controls.
  function zoom_around_canvas_point(canvas_point) {
    runtime.services.note_camera_gesture_in_progress();
    runtime.services.follow_demo_note_camera_gesture();
    const zoom_target = Math.min(
      runtime.shared.MAXIMUM_ZOOM_LEVEL, runtime.state.camera_state.zoomLevel() + runtime.shared.DOUBLE_TAP_ZOOM_STEP);
    const double_tap_pose = runtime.services.resolved_or_null(() =>
      runtime.services.build_camera().zoomByLevelsAroundScreenPoint(
        zoom_target - runtime.state.camera_state.zoomLevel(),
        canvas_point.x_pixels, canvas_point.y_pixels,
        runtime.shared.overlay_canvas.width, runtime.shared.overlay_canvas.height, runtime.shared.FIELD_OF_VIEW_DEGREES,
      ));
    if (!runtime.services.apply_camera_pose(double_tap_pose)) {
      runtime.services.refresh_control_labels(); runtime.services.schedule_render();
    }
  }

  function announce_map_status(message) {
    if (runtime.state.map_status_announcement_timer !== null) {
      clearTimeout(runtime.state.map_status_announcement_timer);
    }
    runtime.state.map_status_announcement_timer = setTimeout(() => {
      runtime.state.map_status_announcement_timer = null;
      runtime.shared.map_status_element.textContent = message;
    }, runtime.shared.MAP_STATUS_ANNOUNCEMENT_DELAY_MILLISECONDS);
  }

  // Keyboard steps are CSS pixels; the canvas' backing store can differ
  // from its laid-out size, so they cross the seam scaled like pointer
  // movement.
  function keyboard_canvas_ratios() {
    const canvas_rectangle = runtime.shared.overlay_canvas.getBoundingClientRect();
    return {
      x: canvas_rectangle.width > 0
        ? runtime.shared.overlay_canvas.width / canvas_rectangle.width
        : 1,
      y: canvas_rectangle.height > 0
        ? runtime.shared.overlay_canvas.height / canvas_rectangle.height
        : 1,
    };
  }

  function keyboard_pan_by_css_pixels(delta_x_css_pixels, delta_y_css_pixels) {
    runtime.services.note_camera_gesture_in_progress();
    runtime.services.follow_demo_note_camera_gesture();
    const ratios = runtime.services.keyboard_canvas_ratios();
    runtime.services.move_center_by_ground_delta(
      delta_x_css_pixels * ratios.x, delta_y_css_pixels * ratios.y);
    const moved_center = runtime.state.camera_state.center();
    runtime.services.announce_map_status(
      `Map moved to ${moved_center.latitude.toFixed(4)}, `
      + `${moved_center.longitude.toFixed(4)}.`);
  }

  function keyboard_zoom_by_levels(delta_zoom_levels) {
    runtime.services.note_camera_gesture_in_progress();
    runtime.services.follow_demo_note_camera_gesture();
    const zoom_target = Math.min(runtime.shared.MAXIMUM_ZOOM_LEVEL, Math.max(
      runtime.shared.MINIMUM_ZOOM_LEVEL, runtime.state.camera_state.zoomLevel() + delta_zoom_levels));
    const zoom_pose = runtime.services.resolved_or_null(() =>
      runtime.services.build_camera().zoomByLevelsAroundScreenPoint(
        zoom_target - runtime.state.camera_state.zoomLevel(),
        runtime.shared.overlay_canvas.width / 2, runtime.shared.overlay_canvas.height / 2,
        runtime.shared.overlay_canvas.width, runtime.shared.overlay_canvas.height, runtime.shared.FIELD_OF_VIEW_DEGREES));
    if (!runtime.services.apply_camera_pose(zoom_pose)) {
      runtime.services.refresh_control_labels(); runtime.services.schedule_render();
    }
    runtime.services.announce_map_status(`Zoom ${runtime.state.camera_state.zoomLevel().toFixed(1)}.`);
  }

  function keyboard_rotate_by_degrees(delta_bearing_degrees) {
    runtime.services.note_camera_gesture_in_progress();
    runtime.services.follow_demo_note_camera_gesture();
    const rotate_pose = runtime.services.resolved_or_null(() =>
      runtime.services.build_camera().rotateByDegreesAroundScreenPoint(
        delta_bearing_degrees,
        runtime.shared.overlay_canvas.width / 2, runtime.shared.overlay_canvas.height / 2,
        runtime.shared.overlay_canvas.width, runtime.shared.overlay_canvas.height, runtime.shared.FIELD_OF_VIEW_DEGREES));
    if (!runtime.services.apply_camera_pose(rotate_pose)) {
      runtime.services.refresh_control_labels(); runtime.services.schedule_render();
    }
    runtime.services.announce_map_status(
      `Bearing ${Math.round(runtime.state.camera_state.bearingDegrees())} degrees.`);
  }

  function keyboard_tilt_by_degrees(delta_pitch_degrees) {
    const pitch_target = Math.min(runtime.shared.MAXIMUM_PITCH_DEGREES, Math.max(
      runtime.shared.MINIMUM_PITCH_DEGREES, runtime.state.camera_state.pitchDegrees() + delta_pitch_degrees));
    if (pitch_target === runtime.state.camera_state.pitchDegrees()) return;
    runtime.services.note_camera_gesture_in_progress(
      runtime.services.eased_camera_move_duration_milliseconds() + runtime.shared.CAMERA_GESTURE_SETTLE_DELAY_MILLISECONDS);
    runtime.services.follow_demo_note_camera_gesture();
    runtime.shared.pitch_swing_ease.begin(
      performance.now(), runtime.state.camera_state.pitchDegrees(), pitch_target,
      runtime.services.eased_camera_move_duration_milliseconds());
    runtime.services.request_pump_step();
    runtime.services.announce_map_status(`Pitch ${Math.round(pitch_target)} degrees.`);
  }

  function keyboard_reset_view() {
    runtime.services.note_camera_gesture_in_progress(
      runtime.services.eased_camera_move_duration_milliseconds() + runtime.shared.CAMERA_GESTURE_SETTLE_DELAY_MILLISECONDS);
    runtime.services.follow_demo_note_camera_gesture();
    const duration_milliseconds = runtime.services.eased_camera_move_duration_milliseconds();
    runtime.shared.pitch_swing_ease.begin(
      performance.now(), runtime.state.camera_state.pitchDegrees(), runtime.shared.MINIMUM_PITCH_DEGREES,
      duration_milliseconds);
    runtime.shared.compass_renorth_ease.begin(
      performance.now(), runtime.state.camera_state.bearingDegrees(), 0, duration_milliseconds);
    runtime.services.request_pump_step();
    runtime.services.announce_map_status(
      `View reset north and flat at zoom ${runtime.state.camera_state.zoomLevel().toFixed(1)}.`);
  }

  /**
   * Sizes both canvases in device pixels while the stylesheet keeps their
   * laid-out size in CSS pixels: on a 2× display the compositor then draws
   * the frame 1:1 instead of upscaling it, which is what keeps text and
   * line work crisp. The wasm canvas reads the same ratio from
   * `canvas.width / clientWidth`, so text, halos and overlay widths keep
   * their CSS size.
   */
  function canvas_device_pixel_ratio() {
    return Math.max(1, window.devicePixelRatio || 1);
  }

  function resize_canvases() {
    const device_pixel_ratio = runtime.services.canvas_device_pixel_ratio();
    runtime.shared.map_canvas.width = Math.round(window.innerWidth * device_pixel_ratio);
    runtime.shared.map_canvas.height = Math.round(window.innerHeight * device_pixel_ratio);
    runtime.shared.overlay_canvas.width = runtime.shared.map_canvas.width;
    runtime.shared.overlay_canvas.height = runtime.shared.map_canvas.height;
  }

  function handle_device_pixel_ratio_change() {
    runtime.services.resize_canvases();
    runtime.services.schedule_render();
    runtime.services.watch_device_pixel_ratio_changes();
  }

  /**
   * Watches the current display density. `matchMedia('(resolution: Ndppx)')`
   * changes exactly when the ratio changes, so it catches a window dragged
   * between displays and browser zoom, which never fire `resize`.
   */
  function watch_device_pixel_ratio_changes() {
    runtime.state.device_pixel_ratio_media_query?.removeEventListener(
      'change',
      runtime.services.handle_device_pixel_ratio_change,
    );
    runtime.state.device_pixel_ratio_media_query = window.matchMedia(
      `(resolution: ${runtime.services.canvas_device_pixel_ratio()}dppx)`,
    );
    runtime.state.device_pixel_ratio_media_query.addEventListener(
      'change',
      runtime.services.handle_device_pixel_ratio_change,
    );
  }

  /**
   * Releases the WebGPU canvas and the page listeners. The generated
   * `free()` drops every Rust-owned surface, device and cached payload;
   * a frame already in flight finishes first, because freeing the wasm
   * object under a live frame would invalidate its borrow.
   */
  function release_page_renderer() {
    runtime.shared.canvas_size_observer?.disconnect();
    runtime.state.device_pixel_ratio_media_query?.removeEventListener(
      'change',
      runtime.services.handle_device_pixel_ratio_change,
    );
    runtime.state.device_pixel_ratio_media_query = null;
    if (runtime.state.gpu_map_canvas !== null) {
      runtime.state.gpu_map_canvas.free();
      runtime.state.gpu_map_canvas = null;
    }
  }

  function handle_page_teardown() {
    runtime.state.is_page_teardown_requested = true;
    if (!runtime.state.render_busy) {
      runtime.services.release_page_renderer();
    }
  }

  /**
   * Creates the bound surface and everything that needs it: the GPU
   * canvas, the restored choices and the first frame.
   */
  async function install_map_surface() {
    runtime.state.map_surface_ready = true;
    runtime.state.compiled_version_value = runtime.parameters.compiled_version;
    runtime.shared.status_element.textContent = `Map ready (version ${runtime.parameters.compiled_version})`;
    try {
      // The tile resolution follows the device-pixel ratio: at or above
      // the wasm-reported threshold the GPU canvas fetches and samples
      // the recorded `@2x` (double-texel) fixtures, else the standard
      // ones, so the map stays sharp on the physical backing store.
      const retina_threshold =
        window.mapTest.devicePixelRatioThreshold();
      const tile_resolution =
        window.devicePixelRatio >= retina_threshold
          ? window.mapTest.TileResolution.Retina
          : window.mapTest.TileResolution.Standard;
      // The recorded-fixture capability tells the canvas whether this page
      // serves the same-origin `/tiles` fixtures: the dev server does, a
      // deployed page stages none and must ask its provider directly rather
      // than issue a 404 per tile.
      runtime.state.gpu_map_canvas = new window.mapTest.MapView(
        runtime.shared.map_canvas,
        tile_resolution,
        runtime.shared.recorded_tile_fixtures_are_served,
      );
      runtime.state.renderer_detail = `GPU adapter ${await runtime.state.gpu_map_canvas.initialize()}`;
      // Fixtures cover the recorded demo area only. The registry's live
      // raster descriptor fills every other address, so a visitor can pan
      // anywhere in the world without the map going blank; a registered
      // provider credential takes precedence inside the canvas. The
      // fallback is registered only on a deployed host or with the local
      // `?liveTiles` opt-in, and its named base row is selected the same
      // way any other raster source is.
      const live_raster_descriptor = runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.find(
        raster_descriptor_declares_live_source);
      if (live_raster_descriptor !== undefined && runtime.shared.live_tiles_enabled) {
        try {
          runtime.services.register_live_raster_fallback_source(live_raster_descriptor);
        } catch (live_source_failure) {
          // A malformed registry template is a page bug, not a reason to
          // lose the map: report it in the diagnostics readout.
          runtime.services.show_error_report(
            'Live raster tile source',
            String(live_source_failure?.message ?? live_source_failure),
          );
        }
      }
      runtime.state.renderer_mode = 'gpu';
    } catch (gpu_failure) {
      // Documented degradation path: no browser WebGPU (or a surface
      // failure) falls back to the 2D canvas tile-grid overlay; the
      // detail is echoed verbatim, never swallowed.
      const failure_text = String(gpu_failure?.message ?? gpu_failure);
      runtime.state.gpu_map_canvas = null;
      runtime.state.renderer_mode = 'overlay';
      runtime.state.renderer_detail = `WebGPU unavailable: ${failure_text}`;
    }
    // Scene overlays draw on the GPU surface only: enable their controls
    // on the GPU path, leave them disabled with the degradation reason
    // on the 2D path (and on any GPU-surface failure).
    runtime.services.set_overlay_controls_enabled(
      runtime.state.renderer_mode === 'gpu',
      runtime.state.renderer_mode === 'gpu'
        ? ''
        : `Scene overlays draw on the WebGPU surface only; this session uses the 2D tile grid (${runtime.state.renderer_detail}).`,
    );
    // Overlays composed before the surface came up (a route planned while
    // the renderer was starting, a toggled scene) land now.
    runtime.services.apply_overlays();
    // The vector base rows were rendered before the renderer answered;
    // they become clickable now (or stay disabled on the 2D path).
    runtime.services.refresh_map_layers_panel();
    // The remembered choices land before the first interactive frame.
    // The demo plan restore loads a committed trace (never a provider);
    // the base-map switch waits until the renderer can serve it.
    await runtime.state.restore_remembered_demo_content();
    runtime.services.restore_remembered_base_map();
    // The device-location choice restores last of the map-state choices:
    // its first fix is what centers the camera, so a restored style or
    // plan framing cannot override it.
    runtime.services.restore_remembered_device_location();
    runtime.services.apply_overlays();
    // The first-run status is a plain human readiness state; the
    // renderer, adapter and version detail live in diagnostics (the
    // readout when enabled and the Advanced diagnostics block).
    runtime.shared.status_line_element.setAttribute('data-readiness',
      runtime.state.renderer_mode === 'gpu' ? 'ready' : 'degraded');
    runtime.shared.status_line_element.textContent = runtime.state.renderer_mode === 'gpu'
      ? ui_label_text('readiness.chip_ready')
      : `${ui_label_text('readiness.chip_degraded_prefix')}2D grid`;
    // The provider-capability rows need the wasm registration readback,
    // which exists only after readiness. A remembered per-capability
    // choice re-applies first, so the rows report it serving.
    runtime.services.restore_remembered_capability_providers();
    runtime.services.refresh_capability_provider_rows();
    // Diagnostics stay off unless the visitor already opened the Advanced
    // pane (`?advanced` is that explicit opt-in for the browser suite).
    // The facts pre fills without a subscription; the follow demo is a
    // GPU-only capability: on the 2D path its control stays disabled
    // with the reason (the §6.2 disabled-with-reason pattern).
    if (runtime.shared.advanced_panel.open) {
      runtime.services.open_diagnostics_stream();
    }
    runtime.shared.follow_demo_start_control.disabled = runtime.state.renderer_mode !== 'gpu';
    if (runtime.state.renderer_mode !== 'gpu') {
      runtime.shared.follow_demo_live_line.textContent =
        'Simulated trips need the 3D map renderer; this browser is using ' +
        'the 2D fallback.';
    }
    runtime.shared.diagnostics_facts_element.textContent = runtime.services.diagnostics_facts_text();
    runtime.services.refresh_control_labels();
    await runtime.services.run_render_step();
  }

  Object.assign(runtime.services, {
    prefers_reduced_motion,
    eased_camera_move_duration_milliseconds,
    resolved_or_null,
    camera_pose,
    adopt_camera,
    update_camera,
    build_camera,
    refresh_control_labels,
    tile_corner_degrees,
    draw_background,
    draw_tile_grid,
    paint_overlay,
    update_readout,
    schedule_render,
    degrade_to_overlay_after_frame_failure,
    update_raster_base_retry_state,
    run_render_step,
    pump_toward_settled_frame,
    refresh_scale_bar,
    refresh_compass_control,
    refresh_my_location_control,
    request_pump_step,
    pump_step,
    step_zoom_by_control,
    attach_zoom_control,
    apply_camera_pose,
    move_center_by_ground_delta,
    set_camera_gesture_active,
    end_camera_gesture,
    note_camera_gesture_in_progress,
    pointer_to_canvas_pixels,
    zoom_around_canvas_point,
    announce_map_status,
    keyboard_canvas_ratios,
    keyboard_pan_by_css_pixels,
    keyboard_zoom_by_levels,
    keyboard_rotate_by_degrees,
    keyboard_tilt_by_degrees,
    keyboard_reset_view,
    canvas_device_pixel_ratio,
    resize_canvases,
    handle_device_pixel_ratio_change,
    watch_device_pixel_ratio_changes,
    release_page_renderer,
    handle_page_teardown,
    install_map_surface,
  });

}

export function installMapSurfacePhase1(runtime) {
  runtime.shared.INITIAL_ZOOM_LEVEL = 14;

  /** The page's starting camera center, decimal degrees (Sacramento). */
  runtime.shared.INITIAL_CAMERA_LATITUDE_DEGREES = 38.5766;

  runtime.shared.INITIAL_CAMERA_LONGITUDE_DEGREES = -121.4944;

  runtime.shared.FIELD_OF_VIEW_DEGREES = 60;

  /** Characters a query needs before type-ahead asks the provider. */
  runtime.shared.AUTOCOMPLETE_MINIMUM_QUERY_CHARACTERS = 3;

  /** Quiet period between the last keystroke and the type-ahead request. */
  runtime.shared.AUTOCOMPLETE_DEBOUNCE_MILLISECONDS = 250;

  /** The type-ahead row cap. */
  runtime.shared.AUTOCOMPLETE_MAXIMUM_RESULTS = 5;

  runtime.shared.MINIMUM_ZOOM_LEVEL = 0;

  runtime.shared.MAXIMUM_ZOOM_LEVEL = 20;

  runtime.shared.ZOOM_WHEEL_SCALE = 0.0025;

  // Double click / double tap (round 36): one zoom level around the
  // pointer under the gesture, recognised within the interval and travel
  // the platform conventions use. A second tap beyond either bound starts
  // a fresh pair rather than zooming.
  runtime.shared.DOUBLE_TAP_ZOOM_STEP = 1.0;

  runtime.shared.DOUBLE_TAP_INTERVAL_MILLISECONDS = 350;

  runtime.shared.DOUBLE_TAP_MAXIMUM_MOVEMENT_PIXELS = 24;

  // How long after the last camera input the page reports the gesture
  // ended to the surface and draws the settle frame. The delay covers a
  // wheel's burst of ticks, one double-tap zoom and one keyboard step; a
  // pointer pan ends on its own pointerup.
  runtime.shared.CAMERA_GESTURE_SETTLE_DELAY_MILLISECONDS = 150;

  // The keyboard camera model (§4.2, accessibility): a focused map
  // answers the arrow keys with a pan, +/- with one zoom level,
  // Shift+arrows with rotation and tilt, and Home with a north-up 2D
  // reset. The pan step is CSS pixels so the same key travel reads the
  // same at every device ratio; the angle steps are degrees.
  runtime.shared.KEYBOARD_PAN_STEP_CSS_PIXELS = 100;

  runtime.shared.KEYBOARD_ZOOM_STEP_LEVELS = 1;

  runtime.shared.KEYBOARD_ROTATE_STEP_DEGREES = 5;

  runtime.shared.KEYBOARD_PITCH_STEP_DEGREES = 5;

  runtime.shared.MINIMUM_PITCH_DEGREES = 0;

  runtime.shared.MAXIMUM_PITCH_DEGREES = 60;

  // Rapid key repeats collapse into one spoken update instead of one per
  // keydown (a held arrow would otherwise queue a dozen polite messages).
  runtime.shared.MAP_STATUS_ANNOUNCEMENT_DELAY_MILLISECONDS = 150;

  // A visitor who asks the platform for less motion gets camera moves
  // applied immediately rather than eased (the stylesheet drops the
  // decorative transitions under the same media query).
  runtime.shared.REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

  runtime.shared.TILE_COUNT_AT_ZOOM_ZERO = 1;

  runtime.shared.DEGREES_AT_ZOOM_ZERO = 360;

  // Canvas 2D ignores CSS var() style strings (docs/Browser.md), so
  // the interactive 2D paints are literal constants mirroring the UX
  // doc's color tokens by name (docs/ReferenceAppUX.md §2.2): one entry
  // per theme, re-painted by the render loop after a theme switch.
  runtime.shared.SCENE_BACKGROUND_BY_THEME = { dark: '#161a20', light: '#dde5ee' };

  runtime.shared.TILE_FILL_BY_THEME = {
    dark: 'rgba(76, 141, 255, 0.10)',
    light: 'rgba(37, 99, 235, 0.08)',
  };

  runtime.shared.TILE_STROKE_BY_THEME = {
    dark: 'rgba(76, 141, 255, 0.70)',
    light: 'rgba(37, 99, 235, 0.75)',
  };

  runtime.shared.BACKGROUND_GRID_BY_THEME = {
    dark: 'rgba(255, 255, 255, 0.06)',
    light: 'rgba(0, 0, 0, 0.05)',
  };

  runtime.shared.TILE_FILL_BY_THEME_FALLBACK = runtime.shared.TILE_FILL_BY_THEME.light;

  runtime.shared.TILE_STROKE_BY_THEME_FALLBACK = runtime.shared.TILE_STROKE_BY_THEME.light;

  runtime.shared.BACKGROUND_GRID_FALLBACK = runtime.shared.BACKGROUND_GRID_BY_THEME.light;

  runtime.shared.SCENE_BACKGROUND_FALLBACK = runtime.shared.SCENE_BACKGROUND_BY_THEME.light;

  runtime.shared.CANVAS_GRID_SIZE = 32;

  // Phone-width breakpoint of the UX language; the CSS media query's
  // 560px literal mirrors this constant (see the stylesheet note above,
  // and docs/ReferenceAppUX.md §1).
  runtime.shared.PHONE_WIDTH_BREAKPOINT_PIXELS = 560;

  runtime.shared.PHONE_WIDTH_MEDIA_QUERY = `(max-width: ${runtime.shared.PHONE_WIDTH_BREAKPOINT_PIXELS}px)`;

  // Short viewports compress the readout dock like phone widths do:
  // the multi-line dock would grow into the control cluster's compass
  // slot (the mirror media query's literal is in the <style> block).
  runtime.shared.SHORT_VIEWPORT_COMPACT_HEIGHT_PIXELS = 560;

  runtime.shared.SHORT_VIEWPORT_HEIGHT_MEDIA_QUERY = `(max-height: ${runtime.shared.SHORT_VIEWPORT_COMPACT_HEIGHT_PIXELS}px)`;

  // Distance/duration formatting of the demo progress card.
  runtime.shared.METERS_PER_KILOMETER = 1000;

  runtime.shared.SECONDS_PER_MINUTE = 60;
}

export function installMapSurfacePhase2(runtime) {
  runtime.shared.map_canvas = document.getElementById('map-canvas');

  runtime.shared.overlay_canvas = document.getElementById('map-overlay');

  // The control sheet's own element: the route framing's insets keep the
  // planned route clear of it (docs/ReferenceAppUX.md §4.2).
  runtime.shared.controls_sheet_element = document.getElementById('controls');
}

export function installMapSurfacePhase3(runtime) {
  runtime.shared.status_element = document.getElementById('harness-status');

  // The keyboard model's spoken feedback (polite live region, visually
  // hidden): pan announces the new center, zoom the level, rotation the
  // bearing and tilt the pitch, so a screen-reader user can confirm every
  // keypress without seeing the frame.
  runtime.shared.map_status_element = document.getElementById('map-status');

  runtime.shared.status_line_element = document.getElementById('status-line');

  runtime.shared.readout_element = document.getElementById('readout');

  runtime.shared.renderer_readout_control = document.getElementById('renderer-readout-control');
}

export function installMapSurfacePhase4(runtime) {
  runtime.shared.controls = {
    zoom: document.getElementById('zoom-control'),
    bearing: document.getElementById('bearing-control'),
    pitch: document.getElementById('pitch-control'),
    overlay: document.getElementById('overlay-control'),
  };

  runtime.shared.value_labels = {
    zoom: document.getElementById('zoom-value'),
    bearing: document.getElementById('bearing-value'),
    pitch: document.getElementById('pitch-value'),
  };

  // The round-11 control cluster, scale bar, follow demo and
  // diagnostics elements (docs/ReferenceAppUX.md §4.2/§4.1).
  runtime.shared.compass_control = document.getElementById('compass-control');

  runtime.shared.compass_north_letter = document.getElementById('compass-north-letter');

  runtime.shared.zoom_out_control = document.getElementById('zoom-out-control');

  runtime.shared.zoom_in_control = document.getElementById('zoom-in-control');

  runtime.shared.my_location_control = document.getElementById('my-location-control');

  runtime.shared.device_navigation_control = document.getElementById('device-navigation-control');

  // The device-location state row lives in the layers panel; the settings
  // sheet's detail line keeps the navigation and fix prose.
  runtime.shared.device_location_status = document.getElementById(DEVICE_LOCATION_STATUS_IDENTIFIER);

  runtime.shared.device_location_stop_control =
    document.getElementById(DEVICE_LOCATION_STOP_IDENTIFIER);

  runtime.shared.device_location_detail = document.getElementById('device-location-detail');

  runtime.shared.plane_toggle_control = document.getElementById('plane-toggle-control');

  runtime.shared.scale_bar_element = document.getElementById('scale-bar-overlay');

  runtime.shared.scale_bar_label_element = document.getElementById('scale-bar-label-text');

  runtime.shared.scale_bar_line_element = document.getElementById('scale-bar-line');

  runtime.shared.follow_demo_start_control = document.getElementById('follow-demo-start-control');

  runtime.shared.follow_demo_live_line = document.getElementById('follow-demo-live-line');

  runtime.shared.follow_demo_playback_row = document.getElementById('follow-demo-playback');

  runtime.shared.follow_demo_speed_controls = document.getElementById('follow-demo-speed-controls');

  runtime.shared.follow_demo_pause_control = document.getElementById('follow-demo-pause-control');

  runtime.shared.follow_demo_seek_control = document.getElementById('follow-demo-seek-control');

  runtime.shared.follow_demo_seek_row = document.getElementById('follow-demo-seek-row');

  runtime.shared.diagnostics_refresh_control = document.getElementById('diagnostics-refresh-control');

  runtime.shared.diagnostics_facts_element = document.getElementById('diagnostics-facts-lines');

  runtime.shared.diagnostics_event_lines = document.getElementById('diagnostics-event-lines');
}

export function installMapSurfacePhase5(runtime) {
  // The page's camera: the wasm binding holds the one pose the page
  // manipulates, and it is replaced (never mutated) when a new pose is
  // adopted because the binding is an immutable value type.
  runtime.state.camera_state = new window.mapTest.MapCamera(
    runtime.shared.INITIAL_CAMERA_LATITUDE_DEGREES,
    runtime.shared.INITIAL_CAMERA_LONGITUDE_DEGREES,
    runtime.shared.INITIAL_ZOOM_LEVEL,
    0,
    0,
  );

  // Renderer mode reporting, read by the Playwright suite: 'gpu' once
  // the WebGPU canvas initialized, 'overlay' after the documented
  // degradation path ran, null until readiness resolved.
  runtime.state.renderer_mode = null;

  runtime.state.renderer_detail = '';

  // The compiled SDK version, shown in diagnostics only: the first-run
  // status line stays a plain readiness state.
  runtime.state.compiled_version_value = null;

  // The wasm GPU canvas binding, set once `mapTestReady` resolved.
  runtime.state.gpu_map_canvas = null;

  // Whether the bound wasm surface exists yet: the page's module body
  // runs while `init()` may still be fetching the binary, and a layout
  // observer can fire before that promise resolves, so a frame asked for
  // before readiness is dropped rather than built against a missing
  // surface. The ready handler draws the first frame itself.
  runtime.state.map_surface_ready = false;

  // GPU frames run one at a time; a change during a frame queues a
  // follow-up re-render instead of overlapping `renderFrame` calls.
  runtime.state.render_busy = false;

  runtime.state.render_queued = false;

  runtime.state.last_frame_statistics = null;

  // Whether the raster retry background is painted: a frame that asked
  // for tiles and drew none shows neutral paper; a later frame that draws
  // restores the normal raster clear.
  runtime.state.raster_retry_background_active = false;

  // The base-map rows render before the renderer answers; the vector
  // rows stay disabled until it does (a click is never a silent no-op).
  runtime.services.refresh_map_layers_panel();

  window.mapRendererMode = () => runtime.state.renderer_mode;

  window.mapRendererDetail = () => runtime.state.renderer_detail;

  // The live GPU canvas binding, read by the failure-injection test so a
  // rejected frame can be forced without touching production behaviour.
  window.mapGpuCanvas = () => runtime.state.gpu_map_canvas;

  // The last GPU frame's statistics with the live traffic-cache readback
  // merged in, so one read answers both the tile pipeline's counts and the
  // traffic cache's counters. Every field the frame object already
  // reported keeps its value; `trafficFlowCache` is null without a cache.
  window.mapLastFrameStats = () => runtime.state.last_frame_statistics === null
    ? null
    : {
      ...runtime.state.last_frame_statistics,
      trafficFlowCache: runtime.services.read_traffic_flow_cache_statistics(),
    };

  // The completed-frame counter and the render seam the page-lifecycle
  // test uses to ask for a frame while the tab reports itself hidden.
  window.mapFramesDrawn = () => runtime.state.frame_draw_count;

  window.mapRequestRenderForTest = () => runtime.services.schedule_render();

  // The live camera state, read by the UX tests (docs/ReferenceAppUX.md
  // §10.1) instead of parsing the readout's presentation text. The same
  // shape as before the camera binding became the page's state.
  window.mapCameraState = () => {
    const pose = runtime.services.camera_pose();
    return {
      latitude: pose.latitude,
      longitude: pose.longitude,
      zoom: pose.zoom,
      bearing: pose.bearing,
      pitch: pose.pitch,
      rendererMode: runtime.state.renderer_mode,
    };
  };

  // --- Round-11 state (control cluster, indicator, follow demo) ---
  // The 2D/3D camera plane the cluster's toggle holds (§4.2); the
  // follow camera uses the 3D pitch when set, mirroring the native
  // reference app's toggle state.
  runtime.state.is_three_dimensional_camera = false;

  // The scale bar's currently selected scale (§4.2), recomputed per
  // rendered frame from the camera's ground answer; null renders no bar.
  runtime.state.scale_bar_selection = null;

  // The currently shown location indicator (null — no indicator — until
  // my-location or the follow demo applies one).
  runtime.state.current_location_indicator = null;

  // Frame facts of the diagnostics readout (§4.1): completed GPU frames
  // and the settled pump's retry renders (§5.3's frame-settled
  // discipline on the on-demand loop).
  runtime.state.frame_draw_count = 0;

  runtime.state.settled_pump_rerender_count = 0;

  runtime.state.consecutive_missing_tile_renders = 0;

  // The performance monitor's rolling window of completed GPU frames:
  // each entry records when the frame finished, how long the GPU call took
  // and what the frame reported, so the summary can name the cause.
  runtime.shared.frame_performance_samples = [];

  runtime.state.performance_strip_element = null;
}

export function installMapSurfacePhase6(runtime) {
  window.mapFrameFacts = () => ({
    framesDrawn: runtime.state.frame_draw_count,
    settledPumpRerenders: runtime.state.settled_pump_rerender_count,
  });

  // A prefetched tile's payload lands outside any frame (the canvas never
  // blocks a presenting frame on the network, M23), so the canvas says so
  // on its element and the page draws the frame that includes it.
  runtime.shared.MAP_TILE_ARRIVED_EVENT_NAME = 'map-tile-arrived';

  runtime.shared.map_canvas.addEventListener(runtime.shared.MAP_TILE_ARRIVED_EVENT_NAME, () => runtime.services.schedule_render());

  runtime.shared.controls.zoom.addEventListener('input', () => {
    runtime.services.update_camera({ zoom: Number(runtime.shared.controls.zoom.value) });
    runtime.services.schedule_render();
  });

  runtime.shared.controls.bearing.addEventListener('input', () => {
    runtime.services.update_camera({ bearing: Number(runtime.shared.controls.bearing.value) });
    runtime.services.schedule_render();
  });

  runtime.shared.controls.pitch.addEventListener('input', () => {
    runtime.services.update_camera({ pitch: Number(runtime.shared.controls.pitch.value) });
    runtime.services.schedule_render();
  });

  runtime.shared.controls.overlay.addEventListener('change', () => runtime.services.schedule_render());

  // The renderer readout is developer chrome, hidden until asked for
  // (Advanced → Debug). Its text keeps updating while hidden, so enabling
  // it always shows the current session facts rather than a stale frame.
  runtime.shared.renderer_readout_control.addEventListener('change', () => {
    runtime.shared.readout_element.hidden = !runtime.shared.renderer_readout_control.checked;
    if (runtime.shared.renderer_readout_control.checked) {
      runtime.services.update_readout(runtime.services.build_camera());
    }
  });
}

export function installMapSurfacePhase7(runtime) {
  // The platform pump (§5.3): the eased bearing/pitch moves and the
  // follow chase run here in the page's own frame pump — one render step
  // per pump frame; the pump stops when every owned move settled.
  runtime.state.pump_step_requested = false;

  runtime.services.attach_zoom_control(runtime.shared.zoom_out_control, -1);

  runtime.services.attach_zoom_control(runtime.shared.zoom_in_control, 1);
}

export function installMapSurfacePhase8(runtime) {
  // The 2D/3D plane toggle (§4.2): flips the plane state and swings the
  // pitch to the plane's value over the one eased-camera-move duration;
  // the follow camera uses the plane's pitch the whole trip (§5.3). The
  // label names the currently held plane (the native toggle's rule).
  runtime.shared.plane_toggle_control.addEventListener('click', () => {
    runtime.state.is_three_dimensional_camera = !runtime.state.is_three_dimensional_camera;
    runtime.shared.plane_toggle_control.textContent =
      runtime.state.is_three_dimensional_camera ? '3D' : '2D';
    // The button is a two-state toggle for assistive technology as well
    // as for the eye: pressed means the 3D plane is active.
    runtime.shared.plane_toggle_control.setAttribute(
      'aria-pressed', String(runtime.state.is_three_dimensional_camera));
    runtime.shared.plane_toggle_control.classList.toggle('primary', runtime.state.is_three_dimensional_camera);
    runtime.shared.pitch_swing_ease.begin(
      performance.now(), runtime.state.camera_state.pitchDegrees(),
      runtime.state.is_three_dimensional_camera ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0,
      runtime.services.eased_camera_move_duration_milliseconds());
    runtime.services.request_pump_step();
  });

  // The compass (§4.2): a tap eases the camera north up over the one
  // eased-camera-move duration; the pump re-renders as it swings. During
  // a guided trip the tap is a mode toggle (M73): north-up holds across
  // every following fix until the visitor chooses course-up again.
  runtime.shared.compass_control.addEventListener('click', () => {
    if (runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_ENGAGED) {
      if (runtime.shared.follow_camera.isNorthUp()) {
        runtime.shared.follow_camera.courseUp();
      } else {
        runtime.shared.follow_camera.northUp();
      }
    }
    runtime.shared.compass_renorth_ease.begin(
      performance.now(), runtime.state.camera_state.bearingDegrees(), 0,
      runtime.services.eased_camera_move_duration_milliseconds());
    runtime.services.request_pump_step();
  });
}

export function installMapSurfacePhase9(runtime) {
  // Pan tracking keeps the previous pointer position explicitly. The
  // synthesized pointer events of a scripted browser (and the Playwright
  // harness) may not carry `movementX`/`movementY`, so the frame delta is
  // computed from stored positions instead.
  runtime.state.last_pointer_position = null;

  // The camera-gesture seam (M38): the page owns gesture recognition, so
  // it tells the wasm canvas when a gesture is in progress. Every frame
  // drawn meanwhile draws the vector base from cached geometry with no
  // label assembly; ending the gesture and drawing once more resolves both
  // at the final pose. The native surfaces need no such call — their
  // platform gesture recognizers move the camera, which is the signal the
  // surface reads each frame.
  runtime.state.camera_gesture_settle_timer = null;

  runtime.state.panning = false;

  // The pointer kind of the gesture in progress: a touch double tap is
  // recognised from pointer events, and a browser-synthesized `dblclick`
  // that follows it must not zoom a second time.
  runtime.state.last_pointer_kind = 'mouse';

  runtime.state.last_touch_tap = null;

  runtime.shared.overlay_canvas.addEventListener('pointerdown', (event) => {
    runtime.state.panning = true; runtime.shared.overlay_canvas.classList.add('panning');
    runtime.state.last_pointer_kind = event.pointerType === 'touch' ? 'touch' : 'mouse';
    runtime.services.set_camera_gesture_active(true);
    runtime.services.follow_demo_note_camera_gesture();
    runtime.shared.overlay_canvas.setPointerCapture(event.pointerId);
    runtime.state.last_pointer_position = [event.clientX, event.clientY];
  });

  runtime.shared.overlay_canvas.addEventListener('pointermove', (event) => {
    if (!runtime.state.panning || !runtime.state.last_pointer_position) return;
    const delta_x_css_pixels = event.clientX - runtime.state.last_pointer_position[0];
    const delta_y_css_pixels = event.clientY - runtime.state.last_pointer_position[1];
    runtime.state.last_pointer_position = [event.clientX, event.clientY];
    // The camera takes drawing-buffer pixels; the pointer moved CSS
    // pixels, so the delta follows the canvas' own ratio.
    const canvas_rectangle = runtime.shared.overlay_canvas.getBoundingClientRect();
    const ratio_x = canvas_rectangle.width > 0
      ? runtime.shared.overlay_canvas.width / canvas_rectangle.width
      : 1;
    const ratio_y = canvas_rectangle.height > 0
      ? runtime.shared.overlay_canvas.height / canvas_rectangle.height
      : 1;
    runtime.services.move_center_by_ground_delta(
      delta_x_css_pixels * ratio_x,
      delta_y_css_pixels * ratio_y,
    );
  });

  runtime.shared.overlay_canvas.addEventListener('pointerup', (event) => {
    runtime.state.panning = false; runtime.shared.overlay_canvas.classList.remove('panning');
    runtime.services.end_camera_gesture();
    // A touch double tap zooms; pointer capture keeps the second tap on
    // the canvas, so the pair is recognised from pointer-ups alone.
    if (event.pointerType !== 'touch') return;
    const tap_point = runtime.services.pointer_to_canvas_pixels(event);
    const now_milliseconds = performance.now();
    const previous_tap = runtime.state.last_touch_tap;
    runtime.state.last_touch_tap = { atMilliseconds: now_milliseconds, ...tap_point };
    if (previous_tap === null) return;
    const interval_milliseconds = now_milliseconds - previous_tap.atMilliseconds;
    const travel_pixels = Math.hypot(
      tap_point.x_pixels - previous_tap.x_pixels,
      tap_point.y_pixels - previous_tap.y_pixels,
    );
    if (interval_milliseconds > runtime.shared.DOUBLE_TAP_INTERVAL_MILLISECONDS
      || travel_pixels > runtime.shared.DOUBLE_TAP_MAXIMUM_MOVEMENT_PIXELS) {
      return;
    }
    runtime.state.last_touch_tap = null;
    runtime.services.zoom_around_canvas_point(tap_point);
  });

  runtime.shared.overlay_canvas.addEventListener('pointercancel', () => {
    runtime.state.panning = false; runtime.shared.overlay_canvas.classList.remove('panning');
    runtime.services.end_camera_gesture();
  });

  runtime.shared.overlay_canvas.addEventListener('dblclick', (event) => {
    // A touch double tap already zoomed from its pointer pair.
    if (runtime.state.last_pointer_kind === 'touch') return;
    event.preventDefault();
    runtime.services.zoom_around_canvas_point(runtime.services.pointer_to_canvas_pixels(event));
  });

  runtime.shared.overlay_canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    runtime.services.note_camera_gesture_in_progress();
    runtime.services.follow_demo_note_camera_gesture();
    // The wheel zoom targets the documented fixture zoom range ([0, 20];
    // §5.1) before the delta crosses the seam — the camera's own [0, 24]
    // clamp would fetch tiles past the fixtures. The focal point stays
    // the viewport center, so the zoom answers exactly the pre-seam
    // behavior (the wheel event's own pixel position would zoom toward
    // the cursor — a focal zoom the seam already carries — but that is a
    // behavior change to make deliberately, not as a migration side
    // effect).
    const zoom_target = Math.min(runtime.shared.MAXIMUM_ZOOM_LEVEL, Math.max(
      runtime.shared.MINIMUM_ZOOM_LEVEL,
      runtime.state.camera_state.zoomLevel() - event.deltaY * runtime.shared.ZOOM_WHEEL_SCALE));
    const wheel_pose = runtime.services.resolved_or_null(() =>
      runtime.services.build_camera().zoomByLevelsAroundScreenPoint(
        zoom_target - runtime.state.camera_state.zoomLevel(),
        runtime.shared.overlay_canvas.width / 2, runtime.shared.overlay_canvas.height / 2,
        runtime.shared.overlay_canvas.width, runtime.shared.overlay_canvas.height, runtime.shared.FIELD_OF_VIEW_DEGREES,
      ));
    // A pose application schedules the render it needs; a gesture the
    // seam answered with no pose still ends in a scheduled frame (the
    // zero-delta wheel event the harness dispatches for the forced
    // re-present must always re-present).
    if (!runtime.services.apply_camera_pose(wheel_pose)) {
      runtime.services.refresh_control_labels(); runtime.services.schedule_render();
    }
  }, { passive: false });

  // --- The keyboard camera (§4.2 accessibility) ---
  //
  // The focused map surface answers the arrow keys with a pan, +/- with
  // one zoom level, Shift+arrows with bearing and pitch, and Home with a
  // north-up flat reset. Every camera mutation still crosses the wasm
  // seam; the page owns only the key-to-step mapping and the spoken
  // status, exactly as it owns the pointer gesture recognition. A held
  // key repeats, so the announcement is debounced to one polite update.
  runtime.state.map_status_announcement_timer = null;

  runtime.shared.overlay_canvas.addEventListener('keydown', (event) => {
    // Leave browser and operating-system chords (Ctrl/Cmd/Alt) alone;
    // only the documented unmodified and Shift-modified keys are ours.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    let handled = true;
    switch (event.key) {
      case 'ArrowLeft':
        if (event.shiftKey) {
          runtime.services.keyboard_rotate_by_degrees(-runtime.shared.KEYBOARD_ROTATE_STEP_DEGREES);
        } else {
          runtime.services.keyboard_pan_by_css_pixels(-runtime.shared.KEYBOARD_PAN_STEP_CSS_PIXELS, 0);
        }
        break;
      case 'ArrowRight':
        if (event.shiftKey) {
          runtime.services.keyboard_rotate_by_degrees(runtime.shared.KEYBOARD_ROTATE_STEP_DEGREES);
        } else {
          runtime.services.keyboard_pan_by_css_pixels(runtime.shared.KEYBOARD_PAN_STEP_CSS_PIXELS, 0);
        }
        break;
      case 'ArrowUp':
        if (event.shiftKey) {
          runtime.services.keyboard_tilt_by_degrees(runtime.shared.KEYBOARD_PITCH_STEP_DEGREES);
        } else {
          runtime.services.keyboard_pan_by_css_pixels(0, -runtime.shared.KEYBOARD_PAN_STEP_CSS_PIXELS);
        }
        break;
      case 'ArrowDown':
        if (event.shiftKey) {
          runtime.services.keyboard_tilt_by_degrees(-runtime.shared.KEYBOARD_PITCH_STEP_DEGREES);
        } else {
          runtime.services.keyboard_pan_by_css_pixels(0, runtime.shared.KEYBOARD_PAN_STEP_CSS_PIXELS);
        }
        break;
      case '+':
      case '=':
        runtime.services.keyboard_zoom_by_levels(runtime.shared.KEYBOARD_ZOOM_STEP_LEVELS);
        break;
      case '-':
      case '_':
        runtime.services.keyboard_zoom_by_levels(-runtime.shared.KEYBOARD_ZOOM_STEP_LEVELS);
        break;
      case 'Home':
        runtime.services.keyboard_reset_view();
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  });

  // --- Page lifecycle -------------------------------------------------
  // The canvas follows its layout box (not only window resize events), a
  // display-density change re-sizes the backing store, a hidden tab does
  // not schedule frames, and leaving the page releases the GPU canvas.

  /** Whether the tab is hidden; a hidden tab queues at most one render. */
  runtime.state.is_page_hidden = document.visibilityState === 'hidden';

  /** Whether the page is being torn down; no frame may start after it. */
  runtime.state.is_page_teardown_requested = false;

  /** The display-density media query that reports DPR changes. */
  runtime.state.device_pixel_ratio_media_query = null;

  runtime.shared.canvas_size_observer =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          runtime.services.resize_canvases();
          runtime.services.schedule_render();
        })
      : null;

  runtime.shared.canvas_size_observer?.observe(document.documentElement);

  document.addEventListener('visibilitychange', () => {
    runtime.state.is_page_hidden = document.visibilityState === 'hidden';
    if (!runtime.state.is_page_hidden) {
      runtime.services.resize_canvases();
      runtime.services.schedule_render();
    }
  });

  window.addEventListener('pagehide', runtime.services.handle_page_teardown);

  runtime.services.watch_device_pixel_ratio_changes();

  runtime.services.resize_canvases();

  runtime.shared.controls.zoom.value = runtime.state.camera_state.zoomLevel();

  runtime.services.refresh_control_labels();
}
