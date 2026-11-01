/**
 * The web reference surface's single consumer-copy module (M28).
 *
 * Every value below mirrors one entry of the canonical `ui_labels` section in
 * `platform/reference-tokens.json` and is checked by
 * `scripts/check_ux_parity.mjs`. Placeholders use the artifact's one syntax
 * (`{provider}`, `{offset}`); the gate normalizes each platform's native
 * interpolation before comparing.
 *
 * The web playground consumes it since M28 slice 5: static markup carries the
 * canonical text as a no-script-safe default and marks it with a
 * `data-ui-label` attribute, and `playground.mjs` reads every dynamic label
 * through the helpers below. `scripts/check_ux_parity.mjs` reads the markup and
 * the controller calls, not this module alone, so a hardcoded label on the
 * page cannot hide behind a canonical module.
 *
 * The keys are the artifact IDs, kept verbatim (dots included) so a reader can
 * jump from a rendered label to its canonical row without a name mapping.
 */
export const uiStrings = {
  'peek.primary_action': 'Start simulated navigation',
  'plan.origin_hint': 'Search an origin',
  'plan.destination_hint': 'Where to?',
  'plan.destination_placeholder': 'Search a destination',
  'plan.search_heading': 'Plan a route',
  'plan.plan_route_action': 'Plan route',
  'plan.planning_in_flight': 'Planning the route…',
  'plan.searching_in_flight': 'Searching…',
  'plan.empty_results_hint': 'No results yet; search a place above.',
  'route.start_action': 'Start simulated navigation',
  'route.edit_action': 'Edit',
  'navigation.exit_action': 'Exit',
  'navigation.phase_navigating': 'Navigating',
  'navigation.phase_off_route': 'Off route',
  'navigation.phase_arrived': 'Arrived',
  'navigation.phase_not_started': 'Not started',
  'navigation.eta_prefix': 'ETA',
  'navigation.eta_distance_label': 'Distance remaining',
  'navigation.eta_duration_label': 'Duration remaining',
  'navigation.deviation_alert':
    'Off route — {offset} from the route line; guidance is frozen until a graded fix recovers or a reroute applies.',
  'navigation.voice_toggle': 'Voice guidance',
  'readiness.chip_ready': 'Ready',
  'readiness.chip_loading': 'Loading…',
  'readiness.chip_degraded_prefix': 'Degraded: ',
  'readiness.chip_failed_prefix': 'Failed: ',
  'settings.open_accessibility': 'Open settings',
  'settings.close_action': 'Close',
  'settings.credential_applied': '{provider} key applied',
  'settings.credential_not_applied': '{provider} key not applied',
  'settings.keyless_status': 'Set a provider key to load live map data',
  'overlays.clear_action': 'Clear overlays',
  'scenes.heading': 'Demo scenes',
  'plans.heading': 'Demo plans',
  'camera.presets_heading': 'Camera presets',
  'theme.heading': 'Theme',
  'offline.heading': 'Offline maps',
  'offline.plan_route_action': 'Plan offline route',
  'offline.recorded_graph_route_title': 'Offline demo route',
  'offline.recorded_graph_note':
    'Planned offline from a recorded test graph, not live data.',
  'navigation.speed_label': 'Speed',
  'navigation.pause_action': 'Pause',
  'navigation.resume_action': 'Resume',
  'navigation.speed_multiplier_label': '{multiplier}×',
  'navigation.seek_label': 'Seek',
  'diagnostics.title': 'Diagnostics',
};

/** The artifact's placeholder syntax: `{provider}`, `{offset}`, … */
const PLACEHOLDER_PATTERN = /\{([A-Za-z0-9_]+)\}/g;

/**
 * Returns one canonical consumer label. An unknown ID is a page bug and
 * throws rather than rendering an empty or stale label.
 * @param {string} label_id
 * @returns {string}
 */
export function ui_label_text(label_id) {
  const label_text = uiStrings[label_id];
  if (label_text === undefined) {
    throw new Error(`unknown consumer-copy id: ${label_id}`);
  }
  return label_text;
}

/**
 * Returns one canonical consumer label with its `{name}` placeholders replaced.
 * A placeholder without a value throws: a rendered `{provider}` is never an
 * acceptable fallback.
 * @param {string} label_id
 * @param {Record<string, string | number>} replacement_values
 * @returns {string}
 */
export function ui_label_text_with_values(label_id, replacement_values) {
  return ui_label_text(label_id).replace(
    PLACEHOLDER_PATTERN,
    (_placeholder_text, placeholder_name) => {
      const replacement_value = replacement_values[placeholder_name];
      if (replacement_value === undefined) {
        throw new Error(
          `consumer-copy label "${label_id}" has no value for "{${placeholder_name}}"`,
        );
      }
      return String(replacement_value);
    },
  );
}
