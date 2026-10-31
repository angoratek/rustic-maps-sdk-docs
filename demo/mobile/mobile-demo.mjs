// The hosted mobile demo page (PLAN.md, M24).
//
// Nothing streams until a visitor presses Start. Start asks the claim endpoint
// for a session — which enforces the month's streamed-minutes budget and the
// daily limits server-side — and only a granted session injects the Appetize
// frame. The page owns presentation; the budget is never a browser opinion.
//
// The build ids come from `demo-builds.json`, written by
// `scripts/upload-demo-builds.mjs` and staged beside this page. No API token is
// present here, and none can be: the Appetize embed uses a public build id.

/** Where the claim endpoint answers; set after the Vercel project is created. */
const CLAIM_ENDPOINT =
  document.querySelector('meta[name="demo-claim-endpoint"]')?.content ??
  'https://rustic-maps-demo-claim.vercel.app/api/claim';

/** The Appetize embed origin. */
const APPETIZE_EMBED_ORIGIN = 'https://appetize.io/embed';

/** The device a session runs on, per platform tab (documented, not random). */
const DEVICE_BY_PLATFORM = new Map([
  ['android', 'pixel7'],
  ['ios', 'iphone14pro'],
  ['react-native', 'pixel7'],
]);

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
  poster: document.querySelector('[data-role="poster"]'),
  posterTitle: document.querySelector('[data-role="poster-title"]'),
  posterDetail: document.querySelector('[data-role="poster-detail"]'),
  start: document.querySelector('[data-role="start"]'),
  session: document.querySelector('[data-role="session"]'),
  frame: document.querySelector('[data-role="frame"]'),
  countdown: document.querySelector('[data-role="session-countdown"]'),
  stop: document.querySelector('[data-role="stop"]'),
  resting: document.querySelector('[data-role="resting"]'),
  manifestLine: document.querySelector('[data-role="manifest-line"]'),
};

const state = {
  platform: 'android',
  manifest: null,
  sessionTimerIdentifier: null,
};

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

/** Shows the resting state with the endpoint's own words. */
function showResting(detail) {
  elements.poster.hidden = true;
  elements.session.hidden = true;
  elements.resting.hidden = false;
  elements.resting.textContent = detail;
}

/** Ends the running session and returns the page to its poster. */
function stopSession() {
  if (state.sessionTimerIdentifier !== null) {
    window.clearInterval(state.sessionTimerIdentifier);
    state.sessionTimerIdentifier = null;
  }
  elements.frame.removeAttribute('src');
  elements.session.hidden = true;
  elements.poster.hidden = false;
  elements.resting.hidden = true;
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

/** Injects the Appetize frame for a granted session. */
function startSession(build, sessionSeconds) {
  const device = DEVICE_BY_PLATFORM.get(state.platform) ?? 'pixel7';
  const embedUrl = new URL(`${APPETIZE_EMBED_ORIGIN}/${build.buildId}`);
  embedUrl.searchParams.set('device', device);
  embedUrl.searchParams.set('scale', '75');
  embedUrl.searchParams.set('autoplay', 'true');
  embedUrl.searchParams.set('orientation', 'portrait');
  elements.poster.hidden = true;
  elements.resting.hidden = true;
  elements.session.hidden = false;
  elements.frame.src = embedUrl.toString();
  startCountdown(sessionSeconds);
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
    const response = await fetch(
      `${CLAIM_ENDPOINT}?platform=${encodeURIComponent(state.platform)}`,
      { cache: 'no-store' },
    );
    const claim = await response.json();
    if (claim.state === 'ok') {
      startSession(build, claim.sessionSeconds ?? 180);
      return;
    }
    if (claim.state === 'resting') {
      showResting(claim.detail ?? 'The demo is resting right now.');
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
    tab.setAttribute('aria-selected', String(tab.dataset.platform === platform));
  }
  elements.poster.hidden = false;
  elements.resting.hidden = true;
  renderPoster();
}

function wire() {
  for (const tab of elements.tabs) {
    tab.addEventListener('click', () => selectPlatform(tab.dataset.platform));
  }
  elements.start.addEventListener('click', requestSession);
  elements.stop.addEventListener('click', () => {
    stopSession();
    renderPoster();
  });
  // A session must not keep streaming in a hidden tab: navigating away, or
  // hiding the page, ends it.
  window.addEventListener('pagehide', stopSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !elements.session.hidden) {
      stopSession();
      showResting('The session ended when the page was hidden.');
    }
  });
}

async function main() {
  state.manifest = await loadManifest();
  wire();
  renderPoster();
}

main();
