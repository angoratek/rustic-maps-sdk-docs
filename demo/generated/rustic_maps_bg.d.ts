// Type declarations for the hand-written browser canvas surface.
//
// The generated `wasm2` package carries two surfaces: the contract namespace
// (`index.js` / `rustic_maps.js`) and the wasm-bindgen glue
// (`rustic_maps_bg.js`). The glue is emitted by wasm-bindgen from the
// `rustic-maps-web-bindings` crate and ships no usable declarations of its
// own, so this file declares the classes and helpers the page imports. The
// npm package publishes it as `rustic_maps_bg.d.ts`, beside the glue.
//
// Pose objects are `{latitude, longitude, zoomLevel, bearingDegrees,
// pitchDegrees}`. Overlay, source, indicator and fix objects carry the
// lower-camel contract field names the glue reads; they are typed loosely
// here because the contract declarations own their record shapes.

/** The browser canvas GPU surface over a page's `HTMLCanvasElement`. */
export class BrowserMapView {
  constructor(canvas: HTMLCanvasElement, tileResolution?: TileResolution);

  /** Acquires the GPU device and configures the surface. */
  initialize(): Promise<string>;
  /** Releases the surface's GPU resources. */
  free(): void;

  /** Draws one complete frame at the given camera pose. */
  renderFrame(camera: MapCamera, fieldOfViewDegrees: number): Promise<any>;

  /** Replaces the view's stored camera pose. */
  setCamera(camera: MapCamera): void;
  /** Reads the view's stored camera pose. */
  camera(): any;
  /** Rotates the content clockwise around the viewport center. */
  rotateByDegrees(clockwiseDegrees: number): void;
  /** Reports whether a frame has drawn and presented successfully. */
  hasDrawnFirstFrame(): boolean;
  /** The render viewport width in pixels (zero before the first frame). */
  viewportWidthPixels(): number;
  /** The render viewport height in pixels (zero before the first frame). */
  viewportHeightPixels(): number;
  /** The capped surface extent, or null before the first frame. */
  viewportPixelExtent(): { widthPixels: number; heightPixels: number } | null;
  /** The device pixels one CSS pixel covers on this canvas. */
  displayScale(): number;
  /** Fits the camera to a box with pixel insets. */
  fitBounds(
    southWestLatitude: number,
    southWestLongitude: number,
    northEastLatitude: number,
    northEastLongitude: number,
    widthPixels: number,
    heightPixels: number,
    insetTopPixels: number,
    insetRightPixels: number,
    insetBottomPixels: number,
    insetLeftPixels: number,
    maximumZoomLevel: number,
  ): any;
  /** Reads the viewport's geographic bounds at the stored pose. */
  cameraGeographicBounds(
    widthPixels: number,
    heightPixels: number,
    fieldOfViewDegrees: number,
  ): any;

  /** Replaces the drawn overlay list. */
  setOverlays(overlays: any[]): void;
  /** Adds one overlay and answers its opaque identifier. */
  addOverlay(overlay: any): string;
  /** Replaces one addressed overlay. */
  updateOverlay(identifier: string, overlay: any): void;
  /** Removes one addressed overlay. */
  removeOverlay(identifier: string): void;
  /** Clears every overlay. */
  clearOverlays(): void;

  /** Draws the location indicator in every following frame. */
  setLocationIndicator(stateValue: any, styleValue: any): void;
  /** Removes the location indicator. */
  clearLocationIndicator(): void;
  /** Reports whether a camera gesture is in progress. */
  setCameraGestureActive(active: boolean): void;

  /** Hides or shows the raster base layer. */
  setBaseMapVisible(visible: boolean): void;
  /** Sets the clear colour behind the layers. */
  setBackgroundColor(red: number, green: number, blue: number, alpha: number): void;
  /** Stages a parent tile under a fallback address. */
  stageParentTile(
    fallbackTileX: number,
    fallbackTileY: number,
    fallbackZoomLevel: number,
    parentTileX: number,
    parentTileY: number,
    parentZoomLevel: number,
  ): void;

  /** Installs a URL-template vector tile source. */
  setVectorTileSource(source: any): void;
  /** Installs a provider-backed vector tile source. */
  setProviderVectorTileSource(source: any): void;
  /** Installs a provider-published vector style document. */
  setProviderVectorTileSourceFromDocument(
    source: any,
    styleDocumentUrl: string,
  ): void;
  /** Removes the installed vector tile source. */
  clearVectorTileSource(): void;
  /** Reads the vector source's status record. */
  vectorTileSourceStatus(): any;
  /** Re-fetches the installed vector source's current tiles. */
  reloadTileSource(): Promise<any>;

  /** Replays the presented frame into an offscreen texture and reads it back. */
  snapshot(): any;
}

/** The canvas camera pose algebra shared with the contract. */
export class MapCamera {
  constructor(
    centerLatitude: number,
    centerLongitude: number,
    zoomLevel: number,
    bearingDegrees: number,
    pitchDegrees: number,
  );

  static fittingBounds(
    southWestLatitude: number,
    southWestLongitude: number,
    northEastLatitude: number,
    northEastLongitude: number,
    widthPixels: number,
    heightPixels: number,
    insetTopPixels: number,
    insetRightPixels: number,
    insetBottomPixels: number,
    insetLeftPixels: number,
    maximumZoomLevel: number,
  ): MapCamera;
  static interpolate(
    startCamera: MapCamera,
    targetCamera: MapCamera,
    fraction: number,
  ): MapCamera;

  center(): any;
  zoomLevel(): number;
  bearingDegrees(): number;
  pitchDegrees(): number;
  tileZoomLevel(): number;
  groundMetersPerScreenPixel(
    widthPixels: number,
    heightPixels: number,
    fieldOfViewDegrees: number,
  ): number;
  projectToScreen(
    latitude: number,
    longitude: number,
    widthPixels: number,
    heightPixels: number,
    fieldOfViewDegrees: number,
  ): any;
  screenToGroundCoordinate(
    screenX: number,
    screenY: number,
    widthPixels: number,
    heightPixels: number,
    fieldOfViewDegrees: number,
  ): any;
  visibleTileKeys(
    widthPixels: number,
    heightPixels: number,
    fieldOfViewDegrees: number,
    tileZoomLevel: number,
  ): any[];
  panByScreenPixels(
    deltaXPixels: number,
    deltaYPixels: number,
    widthPixels: number,
    heightPixels: number,
    fieldOfViewDegrees: number,
  ): any;
  zoomByLevelsAroundScreenPoint(
    deltaZoomLevels: number,
    focalXPixels: number,
    focalYPixels: number,
    widthPixels: number,
    heightPixels: number,
    fieldOfViewDegrees: number,
  ): any;
  rotateByDegreesAroundScreenPoint(
    deltaBearingDegrees: number,
    focalXPixels: number,
    focalYPixels: number,
    widthPixels: number,
    heightPixels: number,
    fieldOfViewDegrees: number,
  ): any;
  free(): void;
}

/** Raster tile pixel resolution. */
export const TileResolution: {
  readonly Standard: 0;
  readonly Retina: 1;
  readonly "0": "Standard";
  readonly "1": "Retina";
};
export type TileResolution = (typeof TileResolution)[keyof typeof TileResolution];

/** Traffic flow congestion levels the overlay scenes name. */
export const TrafficFlowCongestionLevel: {
  readonly FreeFlow: 0;
  readonly Slow: 1;
  readonly Congested: 2;
  readonly Blocked: 3;
  readonly "0": "FreeFlow";
  readonly "1": "Slow";
  readonly "2": "Congested";
  readonly "3": "Blocked";
};
export type TrafficFlowCongestionLevel =
  (typeof TrafficFlowCongestionLevel)[keyof typeof TrafficFlowCongestionLevel];

/** The device-pixel-ratio threshold above which tiles fetch at retina scale. */
export function devicePixelRatioThreshold(): number;

/** Points a provider key's requests at a base URL instead of its public endpoint. */
export function setProviderBaseUrl(providerKey: string, baseUrl: string): void;
/** Empties every canvas-facing provider slot and forgets the selections. */
export function clearProviderRegistrations(): void;
/** Clears the provider mirrors the generated registry published to the canvas. */
export function clearSharedProviderSlots(): void;
/** Registers a keyless URL-template raster source as the canvas' fallback. */
export function registerUrlTemplateRasterTileSource(source: any): void;
/** Removes the page-registered URL-template raster source. */
export function clearUrlTemplateRasterTileSource(): void;

/** The XYZ tile bounds of a vector source's viewport. */
export function vectorTileGeographicBounds(...args: any[]): any;
/** Decodes one MVT payload into overlay descriptors. */
export function vectorTileOverlayDescriptors(...args: any[]): any;
/** Decodes one MVT payload and paints it with a committed style variant. */
export function vectorTileOverlayDescriptorsForStyle(...args: any[]): any;

/** The reference-application behavior math the page shares with the native apps. */
export function smoothstepEasedProgress(...args: any[]): any;
export function bearingOffNorthDegrees(bearingDegrees: number): number;
export function signedAngularDifferenceDegrees(...args: any[]): number;
export function followZoomTowardTripEnd(...args: any[]): any;
export function selectScaleBarScale(...args: any[]): any;
export function selectScaleBarScaleWithWidthRange(...args: any[]): any;
export function scaleBarDistanceLabelText(...args: any[]): any;
export function traceDispatchIntervalMilliseconds(...args: any[]): number;

/** The reference-application behavior classes the page shares with the native apps. */
export class CourseMedianSmoother {
  constructor(windowFixCount: number);
  add(courseDegrees: number): void;
  median(): any;
  reset(): void;
  free(): void;
}
export class ExponentialValueChase {
  constructor(timeConstantMilliseconds: number);
  advance(current: number, target: number, nowMilliseconds: number): number;
  reset(): void;
  free(): void;
}
export class FollowCamera {
  constructor();
  engageTrip(...args: any[]): void;
  onFix(...args: any[]): void;
  reengage(): void;
  restorePreTripCamera(): void;
  northUp(): void;
  courseUp(): void;
  isNorthUp(): boolean;
  /** The current follow phase. */
  get phase(): string;
  /** The captured pre-trip camera, or null outside a trip. */
  get preTripCamera(): any;
  /** The target bearing in degrees, or null until a fix reports a course. */
  get targetBearingDegrees(): any;
  /** The target centre latitude in degrees. */
  get targetCenterLatitudeDegrees(): number;
  /** The target centre longitude in degrees. */
  get targetCenterLongitudeDegrees(): number;
  /** The target zoom level. */
  get targetZoomLevel(): number;
  breakOnGesture(): void;
  free(): void;
}
export class LocationPoseAnimator {
  constructor();
  pushFix(...args: any[]): void;
  poseAt(nowMilliseconds: number): any;
  reset(): void;
  free(): void;
}
export class SmoothstepTimedEase {
  constructor(sampleCount: number);
  begin(
    startMilliseconds: number,
    fromValue: number,
    toValue: number,
    durationMilliseconds: number,
  ): void;
  advance(nowMilliseconds: number): number;
  /** Whether an ease is in flight. */
  get is_running(): boolean;
  /** The ease's target value. */
  get target_value(): number;
  reset(): void;
  free(): void;
}
export class TraceCursor {
  constructor(sampleCount: number);
  advance(): number | null;
  peek(): number | null;
  nextSampleIndex(): number;
  remainingSampleCount(): number;
  seekToSampleIndex(sampleIndex: number): void;
  /** The trace's sample count. */
  get sampleCount(): number;
  isFinished(): boolean;
  reset(): void;
  free(): void;
}
