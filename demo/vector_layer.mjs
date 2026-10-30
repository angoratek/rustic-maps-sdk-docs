// Browser vector-tile seam (M9 live-tile integration): fetch a Mapbox Vector
// Tile from any provider's fixture/live URL, decode and style it in wasm, and
// return the plain overlay descriptors the WebGPU canvas'
// `MapView.setOverlays` already draws. This module names no provider and
// no vendor URL shape: the caller passes the address its provider registry
// resolved, exactly like the raster tile path.
//
// The wasm exports (`vectorTileOverlayDescriptors` and
// `vectorTileGeographicBounds`) live in
// `crates/map-web-bindings/src/vector_layer.rs`; the descriptor vocabulary is
// the canvas' own `setOverlays` vocabulary, so a descriptor built here can be
// handed to `setOverlays` verbatim.
import {
  vectorTileGeographicBounds,
  vectorTileOverlayDescriptors,
  vectorTileOverlayDescriptorsForStyle,
} from './pkg/map_web_bindings.js';

/** Edge length of one demo raster tile, in screen pixels. */
export const DEFAULT_TILE_SIZE_PIXELS = 256;

// Rejects a tile size the world-pixel helper cannot place.
function validated_tile_size_pixels(tile_size_pixels) {
  if (!Number.isFinite(tile_size_pixels) || tile_size_pixels <= 0) {
    throw new Error(
      `tileSizePixels must be a positive finite number, got ${tile_size_pixels}`,
    );
  }
  return tile_size_pixels;
}

// Fetches one vector tile's wire bytes (plain MVT protobuf, or a gzip body
// the wasm seam sniffs and unwraps). A non-200 answer rejects with the URL and
// status rather than handing an error page to the decoder.
export async function fetchVectorTileBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `the vector tile request to ${url} answered HTTP ${response.status}`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

// Builds the `setOverlays` descriptors from already-fetched wire bytes. The
// tile address places the tile on the map; a malformed payload or an
// out-of-grid address throws the wasm seam's plain string reason. `styleId`
// names one of the committed style variants (`carto-light`, `carto-dark`,
// `openmaptiles-light`, `openmaptiles-dark`); without one the seam paints
// its default style.
export function buildVectorOverlaysFromBytes({
  tileBytes,
  tileZoomLevel,
  tileX,
  tileY,
  styleId,
}) {
  if (styleId === undefined) {
    return vectorTileOverlayDescriptors(
      tileBytes,
      tileZoomLevel,
      tileX,
      tileY,
    );
  }
  return vectorTileOverlayDescriptorsForStyle(
    tileBytes,
    tileZoomLevel,
    tileX,
    tileY,
    styleId,
  );
}

// Fetches one tile and returns its overlay descriptors in style-layer order.
// The overlay coordinates are geographic, so `tileSizePixels` does not change
// them; the option is accepted so the raster⇄vector switch can pass the same
// tile-size setting to both paths, and it is validated here.
export async function fetchAndBuildVectorOverlays({
  url,
  tileZoomLevel,
  tileX,
  tileY,
  tileSizePixels = DEFAULT_TILE_SIZE_PIXELS,
  styleId,
}) {
  validated_tile_size_pixels(tileSizePixels);
  const tileBytes = await fetchVectorTileBytes(url);
  return buildVectorOverlaysFromBytes({
    tileBytes,
    tileZoomLevel,
    tileX,
    tileY,
    styleId,
  });
}

// The tile's geographic corners, `{northWest, southEast}`, read through the
// same conversion the overlay seam applies (single source of truth in Rust).
export function tileGeographicBounds({ zoomLevel, tileX, tileY }) {
  return vectorTileGeographicBounds(zoomLevel, tileX, tileY);
}

// Places the tile in the demo's world-pixel space: the map square spans
// `tileSizePixels * 2^zoom` pixels per axis and each tile owns one
// `tileSizePixels` square in it. This is the pure half of the raster⇄vector
// switch (where the fetched tile's quad belongs), independent of the wasm
// module.
export function tileWorldPixelQuad({
  zoomLevel,
  tileX,
  tileY,
  tileSizePixels = DEFAULT_TILE_SIZE_PIXELS,
}) {
  const validated_tile_size = validated_tile_size_pixels(tileSizePixels);
  return {
    leftPixels: tileX * validated_tile_size,
    topPixels: tileY * validated_tile_size,
    widthPixels: validated_tile_size,
    heightPixels: validated_tile_size,
    worldPixelSize: validated_tile_size * 2 ** zoomLevel,
  };
}
