// Raster ⇄ vector tile-layer switch (M9 live-tile integration): the page-side
// seam that flips the WebGPU canvas between the provider's raster tiles and a
// vector-tile base painted as overlays.
//
// The module names no provider and no vendor URL shape. A vector tile's URL
// comes only from the shared provider registry (`platform/providers.json`),
// the same artifact the fixture server routes through, so adding a provider
// needs no edit here. The decoder is injected by the caller (the page passes
// `fetchAndBuildVectorOverlays` from `vector_layer.mjs`), which keeps this
// module dependency-free and lets a test substitute a fake decoder without
// touching the network.
//
// Known limit: `vectorTileAddressesAroundCenter` lists a square tile block
// around the camera center at the camera's rounded integer zoom. It is a
// page-side approximation until the native frustum tile listing is exported
// across the wasm seam; it ignores bearing, pitch, and the viewport aspect, so
// a pitched or rotated camera may fetch a few tiles the frustum would not
// list (and may miss a corner tile the frustum would).

/** Base-layer modes the page can switch between. */
export const TILE_LAYER_MODES = Object.freeze({
  raster: 'raster',
  vector: 'vector',
});

/** Edge length of one tile, in screen pixels (the raster tile size). */
export const DEFAULT_TILE_SIZE_PIXELS = 256;

/** Tile rings listed around the camera center when the caller names none. */
export const DEFAULT_TILE_RADIUS = 1;

/** Registry field carrying a provider's vector-tile URL template. */
export const VECTOR_TILE_URL_TEMPLATE_FIELD = 'url_template';

/** Registry field carrying a provider's highest served tile zoom level. */
export const VECTOR_TILE_MAXIMUM_ZOOM_LEVEL_FIELD = 'maximum_zoom_level';

/** Registry field naming the tile schema's committed style family. */
export const VECTOR_STYLE_SCHEMA_FIELD = 'vector_style';

/** The style schema a descriptor without the field paints. */
export const DEFAULT_VECTOR_STYLE_SCHEMA = 'carto';

/** The theme a caller without an active theme paints. */
export const DEFAULT_VECTOR_STYLE_THEME = 'light';

/** Template placeholder replaced with the tile's zoom level. */
const ZOOM_PLACEHOLDER = '{z}';
/** Template placeholder replaced with the tile's column. */
const TILE_X_PLACEHOLDER = '{x}';
/** Template placeholder replaced with the tile's row. */
const TILE_Y_PLACEHOLDER = '{y}';

/** Degrees in a full turn of longitude. */
const FULL_LONGITUDE_RANGE_DEGREES = 360;
/** Longitude of the map's western edge (the half-turn offset). */
const WESTERN_EDGE_LONGITUDE_DEGREES = 180;
/** Degrees per radian, for the web-mercator latitude projection. */
const DEGREES_PER_RADIAN = Math.PI / 180;
/** Latitude where the web-mercator projection is cut, in both hemispheres. */
const MAXIMUM_MERCATOR_LATITUDE_DEGREES = 85.05112878;
// Integer zoom-grid bounds mirrored from `map-rendering`'s camera
// (`MINIMUM_ZOOM_LEVEL` / `MAXIMUM_ZOOM_LEVEL`).
/** Lowest integer zoom level of the tile grid. */
const MINIMUM_TILE_ZOOM_LEVEL = 0;
/** Highest integer zoom level of the tile grid. */
const MAXIMUM_TILE_ZOOM_LEVEL = 24;

/**
 * Generation stamp of the latest `loadVectorBaseOverlays` call; a newer call
 * bumps it so the older in-flight call stops (the coalescing rule).
 */
let active_load_generation = 0;

// Rejects a tile size that cannot describe a positive tile edge. The address
// listing itself does not depend on the size (vector overlay coordinates are
// geographic), but both base-layer paths accept the same setting and must
// agree on it.
function validated_tile_size_pixels(tile_size_pixels) {
  if (!Number.isFinite(tile_size_pixels) || tile_size_pixels <= 0) {
    throw new Error(
      `tileSizePixels must be a positive finite number, got ${tile_size_pixels}`,
    );
  }
  return tile_size_pixels;
}

// Rejects a tile radius that is not a non-negative whole number.
function validated_tile_radius(tile_radius) {
  if (!Number.isInteger(tile_radius) || tile_radius < 0) {
    throw new Error(
      `tileRadius must be a non-negative integer, got ${tile_radius}`,
    );
  }
  return tile_radius;
}

// Rejects a camera state missing a numeric pose.
function validated_camera_state(camera_state) {
  const pose_fields = ['latitude', 'longitude', 'zoom'];
  for (const pose_field of pose_fields) {
    if (!Number.isFinite(camera_state?.[pose_field])) {
      throw new Error(
        `cameraState.${pose_field} must be a finite number, got ` +
          `${camera_state?.[pose_field]}`,
      );
    }
  }
  return camera_state;
}

// Clamps a tile index onto the zoom's grid.
function clamped_tile_index(tile_index, tile_count) {
  return Math.min(Math.max(tile_index, 0), tile_count - 1);
}

// Nearest whole zoom level of the tile grid: the native camera rounds a
// fractional zoom to the grid that best matches the on-screen scale, then the
// level is clamped to the provider's declared ceiling (a service that ends at
// zoom 15 keeps serving its zoom-15 tiles to a closer camera instead of the
// page requesting addresses the provider 404s).
function integer_tile_zoom_level(camera_zoom, maximum_zoom_level) {
  return Math.min(
    Math.max(Math.round(camera_zoom), MINIMUM_TILE_ZOOM_LEVEL),
    Math.min(MAXIMUM_TILE_ZOOM_LEVEL, maximum_zoom_level),
  );
}

// The web-mercator tile address of a coordinate at an integer zoom: the
// standard slippy-map grid, clamped onto the zoom's extent on both axes.
function tile_address_for_coordinate(latitude, longitude, zoom_level) {
  const tile_count = 2 ** zoom_level;
  const clamped_latitude = Math.min(
    Math.max(latitude, -MAXIMUM_MERCATOR_LATITUDE_DEGREES),
    MAXIMUM_MERCATOR_LATITUDE_DEGREES,
  );
  const longitude_position =
    (longitude + WESTERN_EDGE_LONGITUDE_DEGREES) / FULL_LONGITUDE_RANGE_DEGREES;
  const latitude_radians = clamped_latitude * DEGREES_PER_RADIAN;
  const latitude_position =
    (1 -
      Math.log(
        Math.tan(latitude_radians) + 1 / Math.cos(latitude_radians),
      ) /
        Math.PI) /
    2;
  return {
    zoomLevel: zoom_level,
    tileX: clamped_tile_index(
      Math.floor(longitude_position * tile_count),
      tile_count,
    ),
    tileY: clamped_tile_index(
      Math.floor(latitude_position * tile_count),
      tile_count,
    ),
  };
}

/**
 * Lists the `(2 * tileRadius + 1)²` tile addresses around a camera center at
 * the camera's rounded integer zoom level, row-major from the north (the
 * native tile listing's order). Indices are clamped onto the zoom grid, so a
 * center near an edge repeats the edge address rather than leaving the grid
 * (and the count is always exactly `(2 * tileRadius + 1)²`).
 *
 * This is a page-side approximation until the native frustum tile listing is
 * exported across the wasm seam: it ignores bearing, pitch and viewport
 * aspect, so it may list tiles the frustum would cull and, for a rotated or
 * pitched camera, may miss a corner tile. `tileSizePixels` does not affect
 * the addresses (overlay coordinates are geographic); it is accepted and
 * validated so both base-layer paths share one tile-size setting.
 *
 * @param {object} options
 * @param {{latitude: number, longitude: number, zoom: number}} options.cameraState
 * @param {number} [options.tileSizePixels]
 * @param {number} [options.tileRadius]
 * @param {number} [options.maximumZoomLevel] the provider's highest served
 *   zoom level (defaults to the grid's own ceiling)
 * @returns {{zoomLevel: number, tileX: number, tileY: number}[]}
 */
export function vectorTileAddressesAroundCenter({
  cameraState,
  tileSizePixels = DEFAULT_TILE_SIZE_PIXELS,
  tileRadius = DEFAULT_TILE_RADIUS,
  maximumZoomLevel = MAXIMUM_TILE_ZOOM_LEVEL,
}) {
  validated_tile_size_pixels(tileSizePixels);
  const validated_radius = validated_tile_radius(tileRadius);
  const validated_state = validated_camera_state(cameraState);
  const zoom_level = integer_tile_zoom_level(
    validated_state.zoom,
    maximumZoomLevel,
  );
  const center_address = tile_address_for_coordinate(
    validated_state.latitude,
    validated_state.longitude,
    zoom_level,
  );
  const tile_count = 2 ** zoom_level;
  const tile_addresses = [];
  for (let row_offset = -validated_radius; row_offset <= validated_radius; row_offset += 1) {
    for (
      let column_offset = -validated_radius;
      column_offset <= validated_radius;
      column_offset += 1
    ) {
      tile_addresses.push({
        zoomLevel: zoom_level,
        tileX: clamped_tile_index(center_address.tileX + column_offset, tile_count),
        tileY: clamped_tile_index(center_address.tileY + row_offset, tile_count),
      });
    }
  }
  return tile_addresses;
}

/**
 * Resolves one tile's URL from a registry descriptor's `url_template`,
 * substituting `{z}`, `{x}` and `{y}`. The template lives only in the shared
 * registry, never in this module. A descriptor without the field is refused
 * with a clear error instead of inventing a URL.
 *
 * @param {object} options
 * @param {object} options.descriptor the provider registry descriptor
 * @param {number} options.zoomLevel
 * @param {number} options.tileX
 * @param {number} options.tileY
 * @returns {string}
 */
export function vectorTileUrlForDescriptor({
  descriptor,
  zoomLevel,
  tileX,
  tileY,
}) {
  const url_template = descriptor?.[VECTOR_TILE_URL_TEMPLATE_FIELD];
  if (typeof url_template !== 'string' || url_template.trim() === '') {
    const provider_key = descriptor?.provider_key ?? 'the descriptor';
    throw new Error(
      `provider ${provider_key} declares no ${VECTOR_TILE_URL_TEMPLATE_FIELD}; ` +
        'vector tile URLs come only from the shared provider registry',
    );
  }
  return url_template
    .replaceAll(ZOOM_PLACEHOLDER, String(zoomLevel))
    .replaceAll(TILE_X_PLACEHOLDER, String(tileX))
    .replaceAll(TILE_Y_PLACEHOLDER, String(tileY));
}

/**
 * The committed style id a descriptor paints in one theme: the registry's
 * schema half joined with the active theme (`carto-light`,
 * `openmaptiles-dark`, …). A descriptor that names no schema paints the
 * default family, so an older registry entry keeps working.
 *
 * @param {object} descriptor the provider registry descriptor
 * @param {string} [styleTheme] the active theme name (`light` or `dark`)
 * @returns {string}
 */
export function vectorStyleIdForDescriptor(descriptor, styleTheme) {
  const schema = descriptor?.[VECTOR_STYLE_SCHEMA_FIELD];
  const validated_schema = typeof schema === 'string' && schema.trim() !== ''
    ? schema.trim()
    : DEFAULT_VECTOR_STYLE_SCHEMA;
  return `${validated_schema}-${styleTheme ?? DEFAULT_VECTOR_STYLE_THEME}`;
}

/**
 * Fetches and decodes every vector tile around the camera center and hands
 * the flattened overlay descriptors to the canvas' `setOverlays`, which
 * replaces any earlier list. Each descriptor in `descriptors` contributes its
 * own tiles (the registry is the source of the URL template) and paints in
 * the style variant its schema names for `styleTheme`.
 *
 * Error-honest: one tile's fetch or decode failure becomes an entry in
 * `failures` and the rest still draw; the call never throws for a bad tile. A
 * newer call supersedes (coalesces with) an in-flight one: the older call
 * stops fetching and returns without applying its list, so only the latest
 * camera pose's overlays land on the canvas.
 *
 * @param {object} options
 * @param {{setOverlays: function}} options.canvas the wasm `MapView`
 * @param {object[]} options.descriptors provider registry descriptors
 * @param {{latitude: number, longitude: number, zoom: number}} options.cameraState
 * @param {number} [options.tileSizePixels]
 * @param {number} [options.tileRadius]
 * @param {function} options.fetchAndBuildVectorOverlays injected decoder
 * @returns {Promise<{overlayCount: number, failures: object[],
 *   superseded: boolean}>} `superseded` is true when a newer call replaced
 *   this one before it applied its list; the caller must not publish such a
 *   result as the current base layer.
 */
export async function loadVectorBaseOverlays({
  canvas,
  descriptors,
  cameraState,
  tileSizePixels = DEFAULT_TILE_SIZE_PIXELS,
  tileRadius = DEFAULT_TILE_RADIUS,
  styleTheme = DEFAULT_VECTOR_STYLE_THEME,
  fetchAndBuildVectorOverlays,
}) {
  if (!Array.isArray(descriptors)) {
    throw new Error('descriptors must be an array of provider descriptors');
  }
  if (typeof fetchAndBuildVectorOverlays !== 'function') {
    throw new Error(
      'fetchAndBuildVectorOverlays must be the vector-tile decoder function',
    );
  }
  const load_generation = active_load_generation + 1;
  active_load_generation = load_generation;
  // The listing asks for the closest zoom every descriptor still serves; a
  // provider that caps its tiles lower keeps the nearer camera on its
  // highest tiles instead of requesting addresses it does not serve.
  const maximum_zoom_level = Math.min(
    ...descriptors.map((descriptor) =>
      Number.isInteger(descriptor?.[VECTOR_TILE_MAXIMUM_ZOOM_LEVEL_FIELD])
        ? descriptor[VECTOR_TILE_MAXIMUM_ZOOM_LEVEL_FIELD]
        : MAXIMUM_TILE_ZOOM_LEVEL),
  );
  const tile_addresses = vectorTileAddressesAroundCenter({
    cameraState,
    tileSizePixels,
    tileRadius,
    maximumZoomLevel: maximum_zoom_level,
  });
  const failures = [];
  const overlays = [];
  for (const descriptor of descriptors) {
    for (const address of tile_addresses) {
      if (load_generation !== active_load_generation) {
        return { overlayCount: 0, failures, superseded: true };
      }
      let tile_url = null;
      try {
        tile_url = vectorTileUrlForDescriptor({ descriptor, ...address });
        const tile_overlays = await fetchAndBuildVectorOverlays({
          url: tile_url,
          tileZoomLevel: address.zoomLevel,
          tileX: address.tileX,
          tileY: address.tileY,
          tileSizePixels,
          styleId: vectorStyleIdForDescriptor(descriptor, styleTheme),
        });
        overlays.push(...tile_overlays);
      } catch (tile_failure) {
        failures.push({
          zoomLevel: address.zoomLevel,
          tileX: address.tileX,
          tileY: address.tileY,
          url: tile_url,
          error: String(tile_failure),
        });
      }
    }
  }
  // A newer load started while this one was fetching: drop this list rather
  // than painting a stale camera pose.
  if (load_generation !== active_load_generation) {
    return { overlayCount: 0, failures, superseded: true };
  }
  canvas.setOverlays(overlays);
  return { overlayCount: overlays.length, failures, superseded: false };
}

/**
 * Applies a base-layer mode to the canvas: `raster` shows the provider's tile
 * imagery, `vector` hides it so the overlay layer can paint a vector base.
 *
 * @param {object} options
 * @param {{setBaseMapVisible: function}} options.canvas the wasm `MapView`
 * @param {'raster'|'vector'} options.mode
 */
export function applyTileLayerMode({ canvas, mode }) {
  if (mode !== TILE_LAYER_MODES.raster && mode !== TILE_LAYER_MODES.vector) {
    throw new Error(
      `unknown tile layer mode ${mode}; expected ` +
        `${TILE_LAYER_MODES.raster} or ${TILE_LAYER_MODES.vector}`,
    );
  }
  canvas.setBaseMapVisible(mode === TILE_LAYER_MODES.raster);
}
