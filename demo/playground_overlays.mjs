// playground_overlays: the overlays concern of the browser
// playground controller.
//
// Responsibility:
// Scene and traffic overlays: the overlay scene toggles, the traffic flow
// layer and its refresh cadence, and the attribution notice.
//
// Public exports:
//   defineOverlays
//   installOverlaysPhase1
//   installOverlaysPhase2
//   installOverlaysPhase3
//   installOverlaysPhase4
//   installOverlaysPhase5
//   installOverlaysPhase6
//   installOverlaysPhase7
//   installOverlaysPhase8
//   installOverlaysPhase9
//   installOverlaysPhase10
//
// Every function reads shared state through the `runtime` object passed to
// `defineOverlays` and calls helpers from other concerns through
// `runtime.services`, so this module imports no sibling concern module and
// the concern graph stays acyclic.

import {
  sacramento_scene_overlays,
  REFERENCE_SCENE_ARTIFACT,
  traffic_flow_overlay_descriptor,
} from './overlay_scenes.mjs';
import {
  MAP_LAYER_TRAFFIC_IDENTIFIER,
  TRAFFIC_FLOW_OVERLAY_WIDTH_PIXELS,
  TRAFFIC_REFRESH_DEBOUNCE_MILLISECONDS,
  traffic_capability_descriptor,
  traffic_layer_availability,
} from './map_layers.mjs';
import {
  TILE_LAYER_MODES,
} from './tile_switch.mjs';

export function defineOverlays(runtime) {
  function set_attribution_panel_open(is_open) {
    runtime.shared.attribution_panel.hidden = !is_open;
    runtime.shared.attribution_info_control.setAttribute('aria-expanded', String(is_open));
  }

  function set_overlay_controls_enabled(enabled, reason_text) {
    const scene_reason_element =
      document.getElementById('map-layers-scenes-reason');
    if (scene_reason_element !== null) {
      scene_reason_element.hidden = enabled;
      scene_reason_element.textContent = enabled ? '' : reason_text;
    }
    for (const switch_element of document.querySelectorAll(
      '#map-layer-scene-rows [role="switch"]')) {
      switch_element.disabled = !enabled;
    }
  }

  // Replaces the wasm canvas' overlay list with the toggled Sacramento
  // scenes (an all-unchecked list clears it). A wasm-side rejection is
  // a string exception; it surfaces on the error report and the status
  // line, and the previously accepted list stays in force.
  //
  /** The keys of the demo scenes whose toggles are checked. */
  function checked_overlay_scene_keys() {
    return Object.entries(runtime.shared.overlay_checkboxes)
      .filter(([, checkbox]) => checkbox.checked)
      .map(([scene_key]) => scene_key);
  }

  /** The page's own overlays: the toggled demo scenes, in scene order. */
  function content_overlay_list() {
    return [
      ...sacramento_scene_overlays(runtime.services.checked_overlay_scene_keys()),
      // The traffic layer draws over the base and under the route
      // geometry, as at most one overlay.
      ...runtime.state.traffic_flow_overlays,
      // The planned route, its A/B pins and the offline card's route
      // draw over any base layer and beside every toggled scene.
      ...runtime.state.trip_route_overlays,
      ...runtime.state.offline_route_overlays,
    ];
  }

  /** Pushes the page's own overlays; the canvas paints the vector base
   * beneath them from its own installed source (M31's renderer-internal
   * ruling), so the two never fight over one drawn list. */
  function apply_overlays() {
    if (runtime.state.renderer_mode !== 'gpu' || !runtime.state.gpu_map_canvas) return;
    try {
      runtime.state.gpu_map_canvas.setOverlays(runtime.services.content_overlay_list());
    } catch (overlay_failure) {
      const overlay_failure_message = String(overlay_failure?.message ?? overlay_failure);
      runtime.shared.status_line_element.textContent = `Overlay rejected: ${overlay_failure_message}`;
      runtime.services.show_error_report('Overlay rejected', overlay_failure_message);
    }
  }

  // --- Traffic layer -------------------------------------------------
  // One overlay installed from the capability's flow rows for the settled
  // camera bounds. Refreshes are debounced per settle and capped to one
  // request in flight; a failed refresh keeps the previous overlay.
  function current_camera_pose_key() {
    const pose = runtime.services.camera_pose();
    return [
      pose.latitude.toFixed(6),
      pose.longitude.toFixed(6),
      pose.zoom.toFixed(3),
      pose.bearing.toFixed(2),
      pose.pitch.toFixed(2),
    ].join('|');
  }

  /** The settled camera's geographic bounds, or null when unanswerable. */
  function current_camera_geographic_bounds() {
    if (runtime.state.gpu_map_canvas === null) return null;
    // The view reads its own stored pose: adopt the page's camera first
    // so a bounds read between frames reports the current pose.
    runtime.state.gpu_map_canvas.setCamera(runtime.state.camera_state);
    return runtime.state.gpu_map_canvas.cameraGeographicBounds(
      runtime.shared.overlay_canvas.width,
      runtime.shared.overlay_canvas.height,
      runtime.shared.FIELD_OF_VIEW_DEGREES,
    );
  }

  /** Schedules one traffic refresh after the camera settles. */
  function schedule_traffic_refresh() {
    if (!runtime.state.traffic_layer_enabled) return;
    if (runtime.state.traffic_refresh_debounce_timer !== null) {
      clearTimeout(runtime.state.traffic_refresh_debounce_timer);
    }
    runtime.state.traffic_refresh_debounce_timer = setTimeout(() => {
      runtime.state.traffic_refresh_debounce_timer = null;
      void runtime.services.refresh_traffic_flow_layer();
    }, TRAFFIC_REFRESH_DEBOUNCE_MILLISECONDS);
  }

  /** Restarts the debounce when the camera pose changed since the last
   * request's settle. Called from the page's render scheduler, so every
   * camera path (drag, wheel, keyboard, preset, device fix) participates. */
  function note_camera_pose_for_traffic() {
    if (!runtime.state.traffic_layer_enabled) return;
    const pose_key = runtime.services.current_camera_pose_key();
    if (pose_key === runtime.state.traffic_last_camera_pose_key) return;
    runtime.state.traffic_last_camera_pose_key = pose_key;
    runtime.services.schedule_traffic_refresh();
  }

  /** Asks the capability for the settled bounds and installs one overlay. */
  async function refresh_traffic_flow_layer() {
    if (!runtime.state.traffic_layer_enabled) return;
    if (runtime.state.traffic_refresh_in_flight) {
      runtime.state.traffic_refresh_pending = true;
      return;
    }
    const bounds = runtime.services.current_camera_geographic_bounds();
    if (bounds === null) {
      runtime.state.traffic_last_failure_text = 'The camera bounds are unavailable.';
      runtime.services.set_map_layers_status(runtime.state.traffic_last_failure_text);
      return;
    }
    runtime.state.traffic_refresh_in_flight = true;
    runtime.state.traffic_fetch_count += 1;
    try {
      const flow_rows = await window.mapTest.fetchTrafficFlow(
        bounds.southWestLatitude,
        bounds.southWestLongitude,
        bounds.northEastLatitude,
        bounds.northEastLongitude,
      );
      // A toggle-off while the request was in flight drops its answer.
      if (!runtime.state.traffic_layer_enabled) return;
      runtime.state.traffic_flow_overlays = [
        traffic_flow_overlay_descriptor(
          flow_rows, TRAFFIC_FLOW_OVERLAY_WIDTH_PIXELS),
      ];
      runtime.state.traffic_overlay_install_count += 1;
      runtime.state.traffic_last_failure_text = null;
      runtime.services.set_map_layers_status(null);
      runtime.services.apply_overlays();
      runtime.services.schedule_render();
    } catch (traffic_failure) {
      const failure_text = String(traffic_failure?.message ?? traffic_failure);
      runtime.state.traffic_last_failure_text = failure_text;
      runtime.services.set_map_layers_status(`Traffic refresh failed: ${failure_text}`);
      if (traffic_failure?.code === 'providerNotConfigured') {
        runtime.services.set_traffic_layer_enabled(false);
      }
    } finally {
      runtime.state.traffic_refresh_in_flight = false;
      if (runtime.state.traffic_refresh_pending) {
        runtime.state.traffic_refresh_pending = false;
        runtime.services.schedule_traffic_refresh();
      }
    }
  }

  /** Turns the layer on or off, keeping the remembered choice in step. */
  function set_traffic_layer_enabled(next_enabled, { remember = true } = {}) {
    if (next_enabled) {
      const availability = traffic_layer_availability(
        runtime.state.providers_registry.providers, runtime.shared.applied_provider_keys);
      if (availability.state !== 'available') {
        runtime.services.set_map_layers_status(availability.reasonText);
        return;
      }
    }
    runtime.state.traffic_layer_enabled = next_enabled;
    if (remember) {
      runtime.services.write_demo_preferences({ trafficLayerEnabled: next_enabled });
    }
    if (!next_enabled) {
      if (runtime.state.traffic_refresh_debounce_timer !== null) {
        clearTimeout(runtime.state.traffic_refresh_debounce_timer);
        runtime.state.traffic_refresh_debounce_timer = null;
      }
      runtime.state.traffic_refresh_pending = false;
      runtime.state.traffic_flow_overlays = [];
      runtime.state.traffic_last_camera_pose_key = null;
      runtime.services.apply_overlays();
      runtime.services.schedule_render();
    } else {
      runtime.state.traffic_last_camera_pose_key = runtime.services.current_camera_pose_key();
      runtime.services.schedule_traffic_refresh();
    }
    runtime.services.refresh_map_layers_panel();
    runtime.services.refresh_attribution_notice();
  }

  function maybe_restore_remembered_traffic_layer() {
    if (!runtime.state.traffic_restore_requested || runtime.state.traffic_layer_enabled) return;
    const availability = traffic_layer_availability(
      runtime.state.providers_registry.providers, runtime.shared.applied_provider_keys);
    if (availability.state !== 'available') return;
    runtime.state.traffic_restore_requested = false;
    runtime.services.set_traffic_layer_enabled(true, { remember: false });
  }

  /** The attribution lines the currently serving layers require. */
  function current_layer_attribution_texts() {
    const attribution_texts = [];
    if (runtime.state.current_tile_mode === TILE_LAYER_MODES.raster) {
      const raster_descriptor = runtime.services.selected_raster_descriptor();
      if (typeof raster_descriptor?.attribution_text === 'string') {
        attribution_texts.push(raster_descriptor.attribution_text);
      }
      // The keyless live fallback paints the ground the recorded fixtures
      // do not cover on a deployed host, so its descriptor owes a line
      // whenever the page registered it, not only while it is selected.
      const live_descriptor = runtime.services.registered_live_raster_descriptor();
      if (live_descriptor !== null
        && typeof live_descriptor.attribution_text === 'string') {
        attribution_texts.push(live_descriptor.attribution_text);
      }
    } else {
      const vector_descriptor = runtime.services.selected_vector_descriptor();
      if (vector_descriptor !== null) {
        attribution_texts.push(runtime.services.active_vector_style_attribution(vector_descriptor));
      }
    }
    if (runtime.state.traffic_layer_enabled) {
      const traffic_descriptor =
        traffic_capability_descriptor(runtime.state.providers_registry.providers);
      if (typeof traffic_descriptor?.attribution_text === 'string') {
        attribution_texts.push(traffic_descriptor.attribution_text);
      }
    }
    // A route on the map owes the routing provider's line; an idle map
    // does not.
    if (runtime.state.trip_route_overlays.length > 0 || runtime.state.planned_route_record !== null) {
      try {
        const routing_registration = window.mapTest.providerRegistrations().find(
          (row) => row.registered && row.contract === 'Routing');
        const routing_descriptor = runtime.state.providers_registry.providers.find(
          (provider_descriptor) =>
            provider_descriptor.provider_key === routing_registration?.providerKey);
        if (typeof routing_descriptor?.attribution_text === 'string') {
          attribution_texts.push(routing_descriptor.attribution_text);
        }
      } catch {
        // A page without the wasm seam has no registration to read.
      }
    }
    return attribution_texts;
  }

  /** Recomputes the attribution notice; its live region announces changes. */
  function refresh_attribution_notice() {
    const attribution_texts = Array.from(
      new Set(runtime.services.current_layer_attribution_texts()),
    ).filter((attribution_text) =>
      typeof attribution_text === 'string' && attribution_text.trim() !== '');
    if (attribution_texts.length > 0) {
      runtime.shared.attribution_notice.textContent = attribution_texts.join(' · ');
    }
  }

  Object.assign(runtime.services, {
    set_attribution_panel_open,
    set_overlay_controls_enabled,
    checked_overlay_scene_keys,
    content_overlay_list,
    apply_overlays,
    current_camera_pose_key,
    current_camera_geographic_bounds,
    schedule_traffic_refresh,
    note_camera_pose_for_traffic,
    refresh_traffic_flow_layer,
    set_traffic_layer_enabled,
    maybe_restore_remembered_traffic_layer,
    current_layer_attribution_texts,
    refresh_attribution_notice,
  });

}

export function installOverlaysPhase1(runtime) {
  // The traffic layer's single overlay (at most one), installed from the
  // capability's flow rows and cleared when the switch goes off. The
  // layer's own state lives beside it: one debounced refresh per camera
  // settle, at most one request in flight, and the counters the browser
  // suite reads.
  runtime.state.traffic_flow_overlays = [];

  runtime.state.traffic_layer_enabled = false;

  runtime.state.traffic_refresh_debounce_timer = null;

  runtime.state.traffic_refresh_in_flight = false;

  runtime.state.traffic_refresh_pending = false;

  runtime.state.traffic_last_camera_pose_key = null;

  runtime.state.traffic_fetch_count = 0;

  runtime.state.traffic_overlay_install_count = 0;

  runtime.state.traffic_last_failure_text = null;
}

export function installOverlaysPhase2(runtime) {
  runtime.shared.attribution_control = document.getElementById('attribution-control');

  runtime.shared.attribution_info_control = document.getElementById('attribution-info-control');

  runtime.shared.attribution_panel = document.getElementById('attribution-panel');

  runtime.shared.attribution_notice = document.getElementById('attribution-notice');
}

export function installOverlaysPhase3(runtime) {
  runtime.shared.attribution_info_control.addEventListener('click', () => {
    runtime.services.set_attribution_panel_open(runtime.shared.attribution_panel.hidden);
  });

  // The panel closes on Escape and on a tap outside the control.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !runtime.shared.attribution_panel.hidden) {
      runtime.services.set_attribution_panel_open(false);
      runtime.shared.attribution_info_control.focus();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (runtime.shared.attribution_panel.hidden) return;
    if (!runtime.shared.attribution_control.contains(event.target)) {
      runtime.services.set_attribution_panel_open(false);
    }
  }, true);
}

export function installOverlaysPhase4(runtime) {
  // Scene-overlay state: one checkbox per Sacramento demo overlay kind,
  // kept as the shared value the layers panel's switches read and write.
  // The panel's overlay section is the single visible home; the scenes
  // draw on the GPU surface only, so its switches stay disabled with a
  // reason while the renderer is unavailable and whenever the session is
  // in the degraded 2D path (docs/ReferenceAppUX.md §6.2).
  runtime.shared.overlay_checkboxes = Object.fromEntries(
    Object.entries(REFERENCE_SCENE_ARTIFACT.overlay_scenes).map(
      ([scene_key]) => {
        const scene_checkbox = document.createElement('input');
        scene_checkbox.type = 'checkbox';
        return [scene_key, scene_checkbox];
      },
    ),
  );

  for (const checkbox of Object.values(runtime.shared.overlay_checkboxes)) {
    checkbox.addEventListener('change', () => {
      runtime.services.write_demo_preferences({
        overlaySceneKeys: runtime.services.checked_overlay_scene_keys(),
      });
      runtime.services.apply_overlays();
      runtime.services.schedule_render();
      runtime.services.refresh_map_layers_panel();
    });
  }
}

export function installOverlaysPhase5(runtime) {
  // Restoring a scene selection only marks the toggles; the renderer's
  // first overlay push happens once the GPU surface is up.
  for (const scene_key of runtime.shared.initial_demo_preferences.overlaySceneKeys) {
    if (runtime.shared.overlay_checkboxes[scene_key] !== undefined) {
      runtime.shared.overlay_checkboxes[scene_key].checked = true;
    }
  }
}

export function installOverlaysPhase6(runtime) {
  // The traffic switch's parts.
  runtime.shared.traffic_switch_element = document.createElement('button');

  runtime.shared.traffic_switch_element.type = 'button';

  runtime.shared.traffic_switch_element.id = MAP_LAYER_TRAFFIC_IDENTIFIER;

  runtime.shared.traffic_switch_element.className = 'map-layer-switch';

  runtime.shared.traffic_switch_element.setAttribute('role', 'switch');

  runtime.shared.traffic_switch_element.setAttribute('aria-checked', 'false');

  runtime.shared.traffic_switch_label_element = document.createElement('span');

  runtime.shared.traffic_switch_label_element.textContent = 'Traffic';

  runtime.shared.traffic_switch_mark_element = document.createElement('span');

  runtime.shared.traffic_switch_mark_element.className = 'map-layer-row-reason';

  runtime.shared.traffic_switch_element.append(
    runtime.shared.traffic_switch_label_element, runtime.shared.traffic_switch_mark_element);

  runtime.shared.map_layers_traffic_row_element.appendChild(runtime.shared.traffic_switch_element);
}

export function installOverlaysPhase7(runtime) {
  runtime.shared.traffic_switch_element.addEventListener('click', () => {
    runtime.services.set_traffic_layer_enabled(!runtime.state.traffic_layer_enabled);
  });

  // A remembered traffic choice is restored only once a provider that
  // serves the capability is registered (the credential path calls back).
  runtime.state.traffic_restore_requested = runtime.shared.initial_demo_preferences.trafficLayerEnabled;
}

export function installOverlaysPhase8(runtime) {
  window.mapTrafficLayerState = () => ({
    enabled: runtime.state.traffic_layer_enabled,
    fetchCount: runtime.state.traffic_fetch_count,
    overlayInstallCount: runtime.state.traffic_overlay_install_count,
    segmentCount: runtime.state.traffic_flow_overlays[0]?.segments?.length ?? 0,
    failureText: runtime.state.traffic_last_failure_text,
  });
}

export function installOverlaysPhase9(runtime) {
  runtime.services.refresh_attribution_notice();

  runtime.services.maybe_restore_remembered_traffic_layer();
}

export function installOverlaysPhase10(runtime) {
  // Scene overlays wait for the renderer: the controls stay disabled
  // until readiness resolved (the ready handler then enables them or
  // disables them with the degradation reason).
  runtime.services.set_overlay_controls_enabled(false, 'Scene overlays wait for the renderer…');
}
