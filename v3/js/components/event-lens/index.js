import * as THREE from 'three';
import './event-lens.css';
import { createEventVisuals, summarizeEvent } from './event-geometry.js';
import { renderEventFallback } from './fallback.js';
import { compositeFragmentShader, compositeVertexShader } from './shaders.js';

const MODES = ['all', 'tracks', 'muons', 'energy'];
const MODE_LABELS = {
  all: 'All detector layers',
  tracks: 'Charged-particle tracks',
  muons: 'Muon tracks',
  energy: 'Calorimeter energy',
};
const DEFAULT_LENS = { x: 0.5, y: 0.5 };
const MODE_DEFAULT_LENS = {
  all: DEFAULT_LENS,
  tracks: DEFAULT_LENS,
  muons: { x: 0.3, y: 0.68 },
  energy: { x: 0.67, y: 0.25 },
};
const EVENT_SOURCE = 'https://opendata.cern.ch/record/303';
let instanceNumber = 0;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function validMode(value) {
  return MODES.includes(value);
}

function finiteQueryValue(params, key) {
  const value = Number.parseFloat(params.get(key));
  return Number.isFinite(value) ? clamp01(value) : null;
}

function parseInitialState(options) {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const optionMode = validMode(options.mode) ? options.mode : 'all';
  const queryMode = params.get('mode');
  const mode = validMode(queryMode) ? queryMode : optionMode;
  const eventQuery = Number.parseInt(params.get('event'), 10);
  const optionEvent = Number.isFinite(options.eventIndex) ? Math.trunc(options.eventIndex) : 0;
  const modeLens = MODE_DEFAULT_LENS[mode];
  const optionLens = {
    x: clamp01(Number.isFinite(options.lens?.x) ? options.lens.x : modeLens.x),
    y: clamp01(Number.isFinite(options.lens?.y) ? options.lens.y : modeLens.y),
  };

  return {
    mode,
    lens: {
      x: finiteQueryValue(params, 'lensx') ?? optionLens.x,
      y: finiteQueryValue(params, 'lensy') ?? optionLens.y,
    },
    eventIndex: Number.isFinite(eventQuery) ? eventQuery : optionEvent,
    forceFallback: params.get('fallback') === '1',
  };
}

function createShell(el, state) {
  const id = `event-lens-${++instanceNumber}`;
  const descriptionId = `${id}-description`;
  const liveId = `${id}-live`;
  const modeName = `${id}-mode`;

  el.replaceChildren();
  el.classList.add('event-lens');
  el.dataset.state = 'loading';

  const description = document.createElement('p');
  description.id = descriptionId;
  description.className = 'event-lens__visually-hidden';
  description.textContent =
    'Interactive transverse view of a real CMS collision event. Red and blue tracks curve from the beamline according to measured charge and transverse momentum. White tracks identify muons, and polar amber cells show calorimeter energy. Move the circular lens to inspect the selected detector layer.';

  const stage = document.createElement('div');
  stage.className = 'event-lens__stage';
  stage.setAttribute('aria-describedby', descriptionId);

  const canvas = document.createElement('canvas');
  canvas.className = 'event-lens__canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const header = document.createElement('div');
  header.className = 'event-lens__readout event-lens__readout--top';
  const sourceLabel = document.createElement('span');
  sourceLabel.textContent = 'CMS OPEN DATA';
  const eventLabel = document.createElement('span');
  eventLabel.textContent = 'LOADING EVENT';
  header.append(sourceLabel, eventLabel);

  const footer = document.createElement('div');
  footer.className = 'event-lens__readout event-lens__readout--bottom';
  const countLabel = document.createElement('span');
  countLabel.textContent = '— TRACKS';
  const legend = document.createElement('span');
  legend.className = 'event-lens__legend';
  legend.innerHTML =
    '<i class="is-positive"></i>q+ <i class="is-negative"></i>q− <i class="is-muon"></i>μ';
  footer.append(countLabel, legend);

  const handle = document.createElement('div');
  handle.className = 'event-lens__handle';
  handle.tabIndex = 0;
  handle.setAttribute('role', 'slider');
  handle.setAttribute('aria-label', 'Inspection lens position');
  handle.setAttribute('aria-valuemin', '0');
  handle.setAttribute('aria-valuemax', '100');
  handle.setAttribute('aria-describedby', descriptionId);

  const loading = document.createElement('div');
  loading.className = 'event-lens__loading';
  loading.setAttribute('role', 'status');
  loading.textContent = 'Resolving CMS event…';

  stage.append(canvas, header, footer, handle, loading);

  const controls = document.createElement('fieldset');
  controls.className = 'event-lens__controls';
  const controlLegend = document.createElement('legend');
  controlLegend.className = 'event-lens__visually-hidden';
  controlLegend.textContent = 'Layer revealed inside the lens';
  controls.append(controlLegend);
  const inputs = new Map();

  MODES.forEach((mode) => {
    const inputId = `${id}-${mode}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = modeName;
    input.id = inputId;
    input.value = mode;
    input.checked = mode === state.mode;
    const label = document.createElement('label');
    label.htmlFor = inputId;
    label.textContent = mode.toUpperCase();
    controls.append(input, label);
    inputs.set(mode, input);
  });

  const live = document.createElement('p');
  live.id = liveId;
  live.className = 'event-lens__visually-hidden';
  live.setAttribute('aria-live', 'polite');
  live.textContent = `${MODE_LABELS[state.mode]} selected`;

  const credit = document.createElement('p');
  credit.className = 'event-lens__credit';
  credit.append('Collision data: ');
  const creditLink = document.createElement('a');
  creditLink.href = EVENT_SOURCE;
  creditLink.textContent = 'CMS Open Data';
  const licence = document.createElement('span');
  licence.textContent = ' · CC0';
  credit.append(creditLink, licence);

  el.append(description, stage, controls, live, credit);
  return {
    canvas,
    controls,
    countLabel,
    description,
    eventLabel,
    handle,
    inputs,
    live,
    loading,
    stage,
  };
}

function makeCompositeScene(baseTarget, detailTarget, lens, pixelRatio) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: baseTarget.texture },
      uDetail: { value: detailTarget.texture },
      uLens: { value: new THREE.Vector2(lens.x, 1 - lens.y) },
      uRadius: { value: 0.228 },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: compositeVertexShader,
    fragmentShader: compositeFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);
  return {
    scene,
    camera,
    material,
    dispose() {
      quad.geometry.dispose();
      material.dispose();
    },
  };
}

/**
 * @param {HTMLElement} el
 * @param {{
 *   mode?: 'all'|'tracks'|'muons'|'energy',
 *   lens?: {x:number,y:number},
 *   eventIndex?: number,
 *   src?: string
 * }} [options]
 * @returns {{
 *   setMode(m:'all'|'tracks'|'muons'|'energy'):void,
 *   setLens(x:number,y:number):void,
 *   destroy():void,
 *   ready:Promise<void>,
 *   readonly usingFallback:boolean
 * }}
 */
export default function mountEventLens(el, options = {}) {
  if (!(el instanceof HTMLElement)) {
    throw new TypeError('mountEventLens requires an HTMLElement');
  }

  const initial = parseInitialState(options);
  const shell = createShell(el, initial);
  const reducedMotion =
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const source = options.src ?? el.dataset.eventSrc ?? './data/event.json';
  const abortController = new AbortController();
  const state = {
    currentLens: { ...initial.lens },
    destroyed: false,
    documentVisible: document.visibilityState !== 'hidden',
    event: null,
    fallback: null,
    fallbackActive: false,
    intersecting: true,
    mode: initial.mode,
    pointerId: null,
    raf: 0,
    targetLens: { ...initial.lens },
  };
  const cleanup = [];
  let renderer = null;
  let baseTarget = null;
  let detailTarget = null;
  let composite = null;
  let eventVisuals = null;
  let baseScene = null;
  let detailScene = null;
  let eventCamera = null;
  let resizeObserver = null;
  let intersectionObserver = null;
  let resolveReady;
  let readyResolved = false;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  function listen(target, type, handler, eventOptions) {
    target.addEventListener(type, handler, eventOptions);
    cleanup.push(() => target.removeEventListener(type, handler, eventOptions));
  }

  function markReady(kind) {
    if (state.destroyed) {
      return;
    }
    shell.loading.remove();
    el.dataset.state = kind;
    if (readyResolved) {
      return;
    }
    readyResolved = true;
    resolveReady();
    el.dispatchEvent(new CustomEvent('event-lens:ready', { bubbles: true }));
  }

  function updateLensDom() {
    const { x, y } = state.currentLens;
    shell.handle.style.setProperty('--lens-x', `${x * 100}%`);
    shell.handle.style.setProperty('--lens-y', `${y * 100}%`);
    shell.handle.setAttribute('aria-valuenow', String(Math.round(x * 100)));
    shell.handle.setAttribute(
      'aria-valuetext',
      `${Math.round(x * 100)}% from left, ${Math.round(y * 100)}% from top`,
    );
    state.fallback?.setLens(x, y);
    if (composite) {
      composite.material.uniforms.uLens.value.set(x, 1 - y);
    }
  }

  function updateModeUi(announce = true) {
    shell.inputs.get(state.mode).checked = true;
    eventVisuals?.setMode(state.mode);
    state.fallback?.setMode(state.mode);
    if (announce) {
      shell.live.textContent = `${MODE_LABELS[state.mode]} selected`;
    }
  }

  function renderNow(force = false) {
    if (
      !renderer ||
      !baseTarget ||
      !detailTarget ||
      !composite ||
      !eventVisuals ||
      (!force && (!state.intersecting || !state.documentVisible))
    ) {
      return;
    }

    renderer.setRenderTarget(baseTarget);
    renderer.setClearColor(0x07090d, 1);
    renderer.clear();
    renderer.render(baseScene, eventCamera);

    renderer.setRenderTarget(detailTarget);
    renderer.setClearColor(0x07090d, 1);
    renderer.clear();
    renderer.render(detailScene, eventCamera);

    renderer.setRenderTarget(null);
    renderer.setClearColor(0x07090d, 1);
    renderer.clear();
    renderer.render(composite.scene, composite.camera);
  }

  function tick() {
    state.raf = 0;
    if (state.destroyed || !state.intersecting || !state.documentVisible) {
      return;
    }

    const dx = state.targetLens.x - state.currentLens.x;
    const dy = state.targetLens.y - state.currentLens.y;
    if (reducedMotion || Math.hypot(dx, dy) < 0.0006) {
      state.currentLens = { ...state.targetLens };
    } else {
      state.currentLens.x += dx * 0.22;
      state.currentLens.y += dy * 0.22;
    }
    updateLensDom();
    renderNow();

    if (
      !reducedMotion &&
      Math.hypot(
        state.targetLens.x - state.currentLens.x,
        state.targetLens.y - state.currentLens.y,
      ) >= 0.0006
    ) {
      state.raf = requestAnimationFrame(tick);
    }
  }

  function requestRender() {
    if (state.fallbackActive) {
      updateLensDom();
      return;
    }
    if (!state.raf && state.intersecting && state.documentVisible) {
      state.raf = requestAnimationFrame(tick);
    }
  }

  function setLens(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || state.destroyed) {
      return;
    }
    state.targetLens = { x: clamp01(x), y: clamp01(y) };
    if (reducedMotion || state.fallbackActive) {
      state.currentLens = { ...state.targetLens };
      updateLensDom();
      renderNow();
      return;
    }
    requestRender();
  }

  function setMode(mode) {
    if (!validMode(mode) || state.destroyed || mode === state.mode) {
      return;
    }
    state.mode = mode;
    updateModeUi();
    const modeLens = MODE_DEFAULT_LENS[mode];
    setLens(modeLens.x, modeLens.y);
  }

  function resize() {
    if (!renderer || !baseTarget || !detailTarget || !composite) {
      return;
    }
    const size = Math.max(1, Math.round(shell.stage.getBoundingClientRect().width || 640));
    const compact = size < 520;
    const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, compact ? 1.4 : 1.85);
    const pixels = Math.max(1, Math.round(size * pixelRatio));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size, size, false);
    baseTarget.setSize(pixels, pixels);
    detailTarget.setSize(pixels, pixels);
    composite.material.uniforms.uPixelRatio.value = pixelRatio;
    renderNow();
  }

  function updateReadout(event) {
    if (!event) {
      shell.eventLabel.textContent = 'EVENT DATA UNAVAILABLE';
      shell.countLabel.textContent = 'STATIC SCHEMATIC';
      return;
    }
    const stats = summarizeEvent(event);
    shell.eventLabel.textContent = `RUN ${stats.run} · EVENT ${stats.event}`;
    shell.countLabel.textContent = `${stats.tracks} TRK · ${stats.muons} μ · ΣpT ${stats.sumPt} GeV`;
    shell.description.textContent =
      `Interactive transverse view of CMS run ${stats.run}, event ${stats.event}: ` +
      `${stats.tracks} charged-particle tracks, ${stats.muons} muon${
        stats.muons === 1 ? '' : 's'
      }, and ${stats.cells} calorimeter energy cells. ` +
      'Track direction and curvature are derived from measured phi, charge, transverse momentum, and eta.';
  }

  function enterFallback(reason) {
    if (state.destroyed || state.fallbackActive) {
      return;
    }
    state.fallbackActive = true;
    state.fallback = renderEventFallback(shell.stage, state.event, {
      mode: state.mode,
      lens: state.currentLens,
      reason,
    });
    shell.handle.classList.add('is-static');
    updateReadout(state.event);
    updateModeUi(false);
    renderer?.dispose();
    renderer = null;
    markReady('fallback');
  }

  function setupWebgl(event) {
    if (initial.forceFallback) {
      enterFallback('forced');
      return;
    }

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: shell.canvas,
        antialias: true,
        alpha: false,
        depth: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
    } catch {
      enterFallback('webgl-unavailable');
      return;
    }

    if (!renderer.getContext()) {
      enterFallback('webgl-unavailable');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setAnimationLoop(null);
    const compact = (shell.stage.getBoundingClientRect().width || 640) < 520;
    eventVisuals = createEventVisuals(event, { compact, mode: state.mode });
    baseScene = new THREE.Scene();
    detailScene = new THREE.Scene();
    baseScene.add(eventVisuals.base);
    detailScene.add(eventVisuals.detail);
    eventCamera = new THREE.OrthographicCamera(-3.85, 3.85, 3.85, -3.85, 0.1, 20);
    eventCamera.position.set(0, 0, 8);
    eventCamera.lookAt(0, 0, 0);

    baseTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    detailTarget = baseTarget.clone();
    composite = makeCompositeScene(baseTarget, detailTarget, state.currentLens, 1);
    updateReadout(event);
    updateLensDom();
    resize();

    listen(shell.canvas, 'webglcontextlost', (eventObject) => {
      eventObject.preventDefault();
      enterFallback('context-lost');
    });

    if ('ResizeObserver' in globalThis) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(shell.stage);
    } else {
      listen(globalThis, 'resize', resize);
    }
    requestAnimationFrame(() => {
      if (state.destroyed || state.fallbackActive) {
        return;
      }
      renderNow(true);
      markReady('ready');
    });
  }

  function lensFromPointer(event) {
    const bounds = shell.stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }
    setLens(
      (event.clientX - bounds.left) / bounds.width,
      (event.clientY - bounds.top) / bounds.height,
    );
  }

  listen(shell.controls, 'change', (event) => {
    if (event.target instanceof HTMLInputElement && validMode(event.target.value)) {
      setMode(event.target.value);
    }
  });

  listen(shell.stage, 'pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }
    state.pointerId = event.pointerId;
    shell.stage.setPointerCapture?.(event.pointerId);
    shell.handle.focus({ preventScroll: true });
    lensFromPointer(event);
  });
  listen(shell.stage, 'pointermove', (event) => {
    if (state.pointerId === event.pointerId) {
      lensFromPointer(event);
    }
  });
  const endPointer = (event) => {
    if (state.pointerId === event.pointerId) {
      shell.stage.releasePointerCapture?.(event.pointerId);
      state.pointerId = null;
    }
  };
  listen(shell.stage, 'pointerup', endPointer);
  listen(shell.stage, 'pointercancel', endPointer);

  listen(shell.handle, 'keydown', (event) => {
    const step = event.shiftKey ? 0.1 : 0.035;
    let { x, y } = state.targetLens;
    if (event.key === 'ArrowLeft') x -= step;
    else if (event.key === 'ArrowRight') x += step;
    else if (event.key === 'ArrowUp') y -= step;
    else if (event.key === 'ArrowDown') y += step;
    else if (event.key === 'Escape') ({ x, y } = DEFAULT_LENS);
    else return;
    event.preventDefault();
    setLens(x, y);
  });

  listen(document, 'visibilitychange', () => {
    state.documentVisible = document.visibilityState !== 'hidden';
    if (state.documentVisible) {
      requestRender();
    } else if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  });

  if ('IntersectionObserver' in globalThis) {
    intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      state.intersecting = Boolean(entry?.isIntersecting);
      if (state.intersecting) {
        requestRender();
      } else if (state.raf) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
      }
    });
    intersectionObserver.observe(el);
  }

  updateLensDom();
  updateModeUi(false);

  fetch(source, { signal: abortController.signal })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`CMS event request failed with ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (state.destroyed) {
        return;
      }
      const events = Array.isArray(data?.events) ? data.events : [];
      if (!events.length) {
        throw new Error('CMS event payload did not contain events');
      }
      const eventIndex = Math.min(events.length - 1, Math.max(0, Math.trunc(initial.eventIndex)));
      state.event = events[eventIndex];
      setupWebgl(state.event);
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        enterFallback('data-unavailable');
      }
    });

  function destroy() {
    if (state.destroyed) {
      return;
    }
    state.destroyed = true;
    abortController.abort();
    if (state.raf) {
      cancelAnimationFrame(state.raf);
    }
    cleanup.forEach((remove) => remove());
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    state.fallback?.destroy();
    eventVisuals?.dispose();
    composite?.dispose();
    baseTarget?.dispose();
    detailTarget?.dispose();
    renderer?.dispose();
    el.replaceChildren();
    delete el.dataset.state;
    if (!readyResolved) {
      readyResolved = true;
      resolveReady();
    }
  }

  return {
    setMode,
    setLens,
    destroy,
    ready,
    get usingFallback() {
      return state.fallbackActive;
    },
  };
}
