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
  // The unified reference-application behavior model's field and flow copy
  // (docs/design/ReferenceApplicationBehavior.md §Copy). Every value mirrors
  // one `ui_labels` row in platform/reference-tokens.json.
  'plan.origin_label': 'Origin',
  'plan.destination_label': 'Destination',
  'plan.search_action': 'Search',
  'plan.my_location_action': 'My location',
  'plan.swap_action': 'Swap origin and destination',
  'plan.missing_origin': 'Enter an origin to plan the route.',
  'plan.missing_destination': 'Enter a destination to plan the route.',
  'plan.missing_both': 'Enter an origin and a destination to plan the route.',
  'plan.my_location_unavailable': 'My location is unavailable: {reason}',
  'plan.trip_source_demo_plan': 'Selected demo plan: {plan}',
  'plan.demo_places_heading': 'Demo places',
  'plan.demo_no_match_hint':
    'No demo place matches the {field}; apply a provider key in Settings for live search.',
  'plan.recorded_route_note': 'Recorded demo route, pedestrian, fastest.',
  'plan.no_recorded_route_hint':
    'No recorded demo route from {origin} to {destination}; apply a provider key for live routing.',
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
  // Provider capability rows: one composition for the serving line and every
  // picker entry, never a bare provider name or a bare state.
  'settings.provider_row': '{provider} · {state}',
  'settings.provider_state_ready': 'Ready',
  'settings.provider_state_needs_credential': 'Needs {credential}',
  'settings.provider_state_not_configured': 'Not configured',
  'settings.routing_demo_endpoint': 'Demo server: {url}',
  'settings.routing_unreachable_next_step':
    'The demo server did not answer. Retry, or enter your own deployment address.',
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
  'offline.download_action': 'Download offline region',
  'offline.downloading_status': 'Downloading…',
  'offline.cancel_action': 'Cancel',
  'offline.completed_status': 'Download complete',
  'offline.failed_status': 'Download failed',
  'offline.stored_tiles_label': 'Stored tiles',
  'offline.stored_bytes_label': 'Stored bytes',
  'offline.delete_action': 'Delete region',
  'offline.deleted_status': 'Region deleted',
  'offline.browser_unavailable_status':
    'Offline region downloads are not available in the browser.',
  'navigation.speed_label': 'Speed',
  'navigation.pause_action': 'Pause',
  'navigation.resume_action': 'Resume',
  'navigation.speed_multiplier_label': '{multiplier}×',
  'navigation.seek_label': 'Seek',
  'diagnostics.title': 'Diagnostics',
  // The diagnostics opt-in: the pane's one stream, its explicit debug switch,
  // its clear action and its empty/scope notes.
  'diagnostics.show_debug_events': 'Show debug events',
  'diagnostics.hide_debug_events': 'Hide debug events',
  'diagnostics.clear_action': 'Clear',
  'diagnostics.no_events': 'No SDK events recorded yet.',
  'diagnostics.stream_scope_note': 'Debug detail stays on until the app restarts.',
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
