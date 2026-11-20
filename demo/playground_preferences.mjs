// playground_preferences: the preferences concern of the browser
// playground controller.
//
// Responsibility:
// Persisted visitor choices and their surfaces: the demo preferences record,
// local storage, the Light/Dark/Auto theme, the settings dialog, the
// directions mode and strategy choices, and the remembered camera presets.
//
// Public exports:
//   definePreferences
//   installPreferencesPhase1
//   installPreferencesPhase2
//   installPreferencesPhase3
//   installPreferencesPhase4
//   installPreferencesPhase5
//   installPreferencesPhase6
//
// Every function reads shared state through the `runtime` object passed to
// `definePreferences` and calls helpers from other concerns through
// `runtime.services`, so this module imports no sibling concern module and
// the concern graph stays acyclic.

import {
  REFERENCE_SCENE_ARTIFACT,
} from './overlay_scenes.mjs';
import {
  TILE_LAYER_MODES,
} from './tile_switch.mjs';

export function definePreferences(runtime) {
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

  /** The record's defaults, also the shape every read is rebuilt into. */
  function default_demo_preferences() {
    return {
      version: runtime.shared.DEMO_PREFERENCES_VERSION,
      themeChoice: 'auto',
      baseMap: null,
      trafficLayerEnabled: false,
      deviceLocationEnabled: false,
      directionsTransportationMode: runtime.shared.DEFAULT_DIRECTIONS_TRANSPORTATION_MODE,
      directionsRouteStrategy: runtime.shared.DEFAULT_DIRECTIONS_ROUTE_STRATEGY,
      demoPlanScenario: null,
      overlaySceneKeys: [],
      cameraPresetId: null,
      speedMultiplier: runtime.shared.DEFAULT_FOLLOW_DEMO_SPEED_MULTIPLIER,
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
    if (!runtime.services.is_preference_object(value)) return null;
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
    if (!runtime.services.is_preference_object(value)) return {};
    const sanitized_choices = {};
    for (const capability_key of Object.keys(runtime.shared.CAPABILITY_CONTRACT_NAMES)) {
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
    const preferences = runtime.services.default_demo_preferences();
    const stored_text = runtime.services.read_local_storage(runtime.shared.DEMO_PREFERENCES_STORAGE_KEY);
    if (stored_text === null) {
      const legacy_theme_choice = runtime.services.read_local_storage(runtime.shared.THEME_CHOICE_STORAGE_KEY);
      if (runtime.shared.THEME_CHOICE_NAMES.includes(legacy_theme_choice)) {
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
    if (!runtime.services.is_preference_object(stored_record)
      || stored_record.version !== runtime.shared.DEMO_PREFERENCES_VERSION) {
      return preferences;
    }
    if (runtime.shared.THEME_CHOICE_NAMES.includes(stored_record.themeChoice)) {
      preferences.themeChoice = stored_record.themeChoice;
    }
    preferences.baseMap = runtime.services.sanitized_base_map_preference(stored_record.baseMap);
    preferences.trafficLayerEnabled = stored_record.trafficLayerEnabled === true;
    preferences.deviceLocationEnabled =
      stored_record.deviceLocationEnabled === true;
    if (runtime.shared.DIRECTIONS_TRANSPORTATION_MODES.includes(
      stored_record.directionsTransportationMode)) {
      preferences.directionsTransportationMode =
        stored_record.directionsTransportationMode;
    }
    if (runtime.shared.DIRECTIONS_ROUTE_STRATEGIES.includes(
      stored_record.directionsRouteStrategy)) {
      preferences.directionsRouteStrategy = stored_record.directionsRouteStrategy;
    }
    if (runtime.shared.DEMO_PLAN_SCENARIO_IDS.has(stored_record.demoPlanScenario)) {
      preferences.demoPlanScenario = stored_record.demoPlanScenario;
    }
    if (Array.isArray(stored_record.overlaySceneKeys)) {
      preferences.overlaySceneKeys = stored_record.overlaySceneKeys.filter(
        (scene_key) => runtime.shared.OVERLAY_SCENE_KEYS.has(scene_key));
    }
    if (runtime.shared.CAMERA_PRESET_IDS.has(stored_record.cameraPresetId)) {
      preferences.cameraPresetId = stored_record.cameraPresetId;
    }
    if (runtime.shared.FOLLOW_DEMO_SPEED_MULTIPLIERS.includes(stored_record.speedMultiplier)) {
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
      runtime.services.sanitized_capability_providers_preference(
        stored_record.capabilityProviders);
    return preferences;
  }

  /** The `RouteOptions` object the live plan call sends. */
  function current_directions_route_options() {
    return {
      transportationMode: runtime.state.directions_transportation_mode,
      routeStrategy: runtime.state.directions_route_strategy,
      unitSystem: runtime.shared.TRIP_PLANNER_UNIT_SYSTEM,
    };
  }

  /** Reflects both choices on the pressed-choice groups. The strategy
   * applies to automobile plans, so its row is hidden while the plan
   * walks (the walk keeps a remembered strategy for the next car plan). */
  function refresh_directions_controls() {
    const is_automobile =
      runtime.state.directions_transportation_mode === runtime.shared.DIRECTIONS_TRANSPORTATION_MODE_AUTOMOBILE;
    runtime.shared.directions_mode_car_control.setAttribute('aria-pressed', String(is_automobile));
    runtime.shared.directions_mode_walk_control.setAttribute('aria-pressed', String(!is_automobile));
    runtime.shared.directions_strategy_fastest_control.setAttribute(
      'aria-pressed',
      String(runtime.state.directions_route_strategy === runtime.shared.DIRECTIONS_ROUTE_STRATEGY_FASTEST));
    runtime.shared.directions_strategy_shortest_control.setAttribute(
      'aria-pressed',
      String(runtime.state.directions_route_strategy === runtime.shared.DIRECTIONS_ROUTE_STRATEGY_SHORTEST));
    runtime.shared.directions_strategy_row.hidden = !is_automobile;
  }

  /** Applies one mode choice, remembers it and refreshes the groups. */
  function set_directions_transportation_mode(transportation_mode) {
    runtime.state.directions_transportation_mode = transportation_mode;
    runtime.services.write_demo_preferences({ directionsTransportationMode: transportation_mode });
    runtime.services.refresh_directions_controls();
  }

  /** Applies one strategy choice, remembers it and refreshes the groups. */
  function set_directions_route_strategy(route_strategy) {
    runtime.state.directions_route_strategy = route_strategy;
    runtime.services.write_demo_preferences({ directionsRouteStrategy: route_strategy });
    runtime.services.refresh_directions_controls();
  }

  /** Merges one explicit choice into the record and persists it. */
  function write_demo_preferences(changed_preferences) {
    runtime.state.demo_preferences = {
      ...runtime.state.demo_preferences,
      ...changed_preferences,
      version: runtime.shared.DEMO_PREFERENCES_VERSION,
    };
    runtime.services.write_local_storage(
      runtime.shared.DEMO_PREFERENCES_STORAGE_KEY, JSON.stringify(runtime.state.demo_preferences));
    // The record now owns the theme choice; the older single-key store
    // is retired so a reset can never resurrect it.
    runtime.services.write_local_storage(runtime.shared.THEME_CHOICE_STORAGE_KEY, null);
  }

  /** Forgets every remembered demo choice (the credential store stays). */
  function clear_demo_preferences() {
    runtime.state.demo_preferences = runtime.services.default_demo_preferences();
    runtime.services.write_local_storage(runtime.shared.DEMO_PREFERENCES_STORAGE_KEY, null);
    runtime.services.write_local_storage(runtime.shared.THEME_CHOICE_STORAGE_KEY, null);
  }

  function resolved_theme_name() {
    if (runtime.state.theme_choice !== 'auto') return runtime.state.theme_choice;
    return runtime.shared.dark_color_scheme_query?.matches ? 'dark' : 'light';
  }

  function current_theme_name() {
    return document.documentElement.dataset.theme ?? runtime.services.resolved_theme_name();
  }

  function apply_theme_choice(next_choice, { remember = true } = {}) {
    runtime.state.theme_choice = next_choice;
    if (remember) {
      runtime.services.write_demo_preferences({ themeChoice: next_choice });
    }
    document.documentElement.dataset.themeChoice = next_choice;
    document.documentElement.dataset.theme = runtime.services.resolved_theme_name();
    runtime.shared.theme_toggle_control.textContent =
      `Switch to ${runtime.shared.THEME_NAMES_CYCLING[next_choice]} theme`;
  }

  function open_settings(focus_credential_input, opener_element = runtime.shared.settings_control) {
    runtime.state.settings_opener_element = opener_element;
    if (!runtime.shared.settings_dialog.open) runtime.shared.settings_dialog.showModal();
    if (!focus_credential_input) return;
    // The trip card's key action lands the visitor directly in the first
    // available credential field instead of on the close control.
    const first_available_control =
      Array.from(runtime.shared.provider_credential_controls_by_key.values())
        .find((provider_control) => provider_control.registration_available);
    if (first_available_control !== undefined) {
      first_available_control.input_element.focus();
    }
  }

  function selected_camera_preset_button() {
    for (const preset_button of runtime.shared.camera_preset_controls.children) {
      if (preset_button.classList.contains('selected')) return preset_button;
    }
    return null;
  }

  function select_camera_preset_button(preset_id) {
    const selected_button = runtime.services.selected_camera_preset_button();
    if (selected_button) selected_button.classList.remove('selected');
    runtime.shared.camera_preset_buttons_by_id[preset_id].classList.add('selected');
  }

  function camera_state_by_preset(preset) {
    runtime.services.select_camera_preset_button(preset.id);
    // The native `animateCamera` behaviour (§4.2): the click only starts
    // one eased move over the shared duration, so the pose is unchanged
    // when the handler returns. `MapCamera.interpolate` carries the SDK's
    // smoothstep curve, the shortest longitude path and the shortest
    // bearing arc, and its endpoints are exact, so the settle equals the
    // preset exactly.
    runtime.state.camera_preset_animation = {
      start_camera: runtime.services.build_camera(),
      target_camera: new window.mapTest.MapCamera(
        preset.latitude_degrees,
        preset.longitude_degrees,
        preset.zoom_level,
        preset.bearing_degrees,
        preset.pitch_degrees,
      ),
      start_milliseconds: performance.now(),
      duration_milliseconds: runtime.services.eased_camera_move_duration_milliseconds(),
    };
    runtime.services.request_pump_step();
  }

  // The restored preset is the visitor's starting pose, not an eased
  // transition: apply it directly before the first interactive frame.
  function apply_camera_preset_pose_immediately(preset) {
    runtime.services.select_camera_preset_button(preset.id);
    runtime.services.adopt_camera(new window.mapTest.MapCamera(
      preset.latitude_degrees,
      preset.longitude_degrees,
      preset.zoom_level,
      preset.bearing_degrees,
      preset.pitch_degrees,
    ));
    runtime.services.schedule_render();
  }

  function apply_remembered_camera_preset() {
    const remembered_preset = REFERENCE_SCENE_ARTIFACT.camera_presets.find(
      (candidate) => candidate.id === runtime.shared.initial_demo_preferences.cameraPresetId);
    if (remembered_preset === undefined) return;
    runtime.services.apply_camera_preset_pose_immediately(remembered_preset);
  }

  Object.assign(runtime.services, {
    read_local_storage,
    write_local_storage,
    default_demo_preferences,
    is_preference_object,
    sanitized_base_map_preference,
    sanitized_capability_providers_preference,
    read_demo_preferences,
    current_directions_route_options,
    refresh_directions_controls,
    set_directions_transportation_mode,
    set_directions_route_strategy,
    write_demo_preferences,
    clear_demo_preferences,
    resolved_theme_name,
    current_theme_name,
    apply_theme_choice,
    open_settings,
    selected_camera_preset_button,
    select_camera_preset_button,
    camera_state_by_preset,
    apply_camera_preset_pose_immediately,
    apply_remembered_camera_preset,
  });

}

export function installPreferencesPhase1(runtime) {
  // The theme model (§3, owner ruling 2026-10-30): three explicit choices
  // — Light, Dark and Auto — with Auto as the default. Auto follows the
  // operating system's `prefers-color-scheme` live; an explicit Light or
  // Dark choice is remembered on this device and wins from then on.
  runtime.shared.THEME_CHOICE_NAMES = Object.freeze(['light', 'dark', 'auto']);

  runtime.shared.THEME_NAMES_CYCLING = Object.freeze({
    light: 'dark',
    dark: 'auto',
    auto: 'light',
  });

  runtime.shared.THEME_CHOICE_STORAGE_KEY = 'rusticMapsSdk.themeChoice';

  runtime.shared.DARK_COLOR_SCHEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
}

export function installPreferencesPhase2(runtime) {
  runtime.shared.settings_control = document.getElementById('settings-control');
}

export function installPreferencesPhase3(runtime) {
  // The visitor's explicit demo choices, remembered as one versioned
  // record in this origin's localStorage. Only explicit selections are
  // written; a transient value (an open dialog, the current camera pose,
  // a route result) never enters the record, and provider credentials
  // stay in the separate opt-in store above.
  runtime.shared.DEMO_PREFERENCES_STORAGE_KEY = 'rustic-maps-demo-preferences';

  runtime.shared.DEMO_PREFERENCES_VERSION = 1;

  runtime.shared.DEMO_PLAN_SCENARIO_IDS = new Set(
    (REFERENCE_SCENE_ARTIFACT.demo_plans ?? []).map(
      (demo_plan) => demo_plan.scenario));

  runtime.shared.CAMERA_PRESET_IDS = new Set(
    REFERENCE_SCENE_ARTIFACT.camera_presets.map(
      (camera_preset) => camera_preset.id));

  runtime.shared.OVERLAY_SCENE_KEYS = new Set(
    Object.keys(REFERENCE_SCENE_ARTIFACT.overlay_scenes ?? {}));

  // The snapshot the page restores from: taken once at start-up, so a
  // choice made while the renderer is still initializing can never be
  // overwritten by its own written record.
  runtime.shared.initial_demo_preferences = runtime.services.read_demo_preferences();

  runtime.state.demo_preferences = { ...runtime.shared.initial_demo_preferences };

  // The Directions choices every route plan carries. The wasm façade
  // exposes `routeCapabilities()`, but this demo does not gate the control
  // on it: the selected pair is sent, and a provider without a shortest
  // switch applies its own documented ranking. The route card states
  // the mode and strategy the plan carried.
  runtime.state.directions_transportation_mode =
    runtime.shared.initial_demo_preferences.directionsTransportationMode;

  runtime.state.directions_route_strategy =
    runtime.shared.initial_demo_preferences.directionsRouteStrategy;

  runtime.services.refresh_directions_controls();
}

export function installPreferencesPhase4(runtime) {
  // Theme (docs/ReferenceAppUX.md §3, ruled 2026-10-30): Light / Dark /
  // Auto with Auto the default. The resolved theme lands on the root
  // element's `data-theme` (every token and literal-mirror style reads
  // it), the choice itself on `data-theme-choice`, and the toggle's label
  // names the choice it switches to next.
  runtime.shared.theme_toggle_control = document.getElementById('theme-toggle-control');

  runtime.shared.dark_color_scheme_query =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(runtime.shared.DARK_COLOR_SCHEME_MEDIA_QUERY)
      : null;

  runtime.state.theme_choice = runtime.shared.initial_demo_preferences.themeChoice;

  if (!runtime.shared.THEME_CHOICE_NAMES.includes(runtime.state.theme_choice)) {
    runtime.state.theme_choice = 'auto';
  }

  runtime.services.apply_theme_choice(runtime.state.theme_choice, { remember: false });

  // Auto follows the operating system live; an explicit choice ignores
  // the system from then on.
  runtime.shared.dark_color_scheme_query?.addEventListener?.('change', () => {
    if (runtime.state.theme_choice !== 'auto') return;
    document.documentElement.dataset.theme = runtime.services.resolved_theme_name();
    runtime.services.schedule_render();
    runtime.services.refresh_vector_base_for_theme();
  });
}

export function installPreferencesPhase5(runtime) {
  // The header's docs back-link is shown only when the demo is served from
  // the documentation site's `/demo/` path, so the local dev server's root
  // page never grows a dead "up" link.
  runtime.shared.is_published_demo = window.location.pathname.includes('/demo/');

  runtime.shared.docs_back_link = document.getElementById('docs-back-link');

  runtime.shared.docs_back_link.hidden = !runtime.shared.is_published_demo;

  runtime.shared.theme_toggle_control.addEventListener('click', () => {
    runtime.services.apply_theme_choice(runtime.shared.THEME_NAMES_CYCLING[runtime.state.theme_choice]);
    runtime.services.schedule_render();
    // A vector base repaints in the palette the new theme resolves to.
    runtime.services.refresh_vector_base_for_theme();
  });

  // Settings (M13/M15): the gear opens the settings sheet as a native
  // modal dialog — focus containment, Escape close and the backdrop come
  // from the element itself. `?settings` opens it for the browser suite
  // and for deep links into the credential surface.
  runtime.shared.settings_dialog = document.getElementById('settings-dialog');

  runtime.shared.settings_close_control = document.getElementById('settings-close-control');

  runtime.shared.reset_remembered_choices_control =
    document.getElementById('reset-remembered-choices-control');

  runtime.shared.remembered_choices_status =
    document.getElementById('remembered-choices-status');

  runtime.shared.reset_remembered_choices_control.addEventListener('click', () => {
    // The credential opt-in store is deliberately untouched: a remembered
    // provider key belongs to that switch, not to this record.
    runtime.services.clear_demo_preferences();
    runtime.shared.remembered_choices_status.hidden = false;
    runtime.shared.remembered_choices_status.textContent =
      'Remembered choices cleared. Provider keys are unchanged.';
  });

  // The element focus returns to when the sheet closes: the trip card's
  // credential action or the gear, whichever opened it.
  runtime.state.settings_opener_element = runtime.shared.settings_control;

  runtime.shared.settings_control.addEventListener('click', () => runtime.services.open_settings(false));

  runtime.shared.trip_credential_action.addEventListener(
    'click', () => runtime.services.open_settings(true, runtime.shared.trip_credential_action));

  runtime.shared.settings_close_control.addEventListener('click', () => runtime.shared.settings_dialog.close());

  // A click on the dialog element itself lands on the backdrop (the sheet
  // fills the element's content box).
  runtime.shared.settings_dialog.addEventListener('click', (event) => {
    if (event.target === runtime.shared.settings_dialog) runtime.shared.settings_dialog.close();
  });

  runtime.shared.settings_dialog.addEventListener('close', () => runtime.state.settings_opener_element.focus());

  if (new URLSearchParams(window.location.search).has('settings')) {
    runtime.shared.settings_dialog.showModal();
  }

  // Camera presets from the shared artifact (docs/ReferenceAppUX.md §9):
  // subtle buttons in a wrapped row; selected preset gets the accent.
  runtime.shared.camera_preset_controls = document.getElementById('camera-preset-controls');

  runtime.shared.CAMERA_PRESET_BUTTON_ATTRIBUTES = { type: 'button', class: 'camera-preset-button' };

  runtime.shared.camera_preset_buttons_by_id = Object.fromEntries(
    REFERENCE_SCENE_ARTIFACT.camera_presets.map((preset) => {
      const preset_button = document.createElement('button');
      for (const [attribute_name, attribute_value] of
           Object.entries(runtime.shared.CAMERA_PRESET_BUTTON_ATTRIBUTES)) {
        preset_button.setAttribute(attribute_name, attribute_value);
      }
      preset_button.dataset.cameraPresetId = preset.id;
      preset_button.textContent = preset.label;
      preset_button.title = `${preset.label} — ${preset.note}`;
      runtime.shared.camera_preset_controls.appendChild(preset_button);
      return [preset.id, preset_button];
    }),
  );

  for (const preset_button of runtime.shared.camera_preset_controls.children) {
    preset_button.addEventListener('click', () => {
      const preset = REFERENCE_SCENE_ARTIFACT.camera_presets.find(
        (candidate) => candidate.id === preset_button.dataset.cameraPresetId,
      );
      runtime.services.camera_state_by_preset(preset);
      runtime.services.write_demo_preferences({ cameraPresetId: preset.id });
    });
  }
}

export function installPreferencesPhase6(runtime) {
  // The default camera is the artifact's recorded-golden preset; the
  // selector marks it without re-rendering before readiness resolved.
  runtime.services.select_camera_preset_button('fixture-center');
}
