// Browser entry point: loads the wasm module, starts the SDK, and exposes
// the bound surface on `window.mapTest` for the Playwright harness. The
// `window.mapTestReady` promise resolves only after the Rust-side
// `start_sdk` completed, so tests can await readiness before asserting.
import init, {
  MapCamera,
  GpuMapCanvas,
  CanvasTileResolution,
  CanvasSdkLogSeverity,
  coordinate_to_normalized_world,
  tile_key_for_coordinate,
  tiles_covering,
  get_sdk_compiled_version,
  retina_device_pixel_ratio_threshold,
  camera_pan_by_screen_pixels,
  camera_zoom_by_levels_around_screen_point,
  camera_rotate_by_degrees_around_screen_point,
  offline_route_from_archive_bytes,
  register_provider,
  clear_provider,
  forward_geocode_live,
  calculate_route_live,
  fetch_raster_tile_live,
  start_sdk,
  subscribe_to_diagnostic_events,
  flush_recent_diagnostic_events,
} from './pkg/map_web_bindings.js';

window.mapTestReady = (async () => {
  await init();
  const compiled_version = await start_sdk();
  window.mapTest = {
    MapCamera,
    GpuMapCanvas,
    CanvasTileResolution,
    CanvasSdkLogSeverity,
    coordinate_to_normalized_world,
    tile_key_for_coordinate,
    tiles_covering,
    get_sdk_compiled_version,
    retina_device_pixel_ratio_threshold,
    camera_pan_by_screen_pixels,
    camera_zoom_by_levels_around_screen_point,
    camera_rotate_by_degrees_around_screen_point,
    offline_route_from_archive_bytes,
    register_provider,
    clear_provider,
    forward_geocode_live,
    calculate_route_live,
    fetch_raster_tile_live,
    subscribe_to_diagnostic_events,
    flush_recent_diagnostic_events,
  };
  const status_element = document.getElementById('harness-status');
  if (status_element) {
    status_element.textContent = `Maps SDK wasm core ready (version ${compiled_version})`;
  }
  return compiled_version;
})();