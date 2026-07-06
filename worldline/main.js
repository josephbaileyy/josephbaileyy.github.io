import { createGroundController } from './js/core/ground.js';
import { createSceneLifecycle, getReducedMotionPreference } from './js/core/lifecycle.js';
import { createScrollRuntime } from './js/core/scroll.js';
import { createTelemetry } from './js/core/telemetry.js';
import { createCollisionScene } from './js/scene-collision/collision.js';
import { createScene as createMusicScene } from './js/scene-music/index.js';
import { createScene as createResearchScene } from './js/scene-research/index.js';
import { createScene as createTrackScene } from './js/scene-track/index.js';

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smootherStep(value) {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

const reducedMotion = getReducedMotionPreference();
document.documentElement.classList.toggle('is-reduced-motion', reducedMotion);

const fugueAudioUrl = new URL('./assets/audio/fugue.m4a', import.meta.url).href;
const fuguePeaksUrl = new URL('./assets/audio/fugue-peaks.json', import.meta.url).href;

const collisionCanvas = document.querySelector('#collision-canvas');
const collisionHud = document.querySelector('#collision-event-hud-readout');
const collisionChapter = document.querySelector('#chapter-collision');
const collisionScene = createCollisionScene({
  canvas: collisionCanvas,
  hud: collisionHud,
  reducedMotion,
});
const lifecycle = createSceneLifecycle({ reducedMotion });
const scrollRuntime = createScrollRuntime({ reducedMotion });
const ground = createGroundController();
const telemetry = createTelemetry();
const handoffScrub = document.querySelector('[data-scrub="collision-handoff"]');

function getHandoffProgress(state) {
  return state.scrubs.get('collision-handoff')?.progress ?? (reducedMotion ? 1 : 0);
}

function getScrollPx(element) {
  if (!element) {
    return 0;
  }

  const top = element.getBoundingClientRect().top + window.scrollY;
  return Math.max(0, window.scrollY - top);
}

function createLifecycleAdapter(scene) {
  let entered = false;

  return {
    mount() {
      if (!entered) {
        scene.onEnter?.();
        entered = true;
      }
    },
    resume() {
      if (!entered) {
        scene.onEnter?.();
        entered = true;
      }
    },
    pause() {
      if (entered) {
        scene.onExit?.();
        entered = false;
      }
    },
    renderEndState() {
      scene.onProgress?.(1);
      scene.onParallax?.(0);
      scene.onEnter?.();
    },
    unmount() {
      scene.dispose?.();
      entered = false;
    },
  };
}

function createSceneRecord({ id, chapterSelector, rootSelector, create }) {
  const chapter = document.querySelector(chapterSelector);
  const root = document.querySelector(rootSelector);

  if (!chapter || !root || !create) {
    return null;
  }

  return {
    chapter,
    id,
    root,
    scene: create(root),
  };
}

const sceneRecords = [
  createSceneRecord({
    id: 'research',
    chapterSelector: '#chapter-research',
    rootSelector: '#research-scene',
    create: (root) => createResearchScene(root, { reducedMotion }),
  }),
  createSceneRecord({
    id: 'track',
    chapterSelector: '#chapter-track',
    rootSelector: '#track-scene',
    create: (root) => createTrackScene(root, { reducedMotion }),
  }),
  createSceneRecord({
    id: 'music',
    chapterSelector: '#chapter-music',
    rootSelector: '#music-scene',
    create: (root) => createMusicScene(root, {
      audioUrl: fugueAudioUrl,
      peaksUrl: fuguePeaksUrl,
      reducedMotion,
    }),
  }),
].filter(Boolean);

function updateExperienceScene(progress) {
  const chapter = document.querySelector('#chapter-experience');

  if (!chapter) {
    return;
  }

  const p = clamp01(progress);
  const entry = smootherStep((p - 0.16) / 0.22);
  chapter.style.setProperty('--experience-rule-offset', (500 * (1 - p)).toFixed(2));
  chapter.style.setProperty('--experience-entry-opacity', entry.toFixed(3));
  chapter.style.setProperty('--experience-entry-y', `${((1 - entry) * 1.2).toFixed(3)}rem`);
}

function updateContactScene(progress) {
  const chapter = document.querySelector('#chapter-contact');

  if (!chapter) {
    return;
  }

  const p = clamp01(progress);
  const line = clamp01(p / 0.6);
  const lineEase = 1 - Math.pow(1 - line, 3);
  const point = smootherStep((p - 0.55) / 0.15);
  const panel = smootherStep((p - 0.5) / 0.2);
  // non-scaling-stroke makes dashes screen-space in Chromium: dash length must
  // match the rendered path width, not the 640 user-unit length
  const lineEl = chapter.querySelector('.contact-line');
  const screenLen = lineEl ? Math.max(lineEl.getBoundingClientRect().width, 1) : 640;
  if (lineEl) lineEl.style.strokeDasharray = screenLen.toFixed(2);
  chapter.style.setProperty('--contact-line-offset', (screenLen * (1 - lineEase)).toFixed(2));
  chapter.style.setProperty('--contact-point-opacity', point.toFixed(3));
  chapter.style.setProperty('--contact-panel-opacity', panel.toFixed(3));
}

lifecycle.register({
  element: collisionChapter,
  scene: collisionScene,
  unmountWhen: ({ handoffProgress }) => !reducedMotion && handoffProgress >= 0.996,
});

sceneRecords.forEach((record) => {
  lifecycle.register({
    element: record.chapter,
    scene: createLifecycleAdapter(record.scene),
  });
});

scrollRuntime.onUpdate((state) => {
  const handoffProgress = getHandoffProgress(state);

  ground.update(state);
  telemetry.update(state);

  lifecycle.tick({ ...state, handoffProgress });

  sceneRecords.forEach((record) => {
    const scrub = state.scrubs.get(record.id);

    if (!scrub) {
      return;
    }

    record.scene.onProgress?.(scrub.progress);
    record.scene.onParallax?.(getScrollPx(scrub.element));
  });

  updateExperienceScene(state.scrubs.get('experience')?.progress ?? (reducedMotion ? 1 : 0));
  updateContactScene(state.scrubs.get('contact')?.progress ?? (reducedMotion ? 1 : 0));

  if (collisionScene.isActive()) {
    collisionScene.update({
      idle: state.idle,
      scrubProgress: handoffProgress,
      time: state.time,
    });
  }

  window.__worldlineDebug = {
    handoffProgress,
    reducedMotion,
    sceneProgress: Object.fromEntries(
      [...state.scrubs.entries()].map(([id, scrub]) => [id, scrub.progress]),
    ),
    webglRetired: collisionScene.isRetired(),
    webglRenderCount: collisionScene.getRenderCount(),
  };
});

window.addEventListener('resize', () => {
  collisionScene.resize();
});

updateExperienceScene(reducedMotion ? 1 : 0);
updateContactScene(reducedMotion ? 1 : 0);
scrollRuntime.start();

window.addEventListener('pagehide', () => {
  scrollRuntime.destroy();
  lifecycle.destroy();
});
