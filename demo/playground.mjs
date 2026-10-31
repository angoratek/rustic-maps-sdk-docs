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
      } from './overlay_scenes.mjs';
      import { fetchAndBuildVectorOverlays } from './vector_layer.mjs';
      import {
        TILE_LAYER_MODES,
        DEFAULT_TILE_SIZE_PIXELS,
        applyTileLayerMode,
        loadVectorBaseOverlays,
        vectorStyleIdForDescriptor,
      } from './tile_switch.mjs';

      // The round-11 control-cluster / follow-camera glue: the §2.4 token
      // rows and the pure helpers live in the shared platform-glue module
      // (the Playwright specs import the same values, so page and tests
      // cannot drift).
      import {
        MAP_CONTROL_ZOOM_STEP,
        MAP_CONTROL_ZOOM_REPEAT_INTERVAL_MILLISECONDS,
        COMPASS_VISIBILITY_BEARING_THRESHOLD_DEGREES,
        EASED_CAMERA_MOVE_DURATION_MILLISECONDS,
        NAVIGATION_FOLLOW_PITCH_3D_DEGREES,
        COURSE_SMOOTHING_WINDOW_FIXES,
        FOLLOW_BEARING_CHASE_TIME_CONSTANT_MILLISECONDS,
        FOLLOW_BEARING_SNAP_DISTANCE_DEGREES,
        FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR,
        FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS,
        FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
        FOLLOW_DEMO_SPEED_METERS_PER_SECOND,
        CourseMedianSmoother,
        ExponentialValueChase,
        SmoothstepTimedEase,
        bearing_off_north_degrees,
        follow_zoom_toward_trip_end,
        polyline_fix_at_travelled_meters,
        polyline_length_meters,
        scale_bar_distance_label_text,
        select_scale_bar_scale,
        signed_angular_difference_degrees,
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
      const TILE_COUNT_AT_ZOOM_ZERO = 1;
      const DEGREES_AT_ZOOM_ZERO = 360;
      // Canvas 2D ignores CSS var() style strings (docs/browser-loop.md), so
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
      const CENTER_MARK_BY_THEME = { dark: '#f26d6d', light: '#dc2626' };
      const BACKGROUND_GRID_BY_THEME = {
        dark: 'rgba(255, 255, 255, 0.06)',
        light: 'rgba(0, 0, 0, 0.05)',
      };
      const TILE_FILL_BY_THEME_FALLBACK = TILE_FILL_BY_THEME.light;
      const TILE_STROKE_BY_THEME_FALLBACK = TILE_STROKE_BY_THEME.light;
      const CENTER_MARK_FALLBACK = CENTER_MARK_BY_THEME.light;
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
      // Diagnostics readout (§4.1): the gate drops to Debug here because the
      // wasm closure's own events (map-rendering's tile-fetch tracing) are
      // debug-severity; the native readouts subscribe at Info. The readout
      // keeps a smaller display window than the ring (the §4.1 readout
      // keeps its most recent lines only).
      const DIAGNOSTICS_READOUT_MINIMUM_SEVERITY_NAME = 'Debug';
      const DIAGNOSTICS_READOUT_EVENT_LIMIT = 20;
      // The follow demo's fix cadence, derived from the artifact's
      // documented sample interval and the playback factor (5 s / 20 =
      // 250 ms — mirroring the Android demo's dispatch interval).
      const FOLLOW_DEMO_FIX_INTERVAL_MILLISECONDS =
        1000 * (FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS / FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR);

      const map_canvas = document.getElementById('map-canvas');
      const overlay_canvas = document.getElementById('map-overlay');
      // The control sheet's own element: the route framing's insets keep the
      // planned route clear of it (docs/ReferenceAppUX.md §4.2).
      const controls_sheet_element = document.getElementById('controls');
      // The trip planner's planned-route overlays (the polyline and the A/B
      // pins): plain `setOverlays` descriptors composed beside the scene
      // toggles over any base layer.
      let trip_route_overlays = [];
      const status_element = document.getElementById('harness-status');
      const status_line_element = document.getElementById('status-line');
      const readout_element = document.getElementById('readout');
      const renderer_readout_control = document.getElementById('renderer-readout-control');
      const trip_credential_action = document.getElementById('trip-credential-action');
      const remember_provider_credential =
        document.getElementById('remember-provider-credential');
      const settings_control = document.getElementById('settings-control');
      const bottom_start_dock_element = document.getElementById('bottom-start-dock');
      const error_report_element = document.getElementById('error-report');
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
      const plane_toggle_control = document.getElementById('plane-toggle-control');
      const scale_bar_element = document.getElementById('scale-bar-overlay');
      const scale_bar_label_element = document.getElementById('scale-bar-label-text');
      const scale_bar_line_element = document.getElementById('scale-bar-line');
      const follow_demo_start_control = document.getElementById('follow-demo-start-control');
      const follow_demo_live_line = document.getElementById('follow-demo-live-line');
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
      const trip_plan_route_control = document.getElementById('trip-plan-route-control');
      const trip_plan_route_reason = document.getElementById('trip-plan-route-reason');
      const trip_route_result = document.getElementById('trip-route-result');
      const provider_tile_control = document.getElementById('provider-tile-control');
      const provider_tile_result = document.getElementById('provider-tile-result');
      const provider_tile_preview = document.getElementById('provider-tile-canvas');
      // The live-tile probe's address: the Sacramento tile at the playground's
      // zoom-14 camera, served by the same fixture route.
      const PROVIDER_TILE_DEMO_ZOOM_LEVEL = 14;
      const PROVIDER_TILE_DEMO_TILE_X = 2661;
      const PROVIDER_TILE_DEMO_TILE_Y = 6286;
      // The credential rows by provider key; declared here so the persistence
      // toggle's listener (below) can clear remembered keys.
      const provider_credential_controls_by_key = new Map();
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
        trip_route_result.textContent = '';
        trip_route_result.hidden = true;
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
        const base_url = use_provider_fixtures
          ? `${window.location.origin}${providers_registry.fixture_base_path}`
            + `/${provider_control.provider_descriptor.provider_key}`
          : undefined;
        // `wasm_registration` is the registry's wasm dispatch key; the
        // provider key stays the fixture-route address.
        await window.mapTest.registerProvider(
          provider_control.provider_descriptor.wasm_registration
            ?? provider_control.provider_descriptor.provider_key,
          credential_value,
          base_url,
        );
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
            window.mapTest.clearProvider();
            applied_provider_keys.clear();
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
          trip_plan_route_reason.textContent = missing_field_keys.length === 0
            ? ''
            : `Enter ${missing_field_keys.map(trip_field_label).join(' and ')} to plan the route.`;
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
          if (applied_provider_keys.size === 0) {
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
                `No demo place matches the ${field_label.toLowerCase()}; ` +
                'apply a provider key in Settings for live search.',
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

        for (const field_key of TRIP_FIELD_KEYS) {
          const field = trip_fields[field_key];
          // Typing invalidates the earlier selection: the field's text is
          // the truth, and Plan route re-resolves from it.
          field.input.addEventListener('input', () => {
            field.selected_place = null;
            active_trip_field_key = field_key;
            refresh_trip_plan_route_state();
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
        render_trip_suggestions();
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

        /** Flattens a route's step shapes into one traversal-order polyline. */
        function route_polyline_coordinates(route) {
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
          const provided_box = route.bounding_box;
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

        /** Draws the planned route: the step-shape polyline plus the A/B
         * pins, framed with margin, and reports the summary honestly. */
        function show_trip_route(route, origin_endpoint, destination_endpoint, is_recorded) {
          const polyline = route_polyline_coordinates(route);
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
          frame_trip_route(route_bounding_box(route, polyline));
          schedule_render();
          // Recorded routes come from the artifact's snake-case JSON while a
          // live route carries the wasm seam's camel-case fields; the summary
          // reads either without rekeying the data.
          const distance_meters = route.distanceMeters ?? route.distance_meters;
          const duration_seconds = route.durationSeconds ?? route.duration_seconds;
          const first_step = route.legs[0]?.steps[0];
          const first_maneuver_text =
            first_step?.instructionDisplayText ?? first_step?.instruction_display_text;
          trip_route_result.hidden = false;
          trip_route_result.textContent =
            `${origin_endpoint.name} \u2192 ${destination_endpoint.name}: ` +
            `${format_distance_text(distance_meters)} · ` +
            `${format_duration_text(duration_seconds)} · ` +
            (first_maneuver_text ?? 'no maneuvers') +
            (is_recorded ? ' \u2014 recorded demo route, pedestrian, fastest.' : '');
          set_provider_status(
            is_recorded
              ? 'Recorded demo route ready \u2014 start the simulated trip.'
              : 'Live route planned.',
            'success');
        }

        trip_plan_route_control.addEventListener('click', async () => {
          if (trip_plan_route_control.disabled) return;
          trip_route_result.hidden = true;
          set_provider_status(ui_label_text('plan.planning_in_flight'));
          try {
            const origin_endpoint = await resolve_trip_endpoint('origin');
            const destination_endpoint = await resolve_trip_endpoint('destination');
            if (applied_provider_keys.size === 0) {
              const recorded_route =
                recorded_demo_route(origin_endpoint.name, destination_endpoint.name);
              if (recorded_route === null) {
                throw new Error(
                  `no recorded route from ${origin_endpoint.name} to ` +
                  `${destination_endpoint.name}; apply a provider key for live routing`);
              }
              show_trip_route(
                recorded_route.route, origin_endpoint, destination_endpoint, true);
              return;
            }
            const live_route = await window.mapTest.calculateRoute(
              origin_endpoint.latitude,
              origin_endpoint.longitude,
              destination_endpoint.latitude,
              destination_endpoint.longitude,
            );
            show_trip_route(live_route, origin_endpoint, destination_endpoint, false);
          } catch (error) {
            trip_route_result.textContent = '';
            trip_route_result.hidden = true;
            set_provider_status(`Refused: ${String(error)}`, 'warning');
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
      });

      // Provider-echoing error report (docs/ReferenceAppUX.md §6.3): the
      // origin label names the failing surface, the detail is echoed
      // verbatim, never paraphrased or swallowed.
      function show_error_report(origin_label, detail_text) {
        error_report_element.hidden = false;
        error_report_element.textContent = `${origin_label}: ${detail_text}`;
      }
      function clear_error_report() {
        error_report_element.hidden = true;
        error_report_element.textContent = '';
      }

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
      let theme_choice = read_local_storage(THEME_CHOICE_STORAGE_KEY);
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
      function apply_theme_choice(next_choice) {
        theme_choice = next_choice;
        write_local_storage(THEME_CHOICE_STORAGE_KEY, next_choice);
        document.documentElement.dataset.themeChoice = next_choice;
        document.documentElement.dataset.theme = resolved_theme_name();
        theme_toggle_control.textContent =
          `Switch to ${THEME_NAMES_CYCLING[next_choice]} theme`;
      }
      apply_theme_choice(theme_choice);
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

      // The docs back-link: shown only when the harness is served from the
      // documentation site's `/demo/` path, so the local dev server's root
      // page never grows a dead "up" link. It closes the demo → docs loop in
      // one click.
      const docs_back_link = document.getElementById('docs-back-link');
      if (window.location.pathname.includes('/demo/')) {
        docs_back_link.hidden = false;
      }
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
      for (const preset_button of camera_preset_controls.children) {
        preset_button.addEventListener('click', () => {
          const preset = REFERENCE_SCENE_ARTIFACT.camera_presets.find(
            (candidate) => candidate.id === preset_button.dataset.cameraPresetId,
          );
          camera_state_by_preset(preset);
        });
      }

      // Scene-overlay controls: one toggle per Sacramento demo overlay kind
      // (a shared-artifact scene, labeled from the artifact too), plus a
      // clear button. They draw on the GPU surface only, so the fieldset
      // stays disabled with a reason while the renderer is unavailable and
      // whenever the session is in the degraded 2D path
      // (docs/ReferenceAppUX.md §6.2).
      const overlay_fieldset = document.getElementById('scene-overlay-controls');
      const overlay_reason_element = document.getElementById('scene-overlay-reason');
      const overlay_scene_toggles = document.getElementById('overlay-scene-toggles');
      const overlay_checkboxes = Object.fromEntries(
        Object.entries(REFERENCE_SCENE_ARTIFACT.overlay_scenes).map(
          ([scene_key]) => {
            const scene_toggle_row = document.createElement('label');
            scene_toggle_row.className = 'toggle-row';
            const scene_checkbox = document.createElement('input');
            scene_checkbox.type = 'checkbox';
            scene_checkbox.id = `${scene_key}-overlay-control`;
            scene_toggle_row.appendChild(scene_checkbox);
            scene_toggle_row.appendChild(
              document.createTextNode(SACRAMENTO_OVERLAY_SCENE_LABELS[scene_key]),
            );
            overlay_scene_toggles.appendChild(scene_toggle_row);
            return [scene_key, scene_checkbox];
          },
        ),
      );
      const clear_overlays_control = document.getElementById('clear-overlays-control');

      function set_overlay_controls_enabled(enabled, reason_text) {
        overlay_fieldset.disabled = !enabled;
        overlay_reason_element.hidden = enabled;
        overlay_reason_element.textContent = enabled ? '' : reason_text;
      }

      // Replaces the wasm canvas' overlay list with the toggled Sacramento
      // scenes (an all-unchecked list clears it). A wasm-side rejection is
      // a string exception; it surfaces on the error report and the status
      // line, and the previously accepted list stays in force.
      //
      // The content list composes over a vector base: the base's own geometry
      // is a base layer delivered through the same overlay seam, so the two
      // must share one drawn list (base first) instead of replacing each
      // other — otherwise choosing a vector base would silently erase the
      // scene toggles (round 36 field report).
      let vector_base_overlays = [];

      /** The page's own overlays: the toggled demo scenes, in scene order. */
      function content_overlay_list() {
        return [
          ...sacramento_scene_overlays(
            Object.entries(overlay_checkboxes)
              .filter(([, checkbox]) => checkbox.checked)
              .map(([scene_key]) => scene_key),
          ),
          // The planned route and its A/B pins draw over any base layer and
          // beside every toggled scene.
          ...trip_route_overlays,
        ];
      }

      /** Pushes the composed list for the active base layer. */
      function apply_overlays() {
        if (renderer_mode !== 'gpu' || !gpu_map_canvas) return;
        const overlay_list = current_tile_mode === TILE_LAYER_MODES.vector
          ? [...vector_base_overlays, ...content_overlay_list()]
          : content_overlay_list();
        try {
          gpu_map_canvas.setOverlays(overlay_list);
        } catch (overlay_failure) {
          const overlay_failure_message = String(overlay_failure?.message ?? overlay_failure);
          status_line_element.textContent = `Overlay rejected: ${overlay_failure_message}`;
          show_error_report('Overlay rejected', overlay_failure_message);
        }
      }

      for (const checkbox of Object.values(overlay_checkboxes)) {
        checkbox.addEventListener('change', () => {
          apply_overlays();
          schedule_render();
        });
      }
      clear_overlays_control.addEventListener('click', () => {
        clear_error_report();
        for (const checkbox of Object.values(overlay_checkboxes)) {
          checkbox.checked = false;
        }
        apply_overlays();
        schedule_render();
      });

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
      const VECTOR_BASE_TILE_SIZE_PIXELS = DEFAULT_TILE_SIZE_PIXELS;
      const VECTOR_BASE_TILE_RADIUS = 1;
      // The Latin glyph range the demo's label pass draws with. The committed
      // fixture is served same-origin by the dev server (the recorded raster
      // tiles' pattern); the payload itself names the font stack it carries,
      // so the renderer uses whichever families the range declares.
      const VECTOR_LABEL_FONT_STACK = 'Noto Sans Regular';
      const VECTOR_LABEL_GLYPH_RANGE = '0-255';
      const VECTOR_LABEL_GLYPH_RANGE_URL =
        `/glyphs/${encodeURIComponent(VECTOR_LABEL_FONT_STACK)}/${VECTOR_LABEL_GLYPH_RANGE}.pbf`;
      let label_glyph_status = null;
      const VECTOR_BASE_RELOAD_DEBOUNCE_MILLISECONDS = 180;
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
      let current_vector_provider_key =
        VECTOR_BASE_MAP_DESCRIPTORS[0]?.provider_key ?? null;
      let vector_base_reload_timer = null;
      // The camera pose the latest vector-base request covers. Recording the
      // request (rather than only the completed load) keeps the render loop
      // from scheduling a second, superseding load on every frame while the
      // first one fetches; a real camera move still differs and refreshes.
      let vector_base_requested_center = null;
      let vector_base_requested_zoom = null;
      const base_map_toggle_element = document.getElementById('base-map-toggle');
      const base_map_status_element = document.getElementById('base-map-status');
      const vector_style_row_element = document.getElementById('vector-style-row');
      const base_map_labels_note_element =
        document.getElementById('base-map-labels-note');
      const vector_style_select_element = document.getElementById('vector-style-select');
      // The style the visitor picked from the active vector descriptor's
      // offered styles, or null for "the one matching the resolved theme".
      let current_vector_style_id = null;

      /** The active descriptor's offered named styles (registry data only). */
      function offered_vector_styles() {
        const vector_descriptor = selected_vector_descriptor();
        return Array.isArray(vector_descriptor?.vector_styles)
          ? vector_descriptor.vector_styles
          : [];
      }

      /** The style the base paints now: the picked one, else the theme join. */
      function active_vector_style_id() {
        const vector_descriptor = selected_vector_descriptor();
        if (vector_descriptor === null) return null;
        return vectorStyleIdForDescriptor(
          vector_descriptor, resolved_theme_name(), current_vector_style_id);
      }

      /** Lists the active descriptor's styles and shows the picker only while
       * a vector base is active. */
      function render_vector_style_picker() {
        const offered_styles = offered_vector_styles();
        vector_style_row_element.hidden =
          current_tile_mode !== TILE_LAYER_MODES.vector || offered_styles.length === 0;
        // The vector pipeline has no text stage yet; the note shares the
        // picker's visibility so it only claims what the active base does.
        base_map_labels_note_element.hidden = vector_style_row_element.hidden;
        vector_style_select_element.textContent = '';
        for (const style_choice of offered_styles) {
          const style_option = document.createElement('option');
          style_option.value = style_choice.style_id;
          style_option.textContent = style_choice.display_name;
          vector_style_select_element.appendChild(style_option);
        }
        const active_style_id = active_vector_style_id();
        if (active_style_id !== null) {
          vector_style_select_element.value = active_style_id;
        }
      }
      vector_style_select_element.addEventListener('change', () => {
        current_vector_style_id = vector_style_select_element.value;
        apply_vector_base_clear_color();
        refresh_vector_base();
        schedule_render();
      });

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

      /** One base-layer row per provider-declared raster and vector source. */
      function render_base_map_toggle() {
        base_map_toggle_element.textContent = '';
        const base_layer_rows = [
          ...RASTER_BASE_MAP_DESCRIPTORS.map((provider_descriptor) => ({
            mode: TILE_LAYER_MODES.raster,
            provider_key: null,
            title: 'Raster',
            provider_descriptor,
          })),
          ...VECTOR_BASE_MAP_DESCRIPTORS.map((provider_descriptor) => ({
            mode: TILE_LAYER_MODES.vector,
            provider_key: provider_descriptor.provider_key,
            title: 'Vector',
            provider_descriptor,
          })),
        ];
        for (const base_layer_row of base_layer_rows) {
          const toggle_button = document.createElement('button');
          toggle_button.type = 'button';
          toggle_button.dataset.tileMode = base_layer_row.mode;
          if (base_layer_row.provider_key !== null) {
            toggle_button.dataset.providerKey = base_layer_row.provider_key;
          }
          toggle_button.textContent =
            `${base_layer_row.title} · ${base_layer_row.provider_descriptor.display_name}`;
          toggle_button.addEventListener('click', () => switch_tile_mode(
            base_layer_row.mode, base_layer_row.provider_key));
          base_map_toggle_element.appendChild(toggle_button);
        }
        refresh_base_map_toggle_pressed_state();
      }

      /**
       * Enables the vector rows only once the GPU renderer has answered: before
       * that the click would be a silent no-op, so the row is honestly
       * disabled instead (the raster row always works).
       */
      function refresh_base_map_toggle_enabled_state() {
        for (const toggle_button of base_map_toggle_element
          .querySelectorAll('[data-tile-mode]')) {
          const button_needs_gpu =
            toggle_button.dataset.tileMode === TILE_LAYER_MODES.vector;
          toggle_button.disabled = button_needs_gpu && renderer_mode !== 'gpu';
        }
      }

      /** Marks the button whose layer is active. */
      function refresh_base_map_toggle_pressed_state() {
        for (const toggle_button of base_map_toggle_element
          .querySelectorAll('[data-tile-mode]')) {
          const button_is_active = toggle_button.dataset.tileMode === current_tile_mode
            && (current_tile_mode === TILE_LAYER_MODES.raster
              || toggle_button.dataset.providerKey === current_vector_provider_key);
          toggle_button.setAttribute('aria-pressed', String(button_is_active));
        }
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

      /** Re-lists and decodes the vector base for the current camera. */
      async function refresh_vector_base() {
        if (current_tile_mode !== TILE_LAYER_MODES.vector
          || renderer_mode !== 'gpu' || !gpu_map_canvas) {
          return;
        }
        const vector_descriptor = selected_vector_descriptor();
        if (vector_descriptor === null) return;
        const camera_snapshot = {
          latitude: camera_state.latitude,
          longitude: camera_state.longitude,
          zoom: camera_state.zoom,
        };
        vector_base_requested_center = camera_snapshot;
        vector_base_requested_zoom = camera_snapshot.zoom;
        set_base_map_status(`Loading the ${vector_descriptor.display_name} vector base…`);
        let vector_result = null;
        try {
          vector_result = await loadVectorBaseOverlays({
            canvas: gpu_map_canvas,
            descriptors: [vector_descriptor],
            cameraState: camera_snapshot,
            tileSizePixels: VECTOR_BASE_TILE_SIZE_PIXELS,
            tileRadius: VECTOR_BASE_TILE_RADIUS,
            // The registry offers its named styles; the picker (or the
            // resolved theme when the visitor has not picked one) selects the
            // palette the base paints (Bright, Fiord, Positron, …).
            styleTheme: resolved_theme_name(),
            selectedStyleId: active_vector_style_id(),
            // The page's own overlays (scene toggles, later the planned route)
            // paint over the base in the same drawn list.
            contentOverlays: content_overlay_list(),
            fetchAndBuildVectorOverlays,
          });
        } catch (vector_failure) {
          set_base_map_status(`The vector base failed: ${String(vector_failure)}`);
          return;
        }
        if (current_tile_mode !== TILE_LAYER_MODES.vector) return;
        // A newer camera pose replaced this load: its result paints nothing,
        // so publishing it would flash an empty base-map status.
        if (vector_result.superseded) return;
        // Remember the base's own geometry so a later scene toggle recomposes
        // without re-fetching, and recompose once for toggles that landed
        // while this load was in flight.
        vector_base_overlays = vector_result.overlays;
        apply_overlays();
        const label_status_suffix =
          `${vector_result.labelCount} labels` +
          (label_glyph_status === null
            ? ' (glyphs unavailable, so none draw)'
            : '');
        if (vector_result.failures.length === 0) {
          set_base_map_status(
            `Vector base · ${vector_descriptor.display_name} · ` +
            `${active_vector_style_id()}: ` +
            `${vector_result.overlayCount} styled features and ` +
            `${label_status_suffix} over ` +
            `${(2 * VECTOR_BASE_TILE_RADIUS + 1) ** 2} tiles.`);
        } else {
          const first_failure = vector_result.failures[0];
          set_base_map_status(
            `Vector base · ${vector_descriptor.display_name}: ` +
            `${vector_result.overlayCount} styled features, ` +
            `${label_status_suffix}; ` +
            `${vector_result.failures.length} tiles failed — ` +
            `${first_failure?.error ?? 'unknown failure'}`);
        }
        schedule_render();
      }

      /** Debounces a vector-base reload while the camera moves. */
      function schedule_vector_base_refresh() {
        if (current_tile_mode !== TILE_LAYER_MODES.vector) return;
        if (vector_base_reload_timer !== null) {
          clearTimeout(vector_base_reload_timer);
        }
        vector_base_reload_timer = setTimeout(() => {
          vector_base_reload_timer = null;
          refresh_vector_base();
        }, VECTOR_BASE_RELOAD_DEBOUNCE_MILLISECONDS);
      }

      /**
       * Selects one base layer: the raster layer, or one provider-declared
       * vector base. The provider key picks the vector descriptor; a raster
       * selection ignores it.
       */
      function switch_tile_mode(next_mode, next_provider_key = null) {
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
        refresh_base_map_toggle_pressed_state();
        // A provider or mode switch is a fresh layer, even at the same pose.
        vector_base_requested_center = null;
        vector_base_requested_zoom = null;
        if (next_mode === TILE_LAYER_MODES.raster) {
          applyTileLayerMode({ canvas: gpu_map_canvas, mode: TILE_LAYER_MODES.raster });
          gpu_map_canvas.setBackgroundColor(
            VECTOR_BASE_RASTER_CLEAR_COLOR.red,
            VECTOR_BASE_RASTER_CLEAR_COLOR.green,
            VECTOR_BASE_RASTER_CLEAR_COLOR.blue,
            VECTOR_BASE_RASTER_CLEAR_COLOR.alpha,
          );
          vector_base_overlays = [];
          // The raster base paints its own imagery: the vector base's labels
          // leave with it.
          if (renderer_mode === 'gpu' && gpu_map_canvas) {
            gpu_map_canvas.clearLabels();
          }
          set_overlay_controls_enabled(
            renderer_mode === 'gpu',
            'Scene overlays need the GPU renderer; this browser fell back to the 2D grid.',
          );
          apply_overlays();
          set_base_map_status(null);
          render_vector_style_picker();
        } else {
          applyTileLayerMode({ canvas: gpu_map_canvas, mode: TILE_LAYER_MODES.vector });
          apply_vector_base_clear_color();
          // The scene toggles and a planned route compose over the vector
          // base in one drawn list, so they stay available while it draws.
          vector_base_overlays = [];
          set_overlay_controls_enabled(
            renderer_mode === 'gpu',
            'Scene overlays need the GPU renderer; this browser fell back to the 2D grid.',
          );
          render_vector_style_picker();
          apply_overlays();
          refresh_vector_base();
        }
        schedule_render();
      }

      /** Repaints the vector base in the theme that just became active. */
      function refresh_vector_base_for_theme() {
        if (current_tile_mode !== TILE_LAYER_MODES.vector
          || renderer_mode !== 'gpu' || !gpu_map_canvas) {
          return;
        }
        // The theme may have changed which offered style is the default.
        render_vector_style_picker();
        apply_vector_base_clear_color();
        vector_base_requested_center = null;
        refresh_vector_base();
      }

      window.mapTileMode = () => current_tile_mode;
      window.mapVectorProviderKey = () => current_vector_provider_key;
      window.mapVectorBaseStatus = () =>
        base_map_status_element.hidden ? null : base_map_status_element.textContent;
      render_base_map_toggle();
      render_vector_style_picker();

      // Simulated navigation panel (docs/ReferenceAppUX.md §7.3): until the
      // contract wave ships Navigator on the wasm seam, this
      // is a plainly labeled spec-driven layout preview — the demo
      // artifact's fixed sample values, with the pending-seam reason and
      // the preview notice both visible. No live data is faked here.
      const navigation_demo_reason = document.getElementById('navigation-demo-reason');
      const navigation_demo_preview_notice =
        document.getElementById('navigation-demo-preview-notice');
      const navigation_demo = REFERENCE_SCENE_ARTIFACT.navigation_demo;

      document.getElementById('banner-distance-phrase-text').textContent =
        navigation_demo.layout_preview.active_maneuver.distance_phrase_text;
      document.getElementById('banner-instruction-text').textContent =
        navigation_demo.layout_preview.active_maneuver.display_text;
      document.getElementById('upcoming-instruction-text').textContent =
        `Then: ${navigation_demo.layout_preview.upcoming_maneuver.display_text}`;
      // The preview's phase word is chrome, not content: the scene artifact
      // carries the sample phase in its own spelling, and the page renders the
      // shared consumer label for it. An unknown spelling stays verbatim
      // rather than being guessed at.
      const NAVIGATION_PHASE_LABEL_BY_RAW_PHASE = Object.freeze({
        Navigating: ui_label_text('navigation.phase_navigating'),
        OffRoute: ui_label_text('navigation.phase_off_route'),
        Arrived: ui_label_text('navigation.phase_arrived'),
      });
      function navigation_phase_label_text(raw_phase) {
        return NAVIGATION_PHASE_LABEL_BY_RAW_PHASE[raw_phase] ?? raw_phase;
      }
      document.getElementById('navigation-phase-value').textContent =
        navigation_phase_label_text(navigation_demo.layout_preview.phase);
      const preview_progress = navigation_demo.layout_preview.progress;
      document.getElementById('progress-distance-to-maneuver-value').textContent =
        format_distance_text(preview_progress.distance_to_next_maneuver_meters);
      document.getElementById('progress-distance-remaining-value').textContent =
        format_distance_text(preview_progress.distance_remaining_meters);
      document.getElementById('progress-duration-remaining-value').textContent =
        format_duration_text(preview_progress.duration_remaining_seconds);
      const deviation_alert_element = document.getElementById('deviation-alert-preview');
      deviation_alert_element.hidden = false;
      deviation_alert_element.textContent =
        navigation_demo.layout_preview.deviation_alert_preview.text;
      navigation_demo_reason.textContent =
        `${navigation_demo.wasm_seam_status.reason}`;
      navigation_demo_preview_notice.textContent =
        layout_preview_notice();

      // Formats one progress distance for the demo card (metric on web).
      function format_distance_text(distance_meters) {
        return distance_meters < METERS_PER_KILOMETER
          ? `${Math.round(distance_meters)} m`
          : `${(distance_meters / METERS_PER_KILOMETER).toFixed(1)} km`;
      }

      // Formats one progress duration in whole minutes.
      function format_duration_text(duration_seconds) {
        const duration_minutes = Math.round(duration_seconds / SECONDS_PER_MINUTE);
        return `${duration_minutes} min`;
      }

      function layout_preview_notice() {
        return `${navigation_demo.layout_preview.notice} — layout preview, sample values, not live guidance`;
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
      refresh_base_map_toggle_enabled_state();
      window.mapRendererMode = () => renderer_mode;
      window.mapLastFrameStats = () => last_frame_statistics;
      // The decoded glyph range the label layer draws with (font stack name,
      // glyph count and atlas page size), read by the label suite; null until
      // the range loaded or when it failed.
      window.mapLabelGlyphStatus = () => label_glyph_status;
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
          // The wasm frame's own stage spans (M23): the frame-budget harness
          // attributes a slow frame to geometry, encoding or submission from
          // these instead of inferring it from the total.
          stageMilliseconds: frame_statistics?.stageMilliseconds ?? null,
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
      };
      const follow_demo = {
        phase: FOLLOW_DEMO_PHASE_DISENGAGED,
        pre_trip_camera: null,
        route_polyline: null,
        travelled_meters: 0,
        total_meters: 0,
        fix_interval_id: null,
        target_bearing_degrees: null,
        // The latest guided fix: the my-location control re-centers on it
        // when a gesture-broken follow is re-engaged (§5.3).
        latest_fix: null,
      };
      // The eased moves and the chase of the platform-pump-owned camera:
      // §5.3 eases bearing and pitch in the platform's frame pump; only
      // the center applies exactly.
      const pitch_swing_ease = new SmoothstepTimedEase();
      const compass_renorth_ease = new SmoothstepTimedEase();
      const follow_bearing_chase = new ExponentialValueChase(
        FOLLOW_BEARING_CHASE_TIME_CONSTANT_MILLISECONDS);
      const course_median_smoother = new CourseMedianSmoother(COURSE_SMOOTHING_WINDOW_FIXES);

      window.mapLocationIndicatorState = () =>
        current_location_indicator ? { ...current_location_indicator } : null;
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
        phase: follow_demo.phase,
        isFollowing: follow_demo.phase === FOLLOW_DEMO_PHASE_ENGAGED,
        travelledMeters: follow_demo.travelled_meters,
        totalMeters: follow_demo.total_meters,
        targetBearingDegrees: follow_demo.target_bearing_degrees,
        cameraZoom: camera_state.zoom,
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

      function paint_center_mark() {
        if (renderer_mode !== 'gpu') return;
        const context = overlay_canvas.getContext('2d');
        context.fillStyle = CENTER_MARK_BY_THEME[current_theme_name()] ?? CENTER_MARK_FALLBACK;
        context.beginPath();
        context.arc(overlay_canvas.width / 2, overlay_canvas.height / 2, 6, 0, 2 * Math.PI);
        context.fill();
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

      async function run_render_step() {
        render_busy = true;
        try {
          if (renderer_mode === 'gpu' && gpu_map_canvas) {
            // The GPU binding consumes its camera by value, so the frame
            // builds its own camera from the current state.
            const frame_start_milliseconds = performance.now();
            last_frame_statistics = await gpu_map_canvas.renderFrame(
              build_camera(), FIELD_OF_VIEW_DEGREES);
            record_frame_performance(
              last_frame_statistics,
              performance.now() - frame_start_milliseconds,
            );
            frame_draw_count += 1;
            pump_toward_settled_frame(last_frame_statistics);
          }
          const camera = build_camera();
          refresh_scale_bar(camera);
          paint_overlay(camera);
          paint_center_mark();
          refresh_compass_control();
          update_readout(camera);
          refresh_performance_readout();
          diagnostics_facts_element.textContent = diagnostics_facts_text();
          if (current_tile_mode === TILE_LAYER_MODES.vector) {
            const center_or_zoom_changed = vector_base_requested_center === null
              || vector_base_requested_center.latitude !== camera_state.latitude
              || vector_base_requested_center.longitude !== camera_state.longitude
              || vector_base_requested_zoom !== camera_state.zoom;
            if (center_or_zoom_changed) schedule_vector_base_refresh();
          }
        } finally {
          render_busy = false;
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
        if (!frame_statistics || frame_statistics.missingTiles === 0) {
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
        const ground_answer = resolved_or_null(() =>
          camera.groundMetersPerScreenPixel(
            overlay_canvas.width, overlay_canvas.height, FIELD_OF_VIEW_DEGREES)) ?? null;
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
      // always points at true north on the screen.
      function refresh_compass_control() {
        const off_north_degrees_value =
          bearing_off_north_degrees(camera_state.bearing);
        compass_control.hidden =
          off_north_degrees_value < COMPASS_VISIBILITY_BEARING_THRESHOLD_DEGREES;
        compass_north_letter.style.transform = `rotate(${-camera_state.bearing}deg)`;
      }

      // The my-location control's re-center affordance (§4.2/§5.3): while a
      // gesture-broken follow waits for an explicit re-engage, the control
      // takes the cluster's active look and names the act.
      function refresh_my_location_control() {
        const is_recentering =
          follow_demo.phase === FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE;
        my_location_control.classList.toggle('recentering', is_recentering);
        my_location_control.setAttribute(
          'aria-label',
          is_recentering ? 'Re-center on my location' : 'Center on my location');
      }

      // The location indicator (§4.2): the wasm seam draws the layer over
      // the overlays (the native surface's top layer); the state hook stays
      // live on the 2D path too, where (like the overlays) the draw is a
      // documented GPU-only capability.
      function apply_location_indicator(indicator, indicator_style) {
        current_location_indicator = indicator
          ? { ...indicator, visualKind: indicator_style?.visualKind }
          : null;
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
        if (follow_demo.phase === FOLLOW_DEMO_PHASE_ENGAGED &&
            follow_demo.target_bearing_degrees !== null) {
          const chase_delta_degrees = signed_angular_difference_degrees(
            follow_demo.target_bearing_degrees, camera_state.bearing);
          if (Math.abs(chase_delta_degrees) <= FOLLOW_BEARING_SNAP_DISTANCE_DEGREES) {
            camera_state.bearing = follow_demo.target_bearing_degrees;
          } else {
            camera_state.bearing = follow_bearing_chase.advance(
              camera_state.bearing, follow_demo.target_bearing_degrees, now_milliseconds);
            pump_running = true;
          }
          controls.bearing.value = camera_state.bearing;
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

      // My-location (§4.2): outside a trip the playground's standing fix is
      // the camera center itself, carrying the recorded trace's accuracy (the
      // plain tracking dot — no course on this fix); during a trip the
      // control re-centers on the latest guided fix and re-engages a follow
      // broken by a gesture (§5.3: a gesture keeps follow broken until the
      // control re-engages it, never the next fix).
      my_location_control.addEventListener('click', () => {
        const latest_trip_fix = follow_demo.latest_fix;
        if (latest_trip_fix !== null &&
            follow_demo.phase !== FOLLOW_DEMO_PHASE_DISENGAGED) {
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
        if (follow_demo.phase === FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE) {
          follow_demo.phase = FOLLOW_DEMO_PHASE_ENGAGED;
          follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged;
          follow_bearing_chase.reset();
          refresh_my_location_control();
          request_pump_step();
        }
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
        plane_toggle_control.classList.toggle('primary', is_three_dimensional_camera);
        pitch_swing_ease.begin(
          performance.now(), camera_state.pitch,
          is_three_dimensional_camera ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0,
          EASED_CAMERA_MOVE_DURATION_MILLISECONDS);
        request_pump_step();
      });

      // The compass (§4.2): a tap eases the camera north up over the one
      // eased-camera-move duration; the pump re-renders as it swings.
      compass_control.addEventListener('click', () => {
        compass_renorth_ease.begin(
          performance.now(), camera_state.bearing, 0,
          EASED_CAMERA_MOVE_DURATION_MILLISECONDS);
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

      function end_follow_demo_trip(end_live_text) {
        if (follow_demo.fix_interval_id !== null) clearInterval(follow_demo.fix_interval_id);
        follow_demo.fix_interval_id = null;
        follow_demo.phase = FOLLOW_DEMO_PHASE_DISENGAGED;
        follow_demo.target_bearing_degrees = null;
        follow_demo.latest_fix = null;
        follow_bearing_chase.reset();
        course_median_smoother.reset();
        refresh_my_location_control();
        const pre_trip_camera = follow_demo.pre_trip_camera;
        follow_demo.pre_trip_camera = null;
        // §5.3: trip end returns the captured pre-trip camera; with it the
        // indicator clears (the follow visual is the in-trip state).
        apply_location_indicator(null, null);
        if (pre_trip_camera) {
          camera_state.latitude = pre_trip_camera.latitude;
          camera_state.longitude = pre_trip_camera.longitude;
          camera_state.zoom = pre_trip_camera.zoom;
          camera_state.bearing = pre_trip_camera.bearing;
          camera_state.pitch = pre_trip_camera.pitch;
          controls.zoom.value = camera_state.zoom;
          controls.bearing.value = camera_state.bearing;
          controls.pitch.value = camera_state.pitch;
        }
        refresh_control_labels();
        follow_demo_live_line.textContent = end_live_text;
        follow_demo_start_control.textContent = FOLLOW_DEMO_START_TEXT;
        schedule_render();
      }

      function on_follow_demo_fix() {
        // The walk clamps at the route's total length, so the last fix lands
        // exactly on the destination instead of stopping a tick short of it.
        const travelled_meters = Math.min(
          follow_demo.travelled_meters, follow_demo.total_meters);
        const has_arrived = travelled_meters >= follow_demo.total_meters;
        const remaining_distance_fraction =
          follow_demo.total_meters <= 0
            ? 0
            : 1 - travelled_meters / follow_demo.total_meters;
        const fix = polyline_fix_at_travelled_meters(
          follow_demo.route_polyline, travelled_meters);
        follow_demo.latest_fix = { latitude: fix.latitude, longitude: fix.longitude };
        // §5.3: a fix retargets the smoothed course and the ramped zoom; the
        // camera follows only while engaged. A gesture keeps follow broken
        // until the my-location control re-engages it — a fix never silently
        // snaps the user's panned view back.
        const is_following = follow_demo.phase !== FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE;
        if (is_following) {
          follow_demo.phase = FOLLOW_DEMO_PHASE_ENGAGED;
          camera_state.latitude = fix.latitude;
          camera_state.longitude = fix.longitude;
          camera_state.zoom = follow_zoom_toward_trip_end(remaining_distance_fraction);
          controls.zoom.value = camera_state.zoom;
        }
        course_median_smoother.add(fix.courseHeadingDegrees);
        follow_demo.target_bearing_degrees = course_median_smoother.median();
        apply_location_indicator(
          {
            latitude: fix.latitude,
            longitude: fix.longitude,
            courseHeadingDegrees: fix.courseHeadingDegrees,
            horizontalAccuracyMeters: FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS,
          },
          { visualKind: 'guidedCourseArrow' },
        );
        follow_demo.travelled_meters = travelled_meters +
          FOLLOW_DEMO_SPEED_METERS_PER_SECOND *
          (FOLLOW_DEMO_FIX_INTERVAL_MILLISECONDS / 1000);
        refresh_control_labels();
        refresh_compass_control();
        refresh_my_location_control();
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

      follow_demo_start_control.addEventListener('click', () => {
        if (follow_demo.phase !== FOLLOW_DEMO_PHASE_DISENGAGED) {
          end_follow_demo_trip(FOLLOW_DEMO_LIVE_LINE_TEXTS.stopped);
          return;
        }
        // §5.3: trip start captures the pre-trip camera and applies the
        // fixed deep zoom and the plane's pitch; center and bearing hold
        // until the first fix retargets them.
        follow_demo.pre_trip_camera = { ...camera_state };
        // The trip walks the route the visitor planned; the artifact's own
        // scene polyline is only the fallback for the no-plan demo.
        const planned_route_polyline = trip_route_overlays
          .find((overlay) => overlay.kind === 'routePolyline')
          ?.coordinates ?? null;
        const trip_polyline = planned_route_polyline ?? FOLLOW_DEMO_ROUTE_POLYLINE;
        follow_demo.route_polyline = trip_polyline;
        follow_demo.travelled_meters = 0;
        follow_demo.total_meters = polyline_length_meters(trip_polyline);
        follow_bearing_chase.reset();
        course_median_smoother.reset();
        follow_demo.target_bearing_degrees = null;
        follow_demo.latest_fix = null;
        follow_demo.phase = FOLLOW_DEMO_PHASE_ENGAGED;
        refresh_my_location_control();
        camera_state.zoom = follow_zoom_toward_trip_end(1.0);
        camera_state.pitch = is_three_dimensional_camera
          ? NAVIGATION_FOLLOW_PITCH_3D_DEGREES : 0;
        controls.zoom.value = camera_state.zoom;
        controls.pitch.value = camera_state.pitch;
        follow_demo_start_control.textContent = FOLLOW_DEMO_STOP_TEXT;
        follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.engaged;
        follow_demo.fix_interval_id = setInterval(
          on_follow_demo_fix, FOLLOW_DEMO_FIX_INTERVAL_MILLISECONDS);
        on_follow_demo_fix();
      });

      // A map-surface gesture (drag or wheel — §5.3) ends ENGAGED follow
      // immediately; it stays broken until the my-location control
      // re-engages it (never the next fix).
      function follow_demo_note_camera_gesture() {
        if (follow_demo.phase === FOLLOW_DEMO_PHASE_ENGAGED) {
          follow_demo.phase = FOLLOW_DEMO_PHASE_BROKEN_BY_GESTURE;
          follow_demo_live_line.textContent = FOLLOW_DEMO_LIVE_LINE_TEXTS.brokenByGesture;
          refresh_my_location_control();
        }
      }

      // The diagnostics readout (§4.1): the facts are the session's draw
      // facts; the event lines flush the wasm ring (oldest first). The readout
      // subscribes at its named gate severity once the wasm surface is up.
      let diagnostics_minimum_severity_value = null;
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

      function refresh_diagnostics_event_lines() {
        if (!diagnostics_minimum_severity_value) return;
        const flushed_events = window.mapTest.flushRecentDiagnosticEvents(
          diagnostics_minimum_severity_value, DIAGNOSTICS_READOUT_EVENT_LIMIT);
        diagnostics_event_lines.textContent = flushed_events.length === 0
          ? 'no recent SDK events at this severity'
          : Array.from(flushed_events)
            .map((event_line) =>
              `${event_line.severity} ${event_line.subsystemTarget}: ${event_line.messageLine}`)
            .join('\n');
      }
      diagnostics_refresh_control.addEventListener('click', () => {
        refresh_diagnostics_event_lines();
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
        follow_demo_note_camera_gesture();
        overlay_canvas.setPointerCapture(event.pointerId);
        last_pointer_position = [event.clientX, event.clientY];
      });
      overlay_canvas.addEventListener('pointermove', (event) => {
        if (!panning || !last_pointer_position) return;
        const delta_x_pixels = event.clientX - last_pointer_position[0];
        const delta_y_pixels = event.clientY - last_pointer_position[1];
        last_pointer_position = [event.clientX, event.clientY];
        move_center_by_ground_delta(delta_x_pixels, delta_y_pixels);
      });
      overlay_canvas.addEventListener('pointerup', (event) => {
        panning = false; overlay_canvas.classList.remove('panning');
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
      overlay_canvas.addEventListener('dblclick', (event) => {
        // A touch double tap already zoomed from its pointer pair.
        if (last_pointer_kind === 'touch') return;
        event.preventDefault();
        zoom_around_canvas_point(pointer_to_canvas_pixels(event));
      });
      overlay_canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
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
      window.addEventListener('resize', () => { resize_canvases(); schedule_render(); });

      function resize_canvases() {
        map_canvas.width = window.innerWidth; map_canvas.height = window.innerHeight;
        overlay_canvas.width = window.innerWidth; overlay_canvas.height = window.innerHeight;
      }

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
          // The vector base's label pass needs the glyph range before any
          // label can draw; the dev server serves the committed recorded
          // range same-origin (the raster tiles' fixture pattern). A missing
          // range leaves `label_glyph_status` null and the base simply draws
          // without labels, never an error the map cannot recover from.
          try {
            const glyph_range_response = await fetch(VECTOR_LABEL_GLYPH_RANGE_URL);
            if (glyph_range_response.ok) {
              label_glyph_status = gpu_map_canvas.setGlyphRange(
                new Uint8Array(await glyph_range_response.arrayBuffer()));
            }
          } catch (glyph_failure) {
            label_glyph_status = null;
          }
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
              gpu_map_canvas.setRasterTileSource(
                live_raster_descriptor.raster_url_template,
                live_raster_descriptor.maximum_zoom_level
                  ?? LIVE_RASTER_FALLBACK_ZOOM_LEVEL,
              );
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
        refresh_base_map_toggle_enabled_state();
        // The first-run status is a plain human readiness state; the
        // renderer, adapter and version detail live in diagnostics (the
        // readout when enabled and the Advanced diagnostics block).
        status_line_element.setAttribute('data-readiness',
          renderer_mode === 'gpu' ? 'ready' : 'degraded');
        status_line_element.textContent = renderer_mode === 'gpu'
          ? ui_label_text('readiness.chip_ready')
          : `${ui_label_text('readiness.chip_degraded_prefix')}2D grid`;
        // The round-11 surface (§4.1/§4.2/§5.3): the diagnostics gate drops
        // to the readout's named severity (it never raises back — the ring
        // is bounded), the frame facts pre fills, and the follow demo is a
        // GPU-only capability: on the 2D path its control stays disabled
        // with the reason (the §6.2 disabled-with-reason pattern).
        diagnostics_minimum_severity_value = window.mapTest.SdkLogSeverity[
          DIAGNOSTICS_READOUT_MINIMUM_SEVERITY_NAME];
        window.mapTest.subscribeToDiagnosticEvents(diagnostics_minimum_severity_value);
        follow_demo_start_control.disabled = renderer_mode !== 'gpu';
        if (renderer_mode !== 'gpu') {
          follow_demo_live_line.textContent =
            'Simulated trips need the 3D map renderer; this browser is using ' +
            'the 2D fallback.';
        }
        diagnostics_facts_element.textContent = diagnostics_facts_text();
        refresh_diagnostics_event_lines();
        refresh_control_labels();
        await run_render_step();
      }).catch((load_error) => {
        status_element.textContent = `Map failed to start: ${load_error}`;
        status_line_element.textContent =
          `${ui_label_text('readiness.chip_failed_prefix')}${load_error}`;
        status_line_element.setAttribute('data-readiness', 'failed');
        show_error_report('Rustic Maps SDK start failed', String(load_error));
      });
