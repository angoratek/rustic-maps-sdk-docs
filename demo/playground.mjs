// Playground controller: the browser reference app of record.
//
// This entry module owns the wasm-ready lifecycle, creates the shared
// `runtime` object and wires the concern modules in their original
// installation order. Each concern module owns one area of the page behind
// the same public surface this module exposes on `window`:
//
//   preferences       visitor choices, theme, settings, camera presets
//   providerSettings  provider registration and credentials
//   baseMap           raster/vector base switching and the layer panel
//   overlays          scene overlays, traffic flow and attribution
//   navigation        trip planning, live navigation and follow-demo playback
//   diagnostics       diagnostics stream, performance and harness seams
//   mapSurface        camera, pointer/keyboard input, render pump and surface
//
// The functions are defined by the concern modules before any installation
// statement runs, which preserves the hoisting the single-function controller
// relied on. Installation statements then run in the original order.

import {
  definePreferences,
  installPreferencesPhase1,
  installPreferencesPhase2,
  installPreferencesPhase3,
  installPreferencesPhase4,
  installPreferencesPhase5,
  installPreferencesPhase6,
} from './playground_preferences.mjs';
import {
  defineProviderSettings,
  installProviderSettingsPhase1,
  installProviderSettingsPhase2,
  installProviderSettingsPhase3,
  installProviderSettingsPhase4,
  installProviderSettingsPhase5,
  installProviderSettingsPhase6,
  installProviderSettingsPhase7,
  installProviderSettingsPhase8,
} from './playground_provider_settings.mjs';
import {
  defineBaseMap,
  installBaseMapPhase1,
  installBaseMapPhase2,
  installBaseMapPhase3,
  installBaseMapPhase4,
  installBaseMapPhase5,
  installBaseMapPhase6,
  installBaseMapPhase7,
} from './playground_base_map.mjs';
import {
  defineOverlays,
  installOverlaysPhase1,
  installOverlaysPhase2,
  installOverlaysPhase3,
  installOverlaysPhase4,
  installOverlaysPhase5,
  installOverlaysPhase6,
  installOverlaysPhase7,
  installOverlaysPhase8,
  installOverlaysPhase9,
  installOverlaysPhase10,
} from './playground_overlays.mjs';
import {
  defineNavigation,
  installNavigationPhase1,
  installNavigationPhase2,
  installNavigationPhase3,
  installNavigationPhase4,
  installNavigationPhase5,
  installNavigationPhase6,
  installNavigationPhase7,
  installNavigationPhase8,
  installNavigationPhase9,
  installNavigationPhase10,
  installNavigationPhase11,
  installNavigationPhase12,
  installNavigationPhase13,
  installNavigationPhase14,
  installNavigationPhase15,
  installNavigationPhase16,
} from './playground_navigation.mjs';
import {
  defineDiagnostics,
  installDiagnosticsPhase1,
  installDiagnosticsPhase2,
  installDiagnosticsPhase3,
  installDiagnosticsPhase4,
  installDiagnosticsPhase5,
  installDiagnosticsPhase6,
  installDiagnosticsPhase7,
  installDiagnosticsPhase8,
} from './playground_diagnostics.mjs';
import {
  defineMapSurface,
  installMapSurfacePhase1,
  installMapSurfacePhase2,
  installMapSurfacePhase3,
  installMapSurfacePhase4,
  installMapSurfacePhase5,
  installMapSurfacePhase6,
  installMapSurfacePhase7,
  installMapSurfacePhase8,
  installMapSurfacePhase9,
} from './playground_map_surface.mjs';
import { ui_label_text } from './ui_strings.mjs';

/** The runtime object every concern module shares. */
function create_playground_runtime(compiled_version) {
  return {
    services: {},
    shared: {},
    state: {},
    parameters: { compiled_version },
  };
}

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

/**
 * Installs the page: the controls, the panels and the map surface. Runs
 * after `mapTestReady` resolved, so every statement below may use the
 * bound wasm surface.
 * @param {string} compiled_version The SDK version the surface reports.
 */
async function install_playground(compiled_version) {
  const runtime = create_playground_runtime(compiled_version);

  // Every concern defines its functions before any installation statement
  // runs, so a statement may call any helper regardless of where the helper
  // lived in the single-function controller (function declarations were
  // hoisted there too).
  definePreferences(runtime);
  defineProviderSettings(runtime);
  defineBaseMap(runtime);
  defineOverlays(runtime);
  defineNavigation(runtime);
  defineDiagnostics(runtime);
  defineMapSurface(runtime);

  apply_static_ui_strings();

  // The installation phases run in the original statement order. They
  // initialize shared state, attach listeners and publish the `window`
  // surfaces the browser suite reads.
  installMapSurfacePhase1(runtime);
  installNavigationPhase1(runtime);
  installPreferencesPhase1(runtime);
  installDiagnosticsPhase1(runtime);
  installBaseMapPhase1(runtime);
  installDiagnosticsPhase2(runtime);
  installNavigationPhase2(runtime);
  installMapSurfacePhase2(runtime);
  installNavigationPhase3(runtime);
  installOverlaysPhase1(runtime);
  installBaseMapPhase2(runtime);
  installNavigationPhase4(runtime);
  installMapSurfacePhase3(runtime);
  installProviderSettingsPhase1(runtime);
  installPreferencesPhase2(runtime);
  installNavigationPhase5(runtime);
  installDiagnosticsPhase3(runtime);
  installNavigationPhase6(runtime);
  installMapSurfacePhase4(runtime);
  installProviderSettingsPhase2(runtime);
  try {
    runtime.state.providers_registry = await fetch(runtime.shared.PROVIDERS_REGISTRY_URL).then((response) =>
      response.json(),
    );
  } catch {
    runtime.state.providers_registry = { fixture_base_path: '/providers', providers: [] };
  }
  installOverlaysPhase2(runtime);
  installProviderSettingsPhase3(runtime);
  installOverlaysPhase3(runtime);
  installProviderSettingsPhase4(runtime);
  installNavigationPhase7(runtime);
  installProviderSettingsPhase5(runtime);
  installDiagnosticsPhase4(runtime);
  installNavigationPhase8(runtime);
  installProviderSettingsPhase6(runtime);
  installNavigationPhase9(runtime);
  installProviderSettingsPhase7(runtime);
  installPreferencesPhase3(runtime);
  installProviderSettingsPhase8(runtime);
  installNavigationPhase10(runtime);
  installPreferencesPhase4(runtime);
  installDiagnosticsPhase5(runtime);
  installPreferencesPhase5(runtime);
  installOverlaysPhase4(runtime);
  installBaseMapPhase3(runtime);
  installOverlaysPhase5(runtime);
  installBaseMapPhase4(runtime);
  installOverlaysPhase6(runtime);
  installBaseMapPhase5(runtime);
  installNavigationPhase11(runtime);
  installOverlaysPhase7(runtime);
  installBaseMapPhase6(runtime);
  installOverlaysPhase8(runtime);
  installBaseMapPhase7(runtime);
  installOverlaysPhase9(runtime);
  installNavigationPhase12(runtime);
  installMapSurfacePhase5(runtime);
  installDiagnosticsPhase6(runtime);
  installNavigationPhase13(runtime);
  installMapSurfacePhase6(runtime);
  installNavigationPhase14(runtime);
  installMapSurfacePhase7(runtime);
  installNavigationPhase15(runtime);
  installMapSurfacePhase8(runtime);
  installNavigationPhase16(runtime);
  installDiagnosticsPhase7(runtime);
  installMapSurfacePhase9(runtime);
  installPreferencesPhase6(runtime);
  installOverlaysPhase10(runtime);
  installDiagnosticsPhase8(runtime);

  // The controls, panels and automation seams above need no wasm surface;
  // installing them first keeps every wired control live the moment
  // readiness resolves. The surface itself, and its first frame, come last.
  await runtime.services.install_map_surface();
}

/**
 * Reports a failure that stopped the page from installing, on the same
 * readiness surfaces a running page uses.
 * @param {unknown} start_failure The rejection the start promise produced.
 */
function install_start_failure(start_failure) {
  const failure_text = String(start_failure?.message ?? start_failure);
  const failure_status_element = document.getElementById('harness-status');
  const failure_status_line_element = document.getElementById('status-line');
  const failure_error_report_element = document.getElementById('error-report');
  if (failure_status_element !== null) {
    failure_status_element.textContent =
      `Map failed to start: ${failure_text}`;
  }
  if (failure_status_line_element !== null) {
    failure_status_line_element.textContent =
      `${ui_label_text('readiness.chip_failed_prefix')}${failure_text}`;
    failure_status_line_element.setAttribute('data-readiness', 'failed');
  }
  if (failure_error_report_element !== null) {
    failure_error_report_element.hidden = false;
    failure_error_report_element.textContent =
      `Rustic Maps SDK start failed: ${failure_text}`;
  }
}

window.mapTestReady
  .then((compiled_version) => install_playground(compiled_version))
  .catch((start_failure) => install_start_failure(start_failure));
