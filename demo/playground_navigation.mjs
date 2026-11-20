// playground_navigation: the navigation concern of the browser
// playground controller.
//
// Responsibility:
// Trip planning and following: the directions form, provider and recorded
// routes, the route card and framing, live navigation and speech guidance,
// device location and device navigation, and the follow-demo playback.
//
// Public exports:
//   defineNavigation
//   installNavigationPhase1
//   installNavigationPhase2
//   installNavigationPhase3
//   installNavigationPhase4
//   installNavigationPhase5
//   installNavigationPhase6
//   installNavigationPhase7
//   installNavigationPhase8
//   installNavigationPhase9
//   installNavigationPhase10
//   installNavigationPhase11
//   installNavigationPhase12
//   installNavigationPhase13
//   installNavigationPhase14
//   installNavigationPhase15
//   installNavigationPhase16
//
// Every function reads shared state through the `runtime` object passed to
// `defineNavigation` and calls helpers from other concerns through
// `runtime.services`, so this module imports no sibling concern module and
// the concern graph stays acyclic.

import {
  REFERENCE_SCENE_ARTIFACT,
} from './overlay_scenes.mjs';
import {
  DEVICE_LOCATION_STATUS_IDENTIFIER,
  DEVICE_LOCATION_STATUS_NAMES,
  MY_LOCATION_CHIP_FILLED_MARK,
  ORIGIN_MY_LOCATION_CHIP_IDENTIFIER,
  DESTINATION_MY_LOCATION_CHIP_IDENTIFIER,
  device_fix_display_text,
  device_location_status_text,
  my_location_chip_label,
} from './map_layers.mjs';
import {
  NAVIGATION_FOLLOW_PITCH_3D_DEGREES,
  FOLLOW_BEARING_CHASE_TIME_CONSTANT_MILLISECONDS,
  FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR,
  FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS,
  FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
  FOLLOW_DEMO_SPEED_METERS_PER_SECOND,
  ExponentialValueChase,
  FollowCamera,
  SmoothstepTimedEase,
  TraceCursor,
  follow_zoom_toward_trip_end,
  initial_bearing_degrees,
  polyline_fix_at_travelled_meters,
  polyline_length_meters,
  scale_bar_distance_label_text,
  trace_dispatch_interval_milliseconds,
  LocationPoseAnimator,
} from './map_controls.mjs';
import {
  ui_label_text,
  ui_label_text_with_values,
} from './ui_strings.mjs';

export function defineNavigation(runtime) {
  // The follow demo's fix cadence, derived from the artifact's
  // documented sample interval and the playback factor (5 s / 20 =
  // 250 ms — mirroring the Android demo's dispatch interval). The shared
  // crate answers the interval; the timer asks for it after the wasm
  // module is ready.
  function follow_demo_fix_interval_milliseconds() {
    return trace_dispatch_interval_milliseconds(
      FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS,
      FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR,
    );
  }

  // Empties the structured route card without detaching its child nodes
  // (the live renderers keep references to them). Used when a credential
  // change invalidates every live result.
  function clear_trip_route_card() {
    for (const route_card_line of [
      runtime.shared.trip_route_title,
      runtime.shared.trip_route_facts,
      runtime.shared.trip_route_directions,
      runtime.shared.trip_route_eta,
      runtime.shared.trip_route_maneuver,
      runtime.shared.trip_route_note,
    ]) {
      route_card_line.textContent = '';
    }
    runtime.shared.trip_route_maneuver.hidden = true;
    runtime.shared.trip_route_note.hidden = true;
    runtime.shared.trip_route_result.hidden = true;
        runtime.services.refresh_attribution_notice();
  }

  // The phone bottom sheet reserves the measured bottom dock height, so
  // the status line, scale bar and a live error strip never draw over it.
  // The dock grows and shrinks (the scale bar appears at readiness, an
  // error strip raises it), and the observed height follows every change.
  function refresh_bottom_start_dock_height() {
    const dock_height_pixels = Math.ceil(
      runtime.shared.bottom_start_dock_element.getBoundingClientRect().height,
    );
    document.documentElement.style.setProperty(
      '--bottom-start-dock-height', `${dock_height_pixels}px`);
  }

  function speech_synthesis_available() {
    return typeof window.speechSynthesis?.speak === 'function'
      && typeof window.SpeechSynthesisUtterance === 'function';
  }

  function speak_navigation_speech(speech_text) {
    if (!runtime.state.is_voice_guidance_enabled
        || speech_text === ''
        || speech_text === runtime.state.last_spoken_speech_text
        || !runtime.services.speech_synthesis_available()) {
      return;
    }
    const utterance = new window.SpeechSynthesisUtterance(speech_text);
    utterance.lang = runtime.shared.SPEECH_UTTERANCE_LANGUAGE;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    runtime.state.last_spoken_speech_text = speech_text;
  }

  function refresh_voice_guidance_control() {
    const is_available = runtime.services.speech_synthesis_available();
    runtime.shared.navigation_voice_control.disabled = !is_available;
    runtime.shared.navigation_voice_control.setAttribute(
      'aria-pressed', String(runtime.state.is_voice_guidance_enabled));
    runtime.shared.navigation_voice_control.title = is_available
      ? 'Speak turn-by-turn guidance'
      : 'Voice guidance is unavailable in this browser';
  }

  function navigation_phase_label_text(raw_phase) {
    return runtime.shared.NAVIGATION_PHASE_LABEL_BY_RAW_PHASE[raw_phase] ?? raw_phase;
  }

  /**
   * Draws one trip snapshot into the panel: the banner instruction, the
   * upcoming maneuver, the three progress rows, the phase chip and the
   * deviation alert. Values are the snapshot's own; only the formatting
   * (metres/kilometres, minutes) happens here.
   */
  function render_navigation_snapshot(snapshot) {
    if (snapshot === null) {
      runtime.services.render_navigation_idle(runtime.shared.NAVIGATION_IDLE_REASON_TEXT);
      return;
    }
    runtime.shared.navigation_demo_reason.hidden = true;
    runtime.shared.navigation_demo_preview_notice.hidden = true;
    runtime.shared.navigation_banner_overlay.hidden = false;
    const instruction = snapshot.instruction;
    document.getElementById('navigation-phase-value').textContent =
      runtime.services.navigation_phase_label_text(snapshot.phase);
    document.getElementById('banner-distance-phrase-text').textContent =
      instruction.activeManeuver.distancePhraseText;
    // The phrase line already names the distance; the banner shows the
    // provider's own sentence (as the native cards do) rather than the
    // composed variant that repeats the distance inside it.
    document.getElementById('banner-instruction-text').textContent =
      instruction.activeManeuver.providerDisplayText
      ?? instruction.activeManeuver.displayText;
    document.getElementById('upcoming-instruction-text').textContent =
      instruction.upcomingManeuver === null
        ? ''
        : `Then: ${instruction.upcomingManeuver.displayText}`;
    // The drawer's one ETA-distance line (§7.2): the same labelled
    // remaining values the native drawers show, in the same order.
    const remaining_distance_text =
      runtime.services.format_distance_text(instruction.progress.distanceRemainingMeters);
    const remaining_duration_text =
      runtime.services.format_duration_text(instruction.progress.durationRemainingSeconds);
    document.getElementById('navigation-eta-distance-value').textContent =
      remaining_distance_text;
    document.getElementById('navigation-eta-duration-value').textContent =
      remaining_duration_text;
    runtime.shared.trip_navigation_eta_line.hidden = false;
    runtime.shared.trip_navigation_eta_line.textContent =
      `${ui_label_text('navigation.eta_prefix')}: ` +
      `${ui_label_text('navigation.eta_distance_label')} ` +
      `${remaining_distance_text} · ` +
      `${ui_label_text('navigation.eta_duration_label')} ` +
      `${remaining_duration_text}`;
    runtime.services.speak_navigation_speech(instruction.activeManeuver.speechText ?? '');
    if (snapshot.deviation === null) {
      runtime.shared.deviation_alert_element.hidden = true;
      runtime.shared.deviation_alert_element.textContent = '';
    } else {
      runtime.shared.deviation_alert_element.hidden = false;
      runtime.shared.deviation_alert_element.textContent = ui_label_text_with_values(
        'navigation.deviation_alert',
        {
          offset: runtime.services.format_distance_text(
            snapshot.deviation.distanceFromRouteMeters),
        },
      );
    }
  }

  /** Clears the panel and states why it has nothing to show. */
  function render_navigation_idle(reason_text) {
    runtime.shared.navigation_demo_reason.hidden = false;
    runtime.shared.navigation_demo_reason.textContent = reason_text;
    runtime.shared.navigation_demo_preview_notice.hidden = true;
    runtime.shared.navigation_banner_overlay.hidden = true;
    document.getElementById('navigation-phase-value').textContent =
      ui_label_text('navigation.phase_not_started');
    document.getElementById('banner-distance-phrase-text').textContent = '';
    document.getElementById('banner-instruction-text').textContent = '';
    document.getElementById('upcoming-instruction-text').textContent = '';
    document.getElementById('navigation-eta-distance-value').textContent = '—';
    document.getElementById('navigation-eta-duration-value').textContent = '—';
    runtime.shared.trip_navigation_eta_line.hidden = true;
    runtime.shared.trip_navigation_eta_line.textContent = '';
    if (typeof window.speechSynthesis?.cancel === 'function') {
      window.speechSynthesis.cancel();
    }
    runtime.state.last_spoken_speech_text = null;
    runtime.shared.deviation_alert_element.hidden = true;
    runtime.shared.deviation_alert_element.textContent = '';
  }

  /**
   * Normalizes a route record to the seam's camel-case `Route` shape. A
   * recorded demo route comes from the artifact's snake-case JSON and a
   * live route already carries the seam's own fields; both feed the same
   * navigator, so one reader accepts either spelling.
   */
  function route_record_for_navigator(route) {
    const coordinate = (raw_coordinate) => ({
      latitude: raw_coordinate.latitude,
      longitude: raw_coordinate.longitude,
    });
    const step = (raw_step) => ({
      distanceMeters: raw_step.distanceMeters ?? raw_step.distance_meters,
      durationSeconds: raw_step.durationSeconds ?? raw_step.duration_seconds,
      maneuverType: raw_step.maneuverType ?? raw_step.maneuver_type,
      instructionDisplayText:
        raw_step.instructionDisplayText ?? raw_step.instruction_display_text,
      instructionSpeechText:
        raw_step.instructionSpeechText ?? raw_step.instruction_speech_text,
      shape: (raw_step.shape ?? []).map(coordinate),
    });
    const leg = (raw_leg) => ({
      distanceMeters: raw_leg.distanceMeters ?? raw_leg.distance_meters,
      durationSeconds: raw_leg.durationSeconds ?? raw_leg.duration_seconds,
      steps: (raw_leg.steps ?? []).map(step),
    });
    if (!Array.isArray(route.legs) || route.legs.length === 0) {
      throw new Error('the route carries no legs to navigate');
    }
    const bounding_box = route.boundingBox ?? route.bounding_box;
    // The seam's parser requires a box; a route without one falls back to
    // its own first and last coordinates rather than inventing data.
    let bounding_corners;
    if (bounding_box !== undefined && bounding_box !== null) {
      bounding_corners = {
        southWest: coordinate(bounding_box.southWest ?? bounding_box.south_west),
        northEast: coordinate(bounding_box.northEast ?? bounding_box.north_east),
      };
    } else {
      const last_leg = route.legs[route.legs.length - 1];
      const last_step = last_leg.steps[last_leg.steps.length - 1];
      bounding_corners = {
        southWest: coordinate(route.legs[0].steps[0].shape[0]),
        northEast: coordinate(last_step.shape[last_step.shape.length - 1]),
      };
    }
    return {
      distanceMeters: route.distanceMeters ?? route.distance_meters,
      durationSeconds: route.durationSeconds ?? route.duration_seconds,
      boundingBox: bounding_corners,
      legs: route.legs.map(leg),
    };
  }

  /** Starts live guidance on the planned route, or says why it cannot. */
  function start_live_navigation() {
    runtime.services.stop_live_navigation(runtime.shared.NAVIGATION_IDLE_REASON_TEXT);
    if (runtime.state.planned_route_record === null) {
      runtime.services.render_navigation_idle(
        'Plan a route first; live guidance follows the route you planned.');
      return;
    }
    try {
      const navigator = new window.mapTest.Navigator();
      navigator.startNavigation(
        runtime.services.route_record_for_navigator(runtime.state.planned_route_record), 'metric');
      runtime.state.live_navigator = navigator;
      runtime.services.render_navigation_snapshot(navigator.currentTripState());
    } catch (navigation_failure) {
      runtime.state.live_navigator = null;
      runtime.services.render_navigation_idle(
        `Guidance unavailable: ${String(navigation_failure)}`);
    }
  }

  /** Ends the live trip (if any) and clears the panel. */
  function stop_live_navigation(idle_reason_text = runtime.shared.NAVIGATION_IDLE_REASON_TEXT) {
    if (runtime.state.live_navigator !== null) {
      try {
        runtime.state.live_navigator.stopNavigation();
      } catch {
        // A refusal on stop cannot leave a stale trip in the panel: the
        // reference is dropped below either way.
      }
      runtime.state.live_navigator = null;
    }
    runtime.services.render_navigation_idle(idle_reason_text);
  }

  /**
   * Delivers one fix to the live navigator and answers its snapshot (or
   * null without a trip). A route-walking fix carries the demo's declared
   * accuracy; a recorded demo-plan fix carries the trace sample's own
   * reported accuracy, because a fix without accuracy is never judged.
   */
  function deliver_live_navigation_fix(
    fix,
    horizontal_accuracy_meters = FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
  ) {
    if (runtime.state.live_navigator === null) {
      return null;
    }
    return runtime.state.live_navigator.updateLocation({
      coordinate: { latitude: fix.latitude, longitude: fix.longitude },
      horizontalAccuracyMeters: horizontal_accuracy_meters,
      courseHeadingDegrees: fix.courseHeadingDegrees ?? null,
      timestampSeconds: null,
    });
  }

  /** Delivers one simulated fix to the navigator and redraws the panel. */
  function advance_live_navigation(fix) {
    if (runtime.state.live_navigator === null) {
      return;
    }
    try {
      runtime.services.render_navigation_snapshot(runtime.services.deliver_live_navigation_fix(fix));
    } catch (navigation_failure) {
      runtime.services.render_navigation_idle(
        `Guidance unavailable: ${String(navigation_failure)}`);
    }
  }

  /**
   * Brings the guidance state to the trip's current position after a
   * seek. The reducer is a forward-only progress machine: a single fix
   * teleported far down the route lands on the current step's projection
   * and never advances through the steps between. Replaying the route's
   * own fixes from the start to the position reproduces exactly the state
   * a drive there would have produced — no guidance value is invented —
   * and works for a backward seek as well.
   */
  function sync_live_navigation_to_travelled_distance() {
    if (runtime.state.live_navigator === null || runtime.state.planned_route_record === null) {
      return;
    }
    const target_meters = Math.min(
      Math.max(runtime.shared.follow_demo.travelled_meters, 0), runtime.shared.follow_demo.total_meters);
    runtime.services.start_live_navigation();
    if (runtime.state.live_navigator === null) {
      return;
    }
    const step_meters = Math.max(
      runtime.shared.LIVE_NAVIGATION_SYNC_STEP_METERS,
      target_meters / runtime.shared.LIVE_NAVIGATION_MAXIMUM_SYNC_FIX_COUNT,
    );
    let snapshot = runtime.state.live_navigator.currentTripState();
    for (
      let travelled_meters = step_meters;
      travelled_meters < target_meters;
      travelled_meters += step_meters
    ) {
      snapshot = runtime.services.deliver_live_navigation_fix(
        polyline_fix_at_travelled_meters(
          runtime.shared.follow_demo.route_polyline, travelled_meters));
    }
    snapshot = runtime.services.deliver_live_navigation_fix(
      polyline_fix_at_travelled_meters(
        runtime.shared.follow_demo.route_polyline, target_meters));
    runtime.services.render_navigation_snapshot(snapshot);
  }

  // Formats one progress distance for the demo card (metric on web).
  function format_distance_text(distance_meters) {
    return distance_meters < runtime.shared.METERS_PER_KILOMETER
      ? `${Math.round(distance_meters)} m`
      : `${(distance_meters / runtime.shared.METERS_PER_KILOMETER).toFixed(1)} km`;
  }

  // Formats one duration the way the native shells do: whole minutes and
  // the remaining seconds, or seconds alone under a minute (the shared
  // `formatDurationSeconds` rule), so a route reads the same everywhere.
  function format_duration_text(duration_seconds) {
    const whole_minutes = Math.floor(duration_seconds / runtime.shared.SECONDS_PER_MINUTE);
    const remainder_seconds =
      duration_seconds - whole_minutes * runtime.shared.SECONDS_PER_MINUTE;
    return whole_minutes > 0
      ? `${whole_minutes} min ${Math.round(remainder_seconds)} s`
      : `${Math.round(duration_seconds)} s`;
  }

  /** The active follow phase's page label (`map-refapp-core`'s answer). */
  function follow_demo_phase() {
    return runtime.shared.follow_camera.phase;
  }

  /** The target course whichever guidance path last reported one. */
  function follow_demo_target_bearing_degrees() {
    return runtime.shared.follow_camera.targetBearingDegrees ?? runtime.state.live_target_bearing_degrees;
  }

  /** The latest accepted fix, or null before the first one. */
  function latest_device_fix() {
    try {
      return runtime.state.device_position_controller?.latestFix() ?? null;
    } catch {
      return null;
    }
  }

  /** The reason the source cannot start, or null when it can. */
  function device_location_refusal_reason() {
    if (typeof navigator.geolocation?.watchPosition !== 'function') {
      return runtime.shared.DEVICE_LOCATION_UNAVAILABLE_SUPPORT_TEXT;
    }
    if (typeof window.mapTest?.PositionController !== 'function') {
      return runtime.shared.DEVICE_LOCATION_UNAVAILABLE_TEXT;
    }
    if (runtime.state.device_location_status_name === DEVICE_LOCATION_STATUS_NAMES.permissionDenied) {
      return runtime.shared.DEVICE_LOCATION_PERMISSION_DENIED_TEXT;
    }
    if (runtime.state.device_location_status_name === DEVICE_LOCATION_STATUS_NAMES.unavailable) {
      return runtime.shared.DEVICE_LOCATION_UNAVAILABLE_TEXT;
    }
    return null;
  }

  /** Reflects the source state in the panel row, the Stop action and the
   * two route-field chips. */
  function refresh_device_location_status_row() {
    runtime.shared.device_location_status.textContent =
      device_location_status_text(runtime.state.device_location_status_name);
    const source_is_on = runtime.state.device_location_watch_identifier !== null;
    runtime.shared.device_location_stop_control.hidden = !source_is_on;
    runtime.shared.my_location_control.setAttribute('aria-pressed', String(source_is_on));
    runtime.services.refresh_my_location_control();
    runtime.services.refresh_my_location_chip_states();
  }

  /** Disables each chip with the panel's reason when the source cannot
   * start, and marks the field that already holds a fix. */
  function refresh_my_location_chip_states() {
    const refusal_reason = runtime.services.device_location_refusal_reason();
    const my_location_text = ui_label_text('plan.my_location_action');
    const unavailable_text = refusal_reason === null
      ? null
      : ui_label_text_with_values(
        'plan.my_location_unavailable', { reason: refusal_reason });
    for (const [field_key, chip] of Object.entries(runtime.shared.my_location_chip_controls)) {
      if (chip === null) continue;
      const is_filled = chip.dataset.filled === 'true';
      chip.disabled = refusal_reason !== null;
      chip.title = unavailable_text ?? '';
      chip.textContent = is_filled
        ? `${my_location_text} ${MY_LOCATION_CHIP_FILLED_MARK}`
        : my_location_text;
      const accessible_label = my_location_chip_label(field_key);
      chip.setAttribute(
        'aria-label',
        refusal_reason === null
          ? accessible_label
          : `${accessible_label} — ${unavailable_text}`,
      );
    }
  }

  /** Fills the field a chip is waiting on, from one accepted fix. */
  function apply_pending_my_location_fill(coordinate) {
    if (runtime.state.pending_my_location_field_key === null) return;
    const field_key = runtime.state.pending_my_location_field_key;
    runtime.state.pending_my_location_field_key = null;
    const fill_field = runtime.shared.my_location_field_fillers.get(field_key);
    if (fill_field === undefined) return;
    fill_field(device_fix_display_text(coordinate.latitude, coordinate.longitude));
    const chip = runtime.shared.my_location_chip_controls[field_key];
    if (chip !== null) chip.dataset.filled = 'true';
    runtime.services.refresh_my_location_chip_states();
  }

  /** Starts the source if it is off and fills the chip's own field from
   * the latest fix as soon as one arrives. */
  function start_my_location_chip_fill(field_key) {
    const chip = runtime.shared.my_location_chip_controls[field_key];
    if (chip === null || chip.disabled) return;
    runtime.state.pending_my_location_field_key = field_key;
    const latest_fix = runtime.services.latest_device_fix();
    if (latest_fix !== null) {
      runtime.services.apply_pending_my_location_fill(latest_fix);
      return;
    }
    if (runtime.state.device_location_watch_identifier === null) {
      runtime.services.start_device_location();
    }
  }

  function refresh_device_location_control() {
    runtime.services.refresh_device_location_status_row();
  }

  function refresh_device_navigation_control() {
    runtime.shared.device_navigation_control.setAttribute(
      'aria-pressed', String(runtime.state.is_device_navigation_active));
    runtime.shared.device_navigation_control.textContent = runtime.state.is_device_navigation_active
      ? runtime.shared.DEVICE_NAVIGATION_STOP_TEXT
      : runtime.shared.DEVICE_NAVIGATION_START_TEXT;
  }

  /**
   * Starts guidance on the planned route from this device's fixes. The
   * location source is started when it is off; the recorded trip ends
   * first, because one trip runs at a time.
   */
  function start_device_navigation() {
    runtime.state.is_device_navigation_plan_first_pinned = false;
    if (runtime.state.planned_route_record === null) {
      runtime.state.is_device_navigation_plan_first_pinned = true;
      runtime.services.set_device_location_status(runtime.shared.DEVICE_NAVIGATION_PLAN_FIRST_TEXT);
      return;
    }
    if (runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED) {
      runtime.services.end_follow_demo_trip(runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
    }
    runtime.state.device_navigation_started_location_watch =
      runtime.state.device_location_watch_identifier === null;
    if (runtime.state.device_navigation_started_location_watch) {
      runtime.services.start_device_location();
    }
    runtime.services.start_live_navigation();
    if (runtime.state.live_navigator === null) {
      runtime.services.set_device_location_status(runtime.shared.DEVICE_NAVIGATION_GUIDANCE_UNAVAILABLE_TEXT);
      if (runtime.state.device_navigation_started_location_watch) {
        runtime.services.stop_device_location();
      }
      return;
    }
    runtime.state.is_device_navigation_active = true;
    runtime.shared.follow_bearing_chase.reset();
    runtime.services.update_camera({
      zoom: follow_zoom_toward_trip_end(1.0),
      pitch: runtime.state.is_three_dimensional_camera
        ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0,
    });
    runtime.services.refresh_device_navigation_control();
    runtime.services.set_device_location_status(runtime.shared.DEVICE_NAVIGATION_WAITING_TEXT);
    runtime.services.schedule_render();
  }

  /** Ends device-driven guidance; the location source stops only when
   * this mode started it. */
  function stop_device_navigation() {
    if (!runtime.state.is_device_navigation_active) {
      return;
    }
    runtime.state.is_device_navigation_active = false;
    runtime.services.stop_live_navigation();
    runtime.state.live_target_bearing_degrees = null;
    runtime.shared.follow_bearing_chase.reset();
    runtime.services.refresh_device_navigation_control();
    if (runtime.state.device_navigation_started_location_watch) {
      runtime.state.device_navigation_started_location_watch = false;
      runtime.services.stop_device_location();
    } else {
      runtime.services.set_device_location_status(null);
      runtime.services.schedule_render();
    }
  }

  /** Sets the settings sheet's detail line (the fix and guidance prose). */
  function set_device_location_status(status_text) {
    runtime.shared.device_location_detail.hidden = status_text === null;
    runtime.shared.device_location_detail.textContent = status_text ?? '';
  }

  /** Sets the panel row's state name and refreshes the chip availability. */
  function set_device_location_state(status_name) {
    runtime.state.device_location_status_name = status_name;
    runtime.services.refresh_device_location_status_row();
  }

  function map_geolocation_error_name(error) {
    switch (error?.code) {
      case 1:
        return 'permissionDenied';
      case 3:
        return 'timeout';
      default:
        return 'unavailable';
    }
  }

  function map_geolocation_error_text(error) {
    switch (error?.code) {
      case 1:
        return runtime.shared.DEVICE_LOCATION_PERMISSION_DENIED_TEXT;
      case 3:
        return runtime.shared.DEVICE_LOCATION_TIMEOUT_TEXT;
      default:
        return runtime.shared.DEVICE_LOCATION_UNAVAILABLE_TEXT;
    }
  }

  /** Feeds one browser fix through the controller and presents it. */
  function apply_device_position(position) {
    if (runtime.state.device_position_controller === null) return;
    const coordinate = position.coords;
    try {
      runtime.state.device_position_controller.feedFix(
        coordinate.latitude,
        coordinate.longitude,
        Number.isFinite(coordinate.accuracy) ? coordinate.accuracy : undefined,
        Number.isFinite(coordinate.heading) ? coordinate.heading : undefined,
        Date.now() / runtime.shared.MILLISECONDS_PER_SECOND,
      );
    } catch (position_failure) {
      runtime.services.set_device_location_status(String(position_failure?.message ?? position_failure));
      return;
    }
    const smoothed_course = runtime.state.device_position_controller.smoothedCourseDegrees();
    runtime.services.apply_location_indicator(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        courseHeadingDegrees: smoothed_course ?? null,
        horizontalAccuracyMeters:
          Number.isFinite(coordinate.accuracy) ? coordinate.accuracy : null,
      },
      { visualKind: 'trackingDot', showAccuracyRing: true },
    );
    // A device-driven trip follows every fix. Outside a trip only an
    // explicit request (the round control's first fix, or its re-center
    // tap) moves the camera, so a chip or a background source never
    // hijacks the visitor's view.
    const should_center = runtime.state.is_device_navigation_active
      || runtime.state.device_location_center_on_next_fix;
    runtime.state.device_location_center_on_next_fix = false;
    if (should_center) {
      const centered_camera_changes = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        zoom: runtime.state.is_device_navigation_active
          ? follow_zoom_toward_trip_end(1.0)
          : Math.max(runtime.state.camera_state.zoomLevel(), runtime.shared.DEVICE_LOCATION_ZOOM_LEVEL),
      };
      if (runtime.state.is_device_navigation_active && runtime.state.is_three_dimensional_camera) {
        centered_camera_changes.pitch = NAVIGATION_FOLLOW_PITCH_3D_DEGREES;
        if (smoothed_course !== null) {
          runtime.state.live_target_bearing_degrees = smoothed_course;
        }
      }
      runtime.services.update_camera(centered_camera_changes);
    }
    runtime.services.set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.active);
    runtime.services.apply_pending_my_location_fill(coordinate);
    runtime.services.schedule_render();
    const accuracy_text = Number.isFinite(coordinate.accuracy)
      ? ` · ±${Math.round(coordinate.accuracy)} m`
      : '';
    if (!runtime.state.is_device_navigation_plan_first_pinned) {
      runtime.services.set_device_location_status(
        `Position ${coordinate.latitude.toFixed(5)}, ` +
        `${coordinate.longitude.toFixed(5)}${accuracy_text}.`,
      );
    }
    if (runtime.state.is_device_navigation_active) {
      runtime.services.deliver_device_navigation_fix(coordinate, smoothed_course);
    }
  }

  /**
   * Delivers one accepted device fix to the route's guidance and redraws
   * the banner and ETA from the controller's own snapshot. A refusal ends
   * the mode honestly instead of leaving a stale trip on screen.
   */
  function deliver_device_navigation_fix(coordinate, smoothed_course) {
    if (runtime.state.live_navigator === null) {
      return;
    }
    try {
      runtime.services.render_navigation_snapshot(
        runtime.services.deliver_live_navigation_fix(
          {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            courseHeadingDegrees: smoothed_course,
          },
          Number.isFinite(coordinate.accuracy)
            ? coordinate.accuracy
            : FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
        ),
      );
    } catch (navigation_failure) {
      runtime.services.stop_device_navigation();
      runtime.services.set_device_location_status(
        `Guidance unavailable: ${String(navigation_failure)}`);
    }
  }

  function stop_device_location({ remember = true } = {}) {
    if (runtime.state.is_device_navigation_active) {
      runtime.state.is_device_navigation_active = false;
      runtime.state.device_navigation_started_location_watch = false;
      runtime.services.stop_live_navigation();
      runtime.state.live_target_bearing_degrees = null;
      runtime.shared.follow_bearing_chase.reset();
      runtime.services.refresh_device_navigation_control();
    }
    if (runtime.state.device_location_watch_identifier !== null) {
      navigator.geolocation.clearWatch(runtime.state.device_location_watch_identifier);
      runtime.state.device_location_watch_identifier = null;
    }
    runtime.state.device_position_controller = null;
    runtime.state.device_location_center_on_next_fix = false;
    runtime.state.pending_my_location_field_key = null;
    if (remember) {
      runtime.services.write_demo_preferences({ deviceLocationEnabled: false });
    }
    runtime.services.apply_location_indicator(null);
    runtime.services.set_device_location_status(null);
    runtime.services.set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.off);
    runtime.services.schedule_render();
  }

  /**
   * Restores the remembered device-location choice once the page can
   * serve a position: the source starts again and the camera centers on
   * its first fix. A platform that refuses the source leaves the choice
   * in the record for a later visit instead of pretending the layer is
   * on.
   */
  function restore_remembered_device_location() {
    if (!runtime.shared.initial_demo_preferences.deviceLocationEnabled) return;
    if (runtime.state.device_location_watch_identifier !== null) return;
    if (runtime.services.device_location_refusal_reason() !== null) return;
    runtime.services.start_device_location({ centerOnFirstFix: true, remember: false });
  }

  /**
   * Starts the browser's location source. The round control asks for the
   * first fix to center the map; the chips start the same source without
   * moving the camera.
   */
  function start_device_location({ centerOnFirstFix = false, remember = true } = {}) {
    if (typeof navigator.geolocation?.watchPosition !== 'function') {
      runtime.services.set_device_location_status(runtime.shared.DEVICE_LOCATION_UNAVAILABLE_SUPPORT_TEXT);
      runtime.services.set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.unavailable);
      return;
    }
    if (typeof window.mapTest?.PositionController !== 'function') {
      runtime.services.set_device_location_status(runtime.shared.DEVICE_LOCATION_UNAVAILABLE_TEXT);
      runtime.services.set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.unavailable);
      return;
    }
    runtime.state.device_location_center_on_next_fix = centerOnFirstFix;
    runtime.state.device_position_controller = new window.mapTest.PositionController();
    runtime.state.device_location_watch_identifier = navigator.geolocation.watchPosition(
      (position) => runtime.services.apply_device_position(position),
      (error) => {
        const status_name = runtime.services.map_geolocation_error_name(error);
        try {
          runtime.state.device_position_controller?.sourceFailed(status_name);
        } catch {
          // An unknown status name leaves the controller unchanged.
        }
        runtime.services.set_device_location_status(runtime.services.map_geolocation_error_text(error));
        // A refused or unusable source is not left pretending it watches:
        // the watch stops, the controller keeps the reported state, and
        // the next tap may request permission again.
        if (runtime.state.device_location_watch_identifier !== null) {
          navigator.geolocation.clearWatch(runtime.state.device_location_watch_identifier);
          runtime.state.device_location_watch_identifier = null;
        }
        runtime.services.set_device_location_state(
          status_name === 'permissionDenied'
            ? DEVICE_LOCATION_STATUS_NAMES.permissionDenied
            : DEVICE_LOCATION_STATUS_NAMES.unavailable,
        );
      },
      { enableHighAccuracy: true, maximumAge: 1_000, timeout: 10_000 },
    );
    runtime.services.set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.waiting);
    runtime.services.set_device_location_status('Waiting for a position…');
    if (remember) {
      runtime.services.write_demo_preferences({ deviceLocationEnabled: true });
    }
  }

  /** Draws one interpolated pose into the GPU canvas' indicator slot. */
  function draw_location_pose(pose) {
    if (!runtime.state.gpu_map_canvas || runtime.state.renderer_mode !== 'gpu') {
      return;
    }
    try {
      runtime.state.gpu_map_canvas.setLocationIndicator(
        {
          coordinate: {
            latitude: pose.latitudeDegrees,
            longitude: pose.longitudeDegrees,
          },
          courseHeadingDegrees: pose.courseDegrees ?? null,
          horizontalAccuracyMeters: pose.horizontalAccuracyMeters ?? null,
        },
        runtime.state.current_location_indicator_style,
      );
    } catch (indicator_failure) {
      const indicator_failure_message = String(indicator_failure?.message ?? indicator_failure);
      runtime.shared.status_line_element.textContent =
        `Location indicator rejected: ${indicator_failure_message}`;
      runtime.services.show_error_report('Location indicator rejected', indicator_failure_message);
    }
  }

  function apply_location_indicator(indicator, indicator_style) {
    runtime.state.current_location_indicator = indicator
      ? { ...indicator, visualKind: indicator_style?.visualKind }
      : null;
    runtime.state.current_location_indicator_style = indicator_style ?? null;
    if (!indicator) {
      runtime.shared.location_pose_animator.reset();
      return;
    }
    // The fix enters the animator; the drawn pose comes from `poseAt`, so
    // the first fix of a session draws at once and later ones glide.
    runtime.shared.location_pose_animator.pushFix(
      indicator.latitude,
      indicator.longitude,
      indicator.courseHeadingDegrees ?? null,
      indicator.horizontalAccuracyMeters ?? null,
      performance.now(),
    );
    const pose = runtime.shared.location_pose_animator.poseAt(performance.now());
    if (pose) {
      runtime.services.draw_location_pose(pose);
      if (pose.isAnimating) runtime.services.request_pump_step();
    }
    if (!indicator || runtime.state.renderer_mode !== 'gpu' || !runtime.state.gpu_map_canvas) {
      return;
    }
    try {
      runtime.state.gpu_map_canvas.setLocationIndicator(
        {
          coordinate: {
            latitude: indicator.latitude,
            longitude: indicator.longitude,
          },
          courseHeadingDegrees: indicator.courseHeadingDegrees ?? null,
          horizontalAccuracyMeters: indicator.horizontalAccuracyMeters ?? null,
        },
        indicator_style,
      );
    } catch (indicator_failure) {
      const indicator_failure_message = String(indicator_failure?.message ?? indicator_failure);
      runtime.shared.status_line_element.textContent =
        `Location indicator rejected: ${indicator_failure_message}`;
      runtime.services.show_error_report('Location indicator rejected', indicator_failure_message);
    }
  }

  // The playback controls (M27): the paces a visitor may pick, applied to
  // the route's own walk speed, and the one control that pauses it.

  /**
   * The fix cadence of the active playback. A route walk uses the demo's
   * fixed dispatch interval; a recorded trace replays its own samples at
   * the trace's recorded interval, divided by the demo acceleration and
   * the selected speed multiplier (the native driver's rule).
   */
  function current_follow_demo_fix_interval_milliseconds() {
    const playback = runtime.shared.follow_demo.trace_playback;
    if (playback === null) return runtime.services.follow_demo_fix_interval_milliseconds();
    const recorded_sample_interval_seconds = playback.sample_interval_seconds
      ?? FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS;
    // The crate divides the recorded interval by the folded acceleration
    // and floors the result at its documented minimum.
    return trace_dispatch_interval_milliseconds(
      recorded_sample_interval_seconds,
      FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR * runtime.shared.follow_demo.speed_multiplier,
    );
  }

  /** Re-arms the fix timer at the current playback's cadence. */
  function restart_follow_demo_fix_interval() {
    if (runtime.shared.follow_demo.fix_interval_id !== null) {
      clearInterval(runtime.shared.follow_demo.fix_interval_id);
      runtime.shared.follow_demo.fix_interval_id = null;
    }
    if (runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED
        || runtime.shared.follow_demo.is_paused) {
      return;
    }
    runtime.shared.follow_demo.fix_interval_id = setInterval(
      runtime.services.on_follow_demo_fix, runtime.services.current_follow_demo_fix_interval_milliseconds());
  }

  /** Rebuilds the speed chips and marks the active one. */
  function render_follow_demo_speed_controls() {
    runtime.shared.follow_demo_speed_controls.replaceChildren();
    for (const multiplier of runtime.shared.FOLLOW_DEMO_SPEED_MULTIPLIERS) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = ui_label_text_with_values(
        'navigation.speed_multiplier_label', { multiplier });
      chip.setAttribute(
        'aria-pressed', String(multiplier === runtime.shared.follow_demo.speed_multiplier));
      chip.addEventListener('click', () => {
        runtime.shared.follow_demo.speed_multiplier = multiplier;
        runtime.services.write_demo_preferences({ speedMultiplier: multiplier });
        runtime.services.render_follow_demo_speed_controls();
        // A recorded trace dispatches at the recorded cadence scaled by
        // the speed choice, so the timer is re-armed at the new interval.
        if (runtime.shared.follow_demo.trace_playback !== null) {
          runtime.services.restart_follow_demo_fix_interval();
        }
      });
      runtime.shared.follow_demo_speed_controls.append(chip);
    }
  }

  /**
   * Bounds and positions the seek control at the trip's own geometry. The
   * thumb follows every fix unless a pointer is scrubbing it, so the
   * control and the walker cannot show two positions at once.
   */
  function refresh_follow_demo_seek_control() {
    runtime.shared.follow_demo_seek_control.max = String(runtime.shared.follow_demo.total_meters);
    if (!runtime.shared.follow_demo.is_seeking) {
      runtime.shared.follow_demo_seek_control.value = String(runtime.shared.follow_demo.travelled_meters);
    }
  }

  /** Shows or hides the playback row, and names the pause control. */
  function refresh_follow_demo_playback_row(is_running) {
    runtime.shared.follow_demo_playback_row.hidden = !is_running;
    runtime.shared.follow_demo_pause_control.textContent = runtime.shared.follow_demo.is_paused
      ? ui_label_text('navigation.resume_action')
      : ui_label_text('navigation.pause_action');
    // The arrival state has nothing left to pause; the seek control stays
    // usable so a backwards seek can leave the arrival.
    runtime.shared.follow_demo_pause_control.hidden = runtime.shared.follow_demo.has_arrived;
    // A recorded trace replays its own samples verbatim, so there is no
    // route distance to seek to (the native driver's `isSeekable` rule).
    runtime.shared.follow_demo_seek_row.hidden = runtime.shared.follow_demo.trace_playback !== null;
    if (is_running) {
      runtime.services.render_follow_demo_speed_controls();
      runtime.services.refresh_follow_demo_seek_control();
    }
  }

  /** Stops the fix timer without ending the trip. */
  function pause_follow_demo_trip() {
    if (runtime.shared.follow_demo.fix_interval_id !== null) {
      clearInterval(runtime.shared.follow_demo.fix_interval_id);
      runtime.shared.follow_demo.fix_interval_id = null;
    }
    runtime.shared.follow_demo.is_paused = true;
    runtime.services.refresh_follow_demo_playback_row(true);
    runtime.shared.follow_demo_live_line.textContent = runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.paused;
  }

  /** Restarts the fix timer and delivers a fix immediately. */
  function resume_follow_demo_trip() {
    runtime.shared.follow_demo.is_paused = false;
    runtime.services.refresh_follow_demo_playback_row(true);
    runtime.shared.follow_demo_live_line.textContent = runtime.shared.follow_demo.trace_playback !== null
      ? runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.planReplay
      : runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged;
    runtime.shared.follow_demo.fix_interval_id = setInterval(
      runtime.services.on_follow_demo_fix, runtime.services.current_follow_demo_fix_interval_milliseconds());
    runtime.services.on_follow_demo_fix();
  }

  /**
   * Moves the trip to a travelled distance through the walker (M27):
   * `on_follow_demo_fix(false)` asks for that fix without advancing the
   * cursor, so the camera, the indicator, the ETA line and the arrival
   * are exactly what a normal fix at this position produces. A paused
   * trip stays paused; a running (or arrived) trip continues from the new
   * position unless the seek lands on the destination.
   */
  function seek_follow_demo_trip(target_meters) {
    if (runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED) {
      return;
    }
    const should_run = !runtime.shared.follow_demo.is_paused;
    if (runtime.shared.follow_demo.fix_interval_id !== null) {
      clearInterval(runtime.shared.follow_demo.fix_interval_id);
      runtime.shared.follow_demo.fix_interval_id = null;
    }
    runtime.shared.follow_demo.travelled_meters = Math.min(
      Math.max(target_meters, 0), runtime.shared.follow_demo.total_meters);
    // The camera follows every scrub sample; guidance catches up once on
    // release (finish_follow_demo_seek), because a single teleported fix
    // cannot advance the reducer's steps.
    runtime.services.on_follow_demo_fix(false, false);
    if (runtime.shared.follow_demo.has_arrived) {
      return;
    }
    runtime.shared.follow_demo_live_line.textContent = should_run
      ? runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged
      : runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.paused;
    if (should_run) {
      runtime.shared.follow_demo.fix_interval_id = setInterval(
        runtime.services.on_follow_demo_fix, runtime.services.follow_demo_fix_interval_milliseconds());
    }
  }

  function end_follow_demo_trip(end_live_text) {
    // The guidance card belongs to the trip: ending it clears the card.
    // An arrival keeps its last snapshot (phase Arrived) until Stop.
    runtime.services.stop_live_navigation();
    if (runtime.shared.follow_demo.fix_interval_id !== null) clearInterval(runtime.shared.follow_demo.fix_interval_id);
    runtime.shared.follow_demo.fix_interval_id = null;
    const pre_trip_camera = runtime.shared.follow_camera.restorePreTripCamera();
    runtime.state.live_target_bearing_degrees = null;
    runtime.shared.follow_demo.latest_fix = null;
    runtime.shared.follow_bearing_chase.reset();
    runtime.services.refresh_my_location_control();
    // §5.3: trip end returns the captured pre-trip camera; with it the
    // indicator clears (the follow visual is the in-trip state).
    runtime.services.apply_location_indicator(null, null);
    if (pre_trip_camera) {
      runtime.services.adopt_camera(new window.mapTest.MapCamera(
        pre_trip_camera.centerLatitudeDegrees,
        pre_trip_camera.centerLongitudeDegrees,
        pre_trip_camera.zoomLevel,
        pre_trip_camera.bearingDegrees,
        pre_trip_camera.pitchDegrees,
      ));
    }
    runtime.services.refresh_control_labels();
    runtime.shared.follow_demo_live_line.textContent = end_live_text;
    runtime.shared.follow_demo_start_control.textContent = runtime.shared.FOLLOW_DEMO_START_TEXT;
    runtime.shared.follow_demo.is_paused = false;
    runtime.shared.follow_demo.has_arrived = false;
    runtime.shared.follow_demo.is_seeking = false;
    // A recorded replay's bookkeeping resets with the trip, so the next
    // trip starts from the trace's first sample.
    runtime.shared.follow_demo.trace_playback = null;
    runtime.shared.follow_demo.has_issued_reroute = false;
    runtime.shared.follow_demo_pause_control.hidden = false;        runtime.services.refresh_follow_demo_playback_row(false);
    runtime.services.schedule_render();
  }

  /**
   * Starts the selected demo plan's replay (M31): starts live guidance on
   * the trace's recorded route, then walks the trace's own samples through
   * the wasm `Navigator` at the recorded cadence — the native
   * `SimulatedTripDriver`'s recorded-trace path. No fix is synthesized: the
   * latitude, longitude and per-sample accuracy are the trace's own, and
   * the course comes from the previous fix.
   */
  function start_demo_plan_replay(selected_plan_trace) {
    const recorded_trace = selected_plan_trace.trace;
    const recorded_samples = Array.isArray(recorded_trace.samples)
      ? recorded_trace.samples
      : [];
    const current_camera_pose = runtime.services.camera_pose();
    runtime.shared.follow_camera.engageTrip(
      current_camera_pose.latitude,
      current_camera_pose.longitude,
      current_camera_pose.zoom,
      current_camera_pose.bearing,
      current_camera_pose.pitch,
    );
    runtime.shared.follow_demo.trace_playback = {
      samples: recorded_samples,
      // The trace's own cursor owns which sample is next; the page's
      // timer only asks for the next one at the recorded cadence.
      cursor: new TraceCursor(recorded_samples.length),
      sample_interval_seconds: recorded_trace.metadata?.sample_interval_seconds
        ?? FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS,
      reroute_route: recorded_trace.reroute_route ?? null,
    };
    runtime.shared.follow_demo.has_issued_reroute = false;
    runtime.shared.follow_demo.off_route_observed = false;
    runtime.shared.follow_demo.off_route_alert_text = '';
    // The route's own polyline backs the no-seek invariant; the trace
    // replay never walks it (the samples are the fixes).
    runtime.shared.follow_demo.route_polyline = selected_plan_trace.polyline;
    runtime.shared.follow_demo.travelled_meters = 0;
    runtime.shared.follow_demo.total_meters = polyline_length_meters(selected_plan_trace.polyline);
    runtime.shared.follow_demo.is_paused = false;
    runtime.shared.follow_demo.has_arrived = false;
    runtime.shared.follow_demo.is_seeking = false;
    runtime.shared.follow_bearing_chase.reset();
    runtime.state.live_target_bearing_degrees = null;
    runtime.shared.follow_demo.latest_fix = null;
    runtime.services.refresh_my_location_control();
    runtime.services.update_camera({
      zoom: runtime.shared.follow_camera.targetZoomLevel,
      pitch: runtime.state.is_three_dimensional_camera
        ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0,
    });
    runtime.shared.follow_demo_start_control.textContent = runtime.shared.FOLLOW_DEMO_STOP_TEXT;
    runtime.services.refresh_follow_demo_playback_row(true);
    runtime.shared.follow_demo_pause_control.hidden = false;
    runtime.shared.follow_demo_live_line.textContent = runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.planReplay;
    // Guidance starts on the trace's recorded route before the first fix,
    // so the banner already names the first maneuver when the trip starts.
    runtime.services.start_live_navigation();
    if (runtime.state.live_navigator === null) {
      // Guidance could not start; do not fake a camera-only walk.
      runtime.shared.follow_demo.trace_playback = null;
      runtime.services.end_follow_demo_trip(runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
      return;
    }
    runtime.shared.follow_demo.fix_interval_id = setInterval(
      runtime.services.on_follow_demo_fix, runtime.services.current_follow_demo_fix_interval_milliseconds());
    runtime.services.on_follow_demo_fix();
  }

  /** Ends a recorded replay's timer while keeping the last guidance state
   * presented (the native driver's arrival/end rule). */
  function finish_demo_plan_replay(end_live_text) {
    if (runtime.shared.follow_demo.fix_interval_id !== null) {
      clearInterval(runtime.shared.follow_demo.fix_interval_id);
      runtime.shared.follow_demo.fix_interval_id = null;
    }
    runtime.shared.follow_demo.is_paused = true;
    runtime.shared.follow_demo_pause_control.hidden = true;
    runtime.shared.follow_demo_live_line.textContent = end_live_text;
  }

  /**
   * Applies a trace's recorded replacement route the first time the trip
   * is judged off route (M31; §7.5: a reroute is a state transition, not
   * an error). The fixture's replacement route is anchored at the
   * reducer's frozen snap by construction. A refusal is reported verbatim.
   */
  function maybe_issue_demo_plan_reroute(playback) {
    if (playback.reroute_route === null || runtime.shared.follow_demo.has_issued_reroute
        || runtime.state.live_navigator === null) {
      return;
    }
    let trip_snapshot;
    try {
      trip_snapshot = runtime.state.live_navigator.currentTripState();
    } catch {
      return;
    }
    if (trip_snapshot === null || trip_snapshot.phase !== 'offRoute') {
      return;
    }
    runtime.shared.follow_demo.has_issued_reroute = true;
    try {
      runtime.state.live_navigator.applyReroute(
        runtime.services.route_record_for_navigator(playback.reroute_route));
      runtime.services.render_navigation_snapshot(runtime.state.live_navigator.currentTripState());
    } catch (reroute_failure) {
      runtime.services.render_navigation_idle(`Reroute unavailable: ${String(reroute_failure)}`);
    }
  }

  /**
   * One recorded sample of the active plan replay: the sample's own
   * coordinate and accuracy, the course between consecutive samples, the
   * guidance snapshot, the follow camera and the indicator. Arrival or the
   * sample list's end stops the timer but keeps the presentation (Stop
   * still ends the trip).
   */
  function on_demo_plan_replay_fix() {
    const playback = runtime.shared.follow_demo.trace_playback;
    if (playback === null) return;
    const sample_index = playback.cursor.nextSampleIndex();
    if (sample_index === null) {
      runtime.services.finish_demo_plan_replay(runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.planReplayEnded);
      return;
    }
    const sample = playback.samples[sample_index];
    const previous_sample = sample_index === 0
      ? undefined
      : playback.samples[sample_index - 1];
    const sample_course_heading_degrees = previous_sample === undefined
      ? null
      : initial_bearing_degrees(previous_sample, sample);
    const fix = {
      latitude: sample.latitude,
      longitude: sample.longitude,
      courseHeadingDegrees: sample_course_heading_degrees,
    };
    runtime.shared.follow_demo.latest_fix = {
      latitude: sample.latitude,
      longitude: sample.longitude,
    };
    const horizontal_accuracy_meters = sample.horizontal_accuracy_meters;
    let trip_snapshot = null;
    if (runtime.state.live_navigator !== null) {
      try {
        trip_snapshot = runtime.services.deliver_live_navigation_fix(fix, horizontal_accuracy_meters);
      } catch (navigation_failure) {
        runtime.services.render_navigation_idle(
          `Guidance unavailable: ${String(navigation_failure)}`);
      }
    }
    if (trip_snapshot !== null) {
      runtime.services.render_navigation_snapshot(trip_snapshot);
      if (trip_snapshot.phase === 'offRoute') {
        // Record the card's own alert copy at the judgment, so the
        // evidence does not depend on how long the frozen phase lasts.
        runtime.shared.follow_demo.off_route_observed = true;
        runtime.shared.follow_demo.off_route_alert_text = runtime.shared.deviation_alert_element.textContent;
      }
    }
    const remaining_fraction = playback.samples.length <= 1
      ? 0
      : 1 - sample_index / (playback.samples.length - 1);
    // The crate's state machine retargets centre, ramped zoom and the
    // median-smoothed course; a gesture-broken follow stays broken.
    runtime.shared.follow_camera.onFix(
      fix.latitude,
      fix.longitude,
      sample_course_heading_degrees,
      remaining_fraction,
    );
    if (runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE) {
      runtime.services.update_camera({
        latitude: runtime.shared.follow_camera.targetCenterLatitudeDegrees,
        longitude: runtime.shared.follow_camera.targetCenterLongitudeDegrees,
        zoom: runtime.shared.follow_camera.targetZoomLevel,
      });
    }
    runtime.services.apply_location_indicator(
      {
        latitude: fix.latitude,
        longitude: fix.longitude,
        courseHeadingDegrees: sample_course_heading_degrees,
        horizontalAccuracyMeters: horizontal_accuracy_meters,
      },
      { visualKind: 'guidedCourseArrow' },
    );
    runtime.services.maybe_issue_demo_plan_reroute(playback);
    playback.cursor.advance();
    runtime.services.refresh_control_labels();
    runtime.services.refresh_compass_control();
    runtime.services.refresh_my_location_control();
    runtime.services.schedule_render();
    const has_arrived = trip_snapshot !== null
      && (trip_snapshot.phase === 'arrived' || trip_snapshot.isArrived === true);
    if (has_arrived) {
      runtime.shared.follow_demo.has_arrived = true;
      runtime.services.finish_demo_plan_replay(runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.arrived);
      return;
    }
    runtime.services.request_pump_step();
  }

  function on_follow_demo_fix(advances = true, feeds_guidance = true) {
    // A recorded plan replay reads its fixes from the trace, not from the
    // route walker.
    if (runtime.shared.follow_demo.trace_playback !== null) {
      runtime.services.on_demo_plan_replay_fix();
      return;
    }
    // The walk clamps at the route's total length, so the last fix lands
    // exactly on the destination instead of stopping a tick short of it.
    const travelled_meters = Math.min(
      runtime.shared.follow_demo.travelled_meters, runtime.shared.follow_demo.total_meters);
    const has_arrived = travelled_meters >= runtime.shared.follow_demo.total_meters;
    runtime.shared.follow_demo.has_arrived = has_arrived;
    const remaining_distance_fraction =
      runtime.shared.follow_demo.total_meters <= 0
        ? 0
        : 1 - travelled_meters / runtime.shared.follow_demo.total_meters;
    const fix = polyline_fix_at_travelled_meters(
      runtime.shared.follow_demo.route_polyline, travelled_meters);
    runtime.shared.follow_demo.latest_fix = { latitude: fix.latitude, longitude: fix.longitude };
    // The same fix that moves the camera drives the guidance card: the
    // navigator judges it, advances steps and composes the banner. A
    // scrubbing seek suppresses this and resyncs on release instead.
    if (feeds_guidance) {
      runtime.services.advance_live_navigation(fix);
    }
    // §5.3: a fix retargets the smoothed course and the ramped zoom; the
    // camera follows only while engaged. A gesture keeps follow broken
    // until the my-location control re-engages it — a fix never silently
    // snaps the user's panned view back. The crate's state machine owns
    // that decision and the median-smoothed course.
    runtime.shared.follow_camera.onFix(
      fix.latitude,
      fix.longitude,
      fix.courseHeadingDegrees,
      remaining_distance_fraction,
    );
    if (runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE) {
      runtime.services.update_camera({
        latitude: runtime.shared.follow_camera.targetCenterLatitudeDegrees,
        longitude: runtime.shared.follow_camera.targetCenterLongitudeDegrees,
        zoom: runtime.shared.follow_camera.targetZoomLevel,
      });
    }
    runtime.services.apply_location_indicator(
      {
        latitude: fix.latitude,
        longitude: fix.longitude,
        courseHeadingDegrees: fix.courseHeadingDegrees,
        horizontalAccuracyMeters: FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
      },
      { visualKind: 'guidedCourseArrow' },
    );
    if (advances) {
      runtime.shared.follow_demo.travelled_meters = travelled_meters +
        FOLLOW_DEMO_SPEED_METERS_PER_SECOND *
        runtime.shared.follow_demo.speed_multiplier *
        (runtime.services.follow_demo_fix_interval_milliseconds() / 1000);
    }
    runtime.services.refresh_control_labels();
    runtime.services.refresh_compass_control();
    runtime.services.refresh_my_location_control();
    runtime.services.refresh_follow_demo_seek_control();
    runtime.shared.follow_demo_pause_control.hidden = has_arrived;
    runtime.services.schedule_render();
    if (has_arrived) {
      // Arrival keeps the destination on screen: the fixes stop, the
      // camera stays where the trip ended, and Stop restores the
      // pre-trip camera the way it does at any other moment.
      if (runtime.shared.follow_demo.fix_interval_id !== null) {
        clearInterval(runtime.shared.follow_demo.fix_interval_id);
        runtime.shared.follow_demo.fix_interval_id = null;
      }
      runtime.shared.follow_demo_live_line.textContent = runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.arrived;
      return;
    }
    runtime.services.request_pump_step();
  }

  // A map-surface gesture (drag or wheel — §5.3) ends ENGAGED follow
  // immediately; it stays broken until the my-location control
  // re-engages it (never the next fix).
  function follow_demo_note_camera_gesture() {
    if (runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_ENGAGED) {
      runtime.shared.follow_camera.breakOnGesture();
      runtime.shared.follow_demo_live_line.textContent = runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.brokenByGesture;
      runtime.services.refresh_my_location_control();
    }
  }

  Object.assign(runtime.services, {
    follow_demo_fix_interval_milliseconds,
    clear_trip_route_card,
    refresh_bottom_start_dock_height,
    speech_synthesis_available,
    speak_navigation_speech,
    refresh_voice_guidance_control,
    navigation_phase_label_text,
    render_navigation_snapshot,
    render_navigation_idle,
    route_record_for_navigator,
    start_live_navigation,
    stop_live_navigation,
    deliver_live_navigation_fix,
    advance_live_navigation,
    sync_live_navigation_to_travelled_distance,
    format_distance_text,
    format_duration_text,
    follow_demo_phase,
    follow_demo_target_bearing_degrees,
    latest_device_fix,
    device_location_refusal_reason,
    refresh_device_location_status_row,
    refresh_my_location_chip_states,
    apply_pending_my_location_fill,
    start_my_location_chip_fill,
    refresh_device_location_control,
    refresh_device_navigation_control,
    start_device_navigation,
    stop_device_navigation,
    set_device_location_status,
    set_device_location_state,
    map_geolocation_error_name,
    map_geolocation_error_text,
    apply_device_position,
    deliver_device_navigation_fix,
    stop_device_location,
    restore_remembered_device_location,
    start_device_location,
    draw_location_pose,
    apply_location_indicator,
    current_follow_demo_fix_interval_milliseconds,
    restart_follow_demo_fix_interval,
    render_follow_demo_speed_controls,
    refresh_follow_demo_seek_control,
    refresh_follow_demo_playback_row,
    pause_follow_demo_trip,
    resume_follow_demo_trip,
    seek_follow_demo_trip,
    end_follow_demo_trip,
    start_demo_plan_replay,
    finish_demo_plan_replay,
    maybe_issue_demo_plan_reroute,
    on_demo_plan_replay_fix,
    on_follow_demo_fix,
    follow_demo_note_camera_gesture,
  });

}

export function installNavigationPhase1(runtime) {
  // The route card's ETA is the local clock time the route completes at,
  // from the shared millisecond conversion above.
  // The route card's mode and strategy captions: the contract vocabulary
  // the Directions control carries, spelled for the reader.
  runtime.shared.ROUTE_CARD_MODE_TEXTS = Object.freeze({
    automobile: 'Automobile',
    pedestrian: 'Pedestrian',
  });

  runtime.shared.ROUTE_CARD_STRATEGY_TEXTS = Object.freeze({
    fastest: 'Fastest',
    shortest: 'Shortest',
  });

  // The recorded demo route carries its own profile; no Directions choice
  // was sent for it, so the card names that profile instead of the control.
  runtime.shared.RECORDED_ROUTE_CARD_MODE_TEXT = 'Pedestrian';

  runtime.shared.RECORDED_ROUTE_CARD_STRATEGY_TEXT = 'Fastest';

  runtime.shared.OFFLINE_ROUTE_CARD_MODE_TEXT = 'Recorded';

  runtime.shared.OFFLINE_ROUTE_CARD_STRATEGY_TEXT = 'Fastest';
}

export function installNavigationPhase2(runtime) {
  // The playback paces a visitor may pick (M27), applied to the route's
  // own walk speed; the remembered speed must be one of these.
  runtime.shared.FOLLOW_DEMO_SPEED_MULTIPLIERS = [1, 2, 4, 8];

  runtime.shared.DEFAULT_FOLLOW_DEMO_SPEED_MULTIPLIER = 1;
}

export function installNavigationPhase3(runtime) {
  // The trip planner's planned-route overlays (the polyline and the A/B
  // pins): plain `setOverlays` descriptors composed beside the scene
  // toggles over any base layer.
  runtime.state.trip_route_overlays = [];

  // The offline-maps card's route line (the committed routing-graph demo
  // request): drawn beside the planned route and the scene overlays.
  runtime.state.offline_route_overlays = [];
}

export function installNavigationPhase4(runtime) {
  // The route record behind those overlays, kept so the wasm `Navigator`
  // can start on the same geometry the camera follows (the overlays alone
  // carry no steps or maneuvers).
  runtime.state.planned_route_record = null;

  // The demo plan the Advanced panel currently has selected: the artifact
  // definition plus its loaded recorded trace. While it is set (and no
  // later route plan superseded it) the simulated trip replays the trace's
  // own samples, exactly as the native `SimulatedTripDriver` does, instead
  // of walking a route polyline.
  runtime.state.selected_demo_plan_trace = null;

  // Restores the remembered demo plan and camera preset once the plan
  // picker exists (installed inside the map-ready setup below).
  runtime.state.restore_remembered_demo_content = async () => {};
}

export function installNavigationPhase5(runtime) {
  runtime.shared.bottom_start_dock_element = document.getElementById('bottom-start-dock');
}

export function installNavigationPhase6(runtime) {
  runtime.services.refresh_bottom_start_dock_height();

  if (typeof ResizeObserver === 'function') {
    // Held in a binding so the observation outlives module evaluation.
    const bottom_start_dock_observer =
      new ResizeObserver(runtime.services.refresh_bottom_start_dock_height);
    bottom_start_dock_observer.observe(runtime.shared.bottom_start_dock_element);
  }

  window.addEventListener('resize', runtime.services.refresh_bottom_start_dock_height);
}

export function installNavigationPhase7(runtime) {
  runtime.shared.trip_origin_input = document.getElementById('trip-origin-input');

  runtime.shared.trip_origin_search_control =
    document.getElementById('trip-origin-search-control');

  runtime.shared.trip_destination_input = document.getElementById('trip-destination-input');

  runtime.shared.trip_destination_search_control =
    document.getElementById('trip-destination-search-control');

  runtime.shared.trip_search_results_element = document.getElementById('trip-search-results');

  runtime.shared.trip_suggestions_element = document.getElementById('trip-suggestions');

  runtime.shared.trip_swap_control = document.getElementById('trip-swap-control');

  runtime.shared.trip_source_line = document.getElementById('trip-source-line');

  runtime.shared.trip_plan_route_control = document.getElementById('trip-plan-route-control');

  runtime.shared.trip_plan_route_reason = document.getElementById('trip-plan-route-reason');

  runtime.shared.trip_route_result = document.getElementById('trip-route-result');

  runtime.shared.trip_route_title = document.getElementById('trip-route-title');

  runtime.shared.trip_route_facts = document.getElementById('trip-route-facts');

  runtime.shared.trip_route_directions = document.getElementById('trip-route-directions');

  runtime.shared.trip_route_eta = document.getElementById('trip-route-eta');

  runtime.shared.trip_route_maneuver = document.getElementById('trip-route-maneuver');

  runtime.shared.trip_route_note = document.getElementById('trip-route-note');
}

export function installNavigationPhase8(runtime) {
  runtime.shared.directions_mode_car_control = document.getElementById('directions-mode-car');

  runtime.shared.directions_mode_walk_control = document.getElementById('directions-mode-walk');

  runtime.shared.directions_strategy_row = document.getElementById('directions-strategy-row');

  runtime.shared.directions_strategy_fastest_control =
    document.getElementById('directions-strategy-fastest');

  runtime.shared.directions_strategy_shortest_control =
    document.getElementById('directions-strategy-shortest');

  runtime.shared.offline_route_control = document.getElementById('offline-route-control');

  runtime.shared.offline_route_result = document.getElementById('offline-route-result');

  runtime.shared.offline_route_facts = document.getElementById('offline-route-facts');

  runtime.shared.offline_maps_status = document.getElementById('offline-maps-status');

  runtime.shared.provider_tile_control = document.getElementById('provider-tile-control');

  runtime.shared.provider_tile_result = document.getElementById('provider-tile-result');

  runtime.shared.provider_tile_preview = document.getElementById('provider-tile-canvas');
}

export function installNavigationPhase9(runtime) {
  // The trip planner's route options (the contract's `RouteOptions`).
  // The mode and strategy are the visitor's Directions choice; the unit
  // system stays metric, the display unit the demo card reports in. An
  // unregistered provider still plans the committed recorded route, which
  // carries its own pedestrian/fastest profile.
  runtime.shared.DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE = 'automobile';

  runtime.shared.DIRECTIONS_TRANSPORTATION_MODE_PEDESTRIAN = 'pedestrian';

  runtime.shared.DIRECTIONS_ROUTE_STRATEGY_FASTEST = 'fastest';

  runtime.shared.DIRECTIONS_ROUTE_STRATEGY_SHORTEST = 'shortest';

  runtime.shared.DIRECTIONS_TRANSPORTATION_MODES = Object.freeze([
    runtime.shared.DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE,
    runtime.shared.DIRECTIONS_TRANSPORTATION_MODE_PEDESTRIAN,
  ]);

  runtime.shared.DIRECTIONS_ROUTE_STRATEGIES = Object.freeze([
    runtime.shared.DIRECTIONS_ROUTE_STRATEGY_FASTEST,
    runtime.shared.DIRECTIONS_ROUTE_STRATEGY_SHORTEST,
  ]);

  runtime.shared.DEFAULT_DIRECTIONS_TRANSPORTATION_MODE =
    runtime.shared.DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE;

  runtime.shared.DEFAULT_DIRECTIONS_ROUTE_STRATEGY = runtime.shared.DIRECTIONS_ROUTE_STRATEGY_FASTEST;

  runtime.shared.TRIP_PLANNER_UNIT_SYSTEM = 'metric';
}

export function installNavigationPhase10(runtime) {
  window.mapTestReady.then(() => {
    for (const provider_control of runtime.shared.provider_credential_controls_by_key.values()) {
      const {
        provider_descriptor,
        input_element,
        apply_element,
        clear_element,
        registration_available,
      } = provider_control;
      if (!registration_available) {
        continue;
      }
      apply_element.addEventListener('click', async () => {
        const credential_value = input_element.value.trim();
        if (credential_value === '') {
          runtime.services.set_provider_status('Enter a provider key first.', 'warning');
          runtime.services.set_settings_credentials_status('Enter a provider key first.');
          return;
        }
        try {
          await runtime.services.apply_provider_credential(provider_control, credential_value, {
            persist: runtime.state.remember_provider_credentials,
          });
          input_element.value = '';
          runtime.services.refresh_credential_state();
          runtime.services.refresh_capability_provider_rows();
          runtime.services.refresh_map_layers_panel();
          runtime.services.maybe_restore_remembered_traffic_layer();
          runtime.services.set_provider_status(
            runtime.services.provider_applied_status_text(provider_descriptor), 'success');
          runtime.services.set_settings_credentials_status(
            runtime.state.remember_provider_credentials
              ? 'Applied — live providers ready, and this key is remembered on this device.'
              : 'Applied — live providers ready.');
        } catch (error) {
          const failure_text = runtime.services.provider_prefixed_failure_text(provider_descriptor, String(error));
          runtime.services.set_provider_status(`Refused: ${failure_text}`, 'warning');
          runtime.services.set_settings_credentials_status(`Refused: ${failure_text}`);
        }
      });
      clear_element.addEventListener('click', () => {
        window.mapTest.clearProviderRegistrations();
        runtime.shared.applied_provider_keys.clear();
        runtime.shared.provider_credentials_by_key.delete(provider_descriptor.provider_key);
        runtime.shared.capability_failure_text_by_key.clear();
        runtime.services.refresh_capability_provider_rows();
        input_element.value = '';
        runtime.services.clear_provider_probe_results();
        runtime.services.write_local_storage(
          runtime.shared.PROVIDER_CREDENTIAL_STORAGE_PREFIX + provider_descriptor.provider_key,
          null,
        );
        runtime.services.refresh_credential_state();
        // A cleared key takes the traffic layer with it, honestly; the
        // raster slot reloads so no pooled payload from the cleared
        // provider survives, and a selection that can no longer serve
        // returns to the keyless fixture base.
        runtime.services.reload_raster_tile_source();
        runtime.services.ensure_raster_selection_is_servable();
        runtime.services.refresh_map_layers_panel();
        runtime.services.refresh_attribution_notice();
        runtime.services.set_provider_status(runtime.shared.provider_keyless_status_text);
        runtime.services.set_settings_credentials_status('Cleared — back to the demo places.');
      });
      // A remembered key re-applies quietly on the next visit.
      const remembered_value = runtime.services.read_local_storage(
        runtime.shared.PROVIDER_CREDENTIAL_STORAGE_PREFIX + provider_descriptor.provider_key);
      if (remembered_value !== null && remembered_value.trim() !== '') {
        runtime.services.apply_provider_credential(provider_control, remembered_value)
          .then(() => {
            runtime.services.refresh_credential_state();
            runtime.services.refresh_capability_provider_rows();
            runtime.services.refresh_map_layers_panel();
            runtime.services.maybe_restore_remembered_traffic_layer();
            runtime.services.set_provider_status(
              runtime.services.provider_applied_status_text(provider_descriptor), 'success');
          })
          .catch((error) => {
            runtime.services.set_settings_credentials_status(
              `A remembered key could not be applied: ${String(error)}`);
          });
      }
    }
    runtime.services.refresh_credential_state();
    if (runtime.shared.applied_provider_keys.size === 0) {
      runtime.services.set_provider_status(runtime.shared.provider_keyless_status_text);
    }
    // The trip planner's two endpoints: an origin and a destination,
    // each a demo place (keyless) or a live geocoding result (keyed),
    // exactly the two-search flow every route planner offers. The demo
    // artifact's places are the keyless suggestion set, and its recorded
    // `demo_routes` answer every ordered pair of them, so a keyless
    // visitor can plan any demo trip without the page inventing geometry.
    const demo_places = REFERENCE_SCENE_ARTIFACT.demo_places ?? [];
    const demo_routes = REFERENCE_SCENE_ARTIFACT.demo_routes ?? [];
    const TRIP_FIELD_KEYS = Object.freeze(['origin', 'destination']);
    const TRIP_FIELD_LABELS = Object.freeze({
      origin: 'Origin',
      destination: 'Destination',
    });
    // The pins' shared style: A green at the origin, B red at the
    // destination, both at the contract's default head radius.
    const TRIP_ORIGIN_PIN_COLOR = Object.freeze(
      { red: 0.13, green: 0.62, blue: 0.29, alpha: 1.0 });
    const TRIP_DESTINATION_PIN_COLOR = Object.freeze(
      { red: 0.85, green: 0.16, blue: 0.20, alpha: 1.0 });
    // The route framing's edge clearance and zoom ceiling: the pins and
    // the polyline stay clear of the viewport edges and of the control
    // sheet, and a short downtown route never zooms past street level.
    const TRIP_FIT_EDGE_MARGIN_PIXELS = 28;
    const TRIP_FIT_MAXIMUM_ZOOM_LEVEL = 17;

    const trip_fields = {
      origin: {
        input: runtime.shared.trip_origin_input,
        search_control: runtime.shared.trip_origin_search_control,
        selected_place: null,
      },
      destination: {
        input: runtime.shared.trip_destination_input,
        search_control: runtime.shared.trip_destination_search_control,
        selected_place: null,
      },
    };
    // The field the suggestion chips fill: whichever field the visitor
    // last typed in or focused; the destination starts as the default so
    // a first chip tap still lands somewhere useful.
    let active_trip_field_key = 'destination';

    function trip_field_label(field_key) {
      return TRIP_FIELD_LABELS[field_key];
    }

    /** Enables Plan route only when both fields hold text, with a named
     * reason while a field is missing (the same gating on every shell). */
    function refresh_trip_plan_route_state() {
      const missing_field_keys = TRIP_FIELD_KEYS.filter(
        (field_key) => trip_fields[field_key].input.value.trim() === '');
      runtime.shared.trip_plan_route_control.disabled = missing_field_keys.length > 0;
      runtime.shared.trip_plan_route_reason.hidden = missing_field_keys.length === 0;
      if (missing_field_keys.length === 0) {
        runtime.shared.trip_plan_route_reason.textContent = '';
        return;
      }
      runtime.shared.trip_plan_route_reason.textContent = missing_field_keys.length === 2
        ? ui_label_text('plan.missing_both')
        : missing_field_keys[0] === 'origin'
          ? ui_label_text('plan.missing_origin')
          : ui_label_text('plan.missing_destination');
    }

    function trip_place_from_demo_place(demo_place) {
      return {
        name: demo_place.name,
        note: demo_place.note ?? '',
        latitude: demo_place.latitude_degrees,
        longitude: demo_place.longitude_degrees,
      };
    }

    /** The demo places as one-tap suggestions; a tap fills the active
     * field, so a visitor never has to type to start. */
    function render_trip_suggestions() {
      runtime.shared.trip_suggestions_element.textContent = '';
      for (const demo_place of demo_places) {
        const suggestion_chip = document.createElement('button');
        suggestion_chip.type = 'button';
        suggestion_chip.className = 'trip-suggestion-chip';
        suggestion_chip.textContent = demo_place.name;
        suggestion_chip.addEventListener('click', () => assign_trip_place(
          active_trip_field_key, trip_place_from_demo_place(demo_place)));
        runtime.shared.trip_suggestions_element.appendChild(suggestion_chip);
      }
    }

    /** Fills one field with a chosen place; the selection resolves that
     * field's search and arms the route action. */
    function assign_trip_place(field_key, trip_place) {
      trip_fields[field_key].selected_place = trip_place;
      trip_fields[field_key].input.value = trip_place.name;
      runtime.shared.trip_search_results_element.hidden = true;
      active_trip_field_key = field_key;
      persist_trip_field_texts();
      refresh_trip_plan_route_state();
      runtime.services.set_provider_status(
        `Selected ${trip_place.name} as the ${trip_field_label(field_key).toLowerCase()}. ` +
        'Plan the route, then start the trip.');
    }

    /** The result list of one field's search; a row fills that field. An
     * empty answer shows the shared empty-state hint instead of a silently
     * hidden list. */
    function render_trip_results(field_key, result_rows) {
      runtime.shared.trip_search_results_element.textContent = '';
      if (result_rows.length === 0) {
        const empty_item = document.createElement('li');
        empty_item.className = 'trip-result-empty';
        empty_item.textContent = ui_label_text('plan.empty_results_hint');
        runtime.shared.trip_search_results_element.appendChild(empty_item);
        runtime.shared.trip_search_results_element.hidden = false;
        return;
      }
      for (const result_row of result_rows) {
        const result_item = document.createElement('li');
        const result_button = document.createElement('button');
        result_button.type = 'button';
        result_button.className = 'trip-result-button';
        const result_name = document.createElement('span');
        result_name.className = 'trip-result-name';
        result_name.textContent = result_row.name;
        result_button.appendChild(result_name);
        if (result_row.note) {
          const result_note = document.createElement('span');
          result_note.className = 'trip-result-note';
          result_note.textContent = result_row.note;
          result_button.appendChild(result_note);
        }
        result_button.addEventListener('click', () => assign_trip_place(field_key, result_row));
        result_item.appendChild(result_button);
        runtime.shared.trip_search_results_element.appendChild(result_item);
      }
      runtime.shared.trip_search_results_element.hidden = false;
    }

    async function search_trip_field(field_key) {
      const query_text = trip_fields[field_key].input.value.trim();
      const field_label = trip_field_label(field_key);
      if (query_text === '') {
        runtime.shared.trip_search_results_element.hidden = true;
        runtime.services.set_provider_status(`Enter a ${field_label.toLowerCase()} first.`, 'warning');
        return;
      }
      active_trip_field_key = field_key;
      runtime.services.write_demo_preferences({
        lastSearchFieldKey: field_key,
        lastSearchQueryText: query_text,
      });
      if (!search_provider_is_registered()) {
        const query_lowercase = query_text.toLowerCase();
        const matching_places = demo_places
          .filter((demo_place) => demo_place.name.toLowerCase().includes(query_lowercase))
          .map(trip_place_from_demo_place);
        render_trip_results(field_key, matching_places);
        if (matching_places.length > 0) {
          runtime.services.set_provider_status(
            `Demo places for the ${field_label.toLowerCase()}: ${matching_places.length}. ` +
            'Select one to fill the field.');
        } else {
          runtime.services.set_provider_status(
            ui_label_text_with_values('plan.demo_no_match_hint', {
              field: field_label.toLowerCase(),
            }),
            'warning',
          );
        }
        return;
      }
      runtime.services.set_provider_status(ui_label_text('plan.searching_in_flight'));
      try {
        const place_rows = await window.mapTest.forwardGeocode(query_text);
        render_trip_results(field_key, place_rows.map((place_row) => ({
          name: place_row.structuredAddressText,
          note: place_row.qualityText,
          latitude: place_row.latitudeDegrees,
          longitude: place_row.longitudeDegrees,
        })));
        if (place_rows.length > 0) {
          runtime.services.set_provider_status(
            `Live results for the ${field_label.toLowerCase()}: ${place_rows.length}. ` +
            'Select one to fill the field.');
        } else {
          runtime.services.set_provider_status('The provider returned no results.', 'warning');
        }
      } catch (error) {
        runtime.services.set_provider_status(`Refused: ${String(error)}`, 'warning');
      }
    }

    /** Persists the two endpoint texts (the last search inputs a visitor
     * typed); restoring them fills the fields without planning a route. */
    function persist_trip_field_texts() {
      runtime.services.write_demo_preferences({
        originText: trip_fields.origin.input.value,
        destinationText: trip_fields.destination.input.value,
      });
    }

    // --- Type-ahead (docs/ReferenceAppUX.md §5.5) -----------------------
    // Per-field quiet timers and generations: each keystroke restarts the
    // timer, and an answer whose generation is stale is dropped, so a
    // superseded query can never replace the list.
    const trip_suggestion_timers = { origin: null, destination: null };
    const trip_suggestion_generations = { origin: 0, destination: 0 };

    /** Whether the SDK has a provider installed for place text: the
     * capability readback is the truth, so a provider registered outside
     * the settings surface (the test seam, or a keyless default) still
     * serves the type-ahead. */
    function search_provider_is_registered() {
      try {
        return window.mapTest.providerRegistrations().some(
          (registration) =>
            registration.registered
            && (registration.contract === 'PlaceSearch'
              || registration.contract === 'Geocoding'));
      } catch {
        return false;
      }
    }

    /** Suggestions for one field: the SDK's suggest call when a provider
     * is registered, the demo places otherwise. Errors become one inline
     * sentence and no rows. */
    async function suggest_trip_field(field_key, query_text) {
      active_trip_field_key = field_key;
      if (!search_provider_is_registered()) {
        const query_lowercase = query_text.toLowerCase();
        return demo_places
          .filter((demo_place) =>
            demo_place.name.toLowerCase().includes(query_lowercase))
          .map(trip_place_from_demo_place)
          .slice(0, runtime.shared.AUTOCOMPLETE_MAXIMUM_RESULTS);
      }
      try {
        const place_rows = await window.mapTest.suggestPlaces(query_text);
        return place_rows.map((place_row) => ({
          name: place_row.structuredAddressText,
          note: place_row.qualityText,
          latitude: place_row.latitudeDegrees,
          longitude: place_row.longitudeDegrees,
        })).slice(0, runtime.shared.AUTOCOMPLETE_MAXIMUM_RESULTS);
      } catch (error) {
        runtime.services.set_provider_status(`Refused: ${String(error)}`, 'warning');
        return [];
      }
    }

    /** Restarts one field's quiet timer; below the character threshold it
     * clears the list without asking anyone. */
    function schedule_trip_suggestions(field_key) {
      const field = trip_fields[field_key];
      if (trip_suggestion_timers[field_key] !== null) {
        clearTimeout(trip_suggestion_timers[field_key]);
        trip_suggestion_timers[field_key] = null;
      }
      const generation = trip_suggestion_generations[field_key] + 1;
      trip_suggestion_generations[field_key] = generation;
      const query_text = field.input.value.trim();
      if (query_text.length < runtime.shared.AUTOCOMPLETE_MINIMUM_QUERY_CHARACTERS) {
        runtime.shared.trip_search_results_element.hidden = true;
        return;
      }
      trip_suggestion_timers[field_key] = setTimeout(async () => {
        if (generation !== trip_suggestion_generations[field_key]) return;
        const result_rows = await suggest_trip_field(field_key, query_text);
        if (generation !== trip_suggestion_generations[field_key]) return;
        render_trip_results(field_key, result_rows);
      }, runtime.shared.AUTOCOMPLETE_DEBOUNCE_MILLISECONDS);
    }

    for (const field_key of TRIP_FIELD_KEYS) {
      const field = trip_fields[field_key];
      // Typing invalidates the earlier selection: the field's text is
      // the truth, and Plan route re-resolves from it.
      field.input.addEventListener('input', () => {
        field.selected_place = null;
        active_trip_field_key = field_key;
        persist_trip_field_texts();
        refresh_trip_plan_route_state();
        schedule_trip_suggestions(field_key);
      });
      field.input.addEventListener('focus', () => {
        active_trip_field_key = field_key;
      });
      field.search_control.addEventListener('click', () => search_trip_field(field_key));
      // Enter searches: the field is the flow's primary input, so the
      // keyboard path must not require finding the button.
      field.input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          search_trip_field(field_key);
        }
      });
    }
    // Each "My location" chip fills its own field alone: a device fix is
    // not a search result, so the earlier selection is cleared and the
    // field's text becomes the truth for Plan route.
    for (const field_key of TRIP_FIELD_KEYS) {
      runtime.shared.my_location_field_fillers.set(field_key, (display_text) => {
        const field = trip_fields[field_key];
        field.selected_place = null;
        field.input.value = display_text;
        active_trip_field_key = field_key;
        persist_trip_field_texts();
        refresh_trip_plan_route_state();
      });
    }
    // The swap action exchanges both fields and their resolved places, so
    // an accidentally reversed pair is one tap to correct. The chips'
    // filled marks travel with their fields.
    runtime.shared.trip_swap_control.addEventListener('click', () => {
      const origin_field = trip_fields.origin;
      const destination_field = trip_fields.destination;
      [origin_field.input.value, destination_field.input.value] =
        [destination_field.input.value, origin_field.input.value];
      [origin_field.selected_place, destination_field.selected_place] =
        [destination_field.selected_place, origin_field.selected_place];
      const origin_chip = runtime.shared.my_location_chip_controls.origin;
      const destination_chip = runtime.shared.my_location_chip_controls.destination;
      if (origin_chip !== null && destination_chip !== null) {
        const origin_filled = origin_chip.dataset.filled === 'true';
        origin_chip.dataset.filled =
          destination_chip.dataset.filled === 'true' ? 'true' : 'false';
        destination_chip.dataset.filled = origin_filled ? 'true' : 'false';
      }
      persist_trip_field_texts();
      refresh_trip_plan_route_state();
      runtime.services.refresh_my_location_chip_states();
      runtime.services.set_provider_status('Swapped the origin and destination.');
    });
    runtime.services.refresh_device_location_status_row();
    render_trip_suggestions();
    // Restoring a remembered pair fills the fields only: the route is
    // never planned on load, so no provider call is spent.
    trip_fields.origin.input.value = runtime.shared.initial_demo_preferences.originText;
    trip_fields.destination.input.value =
      runtime.shared.initial_demo_preferences.destinationText;
    if (runtime.shared.initial_demo_preferences.lastSearchFieldKey !== null) {
      const last_search_field =
        trip_fields[runtime.shared.initial_demo_preferences.lastSearchFieldKey];
      if (last_search_field.input.value.trim() === '') {
        last_search_field.input.value =
          runtime.shared.initial_demo_preferences.lastSearchQueryText;
      }
    }
    refresh_trip_plan_route_state();

    /** Resolves one field to a coordinate: its selected place, a demo
     * place named exactly by the field's text, or (keyed only) the
     * provider's first geocoding result. Refuses with a named reason
     * instead of inventing a place. */
    async function resolve_trip_endpoint(field_key) {
      const field = trip_fields[field_key];
      const field_label = trip_field_label(field_key).toLowerCase();
      const field_text = field.input.value.trim();
      if (field_text === '') {
        throw new Error(`enter a ${field_label} first`);
      }
      if (field.selected_place !== null && field.selected_place.name === field_text) {
        return { ...field.selected_place };
      }
      const demo_place = demo_places.find(
        (candidate) => candidate.name.toLowerCase() === field_text.toLowerCase());
      if (demo_place !== undefined) {
        return trip_place_from_demo_place(demo_place);
      }
      if (runtime.shared.applied_provider_keys.size > 0) {
        const place_rows = await window.mapTest.forwardGeocode(field_text);
        if (place_rows.length === 0) {
          throw new Error(`the provider found no place for the ${field_label} "${field_text}"`);
        }
        const first_place = place_rows[0];
        return {
          name: first_place.structuredAddressText,
          latitude: first_place.latitudeDegrees,
          longitude: first_place.longitudeDegrees,
        };
      }
      throw new Error(
        `no demo place matches the ${field_label} "${field_text}"; ` +
        'pick a demo place or apply a provider key');
    }

    /** The recorded route between two demo places, or null when the
     * artifact carries no such pair. */
    function recorded_demo_route(origin_name, destination_name) {
      return demo_routes.find(
        (demo_route) => demo_route.origin_name === origin_name
          && demo_route.destination_name === destination_name) ?? null;
    }

    /** Flattens a route's geometry into one traversal-order polyline. A
     * provider that reports only step shapes falls back to those. */
    function route_polyline_coordinates(route) {
      const geometry = Array.isArray(route.geometry) ? route.geometry : [];
      if (geometry.length > 0) {
        return geometry.map((route_coordinate) => ({
          latitude: route_coordinate.latitude,
          longitude: route_coordinate.longitude,
        }));
      }
      return (route.legs ?? []).flatMap((route_leg) =>
        (route_leg.steps ?? []).flatMap((route_step) =>
          (route_step.shape ?? []).map((route_coordinate) => ({
            latitude: route_coordinate.latitude,
            longitude: route_coordinate.longitude,
          }))));
    }

    /** The route's geographic bounds: the provider's own box when the
     * record carries one, otherwise the polyline's extent. */
    function route_bounding_box(route, polyline) {
      const provided_box = route.bounding_box ?? route.boundingBox;
      if (provided_box?.south_west?.latitude !== undefined
          && provided_box?.north_east?.latitude !== undefined) {
        return {
          south_west: {
            latitude: provided_box.south_west.latitude,
            longitude: provided_box.south_west.longitude,
          },
          north_east: {
            latitude: provided_box.north_east.latitude,
            longitude: provided_box.north_east.longitude,
          },
        };
      }
      const latitudes = polyline.map((coordinate) => coordinate.latitude);
      const longitudes = polyline.map((coordinate) => coordinate.longitude);
      // A provider that answers without geometry leaves nothing to frame;
      // Math.min over an empty list would produce Infinity and the fit
      // would refuse it with a coordinate error instead of an honest one.
      if (latitudes.length === 0
          || [...latitudes, ...longitudes].some(
            (value) => !Number.isFinite(value))) {
        return null;
      }
      return {
        south_west: {
          latitude: Math.min(...latitudes),
          longitude: Math.min(...longitudes),
        },
        north_east: {
          latitude: Math.max(...latitudes),
          longitude: Math.max(...longitudes),
        },
      };
    }

    /** The viewport the fit frames: the map canvas' CSS pixel extent. */
    function trip_fit_viewport() {
      return {
        width: runtime.shared.map_canvas.clientWidth || runtime.shared.overlay_canvas.width,
        height: runtime.shared.map_canvas.clientHeight || runtime.shared.overlay_canvas.height,
      };
    }

    /** Edge insets keeping the fitted box clear of the control sheet:
     * the sheet's own side (right on wide viewports, bottom on phones)
     * plus the fixed margin on the other edges, clamped so the inset
     * area never collapses. */
    function trip_fit_edge_insets(viewport) {
      const edge_insets = {
        top: TRIP_FIT_EDGE_MARGIN_PIXELS,
        right: TRIP_FIT_EDGE_MARGIN_PIXELS,
        bottom: TRIP_FIT_EDGE_MARGIN_PIXELS,
        left: TRIP_FIT_EDGE_MARGIN_PIXELS,
      };
      const sheet_rect = runtime.shared.controls_sheet_element.getBoundingClientRect();
      const canvas_rect = runtime.shared.map_canvas.getBoundingClientRect();
      if (sheet_rect.width === 0 || sheet_rect.height === 0
          || canvas_rect.width === 0 || canvas_rect.height === 0) {
        return edge_insets;
      }
      const sheet_on_right =
        sheet_rect.left >= canvas_rect.left + canvas_rect.width / 2;
      if (sheet_on_right) {
        edge_insets.right += Math.ceil(canvas_rect.right - sheet_rect.left);
      } else {
        edge_insets.bottom += Math.ceil(canvas_rect.bottom - sheet_rect.top);
      }
      // The inset area must keep a usable frame: never let a sheet cover
      // more than 45% of either axis.
      const maximum_horizontal_inset =
        Math.floor(viewport.width * 0.45);
      const maximum_vertical_inset =
        Math.floor(viewport.height * 0.45);
      edge_insets.left = Math.min(edge_insets.left, maximum_horizontal_inset);
      edge_insets.right = Math.min(edge_insets.right, maximum_horizontal_inset);
      edge_insets.top = Math.min(edge_insets.top, maximum_vertical_inset);
      edge_insets.bottom = Math.min(edge_insets.bottom, maximum_vertical_inset);
      return edge_insets;
    }

    /** Frames the route's bounding box with margin through the contract's
     * fitted camera, then adopts that pose. */
    function frame_trip_route(route_box) {
      const viewport = trip_fit_viewport();
      const edge_insets = trip_fit_edge_insets(viewport);
      let fitted_camera = null;
      if (runtime.state.gpu_map_canvas !== null) {
        try {
          fitted_camera = runtime.state.gpu_map_canvas.fitBounds(
            route_box.south_west.latitude,
            route_box.south_west.longitude,
            route_box.north_east.latitude,
            route_box.north_east.longitude,
            viewport.width,
            viewport.height,
            edge_insets.top,
            edge_insets.right,
            edge_insets.bottom,
            edge_insets.left,
            TRIP_FIT_MAXIMUM_ZOOM_LEVEL,
          );
        } catch (fit_failure) {
          runtime.services.show_error_report(
            'Route framing',
            String(fit_failure?.message ?? fit_failure),
          );
          return;
        }
      }
      if (fitted_camera === null || fitted_camera === undefined) {
        // The view answers null before its surface initializes (a route
        // planned while the renderer is still starting); the camera's own
        // fitted constructor frames that route so the fit is not lost.
        try {
          fitted_camera = window.mapTest.MapCamera.fittingBounds(
            route_box.south_west.latitude,
            route_box.south_west.longitude,
            route_box.north_east.latitude,
            route_box.north_east.longitude,
            viewport.width,
            viewport.height,
            edge_insets.top,
            edge_insets.right,
            edge_insets.bottom,
            edge_insets.left,
            TRIP_FIT_MAXIMUM_ZOOM_LEVEL,
          );
        } catch (fit_failure) {
          runtime.services.show_error_report(
            'Route framing',
            String(fit_failure?.message ?? fit_failure),
          );
          return;
        }
      }
      runtime.services.adopt_camera(fitted_camera);
      for (const preset_button of runtime.shared.camera_preset_controls.children) {
        preset_button.classList.remove('selected');
      }
      runtime.services.schedule_render();
    }

    // The local clock time the route completes at, from now and the
    // contract's duration: the route card's ETA line (24-hour `HH:MM`).
    function clock_time_after_seconds(duration_seconds) {
      const completion_time = new Date(
        Date.now() + duration_seconds * runtime.shared.MILLISECONDS_PER_SECOND);
      const hours_text = String(completion_time.getHours()).padStart(2, '0');
      const minutes_text = String(completion_time.getMinutes()).padStart(2, '0');
      return `${hours_text}:${minutes_text}`;
    }

    /** Draws the route card: title, distance · duration, mode · strategy,
     * ETA, maneuver and an optional honesty note. Every value comes from
     * the route record or the active Directions choice; none is invented. */
    function render_trip_route_card({
      title_text,
      distance_meters,
      duration_seconds,
      mode_text,
      strategy_text,
      maneuver_text,
      note_text,
    }) {
      runtime.shared.trip_route_title.textContent = title_text;
      runtime.shared.trip_route_facts.textContent =
        `${runtime.services.format_distance_text(distance_meters)} · ` +
        `${runtime.services.format_duration_text(duration_seconds)}`;
      runtime.shared.trip_route_directions.textContent =
        `${mode_text} · ${strategy_text}`;
      runtime.shared.trip_route_eta.textContent =
        `${ui_label_text('navigation.eta_prefix')} ` +
        `${clock_time_after_seconds(duration_seconds)}`;
      runtime.shared.trip_route_maneuver.hidden = !maneuver_text;
      runtime.shared.trip_route_maneuver.textContent = maneuver_text ?? '';
      runtime.shared.trip_route_note.hidden = !note_text;
      runtime.shared.trip_route_note.textContent = note_text ?? '';
      runtime.shared.trip_route_result.hidden = false;
    }

    /** Draws the planned route: the step-shape polyline plus the A/B
     * pins, framed with margin, and reports the summary honestly. */
    function show_trip_route(route, origin_endpoint, destination_endpoint, is_recorded) {
      // A freshly planned route supersedes a selected demo plan: the
      // native reference apps' `activeSimulatedTrace` rule (a planned
      // route wins over the picker's plan).
      clear_selected_demo_plan();
      const polyline = route_polyline_coordinates(route);
      runtime.state.planned_route_record = route;
      runtime.state.is_device_navigation_plan_first_pinned = false;
      runtime.state.trip_route_overlays = [
        { kind: 'routePolyline', coordinates: polyline },
        {
          kind: 'pointPins',
          positions: [{
            latitude: origin_endpoint.latitude,
            longitude: origin_endpoint.longitude,
          }],
          color: TRIP_ORIGIN_PIN_COLOR,
        },
        {
          kind: 'pointPins',
          positions: [{
            latitude: destination_endpoint.latitude,
            longitude: destination_endpoint.longitude,
          }],
          color: TRIP_DESTINATION_PIN_COLOR,
        },
      ];
      runtime.services.apply_overlays();
      const route_box = route_bounding_box(route, polyline);
      if (route_box === null) {
        runtime.services.show_error_report(
          'Route framing',
          'the provider returned no route geometry to frame',
        );
      } else {
        frame_trip_route(route_box);
      }
      runtime.services.schedule_render();
      // Recorded routes come from the artifact's snake-case JSON while a
      // live route carries the wasm seam's camel-case fields; the summary
      // reads either without rekeying the data.
      const distance_meters = route.distanceMeters ?? route.distance_meters;
      const duration_seconds = route.durationSeconds ?? route.duration_seconds;
      const first_step = route.legs[0]?.steps[0];
      const first_maneuver_text =
        first_step?.instructionDisplayText ?? first_step?.instruction_display_text;
      render_trip_route_card({
        title_text:
          `${origin_endpoint.name} \u2192 ${destination_endpoint.name}`,
        distance_meters,
        duration_seconds,
        mode_text: is_recorded
          ? runtime.shared.RECORDED_ROUTE_CARD_MODE_TEXT
          : runtime.shared.ROUTE_CARD_MODE_TEXTS[runtime.state.directions_transportation_mode]
            ?? runtime.state.directions_transportation_mode,
        strategy_text: is_recorded
          ? runtime.shared.RECORDED_ROUTE_CARD_STRATEGY_TEXT
          : runtime.shared.ROUTE_CARD_STRATEGY_TEXTS[runtime.state.directions_route_strategy]
            ?? runtime.state.directions_route_strategy,
        maneuver_text: first_maneuver_text ?? 'no maneuvers',
        note_text: is_recorded
          ? ui_label_text('plan.recorded_route_note')
          : null,
      });
      runtime.services.set_provider_status(
        is_recorded
          ? 'Recorded demo route ready \u2014 start the simulated trip.'
          : 'Live route planned.',
        'success');
            runtime.services.refresh_attribution_notice();
  }

    // Demo plans (M31, docs/ReferenceAppUX.md §4.1): the shared artifact's
    // recorded plans stay available to tests, launch automation and the
    // tutorials, while the drawer no longer offers a picker. Selecting one
    // loads its trace, draws and frames the recorded route, and makes it
    // the walk the simulated trip replays. The trip planner's own Plan
    // route supersedes the selection.
    const DEMO_PLAN_TRACE_URL_PREFIX = 'navigation-traces/';
    const demo_plan_definitions = REFERENCE_SCENE_ARTIFACT.demo_plans ?? [];

    /** Clears the selected plan and its drawn route (a later planned
     * route takes over both). */
    function clear_selected_demo_plan({ remember = true } = {}) {
      if (runtime.state.selected_demo_plan_trace === null) return;
      runtime.state.selected_demo_plan_trace = null;
      runtime.state.planned_route_record = null;
      runtime.state.trip_route_overlays = [];
      runtime.services.apply_overlays();
      runtime.shared.trip_source_line.hidden = true;
      runtime.shared.trip_source_line.textContent = '';
      if (remember) {
        runtime.services.write_demo_preferences({ demoPlanScenario: null });
      }
    }

    /** Loads one plan's recorded trace, draws and frames its route, and
     * arms the simulated-trip control to replay it. A refusal is reported
     * verbatim; nothing is invented. */
    async function select_demo_plan(plan_definition, { remember = true } = {}) {
      try {
        const trace_url =
          `${DEMO_PLAN_TRACE_URL_PREFIX}${plan_definition.scenario}.json`;
        const trace_response = await fetch(trace_url);
        if (!trace_response.ok) {
          throw new Error(
            `the recorded trace "${plan_definition.scenario}" is not served `
            + `(${trace_response.status})`);
        }
        const recorded_trace = await trace_response.json();
        const polyline = route_polyline_coordinates(recorded_trace.route);
        if (polyline.length < 2) {
          throw new Error('the recorded trace route carries no geometry to draw');
        }
        // A running trip on the previous plan or route is replaced, not
        // left driving a route the map no longer shows. A restore never
        // interrupts a trip the visitor has already started.
        if (runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED) {
          if (!remember) return;
          runtime.services.end_follow_demo_trip(runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
        }
        runtime.state.selected_demo_plan_trace = {
          plan: plan_definition,
          trace: recorded_trace,
          polyline,
        };
        runtime.state.planned_route_record = recorded_trace.route;
        runtime.state.is_device_navigation_plan_first_pinned = false;
        // The recorded route's own first and last vertices are its
        // endpoints: the plan's A/B pins, never invented coordinates.
        runtime.state.trip_route_overlays = [
          { kind: 'routePolyline', coordinates: polyline },
          {
            kind: 'pointPins',
            positions: [polyline[0]],
            color: TRIP_ORIGIN_PIN_COLOR,
          },
          {
            kind: 'pointPins',
            positions: [polyline[polyline.length - 1]],
            color: TRIP_DESTINATION_PIN_COLOR,
          },
        ];
        runtime.services.apply_overlays();
        const recorded_box = route_bounding_box(recorded_trace.route, polyline);
        if (recorded_box !== null) {
          frame_trip_route(recorded_box);
        }
        runtime.shared.trip_route_result.hidden = true;
        runtime.shared.trip_source_line.hidden = false;
        runtime.shared.trip_source_line.textContent = ui_label_text_with_values(
          'plan.trip_source_demo_plan', { plan: plan_definition.label });
        runtime.services.render_navigation_idle(
          'Start the simulated trip to replay the selected plan\'s recorded trace.');
        if (remember) {
          runtime.services.write_demo_preferences({
            demoPlanScenario: plan_definition.scenario,
          });
        }
        runtime.services.clear_error_report();
        return true;
      } catch (plan_failure) {
        const failure_text = String(plan_failure?.message ?? plan_failure);
        runtime.services.show_error_report('Demo plan', failure_text);
        return false;
      }
    }

    /** The launch-automation seam for one recorded plan: the drawer no
     * longer renders a picker, so tests and tutorials name the scenario. */
    window.selectDemoPlanScenario = async (scenario) => {
      const plan_definition = demo_plan_definitions.find(
        (candidate) => candidate.scenario === scenario);
      if (plan_definition === undefined) {
        throw new Error(`no recorded plan "${scenario}" is declared`);
      }
      const applied = await select_demo_plan(plan_definition);
      return applied ? plan_definition.scenario : null;
    };

    // Restoring the remembered plan replays no trip and spends no
    // provider call: it loads the committed trace, draws its route and
    // frames it, then an explicit remembered preset wins the final pose.
    runtime.state.restore_remembered_demo_content = async () => {
      // A trip the visitor already started wins over the restored plan.
      if (runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED) {
        return;
      }
      const remembered_scenario = runtime.shared.initial_demo_preferences.demoPlanScenario;
      if (remembered_scenario !== null) {
        const plan_definition = demo_plan_definitions.find(
          (candidate) => candidate.scenario === remembered_scenario);
        if (plan_definition !== undefined) {
          await select_demo_plan(plan_definition, { remember: false });
        }
      }
      // A trip may have started while the recorded trace loaded; the
      // visitor's live session keeps its own camera.
      if (runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED) return;
      runtime.services.apply_remembered_camera_preset();
    };

    runtime.shared.directions_mode_car_control.addEventListener('click', () => {
      runtime.services.set_directions_transportation_mode(
        runtime.shared.DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE);
    });
    runtime.shared.directions_mode_walk_control.addEventListener('click', () => {
      runtime.services.set_directions_transportation_mode(
        runtime.shared.DIRECTIONS_TRANSPORTATION_MODE_PEDESTRIAN);
    });
    runtime.shared.directions_strategy_fastest_control.addEventListener('click', () => {
      runtime.services.set_directions_route_strategy(runtime.shared.DIRECTIONS_ROUTE_STRATEGY_FASTEST);
    });
    runtime.shared.directions_strategy_shortest_control.addEventListener('click', () => {
      runtime.services.set_directions_route_strategy(runtime.shared.DIRECTIONS_ROUTE_STRATEGY_SHORTEST);
    });

    runtime.shared.trip_plan_route_control.addEventListener('click', async () => {
      if (runtime.shared.trip_plan_route_control.disabled) return;
      runtime.shared.trip_route_result.hidden = true;
      runtime.services.set_provider_status(ui_label_text('plan.planning_in_flight'));
      try {
        const origin_endpoint = await resolve_trip_endpoint('origin');
        const destination_endpoint = await resolve_trip_endpoint('destination');
        if (!runtime.services.routing_provider_is_registered()) {
          // No routing provider is registered, so the committed recorded
          // route is the honest answer; it carries its own
          // pedestrian/fastest profile and no Directions choice can be
          // sent. A registered routing provider — credentialed or keyless —
          // always plans live, so an unreachable deployment is reported
          // instead of silently replaced by this recorded route.
          const recorded_route =
            recorded_demo_route(origin_endpoint.name, destination_endpoint.name);
          if (recorded_route === null) {
            throw new Error(ui_label_text_with_values(
              'plan.no_recorded_route_hint', {
                origin: origin_endpoint.name,
                destination: destination_endpoint.name,
              }));
          }
          show_trip_route(
            recorded_route.route, origin_endpoint, destination_endpoint, true);
          return;
        }
        const live_route = await window.mapTest.calculateRouteWithOptions(
          origin_endpoint.latitude,
          origin_endpoint.longitude,
          destination_endpoint.latitude,
          destination_endpoint.longitude,
          runtime.services.current_directions_route_options(),
        );
        show_trip_route(live_route, origin_endpoint, destination_endpoint, false);
      } catch (error) {
        // No fallback: the route card stays absent, the verbatim detail
        // reaches the error strip, and the routing row names the next step.
        runtime.shared.trip_route_result.hidden = true;
        const failure_text = runtime.services.provider_failure_text(error);
        if (runtime.services.routing_provider_is_registered()) {
          runtime.shared.capability_failure_text_by_key.set(runtime.shared.ROUTING_CAPABILITY_KEY, failure_text);
          runtime.services.refresh_capability_provider_rows();
        }
        runtime.services.set_provider_status(`Refused: ${failure_text}`, 'warning');
      }
    });
    runtime.shared.provider_tile_control.addEventListener('click', async () => {
      try {
        const tile_bytes = await window.mapTest.fetchRasterTile(
          runtime.shared.PROVIDER_TILE_DEMO_ZOOM_LEVEL,
          runtime.shared.PROVIDER_TILE_DEMO_TILE_X,
          runtime.shared.PROVIDER_TILE_DEMO_TILE_Y,
        );
        runtime.shared.provider_tile_result.textContent =
          `Fetched ${tile_bytes.length} bytes of PNG tile imagery.`;
        runtime.services.set_provider_status('Live tile fetched.', 'success');
        // The preview is a demonstration only: a decode failure never
        // turns the successful fetch into a reported refusal.
        try {
          await draw_provider_tile_preview(tile_bytes);
        } catch {
          runtime.shared.provider_tile_preview.hidden = true;
        }
      } catch (error) {
        runtime.shared.provider_tile_result.textContent = '';
        runtime.shared.provider_tile_preview.hidden = true;
        runtime.services.set_provider_status(`Refused: ${String(error)}`, 'warning');
      }
    });
    // Draws fetched tile bytes into the probe's small canvas, scaled to
    // the canvas edge (the PNG's own texel size is provider-defined).
    async function draw_provider_tile_preview(tile_bytes) {
      const tile_bitmap = await createImageBitmap(
        new Blob([tile_bytes], { type: 'image/png' }),
      );
      runtime.shared.provider_tile_preview.getContext('2d').drawImage(
        tile_bitmap,
        0,
        0,
        runtime.shared.provider_tile_preview.width,
        runtime.shared.provider_tile_preview.height,
      );
      tile_bitmap.close();
      runtime.shared.provider_tile_preview.hidden = false;
    }

    // The offline-maps card (§4.1/§2.5): plans the recorded routing-grid
    // demo request over the committed archive the dev server (and the
    // staged site) serves same-origin, through the contract's
    // `offlineRouteFromArchiveBytes` free function. It draws through the
    // same overlay composer and route framing the live planner uses, and
    // the card states plainly that the graph is recorded test data.
    const OFFLINE_GRAPH_FIXTURE_URL = '/offline-graph/routing_grid.rmog';
    // The routing-grid fixture's straight oneway street: the same demo
    // request the native reference apps and the book snippet use.
    const OFFLINE_ROUTE_START_LATITUDE_DEGREES = 0.001;
    const OFFLINE_ROUTE_START_LONGITUDE_DEGREES = 0.0;
    const OFFLINE_ROUTE_END_LATITUDE_DEGREES = 0.001;
    const OFFLINE_ROUTE_END_LONGITUDE_DEGREES = 0.002;
    // The grid route runs along one latitude, so its own box has zero
    // height and the contract's fit refuses a zero-area box. The framing
    // pads each edge by this many degrees (roughly half a segment); the
    // drawn polyline stays exactly the route's geometry.
    const OFFLINE_ROUTE_FIT_PADDING_DEGREES = 0.0005;
    function offline_route_fit_box(route, polyline) {
      const route_box = route_bounding_box(route, polyline);
      if (route_box === null) {
        return null;
      }
      const south_latitude = Math.min(
        route_box.south_west.latitude, route_box.north_east.latitude);
      const north_latitude = Math.max(
        route_box.south_west.latitude, route_box.north_east.latitude);
      const west_longitude = Math.min(
        route_box.south_west.longitude, route_box.north_east.longitude);
      const east_longitude = Math.max(
        route_box.south_west.longitude, route_box.north_east.longitude);
      return {
        south_west: {
          latitude: south_latitude - OFFLINE_ROUTE_FIT_PADDING_DEGREES,
          longitude: west_longitude - OFFLINE_ROUTE_FIT_PADDING_DEGREES,
        },
        north_east: {
          latitude: north_latitude + OFFLINE_ROUTE_FIT_PADDING_DEGREES,
          longitude: east_longitude + OFFLINE_ROUTE_FIT_PADDING_DEGREES,
        },
      };
    }
    let offline_route_in_flight = false;
    runtime.shared.offline_route_control.addEventListener('click', async () => {
      if (offline_route_in_flight) return;
      offline_route_in_flight = true;
      runtime.shared.offline_route_control.disabled = true;
      runtime.shared.offline_maps_status.hidden = true;
      runtime.shared.offline_maps_status.textContent = '';
      runtime.shared.offline_route_result.hidden = true;
      try {
        const archive_response = await fetch(OFFLINE_GRAPH_FIXTURE_URL);
        if (!archive_response.ok) {
          throw new Error(
            `the offline graph fixture is not served (${archive_response.status})`,
          );
        }
        const archive_bytes = new Uint8Array(
          await archive_response.arrayBuffer(),
        );
        const route = await window.mapTest.offlineRouteFromArchiveBytes(
          archive_bytes,
          OFFLINE_ROUTE_START_LATITUDE_DEGREES,
          OFFLINE_ROUTE_START_LONGITUDE_DEGREES,
          OFFLINE_ROUTE_END_LATITUDE_DEGREES,
          OFFLINE_ROUTE_END_LONGITUDE_DEGREES,
        );
        const polyline = route_polyline_coordinates(route);
        // The offline route becomes the planner's route (the native
        // reference apps' `plannedRoute` rule): Start walks it, the A/B
        // framing and the route summary describe it, and a previously
        // selected demo plan no longer wins the trip.
        clear_selected_demo_plan();
        runtime.state.planned_route_record = route;
        runtime.state.is_device_navigation_plan_first_pinned = false;
        runtime.state.offline_route_overlays = [];
        runtime.state.trip_route_overlays = [
          { kind: 'routePolyline', coordinates: polyline },
        ];
        runtime.services.apply_overlays();
        const offline_box = offline_route_fit_box(route, polyline);
        if (offline_box !== null) {
          frame_trip_route(offline_box);
        }
        const distance_meters = route.distanceMeters ?? route.distance_meters;
        const duration_seconds = route.durationSeconds ?? route.duration_seconds;
        // The grid route is a sub-minute walk; whole minutes would read
        // "0 min", so a short duration states its seconds (the card's
        // note already says this is recorded test data).
        const duration_text = duration_seconds < runtime.shared.SECONDS_PER_MINUTE
          ? `${Math.round(duration_seconds)} s`
          : runtime.services.format_duration_text(duration_seconds);
        runtime.shared.offline_route_facts.textContent =
          `${runtime.services.format_distance_text(distance_meters)} · ${duration_text}`;
        runtime.shared.offline_route_result.hidden = false;
        // The route summary names the offline route and its honest note,
        // the same card the native route summaries show.
        render_trip_route_card({
          title_text: ui_label_text('offline.recorded_graph_route_title'),
          distance_meters,
          duration_seconds,
          mode_text: runtime.shared.OFFLINE_ROUTE_CARD_MODE_TEXT,
          strategy_text: runtime.shared.OFFLINE_ROUTE_CARD_STRATEGY_TEXT,
          maneuver_text: null,
          note_text: ui_label_text('offline.recorded_graph_note'),
        });
        runtime.services.clear_error_report();
      } catch (offline_failure) {
        runtime.state.offline_route_overlays = [];
        runtime.services.apply_overlays();
        const detail_text = String(
          offline_failure?.message ?? offline_failure,
        );
        runtime.shared.offline_maps_status.textContent = detail_text;
        runtime.shared.offline_maps_status.hidden = false;
        runtime.services.show_error_report('Offline route', detail_text);
      } finally {
        offline_route_in_flight = false;
        runtime.shared.offline_route_control.disabled = false;
      }
    });
  });
}

export function installNavigationPhase11(runtime) {
  // The settings sheet's device-location row is a pointer to this
  // control's Device location row, never a second copy of it.
  runtime.shared.device_location_pointer_control =
    document.getElementById('device-location-control');

  runtime.shared.device_location_pointer_control.addEventListener('click', () => {
    if (runtime.shared.settings_dialog.open) runtime.shared.settings_dialog.close();
    runtime.services.set_map_layers_panel_open(true);
    const device_location_status_element =
      document.getElementById(DEVICE_LOCATION_STATUS_IDENTIFIER);
    device_location_status_element?.scrollIntoView({ block: 'nearest' });
    runtime.shared.map_layers_control.focus();
  });
}

export function installNavigationPhase12(runtime) {
  // Simulated navigation panel (docs/ReferenceAppUX.md §7.3): live
  // guidance from the wasm `Navigator`, the same reducer the native
  // controllers drive. The panel is idle until a simulated trip starts on
  // a planned route; every row it shows then comes from the trip snapshot
  // (phase, banner, upcoming maneuver, progress, deviation), never from a
  // preview sample.
  runtime.shared.navigation_demo_reason = document.getElementById('navigation-demo-reason');

  runtime.shared.navigation_demo_preview_notice =
    document.getElementById('navigation-demo-preview-notice');

  runtime.shared.deviation_alert_element = document.getElementById('deviation-alert-preview');

  // The turn banner's map placement (§1/§7.1): shown while guidance has an
  // active maneuver, hidden between trips.
  runtime.shared.navigation_banner_overlay =
    document.getElementById('navigation-banner-overlay');

  // The trip card's own ETA-distance line (the web drawer-equivalent line,
  // visible beside the playback controls while a trip runs).
  runtime.shared.trip_navigation_eta_line =
    document.getElementById('trip-navigation-eta-line');

  // Voice guidance (§7.3): the platform speech engine speaks the
  // snapshot's own speech channel — the contract's text-to-speech variant,
  // never the banner sentence re-used as speech.
  runtime.shared.navigation_voice_control =
    document.getElementById('navigation-voice-control');

  runtime.shared.SPEECH_UTTERANCE_LANGUAGE = 'en-US';

  runtime.state.is_voice_guidance_enabled = false;

  runtime.state.last_spoken_speech_text = null;

  runtime.shared.navigation_voice_control.addEventListener('click', () => {
    if (!runtime.services.speech_synthesis_available()) return;
    runtime.state.is_voice_guidance_enabled = !runtime.state.is_voice_guidance_enabled;
    if (!runtime.state.is_voice_guidance_enabled) {
      window.speechSynthesis.cancel();
      runtime.state.last_spoken_speech_text = null;
    } else {
      // Speak the instruction on screen at once, so enabling never waits
      // for the next fix.
      const snapshot = window.mapNavigationSnapshot();
      runtime.state.last_spoken_speech_text = null;
      runtime.services.speak_navigation_speech(
        snapshot?.instruction?.activeManeuver?.speechText ?? '',
      );
    }
    runtime.services.refresh_voice_guidance_control();
  });

  runtime.services.refresh_voice_guidance_control();

  runtime.shared.NAVIGATION_IDLE_REASON_TEXT =
    'Plan a route, then start the simulated trip to see live guidance.';

  // The seek catch-up (M29): the navigator is fed a fix every
  // SYNC_STEP meters, capped at MAXIMUM_SYNC_FIX_COUNT fixes so a long
  // route's seek stays fast.
  runtime.shared.LIVE_NAVIGATION_SYNC_STEP_METERS = 10;

  runtime.shared.LIVE_NAVIGATION_MAXIMUM_SYNC_FIX_COUNT = 400;

  // The snapshot's phase spelling is the seam's own; the chip renders the
  // shared consumer label for it. An unknown spelling stays verbatim
  // rather than being guessed at.
  runtime.shared.NAVIGATION_PHASE_LABEL_BY_RAW_PHASE = Object.freeze({
    navigating: ui_label_text('navigation.phase_navigating'),
    offRoute: ui_label_text('navigation.phase_off_route'),
    arrived: ui_label_text('navigation.phase_arrived'),
  });

  // The active wasm navigator, or null between trips. One trip at a time,
  // like the native controllers.
  runtime.state.live_navigator = null;

  // The harness reads the live trip state without reaching into page
  // internals (the browser case asserts guidance follows the fixes).
  window.mapNavigationSnapshot = () =>
    runtime.state.live_navigator === null ? null : runtime.state.live_navigator.currentTripState();

  runtime.services.render_navigation_idle(runtime.shared.NAVIGATION_IDLE_REASON_TEXT);
}

export function installNavigationPhase13(runtime) {
  // The follow demo's live state (the §5.3 machine mirrored as plain
  // page glue; the wasm seam carries no navigation object — §12).
  runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED = 'disengaged';

  runtime.shared.FOLLOW_DEMO_PHASE_ENGAGED = 'engaged';

  runtime.shared.FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE = 'brokenByGesture';

  runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS = {
    disengaged: 'The trip follows the route you planned, on the §5.3 follow camera. Plan a route first, or start with the artifact scene.',
    engaged: 'Follow engaged — the camera centers on the guided fix.',
    brokenByGesture: 'Follow broken by a gesture — tap the my-location control to re-engage.',
    ended: 'Trip ended — the pre-trip camera is restored.',
    stopped: 'Trip stopped — the pre-trip camera is restored.',
    arrived: 'Arrived — the trip ended at the destination. Stop restores the pre-trip camera.',
    paused: 'Trip paused — Resume continues from the same point on the route.',
    planReplay: 'Replaying the recorded plan trace — guidance follows its own fixes.',
    planReplayEnded:
      'Replay ended — the record’s fixes ran out; the last guidance state stays until Stop.',
  };

  // The follow camera's phases, pre-trip camera, retargeted centre and
  // smoothed course are `map-refapp-core`'s state machine (M64): the page
  // reads the crate's targets and keeps only its own demo presentation.
  runtime.shared.follow_camera = new FollowCamera();

  runtime.shared.follow_demo = {
    route_polyline: null,
    travelled_meters: 0,
    total_meters: 0,
    fix_interval_id: null,
    // The recorded demo-plan trace replayed by the active trip, or null
    // while the trip walks a route polyline. Its presence switches the
    // fix source from the route walker to the trace's own samples.
    trace_playback: null,
    has_issued_reroute: false,
    // The last off-route judgment the replay presented, and the alert copy
    // that was on the card at that fix (the suite's evidence that the card
    // followed honestly, independent of when it reads the DOM).
    off_route_observed: false,
    off_route_alert_text: '',
    // The playback pace (M27): a multiplier over the demo's own speed,
    // and a pause that freezes the walk without ending the trip.
    speed_multiplier: runtime.shared.initial_demo_preferences.speedMultiplier,
    is_paused: false,
    // Whether the trip reached the route's end. Seeks set it from the
    // walker's own position, so seeking back clears it (M27's seek).
    has_arrived: false,
    // Whether a pointer is scrubbing the seek control: the walker's ticks
    // must not overwrite the thumb with its own, slightly advanced value.
    is_seeking: false,
    // The latest guided fix: the my-location control re-centers on it
    // when a gesture-broken follow is re-engaged (§5.3).
    latest_fix: null,
  };

  // Device navigation reports its own course while the recorded trip's
  // follow camera stays disengaged; the state hook reads both.
  runtime.state.live_target_bearing_degrees = null;

  // The eased moves and the chase of the platform-pump-owned camera:
  // §5.3 eases bearing and pitch in the platform's frame pump; only
  // the center applies exactly.
  runtime.shared.pitch_swing_ease = new SmoothstepTimedEase();

  runtime.shared.compass_renorth_ease = new SmoothstepTimedEase();

  // The one eased preset move in flight, or null: its endpoints and the
  // linear elapsed-time fraction the pump feeds `MapCamera.interpolate`
  // (the SDK curve applies smoothstep itself).
  runtime.state.camera_preset_animation = null;

  runtime.shared.follow_bearing_chase = new ExponentialValueChase(
    FOLLOW_BEARING_CHASE_TIME_CONSTANT_MILLISECONDS);

  window.mapLocationIndicatorState = () =>
    runtime.state.current_location_indicator ? { ...runtime.state.current_location_indicator } : null;

  // The puck's drawn pose (M72): the interpolated position the canvas
  // was last given, so a harness can measure the per-frame motion.
  window.mapLocationPose = () =>
    runtime.shared.location_pose_animator.poseAt(performance.now()) ?? null;

  window.mapScaleBar = () =>
    runtime.state.scale_bar_selection
      ? {
          ...runtime.state.scale_bar_selection,
          labelText: scale_bar_distance_label_text(
            runtime.state.scale_bar_selection.distanceMeters,
          ),
        }
      : null;

  window.mapFollowDemoState = () => ({
    phase: runtime.services.follow_demo_phase(),
    isFollowing: runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_ENGAGED,
    travelledMeters: runtime.shared.follow_demo.travelled_meters,
    totalMeters: runtime.shared.follow_demo.total_meters,
    hasArrived: runtime.shared.follow_demo.has_arrived,
    isPaused: runtime.shared.follow_demo.is_paused,
    speedMultiplier: runtime.shared.follow_demo.speed_multiplier,
    targetBearingDegrees: runtime.services.follow_demo_target_bearing_degrees(),
    cameraZoom: runtime.state.camera_state.zoomLevel(),
  });

  // The demo-plan picker's state, for the browser suite: which artifact
  // plan is selected, what it drew and framed, and how far its recorded
  // replay has advanced. No page internal is reached from a test.
  window.mapDemoPlanState = () => ({
    selectedScenario: runtime.state.selected_demo_plan_trace?.plan.scenario ?? null,
    label: runtime.state.selected_demo_plan_trace?.plan.label ?? null,
    description: runtime.state.selected_demo_plan_trace?.plan.description ?? null,
    overlayKinds: runtime.state.trip_route_overlays.map((overlay) => overlay.kind),
    routeDistanceMeters:
      runtime.state.selected_demo_plan_trace?.trace.route?.distance_meters ?? null,
    sampleIndex: runtime.shared.follow_demo.trace_playback === null
      ? 0
      : runtime.shared.follow_demo.trace_playback.cursor.nextSampleIndex()
        ?? runtime.shared.follow_demo.trace_playback.cursor.sampleCount,
    sampleCount: runtime.shared.follow_demo.trace_playback?.samples.length ?? 0,
    isReplaying: runtime.shared.follow_demo.trace_playback !== null
      && runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED,
    isPaused: runtime.shared.follow_demo.is_paused,
    rerouteApplied: runtime.shared.follow_demo.has_issued_reroute,
    offRouteObserved: runtime.shared.follow_demo.off_route_observed,
    offRouteAlertText: runtime.shared.follow_demo.off_route_alert_text,
    camera: {
      latitude: runtime.state.camera_state.center().latitude,
      longitude: runtime.state.camera_state.center().longitude,
      zoom: runtime.state.camera_state.zoomLevel(),
    },
  });
}

export function installNavigationPhase14(runtime) {
  // Device positioning (M33): the browser's Geolocation API feeds the
  // Rust `PositionController`, which validates and smooths the fixes; the
  // page then draws the renderer-owned tracking dot, centres the camera
  // and shows the position honestly in the settings sheet.
  runtime.shared.DEVICE_LOCATION_ZOOM_LEVEL = 15;

  runtime.shared.DEVICE_LOCATION_PERMISSION_DENIED_TEXT =
    'Location permission was denied. Allow it in the browser settings to use this.';

  runtime.shared.DEVICE_LOCATION_UNAVAILABLE_TEXT =
    'The browser could not determine a position right now.';

  runtime.shared.DEVICE_LOCATION_TIMEOUT_TEXT =
    'The browser timed out while determining a position.';

  runtime.shared.DEVICE_LOCATION_UNAVAILABLE_SUPPORT_TEXT =
    'This browser does not provide the Geolocation API.';

  // Device-driven navigation: the same source's fixes drive the planned
  // route's guidance, so the banner, the ETA line and the follow camera
  // read real fixes instead of the recorded trace.
  runtime.shared.DEVICE_NAVIGATION_START_TEXT = 'Navigate from my location';

  runtime.shared.DEVICE_NAVIGATION_STOP_TEXT = 'Stop device navigation';

  runtime.shared.DEVICE_NAVIGATION_PLAN_FIRST_TEXT =
    'Plan a route first; device navigation follows the route you planned.';

  runtime.shared.DEVICE_NAVIGATION_WAITING_TEXT =
    'Waiting for your position to start guidance.';

  runtime.shared.DEVICE_NAVIGATION_GUIDANCE_UNAVAILABLE_TEXT =
    'Guidance could not start on the planned route.';

  runtime.state.device_location_watch_identifier = null;

  runtime.state.device_position_controller = null;

  runtime.state.is_device_navigation_active = false;

  // Whether starting device navigation also started the location source,
  // so stopping it again does not turn off a source the visitor chose.
  runtime.state.device_navigation_started_location_watch = false;

  // The plan-first refusal stays on screen while device fixes arrive
  // about once a second, rather than being overwritten by the next
  // "Position …" line before the visitor can read it.
  runtime.state.is_device_navigation_plan_first_pinned = false;

  // The panel row's state name (one of the shared names), the one-shot
  // "center on the next fix" request the round control makes, and the
  // field a "My location" chip is waiting to fill.
  runtime.state.device_location_status_name = DEVICE_LOCATION_STATUS_NAMES.off;

  runtime.state.device_location_center_on_next_fix = false;

  runtime.state.pending_my_location_field_key = null;

  // The per-field fillers the trip planner registers; the device source
  // calls the pending one when a fix arrives, never both.
  runtime.shared.my_location_field_fillers = new Map();

  runtime.shared.my_location_chip_controls = {
    origin: document.getElementById(ORIGIN_MY_LOCATION_CHIP_IDENTIFIER),
    destination: document.getElementById(DESTINATION_MY_LOCATION_CHIP_IDENTIFIER),
  };

  for (const [field_key, chip] of Object.entries(runtime.shared.my_location_chip_controls)) {
    chip?.addEventListener('click', () => runtime.services.start_my_location_chip_fill(field_key));
  }

  // The panel's Stop action is the only way to stop the source; the
  // settings sheet's row is a pointer to the panel, wired below.
  runtime.shared.device_location_stop_control.addEventListener('click', () => {
    runtime.services.stop_device_location();
  });

  runtime.shared.device_navigation_control.addEventListener('click', () => {
    if (runtime.state.is_device_navigation_active) {
      runtime.services.stop_device_navigation();
    } else {
      runtime.services.start_device_navigation();
    }
  });

  // The UX-test host contract: the controller's own state, so a browser
  // suite can assert a fix reached it without reading page prose.
  window.mapDeviceLocationState = () => ({
    isActive: runtime.state.device_location_watch_identifier !== null,
    isNavigating: runtime.state.is_device_navigation_active,
    fix: runtime.state.device_position_controller?.latestFix() ?? null,
    smoothedCourseDegrees:
      runtime.state.device_position_controller?.smoothedCourseDegrees() ?? null,
    sourceStatus: runtime.state.device_position_controller?.sourceStatus() ?? null,
    isStale:
      runtime.state.device_position_controller?.isStale(Date.now() / runtime.shared.MILLISECONDS_PER_SECOND) ?? null,
  });

  // The location indicator (§4.2): the wasm seam draws the layer over
  // the overlays (the native surface's top layer); the state hook stays
  // live on the 2D path too, where (like the overlays) the draw is a
  // documented GPU-only capability.
  // The puck's interpolation (M72): every fix starts an eased motion from
  // the pose on screen, and the frame pump draws the intermediate poses,
  // so the position disc glides instead of hopping the fix distance.
  runtime.shared.location_pose_animator = new LocationPoseAnimator();

  runtime.state.current_location_indicator_style = null;
}

export function installNavigationPhase15(runtime) {
  // My-location (§4.2/§5.3, docs/ReferenceAppUX.md §4.2): during a
  // simulated trip the control re-centers on the latest guided fix and
  // re-engages a follow broken by a gesture. Outside a trip it drives the
  // device location source: with the source off it requests permission,
  // starts the source and centers on the first fix; with the source on it
  // re-centers on the latest fix.
  runtime.shared.my_location_control.addEventListener('click', () => {
    const is_trip_active =
      runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED;
    if (is_trip_active) {
      const latest_trip_fix = runtime.shared.follow_demo.latest_fix;
      if (latest_trip_fix !== null) {
        runtime.services.update_camera({
          latitude: latest_trip_fix.latitude,
          longitude: latest_trip_fix.longitude,
        });
      }
      const trip_fix_center = runtime.state.camera_state.center();
      runtime.services.apply_location_indicator(
        {
          latitude: trip_fix_center.latitude,
          longitude: trip_fix_center.longitude,
          courseHeadingDegrees: null,
          horizontalAccuracyMeters: FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
        },
        { visualKind: 'trackingDot' },
      );
      if (runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE) {
        runtime.shared.follow_camera.reengage();
        runtime.shared.follow_demo_live_line.textContent = runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged;
        runtime.shared.follow_bearing_chase.reset();
        runtime.services.refresh_my_location_control();
        runtime.services.request_pump_step();
      }
      runtime.services.schedule_render();
      return;
    }
    const refusal_reason = runtime.services.device_location_refusal_reason();
    if (runtime.state.device_location_watch_identifier === null) {
      if (refusal_reason !== null) {
        // The control never pretends it started; the panel states why.
        runtime.services.set_map_layers_status(refusal_reason);
        runtime.services.set_map_layers_panel_open(true);
        return;
      }
      runtime.services.start_device_location({ centerOnFirstFix: true });
      return;
    }
    const latest_fix = runtime.services.latest_device_fix();
    if (latest_fix === null) {
      // Waiting for the first fix: center when it arrives.
      runtime.state.device_location_center_on_next_fix = true;
      return;
    }
    runtime.services.update_camera({
      latitude: latest_fix.latitude,
      longitude: latest_fix.longitude,
      zoom: Math.max(runtime.state.camera_state.zoomLevel(), runtime.shared.DEVICE_LOCATION_ZOOM_LEVEL),
    });
    runtime.services.schedule_render();
  });
}

export function installNavigationPhase16(runtime) {
  // The follow demo (§5.3): the page drives the artifact's route scene
  // polyline through the §5.3 follow camera. The trip's fixes arrive at
  // the recorded trace's dispatch interval; each fix centers exactly,
  // re-targets the ramped zoom and the median-smoothed bearing chase,
  // and re-engages follow. Trip end restores the pre-trip camera; the
  // indicator clears.
  runtime.shared.FOLLOW_DEMO_START_TEXT = ui_label_text('route.start_action');

  runtime.shared.FOLLOW_DEMO_STOP_TEXT = ui_label_text('navigation.exit_action');

  runtime.shared.route_scene = REFERENCE_SCENE_ARTIFACT.overlay_scenes.route;

  runtime.shared.FOLLOW_DEMO_ROUTE_POLYLINE = runtime.shared.route_scene.coordinates.map(
    (route_coordinate) => ({
      latitude: route_coordinate.latitude_degrees,
      longitude: route_coordinate.longitude_degrees,
    }));

  runtime.shared.follow_demo_pause_control.addEventListener('click', () => {
    if (runtime.services.follow_demo_phase() === runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED) {
      return;
    }
    if (runtime.shared.follow_demo.is_paused) {
      runtime.services.resume_follow_demo_trip();
    } else {
      runtime.services.pause_follow_demo_trip();
    }
  });

  // The seek control (M27): every input asks the walker for that
  // position. A pointer-down marks the scrub so the walker's own ticks
  // never fight the thumb; pointer-up (or a keyboard change) ends it.
  runtime.shared.follow_demo_seek_control.addEventListener('pointerdown', () => {
    runtime.shared.follow_demo.is_seeking = true;
  });

  runtime.shared.follow_demo_seek_control.addEventListener('input', () => {
    runtime.services.seek_follow_demo_trip(Number(runtime.shared.follow_demo_seek_control.value));
  });

  runtime.shared.finish_follow_demo_seek = () => {
    runtime.shared.follow_demo.is_seeking = false;
    runtime.services.refresh_follow_demo_seek_control();
    // Guidance catches up on release: the route is replayed to the seeked
    // position, so the banner, progress and phase match the camera.
    runtime.services.sync_live_navigation_to_travelled_distance();
  };

  runtime.shared.follow_demo_seek_control.addEventListener('change', runtime.shared.finish_follow_demo_seek);

  window.addEventListener('pointerup', () => {
    if (runtime.shared.follow_demo.is_seeking) {
      runtime.shared.finish_follow_demo_seek();
    }
  });

  runtime.shared.follow_demo_start_control.addEventListener('click', () => {
    if (runtime.services.follow_demo_phase() !== runtime.shared.FOLLOW_DEMO_PHASE_DISENGAGED) {
      runtime.services.end_follow_demo_trip(runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
      return;
    }
    // One trip runs at a time: starting the recorded trip ends a
    // device-driven one (and leaves a location source the visitor
    // started by hand running).
    runtime.services.stop_device_navigation();
    // A selected demo plan makes the recorded trace the trip the replay
    // drives; otherwise the trip walks the route the visitor planned.
    if (runtime.state.selected_demo_plan_trace !== null) {
      runtime.services.start_demo_plan_replay(runtime.state.selected_demo_plan_trace);
      return;
    }
    // §5.3: trip start captures the pre-trip camera and applies the
    // fixed deep zoom and the plane's pitch; center and bearing hold
    // until the first fix retargets them.
    const trip_start_camera_pose = runtime.services.camera_pose();
    runtime.shared.follow_camera.engageTrip(
      trip_start_camera_pose.latitude,
      trip_start_camera_pose.longitude,
      trip_start_camera_pose.zoom,
      trip_start_camera_pose.bearing,
      trip_start_camera_pose.pitch,
    );
    // The trip walks the route the visitor planned; the artifact's own
    // scene polyline is only the fallback for the no-plan demo.
    const planned_route_polyline = runtime.state.trip_route_overlays
      .find((overlay) => overlay.kind === 'routePolyline')
      ?.coordinates ?? null;
    const trip_polyline = planned_route_polyline ?? runtime.shared.FOLLOW_DEMO_ROUTE_POLYLINE;
    runtime.shared.follow_demo.route_polyline = trip_polyline;
    runtime.shared.follow_demo.travelled_meters = 0;
    runtime.shared.follow_demo.is_paused = false;
    runtime.shared.follow_demo.has_arrived = false;
    runtime.shared.follow_demo.is_seeking = false;
    runtime.shared.follow_demo.total_meters = polyline_length_meters(trip_polyline);
    runtime.shared.follow_bearing_chase.reset();
    runtime.state.live_target_bearing_degrees = null;
    runtime.shared.follow_demo.latest_fix = null;
    runtime.services.refresh_my_location_control();
    runtime.services.update_camera({
      zoom: runtime.shared.follow_camera.targetZoomLevel,
      pitch: runtime.state.is_three_dimensional_camera
        ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0,
    });
    runtime.shared.follow_demo_start_control.textContent = runtime.shared.FOLLOW_DEMO_STOP_TEXT;
    runtime.services.refresh_follow_demo_playback_row(true);
    runtime.shared.follow_demo_live_line.textContent = runtime.shared.FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged;
    // Live guidance starts on the planned route before the first fix, so
    // the banner already names the first maneuver when the trip begins.
    runtime.services.start_live_navigation();
    runtime.shared.follow_demo.fix_interval_id = setInterval(
      runtime.services.on_follow_demo_fix, runtime.services.follow_demo_fix_interval_milliseconds());
    runtime.services.on_follow_demo_fix();
  });
}
