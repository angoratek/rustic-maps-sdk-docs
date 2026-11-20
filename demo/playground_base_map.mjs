// playground_base_map: the base map concern of the browser
// playground controller.
//
// Responsibility:
// Base map selection: the raster and vector base descriptors, tile-mode
// switching, the vector style and theme refresh, and the on-map layer panel
// base rows.
//
// Public exports:
//   defineBaseMap
//   installBaseMapPhase1
//   installBaseMapPhase2
//   installBaseMapPhase3
//   installBaseMapPhase4
//   installBaseMapPhase5
//   installBaseMapPhase6
//   installBaseMapPhase7
//
// Every function reads shared state through the `runtime` object passed to
// `defineBaseMap` and calls helpers from other concerns through
// `runtime.services`, so this module imports no sibling concern module and
// the concern graph stays acyclic.

import {
  SACRAMENTO_OVERLAY_SCENE_LABELS,
  REFERENCE_SCENE_ARTIFACT,
} from './overlay_scenes.mjs';
import {
  MAP_LAYER_BASE_ROW_IDENTIFIER_PREFIX,
  MAP_LAYER_SCENE_ROW_IDENTIFIER_PREFIX,
  MAP_LAYER_STYLE_ROW_IDENTIFIER_PREFIX,
  MAP_LAYERS_ACTIVE_DOT_CLASS_NAME,
  MAP_LAYERS_CONTROL_IDENTIFIER,
  MAP_LAYERS_CONTROL_LABEL,
  MAP_LAYERS_PANEL_IDENTIFIER,
  MAP_LAYERS_SERVING_TEXT,
  MAP_LAYERS_STATUS_IDENTIFIER,
  base_row_credential_refusal,
  is_non_default_layer_active,
  raster_descriptor_declares_live_source,
  raster_descriptor_serves_demo_fixtures,
  traffic_layer_availability,
} from './map_layers.mjs';
import {
  TILE_LAYER_MODES,
  applyTileLayerMode,
  vectorStyleIdForDescriptor,
} from './tile_switch.mjs';

/**
 * Whether a raster descriptor's recorded tile set is served by this page.
 * The dev server answers the committed fixtures same-origin; a deployed page
 * stages none, so its fixture-backed row is not demonstrable and waits for
 * that provider's credential instead of requesting a directory the site does
 * not carry. The keyless first-run base on such a page is the vector base.
 */
function raster_descriptor_serves_this_page(runtime, provider_descriptor) {
  return runtime.shared.recorded_tile_fixtures_are_served === true
    && raster_descriptor_serves_demo_fixtures(provider_descriptor);
}

export function defineBaseMap(runtime) {
  /** The style the base paints now: the picked one, else the theme join. */
  function active_vector_style_id() {
    const vector_descriptor = runtime.services.selected_vector_descriptor();
    if (vector_descriptor === null) return null;
    return vectorStyleIdForDescriptor(
      vector_descriptor, runtime.services.resolved_theme_name(), runtime.state.current_vector_style_id);
  }

  /** The registry descriptor declaring a fixture route for one purpose. */
  function base_map_descriptor_for_route_purpose(route_purpose) {
    return runtime.state.providers_registry.providers.find((provider_descriptor) =>
      Array.isArray(provider_descriptor.fixture_routes)
      && provider_descriptor.fixture_routes.some(
        (fixture_route) => fixture_route.purpose === route_purpose));
  }

  /** The vector descriptor the page last selected (never a guess). */
  function selected_vector_descriptor() {
    return runtime.shared.VECTOR_BASE_MAP_DESCRIPTORS.find((provider_descriptor) =>
      provider_descriptor.provider_key === runtime.state.current_vector_provider_key) ?? null;
  }

  /** The raster descriptor the page last selected (never a guess). */
  function selected_raster_descriptor() {
    return runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.find((provider_descriptor) =>
      provider_descriptor.provider_key === runtime.state.current_raster_provider_key) ?? null;
  }

  /** The raster descriptor whose live template the page registered, or null. */
  function registered_live_raster_descriptor() {
    if (!runtime.state.live_raster_fallback_registered) return null;
    return runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.find(
      raster_descriptor_declares_live_source) ?? null;
  }

  /** Advances the base selection's epoch and returns the new value. */
  function begin_base_selection_epoch() {
    runtime.state.base_selection_epoch += 1;
    return runtime.state.base_selection_epoch;
  }

  /** Drops the canvas' pooled raster state after a source change. */
  function reload_raster_tile_source() {
    if (runtime.state.gpu_map_canvas === null) return;
    try {
      runtime.state.gpu_map_canvas.reloadTileSource();
    } catch {
      // Before initialization the reload is a no-op; the next frame
      // resolves its sources afresh anyway.
    }
  }

  /** Shows (or clears) the base-map status line. */
  function set_base_map_status(status_text) {
    runtime.shared.base_map_status_element.hidden = status_text === null;
    runtime.shared.base_map_status_element.textContent = status_text ?? '';
  }

  /** Applies the active style's own background (else the theme's paper
   * color) to the canvas. */
  function apply_vector_base_clear_color() {
    const active_style_id = runtime.services.active_vector_style_id();
    const clear_color = runtime.shared.VECTOR_BASE_CLEAR_COLOR_BY_STYLE[active_style_id]
      ?? runtime.shared.VECTOR_BASE_CLEAR_COLOR_BY_THEME[runtime.services.resolved_theme_name()]
      ?? runtime.shared.VECTOR_BASE_CLEAR_COLOR_BY_THEME.light;
    runtime.state.gpu_map_canvas.setBackgroundColor(
      clear_color.red,
      clear_color.green,
      clear_color.blue,
      clear_color.alpha,
    );
  }

  /** The attribution line the active style's own terms require. */
  function active_vector_style_attribution(vector_descriptor) {
    const style_id = runtime.services.active_vector_style_id();
    const style_choice = (vector_descriptor.vector_styles ?? []).find(
      (candidate) => candidate.style_id === style_id);
    return style_choice?.attribution_text
      ?? vector_descriptor.attribution_text
      ?? '';
  }

  /** The path of a style-document address, for the fixture-origin rewrite. */
  function style_document_pathname(document_url) {
    try {
      return new URL(document_url).pathname;
    } catch {
      return '';
    }
  }

  /**
   * Installs the selected vector source on the canvas (M31's
   * renderer-internal base): the canvas fetches, decodes, styles and
   * labels the tiles itself through the registry's URL template, so the
   * page no longer composes vector geometry or label descriptors.
   */
  function install_vector_base_source() {
    if (runtime.state.current_tile_mode !== TILE_LAYER_MODES.vector
      || runtime.state.renderer_mode !== 'gpu' || !runtime.state.gpu_map_canvas) {
      return;
    }
    const install_epoch = runtime.services.begin_base_selection_epoch();
    const vector_descriptor = runtime.services.selected_vector_descriptor();
    if (vector_descriptor === null) return;
    const style_id = runtime.services.active_vector_style_id();
    if (style_id === null) return;
    const style_choice = (vector_descriptor.vector_styles ?? []).find(
      (candidate) => candidate.style_id === style_id);
    // A credentialed family waits for its provider's credential, exactly
    // like the raster base rows.
    const refusal_text = base_row_credential_refusal(
      vector_descriptor, runtime.shared.applied_provider_keys);
    if (refusal_text !== null) {
      runtime.services.set_base_map_status(refusal_text);
      return;
    }
    runtime.services.set_base_map_status(
      `Loading the ${vector_descriptor.display_name} vector base…`);
    // The provider's own style document: fetched through the provider's
    // authenticated client, never by the page, so this page names no
    // credential and no vendor URL beyond the registry field. The harness
    // seam `?useProviderFixtures` serves the same path from the registry's
    // committed fixture routes, so the suite never reaches the network.
    const style_document_url =
      typeof style_choice?.document_url === 'string'
        ? style_choice.document_url.trim()
        : '';
    if (style_document_url !== '') {
      const fetch_url = runtime.shared.use_provider_fixtures
        ? `${runtime.state.providers_registry.fixture_base_path}/${vector_descriptor.provider_key}${runtime.services.style_document_pathname(style_document_url)}`
        : style_document_url;
      runtime.state.gpu_map_canvas.setProviderVectorTileSourceFromDocument(
        { providerKey: vector_descriptor.provider_key, styleId: style_id },
        fetch_url,
      ).then(
        () => {
          if (install_epoch !== runtime.state.base_selection_epoch) return;
          runtime.services.refresh_vector_base_status();
          runtime.services.schedule_render();
        },
        (vector_failure) => {
          if (install_epoch !== runtime.state.base_selection_epoch) return;
          runtime.services.set_base_map_status(
            `The vector base failed: ${String(
              vector_failure?.message ?? vector_failure)}`);
        },
      );
      return;
    }
    try {
      runtime.state.gpu_map_canvas.setVectorTileSource({
        urlTemplate: vector_descriptor.url_template,
        sourceName: vector_descriptor.provider_key,
        attributionText: runtime.services.active_vector_style_attribution(vector_descriptor),
        styleId: style_id,
        minimumZoomLevel: runtime.shared.VECTOR_BASE_MINIMUM_ZOOM_LEVEL,
        maximumZoomLevel: Number.isInteger(vector_descriptor.maximum_zoom_level)
          ? vector_descriptor.maximum_zoom_level
          : runtime.shared.VECTOR_BASE_DEFAULT_MAXIMUM_ZOOM_LEVEL,
      });
    } catch (vector_failure) {
      runtime.services.set_base_map_status(
        `The vector base failed: ${String(
          vector_failure?.message ?? vector_failure)}`);
      return;
    }
    runtime.services.schedule_render();
  }

  /** Reflects the canvas' vector-source status in the base-map line. */
  function refresh_vector_base_status() {
    if (runtime.state.current_tile_mode !== TILE_LAYER_MODES.vector
      || runtime.state.renderer_mode !== 'gpu' || !runtime.state.gpu_map_canvas) {
      return;
    }
    const vector_descriptor = runtime.services.selected_vector_descriptor();
    if (vector_descriptor === null) return;
    let status;
    try {
      status = runtime.state.gpu_map_canvas.vectorTileSourceStatus();
    } catch {
      return;
    }
    if (!status.isConfigured && status.pendingVectorInstall !== true) {
      runtime.services.set_base_map_status(null);
      return;
    }
    // An in-flight provider-document download is not a settled or
    // cancelled base: say it is loading instead of reporting zero tiles.
    if (status.pendingVectorInstall === true) {
      runtime.services.set_base_map_status(
        `Loading the ${vector_descriptor.display_name} vector base…`);
      return;
    }
    if (status.drawnTileCount === 0 && status.failedTileCount === 0) {
      runtime.services.set_base_map_status(
        `Loading the ${vector_descriptor.display_name} vector base…`);
      return;
    }
    const failure_suffix = status.lastFailureDetail === null
      ? ''
      : ` — ${status.lastFailureDetail}`;
    runtime.services.set_base_map_status(
      `Vector base · ${vector_descriptor.display_name} · ${status.styleId}: ` +
      `${status.drawnTileCount} tiles drawn, ` +
      `${status.failedTileCount} failed${failure_suffix}`);
  }

  /**
   * Clears the credentialed raster-tile slot, leaving every other
   * capability in place. The generic clear empties all slots, so the
   * registrations that were serving before it are re-applied: a
   * credentialed provider from this session's key, a keyless provider
   * from its descriptor's declared demo address. The raster contract
   * itself is the base-map selection's to install, so it stays out.
   */
  function clear_credentialed_raster_provider() {
    const current_registrations = Array.from(
      runtime.services.current_provider_registrations());
    const raster_contract_name =
      runtime.shared.CAPABILITY_CONTRACT_NAMES[runtime.shared.RASTER_TILES_CAPABILITY_KEY];
    const raster_is_registered = current_registrations.some(
      (registration) => registration.registered
        && registration.contract === raster_contract_name);
    // Nothing served the raster slot, so clearing would tear down the
    // other capabilities for no reason.
    if (!raster_is_registered) return;
    const registrations_to_restore = current_registrations.filter(
      (registration) => registration.registered
        && registration.contract !== raster_contract_name);
    window.mapTest.clearProviderRegistrations();
    for (const registration of registrations_to_restore) {
      const provider_descriptor = runtime.state.providers_registry.providers.find(
        (candidate_descriptor) =>
          candidate_descriptor.provider_key === registration.providerKey);
      if (provider_descriptor === undefined) continue;
      const credential_value =
        runtime.shared.provider_credentials_by_key.get(registration.providerKey)
        ?? provider_descriptor.demo_base_url;
      if (typeof credential_value !== 'string'
        || credential_value.trim() === '') {
        continue;
      }
      window.mapTest.configureProvider(
        registration.contract, registration.providerKey, credential_value);
    }
  }

  /** Registers one descriptor's live `{z}/{x}/{y}` raster template. */
  function register_live_raster_fallback_source(provider_descriptor) {
    window.mapTest.registerUrlTemplateRasterTileSource({
      urlTemplate: provider_descriptor.raster_url_template,
      sourceName: provider_descriptor.display_name,
      minimumZoomLevel: 0,
      maximumZoomLevel: Number.isInteger(provider_descriptor.maximum_zoom_level)
        ? provider_descriptor.maximum_zoom_level
        : runtime.shared.LIVE_RASTER_FALLBACK_ZOOM_LEVEL,
      imageFormat: 'png',
      tileResolution: 'standard',
    });
    runtime.state.live_raster_fallback_registered = true;
  }

  /**
   * Installs the registration one raster descriptor's row names: a
   * credentialed provider into the raster slot, the keyless live source
   * through the URL-template seam, and the demo-fixture row by clearing
   * the credentialed slot so the committed imagery serves. Returns false
   * when the descriptor cannot serve yet; the caller then leaves the
   * previous selection in place.
   */
  function install_raster_base_provider(provider_descriptor) {
    const provider_key = provider_descriptor.provider_key;
    if (raster_descriptor_declares_live_source(provider_descriptor)) {
      if (!runtime.shared.live_tiles_enabled) {
        runtime.services.set_base_map_status(
          'The live raster base is available on a deployed host; this page ' +
          'serves the committed fixture imagery.');
        return false;
      }
      try {
        runtime.services.clear_credentialed_raster_provider();
        window.mapTest.clearUrlTemplateRasterTileSource();
        runtime.services.register_live_raster_fallback_source(provider_descriptor);
      } catch (registration_failure) {
        runtime.services.set_base_map_status(
          `The live raster base could not be registered: ${String(
            registration_failure?.message ?? registration_failure)}`);
        return false;
      }
      return true;
    }
    if (raster_descriptor_serves_this_page(runtime, provider_descriptor)) {
      runtime.services.clear_credentialed_raster_provider();
      return true;
    }
    const credential_value = runtime.shared.provider_credentials_by_key.get(provider_key);
    if (credential_value === undefined) {
      runtime.services.set_base_map_status(
        `Needs ${provider_descriptor.credential_label}`);
      return false;
    }
    try {
      if (runtime.shared.use_provider_fixtures) {
        window.mapTest.setProviderBaseUrl(
          provider_descriptor.wasm_registration ?? provider_key,
          `${window.location.origin}${runtime.state.providers_registry.fixture_base_path}`
            + `/${provider_key}`,
        );
      }
      window.mapTest.configureProvider(
        runtime.shared.CAPABILITY_CONTRACT_NAMES[runtime.shared.RASTER_TILES_CAPABILITY_KEY],
        provider_key,
        credential_value,
      );
    } catch (registration_failure) {
      const failure_text = runtime.services.provider_prefixed_failure_text(
        provider_descriptor,
        String(registration_failure?.message ?? registration_failure));
      runtime.services.set_base_map_status(failure_text);
      runtime.services.show_error_report('Provider selection', failure_text);
      return false;
    }
    return true;
  }

  /** Repaints the raster base with its normal clear color. */
  function apply_raster_base_clear_color() {
    if (runtime.state.gpu_map_canvas === null) return;
    runtime.state.gpu_map_canvas.setBackgroundColor(
      runtime.shared.VECTOR_BASE_RASTER_CLEAR_COLOR.red,
      runtime.shared.VECTOR_BASE_RASTER_CLEAR_COLOR.green,
      runtime.shared.VECTOR_BASE_RASTER_CLEAR_COLOR.blue,
      runtime.shared.VECTOR_BASE_RASTER_CLEAR_COLOR.alpha,
    );
  }

  /**
   * Selects one base layer: one raster descriptor's base, or one
   * provider-declared vector base. The provider key picks the descriptor
   * in both modes; a raster selection with no key keeps the current one.
   */
  function switch_tile_mode(next_mode, next_provider_key = null,
    { remember = true } = {}) {
    if (next_mode === TILE_LAYER_MODES.vector) {
      if (runtime.state.renderer_mode !== 'gpu' || !runtime.state.gpu_map_canvas) {
        runtime.services.set_base_map_status(
          'The vector base needs the GPU renderer; this browser fell back to the 2D grid.');
        return;
      }
      const next_descriptor = runtime.shared.VECTOR_BASE_MAP_DESCRIPTORS.find(
        (provider_descriptor) =>
          provider_descriptor.provider_key === next_provider_key);
      if (next_descriptor === undefined) return;
    } else {
      const requested_provider_key =
        next_provider_key ?? runtime.state.current_raster_provider_key;
      const next_descriptor = runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.find(
        (provider_descriptor) =>
          provider_descriptor.provider_key === requested_provider_key);
      if (next_descriptor === undefined) return;
      next_provider_key = next_descriptor.provider_key;
    }
    const selection_is_unchanged = next_mode === runtime.state.current_tile_mode
      && next_provider_key === (next_mode === TILE_LAYER_MODES.raster
        ? runtime.state.current_raster_provider_key
        : runtime.state.current_vector_provider_key);
    if (selection_is_unchanged) return;
    const selected_descriptor = next_mode === TILE_LAYER_MODES.raster
      ? runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.find((provider_descriptor) =>
        provider_descriptor.provider_key === next_provider_key)
      : null;
    if (next_mode === TILE_LAYER_MODES.raster
      && !runtime.services.install_raster_base_provider(selected_descriptor)) {
      return;
    }
    // Selecting a base supersedes every asynchronous install still in
    // flight; their callbacks check the epoch before touching page state.
    // A vector install advances it when it starts below.
    if (next_mode === TILE_LAYER_MODES.raster) {
      runtime.state.base_selection_epoch += 1;
    }
    runtime.state.current_tile_mode = next_mode;
    if (next_mode === TILE_LAYER_MODES.vector) {
      runtime.state.current_vector_provider_key = next_provider_key;
    }
    if (next_mode === TILE_LAYER_MODES.raster) {
      runtime.state.current_raster_provider_key = next_provider_key;
      runtime.state.raster_retry_background_active = false;
      // Removing the source makes the canvas draw the raster tier again;
      // the frame after this switch has no vector geometry or labels. The
      // 2D fallback has no GPU surface, so the selection only updates the
      // panel's serving state there.
      if (runtime.state.gpu_map_canvas !== null) {
        runtime.state.gpu_map_canvas.clearVectorTileSource();
        applyTileLayerMode(
          { canvas: runtime.state.gpu_map_canvas, mode: TILE_LAYER_MODES.raster });
        runtime.services.apply_raster_base_clear_color();
        runtime.services.reload_raster_tile_source();
      }
      runtime.services.set_overlay_controls_enabled(
        runtime.state.renderer_mode === 'gpu',
        'Scene overlays need the GPU renderer; this browser fell back to the 2D grid.',
      );
      runtime.services.apply_overlays();
      runtime.services.set_base_map_status(null);
    } else {
      applyTileLayerMode({ canvas: runtime.state.gpu_map_canvas, mode: TILE_LAYER_MODES.vector });
      runtime.services.apply_vector_base_clear_color();
      // The scene toggles and a planned route stay in the page's own
      // overlay list; the canvas paints the base beneath them.
      runtime.services.set_overlay_controls_enabled(
        runtime.state.renderer_mode === 'gpu',
        'Scene overlays need the GPU renderer; this browser fell back to the 2D grid.',
      );
      runtime.services.apply_overlays();
      runtime.services.install_vector_base_source();
    }
    if (remember) {
      runtime.services.write_demo_preferences({ baseMap: runtime.services.current_base_map_preference() });
    }
    runtime.services.schedule_render();
    runtime.services.refresh_map_layers_panel();
    runtime.services.refresh_attribution_notice();
  }

  /** The selection the base-map record stores: the raster descriptor in
   * use, or the vector provider and the explicitly picked style id. */
  function current_base_map_preference() {
    if (runtime.state.current_tile_mode === TILE_LAYER_MODES.raster) {
      return {
        mode: TILE_LAYER_MODES.raster,
        rasterProviderKey: runtime.state.current_raster_provider_key,
      };
    }
    return {
      mode: TILE_LAYER_MODES.vector,
      vectorProviderKey: runtime.state.current_vector_provider_key,
      vectorStyleId: runtime.state.current_vector_style_id,
    };
  }

  /**
   * Installs the first-run base when nothing usable is remembered: the
   * recorded raster fixtures where this page serves them, else the keyless
   * vector base. Both selections come from the shared registry's order, so
   * the page names no provider.
   */
  function install_default_base_map() {
    if (runtime.shared.recorded_tile_fixtures_are_served) return;
    const default_vector_descriptor = runtime.services.selected_vector_descriptor();
    if (default_vector_descriptor === null) return;
    runtime.services.switch_tile_mode(
      TILE_LAYER_MODES.vector,
      default_vector_descriptor.provider_key,
      { remember: false },
    );
  }

  /** Restores the remembered base map once the renderer can serve it.
   * An undeclared provider or style is dropped, never guessed. */
  function restore_remembered_base_map() {
    const remembered_base_map = runtime.shared.initial_demo_preferences.baseMap;
    if (remembered_base_map === null) {
      runtime.services.install_default_base_map();
      return;
    }
    if (remembered_base_map.mode === TILE_LAYER_MODES.raster) {
      const raster_provider_key = remembered_base_map.rasterProviderKey
        ?? runtime.state.current_raster_provider_key;
      const raster_descriptor = runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.find(
        (provider_descriptor) =>
          provider_descriptor.provider_key === raster_provider_key);
      if (raster_descriptor === undefined) {
        runtime.services.install_default_base_map();
        return;
      }
      // A remembered provider whose key is not applied (or remembered)
      // cannot serve; the page keeps its keyless default rather than
      // restoring a disabled row or reporting a refusal at startup.
      if (base_row_credential_refusal(
        raster_descriptor,
        runtime.shared.applied_provider_keys,
        { servedFromFixtures:
          raster_descriptor_serves_this_page(runtime, raster_descriptor) },
      ) !== null) {
        runtime.services.install_default_base_map();
        return;
      }
      runtime.services.switch_tile_mode(
        TILE_LAYER_MODES.raster,
        raster_descriptor.provider_key,
        { remember: false },
      );
      return;
    }
    if (remembered_base_map.mode !== TILE_LAYER_MODES.vector) {
      runtime.services.install_default_base_map();
      return;
    }
    const vector_descriptor = runtime.shared.VECTOR_BASE_MAP_DESCRIPTORS.find(
      (provider_descriptor) =>
        provider_descriptor.provider_key
          === remembered_base_map.vectorProviderKey);
    if (vector_descriptor === undefined) {
      runtime.services.install_default_base_map();
      return;
    }
    const style_is_declared = remembered_base_map.vectorStyleId === null
      || (vector_descriptor.vector_styles ?? []).some((style_choice) =>
        style_choice.style_id === remembered_base_map.vectorStyleId);
    runtime.state.current_vector_style_id = style_is_declared
      ? remembered_base_map.vectorStyleId
      : null;
    runtime.services.switch_tile_mode(
      TILE_LAYER_MODES.vector,
      vector_descriptor.provider_key,
      { remember: false },
    );
  }

  /**
   * Keeps the raster selection honest after a credential change: a
   * selected provider whose key just went away can no longer serve, so a
   * keyless base takes over instead of a disabled row staying marked
   * Serving.
   */
  function ensure_raster_selection_is_servable() {
    if (runtime.state.current_tile_mode !== TILE_LAYER_MODES.raster) return;
    const raster_descriptor = runtime.services.selected_raster_descriptor();
    if (raster_descriptor === null) return;
    const refusal_text = base_row_credential_refusal(
      raster_descriptor,
      runtime.shared.applied_provider_keys,
      {
        servedFromFixtures:
          raster_descriptor_serves_this_page(runtime, raster_descriptor),
      },
    );
    if (refusal_text === null) return;
    const fallback_descriptor = runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.find(
      (candidate_descriptor) =>
        base_row_credential_refusal(
          candidate_descriptor,
          runtime.shared.applied_provider_keys,
          {
            servedFromFixtures:
              raster_descriptor_serves_this_page(runtime, candidate_descriptor),
          },
        ) === null);
    if (fallback_descriptor === undefined
      || fallback_descriptor.provider_key === raster_descriptor.provider_key) {
      return;
    }
    runtime.services.switch_tile_mode(
      TILE_LAYER_MODES.raster, fallback_descriptor.provider_key);
  }

  /** Repaints the vector base in the theme that just became active. */
  function refresh_vector_base_for_theme() {
    if (runtime.state.current_tile_mode !== TILE_LAYER_MODES.vector
      || runtime.state.renderer_mode !== 'gpu' || !runtime.state.gpu_map_canvas) {
      return;
    }
    // The theme may have changed which offered style is the default; the
    // source carries the style id, so a reinstall paints the new palette.
    runtime.services.apply_vector_base_clear_color();
    runtime.services.install_vector_base_source();
  }

  /** Shows (or clears) the panel's status line. */
  function set_map_layers_status(status_text) {
    runtime.shared.map_layers_status_element.hidden = status_text === null;
    runtime.shared.map_layers_status_element.textContent = status_text ?? '';
  }

  /** Builds the base rows: one per raster source, one per vector style. */
  function build_map_layers_base_rows() {
    runtime.shared.map_layers_base_rows_element.textContent = '';
    runtime.shared.map_layers_base_row_bindings.clear();
    // The keyless families first (the demo's default base among them),
    // then the credential-gated families, each in registry order.
    const keyless_vector_descriptors = runtime.shared.VECTOR_BASE_MAP_DESCRIPTORS.filter(
      (provider_descriptor) =>
        typeof provider_descriptor.url_template === 'string'
        && provider_descriptor.url_template.trim() !== '');
    const hosted_vector_descriptors = runtime.shared.VECTOR_BASE_MAP_DESCRIPTORS.filter(
      (provider_descriptor) =>
        !keyless_vector_descriptors.includes(provider_descriptor));
    const base_rows = [
      ...runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.map((provider_descriptor) => ({
        row_identifier:
          `${MAP_LAYER_BASE_ROW_IDENTIFIER_PREFIX}${provider_descriptor.provider_key}`,
        label: `${provider_descriptor.display_name} · Raster`,
        mode: TILE_LAYER_MODES.raster,
        provider_descriptor,
        style_id: null,
        // Only a descriptor whose complete committed tile set this page
        // serves backs the demo camera keylessly; a credentialed provider
        // with one recorded sample still needs its key.
        served_from_fixtures:
          raster_descriptor_serves_this_page(runtime, provider_descriptor),
      })),
      ...[...keyless_vector_descriptors, ...hosted_vector_descriptors]
        .flatMap((provider_descriptor) =>
          (provider_descriptor.vector_styles ?? []).map((style_choice) => ({
            row_identifier:
              `${MAP_LAYER_STYLE_ROW_IDENTIFIER_PREFIX}${style_choice.style_id}`,
            // The one provider-row composition every surface renders:
            // the descriptor's display name and the style name, never a
            // bare style name.
            label:
              `${provider_descriptor.display_name} · ${style_choice.display_name}`,
            mode: TILE_LAYER_MODES.vector,
            provider_descriptor,
            style_id: style_choice.style_id,
            served_from_fixtures: false,
          }))),
    ];
    for (const base_row of base_rows) {
      const row_element = document.createElement('button');
      row_element.type = 'button';
      row_element.id = base_row.row_identifier;
      row_element.className = 'map-layers-base-row';
      row_element.dataset.tileMode = base_row.mode;
      if (base_row.provider_descriptor !== null) {
        row_element.dataset.providerKey = base_row.provider_descriptor.provider_key;
      }
      if (base_row.style_id !== null) {
        row_element.dataset.styleId = base_row.style_id;
      }
      const row_label_element = document.createElement('span');
      row_label_element.textContent = base_row.label;
      const row_mark_element = document.createElement('span');
      row_mark_element.className = 'map-layer-row-reason';
      row_element.append(row_label_element, row_mark_element);
      row_element.addEventListener('click', () => {
        if (row_element.disabled) return;
        if (base_row.mode === TILE_LAYER_MODES.raster) {
          runtime.services.switch_tile_mode(
            TILE_LAYER_MODES.raster,
            base_row.provider_descriptor.provider_key,
          );
          return;
        }
        runtime.services.select_map_layers_vector_style(
          base_row.provider_descriptor, base_row.style_id);
      });
      runtime.shared.map_layers_base_row_bindings.set(base_row.row_identifier, {
        row_element,
        row_mark_element,
        base_row,
      });
      runtime.shared.map_layers_base_rows_element.appendChild(row_element);
    }
  }

  /** Selects one committed vector style: the same switch the settings
   * style picker performs, with the style applied to the base. */
  function select_map_layers_vector_style(provider_descriptor, style_id) {
    runtime.state.current_vector_style_id = style_id;
    if (runtime.state.current_tile_mode !== TILE_LAYER_MODES.vector
      || runtime.state.current_vector_provider_key !== provider_descriptor.provider_key) {
      runtime.services.switch_tile_mode(
        TILE_LAYER_MODES.vector, provider_descriptor.provider_key);
      return;
    }
    runtime.services.write_demo_preferences({ baseMap: runtime.services.current_base_map_preference() });
    runtime.services.apply_vector_base_clear_color();
    runtime.services.install_vector_base_source();
    runtime.services.schedule_render();
    runtime.services.refresh_map_layers_panel();
    runtime.services.refresh_attribution_notice();
  }

  /** The identifier of the row whose layer is serving now, or null. */
  function active_base_row_identifier() {
    if (runtime.state.current_tile_mode === TILE_LAYER_MODES.raster) {
      const raster_descriptor = runtime.services.selected_raster_descriptor();
      return raster_descriptor === null
        ? null
        : `${MAP_LAYER_BASE_ROW_IDENTIFIER_PREFIX}${raster_descriptor.provider_key}`;
    }
    const style_id = runtime.services.active_vector_style_id();
    return style_id === null
      ? null
      : `${MAP_LAYER_STYLE_ROW_IDENTIFIER_PREFIX}${style_id}`;
  }

  /** Builds the demo-scene switches from the shared scene artifact. */
  function build_map_layers_scene_rows() {
    runtime.shared.map_layers_scene_rows_element.textContent = '';
    runtime.shared.scene_switch_elements.clear();
    for (const [scene_key] of Object.entries(REFERENCE_SCENE_ARTIFACT.overlay_scenes)) {
      const switch_element = document.createElement('button');
      switch_element.type = 'button';
      switch_element.id = `${MAP_LAYER_SCENE_ROW_IDENTIFIER_PREFIX}${scene_key}`;
      switch_element.className = 'map-layer-switch';
      switch_element.setAttribute('role', 'switch');
      switch_element.setAttribute('aria-checked', 'false');
      const switch_label_element = document.createElement('span');
      switch_label_element.textContent = SACRAMENTO_OVERLAY_SCENE_LABELS[scene_key];
      const switch_mark_element = document.createElement('span');
      switch_mark_element.className = 'map-layer-row-reason';
      switch_element.append(switch_label_element, switch_mark_element);
      // Activating the switch flips the existing checkbox and fires its
      // change event, so both surfaces share one persistence and overlay
      // path. A switch with no matching scene toggle stays inert.
      switch_element.addEventListener('click', () => {
        const checkbox = runtime.shared.overlay_checkboxes[scene_key];
        if (checkbox === undefined) return;
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
      runtime.shared.scene_switch_elements.set(scene_key, switch_element);
      runtime.shared.map_layers_scene_rows_element.appendChild(switch_element);
    }
  }

  /** Marks the serving base row, the traffic switch and the scene switches. */
  function refresh_map_layers_panel() {
    if (!runtime.state.map_layers_panel_ready) return;
    const active_row_identifier = runtime.services.active_base_row_identifier();
    // The vector rows need the GPU renderer; before it answers (or on the
    // 2D path) a click would be a silent no-op, so they are disabled.
    const renderer_is_gpu = window.mapRendererMode?.() === 'gpu';
    for (const [row_identifier, binding] of runtime.shared.map_layers_base_row_bindings) {
      const refusal_text = base_row_credential_refusal(
        binding.base_row.provider_descriptor,
        runtime.shared.applied_provider_keys,
        { servedFromFixtures: binding.base_row.served_from_fixtures },
      );
      const row_needs_gpu =
        binding.base_row.mode === TILE_LAYER_MODES.vector && !renderer_is_gpu;
      const is_active = row_identifier === active_row_identifier;
      binding.row_element.setAttribute('aria-pressed', String(is_active));
      binding.row_element.disabled = refusal_text !== null || row_needs_gpu;
      binding.row_mark_element.textContent = refusal_text
        ?? (is_active ? MAP_LAYERS_SERVING_TEXT : '');
      binding.row_mark_element.className = refusal_text !== null
        ? 'map-layer-row-reason'
        : 'map-layers-serving-mark';
    }
    const availability = traffic_layer_availability(
      runtime.state.providers_registry.providers, runtime.shared.applied_provider_keys);
    if (availability.state !== 'available' && runtime.state.traffic_layer_enabled) {
      runtime.services.set_traffic_layer_enabled(false);
    }
    runtime.shared.traffic_switch_element.disabled = availability.state !== 'available';
    runtime.shared.traffic_switch_element.setAttribute(
      'aria-checked', String(runtime.state.traffic_layer_enabled));
    runtime.shared.traffic_switch_mark_element.textContent = availability.state === 'available'
      ? (runtime.state.traffic_layer_enabled ? 'On' : 'Off')
      : availability.reasonText;
    runtime.shared.traffic_switch_element.title = availability.reasonText ?? '';
    for (const [scene_key, switch_element] of runtime.shared.scene_switch_elements) {
      const is_checked = runtime.shared.overlay_checkboxes[scene_key]?.checked === true;
      switch_element.setAttribute('aria-checked', String(is_checked));
    }
    const enabled_scene_count = runtime.services.checked_overlay_scene_keys().length;
    runtime.shared.map_layers_active_dot.hidden = !is_non_default_layer_active({
      baseMode: runtime.state.current_tile_mode,
      rasterMode: TILE_LAYER_MODES.raster,
      trafficEnabled: runtime.state.traffic_layer_enabled,
      enabledSceneCount: enabled_scene_count,
    });
        runtime.services.refresh_attribution_notice();
  }

  /** Opens or closes the layers panel; Escape returns focus to the button. */
  function set_map_layers_panel_open(is_open) {
    runtime.shared.map_layers_panel.hidden = !is_open;
    runtime.shared.map_layers_control.setAttribute('aria-expanded', String(is_open));
    if (is_open) {
      // The panel precedes the button in the tab order; moving focus to
      // its first usable control keeps the panel keyboard reachable.
      const first_control = runtime.shared.map_layers_panel.querySelector(
        'button:not([disabled]), [role="switch"]:not([disabled])');
      first_control?.focus();
    }
  }

  Object.assign(runtime.services, {
    active_vector_style_id,
    base_map_descriptor_for_route_purpose,
    selected_vector_descriptor,
    selected_raster_descriptor,
    registered_live_raster_descriptor,
    begin_base_selection_epoch,
    reload_raster_tile_source,
    set_base_map_status,
    apply_vector_base_clear_color,
    active_vector_style_attribution,
    style_document_pathname,
    install_vector_base_source,
    refresh_vector_base_status,
    clear_credentialed_raster_provider,
    register_live_raster_fallback_source,
    install_raster_base_provider,
    apply_raster_base_clear_color,
    switch_tile_mode,
    current_base_map_preference,
    install_default_base_map,
    restore_remembered_base_map,
    ensure_raster_selection_is_servable,
    refresh_vector_base_for_theme,
    set_map_layers_status,
    build_map_layers_base_rows,
    select_map_layers_vector_style,
    active_base_row_identifier,
    build_map_layers_scene_rows,
    refresh_map_layers_panel,
    set_map_layers_panel_open,
  });

}

export function installBaseMapPhase1(runtime) {
  // Whether this page serves the registry's live raster fallback: always
  // on a deployed host, and on a local page only with the explicit
  // `?liveTiles` opt-in. Both the startup registration and the fallback's
  // base row read this one decision.
  runtime.shared.live_tiles_enabled =
    !runtime.shared.LOCAL_DEMO_HOSTNAMES.has(window.location.hostname)
    || new URLSearchParams(window.location.search)
      .has(runtime.shared.LIVE_TILES_OPT_IN_PARAMETER);
  // Whether this page answers the recorded raster tile fixtures. The dev
  // server serves them from the repository; a deployed site stages none, so
  // a fixture-backed raster base is demonstrated locally only and the
  // keyless vector base is the first-run base elsewhere. The harness disables
  // them on a local page with `?noRecordedTileFixtures` to exercise the
  // deployed page's capability-off path without leaving the local origin.
  runtime.shared.recorded_tile_fixtures_are_served =
    runtime.shared.LOCAL_DEMO_HOSTNAMES.has(window.location.hostname)
    && !new URLSearchParams(window.location.search)
      .has(runtime.shared.RECORDED_TILE_FIXTURES_DISABLE_PARAMETER);
}

export function installBaseMapPhase2(runtime) {
  // The panel's DOM is built later in this module; a credential restored
  // before then may ask for a refresh, which is a no-op until it is.
  runtime.state.map_layers_panel_ready = false;
}

export function installBaseMapPhase3(runtime) {
  // The layers panel's clear action (the native layers panels' shared
  // control): unchecking every scene switch clears the page's overlay
  // list exactly as untoggling each scene would.
  runtime.shared.map_layers_clear_scenes_control =
    document.getElementById('map-layers-clear-scenes');

  if (runtime.shared.map_layers_clear_scenes_control !== null) {
    runtime.shared.map_layers_clear_scenes_control.addEventListener('click', () => {
      for (const checkbox of Object.values(runtime.shared.overlay_checkboxes)) {
        checkbox.checked = false;
      }
      runtime.services.write_demo_preferences({ overlaySceneKeys: [] });
      runtime.services.apply_overlays();
      runtime.services.schedule_render();
      runtime.services.refresh_map_layers_panel();
    });
  }
}

export function installBaseMapPhase4(runtime) {
  // --- The base-map tile layer switch (M9) -----------------------------
  // The page offers one base layer per provider-declared tile source: the
  // raster provider's imagery (the default) and a vector-tile provider
  // painted as overlay geometry. Provider names and the vector URL shape
  // come from the shared registry; the page names none.
  // The clear color behind each base layer: the raster layer covers the
  // whole surface, so its original dark clear stays; the vector base's
  // fills leave gaps, which take the theme's paper color instead of
  // reading as a black map.
  runtime.shared.VECTOR_BASE_RASTER_CLEAR_COLOR = Object.freeze(
    { red: 0.0, green: 0.0, blue: 0.0, alpha: 1.0 });

  // The vector clear color per theme, used when the active style declares
  // no background of its own.
  runtime.shared.VECTOR_BASE_CLEAR_COLOR_BY_THEME = Object.freeze({
    light: Object.freeze({ red: 0.94, green: 0.93, blue: 0.90, alpha: 1.0 }),
    dark: Object.freeze({ red: 0.063, green: 0.078, blue: 0.098, alpha: 1.0 }),
  });

  // The named styles' own backgrounds, transcribed from the style
  // artifacts (the color each upstream style was designed on):
  // Bright `#f8f4f0`, Fiord `#45516E`, Positron `rgb(242,243,240)`.
  runtime.shared.VECTOR_BASE_CLEAR_COLOR_BY_STYLE = Object.freeze({
    'bright-light': Object.freeze(
      { red: 0.972549, green: 0.956863, blue: 0.941176, alpha: 1.0 }),
    'fiord-dark': Object.freeze(
      { red: 0.270588, green: 0.317647, blue: 0.431373, alpha: 1.0 }),
    'positron-light': Object.freeze(
      { red: 0.949, green: 0.953, blue: 0.941, alpha: 1.0 }),
  });

  // The zoom span the canvas' vector base requests. The lower bound is the
  // web-mercator grid's origin (a camera below it clamps up); the upper
  // bound comes from the descriptor's own declared ceiling.
  runtime.shared.VECTOR_BASE_MINIMUM_ZOOM_LEVEL = 0;

  runtime.shared.VECTOR_BASE_DEFAULT_MAXIMUM_ZOOM_LEVEL = 19;

  // The registry's contract name for a provider's vector tileset.
  runtime.shared.VECTOR_TILES_CAPABILITY_NAME = 'vector_tiles';

  // Every raster base layer the registry declares: a descriptor with a
  // raster-tile fixture route (the demo's recorded imagery) or a live
  // `{z}/{x}/{y}` raster template (the keyless worldwide fallback).
  runtime.shared.RASTER_BASE_MAP_DESCRIPTORS = runtime.state.providers_registry.providers
    .filter((provider_descriptor) =>
      (Array.isArray(provider_descriptor.fixture_routes)
        && provider_descriptor.fixture_routes.some(
          (fixture_route) => fixture_route.purpose === 'raster_tiles'))
      || raster_descriptor_declares_live_source(provider_descriptor));

  // Every vector base layer: a descriptor that declares a tile URL
  // template, or the vector-tile contract with named styles (a provider
  // registry entry, never a page-side URL). A credentialed descriptor's
  // rows wait for that provider's credential.
  runtime.shared.VECTOR_BASE_MAP_DESCRIPTORS = runtime.state.providers_registry.providers
    .filter((provider_descriptor) =>
      (typeof provider_descriptor.url_template === 'string'
        && provider_descriptor.url_template.trim() !== '')
      || ((provider_descriptor.served_contracts ?? []).includes(
        runtime.shared.VECTOR_TILES_CAPABILITY_NAME)
        && (provider_descriptor.vector_styles ?? []).length > 0));

  runtime.state.current_tile_mode = TILE_LAYER_MODES.raster;

  // The raster descriptor the page last selected. The local dev server's
  // keyless default is the first descriptor whose complete committed tile
  // set backs the camera; a page that stages no tile fixtures (the deployed
  // demo) falls back to the first entry, and its first-run base is the
  // keyless vector base.
  runtime.state.current_raster_provider_key =
    (runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.find((provider_descriptor) =>
      raster_descriptor_serves_this_page(runtime, provider_descriptor))
      ?? runtime.shared.RASTER_BASE_MAP_DESCRIPTORS[0])?.provider_key ?? null;

  // Whether the page registered a live URL-template raster source (the
  // deployed fallback or the local `?liveTiles` opt-in), and which
  // descriptor declared it.
  runtime.state.live_raster_fallback_registered = false;

  // The demo's default vector base is the descriptor offering the
  // Bright/Fiord/Positron family (the richest committed styles); a
  // registry with no such family falls back to its first vector entry.
  runtime.state.current_vector_provider_key =
    (runtime.shared.VECTOR_BASE_MAP_DESCRIPTORS.find((provider_descriptor) =>
      (provider_descriptor.vector_styles ?? []).some(
        (style_choice) => style_choice.style_id === 'bright-light',
      )) ?? runtime.shared.VECTOR_BASE_MAP_DESCRIPTORS[0])?.provider_key ?? null;

  // The base map's own status line lives in the layers panel's Base map
  // section (the single home for base selection).
  runtime.shared.base_map_status_element =
    document.getElementById('map-layers-base-status');

  // The style the visitor picked from the active vector descriptor's
  // offered styles, or null for "the one matching the resolved theme".
  runtime.state.current_vector_style_id = null;

  // The base selection's epoch: every switch and every install start
  // advances it, and an asynchronous install's status, error and schedule
  // callbacks land only while their epoch is still current. A superseded
  // install can then never repaint the state of the base that replaced it.
  runtime.state.base_selection_epoch = 0;

  window.mapTileMode = () => runtime.state.current_tile_mode;

  window.mapVectorProviderKey = () => runtime.state.current_vector_provider_key;

  window.mapRasterProviderKey = () => runtime.state.current_raster_provider_key;

  window.mapVectorBaseStatus = () =>
    runtime.shared.base_map_status_element.hidden ? null : runtime.shared.base_map_status_element.textContent;

  // --- The on-map layer control (docs/ReferenceAppUX.md §4.2) ----
  // One round control docked above the attribution notice. Its panel
  // carries the registry's base sources and every committed vector style,
  // the traffic switch, the demo scene switches and the device-location
  // status. Nothing here names a provider: rows are built from the shared
  // descriptors, and the traffic capability is the first descriptor that
  // declares it.
  runtime.shared.map_layers_control = document.getElementById(MAP_LAYERS_CONTROL_IDENTIFIER);

  runtime.shared.map_layers_panel = document.getElementById(MAP_LAYERS_PANEL_IDENTIFIER);

  runtime.shared.map_layers_control.setAttribute('aria-label', MAP_LAYERS_CONTROL_LABEL);

  runtime.shared.map_layers_base_rows_element = document.getElementById('map-layer-base-rows');

  runtime.shared.map_layers_traffic_row_element = document.getElementById('map-layer-traffic-row');

  runtime.shared.map_layers_scene_rows_element = document.getElementById('map-layer-scene-rows');

  runtime.shared.map_layers_status_element = document.getElementById(MAP_LAYERS_STATUS_IDENTIFIER);

  runtime.shared.map_layers_active_dot = runtime.shared.map_layers_control.querySelector(
    `.${MAP_LAYERS_ACTIVE_DOT_CLASS_NAME}`);

  // Each base row's descriptor and selection, keyed by its identifier, so
  // the refresh pass can mark the serving row without rebuilding.
  runtime.shared.map_layers_base_row_bindings = new Map();
}

export function installBaseMapPhase5(runtime) {
  // The scene switch rows mirror the settings toggles and write the same
  // remembered choice through the existing checkbox listeners.
  runtime.shared.scene_switch_elements = new Map();

  runtime.shared.map_layers_control.addEventListener('click', () => {
    runtime.services.set_map_layers_panel_open(runtime.shared.map_layers_panel.hidden);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !runtime.shared.map_layers_panel.hidden) {
      runtime.services.set_map_layers_panel_open(false);
      runtime.shared.map_layers_control.focus();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (runtime.shared.map_layers_panel.hidden) return;
    if (!runtime.shared.map_layers_control.contains(event.target)
      && !runtime.shared.map_layers_panel.contains(event.target)) {
      runtime.services.set_map_layers_panel_open(false);
    }
  }, true);
}

export function installBaseMapPhase6(runtime) {
  // The UX-test host contract: the panel's state and the traffic layer's
  // counters, so the browser suite can assert one install per settle
  // without reading the panel's prose.
  window.mapLayersState = () => ({
    panelOpen: !runtime.shared.map_layers_panel.hidden,
    activeBaseIdentifier: runtime.services.active_base_row_identifier(),
    trafficEnabled: runtime.state.traffic_layer_enabled,
    sceneKeys: runtime.services.checked_overlay_scene_keys(),
  });
}

export function installBaseMapPhase7(runtime) {
  runtime.services.build_map_layers_base_rows();

  runtime.services.build_map_layers_scene_rows();

  runtime.state.map_layers_panel_ready = true;

  runtime.services.refresh_map_layers_panel();
}
