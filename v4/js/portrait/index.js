import './portrait.css';
import {
  FIXED_STEP,
  PORTRAIT_MODES,
  fitPortraitProjection,
  hexToRgb,
  normalizeSeed,
  parsePortraitParams,
  selectPortraitTier,
} from './math.js';
import { createPortraitRenderer } from './webgl.js';

function validMode(value) {
  return PORTRAIT_MODES.includes(value) ? value : 'idle';
}

function readPalette(element) {
  const styles = getComputedStyle(element);
  const value = (name, fallback) => hexToRgb(styles.getPropertyValue(name), fallback);
  return {
    void: value('--void', [0.024, 0.027, 0.039]),
    charge: value('--charge', [0.3, 0.95, 1]),
    heavy: value('--mass-heavy', [0.18, 0.42, 1]),
    mid: value('--mass-mid', [1, 0.69, 0.13]),
    light: value('--mass-light', [1, 0.24, 0.51]),
  };
}

function supportsPortraitWebGL() {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    if (!gl) return false;
    const supported =
      Boolean(gl.getExtension('EXT_color_buffer_float')) &&
      gl.getParameter(gl.MAX_DRAW_BUFFERS) >= 2;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return supported;
  } catch {
    return false;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.json();
}

async function fetchBitmap(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

async function loadResources(assetSuffix) {
  const [colour, depth, matte, metadata, signals, event] = await Promise.all([
    fetchBitmap(`/img/portrait/colour${assetSuffix}.webp`),
    fetchBitmap(`/img/portrait/depth${assetSuffix}.png`),
    fetchBitmap(`/img/portrait/matte${assetSuffix}.png`),
    fetchJson(`/img/portrait/portrait${assetSuffix}.json`),
    fetchJson('/data/signals.json'),
    fetchJson('/data/event.json'),
  ]);
  return {
    assets: { colour, depth, matte, metadata },
    data: {
      score: signals.score,
      stride: signals.stride,
      tracks: event.events?.[0]?.tracks || [],
      muons: event.events?.[0]?.muons || [],
    },
  };
}

function createInterface(element, initialMode) {
  element.classList.add('portrait-field');
  const canvas = document.createElement('canvas');
  canvas.className = 'portrait-field__canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'Portrait of Joseph formed from a living three-dimensional field of points.',
  );

  const chrome = document.createElement('div');
  chrome.className = 'portrait-field__chrome';
  const title = document.createElement('p');
  title.className = 'portrait-field__title';
  title.textContent = 'SELF, AS A FIELD';
  const controls = document.createElement('div');
  controls.className = 'portrait-field__controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Portrait field mode');
  const buttons = new Map();
  PORTRAIT_MODES.forEach((mode) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'portrait-field__control';
    button.dataset.mode = mode;
    button.textContent = mode.toUpperCase();
    button.setAttribute('aria-pressed', String(mode === initialMode));
    controls.append(button);
    buttons.set(mode, button);
  });
  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'portrait-field__control portrait-field__sound';
  sound.textContent = 'SOUND OFF';
  sound.setAttribute('aria-pressed', 'false');
  sound.hidden = initialMode !== 'musician';
  const context = document.createElement('p');
  context.className = 'portrait-field__context';
  context.setAttribute('aria-live', 'polite');
  chrome.append(title, controls, sound, context);
  element.append(canvas, chrome);
  return { canvas, chrome, controls, buttons, sound, context };
}

async function renderFallback(element, reason) {
  element.classList.add('portrait-field', 'portrait-field--fallback');
  const figure = document.createElement('figure');
  figure.className = 'portrait-field__poster';
  const image = document.createElement('img');
  image.src = '/img/portrait/colour.webp';
  image.alt = 'Portrait of Joseph Bailey';
  const caption = document.createElement('figcaption');
  caption.textContent = reason;
  figure.append(image, caption);
  element.replaceChildren(figure);
  await image.decode().catch(() => {});
}

function modeContext(mode, data) {
  if (mode === 'musician') {
    return `${data.score?.notes?.length || 0} transcribed notes · sound optional`;
  }
  if (mode === 'runner') {
    return `${data.stride?.touchdownTimes?.length || 0} hurdles · ${data.stride?.finishTime || '—'} s`;
  }
  if (mode === 'physicist') {
    return `${data.tracks?.length || 0} CMS tracks · ${data.muons?.length || 0} muons`;
  }
  return 'pointer-responsive portrait volume';
}

export default function mountPortraitField(el, options = {}) {
  const {
    mode: optionMode = 'idle',
    seed: optionSeed = 17,
    onSoundPreference = () => {},
  } = options;
  const query = new URLSearchParams(window.location.search);
  const parsed = parsePortraitParams(window.location.search);
  let currentMode = query.has('portrait') ? parsed.mode : validMode(optionMode);
  const seed = query.has('seed') ? parsed.seed : normalizeSeed(optionSeed);
  let usingFallback = false;
  let destroyed = false;
  let renderer = null;
  let ui = null;
  let resizeObserver = null;
  let intersectionObserver = null;
  let animationFrame = 0;
  let previousTime = null;
  let accumulator = 0;
  let visible = !document.hidden;
  let intersecting = true;
  let fpsStart = 0;
  let fpsFrames = 0;
  let fps = 0;
  let audio = null;
  let soundEnabled = false;
  let resources = null;
  const pointer = {
    active: false,
    x: 0.5,
    y: 0.5,
    velocityX: 0,
    velocityY: 0,
    strength: 0,
    previousX: 0.5,
    previousY: 0.5,
    eventX: 0.5,
    eventY: 0.5,
    previousTime: 0,
    dragging: false,
  };
  const capturePaused = parsed.hasFrame;
  const debug = {
    fps: 0,
    pointCount: 0,
    tier: 'pending',
    mode: currentMode,
    seed,
    frame: 0,
  };

  el.dataset.state = 'loading';
  el.dataset.mode = currentMode;
  el.dataset.seed = String(seed);

  function updateDebugOverlay() {
    if (!ui?.debug) return;
    const readout = [
      `POINTS ${debug.pointCount.toLocaleString('en-US')}`,
      `TIER ${debug.tier.toUpperCase()}`,
      `MODE ${currentMode.toUpperCase()}`,
      `SEED ${seed}`,
      `FRAME ${renderer?.step || 0}`,
    ];
    if (!capturePaused && fps > 0) readout.unshift(`FPS ${fps.toFixed(1)}`);
    ui.debug.textContent = readout.join(' · ');
  }

  function stopLoop() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousTime = null;
    audio?.pause();
  }

  function shouldAnimate() {
    return !destroyed && !capturePaused && visible && intersecting && Boolean(renderer);
  }

  function frame(time) {
    animationFrame = 0;
    if (!shouldAnimate()) return;
    if (previousTime === null) {
      previousTime = time;
      fpsStart = time;
    }
    const delta = Math.min(0.1, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    accumulator += delta;
    let substeps = 0;
    while (accumulator >= FIXED_STEP && substeps < 8) {
      renderer.advance(pointer);
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
      if (pointer.dragging) {
        pointer.velocityX *= 0.86;
        pointer.velocityY *= 0.86;
        pointer.strength = Math.max(0.58, pointer.strength * 0.9);
      } else {
        pointer.strength *= 0.88;
        if (pointer.strength < 0.015) pointer.active = false;
      }
      accumulator -= FIXED_STEP;
      substeps += 1;
    }
    renderer.render();
    fpsFrames += 1;
    if (time - fpsStart >= 500) {
      fps = (fpsFrames * 1000) / Math.max(1, time - fpsStart);
      debug.fps = fps;
      fpsFrames = 0;
      fpsStart = time;
      el.dataset.fps = fps.toFixed(1);
      updateDebugOverlay();
    }
    animationFrame = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (!shouldAnimate() || animationFrame) return;
    previousTime = null;
    if (soundEnabled && currentMode === 'musician') audio?.play().catch(() => {});
    animationFrame = requestAnimationFrame(frame);
  }

  function syncModeUi() {
    el.dataset.mode = currentMode;
    debug.mode = currentMode;
    renderer?.setMode(currentMode);
    ui?.buttons.forEach((button, buttonMode) => {
      button.setAttribute('aria-pressed', String(buttonMode === currentMode));
    });
    if (ui) {
      ui.sound.hidden = currentMode !== 'musician';
      if (resources) ui.context.textContent = modeContext(currentMode, resources.data);
    }
    if (currentMode !== 'musician' && soundEnabled) {
      soundEnabled = false;
      audio?.pause();
      if (ui) {
        ui.sound.textContent = 'SOUND OFF';
        ui.sound.setAttribute('aria-pressed', 'false');
      }
      onSoundPreference(false);
    }
    updateDebugOverlay();
  }

  function setMode(nextMode, updateUrl = true) {
    currentMode = validMode(nextMode);
    syncModeUi();
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('portrait', currentMode);
      history.replaceState(history.state, '', url);
    }
  }

  function resize() {
    if (!renderer || !ui) return;
    const rect = el.getBoundingClientRect();
    renderer.resize(rect.width || window.innerWidth, rect.height || window.innerHeight);
    renderer.render();
  }

  function pointerPosition(event) {
    const rect = ui.canvas.getBoundingClientRect();
    const fit = fitPortraitProjection(rect.width, rect.height);
    const clipX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const clipY = 1 - ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2;
    return {
      x: Math.max(-0.25, Math.min(1.25, clipX / fit[0] / 1.88 + 0.5)),
      y: Math.max(-0.25, Math.min(1.25, clipY / fit[1] / 1.88 + 0.5)),
    };
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    const position = pointerPosition(event);
    pointer.x = position.x;
    pointer.y = position.y;
    pointer.previousX = position.x;
    pointer.previousY = position.y;
    pointer.eventX = position.x;
    pointer.eventY = position.y;
    pointer.previousTime = event.timeStamp;
    pointer.velocityX = 0;
    pointer.velocityY = 0;
    pointer.strength = 0.25;
    pointer.dragging = true;
    pointer.active = true;
    ui.canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    const position = pointerPosition(event);
    const previousX = pointer.eventX;
    const previousY = pointer.eventY;
    const elapsed = Math.max(0.008, Math.min(0.08, (event.timeStamp - pointer.previousTime) / 1000));
    let velocityX = (position.x - previousX) / elapsed;
    let velocityY = (position.y - previousY) / elapsed;
    const rawSpeed = Math.hypot(velocityX, velocityY);
    if (rawSpeed > 4) {
      velocityX *= 4 / rawSpeed;
      velocityY *= 4 / rawSpeed;
    }
    const speed = Math.hypot(velocityX, velocityY);
    pointer.eventX = position.x;
    pointer.eventY = position.y;
    pointer.previousTime = event.timeStamp;
    pointer.x = position.x;
    pointer.y = position.y;
    pointer.velocityX = velocityX;
    pointer.velocityY = velocityY;
    pointer.strength = pointer.dragging ? 0.55 + speed * 0.48 : 0.16;
    pointer.active = true;
  }

  function onPointerEnd() {
    pointer.dragging = false;
    pointer.active = false;
    pointer.strength = 0;
    pointer.velocityX = 0;
    pointer.velocityY = 0;
  }

  async function toggleSound() {
    if (soundEnabled) {
      soundEnabled = false;
      audio?.pause();
    } else {
      audio ||= new Audio('/audio/fugue.m4a');
      audio.loop = true;
      audio.currentTime =
        ((renderer?.step || 0) * FIXED_STEP) % (resources?.data.score?.duration || 125.967);
      try {
        await audio.play();
        soundEnabled = true;
      } catch {
        soundEnabled = false;
        ui.context.textContent = 'Audio could not start; the note-driven field remains active.';
      }
    }
    ui.sound.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
    ui.sound.setAttribute('aria-pressed', String(soundEnabled));
    onSoundPreference(soundEnabled);
  }

  const ready = (async () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const webgl = supportsPortraitWebGL();
    if (reducedMotion || !webgl) {
      usingFallback = true;
      await renderFallback(
        el,
        reducedMotion
          ? 'Static portrait shown because reduced motion is enabled.'
          : 'Static portrait shown because WebGL2 is unavailable.',
      );
      el.dataset.state = 'fallback';
      return;
    }

    const tier = selectPortraitTier({
      width: el.clientWidth || window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency: navigator.hardwareConcurrency || 8,
      deviceMemory: navigator.deviceMemory || 8,
    });
    resources = await loadResources(tier.assetSuffix);
    if (destroyed) {
      resources.assets.colour.close();
      resources.assets.depth.close();
      resources.assets.matte.close();
      return;
    }

    ui = createInterface(el, currentMode);
    if (el.dataset.debug === 'true') {
      ui.debug = document.createElement('output');
      ui.debug.className = 'portrait-field__debug';
      el.append(ui.debug);
    }
    renderer = createPortraitRenderer({
      canvas: ui.canvas,
      tier,
      seed,
      assets: resources.assets,
      data: resources.data,
      colors: readPalette(el),
      mode: currentMode,
    });
    debug.pointCount = tier.pointCount;
    debug.tier = tier.name;
    el.dataset.tier = tier.name;
    el.dataset.pointCount = String(tier.pointCount);

    ui.buttons.forEach((button, buttonMode) => {
      button.addEventListener('click', () => setMode(buttonMode));
    });
    ui.sound.addEventListener('click', toggleSound);
    ui.canvas.addEventListener('pointerdown', onPointerDown);
    ui.canvas.addEventListener('pointermove', onPointerMove);
    ui.canvas.addEventListener('pointerup', onPointerEnd);
    ui.canvas.addEventListener('pointercancel', onPointerEnd);
    ui.canvas.addEventListener('pointerleave', onPointerEnd);

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();
    syncModeUi();

    if (capturePaused) {
      for (let index = 0; index < parsed.frame; index += 1) renderer.advance(null);
      renderer.render();
    }
    debug.frame = renderer.step;
    updateDebugOverlay();

    intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        if (shouldAnimate()) startLoop();
        else stopLoop();
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(el);
    const onVisibility = () => {
      visible = !document.hidden;
      if (shouldAnimate()) startLoop();
      else stopLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    ui.onVisibility = onVisibility;

    el.dataset.state = 'ready';
    startLoop();
  })().catch(async (error) => {
    if (destroyed) return;
    usingFallback = true;
    renderer?.destroy();
    renderer = null;
    await renderFallback(el, 'Static portrait shown because the point field could not start.');
    el.dataset.error = error instanceof Error ? error.message : 'Unknown error';
    el.dataset.state = 'fallback';
  });

  return {
    setMode,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (ui?.onVisibility) document.removeEventListener('visibilitychange', ui.onVisibility);
      audio?.pause();
      audio = null;
      renderer?.destroy();
      resources?.assets.colour.close();
      resources?.assets.depth.close();
      resources?.assets.matte.close();
      el.replaceChildren();
      el.classList.remove('portrait-field', 'portrait-field--fallback');
      delete el.dataset.state;
    },
    ready,
    get usingFallback() {
      return usingFallback;
    },
    getSimulationDigest() {
      return renderer?.getDigest() || (usingFallback ? 'fallback' : 'loading');
    },
    getDisplacementStats(threshold = 0.02) {
      return renderer?.getDisplacementStats(threshold) || null;
    },
    debugState() {
      return {
        ...debug,
        mode: currentMode,
        frame: renderer?.step || 0,
        digest: renderer?.getDigest() || (usingFallback ? 'fallback' : 'loading'),
        paused: capturePaused || !visible || !intersecting,
        interaction: {
          active: pointer.active,
          dragging: pointer.dragging,
          strength: pointer.strength,
          velocity: [pointer.velocityX, pointer.velocityY],
        },
      };
    },
  };
}
