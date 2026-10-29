/* tslint:disable */
/* eslint-disable */

/**
 * Severity classification of a diagnostics event, mirroring the contract's
 * `SdkLogSeverity` at the JavaScript seam (the shared record type cannot
 * itself carry `wasm-bindgen` attributes; the same pattern as
 * [`crate::canvas::CanvasTileResolution`] and friends).
 */
export enum CanvasSdkLogSeverity {
    /**
     * The finest-grained events (the GPU-hot render path's instrumentation).
     */
    Trace = 0,
    /**
     * Verbose internal events.
     */
    Debug = 1,
    /**
     * Coarse informational events (the idle gate records down to here).
     */
    Info = 2,
    /**
     * Warnings.
     */
    Warn = 3,
    /**
     * Errors.
     */
    Error = 4,
}

/**
 * Tile pixel resolution the GPU canvas fetches and samples, mirroring
 * [`geospatial_types::RasterTileResolution`] at the JavaScript seam: the
 * shared record type cannot itself carry `wasm-bindgen` attributes, so the
 * page passes this enum and the canvas converts it.
 */
export enum CanvasTileResolution {
    /**
     * One texel per logical tile pixel.
     */
    Standard = 0,
    /**
     * Twice the texels per logical tile pixel (the recorded `@2x` fixtures).
     */
    Retina = 1,
}

/**
 * Congestion classification a traffic-flow segment paints with, mirroring
 * [`geospatial_types::TrafficFlowCongestionLevel`] at the JavaScript seam:
 * the shared record type cannot itself carry `wasm-bindgen` attributes, so
 * the page passes this enum and the canvas converts it (the same pattern as
 * [`CanvasTileResolution`]).
 */
export enum CanvasTrafficFlowCongestionLevel {
    /**
     * At or above free-flow speed.
     */
    FreeFlow = 0,
    /**
     * Moderately below free-flow speed.
     */
    Slow = 1,
    /**
     * Stop-and-go traffic.
     */
    Congested = 2,
    /**
     * Roadway effectively closed.
     */
    Blocked = 3,
}

/**
 * The browser GPU map canvas the page owns. Construct it over an
 * `HTMLCanvasElement`, [`GpuMapCanvas::initialize`] it once (acquiring the
 * adapter and device and building the tile pipeline), then call
 * [`GpuMapCanvas::render_frame`] per wanted frame; each call re-schedules
 * the visible tiles and redraws.
 */
export class GpuMapCanvas {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Clears the location-indicator layer; following frames draw no
     * indicator until [`GpuMapCanvas::set_location_indicator`] supplies a
     * new one.
     */
    clear_location_indicator(): void;
    /**
     * Clears the overlay list; following frames draw the tiles alone until
     * [`GpuMapCanvas::set_overlays`] supplies a new list.
     */
    clear_overlays(): void;
    /**
     * Acquires the adapter and device, picks the pass-through surface
     * format, and builds the tile pipeline. Resolves to the adapter
     * description (graphics backend and adapter name) for the page's status
     * line, or fails when no WebGPU adapter supports this canvas — the page
     * then degrades to the 2D tile grid overlay. Never callable twice on
     * the same canvas.
     */
    initialize(): Promise<string>;
    /**
     * Builds the canvas renderer over the page's canvas element at the
     * given tile pixel resolution (the page passes retina when its
     * device-pixel ratio reaches `retinaDevicePixelRatioThreshold()`).
     * Fails when the element cannot host a GPU surface (for example after
     * another context already claimed the element). Call
     * [`GpuMapCanvas::initialize`] before the first
     * [`GpuMapCanvas::render_frame`].
     */
    constructor(canvas: HTMLCanvasElement, tile_resolution: CanvasTileResolution);
    /**
     * Renders one map frame for the camera pose into the canvas, resolving
     * freshly visible tiles from the same-origin `/tiles` route first.
     *
     * Resolves to a statistics object the page's readout consumes:
     * `requestedTiles` (tiles the camera listed at the fetch zoom),
     * `drawnTiles` (tiles with pooled imagery over their span this frame),
     * `drawnFragments` (draw quads after world-copy fragment splitting),
     * `missingTiles` (requested tiles with no pooled imagery this frame),
     * `tileZoomLevel` (the fetch zoom, clamped to the recorded fixtures),
     * `tileResolution` (the resolution the frame's fixtures were
     * fetched and sampled at) and `overlayTriangles` (solid overlay
     * triangles drawn over the tiles this frame; zero without overlays).
     *
     * The camera binding is consumed by value (the `wasm-bindgen` class
     * parameter semantics); the page builds a fresh camera per changed
     * pose, exactly as it already does. Two overlapping calls are a
     * construction-time borrow violation — the page serializes its frames
     * behind a busy flag and never overlaps.
     */
    render_frame(camera: MapCamera, field_of_view_degrees: number): Promise<object>;
    /**
     * Sets the location-indicator layer drawn over the overlays in every
     * following [`GpuMapCanvas::render_frame`] (the native surface's top
     * layer, round 10), replacing any earlier layer.
     *
     * The state descriptor is `{coordinate: {latitude, longitude},
     * courseHeadingDegrees?, horizontalAccuracyMeters?}`; the style
     * descriptor is `{visualKind: "trackingDot" | "guidedCourseArrow",
     * radiusPixels?, rgbaColor?, showAccuracyRing?}`, where every omitted
     * style field keeps the documented map-rendering default. Colors are
     * `{red, green, blue, alpha}` in `0.0..=1.0`; the radius is a positive
     * finite screen-pixel value. The optional scalars pass through verbatim
     * (the native indicator state's rule) while the style's own range rules
     * mirror the native record conversion. Every invalid descriptor rejects
     * the whole call with a string-valued error and keeps the previous
     * layer in force; nothing panics.
     */
    set_location_indicator(state_value: any, style_value: any): void;
    /**
     * Sets the overlay list drawn over the tiles in every following
     * [`GpuMapCanvas::render_frame`], replacing any earlier list in order
     * (later list entries draw over earlier ones); an empty array clears.
     *
     * Each entry is a plain JavaScript object describing one overlay shape,
     * selected by its `kind` field:
     *
     * * `{kind: "routePolyline", coordinates: [{latitude, longitude}...],
     *   color?, widthPixels?}` — a routed path drawn as a thick line,
     * * `{kind: "filledPolygon", ringCoordinates: [{latitude, longitude}...],
     *   color?}` — an ear-clip triangulated ring fill,
     * * `{kind: "pointMarkers", positions: [{latitude, longitude}...],
     *   color?, radiusPixels?}` — screen-facing octagon markers,
     * * `{kind: "trafficFlow", segments: [{shapeCoordinates:
     *   [{latitude, longitude}...], congestionLevel:
     *   CanvasTrafficFlowCongestionLevel}...], widthPixels?}` —
     *   congestion-colored traffic lines.
     *
     * An absent `color`/`widthPixels`/`radiusPixels` override keeps the
     * documented map-rendering default style; the fields exist exactly where
     * the native overlay structs have them. Colors are `{red, green, blue,
     * alpha}` in `0.0..=1.0`; widths and radii are positive finite screen
     * pixel values. Every invalid descriptor (wrong shape, missing or
     * wrong-typed field, out-of-range coordinate or channel, unknown `kind`
     * or congestion value) rejects the whole call with a string-valued
     * error and keeps the previous list in force; nothing panics.
     */
    set_overlays(overlays: any[]): void;
    /**
     * Stages a deliberate parent-fallback for one requested tile, mirroring
     * the native golden image harness (`fill_pool_and_prepare` in
     * `map-rendering`'s golden test): the fallback tile is evicted from the
     * pool and marked unavailable forever, and its coarser parent's recorded
     * fixture is pooled instead, so the scheduler resolves the fallback tile
     * as `FallsBackTo { parent }` every frame and the frame samples the
     * parent texture. The committed golden frames were produced with the
     * last visible scene tile resolved exactly this way, so the browser
     * golden-compare page calls this before rendering a golden scene to
     * reproduce the reference imagery byte-for-byte.
     *
     * Fetches the parent fixture from the same-origin `/tiles` route. A
     * missing or undecodable parent fixture is an error, not a silent skip:
     * the caller wants the fallback imagery or nothing. The parent coordinates
     * must describe the fallback tile's direct parent.
     */
    stage_tile_parent_fallback(fallback_tile_x: number, fallback_tile_y: number, fallback_zoom_level: number, parent_tile_x: number, parent_tile_y: number, parent_zoom_level: number): Promise<void>;
}

/**
 * Anchored map camera (geographic center, zoom, bearing, pitch) mirroring
 * the native [`map_rendering::MapCamera`]. The ground point under the
 * center always sits at the viewport center.
 */
export class MapCamera {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Ground meters represented by one screen pixel at the camera's center
     * (the scale bars' helper, round 10). The viewport and field-of-view
     * arguments mirror the projection methods' shape and the viewport is
     * validated like everywhere else; the flat-centered approximation (the
     * contract's doc term) is itself independent of both.
     */
    ground_meters_per_screen_pixel(width_pixels: number, height_pixels: number, field_of_view_degrees: number): number;
    /**
     * Builds a camera, clamping zoom and pitch and wrapping the bearing
     * into `[0, 360)`, exactly like the native constructor.
     */
    constructor(center_latitude: number, center_longitude: number, zoom_level: number, bearing_degrees: number, pitch_degrees: number);
    /**
     * Projects a coordinate to viewport pixels (origin top-left, y down),
     * as `{x, y}`. Fails with a message when the point lies behind the
     * camera.
     */
    project_to_screen(latitude: number, longitude: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;
    /**
     * Unprojects a viewport pixel onto the ground plane, as
     * `{latitude, longitude}`. Fails with a message when the ray misses the
     * ground (typically below the horizon at steep pitch).
     */
    screen_to_ground_coordinate(screen_x: number, screen_y: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;
    /**
     * Nearest whole zoom level a tile fetch should use for this camera,
     * mirroring the native `tile_zoom_level`.
     */
    tile_zoom_level(): number;
    /**
     * Every tile at `tile_zoom_level` whose area intersects the visible
     * ground, as an array of `{tileX, tileY, zoomLevel}` sorted row-major
     * from the north, mirroring the native `visible_tile_keys`.
     */
    visible_tile_keys(width_pixels: number, height_pixels: number, field_of_view_degrees: number, tile_zoom_level: number): Array<any>;
}

/**
 * Plans a two-waypoint route through the active live provider (M13),
 * answering the same plain JavaScript shape
 * [`crate::exports::offline_route_from_archive_bytes`] does: `distanceMeters`,
 * `durationSeconds`, `boundingBox` and `legs` of `steps` carrying the stable
 * snake-case `maneuverType` label and the provider's end-anchored instruction
 * texts.
 *
 * The request is the demo's default: automobile, fastest, metric —
 * `RouteOptions::default()`, which is also the mode the recorded Directions
 * fixture was recorded with (its maneuvers declare `transportMode: "car"`).
 * Failures throw the seam's plain verbatim string: no registration, an
 * invalid coordinate, or the provider's own refusal.
 */
export function calculate_route_live(origin_latitude: number, origin_longitude: number, destination_latitude: number, destination_longitude: number): Promise<object>;

/**
 * Pans the camera by a pointer travel of `delta_x_pixels` x
 * `delta_y_pixels` (screen pixels): the ground point the pointer just
 * moved over becomes the new camera center, so map content tracks the
 * pointer exactly. Answers the input camera unchanged when the delta's ray
 * misses the ground plane.
 */
export function camera_pan_by_screen_pixels(camera: MapCamera, delta_x_pixels: number, delta_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;

/**
 * Rotates the camera bearing by `delta_bearing_degrees` (degrees clockwise,
 * wrapping into `[0, 360)`) keeping the world point under
 * `focal_x_pixels`/`focal_y_pixels` fixed under that pixel. Answers the
 * uncorrected rotation when the focal ray misses the ground plane.
 */
export function camera_rotate_by_degrees_around_screen_point(camera: MapCamera, delta_bearing_degrees: number, focal_x_pixels: number, focal_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;

/**
 * Zooms the camera by `delta_zoom_levels` keeping the world point under
 * `focal_x_pixels`/`focal_y_pixels` fixed under that pixel; the camera's
 * own zoom range clamps the answer. Answers the uncorrected zoom when the
 * focal ray misses the ground plane.
 */
export function camera_zoom_by_levels_around_screen_point(camera: MapCamera, delta_zoom_levels: number, focal_x_pixels: number, focal_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;

/**
 * Addition-only alias for the pre-M15 vendor-named export: clears the active
 * registration.
 */
export function clear_mapquest_providers(): void;

/**
 * Clears the active registration (the settings surface's Clear act; the
 * running page keeps nothing afterwards).
 */
export function clear_provider(): void;

/**
 * Maps a coordinate to normalized world coordinates in `[0, 1]²`, as
 * `{x, y}`; latitude is clamped to the Mercator cutoffs, mirroring the
 * native `coordinate_to_normalized_world`.
 */
export function coordinate_to_normalized_world(latitude: number, longitude: number): object;

/**
 * Fetches one raster tile through the active live provider (M13), answering
 * the PNG bytes as a `Uint8Array`.
 *
 * The request is the standard-resolution PNG form of the provider's
 * documented Tiles API path (the playground's fixture route serves the same
 * address shape). Failures throw the seam's plain verbatim string: no
 * registration, a zoom or tile address outside the Tiles API's documented
 * bounds, or the provider's own refusal.
 */
export function fetch_raster_tile_live(zoom_level: number, tile_x: number, tile_y: number): Promise<Uint8Array>;

/**
 * Reads the most recent events the rings recorded at the requested
 * severity or above, oldest first, capped at `maximum_count`, as an array
 * of `{timestampMillisecondsSinceEpoch, severity, subsystemTarget,
 * messageLine}` objects. Coordinates in the messages are already rounded to
 * the sink's decimals (the sink's privacy scrub, the native contract rule).
 */
export function flush_recent_diagnostic_events(minimum_severity: CanvasSdkLogSeverity, maximum_count: number): Array<any>;

/**
 * Forward-geocodes through the active live provider, answering the same row
 * shape the native refapps consume. Fails with a message when no provider is
 * registered or the provider refuses the query.
 */
export function forward_geocode_live(query_text: string): Promise<Array<any>>;

/**
 * Semver of the compiled SDK, equal to the workspace package version.
 */
export function get_sdk_compiled_version(): string;

/**
 * Routes between two coordinates over an offline routing graph loaded from
 * in-memory archive bytes: the wasm milestone-M7 seam of `PRD.md` §4.6 —
 * the browser has no `mmap`, so the compiled archive arrives as a
 * `Uint8Array` (e.g. the committed routing-grid fixture served same-origin
 * at `/offline-graph/routing_grid.rmog`) and is validated in memory before
 * routing, exactly like the native `Memory` source seam.
 *
 * The request routes through the in-repo
 * [`map_core::offline_routing::ArchiveOfflineRoutingProvider`] (its A*
 * engine, snap, restricts and derived maneuver steps) under the
 * automobile / fastest / metric request the offline graph profile serves
 * (`RouteOptions` defaults). The answer mirrors the frozen contract's
 * `RouteData`/`RouteLeg`/`RouteStep` dictionaries field for field (lower
 * camel case; `maneuverType` the stable snake-case label).
 *
 * Deliberately a demo/parity seam ahead of the contract: the async
 * provider surface (`MapSdk` and its offline routing members) has no wasm
 * exposure yet, so the helper is documented as wasm-only in
 * `platform/web/tests/contract_sync.mjs`, exactly like the camera gesture
 * helpers. Failures throw the plain verbatim error string (the harness's
 * established shape): bytes that fail archive validation, a coordinate
 * within no graph node's snap tolerance, or a request pair the graph
 * cannot connect — refused, never guessed.
 */
export function offline_route_from_archive_bytes(archive_bytes: Uint8Array, start_latitude: number, start_longitude: number, end_latitude: number, end_longitude: number): Promise<any>;

/**
 * Addition-only alias for the pre-M15 vendor-named export: registers the
 * MapQuest provider set through the generic dispatch table.
 */
export function register_mapquest_providers(api_key: string, base_url?: string | null): void;

/**
 * Registers a provider for live browser calls. The caller names the shared
 * registry's provider key; a blank credential is refused. The credential
 * lives in module memory only and is never logged.
 */
export function register_provider(provider_key: string, credential: string, base_url?: string | null): void;

/**
 * Reports the device-pixel ratio from which the playground's JavaScript
 * chooses between [`CanvasTileResolution::Retina`] and
 * [`CanvasTileResolution::Standard`]: at or above the threshold the page
 * passes retina. The threshold lives in Rust so the seam stays one source
 * of truth.
 */
export function retina_device_pixel_ratio_threshold(): number;

/**
 * Installs the panic hook and reports SDK readiness: sets the
 * `window.__sdkReady` flag and resolves to the compiled version once the
 * wasm module finished starting.
 */
export function start_sdk(): Promise<any>;

/**
 * Lowers the recording gate to the requested severity: from that moment on,
 * events at the severity or above record into the bounded rings (the gate
 * never raises back — the same rule the native sink documents). Installs
 * the ring subscriber on the first call; a no-op gate-wise when the page's
 * host already installed its own global subscriber (the ring then stays
 * empty and the flush seam answers an empty list — the subscriber's own
 * `enabled` is never consulted).
 */
export function subscribe_to_diagnostic_events(minimum_severity: CanvasSdkLogSeverity): void;

/**
 * The XYZ address of the tile containing the coordinate at the zoom level,
 * as `{tileX, tileY, zoomLevel}`, mirroring the native
 * `tile_key_for_coordinate`.
 */
export function tile_key_for_coordinate(latitude: number, longitude: number, zoom_level: number): object;

/**
 * Every XYZ tile whose area intersects the spanning box, as an array of
 * `{tileX, tileY, zoomLevel}` ordered row-major from the north, mirroring
 * the native `tiles_covering`.
 */
export function tiles_covering(south_west_latitude: number, south_west_longitude: number, north_east_latitude: number, north_east_longitude: number, zoom_level: number): Array<any>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_gpumapcanvas_free: (a: number, b: number) => void;
    readonly __wbg_mapcamera_free: (a: number, b: number) => void;
    readonly calculate_route_live: (a: number, b: number, c: number, d: number) => number;
    readonly camera_pan_by_screen_pixels: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly camera_rotate_by_degrees_around_screen_point: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly camera_zoom_by_levels_around_screen_point: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly clear_mapquest_providers: () => void;
    readonly clear_provider: () => void;
    readonly coordinate_to_normalized_world: (a: number, b: number, c: number) => void;
    readonly fetch_raster_tile_live: (a: number, b: number, c: number) => number;
    readonly flush_recent_diagnostic_events: (a: number, b: number) => number;
    readonly forward_geocode_live: (a: number, b: number) => number;
    readonly get_sdk_compiled_version: (a: number) => void;
    readonly gpumapcanvas_clear_location_indicator: (a: number) => void;
    readonly gpumapcanvas_clear_overlays: (a: number) => void;
    readonly gpumapcanvas_initialize: (a: number) => number;
    readonly gpumapcanvas_new: (a: number, b: number, c: number) => void;
    readonly gpumapcanvas_render_frame: (a: number, b: number, c: number) => number;
    readonly gpumapcanvas_set_location_indicator: (a: number, b: number, c: number, d: number) => void;
    readonly gpumapcanvas_set_overlays: (a: number, b: number, c: number, d: number) => void;
    readonly gpumapcanvas_stage_tile_parent_fallback: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly mapcamera_ground_meters_per_screen_pixel: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly mapcamera_new: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly mapcamera_project_to_screen: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly mapcamera_screen_to_ground_coordinate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly mapcamera_tile_zoom_level: (a: number) => number;
    readonly mapcamera_visible_tile_keys: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly offline_route_from_archive_bytes: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly register_mapquest_providers: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly register_provider: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly retina_device_pixel_ratio_threshold: () => number;
    readonly start_sdk: () => number;
    readonly subscribe_to_diagnostic_events: (a: number) => void;
    readonly tile_key_for_coordinate: (a: number, b: number, c: number, d: number) => void;
    readonly tiles_covering: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly __wasm_bindgen_func_elem_2094: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_2094_36: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_2094_37: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_9483: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_9485: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_1322: (a: number, b: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export5: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
