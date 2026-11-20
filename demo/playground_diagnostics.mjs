// playground_diagnostics: the diagnostics concern of the browser
// playground controller.
//
// Responsibility:
// Diagnostics and harness seams: the error report, the diagnostics facts and
// event stream, the frame performance readout, the reference-flow automation
// entry, and the provider console.
//
// Public exports:
//   defineDiagnostics
//   installDiagnosticsPhase1
//   installDiagnosticsPhase2
//   installDiagnosticsPhase3
//   installDiagnosticsPhase4
//   installDiagnosticsPhase5
//   installDiagnosticsPhase6
//   installDiagnosticsPhase7
//   installDiagnosticsPhase8
//
// Every function reads shared state through the `runtime` object passed to
// `defineDiagnostics` and calls helpers from other concerns through
// `runtime.services`, so this module imports no sibling concern module and
// the concern graph stays acyclic.

import {
  DIAGNOSTICS_BACKLOG_FLUSH_LIMIT,
  DIAGNOSTICS_DEBUG_SEVERITY_NAME,
  DIAGNOSTICS_EVENT_WINDOW,
  DIAGNOSTICS_MINIMUM_SEVERITY_NAME,
  DIAGNOSTICS_REFRESH_CADENCE_MILLISECONDS,
} from './map_controls.mjs';
import {
  ui_label_text,
} from './ui_strings.mjs';

export function defineDiagnostics(runtime) {
  // Provider-echoing error report (docs/ReferenceAppUX.md §6.3): the origin
  // label names the failing surface, the detail is echoed verbatim, never
  // paraphrased or swallowed. Declared at module scope because both the
  // provider-capability section and the trip planner report through it.
  function show_error_report(origin_label, detail_text) {
    runtime.shared.error_report_element.hidden = false;
    runtime.shared.error_report_element.textContent = `${origin_label}: ${detail_text}`;
  }

  function clear_error_report() {
    runtime.shared.error_report_element.hidden = true;
    runtime.shared.error_report_element.textContent = '';
  }

  // The serving traffic-flow cache's counters, or null while no traffic
  // provider is registered (the readback's own nullable contract). A
  // session without the traffic layer reports that absence, never a
  // fabricated zero.
  function read_traffic_flow_cache_statistics() {
    try {
      return window.mapTest?.trafficFlowCacheStatistics?.() ?? null;
    } catch {
      return null;
    }
  }

  /**
   * The performance summary the diagnostics readout and the warning strip
   * share: the rolling render time, the observed frame rate while the page
   * is animating, the slow verdict and its named cause.
   */
  function performance_summary() {
    const steady_state_samples = runtime.shared.frame_performance_samples.slice(
      runtime.shared.PERFORMANCE_WARMUP_FRAMES);
    if (steady_state_samples.length < runtime.shared.PERFORMANCE_MINIMUM_SAMPLES_FOR_VERDICT) {
      return {
        status: 'warming',
        sampleCount: steady_state_samples.length,
        medianRenderMilliseconds: null,
        framesPerSecond: null,
        isSlow: false,
        causeText: null,
      };
    }
    const render_milliseconds = steady_state_samples
      .map((sample) => sample.renderMilliseconds)
      .sort((first, second) => first - second);
    const median_render_milliseconds =
      render_milliseconds[Math.floor(render_milliseconds.length / 2)];
    const first_sample = steady_state_samples[0];
    const last_sample = steady_state_samples[steady_state_samples.length - 1];
    const window_milliseconds = last_sample.atMilliseconds - first_sample.atMilliseconds;
    const frames_per_second = window_milliseconds > 0
      ? ((steady_state_samples.length - 1) * 1000) / window_milliseconds
      : null;
    const is_actively_animating =
      steady_state_samples.length >= runtime.shared.ACTIVE_ANIMATION_MINIMUM_FRAMES &&
      window_milliseconds <= runtime.shared.ACTIVE_ANIMATION_WINDOW_MILLISECONDS;
    const is_render_over_budget =
      median_render_milliseconds > runtime.shared.SLOW_FRAME_MILLISECONDS;
    const is_frame_rate_under_budget =
      is_actively_animating && frames_per_second !== null &&
      frames_per_second < runtime.shared.SLOW_FRAMES_PER_SECOND;
    const is_slow = is_render_over_budget || is_frame_rate_under_budget;
    let cause_text = null;
    if (is_slow) {
      if (last_sample.missingTiles > 0) {
        cause_text = `${last_sample.missingTiles} tiles are still loading; ` +
          'the demo repaints until they arrive, so waiting is cheaper than interacting.';
      } else if (runtime.state.renderer_mode !== 'gpu') {
        cause_text = 'WebGPU is unavailable, so the 2D fallback redraws whole frames; ' +
          'use a Chromium-based browser or Safari 26 for GPU frames.';
      } else if (is_render_over_budget) {
        cause_text = `the GPU frame's median is ${median_render_milliseconds.toFixed(1)} ms ` +
          `(budget ${runtime.shared.SLOW_FRAME_MILLISECONDS} ms); lower the pitch or zoom, or close other GPU tabs.`;
      } else {
        cause_text = `frames arrive at ${frames_per_second.toFixed(0)} fps ` +
          `(target ${runtime.shared.SLOW_FRAMES_PER_SECOND} fps); the device or tab is throttled.`;
      }
    }
    return {
      status: is_slow ? 'slow' : 'ok',
      sampleCount: steady_state_samples.length,
      medianRenderMilliseconds: runtime.services.number_or_null(median_render_milliseconds),
      framesPerSecond: runtime.services.number_or_null(frames_per_second),
      isSlow: is_slow,
      causeText: cause_text,
    };
  }

  /** A finite number, or null when the sample is missing or not finite. */
  function number_or_null(value) {
    return value === null || !Number.isFinite(value) ? null : value;
  }

  /** Records one completed GPU frame; keeps the rolling window bounded. */
  function record_frame_performance(frame_statistics, render_milliseconds) {
    runtime.shared.frame_performance_samples.push({
      atMilliseconds: performance.now(),
      renderMilliseconds: render_milliseconds,
      drawnTiles: frame_statistics?.drawnTiles ?? 0,
      missingTiles: frame_statistics?.missingTiles ?? 0,
      // Whether the vector base drew this frame in motion-graded mode
      // (M38). The frame-budget report states how much of the measured
      // pan ran graded instead of leaving it to inference.
      motionGraded: frame_statistics?.motionGraded ?? false,
      // The wasm frame's own stage spans (M23): the frame-budget harness
      // attributes a slow frame to geometry, encoding or submission from
      // these instead of inferring it from the total.
      stageMilliseconds: frame_statistics?.stageMilliseconds ?? null,
      // The GPU pass time the frame statistics report from timestamp
      // queries. It describes the previous frame's pass (the readback is
      // lagged one frame) and is null when the adapter cannot measure it.
      gpuPassMilliseconds: frame_statistics?.gpuPassMilliseconds ?? null,
    });
    if (runtime.shared.frame_performance_samples.length > runtime.shared.PERFORMANCE_SAMPLE_WINDOW_FRAMES) {
      runtime.shared.frame_performance_samples.shift();
    }
  }

  /** Renders the warning strip and publishes the readout the tests read. */
  function refresh_performance_readout() {
    if (runtime.state.performance_strip_element === null) {
      runtime.state.performance_strip_element = document.getElementById('performance-strip');
    }
    const summary = runtime.services.performance_summary();
    if (runtime.state.performance_strip_element !== null) {
      runtime.state.performance_strip_element.hidden = summary.causeText === null;
      runtime.state.performance_strip_element.textContent = summary.causeText ?? '';
    }
  }

  function diagnostics_facts_text() {
    const frame_statistics_lines = runtime.state.last_frame_statistics
      ? `tiles drawn ${runtime.state.last_frame_statistics.drawnTiles} / ` +
        `missing ${runtime.state.last_frame_statistics.missingTiles} / ` +
        `fragments ${runtime.state.last_frame_statistics.drawnFragments}`
      : 'tiles no GPU frame settled yet';
    // The traffic cache's counters sit beside the tile facts the frame
    // reports; a session with no traffic provider states the absence
    // instead of showing counters that do not exist.
    const traffic_cache_statistics = runtime.services.read_traffic_flow_cache_statistics();
    const traffic_cache_lines = traffic_cache_statistics === null
      ? 'traffic cache unavailable — no traffic provider is registered'
      : `traffic cache hits ${traffic_cache_statistics.hitCount} / ` +
        `misses ${traffic_cache_statistics.missCount} / ` +
        `held cells ${traffic_cache_statistics.entryCount} / ` +
        `evictions ${traffic_cache_statistics.evictionCount} / ` +
        `grid zoom z${traffic_cache_statistics.gridZoomLevel} / ` +
        `entry budget ${traffic_cache_statistics.maximumEntryCount} / ` +
        `time to live ${traffic_cache_statistics.timeToLiveSeconds} s`;
    const performance_summary_lines = (() => {
      const summary = runtime.services.performance_summary();
      if (summary.status === 'warming') {
        return 'performance warming up — a verdict needs a few GPU frames';
      }
      const render_text = summary.medianRenderMilliseconds === null
        ? 'render n/a'
        : `render median ${summary.medianRenderMilliseconds.toFixed(1)} ms`;
      const rate_text = summary.framesPerSecond === null
        ? 'rate n/a'
        : `${summary.framesPerSecond.toFixed(0)} fps`;
      return `performance ${summary.status} — ${render_text} / ${rate_text} ` +
        `(${summary.sampleCount} frames sampled)`;
    })();
    const pose = runtime.services.camera_pose();
    return [
      `version ${runtime.state.compiled_version_value ?? 'unknown'}`,
      `mode ${runtime.state.renderer_mode} — ${runtime.state.renderer_detail}`,
      `center ${pose.latitude.toFixed(5)}, ${pose.longitude.toFixed(5)}` +
        ` zoom ${pose.zoom.toFixed(1)}` +
        ` bearing ${pose.bearing.toFixed(0)}° pitch ${pose.pitch.toFixed(0)}°`,
      frame_statistics_lines,
      traffic_cache_lines,
      performance_summary_lines,
      `frames drawn ${runtime.state.frame_draw_count} (settled pump re-rendered ${runtime.state.settled_pump_rerender_count})`,
    ].join('\n');
  }

  /** The severity the pane flushes at: Info by default, Debug on request. */
  function diagnostics_display_severity_value() {
    const severity_name = runtime.state.diagnostics_debug_enabled
      ? DIAGNOSTICS_DEBUG_SEVERITY_NAME
      : DIAGNOSTICS_MINIMUM_SEVERITY_NAME;
    return window.mapTest.SdkLogSeverity[severity_name];
  }

  /** Re-reads the bounded ring and renders the pane's window. */
  function refresh_diagnostics_event_lines(
    maximum_count = DIAGNOSTICS_EVENT_WINDOW) {
    if (!runtime.state.diagnostics_subscribed) return;
    const flushed_events = Array.from(
      window.mapTest.flushRecentDiagnosticEvents(
        runtime.services.diagnostics_display_severity_value(), maximum_count),
    ).filter((event_line) => runtime.state.diagnostics_cleared_at_milliseconds === null
      || event_line.timestampMillisecondsSinceEpoch
        > runtime.state.diagnostics_cleared_at_milliseconds);
    runtime.state.diagnostics_displayed_event_count = flushed_events.length;
    runtime.shared.diagnostics_event_lines.textContent = flushed_events.length === 0
      ? ui_label_text('diagnostics.no_events')
      : flushed_events
        .map((event_line) =>
          `${event_line.severity} ${event_line.subsystemTarget}: ${event_line.messageLine}`)
        .join('\n');
  }

  /** Starts the one bounded stream the first time the pane opens. */
  function open_diagnostics_stream() {
    if (typeof window.mapTest?.subscribeToDiagnosticEvents !== 'function') return;
    if (!runtime.state.diagnostics_subscribed) {
      window.mapTest.subscribeToDiagnosticEvents(
        window.mapTest.SdkLogSeverity[DIAGNOSTICS_MINIMUM_SEVERITY_NAME]);
      runtime.state.diagnostics_subscribed = true;
    }
    if (runtime.state.diagnostics_refresh_interval === null) {
      runtime.state.diagnostics_refresh_interval = setInterval(
        runtime.services.refresh_diagnostics_event_lines,
        DIAGNOSTICS_REFRESH_CADENCE_MILLISECONDS,
      );
    }
    // The open flush is the pane's documented backlog: its own shared
    // limit, then the steady-state window on the refresh cadence.
    runtime.services.refresh_diagnostics_event_lines(DIAGNOSTICS_BACKLOG_FLUSH_LIMIT);
  }

  /** Stops the refresh cadence while the pane stays closed. */
  function close_diagnostics_stream() {
    if (runtime.state.diagnostics_refresh_interval === null) return;
    clearInterval(runtime.state.diagnostics_refresh_interval);
    runtime.state.diagnostics_refresh_interval = null;
  }

  /** Applies the explicit debug switch; the SDK gate never raises back. */
  function set_diagnostics_debug_enabled(is_enabled) {
    runtime.state.diagnostics_debug_enabled = is_enabled;
    runtime.shared.diagnostics_debug_events_control.checked = is_enabled;
    runtime.shared.diagnostics_debug_events_label.textContent = is_enabled
      ? ui_label_text('diagnostics.hide_debug_events')
      : ui_label_text('diagnostics.show_debug_events');
    if (is_enabled && typeof window.mapTest?.subscribeToDiagnosticEvents === 'function') {
      window.mapTest.subscribeToDiagnosticEvents(
        window.mapTest.SdkLogSeverity[DIAGNOSTICS_DEBUG_SEVERITY_NAME]);
    }
    runtime.services.refresh_diagnostics_event_lines();
  }

  /** Waits for one flow predicate, rejecting with a named timeout. */
  function wait_for_reference_flow(predicate, description) {
    return new Promise((resolve, reject) => {
      const deadline_milliseconds = Date.now()
        + runtime.shared.REFERENCE_FLOW_WAIT_TIMEOUT_MILLISECONDS;
      const poll = () => {
        if (predicate()) {
          resolve();
          return;
        }
        if (Date.now() >= deadline_milliseconds) {
          reject(new Error(`reference flow timed out waiting for ${description}`));
          return;
        }
        setTimeout(poll, 50);
      };
      poll();
    });
  }

  /** Fills one route field and runs its own Search action. */
  async function reference_flow_search_field(field_key, value) {
    const input_element = document.getElementById(
      runtime.shared.REFERENCE_FLOW_FIELD_INPUT_IDS[field_key] ?? '');
    const search_element = document.getElementById(
      runtime.shared.REFERENCE_FLOW_FIELD_SEARCH_IDS[field_key] ?? '');
    if (input_element === null || search_element === null) {
      throw new Error(`reference flow has no ${field_key} field`);
    }
    input_element.value = value;
    input_element.dispatchEvent(new Event('input', { bubbles: true }));
    search_element.click();
    await runtime.services.wait_for_reference_flow(
      () => !document.getElementById('trip-search-results').hidden,
      `${field_key} search results`,
    );
  }

  /** Chooses one provider option through the capability picker. */
  function reference_flow_select_provider(action) {
    const capability_key = action.capability ?? runtime.shared.ROUTING_CAPABILITY_KEY;
    const select_element = document.getElementById(
      `capability-provider-select-${capability_key}`);
    if (select_element === null) {
      throw new Error(`reference flow has no ${capability_key} provider picker`);
    }
    const options = Array.from(select_element.options).filter(
      (option_element) => option_element.value !== '');
    const chosen_option = options.find((option_element) =>
      (typeof action.provider_key === 'string'
        && option_element.value === action.provider_key)
      || (typeof action.provider === 'string'
        && option_element.textContent.includes(action.provider))
      || (action.provider_role === 'keyless'
        && option_element.dataset.providerRole === 'keyless'))
      ?? options[0];
    if (chosen_option === undefined) {
      throw new Error(`reference flow found no selectable ${capability_key} provider`);
    }
    select_element.value = chosen_option.value;
    select_element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Runs one flow step through the public page controls. */
  async function perform_reference_flow_action(action, step) {
    const web_hook_selector = step?.hooks?.web?.value;
    const action_kind = action?.kind ?? action?.type ?? 'tap';
    switch (action_kind) {
      case 'launch':
        return;
      case 'type':
      case 'type_and_search':
      case 'search': {
        const field_key = action.field ?? 'destination';
        await runtime.services.reference_flow_search_field(field_key, action.value ?? '');
        return;
      }
      case 'open_search': {
        const field_input = document.getElementById(
          runtime.shared.REFERENCE_FLOW_FIELD_INPUT_IDS[action.field ?? 'destination'] ?? '');
        field_input?.focus();
        return;
      }
      case 'assign_result':
      case 'assign': {
        const field_key = action.field ?? 'destination';
        await runtime.services.reference_flow_search_field(field_key, action.value ?? '');
        const result_buttons = Array.from(
          document.querySelectorAll('#trip-search-results button'));
        const matching_button = result_buttons.find((result_button) =>
          result_button.textContent.includes(action.value ?? ''))
          ?? result_buttons[0];
        if (matching_button === undefined) {
          throw new Error(`reference flow found no ${field_key} result to assign`);
        }
        matching_button.click();
        return;
      }
      case 'fill_my_location':
      case 'my_location':
      case 'my_location_requested': {
        const field_key = action.field ?? 'origin';
        const chip_element = document.getElementById(
          runtime.shared.REFERENCE_FLOW_FIELD_CHIP_IDS[field_key] ?? '');
        if (chip_element === null) {
          throw new Error(`reference flow has no ${field_key} my-location chip`);
        }
        chip_element.click();
        await runtime.services.wait_for_reference_flow(
          () => (document.getElementById(
            runtime.shared.REFERENCE_FLOW_FIELD_INPUT_IDS[field_key])?.value ?? '') !== '',
          `${field_key} my-location fill`,
        );
        return;
      }
      case 'swap':
      case 'swap_requested': {
        document.getElementById('trip-swap-control')?.click();
        return;
      }
      case 'open_settings': {
        const settings_dialog_element = document.getElementById('settings-dialog');
        if (!settings_dialog_element.open) {
          document.getElementById('settings-control')?.click();
        }
        await runtime.services.wait_for_reference_flow(
          () => settings_dialog_element.open, 'settings dialog');
        return;
      }
      case 'close_settings': {
        const settings_dialog_element = document.getElementById('settings-dialog');
        if (settings_dialog_element.open) settings_dialog_element.close();
        return;
      }
      case 'select_provider':
      case 'provider_selected': {
        runtime.services.reference_flow_select_provider(action);
        return;
      }
      case 'open_diagnostics': {
        const advanced_panel_element = document.getElementById('advanced-panel');
        if (!advanced_panel_element.open) {
          advanced_panel_element.open = true;
          // The `toggle` event is the pane's opt-in door; dispatch it so the
          // runner reaches the same handler a visitor's tap does.
          advanced_panel_element.dispatchEvent(new Event('toggle'));
        }
        return;
      }
      case 'toggle_debug_events':
      case 'debug_detail_toggled': {
        const debug_control_element =
          document.getElementById('diagnostics-debug-toggle');
        debug_control_element.checked = true;
        debug_control_element.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      case 'clear_diagnostics':
      case 'clear': {
        document.getElementById('diagnostics-clear-control')?.click();
        return;
      }
      case 'refresh_diagnostics': {
        document.getElementById('diagnostics-refresh-control')?.click();
        return;
      }
      case 'plan_route': {
        document.getElementById('trip-plan-route-control')?.click();
        await runtime.services.wait_for_reference_flow(
          () => !runtime.shared.trip_route_result.hidden, 'the planned route card');
        return;
      }
      case 'wait_for_state': {
        if (action.target === 'diagnostics') {
          await runtime.services.wait_for_reference_flow(
            () => window.mapDiagnosticsState?.().subscribed === true,
            'the diagnostics stream');
          return;
        }
        // The plan-search state is the fields' own state; the step only
        // asserts no route was planned.
        await runtime.services.wait_for_reference_flow(
          () => runtime.shared.trip_route_result.hidden, 'the unplanned plan-search state');
        return;
      }
      case 'verify': {
        // A verify step asserts a rendered row; the row is already in the
        // DOM, so the step waits one task for the renderer to settle.
        await new Promise((resolve) => { setTimeout(resolve, 0); });
        return;
      }
      case 'tap':
      default: {
        const target_selector =
          runtime.shared.REFERENCE_FLOW_TARGET_SELECTORS[action?.target] ?? web_hook_selector;
        if (action?.target === 'diagnostics_door'
          || target_selector === '#diagnostics-controls') {
          // The pane's door is the Advanced disclosure; opening it is the
          // diagnostics opt-in.
          const advanced_panel_element = document.getElementById('advanced-panel');
          if (!advanced_panel_element.open) {
            advanced_panel_element.open = true;
            advanced_panel_element.dispatchEvent(new Event('toggle'));
          }
          return;
        }
        if (target_selector === '#diagnostics-debug-toggle') {
          // The debug switch is a state control, so a flow step enables
          // the detail whether or not it was already on.
          const debug_toggle_element =
            document.getElementById('diagnostics-debug-toggle');
          debug_toggle_element.checked = true;
          debug_toggle_element.dispatchEvent(
            new Event('change', { bubbles: true }));
          return;
        }
        const target_element = target_selector === undefined
          ? null
          : document.querySelector(target_selector);
        if (target_element === null) {
          if (action?.value !== undefined) {
            await runtime.services.reference_flow_search_field(
              action.field ?? 'destination', action.value);
            return;
          }
          throw new Error(
            `reference flow cannot perform "${action_kind}" without a target`);
        }
        target_element.click();
        if (target_selector === '#trip-plan-route-control'
          || action?.target === 'plan_route_action') {
          await runtime.services.wait_for_reference_flow(
            () => !runtime.shared.trip_route_result.hidden, 'the planned route card');
        } else if (target_selector === '#follow-demo-start-control'
          || action?.target === 'route_start_action') {
          await runtime.services.wait_for_reference_flow(
            () => window.mapFollowDemoState?.().phase === 'engaged',
            'the simulated trip');
        }
        return;
      }
    }
  }

  /** The served flow schema, or null when the artifact is not present. */
  async function read_reference_flow_schema() {
    // The published demo sits under /demo/ beside the site's shared
    // artifacts; the local harness serves the artifact at the web root.
    const schema_url = window.location.pathname.includes('/demo/')
      ? '../reference-flows.json'
      : 'reference-flows.json';
    try {
      const response = await fetch(schema_url, { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  /**
   * Runs one named reference flow through the same user-path controls a
   * visitor uses and returns a small execution report. A flow the schema
   * and the fallback both lack is refused by name.
   */
  async function run_reference_flow(flow_id) {
    if (window.mapTestReady !== undefined) {
      await window.mapTestReady;
    }
    const schema = await runtime.services.read_reference_flow_schema();
    const schema_flow = schema?.flows?.find(
      (flow_definition) => flow_definition.flow_id === flow_id) ?? null;
    const fallback_steps = runtime.shared.REFERENCE_FLOW_FALLBACK_STEPS[flow_id];
    if (schema_flow === null && fallback_steps === undefined) {
      throw new Error(`unknown reference flow: ${flow_id}`);
    }
    const steps = schema_flow?.steps ?? fallback_steps;
    for (const step of steps) {
      await runtime.services.perform_reference_flow_action(step.action ?? step, step);
      if (runtime.shared.REFERENCE_FLOW_STEP_INTERVAL_MILLISECONDS > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, runtime.shared.REFERENCE_FLOW_STEP_INTERVAL_MILLISECONDS);
        });
      }
    }
    return {
      flowId: flow_id,
      source: schema_flow === null ? 'fallback' : 'schema',
      stepCount: steps.length,
    };
  }

  function provider_console_display_name(provider_key) {
    const descriptor = runtime.state.providers_registry.providers.find(
      (candidate) => candidate.provider_key === provider_key);
    return descriptor?.display_name ?? provider_key;
  }

  /** Reads the ring at one severity, oldest first, or an empty list while
   * the SDK surface has not started. */
  function provider_console_read_events(minimum_severity_name) {
    try {
      return Array.from(window.mapTest.flushRecentDiagnosticEvents(
        window.mapTest.SdkLogSeverity[minimum_severity_name],
        runtime.shared.PROVIDER_CONSOLE_FLUSH_LIMIT,
      ));
    } catch {
      return [];
    }
  }

  /** The select's minimum severity rank. */
  function provider_console_level_minimum_rank() {
    const minimum_severity_name =
      runtime.shared.PROVIDER_CONSOLE_LEVEL_MINIMUM_SEVERITY_NAMES[
        runtime.shared.provider_console_level_filter?.value] ?? 'Info';
    return runtime.shared.PROVIDER_CONSOLE_SEVERITY_RANKS[minimum_severity_name]
      ?? runtime.shared.PROVIDER_CONSOLE_SEVERITY_RANKS.Info;
  }

  /** Whether the event's severity clears the level filter and, for a
   * provider request, the provider and outcome filters. */
  function provider_console_event_is_visible(event) {
    const severity_rank = runtime.shared.PROVIDER_CONSOLE_SEVERITY_RANKS[event.severity]
      ?? runtime.shared.PROVIDER_CONSOLE_UNKNOWN_SEVERITY_RANK;
    if (severity_rank < runtime.services.provider_console_level_minimum_rank()) {
      return false;
    }
    const provider_filter = runtime.shared.provider_console_provider_filter.value;
    const outcome_filter = runtime.shared.provider_console_outcome_filter.value;
    if (provider_filter === '' && outcome_filter === '') {
      return true;
    }
    const request = event.providerRequest;
    if (request === null || request === undefined) {
      return false;
    }
    return (provider_filter === '' || request.providerKey === provider_filter)
      && (outcome_filter === '' || request.outcome === outcome_filter);
  }

  /** The visible events, newest first, bounded to the panel's window. */
  function provider_console_events() {
    return runtime.services.provider_console_read_events('Info')
      .filter((event) => runtime.services.provider_console_event_is_visible(event))
      .slice(-runtime.shared.PROVIDER_CONSOLE_MAXIMUM_ROWS)
      .reverse();
  }

  /** The request facts as one row line, display name first. */
  function provider_console_request_text(request) {
    const duration_text = Number.isFinite(request.durationMilliseconds)
      ? ` · ${Math.round(request.durationMilliseconds)} ms`
      : '';
    return `${runtime.services.provider_console_display_name(request.providerKey)}`
      + ` · ${request.providerContract}`
      + ` · ${request.httpMethod} ${request.requestPath}`
      + ` · ${request.statusClass}${duration_text}`;
  }

  /** One row line: the severity, then the request facts when the event is
   * a provider observation, otherwise the scrubbed event line. */
  function provider_console_event_text(event) {
    const request = event.providerRequest;
    const description = request === null || request === undefined
      ? `${event.subsystemTarget} · ${event.messageLine}`
      : runtime.services.provider_console_request_text(request);
    return `${event.severity} · ${description}`;
  }

  /** A stable identity for one event, occurrence included, so identical
   * lines in one millisecond count as separate rows and alerts. */
  function provider_console_event_signatures(events) {
    const occurrence_counts = new Map();
    return events.map((event) => {
      const base_signature = [
        event.timestampMillisecondsSinceEpoch,
        event.severity,
        event.subsystemTarget,
        event.messageLine,
        event.providerRequest?.providerKey ?? '',
        event.providerRequest?.statusClass ?? '',
        event.providerRequest?.responseExcerpt ?? '',
      ].join('\u0000');
      const occurrence = occurrence_counts.get(base_signature) ?? 0;
      occurrence_counts.set(base_signature, occurrence + 1);
      return `${base_signature}\u0000${occurrence}`;
    });
  }

  /** The tile pipeline's counters from the session's last settled frame,
   * with the vector base's payload-cache counters when one serves. */
  function provider_console_tile_cache_text() {
    if (runtime.state.last_frame_statistics === null) {
      return 'No GPU frame settled yet.';
    }
    const counter_texts = [
      `requested ${runtime.state.last_frame_statistics.requestedTiles}`,
      `drawn ${runtime.state.last_frame_statistics.drawnTiles}`,
      `missing ${runtime.state.last_frame_statistics.missingTiles}`,
    ];
    // A configured vector base reports its payload cache's cumulative
    // hits and misses on the source status; a raster base has no such
    // readback in this browser. The status omits both fields when no
    // source is configured, so a non-finite value means no line.
    let vector_source_status = null;
    try {
      vector_source_status =
        runtime.state.gpu_map_canvas?.vectorTileSourceStatus() ?? null;
    } catch {
      vector_source_status = null;
    }
    const payload_cache_hit_count =
      vector_source_status?.payloadCacheHitCount;
    const payload_cache_miss_count =
      vector_source_status?.payloadCacheMissCount;
    if (vector_source_status?.isConfigured === true
      && Number.isFinite(payload_cache_hit_count)
      && Number.isFinite(payload_cache_miss_count)) {
      counter_texts.push(
        `payload cache hits ${payload_cache_hit_count}`,
        `payload cache misses ${payload_cache_miss_count}`,
      );
    }
    return counter_texts.join(' · ');
  }

  /** The traffic cache's counters, prefixed by the serving provider's
   * registry display name, or the honest absence while none is registered. */
  function provider_console_traffic_cache_text() {
    const statistics = runtime.services.read_traffic_flow_cache_statistics();
    if (statistics === null) {
      return 'Unavailable — no traffic provider is registered.';
    }
    const serving_registration =
      runtime.services.provider_registration_for(runtime.shared.TRAFFIC_FLOW_CAPABILITY_KEY);
    const provider_prefix = serving_registration === null
      ? ''
      : `${serving_registration.displayName} · `;
    return provider_prefix
      + `hits ${statistics.hitCount}`
      + ` · misses ${statistics.missCount}`
      + ` · held cells ${statistics.entryCount}`
      + ` · evictions ${statistics.evictionCount}`
      + ` · grid zoom z${statistics.gridZoomLevel}`
      + ` · entry budget ${statistics.maximumEntryCount}`
      + ` · time to live ${statistics.timeToLiveSeconds} s`;
  }

  /** The tile cache's hit and miss facts for the detail view. A configured
   * vector base reports its payload cache's cumulative hits and misses; a
   * raster base has no such readback, so the frame's own requested, drawn
   * and missing counts stand in and the absence is named. */
  function provider_console_tile_cache_detail_text() {
    let vector_source_status = null;
    try {
      vector_source_status =
        runtime.state.gpu_map_canvas?.vectorTileSourceStatus() ?? null;
    } catch {
      vector_source_status = null;
    }
    const payload_cache_hit_count =
      vector_source_status?.payloadCacheHitCount;
    const payload_cache_miss_count =
      vector_source_status?.payloadCacheMissCount;
    if (vector_source_status?.isConfigured === true
      && Number.isFinite(payload_cache_hit_count)
      && Number.isFinite(payload_cache_miss_count)) {
      return `hits ${payload_cache_hit_count} · misses ${payload_cache_miss_count}`;
    }
    if (runtime.state.last_frame_statistics !== null) {
      return 'no cache hit/miss readback for the raster base;'
        + ` requested ${runtime.state.last_frame_statistics.requestedTiles}`
        + ` · drawn ${runtime.state.last_frame_statistics.drawnTiles}`
        + ` · missing ${runtime.state.last_frame_statistics.missingTiles}`;
    }
    return 'No GPU frame settled yet.';
  }

  /** The honest empty message: filters, no registration, or no events. */
  function provider_console_empty_text(visible_events) {
    const filtered = runtime.shared.provider_console_level_filter?.value !== 'info'
      || runtime.shared.provider_console_provider_filter.value !== ''
      || runtime.shared.provider_console_outcome_filter.value !== '';
    if (filtered) {
      return 'No events match the selected filters.';
    }
    if (!runtime.services.provider_console_has_registered_provider()) {
      return 'No provider is registered. Add one in Settings, then search'
        + ' for a place, plan a route or load a tile.';
    }
    return 'No provider request yet. Search for a place, plan a route or'
      + ' load a tile to see one.';
  }

  /** Whether the SDK currently serves any provider. */
  function provider_console_has_registered_provider() {
    try {
      const registrations = window.mapTest?.providerRegistrations?.() ?? [];
      return Array.from(registrations).some(
        (registration) => registration.registered === true);
    } catch {
      return false;
    }
  }

  /** Renders one event row, a button so the detail view is reachable from
   * the keyboard as well. */
  function provider_console_create_row(event) {
    const row = document.createElement('li');
    row.dataset.severity = event.severity;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'provider-console-row-button';
    button.textContent = runtime.services.provider_console_event_text(event);
    button.addEventListener('click', () => {
      runtime.services.provider_console_open_detail(event);
    });
    row.append(button);
    const request = event.providerRequest;
    if (request?.responseExcerpt) {
      row.className = 'provider-console-row-with-excerpt';
      const excerpt = document.createElement('span');
      excerpt.className = 'provider-console-excerpt';
      excerpt.textContent = request.responseExcerpt;
      row.append(excerpt);
    }
    return row;
  }

  function refresh_provider_console() {
    if (runtime.shared.provider_console_panel === null || runtime.shared.provider_console_panel.hidden) {
      return;
    }
    runtime.services.populate_provider_console_providers();
    // The cache counters are session facts, refreshed with the rows and
    // read-only over the same SDK readbacks.
    runtime.shared.provider_console_tile_cache_counters.textContent =
      runtime.services.provider_console_tile_cache_text();
    runtime.shared.provider_console_traffic_cache_counters.textContent =
      runtime.services.provider_console_traffic_cache_text();
    runtime.shared.provider_console_registration_note.hidden =
      runtime.services.provider_console_has_registered_provider();
    const events = runtime.services.provider_console_events();
    // The timer refresh must not rebuild identical rows: a visitor may be
    // selecting a row's text while the next tick arrives.
    const row_signature = runtime.services.provider_console_event_signatures(events).join('\n');
    if (row_signature !== runtime.state.provider_console_last_rows) {
      runtime.state.provider_console_last_rows = row_signature;
      runtime.shared.provider_console_rows_element.replaceChildren(
        ...events.map((event) => runtime.services.provider_console_create_row(event)));
    }
    runtime.shared.provider_console_empty.hidden = events.length > 0;
    if (events.length === 0) {
      runtime.shared.provider_console_empty.textContent =
        runtime.services.provider_console_empty_text(events);
    }
    if (runtime.shared.provider_console_detail !== null && !runtime.shared.provider_console_detail.hidden) {
      runtime.services.render_provider_console_detail();
    }
  }

  /** Shows one event's typed trace and its live cache readbacks. */
  function provider_console_open_detail(event) {
    runtime.state.provider_console_selected_event = event;
    runtime.shared.provider_console_list_view.hidden = true;
    runtime.shared.provider_console_detail.hidden = false;
    runtime.services.render_provider_console_detail();
  }

  function provider_console_close_detail() {
    runtime.state.provider_console_selected_event = null;
    runtime.shared.provider_console_detail.hidden = true;
    runtime.shared.provider_console_list_view.hidden = false;
    runtime.services.refresh_provider_console();
  }

  /** The detail fields read the event's structured trace. The message line
   * is shown as the event's own text, never parsed for a provider fact. */
  function render_provider_console_detail() {
    const event = runtime.state.provider_console_selected_event;
    if (event === null
      || runtime.shared.provider_console_detail === null
      || runtime.shared.provider_console_detail.hidden) {
      return;
    }
    runtime.shared.provider_console_detail_severity.textContent = event.severity;
    runtime.shared.provider_console_detail_target.textContent = event.subsystemTarget;
    runtime.shared.provider_console_detail_message.textContent = event.messageLine;
    const request = event.providerRequest;
    const has_request = request !== null && request !== undefined;
    runtime.shared.provider_console_detail_provider_fields.hidden = !has_request;
    if (has_request) {
      runtime.shared.provider_console_detail_provider.textContent =
        runtime.services.provider_console_display_name(request.providerKey);
      runtime.shared.provider_console_detail_provider_key.textContent = request.providerKey;
      runtime.shared.provider_console_detail_contract.textContent = request.providerContract;
      runtime.shared.provider_console_detail_method.textContent = request.httpMethod;
      runtime.shared.provider_console_detail_path.textContent = request.requestPath;
      runtime.shared.provider_console_detail_status.textContent = request.statusClass;
      runtime.shared.provider_console_detail_duration.textContent =
        `${Math.round(request.durationMilliseconds)} ms`;
      runtime.shared.provider_console_detail_outcome.textContent = request.outcome;
      runtime.shared.provider_console_detail_bytes.textContent = `${request.responseBytes}`;
      const excerpt = request.responseExcerpt;
      const has_excerpt = typeof excerpt === 'string' && excerpt.length > 0;
      runtime.shared.provider_console_detail_excerpt_label.hidden = !has_excerpt;
      runtime.shared.provider_console_detail_excerpt.hidden = !has_excerpt;
      runtime.shared.provider_console_detail_excerpt.textContent = has_excerpt ? excerpt : '';
    }
    runtime.shared.provider_console_detail_tile_cache.textContent =
      runtime.services.provider_console_tile_cache_detail_text();
    runtime.shared.provider_console_detail_traffic_cache.textContent =
      runtime.services.provider_console_traffic_cache_text();
  }

  /** Marks every warning/error event currently in the ring as reported. */
  function provider_console_baseline_alerts() {
    const events = runtime.services.provider_console_read_events(
      runtime.shared.PROVIDER_CONSOLE_LEVEL_MINIMUM_SEVERITY_NAMES.warning);
    for (const signature of runtime.services.provider_console_event_signatures(events)) {
      runtime.shared.provider_console_seen_alert_signatures.add(signature);
    }
    if (runtime.shared.provider_console_seen_alert_signatures.size
      > runtime.shared.PROVIDER_CONSOLE_ALERT_SIGNATURE_LIMIT) {
      runtime.shared.provider_console_seen_alert_signatures.clear();
      for (const signature of runtime.services.provider_console_event_signatures(events)) {
        runtime.shared.provider_console_seen_alert_signatures.add(signature);
      }
    }
  }

  /** Polls the warning/error stream while the panel is closed and lights
   * the dot for a newly arrived one. The dot takes the most severe new
   * event's color. */
  function poll_provider_console_alerts() {
    if (runtime.shared.provider_console_alert_dot === null || runtime.shared.provider_console_panel === null) {
      return;
    }
    const events = runtime.services.provider_console_read_events(
      runtime.shared.PROVIDER_CONSOLE_LEVEL_MINIMUM_SEVERITY_NAMES.warning);
    const signatures = runtime.services.provider_console_event_signatures(events);
    let newest_severity_rank = -1;
    let newest_severity = null;
    events.forEach((event, event_index) => {
      const signature = signatures[event_index];
      if (runtime.shared.provider_console_seen_alert_signatures.has(signature)) {
        return;
      }
      runtime.shared.provider_console_seen_alert_signatures.add(signature);
      const severity_rank = runtime.shared.PROVIDER_CONSOLE_SEVERITY_RANKS[event.severity]
        ?? runtime.shared.PROVIDER_CONSOLE_UNKNOWN_SEVERITY_RANK;
      if (severity_rank >= newest_severity_rank) {
        newest_severity_rank = severity_rank;
        newest_severity = event.severity;
      }
    });
    if (!runtime.shared.provider_console_panel.hidden) {
      runtime.shared.provider_console_alert_dot.hidden = true;
      return;
    }
    if (newest_severity !== null) {
      runtime.shared.provider_console_alert_dot.hidden = false;
      runtime.shared.provider_console_alert_dot.dataset.severity = newest_severity;
    }
  }

  function populate_provider_console_providers() {
    const descriptors = runtime.state.providers_registry.providers.filter(
      (descriptor) => descriptor.registration_available?.wasm === true,
    );
    const all_option = runtime.shared.provider_console_provider_filter.options[0];
    if (descriptors.length === 0
        || runtime.shared.provider_console_provider_filter.options.length - 1
          === descriptors.length) {
      return;
    }
    runtime.shared.provider_console_provider_filter.replaceChildren(
      all_option,
      ...descriptors.map((descriptor) => {
        const option = document.createElement('option');
        option.value = descriptor.provider_key;
        option.textContent = descriptor.display_name;
        return option;
      }),
    );
  }

  /** One exported stream row: the common envelope plus the typed provider
   * facts when the event carried them. The stream is already scrubbed, so
   * no credential or token value is added here or anywhere else. */
  function provider_console_export_record(event) {
    const request = event.providerRequest;
    const record = {
      // The ring reports the u64 epoch as a BigInt; the export is JSON, and
      // the value is well inside Number's exact integer range.
      timestampMillisecondsSinceEpoch: Number(
        event.timestampMillisecondsSinceEpoch),
      severity: event.severity,
      subsystemTarget: event.subsystemTarget,
      messageLine: event.messageLine,
      providerRequest: request ?? null,
    };
    if (request !== null && request !== undefined) {
      Object.assign(record, request);
    }
    return record;
  }

  /** Returns `text` with the applied credential values and the
   * credential-bearing assignments replaced by the redaction placeholder. */
  function provider_console_credential_free_text(text) {
    let scrubbed_text = String(text);
    for (const credential_value of runtime.shared.provider_credentials_by_key.values()) {
      if (typeof credential_value !== 'string'
          || credential_value.trim() === '') {
        continue;
      }
      scrubbed_text = scrubbed_text
        .split(credential_value)
        .join(runtime.shared.PROVIDER_CONSOLE_REDACTION_PLACEHOLDER);
    }
    return scrubbed_text
      .replace(
        runtime.shared.PROVIDER_CONSOLE_AUTHORIZATION_HEADER_PATTERN,
        `$1${runtime.shared.PROVIDER_CONSOLE_REDACTION_PLACEHOLDER}`)
      .replace(
        runtime.shared.PROVIDER_CONSOLE_BEARER_TOKEN_PATTERN,
        `$1${runtime.shared.PROVIDER_CONSOLE_REDACTION_PLACEHOLDER}`)
      .replace(
        runtime.shared.PROVIDER_CONSOLE_JSON_MEMBER_PATTERN,
        `$1${runtime.shared.PROVIDER_CONSOLE_REDACTION_PLACEHOLDER}$2`)
      .replace(
        runtime.shared.PROVIDER_CONSOLE_QUERY_PARAMETER_PATTERN,
        `$1${runtime.shared.PROVIDER_CONSOLE_REDACTION_PLACEHOLDER}`)
      .replace(
        runtime.shared.PROVIDER_CONSOLE_ASSIGNMENT_PATTERN,
        `$1${runtime.shared.PROVIDER_CONSOLE_REDACTION_PLACEHOLDER}`);
  }

  /** Scrubs every string inside one exported record, so the JSON stays
   * valid while no field can carry a credential out. */
  function provider_console_credential_free_record(record) {
    if (typeof record === 'string') {
      return runtime.services.provider_console_credential_free_text(record);
    }
    if (Array.isArray(record)) {
      return record.map(runtime.services.provider_console_credential_free_record);
    }
    if (record !== null && typeof record === 'object') {
      const scrubbed_record = {};
      for (const [member_name, member_value] of Object.entries(record)) {
        scrubbed_record[member_name] =
          runtime.services.provider_console_credential_free_record(member_value);
      }
      return scrubbed_record;
    }
    return record;
  }

  function set_provider_console_open(is_open) {
    if (runtime.shared.provider_console_panel === null) {
      return;
    }
    runtime.shared.provider_console_panel.hidden = !is_open;
    runtime.shared.provider_console_control.setAttribute('aria-expanded', String(is_open));
    if (is_open) {
      // Opening the panel is the Info opt-in, so a request issued after
      // this point is recorded for the stream.
      window.mapTest?.subscribeToDiagnosticEvents?.(
        window.mapTest.SdkLogSeverity.Info);
      runtime.shared.provider_console_alert_dot.hidden = true;
      runtime.services.provider_console_baseline_alerts();
      runtime.state.provider_console_selected_event = null;
      runtime.shared.provider_console_detail.hidden = true;
      runtime.shared.provider_console_list_view.hidden = false;
      runtime.services.populate_provider_console_providers();
      runtime.services.refresh_provider_console();
      if (runtime.state.provider_console_refresh_timer === null) {
        runtime.state.provider_console_refresh_timer = setInterval(
          runtime.services.refresh_provider_console,
          runtime.shared.PROVIDER_CONSOLE_REFRESH_MILLISECONDS,
        );
      }
    } else {
      // A warning that arrived while the panel was open is already read;
      // closing does not re-flag it.
      runtime.services.provider_console_baseline_alerts();
      runtime.state.provider_console_selected_event = null;
      runtime.shared.provider_console_detail.hidden = true;
      runtime.shared.provider_console_list_view.hidden = false;
      if (runtime.state.provider_console_refresh_timer !== null) {
        clearInterval(runtime.state.provider_console_refresh_timer);
        runtime.state.provider_console_refresh_timer = null;
      }
    }
  }

  Object.assign(runtime.services, {
    show_error_report,
    clear_error_report,
    read_traffic_flow_cache_statistics,
    performance_summary,
    number_or_null,
    record_frame_performance,
    refresh_performance_readout,
    diagnostics_facts_text,
    diagnostics_display_severity_value,
    refresh_diagnostics_event_lines,
    open_diagnostics_stream,
    close_diagnostics_stream,
    set_diagnostics_debug_enabled,
    wait_for_reference_flow,
    reference_flow_search_field,
    reference_flow_select_provider,
    perform_reference_flow_action,
    read_reference_flow_schema,
    run_reference_flow,
    provider_console_display_name,
    provider_console_read_events,
    provider_console_level_minimum_rank,
    provider_console_event_is_visible,
    provider_console_events,
    provider_console_request_text,
    provider_console_event_text,
    provider_console_event_signatures,
    provider_console_tile_cache_text,
    provider_console_traffic_cache_text,
    provider_console_tile_cache_detail_text,
    provider_console_empty_text,
    provider_console_has_registered_provider,
    provider_console_create_row,
    refresh_provider_console,
    provider_console_open_detail,
    provider_console_close_detail,
    render_provider_console_detail,
    provider_console_baseline_alerts,
    poll_provider_console_alerts,
    populate_provider_console_providers,
    provider_console_export_record,
    provider_console_credential_free_text,
    provider_console_credential_free_record,
    set_provider_console_open,
  });

}

export function installDiagnosticsPhase1(runtime) {
  // --- Round-11 page constants ---
  // The settled pump (§5.3's frame-settled discipline on the on-demand
  // render loop): a frame that finishes with missing tiles re-renders at
  // a fixed cadence while the budget lasts — unavailable fixtures never
  // settle, so the retries stay bounded and the count is published as a
  // frame fact.
  runtime.shared.SETTLED_PUMP_MAXIMUM_RETRY_RENDERS = 12;

  runtime.shared.SETTLED_PUMP_RETRY_DELAY_MILLISECONDS = 100;

  // The demo's performance monitor (owner ask, round 26): the page names
  // its own frame budget instead of leaving a slow interaction unexplained.
  // The window holds the last N GPU frames; a frame is slow when its
  // measured render time exceeds the 30-fps budget, or when frames keep
  // arriving below 30 fps while the page is actively animating. The
  // report always carries the observed cause (missing tiles, no WebGPU,
  // GPU-bound frame, throttled tab) so the fix is actionable.
  runtime.shared.PERFORMANCE_SAMPLE_WINDOW_FRAMES = 120;

  runtime.shared.SLOW_FRAME_MILLISECONDS = 33;

  runtime.shared.SLOW_FRAMES_PER_SECOND = 30;

  runtime.shared.ACTIVE_ANIMATION_MINIMUM_FRAMES = 8;

  runtime.shared.ACTIVE_ANIMATION_WINDOW_MILLISECONDS = 1000;

  // The first GPU frames pay one-time costs (pipeline creation, shader
  // warm-up, the initial upload burst) that say nothing about steady
  // state; they are excluded, and a verdict needs enough samples to be
  // meaningful. The steady-state figure is the median, so one hitched
  // frame never paints the whole session slow.
  runtime.shared.PERFORMANCE_WARMUP_FRAMES = 3;

  runtime.shared.PERFORMANCE_MINIMUM_SAMPLES_FOR_VERDICT = 5;

  // The frame-budget scenario (M23): the performance harness drives a
  // constant-velocity pan through `window.runFrameBudgetScenario`, then
  // waits this long for the last queued frame to land before reading the
  // samples, so the measured window ends on a completed frame.
  runtime.shared.FRAME_BUDGET_SAMPLE_SETTLE_DELAY_MILLISECONDS = 40;

  runtime.shared.MILLISECONDS_PER_SECOND = 1000;

  // The live raster fallback's ceiling when its registry descriptor
  // declares none (the web-tile grid's common top level).
  runtime.shared.LIVE_RASTER_FALLBACK_ZOOM_LEVEL = 19;

  // Hostnames the demo treats as local. A page served from one of them
  // keeps its tile traffic same-origin (the harness's fixture routes), so
  // an automated run never contacts a third-party tile service; a local
  // page opts into the live fallback with `?liveTiles`, and a deployed
  // page (the docs demo) enables it for every visitor.
  runtime.shared.LOCAL_DEMO_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

  runtime.shared.LIVE_TILES_OPT_IN_PARAMETER = 'liveTiles';

  // A local page serves the recorded tile fixtures; the harness disables
  // them with `?noRecordedTileFixtures` to exercise the deployed page's
  // capability-off path without leaving the local origin.
  runtime.shared.RECORDED_TILE_FIXTURES_DISABLE_PARAMETER = 'noRecordedTileFixtures';
}

export function installDiagnosticsPhase2(runtime) {
  // Diagnostics are opt-in (docs/ReferenceAppUX.md
  // §Diagnostics policy): the pane opens one bounded stream at Info and the
  // explicit Show debug events switch lowers it to Debug. Nothing is
  // subscribed before the visitor opens the pane, the window is the shared
  // 100-event bound, and the choice is never persisted (per session).
  // The pane's own displayed list resets when the visitor clears it; the
  // SDK ring is never emptied (a later flush can redeliver older events).
  runtime.state.diagnostics_cleared_at_milliseconds = null;
}

export function installDiagnosticsPhase3(runtime) {
  runtime.shared.error_report_element = document.getElementById('error-report');
}

export function installDiagnosticsPhase4(runtime) {
  // The diagnostics pane's opt-in controls (docs/ReferenceAppUX.md
  // §Diagnostics policy).
  runtime.shared.advanced_panel = document.getElementById('advanced-panel');

  runtime.shared.diagnostics_debug_events_control =
    document.getElementById('diagnostics-debug-toggle');

  runtime.shared.diagnostics_debug_events_label =
    document.getElementById('diagnostics-debug-events-label');

  runtime.shared.diagnostics_clear_control = document.getElementById('diagnostics-clear-control');

  runtime.shared.diagnostics_close_control = document.getElementById('diagnostics-close-control');
}

export function installDiagnosticsPhase5(runtime) {
  // The browser suite drives the advanced controls directly: `?advanced`
  // opens the panel the way a curious user would, without changing what
  // a visitor sees by default.
  if (new URLSearchParams(window.location.search).has('advanced')) {
    document.getElementById('advanced-panel').open = true;
  }
}

export function installDiagnosticsPhase6(runtime) {
  window.mapPerformance = () => runtime.services.performance_summary();

  /**
   * The frame-budget scenario (M23): a scripted constant-velocity pan the
   * performance harness drives from a real browser, so the numbers the
   * performance chapter quotes come from the page's own frame path rather
   * than from a synthetic loop. It advances the camera once per animation
   * frame through the same user-path pan the pointer gesture applies,
   * renders through the page's normal render step, and resolves with the
   * frame samples recorded during the window plus the animation-frame
   * intervals — a frame rate alone cannot tell a smooth 60 Hz loop from a
   * loop that simply is not drawing.
   *
   * The pan runs out and back: the camera returns to where it started, so
   * the scenario never leaves the recorded tile fixtures (an unmapped edge
   * frame would report a smaller draw list and flatter numbers) and two
   * consecutive runs measure the same ground.
   *
   * @param {object} options
   * @param {number} options.panPixelsPerSecond the constant screen-space
   *   pan velocity, in device pixels per second
   * @param {number} options.durationMilliseconds how long the pan runs
   * @returns {Promise<{samples: object[], animationFrameIntervalsMilliseconds:
   *   number[]}>} the samples recorded during the pan (the page keeps a
   *   rolling window, so a pan longer than the window reports the window)
   */
  window.runFrameBudgetScenario = ({ panPixelsPerSecond, durationMilliseconds }) =>
    new Promise((resolve) => {
      // The scenario is a camera gesture by construction: the surface
      // grades every frame it draws until the pan ends, then the page
      // draws the settle. The same scenario on a tree without the
      // grading seam simply draws ungraded frames, which is the
      // measurement's control.
      runtime.services.set_camera_gesture_active(true);
      const animationFrameIntervalsMilliseconds = [];
      const scenario_start_milliseconds = performance.now();
      const scenario_half_duration_milliseconds = durationMilliseconds / 2;
      let previous_frame_milliseconds = null;
      let previous_pan_milliseconds = scenario_start_milliseconds;
      function scenario_step(animation_frame_milliseconds) {
        if (previous_frame_milliseconds !== null) {
          animationFrameIntervalsMilliseconds.push(
            animation_frame_milliseconds - previous_frame_milliseconds);
        }
        previous_frame_milliseconds = animation_frame_milliseconds;
        const pan_milliseconds = animation_frame_milliseconds - previous_pan_milliseconds;
        previous_pan_milliseconds = animation_frame_milliseconds;
        const elapsed_milliseconds =
          animation_frame_milliseconds - scenario_start_milliseconds;
        const pan_direction =
          elapsed_milliseconds < scenario_half_duration_milliseconds ? 1 : -1;
        runtime.services.move_center_by_ground_delta(
          (pan_direction * panPixelsPerSecond * pan_milliseconds)
            / runtime.shared.MILLISECONDS_PER_SECOND, 0);
        runtime.services.schedule_render();
        if (elapsed_milliseconds < durationMilliseconds) {
          requestAnimationFrame(scenario_step);
          return;
        }
        // End the gesture and draw the settle frame; the sample window
        // closes after that frame has landed.
        runtime.services.end_camera_gesture();
        setTimeout(() => resolve({
          // The page keeps a rolling window, so the samples are selected
          // by the scenario's own clock rather than by list position: a
          // pan longer than the window honestly reports the window.
          samples: runtime.shared.frame_performance_samples.filter(
            (sample) => sample.atMilliseconds >= scenario_start_milliseconds),
          animationFrameIntervalsMilliseconds,
        }), runtime.shared.FRAME_BUDGET_SAMPLE_SETTLE_DELAY_MILLISECONDS);
      }
      requestAnimationFrame(scenario_step);
    });
}

export function installDiagnosticsPhase7(runtime) {
  // The diagnostics readout (§4.1): the facts are the session's draw
  // facts; the event lines flush the wasm ring (oldest first). Diagnostics
  // are opt-in (docs/ReferenceAppUX.md §4.2
  // policy): nothing is subscribed until the Advanced pane opens, the
  // stream is bounded to the shared window, Show debug events lowers the
  // gate for this session only, and Clear resets the pane's displayed list.
  runtime.state.diagnostics_subscribed = false;

  runtime.state.diagnostics_debug_enabled = false;

  runtime.state.diagnostics_refresh_interval = null;

  runtime.state.diagnostics_displayed_event_count = 0;

  runtime.shared.diagnostics_debug_events_control.addEventListener('change', () => {
    runtime.services.set_diagnostics_debug_enabled(runtime.shared.diagnostics_debug_events_control.checked);
  });

  runtime.shared.diagnostics_clear_control.addEventListener('click', () => {
    // The pane's own list resets; the SDK ring is never emptied, so a
    // later event still reports and the clear is timestamp-scoped.
    runtime.state.diagnostics_cleared_at_milliseconds = Date.now();
    runtime.services.refresh_diagnostics_event_lines();
  });

  runtime.shared.diagnostics_refresh_control.addEventListener('click', () => {
    runtime.services.refresh_diagnostics_event_lines();
  });

  runtime.shared.diagnostics_close_control.addEventListener('click', () => {
    runtime.services.close_diagnostics_stream();
    runtime.shared.advanced_panel.open = false;
  });

  runtime.shared.advanced_panel.addEventListener('toggle', () => {
    if (runtime.shared.advanced_panel.open) {
      runtime.services.open_diagnostics_stream();
    } else {
      runtime.services.close_diagnostics_stream();
    }
  });

  // The diagnostics opt-in's observable state, for the browser suite: no
  // subscription before the pane opens, a bounded window and the explicit
  // debug choice.
  window.mapDiagnosticsState = () => ({
    subscribed: runtime.state.diagnostics_subscribed,
    debugEnabled: runtime.state.diagnostics_debug_enabled,
    displaySeverity: runtime.state.diagnostics_debug_enabled
      ? DIAGNOSTICS_DEBUG_SEVERITY_NAME
      : DIAGNOSTICS_MINIMUM_SEVERITY_NAME,
    displayedEventCount: runtime.state.diagnostics_displayed_event_count,
    clearedAtMilliseconds: runtime.state.diagnostics_cleared_at_milliseconds,
    eventWindow: DIAGNOSTICS_EVENT_WINDOW,
    refreshCadenceMilliseconds: DIAGNOSTICS_REFRESH_CADENCE_MILLISECONDS,
  });
}

export function installDiagnosticsPhase8(runtime) {
  // --- The reference-flow launch automation (docs/ReferenceAppUX.md
  // §Launch automation) ---
  // `window.runReferenceFlow(flowId)` drives the four named flows through the
  // same user paths a visitor takes; it is a test seam, not a second
  // implementation. When `platform/reference-flows.json` is served the
  // runner executes its steps and web hooks; before that artifact exists the
  // same four flows run from the fallback below.
  runtime.shared.REFERENCE_FLOW_FIELD_INPUT_IDS = Object.freeze({
    origin: 'trip-origin-input',
    destination: 'trip-destination-input',
  });

  runtime.shared.REFERENCE_FLOW_FIELD_SEARCH_IDS = Object.freeze({
    origin: 'trip-origin-search-control',
    destination: 'trip-destination-search-control',
  });

  runtime.shared.REFERENCE_FLOW_FIELD_CHIP_IDS = Object.freeze({
    origin: 'origin-my-location',
    destination: 'destination-my-location',
  });

  runtime.shared.REFERENCE_FLOW_TARGET_SELECTORS = Object.freeze({
    plan_route_action: '#trip-plan-route-control',
    route_start_action: '#follow-demo-start-control',
    swap_action: '#trip-swap-control',
    settings_control: '#settings-control',
    settings_close_control: '#settings-close-control',
    diagnostics_door: '#diagnostics-controls',
    debug_detail_switch: '#diagnostics-debug-toggle',
    diagnostics_debug_events: '#diagnostics-debug-toggle',
    diagnostics_clear: '#diagnostics-clear-control',
    diagnostics_close_control: '#diagnostics-close-control',
  });

  runtime.shared.REFERENCE_FLOW_WAIT_TIMEOUT_MILLISECONDS = 10_000;

  runtime.shared.REFERENCE_FLOW_STEP_INTERVAL_MILLISECONDS = 0;

  runtime.shared.REFERENCE_FLOW_FALLBACK_STEPS = Object.freeze({
    plan_and_navigate: Object.freeze([
      { step_id: 'search_origin', action: { kind: 'type_and_search', field: 'origin', value: 'Capitol Park' } },
      { step_id: 'assign_destination', action: { kind: 'assign_result', field: 'destination', value: 'Tower Bridge' } },
      { step_id: 'plan', action: { kind: 'tap', target: 'plan_route_action' } },
      { step_id: 'drive', action: { kind: 'tap', target: 'route_start_action' } },
    ]),
    my_location_field: Object.freeze([
      { step_id: 'fill_origin', action: { kind: 'fill_my_location', field: 'origin' } },
      { step_id: 'fill_destination', action: { kind: 'fill_my_location', field: 'destination' } },
    ]),
    routing_provider_switch: Object.freeze([
      { step_id: 'open_settings', action: { kind: 'open_settings' } },
      { step_id: 'select_routing_provider', action: { kind: 'select_provider', capability: 'routing', provider_role: 'keyless' } },
      { step_id: 'close_settings', action: { kind: 'close_settings' } },
      { step_id: 'search_origin', action: { kind: 'type_and_search', field: 'origin', value: 'Capitol Park' } },
      { step_id: 'assign_destination', action: { kind: 'assign_result', field: 'destination', value: 'Tower Bridge' } },
      { step_id: 'plan', action: { kind: 'tap', target: 'plan_route_action' } },
    ]),
    diagnostics_opt_in: Object.freeze([
      { step_id: 'open_diagnostics', action: { kind: 'open_diagnostics' } },
      { step_id: 'show_debug', action: { kind: 'toggle_debug_events' } },
      { step_id: 'refresh', action: { kind: 'refresh_diagnostics' } },
      { step_id: 'clear', action: { kind: 'clear_diagnostics' } },
    ]),
  });

  window.runReferenceFlow = runtime.services.run_reference_flow;

  window.referenceFlowIds = () => Object.keys(runtime.shared.REFERENCE_FLOW_FALLBACK_STEPS);

  // --- Provider console ---
  // The panel lists the scrubbed SDK event stream newest first and renders
  // one row per provider request from the typed `providerRequest` the
  // diagnostics event carries; the composed message line is never parsed
  // for a provider fact.
  runtime.shared.PROVIDER_CONSOLE_MAXIMUM_ROWS = 200;

  runtime.shared.PROVIDER_CONSOLE_REFRESH_MILLISECONDS = 1000;

  runtime.shared.PROVIDER_CONSOLE_ALERT_REFRESH_MILLISECONDS = 1000;

  runtime.shared.PROVIDER_CONSOLE_FLUSH_LIMIT = 1000;

  /** The number of warning/error signatures the dot remembers. */
  runtime.shared.PROVIDER_CONSOLE_ALERT_SIGNATURE_LIMIT = 500;

  /** The level filter's minimum severity, by the select's value. */
  runtime.shared.PROVIDER_CONSOLE_LEVEL_MINIMUM_SEVERITY_NAMES = {
    info: 'Info',
    warning: 'Warn',
    error: 'Error',
  };

  /** The diagnostics severity names, in ascending order. */
  runtime.shared.PROVIDER_CONSOLE_SEVERITY_RANKS = {
    Trace: 0,
    Debug: 1,
    Info: 2,
    Warn: 3,
    Error: 4,
  };

  /** An unrecognized severity is treated as the most severe. */
  runtime.shared.PROVIDER_CONSOLE_UNKNOWN_SEVERITY_RANK = 4;

  runtime.shared.provider_console_control = document.getElementById('provider-console-control');

  runtime.shared.provider_console_panel = document.getElementById('provider-console-panel');

  runtime.shared.provider_console_close = document.getElementById('provider-console-close');

  runtime.shared.provider_console_alert_dot =
    document.getElementById('provider-console-alert-dot');

  runtime.shared.provider_console_list_view = document.querySelector(
    '#provider-console-panel .provider-console-list-view');

  runtime.shared.provider_console_detail = document.getElementById('provider-console-detail');

  runtime.shared.provider_console_detail_close =
    document.getElementById('provider-console-detail-close');

  runtime.shared.provider_console_detail_severity =
    document.getElementById('provider-console-detail-severity');

  runtime.shared.provider_console_detail_target =
    document.getElementById('provider-console-detail-target');

  runtime.shared.provider_console_detail_message =
    document.getElementById('provider-console-detail-message');

  runtime.shared.provider_console_detail_provider_fields =
    document.getElementById('provider-console-detail-provider-fields');

  runtime.shared.provider_console_detail_provider =
    document.getElementById('provider-console-detail-provider');

  runtime.shared.provider_console_detail_provider_key =
    document.getElementById('provider-console-detail-provider-key');

  runtime.shared.provider_console_detail_contract =
    document.getElementById('provider-console-detail-contract');

  runtime.shared.provider_console_detail_method =
    document.getElementById('provider-console-detail-method');

  runtime.shared.provider_console_detail_path =
    document.getElementById('provider-console-detail-path');

  runtime.shared.provider_console_detail_status =
    document.getElementById('provider-console-detail-status');

  runtime.shared.provider_console_detail_duration =
    document.getElementById('provider-console-detail-duration');

  runtime.shared.provider_console_detail_outcome =
    document.getElementById('provider-console-detail-outcome');

  runtime.shared.provider_console_detail_bytes =
    document.getElementById('provider-console-detail-bytes');

  runtime.shared.provider_console_detail_excerpt_label =
    document.getElementById('provider-console-detail-excerpt-label');

  runtime.shared.provider_console_detail_excerpt =
    document.getElementById('provider-console-detail-excerpt');

  runtime.shared.provider_console_detail_tile_cache =
    document.getElementById('provider-console-detail-tile-cache');

  runtime.shared.provider_console_detail_traffic_cache =
    document.getElementById('provider-console-detail-traffic-cache');

  runtime.shared.provider_console_rows_element = document.getElementById('provider-console-rows');

  runtime.shared.provider_console_empty = document.getElementById('provider-console-empty');

  runtime.shared.provider_console_registration_note =
    document.getElementById('provider-console-registration-note');

  runtime.shared.provider_console_level_filter =
    document.getElementById('provider-console-level-filter');

  runtime.shared.provider_console_provider_filter =
    document.getElementById('provider-console-provider-filter');

  runtime.shared.provider_console_outcome_filter =
    document.getElementById('provider-console-outcome-filter');

  runtime.shared.provider_console_copy = document.getElementById('provider-console-copy');

  runtime.shared.provider_console_export = document.getElementById('provider-console-export');

  runtime.shared.provider_console_capture = document.getElementById('provider-console-capture');

  runtime.shared.provider_console_tile_cache_counters =
    document.getElementById('provider-console-tile-cache-counters');

  runtime.shared.provider_console_traffic_cache_counters =
    document.getElementById('provider-console-traffic-cache-counters');

  /** The warning/error event signatures the dot has already reported. */
  runtime.shared.provider_console_seen_alert_signatures = new Set();

  runtime.state.provider_console_selected_event = null;

  runtime.state.provider_console_refresh_timer = null;

  runtime.state.provider_console_last_rows = '';

  // The export's defensive credential scrub, the same second pass the
  // native consoles run: the diagnostics ring redacts at emission, and
  // this protects a download or clipboard copy if an event field ever
  // regresses. It removes every applied credential value literally plus
  // the credential-shaped `name=value` and `"name": "value"` forms.
  runtime.shared.PROVIDER_CONSOLE_CREDENTIAL_PARAMETER_NAMES = Object.freeze([
    'key', 'apiKey', 'api_key', 'access_token', 'token', 'session', 'signature',
  ]);

  runtime.shared.PROVIDER_CONSOLE_REDACTION_PLACEHOLDER = '<redacted>';

  runtime.shared.PROVIDER_CONSOLE_CREDENTIAL_NAME_ALTERNATION =
    runtime.shared.PROVIDER_CONSOLE_CREDENTIAL_PARAMETER_NAMES
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

  runtime.shared.PROVIDER_CONSOLE_AUTHORIZATION_HEADER_PATTERN =
    /(authorization\s*:\s*)[^\n\r]*/gi;

  runtime.shared.PROVIDER_CONSOLE_BEARER_TOKEN_PATTERN = /(bearer\s+)\S+/gi;

  runtime.shared.PROVIDER_CONSOLE_JSON_MEMBER_PATTERN = new RegExp(
    `("(?:${runtime.shared.PROVIDER_CONSOLE_CREDENTIAL_NAME_ALTERNATION})"\\s*:\\s*")[^"]*(")`,
    'gi');

  runtime.shared.PROVIDER_CONSOLE_QUERY_PARAMETER_PATTERN = new RegExp(
    `([?&;]\\s*(?:${runtime.shared.PROVIDER_CONSOLE_CREDENTIAL_NAME_ALTERNATION})=)[^&\\s"']+`,
    'gi');

  runtime.shared.PROVIDER_CONSOLE_ASSIGNMENT_PATTERN = new RegExp(
    `(\\b(?:${runtime.shared.PROVIDER_CONSOLE_CREDENTIAL_NAME_ALTERNATION})=)[^&\\s"']+`,
    'gi');

  /** The console's read-only state, for the browser suite. */
  window.mapProviderConsoleState = () => ({
    open: runtime.shared.provider_console_panel !== null && !runtime.shared.provider_console_panel.hidden,
    alertVisible: runtime.shared.provider_console_alert_dot !== null
      && !runtime.shared.provider_console_alert_dot.hidden,
    alertSeverity: runtime.shared.provider_console_alert_dot?.dataset.severity ?? null,
    levelFilter: runtime.shared.provider_console_level_filter?.value ?? null,
    detailOpen: runtime.shared.provider_console_detail !== null
      && !runtime.shared.provider_console_detail.hidden,
    rowCount: runtime.shared.provider_console_rows_element?.children.length ?? 0,
    registeredProviderCount: (() => {
      try {
        return Array.from(
          window.mapTest?.providerRegistrations?.() ?? [],
        ).filter((registration) => registration.registered === true).length;
      } catch {
        return 0;
      }
    })(),
  });

  if (runtime.shared.provider_console_control !== null) {
    // The dot watches Warning and Error events from the moment the page
    // installs; opening the panel widens the same stream to Info.
    window.mapTest?.subscribeToDiagnosticEvents?.(
      window.mapTest.SdkLogSeverity.Warn);
    runtime.services.provider_console_baseline_alerts();
    setInterval(
      runtime.services.poll_provider_console_alerts,
      runtime.shared.PROVIDER_CONSOLE_ALERT_REFRESH_MILLISECONDS,
    );
    runtime.shared.provider_console_control.addEventListener('click', () => {
      runtime.services.set_provider_console_open(runtime.shared.provider_console_panel.hidden);
    });
    runtime.shared.provider_console_close.addEventListener('click', () => {
      runtime.services.set_provider_console_open(false);
    });
    runtime.shared.provider_console_level_filter.addEventListener('change', () => {
      runtime.state.provider_console_last_rows = '';
      runtime.services.refresh_provider_console();
    });
    runtime.shared.provider_console_provider_filter.addEventListener('change', runtime.services.refresh_provider_console);
    runtime.shared.provider_console_outcome_filter.addEventListener('change', runtime.services.refresh_provider_console);
    runtime.shared.provider_console_detail_close.addEventListener(
      'click', runtime.services.provider_console_close_detail);
    runtime.shared.provider_console_capture.addEventListener('change', () => {
      window.mapTest?.setResponseExcerptCapture?.(
        runtime.shared.provider_console_capture.checked);
      runtime.state.provider_console_last_rows = '';
      runtime.services.refresh_provider_console();
    });
    runtime.shared.provider_console_copy.addEventListener('click', () => {
      const text = runtime.services.provider_console_credential_free_text(
        runtime.services.provider_console_events()
          .map((event) => {
            const excerpt = event.providerRequest?.responseExcerpt
              ? `\n${event.providerRequest.responseExcerpt}`
              : '';
            return `${runtime.services.provider_console_event_text(event)}${excerpt}`;
          })
          .join('\n'),
      );
      navigator.clipboard?.writeText(text).catch(() => undefined);
    });
    runtime.shared.provider_console_export.addEventListener('click', () => {
      const records = runtime.services.provider_console_events()
        .map((event) => runtime.services.provider_console_credential_free_record(
          runtime.services.provider_console_export_record(event)));
      const blob = new Blob([JSON.stringify(records, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'provider-console.json';
      link.click();
      URL.revokeObjectURL(link.href);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || runtime.shared.provider_console_panel.hidden) {
        return;
      }
      if (!runtime.shared.provider_console_detail.hidden) {
        runtime.services.provider_console_close_detail();
      } else {
        runtime.services.set_provider_console_open(false);
      }
    });
  }
}
