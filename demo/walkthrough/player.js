'use strict';

/*
 * Dependency-free walkthrough player.
 *
 * The contract's screens are embedded in the document as JSON. The player
 * swaps stills through two buffers, plays an optional transition clip over the
 * swapped still, and maps pointer gestures and keyboard traversal to hotspots.
 * Every image and clip is a relative path in the same directory; the player
 * makes no external request.
 */
(function () {
  const dataElement = document.getElementById('walkthrough-data');
  if (!dataElement) {
    return;
  }

  const data = JSON.parse(dataElement.textContent);
  const platforms = data.platforms || {};
  const platformOrder = (data.platform_order || Object.keys(platforms)).filter(
    (key) => platforms[key] && Array.isArray(platforms[key].screens)
  );
  if (platformOrder.length === 0) {
    return;
  }

  const phone = document.getElementById('phone');
  const video = document.getElementById('transition-video');
  const hotspotsElement = document.getElementById('hotspots');
  const captionElement = document.getElementById('caption');
  const progressElement = document.getElementById('progress');
  const dotsElement = document.getElementById('dots');
  const platformNavigation = document.getElementById('platforms');

  const stills = {
    front: phone.querySelector('.still[data-buffer="front"]'),
    back: phone.querySelector('.still[data-buffer="back"]')
  };

  const PERCENT_MAXIMUM = 100;
  const SWIPE_THRESHOLD_PIXELS = 24;
  const SWIPE_AXIS_DOMINANCE = 1.2;
  const CLICK_SUPPRESSION_MILLISECONDS = 350;
  const TRANSITION_READY_TIMEOUT_MILLISECONDS = 2000;
  const TRANSITION_PLAY_TIMEOUT_MILLISECONDS = 8000;
  const TRANSITION_FADE_MILLISECONDS = 200;
  const HASH_SEPARATOR = '/';
  const DEFAULT_PLATFORM = platformOrder[0];
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

  let platformKey = DEFAULT_PLATFORM;
  let screenIndex = 0;
  let activeBuffer = 'back';
  let transitioning = false;
  let suppressClick = false;
  let pointerOrigin = null;

  function currentPlatform() {
    return platforms[platformKey];
  }

  function currentScreen() {
    return currentPlatform().screens[screenIndex];
  }

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function preload(imageSource) {
    const image = new Image();
    image.src = imageSource;
    if (image.complete) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
    });
  }

  function otherBuffer(buffer) {
    return buffer === 'front' ? 'back' : 'front';
  }

  async function swapStill(screen) {
    const nextBuffer = otherBuffer(activeBuffer);
    const nextImage = stills[nextBuffer];
    nextImage.src = screen.image;
    nextImage.alt = screen.caption;
    try {
      if (typeof nextImage.decode === 'function') {
        await nextImage.decode();
      }
    } catch (error) {
      // A browser may reject decode() for a cached frame; the image still
      // renders when it is shown, so the swap continues.
    }
    nextImage.classList.add('is-active');
    stills[activeBuffer].classList.remove('is-active');
    activeBuffer = nextBuffer;
  }

  function waitForVideoReady() {
    if (video.readyState >= 3) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = (isReady) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('error', onError);
        resolve(isReady);
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      const timeout = window.setTimeout(
        () => finish(false),
        TRANSITION_READY_TIMEOUT_MILLISECONDS
      );
      video.addEventListener('canplay', onReady);
      video.addEventListener('error', onError);
    });
  }

  function waitForVideoEnd() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        video.removeEventListener('ended', finish);
        video.removeEventListener('error', finish);
        resolve();
      };
      const timeout = window.setTimeout(finish, TRANSITION_PLAY_TIMEOUT_MILLISECONDS);
      video.addEventListener('ended', finish);
      video.addEventListener('error', finish);
    });
  }

  async function hideVideoLayer() {
    video.classList.remove('is-visible');
    await delay(TRANSITION_FADE_MILLISECONDS);
    video.hidden = true;
    video.removeAttribute('src');
    video.load();
  }

  async function playTransition(targetScreen, transitionSource) {
    const stillReady = preload(targetScreen.image);
    video.hidden = false;
    video.src = transitionSource;
    video.load();
    const videoReady = await waitForVideoReady();
    await stillReady;
    if (!videoReady) {
      await swapStill(targetScreen);
      await hideVideoLayer();
      return;
    }
    video.classList.add('is-visible');
    let playing = false;
    try {
      await video.play();
      playing = true;
    } catch (error) {
      playing = false;
    }
    if (playing) {
      await waitForVideoEnd();
    }
    // The target still is decoded and made active underneath the opaque video
    // layer before that layer fades out, so the swap never flashes.
    await swapStill(targetScreen);
    await hideVideoLayer();
  }

  async function showScreen(index, options) {
    const settings = options || {};
    const screens = currentPlatform().screens;
    if (index < 0 || index >= screens.length || transitioning) {
      return;
    }
    const targetScreen = screens[index];
    transitioning = true;
    if (settings.hotspot && settings.hotspot.transition_video && !reducedMotion.matches) {
      await playTransition(targetScreen, settings.hotspot.transition_video);
    } else {
      await preload(targetScreen.image);
      await swapStill(targetScreen);
    }
    screenIndex = index;
    transitioning = false;
    renderScreenMeta();
    writeHash();
    preloadNext();
  }

  function preloadNext() {
    const nextScreen = currentPlatform().screens[screenIndex + 1];
    if (nextScreen) {
      preload(nextScreen.image);
    }
  }

  function renderPlatformButtons() {
    platformNavigation.replaceChildren();
    if (platformOrder.length < 2) {
      platformNavigation.hidden = true;
      return;
    }
    platformNavigation.hidden = false;
    for (const key of platformOrder) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'platform-button';
      button.textContent = platforms[key].display_name || key;
      button.setAttribute('aria-pressed', key === platformKey ? 'true' : 'false');
      button.addEventListener('click', () => {
        setPlatform(key, 0);
      });
      platformNavigation.append(button);
    }
  }

  function renderScreenMeta() {
    const screen = currentScreen();
    const screens = currentPlatform().screens;
    captionElement.textContent = screen.caption;
    progressElement.textContent = `${screenIndex + 1} / ${screens.length}`;
    progressElement.setAttribute('aria-valuemin', '1');
    progressElement.setAttribute('aria-valuemax', String(screens.length));
    progressElement.setAttribute('aria-valuenow', String(screenIndex + 1));
    renderHotspots(screen);
    renderDots();
  }

  function gestureLabel(gesture) {
    switch (gesture) {
      case 'swipe-up':
        return 'swipe up';
      case 'swipe-down':
        return 'swipe down';
      case 'swipe-left':
        return 'swipe left';
      case 'swipe-right':
        return 'swipe right';
      default:
        return 'tap';
    }
  }

  function renderHotspots(screen) {
    hotspotsElement.replaceChildren();
    for (const hotspot of screen.hotspots || []) {
      const button = document.createElement('button');
      const rect = hotspot.rect;
      button.type = 'button';
      button.className = 'hotspot';
      button.style.top = `${rect.top}%`;
      button.style.left = `${rect.left}%`;
      button.style.width = `${rect.width}%`;
      button.style.height = `${rect.height}%`;
      button.dataset.gesture = hotspot.gesture;
      button.setAttribute(
        'aria-label',
        `${hotspot.label}; ${gestureLabel(hotspot.gesture)}`
      );
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (suppressClick) {
          return;
        }
        // A pointer tap belongs to a tap zone; keyboard activation
        // (event.detail === 0) may use any hotspot.
        if (hotspot.gesture !== 'tap' && event.detail !== 0) {
          return;
        }
        activateHotspot(hotspot);
      });
      hotspotsElement.append(button);
    }
  }

  function renderDots() {
    const screens = currentPlatform().screens;
    dotsElement.replaceChildren();
    screens.forEach((screen, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dot';
      button.setAttribute('aria-label', `Go to screen ${index + 1}: ${screen.caption}`);
      if (index === screenIndex) {
        button.setAttribute('aria-current', 'step');
      }
      button.addEventListener('click', () => {
        showScreen(index, {});
      });
      dotsElement.append(button);
    });
  }

  function activateHotspot(hotspot) {
    if (transitioning) {
      return;
    }
    const index = currentPlatform().screens.findIndex(
      (screen) => screen.id === hotspot.next_screen
    );
    if (index < 0) {
      return;
    }
    showScreen(index, { hotspot });
  }

  function setPlatform(key, index) {
    if (!platforms[key]) {
      return;
    }
    platformKey = key;
    screenIndex = index || 0;
    phone.style.setProperty('--walkthrough-aspect', String(platforms[key].aspect_ratio));
    renderPlatformButtons();
    showScreen(screenIndex, {});
  }

  function parseHash() {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) {
      return null;
    }
    const parts = raw.split(HASH_SEPARATOR);
    if (parts.length < 2) {
      return null;
    }
    let key;
    let identifier;
    try {
      key = decodeURIComponent(parts[0]);
      identifier = decodeURIComponent(parts.slice(1).join(HASH_SEPARATOR));
    } catch (error) {
      return null;
    }
    if (!platforms[key]) {
      return null;
    }
    const index = platforms[key].screens.findIndex((screen) => screen.id === identifier);
    if (index < 0) {
      return null;
    }
    return { platformKey: key, screenIndex: index };
  }

  function writeHash() {
    const hash = `#${platformKey}${HASH_SEPARATOR}${currentScreen().id}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }

  function hotspotPixels(hotspot) {
    const bounds = phone.getBoundingClientRect();
    const frameWidth = phone.clientWidth;
    const frameHeight = phone.clientHeight;
    const left = bounds.left + phone.clientLeft + (hotspot.rect.left / PERCENT_MAXIMUM) * frameWidth;
    const top = bounds.top + phone.clientTop + (hotspot.rect.top / PERCENT_MAXIMUM) * frameHeight;
    return {
      left,
      top,
      right: left + (hotspot.rect.width / PERCENT_MAXIMUM) * frameWidth,
      bottom: top + (hotspot.rect.height / PERCENT_MAXIMUM) * frameHeight
    };
  }

  function hotspotAt(clientX, clientY, gesture) {
    return (currentScreen().hotspots || []).find((hotspot) => {
      if (hotspot.gesture !== gesture) {
        return false;
      }
      const pixels = hotspotPixels(hotspot);
      return (
        clientX >= pixels.left &&
        clientX <= pixels.right &&
        clientY >= pixels.top &&
        clientY <= pixels.bottom
      );
    });
  }

  function swipeGesture(deltaX, deltaY) {
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);
    if (horizontalDistance >= verticalDistance * SWIPE_AXIS_DOMINANCE) {
      return deltaX > 0 ? 'swipe-right' : 'swipe-left';
    }
    return deltaY > 0 ? 'swipe-down' : 'swipe-up';
  }

  phone.addEventListener('pointerdown', (event) => {
    if (transitioning) {
      return;
    }
    pointerOrigin = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId
    };
  });

  phone.addEventListener('pointerup', (event) => {
    if (!pointerOrigin || pointerOrigin.pointerId !== event.pointerId) {
      pointerOrigin = null;
      return;
    }
    const origin = pointerOrigin;
    pointerOrigin = null;
    const deltaX = event.clientX - origin.x;
    const deltaY = event.clientY - origin.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < SWIPE_THRESHOLD_PIXELS) {
      return;
    }
    suppressClick = true;
    window.setTimeout(() => {
      suppressClick = false;
    }, CLICK_SUPPRESSION_MILLISECONDS);
    const hotspot = hotspotAt(origin.x, origin.y, swipeGesture(deltaX, deltaY));
    if (hotspot) {
      activateHotspot(hotspot);
    }
  });

  phone.addEventListener('pointercancel', () => {
    pointerOrigin = null;
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }
    const target = event.target;
    if (
      target &&
      (target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT')
    ) {
      return;
    }
    const screens = currentPlatform().screens;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        showScreen(screenIndex + 1, {});
        break;
      case 'ArrowLeft':
        event.preventDefault();
        showScreen(screenIndex - 1, {});
        break;
      case 'Home':
        event.preventDefault();
        showScreen(0, {});
        break;
      case 'End':
        event.preventDefault();
        showScreen(screens.length - 1, {});
        break;
      default:
        break;
    }
  });

  window.addEventListener('hashchange', () => {
    const parsed = parseHash();
    if (!parsed) {
      return;
    }
    let platformChanged = false;
    if (parsed.platformKey !== platformKey) {
      platformChanged = true;
      platformKey = parsed.platformKey;
      phone.style.setProperty(
        '--walkthrough-aspect',
        String(platforms[platformKey].aspect_ratio)
      );
      renderPlatformButtons();
      screenIndex = 0;
    }
    if (platformChanged || parsed.screenIndex !== screenIndex) {
      showScreen(parsed.screenIndex, {});
    }
  });

  const initial = parseHash();
  const initialPlatform = initial ? initial.platformKey : DEFAULT_PLATFORM;
  const initialScreen = initial ? initial.screenIndex : 0;
  platformKey = initialPlatform;
  screenIndex = 0;
  phone.style.setProperty(
    '--walkthrough-aspect',
    String(platforms[initialPlatform].aspect_ratio)
  );
  renderPlatformButtons();
  showScreen(initialScreen, {});
})();
