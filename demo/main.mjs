// @ts-check
// Browser entry point: opens the generated WebAssembly module, starts the
// SDK, and exposes the compatibility surface on `window.mapTest` for the
// Playwright harness. The `window.mapTestReady` promise resolves only after
// `uniffiInitAsync` opened the module and the Rust-side runtime is ready, so
// tests can await readiness before asserting.
//
// The package is one generated `wasm2` module that carries two surfaces:
//
// - the contract namespace (`./generated/index.js`): the generated `MapSdk`
//   and its provider, search, plan, traffic and diagnostics members, the
//   generated `Navigator` and `PositionController`, plus the `SdkError` typed
//   failures and the pure projection/offline calls, initialized explicitly by
//   `uniffiInitAsync`;
// - the wasm-bindgen glue (`./generated/rustic_maps_bg.js`): the canvas
//   `BrowserMapView`, its camera and the keyless URL-template raster fallback.
//   Objects never cross the two ABIs, so the page keeps the glue's
//   `MapCamera` for canvas frames and the generated record types never reach
//   the canvas.
//
// The `window.mapTest` names and shapes the harness relies on are preserved
// here; the façade is the only place a generated difference is adapted.
import {
  DistancePhraseKind,
  DistanceUnit,
  GeocodeQuality,
  ManeuverInstructionTextKind,
  MapSdk as GeneratedMapSdk,
  NavigationPhase,
  NavigationPhaseChange,
  Navigator as GeneratedNavigator,
  PositionController as GeneratedPositionController,
  PositionSourceError,
  ProviderContract,
  RasterImageFormat,
  RasterTileResolution,
  RouteStrategy,
  SdkError_Tags,
  SdkLogSeverity,
  TrafficFlowCongestionLevel,
  TrafficIncidentSeverity,
  TrafficIncidentType,
  TransportationMode,
  UnitSystem,
  coordinateToNormalizedWorld as generated_coordinate_to_normalized_world,
  defaultDeviationPolicy,
  defaultStepAdvancePolicy,
  getSdkCompiledVersion,
  offlineRouteFromArchiveBytes as generated_offline_route_from_archive_bytes,
  tileKeyForCoordinate as generated_tile_key_for_coordinate,
  tilesCovering as generated_tiles_covering,
  uniffiInitAsync,
} from './generated/index.js';
import {
  BrowserMapView,
  MapCamera,
  TileResolution,
  clearProviderRegistrations as canvas_clear_provider_registrations,
  clearSharedProviderSlots,
  clearUrlTemplateRasterTileSource,
  devicePixelRatioThreshold,
  registerUrlTemplateRasterTileSource,
  setProviderBaseUrl,
} from './generated/rustic_maps_bg.js';

/**
 * A generated `SdkError` variant: the tagged failure the SDK throws and this
 * façade adapts back to the page's `{ code, message }` shape.
 * @typedef {import('./generated/index.js').SdkError} GeneratedSdkError
 */
// The generated contract record and enum types this façade reads, imported
// from the generated declarations so a renamed or removed field fails the
// static check instead of only a browser test.
/** @typedef {import('./generated/index.js').Place} GeneratedPlace */
/** @typedef {import('./generated/index.js').GeographicCoordinate} GeneratedCoordinate */
/** @typedef {import('./generated/index.js').BoundingBox} GeneratedBoundingBox */
/** @typedef {import('./generated/index.js').Route} GeneratedRoute */
/** @typedef {import('./generated/index.js').RouteOptions} GeneratedRouteOptions */
/** @typedef {import('./generated/index.js').NavigationLocationUpdate} GeneratedLocationUpdate */
/** @typedef {import('./generated/index.js').ManeuverInstructionText} GeneratedManeuverInstructionText */
/** @typedef {import('./generated/index.js').DistancePhrase} GeneratedDistancePhrase */
/** @typedef {import('./generated/index.js').TrafficIncident} GeneratedTrafficIncident */
/** @typedef {import('./generated/index.js').TrafficFlowData} GeneratedTrafficFlowData */
/** @typedef {import('./generated/index.js').TrafficFlowCacheStatistics} GeneratedTrafficFlowCacheStatistics */
/** @typedef {import('./generated/index.js').LogEvent} GeneratedLogEvent */
/**
 * The page's legacy failure shape: an `Error` carrying the lower-camel code
 * every harness assertion reads.
 * @typedef {Error & { code?: string }} PageFailure
 */
/**
 * The page window with the two members this module installs. The members are
 * assigned before any harness reads them; the map surface is typed only where
 * the façade itself touches it, because its values are the deliberately plain
 * legacy rows the browser tests assert on.
 * @typedef {Window & {
 *   mapTestReady: Promise<string>,
 *   mapTest: { mapSdk: GeneratedMapSdk } & Record<string, any>,
 * }} PageWindow
 */
/**
 * The page window typed with the compatibility surface this module installs.
 * The members are asserted here because the browser does not declare them;
 * this module assigns both before any harness reads them.
 */
const page_window = /** @type {PageWindow} */ (/** @type {unknown} */ (window));

/** The module the generated entrypoint opens, staged beside it. */
const GENERATED_MODULE_URL = new URL('./generated/rustic_maps.wasm', import.meta.url);

/** Every generated `SdkError` tag; a thrown object with one is a typed SDK failure. */
const GENERATED_SDK_ERROR_TAGS = new Set(Object.values(SdkError_Tags));

/**
 * The message each generated variant answers, reproducing the core SDK error
 * display the page's `{ code, message }` shape has always carried. The
 * generated record stores only the variant's payload (the detail text, or the
 * contract name), so the prefix is restored here; the two offline-routing
 * assertions read the core's `offline graph invalid:` prefix.
 * @type {Map<SdkError_Tags, (inner: { detail?: string, contractName?: string }) => string>}
 */
const GENERATED_ERROR_MESSAGE_BUILDERS = new Map([
  [
    SdkError_Tags.InvalidCoordinateInput,
    (inner) => `invalid coordinate input: ${inner.detail}`,
  ],
  [
    SdkError_Tags.NetworkRequestFailed,
    (inner) => `network request failed: ${inner.detail}`,
  ],
  [
    SdkError_Tags.ResponseParsingFailure,
    (inner) => `response parsing failure: ${inner.detail}`,
  ],
  [
    SdkError_Tags.ProviderRequestRejected,
    (inner) => `provider rejected request: ${inner.detail}`,
  ],
  [SdkError_Tags.RateLimitExhausted, () => 'rate limit exhausted'],
  [
    SdkError_Tags.ProviderNotConfigured,
    (inner) => `no provider configured for ${inner.contractName}`,
  ],
  [
    SdkError_Tags.InvalidNavigationInput,
    (inner) => `invalid navigation input: ${inner.detail}`,
  ],
  [
    SdkError_Tags.InvalidRenderInput,
    (inner) => `invalid render input: ${inner.detail}`,
  ],
  [
    SdkError_Tags.RenderingSurfaceUnavailable,
    (inner) => `rendering surface unavailable: ${inner.detail}`,
  ],
  [
    SdkError_Tags.CacheOperationFailure,
    (inner) => `cache operation failure: ${inner.detail}`,
  ],
  [
    SdkError_Tags.OfflineRoutingFailure,
    (inner) => `offline graph invalid: ${inner.detail}`,
  ],
]);

/**
 * Reads the generated `SdkError` tag from a thrown value, or null when the
 * value is not a generated SDK failure. The generated error is a tagged class
 * union; `tag` is its variant name.
 * @param {unknown} error
 * @returns {SdkError_Tags | null}
 */
function generated_sdk_error_tag(error) {
  if (error === null || typeof error !== 'object') {
    return null;
  }
  const generated_error = /** @type {GeneratedSdkError} */ (error);
  const tag = generated_error.tag;
  return typeof tag === 'string' && GENERATED_SDK_ERROR_TAGS.has(tag) ? tag : null;
}

/**
 * The message of a generated `SdkError`: the core display text for its
 * variant, built from the variant's own payload. A generated variant the
 * table does not know falls back to its payload verbatim.
 * @param {GeneratedSdkError} error
 * @param {SdkError_Tags} tag
 * @returns {string}
 */
function generated_sdk_error_message(error, tag) {
  // The generated payload differs per variant (`detail` or `contractName`),
  // and `RateLimitExhausted` carries none; the builder table reads whichever
  // field the variant carries.
  const inner = /** @type {{ detail?: string, contractName?: string }} */ (
    /** @type {{ inner?: unknown }} */ (error).inner ?? {}
  );
  const message_builder = GENERATED_ERROR_MESSAGE_BUILDERS.get(tag);
  if (message_builder !== undefined) {
    return message_builder(inner);
  }
  if (typeof inner.detail === 'string') {
    return inner.detail;
  }
  if (typeof inner.contractName === 'string') {
    return `no provider configured for ${inner.contractName}`;
  }
  return tag;
}

/**
 * Adapts a generated `SdkError` back to the `{ code, message }` failure shape
 * the page and its specs read (`error.code`, `error.message`, and
 * `String(error)` carrying the detail). A non-generated failure passes through
 * untouched, so a page-side `TypeError` keeps its own identity.
 * @param {unknown} error
 * @returns {unknown}
 */
function adapted_failure(error) {
  const tag = generated_sdk_error_tag(error);
  if (tag === null) {
    return error;
  }
  const adapted_error = /** @type {PageFailure} */ (
    new Error(
      generated_sdk_error_message(/** @type {GeneratedSdkError} */ (error), tag),
    )
  );
  // An empty `name` keeps `Error.prototype.toString` at the message alone, so
  // `String(error)` stays the verbatim detail every surface reported.
  adapted_error.name = '';
  adapted_error.code = legacy_failure_code(tag);
  return adapted_error;
}

/**
 * Runs one generated call and adapts its typed rejection.
 * @template T
 * @param {() => Promise<T> | T} call
 * @returns {Promise<T>}
 */
async function with_adapted_failure(call) {
  try {
    return await call();
  } catch (error) {
    throw adapted_failure(error);
  }
}

/**
 * Runs one synchronous generated call and adapts its typed rejection, keeping
 * the synchronous result the page's positional helpers have always returned.
 * @template T
 * @param {() => T} call
 * @returns {T}
 */
function with_adapted_sync_failure(call) {
  try {
    return call();
  } catch (error) {
    throw adapted_failure(error);
  }
}

/**
 * Builds a contract `GeographicCoordinate` from the page's positional degrees.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {GeneratedCoordinate}
 */
function geographic_coordinate(latitude, longitude) {
  return { latitude, longitude };
}

/**
 * The page's established failure codes are the generated `SdkError` variant
 * names in lower camel case (`ProviderNotConfigured` →
 * `providerNotConfigured`), the spelling every surface has always reported.
 * @param {string} tag
 * @returns {string}
 */
function legacy_failure_code(tag) {
  return tag.charAt(0).toLowerCase() + tag.slice(1);
}

/**
 * The contract spelling of a provider capability the page names. The page
 * spells capabilities as the contract enum (`Routing`, `RasterTiles`), the
 * registry's `…Provider` form, or the lowercase capability name; every form
 * reaches the same generated `ProviderContract` member.
 * @param {string} contract_name_text
 * @returns {ProviderContract}
 */
function provider_contract_from_name(contract_name_text) {
  const normalized = String(contract_name_text)
    .replace(/[^0-9A-Za-z]/g, '')
    .toLowerCase()
    .replace(/provider$/, '');
  switch (normalized) {
    case 'geocoding':
      return ProviderContract.Geocoding;
    case 'routing':
      return ProviderContract.Routing;
    case 'distancematrix':
      return ProviderContract.DistanceMatrix;
    case 'placesearch':
    case 'searchplace':
      return ProviderContract.PlaceSearch;
    case 'trafficincidents':
    case 'trafficincident':
      return ProviderContract.TrafficIncidents;
    case 'trafficflow':
      return ProviderContract.TrafficFlow;
    case 'elevation':
      return ProviderContract.Elevation;
    case 'rastertiles':
    case 'rastertile':
      return ProviderContract.RasterTiles;
    case 'vectortiles':
    case 'vectortile':
      return ProviderContract.VectorTiles;
    case 'offlinerouting':
      return ProviderContract.OfflineRouting;
    default:
      throw new Error(`"${contract_name_text}" is not a provider contract`);
  }
}

/**
 * The contract name a generated numeric enum member carries (`Geocoding`),
 * the text every readback the page consumes has always reported.
 * @param {Record<number, string>} enum_type
 * @param {number} value
 * @returns {string}
 */
function enum_member_name(enum_type, value) {
  const member_name = enum_type[value];
  return typeof member_name === 'string' ? member_name : String(value);
}

/**
 * One generated `Place` as the flat row the page and its specs read.
 * @param {GeneratedPlace} place
 */
function place_row_from_generated(place) {
  return {
    structuredAddressText: place.structuredAddressText,
    latitudeDegrees: place.coordinate.latitude,
    longitudeDegrees: place.coordinate.longitude,
    qualityText: enum_member_name(GeocodeQuality, place.geocodeQuality),
  };
}

/**
 * The generated place list as the flat rows every geocoding/search call answers.
 * @param {Array<GeneratedPlace>} places
 */
function place_rows_from_generated(places) {
  return places.map(place_row_from_generated);
}

/**
 * Reads a flat `[latitude, longitude, …]` array into the contract's
 * coordinates, refusing the same malformed shapes the browser seam refused.
 * @param {unknown} flat_values
 * @param {string} label
 * @returns {Array<{latitude: number, longitude: number}>}
 */
function coordinate_pairs_from_flat(flat_values, label) {
  if (
    !Array.isArray(flat_values)
    || flat_values.length === 0
    || flat_values.length % 2 !== 0
  ) {
    throw new Error(
      `${label} coordinates must be a non-empty, even-length [latitude, longitude, …] array`,
    );
  }
  const coordinates = [];
  for (let index = 0; index < flat_values.length; index += 2) {
    coordinates.push(geographic_coordinate(flat_values[index], flat_values[index + 1]));
  }
  return coordinates;
}

/**
 * Builds a contract `BoundingBox` from the page's four corners, refusing an
 * inverted box with the core's own wording before the SDK is asked.
 * @param {number} south_west_latitude
 * @param {number} south_west_longitude
 * @param {number} north_east_latitude
 * @param {number} north_east_longitude
 * @returns {GeneratedBoundingBox}
 */
function bounding_box_from_corners(
  south_west_latitude,
  south_west_longitude,
  north_east_latitude,
  north_east_longitude,
) {
  const south_west = geographic_coordinate(south_west_latitude, south_west_longitude);
  const north_east = geographic_coordinate(north_east_latitude, north_east_longitude);
  if (
    south_west.latitude > north_east.latitude
    || south_west.longitude > north_east.longitude
  ) {
    throw new Error('bounding box corners are inverted');
  }
  return { southWest: south_west, northEast: north_east };
}

/**
 * The contract's transportation mode for the page's name spelling.
 * @param {unknown} transportation_mode_name
 * @returns {TransportationMode}
 */
function transportation_mode_from_name(transportation_mode_name) {
  switch (String(transportation_mode_name).trim().toLowerCase()) {
    case 'automobile':
    case 'car':
      return TransportationMode.Automobile;
    case 'bicycle':
      return TransportationMode.Bicycle;
    case 'pedestrian':
    case 'walking':
      return TransportationMode.Pedestrian;
    default:
      throw new Error('the transportation mode must be automobile, bicycle or pedestrian');
  }
}

/**
 * Reads one optional route-option text field, refusing a non-string value.
 * @param {Record<string, unknown>} options
 * @param {string} field_name
 * @param {string} default_text
 * @returns {string}
 */
function route_option_text(options, field_name, default_text) {
  const field_value = options[field_name];
  if (field_value === undefined || field_value === null) {
    return default_text;
  }
  if (typeof field_value !== 'string') {
    throw new Error(`the route option ${field_name} must be a string`);
  }
  return field_value;
}

/**
 * Reads one optional route-option boolean field, defaulting to false.
 * @param {Record<string, unknown>} options
 * @param {string} field_name
 * @returns {boolean}
 */
function route_option_boolean(options, field_name) {
  const field_value = options[field_name];
  if (field_value === undefined || field_value === null) {
    return false;
  }
  if (typeof field_value !== 'boolean') {
    throw new Error(`the route option ${field_name} must be a boolean`);
  }
  return field_value;
}

/**
 * The contract route options the SDK defaults to: automobile, fastest,
 * metric, no avoids, departing now.
 * @returns {GeneratedRouteOptions}
 */
function default_route_options() {
  return {
    transportationMode: TransportationMode.Automobile,
    routeStrategy: RouteStrategy.Fastest,
    unitSystem: UnitSystem.Metric,
    avoidOptions: {
      tollRoads: false,
      limitedAccessHighways: false,
      ferries: false,
      unpavedRoads: false,
    },
  };
}

/**
 * The deepest departure instant a contract route request accepts: the last
 * exactly representable integer second, the browser seam's own bound.
 */
const MAXIMUM_DEPARTURE_TIMESTAMP_SECONDS = Number.MAX_SAFE_INTEGER;

/**
 * Reads the page's plain route-options object into the contract record,
 * refusing unknown enum names and malformed fields before a provider is
 * asked, with the same details the browser seam always answered.
 * @param {unknown} options
 * @returns {GeneratedRouteOptions}
 */
function route_options_from_object(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('the route options argument must be an object');
  }
  // The page argument is untyped input; it is validated below, so the reads
  // go through a plain string-keyed record.
  const page_options = /** @type {Record<string, unknown>} */ (options);
  const transportationMode = transportation_mode_from_name(
    route_option_text(page_options, 'transportationMode', 'automobile'),
  );
  const route_strategy_text = route_option_text(
    page_options,
    'routeStrategy',
    'fastest',
  ).trim().toLowerCase();
  let routeStrategy;
  if (route_strategy_text === 'fastest') {
    routeStrategy = RouteStrategy.Fastest;
  } else if (route_strategy_text === 'shortest') {
    routeStrategy = RouteStrategy.Shortest;
  } else {
    throw new Error('the route strategy must be fastest or shortest');
  }
  const unit_system_text = route_option_text(
    page_options,
    'unitSystem',
    'metric',
  ).trim().toLowerCase();
  let unitSystem;
  if (unit_system_text === 'metric') {
    unitSystem = UnitSystem.Metric;
  } else if (unit_system_text === 'imperial') {
    unitSystem = UnitSystem.Imperial;
  } else {
    throw new Error('the unit system must be metric or imperial');
  }
  const avoid_field = page_options.avoidOptions;
  let avoidOptions = {
    tollRoads: false,
    limitedAccessHighways: false,
    ferries: false,
    unpavedRoads: false,
  };
  if (avoid_field !== undefined && avoid_field !== null) {
    if (typeof avoid_field !== 'object' || Array.isArray(avoid_field)) {
      throw new Error('the avoidOptions field must be an object');
    }
    const avoid_options = /** @type {Record<string, unknown>} */ (avoid_field);
    avoidOptions = {
      tollRoads: route_option_boolean(avoid_options, 'tollRoads'),
      limitedAccessHighways: route_option_boolean(avoid_options, 'limitedAccessHighways'),
      ferries: route_option_boolean(avoid_options, 'ferries'),
      unpavedRoads: route_option_boolean(avoid_options, 'unpavedRoads'),
    };
  }
  const departure_field = page_options.departureTimestampSeconds;
  let departureTimestampSeconds;
  if (departure_field !== undefined && departure_field !== null) {
    if (typeof departure_field !== 'number') {
      throw new Error('the departure timestamp must be a number of seconds');
    }
    if (
      !Number.isFinite(departure_field)
      || departure_field < 0
      || departure_field > MAXIMUM_DEPARTURE_TIMESTAMP_SECONDS
    ) {
      throw new Error(
        'the departure timestamp must be finite, non-negative and within the u64 second range',
      );
    }
    departureTimestampSeconds = BigInt(departure_field);
  }
  return {
    transportationMode,
    routeStrategy,
    unitSystem,
    avoidOptions,
    departureTimestampSeconds,
  };
}

/**
 * One generated `TrafficIncident` in the page's plain row shape.
 * @param {GeneratedTrafficIncident} incident
 */
function traffic_incident_row_from_generated(incident) {
  return {
    identifier: incident.identifier,
    incidentType: enum_member_name(TrafficIncidentType, incident.incidentType),
    severity: enum_member_name(TrafficIncidentSeverity, incident.severity),
    shortDescriptionText: incident.shortDescriptionText,
    startCoordinate: incident.startCoordinate,
    endCoordinate: incident.endCoordinate ?? null,
  };
}

/**
 * One generated `TrafficFlowData` in the page's plain row shape.
 * @param {GeneratedTrafficFlowData} flow_row
 */
function traffic_flow_row_from_generated(flow_row) {
  return {
    shapeCoordinates: flow_row.shapeCoordinates,
    currentSpeedKilometersPerHour: flow_row.currentSpeedKilometersPerHour ?? null,
    freeFlowSpeedKilometersPerHour: flow_row.freeFlowSpeedKilometersPerHour ?? null,
    congestionLevel: enum_member_name(
      TrafficFlowCongestionLevel,
      flow_row.congestionLevel,
    ),
  };
}

/**
 * The generated traffic-flow counters as the plain numbers the page compares
 * against: the contract carries them as 64-bit integers, which reach
 * JavaScript as `bigint`.
 * @param {GeneratedTrafficFlowCacheStatistics | undefined} statistics
 */
function traffic_flow_cache_statistics_from_generated(statistics) {
  if (statistics === undefined || statistics === null) {
    return null;
  }
  return {
    hitCount: Number(statistics.hitCount),
    missCount: Number(statistics.missCount),
    entryCount: Number(statistics.entryCount),
    evictionCount: Number(statistics.evictionCount),
    segmentCount: Number(statistics.segmentCount),
    gridZoomLevel: Number(statistics.gridZoomLevel),
    maximumEntryCount: Number(statistics.maximumEntryCount),
    timeToLiveSeconds: Number(statistics.timeToLiveSeconds),
  };
}

/**
 * One generated `LogEvent` in the shape the console and its specs read: the
 * severity as its contract name, the timestamp as a number, and the provider
 * request under `providerRequest` with its 64-bit counters converted.
 * @param {GeneratedLogEvent} event
 */
function diagnostic_event_from_generated(event) {
  const provider_request_trace = event.providerRequestTrace;
  return {
    timestampMillisecondsSinceEpoch: Number(event.timestampMillisecondsSinceEpoch),
    severity: enum_member_name(SdkLogSeverity, event.severity),
    subsystemTarget: event.subsystemTarget,
    messageLine: event.messageLine,
    providerRequest: provider_request_trace === undefined || provider_request_trace === null
      ? null
      : {
        providerKey: provider_request_trace.providerKey,
        providerContract: provider_request_trace.providerContract,
        httpMethod: provider_request_trace.httpMethod,
        requestPath: provider_request_trace.requestPath,
        statusClass: provider_request_trace.statusClass,
        outcome: provider_request_trace.outcome,
        durationMilliseconds: Number(provider_request_trace.durationMilliseconds),
        responseBytes: Number(provider_request_trace.responseBytes),
        responseExcerpt: provider_request_trace.responseExcerpt ?? null,
      },
  };
}

/**
 * The listener the page's readout subscribes with: the browser surface has
 * no live-event consumer, so it lowers the recording gate and discards each
 * delivered event, exactly as the wasm seam's own subscription did.
 */
const PAGE_DIAGNOSTIC_LISTENER = {
  onDiagnosticEvent() {},
};

// ---------------------------------------------------------------------------
// Navigation and positioning adapters. The contract carries typed topic
// listeners, policy records and numeric enums; the page and its harness read
// one callback-style event stream and plain snapshot. These adapters are the
// only place those generated differences are mapped, so the `window.mapTest`
// member names and shapes stay exactly as they were.
// ---------------------------------------------------------------------------

/**
 * Builds one failure carrying the page's legacy `{ code, message }` shape,
 * used where the adapter itself refuses an argument (a spelling the generated
 * enum cannot take).
 * @param {string} code
 * @param {string} message
 * @returns {PageFailure}
 */
function legacy_named_failure(code, message) {
  const failure = /** @type {PageFailure} */ (new Error(message));
  // An empty `name` keeps `Error.prototype.toString` at the message alone.
  failure.name = '';
  failure.code = code;
  return failure;
}

/**
 * The generated `UnitSystem` member for the page's `"metric"`/`"imperial"`.
 * @param {string} unit_system_name
 * @returns {UnitSystem}
 */
function unit_system_from_page_name(unit_system_name) {
  switch (unit_system_name) {
    case 'metric':
      return UnitSystem.Metric;
    case 'imperial':
      return UnitSystem.Imperial;
    default:
      throw legacy_named_failure(
        'invalidNavigationInput',
        `the unit system must be "metric" or "imperial", not \`${unit_system_name}\``,
      );
  }
}

/**
 * The page's `phase` spelling for a generated `NavigationPhase` member.
 * @param {NavigationPhase} navigation_phase
 * @returns {string}
 */
function navigation_phase_text(navigation_phase) {
  switch (navigation_phase) {
    case NavigationPhase.Navigating:
      return 'navigating';
    case NavigationPhase.OffRoute:
      return 'offRoute';
    case NavigationPhase.Arrived:
      return 'arrived';
    default:
      return String(navigation_phase);
  }
}

/**
 * The page's `phaseChange` spelling for a generated `NavigationPhaseChange`.
 * @param {NavigationPhaseChange} navigation_phase_change
 * @returns {string}
 */
function navigation_phase_change_text(navigation_phase_change) {
  switch (navigation_phase_change) {
    case NavigationPhaseChange.OffRouteEntered:
      return 'offRouteEntered';
    case NavigationPhaseChange.OffRouteCleared:
      return 'offRouteCleared';
    case NavigationPhaseChange.RerouteApplied:
      return 'rerouteApplied';
    case NavigationPhaseChange.Arrived:
      return 'arrived';
    default:
      return String(navigation_phase_change);
  }
}

/**
 * The canonical distance phrase text the page's banner line shows (`"now"`,
 * `"130 meters"`, …), reproduced from the contract's phrase record with the
 * same increments the SDK rounds it to.
 * @param {GeneratedDistancePhrase} distance_phrase
 * @returns {string}
 */
function distance_phrase_text(distance_phrase) {
  switch (distance_phrase.phraseKind) {
    case DistancePhraseKind.Immediate:
      return 'now';
    case DistancePhraseKind.Suppressed:
      return '';
    case DistancePhraseKind.Quantity:
      switch (distance_phrase.magnitudeUnit) {
        case DistanceUnit.Meters:
          return `${(distance_phrase.magnitude ?? 0).toFixed(0)} meters`;
        case DistanceUnit.Kilometers:
          return `${(distance_phrase.magnitude ?? 0).toFixed(1)} kilometers`;
        case DistanceUnit.Feet:
          return `${(distance_phrase.magnitude ?? 0).toFixed(0)} feet`;
        case DistanceUnit.Miles:
          return `${(distance_phrase.magnitude ?? 0).toFixed(1)} miles`;
        default:
          return '';
      }
    default:
      return '';
  }
}

/**
 * The page's banner channels for one generated `ManeuverInstructionText`: the
 * composed display and speech strings, and the provider-authored display
 * sentence when the provider wrote one. An unavailable variant answers the
 * empty strings and a null provider sentence, exactly as the browser seam
 * always did (nothing is invented).
 * @param {GeneratedManeuverInstructionText} maneuver_instruction_text
 * @returns {{ displayText: string, speechText: string, providerDisplayText: string | null }}
 */
function maneuver_text_fields(maneuver_instruction_text) {
  if (maneuver_instruction_text.textKind === ManeuverInstructionTextKind.Unavailable) {
    return { displayText: '', speechText: '', providerDisplayText: null };
  }
  const provider_display_text = maneuver_instruction_text.providerDisplayText ?? '';
  return {
    displayText: maneuver_instruction_text.composedDisplayText ?? '',
    speechText: maneuver_instruction_text.composedSpeechText ?? '',
    providerDisplayText: provider_display_text === '' ? null : provider_display_text,
  };
}

/**
 * The page's trip snapshot: the generated `TripNavigationState` and
 * `NavigationInstruction` projected into the flat object every navigation
 * consumer has read. Enums become the page's spellings, the 64-bit step
 * position becomes a number, and the deviation is carried exactly while the
 * phase is off route (the seam's snapshot rule).
 * @param {GeneratedNavigator} generated_navigator
 * @returns {object | null}
 */
function navigation_snapshot_from_generated(generated_navigator) {
  const trip_state = generated_navigator.currentTripState();
  if (trip_state === null || trip_state === undefined) {
    return null;
  }
  const instruction = generated_navigator.currentInstructions();
  if (instruction === null || instruction === undefined) {
    return null;
  }
  const active_text = maneuver_text_fields(instruction.activeManeuver.instruction);
  const upcoming_text = instruction.upcomingManeuver === null
    || instruction.upcomingManeuver === undefined
    ? null
    : maneuver_text_fields(instruction.upcomingManeuver.instruction);
  const is_off_route = trip_state.phase === NavigationPhase.OffRoute;
  const deviation = is_off_route
    && trip_state.deviation !== null
    && trip_state.deviation !== undefined
    ? {
      statusChangeKind: 'OffRoute',
      distanceFromRouteMeters: trip_state.deviation.deviationFromRouteMeters,
    }
    : null;
  const snapped_coordinate = trip_state.snappedCoordinate === null
    || trip_state.snappedCoordinate === undefined
    ? null
    : {
      latitude: trip_state.snappedCoordinate.latitude,
      longitude: trip_state.snappedCoordinate.longitude,
    };
  return {
    phase: navigation_phase_text(trip_state.phase),
    instruction: {
      activeManeuver: {
        displayText: active_text.displayText,
        speechText: active_text.speechText,
        distancePhraseText: distance_phrase_text(instruction.activeManeuver.distancePhrase),
        providerDisplayText: active_text.providerDisplayText,
      },
      upcomingManeuver: upcoming_text === null
        ? null
        : {
          displayText: upcoming_text.displayText,
          speechText: upcoming_text.speechText,
          providerDisplayText: null,
        },
      progress: {
        distanceToNextManeuverMeters: trip_state.progress.distanceToNextManeuverMeters,
        distanceRemainingMeters: trip_state.progress.distanceRemainingMeters,
        durationRemainingSeconds: trip_state.progress.durationRemainingSeconds,
      },
      isArrival: instruction.isArrival,
      isReroutingRequired: instruction.isReroutingRequired,
    },
    deviation,
    snappedCoordinate: snapped_coordinate,
    isArrived: trip_state.phase === NavigationPhase.Arrived,
    currentStepIndex: Number(trip_state.currentStepPosition),
  };
}

/**
 * The page's route object as the generated `Route` record: every field the
 * contract requires is present, and the `geometry` field an assembled route
 * may omit becomes the empty polyline its steps carry, exactly as the browser
 * seam defaulted it.
 * @param {Record<string, any>} route The page's legacy assembled route; its
 *   fields are the SDK's own route record, and the return type checks them.
 * @returns {GeneratedRoute}
 */
function generated_route_from_page(route) {
  return {
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    boundingBox: route.boundingBox,
    geometry: route.geometry ?? [],
    legs: route.legs,
  };
}

/**
 * The page's fix object as the generated `NavigationLocationUpdate`. The
 * page's null optionals become the generated record's undefined optionals:
 * the generated converter distinguishes the two.
 * @param {Record<string, any>} update The page's legacy fix shape; the return
 *   type checks every field against the generated record.
 * @returns {GeneratedLocationUpdate}
 */
function generated_location_update_from_page(update) {
  return {
    coordinate: {
      latitude: update.coordinate.latitude,
      longitude: update.coordinate.longitude,
    },
    horizontalAccuracyMeters: update.horizontalAccuracyMeters ?? undefined,
    courseHeadingDegrees: update.courseHeadingDegrees ?? undefined,
    timestampSeconds: update.timestampSeconds ?? undefined,
  };
}

/**
 * The page's `Navigator`: the generated contract controller behind the
 * callback-style surface the page and its harness consume. The generated
 * class delivers typed topic callbacks and takes policy records; this adapter
 * registers one bridge listener, records the dispatched topics, and emits the
 * single `{ topic, snapshot, speechText?, phaseChange? }` stream once the
 * controller call returns, so the snapshot always describes the state that
 * produced it. `updateLocation` keeps answering the snapshot; the policies
 * are the SDK defaults the browser seam always installed.
 */
class PageNavigator {
  constructor() {
    this.generated_navigator = new GeneratedNavigator();
    this.page_listeners = new Map();
    this.next_listener_identifier = 1;
    this.pending_events = [];
    // The foreign listener object every topic reaches; kept referenced so the
    // callback handle's JavaScript side cannot be collected.
    this.bridge_listener = {
      onNavigationInstruction: () => {
        this.pending_events.push({ topic: 'instruction' });
      },
      onDeviationStatusChange: () => {
        this.pending_events.push({ topic: 'deviation' });
      },
      onNavigationPhaseChange: (navigation_phase_change) => {
        this.pending_events.push({
          topic: 'phase',
          phaseChange: navigation_phase_change_text(navigation_phase_change),
        });
      },
      onSpeechInstruction: (speech_instruction) => {
        this.pending_events.push({
          topic: 'speech',
          speechText: speech_instruction.utteranceSpeechText,
        });
      },
    };
    this.generated_subscription =
      this.generated_navigator.addNavigationListener(this.bridge_listener);
  }

  /**
   * Registers one callback on the event stream and answers its identifier.
   * @param {(event: object) => void} listener
   * @returns {number}
   */
  addNavigationListener(listener) {
    const listener_identifier = this.next_listener_identifier;
    this.next_listener_identifier += 1;
    this.page_listeners.set(listener_identifier, listener);
    return listener_identifier;
  }

  /**
   * Removes one registered callback and answers whether it was registered.
   * @param {number} listener_identifier
   * @returns {boolean}
   */
  removeNavigationListener(listener_identifier) {
    return this.page_listeners.delete(listener_identifier);
  }

  /** Hands one event to every live callback; a throwing callback is ignored. */
  deliver_navigation_event(event) {
    for (const listener of this.page_listeners.values()) {
      try {
        listener(event);
      } catch {
        // Navigation is the primary job; events are best effort.
      }
    }
  }

  /**
   * Emits the topics dispatched by the controller call that just returned,
   * all against the state that call produced, and answers that snapshot.
   * @param {object | null} [snapshot] Pre-composed state, when the caller
   *   already read it.
   * @returns {object | null}
   */
  emit_pending_navigation_events(snapshot = undefined) {
    const resolved_snapshot = snapshot === undefined
      ? navigation_snapshot_from_generated(this.generated_navigator)
      : snapshot;
    const pending_events = this.pending_events;
    this.pending_events = [];
    if (resolved_snapshot === null) {
      return null;
    }
    for (const pending_event of pending_events) {
      const event = { topic: pending_event.topic, snapshot: resolved_snapshot };
      if (pending_event.speechText !== undefined) {
        event.speechText = pending_event.speechText;
      }
      if (pending_event.phaseChange !== undefined) {
        event.phaseChange = pending_event.phaseChange;
      }
      this.deliver_navigation_event(event);
    }
    return resolved_snapshot;
  }

  /**
   * Begins navigating `route` in `unit_system` (`"metric"` or `"imperial"`)
   * with the SDK default step-advance and deviation policies, replacing any
   * active trip. The trip-start stream is the initial instruction payload,
   * the phase topic (which names no transition at start) and the speech line
   * when the composition carries one.
   * @param {Record<string, any>} route
   * @param {string} unit_system_name
   */
  startNavigation(route, unit_system_name) {
    this.pending_events = [];
    try {
      this.generated_navigator.startNavigation(
        generated_route_from_page(route),
        unit_system_from_page_name(unit_system_name),
        defaultStepAdvancePolicy(),
        defaultDeviationPolicy(),
      );
    } catch (failure) {
      this.pending_events = [];
      throw adapted_failure(failure);
    }
    const snapshot = navigation_snapshot_from_generated(this.generated_navigator);
    if (snapshot === null) {
      this.pending_events = [];
      return;
    }
    this.pending_events.push({ topic: 'phase' });
    const speech_text = snapshot.instruction.activeManeuver.speechText;
    if (speech_text !== '') {
      this.pending_events.push({ topic: 'speech', speechText: speech_text });
    }
    this.emit_pending_navigation_events(snapshot);
  }

  /**
   * Delivers one position fix to the active trip and answers the resulting
   * snapshot, or null without an active trip (the fix is then dropped).
   * @param {Record<string, any>} update
   * @returns {object | null}
   */
  updateLocation(update) {
    this.pending_events = [];
    try {
      this.generated_navigator.updateLocation(
        generated_location_update_from_page(update),
      );
    } catch (failure) {
      this.pending_events = [];
      throw adapted_failure(failure);
    }
    return this.emit_pending_navigation_events();
  }

  /**
   * Replaces the active trip's route (a reroute); without an active trip the
   * route is dropped. The replacement uses the SDK default step-advance
   * policy, as the browser seam always did.
   * @param {Record<string, any>} route
   */
  applyReroute(route) {
    this.pending_events = [];
    try {
      this.generated_navigator.applyReroute(
        generated_route_from_page(route),
        defaultStepAdvancePolicy(),
      );
    } catch (failure) {
      this.pending_events = [];
      throw adapted_failure(failure);
    }
    this.emit_pending_navigation_events();
  }

  /** Ends the active trip and emits the wasm-only stop topic. */
  stopNavigation() {
    this.generated_navigator.stopNavigation();
    this.pending_events = [];
    this.deliver_navigation_event({ topic: 'stop', snapshot: null });
  }

  /** The latest trip snapshot, or null without an active trip. */
  currentTripState() {
    return navigation_snapshot_from_generated(this.generated_navigator);
  }

  /** Whether a trip is active. */
  hasActiveTrip() {
    const trip_state = this.generated_navigator.currentTripState();
    return trip_state !== null && trip_state !== undefined;
  }
}

/** The page's source-status name by generated `PositionSourceError` member. */
const POSITION_SOURCE_ERROR_NAME_BY_MEMBER = new Map([
  [PositionSourceError.PermissionDenied, 'permissionDenied'],
  [PositionSourceError.ServiceDisabled, 'serviceDisabled'],
  [PositionSourceError.Unavailable, 'unavailable'],
  [PositionSourceError.Timeout, 'timeout'],
]);

/** The generated `PositionSourceError` member by the page's status name. */
const POSITION_SOURCE_ERROR_MEMBER_BY_NAME = new Map(
  [...POSITION_SOURCE_ERROR_NAME_BY_MEMBER].map(
    ([source_error_member, source_error_name]) => [source_error_name, source_error_member],
  ),
);

/**
 * The page's `PositionController`: the generated contract controller behind
 * the page's positional fix signature and named source statuses. The fix
 * record, the nullable scalars and the source-status enum are adapted here;
 * validation, smoothing and staleness stay in the Rust controller.
 */
class PagePositionController {
  constructor() {
    this.generated_position_controller = new GeneratedPositionController();
  }

  /**
   * Feeds one fix from the page's geolocation source. The controller validates
   * every scalar and refuses an invalid fix with the contract's typed failure,
   * adapted to the page's `{ code, message }` shape.
   */
  feedFix(
    latitude,
    longitude,
    horizontal_accuracy_meters,
    course_heading_degrees,
    timestamp_seconds,
  ) {
    return with_adapted_sync_failure(() => {
      this.generated_position_controller.feedFix({
        coordinate: { latitude, longitude },
        horizontalAccuracyMeters: horizontal_accuracy_meters ?? undefined,
        courseHeadingDegrees: course_heading_degrees ?? undefined,
        timestampSeconds: timestamp_seconds ?? undefined,
      });
    });
  }

  /** Records a source failure by its documented page name. */
  sourceFailed(status_name) {
    const source_error = POSITION_SOURCE_ERROR_MEMBER_BY_NAME.get(status_name);
    if (source_error === undefined) {
      throw legacy_named_failure(
        'invalidArgument',
        'the position source status must be permissionDenied, serviceDisabled, '
        + `unavailable or timeout, got ${status_name}`,
      );
    }
    this.generated_position_controller.sourceFailed(source_error);
  }

  /** The latest accepted fix in the page's flat shape, or null before one. */
  latestFix() {
    const latest_fix = this.generated_position_controller.latestFix();
    if (latest_fix === null || latest_fix === undefined) {
      return null;
    }
    return {
      latitude: latest_fix.coordinate.latitude,
      longitude: latest_fix.coordinate.longitude,
      horizontalAccuracyMeters: latest_fix.horizontalAccuracyMeters ?? null,
      courseHeadingDegrees: latest_fix.courseHeadingDegrees ?? null,
      timestampSeconds: latest_fix.timestampSeconds ?? null,
    };
  }

  /** The smoothed course in degrees clockwise from true north, or null. */
  smoothedCourseDegrees() {
    return this.generated_position_controller.smoothedCourseDegrees();
  }

  /** Whether the latest fix is older than the threshold at `now_seconds`. */
  isStale(now_seconds) {
    return this.generated_position_controller.isStale(now_seconds);
  }

  /** The last source failure's name, or null when the last event was a fix. */
  sourceStatus() {
    const source_error = this.generated_position_controller.sourceStatus();
    if (source_error === null || source_error === undefined) {
      return null;
    }
    return POSITION_SOURCE_ERROR_NAME_BY_MEMBER.get(source_error) ?? null;
  }
}

page_window.mapTestReady = (async () => {
  await uniffiInitAsync(GENERATED_MODULE_URL);
  // The contract SDK every provider, search, plan and diagnostics call
  // resolves through. It is created before the canvas root because its
  // constructor installs the process-wide diagnostics subscriber the
  // readout below reads; a second constructor is the page's Clear act.
  let generated_map_sdk = new GeneratedMapSdk();
  // The compiled version the readiness status reports; the generated contract
  // and the canvas are one module, so the namespace helper is the one source.
  const compiled_version = getSdkCompiledVersion();
  page_window.mapTest = {
    // The canvas surface is the generated glue's `BrowserMapView`. The
    // generated contract `MapView` is stripped from the browser contract and
    // must never reach the page; the alias names the one canvas class the
    // page owns.
    MapCamera,
    MapView: BrowserMapView,
    // The generated contract root, the worked example's `mapSdk` identifier
    // on every platform. The page's provider calls below bind to the same
    // instance; the Clear act replaces it.
    mapSdk: generated_map_sdk,
    Navigator: PageNavigator,
    PositionController: PagePositionController,
    TileResolution,
    SdkLogSeverity,
    // The contract-only pure calls run on the generated surface. Their
    // positional page signatures are preserved here, and the record shapes
    // the generated contract takes are built at this boundary.
    coordinateToNormalizedWorld: (latitude, longitude) =>
      with_adapted_sync_failure(() =>
        generated_coordinate_to_normalized_world(geographic_coordinate(latitude, longitude)),
      ),
    tileKeyForCoordinate: (latitude, longitude, zoom_level) =>
      with_adapted_sync_failure(() =>
        generated_tile_key_for_coordinate(
          geographic_coordinate(latitude, longitude),
          zoom_level,
        ),
      ),
    tilesCovering: (
      south_west_latitude,
      south_west_longitude,
      north_east_latitude,
      north_east_longitude,
      zoom_level,
    ) =>
      with_adapted_sync_failure(() =>
        generated_tiles_covering(
          {
            southWest: geographic_coordinate(south_west_latitude, south_west_longitude),
            northEast: geographic_coordinate(north_east_latitude, north_east_longitude),
          },
          zoom_level,
        ),
      ),
    getSdkCompiledVersion,
    devicePixelRatioThreshold,
    offlineRouteFromArchiveBytes: (
      archive_bytes,
      start_latitude,
      start_longitude,
      end_latitude,
      end_longitude,
    ) =>
      with_adapted_failure(() =>
        generated_offline_route_from_archive_bytes(
          archive_bytes,
          geographic_coordinate(start_latitude, start_longitude),
          geographic_coordinate(end_latitude, end_longitude),
        ),
      ),
    // Providers, search, plans, traffic and raster tiles resolve through the
    // generated contract registry. The page's positional signatures and row
    // shapes are preserved at this boundary; the generated records, enums
    // and 64-bit counters are adapted here.
    configureProvider: (contract, provider_key, credential) =>
      with_adapted_sync_failure(() =>
        generated_map_sdk.configureProvider(
          provider_contract_from_name(contract),
          provider_key,
          credential,
        ),
      ),
    configureProviderSet: (provider_key, credential) =>
      with_adapted_sync_failure(() =>
        generated_map_sdk.configureProviderSet(provider_key, credential),
      ),
    setProviderBaseUrl,
    // The contract has no clear member: drop the provider mirrors the
    // generated registry published to the canvas, clear the canvas' own
    // transport slots, and replace the SDK instance so its native registry
    // goes with it. The keyless URL-template fallback survives, exactly as it
    // always has.
    clearProviderRegistrations: () => {
      canvas_clear_provider_registrations();
      clearSharedProviderSlots();
      generated_map_sdk = new GeneratedMapSdk();
      page_window.mapTest.mapSdk = generated_map_sdk;
    },
    providerRegistrations: () =>
      generated_map_sdk.providerRegistrations().map((registration) => ({
        contract: enum_member_name(ProviderContract, registration.contract),
        providerKey: registration.providerKey,
        displayName: registration.displayName,
        registered: registration.registered,
      })),
    routeCapabilities: () =>
      with_adapted_sync_failure(() => {
        const capabilities = generated_map_sdk.routeCapabilities();
        return {
          supportedTransportationModes: capabilities.supportedTransportationModes.map(
            (transportation_mode) =>
              enum_member_name(TransportationMode, transportation_mode),
          ),
          supportsShortestRouteStrategy: capabilities.supportsShortestRouteStrategy,
        };
      }),
    forwardGeocode: (query_text) =>
      with_adapted_failure(async () =>
        place_rows_from_generated(await generated_map_sdk.forwardGeocode(query_text)),
      ),
    reverseGeocode: (latitude, longitude) =>
      with_adapted_failure(async () =>
        place_rows_from_generated(
          await generated_map_sdk.reverseGeocode(
            geographic_coordinate(latitude, longitude),
          ),
        ),
      ),
    fetchElevationPoints: (point_coordinates) =>
      with_adapted_failure(async () => {
        const elevation_points = await generated_map_sdk.fetchElevationPoints(
          coordinate_pairs_from_flat(point_coordinates, 'elevation point'),
        );
        return elevation_points.map((elevation_point) => ({
          latitude: elevation_point.coordinate.latitude,
          longitude: elevation_point.coordinate.longitude,
          elevationMeters: elevation_point.elevationMeters,
        }));
      }),
    // The URL-template raster source is the canvas' keyless fallback, not a
    // configured provider: the generated registry deliberately does not see
    // it, so its two members stay on the browser transport.
    registerUrlTemplateRasterTileSource,
    clearUrlTemplateRasterTileSource,
    suggestPlaces: (query_text) =>
      with_adapted_failure(async () =>
        place_rows_from_generated(
          await generated_map_sdk.suggest(query_text, undefined),
        ),
      ),
    suggestPlacesInBoundary: (
      query_text,
      south_west_latitude,
      south_west_longitude,
      north_east_latitude,
      north_east_longitude,
    ) =>
      with_adapted_failure(async () =>
        place_rows_from_generated(
          await generated_map_sdk.suggest(
            query_text,
            bounding_box_from_corners(
              south_west_latitude,
              south_west_longitude,
              north_east_latitude,
              north_east_longitude,
            ),
          ),
        ),
      ),
    searchPlaces: (query_text) =>
      with_adapted_failure(async () =>
        place_rows_from_generated(await generated_map_sdk.search(query_text, undefined)),
      ),
    searchPlacesInBoundary: (
      query_text,
      south_west_latitude,
      south_west_longitude,
      north_east_latitude,
      north_east_longitude,
    ) =>
      with_adapted_failure(async () =>
        place_rows_from_generated(
          await generated_map_sdk.search(
            query_text,
            bounding_box_from_corners(
              south_west_latitude,
              south_west_longitude,
              north_east_latitude,
              north_east_longitude,
            ),
          ),
        ),
      ),
    calculateRoute: (
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
    ) =>
      with_adapted_failure(() =>
        generated_map_sdk.calculateRoute(
          [
            geographic_coordinate(origin_latitude, origin_longitude),
            geographic_coordinate(destination_latitude, destination_longitude),
          ],
          default_route_options(),
        ),
      ),
    calculateRouteWithOptions: (
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      options,
    ) =>
      with_adapted_failure(() =>
        generated_map_sdk.calculateRoute(
          [
            geographic_coordinate(origin_latitude, origin_longitude),
            geographic_coordinate(destination_latitude, destination_longitude),
          ],
          route_options_from_object(options),
        ),
      ),
    calculateDistanceMatrix: (
      origin_coordinates,
      destination_coordinates,
      transportation_mode,
    ) =>
      with_adapted_failure(async () => {
        const distance_matrix = await generated_map_sdk.calculateDistanceMatrix(
          coordinate_pairs_from_flat(origin_coordinates, 'origin'),
          coordinate_pairs_from_flat(destination_coordinates, 'destination'),
          transportation_mode_from_name(transportation_mode),
        );
        return distance_matrix.entries;
      }),
    fetchTrafficIncidents: (
      south_west_latitude,
      south_west_longitude,
      north_east_latitude,
      north_east_longitude,
    ) =>
      with_adapted_failure(async () => {
        const traffic_incidents = await generated_map_sdk.fetchTrafficIncidents(
          bounding_box_from_corners(
            south_west_latitude,
            south_west_longitude,
            north_east_latitude,
            north_east_longitude,
          ),
        );
        return traffic_incidents.map(traffic_incident_row_from_generated);
      }),
    fetchTrafficFlow: (
      south_west_latitude,
      south_west_longitude,
      north_east_latitude,
      north_east_longitude,
    ) =>
      with_adapted_failure(async () => {
        const traffic_flow_rows = await generated_map_sdk.fetchTrafficFlow(
          bounding_box_from_corners(
            south_west_latitude,
            south_west_longitude,
            north_east_latitude,
            north_east_longitude,
          ),
        );
        return traffic_flow_rows.map(traffic_flow_row_from_generated);
      }),
    trafficFlowCacheStatistics: () =>
      traffic_flow_cache_statistics_from_generated(
        generated_map_sdk.trafficFlowCacheStatistics(),
      ),
    fetchRasterTile: (zoom_level, tile_x, tile_y) =>
      with_adapted_failure(async () => {
        const raster_tile_data = await generated_map_sdk.fetchRasterTile(
          tile_x,
          tile_y,
          zoom_level,
          RasterImageFormat.Png,
          RasterTileResolution.Standard,
        );
        return new Uint8Array(raster_tile_data.imageBytes);
      }),
    // The contract's live listener stream and its non-destructive flush both
    // read the same bounded rings the console always read: the subscription
    // lowers the recording gate and discards deliveries, and the flush
    // collects the events into the array the page asserts on.
    subscribeToDiagnosticEvents: (minimum_severity) =>
      generated_map_sdk.subscribeToDiagnosticEvents(
        PAGE_DIAGNOSTIC_LISTENER,
        minimum_severity,
      ),
    flushRecentDiagnosticEvents: (minimum_severity, maximum_count) => {
      const flushed_events = [];
      generated_map_sdk.flushRecentDiagnosticEvents(
        {
          onDiagnosticEvent(event) {
            flushed_events.push(diagnostic_event_from_generated(event));
          },
        },
        minimum_severity,
        maximum_count,
      );
      return flushed_events;
    },
    setResponseExcerptCapture: (enabled) =>
      generated_map_sdk.setResponseExcerptCapture(enabled),
  };
  const status_element = document.getElementById('harness-status');
  if (status_element) {
    status_element.textContent = `Map ready (version ${compiled_version})`;
  }
  return compiled_version;
})();
