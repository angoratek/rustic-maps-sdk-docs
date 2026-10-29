// Sacramento overlay demo scenes, derived from the shared reference-scene
// artifact `platform/reference-scenes.json` (the refapp demo-content source
// of truth, docs/ReferenceAppUX.md, "Shared demo-scene artifact"). The
// artifact's coordinates mirror `crates/map-rendering/tests/overlay_golden.rs`
// (the `ROUTE_*`, `POLYGON_RING_*`, `MARKER_*`, and `traffic_scene_flows`
// constants) coordinate-for-coordinate: the same scenes the native golden
// fixtures render. Shared by the playground (`index.html`) and the
// golden-compare page (`golden.mjs`) so the two browser consumers cannot
// drift from each other, from the other platforms, or from the native scenes.
//
// Every scene is one plain descriptor object in the wasm canvas
// `set_overlays` vocabulary; no color or width override is given, so each
// keeps the documented map-rendering default style the fixtures were
// rendered with.
import scene_artifact from '../reference-scenes.json' with { type: 'json' };
import { CanvasTrafficFlowCongestionLevel } from './pkg/map_web_bindings.js';

// The artifact spells congestion levels with the enum's variant names; the
// wasm canvas rejects unknown values, so an unmapped artifact name surfaces
// immediately.
const CONGESTION_LEVELS_BY_ARTIFACT_NAME = {
  FreeFlow: CanvasTrafficFlowCongestionLevel.FreeFlow,
  Slow: CanvasTrafficFlowCongestionLevel.Slow,
  Congested: CanvasTrafficFlowCongestionLevel.Congested,
  Blocked: CanvasTrafficFlowCongestionLevel.Blocked,
};

// Reads the artifact's congestion string (never invents a level).
function congestion_level_by_artifact_name(artifact_name) {
  const congestion_level = CONGESTION_LEVELS_BY_ARTIFACT_NAME[artifact_name];
  if (congestion_level === undefined) {
    throw new Error(
      `reference-scenes.json names an unknown congestion level ${artifact_name}`,
    );
  }
  return congestion_level;
}

// Converts the artifact's `{ latitude_degrees, longitude_degrees }` pairs
// into the descriptor's `{ latitude, longitude }` records.
function geographic_coordinate(coordinate_pair) {
  return {
    latitude: coordinate_pair.latitude_degrees,
    longitude: coordinate_pair.longitude_degrees,
  };
}

// Builds the wasm `set_overlays` descriptor for one artifact scene. The
// per-kind property names are the descriptor vocabulary's
// (`coordinates`/`ringCoordinates`/`positions`/`shapeCoordinates`); every
// artifact key without a descriptor meaning (label, description) is dropped
// here rather than forwarded.
function overlay_descriptor(scene) {
  switch (scene.kind) {
    case 'routePolyline': {
      return {
        kind: scene.kind,
        coordinates: scene.coordinates.map(geographic_coordinate),
      };
    }
    case 'filledPolygon': {
      return {
        kind: scene.kind,
        ringCoordinates: scene.ring_coordinates.map(geographic_coordinate),
      };
    }
    case 'pointMarkers': {
      return {
        kind: scene.kind,
        positions: scene.positions.map(geographic_coordinate),
      };
    }
    case 'trafficFlow': {
      return {
        kind: scene.kind,
        segments: scene.segments.map((segment) => ({
          shapeCoordinates: segment.shape_coordinates.map(geographic_coordinate),
          congestionLevel: congestion_level_by_artifact_name(
            segment.congestion_level,
          ),
        })),
      };
    }
    default: {
      throw new Error(`reference-scenes.json names an unknown scene kind ${scene.kind}`);
    }
  }
}

// The whole shared artifact itself (camera presets, scenes, navigation
// preview), for the playground's preset picker and navigation panel.
export const REFERENCE_SCENE_ARTIFACT = scene_artifact;

// The scene keys double as the playground checkbox keys and the
// golden-compare page's scene keys.
export const SACRAMENTO_OVERLAY_SCENES = Object.fromEntries(
  Object.entries(scene_artifact.overlay_scenes).map(([scene_key, scene]) => [
    scene_key,
    overlay_descriptor(scene),
  ]),
);

// The demo-scene labels by scene key, for the playground's toggle rows.
export const SACRAMENTO_OVERLAY_SCENE_LABELS = Object.fromEntries(
  Object.entries(scene_artifact.overlay_scenes).map(([scene_key, scene]) => [
    scene_key,
    scene.label,
  ]),
);

// Builds the overlay descriptor list for the given Sacramento scene keys,
// keeping the keys' order (later descriptors draw over earlier ones).
export function sacramento_scene_overlays(scene_keys) {
  return scene_keys.map((scene_key) => SACRAMENTO_OVERLAY_SCENES[scene_key]);
}