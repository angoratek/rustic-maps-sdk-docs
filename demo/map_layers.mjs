// The on-map layer control and the device-location affordances: the shared
// identifiers, the wording and the pure decisions both the playground and its
// Playwright suites read, so the page and the tests cannot drift on a string
// (the same pattern as `map_controls.mjs`).
//
// The module names no provider and no vendor URL shape. Which base rows and
// which traffic capability exist comes from the shared provider descriptors
// the caller passes in; the helpers below only read their declared fields.

/**
 * The layers panel's collapsed control (a round button above the attribution
 * notice). It carries `aria-expanded` and `aria-controls` over the panel.
 */
export const MAP_LAYERS_CONTROL_IDENTIFIER = 'map-layers-control';

/** The panel the collapsed control opens. */
export const MAP_LAYERS_PANEL_IDENTIFIER = 'map-layers-panel';

/** The panel's own status line for a failed or refused layer action. */
export const MAP_LAYERS_STATUS_IDENTIFIER = 'map-layers-status';

/** One raster base row: `map-layer-base-<provider_key>`. */
export const MAP_LAYER_BASE_ROW_IDENTIFIER_PREFIX = 'map-layer-base-';

/** One committed vector style row: `map-layer-style-<style_id>`. */
export const MAP_LAYER_STYLE_ROW_IDENTIFIER_PREFIX = 'map-layer-style-';

/** One demo-scene switch: `map-layer-scene-<scene_key>`. */
export const MAP_LAYER_SCENE_ROW_IDENTIFIER_PREFIX = 'map-layer-scene-';

/** The traffic layer's switch. */
export const MAP_LAYER_TRAFFIC_IDENTIFIER = 'map-layer-traffic';

/** The panel's device-location status row. */
export const DEVICE_LOCATION_STATUS_IDENTIFIER = 'device-location-status';

/** The panel's Stop action for the device-location source. */
export const DEVICE_LOCATION_STOP_IDENTIFIER = 'device-location-stop';

/** The origin field's "My location" chip. */
export const ORIGIN_MY_LOCATION_CHIP_IDENTIFIER = 'origin-my-location';

/** The destination field's "My location" chip. */
export const DESTINATION_MY_LOCATION_CHIP_IDENTIFIER = 'destination-my-location';

/** The panel's section titles, in the order the specification fixes them. */
export const MAP_LAYERS_SECTION_TITLES = Object.freeze([
  'Base map',
  'Traffic',
  'Overlays',
]);

/** The text the active base row carries. */
export const MAP_LAYERS_SERVING_TEXT = 'Serving';

/** The text the collapsed control uses as its accessible name. */
export const MAP_LAYERS_CONTROL_LABEL = 'Map layers';

/** The class name of the collapsed control's non-default-layer dot. */
export const MAP_LAYERS_ACTIVE_DOT_CLASS_NAME = 'map-layers-active-dot';

/**
 * How long the camera must stay still before the traffic layer asks the
 * capability for the settled camera's bounds. Pans, zooms and eased moves
 * restart it, so one settle yields one request.
 */
export const TRAFFIC_REFRESH_DEBOUNCE_MILLISECONDS = 400;

/** The drawn width of one traffic-flow line, in screen pixels. */
export const TRAFFIC_FLOW_OVERLAY_WIDTH_PIXELS = 4;

/** The capability name a descriptor declares to serve traffic flow. */
export const TRAFFIC_FLOW_CAPABILITY_NAME = 'traffic_flow';

/** The device-location status names the panel's row renders. */
export const DEVICE_LOCATION_STATUS_NAMES = Object.freeze({
  off: 'off',
  waiting: 'waiting',
  active: 'active',
  permissionDenied: 'permissionDenied',
  unavailable: 'unavailable',
});

/** The panel's presentation text for each device-location status name. */
export const DEVICE_LOCATION_STATUS_TEXTS = Object.freeze({
  off: 'Off',
  waiting: 'Waiting for a fix',
  active: 'Active',
  permissionDenied: 'Permission denied',
  unavailable: 'Unavailable',
});

/** The text a chip carries once its field holds a device fix. */
export const MY_LOCATION_CHIP_FILLED_MARK = '·';

/** The display text a device fix writes into a route field. */
export function device_fix_display_text(latitude, longitude) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

/** The panel text for one device-location status name. */
export function device_location_status_text(status_name) {
  return DEVICE_LOCATION_STATUS_TEXTS[status_name]
    ?? DEVICE_LOCATION_STATUS_TEXTS.off;
}

/** The accessible name of one field's "My location" chip. */
export function my_location_chip_label(field_label) {
  return `Use my location as the ${field_label.toLowerCase()}`;
}

/**
 * Whether the collapsed control shows its non-default-layer dot. The default
 * layer is the raster base with traffic off and no demo scene enabled.
 */
export function is_non_default_layer_active({
  baseMode,
  rasterMode,
  trafficEnabled,
  enabledSceneCount,
}) {
  return baseMode !== rasterMode || trafficEnabled || enabledSceneCount > 0;
}

/** Whether a descriptor requires a runtime credential before it can serve. */
export function descriptor_requires_credential(provider_descriptor) {
  return typeof provider_descriptor.credential_label === 'string'
    && provider_descriptor.credential_label.trim() !== ''
    && provider_descriptor.registration_available?.wasm === true;
}

/** The disabled reason a row shows when its provider has no credential. */
export function needs_credential_text(provider_descriptor) {
  return `Needs ${provider_descriptor.credential_label}`;
}

/**
 * The base row's credential refusal, or null when the row is usable. A
 * fixture-served source never waits on a credential: the demo paints its
 * committed imagery same-origin, so disabling the row would strand the map.
 */
export function base_row_credential_refusal(
  provider_descriptor,
  applied_provider_keys,
  { servedFromFixtures = false } = {},
) {
  if (servedFromFixtures) return null;
  if (!descriptor_requires_credential(provider_descriptor)) return null;
  if (applied_provider_keys.has(provider_descriptor.provider_key)) return null;
  return needs_credential_text(provider_descriptor);
}

/**
 * The descriptor declaring the traffic-flow capability, or null when the
 * registry declares none. The first declaration wins; the registry is the
 * single source of truth, so no shell names a provider.
 */
export function traffic_capability_descriptor(provider_descriptors) {
  return provider_descriptors.find((provider_descriptor) =>
    Array.isArray(provider_descriptor.served_contracts)
    && provider_descriptor.served_contracts.includes(TRAFFIC_FLOW_CAPABILITY_NAME))
    ?? null;
}

/**
 * The traffic switch's availability: `available` with the serving descriptor,
 * `needsCredential` with the descriptor's refusal text, or `notConfigured`
 * when no descriptor declares the capability. A credential-requiring
 * descriptor counts as available only once its key is applied.
 */
export function traffic_layer_availability(provider_descriptors, applied_provider_keys) {
  const provider_descriptor = traffic_capability_descriptor(provider_descriptors);
  if (provider_descriptor === null) {
    return {
      state: 'notConfigured',
      providerDescriptor: null,
      reasonText: 'Not configured',
    };
  }
  if (descriptor_requires_credential(provider_descriptor)
    && !applied_provider_keys.has(provider_descriptor.provider_key)) {
    return {
      state: 'needsCredential',
      providerDescriptor: provider_descriptor,
      reasonText: needs_credential_text(provider_descriptor),
    };
  }
  return {
    state: 'available',
    providerDescriptor: provider_descriptor,
    reasonText: null,
  };
}
