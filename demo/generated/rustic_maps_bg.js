/**
 * The browser GPU map canvas the page owns. Construct it over an
 * `HTMLCanvasElement`, [`BrowserMapView::initialize`] it once (acquiring the
 * adapter and device and building the tile pipeline), then call
 * [`BrowserMapView::render_frame`] per wanted frame; each call re-schedules
 * the visible tiles and redraws.
 */
export class BrowserMapView {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BrowserMapViewFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_browsermapview_free(ptr, 0);
    }
    /**
     * Adds one overlay descriptor to the drawn list and answers the
     * generated opaque identifier addressing it (`overlay-1`, `overlay-2`,
     * …; monotonic per view, never reused). Validation is exactly
     * `set_overlays`' single-descriptor rule: a refused descriptor throws
     * and adds nothing. The new overlay draws last, over the entries
     * already in the list.
     * @param {any} overlay
     * @returns {string}
     */
    addOverlay(overlay) {
        let deferred2_0;
        let deferred2_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_addOverlay(retptr, this.__wbg_ptr, addHeapObject(overlay));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr1 = r0;
            var len1 = r1;
            if (r3) {
                ptr1 = 0; len1 = 0;
                throw takeObject(r2);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export5(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Reads the geographic bounds of the viewport at the stored camera pose
     * — the browser shape of the contract's
     * `MapView.camera_geographic_bounds`.
     *
     * The viewport and vertical field of view are explicit arguments,
     * exactly like the projection methods, because the browser has no
     * attached platform surface to read them from. The four viewport corners
     * are unprojected first; a steep pitch can put the far corner below the
     * horizon, so when fewer than three corners reach the ground the
     * camera's own ground scale bounds a box around its center instead.
     *
     * # Parameters
     * - `width_pixels` / `height_pixels` — the viewport extent.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Returns
     * `{southWestLatitude, southWestLongitude, northEastLatitude,
     * northEastLongitude}`, or null when the projection cannot answer.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid viewport.
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} field_of_view_degrees
     * @returns {any}
     */
    cameraGeographicBounds(width_pixels, height_pixels, field_of_view_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_cameraGeographicBounds(retptr, this.__wbg_ptr, width_pixels, height_pixels, field_of_view_degrees);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Reads the camera pose this view holds — the browser shape of the
     * contract's `MapView.camera()`.
     *
     * The pose starts at zero latitude and longitude, zoom 2, north-up and
     * top-down, and every accepted `setCamera`, `fitBounds` or rendered
     * frame updates it. The view stores its own pose so the page reports the
     * same value it hands to a frame; drawing itself still receives the pose
     * as an argument.
     *
     * # Returns
     * The current camera pose.
     * @returns {MapCamera}
     */
    camera() {
        const ret = wasm.browsermapview_camera(this.__wbg_ptr);
        return MapCamera.__wrap(ret);
    }
    /**
     * Clears the location-indicator layer; following frames draw no
     * indicator until [`BrowserMapView::set_location_indicator`] supplies a
     * new one.
     */
    clearLocationIndicator() {
        wasm.browsermapview_clearLocationIndicator(this.__wbg_ptr);
    }
    /**
     * Clears the overlay list; following frames draw the tiles alone until
     * [`BrowserMapView::set_overlays`] or [`BrowserMapView::add_overlay`] supplies a new
     * list. Clears the bulk list and every addressed overlay alike.
     */
    clearOverlays() {
        wasm.browsermapview_clearOverlays(this.__wbg_ptr);
    }
    /**
     * Removes the vector base map (the UDL
     * `MapView.clear_vector_tile_source` contract member): following frames
     * draw raster tiles and overlays alone. A clear that lands while a frame
     * resolves is deferred to that frame's end, like installing, and it
     * cancels an install that was waiting.
     */
    clearVectorTileSource() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_clearVectorTileSource(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * The device pixels one CSS pixel covers on this canvas — the browser
     * shape of the wrapper's `displayScale` readback.
     *
     * # Returns
     * The drawing-buffer-to-layout ratio, or one before the page lays the
     * canvas out.
     * @returns {number}
     */
    displayScale() {
        const ret = wasm.browsermapview_displayScale(this.__wbg_ptr);
        return ret;
    }
    /**
     * Frames a bounding box in the caller's viewport and adopts the fitted
     * camera — the browser shape of the contract's `MapView.fit_bounds`.
     *
     * The viewport and insets are explicit arguments, exactly like
     * `MapCamera.fittingBounds` and `groundMetersPerScreenPixel`, because a
     * page frames its CSS-pixel viewport rather than the canvas' drawing
     * buffer. The fit is top-down and north-up and keeps the whole box
     * inside the inset area, clamped to `maximum_zoom_level`.
     *
     * # Parameters
     * - `south_west_latitude` / `south_west_longitude` — the box's
     *   south-west corner.
     * - `north_east_latitude` / `north_east_longitude` — the box's
     *   north-east corner.
     * - `width_pixels` / `height_pixels` — the viewport extent.
     * - `inset_top_pixels` / `inset_right_pixels` / `inset_bottom_pixels` /
     *   `inset_left_pixels` — pixels kept clear on each viewport edge.
     * - `maximum_zoom_level` — upper zoom bound for the fitted camera.
     *
     * # Returns
     * The adopted camera, or null before `initialize` (no surface yet);
     * nothing changes in that case.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when the bounding box is not
     * canonical, the viewport is not positive, the insets are negative or
     * unusable, the maximum zoom is not finite, or the box spans no positive
     * world area. A refused fit keeps the previous camera.
     * @param {number} south_west_latitude
     * @param {number} south_west_longitude
     * @param {number} north_east_latitude
     * @param {number} north_east_longitude
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} inset_top_pixels
     * @param {number} inset_right_pixels
     * @param {number} inset_bottom_pixels
     * @param {number} inset_left_pixels
     * @param {number} maximum_zoom_level
     * @returns {any}
     */
    fitBounds(south_west_latitude, south_west_longitude, north_east_latitude, north_east_longitude, width_pixels, height_pixels, inset_top_pixels, inset_right_pixels, inset_bottom_pixels, inset_left_pixels, maximum_zoom_level) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_fitBounds(retptr, this.__wbg_ptr, south_west_latitude, south_west_longitude, north_east_latitude, north_east_longitude, width_pixels, height_pixels, inset_top_pixels, inset_right_pixels, inset_bottom_pixels, inset_left_pixels, maximum_zoom_level);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Reports whether a frame has drawn and presented successfully since
     * this view was built — the browser shape of the wrapper's
     * `hasDrawnFirstFrame`.
     *
     * # Returns
     * True after the first successful `renderFrame` presentation.
     * @returns {boolean}
     */
    hasDrawnFirstFrame() {
        const ret = wasm.browsermapview_hasDrawnFirstFrame(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Acquires the adapter and device, picks the pass-through surface
     * format, and builds the tile pipeline. Resolves to the adapter
     * description (graphics backend and adapter name) for the page's status
     * line, or fails when no WebGPU adapter supports this canvas — the page
     * then degrades to the 2D tile grid overlay. Never callable twice on
     * the same canvas.
     * @returns {Promise<string>}
     */
    initialize() {
        const ret = wasm.browsermapview_initialize(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Builds the canvas renderer over the page's canvas element
     * (`new BrowserMapView(canvas, tileResolution?)`). The tile pixel
     * resolution is optional: omitted, it follows the same
     * device-pixel-ratio rule as `retinaDevicePixelRatioThreshold()`;
     * supplied, it is honoured verbatim. Fails
     * when the element cannot host a GPU surface (for example after another
     * context already claimed the element). Call [`BrowserMapView::initialize`]
     * before the first [`BrowserMapView::render_frame`].
     * @param {HTMLCanvasElement} canvas
     * @param {TileResolution | null} [tile_resolution]
     */
    constructor(canvas, tile_resolution) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_new(retptr, addHeapObject(canvas), isLikeNone(tile_resolution) ? 2 : tile_resolution);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0;
            BrowserMapViewFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
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
    reloadTileSource() {
        wasm.browsermapview_reloadTileSource(this.__wbg_ptr);
    }
    /**
     * Removes the overlay addressed by `identifier`; answers whether the
     * identifier was present (an unknown identifier is not an error).
     * @param {string} identifier
     * @returns {boolean}
     */
    removeOverlay(identifier) {
        const ptr0 = passStringToWasm0(identifier, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.browsermapview_removeOverlay(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Renders one map frame for the camera pose into the canvas, resolving
     * freshly visible tiles from the same-origin `/tiles` route first.
     *
     * Resolves to a statistics object the page's readout consumes:
     * `requestedTiles` (tiles the camera listed at the fetch zoom),
     * `drawnTiles` (tiles with pooled imagery over their span this frame),
     * `drawnFragments` (draw quads after world-copy fragment splitting),
     * `missingTiles` (requested tiles the scheduler could not resolve from
     * their own or an ancestor's pooled imagery this frame; a tile the frame
     * culls as off-screen but has imagery for is not missing;
     * `missingTileAddresses` names up to sixteen of them as `z/x/y` for a
     * diagnostics readback),
     * `zoomTransitionRunning` (whether a tile zoom-level cross-fade, a
     * declared style transition or the styled vector base's own cross-fade
     * still owes frames, so the page keeps drawing at the animation
     * cadence),
     * `motionGraded` (whether a camera gesture was active, so this frame
     * reused settled geometry and skipped label assembly; the first frame
     * after the gesture's end resolves both),
     * `retainedTiles` (retired-level tiles drawn over the new level for the
     * raster cross-fade),
     * `vectorZoomTransitionRunning` and `vectorRetainedTiles` (the styled
     * vector base's equivalents: whether its cross-fade still owes frames,
     * and how many retired-level tiles it drew this frame),
     * `vectorBaseLabelCandidateExtractionCount` and
     * `vectorBaseLabelCandidateCacheHitCount` (tiles whose label candidates
     * this frame extracted and tiles served from the per-tile cache; an
     * unchanged settle frame reports zero extractions),
     * `tileZoomLevel` (the fetch zoom, clamped to the recorded fixtures),
     * `tileResolution` (the resolution the frame's fixtures were
     * fetched and sampled at) and `overlayTriangles` (triangles in the
     * cached world-space overlay layer drawn over the tiles this frame; zero
     * without overlays; the GPU clips copies and near-plane fragments).
     * `pendingVectorTiles` and `drawnVectorTiles` report the vector base's
     * own pending and drawn tile counts (zero while no vector base serves),
     * and `rasterTilesRetrying` is true when the raster layer listed tiles,
     * drew none and still holds a retry schedule: the honest "waiting on the
     * tile source" state rather than a silent black frame.
     * With the raster tile layer hidden through
     * [`BrowserMapView::set_tile_layer_visible`] the frame skips the whole
     * tile pipeline and reports `requestedTiles`, `drawnTiles`,
     * `drawnFragments` and `missingTiles` as zero while still presenting the
     * overlay and indicator layers.
     *
     * The camera binding is consumed by value (the `wasm-bindgen` class
     * parameter semantics); the page builds a fresh camera per changed
     * pose, exactly as it already does. The frame is authoritative for the
     * stored pose: `camera()` reports the pose this frame drew after it
     * returns. Two overlapping calls are a construction-time borrow
     * violation — the page serializes its frames behind a busy flag and
     * never overlaps.
     * @param {MapCamera} camera
     * @param {number} field_of_view_degrees
     * @returns {Promise<object>}
     */
    renderFrame(camera, field_of_view_degrees) {
        _assertClass(camera, MapCamera);
        var ptr0 = camera.__destroy_into_raw();
        const ret = wasm.browsermapview_renderFrame(this.__wbg_ptr, ptr0, field_of_view_degrees);
        return takeObject(ret);
    }
    /**
     * Rotates the content clockwise by `clockwise_degrees` around the
     * viewport center, the browser shape of the wrapper's
     * `rotateByDegrees`.
     *
     * The content-follows-fingers convention makes a clockwise content turn
     * lower the camera bearing, so the contract's clockwise-positive bearing
     * delta receives the negated value — the same sign the native wrappers
     * apply. Before the first frame has configured the surface there is no
     * viewport to rotate around, so the call changes nothing.
     *
     * # Parameters
     * - `clockwise_degrees` — content rotation in degrees.
     * @param {number} clockwise_degrees
     */
    rotateByDegrees(clockwise_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_rotateByDegrees(retptr, this.__wbg_ptr, clockwise_degrees);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Sets the frame pass's clear color (each channel 0..=1), the background
     * behind any tiles or overlays that do not cover the surface. The
     * default is the shared dark clear; the page paints a light clear around
     * a vector base so the gaps between its fills do not read as a black
     * map. A channel outside 0..=1 or a non-finite value is refused.
     * @param {number} red
     * @param {number} green
     * @param {number} blue
     * @param {number} alpha
     */
    setBackgroundColor(red, green, blue, alpha) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_setBackgroundColor(retptr, this.__wbg_ptr, red, green, blue, alpha);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Shows or hides the raster tile base layer in every following
     * [`BrowserMapView::render_frame`].
     *
     * Hidden frames still clear the surface and draw the overlay and
     * location-indicator layers, so the page can paint a vector base map
     * through [`BrowserMapView::set_overlays`] while this raster layer is
     * hidden. A hidden frame skips the tile listing, same-origin fetches,
     * scheduler warm/resolve, texture uploads and tile draws, and reports
     * `requestedTiles: 0`, `drawnTiles: 0` and `missingTiles: 0` while
     * keeping the current `tileZoomLevel`, `tileResolution` and
     * `overlayTriangles` statistics. Showing the layer again resolves tiles
     * normally on the next frame (the texture cache survives hidden frames).
     * @param {boolean} visible
     */
    setBaseMapVisible(visible) {
        wasm.browsermapview_setBaseMapVisible(this.__wbg_ptr, visible);
    }
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
     * @param {boolean} active
     */
    setCameraGestureActive(active) {
        wasm.browsermapview_setCameraGestureActive(this.__wbg_ptr, active);
    }
    /**
     * Adopts `camera` as the pose following frames and readbacks report —
     * the browser shape of the contract's `MapView.set_camera`.
     *
     * The pose is already validated (its constructor clamps zoom and pitch
     * and wraps the bearing), so adopting it cannot fail and never changes
     * an overlay. The binding borrows `camera`, so the page keeps using its
     * own instance after the call.
     *
     * # Parameters
     * - `camera` — the pose following frames and readbacks report.
     * @param {MapCamera} camera
     */
    setCamera(camera) {
        _assertClass(camera, MapCamera);
        wasm.browsermapview_setCamera(this.__wbg_ptr, camera.__wbg_ptr);
    }
    /**
     * Sets the location-indicator layer drawn over the overlays in every
     * following [`BrowserMapView::render_frame`] (the native surface's top layer),
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
     * @param {any} state_value
     * @param {any} style_value
     */
    setLocationIndicator(state_value, style_value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_setLocationIndicator(retptr, this.__wbg_ptr, addHeapObject(state_value), addHeapObject(style_value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Sets the overlay list drawn over the tiles in every following
     * [`BrowserMapView::render_frame`], replacing any earlier list in order
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
     * @param {any[]} overlays
     */
    setOverlays(overlays) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayJsValueToWasm0(overlays, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.browsermapview_setOverlays(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Installs a provider-backed base painted with the style document the
     * provider publishes (`MapView.set_provider_vector_tile_source_from_document`'s
     * contract member). The document is fetched through the configured
     * provider's own authenticated client, compiled once and kept per
     * provider and address, so installing the same family again costs no
     * request. A failed fetch or an uncompilable document throws a coded
     * failure and leaves the installed base in force.
     *
     * # Parameters
     * - `source` — `{providerKey, styleId}`.
     * - `style_document_url` — the absolute address of the provider's style
     *   document, without a credential.
     * @param {any} source
     * @param {string} style_document_url
     * @returns {Promise<void>}
     */
    setProviderVectorTileSourceFromDocument(source, style_document_url) {
        const ptr0 = passStringToWasm0(style_document_url, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.browsermapview_setProviderVectorTileSourceFromDocument(this.__wbg_ptr, addHeapObject(source), ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Installs a styled vector base map served by a provider configured
     * through `configureProvider` for the vector-tiles capability (the UDL
     * `MapView.set_provider_vector_tile_source` contract member).
     *
     * The descriptor is one plain JavaScript object carrying the UDL
     * `ProviderVectorTileSource` fields in lower camel case:
     * `{providerKey, styleId}`. The provider supplies its own tileset name,
     * attribution line and zoom span; the page chooses only the provider and
     * the committed style. A call naming a provider other than the one
     * configured for vector tiles, made before any vector-tile provider is
     * configured, or naming an unknown style id throws a coded failure and
     * leaves the installed base in force. An install that lands while a frame
     * resolves is deferred to that frame's end, exactly like
     * [`Self::set_vector_tile_source`].
     * @param {any} source
     */
    setProviderVectorTileSource(source) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_setProviderVectorTileSource(retptr, this.__wbg_ptr, addHeapObject(source));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Installs a styled vector base map (the UDL
     * `MapView.set_vector_tile_source` contract member).
     *
     * The descriptor is one plain JavaScript object carrying the UDL
     * `UrlTemplateVectorTileSource` fields in lower camel case:
     * `{urlTemplate, sourceName, attributionText, styleId,
     * minimumZoomLevel, maximumZoomLevel}`, plus the optional
     * `tokenBucketCapacityTokens` and `refillTokensPerSecond` pacing rates
     * (absent fields keep the SDK's documented bucket) and the optional
     * `termsText`, `subdomains`, `headers` and `styleHints` the tileset's
     * usage policy and template declare (absent fields mean none, and a
     * header object carries `{name, value}` strings). The template must be
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
     * @param {any} source
     */
    setVectorTileSource(source) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_setVectorTileSource(retptr, this.__wbg_ptr, addHeapObject(source));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Answers the last presented frame's pixels as RGBA bytes without
     * reading the canvas through the compositor.
     *
     * The most recent [`BrowserMapView::render_frame`] left a draw list behind;
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
     * @returns {Promise<Uint8Array>}
     */
    snapshot() {
        const ret = wasm.browsermapview_snapshot(this.__wbg_ptr);
        return takeObject(ret);
    }
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
     * @param {number} fallback_tile_x
     * @param {number} fallback_tile_y
     * @param {number} fallback_zoom_level
     * @param {number} parent_tile_x
     * @param {number} parent_tile_y
     * @param {number} parent_zoom_level
     * @returns {Promise<void>}
     */
    stageParentTile(fallback_tile_x, fallback_tile_y, fallback_zoom_level, parent_tile_x, parent_tile_y, parent_zoom_level) {
        const ret = wasm.browsermapview_stageParentTile(this.__wbg_ptr, fallback_tile_x, fallback_tile_y, fallback_zoom_level, parent_tile_x, parent_tile_y, parent_zoom_level);
        return takeObject(ret);
    }
    /**
     * Replaces the overlay addressed by `identifier` in its draw position.
     * An invalid descriptor throws and keeps the previous overlay; an
     * unknown identifier throws an `invalidArgument` failure naming it.
     * @param {string} identifier
     * @param {any} overlay
     */
    updateOverlay(identifier, overlay) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(identifier, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.browsermapview_updateOverlay(retptr, this.__wbg_ptr, ptr0, len0, addHeapObject(overlay));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Reads the vector base source's status (the UDL
     * `MapView.vector_tile_source_status` contract member): the configured
     * source's style, name, attribution and zoom ceiling plus the last
     * resolved frame's drawn, pending and failed tile counts. Every status
     * shape also carries `pendingVectorInstall`, which reports whether a
     * document install is still resolving. While a source is configured, the
     * object additionally carries the frame diagnostics — payload-cache hits
     * and misses, in-flight fetches and the first-drawn-tile latency — as
     * additive fields. A pure query — it never fetches or draws — and it
     * answers an honest not-configured status with no source installed.
     * @returns {object}
     */
    vectorTileSourceStatus() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_vectorTileSourceStatus(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * The render viewport height in pixels, the browser shape of the
     * wrapper's `viewportHeightPixels` readback.
     *
     * # Returns
     * The surface extent the last frame configured, or zero before the
     * first frame.
     * @returns {number}
     */
    viewportHeightPixels() {
        const ret = wasm.browsermapview_viewportHeightPixels(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * The capped physical-pixel extent the surface is configured to, the
     * browser shape of the wrapper's `viewportPixelExtent` readback.
     *
     * # Returns
     * `{widthPixels, heightPixels}`, or null before the first frame.
     * @returns {any}
     */
    viewportPixelExtent() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.browsermapview_viewportPixelExtent(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * The render viewport width in pixels, the browser shape of the
     * wrapper's `viewportWidthPixels` readback.
     *
     * # Returns
     * The surface extent the last frame configured, or zero before the
     * first frame.
     * @returns {number}
     */
    viewportWidthPixels() {
        const ret = wasm.browsermapview_viewportWidthPixels(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) BrowserMapView.prototype[Symbol.dispose] = BrowserMapView.prototype.free;

/**
 * A fixed-window circular median over recent course-over-ground samples.
 */
export class CourseMedianSmoother {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CourseMedianSmootherFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_coursemediansmoother_free(ptr, 0);
    }
    /**
     * Adds one fix's course-over-ground, dropping the oldest sample.
     * @param {number} course_degrees
     */
    add(course_degrees) {
        wasm.coursemediansmoother_add(this.__wbg_ptr, course_degrees);
    }
    /**
     * The circular median, or `null` while the window holds no sample.
     * @returns {any}
     */
    median() {
        const ret = wasm.coursemediansmoother_median(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Creates a smoother over `window_fix_count` recent samples.
     * @param {number} window_fix_count
     */
    constructor(window_fix_count) {
        const ret = wasm.coursemediansmoother_new(window_fix_count);
        this.__wbg_ptr = ret;
        CourseMedianSmootherFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Empties the window.
     */
    reset() {
        wasm.coursemediansmoother_reset(this.__wbg_ptr);
    }
}
if (Symbol.dispose) CourseMedianSmoother.prototype[Symbol.dispose] = CourseMedianSmoother.prototype.free;

/**
 * An exponential chase toward a moving target.
 */
export class ExponentialValueChase {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ExponentialValueChaseFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_exponentialvaluechase_free(ptr, 0);
    }
    /**
     * Advances the chase toward `target`, returning the next current value.
     * @param {number} current
     * @param {number} target
     * @param {number} now_milliseconds
     * @returns {number}
     */
    advance(current, target, now_milliseconds) {
        const ret = wasm.exponentialvaluechase_advance(this.__wbg_ptr, current, target, now_milliseconds);
        return ret;
    }
    /**
     * Creates a chase with the given time constant in milliseconds.
     * @param {number} time_constant_milliseconds
     */
    constructor(time_constant_milliseconds) {
        const ret = wasm.exponentialvaluechase_new(time_constant_milliseconds);
        this.__wbg_ptr = ret;
        ExponentialValueChaseFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Clears the frame clock so the next call is treated as a first frame.
     */
    reset() {
        wasm.exponentialvaluechase_reset(this.__wbg_ptr);
    }
}
if (Symbol.dispose) ExponentialValueChase.prototype[Symbol.dispose] = ExponentialValueChase.prototype.free;

/**
 * The navigation follow-camera state machine and its targets.
 */
export class FollowCamera {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FollowCameraFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_followcamera_free(ptr, 0);
    }
    /**
     * A user gesture (drag, pinch or rotate) breaks follow immediately.
     */
    breakOnGesture() {
        wasm.followcamera_breakOnGesture(this.__wbg_ptr);
    }
    /**
     * Resumes the eased course chase on the next fix.
     */
    courseUp() {
        wasm.followcamera_courseUp(this.__wbg_ptr);
    }
    /**
     * Applies the trip's follow camera and captures the pre-trip pose.
     * @param {number} current_center_latitude_degrees
     * @param {number} current_center_longitude_degrees
     * @param {number} current_zoom_level
     * @param {number} current_bearing_degrees
     * @param {number} current_pitch_degrees
     */
    engageTrip(current_center_latitude_degrees, current_center_longitude_degrees, current_zoom_level, current_bearing_degrees, current_pitch_degrees) {
        wasm.followcamera_engageTrip(this.__wbg_ptr, current_center_latitude_degrees, current_center_longitude_degrees, current_zoom_level, current_bearing_degrees, current_pitch_degrees);
    }
    /**
     * Whether the camera is holding north-up.
     * @returns {boolean}
     */
    isNorthUp() {
        const ret = wasm.followcamera_isNorthUp(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Creates a disengaged camera with the default course-smoothing window.
     */
    constructor() {
        const ret = wasm.followcamera_new();
        this.__wbg_ptr = ret;
        FollowCameraFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Holds the camera north-up whatever the fixes report.
     */
    northUp() {
        wasm.followcamera_northUp(this.__wbg_ptr);
    }
    /**
     * Applies one location fix of the active trip.
     * @param {number} latitude_degrees
     * @param {number} longitude_degrees
     * @param {number | null | undefined} course_heading_degrees
     * @param {number} remaining_distance_fraction
     */
    onFix(latitude_degrees, longitude_degrees, course_heading_degrees, remaining_distance_fraction) {
        wasm.followcamera_onFix(this.__wbg_ptr, latitude_degrees, longitude_degrees, !isLikeNone(course_heading_degrees), isLikeNone(course_heading_degrees) ? 0 : course_heading_degrees, remaining_distance_fraction);
    }
    /**
     * The current follow phase.
     * @returns {string}
     */
    get phase() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.followcamera_phase(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export5(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * The captured pre-trip camera, or `null` outside a trip.
     * @returns {any}
     */
    get preTripCamera() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.followcamera_preTripCamera(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * The my-location control's explicit re-engage.
     */
    reengage() {
        wasm.followcamera_reengage(this.__wbg_ptr);
    }
    /**
     * Ends the trip, returning the captured pre-trip camera or `null`.
     * @returns {any}
     */
    restorePreTripCamera() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.followcamera_restorePreTripCamera(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * The target bearing in degrees, or `null` until a fix reports a course.
     * @returns {any}
     */
    get targetBearingDegrees() {
        const ret = wasm.followcamera_targetBearingDegrees(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The target centre latitude in degrees.
     * @returns {number}
     */
    get targetCenterLatitudeDegrees() {
        const ret = wasm.followcamera_targetCenterLatitudeDegrees(this.__wbg_ptr);
        return ret;
    }
    /**
     * The target centre longitude in degrees.
     * @returns {number}
     */
    get targetCenterLongitudeDegrees() {
        const ret = wasm.followcamera_targetCenterLongitudeDegrees(this.__wbg_ptr);
        return ret;
    }
    /**
     * The target zoom level.
     * @returns {number}
     */
    get targetZoomLevel() {
        const ret = wasm.followcamera_targetZoomLevel(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) FollowCamera.prototype[Symbol.dispose] = FollowCamera.prototype.free;

/**
 * The location puck's interpolation between fixes.
 *
 * `pushFix` starts (or retargets) a motion toward the measured position;
 * `poseAt` answers the pose to draw at the given instant, so the page's
 * frame pump can draw a puck that glides instead of hopping.
 */
export class LocationPoseAnimator {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LocationPoseAnimatorFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_locationposeanimator_free(ptr, 0);
    }
    /**
     * Creates an animator with no fix yet.
     */
    constructor() {
        const ret = wasm.locationposeanimator_new();
        this.__wbg_ptr = ret;
        LocationPoseAnimatorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * The pose to draw at `now_milliseconds`, or `undefined` before the first
     * fix.
     * @param {number} now_milliseconds
     * @returns {object | undefined}
     */
    poseAt(now_milliseconds) {
        const ret = wasm.locationposeanimator_poseAt(this.__wbg_ptr, now_milliseconds);
        return takeObject(ret);
    }
    /**
     * Starts or retargets the motion toward one measured position.
     * @param {number} latitude_degrees
     * @param {number} longitude_degrees
     * @param {number | null | undefined} course_degrees
     * @param {number | null | undefined} horizontal_accuracy_meters
     * @param {number} received_at_milliseconds
     */
    pushFix(latitude_degrees, longitude_degrees, course_degrees, horizontal_accuracy_meters, received_at_milliseconds) {
        wasm.locationposeanimator_pushFix(this.__wbg_ptr, latitude_degrees, longitude_degrees, !isLikeNone(course_degrees), isLikeNone(course_degrees) ? 0 : course_degrees, !isLikeNone(horizontal_accuracy_meters), isLikeNone(horizontal_accuracy_meters) ? 0 : horizontal_accuracy_meters, received_at_milliseconds);
    }
    /**
     * Forgets every fix, so the next one draws immediately.
     */
    reset() {
        wasm.locationposeanimator_reset(this.__wbg_ptr);
    }
}
if (Symbol.dispose) LocationPoseAnimator.prototype[Symbol.dispose] = LocationPoseAnimator.prototype.free;

/**
 * Anchored map camera (geographic center, zoom, bearing, pitch) mirroring
 * the native [`rustic_maps_rendering::MapCamera`]. The ground point under the
 * center always sits at the viewport center.
 */
export class MapCamera {
    static __wrap(ptr) {
        const obj = Object.create(MapCamera.prototype);
        obj.__wbg_ptr = ptr;
        MapCameraFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MapCameraFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_mapcamera_free(ptr, 0);
    }
    /**
     * The camera's bearing in degrees — the contract's
     * `bearing_degrees()` getter.
     * @returns {number}
     */
    bearingDegrees() {
        const ret = wasm.mapcamera_bearingDegrees(this.__wbg_ptr);
        return ret;
    }
    /**
     * The camera's center, as `{latitude, longitude}` — the contract's
     * `center()` getter. The getters make a fitted camera's chosen framing
     * readable.
     * @returns {object}
     */
    center() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_center(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Builds the camera that frames a bounding box inside the viewport's
     * inset region, mirroring the contract's `fit_bounds` constructor:
     * top-down and north-up, zoomed to the largest level that keeps the
     * whole box inside the inset area (clamped to `maximum_zoom_level`), and
     * centered on the inset region's center. Fails with a message when the
     * corners, viewport, insets or maximum zoom are unusable.
     * @param {number} south_west_latitude
     * @param {number} south_west_longitude
     * @param {number} north_east_latitude
     * @param {number} north_east_longitude
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} inset_top_pixels
     * @param {number} inset_right_pixels
     * @param {number} inset_bottom_pixels
     * @param {number} inset_left_pixels
     * @param {number} maximum_zoom_level
     * @returns {MapCamera}
     */
    static fittingBounds(south_west_latitude, south_west_longitude, north_east_latitude, north_east_longitude, width_pixels, height_pixels, inset_top_pixels, inset_right_pixels, inset_bottom_pixels, inset_left_pixels, maximum_zoom_level) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_fittingBounds(retptr, south_west_latitude, south_west_longitude, north_east_latitude, north_east_longitude, width_pixels, height_pixels, inset_top_pixels, inset_right_pixels, inset_bottom_pixels, inset_left_pixels, maximum_zoom_level);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return MapCamera.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Ground meters represented by one screen pixel at the camera's center,
     * the value a scale bar needs. The viewport and field-of-view arguments
     * mirror the projection methods' shape and the viewport is validated
     * like everywhere else; the flat-centered approximation is itself
     * independent of both.
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} field_of_view_degrees
     * @returns {number}
     */
    groundMetersPerScreenPixel(width_pixels, height_pixels, field_of_view_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_groundMetersPerScreenPixel(retptr, this.__wbg_ptr, width_pixels, height_pixels, field_of_view_degrees);
            var r0 = getDataViewMemory0().getFloat64(retptr + 8 * 0, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            return r0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Eases from `start_camera` toward `target_camera` over `fraction` —
     * the contract's `MapCamera.interpolate` member.
     *
     * The SDK's one camera-interpolation curve: the fraction is clamped into
     * `[0, 1]` and eased with smoothstep, the center travels the shortest
     * longitude path in Mercator space, zoom and pitch interpolate linearly,
     * and the bearing takes the shortest arc. Fractions at or below zero
     * answer `start_camera` verbatim and fractions at or above one answer
     * `target_camera` verbatim, so an animation's endpoints are exact.
     *
     * # Parameters
     * - `start_camera` — the pose the interpolation starts from.
     * - `target_camera` — the pose the interpolation heads toward.
     * - `fraction` — animation progress, clamped into `[0, 1]`.
     *
     * # Returns
     * The camera pose at the eased progress between the two poses.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when `fraction` is not finite.
     * @param {MapCamera} start_camera
     * @param {MapCamera} target_camera
     * @param {number} fraction
     * @returns {MapCamera}
     */
    static interpolate(start_camera, target_camera, fraction) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(start_camera, MapCamera);
            _assertClass(target_camera, MapCamera);
            wasm.mapcamera_interpolate(retptr, start_camera.__wbg_ptr, target_camera.__wbg_ptr, fraction);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return MapCamera.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Builds a camera, clamping zoom and pitch and wrapping the bearing
     * into `[0, 360)`, exactly like the native constructor.
     * @param {number} center_latitude
     * @param {number} center_longitude
     * @param {number} zoom_level
     * @param {number} bearing_degrees
     * @param {number} pitch_degrees
     */
    constructor(center_latitude, center_longitude, zoom_level, bearing_degrees, pitch_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_new(retptr, center_latitude, center_longitude, zoom_level, bearing_degrees, pitch_degrees);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0;
            MapCameraFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Pans the camera by a pointer travel of `delta_x_pixels` x
     * `delta_y_pixels` (screen pixels): the ground point the pointer just
     * moved over becomes the new camera center, so map content tracks the
     * pointer exactly. Answers the input camera pose unchanged when the
     * delta's ray misses the ground plane, as the contract member
     * documents.
     * @param {number} delta_x_pixels
     * @param {number} delta_y_pixels
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} field_of_view_degrees
     * @returns {object}
     */
    panByScreenPixels(delta_x_pixels, delta_y_pixels, width_pixels, height_pixels, field_of_view_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_panByScreenPixels(retptr, this.__wbg_ptr, delta_x_pixels, delta_y_pixels, width_pixels, height_pixels, field_of_view_degrees);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * The camera's pitch in degrees — the contract's `pitch_degrees()`
     * getter.
     * @returns {number}
     */
    pitchDegrees() {
        const ret = wasm.mapcamera_pitchDegrees(this.__wbg_ptr);
        return ret;
    }
    /**
     * Projects a coordinate to viewport pixels (origin top-left, y down),
     * as `{x, y}`. Fails with a message when the point lies behind the
     * camera.
     * @param {number} latitude
     * @param {number} longitude
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} field_of_view_degrees
     * @returns {object}
     */
    projectToScreen(latitude, longitude, width_pixels, height_pixels, field_of_view_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_projectToScreen(retptr, this.__wbg_ptr, latitude, longitude, width_pixels, height_pixels, field_of_view_degrees);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Rotates the camera bearing by `delta_bearing_degrees` (degrees
     * clockwise, wrapping into `[0, 360)`) keeping the world point under
     * `focal_x_pixels`/`focal_y_pixels` fixed under that pixel; the
     * uncorrected rotation answers when the focal ray misses the ground
     * plane.
     * @param {number} delta_bearing_degrees
     * @param {number} focal_x_pixels
     * @param {number} focal_y_pixels
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} field_of_view_degrees
     * @returns {object}
     */
    rotateByDegreesAroundScreenPoint(delta_bearing_degrees, focal_x_pixels, focal_y_pixels, width_pixels, height_pixels, field_of_view_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_rotateByDegreesAroundScreenPoint(retptr, this.__wbg_ptr, delta_bearing_degrees, focal_x_pixels, focal_y_pixels, width_pixels, height_pixels, field_of_view_degrees);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Unprojects a viewport pixel onto the ground plane, as
     * `{latitude, longitude}`. Fails with a message when the ray misses the
     * ground (typically below the horizon at steep pitch).
     * @param {number} screen_x
     * @param {number} screen_y
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} field_of_view_degrees
     * @returns {object}
     */
    screenToGroundCoordinate(screen_x, screen_y, width_pixels, height_pixels, field_of_view_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_screenToGroundCoordinate(retptr, this.__wbg_ptr, screen_x, screen_y, width_pixels, height_pixels, field_of_view_degrees);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Nearest whole zoom level a tile fetch should use for this camera,
     * mirroring the native `tile_zoom_level`.
     * @returns {number}
     */
    tileZoomLevel() {
        const ret = wasm.mapcamera_tileZoomLevel(this.__wbg_ptr);
        return ret;
    }
    /**
     * Every tile at `tile_zoom_level` whose area intersects the visible
     * ground, as an array of `{tileX, tileY, zoomLevel}` sorted row-major
     * from the north, mirroring the native `visible_tile_keys`.
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} field_of_view_degrees
     * @param {number} tile_zoom_level
     * @returns {Array<any>}
     */
    visibleTileKeys(width_pixels, height_pixels, field_of_view_degrees, tile_zoom_level) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_visibleTileKeys(retptr, this.__wbg_ptr, width_pixels, height_pixels, field_of_view_degrees, tile_zoom_level);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Zooms the camera by `delta_zoom_levels` keeping the world point under
     * `focal_x_pixels`/`focal_y_pixels` fixed under that pixel; the
     * camera's own zoom range clamps the answer, and the uncorrected zoom
     * answers when the focal ray misses the ground plane.
     * @param {number} delta_zoom_levels
     * @param {number} focal_x_pixels
     * @param {number} focal_y_pixels
     * @param {number} width_pixels
     * @param {number} height_pixels
     * @param {number} field_of_view_degrees
     * @returns {object}
     */
    zoomByLevelsAroundScreenPoint(delta_zoom_levels, focal_x_pixels, focal_y_pixels, width_pixels, height_pixels, field_of_view_degrees) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.mapcamera_zoomByLevelsAroundScreenPoint(retptr, this.__wbg_ptr, delta_zoom_levels, focal_x_pixels, focal_y_pixels, width_pixels, height_pixels, field_of_view_degrees);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * The camera's zoom level — the contract's `zoom_level()` getter.
     * @returns {number}
     */
    zoomLevel() {
        const ret = wasm.mapcamera_zoomLevel(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) MapCamera.prototype[Symbol.dispose] = MapCamera.prototype.free;

/**
 * A linear-in-time, smoothstep-eased value move.
 */
export class SmoothstepTimedEase {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SmoothstepTimedEaseFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_smoothsteptimedease_free(ptr, 0);
    }
    /**
     * Advances the ease at `now_milliseconds`.
     *
     * Returns `[value, finished]`: the current eased value and whether the
     * move just finished on this call.
     * @param {number} now_milliseconds
     * @returns {Array<any>}
     */
    advance(now_milliseconds) {
        const ret = wasm.smoothsteptimedease_advance(this.__wbg_ptr, now_milliseconds);
        return takeObject(ret);
    }
    /**
     * Begins, or restarts, an ease from one value to another.
     * @param {number} start_milliseconds
     * @param {number} from_value
     * @param {number} to_value
     * @param {number} duration_milliseconds
     */
    begin(start_milliseconds, from_value, to_value, duration_milliseconds) {
        wasm.smoothsteptimedease_begin(this.__wbg_ptr, start_milliseconds, from_value, to_value, duration_milliseconds);
    }
    /**
     * Whether an ease is in flight.
     * @returns {boolean}
     */
    get is_running() {
        const ret = wasm.smoothsteptimedease_is_running(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Creates an idle ease with no target.
     */
    constructor() {
        const ret = wasm.smoothsteptimedease_new();
        this.__wbg_ptr = ret;
        SmoothstepTimedEaseFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Stops an in-flight ease without applying anything.
     */
    reset() {
        wasm.smoothsteptimedease_reset(this.__wbg_ptr);
    }
    /**
     * The ease's target value.
     * @returns {number}
     */
    get target_value() {
        const ret = wasm.smoothsteptimedease_target_value(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) SmoothstepTimedEase.prototype[Symbol.dispose] = SmoothstepTimedEase.prototype.free;

/**
 * Tile pixel resolution the GPU canvas fetches and samples, mirroring
 * [`geospatial_types::RasterTileResolution`] at the JavaScript seam: the
 * shared record type cannot itself carry `wasm-bindgen` attributes, so the
 * page passes this enum and the canvas converts it.
 * @enum {0 | 1}
 */
export const TileResolution = Object.freeze({
    /**
     * One texel per logical tile pixel.
     */
    Standard: 0, "0": "Standard",
    /**
     * Twice the texels per logical tile pixel (the recorded `@2x` fixtures).
     */
    Retina: 1, "1": "Retina",
});

/**
 * A forward-only cursor over a recorded trace's samples.
 */
export class TraceCursor {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TraceCursorFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tracecursor_free(ptr, 0);
    }
    /**
     * Consumes and returns the next sample's index, or `null` at the end.
     * @returns {any}
     */
    advance() {
        const ret = wasm.tracecursor_advance(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Whether every sample was delivered.
     * @returns {boolean}
     */
    isFinished() {
        const ret = wasm.tracecursor_isFinished(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Creates a cursor at the first sample of a trace with `sample_count`
     * samples.
     * @param {number} sample_count
     */
    constructor(sample_count) {
        const ret = wasm.tracecursor_new(sample_count);
        this.__wbg_ptr = ret;
        TraceCursorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * The next sample's index, or `null` when every sample was delivered.
     * @returns {any}
     */
    nextSampleIndex() {
        const ret = wasm.tracecursor_nextSampleIndex(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The next sample's index without consuming it.
     * @returns {any}
     */
    peek() {
        const ret = wasm.tracecursor_peek(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The number of samples not yet delivered.
     * @returns {number}
     */
    remainingSampleCount() {
        const ret = wasm.tracecursor_remainingSampleCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Rewinds the cursor to the first sample.
     */
    reset() {
        wasm.tracecursor_reset(this.__wbg_ptr);
    }
    /**
     * The trace's sample count.
     * @returns {number}
     */
    get sampleCount() {
        const ret = wasm.tracecursor_sampleCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Moves the cursor to `sample_index`, clamped to the trace's bounds.
     * @param {number} sample_index
     */
    seekToSampleIndex(sample_index) {
        wasm.tracecursor_seekToSampleIndex(this.__wbg_ptr, sample_index);
    }
}
if (Symbol.dispose) TraceCursor.prototype[Symbol.dispose] = TraceCursor.prototype.free;

/**
 * Congestion classification a traffic-flow segment paints with, mirroring
 * [`geospatial_types::TrafficFlowCongestionLevel`] at the JavaScript seam:
 * the shared record type cannot itself carry `wasm-bindgen` attributes, so
 * the page passes this enum and the canvas converts it (the same pattern as
 * [`CanvasTileResolution`]).
 * @enum {0 | 1 | 2 | 3}
 */
export const TrafficFlowCongestionLevel = Object.freeze({
    /**
     * At or above free-flow speed.
     */
    FreeFlow: 0, "0": "FreeFlow",
    /**
     * Moderately below free-flow speed.
     */
    Slow: 1, "1": "Slow",
    /**
     * Stop-and-go traffic.
     */
    Congested: 2, "2": "Congested",
    /**
     * Roadway effectively closed.
     */
    Blocked: 3, "3": "Blocked",
});

/**
 * The camera bearing's smallest off-north angular distance, in degrees.
 * @param {number} bearing_degrees
 * @returns {number}
 */
export function bearingOffNorthDegrees(bearing_degrees) {
    const ret = wasm.bearingOffNorthDegrees(bearing_degrees);
    return ret;
}

/**
 * Empties every canvas-facing provider slot and forgets the selections — the
 * browser counterpart of the settings surface's Clear act. The contract
 * carries no clearing member, and a page that clears keeps nothing
 * afterwards.
 */
export function clearProviderRegistrations() {
    wasm.clearProviderRegistrations();
}

/**
 * Clears every provider slot the canvas consults on the generated contract
 * registry's behalf — the browser-only companion of the page's Clear act.
 *
 * A page that replaces its `MapSdk` drops the native registry, but the
 * mirrors it published to the canvas would otherwise keep serving. The
 * page-registered URL-template fallback survives, exactly as it survives
 * [`clear_provider_registrations`].
 */
export function clearSharedProviderSlots() {
    wasm.clearSharedProviderSlots();
}

/**
 * Removes the page-registered URL-template raster source. A configured
 * raster provider is untouched; with none, the canvas falls back to its
 * recorded fixtures.
 */
export function clearUrlTemplateRasterTileSource() {
    wasm.clearUrlTemplateRasterTileSource();
}

/**
 * Reports the device-pixel ratio from which the page's JavaScript
 * chooses between [`CanvasTileResolution::Retina`] and
 * [`CanvasTileResolution::Standard`]: at or above the threshold the page
 * passes retina. The threshold lives in Rust so the seam stays one source
 * of truth.
 * @returns {number}
 */
export function devicePixelRatioThreshold() {
    const ret = wasm.devicePixelRatioThreshold();
    return ret;
}

/**
 * The follow camera's zoom toward trip end.
 * @param {number} remaining_distance_fraction
 * @returns {number}
 */
export function followZoomTowardTripEnd(remaining_distance_fraction) {
    const ret = wasm.followZoomTowardTripEnd(remaining_distance_fraction);
    return ret;
}

/**
 * Registers a keyless URL-template raster source as the canvas' live
 * fallback. The declaration's required texts, optional zoom range, image
 * format, tile resolution and pacing rates are validated here; absent zoom
 * levels and pacing fields fall back to the documented defaults, and the
 * format defaults to `Png`, the resolution to `Standard`.
 *
 * A malformed template, a blank source name, an inverted zoom range or an
 * unusable pacing rate throws `InvalidCoordinateInput` with a precise detail,
 * and the previous source keeps serving. The canvas' live raster fallback
 * fetches through the registered source at the zoom ceiling it declares.
 * @param {any} source
 */
export function registerUrlTemplateRasterTileSource(source) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.registerUrlTemplateRasterTileSource(retptr, addHeapObject(source));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * The selected ladder distance's metric label.
 * @param {number} distance_meters
 * @returns {string}
 */
export function scaleBarDistanceLabelText(distance_meters) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.scaleBarDistanceLabelText(retptr, distance_meters);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Selects the scale-bar ladder distance using the design language's token
 * width range.
 *
 * Returns a `{ distanceMeters, widthPixels }` object, or `null` when the
 * ground answer is not usable.
 * @param {number} ground_meters_per_screen_pixel
 * @returns {any}
 */
export function selectScaleBarScale(ground_meters_per_screen_pixel) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.selectScaleBarScale(retptr, ground_meters_per_screen_pixel);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Selects the scale-bar ladder distance that fits an explicit width range.
 * @param {number} ground_meters_per_screen_pixel
 * @param {number} minimum_width_pixels
 * @param {number} maximum_width_pixels
 * @returns {any}
 */
export function selectScaleBarScaleWithWidthRange(ground_meters_per_screen_pixel, minimum_width_pixels, maximum_width_pixels) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.selectScaleBarScaleWithWidthRange(retptr, ground_meters_per_screen_pixel, minimum_width_pixels, maximum_width_pixels);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Points a provider key's requests at a base URL instead of its public
 * endpoint — a browser-only seam for a page that serves the provider's
 * routes itself, such as the test harness. Register the provider after
 * calling this; the override applies to every later registration of the key.
 * @param {string} provider_key
 * @param {string} base_url
 */
export function setProviderBaseUrl(provider_key, base_url) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(provider_key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(base_url, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.setProviderBaseUrl(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * The shortest signed angular difference `to − from`, in degrees.
 * @param {number} to_degrees
 * @param {number} from_degrees
 * @returns {number}
 */
export function signedAngularDifferenceDegrees(to_degrees, from_degrees) {
    const ret = wasm.signedAngularDifferenceDegrees(to_degrees, from_degrees);
    return ret;
}

/**
 * Smoothstep easing (`3t² − 2t³`), clamped into `[0, 1]`.
 * @param {number} linear_progress
 * @returns {number}
 */
export function smoothstepEasedProgress(linear_progress) {
    const ret = wasm.smoothstepEasedProgress(linear_progress);
    return ret;
}

/**
 * The replay dispatch interval for a recorded trace, in milliseconds.
 * @param {number} recorded_sample_interval_seconds
 * @param {number} playback_acceleration_factor
 * @returns {number}
 */
export function traceDispatchIntervalMilliseconds(recorded_sample_interval_seconds, playback_acceleration_factor) {
    const ret = wasm.traceDispatchIntervalMilliseconds(recorded_sample_interval_seconds, playback_acceleration_factor);
    return ret;
}

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
 * @param {number} tile_zoom_level
 * @param {number} tile_x
 * @param {number} tile_y
 * @returns {object}
 */
export function vectorTileGeographicBounds(tile_zoom_level, tile_x, tile_y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vectorTileGeographicBounds(retptr, tile_zoom_level, tile_x, tile_y);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} tile_bytes
 * @param {number} tile_zoom_level
 * @param {number} tile_x
 * @param {number} tile_y
 * @returns {Array<any>}
 */
export function vectorTileOverlayDescriptors(tile_bytes, tile_zoom_level, tile_x, tile_y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.vectorTileOverlayDescriptors(retptr, ptr0, len0, tile_zoom_level, tile_x, tile_y);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * The same decode-and-style conversion, painted with the committed style a
 * style id names (`carto-light`, `carto-dark`, `openmaptiles-light`,
 * `openmaptiles-dark`). The page joins a registry descriptor's style schema
 * with the active theme, so one provider can serve a light and a dark base
 * map without a page-side style table. An unknown style id rejects with the
 * documented list of known ids.
 * @param {Uint8Array} tile_bytes
 * @param {number} tile_zoom_level
 * @param {number} tile_x
 * @param {number} tile_y
 * @param {string} style_id
 * @returns {Array<any>}
 */
export function vectorTileOverlayDescriptorsForStyle(tile_bytes, tile_zoom_level, tile_x, tile_y, style_id) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(style_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.vectorTileOverlayDescriptorsForStyle(retptr, ptr0, len0, tile_zoom_level, tile_x, tile_y, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
export function __wbg_Window_a2a6c4d665047b14(arg0) {
    const ret = getObject(arg0).Window;
    return addHeapObject(ret);
}
export function __wbg_WorkerGlobalScope_2664448a7c667d67(arg0) {
    const ret = getObject(arg0).WorkerGlobalScope;
    return addHeapObject(ret);
}
export function __wbg___wbindgen_boolean_get_5b446f51afd21013(arg0) {
    const v = getObject(arg0);
    const ret = typeof(v) === 'boolean' ? v : undefined;
    return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
}
export function __wbg___wbindgen_debug_string_4687d8d8c2017d52(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_is_function_1f9d30630b8b1d3d(arg0) {
    const ret = typeof(getObject(arg0)) === 'function';
    return ret;
}
export function __wbg___wbindgen_is_null_e343b7d08827ba72(arg0) {
    const ret = getObject(arg0) === null;
    return ret;
}
export function __wbg___wbindgen_is_object_3c45d4f2dde4e749(arg0) {
    const val = getObject(arg0);
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
}
export function __wbg___wbindgen_is_string_90b56bc79aad6f6c(arg0) {
    const ret = typeof(getObject(arg0)) === 'string';
    return ret;
}
export function __wbg___wbindgen_is_undefined_8865fb403f8fe9d8(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
}
export function __wbg___wbindgen_number_get_2e0e7dee9f701a71(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_string_get_0380ccaa2f57f0d9(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_throw_41e9ee4f547fc59a(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
}
export function __wbg__wbg_cb_unref_dcc1a90847f04c41(arg0) {
    getObject(arg0)._wbg_cb_unref();
}
export function __wbg_activeTexture_11079673eac5c921(arg0, arg1) {
    getObject(arg0).activeTexture(arg1 >>> 0);
}
export function __wbg_activeTexture_2fad46c01cafe6b1(arg0, arg1) {
    getObject(arg0).activeTexture(arg1 >>> 0);
}
export function __wbg_arrayBuffer_f07be74819944ea2() { return handleError(function (arg0) {
    const ret = getObject(arg0).arrayBuffer();
    return addHeapObject(ret);
}, arguments); }
export function __wbg_attachShader_8920a5beea54aba7(arg0, arg1, arg2) {
    getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
}
export function __wbg_attachShader_9567ae57af6746d5(arg0, arg1, arg2) {
    getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
}
export function __wbg_beginQuery_eaee271e7ccd67d1(arg0, arg1, arg2) {
    getObject(arg0).beginQuery(arg1 >>> 0, getObject(arg2));
}
export function __wbg_beginRenderPass_3c53642423af50dc() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).beginRenderPass(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_bindAttribLocation_6a6f66cbe96ef24e(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).bindAttribLocation(getObject(arg1), arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}
export function __wbg_bindAttribLocation_ade0ee986a734cdf(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).bindAttribLocation(getObject(arg1), arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}
export function __wbg_bindBufferRange_a5aef3642afdabc8(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).bindBufferRange(arg1 >>> 0, arg2 >>> 0, getObject(arg3), arg4, arg5);
}
export function __wbg_bindBuffer_0324f62b876c4403(arg0, arg1, arg2) {
    getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindBuffer_2195e89b585ce0c3(arg0, arg1, arg2) {
    getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindFramebuffer_22e4b8e6e6d8d0e8(arg0, arg1, arg2) {
    getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindFramebuffer_378eb18ef219d37a(arg0, arg1, arg2) {
    getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindRenderbuffer_db090531fb28de34(arg0, arg1, arg2) {
    getObject(arg0).bindRenderbuffer(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindRenderbuffer_e0c5aeef245a913a(arg0, arg1, arg2) {
    getObject(arg0).bindRenderbuffer(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindSampler_9b9743706aee71d1(arg0, arg1, arg2) {
    getObject(arg0).bindSampler(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindTexture_3cf008f256f3ed99(arg0, arg1, arg2) {
    getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindTexture_613a47b8917a0ccd(arg0, arg1, arg2) {
    getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
}
export function __wbg_bindVertexArrayOES_3141815cb8234a6e(arg0, arg1) {
    getObject(arg0).bindVertexArrayOES(getObject(arg1));
}
export function __wbg_bindVertexArray_f58af0a346185ec5(arg0, arg1) {
    getObject(arg0).bindVertexArray(getObject(arg1));
}
export function __wbg_blendColor_68fc6d6454f2128d(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).blendColor(arg1, arg2, arg3, arg4);
}
export function __wbg_blendColor_a6256f41d1925899(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).blendColor(arg1, arg2, arg3, arg4);
}
export function __wbg_blendEquationSeparate_0a17fa4ea863d445(arg0, arg1, arg2) {
    getObject(arg0).blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendEquationSeparate_fa2d4e5dde5ad8b3(arg0, arg1, arg2) {
    getObject(arg0).blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendEquation_5fb8aee6a55cf900(arg0, arg1) {
    getObject(arg0).blendEquation(arg1 >>> 0);
}
export function __wbg_blendEquation_d21914e937b14896(arg0, arg1) {
    getObject(arg0).blendEquation(arg1 >>> 0);
}
export function __wbg_blendFuncSeparate_28abe082febb1a26(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_blendFuncSeparate_2af9d47f7efc0452(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_blendFunc_491ee1105079ce76(arg0, arg1, arg2) {
    getObject(arg0).blendFunc(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendFunc_589e4252bb396484(arg0, arg1, arg2) {
    getObject(arg0).blendFunc(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blitFramebuffer_7b39bfec6cfece56(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    getObject(arg0).blitFramebuffer(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0);
}
export function __wbg_bufferData_50f5eb06469330e4(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferData_53e0f7a06b58fe81(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
}
export function __wbg_bufferData_5fa44d94fe7a3878(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
}
export function __wbg_bufferData_bad7ce562b6a9eac(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferSubData_22c4c420e0f67cda(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferSubData(arg1 >>> 0, arg2, getObject(arg3));
}
export function __wbg_bufferSubData_8609cd8a2c013181(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferSubData(arg1 >>> 0, arg2, getObject(arg3));
}
export function __wbg_call_187d372bd5fdd4aa() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_call_6137034ef55c9d0f() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_clearBufferfv_05f7fc7252e623eb(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).clearBufferfv(arg1 >>> 0, arg2, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_clearBufferiv_e8e740accbd0f2df(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).clearBufferiv(arg1 >>> 0, arg2, getArrayI32FromWasm0(arg3, arg4));
}
export function __wbg_clearBufferuiv_e7f50f91f2195e38(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).clearBufferuiv(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4));
}
export function __wbg_clearDepth_4840a5497ae51286(arg0, arg1) {
    getObject(arg0).clearDepth(arg1);
}
export function __wbg_clearDepth_5a119c24c5d193bc(arg0, arg1) {
    getObject(arg0).clearDepth(arg1);
}
export function __wbg_clearStencil_1b8b8c727f598eec(arg0, arg1) {
    getObject(arg0).clearStencil(arg1);
}
export function __wbg_clearStencil_e4383e4a543e7997(arg0, arg1) {
    getObject(arg0).clearStencil(arg1);
}
export function __wbg_clear_175cf3cb6d98d72b(arg0, arg1) {
    getObject(arg0).clear(arg1 >>> 0);
}
export function __wbg_clear_cb96796cc568b7c8(arg0, arg1) {
    getObject(arg0).clear(arg1 >>> 0);
}
export function __wbg_clientWaitSync_73122aa040ce343d(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).clientWaitSync(getObject(arg1), arg2 >>> 0, arg3 >>> 0);
    return ret;
}
export function __wbg_clientWidth_08d5512595aacb73(arg0) {
    const ret = getObject(arg0).clientWidth;
    return ret;
}
export function __wbg_colorMask_4d6afbbbc3022fbe(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}
export function __wbg_colorMask_8c903995f6f873be(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}
export function __wbg_compileShader_073a75409aaf96d2(arg0, arg1) {
    getObject(arg0).compileShader(getObject(arg1));
}
export function __wbg_compileShader_c2b53ff3a8851f60(arg0, arg1) {
    getObject(arg0).compileShader(getObject(arg1));
}
export function __wbg_compressedTexSubImage2D_4942a783e20221c2(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    getObject(arg0).compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, getObject(arg8));
}
export function __wbg_compressedTexSubImage2D_4c408678ff5f3056(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8, arg9);
}
export function __wbg_compressedTexSubImage2D_80961cdbbd2b3aea(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    getObject(arg0).compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, getObject(arg8));
}
export function __wbg_compressedTexSubImage3D_1e0f86237d82f8b9(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    getObject(arg0).compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, getObject(arg10));
}
export function __wbg_compressedTexSubImage3D_682e402a0ac201ba(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    getObject(arg0).compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10, arg11);
}
export function __wbg_configure_1e2c1c9edad07d26() { return handleError(function (arg0, arg1) {
    getObject(arg0).configure(getObject(arg1));
}, arguments); }
export function __wbg_copyBufferSubData_e82219c4834bd9ae(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).copyBufferSubData(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}
export function __wbg_copyBufferToBuffer_01766818654a9868() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).copyBufferToBuffer(getObject(arg1), arg2, getObject(arg3), arg4);
}, arguments); }
export function __wbg_copyBufferToBuffer_9c174b96fb08d551() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).copyBufferToBuffer(getObject(arg1), arg2, getObject(arg3), arg4, arg5);
}, arguments); }
export function __wbg_copyTexSubImage2D_455fba12cf4a776c(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    getObject(arg0).copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}
export function __wbg_copyTexSubImage2D_fe71e36efa520f37(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    getObject(arg0).copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}
export function __wbg_copyTexSubImage3D_717cd6c97934f2e6(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).copyTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
}
export function __wbg_copyTextureToBuffer_1234b3210431ad05() { return handleError(function (arg0, arg1, arg2, arg3) {
    getObject(arg0).copyTextureToBuffer(getObject(arg1), getObject(arg2), getObject(arg3));
}, arguments); }
export function __wbg_createBindGroupLayout_b1bd63b4e88459d8() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).createBindGroupLayout(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_createBindGroup_f539b26ca341308f(arg0, arg1) {
    const ret = getObject(arg0).createBindGroup(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_createBuffer_d1dd23bf8704564c(arg0) {
    const ret = getObject(arg0).createBuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createBuffer_d800e9b1d41b2ee5() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).createBuffer(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_createBuffer_ffe613371d42cfd3(arg0) {
    const ret = getObject(arg0).createBuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createCommandEncoder_3352d1ffc36c6fc0(arg0, arg1) {
    const ret = getObject(arg0).createCommandEncoder(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_createFramebuffer_2c6b5b0f49c88e5d(arg0) {
    const ret = getObject(arg0).createFramebuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createFramebuffer_d0969af4e9886297(arg0) {
    const ret = getObject(arg0).createFramebuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createPipelineLayout_6eab52c327118937(arg0, arg1) {
    const ret = getObject(arg0).createPipelineLayout(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_createProgram_cbf448e6f18a9402(arg0) {
    const ret = getObject(arg0).createProgram();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createProgram_e0c81b0d2b8d0fd0(arg0) {
    const ret = getObject(arg0).createProgram();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createQuerySet_2dc8cde53df9849d() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).createQuerySet(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_createQuery_ec241083d0b36197(arg0) {
    const ret = getObject(arg0).createQuery();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createRenderPipeline_0ebb7ebc653e9207() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).createRenderPipeline(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_createRenderbuffer_2b17e9fe2e6fb4be(arg0) {
    const ret = getObject(arg0).createRenderbuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createRenderbuffer_c864095d6ebd60d0(arg0) {
    const ret = getObject(arg0).createRenderbuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createSampler_1b330d9da0c6523f(arg0) {
    const ret = getObject(arg0).createSampler();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createSampler_9bd91d7e928c0060(arg0, arg1) {
    const ret = getObject(arg0).createSampler(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_createShaderModule_cefa51336cb288ae(arg0, arg1) {
    const ret = getObject(arg0).createShaderModule(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_createShader_6c1a2295587878a5(arg0, arg1) {
    const ret = getObject(arg0).createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createShader_7c9d99a21ecb08c0(arg0, arg1) {
    const ret = getObject(arg0).createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createTexture_01e8e591b64237de(arg0) {
    const ret = getObject(arg0).createTexture();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createTexture_5f2583508ebe379b(arg0) {
    const ret = getObject(arg0).createTexture();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createTexture_ed7e9fc04dd54d84() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).createTexture(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_createVertexArrayOES_a8dc8498b56df937(arg0) {
    const ret = getObject(arg0).createVertexArrayOES();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createVertexArray_b223ea69dd08fcab(arg0) {
    const ret = getObject(arg0).createVertexArray();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_createView_da41c2d2cb212715() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).createView(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_cullFace_12123c1c97f1ba2c(arg0, arg1) {
    getObject(arg0).cullFace(arg1 >>> 0);
}
export function __wbg_cullFace_1a01f0b6d5aeb687(arg0, arg1) {
    getObject(arg0).cullFace(arg1 >>> 0);
}
export function __wbg_deleteBuffer_070e58aaaf2a7a8b(arg0, arg1) {
    getObject(arg0).deleteBuffer(getObject(arg1));
}
export function __wbg_deleteBuffer_7775ee9e248c8468(arg0, arg1) {
    getObject(arg0).deleteBuffer(getObject(arg1));
}
export function __wbg_deleteFramebuffer_3f8ab330098bf8e6(arg0, arg1) {
    getObject(arg0).deleteFramebuffer(getObject(arg1));
}
export function __wbg_deleteFramebuffer_570d3b214a509fa2(arg0, arg1) {
    getObject(arg0).deleteFramebuffer(getObject(arg1));
}
export function __wbg_deleteProgram_822906f0368175d0(arg0, arg1) {
    getObject(arg0).deleteProgram(getObject(arg1));
}
export function __wbg_deleteProgram_b524b30ad176cdb4(arg0, arg1) {
    getObject(arg0).deleteProgram(getObject(arg1));
}
export function __wbg_deleteQuery_266895df9763e0b3(arg0, arg1) {
    getObject(arg0).deleteQuery(getObject(arg1));
}
export function __wbg_deleteRenderbuffer_826c9b43b7ea68f5(arg0, arg1) {
    getObject(arg0).deleteRenderbuffer(getObject(arg1));
}
export function __wbg_deleteRenderbuffer_f4e121a3ab21c605(arg0, arg1) {
    getObject(arg0).deleteRenderbuffer(getObject(arg1));
}
export function __wbg_deleteSampler_f8afded8bf215d53(arg0, arg1) {
    getObject(arg0).deleteSampler(getObject(arg1));
}
export function __wbg_deleteShader_a70f6cc1918d67eb(arg0, arg1) {
    getObject(arg0).deleteShader(getObject(arg1));
}
export function __wbg_deleteShader_da18a294158c2d15(arg0, arg1) {
    getObject(arg0).deleteShader(getObject(arg1));
}
export function __wbg_deleteSync_4f0be28b03f50495(arg0, arg1) {
    getObject(arg0).deleteSync(getObject(arg1));
}
export function __wbg_deleteTexture_78c170241204a466(arg0, arg1) {
    getObject(arg0).deleteTexture(getObject(arg1));
}
export function __wbg_deleteTexture_9f42750adb092e4f(arg0, arg1) {
    getObject(arg0).deleteTexture(getObject(arg1));
}
export function __wbg_deleteVertexArrayOES_e01f31634d466176(arg0, arg1) {
    getObject(arg0).deleteVertexArrayOES(getObject(arg1));
}
export function __wbg_deleteVertexArray_ca9768805d051d49(arg0, arg1) {
    getObject(arg0).deleteVertexArray(getObject(arg1));
}
export function __wbg_depthFunc_92e96d8f46a23300(arg0, arg1) {
    getObject(arg0).depthFunc(arg1 >>> 0);
}
export function __wbg_depthFunc_a41fb5adacb22e09(arg0, arg1) {
    getObject(arg0).depthFunc(arg1 >>> 0);
}
export function __wbg_depthMask_06ecff4d4514c38f(arg0, arg1) {
    getObject(arg0).depthMask(arg1 !== 0);
}
export function __wbg_depthMask_0d7c3dec3b8405ee(arg0, arg1) {
    getObject(arg0).depthMask(arg1 !== 0);
}
export function __wbg_depthRange_24c7969249461e8e(arg0, arg1, arg2) {
    getObject(arg0).depthRange(arg1, arg2);
}
export function __wbg_depthRange_6a4e169ccf314148(arg0, arg1, arg2) {
    getObject(arg0).depthRange(arg1, arg2);
}
export function __wbg_description_83b8a393160021b9(arg0, arg1) {
    const ret = getObject(arg1).description;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_destroy_637537007d9eaa44(arg0) {
    getObject(arg0).destroy();
}
export function __wbg_devicePixelRatio_7d39e9af5448d3d4(arg0) {
    const ret = getObject(arg0).devicePixelRatio;
    return ret;
}
export function __wbg_disableVertexAttribArray_11c9f11bee30c9d8(arg0, arg1) {
    getObject(arg0).disableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_disableVertexAttribArray_c4c8af1f9e4120d4(arg0, arg1) {
    getObject(arg0).disableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_disable_19fe787eccdf0272(arg0, arg1) {
    getObject(arg0).disable(arg1 >>> 0);
}
export function __wbg_disable_81b2cb5f8cea15ae(arg0, arg1) {
    getObject(arg0).disable(arg1 >>> 0);
}
export function __wbg_dispatchEvent_57e1a8af186ff471() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).dispatchEvent(getObject(arg1));
    return ret;
}, arguments); }
export function __wbg_document_9854e03c05fc8834(arg0) {
    const ret = getObject(arg0).document;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_done_b41a1d26cdb37fb6(arg0) {
    const ret = getObject(arg0).done;
    return ret;
}
export function __wbg_drawArraysInstancedANGLE_b76512b5abba6668(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).drawArraysInstancedANGLE(arg1 >>> 0, arg2, arg3, arg4);
}
export function __wbg_drawArraysInstanced_9b44aa78a087154d(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).drawArraysInstanced(arg1 >>> 0, arg2, arg3, arg4);
}
export function __wbg_drawArrays_08872e02fb57b847(arg0, arg1, arg2, arg3) {
    getObject(arg0).drawArrays(arg1 >>> 0, arg2, arg3);
}
export function __wbg_drawArrays_741af5c3f8db636f(arg0, arg1, arg2, arg3) {
    getObject(arg0).drawArrays(arg1 >>> 0, arg2, arg3);
}
export function __wbg_drawBuffersWEBGL_c1bc0bbfd584c9b2(arg0, arg1) {
    getObject(arg0).drawBuffersWEBGL(getObject(arg1));
}
export function __wbg_drawBuffers_7a58bd4729f7a1fc(arg0, arg1) {
    getObject(arg0).drawBuffers(getObject(arg1));
}
export function __wbg_drawElementsInstancedANGLE_c3fc0cfa9e29a1bc(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).drawElementsInstancedANGLE(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_drawElementsInstanced_d7c396aa034159b6(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).drawElementsInstanced(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_drawIndexed_638959aae942557c(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).drawIndexed(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5 >>> 0);
}
export function __wbg_draw_086a9578fc9898c2(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).draw(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_enableVertexAttribArray_1496b78a8dbab9fd(arg0, arg1) {
    getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_enableVertexAttribArray_d52693866bc8b8dd(arg0, arg1) {
    getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_enable_6eeb9c0e9b483cee(arg0, arg1) {
    getObject(arg0).enable(arg1 >>> 0);
}
export function __wbg_enable_cb4fc19b51148c37(arg0, arg1) {
    getObject(arg0).enable(arg1 >>> 0);
}
export function __wbg_endQuery_73863d04a795d520(arg0, arg1) {
    getObject(arg0).endQuery(arg1 >>> 0);
}
export function __wbg_end_b57473834b877409(arg0) {
    getObject(arg0).end();
}
export function __wbg_entries_b55ec7e0dc443355(arg0) {
    const ret = getObject(arg0).entries();
    return addHeapObject(ret);
}
export function __wbg_error_8c8dff942c7c4f11(arg0) {
    const ret = getObject(arg0).error;
    return addHeapObject(ret);
}
export function __wbg_features_dec7bd2fd3d91bd6(arg0) {
    const ret = getObject(arg0).features;
    return addHeapObject(ret);
}
export function __wbg_fenceSync_330293024adb66bc(arg0, arg1, arg2) {
    const ret = getObject(arg0).fenceSync(arg1 >>> 0, arg2 >>> 0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_fetch_4178962c570137ca(arg0, arg1, arg2) {
    const ret = getObject(arg0).fetch(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
}
export function __wbg_fetch_6835957cc060fb0e(arg0, arg1) {
    const ret = getObject(arg0).fetch(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_finish_09ec094c10f41e7b(arg0) {
    const ret = getObject(arg0).finish();
    return addHeapObject(ret);
}
export function __wbg_finish_173a156040775de3(arg0) {
    getObject(arg0).finish();
}
export function __wbg_finish_31ffb964be7e9749(arg0) {
    getObject(arg0).finish();
}
export function __wbg_finish_ec1c191f66a895b1(arg0, arg1) {
    const ret = getObject(arg0).finish(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_flush_13b162660ad850d2(arg0) {
    getObject(arg0).flush();
}
export function __wbg_flush_a5ad38200881ac35(arg0) {
    getObject(arg0).flush();
}
export function __wbg_framebufferRenderbuffer_1c6337e0030411f3(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4));
}
export function __wbg_framebufferRenderbuffer_f019e9231b142c0d(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4));
}
export function __wbg_framebufferTexture2D_73c52f23ec33aa22(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5);
}
export function __wbg_framebufferTexture2D_caddefa1f767646e(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5);
}
export function __wbg_framebufferTextureLayer_1d5c0f0e3234e521(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).framebufferTextureLayer(arg1 >>> 0, arg2 >>> 0, getObject(arg3), arg4, arg5);
}
export function __wbg_framebufferTextureMultiviewOVR_77f19224ff7be6ef(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).framebufferTextureMultiviewOVR(arg1 >>> 0, arg2 >>> 0, getObject(arg3), arg4, arg5, arg6);
}
export function __wbg_frontFace_6751b4b97f997aeb(arg0, arg1) {
    getObject(arg0).frontFace(arg1 >>> 0);
}
export function __wbg_frontFace_b064adb15b6f3772(arg0, arg1) {
    getObject(arg0).frontFace(arg1 >>> 0);
}
export function __wbg_getBindGroupLayout_fb40c3b93d37f466(arg0, arg1) {
    const ret = getObject(arg0).getBindGroupLayout(arg1 >>> 0);
    return addHeapObject(ret);
}
export function __wbg_getBufferSubData_dd23246099b166d1(arg0, arg1, arg2, arg3) {
    getObject(arg0).getBufferSubData(arg1 >>> 0, arg2, getObject(arg3));
}
export function __wbg_getContext_051324720aa5b7e8() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2), getObject(arg3));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments); }
export function __wbg_getContext_189ce278aa985704() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2), getObject(arg3));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments); }
export function __wbg_getContext_635e36719cad2623() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments); }
export function __wbg_getContext_e567868594d2e0c6() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments); }
export function __wbg_getCurrentTexture_9f3b84d0eaa6cd95() { return handleError(function (arg0) {
    const ret = getObject(arg0).getCurrentTexture();
    return addHeapObject(ret);
}, arguments); }
export function __wbg_getExtension_abfda2c5db286b07() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getExtension(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments); }
export function __wbg_getIndexedParameter_0f49864473e337fa() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getIndexedParameter(arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
}, arguments); }
export function __wbg_getMappedRange_fb54c6327b2d8d20() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getMappedRange(arg1, arg2);
    return addHeapObject(ret);
}, arguments); }
export function __wbg_getParameter_974595a6624c6c10() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).getParameter(arg1 >>> 0);
    return addHeapObject(ret);
}, arguments); }
export function __wbg_getParameter_a97f491753b05668() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).getParameter(arg1 >>> 0);
    return addHeapObject(ret);
}, arguments); }
export function __wbg_getPreferredCanvasFormat_0ef5034c8902201b(arg0) {
    const ret = getObject(arg0).getPreferredCanvasFormat();
    return (__wbindgen_enum_GpuTextureFormat.indexOf(ret) + 1 || 102) - 1;
}
export function __wbg_getProgramInfoLog_208fb1ff31006495(arg0, arg1, arg2) {
    const ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getProgramInfoLog_3276b294d6d42fe2(arg0, arg1, arg2) {
    const ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getProgramParameter_50bafab01cf88652(arg0, arg1, arg2) {
    const ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
}
export function __wbg_getProgramParameter_fc7124bb9fb7c675(arg0, arg1, arg2) {
    const ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
}
export function __wbg_getQueryParameter_937ba13f77db778f(arg0, arg1, arg2) {
    const ret = getObject(arg0).getQueryParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
}
export function __wbg_getShaderInfoLog_7e0cbba353ca95da(arg0, arg1, arg2) {
    const ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getShaderInfoLog_bb64c5a52df0b7a3(arg0, arg1, arg2) {
    const ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getShaderParameter_745acf10b8e45e31(arg0, arg1, arg2) {
    const ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
}
export function __wbg_getShaderParameter_e55ea9c456df5484(arg0, arg1, arg2) {
    const ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
}
export function __wbg_getSupportedExtensions_1459bad37860c0c3(arg0) {
    const ret = getObject(arg0).getSupportedExtensions();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_getSupportedProfiles_7b2acfa66b565d24(arg0) {
    const ret = getObject(arg0).getSupportedProfiles();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_getSyncParameter_bb4be47b67bfa2f8(arg0, arg1, arg2) {
    const ret = getObject(arg0).getSyncParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
}
export function __wbg_getUniformBlockIndex_5e2252ceb34531a5(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getUniformBlockIndex(getObject(arg1), getStringFromWasm0(arg2, arg3));
    return ret;
}
export function __wbg_getUniformLocation_50ba45dade572703(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_getUniformLocation_cb4e3e121235f91a(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_get_31af05bd4842a84f() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(getObject(arg0), getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_get_6c896e0571ddae51(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
}
export function __wbg_get_fd12a9100976c296(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_get_unchecked_288889d017702237(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
}
export function __wbg_gpu_afdd4387c7afe5f9(arg0) {
    const ret = getObject(arg0).gpu;
    return addHeapObject(ret);
}
export function __wbg_has_eafa12e457ea88fb(arg0, arg1, arg2) {
    const ret = getObject(arg0).has(getStringFromWasm0(arg1, arg2));
    return ret;
}
export function __wbg_headers_eba93595f8944c2f(arg0) {
    const ret = getObject(arg0).headers;
    return addHeapObject(ret);
}
export function __wbg_height_fc97e1a0c2e7331f(arg0) {
    const ret = getObject(arg0).height;
    return ret;
}
export function __wbg_includes_9b0dfa946c313621(arg0, arg1, arg2) {
    const ret = getObject(arg0).includes(getObject(arg1), arg2);
    return ret;
}
export function __wbg_info_971d8b9db3dae69f(arg0) {
    const ret = getObject(arg0).info;
    return addHeapObject(ret);
}
export function __wbg_instanceof_GpuOutOfMemoryError_5c3b8a2499f59adb(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof GPUOutOfMemoryError;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_GpuValidationError_7659e07b12d4e184(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof GPUValidationError;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_HtmlCanvasElement_0a30c11fbbf41841(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof HTMLCanvasElement;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Object_67a83cdc00c5d141(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Object;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Response_b8758567269c30b2(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Response;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_WebGl2RenderingContext_64c994c14c0790fb(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof WebGL2RenderingContext;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Window_82d71df4eddf88bc(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Window;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_invalidateFramebuffer_4f576db65bb37d6a() { return handleError(function (arg0, arg1, arg2) {
    getObject(arg0).invalidateFramebuffer(arg1 >>> 0, getObject(arg2));
}, arguments); }
export function __wbg_isArray_e15a2ff68ffdbef2(arg0) {
    const ret = Array.isArray(getObject(arg0));
    return ret;
}
export function __wbg_isFallbackAdapter_4c8cc3b18677460a(arg0) {
    const ret = getObject(arg0).isFallbackAdapter;
    return ret;
}
export function __wbg_is_4b278c0bd3caba97(arg0, arg1) {
    const ret = Object.is(getObject(arg0), getObject(arg1));
    return ret;
}
export function __wbg_keys_440be172f17c0265(arg0) {
    const ret = Object.keys(getObject(arg0));
    return addHeapObject(ret);
}
export function __wbg_label_7add8cb37a6ef98f(arg0, arg1) {
    const ret = getObject(arg1).label;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_length_7f3c00c40364105e(arg0) {
    const ret = getObject(arg0).length;
    return ret;
}
export function __wbg_length_d4bdea10311bd9cf(arg0) {
    const ret = getObject(arg0).length;
    return ret;
}
export function __wbg_limits_601ad2e086ef8141(arg0) {
    const ret = getObject(arg0).limits;
    return addHeapObject(ret);
}
export function __wbg_linkProgram_571a9ea00d38ff83(arg0, arg1) {
    getObject(arg0).linkProgram(getObject(arg1));
}
export function __wbg_linkProgram_acdc299c43d734a0(arg0, arg1) {
    getObject(arg0).linkProgram(getObject(arg1));
}
export function __wbg_location_9c46e8ada95d3174(arg0) {
    const ret = getObject(arg0).location;
    return addHeapObject(ret);
}
export function __wbg_lost_bb454eb62101af1a(arg0) {
    const ret = getObject(arg0).lost;
    return addHeapObject(ret);
}
export function __wbg_mapAsync_b0597127f5037286(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).mapAsync(arg1 >>> 0, arg2, arg3);
    return addHeapObject(ret);
}
export function __wbg_mapcamera_new(arg0) {
    const ret = MapCamera.__wrap(arg0);
    return addHeapObject(ret);
}
export function __wbg_matchMedia_8a4857f947f11f82() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).matchMedia(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments); }
export function __wbg_matches_778d0873b064b1bf(arg0) {
    const ret = getObject(arg0).matches;
    return ret;
}
export function __wbg_maxBindGroupsPlusVertexBuffers_52369f089736ef9d(arg0) {
    const ret = getObject(arg0).maxBindGroupsPlusVertexBuffers;
    return ret;
}
export function __wbg_maxBindGroups_4e424afe6ce86ca2(arg0) {
    const ret = getObject(arg0).maxBindGroups;
    return ret;
}
export function __wbg_maxBindingsPerBindGroup_7d035da36821c44f(arg0) {
    const ret = getObject(arg0).maxBindingsPerBindGroup;
    return ret;
}
export function __wbg_maxBufferSize_423f4a084e32a195(arg0) {
    const ret = getObject(arg0).maxBufferSize;
    return ret;
}
export function __wbg_maxColorAttachmentBytesPerSample_c4cd9126f6d287c6(arg0) {
    const ret = getObject(arg0).maxColorAttachmentBytesPerSample;
    return ret;
}
export function __wbg_maxColorAttachments_d924670762b9e250(arg0) {
    const ret = getObject(arg0).maxColorAttachments;
    return ret;
}
export function __wbg_maxComputeInvocationsPerWorkgroup_707a3868f7cebb59(arg0) {
    const ret = getObject(arg0).maxComputeInvocationsPerWorkgroup;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeX_0a4d99463cbd6e5e(arg0) {
    const ret = getObject(arg0).maxComputeWorkgroupSizeX;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeY_85123ea0587f7558(arg0) {
    const ret = getObject(arg0).maxComputeWorkgroupSizeY;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeZ_a3186b4c5267d44f(arg0) {
    const ret = getObject(arg0).maxComputeWorkgroupSizeZ;
    return ret;
}
export function __wbg_maxComputeWorkgroupStorageSize_57b297355cfb6204(arg0) {
    const ret = getObject(arg0).maxComputeWorkgroupStorageSize;
    return ret;
}
export function __wbg_maxComputeWorkgroupsPerDimension_4158f95e673d54c4(arg0) {
    const ret = getObject(arg0).maxComputeWorkgroupsPerDimension;
    return ret;
}
export function __wbg_maxDynamicStorageBuffersPerPipelineLayout_226b0b70910aa16c(arg0) {
    const ret = getObject(arg0).maxDynamicStorageBuffersPerPipelineLayout;
    return ret;
}
export function __wbg_maxDynamicUniformBuffersPerPipelineLayout_0e835fda711fc7e6(arg0) {
    const ret = getObject(arg0).maxDynamicUniformBuffersPerPipelineLayout;
    return ret;
}
export function __wbg_maxInterStageShaderVariables_8c4a1d727e2aa35a(arg0) {
    const ret = getObject(arg0).maxInterStageShaderVariables;
    return ret;
}
export function __wbg_maxSampledTexturesPerShaderStage_6675f5e91d9a728a(arg0) {
    const ret = getObject(arg0).maxSampledTexturesPerShaderStage;
    return ret;
}
export function __wbg_maxSamplersPerShaderStage_1910fa38a6ed1e1f(arg0) {
    const ret = getObject(arg0).maxSamplersPerShaderStage;
    return ret;
}
export function __wbg_maxStorageBufferBindingSize_2e244bded070b18d(arg0) {
    const ret = getObject(arg0).maxStorageBufferBindingSize;
    return ret;
}
export function __wbg_maxStorageBuffersPerShaderStage_a285f3ebca51ca0d(arg0) {
    const ret = getObject(arg0).maxStorageBuffersPerShaderStage;
    return ret;
}
export function __wbg_maxStorageTexturesPerShaderStage_7aa946f0fc322a2b(arg0) {
    const ret = getObject(arg0).maxStorageTexturesPerShaderStage;
    return ret;
}
export function __wbg_maxTextureArrayLayers_0e699147ad00502d(arg0) {
    const ret = getObject(arg0).maxTextureArrayLayers;
    return ret;
}
export function __wbg_maxTextureDimension1D_aabf6add54decfe2(arg0) {
    const ret = getObject(arg0).maxTextureDimension1D;
    return ret;
}
export function __wbg_maxTextureDimension2D_dd598b27e9c0c1c4(arg0) {
    const ret = getObject(arg0).maxTextureDimension2D;
    return ret;
}
export function __wbg_maxTextureDimension3D_f944266c65dfd1a9(arg0) {
    const ret = getObject(arg0).maxTextureDimension3D;
    return ret;
}
export function __wbg_maxUniformBufferBindingSize_59fa6be7cfbeeb53(arg0) {
    const ret = getObject(arg0).maxUniformBufferBindingSize;
    return ret;
}
export function __wbg_maxUniformBuffersPerShaderStage_bee5f00a4d706c7f(arg0) {
    const ret = getObject(arg0).maxUniformBuffersPerShaderStage;
    return ret;
}
export function __wbg_maxVertexAttributes_5cf6392c4e9033fe(arg0) {
    const ret = getObject(arg0).maxVertexAttributes;
    return ret;
}
export function __wbg_maxVertexBufferArrayStride_548baa887375d865(arg0) {
    const ret = getObject(arg0).maxVertexBufferArrayStride;
    return ret;
}
export function __wbg_maxVertexBuffers_75d881156591f5da(arg0) {
    const ret = getObject(arg0).maxVertexBuffers;
    return ret;
}
export function __wbg_message_2aad50368e15e8f1(arg0, arg1) {
    const ret = getObject(arg1).message;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_message_ab4cad9eeb386607(arg0, arg1) {
    const ret = getObject(arg1).message;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_minStorageBufferOffsetAlignment_5ba9b77792bdadb3(arg0) {
    const ret = getObject(arg0).minStorageBufferOffsetAlignment;
    return ret;
}
export function __wbg_minUniformBufferOffsetAlignment_ab7d52a5293b22bd(arg0) {
    const ret = getObject(arg0).minUniformBufferOffsetAlignment;
    return ret;
}
export function __wbg_navigator_2156486643462a87(arg0) {
    const ret = getObject(arg0).navigator;
    return addHeapObject(ret);
}
export function __wbg_navigator_c9bce48d4b578c9c(arg0) {
    const ret = getObject(arg0).navigator;
    return addHeapObject(ret);
}
export function __wbg_new_1dbf7428bba60a42(arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
}
export function __wbg_new_343a093a3c2ffb4e(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}
export function __wbg_new_5502aad30c185fc8(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return __wasm_bindgen_func_elem_11204(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return addHeapObject(ret);
    } finally {
        state0.a = 0;
    }
}
export function __wbg_new_617a8cdb8bb1130e() {
    const ret = new Object();
    return addHeapObject(ret);
}
export function __wbg_new_83ca405eae412a62() { return handleError(function () {
    const ret = new Headers();
    return addHeapObject(ret);
}, arguments); }
export function __wbg_new_a217df4351db4b9b() { return handleError(function (arg0, arg1) {
    const ret = new OffscreenCanvas(arg0 >>> 0, arg1 >>> 0);
    return addHeapObject(ret);
}, arguments); }
export function __wbg_new_b5c815b5c2a0cb68() { return handleError(function (arg0, arg1) {
    const ret = new Event(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_new_ee2291f50781bf1d() {
    const ret = new Array();
    return addHeapObject(ret);
}
export function __wbg_new_from_slice_9a868026ffa4208a(arg0, arg1) {
    const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
    return addHeapObject(ret);
}
export function __wbg_new_typed_689a3a281a8d4da6() {
    const ret = new Object();
    return addHeapObject(ret);
}
export function __wbg_new_typed_b01cb72a8af741a3(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return __wasm_bindgen_func_elem_11204(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return addHeapObject(ret);
    } finally {
        state0.a = 0;
    }
}
export function __wbg_new_with_byte_offset_and_length_2f5d7fc2a828b74d(arg0, arg1, arg2) {
    const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
}
export function __wbg_new_with_str_and_init_4618dee4e950224f() { return handleError(function (arg0, arg1, arg2) {
    const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_next_f4aac29c42af995c() { return handleError(function (arg0) {
    const ret = getObject(arg0).next();
    return addHeapObject(ret);
}, arguments); }
export function __wbg_now_aa4ccb83129e9e55() {
    const ret = Date.now();
    return ret;
}
export function __wbg_now_d0b7f4bea9f38490(arg0) {
    const ret = getObject(arg0).now();
    return ret;
}
export function __wbg_now_e7c6795a7f81e10f(arg0) {
    const ret = getObject(arg0).now();
    return ret;
}
export function __wbg_of_20798cb14708764f(arg0, arg1) {
    const ret = Array.of(getObject(arg0), getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_of_d5dbecdc59e02e34(arg0) {
    const ret = Array.of(getObject(arg0));
    return addHeapObject(ret);
}
export function __wbg_ok_125878a7db256ecb(arg0) {
    const ret = getObject(arg0).ok;
    return ret;
}
export function __wbg_onSubmittedWorkDone_1190213cee1ecf7e(arg0) {
    const ret = getObject(arg0).onSubmittedWorkDone();
    return addHeapObject(ret);
}
export function __wbg_origin_96d72883773c6d82() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).origin;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_performance_3fcf6e32a7e1ed0a(arg0) {
    const ret = getObject(arg0).performance;
    return addHeapObject(ret);
}
export function __wbg_performance_d0d7b03fc649b694(arg0) {
    const ret = getObject(arg0).performance;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_pixelStorei_af18e636b3e7b725(arg0, arg1, arg2) {
    getObject(arg0).pixelStorei(arg1 >>> 0, arg2);
}
export function __wbg_pixelStorei_cb4e43466f5b8703(arg0, arg1, arg2) {
    getObject(arg0).pixelStorei(arg1 >>> 0, arg2);
}
export function __wbg_polygonOffset_81dc8ca84e29572b(arg0, arg1, arg2) {
    getObject(arg0).polygonOffset(arg1, arg2);
}
export function __wbg_polygonOffset_8f922d9173d8849d(arg0, arg1, arg2) {
    getObject(arg0).polygonOffset(arg1, arg2);
}
export function __wbg_prototypesetcall_bc27214492979395(arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
}
export function __wbg_push_2baf45db356cf468(arg0, arg1) {
    const ret = getObject(arg0).push(getObject(arg1));
    return ret;
}
export function __wbg_queryCounterEXT_9016a6ffa350b4b2(arg0, arg1, arg2) {
    getObject(arg0).queryCounterEXT(getObject(arg1), arg2 >>> 0);
}
export function __wbg_querySelectorAll_6aebfe3df1fb2014() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).querySelectorAll(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
}, arguments); }
export function __wbg_querySelector_ecbc2550705b235f() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).querySelector(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments); }
export function __wbg_queueMicrotask_9833f9a49df95a49(arg0) {
    const ret = getObject(arg0).queueMicrotask;
    return addHeapObject(ret);
}
export function __wbg_queueMicrotask_a72f977e97f23c5f(arg0) {
    queueMicrotask(getObject(arg0));
}
export function __wbg_queue_7b62c28143d44293(arg0) {
    const ret = getObject(arg0).queue;
    return addHeapObject(ret);
}
export function __wbg_race_a3adff39477a2837(arg0) {
    const ret = Promise.race(getObject(arg0));
    return addHeapObject(ret);
}
export function __wbg_readBuffer_b5d9a34a2f3d20d5(arg0, arg1) {
    getObject(arg0).readBuffer(arg1 >>> 0);
}
export function __wbg_readPixels_31e44e70558ac590() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    getObject(arg0).readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, getObject(arg7));
}, arguments); }
export function __wbg_readPixels_3321086a7818a739() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    getObject(arg0).readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, getObject(arg7));
}, arguments); }
export function __wbg_readPixels_eb030cd9976eeca5() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    getObject(arg0).readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_reason_b4fa3af867fc4430(arg0) {
    const ret = getObject(arg0).reason;
    return (__wbindgen_enum_GpuDeviceLostReason.indexOf(ret) + 1 || 3) - 1;
}
export function __wbg_renderbufferStorageMultisample_ed16f3ef446e3bc7(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).renderbufferStorageMultisample(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_renderbufferStorage_52b131bbf3112b3a(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}
export function __wbg_renderbufferStorage_bca487b0dea425b8(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}
export function __wbg_requestAdapter_a539af006419f2e9(arg0, arg1) {
    const ret = getObject(arg0).requestAdapter(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_requestDevice_5cb8a582e55d08cb(arg0, arg1) {
    const ret = getObject(arg0).requestDevice(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_resolveQuerySet_770f23fabac49845(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).resolveQuerySet(getObject(arg1), arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5 >>> 0);
}
export function __wbg_resolve_0076e10020304ede(arg0) {
    const ret = Promise.resolve(getObject(arg0));
    return addHeapObject(ret);
}
export function __wbg_samplerParameterf_2d62cb907392e2d6(arg0, arg1, arg2, arg3) {
    getObject(arg0).samplerParameterf(getObject(arg1), arg2 >>> 0, arg3);
}
export function __wbg_samplerParameteri_a5615e67ed0b654b(arg0, arg1, arg2, arg3) {
    getObject(arg0).samplerParameteri(getObject(arg1), arg2 >>> 0, arg3);
}
export function __wbg_scissor_12ddc324094acd50(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).scissor(arg1, arg2, arg3, arg4);
}
export function __wbg_scissor_a9468482697c2bdb(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).scissor(arg1, arg2, arg3, arg4);
}
export function __wbg_setBindGroup_11bdbb60cc8b54b9() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2), getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
}, arguments); }
export function __wbg_setBindGroup_418c3e0eb6943ce0(arg0, arg1, arg2) {
    getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2));
}
export function __wbg_setIndexBuffer_01327df91742b73e(arg0, arg1, arg2, arg3) {
    getObject(arg0).setIndexBuffer(getObject(arg1), __wbindgen_enum_GpuIndexFormat[arg2], arg3);
}
export function __wbg_setIndexBuffer_241097e303986c14(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).setIndexBuffer(getObject(arg1), __wbindgen_enum_GpuIndexFormat[arg2], arg3, arg4);
}
export function __wbg_setPipeline_b6f981027e02cd16(arg0, arg1) {
    getObject(arg0).setPipeline(getObject(arg1));
}
export function __wbg_setTimeout_db7bbc18a17e152a() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).setTimeout(getObject(arg1), arg2);
    return ret;
}, arguments); }
export function __wbg_setVertexBuffer_6db3b60e99280744(arg0, arg1, arg2, arg3) {
    getObject(arg0).setVertexBuffer(arg1 >>> 0, getObject(arg2), arg3);
}
export function __wbg_setVertexBuffer_cbf4ca1627c02f4c(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).setVertexBuffer(arg1 >>> 0, getObject(arg2), arg3, arg4);
}
export function __wbg_set_145a351398b48c65() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
    return ret;
}, arguments); }
export function __wbg_set_34d08fd992d43d61(arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2 >>> 0);
}
export function __wbg_set_a_82818effc94f6256(arg0, arg1) {
    getObject(arg0).a = arg1;
}
export function __wbg_set_access_a099cfbbeec9b96f(arg0, arg1) {
    getObject(arg0).access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
}
export function __wbg_set_address_mode_u_a68737cf5d288f95(arg0, arg1) {
    getObject(arg0).addressModeU = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_address_mode_v_b1c3c45933f540d1(arg0, arg1) {
    getObject(arg0).addressModeV = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_address_mode_w_889c31cf7022c764(arg0, arg1) {
    getObject(arg0).addressModeW = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_af5932e3f78b5648() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_set_alpha_106f21a936a85eba(arg0, arg1) {
    getObject(arg0).alpha = getObject(arg1);
}
export function __wbg_set_alpha_mode_5544568dbac50280(arg0, arg1) {
    getObject(arg0).alphaMode = __wbindgen_enum_GpuCanvasAlphaMode[arg1];
}
export function __wbg_set_alpha_to_coverage_enabled_3372ce329447b8f1(arg0, arg1) {
    getObject(arg0).alphaToCoverageEnabled = arg1 !== 0;
}
export function __wbg_set_array_layer_count_22afa0a979e4ad55(arg0, arg1) {
    getObject(arg0).arrayLayerCount = arg1 >>> 0;
}
export function __wbg_set_array_stride_f64_6816040e5e7598c3(arg0, arg1) {
    getObject(arg0).arrayStride = arg1;
}
export function __wbg_set_aspect_a48d046965270281(arg0, arg1) {
    getObject(arg0).aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}
export function __wbg_set_aspect_b1a9909bf315433f(arg0, arg1) {
    getObject(arg0).aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}
export function __wbg_set_attributes_9e38cb1dde387a5b(arg0, arg1, arg2) {
    getObject(arg0).attributes = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_b_a3297ee7e7cac3a8(arg0, arg1) {
    getObject(arg0).b = arg1;
}
export function __wbg_set_base_array_layer_2435ba92c80346ae(arg0, arg1) {
    getObject(arg0).baseArrayLayer = arg1 >>> 0;
}
export function __wbg_set_base_mip_level_8b6093e875e7c65d(arg0, arg1) {
    getObject(arg0).baseMipLevel = arg1 >>> 0;
}
export function __wbg_set_beginning_of_pass_write_index_e552c5e8b8bbf52f(arg0, arg1) {
    getObject(arg0).beginningOfPassWriteIndex = arg1 >>> 0;
}
export function __wbg_set_bind_group_layouts_458c44ba55100b82(arg0, arg1, arg2) {
    getObject(arg0).bindGroupLayouts = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_binding_81b3fac7f7acaf8d(arg0, arg1) {
    getObject(arg0).binding = arg1 >>> 0;
}
export function __wbg_set_binding_b6cee57f35ac5190(arg0, arg1) {
    getObject(arg0).binding = arg1 >>> 0;
}
export function __wbg_set_blend_1a801617945f7945(arg0, arg1) {
    getObject(arg0).blend = getObject(arg1);
}
export function __wbg_set_body_opt_u8_array_09bd89755f1384a1(arg0, arg1) {
    getObject(arg0).body = getObject(arg1);
}
export function __wbg_set_buffer_1548ae88a9188037(arg0, arg1) {
    getObject(arg0).buffer = getObject(arg1);
}
export function __wbg_set_buffer_8d0ac64ad20dfc84(arg0, arg1) {
    getObject(arg0).buffer = getObject(arg1);
}
export function __wbg_set_buffer_910a40a90f97cfca(arg0, arg1) {
    getObject(arg0).buffer = getObject(arg1);
}
export function __wbg_set_buffers_5d0e0c50791f710e(arg0, arg1, arg2) {
    getObject(arg0).buffers = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_bytes_per_row_1e824a5502b54b3d(arg0, arg1) {
    getObject(arg0).bytesPerRow = arg1 >>> 0;
}
export function __wbg_set_bytes_per_row_c28583f0063160f1(arg0, arg1) {
    getObject(arg0).bytesPerRow = arg1 >>> 0;
}
export function __wbg_set_clear_value_gpu_color_dict_a9f763e8372ac1de(arg0, arg1) {
    getObject(arg0).clearValue = getObject(arg1);
}
export function __wbg_set_code_5d5b0b9e2fd0dca7(arg0, arg1, arg2) {
    getObject(arg0).code = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_color_8ecace4011f47d2e(arg0, arg1) {
    getObject(arg0).color = getObject(arg1);
}
export function __wbg_set_color_attachments_622fe2d5997fda7a(arg0, arg1, arg2) {
    getObject(arg0).colorAttachments = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_compare_080c9e492ff36990(arg0, arg1) {
    getObject(arg0).compare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_compare_817cf3695599eaa6(arg0, arg1) {
    getObject(arg0).compare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_count_8ff0c9474e39a849(arg0, arg1) {
    getObject(arg0).count = arg1 >>> 0;
}
export function __wbg_set_count_d9dc88156fd05bc7(arg0, arg1) {
    getObject(arg0).count = arg1 >>> 0;
}
export function __wbg_set_cull_mode_85d2b4ab0ce3a564(arg0, arg1) {
    getObject(arg0).cullMode = __wbindgen_enum_GpuCullMode[arg1];
}
export function __wbg_set_depth_bias_95abf479cae3f3cd(arg0, arg1) {
    getObject(arg0).depthBias = arg1;
}
export function __wbg_set_depth_bias_clamp_ba3d0b8348151350(arg0, arg1) {
    getObject(arg0).depthBiasClamp = arg1;
}
export function __wbg_set_depth_bias_slope_scale_6b2584d93f5b9cd2(arg0, arg1) {
    getObject(arg0).depthBiasSlopeScale = arg1;
}
export function __wbg_set_depth_clear_value_e30a4c754c6b3b26(arg0, arg1) {
    getObject(arg0).depthClearValue = arg1;
}
export function __wbg_set_depth_compare_a90de4e3714397ab(arg0, arg1) {
    getObject(arg0).depthCompare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_depth_fail_op_b5c64541d1b6b482(arg0, arg1) {
    getObject(arg0).depthFailOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_depth_load_op_932888016d762d3e(arg0, arg1) {
    getObject(arg0).depthLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_depth_or_array_layers_e2f074a0284e4806(arg0, arg1) {
    getObject(arg0).depthOrArrayLayers = arg1 >>> 0;
}
export function __wbg_set_depth_read_only_be790175a1c2db9a(arg0, arg1) {
    getObject(arg0).depthReadOnly = arg1 !== 0;
}
export function __wbg_set_depth_stencil_attachment_54a8922f5fbe08bf(arg0, arg1) {
    getObject(arg0).depthStencilAttachment = getObject(arg1);
}
export function __wbg_set_depth_stencil_b7cffc59ad4da529(arg0, arg1) {
    getObject(arg0).depthStencil = getObject(arg1);
}
export function __wbg_set_depth_store_op_9054814f164ab55d(arg0, arg1) {
    getObject(arg0).depthStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_depth_write_enabled_31a821ee1fb3b0b3(arg0, arg1) {
    getObject(arg0).depthWriteEnabled = arg1 !== 0;
}
export function __wbg_set_device_210484a77b675c9c(arg0, arg1) {
    getObject(arg0).device = getObject(arg1);
}
export function __wbg_set_dimension_3da9d03131a9f446(arg0, arg1) {
    getObject(arg0).dimension = __wbindgen_enum_GpuTextureDimension[arg1];
}
export function __wbg_set_dimension_56332450afa3e0c0(arg0, arg1) {
    getObject(arg0).dimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_dst_factor_865ba9aaf187890c(arg0, arg1) {
    getObject(arg0).dstFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}
export function __wbg_set_end_of_pass_write_index_8f164f9e60d4ad16(arg0, arg1) {
    getObject(arg0).endOfPassWriteIndex = arg1 >>> 0;
}
export function __wbg_set_entries_6f866302103b81e9(arg0, arg1, arg2) {
    getObject(arg0).entries = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_entries_f26b77ab9548e906(arg0, arg1, arg2) {
    getObject(arg0).entries = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_entry_point_71cef95c137b5774(arg0, arg1, arg2) {
    getObject(arg0).entryPoint = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_entry_point_b70f98f5025a114d(arg0, arg1, arg2) {
    getObject(arg0).entryPoint = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_external_texture_7f966c604c4f8098(arg0, arg1) {
    getObject(arg0).externalTexture = getObject(arg1);
}
export function __wbg_set_fail_op_d59d0187e4111dfe(arg0, arg1) {
    getObject(arg0).failOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_format_23f7f32549751d43(arg0, arg1) {
    getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_283dca56552f07a3(arg0, arg1) {
    getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_5080a858117ad2c1(arg0, arg1) {
    getObject(arg0).format = __wbindgen_enum_GpuVertexFormat[arg1];
}
export function __wbg_set_format_66735b94bd868ba2(arg0, arg1) {
    getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_7f2bdbfb101b1ae1(arg0, arg1) {
    getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_92732ea75d3b79f5(arg0, arg1) {
    getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_f009e603f7d4c28e(arg0, arg1) {
    getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_fragment_d2b0ec97d7cf8d47(arg0, arg1) {
    getObject(arg0).fragment = getObject(arg1);
}
export function __wbg_set_front_face_d3f8a2e07e7b25dd(arg0, arg1) {
    getObject(arg0).frontFace = __wbindgen_enum_GpuFrontFace[arg1];
}
export function __wbg_set_g_b527ee8a9bed553d(arg0, arg1) {
    getObject(arg0).g = arg1;
}
export function __wbg_set_has_dynamic_offset_0c72ffa900c5a269(arg0, arg1) {
    getObject(arg0).hasDynamicOffset = arg1 !== 0;
}
export function __wbg_set_headers_headers_aa1e6c0a0f655d3c(arg0, arg1) {
    getObject(arg0).headers = getObject(arg1);
}
export function __wbg_set_height_c9789c1c77eaedff(arg0, arg1) {
    getObject(arg0).height = arg1 >>> 0;
}
export function __wbg_set_height_f6619158e5735877(arg0, arg1) {
    getObject(arg0).height = arg1 >>> 0;
}
export function __wbg_set_height_fde391767df1ce27(arg0, arg1) {
    getObject(arg0).height = arg1 >>> 0;
}
export function __wbg_set_label_17202740051e9722(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_2fefb39c0e0dbbe8(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_3cb2322e6f6db14c(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_3f2ccaafef5ff7c9(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_612add98a4398f92(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_6f69e25822616a1b(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_70a09ee68d6b1b26(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_92cd3811e96b487c(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_9c2a186152427ee0(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_c3eaf136aa464cba(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_c7987704d29f284b(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_cfe64bca8945ee30(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_e02179cf97e95763(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_ee172cd5f6a96961(arg0, arg1, arg2) {
    getObject(arg0).label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_layout_454e3a091b390cd4(arg0, arg1) {
    getObject(arg0).layout = getObject(arg1);
}
export function __wbg_set_layout_75dc1ca3f2421cff(arg0, arg1) {
    getObject(arg0).layout = getObject(arg1);
}
export function __wbg_set_layout_gpu_auto_layout_mode_06a2b95af1043098(arg0, arg1) {
    getObject(arg0).layout = __wbindgen_enum_GpuAutoLayoutMode[arg1];
}
export function __wbg_set_load_op_c56b1269acc2d51f(arg0, arg1) {
    getObject(arg0).loadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_lod_max_clamp_db24179f67f3aa31(arg0, arg1) {
    getObject(arg0).lodMaxClamp = arg1;
}
export function __wbg_set_lod_min_clamp_2bbce566e9fefa04(arg0, arg1) {
    getObject(arg0).lodMinClamp = arg1;
}
export function __wbg_set_mag_filter_db8e6b42d4f8846d(arg0, arg1) {
    getObject(arg0).magFilter = __wbindgen_enum_GpuFilterMode[arg1];
}
export function __wbg_set_mapped_at_creation_3f320fef6761b02c(arg0, arg1) {
    getObject(arg0).mappedAtCreation = arg1 !== 0;
}
export function __wbg_set_mask_c1079e551ec360dc(arg0, arg1) {
    getObject(arg0).mask = arg1 >>> 0;
}
export function __wbg_set_max_anisotropy_84749fdcec362dc4(arg0, arg1) {
    getObject(arg0).maxAnisotropy = arg1;
}
export function __wbg_set_method_dcb32343247ec427(arg0, arg1, arg2) {
    getObject(arg0).method = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_min_binding_size_f64_897e3cd4496ddec9(arg0, arg1) {
    getObject(arg0).minBindingSize = arg1;
}
export function __wbg_set_min_filter_d435bbfc5a637757(arg0, arg1) {
    getObject(arg0).minFilter = __wbindgen_enum_GpuFilterMode[arg1];
}
export function __wbg_set_mip_level_count_047936c630acee7b(arg0, arg1) {
    getObject(arg0).mipLevelCount = arg1 >>> 0;
}
export function __wbg_set_mip_level_count_44bc46a1ae6f6daa(arg0, arg1) {
    getObject(arg0).mipLevelCount = arg1 >>> 0;
}
export function __wbg_set_mip_level_f3745730372683d5(arg0, arg1) {
    getObject(arg0).mipLevel = arg1 >>> 0;
}
export function __wbg_set_mipmap_filter_62fb49a84b0747ff(arg0, arg1) {
    getObject(arg0).mipmapFilter = __wbindgen_enum_GpuMipmapFilterMode[arg1];
}
export function __wbg_set_mode_74e772635acb96ec(arg0, arg1) {
    getObject(arg0).mode = __wbindgen_enum_RequestMode[arg1];
}
export function __wbg_set_mode_7edfbc344ef9c650(arg0, arg1) {
    getObject(arg0).mode = __wbindgen_enum_GpuCanvasToneMappingMode[arg1];
}
export function __wbg_set_module_392eeaa269f203b0(arg0, arg1) {
    getObject(arg0).module = getObject(arg1);
}
export function __wbg_set_module_715d37652c4998ec(arg0, arg1) {
    getObject(arg0).module = getObject(arg1);
}
export function __wbg_set_multisample_ff72a7a5456cbeb7(arg0, arg1) {
    getObject(arg0).multisample = getObject(arg1);
}
export function __wbg_set_multisampled_039f032dc4b67367(arg0, arg1) {
    getObject(arg0).multisampled = arg1 !== 0;
}
export function __wbg_set_offset_f64_127e8a0aa5c5485a(arg0, arg1) {
    getObject(arg0).offset = arg1;
}
export function __wbg_set_offset_f64_457756429ede426d(arg0, arg1) {
    getObject(arg0).offset = arg1;
}
export function __wbg_set_offset_f64_a903425d5a8e5815(arg0, arg1) {
    getObject(arg0).offset = arg1;
}
export function __wbg_set_offset_f64_d1d115dd438165b5(arg0, arg1) {
    getObject(arg0).offset = arg1;
}
export function __wbg_set_onuncapturederror_bb813f1102da2296(arg0, arg1) {
    getObject(arg0).onuncapturederror = getObject(arg1);
}
export function __wbg_set_operation_00a77386523b88f9(arg0, arg1) {
    getObject(arg0).operation = __wbindgen_enum_GpuBlendOperation[arg1];
}
export function __wbg_set_origin_gpu_origin_3d_dict_0619d4860adb4eb6(arg0, arg1) {
    getObject(arg0).origin = getObject(arg1);
}
export function __wbg_set_pass_op_3cf10feb3d76ab97(arg0, arg1) {
    getObject(arg0).passOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_power_preference_b42d00a8facfbade(arg0, arg1) {
    getObject(arg0).powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
}
export function __wbg_set_primitive_e796cf76f0ff89f3(arg0, arg1) {
    getObject(arg0).primitive = getObject(arg1);
}
export function __wbg_set_query_set_f030702f1b69199f(arg0, arg1) {
    getObject(arg0).querySet = getObject(arg1);
}
export function __wbg_set_r_6ece4d74af63364f(arg0, arg1) {
    getObject(arg0).r = arg1;
}
export function __wbg_set_required_features_bbab71414c45e621(arg0, arg1, arg2) {
    getObject(arg0).requiredFeatures = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_required_limits_837f62d865e7cfac(arg0, arg1) {
    getObject(arg0).requiredLimits = getObject(arg1);
}
export function __wbg_set_resolve_target_gpu_texture_view_e4c1e3bbb8c27d87(arg0, arg1) {
    getObject(arg0).resolveTarget = getObject(arg1);
}
export function __wbg_set_resource_8fd8658b30d86ecf(arg0, arg1) {
    getObject(arg0).resource = getObject(arg1);
}
export function __wbg_set_resource_gpu_buffer_binding_33099b25da65b610(arg0, arg1) {
    getObject(arg0).resource = getObject(arg1);
}
export function __wbg_set_resource_gpu_texture_view_4cffe7bc7c8e5cbe(arg0, arg1) {
    getObject(arg0).resource = getObject(arg1);
}
export function __wbg_set_rows_per_image_c6d50d227e634379(arg0, arg1) {
    getObject(arg0).rowsPerImage = arg1 >>> 0;
}
export function __wbg_set_rows_per_image_deb456502f23c260(arg0, arg1) {
    getObject(arg0).rowsPerImage = arg1 >>> 0;
}
export function __wbg_set_sample_count_481c255a12054e1d(arg0, arg1) {
    getObject(arg0).sampleCount = arg1 >>> 0;
}
export function __wbg_set_sample_type_ebc5fcd029513bda(arg0, arg1) {
    getObject(arg0).sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
}
export function __wbg_set_sampler_89cb4a7efcfc6005(arg0, arg1) {
    getObject(arg0).sampler = getObject(arg1);
}
export function __wbg_set_shader_location_3fb9f6a012eba494(arg0, arg1) {
    getObject(arg0).shaderLocation = arg1 >>> 0;
}
export function __wbg_set_size_f64_2f591b0654540477(arg0, arg1) {
    getObject(arg0).size = arg1;
}
export function __wbg_set_size_f64_e844c985b8f95261(arg0, arg1) {
    getObject(arg0).size = arg1;
}
export function __wbg_set_size_gpu_extent_3d_dict_adf57388ab1d4f18(arg0, arg1) {
    getObject(arg0).size = getObject(arg1);
}
export function __wbg_set_src_factor_6f2c9ec8e4d3d979(arg0, arg1) {
    getObject(arg0).srcFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}
export function __wbg_set_stencil_back_c54d0443b8b6a957(arg0, arg1) {
    getObject(arg0).stencilBack = getObject(arg1);
}
export function __wbg_set_stencil_clear_value_a321b0e045bfd8c2(arg0, arg1) {
    getObject(arg0).stencilClearValue = arg1 >>> 0;
}
export function __wbg_set_stencil_front_3ff3f8385852efff(arg0, arg1) {
    getObject(arg0).stencilFront = getObject(arg1);
}
export function __wbg_set_stencil_load_op_37d20deccb26a0f1(arg0, arg1) {
    getObject(arg0).stencilLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_stencil_read_mask_021ef4271b24352c(arg0, arg1) {
    getObject(arg0).stencilReadMask = arg1 >>> 0;
}
export function __wbg_set_stencil_read_only_75fe66a2356d6e92(arg0, arg1) {
    getObject(arg0).stencilReadOnly = arg1 !== 0;
}
export function __wbg_set_stencil_store_op_501f91638dd386e6(arg0, arg1) {
    getObject(arg0).stencilStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_stencil_write_mask_ec1c12237e094bdd(arg0, arg1) {
    getObject(arg0).stencilWriteMask = arg1 >>> 0;
}
export function __wbg_set_step_mode_3cbbdeba1e5dfd62(arg0, arg1) {
    getObject(arg0).stepMode = __wbindgen_enum_GpuVertexStepMode[arg1];
}
export function __wbg_set_storage_texture_786aea7c5773b6c1(arg0, arg1) {
    getObject(arg0).storageTexture = getObject(arg1);
}
export function __wbg_set_store_op_678f33376d741711(arg0, arg1) {
    getObject(arg0).storeOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_strip_index_format_70313df755145d5e(arg0, arg1) {
    getObject(arg0).stripIndexFormat = __wbindgen_enum_GpuIndexFormat[arg1];
}
export function __wbg_set_targets_674b33931e512fb1(arg0, arg1, arg2) {
    getObject(arg0).targets = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_texture_95f2bfdf7767e76f(arg0, arg1) {
    getObject(arg0).texture = getObject(arg1);
}
export function __wbg_set_texture_a33be3fe02ac6264(arg0, arg1) {
    getObject(arg0).texture = getObject(arg1);
}
export function __wbg_set_timestamp_writes_de6a09f299b71b76(arg0, arg1) {
    getObject(arg0).timestampWrites = getObject(arg1);
}
export function __wbg_set_tone_mapping_320c1aad31db2e7f(arg0, arg1) {
    getObject(arg0).toneMapping = getObject(arg1);
}
export function __wbg_set_topology_b92cfe523bd9653b(arg0, arg1) {
    getObject(arg0).topology = __wbindgen_enum_GpuPrimitiveTopology[arg1];
}
export function __wbg_set_type_43e0092f16775979(arg0, arg1) {
    getObject(arg0).type = __wbindgen_enum_GpuSamplerBindingType[arg1];
}
export function __wbg_set_type_79cec55caf4cdb6d(arg0, arg1) {
    getObject(arg0).type = __wbindgen_enum_GpuBufferBindingType[arg1];
}
export function __wbg_set_type_7f7e54057b801caa(arg0, arg1) {
    getObject(arg0).type = __wbindgen_enum_GpuQueryType[arg1];
}
export function __wbg_set_unclipped_depth_32b7caf29fa5633d(arg0, arg1) {
    getObject(arg0).unclippedDepth = arg1 !== 0;
}
export function __wbg_set_usage_1ee33d98267e787d(arg0, arg1) {
    getObject(arg0).usage = arg1 >>> 0;
}
export function __wbg_set_usage_2365e2704b1fdb10(arg0, arg1) {
    getObject(arg0).usage = arg1 >>> 0;
}
export function __wbg_set_usage_d53ee6f0c7aedbfa(arg0, arg1) {
    getObject(arg0).usage = arg1 >>> 0;
}
export function __wbg_set_usage_f3e34822998d2147(arg0, arg1) {
    getObject(arg0).usage = arg1 >>> 0;
}
export function __wbg_set_vertex_77ed7a1229239b5a(arg0, arg1) {
    getObject(arg0).vertex = getObject(arg1);
}
export function __wbg_set_view_dimension_893e2d16561e56e8(arg0, arg1) {
    getObject(arg0).viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_view_dimension_f2c5fe4bf927c3fe(arg0, arg1) {
    getObject(arg0).viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_view_formats_427069064d8b7139(arg0, arg1, arg2) {
    getObject(arg0).viewFormats = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_view_formats_9c2f01a6f3b365c7(arg0, arg1, arg2) {
    getObject(arg0).viewFormats = getArrayJsValueViewFromWasm0(arg1, arg2);
}
export function __wbg_set_view_gpu_texture_view_35f4655788535c4d(arg0, arg1) {
    getObject(arg0).view = getObject(arg1);
}
export function __wbg_set_view_gpu_texture_view_a532c825c52042c0(arg0, arg1) {
    getObject(arg0).view = getObject(arg1);
}
export function __wbg_set_visibility_d8a6821789538c25(arg0, arg1) {
    getObject(arg0).visibility = arg1 >>> 0;
}
export function __wbg_set_width_0ca908d167690992(arg0, arg1) {
    getObject(arg0).width = arg1 >>> 0;
}
export function __wbg_set_width_b0e1267db4b196b5(arg0, arg1) {
    getObject(arg0).width = arg1 >>> 0;
}
export function __wbg_set_width_b20525f5f4df4eb8(arg0, arg1) {
    getObject(arg0).width = arg1 >>> 0;
}
export function __wbg_set_write_mask_42d89f182ade6b2d(arg0, arg1) {
    getObject(arg0).writeMask = arg1 >>> 0;
}
export function __wbg_set_x_f470b03dd54724cd(arg0, arg1) {
    getObject(arg0).x = arg1 >>> 0;
}
export function __wbg_set_y_4c44eb40ebca5bfc(arg0, arg1) {
    getObject(arg0).y = arg1 >>> 0;
}
export function __wbg_set_z_2e6820ef0f5821ed(arg0, arg1) {
    getObject(arg0).z = arg1 >>> 0;
}
export function __wbg_shaderSource_06379dac249994dd(arg0, arg1, arg2, arg3) {
    getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
}
export function __wbg_shaderSource_c8812639b47d87b9(arg0, arg1, arg2, arg3) {
    getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
}
export function __wbg_static_accessor_GLOBAL_266715b9d96ba635() {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_static_accessor_GLOBAL_THIS_10fb7dc1ae063179() {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_static_accessor_SELF_0b583911f537483a() {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_static_accessor_WINDOW_d7f903d1508cbdc4() {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}
export function __wbg_status_ce0a98d3c57125f3(arg0) {
    const ret = getObject(arg0).status;
    return ret;
}
export function __wbg_stencilFuncSeparate_3f31dcd12a0d4785(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}
export function __wbg_stencilFuncSeparate_f168b66c597aa85f(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}
export function __wbg_stencilMaskSeparate_b30c097ea6b98504(arg0, arg1, arg2) {
    getObject(arg0).stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_stencilMaskSeparate_ff739f8711e9fd42(arg0, arg1, arg2) {
    getObject(arg0).stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_stencilMask_9e18cc018897c747(arg0, arg1) {
    getObject(arg0).stencilMask(arg1 >>> 0);
}
export function __wbg_stencilMask_a22be64c66abd825(arg0, arg1) {
    getObject(arg0).stencilMask(arg1 >>> 0);
}
export function __wbg_stencilOpSeparate_7d01185cbdb89d99(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_stencilOpSeparate_c5af5f5dbd237bea(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_subgroupMaxSize_b43be0aa16182403(arg0) {
    const ret = getObject(arg0).subgroupMaxSize;
    return ret;
}
export function __wbg_subgroupMinSize_03feb6ee0cda6775(arg0) {
    const ret = getObject(arg0).subgroupMinSize;
    return ret;
}
export function __wbg_submit_077c85cc28e36892(arg0, arg1, arg2) {
    getObject(arg0).submit(getArrayJsValueViewFromWasm0(arg1, arg2));
}
export function __wbg_texImage2D_82bf2b4c8aa9a1db() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage2D_a856af552acdc9d9() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texImage2D_ca3d0fe24620ec85() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texImage3D_29a847f33877ed12() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    getObject(arg0).texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, getObject(arg10));
}, arguments); }
export function __wbg_texImage3D_78fb39719c620063() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    getObject(arg0).texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_texParameteri_647fdb1426809cb5(arg0, arg1, arg2, arg3) {
    getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}
export function __wbg_texParameteri_7864076abcdb03e0(arg0, arg1, arg2, arg3) {
    getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}
export function __wbg_texStorage2D_cf2bd991072d9efb(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).texStorage2D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_texStorage3D_74b701c2b176380c(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).texStorage3D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5, arg6);
}
export function __wbg_texSubImage2D_07337d0974e99c39() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texSubImage2D_196472d4111ce5b6() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texSubImage2D_24cf5097ebaa84cc() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texSubImage2D_31a0c2797aa04f32() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_5e90c7a719d40256() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texSubImage2D_64e36398b8f046ac() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texSubImage2D_bb322aae90f7657f() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texSubImage2D_d7bffff06a3b8315() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments); }
export function __wbg_texSubImage3D_001f2e62ed945b72() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    getObject(arg0).texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, getObject(arg11));
}, arguments); }
export function __wbg_texSubImage3D_5143d5af7e182ddc() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    getObject(arg0).texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, getObject(arg11));
}, arguments); }
export function __wbg_texSubImage3D_53c6014e2d129891() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    getObject(arg0).texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, getObject(arg11));
}, arguments); }
export function __wbg_texSubImage3D_5d773fc7a8cd4d08() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    getObject(arg0).texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, getObject(arg11));
}, arguments); }
export function __wbg_texSubImage3D_adb96e37e6949ec9() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    getObject(arg0).texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, getObject(arg11));
}, arguments); }
export function __wbg_texSubImage3D_d4e74595e01f7f71() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    getObject(arg0).texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, getObject(arg11));
}, arguments); }
export function __wbg_texSubImage3D_e0d113b7047a5130() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    getObject(arg0).texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_then_c8a35d4ad59c6b8e(arg0, arg1) {
    const ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_then_c949d5a25a4e78f8(arg0, arg1, arg2) {
    const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
}
export function __wbg_then_e71170d78fcf8954(arg0, arg1) {
    const ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
}
export function __wbg_unconfigure_835307f58dc68d80(arg0) {
    getObject(arg0).unconfigure();
}
export function __wbg_uniform1f_9cfecfaeb8cf43c1(arg0, arg1, arg2) {
    getObject(arg0).uniform1f(getObject(arg1), arg2);
}
export function __wbg_uniform1f_b5856e35a43b65a1(arg0, arg1, arg2) {
    getObject(arg0).uniform1f(getObject(arg1), arg2);
}
export function __wbg_uniform1i_531b98c4a7177366(arg0, arg1, arg2) {
    getObject(arg0).uniform1i(getObject(arg1), arg2);
}
export function __wbg_uniform1i_fc2dc8cadc49d8ec(arg0, arg1, arg2) {
    getObject(arg0).uniform1i(getObject(arg1), arg2);
}
export function __wbg_uniform1ui_353c67ec681b540c(arg0, arg1, arg2) {
    getObject(arg0).uniform1ui(getObject(arg1), arg2 >>> 0);
}
export function __wbg_uniform2fv_319c49f0ce340f26(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform2fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2fv_a7d3c1830d18c1b2(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform2fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2iv_65f36fc9777697d7(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform2iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2iv_ca9cb507409b9ad1(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform2iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2uiv_c95af5fb653ccb86(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform2uiv(getObject(arg1), getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3fv_055ea5ac38af4fce(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform3fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3fv_58520ffe22a6e27c(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform3fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3iv_0590e8b7eff2a791(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform3iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3iv_e91b1410dc299f50(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform3iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3uiv_9992491000463a52(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform3uiv(getObject(arg1), getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4f_22bfec882308eec2(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).uniform4f(getObject(arg1), arg2, arg3, arg4, arg5);
}
export function __wbg_uniform4f_8dd8f311e656ca0d(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).uniform4f(getObject(arg1), arg2, arg3, arg4, arg5);
}
export function __wbg_uniform4fv_3ef2f5121fcb78ae(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform4fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4fv_cf8ff646c36232c8(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform4fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4iv_6fc5436b4f876039(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform4iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4iv_99c2b07787d362d6(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform4iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4uiv_a6fb3237d9df7ed4(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform4uiv(getObject(arg1), getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniformBlockBinding_07116582301fb019(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniformBlockBinding(getObject(arg1), arg2 >>> 0, arg3 >>> 0);
}
export function __wbg_uniformMatrix2fv_34b2245136106a2f(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix2fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2fv_611c7fcb378f057e(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix2fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2x3fv_6b33a76d09b6c00f(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix2x3fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2x4fv_66c787e2d0a5dd0a(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix2x4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3fv_472e7824735acce1(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix3fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3fv_83fdc9c3c0d43204(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix3fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3x2fv_33df849b78b8556e(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix3x2fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3x4fv_8914dc5121a813b4(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix3x4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4fv_dff9738d995fd0b1(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4fv_e691d7f14d3609f7(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4x2fv_1c9ccf4427b82548(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix4x2fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4x3fv_a84b16e0a7abee2c(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix4x3fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_unmap_6a96b14c9ef5f7f5(arg0) {
    getObject(arg0).unmap();
}
export function __wbg_useProgram_5bdae58fd9f9826f(arg0, arg1) {
    getObject(arg0).useProgram(getObject(arg1));
}
export function __wbg_useProgram_e075c2902e420761(arg0, arg1) {
    getObject(arg0).useProgram(getObject(arg1));
}
export function __wbg_valueOf_02fd4d101b7553c7(arg0) {
    const ret = getObject(arg0).valueOf();
    return addHeapObject(ret);
}
export function __wbg_value_f3c585ee8f5ba40c(arg0) {
    const ret = getObject(arg0).value;
    return addHeapObject(ret);
}
export function __wbg_vertexAttribDivisorANGLE_659fb027198a47c3(arg0, arg1, arg2) {
    getObject(arg0).vertexAttribDivisorANGLE(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_vertexAttribDivisor_7575d382215322f7(arg0, arg1, arg2) {
    getObject(arg0).vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_vertexAttribIPointer_fc8057c62cfcc63c(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).vertexAttribIPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_vertexAttribPointer_24b495e18df325dc(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}
export function __wbg_vertexAttribPointer_54d56b18f71a946d(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}
export function __wbg_viewport_16936692526e2ce6(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).viewport(arg1, arg2, arg3, arg4);
}
export function __wbg_viewport_e35d16c542d2ce70(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).viewport(arg1, arg2, arg3, arg4);
}
export function __wbg_width_3d0dce3d9892e35e(arg0) {
    const ret = getObject(arg0).width;
    return ret;
}
export function __wbg_writeBuffer_f4bb3f54adfe1330() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).writeBuffer(getObject(arg1), arg2, getArrayU8FromWasm0(arg3, arg4), arg5, arg6);
}, arguments); }
export function __wbg_writeTexture_30e592e8c061c3d9() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).writeTexture(getObject(arg1), getArrayU8FromWasm0(arg2, arg3), getObject(arg4), getObject(arg5));
}, arguments); }
export function __wbindgen_generic_0000000000000001(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 3483, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_11183);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000002(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("GPUDevice")], shim_idx: 1092, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_3805);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000003(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("GPUDeviceLostInfo")], shim_idx: 1096, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_3809);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000004(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("GPUUncapturedErrorEvent")], shim_idx: 1096, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_3809_108);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000005(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("any")], shim_idx: 1092, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_3805_109);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000006(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("undefined")], shim_idx: 1092, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_3805_110);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000007(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 885, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_3225);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000008(arg0) {
    // Cast intrinsic for `F64 -> Externref`.
    const ret = arg0;
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000009(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(F32)) -> NamedExternref("Float32Array")`.
    const ret = getArrayF32FromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
export function __wbindgen_generic_000000000000000a(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I16)) -> NamedExternref("Int16Array")`.
    const ret = getArrayI16FromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
export function __wbindgen_generic_000000000000000b(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I32)) -> NamedExternref("Int32Array")`.
    const ret = getArrayI32FromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
export function __wbindgen_generic_000000000000000c(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I8)) -> NamedExternref("Int8Array")`.
    const ret = getArrayI8FromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
export function __wbindgen_generic_000000000000000d(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U16)) -> NamedExternref("Uint16Array")`.
    const ret = getArrayU16FromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
export function __wbindgen_generic_000000000000000e(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U32)) -> NamedExternref("Uint32Array")`.
    const ret = getArrayU32FromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
export function __wbindgen_generic_000000000000000f(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
    const ret = getArrayU8FromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000010(arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
export function __wbindgen_generic_0000000000000011(arg0, arg1) {
    var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
    wasm.__wbindgen_export5(arg0, arg1 * 1, 1);
    // Cast intrinsic for `Vector(U8) -> Externref`.
    const ret = v0;
    return addHeapObject(ret);
}
export function __wbindgen_object_clone_ref(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
}
export function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
}
function __wasm_bindgen_func_elem_3225(arg0, arg1) {
    wasm.__wasm_bindgen_func_elem_3225(arg0, arg1);
}

function __wasm_bindgen_func_elem_3809(arg0, arg1, arg2) {
    wasm.__wasm_bindgen_func_elem_3809(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_3809_108(arg0, arg1, arg2) {
    wasm.__wasm_bindgen_func_elem_3809_108(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_11204(arg0, arg1, arg2, arg3) {
    wasm.__wasm_bindgen_func_elem_11204(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

function __wasm_bindgen_func_elem_11183(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.__wasm_bindgen_func_elem_11183(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wasm_bindgen_func_elem_3805(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.__wasm_bindgen_func_elem_3805(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wasm_bindgen_func_elem_3805_109(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.__wasm_bindgen_func_elem_3805_109(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wasm_bindgen_func_elem_3805_110(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.__wasm_bindgen_func_elem_3805_110(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}


const __wbindgen_enum_GpuAddressMode = ["clamp-to-edge", "repeat", "mirror-repeat"];


const __wbindgen_enum_GpuAutoLayoutMode = ["auto"];


const __wbindgen_enum_GpuBlendFactor = ["zero", "one", "src", "one-minus-src", "src-alpha", "one-minus-src-alpha", "dst", "one-minus-dst", "dst-alpha", "one-minus-dst-alpha", "src-alpha-saturated", "constant", "one-minus-constant", "src1", "one-minus-src1", "src1-alpha", "one-minus-src1-alpha"];


const __wbindgen_enum_GpuBlendOperation = ["add", "subtract", "reverse-subtract", "min", "max"];


const __wbindgen_enum_GpuBufferBindingType = ["uniform", "storage", "read-only-storage"];


const __wbindgen_enum_GpuCanvasAlphaMode = ["opaque", "premultiplied"];


const __wbindgen_enum_GpuCanvasToneMappingMode = ["standard", "extended"];


const __wbindgen_enum_GpuCompareFunction = ["never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always"];


const __wbindgen_enum_GpuCullMode = ["none", "front", "back"];


const __wbindgen_enum_GpuDeviceLostReason = ["unknown", "destroyed"];


const __wbindgen_enum_GpuFilterMode = ["nearest", "linear"];


const __wbindgen_enum_GpuFrontFace = ["ccw", "cw"];


const __wbindgen_enum_GpuIndexFormat = ["uint16", "uint32"];


const __wbindgen_enum_GpuLoadOp = ["load", "clear"];


const __wbindgen_enum_GpuMipmapFilterMode = ["nearest", "linear"];


const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];


const __wbindgen_enum_GpuPrimitiveTopology = ["point-list", "line-list", "line-strip", "triangle-list", "triangle-strip"];


const __wbindgen_enum_GpuQueryType = ["occlusion", "timestamp"];


const __wbindgen_enum_GpuSamplerBindingType = ["filtering", "non-filtering", "comparison"];


const __wbindgen_enum_GpuStencilOperation = ["keep", "zero", "replace", "invert", "increment-clamp", "decrement-clamp", "increment-wrap", "decrement-wrap"];


const __wbindgen_enum_GpuStorageTextureAccess = ["write-only", "read-only", "read-write"];


const __wbindgen_enum_GpuStoreOp = ["store", "discard"];


const __wbindgen_enum_GpuTextureAspect = ["all", "stencil-only", "depth-only"];


const __wbindgen_enum_GpuTextureDimension = ["1d", "2d", "3d"];


const __wbindgen_enum_GpuTextureFormat = ["r8unorm", "r8snorm", "r8uint", "r8sint", "r16unorm", "r16snorm", "r16uint", "r16sint", "r16float", "rg8unorm", "rg8snorm", "rg8uint", "rg8sint", "r32uint", "r32sint", "r32float", "rg16unorm", "rg16snorm", "rg16uint", "rg16sint", "rg16float", "rgba8unorm", "rgba8unorm-srgb", "rgba8snorm", "rgba8uint", "rgba8sint", "bgra8unorm", "bgra8unorm-srgb", "rgb9e5ufloat", "rgb10a2uint", "rgb10a2unorm", "rg11b10ufloat", "rg32uint", "rg32sint", "rg32float", "rgba16unorm", "rgba16snorm", "rgba16uint", "rgba16sint", "rgba16float", "rgba32uint", "rgba32sint", "rgba32float", "stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float", "depth32float-stencil8", "bc1-rgba-unorm", "bc1-rgba-unorm-srgb", "bc2-rgba-unorm", "bc2-rgba-unorm-srgb", "bc3-rgba-unorm", "bc3-rgba-unorm-srgb", "bc4-r-unorm", "bc4-r-snorm", "bc5-rg-unorm", "bc5-rg-snorm", "bc6h-rgb-ufloat", "bc6h-rgb-float", "bc7-rgba-unorm", "bc7-rgba-unorm-srgb", "etc2-rgb8unorm", "etc2-rgb8unorm-srgb", "etc2-rgb8a1unorm", "etc2-rgb8a1unorm-srgb", "etc2-rgba8unorm", "etc2-rgba8unorm-srgb", "eac-r11unorm", "eac-r11snorm", "eac-rg11unorm", "eac-rg11snorm", "astc-4x4-unorm", "astc-4x4-unorm-srgb", "astc-5x4-unorm", "astc-5x4-unorm-srgb", "astc-5x5-unorm", "astc-5x5-unorm-srgb", "astc-6x5-unorm", "astc-6x5-unorm-srgb", "astc-6x6-unorm", "astc-6x6-unorm-srgb", "astc-8x5-unorm", "astc-8x5-unorm-srgb", "astc-8x6-unorm", "astc-8x6-unorm-srgb", "astc-8x8-unorm", "astc-8x8-unorm-srgb", "astc-10x5-unorm", "astc-10x5-unorm-srgb", "astc-10x6-unorm", "astc-10x6-unorm-srgb", "astc-10x8-unorm", "astc-10x8-unorm-srgb", "astc-10x10-unorm", "astc-10x10-unorm-srgb", "astc-12x10-unorm", "astc-12x10-unorm-srgb", "astc-12x12-unorm", "astc-12x12-unorm-srgb"];


const __wbindgen_enum_GpuTextureSampleType = ["float", "unfilterable-float", "depth", "sint", "uint"];


const __wbindgen_enum_GpuTextureViewDimension = ["1d", "2d", "2d-array", "cube", "cube-array", "3d"];


const __wbindgen_enum_GpuVertexFormat = ["uint8", "uint8x2", "uint8x4", "sint8", "sint8x2", "sint8x4", "unorm8", "unorm8x2", "unorm8x4", "snorm8", "snorm8x2", "snorm8x4", "uint16", "uint16x2", "uint16x4", "sint16", "sint16x2", "sint16x4", "unorm16", "unorm16x2", "unorm16x4", "snorm16", "snorm16x2", "snorm16x4", "float16", "float16x2", "float16x4", "float32", "float32x2", "float32x3", "float32x4", "uint32", "uint32x2", "uint32x3", "uint32x4", "sint32", "sint32x2", "sint32x3", "sint32x4", "unorm10-10-10-2", "unorm8x4-bgra"];


const __wbindgen_enum_GpuVertexStepMode = ["vertex", "instance"];


const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];
const BrowserMapViewFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_browsermapview_free(ptr, 1));
const CourseMedianSmootherFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_coursemediansmoother_free(ptr, 1));
const ExponentialValueChaseFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_exponentialvaluechase_free(ptr, 1));
const FollowCameraFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_followcamera_free(ptr, 1));
const LocationPoseAnimatorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_locationposeanimator_free(ptr, 1));
const MapCameraFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_mapcamera_free(ptr, 1));
const SmoothstepTimedEaseFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_smoothsteptimedease_free(ptr, 1));
const TraceCursorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_tracecursor_free(ptr, 1));

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_export4(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI16FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function getArrayJsValueViewFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(getObject(mem.getUint32(i, true)));
    }
    return result;
}

function getArrayU16FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedInt16ArrayMemory0 = null;
function getInt16ArrayMemory0() {
    if (cachedInt16ArrayMemory0 === null || cachedInt16ArrayMemory0.byteLength === 0) {
        cachedInt16ArrayMemory0 = new Int16Array(wasm.memory.buffer);
    }
    return cachedInt16ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

let cachedInt8ArrayMemory0 = null;
function getInt8ArrayMemory0() {
    if (cachedInt8ArrayMemory0 === null || cachedInt8ArrayMemory0.byteLength === 0) {
        cachedInt8ArrayMemory0 = new Int8Array(wasm.memory.buffer);
    }
    return cachedInt8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint16ArrayMemory0 = null;
function getUint16ArrayMemory0() {
    if (cachedUint16ArrayMemory0 === null || cachedUint16ArrayMemory0.byteLength === 0) {
        cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
    }
    return cachedUint16ArrayMemory0;
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export3(addHeapObject(e));
    }
}

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_export4(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    const mem = getDataViewMemory0();
    for (let i = 0; i < array.length; i++) {
        mem.setUint32(ptr + 4 * i, addHeapObject(array[i]), true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;


let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}
