// playground_provider_settings: the provider settings concern of the browser
// playground controller.
//
// Responsibility:
// Provider registration: the credential rows, the capability routing rows, the
// credential apply/clear flow and the provider status copy.
//
// Public exports:
//   defineProviderSettings
//   installProviderSettingsPhase1
//   installProviderSettingsPhase2
//   installProviderSettingsPhase3
//   installProviderSettingsPhase4
//   installProviderSettingsPhase5
//   installProviderSettingsPhase6
//   installProviderSettingsPhase7
//   installProviderSettingsPhase8
//
// Every function reads shared state through the `runtime` object passed to
// `defineProviderSettings` and calls helpers from other concerns through
// `runtime.services`, so this module imports no sibling concern module and
// the concern graph stays acyclic.

import {
  ui_label_text,
  ui_label_text_with_values,
} from './ui_strings.mjs';

export function defineProviderSettings(runtime) {
  /** The canonical applied sentence for one provider descriptor. */
  function provider_applied_status_text(provider_descriptor) {
    return ui_label_text_with_values('settings.credential_applied', {
      provider: provider_descriptor.display_name,
    });
  }

  /** Prefixes a provider failure with the provider's name when the
   * provider's own detail does not already name it, so a notification
   * says which provider answered. */
  function provider_prefixed_failure_text(provider_descriptor, failure_text) {
    const display_name = provider_descriptor?.display_name ?? '';
    const provider_key = provider_descriptor?.provider_key ?? '';
    const lowered = String(failure_text).toLowerCase();
    if (display_name === ''
        || lowered.includes(display_name.toLowerCase())
        || (provider_key !== '' && lowered.includes(provider_key.toLowerCase()))) {
      return String(failure_text);
    }
    return `${display_name}: ${failure_text}`;
  }

  // The provider panels' honest keyless reset: every live result is
  // cleared when the credential is cleared.
  function clear_provider_probe_results() {
    runtime.shared.trip_search_results_element.textContent = '';
    runtime.shared.trip_search_results_element.hidden = true;
    runtime.services.clear_trip_route_card();
    runtime.shared.provider_tile_result.textContent = '';
    runtime.shared.provider_tile_preview.hidden = true;
  }

  // The trip planner's status line: informational unless the message
  // reports a refusal (`warning`) or a confirmed ready state (`success`),
  // so ordinary guidance never dresses itself in the warning color.
  function set_provider_status(text, tone = 'info') {
    runtime.shared.provider_credential_status.textContent = text;
    runtime.shared.provider_credential_status.dataset.tone = tone;
  }

  // The settings sheet's own status line: credential feedback appears
  // where the user acted, not behind the dialog in the trip planner.
  function set_settings_credentials_status(text) {
    runtime.shared.settings_credentials_status.hidden = text === null;
    runtime.shared.settings_credentials_status.textContent = text ?? '';
  }

  function render_provider_credential_rows() {
    runtime.shared.provider_credential_rows.textContent = '';
    runtime.shared.provider_credential_controls_by_key.clear();
    for (const provider_descriptor of runtime.state.providers_registry.providers) {
      // A keyless descriptor (no credential label) renders no settings
      // row, so a provider registered elsewhere never paints an empty row.
      if (typeof provider_descriptor.credential_label !== 'string'
        || provider_descriptor.credential_label.trim() === '') {
        continue;
      }
      const row_element = document.createElement('div');
      row_element.className = 'provider-credential-row';
      row_element.dataset.providerKey = provider_descriptor.provider_key;
      const registration_available =
        provider_descriptor.registration_available?.wasm === true;

      const label_row_element = document.createElement('div');
      label_row_element.className = 'provider-credential-label-row';
      const label_element = document.createElement('label');
      label_element.textContent =
        `${provider_descriptor.display_name} ${provider_descriptor.credential_label}`;
      const applied_chip_element = document.createElement('span');
      applied_chip_element.className = 'provider-applied-chip';
      applied_chip_element.textContent = ui_label_text_with_values(
        'settings.credential_applied',
        { provider: provider_descriptor.display_name },
      );
      applied_chip_element.hidden = true;
      label_row_element.append(label_element, applied_chip_element);

      const field_element = document.createElement('div');
      field_element.className = 'provider-credential-field';
      const input_element = document.createElement('input');
      input_element.id = `provider-credential-input-${provider_descriptor.provider_key}`;
      label_element.htmlFor = input_element.id;
      input_element.type = 'password';
      input_element.autocomplete = 'off';
      input_element.spellcheck = false;
      input_element.placeholder = registration_available
        ? 'Paste the key'
        : 'Not available on this platform';
      input_element.dataset.providerCredentialInput = '';
      input_element.disabled = !registration_available;
      field_element.append(input_element);

      const hint_element = document.createElement('p');
      hint_element.className = 'provider-hint';
      hint_element.textContent = provider_descriptor.settings_hint ?? '';
      hint_element.hidden = hint_element.textContent.trim() === '';

      const apply_element = document.createElement('button');
      apply_element.type = 'button';
      apply_element.className = 'primary';
      apply_element.textContent = 'Apply';
      apply_element.dataset.providerCredentialApply = '';
      apply_element.disabled = !registration_available;
      const clear_element = document.createElement('button');
      clear_element.type = 'button';
      clear_element.textContent = 'Clear';
      clear_element.dataset.providerCredentialClear = '';
      clear_element.disabled = !registration_available;

      const terms_element = document.createElement('p');
      terms_element.className = 'provider-terms-note';
      terms_element.textContent = provider_descriptor.terms_note ?? '';
      const actions_element = document.createElement('div');
      actions_element.className = 'provider-credential-actions';
      actions_element.append(apply_element, clear_element);

      row_element.append(
        label_row_element,
        field_element,
        hint_element,
        actions_element,
        terms_element,
      );
      runtime.shared.provider_credential_rows.appendChild(row_element);
      runtime.shared.provider_credential_controls_by_key.set(provider_descriptor.provider_key, {
        provider_descriptor,
        input_element,
        applied_chip_element,
        apply_element,
        clear_element,
        registration_available,
      });
    }
  }

  // --- Provider capabilities (docs/ReferenceAppUX.md
  // §Provider selection, descriptors and endpoints) ---
  // One row per capability the registry offers on this platform. The row
  // and every picker entry compose "{display name} · {credential state}";
  // no vendor name, key or URL is spelled here, and a keyless routing
  // provider receives its descriptor's `demo_base_url` as the deployment
  // address instead of an empty credential.

  /** Whether a descriptor needs a runtime credential before it can serve. */
  function capability_descriptor_requires_credential(provider_descriptor) {
    return typeof provider_descriptor.credential_label === 'string'
      && provider_descriptor.credential_label.trim() !== '';
  }

  /** The credential state one descriptor renders (never a bare state). */
  function provider_capability_state_text(provider_descriptor) {
    if (runtime.services.capability_descriptor_requires_credential(provider_descriptor)) {
      return runtime.shared.provider_credentials_by_key.has(provider_descriptor.provider_key)
        ? ui_label_text('settings.provider_state_ready')
        : ui_label_text_with_values(
          'settings.provider_state_needs_credential',
          { credential: provider_descriptor.credential_label },
        );
    }
    return typeof provider_descriptor.demo_base_url === 'string'
      && provider_descriptor.demo_base_url.trim() !== ''
      ? ui_label_text('settings.provider_state_ready')
      : ui_label_text('settings.provider_state_not_configured');
  }

  /** The one row composition the serving line and every picker entry use. */
  function provider_capability_row_text(provider_descriptor) {
    return ui_label_text_with_values('settings.provider_row', {
      provider: provider_descriptor.display_name,
      state: runtime.services.provider_capability_state_text(provider_descriptor),
    });
  }

  /** The descriptors that declare one capability and can serve on wasm. */
  function capability_provider_descriptors(capability_key) {
    return runtime.state.providers_registry.providers.filter((provider_descriptor) =>
      Array.isArray(provider_descriptor.served_contracts)
      && provider_descriptor.served_contracts.includes(capability_key)
      && provider_descriptor.registration_available?.wasm === true);
  }

  /** The capabilities this platform can offer a provider picker for. */
  function offered_capability_keys() {
    return Object.keys(runtime.shared.CAPABILITY_CONTRACT_NAMES).filter(
      (capability_key) => runtime.services.capability_provider_descriptors(capability_key).length > 0,
    );
  }

  /** The provider registrations readback, or an empty list before ready. */
  function current_provider_registrations() {
    try {
      return window.mapTest?.providerRegistrations?.() ?? [];
    } catch {
      return [];
    }
  }

  /** The registration row for one capability, or null when unregistered. */
  function provider_registration_for(capability_key) {
    const contract_name = runtime.shared.CAPABILITY_CONTRACT_NAMES[capability_key];
    return Array.from(runtime.services.current_provider_registrations()).find(
      (registration) => registration.contract === contract_name
        && registration.registered,
    ) ?? null;
  }

  /** True when a routing provider serves the plan call. */
  function routing_provider_is_registered() {
    return runtime.services.provider_registration_for(runtime.shared.ROUTING_CAPABILITY_KEY) !== null;
  }

  /** Shows one capability-section status message, or hides it with null. */
  function set_capability_provider_status(text) {
    runtime.shared.capability_provider_status.hidden = text === null;
    runtime.shared.capability_provider_status.textContent = text ?? '';
  }

  /** The verbatim failure detail of a thrown wasm value, without the
   * JavaScript "Error:" decoration the SDK detail never carries. */
  function provider_failure_text(error) {
    return typeof error?.message === 'string' ? error.message : String(error);
  }

  /**
   * Builds the capability rows once from the descriptor registry. A
   * capability with no descriptor available on this platform gets no row.
   */
  function render_capability_provider_rows() {
    runtime.shared.capability_provider_rows.textContent = '';
    const capability_keys = runtime.services.offered_capability_keys();
    runtime.shared.capability_providers_panel.hidden = capability_keys.length === 0;
    for (const capability_key of capability_keys) {
      const row_element = document.createElement('div');
      row_element.className = 'capability-provider-row';
      row_element.id = `capability-provider-row-${capability_key}`;
      row_element.dataset.capability = capability_key;

      const heading_element = document.createElement('div');
      heading_element.className = 'capability-provider-heading';
      const title_element = document.createElement('span');
      title_element.className = 'capability-provider-title';
      title_element.textContent = runtime.shared.CAPABILITY_DISPLAY_NAMES[capability_key]
        ?? capability_key;
      const serving_element = document.createElement('span');
      serving_element.className = 'capability-provider-serving';
      serving_element.id = `capability-provider-serving-${capability_key}`;
      heading_element.append(title_element, serving_element);

      const picker_element = document.createElement('select');
      picker_element.id = `capability-provider-select-${capability_key}`;
      picker_element.className = 'capability-provider-select';
      picker_element.setAttribute(
        'aria-label', `${runtime.shared.CAPABILITY_DISPLAY_NAMES[capability_key] ?? capability_key} provider`);
      const unconfigured_option = document.createElement('option');
      unconfigured_option.value = '';
      unconfigured_option.textContent =
        ui_label_text('settings.provider_state_not_configured');
      picker_element.appendChild(unconfigured_option);
      for (const provider_descriptor of
           runtime.services.capability_provider_descriptors(capability_key)) {
        const option_element = document.createElement('option');
        option_element.value = provider_descriptor.provider_key;
        option_element.id = runtime.shared.CAPABILITY_PROVIDER_CHOICE_IDENTIFIER_PREFIX
          + provider_descriptor.provider_key;
        option_element.dataset.providerKey = provider_descriptor.provider_key;
        option_element.dataset.providerRole =
          runtime.services.capability_descriptor_requires_credential(provider_descriptor)
            ? 'credentialed'
            : 'keyless';
        picker_element.appendChild(option_element);
      }
      picker_element.addEventListener('change', () => {
        const chosen_descriptor = runtime.services.capability_provider_descriptors(capability_key)
          .find((provider_descriptor) =>
            provider_descriptor.provider_key === picker_element.value);
        if (chosen_descriptor === undefined) {
          runtime.services.refresh_capability_provider_rows();
          return;
        }
        runtime.services.select_capability_provider(capability_key, chosen_descriptor);
      });

      const endpoint_element = document.createElement('p');
      endpoint_element.className = 'capability-provider-endpoint';
      endpoint_element.id = `capability-provider-endpoint-${capability_key}`;
      endpoint_element.hidden = true;

      const next_step_element = document.createElement('p');
      next_step_element.className = 'capability-provider-next-step';
      next_step_element.id = `capability-provider-next-step-${capability_key}`;
      next_step_element.hidden = true;

      row_element.append(
        heading_element,
        picker_element,
        endpoint_element,
        next_step_element,
      );
      runtime.shared.capability_provider_rows.appendChild(row_element);
    }
  }

  /**
   * Reflects the serving provider, every picker entry's composed state and
   * the routing row's endpoint/next-step lines. Runs on registration
   * changes only; the rows themselves are built once.
   */
  function refresh_capability_provider_rows() {
    for (const capability_key of runtime.services.offered_capability_keys()) {
      const row_element =
        document.getElementById(`capability-provider-row-${capability_key}`);
      if (row_element === null) continue;
      const serving_element =
        document.getElementById(`capability-provider-serving-${capability_key}`);
      const picker_element =
        document.getElementById(`capability-provider-select-${capability_key}`);
      const endpoint_element =
        document.getElementById(`capability-provider-endpoint-${capability_key}`);
      const next_step_element =
        document.getElementById(`capability-provider-next-step-${capability_key}`);
      const descriptors = runtime.services.capability_provider_descriptors(capability_key);
      const registration = runtime.services.provider_registration_for(capability_key);
      const serving_descriptor = registration === null
        ? null
        : descriptors.find((provider_descriptor) =>
          provider_descriptor.provider_key === registration.providerKey) ?? null;

      serving_element.textContent = serving_descriptor === null
        ? ui_label_text('settings.provider_state_not_configured')
        : runtime.services.provider_capability_row_text(serving_descriptor);
      picker_element.value = serving_descriptor?.provider_key ?? '';
      for (const option_element of picker_element.options) {
        if (option_element.value === '') {
          option_element.textContent =
            ui_label_text('settings.provider_state_not_configured');
          continue;
        }
        const option_descriptor = descriptors.find((provider_descriptor) =>
          provider_descriptor.provider_key === option_element.value);
        if (option_descriptor !== undefined) {
          option_element.textContent = runtime.services.provider_capability_row_text(option_descriptor);
        }
      }

      const demo_base_url = serving_descriptor?.demo_base_url;
      const has_demo_base_url = typeof demo_base_url === 'string'
        && demo_base_url.trim() !== '';
      endpoint_element.hidden = !(
        capability_key === runtime.shared.ROUTING_CAPABILITY_KEY && has_demo_base_url);
      endpoint_element.textContent = has_demo_base_url
        ? ui_label_text_with_values(
          'settings.routing_demo_endpoint', { url: demo_base_url })
        : '';

      const failure_text = runtime.shared.capability_failure_text_by_key.get(capability_key);
      next_step_element.hidden = failure_text === undefined;
      next_step_element.textContent = failure_text === undefined
        ? ''
        : `${failure_text} ${ui_label_text('settings.routing_unreachable_next_step')}`;
    }
        runtime.services.refresh_attribution_notice();
  }

  /**
   * Configures one capability from a chosen descriptor. A credentialed
   * provider needs this session's key; a keyless routing provider receives
   * its descriptor's demo address as the deployment address. Any refusal
   * crosses verbatim, the previous provider keeps serving and nothing
   * falls back. A user selection is remembered in the versioned record; a
   * startup restore passes `remember: false` and stays quiet.
   */
  function select_capability_provider(capability_key, provider_descriptor,
    { remember = true, announce = true } = {}) {
    const credential_value = runtime.services.capability_descriptor_requires_credential(
      provider_descriptor)
      ? runtime.shared.provider_credentials_by_key.get(provider_descriptor.provider_key)
      : provider_descriptor.demo_base_url;
    if (runtime.services.capability_descriptor_requires_credential(provider_descriptor)
      && credential_value === undefined) {
      if (announce) {
        runtime.services.set_capability_provider_status(
          ui_label_text_with_values('settings.provider_state_needs_credential', {
            credential: provider_descriptor.credential_label,
          }),
        );
      }
      runtime.services.refresh_capability_provider_rows();
      return false;
    }
    if (!runtime.services.capability_descriptor_requires_credential(provider_descriptor)
      && (typeof credential_value !== 'string'
        || credential_value.trim() === '')) {
      if (announce) {
        runtime.services.set_capability_provider_status(
          'The descriptor declares no demo address, so there is nothing to select.',
        );
      }
      runtime.services.refresh_capability_provider_rows();
      return false;
    }
    try {
      if (runtime.shared.use_provider_fixtures) {
        // The harness override is a test seam only: the same-origin
        // fixture routes stand in for the deployment the descriptor names.
        window.mapTest.setProviderBaseUrl(
          provider_descriptor.wasm_registration ?? provider_descriptor.provider_key,
          `${window.location.origin}${runtime.state.providers_registry.fixture_base_path}`
            + `/${provider_descriptor.provider_key}`,
        );
      }
      window.mapTest.configureProvider(
        runtime.shared.CAPABILITY_CONTRACT_NAMES[capability_key],
        provider_descriptor.provider_key,
        credential_value,
      );
      runtime.shared.capability_failure_text_by_key.delete(capability_key);
      if (announce) {
        runtime.services.set_capability_provider_status(
          runtime.services.provider_capability_row_text(provider_descriptor));
      }
      runtime.services.clear_error_report();
      // The raster capability is also a base-map selection: a settings
      // choice installs that provider's row and the panel follows it, and
      // any raster registration change reloads the pooled tiles.
      if (capability_key === runtime.shared.RASTER_TILES_CAPABILITY_KEY
        && runtime.shared.RASTER_BASE_MAP_DESCRIPTORS.some((candidate_descriptor) =>
          candidate_descriptor.provider_key === provider_descriptor.provider_key)) {
        runtime.state.current_raster_provider_key = provider_descriptor.provider_key;
        runtime.services.refresh_map_layers_panel();
        runtime.services.refresh_attribution_notice();
      }
      runtime.services.reload_raster_tile_source();
      if (remember) {
        runtime.services.write_demo_preferences({
          capabilityProviders: {
            ...runtime.state.demo_preferences.capabilityProviders,
            [capability_key]: provider_descriptor.provider_key,
          },
        });
      }
    } catch (error) {
      const failure_text = runtime.services.provider_prefixed_failure_text(
        provider_descriptor, runtime.services.provider_failure_text(error));
      runtime.shared.capability_failure_text_by_key.set(capability_key, failure_text);
      if (announce) {
        runtime.services.set_capability_provider_status(failure_text);
      }
      runtime.services.show_error_report('Provider selection', failure_text);
      runtime.services.refresh_capability_provider_rows();
      return false;
    }
    runtime.services.refresh_capability_provider_rows();
    return true;
  }

  /**
   * Re-applies the remembered per-capability choices once the SDK can
   * accept them. A descriptor the registry no longer offers is skipped,
   * never guessed, so the row keeps stating what actually serves.
   */
  function restore_remembered_capability_providers() {
    const remembered_choices =
      runtime.shared.initial_demo_preferences.capabilityProviders ?? {};
    for (const capability_key of runtime.services.offered_capability_keys()) {
      const provider_key = remembered_choices[capability_key];
      if (typeof provider_key !== 'string') continue;
      const provider_descriptor = runtime.services.capability_provider_descriptors(
        capability_key).find((candidate_descriptor) =>
        candidate_descriptor.provider_key === provider_key);
      if (provider_descriptor === undefined) continue;
      runtime.services.select_capability_provider(capability_key, provider_descriptor, {
        remember: false,
        announce: false,
      });
    }
  }

  /** Reflects the keyless/applied state on the trip card and the gear. */
  function refresh_credential_state() {
    const has_applied_key = runtime.shared.applied_provider_keys.size > 0;
    runtime.shared.trip_credential_action.dataset.state =
      has_applied_key ? 'applied' : 'keyless';
    runtime.shared.trip_credential_action.querySelector('.credential-action-label').textContent =
      has_applied_key ? 'Key applied — Manage' : 'Add a provider key';
    runtime.shared.trip_credential_action.setAttribute(
      'aria-label',
      has_applied_key ? 'Key applied — manage provider keys' : 'Add a provider key',
    );
    runtime.shared.settings_control.classList.toggle('needs-attention', !has_applied_key);
    runtime.shared.settings_control.setAttribute(
      'aria-label', ui_label_text('settings.open_accessibility'));
    for (const [provider_key, provider_control] of
         runtime.shared.provider_credential_controls_by_key) {
      provider_control.applied_chip_element.hidden =
        !runtime.shared.applied_provider_keys.has(provider_key);
    }
  }

  /** Applies one credential through the wasm registration seam. */
  async function apply_provider_credential(provider_control, credential_value,
    { persist = false } = {}) {
    if (runtime.shared.use_provider_fixtures) {
      // The harness serves the provider's recorded routes same-origin; the
      // base URL override is keyed by the registry's wasm dispatch key.
      window.mapTest.setProviderBaseUrl(
        provider_control.provider_descriptor.wasm_registration
          ?? provider_control.provider_descriptor.provider_key,
        `${window.location.origin}${runtime.state.providers_registry.fixture_base_path}`
          + `/${provider_control.provider_descriptor.provider_key}`,
      );
    }
    const { provider_descriptor } = provider_control;
    // One credential fills every capability the descriptor declares, each
    // through the provider-keyed call, so the row's own key decides which
    // provider is registered instead of a fixed convenience export.
    const served_contract_keys = Array.isArray(provider_descriptor.served_contracts)
      ? provider_descriptor.served_contracts : [];
    // The raster base is the base-map selection's to install: applying a
    // key registers the raster capability only when its provider is the
    // selected raster base, so a credential can never move the slot to a
    // provider the panel is not marking Serving.
    const raster_is_selected_base =
      provider_descriptor.provider_key === runtime.state.current_raster_provider_key;
    const served_contract_names = served_contract_keys
      .filter((contract_key) => contract_key !== runtime.shared.RASTER_TILES_CAPABILITY_KEY
        || raster_is_selected_base)
      .map((contract_key) => runtime.shared.CAPABILITY_CONTRACT_NAMES[contract_key])
      .filter((contract_name) => contract_name !== undefined);
    if (!served_contract_keys.some(
      (contract_key) => runtime.shared.CAPABILITY_CONTRACT_NAMES[contract_key] !== undefined)) {
      throw new Error(
        `${provider_descriptor.display_name} declares no capability this build can register.`,
      );
    }
    for (const contract_name of served_contract_names) {
      window.mapTest.configureProvider(
        contract_name,
        provider_descriptor.provider_key,
        credential_value,
      );
    }
    runtime.shared.provider_credentials_by_key.set(
      provider_descriptor.provider_key, credential_value);
    runtime.shared.applied_provider_keys.add(provider_control.provider_descriptor.provider_key);
    // A registration that changed the serving sources drops the pooled
    // raster state so no payload from the previous source survives it.
    runtime.services.reload_raster_tile_source();
    if (persist) {
      runtime.services.write_local_storage(
        runtime.shared.PROVIDER_CREDENTIAL_STORAGE_PREFIX
          + provider_control.provider_descriptor.provider_key,
        credential_value,
      );
    }
  }

  Object.assign(runtime.services, {
    provider_applied_status_text,
    provider_prefixed_failure_text,
    clear_provider_probe_results,
    set_provider_status,
    set_settings_credentials_status,
    render_provider_credential_rows,
    capability_descriptor_requires_credential,
    provider_capability_state_text,
    provider_capability_row_text,
    capability_provider_descriptors,
    offered_capability_keys,
    current_provider_registrations,
    provider_registration_for,
    routing_provider_is_registered,
    set_capability_provider_status,
    provider_failure_text,
    render_capability_provider_rows,
    refresh_capability_provider_rows,
    select_capability_provider,
    restore_remembered_capability_providers,
    refresh_credential_state,
    apply_provider_credential,
  });

}

export function installProviderSettingsPhase1(runtime) {
  runtime.shared.trip_credential_action = document.getElementById('trip-credential-action');

  runtime.shared.remember_provider_credential =
    document.getElementById('remember-provider-credential');
}

export function installProviderSettingsPhase2(runtime) {
  // Provider credentials (M13/M15): the shared registry the dev server
  // serves describes every provider row, credential label and attribution
  // line. The panel renders those descriptors, so adding a provider never
  // edits this page. A runtime key registers the live provider set on the
  // wasm seam and never persists or logs the value.
  // Relative so the same page works at the site root and under the docs
  // site's /demo/ path (the registry is served beside the page there).
  runtime.shared.PROVIDERS_REGISTRY_URL = 'providers.json';

  // The harness seam: `?useProviderFixtures` points registration at the
  // registry's same-origin fixture routes, so the browser suite drives the
  // panel with no external network. Without it the panel registers the
  // provider's real platform URL.
  runtime.shared.use_provider_fixtures = new URLSearchParams(window.location.search)
    .has('useProviderFixtures');

  runtime.state.providers_registry = { fixture_base_path: '/providers', providers: [] };
}

export function installProviderSettingsPhase3(runtime) {
  runtime.shared.registered_provider_descriptors = runtime.state.providers_registry.providers
    .filter((provider_descriptor) =>
      provider_descriptor.wasm_registration != null
      || typeof provider_descriptor.url_template === 'string'
      || typeof provider_descriptor.raster_url_template === 'string');

  // The descriptors' terms notes join the panel (deduplicated like the
  // attribution lines); the panel is the compliance text's home, so no
  // always-visible line is needed on the map.
  runtime.shared.descriptor_terms_notes = runtime.shared.registered_provider_descriptors
    .map((provider_descriptor) => provider_descriptor.terms_note)
    .filter((terms_note) => typeof terms_note === 'string'
      && terms_note.trim() !== '');

  for (const terms_note of Array.from(new Set(runtime.shared.descriptor_terms_notes))) {
    const terms_note_element = document.createElement('p');
    terms_note_element.className = 'attribution-terms-note';
    terms_note_element.textContent = terms_note;
    runtime.shared.attribution_panel.appendChild(terms_note_element);
  }
}

export function installProviderSettingsPhase4(runtime) {
  runtime.shared.provider_credential_rows = document.getElementById('provider-credential-rows');

  runtime.shared.provider_credential_status = document.getElementById('provider-credential-status');

  runtime.shared.settings_credentials_status =
    document.getElementById('settings-credentials-status');
}

export function installProviderSettingsPhase5(runtime) {
  // The provider-capability settings section: one row per capability the
  // registry offers on this platform, composed from the descriptors.
  runtime.shared.capability_providers_panel =
    document.getElementById('capability-providers-panel');

  runtime.shared.capability_provider_rows =
    document.getElementById('capability-provider-controls');

  runtime.shared.capability_provider_status = document.getElementById('capability-provider-status');
}

export function installProviderSettingsPhase6(runtime) {
  // The live-tile probe's address: the Sacramento tile at the playground's
  // zoom-14 camera, served by the same fixture route.
  runtime.shared.PROVIDER_TILE_DEMO_ZOOM_LEVEL = 14;

  runtime.shared.PROVIDER_TILE_DEMO_TILE_X = 2661;

  runtime.shared.PROVIDER_TILE_DEMO_TILE_Y = 6286;
}

export function installProviderSettingsPhase7(runtime) {
  // The credential rows by provider key; declared here so the persistence
  // toggle's listener (below) can clear remembered keys.
  runtime.shared.provider_credential_controls_by_key = new Map();

  // The session's applied credential values by provider key: the capability
  // surface passes a credentialed provider's key to `configureProvider`, and
  // the value never leaves this module's memory unless the visitor chose to
  // remember it.
  runtime.shared.provider_credentials_by_key = new Map();

  // The capabilities a settings row can offer, in the contract's stable
  // order, with the registry's snake-case served-contract spelling and the
  // contract readback's camel-case spelling.
  runtime.shared.CAPABILITY_CONTRACT_NAMES = Object.freeze({
    geocoding: 'Geocoding',
    routing: 'Routing',
    distance_matrix: 'DistanceMatrix',
    place_search: 'PlaceSearch',
    traffic_incidents: 'TrafficIncidents',
    traffic_flow: 'TrafficFlow',
    elevation: 'Elevation',
    raster_tiles: 'RasterTiles',
    vector_tiles: 'VectorTiles',
    offline_routing: 'OfflineRouting',
  });

  // The capability title each row shows. These are capability names, never
  // provider names or raw contract spellings.
  runtime.shared.CAPABILITY_DISPLAY_NAMES = Object.freeze({
    geocoding: 'Geocoding',
    routing: 'Routing',
    distance_matrix: 'Distance matrix',
    place_search: 'Place search',
    traffic_incidents: 'Traffic incidents',
    traffic_flow: 'Traffic flow',
    elevation: 'Elevation',
    raster_tiles: 'Raster tiles',
  });

  // The routing row's id suffix, shared by its endpoint and next-step lines.
  runtime.shared.ROUTING_CAPABILITY_KEY = 'routing';

  // The registry spelling of the raster-tile capability, shared by the
  // settings picker and the base-map selection.
  runtime.shared.RASTER_TILES_CAPABILITY_KEY = 'raster_tiles';

  // The registry spelling of the traffic-flow capability, used to name the
  // provider serving the traffic cache.
  runtime.shared.TRAFFIC_FLOW_CAPABILITY_KEY = 'traffic_flow';

  // The stable picker-entry id shape the shared flow schema names, for
  // example `#capability-provider-choice-osrm`: one real option per
  // registry descriptor, keyed by its provider key (no vendor branch).
  runtime.shared.CAPABILITY_PROVIDER_CHOICE_IDENTIFIER_PREFIX = 'capability-provider-choice-';

  // The failures the routing row names, keyed by capability: a failed
  // selection and an unreachable route plan both point the visitor at the
  // retry-or-own-deployment next step.
  runtime.shared.capability_failure_text_by_key = new Map();

  runtime.shared.provider_keyless_status_text = ui_label_text('settings.keyless_status');

  // Persistence is an explicit opt-in (docs/ReferenceAppUX.md §6.5): the
  // key stays in memory unless the visitor ticks "Remember keys on this
  // device". The browser has no secure store, so a remembered key lives
  // in this origin's localStorage — never in git, a build or the artifact.
  runtime.shared.PROVIDER_CREDENTIAL_STORAGE_PREFIX = 'rusticMapsSdk.providerCredential.';

  runtime.shared.PROVIDER_CREDENTIAL_PERSISTENCE_STORAGE_KEY =
    'rusticMapsSdk.rememberProviderCredentials';

  runtime.shared.PROVIDER_CREDENTIAL_REMEMBERED_VALUE = 'true';
}

export function installProviderSettingsPhase8(runtime) {
  runtime.state.remember_provider_credentials =
    runtime.services.read_local_storage(runtime.shared.PROVIDER_CREDENTIAL_PERSISTENCE_STORAGE_KEY)
      === runtime.shared.PROVIDER_CREDENTIAL_REMEMBERED_VALUE;

  runtime.shared.remember_provider_credential.checked = runtime.state.remember_provider_credentials;

  runtime.shared.remember_provider_credential.addEventListener('change', () => {
    runtime.state.remember_provider_credentials = runtime.shared.remember_provider_credential.checked;
    runtime.services.write_local_storage(
      runtime.shared.PROVIDER_CREDENTIAL_PERSISTENCE_STORAGE_KEY,
      runtime.state.remember_provider_credentials ? runtime.shared.PROVIDER_CREDENTIAL_REMEMBERED_VALUE : null,
    );
    if (!runtime.state.remember_provider_credentials) {
      for (const provider_key of runtime.shared.provider_credential_controls_by_key.keys()) {
        runtime.services.write_local_storage(runtime.shared.PROVIDER_CREDENTIAL_STORAGE_PREFIX + provider_key, null);
      }
    }
  });

  // Renders one credential row per registry descriptor: display name,
  // credential label, masked input, Apply/Clear, terms note. A provider
  // the wasm build reports unavailable renders disabled with its reason.
  // The provider keys applied in this session: the trip planner uses live
  // search/routing only when at least one registration succeeded.
  runtime.shared.applied_provider_keys = new Set();

  runtime.services.render_provider_credential_rows();

  runtime.services.render_capability_provider_rows();

  runtime.services.refresh_credential_state();
}
