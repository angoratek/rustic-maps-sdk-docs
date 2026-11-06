// Playground controller: the browser reference app of record. It drives the
// wasm camera with pointer input, renders raster/vector tiles through the
// GPU canvas and mirrors the native shells' consumer flow.
      // Manual playground / web refapp of record: drives the wasm MapCamera
      // with pointer input and renders actual raster tiles into #map-canvas
      // through the wasm WebGPU canvas binding; without browser WebGPU it
      // degrades to the 2D tile-grid overlay documented below. The UX
      // language it implements is docs/ReferenceAppUX.md; the demo content
      // (presets, scenes, navigation preview) comes from the shared
      // reference-scene artifact.
      import {
        sacramento_scene_overlays,
        SACRAMENTO_OVERLAY_SCENE_LABELS,
        REFERENCE_SCENE_ARTIFACT,
        traffic_flow_overlay_descriptor,
      } from './overlay_scenes.mjs';
      // The on-map layer control's shared identifiers, wording and pure
      // decisions; the Playwright suite imports the same values.
      import {
        DEVICE_LOCATION_STATUS_IDENTIFIER,
        DEVICE_LOCATION_STATUS_NAMES,
        DEVICE_LOCATION_STOP_IDENTIFIER,
        MAP_LAYER_BASE_ROW_IDENTIFIER_PREFIX,
        MAP_LAYER_SCENE_ROW_IDENTIFIER_PREFIX,
        MAP_LAYER_STYLE_ROW_IDENTIFIER_PREFIX,
        MAP_LAYER_TRAFFIC_IDENTIFIER,
        MAP_LAYERS_ACTIVE_DOT_CLASS_NAME,
        MAP_LAYERS_CONTROL_IDENTIFIER,
        MAP_LAYERS_CONTROL_LABEL,
        MAP_LAYERS_PANEL_IDENTIFIER,
        MAP_LAYERS_SERVING_TEXT,
        MAP_LAYERS_STATUS_IDENTIFIER,
        MY_LOCATION_CHIP_FILLED_MARK,
        ORIGIN_MY_LOCATION_CHIP_IDENTIFIER,
        DESTINATION_MY_LOCATION_CHIP_IDENTIFIER,
        TRAFFIC_FLOW_OVERLAY_WIDTH_PIXELS,
        TRAFFIC_REFRESH_DEBOUNCE_MILLISECONDS,
        base_row_credential_refusal,
        device_fix_display_text,
        device_location_status_text,
        is_non_default_layer_active,
        my_location_chip_label,
        traffic_capability_descriptor,
        traffic_layer_availability,
      } from './map_layers.mjs';
      import {
        TILE_LAYER_MODES,
        applyTileLayerMode,
        vectorStyleIdForDescriptor,
      } from './tile_switch.mjs';

      // The round-11 control-cluster / follow-camera glue: the §2.4 token
      // rows and the pure helpers live in the shared platform-glue module
      // (the Playwright specs import the same values, so page and tests
      // cannot drift).
      import {
        DIAGNOSTICS_BACKLOG_FLUSH_LIMIT,
        DIAGNOSTICS_DEBUG_SEVERITY_NAME,
        DIAGNOSTICS_EVENT_WINDOW,
        DIAGNOSTICS_MINIMUM_SEVERITY_NAME,
        DIAGNOSTICS_REFRESH_CADENCE_MILLISECONDS,
        MAP_CONTROL_ZOOM_STEP,
        MAP_CONTROL_ZOOM_REPEAT_INTERVAL_MILLISECONDS,
        COMPASS_VISIBILITY_BEARING_THRESHOLD_DEGREES,
        EASED_CAMERA_MOVE_DURATION_MILLISECONDS,
        NAVIGATION_FOLLOW_PITCH_3D_DEGREES,
        FOLLOW_BEARING_CHASE_TIME_CONSTANT_MILLISECONDS,
        FOLLOW_BEARING_SNAP_DISTANCE_DEGREES,
        FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR,
        FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS,
        FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
        FOLLOW_DEMO_SPEED_METERS_PER_SECOND,
        ExponentialValueChase,
        FollowCamera,
        SmoothstepTimedEase,
        TraceCursor,
        bearing_off_north_degrees,
        follow_zoom_toward_trip_end,
        initial_bearing_degrees,
        polyline_fix_at_travelled_meters,
        polyline_length_meters,
        scale_bar_distance_label_text,
        select_scale_bar_scale,
        signed_angular_difference_degrees,
        trace_dispatch_interval_milliseconds,
        LocationPoseAnimator,
      } from './map_controls.mjs';

      // Consumer copy (M28): every user-visible label of the page comes from
      // the shared module. Static markup carries the same canonical text as a
      // no-script-safe default and names its row with `data-ui-label`; the
      // pass below makes the module the rendered source. Dynamic labels call
      // the helpers directly, so no wording is written here twice.
      import { ui_label_text, ui_label_text_with_values } from './ui_strings.mjs';

      /**
       * Fills every `data-ui-label` element from the shared module: its text,
       * or the attribute named by `data-ui-label-attribute` (e.g. an input's
       * placeholder). `data-ui-label-aria` separately fills the accessible
       * name when it reads a different canonical row.
       */
      function apply_static_ui_strings() {
        for (const label_element of document.querySelectorAll('[data-ui-label]')) {
          const label_text = ui_label_text(label_element.dataset.uiLabel);
          const label_attribute = label_element.dataset.uiLabelAttribute;
          if (label_attribute === undefined) {
            label_element.textContent = label_text;
          } else {
            label_element.setAttribute(label_attribute, label_text);
          }
          const accessible_label_id = label_element.dataset.uiLabelAria;
          if (accessible_label_id !== undefined) {
            label_element.setAttribute('aria-label', ui_label_text(accessible_label_id));
          }
        }
      }
      apply_static_ui_strings();

      const INITIAL_ZOOM_LEVEL = 14;
      const FIELD_OF_VIEW_DEGREES = 60;
      /** Characters a query needs before type-ahead asks the provider. */
      const AUTOCOMPLETE_MINIMUM_QUERY_CHARACTERS = 3;
      /** Quiet period between the last keystroke and the type-ahead request. */
      const AUTOCOMPLETE_DEBOUNCE_MILLISECONDS = 250;
      /** The type-ahead row cap. */
      const AUTOCOMPLETE_MAXIMUM_RESULTS = 5;
      /** Full circle in degrees (the bearing's wrap modulus). */
      const FULL_CIRCLE_DEGREES = 360.0;
      const MINIMUM_ZOOM_LEVEL = 0;
      const MAXIMUM_ZOOM_LEVEL = 20;
      const ZOOM_WHEEL_SCALE = 0.0025;
      // Double click / double tap (round 36): one zoom level around the
      // pointer under the gesture, recognised within the interval and travel
      // the platform conventions use. A second tap beyond either bound starts
      // a fresh pair rather than zooming.
      const DOUBLE_TAP_ZOOM_STEP = 1.0;
      const DOUBLE_TAP_INTERVAL_MILLISECONDS = 350;
      const DOUBLE_TAP_MAXIMUM_MOVEMENT_PIXELS = 24;
      // How long after the last camera input the page reports the gesture
      // ended to the surface and draws the settle frame. The delay covers a
      // wheel's burst of ticks, one double-tap zoom and one keyboard step; a
      // pointer pan ends on its own pointerup.
      const CAMERA_GESTURE_SETTLE_DELAY_MILLISECONDS = 150;
      // The keyboard camera model (§4.2, accessibility): a focused map
      // answers the arrow keys with a pan, +/- with one zoom level,
      // Shift+arrows with rotation and tilt, and Home with a north-up 2D
      // reset. The pan step is CSS pixels so the same key travel reads the
      // same at every device ratio; the angle steps are degrees.
      const KEYBOARD_PAN_STEP_CSS_PIXELS = 100;
      const KEYBOARD_ZOOM_STEP_LEVELS = 1;
      const KEYBOARD_ROTATE_STEP_DEGREES = 5;
      const KEYBOARD_PITCH_STEP_DEGREES = 5;
      const MINIMUM_PITCH_DEGREES = 0;
      const MAXIMUM_PITCH_DEGREES = 60;
      // Rapid key repeats collapse into one spoken update instead of one per
      // keydown (a held arrow would otherwise queue a dozen polite messages).
      const MAP_STATUS_ANNOUNCEMENT_DELAY_MILLISECONDS = 150;
      // A visitor who asks the platform for less motion gets camera moves
      // applied immediately rather than eased (the stylesheet drops the
      // decorative transitions under the same media query).
      const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';
      function prefers_reduced_motion() {
        return typeof window.matchMedia === 'function'
          && window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
      }
      function eased_camera_move_duration_milliseconds() {
        return prefers_reduced_motion()
          ? 0
          : EASED_CAMERA_MOVE_DURATION_MILLISECONDS;
      }
      const TILE_COUNT_AT_ZOOM_ZERO = 1;
      const DEGREES_AT_ZOOM_ZERO = 360;
      // Canvas 2D ignores CSS var() style strings (docs/reference/BrowserLoop.md), so
      // the interactive 2D paints are literal constants mirroring the UX
      // doc's color tokens by name (docs/ReferenceAppUX.md §2.2): one entry
      // per theme, re-painted by the render loop after a theme switch.
      const SCENE_BACKGROUND_BY_THEME = { dark: '#161a20', light: '#dde5ee' };
      const TILE_FILL_BY_THEME = {
        dark: 'rgba(76, 141, 255, 0.10)',
        light: 'rgba(37, 99, 235, 0.08)',
      };
      const TILE_STROKE_BY_THEME = {
        dark: 'rgba(76, 141, 255, 0.70)',
        light: 'rgba(37, 99, 235, 0.75)',
      };
      const BACKGROUND_GRID_BY_THEME = {
        dark: 'rgba(255, 255, 255, 0.06)',
        light: 'rgba(0, 0, 0, 0.05)',
      };
      const TILE_FILL_BY_THEME_FALLBACK = TILE_FILL_BY_THEME.light;
      const TILE_STROKE_BY_THEME_FALLBACK = TILE_STROKE_BY_THEME.light;
      const BACKGROUND_GRID_FALLBACK = BACKGROUND_GRID_BY_THEME.light;
      const SCENE_BACKGROUND_FALLBACK = SCENE_BACKGROUND_BY_THEME.light;
      const CANVAS_GRID_SIZE = 32;
      // Phone-width breakpoint of the UX language; the CSS media query's
      // 560px literal mirrors this constant (see the stylesheet note above,
      // and docs/ReferenceAppUX.md §1).
      const PHONE_WIDTH_BREAKPOINT_PIXELS = 560;
      const PHONE_WIDTH_MEDIA_QUERY = `(max-width: ${PHONE_WIDTH_BREAKPOINT_PIXELS}px)`;
      // Short viewports compress the readout dock like phone widths do:
      // the multi-line dock would grow into the control cluster's compass
      // slot (the mirror media query's literal is in the <style> block).
      const SHORT_VIEWPORT_COMPACT_HEIGHT_PIXELS = 560;
      const SHORT_VIEWPORT_HEIGHT_MEDIA_QUERY = `(max-height: ${SHORT_VIEWPORT_COMPACT_HEIGHT_PIXELS}px)`;
      // Distance/duration formatting of the demo progress card.
      const METERS_PER_KILOMETER = 1000;
      const SECONDS_PER_MINUTE = 60;
      // The route card's ETA is the local clock time the route completes at,
      // from the shared millisecond conversion above.
      // The route card's mode and strategy captions: the contract vocabulary
      // the Directions control carries, spelled for the reader.
      const ROUTE_CARD_MODE_TEXTS = Object.freeze({
        automobile: 'Automobile',
        pedestrian: 'Pedestrian',
      });
      const ROUTE_CARD_STRATEGY_TEXTS = Object.freeze({
        fastest: 'Fastest',
        shortest: 'Shortest',
      });
      // The recorded demo route carries its own profile; no Directions choice
      // was sent for it, so the card names that profile instead of the control.
      const RECORDED_ROUTE_CARD_MODE_TEXT = 'Pedestrian';
      const RECORDED_ROUTE_CARD_STRATEGY_TEXT = 'Fastest';
      const OFFLINE_ROUTE_CARD_MODE_TEXT = 'Recorded';
      const OFFLINE_ROUTE_CARD_STRATEGY_TEXT = 'Fastest';
      // The flat-earth scale the traffic bounds fall back to at a steep pitch:
      // one degree of latitude, in meters.
      const METERS_PER_DEGREE_LATITUDE = 111_320;
      // The theme model (§3, owner ruling 2026-10-30): three explicit choices
      // — Light, Dark and Auto — with Auto as the default. Auto follows the
      // operating system's `prefers-color-scheme` live; an explicit Light or
      // Dark choice is remembered on this device and wins from then on.
      const THEME_CHOICE_NAMES = Object.freeze(['light', 'dark', 'auto']);
      const THEME_NAMES_CYCLING = Object.freeze({
        light: 'dark',
        dark: 'auto',
        auto: 'light',
      });
      const THEME_CHOICE_STORAGE_KEY = 'rusticMapsSdk.themeChoice';
      const DARK_COLOR_SCHEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

      // --- Round-11 page constants ---
      // The settled pump (§5.3's frame-settled discipline on the on-demand
      // render loop): a frame that finishes with missing tiles re-renders at
      // a fixed cadence while the budget lasts — unavailable fixtures never
      // settle, so the retries stay bounded and the count is published as a
      // frame fact.
      const SETTLED_PUMP_MAXIMUM_RETRY_RENDERS = 12;
      const SETTLED_PUMP_RETRY_DELAY_MILLISECONDS = 100;
      // The demo's performance monitor (owner ask, round 26): the page names
      // its own frame budget instead of leaving a slow interaction unexplained.
      // The window holds the last N GPU frames; a frame is slow when its
      // measured render time exceeds the 30-fps budget, or when frames keep
      // arriving below 30 fps while the page is actively animating. The
      // report always carries the observed cause (missing tiles, no WebGPU,
      // GPU-bound frame, throttled tab) so the fix is actionable.
      const PERFORMANCE_SAMPLE_WINDOW_FRAMES = 120;
      const SLOW_FRAME_MILLISECONDS = 33;
      const SLOW_FRAMES_PER_SECOND = 30;
      const ACTIVE_ANIMATION_MINIMUM_FRAMES = 8;
      const ACTIVE_ANIMATION_WINDOW_MILLISECONDS = 1000;
      // The first GPU frames pay one-time costs (pipeline creation, shader
      // warm-up, the initial upload burst) that say nothing about steady
      // state; they are excluded, and a verdict needs enough samples to be
      // meaningful. The steady-state figure is the median, so one hitched
      // frame never paints the whole session slow.
      const PERFORMANCE_WARMUP_FRAMES = 3;
      const PERFORMANCE_MINIMUM_SAMPLES_FOR_VERDICT = 5;
      // The frame-budget scenario (M23): the performance harness drives a
      // constant-velocity pan through `window.runFrameBudgetScenario`, then
      // waits this long for the last queued frame to land before reading the
      // samples, so the measured window ends on a completed frame.
      const FRAME_BUDGET_SAMPLE_SETTLE_DELAY_MILLISECONDS = 40;
      const MILLISECONDS_PER_SECOND = 1000;
      // The live raster fallback's ceiling when its registry descriptor
      // declares none (the web-tile grid's common top level).
      const LIVE_RASTER_FALLBACK_ZOOM_LEVEL = 19;
      // Hostnames the demo treats as local. A page served from one of them
      // keeps its tile traffic same-origin (the harness's fixture routes), so
      // an automated run never contacts a third-party tile service; a local
      // page opts into the live fallback with `?liveTiles`, and a deployed
      // page (the docs demo) enables it for every visitor.
      const LOCAL_DEMO_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
      const LIVE_TILES_OPT_IN_PARAMETER = 'liveTiles';
      // Diagnostics are opt-in (docs/design/ReferenceApplicationBehavior.md
      // §Diagnostics policy): the pane opens one bounded stream at Info and the
      // explicit Show debug events switch lowers it to Debug. Nothing is
      // subscribed before the visitor opens the pane, the window is the shared
      // 100-event bound, and the choice is never persisted (per session).
      // The pane's own displayed list resets when the visitor clears it; the
      // SDK ring is never emptied (a later flush can redeliver older events).
      let diagnostics_cleared_at_milliseconds = null;
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
      // The playback paces a visitor may pick (M27), applied to the route's
      // own walk speed; the remembered speed must be one of these.
      const FOLLOW_DEMO_SPEED_MULTIPLIERS = [1, 2, 4, 8];
      const DEFAULT_FOLLOW_DEMO_SPEED_MULTIPLIER = 1;

      const map_canvas = document.getElementById('map-canvas');
      const overlay_canvas = document.getElementById('map-overlay');
      // The control sheet's own element: the route framing's insets keep the
      // planned route clear of it (docs/ReferenceAppUX.md §4.2).
      const controls_sheet_element = document.getElementById('controls');
      // The trip planner's planned-route overlays (the polyline and the A/B
      // pins): plain `setOverlays` descriptors composed beside the scene
      // toggles over any base layer.
      let trip_route_overlays = [];
      // The offline-maps card's route line (the committed routing-graph demo
      // request): drawn beside the planned route and the scene overlays.
      let offline_route_overlays = [];
      // The traffic layer's single overlay (at most one), installed from the
      // capability's flow rows and cleared when the switch goes off. The
      // layer's own state lives beside it: one debounced refresh per camera
      // settle, at most one request in flight, and the counters the browser
      // suite reads.
      let traffic_flow_overlays = [];
      let traffic_layer_enabled = false;
      let traffic_refresh_debounce_timer = null;
      let traffic_refresh_in_flight = false;
      let traffic_refresh_pending = false;
      let traffic_last_camera_pose_key = null;
      let traffic_fetch_count = 0;
      let traffic_overlay_install_count = 0;
      let traffic_last_failure_text = null;
      // The panel's DOM is built later in this module; a credential restored
      // before then may ask for a refresh, which is a no-op until it is.
      let map_layers_panel_ready = false;
      // The route record behind those overlays, kept so the wasm `Navigator`
      // can start on the same geometry the camera follows (the overlays alone
      // carry no steps or maneuvers).
      let planned_route_record = null;
      // The demo plan the Advanced panel currently has selected: the artifact
      // definition plus its loaded recorded trace. While it is set (and no
      // later route plan superseded it) the simulated trip replays the trace's
      // own samples, exactly as the native `SimulatedTripDriver` does, instead
      // of walking a route polyline.
      let selected_demo_plan_trace = null;
      // Restores the remembered demo plan and camera preset once the plan
      // picker exists (installed inside the map-ready setup below).
      let restore_remembered_demo_content = async () => {};
      const status_element = document.getElementById('harness-status');
      // The keyboard model's spoken feedback (polite live region, visually
      // hidden): pan announces the new center, zoom the level, rotation the
      // bearing and tilt the pitch, so a screen-reader user can confirm every
      // keypress without seeing the frame.
      const map_status_element = document.getElementById('map-status');
      const status_line_element = document.getElementById('status-line');
      const readout_element = document.getElementById('readout');
      const renderer_readout_control = document.getElementById('renderer-readout-control');
      const trip_credential_action = document.getElementById('trip-credential-action');
      const remember_provider_credential =
        document.getElementById('remember-provider-credential');
      const settings_control = document.getElementById('settings-control');
      const bottom_start_dock_element = document.getElementById('bottom-start-dock');
      const error_report_element = document.getElementById('error-report');
      // Provider-echoing error report (docs/ReferenceAppUX.md §6.3): the origin
      // label names the failing surface, the detail is echoed verbatim, never
      // paraphrased or swallowed. Declared at module scope because both the
      // provider-capability section and the trip planner report through it.
      function show_error_report(origin_label, detail_text) {
        error_report_element.hidden = false;
        error_report_element.textContent = `${origin_label}: ${detail_text}`;
      }
      function clear_error_report() {
        error_report_element.hidden = true;
        error_report_element.textContent = '';
      }
      // Empties the structured route card without detaching its child nodes
      // (the live renderers keep references to them). Used when a credential
      // change invalidates every live result.
      function clear_trip_route_card() {
        for (const route_card_line of [
          trip_route_title,
          trip_route_facts,
          trip_route_directions,
          trip_route_eta,
          trip_route_maneuver,
          trip_route_note,
        ]) {
          route_card_line.textContent = '';
        }
        trip_route_maneuver.hidden = true;
        trip_route_note.hidden = true;
        trip_route_result.hidden = true;
      }
      // The phone bottom sheet reserves the measured bottom dock height, so
      // the status line, scale bar and a live error strip never draw over it.
      // The dock grows and shrinks (the scale bar appears at readiness, an
      // error strip raises it), and the observed height follows every change.
      function refresh_bottom_start_dock_height() {
        const dock_height_pixels = Math.ceil(
          bottom_start_dock_element.getBoundingClientRect().height,
        );
        document.documentElement.style.setProperty(
          '--bottom-start-dock-height', `${dock_height_pixels}px`);
      }
      refresh_bottom_start_dock_height();
      if (typeof ResizeObserver === 'function') {
        // Held in a binding so the observation outlives module evaluation.
        const bottom_start_dock_observer =
          new ResizeObserver(refresh_bottom_start_dock_height);
        bottom_start_dock_observer.observe(bottom_start_dock_element);
      }
      window.addEventListener('resize', refresh_bottom_start_dock_height);
      const controls = {
        zoom: document.getElementById('zoom-control'),
        bearing: document.getElementById('bearing-control'),
        pitch: document.getElementById('pitch-control'),
        overlay: document.getElementById('overlay-control'),
      };
      const value_labels = {
        zoom: document.getElementById('zoom-value'),
        bearing: document.getElementById('bearing-value'),
        pitch: document.getElementById('pitch-value'),
      };
      // The round-11 control cluster, scale bar, follow demo and
      // diagnostics elements (docs/ReferenceAppUX.md §4.2/§4.1).
      const compass_control = document.getElementById('compass-control');
      const compass_north_letter = document.getElementById('compass-north-letter');
      const zoom_out_control = document.getElementById('zoom-out-control');
      const zoom_in_control = document.getElementById('zoom-in-control');
      const my_location_control = document.getElementById('my-location-control');
      const device_navigation_control = document.getElementById('device-navigation-control');
      // The device-location state row lives in the layers panel; the settings
      // sheet's detail line keeps the navigation and fix prose.
      const device_location_status = document.getElementById(DEVICE_LOCATION_STATUS_IDENTIFIER);
      const device_location_stop_control =
        document.getElementById(DEVICE_LOCATION_STOP_IDENTIFIER);
      const device_location_detail = document.getElementById('device-location-detail');
      const plane_toggle_control = document.getElementById('plane-toggle-control');
      const scale_bar_element = document.getElementById('scale-bar-overlay');
      const scale_bar_label_element = document.getElementById('scale-bar-label-text');
      const scale_bar_line_element = document.getElementById('scale-bar-line');
      const follow_demo_start_control = document.getElementById('follow-demo-start-control');
      const follow_demo_live_line = document.getElementById('follow-demo-live-line');
      const follow_demo_playback_row = document.getElementById('follow-demo-playback');
      const follow_demo_speed_controls = document.getElementById('follow-demo-speed-controls');
      const follow_demo_pause_control = document.getElementById('follow-demo-pause-control');
      const follow_demo_seek_control = document.getElementById('follow-demo-seek-control');
      const follow_demo_seek_row = document.getElementById('follow-demo-seek-row');
      const diagnostics_refresh_control = document.getElementById('diagnostics-refresh-control');
      const diagnostics_facts_element = document.getElementById('diagnostics-facts-lines');
      const diagnostics_event_lines = document.getElementById('diagnostics-event-lines');

      // Provider credentials (M13/M15): the shared registry the dev server
      // serves describes every provider row, credential label and attribution
      // line. The panel renders those descriptors, so adding a provider never
      // edits this page. A runtime key registers the live provider set on the
      // wasm seam and never persists or logs the value.
      // Relative so the same page works at the site root and under the docs
      // site's /demo/ path (the registry is served beside the page there).
      const PROVIDERS_REGISTRY_URL = 'providers.json';
      // The harness seam: `?useProviderFixtures` points registration at the
      // registry's same-origin fixture routes, so the browser suite drives the
      // panel with no external network. Without it the panel registers the
      // provider's real platform URL.
      const use_provider_fixtures = new URLSearchParams(window.location.search)
        .has('useProviderFixtures');
      let providers_registry = { fixture_base_path: '/providers', providers: [] };
      try {
        providers_registry = await fetch(PROVIDERS_REGISTRY_URL).then((response) =>
          response.json(),
        );
      } catch {
        providers_registry = { fixture_base_path: '/providers', providers: [] };
      }
      const attribution_control = document.getElementById('attribution-control');
      const attribution_info_control = document.getElementById('attribution-info-control');
      const attribution_panel = document.getElementById('attribution-panel');
      const attribution_notice = document.getElementById('attribution-notice');
      // Only a provider this page actually uses contributes its attribution
      // line: a wasm-registered provider (a runtime credential), or a keyless
      // provider whose tile URL the base map paints. A descriptor the page
      // cannot use is excluded, so the panel never claims it.
      const registered_provider_descriptors = providers_registry.providers
        .filter((provider_descriptor) =>
          provider_descriptor.wasm_registration != null
          || typeof provider_descriptor.url_template === 'string'
          || typeof provider_descriptor.raster_url_template === 'string');
      const descriptor_attribution_texts = registered_provider_descriptors
        .map((provider_descriptor) => provider_descriptor.attribution_text)
        .filter((attribution_text) => typeof attribution_text === 'string'
          && attribution_text.trim() !== '');
      if (descriptor_attribution_texts.length > 0) {
        attribution_notice.textContent = descriptor_attribution_texts.join(' · ');
      } else {
        // No descriptor line: the control does not present an empty panel
        // (never a guess).
        attribution_info_control.hidden = true;
      }
      // The descriptors' terms notes join the panel (deduplicated like the
      // attribution lines); the panel is the compliance text's home, so no
      // always-visible line is needed on the map.
      const descriptor_terms_notes = registered_provider_descriptors
        .map((provider_descriptor) => provider_descriptor.terms_note)
        .filter((terms_note) => typeof terms_note === 'string'
          && terms_note.trim() !== '');
      for (const terms_note of Array.from(new Set(descriptor_terms_notes))) {
        const terms_note_element = document.createElement('p');
        terms_note_element.className = 'attribution-terms-note';
        terms_note_element.textContent = terms_note;
        attribution_panel.appendChild(terms_note_element);
      }
      function set_attribution_panel_open(is_open) {
        attribution_panel.hidden = !is_open;
        attribution_info_control.setAttribute('aria-expanded', String(is_open));
      }
      attribution_info_control.addEventListener('click', () => {
        set_attribution_panel_open(attribution_panel.hidden);
      });
      // The panel closes on Escape and on a tap outside the control.
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !attribution_panel.hidden) {
          set_attribution_panel_open(false);
          attribution_info_control.focus();
        }
      });
      document.addEventListener('pointerdown', (event) => {
        if (attribution_panel.hidden) return;
        if (!attribution_control.contains(event.target)) {
          set_attribution_panel_open(false);
        }
      }, true);

      const provider_credential_rows = document.getElementById('provider-credential-rows');
      const provider_credential_status = document.getElementById('provider-credential-status');
      const settings_credentials_status =
        document.getElementById('settings-credentials-status');
      const trip_origin_input = document.getElementById('trip-origin-input');
      const trip_origin_search_control =
        document.getElementById('trip-origin-search-control');
      const trip_destination_input = document.getElementById('trip-destination-input');
      const trip_destination_search_control =
        document.getElementById('trip-destination-search-control');
      const trip_search_results_element = document.getElementById('trip-search-results');
      const trip_suggestions_element = document.getElementById('trip-suggestions');
      const trip_swap_control = document.getElementById('trip-swap-control');
      const trip_source_line = document.getElementById('trip-source-line');
      const trip_plan_route_control = document.getElementById('trip-plan-route-control');
      const trip_plan_route_reason = document.getElementById('trip-plan-route-reason');
      const trip_route_result = document.getElementById('trip-route-result');
      const trip_route_title = document.getElementById('trip-route-title');
      const trip_route_facts = document.getElementById('trip-route-facts');
      const trip_route_directions = document.getElementById('trip-route-directions');
      const trip_route_eta = document.getElementById('trip-route-eta');
      const trip_route_maneuver = document.getElementById('trip-route-maneuver');
      const trip_route_note = document.getElementById('trip-route-note');
      // The provider-capability settings section: one row per capability the
      // registry offers on this platform, composed from the descriptors.
      const capability_providers_panel =
        document.getElementById('capability-providers-panel');
      const capability_provider_rows =
        document.getElementById('capability-provider-controls');
      const capability_provider_status = document.getElementById('capability-provider-status');
      // The diagnostics pane's opt-in controls (docs/design/ReferenceApplicationBehavior.md
      // §Diagnostics policy).
      const advanced_panel = document.getElementById('advanced-panel');
      const diagnostics_debug_events_control =
        document.getElementById('diagnostics-debug-toggle');
      const diagnostics_debug_events_label =
        document.getElementById('diagnostics-debug-events-label');
      const diagnostics_clear_control = document.getElementById('diagnostics-clear-control');
      const diagnostics_close_control = document.getElementById('diagnostics-close-control');
      const directions_mode_car_control = document.getElementById('directions-mode-car');
      const directions_mode_walk_control = document.getElementById('directions-mode-walk');
      const directions_strategy_row = document.getElementById('directions-strategy-row');
      const directions_strategy_fastest_control =
        document.getElementById('directions-strategy-fastest');
      const directions_strategy_shortest_control =
        document.getElementById('directions-strategy-shortest');
      const offline_route_control = document.getElementById('offline-route-control');
      const offline_route_result = document.getElementById('offline-route-result');
      const offline_route_facts = document.getElementById('offline-route-facts');
      const offline_maps_status = document.getElementById('offline-maps-status');
      const provider_tile_control = document.getElementById('provider-tile-control');
      const provider_tile_result = document.getElementById('provider-tile-result');
      const provider_tile_preview = document.getElementById('provider-tile-canvas');
      // The live-tile probe's address: the Sacramento tile at the playground's
      // zoom-14 camera, served by the same fixture route.
      const PROVIDER_TILE_DEMO_ZOOM_LEVEL = 14;
      const PROVIDER_TILE_DEMO_TILE_X = 2661;
      const PROVIDER_TILE_DEMO_TILE_Y = 6286;
      // The trip planner's route options (the contract's `RouteOptions`).
      // The mode and strategy are the visitor's Directions choice; the unit
      // system stays metric, the display unit the demo card reports in. An
      // unregistered provider still plans the committed recorded route, which
      // carries its own pedestrian/fastest profile.
      const DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE = 'automobile';
      const DIRECTIONS_TRANSPORTATION_MODE_PEDESTRIAN = 'pedestrian';
      const DIRECTIONS_ROUTE_STRATEGY_FASTEST = 'fastest';
      const DIRECTIONS_ROUTE_STRATEGY_SHORTEST = 'shortest';
      const DIRECTIONS_TRANSPORTATION_MODES = Object.freeze([
        DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE,
        DIRECTIONS_TRANSPORTATION_MODE_PEDESTRIAN,
      ]);
      const DIRECTIONS_ROUTE_STRATEGIES = Object.freeze([
        DIRECTIONS_ROUTE_STRATEGY_FASTEST,
        DIRECTIONS_ROUTE_STRATEGY_SHORTEST,
      ]);
      const DEFAULT_DIRECTIONS_TRANSPORTATION_MODE =
        DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE;
      const DEFAULT_DIRECTIONS_ROUTE_STRATEGY = DIRECTIONS_ROUTE_STRATEGY_FASTEST;
      const TRIP_PLANNER_UNIT_SYSTEM = 'metric';
      // The credential rows by provider key; declared here so the persistence
      // toggle's listener (below) can clear remembered keys.
      const provider_credential_controls_by_key = new Map();
      // The session's applied credential values by provider key: the capability
      // surface passes a credentialed provider's key to `configureProvider`, and
      // the value never leaves this module's memory unless the visitor chose to
      // remember it.
      const provider_credentials_by_key = new Map();
      // The capabilities a settings row can offer, in the contract's stable
      // order, with the registry's snake-case served-contract spelling and the
      // contract readback's camel-case spelling.
      const CAPABILITY_CONTRACT_NAMES = Object.freeze({
        geocoding: 'Geocoding',
        routing: 'Routing',
        distance_matrix: 'DistanceMatrix',
        place_search: 'PlaceSearch',
        traffic_incidents: 'TrafficIncidents',
        traffic_flow: 'TrafficFlow',
        elevation: 'Elevation',
        raster_tiles: 'RasterTiles',
        vector_tiles: 'VectorTiles',
        offline_routing: 'OfflineRouting',
      });
      // The capability title each row shows. These are capability names, never
      // provider names or raw contract spellings.
      const CAPABILITY_DISPLAY_NAMES = Object.freeze({
        geocoding: 'Geocoding',
        routing: 'Routing',
        distance_matrix: 'Distance matrix',
        place_search: 'Place search',
        traffic_incidents: 'Traffic incidents',
        traffic_flow: 'Traffic flow',
        elevation: 'Elevation',
        raster_tiles: 'Raster tiles',
      });
      // The routing row's id suffix, shared by its endpoint and next-step lines.
      const ROUTING_CAPABILITY_KEY = 'routing';
      // The stable picker-entry id shape the shared flow schema names, for
      // example `#capability-provider-choice-osrm`: one real option per
      // registry descriptor, keyed by its provider key (no vendor branch).
      const CAPABILITY_PROVIDER_CHOICE_IDENTIFIER_PREFIX = 'capability-provider-choice-';
      // The failures the routing row names, keyed by capability: a failed
      // selection and an unreachable route plan both point the visitor at the
      // retry-or-own-deployment next step.
      const capability_failure_text_by_key = new Map();
      const provider_keyless_status_text = ui_label_text('settings.keyless_status');

      /** The canonical applied sentence for one provider descriptor. */
      function provider_applied_status_text(provider_descriptor) {
        return ui_label_text_with_values('settings.credential_applied', {
          provider: provider_descriptor.display_name,
        });
      }
      // Persistence is an explicit opt-in (docs/ReferenceAppUX.md §6.5): the
      // key stays in memory unless the visitor ticks "Remember keys on this
      // device". The browser has no secure store, so a remembered key lives
      // in this origin's localStorage — never in git, a build or the artifact.
      const PROVIDER_CREDENTIAL_STORAGE_PREFIX = 'rusticMapsSdk.providerCredential.';
      const PROVIDER_CREDENTIAL_PERSISTENCE_STORAGE_KEY =
        'rusticMapsSdk.rememberProviderCredentials';
      const PROVIDER_CREDENTIAL_REMEMBERED_VALUE = 'true';
      function read_local_storage(storage_key) {
        try {
          return window.localStorage.getItem(storage_key);
        } catch {
          // Private mode and blocked site data make the store unreadable;
          // the demo then simply behaves as memory-only.
          return null;
        }
      }
      function write_local_storage(storage_key, storage_value) {
        try {
          if (storage_value === null) {
            window.localStorage.removeItem(storage_key);
          } else {
            window.localStorage.setItem(storage_key, storage_value);
          }
        } catch {
          // Same as above: persistence is best-effort, never a failure path.
        }
      }
      // The visitor's explicit demo choices, remembered as one versioned
      // record in this origin's localStorage. Only explicit selections are
      // written; a transient value (an open dialog, the current camera pose,
      // a route result) never enters the record, and provider credentials
      // stay in the separate opt-in store above.
      const DEMO_PREFERENCES_STORAGE_KEY = 'rustic-maps-demo-preferences';
      const DEMO_PREFERENCES_VERSION = 1;
      const DEMO_PLAN_SCENARIO_IDS = new Set(
        (REFERENCE_SCENE_ARTIFACT.demo_plans ?? []).map(
          (demo_plan) => demo_plan.scenario));
      const CAMERA_PRESET_IDS = new Set(
        REFERENCE_SCENE_ARTIFACT.camera_presets.map(
          (camera_preset) => camera_preset.id));
      const OVERLAY_SCENE_KEYS = new Set(
        Object.keys(REFERENCE_SCENE_ARTIFACT.overlay_scenes ?? {}));

      /** The record's defaults, also the shape every read is rebuilt into. */
      function default_demo_preferences() {
        return {
          version: DEMO_PREFERENCES_VERSION,
          themeChoice: 'auto',
          baseMap: null,
          trafficLayerEnabled: false,
          deviceLocationEnabled: false,
          directionsTransportationMode: DEFAULT_DIRECTIONS_TRANSPORTATION_MODE,
          directionsRouteStrategy: DEFAULT_DIRECTIONS_ROUTE_STRATEGY,
          demoPlanScenario: null,
          overlaySceneKeys: [],
          cameraPresetId: null,
          speedMultiplier: DEFAULT_FOLLOW_DEMO_SPEED_MULTIPLIER,
          originText: '',
          destinationText: '',
          lastSearchFieldKey: null,
          lastSearchQueryText: '',
          // One provider key per capability the visitor explicitly chose, so
          // a reload re-applies the same serving provider (§Provider selection
          // in the settings surface). Empty until the visitor picks one.
          capabilityProviders: {},
        };
      }

      function is_preference_object(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      }

      /** Keeps only a well-formed base-map selection; anything else is dropped. */
      function sanitized_base_map_preference(value) {
        if (!is_preference_object(value)) return null;
        if (value.mode === TILE_LAYER_MODES.raster) {
          return {
            mode: TILE_LAYER_MODES.raster,
            rasterProviderKey: typeof value.rasterProviderKey === 'string'
              ? value.rasterProviderKey
              : null,
          };
        }
        if (value.mode === TILE_LAYER_MODES.vector) {
          return {
            mode: TILE_LAYER_MODES.vector,
            vectorProviderKey: typeof value.vectorProviderKey === 'string'
              ? value.vectorProviderKey
              : null,
            vectorStyleId: typeof value.vectorStyleId === 'string'
              ? value.vectorStyleId
              : null,
          };
        }
        return null;
      }

      /** Keeps only well-formed per-capability provider choices. */
      function sanitized_capability_providers_preference(value) {
        if (!is_preference_object(value)) return {};
        const sanitized_choices = {};
        for (const capability_key of Object.keys(CAPABILITY_CONTRACT_NAMES)) {
          const provider_key = value[capability_key];
          if (typeof provider_key === 'string' && provider_key.trim() !== '') {
            sanitized_choices[capability_key] = provider_key;
          }
        }
        return sanitized_choices;
      }

      /**
       * Reads the remembered choices. Unknown keys are ignored, and a record
       * written by an incompatible version is dropped in favour of the
       * defaults rather than partially interpreted. A theme choice saved by
       * the older single-key store seeds the record once.
       */
      function read_demo_preferences() {
        const preferences = default_demo_preferences();
        const stored_text = read_local_storage(DEMO_PREFERENCES_STORAGE_KEY);
        if (stored_text === null) {
          const legacy_theme_choice = read_local_storage(THEME_CHOICE_STORAGE_KEY);
          if (THEME_CHOICE_NAMES.includes(legacy_theme_choice)) {
            preferences.themeChoice = legacy_theme_choice;
          }
          return preferences;
        }
        let stored_record;
        try {
          stored_record = JSON.parse(stored_text);
        } catch {
          return preferences;
        }
        if (!is_preference_object(stored_record)
          || stored_record.version !== DEMO_PREFERENCES_VERSION) {
          return preferences;
        }
        if (THEME_CHOICE_NAMES.includes(stored_record.themeChoice)) {
          preferences.themeChoice = stored_record.themeChoice;
        }
        preferences.baseMap = sanitized_base_map_preference(stored_record.baseMap);
        preferences.trafficLayerEnabled = stored_record.trafficLayerEnabled === true;
        preferences.deviceLocationEnabled =
          stored_record.deviceLocationEnabled === true;
        if (DIRECTIONS_TRANSPORTATION_MODES.includes(
          stored_record.directionsTransportationMode)) {
          preferences.directionsTransportationMode =
            stored_record.directionsTransportationMode;
        }
        if (DIRECTIONS_ROUTE_STRATEGIES.includes(
          stored_record.directionsRouteStrategy)) {
          preferences.directionsRouteStrategy = stored_record.directionsRouteStrategy;
        }
        if (DEMO_PLAN_SCENARIO_IDS.has(stored_record.demoPlanScenario)) {
          preferences.demoPlanScenario = stored_record.demoPlanScenario;
        }
        if (Array.isArray(stored_record.overlaySceneKeys)) {
          preferences.overlaySceneKeys = stored_record.overlaySceneKeys.filter(
            (scene_key) => OVERLAY_SCENE_KEYS.has(scene_key));
        }
        if (CAMERA_PRESET_IDS.has(stored_record.cameraPresetId)) {
          preferences.cameraPresetId = stored_record.cameraPresetId;
        }
        if (FOLLOW_DEMO_SPEED_MULTIPLIERS.includes(stored_record.speedMultiplier)) {
          preferences.speedMultiplier = stored_record.speedMultiplier;
        }
        if (typeof stored_record.originText === 'string') {
          preferences.originText = stored_record.originText;
        }
        if (typeof stored_record.destinationText === 'string') {
          preferences.destinationText = stored_record.destinationText;
        }
        if (stored_record.lastSearchFieldKey === 'origin'
          || stored_record.lastSearchFieldKey === 'destination') {
          preferences.lastSearchFieldKey = stored_record.lastSearchFieldKey;
        }
        if (typeof stored_record.lastSearchQueryText === 'string') {
          preferences.lastSearchQueryText = stored_record.lastSearchQueryText;
        }
        preferences.capabilityProviders =
          sanitized_capability_providers_preference(
            stored_record.capabilityProviders);
        return preferences;
      }

      // The snapshot the page restores from: taken once at start-up, so a
      // choice made while the renderer is still initializing can never be
      // overwritten by its own written record.
      const initial_demo_preferences = read_demo_preferences();
      let demo_preferences = { ...initial_demo_preferences };
      // The Directions choices every route plan carries. The wasm façade
      // exposes `routeCapabilities()`, but this demo does not gate the control
      // on it: the selected pair is sent, and a provider without a shortest
      // switch applies its own documented ranking. The route card states
      // the mode and strategy the plan carried.
      let directions_transportation_mode =
        initial_demo_preferences.directionsTransportationMode;
      let directions_route_strategy =
        initial_demo_preferences.directionsRouteStrategy;

      /** The `RouteOptions` object the live plan call sends. */
      function current_directions_route_options() {
        return {
          transportationMode: directions_transportation_mode,
          routeStrategy: directions_route_strategy,
          unitSystem: TRIP_PLANNER_UNIT_SYSTEM,
        };
      }

      /** Reflects both choices on the pressed-choice groups. The strategy
       * applies to automobile plans, so its row is hidden while the plan
       * walks (the walk keeps a remembered strategy for the next car plan). */
      function refresh_directions_controls() {
        const is_automobile =
          directions_transportation_mode === DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE;
        directions_mode_car_control.setAttribute('aria-pressed', String(is_automobile));
        directions_mode_walk_control.setAttribute('aria-pressed', String(!is_automobile));
        directions_strategy_fastest_control.setAttribute(
          'aria-pressed',
          String(directions_route_strategy === DIRECTIONS_ROUTE_STRATEGY_FASTEST));
        directions_strategy_shortest_control.setAttribute(
          'aria-pressed',
          String(directions_route_strategy === DIRECTIONS_ROUTE_STRATEGY_SHORTEST));
        directions_strategy_row.hidden = !is_automobile;
      }

      /** Applies one mode choice, remembers it and refreshes the groups. */
      function set_directions_transportation_mode(transportation_mode) {
        directions_transportation_mode = transportation_mode;
        write_demo_preferences({ directionsTransportationMode: transportation_mode });
        refresh_directions_controls();
      }

      /** Applies one strategy choice, remembers it and refreshes the groups. */
      function set_directions_route_strategy(route_strategy) {
        directions_route_strategy = route_strategy;
        write_demo_preferences({ directionsRouteStrategy: route_strategy });
        refresh_directions_controls();
      }

      refresh_directions_controls();

      /** Merges one explicit choice into the record and persists it. */
      function write_demo_preferences(changed_preferences) {
        demo_preferences = {
          ...demo_preferences,
          ...changed_preferences,
          version: DEMO_PREFERENCES_VERSION,
        };
        write_local_storage(
          DEMO_PREFERENCES_STORAGE_KEY, JSON.stringify(demo_preferences));
        // The record now owns the theme choice; the older single-key store
        // is retired so a reset can never resurrect it.
        write_local_storage(THEME_CHOICE_STORAGE_KEY, null);
      }

      /** Forgets every remembered demo choice (the credential store stays). */
      function clear_demo_preferences() {
        demo_preferences = default_demo_preferences();
        write_local_storage(DEMO_PREFERENCES_STORAGE_KEY, null);
        write_local_storage(THEME_CHOICE_STORAGE_KEY, null);
      }

      let remember_provider_credentials =
        read_local_storage(PROVIDER_CREDENTIAL_PERSISTENCE_STORAGE_KEY)
          === PROVIDER_CREDENTIAL_REMEMBERED_VALUE;
      remember_provider_credential.checked = remember_provider_credentials;
      remember_provider_credential.addEventListener('change', () => {
        remember_provider_credentials = remember_provider_credential.checked;
        write_local_storage(
          PROVIDER_CREDENTIAL_PERSISTENCE_STORAGE_KEY,
          remember_provider_credentials ? PROVIDER_CREDENTIAL_REMEMBERED_VALUE : null,
        );
        if (!remember_provider_credentials) {
          for (const provider_key of provider_credential_controls_by_key.keys()) {
            write_local_storage(PROVIDER_CREDENTIAL_STORAGE_PREFIX + provider_key, null);
          }
        }
      });
      // The provider panels' honest keyless reset: every live result is
      // cleared when the credential is cleared.
      function clear_provider_probe_results() {
        trip_search_results_element.textContent = '';
        trip_search_results_element.hidden = true;
        clear_trip_route_card();
        provider_tile_result.textContent = '';
        provider_tile_preview.hidden = true;
      }
      // The trip planner's status line: informational unless the message
      // reports a refusal (`warning`) or a confirmed ready state (`success`),
      // so ordinary guidance never dresses itself in the warning color.
      function set_provider_status(text, tone = 'info') {
        provider_credential_status.textContent = text;
        provider_credential_status.dataset.tone = tone;
      }
      // The settings sheet's own status line: credential feedback appears
      // where the user acted, not behind the dialog in the trip planner.
      function set_settings_credentials_status(text) {
        settings_credentials_status.hidden = text === null;
        settings_credentials_status.textContent = text ?? '';
      }
      // Renders one credential row per registry descriptor: display name,
      // credential label, masked input, Apply/Clear, terms note. A provider
      // the wasm build reports unavailable renders disabled with its reason.
      // The provider keys applied in this session: the trip planner uses live
      // search/routing only when at least one registration succeeded.
      const applied_provider_keys = new Set();
      function render_provider_credential_rows() {
        provider_credential_rows.textContent = '';
        provider_credential_controls_by_key.clear();
        for (const provider_descriptor of providers_registry.providers) {
          // A keyless descriptor (no credential label) renders no settings
          // row, so a provider registered elsewhere never paints an empty row.
          if (typeof provider_descriptor.credential_label !== 'string'
            || provider_descriptor.credential_label.trim() === '') {
            continue;
          }
          const row_element = document.createElement('div');
          row_element.className = 'provider-credential-row';
          row_element.dataset.providerKey = provider_descriptor.provider_key;
          const registration_available =
            provider_descriptor.registration_available?.wasm === true;

          const label_row_element = document.createElement('div');
          label_row_element.className = 'provider-credential-label-row';
          const label_element = document.createElement('label');
          label_element.textContent =
            `${provider_descriptor.display_name} ${provider_descriptor.credential_label}`;
          const applied_chip_element = document.createElement('span');
          applied_chip_element.className = 'provider-applied-chip';
          applied_chip_element.textContent = ui_label_text_with_values(
            'settings.credential_applied',
            { provider: provider_descriptor.display_name },
          );
          applied_chip_element.hidden = true;
          label_row_element.append(label_element, applied_chip_element);

          const field_element = document.createElement('div');
          field_element.className = 'provider-credential-field';
          const input_element = document.createElement('input');
          input_element.id = `provider-credential-input-${provider_descriptor.provider_key}`;
          label_element.htmlFor = input_element.id;
          input_element.type = 'password';
          input_element.autocomplete = 'off';
          input_element.spellcheck = false;
          input_element.placeholder = registration_available
            ? 'Paste the key'
            : 'Not available on this platform';
          input_element.dataset.providerCredentialInput = '';
          input_element.disabled = !registration_available;

          const visibility_element = document.createElement('button');
          visibility_element.type = 'button';
          visibility_element.className = 'provider-credential-visibility';
          visibility_element.textContent = 'Show';
          visibility_element.dataset.providerCredentialVisibility = '';
          visibility_element.setAttribute('aria-label', 'Show key');
          visibility_element.setAttribute('aria-pressed', 'false');
          visibility_element.disabled = !registration_available;
          field_element.append(input_element, visibility_element);

          const hint_element = document.createElement('p');
          hint_element.className = 'provider-hint';
          hint_element.textContent = provider_descriptor.settings_hint ?? '';
          hint_element.hidden = hint_element.textContent.trim() === '';

          const apply_element = document.createElement('button');
          apply_element.type = 'button';
          apply_element.className = 'primary';
          apply_element.textContent = 'Apply';
          apply_element.dataset.providerCredentialApply = '';
          apply_element.disabled = !registration_available;
          const clear_element = document.createElement('button');
          clear_element.type = 'button';
          clear_element.textContent = 'Clear';
          clear_element.dataset.providerCredentialClear = '';
          clear_element.disabled = !registration_available;

          const terms_element = document.createElement('p');
          terms_element.className = 'provider-terms-note';
          terms_element.textContent = provider_descriptor.terms_note ?? '';
          const actions_element = document.createElement('div');
          actions_element.className = 'provider-credential-actions';
          actions_element.append(apply_element, clear_element);

          row_element.append(
            label_row_element,
            field_element,
            hint_element,
            actions_element,
            terms_element,
          );
          provider_credential_rows.appendChild(row_element);
          provider_credential_controls_by_key.set(provider_descriptor.provider_key, {
            provider_descriptor,
            input_element,
            visibility_element,
            applied_chip_element,
            apply_element,
            clear_element,
            registration_available,
          });
        }
      }
      render_provider_credential_rows();

      // --- Provider capabilities (docs/design/ReferenceApplicationBehavior.md
      // §Provider selection, descriptors and endpoints) ---
      // One row per capability the registry offers on this platform. The row
      // and every picker entry compose "{display name} · {credential state}";
      // no vendor name, key or URL is spelled here, and a keyless routing
      // provider receives its descriptor's `demo_base_url` as the deployment
      // address instead of an empty credential.

      /** Whether a descriptor needs a runtime credential before it can serve. */
      function capability_descriptor_requires_credential(provider_descriptor) {
        return typeof provider_descriptor.credential_label === 'string'
          && provider_descriptor.credential_label.trim() !== '';
      }

      /** The credential state one descriptor renders (never a bare state). */
      function provider_capability_state_text(provider_descriptor) {
        if (capability_descriptor_requires_credential(provider_descriptor)) {
          return provider_credentials_by_key.has(provider_descriptor.provider_key)
            ? ui_label_text('settings.provider_state_ready')
            : ui_label_text_with_values(
              'settings.provider_state_needs_credential',
              { credential: provider_descriptor.credential_label },
            );
        }
        return typeof provider_descriptor.demo_base_url === 'string'
          && provider_descriptor.demo_base_url.trim() !== ''
          ? ui_label_text('settings.provider_state_ready')
          : ui_label_text('settings.provider_state_not_configured');
      }

      /** The one row composition the serving line and every picker entry use. */
      function provider_capability_row_text(provider_descriptor) {
        return ui_label_text_with_values('settings.provider_row', {
          provider: provider_descriptor.display_name,
          state: provider_capability_state_text(provider_descriptor),
        });
      }

      /** The descriptors that declare one capability and can serve on wasm. */
      function capability_provider_descriptors(capability_key) {
        return providers_registry.providers.filter((provider_descriptor) =>
          Array.isArray(provider_descriptor.served_contracts)
          && provider_descriptor.served_contracts.includes(capability_key)
          && provider_descriptor.registration_available?.wasm === true);
      }

      /** The capabilities this platform can offer a provider picker for. */
      function offered_capability_keys() {
        return Object.keys(CAPABILITY_CONTRACT_NAMES).filter(
          (capability_key) => capability_provider_descriptors(capability_key).length > 0,
        );
      }

      /** The provider registrations readback, or an empty list before ready. */
      function current_provider_registrations() {
        try {
          return window.mapTest?.providerRegistrations?.() ?? [];
        } catch {
          return [];
        }
      }

      /** The registration row for one capability, or null when unregistered. */
      function provider_registration_for(capability_key) {
        const contract_name = CAPABILITY_CONTRACT_NAMES[capability_key];
        return Array.from(current_provider_registrations()).find(
          (registration) => registration.contract === contract_name
            && registration.registered,
        ) ?? null;
      }

      /** True when a routing provider serves the plan call. */
      function routing_provider_is_registered() {
        return provider_registration_for(ROUTING_CAPABILITY_KEY) !== null;
      }

      /** Shows one capability-section status message, or hides it with null. */
      function set_capability_provider_status(text) {
        capability_provider_status.hidden = text === null;
        capability_provider_status.textContent = text ?? '';
      }

      /** The verbatim failure detail of a thrown wasm value, without the
       * JavaScript "Error:" decoration the SDK detail never carries. */
      function provider_failure_text(error) {
        return typeof error?.message === 'string' ? error.message : String(error);
      }

      /**
       * Builds the capability rows once from the descriptor registry. A
       * capability with no descriptor available on this platform gets no row.
       */
      function render_capability_provider_rows() {
        capability_provider_rows.textContent = '';
        const capability_keys = offered_capability_keys();
        capability_providers_panel.hidden = capability_keys.length === 0;
        for (const capability_key of capability_keys) {
          const row_element = document.createElement('div');
          row_element.className = 'capability-provider-row';
          row_element.id = `capability-provider-row-${capability_key}`;
          row_element.dataset.capability = capability_key;

          const heading_element = document.createElement('div');
          heading_element.className = 'capability-provider-heading';
          const title_element = document.createElement('span');
          title_element.className = 'capability-provider-title';
          title_element.textContent = CAPABILITY_DISPLAY_NAMES[capability_key]
            ?? capability_key;
          const serving_element = document.createElement('span');
          serving_element.className = 'capability-provider-serving';
          serving_element.id = `capability-provider-serving-${capability_key}`;
          heading_element.append(title_element, serving_element);

          const picker_element = document.createElement('select');
          picker_element.id = `capability-provider-select-${capability_key}`;
          picker_element.className = 'capability-provider-select';
          picker_element.setAttribute(
            'aria-label', `${CAPABILITY_DISPLAY_NAMES[capability_key] ?? capability_key} provider`);
          const unconfigured_option = document.createElement('option');
          unconfigured_option.value = '';
          unconfigured_option.textContent =
            ui_label_text('settings.provider_state_not_configured');
          picker_element.appendChild(unconfigured_option);
          for (const provider_descriptor of
               capability_provider_descriptors(capability_key)) {
            const option_element = document.createElement('option');
            option_element.value = provider_descriptor.provider_key;
            option_element.id = CAPABILITY_PROVIDER_CHOICE_IDENTIFIER_PREFIX
              + provider_descriptor.provider_key;
            option_element.dataset.providerKey = provider_descriptor.provider_key;
            option_element.dataset.providerRole =
              capability_descriptor_requires_credential(provider_descriptor)
                ? 'credentialed'
                : 'keyless';
            picker_element.appendChild(option_element);
          }
          picker_element.addEventListener('change', () => {
            const chosen_descriptor = capability_provider_descriptors(capability_key)
              .find((provider_descriptor) =>
                provider_descriptor.provider_key === picker_element.value);
            if (chosen_descriptor === undefined) {
              refresh_capability_provider_rows();
              return;
            }
            select_capability_provider(capability_key, chosen_descriptor);
          });

          const endpoint_element = document.createElement('p');
          endpoint_element.className = 'capability-provider-endpoint';
          endpoint_element.id = `capability-provider-endpoint-${capability_key}`;
          endpoint_element.hidden = true;

          const next_step_element = document.createElement('p');
          next_step_element.className = 'capability-provider-next-step';
          next_step_element.id = `capability-provider-next-step-${capability_key}`;
          next_step_element.hidden = true;

          row_element.append(
            heading_element,
            picker_element,
            endpoint_element,
            next_step_element,
          );
          capability_provider_rows.appendChild(row_element);
        }
      }

      /**
       * Reflects the serving provider, every picker entry's composed state and
       * the routing row's endpoint/next-step lines. Runs on registration
       * changes only; the rows themselves are built once.
       */
      function refresh_capability_provider_rows() {
        for (const capability_key of offered_capability_keys()) {
          const row_element =
            document.getElementById(`capability-provider-row-${capability_key}`);
          if (row_element === null) continue;
          const serving_element =
            document.getElementById(`capability-provider-serving-${capability_key}`);
          const picker_element =
            document.getElementById(`capability-provider-select-${capability_key}`);
          const endpoint_element =
            document.getElementById(`capability-provider-endpoint-${capability_key}`);
          const next_step_element =
            document.getElementById(`capability-provider-next-step-${capability_key}`);
          const descriptors = capability_provider_descriptors(capability_key);
          const registration = provider_registration_for(capability_key);
          const serving_descriptor = registration === null
            ? null
            : descriptors.find((provider_descriptor) =>
              provider_descriptor.provider_key === registration.providerKey) ?? null;

          serving_element.textContent = serving_descriptor === null
            ? ui_label_text('settings.provider_state_not_configured')
            : provider_capability_row_text(serving_descriptor);
          picker_element.value = serving_descriptor?.provider_key ?? '';
          for (const option_element of picker_element.options) {
            if (option_element.value === '') {
              option_element.textContent =
                ui_label_text('settings.provider_state_not_configured');
              continue;
            }
            const option_descriptor = descriptors.find((provider_descriptor) =>
              provider_descriptor.provider_key === option_element.value);
            if (option_descriptor !== undefined) {
              option_element.textContent = provider_capability_row_text(option_descriptor);
            }
          }

          const demo_base_url = serving_descriptor?.demo_base_url;
          const has_demo_base_url = typeof demo_base_url === 'string'
            && demo_base_url.trim() !== '';
          endpoint_element.hidden = !(
            capability_key === ROUTING_CAPABILITY_KEY && has_demo_base_url);
          endpoint_element.textContent = has_demo_base_url
            ? ui_label_text_with_values(
              'settings.routing_demo_endpoint', { url: demo_base_url })
            : '';

          const failure_text = capability_failure_text_by_key.get(capability_key);
          next_step_element.hidden = failure_text === undefined;
          next_step_element.textContent = failure_text === undefined
            ? ''
            : `${failure_text} ${ui_label_text('settings.routing_unreachable_next_step')}`;
        }
      }

      /**
       * Configures one capability from a chosen descriptor. A credentialed
       * provider needs this session's key; a keyless routing provider receives
       * its descriptor's demo address as the deployment address. Any refusal
       * crosses verbatim, the previous provider keeps serving and nothing
       * falls back. A user selection is remembered in the versioned record; a
       * startup restore passes `remember: false` and stays quiet.
       */
      function select_capability_provider(capability_key, provider_descriptor,
        { remember = true, announce = true } = {}) {
        const credential_value = capability_descriptor_requires_credential(
          provider_descriptor)
          ? provider_credentials_by_key.get(provider_descriptor.provider_key)
          : provider_descriptor.demo_base_url;
        if (capability_descriptor_requires_credential(provider_descriptor)
          && credential_value === undefined) {
          if (announce) {
            set_capability_provider_status(
              ui_label_text_with_values('settings.provider_state_needs_credential', {
                credential: provider_descriptor.credential_label,
              }),
            );
          }
          refresh_capability_provider_rows();
          return false;
        }
        if (!capability_descriptor_requires_credential(provider_descriptor)
          && (typeof credential_value !== 'string'
            || credential_value.trim() === '')) {
          if (announce) {
            set_capability_provider_status(
              'The descriptor declares no demo address, so there is nothing to select.',
            );
          }
          refresh_capability_provider_rows();
          return false;
        }
        try {
          if (use_provider_fixtures) {
            // The harness override is a test seam only: the same-origin
            // fixture routes stand in for the deployment the descriptor names.
            window.mapTest.setProviderBaseUrl(
              provider_descriptor.wasm_registration ?? provider_descriptor.provider_key,
              `${window.location.origin}${providers_registry.fixture_base_path}`
                + `/${provider_descriptor.provider_key}`,
            );
          }
          window.mapTest.configureProvider(
            CAPABILITY_CONTRACT_NAMES[capability_key],
            provider_descriptor.provider_key,
            credential_value,
          );
          capability_failure_text_by_key.delete(capability_key);
          if (announce) {
            set_capability_provider_status(
              provider_capability_row_text(provider_descriptor));
          }
          clear_error_report();
          if (remember) {
            write_demo_preferences({
              capabilityProviders: {
                ...demo_preferences.capabilityProviders,
                [capability_key]: provider_descriptor.provider_key,
              },
            });
          }
        } catch (error) {
          const failure_text = provider_failure_text(error);
          capability_failure_text_by_key.set(capability_key, failure_text);
          if (announce) {
            set_capability_provider_status(failure_text);
          }
          show_error_report('Provider selection', failure_text);
          refresh_capability_provider_rows();
          return false;
        }
        refresh_capability_provider_rows();
        return true;
      }

      /**
       * Re-applies the remembered per-capability choices once the SDK can
       * accept them. A descriptor the registry no longer offers is skipped,
       * never guessed, so the row keeps stating what actually serves.
       */
      function restore_remembered_capability_providers() {
        const remembered_choices =
          initial_demo_preferences.capabilityProviders ?? {};
        for (const capability_key of offered_capability_keys()) {
          const provider_key = remembered_choices[capability_key];
          if (typeof provider_key !== 'string') continue;
          const provider_descriptor = capability_provider_descriptors(
            capability_key).find((candidate_descriptor) =>
            candidate_descriptor.provider_key === provider_key);
          if (provider_descriptor === undefined) continue;
          select_capability_provider(capability_key, provider_descriptor, {
            remember: false,
            announce: false,
          });
        }
      }

      render_capability_provider_rows();

      /** Reflects the keyless/applied state on the trip card and the gear. */
      function refresh_credential_state() {
        const has_applied_key = applied_provider_keys.size > 0;
        trip_credential_action.dataset.state =
          has_applied_key ? 'applied' : 'keyless';
        trip_credential_action.querySelector('.credential-action-label').textContent =
          has_applied_key ? 'Key applied — Manage' : 'Add a provider key';
        trip_credential_action.setAttribute(
          'aria-label',
          has_applied_key ? 'Key applied — manage provider keys' : 'Add a provider key',
        );
        settings_control.classList.toggle('needs-attention', !has_applied_key);
        settings_control.setAttribute(
          'aria-label', ui_label_text('settings.open_accessibility'));
        for (const [provider_key, provider_control] of
             provider_credential_controls_by_key) {
          provider_control.applied_chip_element.hidden =
            !applied_provider_keys.has(provider_key);
        }
      }
      refresh_credential_state();

      /** Applies one credential through the wasm registration seam. */
      async function apply_provider_credential(provider_control, credential_value,
        { persist = false } = {}) {
        if (use_provider_fixtures) {
          // The harness serves the provider's recorded routes same-origin; the
          // base URL override is keyed by the registry's wasm dispatch key.
          window.mapTest.setProviderBaseUrl(
            provider_control.provider_descriptor.wasm_registration
              ?? provider_control.provider_descriptor.provider_key,
            `${window.location.origin}${providers_registry.fixture_base_path}`
              + `/${provider_control.provider_descriptor.provider_key}`,
          );
        }
        const { provider_descriptor } = provider_control;
        // One credential fills every capability the descriptor declares, each
        // through the provider-keyed call, so the row's own key decides which
        // provider is registered instead of a fixed convenience export.
        const served_contract_keys = Array.isArray(provider_descriptor.served_contracts)
          ? provider_descriptor.served_contracts : [];
        const served_contract_names = served_contract_keys
          .map((contract_key) => CAPABILITY_CONTRACT_NAMES[contract_key])
          .filter((contract_name) => contract_name !== undefined);
        if (served_contract_names.length === 0) {
          throw new Error(
            `${provider_descriptor.display_name} declares no capability this build can register.`,
          );
        }
        for (const contract_name of served_contract_names) {
          window.mapTest.configureProvider(
            contract_name,
            provider_descriptor.provider_key,
            credential_value,
          );
        }
        provider_credentials_by_key.set(
          provider_descriptor.provider_key, credential_value);
        applied_provider_keys.add(provider_control.provider_descriptor.provider_key);
        if (persist) {
          write_local_storage(
            PROVIDER_CREDENTIAL_STORAGE_PREFIX
              + provider_control.provider_descriptor.provider_key,
            credential_value,
          );
        }
      }
      window.mapTestReady.then(() => {
        for (const provider_control of provider_credential_controls_by_key.values()) {
          const {
            provider_descriptor,
            input_element,
            visibility_element,
            apply_element,
            clear_element,
            registration_available,
          } = provider_control;
          if (!registration_available) {
            continue;
          }
          visibility_element.addEventListener('click', () => {
            const is_visible = input_element.type === 'text';
            input_element.type = is_visible ? 'password' : 'text';
            visibility_element.textContent = is_visible ? 'Show' : 'Hide';
            visibility_element.setAttribute(
              'aria-label', is_visible ? 'Show key' : 'Hide key');
            visibility_element.setAttribute('aria-pressed', String(!is_visible));
            input_element.focus();
          });
          apply_element.addEventListener('click', async () => {
            const credential_value = input_element.value.trim();
            if (credential_value === '') {
              set_provider_status('Enter a provider key first.', 'warning');
              set_settings_credentials_status('Enter a provider key first.');
              return;
            }
            try {
              await apply_provider_credential(provider_control, credential_value, {
                persist: remember_provider_credentials,
              });
              input_element.value = '';
              input_element.type = 'password';
              visibility_element.textContent = 'Show';
              visibility_element.setAttribute('aria-label', 'Show key');
              visibility_element.setAttribute('aria-pressed', 'false');
              refresh_credential_state();
              refresh_capability_provider_rows();
              refresh_map_layers_panel();
              maybe_restore_remembered_traffic_layer();
              set_provider_status(
                provider_applied_status_text(provider_descriptor), 'success');
              set_settings_credentials_status(
                remember_provider_credentials
                  ? 'Applied — live providers ready, and this key is remembered on this device.'
                  : 'Applied — live providers ready.');
            } catch (error) {
              set_provider_status(`Refused: ${String(error)}`, 'warning');
              set_settings_credentials_status(`Refused: ${String(error)}`);
            }
          });
          clear_element.addEventListener('click', () => {
            window.mapTest.clearProviderRegistrations();
            applied_provider_keys.clear();
            provider_credentials_by_key.delete(provider_descriptor.provider_key);
            capability_failure_text_by_key.clear();
            refresh_capability_provider_rows();
            input_element.value = '';
            input_element.type = 'password';
            visibility_element.textContent = 'Show';
            visibility_element.setAttribute('aria-label', 'Show key');
            visibility_element.setAttribute('aria-pressed', 'false');
            clear_provider_probe_results();
            write_local_storage(
              PROVIDER_CREDENTIAL_STORAGE_PREFIX + provider_descriptor.provider_key,
              null,
            );
            refresh_credential_state();
            // A cleared key takes the traffic layer with it, honestly.
            refresh_map_layers_panel();
            set_provider_status(provider_keyless_status_text);
            set_settings_credentials_status('Cleared — back to the demo places.');
          });
          // A remembered key re-applies quietly on the next visit.
          const remembered_value = read_local_storage(
            PROVIDER_CREDENTIAL_STORAGE_PREFIX + provider_descriptor.provider_key);
          if (remembered_value !== null && remembered_value.trim() !== '') {
            apply_provider_credential(provider_control, remembered_value)
              .then(() => {
                refresh_credential_state();
                refresh_capability_provider_rows();
                refresh_map_layers_panel();
                maybe_restore_remembered_traffic_layer();
                set_provider_status(
                  provider_applied_status_text(provider_descriptor), 'success');
              })
              .catch((error) => {
                set_settings_credentials_status(
                  `A remembered key could not be applied: ${String(error)}`);
              });
          }
        }
        refresh_credential_state();
        if (applied_provider_keys.size === 0) {
          set_provider_status(provider_keyless_status_text);
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
            input: trip_origin_input,
            search_control: trip_origin_search_control,
            selected_place: null,
          },
          destination: {
            input: trip_destination_input,
            search_control: trip_destination_search_control,
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
          trip_plan_route_control.disabled = missing_field_keys.length > 0;
          trip_plan_route_reason.hidden = missing_field_keys.length === 0;
          if (missing_field_keys.length === 0) {
            trip_plan_route_reason.textContent = '';
            return;
          }
          trip_plan_route_reason.textContent = missing_field_keys.length === 2
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
          trip_suggestions_element.textContent = '';
          for (const demo_place of demo_places) {
            const suggestion_chip = document.createElement('button');
            suggestion_chip.type = 'button';
            suggestion_chip.className = 'trip-suggestion-chip';
            suggestion_chip.textContent = demo_place.name;
            suggestion_chip.addEventListener('click', () => assign_trip_place(
              active_trip_field_key, trip_place_from_demo_place(demo_place)));
            trip_suggestions_element.appendChild(suggestion_chip);
          }
        }

        /** Fills one field with a chosen place; the selection resolves that
         * field's search and arms the route action. */
        function assign_trip_place(field_key, trip_place) {
          trip_fields[field_key].selected_place = trip_place;
          trip_fields[field_key].input.value = trip_place.name;
          trip_search_results_element.hidden = true;
          active_trip_field_key = field_key;
          persist_trip_field_texts();
          refresh_trip_plan_route_state();
          set_provider_status(
            `Selected ${trip_place.name} as the ${trip_field_label(field_key).toLowerCase()}. ` +
            'Plan the route, then start the trip.');
        }

        /** The result list of one field's search; a row fills that field. An
         * empty answer shows the shared empty-state hint instead of a silently
         * hidden list. */
        function render_trip_results(field_key, result_rows) {
          trip_search_results_element.textContent = '';
          if (result_rows.length === 0) {
            const empty_item = document.createElement('li');
            empty_item.className = 'trip-result-empty';
            empty_item.textContent = ui_label_text('plan.empty_results_hint');
            trip_search_results_element.appendChild(empty_item);
            trip_search_results_element.hidden = false;
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
            trip_search_results_element.appendChild(result_item);
          }
          trip_search_results_element.hidden = false;
        }

        async function search_trip_field(field_key) {
          const query_text = trip_fields[field_key].input.value.trim();
          const field_label = trip_field_label(field_key);
          if (query_text === '') {
            trip_search_results_element.hidden = true;
            set_provider_status(`Enter a ${field_label.toLowerCase()} first.`, 'warning');
            return;
          }
          active_trip_field_key = field_key;
          write_demo_preferences({
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
              set_provider_status(
                `Demo places for the ${field_label.toLowerCase()}: ${matching_places.length}. ` +
                'Select one to fill the field.');
            } else {
              set_provider_status(
                ui_label_text_with_values('plan.demo_no_match_hint', {
                  field: field_label.toLowerCase(),
                }),
                'warning',
              );
            }
            return;
          }
          set_provider_status(ui_label_text('plan.searching_in_flight'));
          try {
            const place_rows = await window.mapTest.forwardGeocode(query_text);
            render_trip_results(field_key, place_rows.map((place_row) => ({
              name: place_row.structuredAddressText,
              note: place_row.qualityText,
              latitude: place_row.latitudeDegrees,
              longitude: place_row.longitudeDegrees,
            })));
            if (place_rows.length > 0) {
              set_provider_status(
                `Live results for the ${field_label.toLowerCase()}: ${place_rows.length}. ` +
                'Select one to fill the field.');
            } else {
              set_provider_status('The provider returned no results.', 'warning');
            }
          } catch (error) {
            set_provider_status(`Refused: ${String(error)}`, 'warning');
          }
        }

        /** Persists the two endpoint texts (the last search inputs a visitor
         * typed); restoring them fills the fields without planning a route. */
        function persist_trip_field_texts() {
          write_demo_preferences({
            originText: trip_fields.origin.input.value,
            destinationText: trip_fields.destination.input.value,
          });
        }

        // --- Type-ahead (docs/design/Autocomplete.md) -----------------------
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
              .slice(0, AUTOCOMPLETE_MAXIMUM_RESULTS);
          }
          try {
            const place_rows = await window.mapTest.suggestPlaces(query_text);
            return place_rows.map((place_row) => ({
              name: place_row.structuredAddressText,
              note: place_row.qualityText,
              latitude: place_row.latitudeDegrees,
              longitude: place_row.longitudeDegrees,
            })).slice(0, AUTOCOMPLETE_MAXIMUM_RESULTS);
          } catch (error) {
            set_provider_status(`Refused: ${String(error)}`, 'warning');
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
          if (query_text.length < AUTOCOMPLETE_MINIMUM_QUERY_CHARACTERS) {
            trip_search_results_element.hidden = true;
            return;
          }
          trip_suggestion_timers[field_key] = setTimeout(async () => {
            if (generation !== trip_suggestion_generations[field_key]) return;
            const result_rows = await suggest_trip_field(field_key, query_text);
            if (generation !== trip_suggestion_generations[field_key]) return;
            render_trip_results(field_key, result_rows);
          }, AUTOCOMPLETE_DEBOUNCE_MILLISECONDS);
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
          my_location_field_fillers.set(field_key, (display_text) => {
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
        trip_swap_control.addEventListener('click', () => {
          const origin_field = trip_fields.origin;
          const destination_field = trip_fields.destination;
          [origin_field.input.value, destination_field.input.value] =
            [destination_field.input.value, origin_field.input.value];
          [origin_field.selected_place, destination_field.selected_place] =
            [destination_field.selected_place, origin_field.selected_place];
          const origin_chip = my_location_chip_controls.origin;
          const destination_chip = my_location_chip_controls.destination;
          if (origin_chip !== null && destination_chip !== null) {
            const origin_filled = origin_chip.dataset.filled === 'true';
            origin_chip.dataset.filled =
              destination_chip.dataset.filled === 'true' ? 'true' : 'false';
            destination_chip.dataset.filled = origin_filled ? 'true' : 'false';
          }
          persist_trip_field_texts();
          refresh_trip_plan_route_state();
          refresh_my_location_chip_states();
          set_provider_status('Swapped the origin and destination.');
        });
        refresh_device_location_status_row();
        render_trip_suggestions();
        // Restoring a remembered pair fills the fields only: the route is
        // never planned on load, so no provider call is spent.
        trip_fields.origin.input.value = initial_demo_preferences.originText;
        trip_fields.destination.input.value =
          initial_demo_preferences.destinationText;
        if (initial_demo_preferences.lastSearchFieldKey !== null) {
          const last_search_field =
            trip_fields[initial_demo_preferences.lastSearchFieldKey];
          if (last_search_field.input.value.trim() === '') {
            last_search_field.input.value =
              initial_demo_preferences.lastSearchQueryText;
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
          if (applied_provider_keys.size > 0) {
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
            width: map_canvas.clientWidth || overlay_canvas.width,
            height: map_canvas.clientHeight || overlay_canvas.height,
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
          const sheet_rect = controls_sheet_element.getBoundingClientRect();
          const canvas_rect = map_canvas.getBoundingClientRect();
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
          let fitted_camera;
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
            show_error_report(
              'Route framing',
              String(fit_failure?.message ?? fit_failure),
            );
            return;
          }
          const fitted_center = fitted_camera.center();
          camera_state.latitude = fitted_center.latitude;
          camera_state.longitude = fitted_center.longitude;
          camera_state.zoom = fitted_camera.zoomLevel();
          camera_state.bearing = fitted_camera.bearingDegrees();
          camera_state.pitch = fitted_camera.pitchDegrees();
          controls.zoom.value = camera_state.zoom;
          controls.bearing.value = camera_state.bearing;
          controls.pitch.value = camera_state.pitch;
          for (const preset_button of camera_preset_controls.children) {
            preset_button.classList.remove('selected');
          }
          refresh_control_labels();
          schedule_render();
        }

        // The local clock time the route completes at, from now and the
        // contract's duration: the route card's ETA line (24-hour `HH:MM`).
        function clock_time_after_seconds(duration_seconds) {
          const completion_time = new Date(
            Date.now() + duration_seconds * MILLISECONDS_PER_SECOND);
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
          trip_route_title.textContent = title_text;
          trip_route_facts.textContent =
            `${format_distance_text(distance_meters)} · ` +
            `${format_duration_text(duration_seconds)}`;
          trip_route_directions.textContent =
            `${mode_text} · ${strategy_text}`;
          trip_route_eta.textContent =
            `${ui_label_text('navigation.eta_prefix')} ` +
            `${clock_time_after_seconds(duration_seconds)}`;
          trip_route_maneuver.hidden = !maneuver_text;
          trip_route_maneuver.textContent = maneuver_text ?? '';
          trip_route_note.hidden = !note_text;
          trip_route_note.textContent = note_text ?? '';
          trip_route_result.hidden = false;
        }

        /** Draws the planned route: the step-shape polyline plus the A/B
         * pins, framed with margin, and reports the summary honestly. */
        function show_trip_route(route, origin_endpoint, destination_endpoint, is_recorded) {
          // A freshly planned route supersedes a selected demo plan: the
          // native reference apps' `activeSimulatedTrace` rule (a planned
          // route wins over the picker's plan).
          clear_selected_demo_plan();
          const polyline = route_polyline_coordinates(route);
          planned_route_record = route;
          is_device_navigation_plan_first_pinned = false;
          trip_route_overlays = [
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
          apply_overlays();
          const route_box = route_bounding_box(route, polyline);
          if (route_box === null) {
            show_error_report(
              'Route framing',
              'the provider returned no route geometry to frame',
            );
          } else {
            frame_trip_route(route_box);
          }
          schedule_render();
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
              ? RECORDED_ROUTE_CARD_MODE_TEXT
              : ROUTE_CARD_MODE_TEXTS[directions_transportation_mode]
                ?? directions_transportation_mode,
            strategy_text: is_recorded
              ? RECORDED_ROUTE_CARD_STRATEGY_TEXT
              : ROUTE_CARD_STRATEGY_TEXTS[directions_route_strategy]
                ?? directions_route_strategy,
            maneuver_text: first_maneuver_text ?? 'no maneuvers',
            note_text: is_recorded
              ? ui_label_text('plan.recorded_route_note')
              : null,
          });
          set_provider_status(
            is_recorded
              ? 'Recorded demo route ready \u2014 start the simulated trip.'
              : 'Live route planned.',
            'success');
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
          if (selected_demo_plan_trace === null) return;
          selected_demo_plan_trace = null;
          planned_route_record = null;
          trip_route_overlays = [];
          apply_overlays();
          trip_source_line.hidden = true;
          trip_source_line.textContent = '';
          if (remember) {
            write_demo_preferences({ demoPlanScenario: null });
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
            if (follow_demo_phase() !== FOLLOW_DEMO_PHASE_DISENGAGED) {
              if (!remember) return;
              end_follow_demo_trip(FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
            }
            selected_demo_plan_trace = {
              plan: plan_definition,
              trace: recorded_trace,
              polyline,
            };
            planned_route_record = recorded_trace.route;
            is_device_navigation_plan_first_pinned = false;
            // The recorded route's own first and last vertices are its
            // endpoints: the plan's A/B pins, never invented coordinates.
            trip_route_overlays = [
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
            apply_overlays();
            const recorded_box = route_bounding_box(recorded_trace.route, polyline);
            if (recorded_box !== null) {
              frame_trip_route(recorded_box);
            }
            trip_route_result.hidden = true;
            trip_source_line.hidden = false;
            trip_source_line.textContent = ui_label_text_with_values(
              'plan.trip_source_demo_plan', { plan: plan_definition.label });
            render_navigation_idle(
              'Start the simulated trip to replay the selected plan\'s recorded trace.');
            if (remember) {
              write_demo_preferences({
                demoPlanScenario: plan_definition.scenario,
              });
            }
            clear_error_report();
            return true;
          } catch (plan_failure) {
            const failure_text = String(plan_failure?.message ?? plan_failure);
            show_error_report('Demo plan', failure_text);
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
        restore_remembered_demo_content = async () => {
          // A trip the visitor already started wins over the restored plan.
          if (follow_demo_phase() !== FOLLOW_DEMO_PHASE_DISENGAGED) {
            return;
          }
          const remembered_scenario = initial_demo_preferences.demoPlanScenario;
          if (remembered_scenario !== null) {
            const plan_definition = demo_plan_definitions.find(
              (candidate) => candidate.scenario === remembered_scenario);
            if (plan_definition !== undefined) {
              await select_demo_plan(plan_definition, { remember: false });
            }
          }
          // A trip may have started while the recorded trace loaded; the
          // visitor's live session keeps its own camera.
          if (follow_demo_phase() !== FOLLOW_DEMO_PHASE_DISENGAGED) return;
          apply_remembered_camera_preset();
        };

        directions_mode_car_control.addEventListener('click', () => {
          set_directions_transportation_mode(
            DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE);
        });
        directions_mode_walk_control.addEventListener('click', () => {
          set_directions_transportation_mode(
            DIRECTIONS_TRANSPORTATION_MODE_PEDESTRIAN);
        });
        directions_strategy_fastest_control.addEventListener('click', () => {
          set_directions_route_strategy(DIRECTIONS_ROUTE_STRATEGY_FASTEST);
        });
        directions_strategy_shortest_control.addEventListener('click', () => {
          set_directions_route_strategy(DIRECTIONS_ROUTE_STRATEGY_SHORTEST);
        });

        trip_plan_route_control.addEventListener('click', async () => {
          if (trip_plan_route_control.disabled) return;
          trip_route_result.hidden = true;
          set_provider_status(ui_label_text('plan.planning_in_flight'));
          try {
            const origin_endpoint = await resolve_trip_endpoint('origin');
            const destination_endpoint = await resolve_trip_endpoint('destination');
            if (!routing_provider_is_registered()) {
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
              current_directions_route_options(),
            );
            show_trip_route(live_route, origin_endpoint, destination_endpoint, false);
          } catch (error) {
            // No fallback: the route card stays absent, the verbatim detail
            // reaches the error strip, and the routing row names the next step.
            trip_route_result.hidden = true;
            const failure_text = provider_failure_text(error);
            if (routing_provider_is_registered()) {
              capability_failure_text_by_key.set(ROUTING_CAPABILITY_KEY, failure_text);
              refresh_capability_provider_rows();
            }
            set_provider_status(`Refused: ${failure_text}`, 'warning');
          }
        });
        provider_tile_control.addEventListener('click', async () => {
          try {
            const tile_bytes = await window.mapTest.fetchRasterTile(
              PROVIDER_TILE_DEMO_ZOOM_LEVEL,
              PROVIDER_TILE_DEMO_TILE_X,
              PROVIDER_TILE_DEMO_TILE_Y,
            );
            provider_tile_result.textContent =
              `Fetched ${tile_bytes.length} bytes of PNG tile imagery.`;
            set_provider_status('Live tile fetched.', 'success');
            // The preview is a demonstration only: a decode failure never
            // turns the successful fetch into a reported refusal.
            try {
              await draw_provider_tile_preview(tile_bytes);
            } catch {
              provider_tile_preview.hidden = true;
            }
          } catch (error) {
            provider_tile_result.textContent = '';
            provider_tile_preview.hidden = true;
            set_provider_status(`Refused: ${String(error)}`, 'warning');
          }
        });
        // Draws fetched tile bytes into the probe's small canvas, scaled to
        // the canvas edge (the PNG's own texel size is provider-defined).
        async function draw_provider_tile_preview(tile_bytes) {
          const tile_bitmap = await createImageBitmap(
            new Blob([tile_bytes], { type: 'image/png' }),
          );
          provider_tile_preview.getContext('2d').drawImage(
            tile_bitmap,
            0,
            0,
            provider_tile_preview.width,
            provider_tile_preview.height,
          );
          tile_bitmap.close();
          provider_tile_preview.hidden = false;
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
        offline_route_control.addEventListener('click', async () => {
          if (offline_route_in_flight) return;
          offline_route_in_flight = true;
          offline_route_control.disabled = true;
          offline_maps_status.hidden = true;
          offline_maps_status.textContent = '';
          offline_route_result.hidden = true;
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
            planned_route_record = route;
            is_device_navigation_plan_first_pinned = false;
            offline_route_overlays = [];
            trip_route_overlays = [
              { kind: 'routePolyline', coordinates: polyline },
            ];
            apply_overlays();
            const offline_box = offline_route_fit_box(route, polyline);
            if (offline_box !== null) {
              frame_trip_route(offline_box);
            }
            const distance_meters = route.distanceMeters ?? route.distance_meters;
            const duration_seconds = route.durationSeconds ?? route.duration_seconds;
            // The grid route is a sub-minute walk; whole minutes would read
            // "0 min", so a short duration states its seconds (the card's
            // note already says this is recorded test data).
            const duration_text = duration_seconds < SECONDS_PER_MINUTE
              ? `${Math.round(duration_seconds)} s`
              : format_duration_text(duration_seconds);
            offline_route_facts.textContent =
              `${format_distance_text(distance_meters)} · ${duration_text}`;
            offline_route_result.hidden = false;
            // The route summary names the offline route and its honest note,
            // the same card the native route summaries show.
            render_trip_route_card({
              title_text: ui_label_text('offline.recorded_graph_route_title'),
              distance_meters,
              duration_seconds,
              mode_text: OFFLINE_ROUTE_CARD_MODE_TEXT,
              strategy_text: OFFLINE_ROUTE_CARD_STRATEGY_TEXT,
              maneuver_text: null,
              note_text: ui_label_text('offline.recorded_graph_note'),
            });
            clear_error_report();
          } catch (offline_failure) {
            offline_route_overlays = [];
            apply_overlays();
            const detail_text = String(
              offline_failure?.message ?? offline_failure,
            );
            offline_maps_status.textContent = detail_text;
            offline_maps_status.hidden = false;
            show_error_report('Offline route', detail_text);
          } finally {
            offline_route_in_flight = false;
            offline_route_control.disabled = false;
          }
        });
      });

      // Theme (docs/ReferenceAppUX.md §3, ruled 2026-10-30): Light / Dark /
      // Auto with Auto the default. The resolved theme lands on the root
      // element's `data-theme` (every token and literal-mirror style reads
      // it), the choice itself on `data-theme-choice`, and the toggle's label
      // names the choice it switches to next.
      const theme_toggle_control = document.getElementById('theme-toggle-control');
      const dark_color_scheme_query =
        typeof window.matchMedia === 'function'
          ? window.matchMedia(DARK_COLOR_SCHEME_MEDIA_QUERY)
          : null;
      let theme_choice = initial_demo_preferences.themeChoice;
      if (!THEME_CHOICE_NAMES.includes(theme_choice)) {
        theme_choice = 'auto';
      }
      function resolved_theme_name() {
        if (theme_choice !== 'auto') return theme_choice;
        return dark_color_scheme_query?.matches ? 'dark' : 'light';
      }
      function current_theme_name() {
        return document.documentElement.dataset.theme ?? resolved_theme_name();
      }
      function apply_theme_choice(next_choice, { remember = true } = {}) {
        theme_choice = next_choice;
        if (remember) {
          write_demo_preferences({ themeChoice: next_choice });
        }
        document.documentElement.dataset.themeChoice = next_choice;
        document.documentElement.dataset.theme = resolved_theme_name();
        theme_toggle_control.textContent =
          `Switch to ${THEME_NAMES_CYCLING[next_choice]} theme`;
      }
      apply_theme_choice(theme_choice, { remember: false });
      // Auto follows the operating system live; an explicit choice ignores
      // the system from then on.
      dark_color_scheme_query?.addEventListener?.('change', () => {
        if (theme_choice !== 'auto') return;
        document.documentElement.dataset.theme = resolved_theme_name();
        schedule_render();
        refresh_vector_base_for_theme();
      });

      // The browser suite drives the advanced controls directly: `?advanced`
      // opens the panel the way a curious user would, without changing what
      // a visitor sees by default.
      if (new URLSearchParams(window.location.search).has('advanced')) {
        document.getElementById('advanced-panel').open = true;
      }

      // The header's two outbound links. The docs back-link is shown only
      // when the harness is served from the documentation site's `/demo/`
      // path, so the local dev server's root page never grows a dead "up"
      // link. The mobile-demo link is always present: the hosted page sits
      // beside the demo on the published site (`mobile/`) and under this
      // harness's own root (`mobile-demo/`). One signal decides both.
      const is_published_demo = window.location.pathname.includes('/demo/');
      const docs_back_link = document.getElementById('docs-back-link');
      docs_back_link.hidden = !is_published_demo;
      const mobile_demo_link = document.getElementById('mobile-demo-link');
      mobile_demo_link.href = is_published_demo ? 'mobile/' : 'mobile-demo/';
      theme_toggle_control.addEventListener('click', () => {
        apply_theme_choice(THEME_NAMES_CYCLING[theme_choice]);
        schedule_render();
        // A vector base repaints in the palette the new theme resolves to.
        refresh_vector_base_for_theme();
      });

      // Settings (M13/M15): the gear opens the settings sheet as a native
      // modal dialog — focus containment, Escape close and the backdrop come
      // from the element itself. `?settings` opens it for the browser suite
      // and for deep links into the credential surface.
      const settings_dialog = document.getElementById('settings-dialog');
      const settings_close_control = document.getElementById('settings-close-control');
      const reset_remembered_choices_control =
        document.getElementById('reset-remembered-choices-control');
      const remembered_choices_status =
        document.getElementById('remembered-choices-status');
      reset_remembered_choices_control.addEventListener('click', () => {
        // The credential opt-in store is deliberately untouched: a remembered
        // provider key belongs to that switch, not to this record.
        clear_demo_preferences();
        remembered_choices_status.hidden = false;
        remembered_choices_status.textContent =
          'Remembered choices cleared. Provider keys are unchanged.';
      });
      // The element focus returns to when the sheet closes: the trip card's
      // credential action or the gear, whichever opened it.
      let settings_opener_element = settings_control;
      function open_settings(focus_credential_input, opener_element = settings_control) {
        settings_opener_element = opener_element;
        if (!settings_dialog.open) settings_dialog.showModal();
        if (!focus_credential_input) return;
        // The trip card's key action lands the visitor directly in the first
        // available credential field instead of on the close control.
        const first_available_control =
          Array.from(provider_credential_controls_by_key.values())
            .find((provider_control) => provider_control.registration_available);
        if (first_available_control !== undefined) {
          first_available_control.input_element.focus();
        }
      }
      settings_control.addEventListener('click', () => open_settings(false));
      trip_credential_action.addEventListener(
        'click', () => open_settings(true, trip_credential_action));
      settings_close_control.addEventListener('click', () => settings_dialog.close());
      // A click on the dialog element itself lands on the backdrop (the sheet
      // fills the element's content box).
      settings_dialog.addEventListener('click', (event) => {
        if (event.target === settings_dialog) settings_dialog.close();
      });
      settings_dialog.addEventListener('close', () => settings_opener_element.focus());
      if (new URLSearchParams(window.location.search).has('settings')) {
        settings_dialog.showModal();
      }

      // Camera presets from the shared artifact (docs/ReferenceAppUX.md §9):
      // subtle buttons in a wrapped row; selected preset gets the accent.
      const camera_preset_controls = document.getElementById('camera-preset-controls');
      const CAMERA_PRESET_BUTTON_ATTRIBUTES = { type: 'button', class: 'camera-preset-button' };
      const camera_preset_buttons_by_id = Object.fromEntries(
        REFERENCE_SCENE_ARTIFACT.camera_presets.map((preset) => {
          const preset_button = document.createElement('button');
          for (const [attribute_name, attribute_value] of
               Object.entries(CAMERA_PRESET_BUTTON_ATTRIBUTES)) {
            preset_button.setAttribute(attribute_name, attribute_value);
          }
          preset_button.dataset.cameraPresetId = preset.id;
          preset_button.textContent = preset.label;
          preset_button.title = `${preset.label} — ${preset.note}`;
          camera_preset_controls.appendChild(preset_button);
          return [preset.id, preset_button];
        }),
      );
      function selected_camera_preset_button() {
        for (const preset_button of camera_preset_controls.children) {
          if (preset_button.classList.contains('selected')) return preset_button;
        }
        return null;
      }
      function select_camera_preset_button(preset_id) {
        const selected_button = selected_camera_preset_button();
        if (selected_button) selected_button.classList.remove('selected');
        camera_preset_buttons_by_id[preset_id].classList.add('selected');
      }
      function camera_state_by_preset(preset) {
        select_camera_preset_button(preset.id);
        // The native `animateCamera` behaviour (§4.2): every pose component
        // eases over the shared move duration; the bearing takes the
        // shortest angular path so a preset never spins the long way round.
        const now_milliseconds = performance.now();
        const duration_milliseconds = eased_camera_move_duration_milliseconds();
        const target_bearing_degrees = camera_state.bearing
          + signed_angular_difference_degrees(
            preset.bearing_degrees, camera_state.bearing);
        camera_preset_eases.latitude.begin(
          now_milliseconds, camera_state.latitude, preset.latitude_degrees,
          duration_milliseconds);
        camera_preset_eases.longitude.begin(
          now_milliseconds, camera_state.longitude, preset.longitude_degrees,
          duration_milliseconds);
        camera_preset_eases.zoom.begin(
          now_milliseconds, camera_state.zoom, preset.zoom_level,
          duration_milliseconds);
        camera_preset_eases.bearing.begin(
          now_milliseconds, camera_state.bearing, target_bearing_degrees,
          duration_milliseconds);
        camera_preset_eases.pitch.begin(
          now_milliseconds, camera_state.pitch, preset.pitch_degrees,
          duration_milliseconds);
        request_pump_step();
      }
      // The restored preset is the visitor's starting pose, not an eased
      // transition: apply it directly before the first interactive frame.
      function apply_camera_preset_pose_immediately(preset) {
        select_camera_preset_button(preset.id);
        camera_state.latitude = preset.latitude_degrees;
        camera_state.longitude = preset.longitude_degrees;
        camera_state.zoom = preset.zoom_level;
        camera_state.bearing = preset.bearing_degrees;
        camera_state.pitch = preset.pitch_degrees;
        controls.zoom.value = camera_state.zoom;
        controls.bearing.value = camera_state.bearing;
        controls.pitch.value = camera_state.pitch;
        refresh_control_labels();
        schedule_render();
      }
      function apply_remembered_camera_preset() {
        const remembered_preset = REFERENCE_SCENE_ARTIFACT.camera_presets.find(
          (candidate) => candidate.id === initial_demo_preferences.cameraPresetId);
        if (remembered_preset === undefined) return;
        apply_camera_preset_pose_immediately(remembered_preset);
      }
      for (const preset_button of camera_preset_controls.children) {
        preset_button.addEventListener('click', () => {
          const preset = REFERENCE_SCENE_ARTIFACT.camera_presets.find(
            (candidate) => candidate.id === preset_button.dataset.cameraPresetId,
          );
          camera_state_by_preset(preset);
          write_demo_preferences({ cameraPresetId: preset.id });
        });
      }

      // Scene-overlay state: one checkbox per Sacramento demo overlay kind,
      // kept as the shared value the layers panel's switches read and write.
      // The panel's overlay section is the single visible home; the scenes
      // draw on the GPU surface only, so its switches stay disabled with a
      // reason while the renderer is unavailable and whenever the session is
      // in the degraded 2D path (docs/ReferenceAppUX.md §6.2).
      const overlay_checkboxes = Object.fromEntries(
        Object.entries(REFERENCE_SCENE_ARTIFACT.overlay_scenes).map(
          ([scene_key]) => {
            const scene_checkbox = document.createElement('input');
            scene_checkbox.type = 'checkbox';
            return [scene_key, scene_checkbox];
          },
        ),
      );

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
        return Object.entries(overlay_checkboxes)
          .filter(([, checkbox]) => checkbox.checked)
          .map(([scene_key]) => scene_key);
      }

      /** The page's own overlays: the toggled demo scenes, in scene order. */
      function content_overlay_list() {
        return [
          ...sacramento_scene_overlays(checked_overlay_scene_keys()),
          // The traffic layer draws over the base and under the route
          // geometry, as at most one overlay.
          ...traffic_flow_overlays,
          // The planned route, its A/B pins and the offline card's route
          // draw over any base layer and beside every toggled scene.
          ...trip_route_overlays,
          ...offline_route_overlays,
        ];
      }

      /** Pushes the page's own overlays; the canvas paints the vector base
       * beneath them from its own installed source (M31's renderer-internal
       * ruling), so the two never fight over one drawn list. */
      function apply_overlays() {
        if (renderer_mode !== 'gpu' || !gpu_map_canvas) return;
        try {
          gpu_map_canvas.setOverlays(content_overlay_list());
        } catch (overlay_failure) {
          const overlay_failure_message = String(overlay_failure?.message ?? overlay_failure);
          status_line_element.textContent = `Overlay rejected: ${overlay_failure_message}`;
          show_error_report('Overlay rejected', overlay_failure_message);
        }
      }

      for (const checkbox of Object.values(overlay_checkboxes)) {
        checkbox.addEventListener('change', () => {
          write_demo_preferences({
            overlaySceneKeys: checked_overlay_scene_keys(),
          });
          apply_overlays();
          schedule_render();
          refresh_map_layers_panel();
        });
      }
      // The layers panel's clear action (the native layers panels' shared
      // control): unchecking every scene switch clears the page's overlay
      // list exactly as untoggling each scene would.
      const map_layers_clear_scenes_control =
        document.getElementById('map-layers-clear-scenes');
      if (map_layers_clear_scenes_control !== null) {
        map_layers_clear_scenes_control.addEventListener('click', () => {
          for (const checkbox of Object.values(overlay_checkboxes)) {
            checkbox.checked = false;
          }
          write_demo_preferences({ overlaySceneKeys: [] });
          apply_overlays();
          schedule_render();
          refresh_map_layers_panel();
        });
      }
      // Restoring a scene selection only marks the toggles; the renderer's
      // first overlay push happens once the GPU surface is up.
      for (const scene_key of initial_demo_preferences.overlaySceneKeys) {
        if (overlay_checkboxes[scene_key] !== undefined) {
          overlay_checkboxes[scene_key].checked = true;
        }
      }

      // --- The base-map tile layer switch (M9) -----------------------------
      // The page offers one base layer per provider-declared tile source: the
      // raster provider's imagery (the default) and a vector-tile provider
      // painted as overlay geometry. Provider names and the vector URL shape
      // come from the shared registry; the page names none.
      // The clear color behind each base layer: the raster layer covers the
      // whole surface, so its original dark clear stays; the vector base's
      // fills leave gaps, which take the theme's paper color instead of
      // reading as a black map.
      const VECTOR_BASE_RASTER_CLEAR_COLOR = Object.freeze(
        { red: 0.0, green: 0.0, blue: 0.0, alpha: 1.0 });
      // The vector clear color per theme, used when the active style declares
      // no background of its own.
      const VECTOR_BASE_CLEAR_COLOR_BY_THEME = Object.freeze({
        light: Object.freeze({ red: 0.94, green: 0.93, blue: 0.90, alpha: 1.0 }),
        dark: Object.freeze({ red: 0.063, green: 0.078, blue: 0.098, alpha: 1.0 }),
      });
      // The named styles' own backgrounds, transcribed from the style
      // artifacts (the color each upstream style was designed on):
      // Bright `#f8f4f0`, Fiord `#45516E`, Positron `rgb(242,243,240)`.
      const VECTOR_BASE_CLEAR_COLOR_BY_STYLE = Object.freeze({
        'bright-light': Object.freeze(
          { red: 0.972549, green: 0.956863, blue: 0.941176, alpha: 1.0 }),
        'fiord-dark': Object.freeze(
          { red: 0.270588, green: 0.317647, blue: 0.431373, alpha: 1.0 }),
        'positron-light': Object.freeze(
          { red: 0.949, green: 0.953, blue: 0.941, alpha: 1.0 }),
      });
      // The zoom span the canvas' vector base requests. The lower bound is the
      // web-mercator grid's origin (a camera below it clamps up); the upper
      // bound comes from the descriptor's own declared ceiling.
      const VECTOR_BASE_MINIMUM_ZOOM_LEVEL = 0;
      const VECTOR_BASE_DEFAULT_MAXIMUM_ZOOM_LEVEL = 19;
      // Every raster base layer a registry descriptor declares (their fixture
      // routes back the demo canvas' recorded imagery).
      const RASTER_BASE_MAP_DESCRIPTORS = providers_registry.providers
        .filter((provider_descriptor) =>
          Array.isArray(provider_descriptor.fixture_routes)
          && provider_descriptor.fixture_routes.some(
            (fixture_route) => fixture_route.purpose === 'raster_tiles'));
      // Every vector base layer: a descriptor that declares a tile URL
      // template (a provider registry entry, never a page-side URL).
      const VECTOR_BASE_MAP_DESCRIPTORS = providers_registry.providers
        .filter((provider_descriptor) =>
          typeof provider_descriptor.url_template === 'string'
          && provider_descriptor.url_template.trim() !== '');
      let current_tile_mode = TILE_LAYER_MODES.raster;
      // The demo's default vector base is the descriptor offering the
      // Bright/Fiord/Positron family (the richest committed styles); a
      // registry with no such family falls back to its first vector entry.
      let current_vector_provider_key =
        (VECTOR_BASE_MAP_DESCRIPTORS.find((provider_descriptor) =>
          (provider_descriptor.vector_styles ?? []).some(
            (style_choice) => style_choice.style_id === 'bright-light',
          )) ?? VECTOR_BASE_MAP_DESCRIPTORS[0])?.provider_key ?? null;
      // The base map's own status line lives in the layers panel's Base map
      // section (the single home for base selection).
      const base_map_status_element =
        document.getElementById('map-layers-base-status');
      // The style the visitor picked from the active vector descriptor's
      // offered styles, or null for "the one matching the resolved theme".
      let current_vector_style_id = null;

      /** The style the base paints now: the picked one, else the theme join. */
      function active_vector_style_id() {
        const vector_descriptor = selected_vector_descriptor();
        if (vector_descriptor === null) return null;
        return vectorStyleIdForDescriptor(
          vector_descriptor, resolved_theme_name(), current_vector_style_id);
      }

      /** The registry descriptor declaring a fixture route for one purpose. */
      function base_map_descriptor_for_route_purpose(route_purpose) {
        return providers_registry.providers.find((provider_descriptor) =>
          Array.isArray(provider_descriptor.fixture_routes)
          && provider_descriptor.fixture_routes.some(
            (fixture_route) => fixture_route.purpose === route_purpose));
      }

      /** The vector descriptor the page last selected (never a guess). */
      function selected_vector_descriptor() {
        return VECTOR_BASE_MAP_DESCRIPTORS.find((provider_descriptor) =>
          provider_descriptor.provider_key === current_vector_provider_key) ?? null;
      }

      /** Shows (or clears) the base-map status line. */
      function set_base_map_status(status_text) {
        base_map_status_element.hidden = status_text === null;
        base_map_status_element.textContent = status_text ?? '';
      }

      /** Applies the active style's own background (else the theme's paper
       * color) to the canvas. */
      function apply_vector_base_clear_color() {
        const active_style_id = active_vector_style_id();
        const clear_color = VECTOR_BASE_CLEAR_COLOR_BY_STYLE[active_style_id]
          ?? VECTOR_BASE_CLEAR_COLOR_BY_THEME[resolved_theme_name()]
          ?? VECTOR_BASE_CLEAR_COLOR_BY_THEME.light;
        gpu_map_canvas.setBackgroundColor(
          clear_color.red,
          clear_color.green,
          clear_color.blue,
          clear_color.alpha,
        );
      }

      /** The attribution line the active style's own terms require. */
      function active_vector_style_attribution(vector_descriptor) {
        const style_id = active_vector_style_id();
        const style_choice = (vector_descriptor.vector_styles ?? []).find(
          (candidate) => candidate.style_id === style_id);
        return style_choice?.attribution_text
          ?? vector_descriptor.attribution_text
          ?? '';
      }

      /**
       * Installs the selected vector source on the canvas (M31's
       * renderer-internal base): the canvas fetches, decodes, styles and
       * labels the tiles itself through the registry's URL template, so the
       * page no longer composes vector geometry or label descriptors.
       */
      function install_vector_base_source() {
        if (current_tile_mode !== TILE_LAYER_MODES.vector
          || renderer_mode !== 'gpu' || !gpu_map_canvas) {
          return;
        }
        const vector_descriptor = selected_vector_descriptor();
        if (vector_descriptor === null) return;
        const style_id = active_vector_style_id();
        if (style_id === null) return;
        set_base_map_status(
          `Loading the ${vector_descriptor.display_name} vector base…`);
        try {
          gpu_map_canvas.setVectorTileSource({
            urlTemplate: vector_descriptor.url_template,
            sourceName: vector_descriptor.provider_key,
            attributionText: active_vector_style_attribution(vector_descriptor),
            styleId: style_id,
            minimumZoomLevel: VECTOR_BASE_MINIMUM_ZOOM_LEVEL,
            maximumZoomLevel: Number.isInteger(vector_descriptor.maximum_zoom_level)
              ? vector_descriptor.maximum_zoom_level
              : VECTOR_BASE_DEFAULT_MAXIMUM_ZOOM_LEVEL,
          });
        } catch (vector_failure) {
          set_base_map_status(
            `The vector base failed: ${String(
              vector_failure?.message ?? vector_failure)}`);
          return;
        }
        schedule_render();
      }

      /** Reflects the canvas' vector-source status in the base-map line. */
      function refresh_vector_base_status() {
        if (current_tile_mode !== TILE_LAYER_MODES.vector
          || renderer_mode !== 'gpu' || !gpu_map_canvas) {
          return;
        }
        const vector_descriptor = selected_vector_descriptor();
        if (vector_descriptor === null) return;
        let status;
        try {
          status = gpu_map_canvas.vectorTileSourceStatus();
        } catch {
          return;
        }
        if (!status.isConfigured) {
          set_base_map_status(null);
          return;
        }
        if (status.drawnTileCount === 0 && status.failedTileCount === 0) {
          set_base_map_status(
            `Loading the ${vector_descriptor.display_name} vector base…`);
          return;
        }
        const failure_suffix = status.lastFailureDetail === null
          ? ''
          : ` — ${status.lastFailureDetail}`;
        set_base_map_status(
          `Vector base · ${vector_descriptor.display_name} · ${status.styleId}: ` +
          `${status.drawnTileCount} tiles drawn, ` +
          `${status.failedTileCount} failed${failure_suffix}`);
      }

      /**
       * Selects one base layer: the raster layer, or one provider-declared
       * vector base. The provider key picks the vector descriptor; a raster
       * selection ignores it.
       */
      function switch_tile_mode(next_mode, next_provider_key = null,
        { remember = true } = {}) {
        if (next_mode === TILE_LAYER_MODES.vector) {
          if (renderer_mode !== 'gpu' || !gpu_map_canvas) {
            set_base_map_status(
              'The vector base needs the GPU renderer; this browser fell back to the 2D grid.');
            return;
          }
          const next_descriptor = VECTOR_BASE_MAP_DESCRIPTORS.find(
            (provider_descriptor) =>
              provider_descriptor.provider_key === next_provider_key);
          if (next_descriptor === undefined) return;
        }
        const selection_is_unchanged = next_mode === current_tile_mode
          && (next_mode === TILE_LAYER_MODES.raster
            || next_provider_key === current_vector_provider_key);
        if (selection_is_unchanged) return;
        current_tile_mode = next_mode;
        if (next_mode === TILE_LAYER_MODES.vector) {
          current_vector_provider_key = next_provider_key;
        }
        if (next_mode === TILE_LAYER_MODES.raster) {
          // Removing the source makes the canvas draw the raster tier again;
          // the frame after this switch has no vector geometry or labels.
          gpu_map_canvas.clearVectorTileSource();
          applyTileLayerMode({ canvas: gpu_map_canvas, mode: TILE_LAYER_MODES.raster });
          gpu_map_canvas.setBackgroundColor(
            VECTOR_BASE_RASTER_CLEAR_COLOR.red,
            VECTOR_BASE_RASTER_CLEAR_COLOR.green,
            VECTOR_BASE_RASTER_CLEAR_COLOR.blue,
            VECTOR_BASE_RASTER_CLEAR_COLOR.alpha,
          );
          set_overlay_controls_enabled(
            renderer_mode === 'gpu',
            'Scene overlays need the GPU renderer; this browser fell back to the 2D grid.',
          );
          apply_overlays();
          set_base_map_status(null);
        } else {
          applyTileLayerMode({ canvas: gpu_map_canvas, mode: TILE_LAYER_MODES.vector });
          apply_vector_base_clear_color();
          // The scene toggles and a planned route stay in the page's own
          // overlay list; the canvas paints the base beneath them.
          set_overlay_controls_enabled(
            renderer_mode === 'gpu',
            'Scene overlays need the GPU renderer; this browser fell back to the 2D grid.',
          );
          apply_overlays();
          install_vector_base_source();
        }
        if (remember) {
          write_demo_preferences({ baseMap: current_base_map_preference() });
        }
        schedule_render();
        refresh_map_layers_panel();
        refresh_attribution_notice();
      }

      /** The selection the base-map record stores: the raster descriptor in
       * use, or the vector provider and the explicitly picked style id. */
      function current_base_map_preference() {
        if (current_tile_mode === TILE_LAYER_MODES.raster) {
          return {
            mode: TILE_LAYER_MODES.raster,
            rasterProviderKey:
              RASTER_BASE_MAP_DESCRIPTORS[0]?.provider_key ?? null,
          };
        }
        return {
          mode: TILE_LAYER_MODES.vector,
          vectorProviderKey: current_vector_provider_key,
          vectorStyleId: current_vector_style_id,
        };
      }

      /** Restores the remembered base map once the renderer can serve it.
       * An undeclared provider or style is dropped, never guessed. */
      function restore_remembered_base_map() {
        const remembered_base_map = initial_demo_preferences.baseMap;
        if (remembered_base_map === null) return;
        if (remembered_base_map.mode === TILE_LAYER_MODES.raster) {
          const raster_provider_is_declared =
            remembered_base_map.rasterProviderKey === null
            || RASTER_BASE_MAP_DESCRIPTORS.some((provider_descriptor) =>
              provider_descriptor.provider_key
                === remembered_base_map.rasterProviderKey);
          if (!raster_provider_is_declared) return;
          switch_tile_mode(
            TILE_LAYER_MODES.raster, null, { remember: false });
          return;
        }
        if (remembered_base_map.mode !== TILE_LAYER_MODES.vector) return;
        const vector_descriptor = VECTOR_BASE_MAP_DESCRIPTORS.find(
          (provider_descriptor) =>
            provider_descriptor.provider_key
              === remembered_base_map.vectorProviderKey);
        if (vector_descriptor === undefined) return;
        const style_is_declared = remembered_base_map.vectorStyleId === null
          || (vector_descriptor.vector_styles ?? []).some((style_choice) =>
            style_choice.style_id === remembered_base_map.vectorStyleId);
        current_vector_style_id = style_is_declared
          ? remembered_base_map.vectorStyleId
          : null;
        switch_tile_mode(
          TILE_LAYER_MODES.vector,
          vector_descriptor.provider_key,
          { remember: false },
        );
      }

      /** Repaints the vector base in the theme that just became active. */
      function refresh_vector_base_for_theme() {
        if (current_tile_mode !== TILE_LAYER_MODES.vector
          || renderer_mode !== 'gpu' || !gpu_map_canvas) {
          return;
        }
        // The theme may have changed which offered style is the default; the
        // source carries the style id, so a reinstall paints the new palette.
        apply_vector_base_clear_color();
        install_vector_base_source();
      }

      window.mapTileMode = () => current_tile_mode;
      window.mapVectorProviderKey = () => current_vector_provider_key;
      window.mapVectorBaseStatus = () =>
        base_map_status_element.hidden ? null : base_map_status_element.textContent;

      // --- The on-map layer control (docs/design/MapControlsAndTrafficLayer.md) ----
      // One round control docked above the attribution notice. Its panel
      // carries the registry's base sources and every committed vector style,
      // the traffic switch, the demo scene switches and the device-location
      // status. Nothing here names a provider: rows are built from the shared
      // descriptors, and the traffic capability is the first descriptor that
      // declares it.
      const map_layers_control = document.getElementById(MAP_LAYERS_CONTROL_IDENTIFIER);
      const map_layers_panel = document.getElementById(MAP_LAYERS_PANEL_IDENTIFIER);
      map_layers_control.setAttribute('aria-label', MAP_LAYERS_CONTROL_LABEL);
      const map_layers_base_rows_element = document.getElementById('map-layer-base-rows');
      const map_layers_traffic_row_element = document.getElementById('map-layer-traffic-row');
      const map_layers_scene_rows_element = document.getElementById('map-layer-scene-rows');
      const map_layers_status_element = document.getElementById(MAP_LAYERS_STATUS_IDENTIFIER);
      const map_layers_active_dot = map_layers_control.querySelector(
        `.${MAP_LAYERS_ACTIVE_DOT_CLASS_NAME}`);
      // Each base row's descriptor and selection, keyed by its identifier, so
      // the refresh pass can mark the serving row without rebuilding.
      const map_layers_base_row_bindings = new Map();
      // The traffic switch's parts.
      const traffic_switch_element = document.createElement('button');
      traffic_switch_element.type = 'button';
      traffic_switch_element.id = MAP_LAYER_TRAFFIC_IDENTIFIER;
      traffic_switch_element.className = 'map-layer-switch';
      traffic_switch_element.setAttribute('role', 'switch');
      traffic_switch_element.setAttribute('aria-checked', 'false');
      const traffic_switch_label_element = document.createElement('span');
      traffic_switch_label_element.textContent = 'Traffic';
      const traffic_switch_mark_element = document.createElement('span');
      traffic_switch_mark_element.className = 'map-layer-row-reason';
      traffic_switch_element.append(
        traffic_switch_label_element, traffic_switch_mark_element);
      map_layers_traffic_row_element.appendChild(traffic_switch_element);
      // The scene switch rows mirror the settings toggles and write the same
      // remembered choice through the existing checkbox listeners.
      const scene_switch_elements = new Map();

      /** Shows (or clears) the panel's status line. */
      function set_map_layers_status(status_text) {
        map_layers_status_element.hidden = status_text === null;
        map_layers_status_element.textContent = status_text ?? '';
      }

      /** Builds the base rows: one per raster source, one per vector style. */
      function build_map_layers_base_rows() {
        map_layers_base_rows_element.textContent = '';
        map_layers_base_row_bindings.clear();
        const base_rows = [
          ...RASTER_BASE_MAP_DESCRIPTORS.map((provider_descriptor) => ({
            row_identifier:
              `${MAP_LAYER_BASE_ROW_IDENTIFIER_PREFIX}${provider_descriptor.provider_key}`,
            label: `${provider_descriptor.display_name} · Raster`,
            mode: TILE_LAYER_MODES.raster,
            provider_descriptor,
            style_id: null,
            served_from_fixtures: true,
          })),
          ...VECTOR_BASE_MAP_DESCRIPTORS.flatMap((provider_descriptor) =>
            (provider_descriptor.vector_styles ?? []).map((style_choice) => ({
              row_identifier:
                `${MAP_LAYER_STYLE_ROW_IDENTIFIER_PREFIX}${style_choice.style_id}`,
              // The one provider-row composition every surface renders:
              // the descriptor's display name and the style name, never a
              // bare style name.
              label:
                `${provider_descriptor.display_name} · ${style_choice.display_name}`,
              mode: TILE_LAYER_MODES.vector,
              provider_descriptor,
              style_id: style_choice.style_id,
              served_from_fixtures: false,
            }))),
        ];
        for (const base_row of base_rows) {
          const row_element = document.createElement('button');
          row_element.type = 'button';
          row_element.id = base_row.row_identifier;
          row_element.className = 'map-layers-base-row';
          row_element.dataset.tileMode = base_row.mode;
          if (base_row.provider_descriptor !== null) {
            row_element.dataset.providerKey = base_row.provider_descriptor.provider_key;
          }
          if (base_row.style_id !== null) {
            row_element.dataset.styleId = base_row.style_id;
          }
          const row_label_element = document.createElement('span');
          row_label_element.textContent = base_row.label;
          const row_mark_element = document.createElement('span');
          row_mark_element.className = 'map-layer-row-reason';
          row_element.append(row_label_element, row_mark_element);
          row_element.addEventListener('click', () => {
            if (row_element.disabled) return;
            if (base_row.mode === TILE_LAYER_MODES.raster) {
              switch_tile_mode(TILE_LAYER_MODES.raster);
              return;
            }
            select_map_layers_vector_style(
              base_row.provider_descriptor, base_row.style_id);
          });
          map_layers_base_row_bindings.set(base_row.row_identifier, {
            row_element,
            row_mark_element,
            base_row,
          });
          map_layers_base_rows_element.appendChild(row_element);
        }
      }

      /** Selects one committed vector style: the same switch the settings
       * style picker performs, with the style applied to the base. */
      function select_map_layers_vector_style(provider_descriptor, style_id) {
        current_vector_style_id = style_id;
        if (current_tile_mode !== TILE_LAYER_MODES.vector
          || current_vector_provider_key !== provider_descriptor.provider_key) {
          switch_tile_mode(
            TILE_LAYER_MODES.vector, provider_descriptor.provider_key);
          return;
        }
        write_demo_preferences({ baseMap: current_base_map_preference() });
        apply_vector_base_clear_color();
        install_vector_base_source();
        schedule_render();
        refresh_map_layers_panel();
        refresh_attribution_notice();
      }

      /** The identifier of the row whose layer is serving now, or null. */
      function active_base_row_identifier() {
        if (current_tile_mode === TILE_LAYER_MODES.raster) {
          const raster_descriptor = RASTER_BASE_MAP_DESCRIPTORS[0];
          return raster_descriptor === undefined
            ? null
            : `${MAP_LAYER_BASE_ROW_IDENTIFIER_PREFIX}${raster_descriptor.provider_key}`;
        }
        const style_id = active_vector_style_id();
        return style_id === null
          ? null
          : `${MAP_LAYER_STYLE_ROW_IDENTIFIER_PREFIX}${style_id}`;
      }

      /** Builds the demo-scene switches from the shared scene artifact. */
      function build_map_layers_scene_rows() {
        map_layers_scene_rows_element.textContent = '';
        scene_switch_elements.clear();
        for (const [scene_key] of Object.entries(REFERENCE_SCENE_ARTIFACT.overlay_scenes)) {
          const switch_element = document.createElement('button');
          switch_element.type = 'button';
          switch_element.id = `${MAP_LAYER_SCENE_ROW_IDENTIFIER_PREFIX}${scene_key}`;
          switch_element.className = 'map-layer-switch';
          switch_element.setAttribute('role', 'switch');
          switch_element.setAttribute('aria-checked', 'false');
          const switch_label_element = document.createElement('span');
          switch_label_element.textContent = SACRAMENTO_OVERLAY_SCENE_LABELS[scene_key];
          const switch_mark_element = document.createElement('span');
          switch_mark_element.className = 'map-layer-row-reason';
          switch_element.append(switch_label_element, switch_mark_element);
          // Activating the switch flips the existing checkbox and fires its
          // change event, so both surfaces share one persistence and overlay
          // path. A switch with no matching scene toggle stays inert.
          switch_element.addEventListener('click', () => {
            const checkbox = overlay_checkboxes[scene_key];
            if (checkbox === undefined) return;
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
          });
          scene_switch_elements.set(scene_key, switch_element);
          map_layers_scene_rows_element.appendChild(switch_element);
        }
      }

      /** Marks the serving base row, the traffic switch and the scene switches. */
      function refresh_map_layers_panel() {
        if (!map_layers_panel_ready) return;
        const active_row_identifier = active_base_row_identifier();
        // The vector rows need the GPU renderer; before it answers (or on the
        // 2D path) a click would be a silent no-op, so they are disabled.
        const renderer_is_gpu = window.mapRendererMode?.() === 'gpu';
        for (const [row_identifier, binding] of map_layers_base_row_bindings) {
          const refusal_text = base_row_credential_refusal(
            binding.base_row.provider_descriptor,
            applied_provider_keys,
            { servedFromFixtures: binding.base_row.served_from_fixtures },
          );
          const row_needs_gpu =
            binding.base_row.mode === TILE_LAYER_MODES.vector && !renderer_is_gpu;
          const is_active = row_identifier === active_row_identifier;
          binding.row_element.setAttribute('aria-pressed', String(is_active));
          binding.row_element.disabled = refusal_text !== null || row_needs_gpu;
          binding.row_mark_element.textContent = refusal_text
            ?? (is_active ? MAP_LAYERS_SERVING_TEXT : '');
          binding.row_mark_element.className = refusal_text !== null
            ? 'map-layer-row-reason'
            : 'map-layers-serving-mark';
        }
        const availability = traffic_layer_availability(
          providers_registry.providers, applied_provider_keys);
        if (availability.state !== 'available' && traffic_layer_enabled) {
          set_traffic_layer_enabled(false);
        }
        traffic_switch_element.disabled = availability.state !== 'available';
        traffic_switch_element.setAttribute(
          'aria-checked', String(traffic_layer_enabled));
        traffic_switch_mark_element.textContent = availability.state === 'available'
          ? (traffic_layer_enabled ? 'On' : 'Off')
          : availability.reasonText;
        traffic_switch_element.title = availability.reasonText ?? '';
        for (const [scene_key, switch_element] of scene_switch_elements) {
          const is_checked = overlay_checkboxes[scene_key]?.checked === true;
          switch_element.setAttribute('aria-checked', String(is_checked));
        }
        const enabled_scene_count = checked_overlay_scene_keys().length;
        map_layers_active_dot.hidden = !is_non_default_layer_active({
          baseMode: current_tile_mode,
          rasterMode: TILE_LAYER_MODES.raster,
          trafficEnabled: traffic_layer_enabled,
          enabledSceneCount: enabled_scene_count,
        });
      }

      /** Opens or closes the layers panel; Escape returns focus to the button. */
      function set_map_layers_panel_open(is_open) {
        map_layers_panel.hidden = !is_open;
        map_layers_control.setAttribute('aria-expanded', String(is_open));
        if (is_open) {
          // The panel precedes the button in the tab order; moving focus to
          // its first usable control keeps the panel keyboard reachable.
          const first_control = map_layers_panel.querySelector(
            'button:not([disabled]), [role="switch"]:not([disabled])');
          first_control?.focus();
        }
      }

      map_layers_control.addEventListener('click', () => {
        set_map_layers_panel_open(map_layers_panel.hidden);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !map_layers_panel.hidden) {
          set_map_layers_panel_open(false);
          map_layers_control.focus();
        }
      });
      document.addEventListener('pointerdown', (event) => {
        if (map_layers_panel.hidden) return;
        if (!map_layers_control.contains(event.target)
          && !map_layers_panel.contains(event.target)) {
          set_map_layers_panel_open(false);
        }
      }, true);

      // The settings sheet's device-location row is a pointer to this
      // control's Device location row, never a second copy of it.
      const device_location_pointer_control =
        document.getElementById('device-location-control');
      device_location_pointer_control.addEventListener('click', () => {
        if (settings_dialog.open) settings_dialog.close();
        set_map_layers_panel_open(true);
        const device_location_status_element =
          document.getElementById(DEVICE_LOCATION_STATUS_IDENTIFIER);
        device_location_status_element?.scrollIntoView({ block: 'nearest' });
        map_layers_control.focus();
      });

      // --- Traffic layer -------------------------------------------------
      // One overlay installed from the capability's flow rows for the settled
      // camera bounds. Refreshes are debounced per settle and capped to one
      // request in flight; a failed refresh keeps the previous overlay.
      function current_camera_pose_key() {
        return [
          camera_state.latitude.toFixed(6),
          camera_state.longitude.toFixed(6),
          camera_state.zoom.toFixed(3),
          camera_state.bearing.toFixed(2),
          camera_state.pitch.toFixed(2),
        ].join('|');
      }

      /** The settled camera's geographic bounds, or null when unanswerable. */
      function current_camera_geographic_bounds() {
        const camera = build_camera();
        const width_pixels = overlay_canvas.width;
        const height_pixels = overlay_canvas.height;
        const corner_pixels = [
          [0, 0], [width_pixels, 0], [width_pixels, height_pixels], [0, height_pixels],
        ];
        const corner_coordinates = corner_pixels
          .map(([screen_x, screen_y]) => resolved_or_null(() =>
            camera.screenToGroundCoordinate(
              screen_x, screen_y, width_pixels, height_pixels, FIELD_OF_VIEW_DEGREES)))
          .filter(Boolean);
        if (corner_coordinates.length >= 3) {
          const latitudes = corner_coordinates.map((coordinate) => coordinate.latitude);
          const longitudes = corner_coordinates.map((coordinate) => coordinate.longitude);
          return {
            southWestLatitude: Math.min(...latitudes),
            southWestLongitude: Math.min(...longitudes),
            northEastLatitude: Math.max(...latitudes),
            northEastLongitude: Math.max(...longitudes),
          };
        }
        // A steep pitch can put the far edge below the horizon; the camera's
        // own ground scale then bounds a box around the center.
        const meters_per_pixel = resolved_or_null(() =>
          camera.groundMetersPerScreenPixel(
            width_pixels, height_pixels, FIELD_OF_VIEW_DEGREES));
        if (meters_per_pixel === null) return null;
        const half_height_meters = (meters_per_pixel * height_pixels) / 2;
        const half_width_meters = (meters_per_pixel * width_pixels) / 2;
        const latitude_delta_degrees = half_height_meters / METERS_PER_DEGREE_LATITUDE;
        const longitude_scale = METERS_PER_DEGREE_LATITUDE
          * Math.cos((camera_state.latitude * Math.PI) / 180);
        const longitude_delta_degrees = longitude_scale === 0
          ? latitude_delta_degrees
          : half_width_meters / longitude_scale;
        return {
          southWestLatitude: camera_state.latitude - latitude_delta_degrees,
          southWestLongitude: camera_state.longitude - longitude_delta_degrees,
          northEastLatitude: camera_state.latitude + latitude_delta_degrees,
          northEastLongitude: camera_state.longitude + longitude_delta_degrees,
        };
      }

      /** Schedules one traffic refresh after the camera settles. */
      function schedule_traffic_refresh() {
        if (!traffic_layer_enabled) return;
        if (traffic_refresh_debounce_timer !== null) {
          clearTimeout(traffic_refresh_debounce_timer);
        }
        traffic_refresh_debounce_timer = setTimeout(() => {
          traffic_refresh_debounce_timer = null;
          void refresh_traffic_flow_layer();
        }, TRAFFIC_REFRESH_DEBOUNCE_MILLISECONDS);
      }

      /** Restarts the debounce when the camera pose changed since the last
       * request's settle. Called from the page's render scheduler, so every
       * camera path (drag, wheel, keyboard, preset, device fix) participates. */
      function note_camera_pose_for_traffic() {
        if (!traffic_layer_enabled) return;
        const pose_key = current_camera_pose_key();
        if (pose_key === traffic_last_camera_pose_key) return;
        traffic_last_camera_pose_key = pose_key;
        schedule_traffic_refresh();
      }

      /** Asks the capability for the settled bounds and installs one overlay. */
      async function refresh_traffic_flow_layer() {
        if (!traffic_layer_enabled) return;
        if (traffic_refresh_in_flight) {
          traffic_refresh_pending = true;
          return;
        }
        const bounds = current_camera_geographic_bounds();
        if (bounds === null) {
          traffic_last_failure_text = 'The camera bounds are unavailable.';
          set_map_layers_status(traffic_last_failure_text);
          return;
        }
        traffic_refresh_in_flight = true;
        traffic_fetch_count += 1;
        try {
          const flow_rows = await window.mapTest.fetchTrafficFlow(
            bounds.southWestLatitude,
            bounds.southWestLongitude,
            bounds.northEastLatitude,
            bounds.northEastLongitude,
          );
          // A toggle-off while the request was in flight drops its answer.
          if (!traffic_layer_enabled) return;
          traffic_flow_overlays = [
            traffic_flow_overlay_descriptor(
              flow_rows, TRAFFIC_FLOW_OVERLAY_WIDTH_PIXELS),
          ];
          traffic_overlay_install_count += 1;
          traffic_last_failure_text = null;
          set_map_layers_status(null);
          apply_overlays();
          schedule_render();
        } catch (traffic_failure) {
          const failure_text = String(traffic_failure?.message ?? traffic_failure);
          traffic_last_failure_text = failure_text;
          set_map_layers_status(`Traffic refresh failed: ${failure_text}`);
          if (traffic_failure?.code === 'providerNotConfigured') {
            set_traffic_layer_enabled(false);
          }
        } finally {
          traffic_refresh_in_flight = false;
          if (traffic_refresh_pending) {
            traffic_refresh_pending = false;
            schedule_traffic_refresh();
          }
        }
      }

      /** Turns the layer on or off, keeping the remembered choice in step. */
      function set_traffic_layer_enabled(next_enabled, { remember = true } = {}) {
        if (next_enabled) {
          const availability = traffic_layer_availability(
            providers_registry.providers, applied_provider_keys);
          if (availability.state !== 'available') {
            set_map_layers_status(availability.reasonText);
            return;
          }
        }
        traffic_layer_enabled = next_enabled;
        if (remember) {
          write_demo_preferences({ trafficLayerEnabled: next_enabled });
        }
        if (!next_enabled) {
          if (traffic_refresh_debounce_timer !== null) {
            clearTimeout(traffic_refresh_debounce_timer);
            traffic_refresh_debounce_timer = null;
          }
          traffic_refresh_pending = false;
          traffic_flow_overlays = [];
          traffic_last_camera_pose_key = null;
          apply_overlays();
          schedule_render();
        } else {
          traffic_last_camera_pose_key = current_camera_pose_key();
          schedule_traffic_refresh();
        }
        refresh_map_layers_panel();
        refresh_attribution_notice();
      }

      traffic_switch_element.addEventListener('click', () => {
        set_traffic_layer_enabled(!traffic_layer_enabled);
      });

      // A remembered traffic choice is restored only once a provider that
      // serves the capability is registered (the credential path calls back).
      let traffic_restore_requested = initial_demo_preferences.trafficLayerEnabled;
      function maybe_restore_remembered_traffic_layer() {
        if (!traffic_restore_requested || traffic_layer_enabled) return;
        const availability = traffic_layer_availability(
          providers_registry.providers, applied_provider_keys);
        if (availability.state !== 'available') return;
        traffic_restore_requested = false;
        set_traffic_layer_enabled(true, { remember: false });
      }

      /** The attribution lines the currently serving layers require. */
      function current_layer_attribution_texts() {
        const attribution_texts = [];
        if (current_tile_mode === TILE_LAYER_MODES.raster) {
          const raster_descriptor = RASTER_BASE_MAP_DESCRIPTORS[0];
          if (typeof raster_descriptor?.attribution_text === 'string') {
            attribution_texts.push(raster_descriptor.attribution_text);
          }
        } else {
          const vector_descriptor = selected_vector_descriptor();
          if (vector_descriptor !== null) {
            attribution_texts.push(active_vector_style_attribution(vector_descriptor));
          }
        }
        if (traffic_layer_enabled) {
          const traffic_descriptor =
            traffic_capability_descriptor(providers_registry.providers);
          if (typeof traffic_descriptor?.attribution_text === 'string') {
            attribution_texts.push(traffic_descriptor.attribution_text);
          }
        }
        return attribution_texts;
      }

      /** Recomputes the attribution notice; its live region announces changes. */
      function refresh_attribution_notice() {
        const attribution_texts = Array.from(new Set([
          ...descriptor_attribution_texts,
          ...current_layer_attribution_texts(),
        ])).filter((attribution_text) =>
          typeof attribution_text === 'string' && attribution_text.trim() !== '');
        if (attribution_texts.length > 0) {
          attribution_notice.textContent = attribution_texts.join(' · ');
        }
      }

      // The UX-test host contract: the panel's state and the traffic layer's
      // counters, so the browser suite can assert one install per settle
      // without reading the panel's prose.
      window.mapLayersState = () => ({
        panelOpen: !map_layers_panel.hidden,
        activeBaseIdentifier: active_base_row_identifier(),
        trafficEnabled: traffic_layer_enabled,
        sceneKeys: checked_overlay_scene_keys(),
      });
      window.mapTrafficLayerState = () => ({
        enabled: traffic_layer_enabled,
        fetchCount: traffic_fetch_count,
        overlayInstallCount: traffic_overlay_install_count,
        segmentCount: traffic_flow_overlays[0]?.segments?.length ?? 0,
        failureText: traffic_last_failure_text,
      });

      build_map_layers_base_rows();
      build_map_layers_scene_rows();
      map_layers_panel_ready = true;
      refresh_map_layers_panel();
      refresh_attribution_notice();
      maybe_restore_remembered_traffic_layer();

      // Simulated navigation panel (docs/ReferenceAppUX.md §7.3): live
      // guidance from the wasm `Navigator`, the same reducer the native
      // controllers drive. The panel is idle until a simulated trip starts on
      // a planned route; every row it shows then comes from the trip snapshot
      // (phase, banner, upcoming maneuver, progress, deviation), never from a
      // preview sample.
      const navigation_demo_reason = document.getElementById('navigation-demo-reason');
      const navigation_demo_preview_notice =
        document.getElementById('navigation-demo-preview-notice');
      const deviation_alert_element = document.getElementById('deviation-alert-preview');
      // The turn banner's map placement (§1/§7.1): shown while guidance has an
      // active maneuver, hidden between trips.
      const navigation_banner_overlay =
        document.getElementById('navigation-banner-overlay');
      // The trip card's own ETA-distance line (the web drawer-equivalent line,
      // visible beside the playback controls while a trip runs).
      const trip_navigation_eta_line =
        document.getElementById('trip-navigation-eta-line');
      // Voice guidance (§7.3): the platform speech engine speaks the
      // snapshot's own speech channel — the contract's text-to-speech variant,
      // never the banner sentence re-used as speech.
      const navigation_voice_control =
        document.getElementById('navigation-voice-control');
      const SPEECH_UTTERANCE_LANGUAGE = 'en-US';
      let is_voice_guidance_enabled = false;
      let last_spoken_speech_text = null;
      function speech_synthesis_available() {
        return typeof window.speechSynthesis?.speak === 'function'
          && typeof window.SpeechSynthesisUtterance === 'function';
      }
      function speak_navigation_speech(speech_text) {
        if (!is_voice_guidance_enabled
            || speech_text === ''
            || speech_text === last_spoken_speech_text
            || !speech_synthesis_available()) {
          return;
        }
        const utterance = new window.SpeechSynthesisUtterance(speech_text);
        utterance.lang = SPEECH_UTTERANCE_LANGUAGE;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        last_spoken_speech_text = speech_text;
      }
      function refresh_voice_guidance_control() {
        const is_available = speech_synthesis_available();
        navigation_voice_control.disabled = !is_available;
        navigation_voice_control.setAttribute(
          'aria-pressed', String(is_voice_guidance_enabled));
        navigation_voice_control.title = is_available
          ? 'Speak turn-by-turn guidance'
          : 'Voice guidance is unavailable in this browser';
      }
      navigation_voice_control.addEventListener('click', () => {
        if (!speech_synthesis_available()) return;
        is_voice_guidance_enabled = !is_voice_guidance_enabled;
        if (!is_voice_guidance_enabled) {
          window.speechSynthesis.cancel();
          last_spoken_speech_text = null;
        } else {
          // Speak the instruction on screen at once, so enabling never waits
          // for the next fix.
          const snapshot = window.mapNavigationSnapshot();
          last_spoken_speech_text = null;
          speak_navigation_speech(
            snapshot?.instruction?.activeManeuver?.speechText ?? '',
          );
        }
        refresh_voice_guidance_control();
      });
      refresh_voice_guidance_control();
      const NAVIGATION_IDLE_REASON_TEXT =
        'Plan a route, then start the simulated trip to see live guidance.';
      // The seek catch-up (M29): the navigator is fed a fix every
      // SYNC_STEP meters, capped at MAXIMUM_SYNC_FIX_COUNT fixes so a long
      // route's seek stays fast.
      const LIVE_NAVIGATION_SYNC_STEP_METERS = 10;
      const LIVE_NAVIGATION_MAXIMUM_SYNC_FIX_COUNT = 400;

      // The snapshot's phase spelling is the seam's own; the chip renders the
      // shared consumer label for it. An unknown spelling stays verbatim
      // rather than being guessed at.
      const NAVIGATION_PHASE_LABEL_BY_RAW_PHASE = Object.freeze({
        navigating: ui_label_text('navigation.phase_navigating'),
        offRoute: ui_label_text('navigation.phase_off_route'),
        arrived: ui_label_text('navigation.phase_arrived'),
      });
      function navigation_phase_label_text(raw_phase) {
        return NAVIGATION_PHASE_LABEL_BY_RAW_PHASE[raw_phase] ?? raw_phase;
      }

      // The active wasm navigator, or null between trips. One trip at a time,
      // like the native controllers.
      let live_navigator = null;

      /**
       * Draws one trip snapshot into the panel: the banner instruction, the
       * upcoming maneuver, the three progress rows, the phase chip and the
       * deviation alert. Values are the snapshot's own; only the formatting
       * (metres/kilometres, minutes) happens here.
       */
      function render_navigation_snapshot(snapshot) {
        if (snapshot === null) {
          render_navigation_idle(NAVIGATION_IDLE_REASON_TEXT);
          return;
        }
        navigation_demo_reason.hidden = true;
        navigation_demo_preview_notice.hidden = true;
        navigation_banner_overlay.hidden = false;
        const instruction = snapshot.instruction;
        document.getElementById('navigation-phase-value').textContent =
          navigation_phase_label_text(snapshot.phase);
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
          format_distance_text(instruction.progress.distanceRemainingMeters);
        const remaining_duration_text =
          format_duration_text(instruction.progress.durationRemainingSeconds);
        document.getElementById('navigation-eta-distance-value').textContent =
          remaining_distance_text;
        document.getElementById('navigation-eta-duration-value').textContent =
          remaining_duration_text;
        trip_navigation_eta_line.hidden = false;
        trip_navigation_eta_line.textContent =
          `${ui_label_text('navigation.eta_prefix')}: ` +
          `${ui_label_text('navigation.eta_distance_label')} ` +
          `${remaining_distance_text} · ` +
          `${ui_label_text('navigation.eta_duration_label')} ` +
          `${remaining_duration_text}`;
        speak_navigation_speech(instruction.activeManeuver.speechText ?? '');
        if (snapshot.deviation === null) {
          deviation_alert_element.hidden = true;
          deviation_alert_element.textContent = '';
        } else {
          deviation_alert_element.hidden = false;
          deviation_alert_element.textContent = ui_label_text_with_values(
            'navigation.deviation_alert',
            {
              offset: format_distance_text(
                snapshot.deviation.distanceFromRouteMeters),
            },
          );
        }
      }

      /** Clears the panel and states why it has nothing to show. */
      function render_navigation_idle(reason_text) {
        navigation_demo_reason.hidden = false;
        navigation_demo_reason.textContent = reason_text;
        navigation_demo_preview_notice.hidden = true;
        navigation_banner_overlay.hidden = true;
        document.getElementById('navigation-phase-value').textContent =
          ui_label_text('navigation.phase_not_started');
        document.getElementById('banner-distance-phrase-text').textContent = '';
        document.getElementById('banner-instruction-text').textContent = '';
        document.getElementById('upcoming-instruction-text').textContent = '';
        document.getElementById('navigation-eta-distance-value').textContent = '—';
        document.getElementById('navigation-eta-duration-value').textContent = '—';
        trip_navigation_eta_line.hidden = true;
        trip_navigation_eta_line.textContent = '';
        if (typeof window.speechSynthesis?.cancel === 'function') {
          window.speechSynthesis.cancel();
        }
        last_spoken_speech_text = null;
        deviation_alert_element.hidden = true;
        deviation_alert_element.textContent = '';
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
        stop_live_navigation(NAVIGATION_IDLE_REASON_TEXT);
        if (planned_route_record === null) {
          render_navigation_idle(
            'Plan a route first; live guidance follows the route you planned.');
          return;
        }
        try {
          const navigator = new window.mapTest.Navigator();
          navigator.startNavigation(
            route_record_for_navigator(planned_route_record), 'metric');
          live_navigator = navigator;
          render_navigation_snapshot(navigator.currentTripState());
        } catch (navigation_failure) {
          live_navigator = null;
          render_navigation_idle(
            `Guidance unavailable: ${String(navigation_failure)}`);
        }
      }

      /** Ends the live trip (if any) and clears the panel. */
      function stop_live_navigation(idle_reason_text = NAVIGATION_IDLE_REASON_TEXT) {
        if (live_navigator !== null) {
          try {
            live_navigator.stopNavigation();
          } catch {
            // A refusal on stop cannot leave a stale trip in the panel: the
            // reference is dropped below either way.
          }
          live_navigator = null;
        }
        render_navigation_idle(idle_reason_text);
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
        if (live_navigator === null) {
          return null;
        }
        return live_navigator.updateLocation({
          coordinate: { latitude: fix.latitude, longitude: fix.longitude },
          horizontalAccuracyMeters: horizontal_accuracy_meters,
          courseHeadingDegrees: fix.courseHeadingDegrees ?? null,
          timestampSeconds: null,
        });
      }

      /** Delivers one simulated fix to the navigator and redraws the panel. */
      function advance_live_navigation(fix) {
        if (live_navigator === null) {
          return;
        }
        try {
          render_navigation_snapshot(deliver_live_navigation_fix(fix));
        } catch (navigation_failure) {
          render_navigation_idle(
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
        if (live_navigator === null || planned_route_record === null) {
          return;
        }
        const target_meters = Math.min(
          Math.max(follow_demo.travelled_meters, 0), follow_demo.total_meters);
        start_live_navigation();
        if (live_navigator === null) {
          return;
        }
        const step_meters = Math.max(
          LIVE_NAVIGATION_SYNC_STEP_METERS,
          target_meters / LIVE_NAVIGATION_MAXIMUM_SYNC_FIX_COUNT,
        );
        let snapshot = live_navigator.currentTripState();
        for (
          let travelled_meters = step_meters;
          travelled_meters < target_meters;
          travelled_meters += step_meters
        ) {
          snapshot = deliver_live_navigation_fix(
            polyline_fix_at_travelled_meters(
              follow_demo.route_polyline, travelled_meters));
        }
        snapshot = deliver_live_navigation_fix(
          polyline_fix_at_travelled_meters(
            follow_demo.route_polyline, target_meters));
        render_navigation_snapshot(snapshot);
      }

      // The harness reads the live trip state without reaching into page
      // internals (the browser case asserts guidance follows the fixes).
      window.mapNavigationSnapshot = () =>
        live_navigator === null ? null : live_navigator.currentTripState();

      render_navigation_idle(NAVIGATION_IDLE_REASON_TEXT);

      // Formats one progress distance for the demo card (metric on web).
      function format_distance_text(distance_meters) {
        return distance_meters < METERS_PER_KILOMETER
          ? `${Math.round(distance_meters)} m`
          : `${(distance_meters / METERS_PER_KILOMETER).toFixed(1)} km`;
      }

      // Formats one duration the way the native shells do: whole minutes and
      // the remaining seconds, or seconds alone under a minute (the shared
      // `formatDurationSeconds` rule), so a route reads the same everywhere.
      function format_duration_text(duration_seconds) {
        const whole_minutes = Math.floor(duration_seconds / SECONDS_PER_MINUTE);
        const remainder_seconds =
          duration_seconds - whole_minutes * SECONDS_PER_MINUTE;
        return whole_minutes > 0
          ? `${whole_minutes} min ${Math.round(remainder_seconds)} s`
          : `${Math.round(duration_seconds)} s`;
      }

      // Camera state; the camera object itself is rebuilt on every change
      // because the wasm binding is an immutable value type.
      const camera_state = {
        latitude: 38.5766,
        longitude: -121.4944,
        zoom: INITIAL_ZOOM_LEVEL,
        bearing: 0,
        pitch: 0,
      };

      // Renderer mode reporting, read by the Playwright suite: 'gpu' once
      // the WebGPU canvas initialized, 'overlay' after the documented
      // degradation path ran, null until readiness resolved.
      let renderer_mode = null;
      let renderer_detail = '';
      // The compiled SDK version, shown in diagnostics only: the first-run
      // status line stays a plain readiness state.
      let compiled_version_value = null;
      // The wasm GPU canvas binding, set once `mapTestReady` resolved.
      let gpu_map_canvas = null;
      // GPU frames run one at a time; a change during a frame queues a
      // follow-up re-render instead of overlapping `renderFrame` calls.
      let render_busy = false;
      let render_queued = false;
      let last_frame_statistics = null;
      // The base-map rows render before the renderer answers; the vector
      // rows stay disabled until it does (a click is never a silent no-op).
      refresh_map_layers_panel();
      window.mapRendererMode = () => renderer_mode;
      window.mapRendererDetail = () => renderer_detail;
      // The live GPU canvas binding, read by the failure-injection test so a
      // rejected frame can be forced without touching production behaviour.
      window.mapGpuCanvas = () => gpu_map_canvas;
      window.mapLastFrameStats = () => last_frame_statistics;
      // The completed-frame counter and the render seam the page-lifecycle
      // test uses to ask for a frame while the tab reports itself hidden.
      window.mapFramesDrawn = () => frame_draw_count;
      window.mapRequestRenderForTest = () => schedule_render();
      // The live camera state, read by the UX tests (docs/ReferenceAppUX.md
      // §10.1) instead of parsing the readout's presentation text.
      window.mapCameraState = () => ({ ...camera_state, rendererMode: renderer_mode });

      // --- Round-11 state (control cluster, indicator, follow demo) ---
      // The 2D/3D camera plane the cluster's toggle holds (§4.2); the
      // follow camera uses the 3D pitch when set, mirroring the native
      // reference app's toggle state.
      let is_three_dimensional_camera = false;
      // The scale bar's currently selected scale (§4.2), recomputed per
      // rendered frame from the camera's ground answer; null renders no bar.
      let scale_bar_selection = null;
      // The currently shown location indicator (null — no indicator — until
      // my-location or the follow demo applies one).
      let current_location_indicator = null;
      // Frame facts of the diagnostics readout (§4.1): completed GPU frames
      // and the settled pump's retry renders (§5.3's frame-settled
      // discipline on the on-demand loop).
      let frame_draw_count = 0;
      let settled_pump_rerender_count = 0;
      let consecutive_missing_tile_renders = 0;
      // The performance monitor's rolling window of completed GPU frames:
      // each entry records when the frame finished, how long the GPU call took
      // and what the frame reported, so the summary can name the cause.
      const frame_performance_samples = [];
      let performance_strip_element = null;

      /**
       * The performance summary the diagnostics readout and the warning strip
       * share: the rolling render time, the observed frame rate while the page
       * is animating, the slow verdict and its named cause.
       */
      function performance_summary() {
        const steady_state_samples = frame_performance_samples.slice(
          PERFORMANCE_WARMUP_FRAMES);
        if (steady_state_samples.length < PERFORMANCE_MINIMUM_SAMPLES_FOR_VERDICT) {
          return {
            status: 'warming',
            sampleCount: steady_state_samples.length,
            medianRenderMilliseconds: null,
            framesPerSecond: null,
            isSlow: false,
            causeText: null,
          };
        }
        const render_milliseconds = steady_state_samples
          .map((sample) => sample.renderMilliseconds)
          .sort((first, second) => first - second);
        const median_render_milliseconds =
          render_milliseconds[Math.floor(render_milliseconds.length / 2)];
        const first_sample = steady_state_samples[0];
        const last_sample = steady_state_samples[steady_state_samples.length - 1];
        const window_milliseconds = last_sample.atMilliseconds - first_sample.atMilliseconds;
        const frames_per_second = window_milliseconds > 0
          ? ((steady_state_samples.length - 1) * 1000) / window_milliseconds
          : null;
        const is_actively_animating =
          steady_state_samples.length >= ACTIVE_ANIMATION_MINIMUM_FRAMES &&
          window_milliseconds <= ACTIVE_ANIMATION_WINDOW_MILLISECONDS;
        const is_render_over_budget =
          median_render_milliseconds > SLOW_FRAME_MILLISECONDS;
        const is_frame_rate_under_budget =
          is_actively_animating && frames_per_second !== null &&
          frames_per_second < SLOW_FRAMES_PER_SECOND;
        const is_slow = is_render_over_budget || is_frame_rate_under_budget;
        let cause_text = null;
        if (is_slow) {
          if (last_sample.missingTiles > 0) {
            cause_text = `${last_sample.missingTiles} tiles are still loading; ` +
              'the demo repaints until they arrive, so waiting is cheaper than interacting.';
          } else if (renderer_mode !== 'gpu') {
            cause_text = 'WebGPU is unavailable, so the 2D fallback redraws whole frames; ' +
              'use a Chromium-based browser or Safari 26 for GPU frames.';
          } else if (is_render_over_budget) {
            cause_text = `the GPU frame's median is ${median_render_milliseconds.toFixed(1)} ms ` +
              `(budget ${SLOW_FRAME_MILLISECONDS} ms); lower the pitch or zoom, or close other GPU tabs.`;
          } else {
            cause_text = `frames arrive at ${frames_per_second.toFixed(0)} fps ` +
              `(target ${SLOW_FRAMES_PER_SECOND} fps); the device or tab is throttled.`;
          }
        }
        return {
          status: is_slow ? 'slow' : 'ok',
          sampleCount: steady_state_samples.length,
          medianRenderMilliseconds: number_or_null(median_render_milliseconds),
          framesPerSecond: number_or_null(frames_per_second),
          isSlow: is_slow,
          causeText: cause_text,
        };
      }

      /** A finite number, or null when the sample is missing or not finite. */
      function number_or_null(value) {
        return value === null || !Number.isFinite(value) ? null : value;
      }

      /** Records one completed GPU frame; keeps the rolling window bounded. */
      function record_frame_performance(frame_statistics, render_milliseconds) {
        frame_performance_samples.push({
          atMilliseconds: performance.now(),
          renderMilliseconds: render_milliseconds,
          drawnTiles: frame_statistics?.drawnTiles ?? 0,
          missingTiles: frame_statistics?.missingTiles ?? 0,
          // Whether the vector base drew this frame in motion-graded mode
          // (M38). The frame-budget report states how much of the measured
          // pan ran graded instead of leaving it to inference.
          motionGraded: frame_statistics?.motionGraded ?? false,
          // The wasm frame's own stage spans (M23): the frame-budget harness
          // attributes a slow frame to geometry, encoding or submission from
          // these instead of inferring it from the total.
          stageMilliseconds: frame_statistics?.stageMilliseconds ?? null,
          // The GPU pass time the frame statistics report from timestamp
          // queries. It describes the previous frame's pass (the readback is
          // lagged one frame) and is null when the adapter cannot measure it.
          gpuPassMilliseconds: frame_statistics?.gpuPassMilliseconds ?? null,
        });
        if (frame_performance_samples.length > PERFORMANCE_SAMPLE_WINDOW_FRAMES) {
          frame_performance_samples.shift();
        }
      }

      /** Renders the warning strip and publishes the readout the tests read. */
      function refresh_performance_readout() {
        if (performance_strip_element === null) {
          performance_strip_element = document.getElementById('performance-strip');
        }
        const summary = performance_summary();
        if (performance_strip_element !== null) {
          performance_strip_element.hidden = summary.causeText === null;
          performance_strip_element.textContent = summary.causeText ?? '';
        }
      }

      window.mapPerformance = () => performance_summary();
      /**
       * The frame-budget scenario (M23): a scripted constant-velocity pan the
       * performance harness drives from a real browser, so the numbers the
       * performance chapter quotes come from the page's own frame path rather
       * than from a synthetic loop. It advances the camera once per animation
       * frame through the same user-path pan the pointer gesture applies,
       * renders through the page's normal render step, and resolves with the
       * frame samples recorded during the window plus the animation-frame
       * intervals — a frame rate alone cannot tell a smooth 60 Hz loop from a
       * loop that simply is not drawing.
       *
       * The pan runs out and back: the camera returns to where it started, so
       * the scenario never leaves the recorded tile fixtures (an unmapped edge
       * frame would report a smaller draw list and flatter numbers) and two
       * consecutive runs measure the same ground.
       *
       * @param {object} options
       * @param {number} options.panPixelsPerSecond the constant screen-space
       *   pan velocity, in device pixels per second
       * @param {number} options.durationMilliseconds how long the pan runs
       * @returns {Promise<{samples: object[], animationFrameIntervalsMilliseconds:
       *   number[]}>} the samples recorded during the pan (the page keeps a
       *   rolling window, so a pan longer than the window reports the window)
       */
      window.runFrameBudgetScenario = ({ panPixelsPerSecond, durationMilliseconds }) =>
        new Promise((resolve) => {
          // The scenario is a camera gesture by construction: the surface
          // grades every frame it draws until the pan ends, then the page
          // draws the settle. The same scenario on a tree without the
          // grading seam simply draws ungraded frames, which is the
          // measurement's control.
          set_camera_gesture_active(true);
          const animationFrameIntervalsMilliseconds = [];
          const scenario_start_milliseconds = performance.now();
          const scenario_half_duration_milliseconds = durationMilliseconds / 2;
          let previous_frame_milliseconds = null;
          let previous_pan_milliseconds = scenario_start_milliseconds;
          function scenario_step(animation_frame_milliseconds) {
            if (previous_frame_milliseconds !== null) {
              animationFrameIntervalsMilliseconds.push(
                animation_frame_milliseconds - previous_frame_milliseconds);
            }
            previous_frame_milliseconds = animation_frame_milliseconds;
            const pan_milliseconds = animation_frame_milliseconds - previous_pan_milliseconds;
            previous_pan_milliseconds = animation_frame_milliseconds;
            const elapsed_milliseconds =
              animation_frame_milliseconds - scenario_start_milliseconds;
            const pan_direction =
              elapsed_milliseconds < scenario_half_duration_milliseconds ? 1 : -1;
            move_center_by_ground_delta(
              (pan_direction * panPixelsPerSecond * pan_milliseconds)
                / MILLISECONDS_PER_SECOND, 0);
            schedule_render();
            if (elapsed_milliseconds < durationMilliseconds) {
              requestAnimationFrame(scenario_step);
              return;
            }
            // End the gesture and draw the settle frame; the sample window
            // closes after that frame has landed.
            end_camera_gesture();
            setTimeout(() => resolve({
              // The page keeps a rolling window, so the samples are selected
              // by the scenario's own clock rather than by list position: a
              // pan longer than the window honestly reports the window.
              samples: frame_performance_samples.filter(
                (sample) => sample.atMilliseconds >= scenario_start_milliseconds),
              animationFrameIntervalsMilliseconds,
            }), FRAME_BUDGET_SAMPLE_SETTLE_DELAY_MILLISECONDS);
          }
          requestAnimationFrame(scenario_step);
        });
      // The follow demo's live state (the §5.3 machine mirrored as plain
      // page glue; the wasm seam carries no navigation object — §12).
      const FOLLOW_DEMO_PHASE_DISENGAGED = 'disengaged';
      const FOLLOW_DEMO_PHASE_ENGAGED = 'engaged';
      const FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE = 'brokenByGesture';
      const FOLLOW_DEMO_LIVE_LINE_TEXTS = {
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
      const follow_camera = new FollowCamera();
      const follow_demo = {
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
        speed_multiplier: initial_demo_preferences.speedMultiplier,
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
      let live_target_bearing_degrees = null;
      /** The active follow phase's page label (`map-refapp-core`'s answer). */
      function follow_demo_phase() {
        return follow_camera.phase;
      }
      /** The target course whichever guidance path last reported one. */
      function follow_demo_target_bearing_degrees() {
        return follow_camera.targetBearingDegrees ?? live_target_bearing_degrees;
      }
      // The eased moves and the chase of the platform-pump-owned camera:
      // §5.3 eases bearing and pitch in the platform's frame pump; only
      // the center applies exactly.
      const pitch_swing_ease = new SmoothstepTimedEase();
      const compass_renorth_ease = new SmoothstepTimedEase();
      // Camera presets ease every pose component over the shared §2.4 move
      // duration (the native `animateCamera` behaviour) instead of jumping;
      // the five eases start and finish together.
      const camera_preset_eases = Object.freeze({
        latitude: new SmoothstepTimedEase(),
        longitude: new SmoothstepTimedEase(),
        zoom: new SmoothstepTimedEase(),
        bearing: new SmoothstepTimedEase(),
        pitch: new SmoothstepTimedEase(),
      });
      /** Wraps a bearing into `[0, 360)` after a shortest-path interpolation. */
      function normalized_bearing_degrees(bearing_degrees) {
        const wrapped_bearing = bearing_degrees % FULL_CIRCLE_DEGREES;
        return wrapped_bearing < 0 ? wrapped_bearing + FULL_CIRCLE_DEGREES : wrapped_bearing;
      }
      const follow_bearing_chase = new ExponentialValueChase(
        FOLLOW_BEARING_CHASE_TIME_CONSTANT_MILLISECONDS);

      window.mapLocationIndicatorState = () =>
        current_location_indicator ? { ...current_location_indicator } : null;
      // The puck's drawn pose (M72): the interpolated position the canvas
      // was last given, so a harness can measure the per-frame motion.
      window.mapLocationPose = () =>
        location_pose_animator.poseAt(performance.now()) ?? null;
      window.mapScaleBar = () =>
        scale_bar_selection
          ? {
              ...scale_bar_selection,
              labelText: scale_bar_distance_label_text(
                scale_bar_selection.distanceMeters,
              ),
            }
          : null;
      window.mapFollowDemoState = () => ({
        phase: follow_demo_phase(),
        isFollowing: follow_demo_phase() === FOLLOW_DEMO_PHASE_ENGAGED,
        travelledMeters: follow_demo.travelled_meters,
        totalMeters: follow_demo.total_meters,
        hasArrived: follow_demo.has_arrived,
        isPaused: follow_demo.is_paused,
        speedMultiplier: follow_demo.speed_multiplier,
        targetBearingDegrees: follow_demo_target_bearing_degrees(),
        cameraZoom: camera_state.zoom,
      });
      // The demo-plan picker's state, for the browser suite: which artifact
      // plan is selected, what it drew and framed, and how far its recorded
      // replay has advanced. No page internal is reached from a test.
      window.mapDemoPlanState = () => ({
        selectedScenario: selected_demo_plan_trace?.plan.scenario ?? null,
        label: selected_demo_plan_trace?.plan.label ?? null,
        description: selected_demo_plan_trace?.plan.description ?? null,
        overlayKinds: trip_route_overlays.map((overlay) => overlay.kind),
        routeDistanceMeters:
          selected_demo_plan_trace?.trace.route?.distance_meters ?? null,
        sampleIndex: follow_demo.trace_playback === null
          ? 0
          : follow_demo.trace_playback.cursor.nextSampleIndex()
            ?? follow_demo.trace_playback.cursor.sampleCount,
        sampleCount: follow_demo.trace_playback?.samples.length ?? 0,
        isReplaying: follow_demo.trace_playback !== null
          && follow_demo_phase() !== FOLLOW_DEMO_PHASE_DISENGAGED,
        isPaused: follow_demo.is_paused,
        rerouteApplied: follow_demo.has_issued_reroute,
        offRouteObserved: follow_demo.off_route_observed,
        offRouteAlertText: follow_demo.off_route_alert_text,
        camera: {
          latitude: camera_state.latitude,
          longitude: camera_state.longitude,
          zoom: camera_state.zoom,
        },
      });
      window.mapFrameFacts = () => ({
        framesDrawn: frame_draw_count,
        settledPumpRerenders: settled_pump_rerender_count,
      });

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

      function build_camera() {
        return new window.mapTest.MapCamera(
          camera_state.latitude,
          camera_state.longitude,
          camera_state.zoom,
          camera_state.bearing,
          camera_state.pitch,
        );
      }

      function refresh_control_labels() {
        value_labels.zoom.textContent = camera_state.zoom.toFixed(1);
        value_labels.bearing.textContent = `${camera_state.bearing.toFixed(0)}°`;
        value_labels.pitch.textContent = `${camera_state.pitch.toFixed(0)}°`;
      }

      function tile_corner_degrees(tile_x, tile_y, zoom_level) {
        const tile_count = TILE_COUNT_AT_ZOOM_ZERO * 2 ** zoom_level;
        const west_degrees = (tile_x / tile_count) * DEGREES_AT_ZOOM_ZERO - 180;
        const east_degrees = ((tile_x + 1) / tile_count) * DEGREES_AT_ZOOM_ZERO - 180;
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
        context.fillStyle = SCENE_BACKGROUND_BY_THEME[theme_name] ?? SCENE_BACKGROUND_FALLBACK;
        context.fillRect(0, 0, overlay_canvas.width, overlay_canvas.height);
        context.strokeStyle = BACKGROUND_GRID_BY_THEME[theme_name] ?? BACKGROUND_GRID_FALLBACK;
        for (let x = 0; x < overlay_canvas.width; x += CANVAS_GRID_SIZE) {
          context.beginPath(); context.moveTo(x, 0); context.lineTo(x, overlay_canvas.height); context.stroke();
        }
        for (let y = 0; y < overlay_canvas.height; y += CANVAS_GRID_SIZE) {
          context.beginPath(); context.moveTo(0, y); context.lineTo(overlay_canvas.width, y); context.stroke();
        }
      }

      function draw_tile_grid(context, camera, theme_name) {
        const projection_arguments = [
          overlay_canvas.width, overlay_canvas.height, FIELD_OF_VIEW_DEGREES,
        ];
        const visible_tiles = resolved_or_null(() =>
          camera.visibleTileKeys(
            overlay_canvas.width,
            overlay_canvas.height,
            FIELD_OF_VIEW_DEGREES,
            camera.tileZoomLevel(),
          )) ?? [];
        context.lineWidth = 1.5;
        context.font = '10px system-ui';
        for (const tile of visible_tiles) {
          const corners = tile_corner_degrees(tile.tileX, tile.tileY, tile.zoomLevel);
          const screen_points = corners
            .map(([latitude, longitude]) => resolved_or_null(() =>
              camera.projectToScreen(latitude, longitude, ...projection_arguments)))
            .filter(Boolean);
          if (screen_points.length < 3) continue;
          context.beginPath();
          context.moveTo(screen_points[0].x, screen_points[0].y);
          for (const point of screen_points.slice(1)) context.lineTo(point.x, point.y);
          context.closePath();
          context.fillStyle = TILE_FILL_BY_THEME[theme_name] ?? TILE_FILL_BY_THEME_FALLBACK;
          context.fill();
          context.strokeStyle = TILE_STROKE_BY_THEME[theme_name] ?? TILE_STROKE_BY_THEME_FALLBACK;
          context.stroke();
          context.fillStyle = TILE_STROKE_BY_THEME[theme_name] ?? TILE_STROKE_BY_THEME_FALLBACK;
          context.fillText(`${tile.tileX}, ${tile.tileY}`, screen_points[0].x + 3, screen_points[0].y + 12);
        }
      }

      function paint_overlay(camera) {
        const context = overlay_canvas.getContext('2d');
        const theme_name = current_theme_name();
        context.clearRect(0, 0, overlay_canvas.width, overlay_canvas.height);
        if (renderer_mode !== 'gpu') {
          // Degraded path: the overlay is the whole scene.
          draw_background(context, theme_name);
          draw_tile_grid(context, camera, theme_name);
        } else if (controls.overlay.checked) {
          // GPU path: the overlay carries only the opt-in debug grid.
          draw_tile_grid(context, camera, theme_name);
        }
      }

      // Phone width compresses the readout to its first line only
      // (docs/ReferenceAppUX.md §1); the full facts return with the width.
      function update_readout(camera) {
        if (
          window.matchMedia(PHONE_WIDTH_MEDIA_QUERY).matches ||
          window.matchMedia(SHORT_VIEWPORT_HEIGHT_MEDIA_QUERY).matches
        ) {
          readout_element.textContent =
            `mode ${renderer_mode} — center ` +
            `${camera_state.latitude.toFixed(5)}, ${camera_state.longitude.toFixed(5)}`;
          return;
        }
        if (renderer_mode === 'gpu' && last_frame_statistics) {
          readout_element.textContent =
            `mode gpu (${renderer_detail})` +
            `\ncenter ${camera_state.latitude.toFixed(5)}, ${camera_state.longitude.toFixed(5)}` +
            `\nzoom ${camera_state.zoom.toFixed(1)}  bearing ${camera_state.bearing.toFixed(0)}°  pitch ${camera_state.pitch.toFixed(0)}°` +
            `\ntiles requested ${last_frame_statistics.requestedTiles} / drawn ${last_frame_statistics.drawnTiles} / missing ${last_frame_statistics.missingTiles} / fragments ${last_frame_statistics.drawnFragments}` +
            `\nfetch zoom level ${last_frame_statistics.tileZoomLevel}` +
            `\ntile resolution ${last_frame_statistics.tileResolution}` +
            `\noverlays triangles ${last_frame_statistics.overlayTriangles}`;
        } else if (renderer_mode === 'overlay') {
          const visible_tiles = resolved_or_null(() =>
            camera.visibleTileKeys(
              overlay_canvas.width,
              overlay_canvas.height,
              FIELD_OF_VIEW_DEGREES,
              camera.tileZoomLevel(),
            )) ?? [];
          readout_element.textContent =
            `mode overlay (${renderer_detail})` +
            `\ncenter ${camera_state.latitude.toFixed(5)}, ${camera_state.longitude.toFixed(5)}` +
            `\nzoom ${camera_state.zoom.toFixed(1)}  bearing ${camera_state.bearing.toFixed(0)}°  pitch ${camera_state.pitch.toFixed(0)}°` +
            `\ntiles visible @z${camera.tileZoomLevel()}: ${visible_tiles.length}`;
        }
      }

      // One render step: schedule + draw a GPU frame when the WebGPU canvas
      // is up (awaited through the serialized frame queue), repaint the 2D
      // overlay, refresh the scale bar, the compass and the readout.
      function schedule_render() {
        // Every camera path funnels through here; the traffic layer restarts
        // its settle debounce when the pose it last asked about changed.
        note_camera_pose_for_traffic();
        if (is_page_teardown_requested) {
          return;
        }
        // A hidden tab keeps at most one frame queued; becoming visible
        // schedules that frame again.
        if (is_page_hidden) {
          render_queued = true;
          return;
        }
        if (render_busy) {
          render_queued = true;
          return;
        }
        run_render_step();
      }

      // A prefetched tile's payload lands outside any frame (the canvas never
      // blocks a presenting frame on the network, M23), so the canvas says so
      // on its element and the page draws the frame that includes it.
      const MAP_TILE_ARRIVED_EVENT_NAME = 'map-tile-arrived';
      map_canvas.addEventListener(MAP_TILE_ARRIVED_EVENT_NAME, () => schedule_render());

      // A rejected `renderFrame` must never freeze the page: report the
      // failure, drop to the 2D tile-grid overlay (the documented degradation
      // path) and keep the render loop running, so the map still pans.
      function degrade_to_overlay_after_frame_failure(frame_failure) {
        const failure_text = String(frame_failure?.message ?? frame_failure);
        gpu_map_canvas = null;
        renderer_mode = 'overlay';
        renderer_detail = `WebGPU frame failed: ${failure_text}`;
        show_error_report('Render frame', failure_text);
        status_line_element.setAttribute('data-readiness', 'degraded');
        status_line_element.textContent =
          `${ui_label_text('readiness.chip_degraded_prefix')}2D grid`;
        set_overlay_controls_enabled(
          false,
          'Scene overlays draw on the WebGPU surface only; this session ' +
            `uses the 2D tile grid (${renderer_detail}).`,
        );
        follow_demo_start_control.disabled = true;
        follow_demo_live_line.textContent =
          'Simulated trips need the 3D map renderer; this browser is using ' +
          'the 2D fallback.';
        refresh_map_layers_panel();
      }

      async function run_render_step() {
        render_busy = true;
        try {
          if (renderer_mode === 'gpu' && gpu_map_canvas) {
            // The GPU binding consumes its camera by value, so the frame
            // builds its own camera from the current state.
            const frame_start_milliseconds = performance.now();
            try {
              last_frame_statistics = await gpu_map_canvas.renderFrame(
                build_camera(), FIELD_OF_VIEW_DEGREES);
              record_frame_performance(
                last_frame_statistics,
                performance.now() - frame_start_milliseconds,
              );
              frame_draw_count += 1;
              pump_toward_settled_frame(last_frame_statistics);
            } catch (frame_failure) {
              degrade_to_overlay_after_frame_failure(frame_failure);
            }
          }
          const camera = build_camera();
          refresh_scale_bar(camera);
          paint_overlay(camera);
          refresh_compass_control();
          update_readout(camera);
          refresh_performance_readout();
          diagnostics_facts_element.textContent = diagnostics_facts_text();
          if (current_tile_mode === TILE_LAYER_MODES.vector) {
            refresh_vector_base_status();
          }
        } finally {
          render_busy = false;
        }
        if (is_page_teardown_requested) {
          release_page_renderer();
          return;
        }
        if (render_queued) {
          render_queued = false;
          schedule_render();
        }
      }

      // The settled pump (§5.3's frame-settled discipline on the on-demand
      // render loop): a frame with missing tiles re-renders at a bounded
      // cadence — the fetches drain the same-origin fixtures frame by frame,
      // and unavailable fixtures never settle, so the retries stay bounded
      // and the count publishes as a frame fact (§4.1).
      function pump_toward_settled_frame(frame_statistics) {
        if (!frame_statistics) {
          consecutive_missing_tile_renders = 0;
          return;
        }
        // A zoom cross-fade is an animation: the next frame comes on the
        // browser's animation cadence, not the missing-tile retry cadence.
        if (frame_statistics.zoomTransitionRunning) {
          consecutive_missing_tile_renders = 0;
          requestAnimationFrame(() => schedule_render());
          return;
        }
        if (frame_statistics.missingTiles === 0) {
          consecutive_missing_tile_renders = 0;
          return;
        }
        consecutive_missing_tile_renders += 1;
        if (consecutive_missing_tile_renders > SETTLED_PUMP_MAXIMUM_RETRY_RENDERS) return;
        settled_pump_rerender_count += 1;
        setTimeout(() => schedule_render(), SETTLED_PUMP_RETRY_DELAY_MILLISECONDS);
      }

      controls.zoom.addEventListener('input', () => {
        camera_state.zoom = Number(controls.zoom.value);
        refresh_control_labels(); schedule_render();
      });
      controls.bearing.addEventListener('input', () => {
        camera_state.bearing = Number(controls.bearing.value);
        refresh_control_labels(); schedule_render();
      });
      controls.pitch.addEventListener('input', () => {
        camera_state.pitch = Number(controls.pitch.value);
        refresh_control_labels(); schedule_render();
      });
      controls.overlay.addEventListener('change', () => schedule_render());
      // The renderer readout is developer chrome, hidden until asked for
      // (Advanced → Debug). Its text keeps updating while hidden, so enabling
      // it always shows the current session facts rather than a stale frame.
      renderer_readout_control.addEventListener('change', () => {
        readout_element.hidden = !renderer_readout_control.checked;
        if (renderer_readout_control.checked) {
          update_readout(build_camera());
        }
      });

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
        const ground_answer = resolved_or_null(() =>
          camera.groundMetersPerScreenPixel(
            window.innerWidth, window.innerHeight, FIELD_OF_VIEW_DEGREES)) ?? null;
        scale_bar_selection = select_scale_bar_scale(ground_answer);
        scale_bar_element.hidden = !scale_bar_selection;
        if (scale_bar_selection) {
          scale_bar_label_element.textContent =
            scale_bar_distance_label_text(scale_bar_selection.distanceMeters);
          scale_bar_line_element.style.width =
            `${Math.round(scale_bar_selection.widthPixels)}px`;
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
          bearing_off_north_degrees(camera_state.bearing);
        const is_holding_north_up =
          follow_demo_phase() === FOLLOW_DEMO_PHASE_ENGAGED
            && follow_camera.isNorthUp();
        compass_control.hidden =
          !is_holding_north_up
          && off_north_degrees_value < COMPASS_VISIBILITY_BEARING_THRESHOLD_DEGREES;
        compass_north_letter.style.transform = `rotate(${-camera_state.bearing}deg)`;
      }

      // The my-location control's re-center affordance (§4.2/§5.3): while a
      // gesture-broken follow waits for an explicit re-engage, the control
      // takes the cluster's active look and names the act.
      function refresh_my_location_control() {
        const is_recentering =
          follow_demo_phase() === FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE;
        my_location_control.classList.toggle('recentering', is_recentering);
        my_location_control.setAttribute(
          'aria-label',
          is_recentering ? 'Re-center on my location' : 'Center on my location');
      }

      // Device positioning (M33): the browser's Geolocation API feeds the
      // Rust `PositionController`, which validates and smooths the fixes; the
      // page then draws the renderer-owned tracking dot, centres the camera
      // and shows the position honestly in the settings sheet.
      const DEVICE_LOCATION_ZOOM_LEVEL = 15;
      const DEVICE_LOCATION_PERMISSION_DENIED_TEXT =
        'Location permission was denied. Allow it in the browser settings to use this.';
      const DEVICE_LOCATION_UNAVAILABLE_TEXT =
        'The browser could not determine a position right now.';
      const DEVICE_LOCATION_TIMEOUT_TEXT =
        'The browser timed out while determining a position.';
      const DEVICE_LOCATION_UNAVAILABLE_SUPPORT_TEXT =
        'This browser does not provide the Geolocation API.';
      // Device-driven navigation: the same source's fixes drive the planned
      // route's guidance, so the banner, the ETA line and the follow camera
      // read real fixes instead of the recorded trace.
      const DEVICE_NAVIGATION_START_TEXT = 'Navigate from my location';
      const DEVICE_NAVIGATION_STOP_TEXT = 'Stop device navigation';
      const DEVICE_NAVIGATION_PLAN_FIRST_TEXT =
        'Plan a route first; device navigation follows the route you planned.';
      const DEVICE_NAVIGATION_WAITING_TEXT =
        'Waiting for your position to start guidance.';
      const DEVICE_NAVIGATION_GUIDANCE_UNAVAILABLE_TEXT =
        'Guidance could not start on the planned route.';
      let device_location_watch_identifier = null;
      let device_position_controller = null;
      let is_device_navigation_active = false;
      // Whether starting device navigation also started the location source,
      // so stopping it again does not turn off a source the visitor chose.
      let device_navigation_started_location_watch = false;
      // The plan-first refusal stays on screen while device fixes arrive
      // about once a second, rather than being overwritten by the next
      // "Position …" line before the visitor can read it.
      let is_device_navigation_plan_first_pinned = false;
      // The panel row's state name (one of the shared names), the one-shot
      // "center on the next fix" request the round control makes, and the
      // field a "My location" chip is waiting to fill.
      let device_location_status_name = DEVICE_LOCATION_STATUS_NAMES.off;
      let device_location_center_on_next_fix = false;
      let pending_my_location_field_key = null;
      // The per-field fillers the trip planner registers; the device source
      // calls the pending one when a fix arrives, never both.
      const my_location_field_fillers = new Map();
      const my_location_chip_controls = {
        origin: document.getElementById(ORIGIN_MY_LOCATION_CHIP_IDENTIFIER),
        destination: document.getElementById(DESTINATION_MY_LOCATION_CHIP_IDENTIFIER),
      };

      /** The latest accepted fix, or null before the first one. */
      function latest_device_fix() {
        try {
          return device_position_controller?.latestFix() ?? null;
        } catch {
          return null;
        }
      }

      /** The reason the source cannot start, or null when it can. */
      function device_location_refusal_reason() {
        if (typeof navigator.geolocation?.watchPosition !== 'function') {
          return DEVICE_LOCATION_UNAVAILABLE_SUPPORT_TEXT;
        }
        if (typeof window.mapTest?.PositionController !== 'function') {
          return DEVICE_LOCATION_UNAVAILABLE_TEXT;
        }
        if (device_location_status_name === DEVICE_LOCATION_STATUS_NAMES.permissionDenied) {
          return DEVICE_LOCATION_PERMISSION_DENIED_TEXT;
        }
        if (device_location_status_name === DEVICE_LOCATION_STATUS_NAMES.unavailable) {
          return DEVICE_LOCATION_UNAVAILABLE_TEXT;
        }
        return null;
      }

      /** Reflects the source state in the panel row, the Stop action and the
       * two route-field chips. */
      function refresh_device_location_status_row() {
        device_location_status.textContent =
          device_location_status_text(device_location_status_name);
        const source_is_on = device_location_watch_identifier !== null;
        device_location_stop_control.hidden = !source_is_on;
        my_location_control.setAttribute('aria-pressed', String(source_is_on));
        refresh_my_location_control();
        refresh_my_location_chip_states();
      }

      /** Disables each chip with the panel's reason when the source cannot
       * start, and marks the field that already holds a fix. */
      function refresh_my_location_chip_states() {
        const refusal_reason = device_location_refusal_reason();
        const my_location_text = ui_label_text('plan.my_location_action');
        const unavailable_text = refusal_reason === null
          ? null
          : ui_label_text_with_values(
            'plan.my_location_unavailable', { reason: refusal_reason });
        for (const [field_key, chip] of Object.entries(my_location_chip_controls)) {
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
        if (pending_my_location_field_key === null) return;
        const field_key = pending_my_location_field_key;
        pending_my_location_field_key = null;
        const fill_field = my_location_field_fillers.get(field_key);
        if (fill_field === undefined) return;
        fill_field(device_fix_display_text(coordinate.latitude, coordinate.longitude));
        const chip = my_location_chip_controls[field_key];
        if (chip !== null) chip.dataset.filled = 'true';
        refresh_my_location_chip_states();
      }

      /** Starts the source if it is off and fills the chip's own field from
       * the latest fix as soon as one arrives. */
      function start_my_location_chip_fill(field_key) {
        const chip = my_location_chip_controls[field_key];
        if (chip === null || chip.disabled) return;
        pending_my_location_field_key = field_key;
        const latest_fix = latest_device_fix();
        if (latest_fix !== null) {
          apply_pending_my_location_fill(latest_fix);
          return;
        }
        if (device_location_watch_identifier === null) {
          start_device_location();
        }
      }

      for (const [field_key, chip] of Object.entries(my_location_chip_controls)) {
        chip?.addEventListener('click', () => start_my_location_chip_fill(field_key));
      }

      function refresh_device_location_control() {
        refresh_device_location_status_row();
      }

      function refresh_device_navigation_control() {
        device_navigation_control.setAttribute(
          'aria-pressed', String(is_device_navigation_active));
        device_navigation_control.textContent = is_device_navigation_active
          ? DEVICE_NAVIGATION_STOP_TEXT
          : DEVICE_NAVIGATION_START_TEXT;
      }

      /**
       * Starts guidance on the planned route from this device's fixes. The
       * location source is started when it is off; the recorded trip ends
       * first, because one trip runs at a time.
       */
      function start_device_navigation() {
        is_device_navigation_plan_first_pinned = false;
        if (planned_route_record === null) {
          is_device_navigation_plan_first_pinned = true;
          set_device_location_status(DEVICE_NAVIGATION_PLAN_FIRST_TEXT);
          return;
        }
        if (follow_demo_phase() !== FOLLOW_DEMO_PHASE_DISENGAGED) {
          end_follow_demo_trip(FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
        }
        device_navigation_started_location_watch =
          device_location_watch_identifier === null;
        if (device_navigation_started_location_watch) {
          start_device_location();
        }
        start_live_navigation();
        if (live_navigator === null) {
          set_device_location_status(DEVICE_NAVIGATION_GUIDANCE_UNAVAILABLE_TEXT);
          if (device_navigation_started_location_watch) {
            stop_device_location();
          }
          return;
        }
        is_device_navigation_active = true;
        follow_bearing_chase.reset();
        camera_state.zoom = follow_zoom_toward_trip_end(1.0);
        camera_state.pitch = is_three_dimensional_camera
          ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0;
        controls.zoom.value = camera_state.zoom;
        controls.pitch.value = camera_state.pitch;
        refresh_control_labels();
        refresh_device_navigation_control();
        set_device_location_status(DEVICE_NAVIGATION_WAITING_TEXT);
        schedule_render();
      }

      /** Ends device-driven guidance; the location source stops only when
       * this mode started it. */
      function stop_device_navigation() {
        if (!is_device_navigation_active) {
          return;
        }
        is_device_navigation_active = false;
        stop_live_navigation();
        live_target_bearing_degrees = null;
        follow_bearing_chase.reset();
        refresh_device_navigation_control();
        if (device_navigation_started_location_watch) {
          device_navigation_started_location_watch = false;
          stop_device_location();
        } else {
          set_device_location_status(null);
          schedule_render();
        }
      }

      /** Sets the settings sheet's detail line (the fix and guidance prose). */
      function set_device_location_status(status_text) {
        device_location_detail.hidden = status_text === null;
        device_location_detail.textContent = status_text ?? '';
      }

      /** Sets the panel row's state name and refreshes the chip availability. */
      function set_device_location_state(status_name) {
        device_location_status_name = status_name;
        refresh_device_location_status_row();
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
            return DEVICE_LOCATION_PERMISSION_DENIED_TEXT;
          case 3:
            return DEVICE_LOCATION_TIMEOUT_TEXT;
          default:
            return DEVICE_LOCATION_UNAVAILABLE_TEXT;
        }
      }

      /** Feeds one browser fix through the controller and presents it. */
      function apply_device_position(position) {
        if (device_position_controller === null) return;
        const coordinate = position.coords;
        try {
          device_position_controller.feedFix(
            coordinate.latitude,
            coordinate.longitude,
            Number.isFinite(coordinate.accuracy) ? coordinate.accuracy : undefined,
            Number.isFinite(coordinate.heading) ? coordinate.heading : undefined,
            Date.now() / MILLISECONDS_PER_SECOND,
          );
        } catch (position_failure) {
          set_device_location_status(String(position_failure?.message ?? position_failure));
          return;
        }
        const smoothed_course = device_position_controller.smoothedCourseDegrees();
        apply_location_indicator(
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
        const should_center = is_device_navigation_active
          || device_location_center_on_next_fix;
        device_location_center_on_next_fix = false;
        if (should_center) {
          camera_state.latitude = coordinate.latitude;
          camera_state.longitude = coordinate.longitude;
          camera_state.zoom = is_device_navigation_active
            ? follow_zoom_toward_trip_end(1.0)
            : Math.max(camera_state.zoom, DEVICE_LOCATION_ZOOM_LEVEL);
          if (is_device_navigation_active && is_three_dimensional_camera) {
            camera_state.pitch = NAVIGATION_FOLLOW_PITCH_3D_DEGREES;
            if (smoothed_course !== null) {
              live_target_bearing_degrees = smoothed_course;
            }
          }
          controls.zoom.value = camera_state.zoom;
          refresh_control_labels();
        }
        set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.active);
        apply_pending_my_location_fill(coordinate);
        schedule_render();
        const accuracy_text = Number.isFinite(coordinate.accuracy)
          ? ` · ±${Math.round(coordinate.accuracy)} m`
          : '';
        if (!is_device_navigation_plan_first_pinned) {
          set_device_location_status(
            `Position ${coordinate.latitude.toFixed(5)}, ` +
            `${coordinate.longitude.toFixed(5)}${accuracy_text}.`,
          );
        }
        if (is_device_navigation_active) {
          deliver_device_navigation_fix(coordinate, smoothed_course);
        }
      }

      /**
       * Delivers one accepted device fix to the route's guidance and redraws
       * the banner and ETA from the controller's own snapshot. A refusal ends
       * the mode honestly instead of leaving a stale trip on screen.
       */
      function deliver_device_navigation_fix(coordinate, smoothed_course) {
        if (live_navigator === null) {
          return;
        }
        try {
          render_navigation_snapshot(
            deliver_live_navigation_fix(
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
          stop_device_navigation();
          set_device_location_status(
            `Guidance unavailable: ${String(navigation_failure)}`);
        }
      }

      function stop_device_location({ remember = true } = {}) {
        if (is_device_navigation_active) {
          is_device_navigation_active = false;
          device_navigation_started_location_watch = false;
          stop_live_navigation();
          live_target_bearing_degrees = null;
          follow_bearing_chase.reset();
          refresh_device_navigation_control();
        }
        if (device_location_watch_identifier !== null) {
          navigator.geolocation.clearWatch(device_location_watch_identifier);
          device_location_watch_identifier = null;
        }
        device_position_controller = null;
        device_location_center_on_next_fix = false;
        pending_my_location_field_key = null;
        if (remember) {
          write_demo_preferences({ deviceLocationEnabled: false });
        }
        apply_location_indicator(null);
        set_device_location_status(null);
        set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.off);
        schedule_render();
      }

      /**
       * Restores the remembered device-location choice once the page can
       * serve a position: the source starts again and the camera centers on
       * its first fix. A platform that refuses the source leaves the choice
       * in the record for a later visit instead of pretending the layer is
       * on.
       */
      function restore_remembered_device_location() {
        if (!initial_demo_preferences.deviceLocationEnabled) return;
        if (device_location_watch_identifier !== null) return;
        if (device_location_refusal_reason() !== null) return;
        start_device_location({ centerOnFirstFix: true, remember: false });
      }

      /**
       * Starts the browser's location source. The round control asks for the
       * first fix to center the map; the chips start the same source without
       * moving the camera.
       */
      function start_device_location({ centerOnFirstFix = false, remember = true } = {}) {
        if (typeof navigator.geolocation?.watchPosition !== 'function') {
          set_device_location_status(DEVICE_LOCATION_UNAVAILABLE_SUPPORT_TEXT);
          set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.unavailable);
          return;
        }
        if (typeof window.mapTest?.PositionController !== 'function') {
          set_device_location_status(DEVICE_LOCATION_UNAVAILABLE_TEXT);
          set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.unavailable);
          return;
        }
        device_location_center_on_next_fix = centerOnFirstFix;
        device_position_controller = new window.mapTest.PositionController();
        device_location_watch_identifier = navigator.geolocation.watchPosition(
          (position) => apply_device_position(position),
          (error) => {
            const status_name = map_geolocation_error_name(error);
            try {
              device_position_controller?.sourceFailed(status_name);
            } catch {
              // An unknown status name leaves the controller unchanged.
            }
            set_device_location_status(map_geolocation_error_text(error));
            // A refused or unusable source is not left pretending it watches:
            // the watch stops, the controller keeps the reported state, and
            // the next tap may request permission again.
            if (device_location_watch_identifier !== null) {
              navigator.geolocation.clearWatch(device_location_watch_identifier);
              device_location_watch_identifier = null;
            }
            set_device_location_state(
              status_name === 'permissionDenied'
                ? DEVICE_LOCATION_STATUS_NAMES.permissionDenied
                : DEVICE_LOCATION_STATUS_NAMES.unavailable,
            );
          },
          { enableHighAccuracy: true, maximumAge: 1_000, timeout: 10_000 },
        );
        set_device_location_state(DEVICE_LOCATION_STATUS_NAMES.waiting);
        set_device_location_status('Waiting for a position…');
        if (remember) {
          write_demo_preferences({ deviceLocationEnabled: true });
        }
      }

      // The panel's Stop action is the only way to stop the source; the
      // settings sheet's row is a pointer to the panel, wired below.
      device_location_stop_control.addEventListener('click', () => {
        stop_device_location();
      });

      device_navigation_control.addEventListener('click', () => {
        if (is_device_navigation_active) {
          stop_device_navigation();
        } else {
          start_device_navigation();
        }
      });

      // The UX-test host contract: the controller's own state, so a browser
      // suite can assert a fix reached it without reading page prose.
      window.mapDeviceLocationState = () => ({
        isActive: device_location_watch_identifier !== null,
        isNavigating: is_device_navigation_active,
        fix: device_position_controller?.latestFix() ?? null,
        smoothedCourseDegrees:
          device_position_controller?.smoothedCourseDegrees() ?? null,
        sourceStatus: device_position_controller?.sourceStatus() ?? null,
        isStale:
          device_position_controller?.isStale(Date.now() / MILLISECONDS_PER_SECOND) ?? null,
      });

      // The location indicator (§4.2): the wasm seam draws the layer over
      // the overlays (the native surface's top layer); the state hook stays
      // live on the 2D path too, where (like the overlays) the draw is a
      // documented GPU-only capability.
      // The puck's interpolation (M72): every fix starts an eased motion from
      // the pose on screen, and the frame pump draws the intermediate poses,
      // so the position disc glides instead of hopping the fix distance.
      const location_pose_animator = new LocationPoseAnimator();
      let current_location_indicator_style = null;

      /** Draws one interpolated pose into the GPU canvas' indicator slot. */
      function draw_location_pose(pose) {
        if (!gpu_map_canvas || renderer_mode !== 'gpu') {
          return;
        }
        try {
          gpu_map_canvas.setLocationIndicator(
            {
              coordinate: {
                latitude: pose.latitudeDegrees,
                longitude: pose.longitudeDegrees,
              },
              courseHeadingDegrees: pose.courseDegrees ?? null,
              horizontalAccuracyMeters: pose.horizontalAccuracyMeters ?? null,
            },
            current_location_indicator_style,
          );
        } catch (indicator_failure) {
          const indicator_failure_message = String(indicator_failure?.message ?? indicator_failure);
          status_line_element.textContent =
            `Location indicator rejected: ${indicator_failure_message}`;
          show_error_report('Location indicator rejected', indicator_failure_message);
        }
      }

      function apply_location_indicator(indicator, indicator_style) {
        current_location_indicator = indicator
          ? { ...indicator, visualKind: indicator_style?.visualKind }
          : null;
        current_location_indicator_style = indicator_style ?? null;
        if (!indicator) {
          location_pose_animator.reset();
          return;
        }
        // The fix enters the animator; the drawn pose comes from `poseAt`, so
        // the first fix of a session draws at once and later ones glide.
        location_pose_animator.pushFix(
          indicator.latitude,
          indicator.longitude,
          indicator.courseHeadingDegrees ?? null,
          indicator.horizontalAccuracyMeters ?? null,
          performance.now(),
        );
        const pose = location_pose_animator.poseAt(performance.now());
        if (pose) {
          draw_location_pose(pose);
          if (pose.isAnimating) request_pump_step();
        }
        if (!indicator || renderer_mode !== 'gpu' || !gpu_map_canvas) {
          return;
        }
        try {
          gpu_map_canvas.setLocationIndicator(
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
          status_line_element.textContent =
            `Location indicator rejected: ${indicator_failure_message}`;
          show_error_report('Location indicator rejected', indicator_failure_message);
        }
      }

      // The platform pump (§5.3): the eased bearing/pitch moves and the
      // follow chase run here in the page's own frame pump — one render step
      // per pump frame; the pump stops when every owned move settled.
      let pump_step_requested = false;
      function request_pump_step() {
        if (pump_step_requested) return;
        pump_step_requested = true;
        requestAnimationFrame(pump_step);
      }

      function pump_step(now_milliseconds) {
        pump_step_requested = false;
        let pump_running = false;
        if (pitch_swing_ease.is_running) {
          const [eased_pitch, pitch_finished] = pitch_swing_ease.advance(now_milliseconds);
          camera_state.pitch = eased_pitch;
          controls.pitch.value = camera_state.pitch;
          if (!pitch_finished) pump_running = true;
        }
        if (compass_renorth_ease.is_running) {
          const [eased_bearing, renorth_finished] =
            compass_renorth_ease.advance(now_milliseconds);
          camera_state.bearing = eased_bearing;
          controls.bearing.value = camera_state.bearing;
          if (!renorth_finished) pump_running = true;
        }
        if (camera_preset_eases.latitude.is_running) {
          const [eased_latitude, latitude_finished] =
            camera_preset_eases.latitude.advance(now_milliseconds);
          const [eased_longitude, longitude_finished] =
            camera_preset_eases.longitude.advance(now_milliseconds);
          const [eased_zoom, zoom_finished] =
            camera_preset_eases.zoom.advance(now_milliseconds);
          const [eased_bearing, bearing_finished] =
            camera_preset_eases.bearing.advance(now_milliseconds);
          const [eased_pitch, preset_pitch_finished] =
            camera_preset_eases.pitch.advance(now_milliseconds);
          camera_state.latitude = eased_latitude;
          camera_state.longitude = eased_longitude;
          camera_state.zoom = eased_zoom;
          camera_state.bearing = normalized_bearing_degrees(eased_bearing);
          camera_state.pitch = eased_pitch;
          controls.zoom.value = camera_state.zoom;
          controls.bearing.value = camera_state.bearing;
          controls.pitch.value = camera_state.pitch;
          if (!latitude_finished
              || !longitude_finished
              || !zoom_finished
              || !bearing_finished
              || !preset_pitch_finished) {
            pump_running = true;
          }
        }
        const follow_bearing_target = follow_camera.targetBearingDegrees;
        if (follow_demo_phase() === FOLLOW_DEMO_PHASE_ENGAGED &&
            follow_bearing_target !== null) {
          const chase_delta_degrees = signed_angular_difference_degrees(
            follow_bearing_target, camera_state.bearing);
          if (Math.abs(chase_delta_degrees) <= FOLLOW_BEARING_SNAP_DISTANCE_DEGREES) {
            camera_state.bearing = follow_bearing_target;
          } else {
            camera_state.bearing = follow_bearing_chase.advance(
              camera_state.bearing, follow_bearing_target, now_milliseconds);
            pump_running = true;
          }
          controls.bearing.value = camera_state.bearing;
        }
        // The puck's motion rides the same pump: draw the pose for this
        // frame and stay scheduled while the motion is still running.
        const location_pose = location_pose_animator.poseAt(now_milliseconds);
        if (location_pose && current_location_indicator !== null) {
          draw_location_pose(location_pose);
          if (location_pose.isAnimating) pump_running = true;
        }
        refresh_control_labels();
        schedule_render();
        if (pump_running) request_pump_step();
      }

      // The zoom controls (§4.2): one step per activation; while held they
      // repeat the step at the §2.4 cadence until release. Activation rides
      // the press (so a hold never double-steps at release); a keyboard or
      // synthesized activation steps through the click alone.
      function step_zoom_by_control(direction_zoom_levels) {
        camera_state.zoom = Math.min(MAXIMUM_ZOOM_LEVEL, Math.max(
          MINIMUM_ZOOM_LEVEL, camera_state.zoom + direction_zoom_levels * MAP_CONTROL_ZOOM_STEP));
        controls.zoom.value = camera_state.zoom;
        refresh_control_labels();
        schedule_render();
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
          step_zoom_by_control(direction_zoom_levels);
          hold_interval_id = setInterval(
            () => step_zoom_by_control(direction_zoom_levels),
            MAP_CONTROL_ZOOM_REPEAT_INTERVAL_MILLISECONDS);
        });
        for (const hold_ending_event_name of ['pointerup', 'pointerleave', 'pointercancel']) {
          zoom_control.addEventListener(hold_ending_event_name, stop_hold);
        }
        zoom_control.addEventListener('click', () => {
          if (!stepped_while_held) step_zoom_by_control(direction_zoom_levels);
          stepped_while_held = false;
        });
      }
      attach_zoom_control(zoom_out_control, -1);
      attach_zoom_control(zoom_in_control, 1);

      // My-location (§4.2/§5.3, docs/design/MapControlsAndTrafficLayer.md): during a
      // simulated trip the control re-centers on the latest guided fix and
      // re-engages a follow broken by a gesture. Outside a trip it drives the
      // device location source: with the source off it requests permission,
      // starts the source and centers on the first fix; with the source on it
      // re-centers on the latest fix.
      my_location_control.addEventListener('click', () => {
        const is_trip_active =
          follow_demo_phase() !== FOLLOW_DEMO_PHASE_DISENGAGED;
        if (is_trip_active) {
          const latest_trip_fix = follow_demo.latest_fix;
          if (latest_trip_fix !== null) {
            camera_state.latitude = latest_trip_fix.latitude;
            camera_state.longitude = latest_trip_fix.longitude;
          }
          apply_location_indicator(
            {
              latitude: camera_state.latitude,
              longitude: camera_state.longitude,
              courseHeadingDegrees: null,
              horizontalAccuracyMeters: FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
            },
            { visualKind: 'trackingDot' },
          );
          if (follow_demo_phase() === FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE) {
            follow_camera.reengage();
            follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged;
            follow_bearing_chase.reset();
            refresh_my_location_control();
            request_pump_step();
          }
          schedule_render();
          return;
        }
        const refusal_reason = device_location_refusal_reason();
        if (device_location_watch_identifier === null) {
          if (refusal_reason !== null) {
            // The control never pretends it started; the panel states why.
            set_map_layers_status(refusal_reason);
            set_map_layers_panel_open(true);
            return;
          }
          start_device_location({ centerOnFirstFix: true });
          return;
        }
        const latest_fix = latest_device_fix();
        if (latest_fix === null) {
          // Waiting for the first fix: center when it arrives.
          device_location_center_on_next_fix = true;
          return;
        }
        camera_state.latitude = latest_fix.latitude;
        camera_state.longitude = latest_fix.longitude;
        camera_state.zoom = Math.max(camera_state.zoom, DEVICE_LOCATION_ZOOM_LEVEL);
        controls.zoom.value = camera_state.zoom;
        refresh_control_labels();
        schedule_render();
      });

      // The 2D/3D plane toggle (§4.2): flips the plane state and swings the
      // pitch to the plane's value over the one eased-camera-move duration;
      // the follow camera uses the plane's pitch the whole trip (§5.3). The
      // label names the currently held plane (the native toggle's rule).
      plane_toggle_control.addEventListener('click', () => {
        is_three_dimensional_camera = !is_three_dimensional_camera;
        plane_toggle_control.textContent =
          is_three_dimensional_camera ? '3D' : '2D';
        // The button is a two-state toggle for assistive technology as well
        // as for the eye: pressed means the 3D plane is active.
        plane_toggle_control.setAttribute(
          'aria-pressed', String(is_three_dimensional_camera));
        plane_toggle_control.classList.toggle('primary', is_three_dimensional_camera);
        pitch_swing_ease.begin(
          performance.now(), camera_state.pitch,
          is_three_dimensional_camera ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0,
          eased_camera_move_duration_milliseconds());
        request_pump_step();
      });

      // The compass (§4.2): a tap eases the camera north up over the one
      // eased-camera-move duration; the pump re-renders as it swings. During
      // a guided trip the tap is a mode toggle (M73): north-up holds across
      // every following fix until the visitor chooses course-up again.
      compass_control.addEventListener('click', () => {
        if (follow_demo_phase() === FOLLOW_DEMO_PHASE_ENGAGED) {
          if (follow_camera.isNorthUp()) {
            follow_camera.courseUp();
          } else {
            follow_camera.northUp();
          }
        }
        compass_renorth_ease.begin(
          performance.now(), camera_state.bearing, 0,
          eased_camera_move_duration_milliseconds());
        request_pump_step();
      });

      // The follow demo (§5.3): the page drives the artifact's route scene
      // polyline through the §5.3 follow camera. The trip's fixes arrive at
      // the recorded trace's dispatch interval; each fix centers exactly,
      // re-targets the ramped zoom and the median-smoothed bearing chase,
      // and re-engages follow. Trip end restores the pre-trip camera; the
      // indicator clears.
      const FOLLOW_DEMO_START_TEXT = ui_label_text('route.start_action');
      const FOLLOW_DEMO_STOP_TEXT = ui_label_text('navigation.exit_action');
      const route_scene = REFERENCE_SCENE_ARTIFACT.overlay_scenes.route;
      const FOLLOW_DEMO_ROUTE_POLYLINE = route_scene.coordinates.map(
        (route_coordinate) => ({
          latitude: route_coordinate.latitude_degrees,
          longitude: route_coordinate.longitude_degrees,
        }));

      // The playback controls (M27): the paces a visitor may pick, applied to
      // the route's own walk speed, and the one control that pauses it.

      /**
       * The fix cadence of the active playback. A route walk uses the demo's
       * fixed dispatch interval; a recorded trace replays its own samples at
       * the trace's recorded interval, divided by the demo acceleration and
       * the selected speed multiplier (the native driver's rule).
       */
      function current_follow_demo_fix_interval_milliseconds() {
        const playback = follow_demo.trace_playback;
        if (playback === null) return follow_demo_fix_interval_milliseconds();
        const recorded_sample_interval_seconds = playback.sample_interval_seconds
          ?? FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS;
        // The crate divides the recorded interval by the folded acceleration
        // and floors the result at its documented minimum.
        return trace_dispatch_interval_milliseconds(
          recorded_sample_interval_seconds,
          FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR * follow_demo.speed_multiplier,
        );
      }

      /** Re-arms the fix timer at the current playback's cadence. */
      function restart_follow_demo_fix_interval() {
        if (follow_demo.fix_interval_id !== null) {
          clearInterval(follow_demo.fix_interval_id);
          follow_demo.fix_interval_id = null;
        }
        if (follow_demo_phase() === FOLLOW_DEMO_PHASE_DISENGAGED
            || follow_demo.is_paused) {
          return;
        }
        follow_demo.fix_interval_id = setInterval(
          on_follow_demo_fix, current_follow_demo_fix_interval_milliseconds());
      }

      /** Rebuilds the speed chips and marks the active one. */
      function render_follow_demo_speed_controls() {
        follow_demo_speed_controls.replaceChildren();
        for (const multiplier of FOLLOW_DEMO_SPEED_MULTIPLIERS) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.textContent = ui_label_text_with_values(
            'navigation.speed_multiplier_label', { multiplier });
          chip.setAttribute(
            'aria-pressed', String(multiplier === follow_demo.speed_multiplier));
          chip.addEventListener('click', () => {
            follow_demo.speed_multiplier = multiplier;
            write_demo_preferences({ speedMultiplier: multiplier });
            render_follow_demo_speed_controls();
            // A recorded trace dispatches at the recorded cadence scaled by
            // the speed choice, so the timer is re-armed at the new interval.
            if (follow_demo.trace_playback !== null) {
              restart_follow_demo_fix_interval();
            }
          });
          follow_demo_speed_controls.append(chip);
        }
      }

      /**
       * Bounds and positions the seek control at the trip's own geometry. The
       * thumb follows every fix unless a pointer is scrubbing it, so the
       * control and the walker cannot show two positions at once.
       */
      function refresh_follow_demo_seek_control() {
        follow_demo_seek_control.max = String(follow_demo.total_meters);
        if (!follow_demo.is_seeking) {
          follow_demo_seek_control.value = String(follow_demo.travelled_meters);
        }
      }

      /** Shows or hides the playback row, and names the pause control. */
      function refresh_follow_demo_playback_row(is_running) {
        follow_demo_playback_row.hidden = !is_running;
        follow_demo_pause_control.textContent = follow_demo.is_paused
          ? ui_label_text('navigation.resume_action')
          : ui_label_text('navigation.pause_action');
        // The arrival state has nothing left to pause; the seek control stays
        // usable so a backwards seek can leave the arrival.
        follow_demo_pause_control.hidden = follow_demo.has_arrived;
        // A recorded trace replays its own samples verbatim, so there is no
        // route distance to seek to (the native driver's `isSeekable` rule).
        follow_demo_seek_row.hidden = follow_demo.trace_playback !== null;
        if (is_running) {
          render_follow_demo_speed_controls();
          refresh_follow_demo_seek_control();
        }
      }

      /** Stops the fix timer without ending the trip. */
      function pause_follow_demo_trip() {
        if (follow_demo.fix_interval_id !== null) {
          clearInterval(follow_demo.fix_interval_id);
          follow_demo.fix_interval_id = null;
        }
        follow_demo.is_paused = true;
        refresh_follow_demo_playback_row(true);
        follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.paused;
      }

      /** Restarts the fix timer and delivers a fix immediately. */
      function resume_follow_demo_trip() {
        follow_demo.is_paused = false;
        refresh_follow_demo_playback_row(true);
        follow_demo_live_line.textContent = follow_demo.trace_playback !== null
          ? FOLLOW_DEMO_LIVE_LINE_TEXTS.planReplay
          : FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged;
        follow_demo.fix_interval_id = setInterval(
          on_follow_demo_fix, current_follow_demo_fix_interval_milliseconds());
        on_follow_demo_fix();
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
        if (follow_demo_phase() === FOLLOW_DEMO_PHASE_DISENGAGED) {
          return;
        }
        const should_run = !follow_demo.is_paused;
        if (follow_demo.fix_interval_id !== null) {
          clearInterval(follow_demo.fix_interval_id);
          follow_demo.fix_interval_id = null;
        }
        follow_demo.travelled_meters = Math.min(
          Math.max(target_meters, 0), follow_demo.total_meters);
        // The camera follows every scrub sample; guidance catches up once on
        // release (finish_follow_demo_seek), because a single teleported fix
        // cannot advance the reducer's steps.
        on_follow_demo_fix(false, false);
        if (follow_demo.has_arrived) {
          return;
        }
        follow_demo_live_line.textContent = should_run
          ? FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged
          : FOLLOW_DEMO_LIVE_LINE_TEXTS.paused;
        if (should_run) {
          follow_demo.fix_interval_id = setInterval(
            on_follow_demo_fix, follow_demo_fix_interval_milliseconds());
        }
      }

      function end_follow_demo_trip(end_live_text) {
        // The guidance card belongs to the trip: ending it clears the card.
        // An arrival keeps its last snapshot (phase Arrived) until Stop.
        stop_live_navigation();
        if (follow_demo.fix_interval_id !== null) clearInterval(follow_demo.fix_interval_id);
        follow_demo.fix_interval_id = null;
        const pre_trip_camera = follow_camera.restorePreTripCamera();
        live_target_bearing_degrees = null;
        follow_demo.latest_fix = null;
        follow_bearing_chase.reset();
        refresh_my_location_control();
        // §5.3: trip end returns the captured pre-trip camera; with it the
        // indicator clears (the follow visual is the in-trip state).
        apply_location_indicator(null, null);
        if (pre_trip_camera) {
          camera_state.latitude = pre_trip_camera.centerLatitudeDegrees;
          camera_state.longitude = pre_trip_camera.centerLongitudeDegrees;
          camera_state.zoom = pre_trip_camera.zoomLevel;
          camera_state.bearing = pre_trip_camera.bearingDegrees;
          camera_state.pitch = pre_trip_camera.pitchDegrees;
          controls.zoom.value = camera_state.zoom;
          controls.bearing.value = camera_state.bearing;
          controls.pitch.value = camera_state.pitch;
        }
        refresh_control_labels();
        follow_demo_live_line.textContent = end_live_text;
        follow_demo_start_control.textContent = FOLLOW_DEMO_START_TEXT;
        follow_demo.is_paused = false;
        follow_demo.has_arrived = false;
        follow_demo.is_seeking = false;
        // A recorded replay's bookkeeping resets with the trip, so the next
        // trip starts from the trace's first sample.
        follow_demo.trace_playback = null;
        follow_demo.has_issued_reroute = false;
        follow_demo_pause_control.hidden = false;        refresh_follow_demo_playback_row(false);
        schedule_render();
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
        follow_camera.engageTrip(
          camera_state.latitude,
          camera_state.longitude,
          camera_state.zoom,
          camera_state.bearing,
          camera_state.pitch,
        );
        follow_demo.trace_playback = {
          samples: recorded_samples,
          // The trace's own cursor owns which sample is next; the page's
          // timer only asks for the next one at the recorded cadence.
          cursor: new TraceCursor(recorded_samples.length),
          sample_interval_seconds: recorded_trace.metadata?.sample_interval_seconds
            ?? FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS,
          reroute_route: recorded_trace.reroute_route ?? null,
        };
        follow_demo.has_issued_reroute = false;
        follow_demo.off_route_observed = false;
        follow_demo.off_route_alert_text = '';
        // The route's own polyline backs the no-seek invariant; the trace
        // replay never walks it (the samples are the fixes).
        follow_demo.route_polyline = selected_plan_trace.polyline;
        follow_demo.travelled_meters = 0;
        follow_demo.total_meters = polyline_length_meters(selected_plan_trace.polyline);
        follow_demo.is_paused = false;
        follow_demo.has_arrived = false;
        follow_demo.is_seeking = false;
        follow_bearing_chase.reset();
        live_target_bearing_degrees = null;
        follow_demo.latest_fix = null;
        refresh_my_location_control();
        camera_state.zoom = follow_camera.targetZoomLevel;
        camera_state.pitch = is_three_dimensional_camera
          ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0;
        controls.zoom.value = camera_state.zoom;
        controls.pitch.value = camera_state.pitch;
        follow_demo_start_control.textContent = FOLLOW_DEMO_STOP_TEXT;
        refresh_follow_demo_playback_row(true);
        follow_demo_pause_control.hidden = false;
        follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.planReplay;
        // Guidance starts on the trace's recorded route before the first fix,
        // so the banner already names the first maneuver when the trip starts.
        start_live_navigation();
        if (live_navigator === null) {
          // Guidance could not start; do not fake a camera-only walk.
          follow_demo.trace_playback = null;
          end_follow_demo_trip(FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
          return;
        }
        follow_demo.fix_interval_id = setInterval(
          on_follow_demo_fix, current_follow_demo_fix_interval_milliseconds());
        on_follow_demo_fix();
      }

      /** Ends a recorded replay's timer while keeping the last guidance state
       * presented (the native driver's arrival/end rule). */
      function finish_demo_plan_replay(end_live_text) {
        if (follow_demo.fix_interval_id !== null) {
          clearInterval(follow_demo.fix_interval_id);
          follow_demo.fix_interval_id = null;
        }
        follow_demo.is_paused = true;
        follow_demo_pause_control.hidden = true;
        follow_demo_live_line.textContent = end_live_text;
      }

      /**
       * Applies a trace's recorded replacement route the first time the trip
       * is judged off route (M31; §7.5: a reroute is a state transition, not
       * an error). The fixture's replacement route is anchored at the
       * reducer's frozen snap by construction. A refusal is reported verbatim.
       */
      function maybe_issue_demo_plan_reroute(playback) {
        if (playback.reroute_route === null || follow_demo.has_issued_reroute
            || live_navigator === null) {
          return;
        }
        let trip_snapshot;
        try {
          trip_snapshot = live_navigator.currentTripState();
        } catch {
          return;
        }
        if (trip_snapshot === null || trip_snapshot.phase !== 'offRoute') {
          return;
        }
        follow_demo.has_issued_reroute = true;
        try {
          live_navigator.applyReroute(
            route_record_for_navigator(playback.reroute_route));
          render_navigation_snapshot(live_navigator.currentTripState());
        } catch (reroute_failure) {
          render_navigation_idle(`Reroute unavailable: ${String(reroute_failure)}`);
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
        const playback = follow_demo.trace_playback;
        if (playback === null) return;
        const sample_index = playback.cursor.nextSampleIndex();
        if (sample_index === null) {
          finish_demo_plan_replay(FOLLOW_DEMO_LIVE_LINE_TEXTS.planReplayEnded);
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
        follow_demo.latest_fix = {
          latitude: sample.latitude,
          longitude: sample.longitude,
        };
        const horizontal_accuracy_meters = sample.horizontal_accuracy_meters;
        let trip_snapshot = null;
        if (live_navigator !== null) {
          try {
            trip_snapshot = deliver_live_navigation_fix(fix, horizontal_accuracy_meters);
          } catch (navigation_failure) {
            render_navigation_idle(
              `Guidance unavailable: ${String(navigation_failure)}`);
          }
        }
        if (trip_snapshot !== null) {
          render_navigation_snapshot(trip_snapshot);
          if (trip_snapshot.phase === 'offRoute') {
            // Record the card's own alert copy at the judgment, so the
            // evidence does not depend on how long the frozen phase lasts.
            follow_demo.off_route_observed = true;
            follow_demo.off_route_alert_text = deviation_alert_element.textContent;
          }
        }
        const remaining_fraction = playback.samples.length <= 1
          ? 0
          : 1 - sample_index / (playback.samples.length - 1);
        // The crate's state machine retargets centre, ramped zoom and the
        // median-smoothed course; a gesture-broken follow stays broken.
        follow_camera.onFix(
          fix.latitude,
          fix.longitude,
          sample_course_heading_degrees,
          remaining_fraction,
        );
        if (follow_demo_phase() !== FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE) {
          camera_state.latitude = follow_camera.targetCenterLatitudeDegrees;
          camera_state.longitude = follow_camera.targetCenterLongitudeDegrees;
          camera_state.zoom = follow_camera.targetZoomLevel;
          controls.zoom.value = camera_state.zoom;
        }
        apply_location_indicator(
          {
            latitude: fix.latitude,
            longitude: fix.longitude,
            courseHeadingDegrees: sample_course_heading_degrees,
            horizontalAccuracyMeters: horizontal_accuracy_meters,
          },
          { visualKind: 'guidedCourseArrow' },
        );
        maybe_issue_demo_plan_reroute(playback);
        playback.cursor.advance();
        refresh_control_labels();
        refresh_compass_control();
        refresh_my_location_control();
        schedule_render();
        const has_arrived = trip_snapshot !== null
          && (trip_snapshot.phase === 'arrived' || trip_snapshot.isArrived === true);
        if (has_arrived) {
          follow_demo.has_arrived = true;
          finish_demo_plan_replay(FOLLOW_DEMO_LIVE_LINE_TEXTS.arrived);
          return;
        }
        request_pump_step();
      }

      function on_follow_demo_fix(advances = true, feeds_guidance = true) {
        // A recorded plan replay reads its fixes from the trace, not from the
        // route walker.
        if (follow_demo.trace_playback !== null) {
          on_demo_plan_replay_fix();
          return;
        }
        // The walk clamps at the route's total length, so the last fix lands
        // exactly on the destination instead of stopping a tick short of it.
        const travelled_meters = Math.min(
          follow_demo.travelled_meters, follow_demo.total_meters);
        const has_arrived = travelled_meters >= follow_demo.total_meters;
        follow_demo.has_arrived = has_arrived;
        const remaining_distance_fraction =
          follow_demo.total_meters <= 0
            ? 0
            : 1 - travelled_meters / follow_demo.total_meters;
        const fix = polyline_fix_at_travelled_meters(
          follow_demo.route_polyline, travelled_meters);
        follow_demo.latest_fix = { latitude: fix.latitude, longitude: fix.longitude };
        // The same fix that moves the camera drives the guidance card: the
        // navigator judges it, advances steps and composes the banner. A
        // scrubbing seek suppresses this and resyncs on release instead.
        if (feeds_guidance) {
          advance_live_navigation(fix);
        }
        // §5.3: a fix retargets the smoothed course and the ramped zoom; the
        // camera follows only while engaged. A gesture keeps follow broken
        // until the my-location control re-engages it — a fix never silently
        // snaps the user's panned view back. The crate's state machine owns
        // that decision and the median-smoothed course.
        follow_camera.onFix(
          fix.latitude,
          fix.longitude,
          fix.courseHeadingDegrees,
          remaining_distance_fraction,
        );
        if (follow_demo_phase() !== FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE) {
          camera_state.latitude = follow_camera.targetCenterLatitudeDegrees;
          camera_state.longitude = follow_camera.targetCenterLongitudeDegrees;
          camera_state.zoom = follow_camera.targetZoomLevel;
          controls.zoom.value = camera_state.zoom;
        }
        apply_location_indicator(
          {
            latitude: fix.latitude,
            longitude: fix.longitude,
            courseHeadingDegrees: fix.courseHeadingDegrees,
            horizontalAccuracyMeters: FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
          },
          { visualKind: 'guidedCourseArrow' },
        );
        if (advances) {
          follow_demo.travelled_meters = travelled_meters +
            FOLLOW_DEMO_SPEED_METERS_PER_SECOND *
            follow_demo.speed_multiplier *
            (follow_demo_fix_interval_milliseconds() / 1000);
        }
        refresh_control_labels();
        refresh_compass_control();
        refresh_my_location_control();
        refresh_follow_demo_seek_control();
        follow_demo_pause_control.hidden = has_arrived;
        schedule_render();
        if (has_arrived) {
          // Arrival keeps the destination on screen: the fixes stop, the
          // camera stays where the trip ended, and Stop restores the
          // pre-trip camera the way it does at any other moment.
          if (follow_demo.fix_interval_id !== null) {
            clearInterval(follow_demo.fix_interval_id);
            follow_demo.fix_interval_id = null;
          }
          follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.arrived;
          return;
        }
        request_pump_step();
      }

      follow_demo_pause_control.addEventListener('click', () => {
        if (follow_demo_phase() === FOLLOW_DEMO_PHASE_DISENGAGED) {
          return;
        }
        if (follow_demo.is_paused) {
          resume_follow_demo_trip();
        } else {
          pause_follow_demo_trip();
        }
      });

      // The seek control (M27): every input asks the walker for that
      // position. A pointer-down marks the scrub so the walker's own ticks
      // never fight the thumb; pointer-up (or a keyboard change) ends it.
      follow_demo_seek_control.addEventListener('pointerdown', () => {
        follow_demo.is_seeking = true;
      });
      follow_demo_seek_control.addEventListener('input', () => {
        seek_follow_demo_trip(Number(follow_demo_seek_control.value));
      });
      const finish_follow_demo_seek = () => {
        follow_demo.is_seeking = false;
        refresh_follow_demo_seek_control();
        // Guidance catches up on release: the route is replayed to the seeked
        // position, so the banner, progress and phase match the camera.
        sync_live_navigation_to_travelled_distance();
      };
      follow_demo_seek_control.addEventListener('change', finish_follow_demo_seek);
      window.addEventListener('pointerup', () => {
        if (follow_demo.is_seeking) {
          finish_follow_demo_seek();
        }
      });

      follow_demo_start_control.addEventListener('click', () => {
        if (follow_demo_phase() !== FOLLOW_DEMO_PHASE_DISENGAGED) {
          end_follow_demo_trip(FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
          return;
        }
        // One trip runs at a time: starting the recorded trip ends a
        // device-driven one (and leaves a location source the visitor
        // started by hand running).
        stop_device_navigation();
        // A selected demo plan makes the recorded trace the trip the replay
        // drives; otherwise the trip walks the route the visitor planned.
        if (selected_demo_plan_trace !== null) {
          start_demo_plan_replay(selected_demo_plan_trace);
          return;
        }
        // §5.3: trip start captures the pre-trip camera and applies the
        // fixed deep zoom and the plane's pitch; center and bearing hold
        // until the first fix retargets them.
        follow_camera.engageTrip(
          camera_state.latitude,
          camera_state.longitude,
          camera_state.zoom,
          camera_state.bearing,
          camera_state.pitch,
        );
        // The trip walks the route the visitor planned; the artifact's own
        // scene polyline is only the fallback for the no-plan demo.
        const planned_route_polyline = trip_route_overlays
          .find((overlay) => overlay.kind === 'routePolyline')
          ?.coordinates ?? null;
        const trip_polyline = planned_route_polyline ?? FOLLOW_DEMO_ROUTE_POLYLINE;
        follow_demo.route_polyline = trip_polyline;
        follow_demo.travelled_meters = 0;
        follow_demo.is_paused = false;
        follow_demo.has_arrived = false;
        follow_demo.is_seeking = false;
        follow_demo.total_meters = polyline_length_meters(trip_polyline);
        follow_bearing_chase.reset();
        live_target_bearing_degrees = null;
        follow_demo.latest_fix = null;
        refresh_my_location_control();
        camera_state.zoom = follow_camera.targetZoomLevel;
        camera_state.pitch = is_three_dimensional_camera
          ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0;
        controls.zoom.value = camera_state.zoom;
        controls.pitch.value = camera_state.pitch;
        follow_demo_start_control.textContent = FOLLOW_DEMO_STOP_TEXT;
        refresh_follow_demo_playback_row(true);
        follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged;
        // Live guidance starts on the planned route before the first fix, so
        // the banner already names the first maneuver when the trip begins.
        start_live_navigation();
        follow_demo.fix_interval_id = setInterval(
          on_follow_demo_fix, follow_demo_fix_interval_milliseconds());
        on_follow_demo_fix();
      });

      // A map-surface gesture (drag or wheel — §5.3) ends ENGAGED follow
      // immediately; it stays broken until the my-location control
      // re-engages it (never the next fix).
      function follow_demo_note_camera_gesture() {
        if (follow_demo_phase() === FOLLOW_DEMO_PHASE_ENGAGED) {
          follow_camera.breakOnGesture();
          follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.brokenByGesture;
          refresh_my_location_control();
        }
      }

      // The diagnostics readout (§4.1): the facts are the session's draw
      // facts; the event lines flush the wasm ring (oldest first). Diagnostics
      // are opt-in (docs/design/ReferenceApplicationBehavior.md §Diagnostics
      // policy): nothing is subscribed until the Advanced pane opens, the
      // stream is bounded to the shared window, Show debug events lowers the
      // gate for this session only, and Clear resets the pane's displayed list.
      let diagnostics_subscribed = false;
      let diagnostics_debug_enabled = false;
      let diagnostics_refresh_interval = null;
      let diagnostics_displayed_event_count = 0;
      function diagnostics_facts_text() {
        const frame_statistics_lines = last_frame_statistics
          ? `tiles drawn ${last_frame_statistics.drawnTiles} / ` +
            `missing ${last_frame_statistics.missingTiles} / ` +
            `fragments ${last_frame_statistics.drawnFragments}`
          : 'tiles no GPU frame settled yet';
        const performance_summary_lines = (() => {
          const summary = performance_summary();
          if (summary.status === 'warming') {
            return 'performance warming up — a verdict needs a few GPU frames';
          }
          const render_text = summary.medianRenderMilliseconds === null
            ? 'render n/a'
            : `render median ${summary.medianRenderMilliseconds.toFixed(1)} ms`;
          const rate_text = summary.framesPerSecond === null
            ? 'rate n/a'
            : `${summary.framesPerSecond.toFixed(0)} fps`;
          return `performance ${summary.status} — ${render_text} / ${rate_text} ` +
            `(${summary.sampleCount} frames sampled)`;
        })();
        return [
          `version ${compiled_version_value ?? 'unknown'}`,
          `mode ${renderer_mode} — ${renderer_detail}`,
          `center ${camera_state.latitude.toFixed(5)}, ${camera_state.longitude.toFixed(5)}` +
            ` zoom ${camera_state.zoom.toFixed(1)}` +
            ` bearing ${camera_state.bearing.toFixed(0)}° pitch ${camera_state.pitch.toFixed(0)}°`,
          frame_statistics_lines,
          performance_summary_lines,
          `frames drawn ${frame_draw_count} (settled pump re-rendered ${settled_pump_rerender_count})`,
        ].join('\n');
      }

      /** The severity the pane flushes at: Info by default, Debug on request. */
      function diagnostics_display_severity_value() {
        const severity_name = diagnostics_debug_enabled
          ? DIAGNOSTICS_DEBUG_SEVERITY_NAME
          : DIAGNOSTICS_MINIMUM_SEVERITY_NAME;
        return window.mapTest.SdkLogSeverity[severity_name];
      }

      /** Re-reads the bounded ring and renders the pane's window. */
      function refresh_diagnostics_event_lines(
        maximum_count = DIAGNOSTICS_EVENT_WINDOW) {
        if (!diagnostics_subscribed) return;
        const flushed_events = Array.from(
          window.mapTest.flushRecentDiagnosticEvents(
            diagnostics_display_severity_value(), maximum_count),
        ).filter((event_line) => diagnostics_cleared_at_milliseconds === null
          || event_line.timestampMillisecondsSinceEpoch
            > diagnostics_cleared_at_milliseconds);
        diagnostics_displayed_event_count = flushed_events.length;
        diagnostics_event_lines.textContent = flushed_events.length === 0
          ? ui_label_text('diagnostics.no_events')
          : flushed_events
            .map((event_line) =>
              `${event_line.severity} ${event_line.subsystemTarget}: ${event_line.messageLine}`)
            .join('\n');
      }

      /** Starts the one bounded stream the first time the pane opens. */
      function open_diagnostics_stream() {
        if (typeof window.mapTest?.subscribeToDiagnosticEvents !== 'function') return;
        if (!diagnostics_subscribed) {
          window.mapTest.subscribeToDiagnosticEvents(
            window.mapTest.SdkLogSeverity[DIAGNOSTICS_MINIMUM_SEVERITY_NAME]);
          diagnostics_subscribed = true;
        }
        if (diagnostics_refresh_interval === null) {
          diagnostics_refresh_interval = setInterval(
            refresh_diagnostics_event_lines,
            DIAGNOSTICS_REFRESH_CADENCE_MILLISECONDS,
          );
        }
        // The open flush is the pane's documented backlog: its own shared
        // limit, then the steady-state window on the refresh cadence.
        refresh_diagnostics_event_lines(DIAGNOSTICS_BACKLOG_FLUSH_LIMIT);
      }

      /** Stops the refresh cadence while the pane stays closed. */
      function close_diagnostics_stream() {
        if (diagnostics_refresh_interval === null) return;
        clearInterval(diagnostics_refresh_interval);
        diagnostics_refresh_interval = null;
      }

      /** Applies the explicit debug switch; the SDK gate never raises back. */
      function set_diagnostics_debug_enabled(is_enabled) {
        diagnostics_debug_enabled = is_enabled;
        diagnostics_debug_events_control.checked = is_enabled;
        diagnostics_debug_events_label.textContent = is_enabled
          ? ui_label_text('diagnostics.hide_debug_events')
          : ui_label_text('diagnostics.show_debug_events');
        if (is_enabled && typeof window.mapTest?.subscribeToDiagnosticEvents === 'function') {
          window.mapTest.subscribeToDiagnosticEvents(
            window.mapTest.SdkLogSeverity[DIAGNOSTICS_DEBUG_SEVERITY_NAME]);
        }
        refresh_diagnostics_event_lines();
      }

      diagnostics_debug_events_control.addEventListener('change', () => {
        set_diagnostics_debug_enabled(diagnostics_debug_events_control.checked);
      });
      diagnostics_clear_control.addEventListener('click', () => {
        // The pane's own list resets; the SDK ring is never emptied, so a
        // later event still reports and the clear is timestamp-scoped.
        diagnostics_cleared_at_milliseconds = Date.now();
        refresh_diagnostics_event_lines();
      });
      diagnostics_refresh_control.addEventListener('click', () => {
        refresh_diagnostics_event_lines();
      });
      diagnostics_close_control.addEventListener('click', () => {
        close_diagnostics_stream();
        advanced_panel.open = false;
      });
      advanced_panel.addEventListener('toggle', () => {
        if (advanced_panel.open) {
          open_diagnostics_stream();
        } else {
          close_diagnostics_stream();
        }
      });
      // The diagnostics opt-in's observable state, for the browser suite: no
      // subscription before the pane opens, a bounded window and the explicit
      // debug choice.
      window.mapDiagnosticsState = () => ({
        subscribed: diagnostics_subscribed,
        debugEnabled: diagnostics_debug_enabled,
        displaySeverity: diagnostics_debug_enabled
          ? DIAGNOSTICS_DEBUG_SEVERITY_NAME
          : DIAGNOSTICS_MINIMUM_SEVERITY_NAME,
        displayedEventCount: diagnostics_displayed_event_count,
        clearedAtMilliseconds: diagnostics_cleared_at_milliseconds,
        eventWindow: DIAGNOSTICS_EVENT_WINDOW,
        refreshCadenceMilliseconds: DIAGNOSTICS_REFRESH_CADENCE_MILLISECONDS,
      });

      // Pan tracking keeps the previous pointer position explicitly. The
      // synthesized pointer events of a scripted browser (and the Playwright
      // harness) may not carry `movementX`/`movementY`, so the frame delta is
      // computed from stored positions instead.
      let last_pointer_position = null;

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
      function apply_camera_pose(camera_pose) {
        if (!camera_pose) return false;
        camera_state.latitude = camera_pose.latitude;
        camera_state.longitude = camera_pose.longitude;
        camera_state.zoom = camera_pose.zoomLevel;
        camera_state.bearing = camera_pose.bearingDegrees;
        camera_state.pitch = camera_pose.pitchDegrees;
        controls.zoom.value = camera_state.zoom;
        controls.bearing.value = camera_state.bearing;
        controls.pitch.value = camera_state.pitch;
        refresh_control_labels(); schedule_render();
        return true;
      }

      function move_center_by_ground_delta(delta_x_pixels, delta_y_pixels) {
        apply_camera_pose(resolved_or_null(() =>
          window.mapTest.panCameraByScreenPixels(
            build_camera(),
            delta_x_pixels,
            delta_y_pixels,
            overlay_canvas.width, overlay_canvas.height, FIELD_OF_VIEW_DEGREES,
          )));
      }

      // The camera-gesture seam (M38): the page owns gesture recognition, so
      // it tells the wasm canvas when a gesture is in progress. Every frame
      // drawn meanwhile draws the vector base from cached geometry with no
      // label assembly; ending the gesture and drawing once more resolves both
      // at the final pose. The native surfaces need no such call — their
      // platform gesture recognizers move the camera, which is the signal the
      // surface reads each frame.
      let camera_gesture_settle_timer = null;
      function set_camera_gesture_active(active) {
        if (gpu_map_canvas && typeof gpu_map_canvas.setCameraGestureActive === 'function') {
          gpu_map_canvas.setCameraGestureActive(active);
        }
      }
      function end_camera_gesture() {
        if (camera_gesture_settle_timer !== null) {
          clearTimeout(camera_gesture_settle_timer);
          camera_gesture_settle_timer = null;
        }
        set_camera_gesture_active(false);
        schedule_render();
      }
      function note_camera_gesture_in_progress(
        settleDelayMilliseconds = CAMERA_GESTURE_SETTLE_DELAY_MILLISECONDS,
      ) {
        set_camera_gesture_active(true);
        if (camera_gesture_settle_timer !== null) {
          clearTimeout(camera_gesture_settle_timer);
        }
        camera_gesture_settle_timer = setTimeout(
          end_camera_gesture,
          settleDelayMilliseconds,
        );
      }

      let panning = false;
      // The pointer kind of the gesture in progress: a touch double tap is
      // recognised from pointer events, and a browser-synthesized `dblclick`
      // that follows it must not zoom a second time.
      let last_pointer_kind = 'mouse';
      let last_touch_tap = null;
      // The pointer's position in the canvas' own physical pixels (the canvas
      // backing store can differ from its laid-out size).
      function pointer_to_canvas_pixels(event) {
        const canvas_rectangle = overlay_canvas.getBoundingClientRect();
        return {
          x_pixels: (event.clientX - canvas_rectangle.left)
            * (overlay_canvas.width / canvas_rectangle.width),
          y_pixels: (event.clientY - canvas_rectangle.top)
            * (overlay_canvas.height / canvas_rectangle.height),
        };
      }
      // Zooms one level around a pointer position: the platform-recognised
      // double click / double tap, applied through the contract's focal zoom
      // member like the wheel and the cluster's zoom controls.
      function zoom_around_canvas_point(canvas_point) {
        note_camera_gesture_in_progress();
        follow_demo_note_camera_gesture();
        const zoom_target = Math.min(
          MAXIMUM_ZOOM_LEVEL, camera_state.zoom + DOUBLE_TAP_ZOOM_STEP);
        const double_tap_pose = resolved_or_null(() =>
          window.mapTest.zoomCameraByLevelsAroundScreenPoint(
            build_camera(),
            zoom_target - camera_state.zoom,
            canvas_point.x_pixels, canvas_point.y_pixels,
            overlay_canvas.width, overlay_canvas.height, FIELD_OF_VIEW_DEGREES,
          ));
        if (!apply_camera_pose(double_tap_pose)) {
          refresh_control_labels(); schedule_render();
        }
      }
      overlay_canvas.addEventListener('pointerdown', (event) => {
        panning = true; overlay_canvas.classList.add('panning');
        last_pointer_kind = event.pointerType === 'touch' ? 'touch' : 'mouse';
        set_camera_gesture_active(true);
        follow_demo_note_camera_gesture();
        overlay_canvas.setPointerCapture(event.pointerId);
        last_pointer_position = [event.clientX, event.clientY];
      });
      overlay_canvas.addEventListener('pointermove', (event) => {
        if (!panning || !last_pointer_position) return;
        const delta_x_css_pixels = event.clientX - last_pointer_position[0];
        const delta_y_css_pixels = event.clientY - last_pointer_position[1];
        last_pointer_position = [event.clientX, event.clientY];
        // The camera takes drawing-buffer pixels; the pointer moved CSS
        // pixels, so the delta follows the canvas' own ratio.
        const canvas_rectangle = overlay_canvas.getBoundingClientRect();
        const ratio_x = canvas_rectangle.width > 0
          ? overlay_canvas.width / canvas_rectangle.width
          : 1;
        const ratio_y = canvas_rectangle.height > 0
          ? overlay_canvas.height / canvas_rectangle.height
          : 1;
        move_center_by_ground_delta(
          delta_x_css_pixels * ratio_x,
          delta_y_css_pixels * ratio_y,
        );
      });
      overlay_canvas.addEventListener('pointerup', (event) => {
        panning = false; overlay_canvas.classList.remove('panning');
        end_camera_gesture();
        // A touch double tap zooms; pointer capture keeps the second tap on
        // the canvas, so the pair is recognised from pointer-ups alone.
        if (event.pointerType !== 'touch') return;
        const tap_point = pointer_to_canvas_pixels(event);
        const now_milliseconds = performance.now();
        const previous_tap = last_touch_tap;
        last_touch_tap = { atMilliseconds: now_milliseconds, ...tap_point };
        if (previous_tap === null) return;
        const interval_milliseconds = now_milliseconds - previous_tap.atMilliseconds;
        const travel_pixels = Math.hypot(
          tap_point.x_pixels - previous_tap.x_pixels,
          tap_point.y_pixels - previous_tap.y_pixels,
        );
        if (interval_milliseconds > DOUBLE_TAP_INTERVAL_MILLISECONDS
          || travel_pixels > DOUBLE_TAP_MAXIMUM_MOVEMENT_PIXELS) {
          return;
        }
        last_touch_tap = null;
        zoom_around_canvas_point(tap_point);
      });
      overlay_canvas.addEventListener('pointercancel', () => {
        panning = false; overlay_canvas.classList.remove('panning');
        end_camera_gesture();
      });
      overlay_canvas.addEventListener('dblclick', (event) => {
        // A touch double tap already zoomed from its pointer pair.
        if (last_pointer_kind === 'touch') return;
        event.preventDefault();
        zoom_around_canvas_point(pointer_to_canvas_pixels(event));
      });
      overlay_canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        note_camera_gesture_in_progress();
        follow_demo_note_camera_gesture();
        // The wheel zoom targets the documented fixture zoom range ([0, 20];
        // §5.1) before the delta crosses the seam — the camera's own [0, 24]
        // clamp would fetch tiles past the fixtures. The focal point stays
        // the viewport center, so the zoom answers exactly the pre-seam
        // behavior (the wheel event's own pixel position would zoom toward
        // the cursor — a focal zoom the seam already carries — but that is a
        // behavior change to make deliberately, not as a migration side
        // effect).
        const zoom_target = Math.min(MAXIMUM_ZOOM_LEVEL, Math.max(
          MINIMUM_ZOOM_LEVEL, camera_state.zoom - event.deltaY * ZOOM_WHEEL_SCALE));
        const wheel_pose = resolved_or_null(() =>
          window.mapTest.zoomCameraByLevelsAroundScreenPoint(
            build_camera(),
            zoom_target - camera_state.zoom,
            overlay_canvas.width / 2, overlay_canvas.height / 2,
            overlay_canvas.width, overlay_canvas.height, FIELD_OF_VIEW_DEGREES,
          ));
        // A pose application schedules the render it needs; a gesture the
        // seam answered with no pose still ends in a scheduled frame (the
        // zero-delta wheel event the harness dispatches for the forced
        // re-present must always re-present).
        if (!apply_camera_pose(wheel_pose)) {
          refresh_control_labels(); schedule_render();
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
      let map_status_announcement_timer = null;
      function announce_map_status(message) {
        if (map_status_announcement_timer !== null) {
          clearTimeout(map_status_announcement_timer);
        }
        map_status_announcement_timer = setTimeout(() => {
          map_status_announcement_timer = null;
          map_status_element.textContent = message;
        }, MAP_STATUS_ANNOUNCEMENT_DELAY_MILLISECONDS);
      }
      // Keyboard steps are CSS pixels; the canvas' backing store can differ
      // from its laid-out size, so they cross the seam scaled like pointer
      // movement.
      function keyboard_canvas_ratios() {
        const canvas_rectangle = overlay_canvas.getBoundingClientRect();
        return {
          x: canvas_rectangle.width > 0
            ? overlay_canvas.width / canvas_rectangle.width
            : 1,
          y: canvas_rectangle.height > 0
            ? overlay_canvas.height / canvas_rectangle.height
            : 1,
        };
      }
      function keyboard_pan_by_css_pixels(delta_x_css_pixels, delta_y_css_pixels) {
        note_camera_gesture_in_progress();
        follow_demo_note_camera_gesture();
        const ratios = keyboard_canvas_ratios();
        move_center_by_ground_delta(
          delta_x_css_pixels * ratios.x, delta_y_css_pixels * ratios.y);
        announce_map_status(
          `Map moved to ${camera_state.latitude.toFixed(4)}, `
          + `${camera_state.longitude.toFixed(4)}.`);
      }
      function keyboard_zoom_by_levels(delta_zoom_levels) {
        note_camera_gesture_in_progress();
        follow_demo_note_camera_gesture();
        const zoom_target = Math.min(MAXIMUM_ZOOM_LEVEL, Math.max(
          MINIMUM_ZOOM_LEVEL, camera_state.zoom + delta_zoom_levels));
        const zoom_pose = resolved_or_null(() =>
          window.mapTest.zoomCameraByLevelsAroundScreenPoint(
            build_camera(), zoom_target - camera_state.zoom,
            overlay_canvas.width / 2, overlay_canvas.height / 2,
            overlay_canvas.width, overlay_canvas.height, FIELD_OF_VIEW_DEGREES));
        if (!apply_camera_pose(zoom_pose)) {
          refresh_control_labels(); schedule_render();
        }
        announce_map_status(`Zoom ${camera_state.zoom.toFixed(1)}.`);
      }
      function keyboard_rotate_by_degrees(delta_bearing_degrees) {
        note_camera_gesture_in_progress();
        follow_demo_note_camera_gesture();
        const rotate_pose = resolved_or_null(() =>
          window.mapTest.rotateCameraByDegreesAroundScreenPoint(
            build_camera(), delta_bearing_degrees,
            overlay_canvas.width / 2, overlay_canvas.height / 2,
            overlay_canvas.width, overlay_canvas.height, FIELD_OF_VIEW_DEGREES));
        if (!apply_camera_pose(rotate_pose)) {
          refresh_control_labels(); schedule_render();
        }
        announce_map_status(
          `Bearing ${Math.round(camera_state.bearing)} degrees.`);
      }
      function keyboard_tilt_by_degrees(delta_pitch_degrees) {
        const pitch_target = Math.min(MAXIMUM_PITCH_DEGREES, Math.max(
          MINIMUM_PITCH_DEGREES, camera_state.pitch + delta_pitch_degrees));
        if (pitch_target === camera_state.pitch) return;
        note_camera_gesture_in_progress(
          eased_camera_move_duration_milliseconds() + CAMERA_GESTURE_SETTLE_DELAY_MILLISECONDS);
        follow_demo_note_camera_gesture();
        pitch_swing_ease.begin(
          performance.now(), camera_state.pitch, pitch_target,
          eased_camera_move_duration_milliseconds());
        request_pump_step();
        announce_map_status(`Pitch ${Math.round(pitch_target)} degrees.`);
      }
      function keyboard_reset_view() {
        note_camera_gesture_in_progress(
          eased_camera_move_duration_milliseconds() + CAMERA_GESTURE_SETTLE_DELAY_MILLISECONDS);
        follow_demo_note_camera_gesture();
        const duration_milliseconds = eased_camera_move_duration_milliseconds();
        pitch_swing_ease.begin(
          performance.now(), camera_state.pitch, MINIMUM_PITCH_DEGREES,
          duration_milliseconds);
        compass_renorth_ease.begin(
          performance.now(), camera_state.bearing, 0, duration_milliseconds);
        request_pump_step();
        announce_map_status(
          `View reset north and flat at zoom ${camera_state.zoom.toFixed(1)}.`);
      }
      overlay_canvas.addEventListener('keydown', (event) => {
        // Leave browser and operating-system chords (Ctrl/Cmd/Alt) alone;
        // only the documented unmodified and Shift-modified keys are ours.
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        let handled = true;
        switch (event.key) {
          case 'ArrowLeft':
            if (event.shiftKey) {
              keyboard_rotate_by_degrees(-KEYBOARD_ROTATE_STEP_DEGREES);
            } else {
              keyboard_pan_by_css_pixels(-KEYBOARD_PAN_STEP_CSS_PIXELS, 0);
            }
            break;
          case 'ArrowRight':
            if (event.shiftKey) {
              keyboard_rotate_by_degrees(KEYBOARD_ROTATE_STEP_DEGREES);
            } else {
              keyboard_pan_by_css_pixels(KEYBOARD_PAN_STEP_CSS_PIXELS, 0);
            }
            break;
          case 'ArrowUp':
            if (event.shiftKey) {
              keyboard_tilt_by_degrees(KEYBOARD_PITCH_STEP_DEGREES);
            } else {
              keyboard_pan_by_css_pixels(0, -KEYBOARD_PAN_STEP_CSS_PIXELS);
            }
            break;
          case 'ArrowDown':
            if (event.shiftKey) {
              keyboard_tilt_by_degrees(-KEYBOARD_PITCH_STEP_DEGREES);
            } else {
              keyboard_pan_by_css_pixels(0, KEYBOARD_PAN_STEP_CSS_PIXELS);
            }
            break;
          case '+':
          case '=':
            keyboard_zoom_by_levels(KEYBOARD_ZOOM_STEP_LEVELS);
            break;
          case '-':
          case '_':
            keyboard_zoom_by_levels(-KEYBOARD_ZOOM_STEP_LEVELS);
            break;
          case 'Home':
            keyboard_reset_view();
            break;
          default:
            handled = false;
        }
        if (handled) event.preventDefault();
      });
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
        const device_pixel_ratio = canvas_device_pixel_ratio();
        map_canvas.width = Math.round(window.innerWidth * device_pixel_ratio);
        map_canvas.height = Math.round(window.innerHeight * device_pixel_ratio);
        overlay_canvas.width = map_canvas.width;
        overlay_canvas.height = map_canvas.height;
      }

      // --- Page lifecycle -------------------------------------------------
      // The canvas follows its layout box (not only window resize events), a
      // display-density change re-sizes the backing store, a hidden tab does
      // not schedule frames, and leaving the page releases the GPU canvas.

      /** Whether the tab is hidden; a hidden tab queues at most one render. */
      let is_page_hidden = document.visibilityState === 'hidden';

      /** Whether the page is being torn down; no frame may start after it. */
      let is_page_teardown_requested = false;

      /** The display-density media query that reports DPR changes. */
      let device_pixel_ratio_media_query = null;

      function handle_device_pixel_ratio_change() {
        resize_canvases();
        schedule_render();
        watch_device_pixel_ratio_changes();
      }

      /**
       * Watches the current display density. `matchMedia('(resolution: Ndppx)')`
       * changes exactly when the ratio changes, so it catches a window dragged
       * between displays and browser zoom, which never fire `resize`.
       */
      function watch_device_pixel_ratio_changes() {
        device_pixel_ratio_media_query?.removeEventListener(
          'change',
          handle_device_pixel_ratio_change,
        );
        device_pixel_ratio_media_query = window.matchMedia(
          `(resolution: ${canvas_device_pixel_ratio()}dppx)`,
        );
        device_pixel_ratio_media_query.addEventListener(
          'change',
          handle_device_pixel_ratio_change,
        );
      }

      /**
       * Releases the WebGPU canvas and the page listeners. The generated
       * `free()` drops every Rust-owned surface, device and cached payload;
       * a frame already in flight finishes first, because freeing the wasm
       * object under a live frame would invalidate its borrow.
       */
      function release_page_renderer() {
        canvas_size_observer?.disconnect();
        device_pixel_ratio_media_query?.removeEventListener(
          'change',
          handle_device_pixel_ratio_change,
        );
        device_pixel_ratio_media_query = null;
        if (gpu_map_canvas !== null) {
          gpu_map_canvas.free();
          gpu_map_canvas = null;
        }
      }

      function handle_page_teardown() {
        is_page_teardown_requested = true;
        if (!render_busy) {
          release_page_renderer();
        }
      }

      const canvas_size_observer =
        typeof ResizeObserver === 'function'
          ? new ResizeObserver(() => {
              resize_canvases();
              schedule_render();
            })
          : null;
      canvas_size_observer?.observe(document.documentElement);

      document.addEventListener('visibilitychange', () => {
        is_page_hidden = document.visibilityState === 'hidden';
        if (!is_page_hidden) {
          resize_canvases();
          schedule_render();
        }
      });
      window.addEventListener('pagehide', handle_page_teardown);
      watch_device_pixel_ratio_changes();

      resize_canvases();
      controls.zoom.value = camera_state.zoom;
      refresh_control_labels();
      // The default camera is the artifact's recorded-golden preset; the
      // selector marks it without re-rendering before readiness resolved.
      select_camera_preset_button('fixture-center');
      // Scene overlays wait for the renderer: the controls stay disabled
      // until readiness resolved (the ready handler then enables them or
      // disables them with the degradation reason).
      set_overlay_controls_enabled(false, 'Scene overlays wait for the renderer…');

      window.mapTestReady.then(async (compiled_version) => {
        compiled_version_value = compiled_version;
        status_element.textContent = `Map ready (version ${compiled_version})`;
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
          gpu_map_canvas = new window.mapTest.MapView(
            map_canvas,
            window.mapTest.maps,
            tile_resolution,
          );
          renderer_detail = `GPU adapter ${await gpu_map_canvas.initialize()}`;
          // Fixtures cover the recorded demo area only. The registry's live
          // raster descriptor fills every other address, so a visitor can pan
          // anywhere in the world without the map going blank; a registered
          // provider credential takes precedence inside the canvas. A local
          // page (the test harness) keeps its traffic same-origin unless it
          // asks for the fallback with `?liveTiles`.
          const live_tiles_enabled =
            !LOCAL_DEMO_HOSTNAMES.has(window.location.hostname)
            || new URLSearchParams(window.location.search)
              .has(LIVE_TILES_OPT_IN_PARAMETER);
          const live_raster_descriptor = providers_registry.providers.find(
            (provider_descriptor) =>
              typeof provider_descriptor.raster_url_template === 'string'
              && provider_descriptor.raster_url_template.trim() !== '');
          if (live_raster_descriptor !== undefined && live_tiles_enabled) {
            try {
              window.mapTest.registerUrlTemplateRasterTileSource({
                urlTemplate: live_raster_descriptor.raster_url_template,
                sourceName: live_raster_descriptor.display_name,
                minimumZoomLevel: 0,
                maximumZoomLevel: live_raster_descriptor.maximum_zoom_level
                  ?? LIVE_RASTER_FALLBACK_ZOOM_LEVEL,
                imageFormat: 'png',
                tileResolution: 'standard',
              });
            } catch (live_source_failure) {
              // A malformed registry template is a page bug, not a reason to
              // lose the map: report it in the diagnostics readout.
              show_error_report(
                'Live raster tile source',
                String(live_source_failure?.message ?? live_source_failure),
              );
            }
          }
          renderer_mode = 'gpu';
        } catch (gpu_failure) {
          // Documented degradation path: no browser WebGPU (or a surface
          // failure) falls back to the 2D canvas tile-grid overlay; the
          // detail is echoed verbatim, never swallowed.
          const failure_text = String(gpu_failure?.message ?? gpu_failure);
          gpu_map_canvas = null;
          renderer_mode = 'overlay';
          renderer_detail = `WebGPU unavailable: ${failure_text}`;
        }
        // Scene overlays draw on the GPU surface only: enable their controls
        // on the GPU path, leave them disabled with the degradation reason
        // on the 2D path (and on any GPU-surface failure).
        set_overlay_controls_enabled(
          renderer_mode === 'gpu',
          renderer_mode === 'gpu'
            ? ''
            : `Scene overlays draw on the WebGPU surface only; this session uses the 2D tile grid (${renderer_detail}).`,
        );
        // Overlays composed before the surface came up (a route planned while
        // the renderer was starting, a toggled scene) land now.
        apply_overlays();
        // The vector base rows were rendered before the renderer answered;
        // they become clickable now (or stay disabled on the 2D path).
        refresh_map_layers_panel();
        // The remembered choices land before the first interactive frame.
        // The demo plan restore loads a committed trace (never a provider);
        // the base-map switch waits until the renderer can serve it.
        await restore_remembered_demo_content();
        restore_remembered_base_map();
        // The device-location choice restores last of the map-state choices:
        // its first fix is what centers the camera, so a restored style or
        // plan framing cannot override it.
        restore_remembered_device_location();
        apply_overlays();
        // The first-run status is a plain human readiness state; the
        // renderer, adapter and version detail live in diagnostics (the
        // readout when enabled and the Advanced diagnostics block).
        status_line_element.setAttribute('data-readiness',
          renderer_mode === 'gpu' ? 'ready' : 'degraded');
        status_line_element.textContent = renderer_mode === 'gpu'
          ? ui_label_text('readiness.chip_ready')
          : `${ui_label_text('readiness.chip_degraded_prefix')}2D grid`;
        // The provider-capability rows need the wasm registration readback,
        // which exists only after readiness. A remembered per-capability
        // choice re-applies first, so the rows report it serving.
        restore_remembered_capability_providers();
        refresh_capability_provider_rows();
        // Diagnostics stay off unless the visitor already opened the Advanced
        // pane (`?advanced` is that explicit opt-in for the browser suite).
        // The facts pre fills without a subscription; the follow demo is a
        // GPU-only capability: on the 2D path its control stays disabled
        // with the reason (the §6.2 disabled-with-reason pattern).
        if (advanced_panel.open) {
          open_diagnostics_stream();
        }
        follow_demo_start_control.disabled = renderer_mode !== 'gpu';
        if (renderer_mode !== 'gpu') {
          follow_demo_live_line.textContent =
            'Simulated trips need the 3D map renderer; this browser is using ' +
            'the 2D fallback.';
        }
        diagnostics_facts_element.textContent = diagnostics_facts_text();
        refresh_control_labels();
        await run_render_step();
      }).catch((load_error) => {
        status_element.textContent = `Map failed to start: ${load_error}`;
        status_line_element.textContent =
          `${ui_label_text('readiness.chip_failed_prefix')}${load_error}`;
        status_line_element.setAttribute('data-readiness', 'failed');
        show_error_report('Rustic Maps SDK start failed', String(load_error));
      });

      // --- The reference-flow launch automation (docs/design/ReferenceApplicationBehavior.md
      // §Launch automation) ---
      // `window.runReferenceFlow(flowId)` drives the four named flows through the
      // same user paths a visitor takes; it is a test seam, not a second
      // implementation. When `platform/reference-flows.json` is served the
      // runner executes its steps and web hooks; before that artifact exists the
      // same four flows run from the fallback below.
      const REFERENCE_FLOW_FIELD_INPUT_IDS = Object.freeze({
        origin: 'trip-origin-input',
        destination: 'trip-destination-input',
      });
      const REFERENCE_FLOW_FIELD_SEARCH_IDS = Object.freeze({
        origin: 'trip-origin-search-control',
        destination: 'trip-destination-search-control',
      });
      const REFERENCE_FLOW_FIELD_CHIP_IDS = Object.freeze({
        origin: 'origin-my-location',
        destination: 'destination-my-location',
      });
      const REFERENCE_FLOW_TARGET_SELECTORS = Object.freeze({
        plan_route_action: '#trip-plan-route-control',
        route_start_action: '#follow-demo-start-control',
        swap_action: '#trip-swap-control',
        settings_control: '#settings-control',
        settings_close_control: '#settings-close-control',
        diagnostics_door: '#diagnostics-controls',
        debug_detail_switch: '#diagnostics-debug-toggle',
        diagnostics_debug_events: '#diagnostics-debug-toggle',
        diagnostics_clear: '#diagnostics-clear-control',
        diagnostics_close_control: '#diagnostics-close-control',
      });
      const REFERENCE_FLOW_WAIT_TIMEOUT_MILLISECONDS = 10_000;
      const REFERENCE_FLOW_STEP_INTERVAL_MILLISECONDS = 0;
      const REFERENCE_FLOW_FALLBACK_STEPS = Object.freeze({
        plan_and_navigate: Object.freeze([
          { step_id: 'search_origin', action: { kind: 'type_and_search', field: 'origin', value: 'Capitol Park' } },
          { step_id: 'assign_destination', action: { kind: 'assign_result', field: 'destination', value: 'Tower Bridge' } },
          { step_id: 'plan', action: { kind: 'tap', target: 'plan_route_action' } },
          { step_id: 'drive', action: { kind: 'tap', target: 'route_start_action' } },
        ]),
        my_location_field: Object.freeze([
          { step_id: 'fill_origin', action: { kind: 'fill_my_location', field: 'origin' } },
          { step_id: 'fill_destination', action: { kind: 'fill_my_location', field: 'destination' } },
        ]),
        routing_provider_switch: Object.freeze([
          { step_id: 'open_settings', action: { kind: 'open_settings' } },
          { step_id: 'select_routing_provider', action: { kind: 'select_provider', capability: 'routing', provider_role: 'keyless' } },
          { step_id: 'close_settings', action: { kind: 'close_settings' } },
          { step_id: 'search_origin', action: { kind: 'type_and_search', field: 'origin', value: 'Capitol Park' } },
          { step_id: 'assign_destination', action: { kind: 'assign_result', field: 'destination', value: 'Tower Bridge' } },
          { step_id: 'plan', action: { kind: 'tap', target: 'plan_route_action' } },
        ]),
        diagnostics_opt_in: Object.freeze([
          { step_id: 'open_diagnostics', action: { kind: 'open_diagnostics' } },
          { step_id: 'show_debug', action: { kind: 'toggle_debug_events' } },
          { step_id: 'refresh', action: { kind: 'refresh_diagnostics' } },
          { step_id: 'clear', action: { kind: 'clear_diagnostics' } },
        ]),
      });

      /** Waits for one flow predicate, rejecting with a named timeout. */
      function wait_for_reference_flow(predicate, description) {
        return new Promise((resolve, reject) => {
          const deadline_milliseconds = Date.now()
            + REFERENCE_FLOW_WAIT_TIMEOUT_MILLISECONDS;
          const poll = () => {
            if (predicate()) {
              resolve();
              return;
            }
            if (Date.now() >= deadline_milliseconds) {
              reject(new Error(`reference flow timed out waiting for ${description}`));
              return;
            }
            setTimeout(poll, 50);
          };
          poll();
        });
      }

      /** Fills one route field and runs its own Search action. */
      async function reference_flow_search_field(field_key, value) {
        const input_element = document.getElementById(
          REFERENCE_FLOW_FIELD_INPUT_IDS[field_key] ?? '');
        const search_element = document.getElementById(
          REFERENCE_FLOW_FIELD_SEARCH_IDS[field_key] ?? '');
        if (input_element === null || search_element === null) {
          throw new Error(`reference flow has no ${field_key} field`);
        }
        input_element.value = value;
        input_element.dispatchEvent(new Event('input', { bubbles: true }));
        search_element.click();
        await wait_for_reference_flow(
          () => !document.getElementById('trip-search-results').hidden,
          `${field_key} search results`,
        );
      }

      /** Chooses one provider option through the capability picker. */
      function reference_flow_select_provider(action) {
        const capability_key = action.capability ?? ROUTING_CAPABILITY_KEY;
        const select_element = document.getElementById(
          `capability-provider-select-${capability_key}`);
        if (select_element === null) {
          throw new Error(`reference flow has no ${capability_key} provider picker`);
        }
        const options = Array.from(select_element.options).filter(
          (option_element) => option_element.value !== '');
        const chosen_option = options.find((option_element) =>
          (typeof action.provider_key === 'string'
            && option_element.value === action.provider_key)
          || (typeof action.provider === 'string'
            && option_element.textContent.includes(action.provider))
          || (action.provider_role === 'keyless'
            && option_element.dataset.providerRole === 'keyless'))
          ?? options[0];
        if (chosen_option === undefined) {
          throw new Error(`reference flow found no selectable ${capability_key} provider`);
        }
        select_element.value = chosen_option.value;
        select_element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      /** Runs one flow step through the public page controls. */
      async function perform_reference_flow_action(action, step) {
        const web_hook_selector = step?.hooks?.web?.value;
        const action_kind = action?.kind ?? action?.type ?? 'tap';
        switch (action_kind) {
          case 'launch':
            return;
          case 'type':
          case 'type_and_search':
          case 'search': {
            const field_key = action.field ?? 'destination';
            await reference_flow_search_field(field_key, action.value ?? '');
            return;
          }
          case 'open_search': {
            const field_input = document.getElementById(
              REFERENCE_FLOW_FIELD_INPUT_IDS[action.field ?? 'destination'] ?? '');
            field_input?.focus();
            return;
          }
          case 'assign_result':
          case 'assign': {
            const field_key = action.field ?? 'destination';
            await reference_flow_search_field(field_key, action.value ?? '');
            const result_buttons = Array.from(
              document.querySelectorAll('#trip-search-results button'));
            const matching_button = result_buttons.find((result_button) =>
              result_button.textContent.includes(action.value ?? ''))
              ?? result_buttons[0];
            if (matching_button === undefined) {
              throw new Error(`reference flow found no ${field_key} result to assign`);
            }
            matching_button.click();
            return;
          }
          case 'fill_my_location':
          case 'my_location':
          case 'my_location_requested': {
            const field_key = action.field ?? 'origin';
            const chip_element = document.getElementById(
              REFERENCE_FLOW_FIELD_CHIP_IDS[field_key] ?? '');
            if (chip_element === null) {
              throw new Error(`reference flow has no ${field_key} my-location chip`);
            }
            chip_element.click();
            await wait_for_reference_flow(
              () => (document.getElementById(
                REFERENCE_FLOW_FIELD_INPUT_IDS[field_key])?.value ?? '') !== '',
              `${field_key} my-location fill`,
            );
            return;
          }
          case 'swap':
          case 'swap_requested': {
            document.getElementById('trip-swap-control')?.click();
            return;
          }
          case 'open_settings': {
            const settings_dialog_element = document.getElementById('settings-dialog');
            if (!settings_dialog_element.open) {
              document.getElementById('settings-control')?.click();
            }
            await wait_for_reference_flow(
              () => settings_dialog_element.open, 'settings dialog');
            return;
          }
          case 'close_settings': {
            const settings_dialog_element = document.getElementById('settings-dialog');
            if (settings_dialog_element.open) settings_dialog_element.close();
            return;
          }
          case 'select_provider':
          case 'provider_selected': {
            reference_flow_select_provider(action);
            return;
          }
          case 'open_diagnostics': {
            const advanced_panel_element = document.getElementById('advanced-panel');
            if (!advanced_panel_element.open) {
              advanced_panel_element.open = true;
              // The `toggle` event is the pane's opt-in door; dispatch it so the
              // runner reaches the same handler a visitor's tap does.
              advanced_panel_element.dispatchEvent(new Event('toggle'));
            }
            return;
          }
          case 'toggle_debug_events':
          case 'debug_detail_toggled': {
            const debug_control_element =
              document.getElementById('diagnostics-debug-toggle');
            debug_control_element.checked = true;
            debug_control_element.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
          case 'clear_diagnostics':
          case 'clear': {
            document.getElementById('diagnostics-clear-control')?.click();
            return;
          }
          case 'refresh_diagnostics': {
            document.getElementById('diagnostics-refresh-control')?.click();
            return;
          }
          case 'plan_route': {
            document.getElementById('trip-plan-route-control')?.click();
            await wait_for_reference_flow(
              () => !trip_route_result.hidden, 'the planned route card');
            return;
          }
          case 'wait_for_state': {
            if (action.target === 'diagnostics') {
              await wait_for_reference_flow(
                () => window.mapDiagnosticsState?.().subscribed === true,
                'the diagnostics stream');
              return;
            }
            // The plan-search state is the fields' own state; the step only
            // asserts no route was planned.
            await wait_for_reference_flow(
              () => trip_route_result.hidden, 'the unplanned plan-search state');
            return;
          }
          case 'verify': {
            // A verify step asserts a rendered row; the row is already in the
            // DOM, so the step waits one task for the renderer to settle.
            await new Promise((resolve) => { setTimeout(resolve, 0); });
            return;
          }
          case 'tap':
          default: {
            const target_selector =
              REFERENCE_FLOW_TARGET_SELECTORS[action?.target] ?? web_hook_selector;
            if (action?.target === 'diagnostics_door'
              || target_selector === '#diagnostics-controls') {
              // The pane's door is the Advanced disclosure; opening it is the
              // diagnostics opt-in.
              const advanced_panel_element = document.getElementById('advanced-panel');
              if (!advanced_panel_element.open) {
                advanced_panel_element.open = true;
                advanced_panel_element.dispatchEvent(new Event('toggle'));
              }
              return;
            }
            if (target_selector === '#diagnostics-debug-toggle') {
              // The debug switch is a state control, so a flow step enables
              // the detail whether or not it was already on.
              const debug_toggle_element =
                document.getElementById('diagnostics-debug-toggle');
              debug_toggle_element.checked = true;
              debug_toggle_element.dispatchEvent(
                new Event('change', { bubbles: true }));
              return;
            }
            const target_element = target_selector === undefined
              ? null
              : document.querySelector(target_selector);
            if (target_element === null) {
              if (action?.value !== undefined) {
                await reference_flow_search_field(
                  action.field ?? 'destination', action.value);
                return;
              }
              throw new Error(
                `reference flow cannot perform "${action_kind}" without a target`);
            }
            target_element.click();
            if (target_selector === '#trip-plan-route-control'
              || action?.target === 'plan_route_action') {
              await wait_for_reference_flow(
                () => !trip_route_result.hidden, 'the planned route card');
            } else if (target_selector === '#follow-demo-start-control'
              || action?.target === 'route_start_action') {
              await wait_for_reference_flow(
                () => window.mapFollowDemoState?.().phase === 'engaged',
                'the simulated trip');
            }
            return;
          }
        }
      }

      /** The served flow schema, or null when the artifact is not present. */
      async function read_reference_flow_schema() {
        // The published demo sits under /demo/ beside the site's shared
        // artifacts; the local harness serves the artifact at the web root.
        const schema_url = window.location.pathname.includes('/demo/')
          ? '../reference-flows.json'
          : 'reference-flows.json';
        try {
          const response = await fetch(schema_url, { cache: 'no-store' });
          return response.ok ? await response.json() : null;
        } catch {
          return null;
        }
      }

      /**
       * Runs one named reference flow through the same user-path controls a
       * visitor uses and returns a small execution report. A flow the schema
       * and the fallback both lack is refused by name.
       */
      async function run_reference_flow(flow_id) {
        if (window.mapTestReady !== undefined) {
          await window.mapTestReady;
        }
        const schema = await read_reference_flow_schema();
        const schema_flow = schema?.flows?.find(
          (flow_definition) => flow_definition.flow_id === flow_id) ?? null;
        const fallback_steps = REFERENCE_FLOW_FALLBACK_STEPS[flow_id];
        if (schema_flow === null && fallback_steps === undefined) {
          throw new Error(`unknown reference flow: ${flow_id}`);
        }
        const steps = schema_flow?.steps ?? fallback_steps;
        for (const step of steps) {
          await perform_reference_flow_action(step.action ?? step, step);
          if (REFERENCE_FLOW_STEP_INTERVAL_MILLISECONDS > 0) {
            await new Promise((resolve) => {
              setTimeout(resolve, REFERENCE_FLOW_STEP_INTERVAL_MILLISECONDS);
            });
          }
        }
        return {
          flowId: flow_id,
          source: schema_flow === null ? 'fallback' : 'schema',
          stepCount: steps.length,
        };
      }
      window.runReferenceFlow = run_reference_flow;
      window.referenceFlowIds = () => Object.keys(REFERENCE_FLOW_FALLBACK_STEPS);
