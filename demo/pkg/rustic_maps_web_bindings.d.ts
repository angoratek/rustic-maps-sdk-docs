/* tslint:disable */
/* eslint-disable */

/**
 * A fixed-window circular median over recent course-over-ground samples.
 */
export class CourseMedianSmoother {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Adds one fix's course-over-ground, dropping the oldest sample.
     */
    add(course_degrees: number): void;
    /**
     * The circular median, or `null` while the window holds no sample.
     */
    median(): any;
    /**
     * Creates a smoother over `window_fix_count` recent samples.
     */
    constructor(window_fix_count: number);
    /**
     * Empties the window.
     */
    reset(): void;
}

/**
 * An exponential chase toward a moving target.
 */
export class ExponentialValueChase {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Advances the chase toward `target`, returning the next current value.
     */
    advance(current: number, target: number, now_milliseconds: number): number;
    /**
     * Creates a chase with the given time constant in milliseconds.
     */
    constructor(time_constant_milliseconds: number);
    /**
     * Clears the frame clock so the next call is treated as a first frame.
     */
    reset(): void;
}

/**
 * The navigation follow-camera state machine and its targets.
 */
export class FollowCamera {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * A user gesture (drag, pinch or rotate) breaks follow immediately.
     */
    breakOnGesture(): void;
    /**
     * Resumes the eased course chase on the next fix.
     */
    courseUp(): void;
    /**
     * Applies the trip's follow camera and captures the pre-trip pose.
     */
    engageTrip(current_center_latitude_degrees: number, current_center_longitude_degrees: number, current_zoom_level: number, current_bearing_degrees: number, current_pitch_degrees: number): void;
    /**
     * Whether the camera is holding north-up.
     */
    isNorthUp(): boolean;
    /**
     * Creates a disengaged camera with the default course-smoothing window.
     */
    constructor();
    /**
     * Holds the camera north-up whatever the fixes report.
     */
    northUp(): void;
    /**
     * Applies one location fix of the active trip.
     */
    onFix(latitude_degrees: number, longitude_degrees: number, course_heading_degrees: number | null | undefined, remaining_distance_fraction: number): void;
    /**
     * The my-location control's explicit re-engage.
     */
    reengage(): void;
    /**
     * Ends the trip, returning the captured pre-trip camera or `null`.
     */
    restorePreTripCamera(): any;
    /**
     * The current follow phase.
     */
    readonly phase: string;
    /**
     * The captured pre-trip camera, or `null` outside a trip.
     */
    readonly preTripCamera: any;
    /**
     * The target bearing in degrees, or `null` until a fix reports a course.
     */
    readonly targetBearingDegrees: any;
    /**
     * The target centre latitude in degrees.
     */
    readonly targetCenterLatitudeDegrees: number;
    /**
     * The target centre longitude in degrees.
     */
    readonly targetCenterLongitudeDegrees: number;
    /**
     * The target zoom level.
     */
    readonly targetZoomLevel: number;
}

/**
 * The location puck's interpolation between fixes.
 *
 * `pushFix` starts (or retargets) a motion toward the measured position;
 * `poseAt` answers the pose to draw at the given instant, so the page's
 * frame pump can draw a puck that glides instead of hopping.
 */
export class LocationPoseAnimator {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Creates an animator with no fix yet.
     */
    constructor();
    /**
     * The pose to draw at `now_milliseconds`, or `undefined` before the first
     * fix.
     */
    poseAt(now_milliseconds: number): object | undefined;
    /**
     * Starts or retargets the motion toward one measured position.
     */
    pushFix(latitude_degrees: number, longitude_degrees: number, course_degrees: number | null | undefined, horizontal_accuracy_meters: number | null | undefined, received_at_milliseconds: number): void;
    /**
     * Forgets every fix, so the next one draws immediately.
     */
    reset(): void;
}

/**
 * Anchored map camera (geographic center, zoom, bearing, pitch) mirroring
 * the native [`rustic_maps_rendering::MapCamera`]. The ground point under the
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
     * readable.
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
     * Ground meters represented by one screen pixel at the camera's center,
     * the value a scale bar needs. The viewport and field-of-view arguments
     * mirror the projection methods' shape and the viewport is validated
     * like everywhere else; the flat-centered approximation is itself
     * independent of both.
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
     * documents. The free `panCameraByScreenPixels` helper is an
     * addition-only alias for existing call sites.
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
     * Removes the vector base map (the UDL
     * `MapView.clear_vector_tile_source` contract member): following frames
     * draw raster tiles and overlays alone. A clear that lands while a frame
     * resolves is deferred to that frame's end, like installing, and it
     * cancels an install that was waiting.
     */
    clearVectorTileSource(): void;
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
     * supplied, it is honoured verbatim. Fails
     * when the element cannot host a GPU surface (for example after another
     * context already claimed the element). Call [`MapView::initialize`]
     * before the first [`MapView::render_frame`].
     */
    constructor(canvas: HTMLCanvasElement, maps: MapsSdk, tile_resolution?: TileResolution | null);
    /**
     * Drops the canvas' pooled raster state and re-plans the next frame's
     * fetches from the current raster sources (the UDL
     * `MapView.reload_tile_source` contract member, served on the canvas).
     *
     * The scheduler, its payload pool, the staging provider's staged and
     * decoded payloads, the uploaded textures and the retained cross-fade
     * level are replaced or cleared, so a source change reaches the next
     * frame without constructing a new canvas and no payload fetched from
     * the previous source draws again. Overlays, labels, the vector base and
     * the location layer survive the reload; fixtures and the registered
     * live sources are consulted afresh on the next tile pass.
     *
     * A call made while a frame owns the draw state is applied before the
     * next frame's tile pass. A call before initialization is a no-op.
     */
    reloadTileSource(): void;
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
     * `zoomTransitionRunning` (whether a tile zoom-level cross-fade or a
     * declared style transition still
     * owes frames, so the page keeps drawing at the animation cadence),
     * `motionGraded` (whether a camera gesture was active, so this frame
     * reused settled geometry and skipped label assembly; the first frame
     * after the gesture's end resolves both),
     * `retainedTiles` (retired-level tiles drawn over the new level for that
     * cross-fade),
     * `tileZoomLevel` (the fetch zoom, clamped to the recorded fixtures),
     * `tileResolution` (the resolution the frame's fixtures were
     * fetched and sampled at) and `overlayTriangles` (triangles in the
     * cached world-space overlay layer drawn over the tiles this frame; zero
     * without overlays; the GPU clips copies and near-plane fragments).
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
     * Reports a camera gesture in progress on the page's own gesture surface:
     * true from the pointer/wheel/key gesture's start until it ends.
     *
     * The page owns gesture recognition, so it is the only side that knows a
     * gesture is active. While the flag is set, every frame resolves the
     * vector base in motion-graded mode — cached geometry at the last settled
     * style zoom and no label assembly — and reports `motionGraded` in its
     * statistics. Calling it with false and scheduling one more frame draws
     * the settle: the resolved style and labels at the final pose.
     *
     * This is a browser surface seam, not a contract member: the native
     * surface reads the same signal from the camera pose each frame, where
     * the platform's gesture recognizers already move it.
     */
    setCameraGestureActive(active: boolean): void;
    /**
     * Sets the location-indicator layer drawn over the overlays in every
     * following [`MapView::render_frame`] (the native surface's top layer),
     * replacing any earlier layer.
     *
     * The state descriptor is `{coordinate: {latitude, longitude},
     * courseHeadingDegrees?, horizontalAccuracyMeters?}`; the style
     * descriptor is `{visualKind: "trackingDot" | "guidedCourseArrow",
     * radiusPixels?, rgbaColor?, showAccuracyRing?}`, where every omitted
     * style field keeps the documented rustic-maps-rendering default. Colors are
     * `{red, green, blue, alpha}` in `0.0..=1.0`; the radius is a positive
     * finite screen-pixel value. The optional scalars pass through verbatim
     * (the native indicator state's rule) while the style's own range rules
     * mirror the native record conversion. Every invalid descriptor rejects
     * the whole call with a coded `invalidRenderInput` failure and keeps the
     * previous layer in force; nothing panics.
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
     * documented rustic-maps-rendering default style; the fields exist exactly where
     * the native overlay structs have them. Colors are `{red, green, blue,
     * alpha}` in `0.0..=1.0`; widths and radii are positive finite screen
     * pixel values. Every invalid descriptor (wrong shape, missing or
     * wrong-typed field, out-of-range coordinate or channel, unknown `kind`
     * or congestion value) rejects the whole call with a coded
     * `invalidRenderInput` failure and keeps the previous list in force;
     * nothing panics.
     */
    setOverlays(overlays: any[]): void;
    /**
     * Installs a styled vector base map (the UDL
     * `MapView.set_vector_tile_source` contract member).
     *
     * The descriptor is one plain JavaScript object carrying the UDL
     * `UrlTemplateVectorTileSource` fields in lower camel case:
     * `{urlTemplate, sourceName, attributionText, styleId,
     * minimumZoomLevel, maximumZoomLevel}`, plus the optional
     * `tokenBucketCapacityTokens` and `refillTokensPerSecond` pacing rates
     * (absent fields keep the SDK's documented bucket). The template must be
     * an absolute `http`/`https` URL carrying `{z}`, `{x}` and `{y}`; the
     * style id must name one of the committed style artifacts
     * (`bright-light`, `fiord-dark`, …). The whole source builds before
     * this view changes, so a refused call (a malformed template, an empty
     * name, an inverted zoom range, an unusable pacing rate or an unknown
     * style id) throws a coded failure and leaves the previous base in
     * force.
     *
     * While a source is installed the canvas hides the raster base and paints
     * the style's own background, exactly like the native surface; the
     * source's overlays and place names draw beneath every overlay the page
     * supplies. An install that lands while a frame resolves is deferred to
     * that frame's end and the last request wins, so a style switch never has
     * to be retried.
     */
    setVectorTileSource(source: any): void;
    /**
     * Answers the last presented frame's pixels as RGBA bytes without
     * reading the canvas through the compositor.
     *
     * The most recent [`MapView::render_frame`] left a draw list behind;
     * this method replays that list into an offscreen texture of the same
     * format, extent and clear color, copies the texture into a CPU-readable
     * buffer and maps it. The pixels therefore match the frame that was
     * presented, and captures taken after consecutive frames at the same
     * camera pose are byte-identical. No `drawImage` re-present cycle is
     * involved, so the result does not depend on the compositor's
     * presented-frame lifetime.
     *
     * Call it after a `renderFrame` and before the next one: the draw list
     * names that frame's reusable buffers. Fails before the first frame, or
     * when the canvas has no pixels.
     */
    snapshot(): Promise<Uint8Array>;
    /**
     * Stages a deliberate parent-fallback for one requested tile, mirroring
     * the native golden-image tests: the fallback tile is evicted from the
     * pool and marked unavailable forever, and its coarser parent's recorded
     * fixture is pooled instead, so the scheduler resolves the fallback tile
     * as `FallsBackTo { parent }` every frame and the frame samples the
     * parent texture. The committed golden frames were produced with the
     * last visible scene tile resolved exactly this way, so a browser page
     * that compares against them calls this before rendering a golden scene
     * to reproduce the reference imagery byte-for-byte.
     *
     * Fetches the parent fixture from the same-origin `/tiles` route. A
     * missing or undecodable parent fixture is an error, not a silent skip:
     * the caller wants the fallback imagery or nothing. The parent coordinates
     * must describe the fallback tile's direct parent.
     *
     * The draw state is borrowed only to read the tile resolution and again
     * after the fetch; the parent fetch itself runs outside any borrow, so a
     * concurrent frame can draw while the payload is in flight.
     */
    stageParentTile(fallback_tile_x: number, fallback_tile_y: number, fallback_zoom_level: number, parent_tile_x: number, parent_tile_y: number, parent_zoom_level: number): Promise<void>;
    /**
     * Replaces the overlay addressed by `identifier` in its draw position.
     * An invalid descriptor throws and keeps the previous overlay; an
     * unknown identifier throws an `invalidArgument` failure naming it.
     */
    updateOverlay(identifier: string, overlay: any): void;
    /**
     * Reads the vector base source's status (the UDL
     * `MapView.vector_tile_source_status` contract member): the configured
     * source's style, name, attribution and zoom ceiling plus the last
     * resolved frame's drawn and failed tile counts. While a source is
     * configured, the object additionally carries the frame diagnostics —
     * payload-cache hits and misses, in-flight fetches and the
     * first-drawn-tile latency — as additive fields. A pure query — it never
     * fetches or draws — and it answers an honest not-configured status with
     * no source installed.
     */
    vectorTileSourceStatus(): object;
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
 * second runtime.
 */
export class MapsSdk {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Creates the SDK root and resolves once the browser runtime is ready
     * (the same work [`start_sdk`] performs). The returned root is what
     * `new MapView(canvas, maps)` expects.
     */
    static create(): Promise<MapsSdk>;
    /**
     * The compiled SDK version (the workspace package version).
     */
    readonly compiledVersion: string;
}

/**
 * Turn-by-turn navigation over a planned route, mirroring the driving and
 * readback core of the contract's `Navigator`.
 *
 * Build it with `new Navigator()`; `startNavigation(route, unitSystem)`
 * begins a trip over a `Route` exactly as `calculateRoute` answers it
 * (`unitSystem` is `"metric"` or `"imperial"`), `updateLocation(update)`
 * consumes one `NavigationLocationUpdate` and answers the trip snapshot
 * (or `null` without a trip), `applyReroute(route)` swaps the active
 * trip's route, `stopNavigation()` clears it, and `currentTripState()`
 * answers the latest snapshot (`null` without a trip).
 *
 * The snapshot's `phase` is `"navigating"`, `"offRoute"` or `"arrived"`
 * (the contract's `Navigating`/`OffRoute`/`Arrived`); `instruction` is the
 * composed payload (`activeManeuver` with `distancePhraseText` and
 * `displayText`, an optional `upcomingManeuver`, `progress`, and the
 * `isArrival`/`isReroutingRequired` markers); `deviation` is
 * `{statusChangeKind, distanceFromRouteMeters}` exactly while the phase is
 * off route; `snappedCoordinate` is `{latitude, longitude}` once a fix has
 * been processed. The event bridge replaces the contract's
 * foreign-listener trait and delivers the same topics; `hasActiveTrip()`
 * is the wasm-only helper.
 */
export class Navigator {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Registers one navigation listener and answers its identifier. The
     * callback receives one plain event per topic: `{topic, snapshot,
     * speechText?, phaseChange?}` where `topic` is `"instruction"`,
     * `"phase"`, `"deviation"`, `"speech"` or `"stop"`. This is the wasm
     * seam's event bridge (the contract's foreign-listener trait cannot
     * cross the wasm-bindgen boundary); the topics and payloads mirror
     * the native navigation listener's.
     */
    addNavigationListener(listener: Function): number;
    /**
     * Replaces the active trip's route (a reroute); without an active trip
     * the route is dropped. Throws a message for a route the conversion
     * cannot parse.
     */
    applyReroute(route: any): void;
    /**
     * The latest trip snapshot, or `null` without an active trip.
     */
    currentTripState(): any;
    /**
     * Whether a trip is active.
     */
    hasActiveTrip(): boolean;
    /**
     * Builds the controller with no active trip.
     */
    constructor();
    /**
     * Removes one listener; answers whether it was registered.
     */
    removeNavigationListener(listener_id: number): boolean;
    /**
     * Begins navigating `route` with the SDK default policies, replacing
     * any active trip. Throws a message for a route the conversion cannot
     * parse or a unit system other than `"metric"`/`"imperial"`.
     */
    startNavigation(route: any, unit_system: string): void;
    /**
     * Ends the active trip: `currentTripState()` answers `null` afterwards
     * and location updates and reroutes are dropped until the next
     * `startNavigation`.
     */
    stopNavigation(): void;
    /**
     * Delivers one position fix to the active trip and answers the
     * resulting snapshot, or `null` without an active trip (the fix is
     * then dropped). Throws a message for a malformed update object.
     */
    updateLocation(update: any): any;
}

/**
 * Validates, de-duplicates and smooths the page's position fixes.
 */
export class PositionController {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Feeds one fix from the page's geolocation source. Every scalar is
     * optional except the coordinate; the controller validates all of them
     * and refuses an invalid fix with an `invalidCoordinateInput` failure,
     * keeping the
     * previous state.
     */
    feedFix(latitude: number, longitude: number, horizontal_accuracy_meters?: number | null, course_heading_degrees?: number | null, timestamp_seconds?: number | null): void;
    /**
     * Whether the latest fix is older than the staleness threshold at
     * `now_seconds`.
     */
    isStale(now_seconds: number): boolean;
    /**
     * The latest accepted fix, or null before the first one.
     */
    latestFix(): object | undefined;
    /**
     * Builds an empty controller with the default smoothing window and
     * staleness threshold.
     */
    constructor();
    /**
     * The smoothed course in degrees clockwise from true north, or null when
     * no accepted fix carried a course.
     */
    smoothedCourseDegrees(): number | undefined;
    /**
     * Records a source failure by its documented name (`permissionDenied`,
     * `serviceDisabled`, `unavailable`, `timeout`). An unknown name is a
     * failure carrying an `invalidArgument` code.
     */
    sourceFailed(status_name: string): void;
    /**
     * The last source failure's name, or null when the last event was a fix.
     */
    sourceStatus(): string | undefined;
}

/**
 * An immutable simulated trip along the planned route's own geometry,
 * mirroring the contract's `RouteSimulator`.
 *
 * Construct it with a `Route`-shaped plain object (the same shape
 * `calculateRoute` answers) and a `SimulatedTripPace`-shaped plain object;
 * both fix methods then answer `SimulatedTripFix`-shaped plain objects. The
 * SDK carries no pacing policy.
 */
export class RouteSimulator {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * The fix at `elapsed_seconds` of simulated travel, clamped into
     * `[0, totalDurationSeconds()]`.
     */
    fixAtElapsedSeconds(elapsed_seconds: number): object;
    /**
     * The fix at `travelled_meters` from the route start, clamped into
     * `[0, totalDistanceMeters()]`.
     */
    fixAtTravelledMeters(travelled_meters: number): object;
    /**
     * Builds the walker over `route` at `pace`. Throws with a message when
     * the route carries no usable geometry or the pace cannot drive a trip.
     */
    constructor(route: any, pace: any);
    /**
     * Total length of the route's flattened polyline, in meters.
     */
    totalDistanceMeters(): number;
    /**
     * Total simulated travel time at the chosen pace, in seconds.
     */
    totalDurationSeconds(): number;
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
 * A linear-in-time, smoothstep-eased value move.
 */
export class SmoothstepTimedEase {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Advances the ease at `now_milliseconds`.
     *
     * Returns `[value, finished]`: the current eased value and whether the
     * move just finished on this call.
     */
    advance(now_milliseconds: number): Array<any>;
    /**
     * Begins, or restarts, an ease from one value to another.
     */
    begin(start_milliseconds: number, from_value: number, to_value: number, duration_milliseconds: number): void;
    /**
     * Creates an idle ease with no target.
     */
    constructor();
    /**
     * Stops an in-flight ease without applying anything.
     */
    reset(): void;
    /**
     * Whether an ease is in flight.
     */
    readonly is_running: boolean;
    /**
     * The ease's target value.
     */
    readonly target_value: number;
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
 * A forward-only cursor over a recorded trace's samples.
 */
export class TraceCursor {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Consumes and returns the next sample's index, or `null` at the end.
     */
    advance(): any;
    /**
     * Whether every sample was delivered.
     */
    isFinished(): boolean;
    /**
     * Creates a cursor at the first sample of a trace with `sample_count`
     * samples.
     */
    constructor(sample_count: number);
    /**
     * The next sample's index, or `null` when every sample was delivered.
     */
    nextSampleIndex(): any;
    /**
     * The next sample's index without consuming it.
     */
    peek(): any;
    /**
     * The number of samples not yet delivered.
     */
    remainingSampleCount(): number;
    /**
     * Rewinds the cursor to the first sample.
     */
    reset(): void;
    /**
     * Moves the cursor to `sample_index`, clamped to the trace's bounds.
     */
    seekToSampleIndex(sample_index: number): void;
    /**
     * The trace's sample count.
     */
    readonly sampleCount: number;
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
 * The camera bearing's smallest off-north angular distance, in degrees.
 */
export function bearingOffNorthDegrees(bearing_degrees: number): number;

/**
 * Calculates a travel-time matrix through the installed distance-matrix
 * provider — the contract's `MapSdk::calculateDistanceMatrix` on the wasm
 * seam. Coordinates arrive as flat `[latitude, longitude, …]` arrays; the
 * mode is the contract enum's name (or the common lowercase spelling).
 * Answers `{originIndex, destinationIndex, distanceMeters,
 * durationSeconds}` rows.
 */
export function calculateDistanceMatrix(origin_coordinates: Float64Array, destination_coordinates: Float64Array, transportation_mode: string): Promise<Array<any>>;

/**
 * Plans a two-waypoint route through the installed routing provider,
 * answering the same plain JavaScript shape
 * [`crate::exports::offline_route_from_archive_bytes`] does: `distanceMeters`,
 * `durationSeconds`, `boundingBox` and `legs` of `steps` carrying the stable
 * snake-case `maneuverType` label and the provider's end-anchored instruction
 * texts.
 *
 * The request uses the SDK defaults: automobile, fastest, metric —
 * `RouteOptions::default()`, the same mode the recorded route sample was
 * produced with.
 * Failures throw an error carrying the verbatim detail and a stable code:
 * no registration, an invalid coordinate, or the provider's own refusal.
 */
export function calculateRoute(origin_latitude: number, origin_longitude: number, destination_latitude: number, destination_longitude: number): Promise<object>;

/**
 * Plans a two-waypoint route with the contract's full `RouteOptions`
 * (`MapSdk::calculate_route`'s options argument): transportation mode,
 * strategy, unit system, avoids and an optional departure instant. The
 * options arrive as one plain object; omitted fields take the contract
 * defaults, and an unknown enum name is refused before the provider is
 * asked. The answer is the same route shape [`calculate_route_live`]
 * produces.
 */
export function calculateRouteWithOptions(origin_latitude: number, origin_longitude: number, destination_latitude: number, destination_longitude: number, options: any): Promise<object>;

/**
 * Empties every provider slot and forgets the selections — the browser
 * counterpart of the settings surface's Clear act. The contract carries no
 * clearing member, and a page that clears keeps nothing afterwards.
 */
export function clearProviderRegistrations(): void;

/**
 * Removes the page-registered URL-template raster source. A configured
 * raster provider is untouched; with none, the canvas falls back to its
 * recorded fixtures.
 */
export function clearUrlTemplateRasterTileSource(): void;

/**
 * Chooses the provider that serves one capability, leaving every other
 * capability untouched — the contract's `MapSdk::configureProvider`.
 *
 * `contract` is the capability's name (`Geocoding`, `Routing`,
 * `DistanceMatrix`, `PlaceSearch`, `TrafficIncidents`, `TrafficFlow`,
 * `Elevation`, `RasterTiles`, `VectorTiles` or `OfflineRouting`; the
 * registry's `…Provider` spelling is accepted too). `providerKey` is a
 * provider this build carries, and `credential` its key — an empty string is
 * accepted only for a provider that needs none.
 *
 * Fails with `ProviderNotConfigured` when the key is unknown to this build,
 * `ProviderRequestRejected` when the provider needs a credential and none
 * was supplied, and `UnsupportedCapability` when the key serves no such
 * capability. A refused call leaves the previously serving provider in
 * place.
 */
export function configureProvider(contract: string, provider_key: string, credential: string): void;

/**
 * Maps a coordinate to normalized world coordinates in `[0, 1]²`, as
 * `{x, y}`; latitude is clamped to the Mercator cutoffs, mirroring the
 * native `coordinate_to_normalized_world`.
 */
export function coordinateToNormalizedWorld(latitude: number, longitude: number): object;

/**
 * Reports the device-pixel ratio from which the page's JavaScript
 * chooses between [`CanvasTileResolution::Retina`] and
 * [`CanvasTileResolution::Standard`]: at or above the threshold the page
 * passes retina. The threshold lives in Rust so the seam stays one source
 * of truth.
 */
export function devicePixelRatioThreshold(): number;

/**
 * Fetches elevation samples through the installed elevation provider — the
 * contract's `MapSdk::fetchElevationPoints` on the wasm seam. Coordinates
 * arrive as a flat `[latitude, longitude, …]` array; the answer rows carry
 * `latitude`, `longitude` and `elevationMeters`.
 *
 * The provider set this build carries serves no elevation, so the call
 * answers `ProviderNotConfigured` until a page configures one; the refusal
 * names the contract, exactly as the native bindings' does.
 */
export function fetchElevationPoints(point_coordinates: Float64Array): Promise<Array<any>>;

/**
 * Fetches one raster tile through the installed raster-tile provider,
 * answering the PNG bytes as a `Uint8Array`.
 *
 * The request is the standard-resolution PNG form of the provider's
 * documented tile path. Failures throw an error carrying the verbatim
 * detail and a stable code: no registration, a zoom or tile address outside
 * the provider's documented bounds, or the provider's own refusal.
 */
export function fetchRasterTile(zoom_level: number, tile_x: number, tile_y: number): Promise<Uint8Array>;

/**
 * Fetches per-segment traffic flow inside the bounding box — the contract's
 * `MapSdk::fetchTrafficFlow` on the wasm seam. The row shape is the
 * contract's `TrafficFlowData` with lower-camel field names, speed values or
 * null, and the congestion level's enum name as text.
 */
export function fetchTrafficFlow(south_west_latitude: number, south_west_longitude: number, north_east_latitude: number, north_east_longitude: number): Promise<Array<any>>;

/**
 * Fetches traffic disruptions intersecting the bounding box — the contract's
 * `MapSdk::fetchTrafficIncidents` on the wasm seam. The row shape is the
 * contract's `TrafficIncident` with lower-camel field names and enum names
 * as text (`incidentType`, `severity`).
 */
export function fetchTrafficIncidents(south_west_latitude: number, south_west_longitude: number, north_east_latitude: number, north_east_longitude: number): Promise<Array<any>>;

/**
 * Reads the most recent events the rings recorded at the requested
 * severity or above, oldest first, capped at `maximum_count`, as an array
 * of `{timestampMillisecondsSinceEpoch, severity, subsystemTarget,
 * messageLine}` objects. Coordinates in the messages are already rounded to
 * the sink's decimals (the sink's privacy scrub, the native contract rule).
 */
export function flushRecentDiagnosticEvents(minimum_severity: SdkLogSeverity, maximum_count: number): Array<any>;

/**
 * The follow camera's zoom toward trip end.
 */
export function followZoomTowardTripEnd(remaining_distance_fraction: number): number;

/**
 * Forward-geocodes through the installed geocoding provider, answering the
 * same row shape the native reference applications consume. Fails with a
 * message when no provider is registered or the provider refuses the query.
 */
export function forwardGeocode(query_text: string): Promise<Array<any>>;

/**
 * Semver of the compiled SDK, equal to the workspace package version.
 */
export function getSdkCompiledVersion(): string;

/**
 * Readiness starter: installs the browser runtime, sets the
 * `window.__sdkReady` flag and resolves to the compiled version. Prefer
 * `await MapsSdk.create()`; this alias stays for existing call sites.
 */
export function initializeSdk(): Promise<any>;

/**
 * Routes between two coordinates over an offline routing graph loaded from
 * in-memory archive bytes. The browser has no `mmap`, so the compiled archive
 * arrives as a `Uint8Array`, for example a same-origin downloaded archive,
 * and is validated in memory before routing, exactly like the native
 * `Memory` source seam.
 *
 * The request routes through the in-repo
 * [`rustic_maps_core::offline_routing::ArchiveOfflineRoutingProvider`] (its A*
 * engine, snap, restricts and derived maneuver steps) under the
 * automobile / fastest / metric request the offline graph profile serves
 * (`RouteOptions` defaults). The answer mirrors the frozen contract's
 * `RouteData`/`RouteLeg`/`RouteStep` dictionaries field for field (lower
 * camel case; `maneuverType` the stable snake-case label).
 *
 * The browser half of the contract's `offline_route_from_archive_bytes`
 * free helper: both delegate to
 * [`rustic_maps_core::offline_routing::calculate_offline_route_from_archive_bytes`],
 * so the native and wasm answers cannot drift. Failures throw an error
 * carrying the verbatim detail and a stable code: bytes that fail archive
 * validation, a coordinate within no graph node's snap tolerance, or a
 * request pair the graph cannot connect — refused, never guessed.
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
 * Reports which provider serves each capability, in the contract's stable
 * order, as `{contract, providerKey, displayName, registered}` rows. Every
 * capability appears, including the ones with no provider installed; those
 * carry empty texts and `registered` false.
 */
export function providerRegistrations(): Array<any>;

/**
 * Registers a `{z}/{x}/{y}` raster tileset as the serving raster-tile
 * provider — the contract's `MapSdk::registerUrlTemplateRasterTileSource`.
 *
 * The declaration arrives as one plain object with the contract's
 * `UrlTemplateRasterTileSource` fields, lower-camel-cased: `urlTemplate`,
 * `sourceName`, `minimumZoomLevel`, `maximumZoomLevel`, `imageFormat`
 * (`Png` or `Jpeg`), `tileResolution` (`Standard` or `Retina`), `userAgent`,
 * and the optional `tokenBucketCapacityTokens` / `refillTokensPerSecond`
 * pacing rates. Zoom levels and texts fall back to the documented defaults;
 * the format defaults to `Png`, the resolution to `Standard`, and absent
 * pacing fields to the SDK's documented bucket.
 *
 * A malformed template, a blank source name, an inverted zoom range or an
 * unusable pacing rate throws `InvalidCoordinateInput` with a precise detail,
 * and the previous source keeps serving. The canvas' live raster fallback
 * fetches through the registered source at the zoom ceiling it declares.
 */
export function registerUrlTemplateRasterTileSource(source: any): void;

/**
 * Resolves a coordinate into candidate places describing that position
 * through the installed geocoding provider — the contract's
 * `MapSdk::reverseGeocode` in the same row shape [`crate::live_providers::forward_geocode_live`]
 * answers.
 */
export function reverseGeocode(latitude_degrees: number, longitude_degrees: number): Promise<Array<any>>;

/**
 * Rotates the camera bearing by `delta_bearing_degrees` around the focal
 * pixel, answering the resulting pose. Alias of
 * [`MapCamera::rotate_by_degrees_around_screen_point`].
 */
export function rotateCameraByDegreesAroundScreenPoint(camera: MapCamera, delta_bearing_degrees: number, focal_x_pixels: number, focal_y_pixels: number, width_pixels: number, height_pixels: number, field_of_view_degrees: number): object;

/**
 * Reports which transport modes and which route strategy the serving routing
 * provider can honour — the contract's `MapSdk::routeCapabilities`.
 *
 * A surface reads this answer so it can disable a choice the provider cannot
 * serve with a reason, instead of sending the request and receiving a route
 * from a path the reader did not ask for. Fails with
 * `ProviderNotConfigured` while no routing provider is installed.
 */
export function routeCapabilities(): object;

/**
 * The selected ladder distance's metric label.
 */
export function scaleBarDistanceLabelText(distance_meters: number): string;

/**
 * Returns full search results for a settled query through the installed
 * search-place provider — the same rows the native reference apps consume
 * from `MapSdk::search`.
 */
export function searchPlaces(query_text: string): Promise<Array<any>>;

/**
 * [`search_places`] narrowed to a ranking boundary (the contract's
 * `MapSdk::search` boundary argument).
 */
export function searchPlacesInBoundary(query_text: string, south_west_latitude: number, south_west_longitude: number, north_east_latitude: number, north_east_longitude: number): Promise<Array<any>>;

/**
 * Selects the scale-bar ladder distance using the design language's token
 * width range.
 *
 * Returns a `{ distanceMeters, widthPixels }` object, or `null` when the
 * ground answer is not usable.
 */
export function selectScaleBarScale(ground_meters_per_screen_pixel: number): any;

/**
 * Selects the scale-bar ladder distance that fits an explicit width range.
 */
export function selectScaleBarScaleWithWidthRange(ground_meters_per_screen_pixel: number, minimum_width_pixels: number, maximum_width_pixels: number): any;

/**
 * Points a provider key's requests at a base URL instead of its public
 * endpoint — a browser-only seam for a page that serves the provider's
 * routes itself, such as the test harness. Register the provider after
 * calling this; the override applies to every later registration of the key.
 */
export function setProviderBaseUrl(provider_key: string, base_url: string): void;

/**
 * Registers a provider for every capability it serves — the all-in-one
 * convenience, the contract's `MapSdk::setProviderCredential` with the
 * provider key fixed to this build's full-service provider.
 *
 * A blank credential is refused; the credential lives in module memory only
 * and is never logged. Configure one capability at a time with
 * [`configure_provider`] to mix providers across capabilities.
 */
export function setProviderCredential(credential: string): void;

/**
 * The shortest signed angular difference `to − from`, in degrees.
 */
export function signedAngularDifferenceDegrees(to_degrees: number, from_degrees: number): number;

/**
 * Smoothstep easing (`3t² − 2t³`), clamped into `[0, 1]`.
 */
export function smoothstepEasedProgress(linear_progress: number): number;

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
 * Returns fast completion candidates while the visitor types, through the
 * installed search-place provider — the same rows the native reference apps
 * consume from `MapSdk::suggest`. Fails with a verbatim message when no
 * provider is registered or the provider refuses the query.
 */
export function suggestPlaces(query_text: string): Promise<Array<any>>;

/**
 * [`suggest_places`] narrowed to a ranking boundary (the contract's
 * `MapSdk::suggest` boundary argument).
 */
export function suggestPlacesInBoundary(query_text: string, south_west_latitude: number, south_west_longitude: number, north_east_latitude: number, north_east_longitude: number): Promise<Array<any>>;

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
 * The replay dispatch interval for a recorded trace, in milliseconds.
 */
export function traceDispatchIntervalMilliseconds(recorded_sample_interval_seconds: number, playback_acceleration_factor: number): number;

/**
 * Reads the serving traffic-flow cache's counters: `{hitCount, missCount,
 * entryCount, evictionCount, segmentCount, gridZoomLevel,
 * maximumEntryCount, timeToLiveSeconds}`, or null while no traffic provider
 * is registered. A page's developer console shows these; nothing mutates
 * through this call.
 */
export function trafficFlowCacheStatistics(): any;

/**
 * The geographic bounds of one web-mercator tile, as
 * `{northWest: {latitude, longitude}, southEast: {latitude, longitude}}`.
 *
 * A page uses this to focus its camera on a fetched tile, and tests use it
 * to check decoded overlay coordinates against the tile they came from. The
 * conversion is the same
 * [`tile_local_point_to_coordinate`] the overlay seam applies, so bounds and
 * geometry share one source of truth. An out-of-grid address rejects with a
 * coded error.
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
 * rejects with a coded error; nothing throws across the wasm boundary as a
 * panic.
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
    readonly __wbg_coursemediansmoother_free: (a: number, b: number) => void;
    readonly __wbg_exponentialvaluechase_free: (a: number, b: number) => void;
    readonly __wbg_followcamera_free: (a: number, b: number) => void;
    readonly __wbg_locationposeanimator_free: (a: number, b: number) => void;
    readonly __wbg_mapcamera_free: (a: number, b: number) => void;
    readonly __wbg_mapssdk_free: (a: number, b: number) => void;
    readonly __wbg_mapview_free: (a: number, b: number) => void;
    readonly __wbg_navigator_free: (a: number, b: number) => void;
    readonly __wbg_positioncontroller_free: (a: number, b: number) => void;
    readonly __wbg_routesimulator_free: (a: number, b: number) => void;
    readonly __wbg_smoothsteptimedease_free: (a: number, b: number) => void;
    readonly __wbg_tracecursor_free: (a: number, b: number) => void;
    readonly bearingOffNorthDegrees: (a: number) => number;
    readonly calculateDistanceMatrix: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly calculateRoute: (a: number, b: number, c: number, d: number) => number;
    readonly calculateRouteWithOptions: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly clearProviderRegistrations: () => void;
    readonly clearUrlTemplateRasterTileSource: () => void;
    readonly configureProvider: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly coordinateToNormalizedWorld: (a: number, b: number, c: number) => void;
    readonly coursemediansmoother_add: (a: number, b: number) => void;
    readonly coursemediansmoother_median: (a: number) => number;
    readonly coursemediansmoother_new: (a: number) => number;
    readonly coursemediansmoother_reset: (a: number) => void;
    readonly devicePixelRatioThreshold: () => number;
    readonly exponentialvaluechase_advance: (a: number, b: number, c: number, d: number) => number;
    readonly exponentialvaluechase_new: (a: number) => number;
    readonly exponentialvaluechase_reset: (a: number) => void;
    readonly fetchElevationPoints: (a: number, b: number) => number;
    readonly fetchRasterTile: (a: number, b: number, c: number) => number;
    readonly fetchTrafficFlow: (a: number, b: number, c: number, d: number) => number;
    readonly fetchTrafficIncidents: (a: number, b: number, c: number, d: number) => number;
    readonly flushRecentDiagnosticEvents: (a: number, b: number) => number;
    readonly followZoomTowardTripEnd: (a: number) => number;
    readonly followcamera_breakOnGesture: (a: number) => void;
    readonly followcamera_courseUp: (a: number) => void;
    readonly followcamera_engageTrip: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly followcamera_isNorthUp: (a: number) => number;
    readonly followcamera_new: () => number;
    readonly followcamera_northUp: (a: number) => void;
    readonly followcamera_onFix: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly followcamera_phase: (a: number, b: number) => void;
    readonly followcamera_preTripCamera: (a: number, b: number) => void;
    readonly followcamera_reengage: (a: number) => void;
    readonly followcamera_restorePreTripCamera: (a: number, b: number) => void;
    readonly followcamera_targetBearingDegrees: (a: number) => number;
    readonly followcamera_targetCenterLatitudeDegrees: (a: number) => number;
    readonly followcamera_targetCenterLongitudeDegrees: (a: number) => number;
    readonly followcamera_targetZoomLevel: (a: number) => number;
    readonly forwardGeocode: (a: number, b: number) => number;
    readonly getSdkCompiledVersion: (a: number) => void;
    readonly initializeSdk: () => number;
    readonly locationposeanimator_new: () => number;
    readonly locationposeanimator_poseAt: (a: number, b: number) => number;
    readonly locationposeanimator_pushFix: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly locationposeanimator_reset: (a: number) => void;
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
    readonly mapview_clearVectorTileSource: (a: number, b: number) => void;
    readonly mapview_initialize: (a: number) => number;
    readonly mapview_new: (a: number, b: number, c: number, d: number) => void;
    readonly mapview_reloadTileSource: (a: number) => void;
    readonly mapview_removeOverlay: (a: number, b: number, c: number) => number;
    readonly mapview_renderFrame: (a: number, b: number, c: number) => number;
    readonly mapview_sdkCompiledVersion: (a: number, b: number) => void;
    readonly mapview_setBackgroundColor: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly mapview_setBaseMapVisible: (a: number, b: number) => void;
    readonly mapview_setCameraGestureActive: (a: number, b: number) => void;
    readonly mapview_setLocationIndicator: (a: number, b: number, c: number, d: number) => void;
    readonly mapview_setOverlays: (a: number, b: number, c: number, d: number) => void;
    readonly mapview_setVectorTileSource: (a: number, b: number, c: number) => void;
    readonly mapview_snapshot: (a: number) => number;
    readonly mapview_stageParentTile: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly mapview_updateOverlay: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly mapview_vectorTileSourceStatus: (a: number, b: number) => void;
    readonly navigator_addNavigationListener: (a: number, b: number) => number;
    readonly navigator_applyReroute: (a: number, b: number, c: number) => void;
    readonly navigator_currentTripState: (a: number, b: number) => void;
    readonly navigator_hasActiveTrip: (a: number) => number;
    readonly navigator_new: () => number;
    readonly navigator_removeNavigationListener: (a: number, b: number) => number;
    readonly navigator_startNavigation: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly navigator_stopNavigation: (a: number) => void;
    readonly navigator_updateLocation: (a: number, b: number, c: number) => void;
    readonly offlineRouteFromArchiveBytes: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly panCameraByScreenPixels: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly positioncontroller_feedFix: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
    readonly positioncontroller_isStale: (a: number, b: number) => number;
    readonly positioncontroller_latestFix: (a: number, b: number) => void;
    readonly positioncontroller_new: () => number;
    readonly positioncontroller_smoothedCourseDegrees: (a: number, b: number) => void;
    readonly positioncontroller_sourceFailed: (a: number, b: number, c: number, d: number) => void;
    readonly positioncontroller_sourceStatus: (a: number, b: number) => void;
    readonly providerRegistrations: (a: number) => void;
    readonly registerUrlTemplateRasterTileSource: (a: number, b: number) => void;
    readonly reverseGeocode: (a: number, b: number) => number;
    readonly rotateCameraByDegreesAroundScreenPoint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly routeCapabilities: (a: number) => void;
    readonly routesimulator_fixAtElapsedSeconds: (a: number, b: number, c: number) => void;
    readonly routesimulator_fixAtTravelledMeters: (a: number, b: number, c: number) => void;
    readonly routesimulator_new: (a: number, b: number, c: number) => void;
    readonly routesimulator_totalDistanceMeters: (a: number) => number;
    readonly routesimulator_totalDurationSeconds: (a: number) => number;
    readonly scaleBarDistanceLabelText: (a: number, b: number) => void;
    readonly searchPlaces: (a: number, b: number) => number;
    readonly searchPlacesInBoundary: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly selectScaleBarScale: (a: number, b: number) => void;
    readonly selectScaleBarScaleWithWidthRange: (a: number, b: number, c: number, d: number) => void;
    readonly setProviderBaseUrl: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly setProviderCredential: (a: number, b: number, c: number) => void;
    readonly signedAngularDifferenceDegrees: (a: number, b: number) => number;
    readonly smoothstepEasedProgress: (a: number) => number;
    readonly smoothsteptimedease_advance: (a: number, b: number) => number;
    readonly smoothsteptimedease_begin: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly smoothsteptimedease_is_running: (a: number) => number;
    readonly smoothsteptimedease_new: () => number;
    readonly smoothsteptimedease_reset: (a: number) => void;
    readonly smoothsteptimedease_target_value: (a: number) => number;
    readonly subscribeToDiagnosticEvents: (a: number) => void;
    readonly suggestPlaces: (a: number, b: number) => number;
    readonly suggestPlacesInBoundary: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly tileKeyForCoordinate: (a: number, b: number, c: number, d: number) => void;
    readonly tilesCovering: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly traceDispatchIntervalMilliseconds: (a: number, b: number) => number;
    readonly tracecursor_advance: (a: number) => number;
    readonly tracecursor_isFinished: (a: number) => number;
    readonly tracecursor_new: (a: number) => number;
    readonly tracecursor_nextSampleIndex: (a: number) => number;
    readonly tracecursor_peek: (a: number) => number;
    readonly tracecursor_remainingSampleCount: (a: number) => number;
    readonly tracecursor_reset: (a: number) => void;
    readonly tracecursor_sampleCount: (a: number) => number;
    readonly tracecursor_seekToSampleIndex: (a: number, b: number) => void;
    readonly trafficFlowCacheStatistics: (a: number) => void;
    readonly vectorTileGeographicBounds: (a: number, b: number, c: number, d: number) => void;
    readonly vectorTileOverlayDescriptors: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly vectorTileOverlayDescriptorsForStyle: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly zoomCameraByLevelsAroundScreenPoint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly __wasm_bindgen_func_elem_2996: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_2996_148: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_2996_149: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_9875: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_9896: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_3000: (a: number, b: number, c: number) => void;
    readonly __wasm_bindgen_func_elem_3000_147: (a: number, b: number, c: number) => void;
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
