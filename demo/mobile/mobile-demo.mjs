// The hosted mobile demo page (PLAN.md, M24).
//
// Nothing streams until a visitor presses Start. Start asks the claim endpoint
// for a session — which enforces the month's streamed-minutes budget and the
// daily limits server-side — and only a granted session reveals the link that
// opens the app in its own tab. The page owns presentation; the budget is never
// a browser opinion.
//
// The build ids come from `demo-builds.json`, written by
// `scripts/upload-demo-builds.mjs` and staged beside this page. No API token is
// present here, and none can be: the session URL carries only a public build id.

/** Where the claim endpoint answers; set after the Vercel project is created. */
const CLAIM_ENDPOINT =
  document.querySelector('meta[name="demo-claim-endpoint"]')?.content ??
  'https://rustic-maps-demo-claim.vercel.app/api/claim';

/** The Appetize origin that hosts one session as a page of its own. */
const APPETIZE_APP_ORIGIN = 'https://appetize.io/app';

/** The device a session runs on, per platform tab (documented, not random). */
const DEVICE_BY_PLATFORM = new Map([
  ['android', 'pixel7'],
  ['ios', 'iphone14pro'],
  ['react-native', 'pixel7'],
]);

/** The device the active tab asks for. */
function activeDevice() {
  return DEVICE_BY_PLATFORM.get(state.platform) ?? 'pixel7';
}

/** The app the active tab starts, as the poster names it. */
function appNameForPlatform() {
  return POSTER_TITLE_BY_PLATFORM.get(state.platform) ?? 'The demo';
}

/** The manifest entry each tab starts, in the manifest's own key spelling. */
const MANIFEST_KEY_BY_PLATFORM = new Map([
  ['android', 'android'],
  ['ios', 'ios'],
  ['react-native', 'reactNativeAndroid'],
]);

/** The poster title per tab; the tab names the platform, the poster names the app. */
const POSTER_TITLE_BY_PLATFORM = new Map([
  ['android', 'Android reference application'],
  ['ios', 'iOS reference application'],
  ['react-native', 'React Native reference application'],
]);

const elements = {
  tabs: Array.from(document.querySelectorAll('[data-platform]')),
  tablist: document.querySelector('[role="tablist"]'),
  stage: document.getElementById('mobile-demo-stage'),
  poster: document.querySelector('[data-role="poster"]'),
  posterTitle: document.querySelector('[data-role="poster-title"]'),
  posterDetail: document.querySelector('[data-role="poster-detail"]'),
  start: document.querySelector('[data-role="start"]'),
  session: document.querySelector('[data-role="session"]'),
  sessionTitle: document.querySelector('[data-role="session-title"]'),
  sessionLink: document.querySelector('[data-role="session-link"]'),
  countdown: document.querySelector('[data-role="session-countdown"]'),
  stop: document.querySelector('[data-role="stop"]'),
  resting: document.querySelector('[data-role="resting"]'),
  restingFallback: document.querySelector('[data-role="resting-fallback"]'),
  budgetLine: document.querySelector('[data-role="budget-line"]'),
  manifestLine: document.querySelector('[data-role="manifest-line"]'),
};

const state = {
  platform: 'android',
  manifest: null,
  sessionTimerIdentifier: null,
};

/** Where the browser keeps its demo visitor token (this browser only). */
const VISITOR_TOKEN_STORAGE_KEY = 'rustic-maps-demo-visitor-token';

/** The token shape the claim endpoint accepts. */
const VISITOR_TOKEN_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

/** The operator secret, when the page is opened with one (`?operatorToken=`). */
const operatorToken = new URL(window.location.href).searchParams.get('operatorToken');

/** Builds one random, URL-safe visitor token. */
function createVisitorToken() {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  const randomPart = Math.random().toString(36).slice(2);
  return `visitor-${Date.now().toString(36)}-${randomPart}`;
}

/**
 * The token this browser presents, created on first use. The endpoint counts
 * sessions per token rather than per IP address, because an address is not a
 * visitor: a VPN or a carrier NAT shares one, which used to lock out people
 * who had never watched a session. Storage can be unavailable (private
 * windows); the page then presents a fresh token for this load and the
 * address backstop still bounds the day.
 */
function visitorToken() {
  try {
    const storedToken = window.localStorage.getItem(VISITOR_TOKEN_STORAGE_KEY);
    if (storedToken !== null && VISITOR_TOKEN_PATTERN.test(storedToken)) {
      return storedToken;
    }
    const createdToken = createVisitorToken();
    window.localStorage.setItem(VISITOR_TOKEN_STORAGE_KEY, createdToken);
    return createdToken;
  } catch {
    return createVisitorToken();
  }
}

/** Fetches the public build manifest; a missing one is an honest empty state. */
async function loadManifest() {
  try {
    const response = await fetch('demo-builds.json', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Reads the month's remaining minutes without claiming a session, so a
 * visitor can see what is left before pressing Start. The readout is hidden
 * when the status service is unreachable; it is an explanation, never a gate.
 */
async function renderBudgetLine() {
  try {
    const statusUrl = new URL(CLAIM_ENDPOINT);
    statusUrl.searchParams.set('platform', state.platform);
    statusUrl.searchParams.set('status', 'true');
    statusUrl.searchParams.set('visitor', visitorToken());
    const response = await fetch(statusUrl, { cache: 'no-store' });
    const status = await response.json();
    if (!Number.isFinite(status?.remainingSeconds)) {
      return;
    }
    const remainingMinutes = Math.floor(status.remainingSeconds / 60);
    elements.budgetLine.textContent =
      remainingMinutes === 1
        ? 'About 1 streamed minute remains this month.'
        : `About ${remainingMinutes} streamed minutes remain this month.`;
    elements.budgetLine.hidden = false;
  } catch {
    // The page works without the readout; the claim itself reports the same
    // facts when it answers.
  }
}

/** The manifest entry for the active tab, or null when nothing is published. */
function activeBuild() {
  const manifestKey = MANIFEST_KEY_BY_PLATFORM.get(state.platform);
  const entry = state.manifest?.builds?.[manifestKey] ?? null;
  return entry?.buildId ? entry : null;
}

/** Renders the poster and the Start button for the active tab. */
function renderPoster() {
  const build = activeBuild();
  elements.posterTitle.textContent =
    POSTER_TITLE_BY_PLATFORM.get(state.platform) ?? 'Mobile demo';
  if (build === null) {
    elements.posterDetail.textContent = 'Build not published yet.';
    elements.start.disabled = true;
  } else {
    const updated = build.updatedAt ? new Date(build.updatedAt) : null;
    elements.posterDetail.textContent = updated
      ? `Build updated ${updated.toISOString().slice(0, 10)}.`
      : 'Ready to start.';
    elements.start.disabled = false;
  }
  if (state.manifest?.sourceCommit) {
    elements.manifestLine.textContent = `Source commit ${state.manifest.sourceCommit.slice(0, 12)}.`;
  } else {
    elements.manifestLine.textContent = '';
  }
}

/**
 * Shows the resting state with the endpoint's own words. The poster stays in
 * place so Start remains available: a refusal that turns out to be transient
 * can be retried without reloading the page, which is also what the
 * session-ended message tells the visitor to do.
 */
function showResting(detail, remainingSeconds = null) {
  elements.poster.hidden = false;
  elements.session.hidden = true;
  elements.resting.hidden = false;
  elements.restingFallback.hidden = false;
  const minutesLeft = Number.isFinite(remainingSeconds)
    ? ` About ${Math.floor(remainingSeconds / 60)} of this month’s streamed minutes remain.`
    : '';
  elements.resting.textContent = `${detail}${minutesLeft}`;
}

/** Ends the running session and returns the page to its poster. */
function stopSession() {
  if (state.sessionTimerIdentifier !== null) {
    window.clearInterval(state.sessionTimerIdentifier);
    state.sessionTimerIdentifier = null;
  }
  elements.sessionLink.removeAttribute('href');
  elements.session.hidden = true;
  elements.poster.hidden = false;
  elements.resting.hidden = true;
  elements.restingFallback.hidden = true;
  elements.countdown.textContent = '';
}

/** Starts the countdown the granted session allows. */
function startCountdown(sessionSeconds) {
  let remainingSeconds = sessionSeconds;
  const render = () => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = String(remainingSeconds % 60).padStart(2, '0');
    elements.countdown.textContent = `Session ends in ${minutes}:${seconds}`;
  };
  render();
  state.sessionTimerIdentifier = window.setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      stopSession();
      showResting('The session ended. Press Start again to keep exploring.');
      return;
    }
    render();
  }, 1000);
}

/** Opens the granted session as its own tab and starts the countdown. */
function startSession(build, sessionSeconds) {
  const device = activeDevice();
  const sessionUrl = new URL(`${APPETIZE_APP_ORIGIN}/${build.buildId}`);
  sessionUrl.searchParams.set('device', device);
  sessionUrl.searchParams.set('scale', '75');
  // No `autoplay`: the app page's own Start demo button gates the stream,
  // and an autoplay request is treated as an embed (refused with "This app
  // may not be embedded on this website" when the host is not allow-listed).
  // Loading the page is free; only the stream the visitor starts counts.
  sessionUrl.searchParams.set('orientation', 'portrait');
  elements.sessionLink.href = sessionUrl.toString();
  elements.sessionTitle.textContent = `${appNameForPlatform()} is ready`;
  elements.poster.hidden = true;
  elements.resting.hidden = true;
  elements.restingFallback.hidden = true;
  elements.session.hidden = false;
  // The Start button just left the page; move the keyboard and screen-reader
  // focus to the link that opens the session instead of dropping it to the
  // document body.
  elements.sessionLink.focus();
  startCountdown(sessionSeconds);
  // The browser only opens a tab from a real click, and the claim is an
  // awaited request, so the visitor presses the link that just appeared
  // rather than relying on a popup the browser may block.
}

/** Asks the claim endpoint for a session, then starts it or rests. */
async function requestSession() {
  const build = activeBuild();
  if (build === null) {
    return;
  }
  elements.start.disabled = true;
  elements.posterDetail.textContent = 'Starting…';
  try {
    const claimUrl = new URL(CLAIM_ENDPOINT);
    claimUrl.searchParams.set('platform', state.platform);
    claimUrl.searchParams.set('visitor', visitorToken());
    if (operatorToken !== null && operatorToken !== '') {
      claimUrl.searchParams.set('operatorToken', operatorToken);
    }
    const response = await fetch(claimUrl, { cache: 'no-store' });
    const claim = await response.json();
    if (claim.state === 'ok') {
      startSession(build, claim.sessionSeconds ?? 180);
      return;
    }
    if (claim.state === 'resting') {
      showResting(
        claim.detail ?? 'The demo is resting right now.',
        claim.remainingSeconds,
      );
      return;
    }
    showResting(claim.detail ?? 'The demo could not start.');
  } catch {
    showResting('The demo could not reach its session service.');
  } finally {
    elements.start.disabled = false;
    if (elements.session.hidden && !elements.poster.hidden) {
      renderPoster();
    }
  }
}

function selectPlatform(platform) {
  if (state.platform === platform) {
    return;
  }
  if (!elements.session.hidden) {
    stopSession();
  }
  state.platform = platform;
  for (const tab of elements.tabs) {
    const is_selected = tab.dataset.platform === platform;
    tab.setAttribute('aria-selected', String(is_selected));
    // The tablist's roving tabindex: Tab reaches the selected tab, and the
    // arrow keys move along the list (the WAI-ARIA tabs pattern).
    tab.tabIndex = is_selected ? 0 : -1;
  }
  elements.stage.setAttribute('aria-labelledby', `platform-tab-${platform}`);
  elements.poster.hidden = false;
  elements.resting.hidden = true;
  elements.restingFallback.hidden = true;
  renderPoster();
}

function wire() {
  for (const tab of elements.tabs) {
    tab.addEventListener('click', () => selectPlatform(tab.dataset.platform));
  }
  // The WAI-ARIA tabs pattern: Left/Right move along the list with wraparound,
  // Home/End jump to the ends, and the focused tab is selected as it moves
  // (automatic activation — switching a platform is cheap and reversible).
  elements.tablist.addEventListener('keydown', (event) => {
    const active_index = elements.tabs.indexOf(document.activeElement);
    if (active_index < 0) return;
    let next_index = null;
    switch (event.key) {
      case 'ArrowRight':
        next_index = (active_index + 1) % elements.tabs.length;
        break;
      case 'ArrowLeft':
        next_index =
          (active_index - 1 + elements.tabs.length) % elements.tabs.length;
        break;
      case 'Home':
        next_index = 0;
        break;
      case 'End':
        next_index = elements.tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const next_tab = elements.tabs[next_index];
    next_tab.focus();
    selectPlatform(next_tab.dataset.platform);
  });
  elements.start.addEventListener('click', requestSession);
  elements.stop.addEventListener('click', () => {
    stopSession();
    renderPoster();
    if (!elements.start.disabled) elements.start.focus();
  });
  // The session runs in its own tab, so the countdown stops when this page
  // goes away; the tab keeps streaming until it is closed or its three
  // minutes run out.
  window.addEventListener('pagehide', stopSession);
}

async function main() {
  state.manifest = await loadManifest();
  wire();
  renderPoster();
  renderBudgetLine();
}

main();
