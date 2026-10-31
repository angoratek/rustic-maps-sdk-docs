/* tslint:disable */
/* eslint-disable */

/**
 * Anchored map camera (geographic center, zoom, bearing, pitch) mirroring
 * the native [`map_rendering::MapCamera`]. The ground point under the
 * center always sits at the viewport center.
 */
export class MapCamera {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * The camera's bearing in degrees — the contract's
     * `bearing_degrees()` getter.
     */
    bearingDegrees(): number;
    /**
     * The camera's center, as `{latitude, longitude}` — the contract's
     * `center()` getter. The getters make a fitted camera's chosen framing
     * readable (round-9 ask, contract members since M17).
     */
    center(): object;
    /**
     * Builds the camera that frames a bounding box inside the viewport's
     * inset region, mirroring the contract's `fit_bounds` constructor:
     * top-down and north-up, zoomed to the largest level that keeps the
     * whole box inside the inset area (clamped to `maximum_zoom_level`), and
     * centered on the inset region's center. Fails with a message when the
     * corners, viewport, insets or maximum zoom are unusable.
     */
    static fittingBounds(south_west_latitude: number, south_west_longitude: number, north_east_latitude: number, north_east_longitude: number, width_pixels: number, height_pixels: number, inset_top_pixels: number, inset_right_pixels: number, inset_bottom_pixels: number, inset_left_pixels: number, maximum_zoom_level: number): MapCamera;
    /**
     * Ground meters represented by one screen pixel at the camera's center
     * (the scale bars' helper, round 10). The viewport and field-of-view
     * arguments mirror the projection methods' shape and the viewport is
     * validated like everywhere else; the flat-centered approximation (the
     * contract's doc term) is itself independent of both.
     */
    groundMetersPerScreenPixel(width_pixels: number, height_pixels: number, field_of_view_degrees: number): number;
    /**
     * Builds a camera, clamping zoom and pitch and wrapping the bearing
     * into `[0, 360)`, exactly like the native constructor.
     */
    constructor(center_latitude: number, center_longitude: number, zoom_level: number, bearing_degrees: number, pitch_degrees: number);
    /**
     * Pans the camera by a pointer travel of `delta_x_pixels` x
     * `delta_y_pixels` (screen pixels): the ground point the pointer just
     * moved over becomes the new camera center, so map content tracks the
     * pointer exactly. Answers the input camera pose unchanged when the
     * delta's ray misses the ground plane, as the contract member
     * documents. The free `panCameraByScreenPixels` helper stays as an
     * alias for the M3 demo call sites.
     */
    panByScreenPixels(delta_x_pixels: number, delta_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;
    /**
     * The camera's pitch in degrees — the contract's `pitch_degrees()`
     * getter.
     */
    pitchDegrees(): number;
    /**
     * Projects a coordinate to viewport pixels (origin top-left, y down),
     * as `{x, y}`. Fails with a message when the point lies behind the
     * camera.
     */
    projectToScreen(latitude: number, longitude: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;
    /**
     * Rotates the camera bearing by `delta_bearing_degrees` (degrees
     * clockwise, wrapping into `[0, 360)`) keeping the world point under
     * `focal_x_pixels`/`focal_y_pixels` fixed under that pixel; the
     * uncorrected rotation answers when the focal ray misses the ground
     * plane.
     */
    rotateByDegreesAroundScreenPoint(delta_bearing_degrees: number, focal_x_pixels: number, focal_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;
    /**
     * Unprojects a viewport pixel onto the ground plane, as
     * `{latitude, longitude}`. Fails with a message when the ray misses the
     * ground (typically below the horizon at steep pitch).
     */
    screenToGroundCoordinate(screen_x: number, screen_y: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;
    /**
     * Nearest whole zoom level a tile fetch should use for this camera,
     * mirroring the native `tile_zoom_level`.
     */
    tileZoomLevel(): number;
    /**
     * Every tile at `tile_zoom_level` whose area intersects the visible
     * ground, as an array of `{tileX, tileY, zoomLevel}` sorted row-major
     * from the north, mirroring the native `visible_tile_keys`.
     */
    visibleTileKeys(width_pixels: number, height_pixels: number, field_of_view_degrees: number, tile_zoom_level: number): Array<any>;
    /**
     * Zooms the camera by `delta_zoom_levels` keeping the world point under
     * `focal_x_pixels`/`focal_y_pixels` fixed under that pixel; the
     * camera's own zoom range clamps the answer, and the uncorrected zoom
     * answers when the focal ray misses the ground plane.
     */
    zoomByLevelsAroundScreenPoint(delta_zoom_levels: number, focal_x_pixels: number, focal_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;
    /**
     * The camera's zoom level — the contract's `zoom_level()` getter.
     */
    zoomLevel(): number;
}

/**
 * The browser GPU map canvas the page owns. Construct it over an
 * `HTMLCanvasElement`, [`MapView::initialize`] it once (acquiring the
 * adapter and device and building the tile pipeline), then call
 * [`MapView::render_frame`] per wanted frame; each call re-schedules
 * the visible tiles and redraws.
 */
export class MapView {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Adds one overlay descriptor to the drawn list and answers the
     * generated opaque identifier addressing it (`overlay-1`, `overlay-2`,
     * …; monotonic per view, never reused). Validation is exactly
     * `set_overlays`' single-descriptor rule: a refused descriptor throws
     * and adds nothing. The new overlay draws last, over the entries
     * already in the list.
     */
    addOverlay(overlay: any): string;
    /**
     * Clears the location-indicator layer; following frames draw no
     * indicator until [`MapView::set_location_indicator`] supplies a
     * new one.
     */
    clearLocationIndicator(): void;
    /**
     * Clears the overlay list; following frames draw the tiles alone until
     * [`MapView::set_overlays`] or [`MapView::add_overlay`] supplies a new
     * list. Clears the bulk list and every addressed overlay alike.
     */
    clearOverlays(): void;
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
     * Builds the canvas renderer over the page's canvas element, bound to
     * the SDK root it was created with (`new MapView(canvas, maps)`). The
     * tile pixel resolution is optional: omitted, it follows the same
     * device-pixel-ratio rule as `retinaDevicePixelRatioThreshold()`;
     * supplied, it is honoured verbatim (the golden harness pins it). Fails
     * when the element cannot host a GPU surface (for example after another
     * context already claimed the element). Call [`MapView::initialize`]
     * before the first [`MapView::render_frame`].
     */
    constructor(canvas: HTMLCanvasElement, maps: MapsSdk, tile_resolution?: TileResolution | null);
    /**
     * Removes the overlay addressed by `identifier`; answers whether the
     * identifier was present (an unknown identifier is not an error).
     */
    removeOverlay(identifier: string): boolean;
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
     * With the raster tile layer hidden through
     * [`MapView::set_tile_layer_visible`] the frame skips the whole
     * tile pipeline and reports `requestedTiles`, `drawnTiles`,
     * `drawnFragments` and `missingTiles` as zero while still presenting the
     * overlay and indicator layers.
     *
     * The camera binding is consumed by value (the `wasm-bindgen` class
     * parameter semantics); the page builds a fresh camera per changed
     * pose, exactly as it already does. Two overlapping calls are a
     * construction-time borrow violation — the page serializes its frames
     * behind a busy flag and never overlaps.
     */
    renderFrame(camera: MapCamera, field_of_view_degrees: number): Promise<object>;
    /**
     * Sets the frame pass's clear color (each channel 0..=1), the background
     * behind any tiles or overlays that do not cover the surface. The
     * default is the shared dark clear; the page paints a light clear around
     * a vector base so the gaps between its fills do not read as a black
     * map. A channel outside 0..=1 or a non-finite value is refused.
     */
    setBackgroundColor(red: number, green: number, blue: number, alpha: number): void;
    /**
     * Shows or hides the raster tile base layer in every following
     * [`MapView::render_frame`].
     *
     * Hidden frames still clear the surface and draw the overlay and
     * location-indicator layers, so the page can paint a vector base map
     * through [`MapView::set_overlays`] while this raster layer is
     * hidden. A hidden frame skips the tile listing, same-origin fetches,
     * scheduler warm/resolve, texture uploads and tile draws, and reports
     * `requestedTiles: 0`, `drawnTiles: 0` and `missingTiles: 0` while
     * keeping the current `tileZoomLevel`, `tileResolution` and
     * `overlayTriangles` statistics. Showing the layer again resolves tiles
     * normally on the next frame (the texture cache survives hidden frames).
     */
    setBaseMapVisible(visible: boolean): void;
    /**
     * Sets the location-indicator layer drawn over the overlays in every
     * following [`MapView::render_frame`] (the native surface's top
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
    setLocationIndicator(state_value: any, style_value: any): void;
    /**
     * Sets the overlay list drawn over the tiles in every following
     * [`MapView::render_frame`], replacing any earlier list in order
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
     * * `{kind: "pointPins", positions: [{latitude, longitude}...],
     *   color?, radiusPixels?}` — teardrop pins anchored at their tip with a
     *   hollow head center,
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
    setOverlays(overlays: any[]): void;
    /**
     * Sets (or clears, with a blank template) the live raster fallback: a
     * `{z}/{x}/{y}` URL template from a provider registry descriptor that
     * the frame fetches when no recorded fixture exists at an address, so a
     * camera over unrecorded ground still draws imagery. The template must
     * carry all three placeholders; the maximum zoom level caps the fetch
     * zoom to what the tile service actually serves.
     *
     * The fallback runs only after the recorded-fixture fetch fails, so the
     * local harness keeps its deterministic fixture demo, and a registered
     * live provider (a runtime credential) is consulted before the template.
     */
    setRasterTileSource(url_template: string, maximum_zoom_level: number): void;
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
    stageParentTile(fallback_tile_x: number, fallback_tile_y: number, fallback_zoom_level: number, parent_tile_x: number, parent_tile_y: number, parent_zoom_level: number): Promise<void>;
    /**
     * Replaces the overlay addressed by `identifier` in its draw position.
     * An invalid descriptor throws and keeps the previous overlay; an
     * unknown identifier throws a string-valued error naming it.
     */
    updateOverlay(identifier: string, overlay: any): void;
    /**
     * Compiled version of the SDK root this view was constructed with.
     */
    readonly sdkCompiledVersion: string;
}

/**
 * The browser SDK root (`MapsSdk.create()`): the object a page creates once
 * and hands to its [`crate::canvas::MapView`], mirroring the native
 * `MapSdk` construction shape. The wasm runtime is module-global, so this
 * root carries the readiness result and the compiled version rather than a
 * second runtime; provider and engine members will hang off it as the wasm
 * seam grows.
 */
export class MapsSdk {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Creates the SDK root and resolves once the browser runtime is ready
     * (the same work the legacy [`start_sdk`] performs). The returned root
     * is what `new MapView(canvas, maps)` expects.
     */
    static create(): Promise<MapsSdk>;
    /**
     * The compiled SDK version (the workspace package version).
     */
    readonly compiledVersion: string;
}

/**
 * Severity classification of a diagnostics event, mirroring the contract's
 * `SdkLogSeverity` at the JavaScript seam (the shared record type cannot
 * itself carry `wasm-bindgen` attributes; the same pattern as
 * [`crate::canvas::CanvasTileResolution`] and friends).
 */
export enum SdkLogSeverity {
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
export enum TileResolution {
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
export enum TrafficFlowCongestionLevel {
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
export function calculateRoute(origin_latitude: number, origin_longitude: number, destination_latitude: number, destination_longitude: number): Promise<object>;

/**
 * Addition-only alias for the pre-M15 vendor-named export: clears the active
 * registration.
 */
export function clearMapquestProviders(): void;

/**
 * Clears the active registration (the settings surface's Clear act; the
 * running page keeps nothing afterwards).
 */
export function clearProvider(): void;

/**
 * Maps a coordinate to normalized world coordinates in `[0, 1]²`, as
 * `{x, y}`; latitude is clamped to the Mercator cutoffs, mirroring the
 * native `coordinate_to_normalized_world`.
 */
export function coordinateToNormalizedWorld(latitude: number, longitude: number): object;

/**
 * Reports the device-pixel ratio from which the playground's JavaScript
 * chooses between [`CanvasTileResolution::Retina`] and
 * [`CanvasTileResolution::Standard`]: at or above the threshold the page
 * passes retina. The threshold lives in Rust so the seam stays one source
 * of truth.
 */
export function devicePixelRatioThreshold(): number;

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
export function fetchRasterTile(zoom_level: number, tile_x: number, tile_y: number): Promise<Uint8Array>;

/**
 * Reads the most recent events the rings recorded at the requested
 * severity or above, oldest first, capped at `maximum_count`, as an array
 * of `{timestampMillisecondsSinceEpoch, severity, subsystemTarget,
 * messageLine}` objects. Coordinates in the messages are already rounded to
 * the sink's decimals (the sink's privacy scrub, the native contract rule).
 */
export function flushRecentDiagnosticEvents(minimum_severity: SdkLogSeverity, maximum_count: number): Array<any>;

/**
 * Forward-geocodes through the active live provider, answering the same row
 * shape the native refapps consume. Fails with a message when no provider is
 * registered or the provider refuses the query.
 */
export function forwardGeocode(query_text: string): Promise<Array<any>>;

/**
 * Semver of the compiled SDK, equal to the workspace package version.
 */
export function getSdkCompiledVersion(): string;

/**
 * Legacy readiness starter: installs the browser runtime, sets the
 * `window.__sdkReady` flag and resolves to the compiled version. Prefer
 * `await MapsSdk.create()`; this alias stays for existing harness code.
 */
export function initializeSdk(): Promise<any>;

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
export function offlineRouteFromArchiveBytes(archive_bytes: Uint8Array, start_latitude: number, start_longitude: number, end_latitude: number, end_longitude: number): Promise<any>;

/**
 * Pans the camera by a pointer travel of `delta_x_pixels` x
 * `delta_y_pixels` (screen pixels), answering the resulting
 * `{latitude, longitude, zoomLevel, bearingDegrees, pitchDegrees}` pose.
 * Alias of [`MapCamera::pan_by_screen_pixels`].
 */
export function panCameraByScreenPixels(camera: MapCamera, delta_x_pixels: number, delta_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;

/**
 * Registers a provider for live browser calls. The caller names the shared
 * registry's provider key; a blank credential is refused. The credential
 * lives in module memory only and is never logged.
 */
export function registerProvider(provider_key: string, credential: string, base_url?: string | null): void;

/**
 * Rotates the camera bearing by `delta_bearing_degrees` around the focal
 * pixel, answering the resulting pose. Alias of
 * [`MapCamera::rotate_by_degrees_around_screen_point`].
 */
export function rotateCameraByDegreesAroundScreenPoint(camera: MapCamera, delta_bearing_degrees: number, focal_x_pixels: number, focal_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;

/**
 * The contract's single-credential registration spelling (`MapSdk::
 * set_provider_credential`) on the wasm seam: registers the MapQuest
 * provider set through the generic dispatch table.
 */
export function setProviderCredential(api_key: string, base_url?: string | null): void;

/**
 * Lowers the recording gate to the requested severity: from that moment on,
 * events at the severity or above record into the bounded rings (the gate
 * never raises back — the same rule the native sink documents). Installs
 * the ring subscriber on the first call; a no-op gate-wise when the page's
 * host already installed its own global subscriber (the ring then stays
 * empty and the flush seam answers an empty list — the subscriber's own
 * `enabled` is never consulted).
 */
export function subscribeToDiagnosticEvents(minimum_severity: SdkLogSeverity): void;

/**
 * The XYZ address of the tile containing the coordinate at the zoom level,
 * as `{tileX, tileY, zoomLevel}`, mirroring the native
 * `tile_key_for_coordinate`.
 */
export function tileKeyForCoordinate(latitude: number, longitude: number, zoom_level: number): object;

/**
 * Every XYZ tile whose area intersects the spanning box, as an array of
 * `{tileX, tileY, zoomLevel}` ordered row-major from the north, mirroring
 * the native `tiles_covering`.
 */
export function tilesCovering(south_west_latitude: number, south_west_longitude: number, north_east_latitude: number, north_east_longitude: number, zoom_level: number): Array<any>;

/**
 * The geographic bounds of one web-mercator tile, as
 * `{northWest: {latitude, longitude}, southEast: {latitude, longitude}}`.
 *
 * The demo uses this to focus its camera on a fetched tile and the browser
 * suites use it to check decoded overlay coordinates against the tile they
 * came from. The conversion is the same
 * [`tile_local_point_to_coordinate`] the overlay seam applies, so bounds and
 * geometry share one source of truth. An out-of-grid address rejects with a
 * string-valued error.
 */
export function vectorTileGeographicBounds(tile_zoom_level: number, tile_x: number, tile_y: number): object;

/**
 * Decodes and styles one vector tile into the overlay descriptor list the
 * WebGPU canvas consumes.
 *
 * `tile_bytes` is the wire body a provider served — plain MVT protobuf or a
 * gzip-wrapped body, which is sniffed and unwrapped here — and the tile
 * address is validated against the zoom grid before decoding. The result is
 * a plain JavaScript array of `set_overlays` descriptors in style-layer
 * order (later style layers paint over earlier ones). A malformed payload,
 * an out-of-grid address, an empty body or an undecompressable gzip envelope
 * rejects with a string-valued error; nothing throws across the wasm boundary
 * as a panic.
 */
export function vectorTileOverlayDescriptors(tile_bytes: Uint8Array, tile_zoom_level: number, tile_x: number, tile_y: number): Array<any>;

/**
 * The same decode-and-style conversion, painted with the committed style a
 * style id names (`carto-light`, `carto-dark`, `openmaptiles-light`,
 * `openmaptiles-dark`). The page joins a registry descriptor's style schema
 * with the active theme, so one provider can serve a light and a dark base
 * map without a page-side style table. An unknown style id rejects with the
 * documented list of known ids.
 */
export function vectorTileOverlayDescriptorsForStyle(tile_bytes: Uint8Array, tile_zoom_level: number, tile_x: number, tile_y: number, style_id: string): Array<any>;

/**
 * Zooms the camera by `delta_zoom_levels` around the focal pixel,
 * answering the resulting pose. Alias of
 * [`MapCamera::zoom_by_levels_around_screen_point`].
 */
export function zoomCameraByLevelsAroundScreenPoint(camera: MapCamera, delta_zoom_levels: number, focal_x_pixels: number, focal_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_mapcamera_free: (a: number, b: number) => void;
    readonly __wbg_mapssdk_free: (a: number, b: number) => void;
    readonly __wbg_mapview_free: (a: number, b: number) => void;
    readonly calculateRoute: (a: number, b: number, c: number, d: number) => number;
    readonly clearMapquestProviders: () => void;
    readonly clearProvider: () => void;
    readonly coordinateToNormalizedWorld: (a: number, b: number, c: number) => void;
    readonly devicePixelRatioThreshold: () => number;
    readonly fetchRasterTile: (a: number, b: number, c: number) => number;
    readonly flushRecentDiagnosticEvents: (a: number, b: number) => number;
    readonly forwardGeocode: (a: number, b: number) => number;
    readonly getSdkCompiledVersion: (a: number) => void;
    readonly initializeSdk: () => number;
    readonly mapcamera_bearingDegrees: (a: number) => number;
    readonly mapcamera_center: (a: number, b: number) => void;
    readonly mapcamera_fittingBounds: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => void;
    readonly mapcamera_groundMetersPerScreenPixel: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly mapcamera_new: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly mapcamera_panByScreenPixels: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly mapcamera_pitchDegrees: (a: number) => number;
    readonly mapcamera_projectToScreen: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly mapcamera_rotateByDegreesAroundScreenPoint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly mapcamera_screenToGroundCoordinate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly mapcamera_tileZoomLevel: (a: number) => number;
    readonly mapcamera_visibleTileKeys: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly mapcamera_zoomByLevelsAroundScreenPoint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly mapcamera_zoomLevel: (a: number) => number;
    readonly mapssdk_compiledVersion: (a: number, b: number) => void;
    readonly mapssdk_create: () => number;
    readonly mapview_addOverlay: (a: number, b: number, c: number) => void;
    readonly mapview_clearLocationIndicator: (a: number) => void;
    readonly mapview_clearOverlays: (a: number) => void;
    readonly mapview_initialize: (a: number) => number;
    readonly mapview_new: (a: number, b: number, c: number, d: number) => void;
    readonly mapview_removeOverlay: (a: number, b: number, c: number) => number;
    readonly mapview_renderFrame: (a: number, b: number, c: number) => number;
    readonly mapview_sdkCompiledVersion: (a: number, b: number) => void;
    readonly mapview_setBackgroundColor: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly mapview_setBaseMapVisible: (a: number, b: number) => void;
    readonly mapview_setLocationIndicator: (a: number, b: number, c: number, d: number) => void;
    readonly mapview_setOverlays: (a: number, b: number, c: number, d: number) => void;
    readonly mapview_setRasterTileSource: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly mapview_stageParentTile: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly mapview_updateOverlay: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly offlineRouteFromArchiveBytes: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly panCameraByScreenPixels: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly registerProvider: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly rotateCameraByDegreesAroundScreenPoint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly setProviderCredential: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly subscribeToDiagnosticEvents: (a: number) => void;
    readonly tileKeyForCoordinate: (a: number, b: number, c: number, d: number) => void;
    readonly tilesCovering: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly vectorTileGeographicBounds: (a: number, b: number, c: number, d: number) => void;
    readonly vectorTileOverlayDescriptors: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly vectorTileOverlayDescriptorsForStyle: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly zoomCameraByLevelsAroundScreenPoint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly __wasm_bindgen_func_elem_1408: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_1408_56: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_1408_57: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_7664: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_7685: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_1232: (a: number, b: number) => void;
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
