// Browser entry point: loads the wasm module, starts the SDK, and exposes
// the bound surface on `window.mapTest` for the Playwright harness. The
// `window.mapTestReady` promise resolves only after the Rust-side
// `initializeSdk` completed, so tests can await readiness before asserting.
import init, {
  MapCamera,
  MapView,
  MapsSdk,
  TileResolution,
  SdkLogSeverity,
  coordinateToNormalizedWorld,
  tileKeyForCoordinate,
  tilesCovering,
  getSdkCompiledVersion,
  devicePixelRatioThreshold,
  panCameraByScreenPixels,
  zoomCameraByLevelsAroundScreenPoint,
  rotateCameraByDegreesAroundScreenPoint,
  offlineRouteFromArchiveBytes,
  registerProvider,
  clearProvider,
  forwardGeocode,
  calculateRoute,
  fetchRasterTile,
  initializeSdk,
  subscribeToDiagnosticEvents,
  flushRecentDiagnosticEvents,
} from './pkg/map_web_bindings.js';

window.mapTestReady = (async () => {
  await init();
  // The SDK root the page creates once and hands to its MapViews
  // (`new MapView(canvas, maps)`); `initializeSdk` stays exported as the
  // legacy readiness alias the golden harness still awaits.
  const maps = await MapsSdk.create();
  const compiled_version = maps.compiledVersion;
  window.mapTest = {
    MapCamera,
    MapView,
    MapsSdk,
    maps,
    TileResolution,
    SdkLogSeverity,
    coordinateToNormalizedWorld,
    tileKeyForCoordinate,
    tilesCovering,
    getSdkCompiledVersion,
    devicePixelRatioThreshold,
    panCameraByScreenPixels,
    zoomCameraByLevelsAroundScreenPoint,
    rotateCameraByDegreesAroundScreenPoint,
    offlineRouteFromArchiveBytes,
    registerProvider,
    clearProvider,
    forwardGeocode,
    calculateRoute,
    fetchRasterTile,
    subscribeToDiagnosticEvents,
    flushRecentDiagnosticEvents,
  };
  const status_element = document.getElementById('harness-status');
  if (status_element) {
    status_element.textContent = `Map ready (version ${compiled_version})`;
  }
  return compiled_version;
})();