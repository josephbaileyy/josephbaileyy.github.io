import { createGroundController } from './js/core/ground.js';
import { createSceneLifecycle, getReducedMotionPreference } from './js/core/lifecycle.js';
import { createScrollRuntime } from './js/core/scroll.js';
import { createTelemetry } from './js/core/telemetry.js';
import { createCollisionScene } from './js/scene-collision/collision.js';

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
const fugueNotesUrl = new URL('./assets/audio/fugue-notes.json', import.meta.url).href;

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
const collisionHudShell = collisionHud?.closest('.collision-hud');

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

function createLazyScene(root, create, label) {
  let scene = null;
  let entered = false;
  let generation = 0;
  let loadPromise = null;
  let pendingProgress = reducedMotion ? 1 : 0;
  let pendingParallax = 0;

  const ensureScene = () => {
    if (scene) {
      return Promise.resolve(scene);
    }

    if (!loadPromise) {
      const loadGeneration = generation;
      loadPromise = Promise.resolve()
        .then(() => create(root))
        .then((createdScene) => {
          if (generation !== loadGeneration) {
            createdScene?.dispose?.();
            return null;
          }

          scene = createdScene;
          loadPromise = null;
          scene?.onProgress?.(pendingProgress);
          scene?.onParallax?.(pendingParallax);

          if (entered) {
            scene?.onEnter?.();
          }

          return scene;
        })
        .catch(() => {
          loadPromise = null;
          console.warn(`${label} scene unavailable; continuing with the static chapter.`);
          return null;
        });
    }

    return loadPromise;
  };

  return {
    onProgress(progress) {
      pendingProgress = progress;
      scene?.onProgress?.(progress);
    },
    onParallax(scrollPx) {
      pendingParallax = scrollPx;
      scene?.onParallax?.(scrollPx);
    },
    onEnter() {
      entered = true;

      if (scene) {
        scene.onEnter?.();
      } else {
        void ensureScene();
      }
    },
    onExit() {
      entered = false;
      scene?.onExit?.();
    },
    dispose() {
      generation += 1;
      entered = false;
      scene?.dispose?.();
      scene = null;
      loadPromise = null;
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
    lastParallax: null,
    lastProgress: null,
    root,
    scene: createLazyScene(root, create, id),
  };
}

const sceneRecords = [
  createSceneRecord({
    id: 'research',
    chapterSelector: '#chapter-research',
    rootSelector: '#research-scene',
    create: async (root) => {
      const { createScene } = await import('./js/scene-research/index.js');
      return createScene(root, { reducedMotion });
    },
  }),
  createSceneRecord({
    id: 'track',
    chapterSelector: '#chapter-track',
    rootSelector: '#track-scene',
    create: async (root) => {
      const { createScene } = await import('./js/scene-track/index.js');
      return createScene(root, { reducedMotion });
    },
  }),
  createSceneRecord({
    id: 'music',
    chapterSelector: '#chapter-music',
    rootSelector: '#music-scene',
    create: async (root) => {
      const { createScene } = await import('./js/scene-music/index.js');
      return createScene(root, {
        audioUrl: fugueAudioUrl,
        peaksUrl: fuguePeaksUrl,
        notesUrl: fugueNotesUrl,
        reducedMotion,
      });
    },
  }),
].filter(Boolean);

function updateExperienceScene(progress) {
  const chapter = document.querySelector('#chapter-experience');

  if (!chapter) {
    return;
  }

  const p = clamp01(progress);
  const entry = smootherStep((p - 0.16) / 0.22);
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
  // non-scaling-stroke makes dashes screen-space in Chromium. Account for
  // both the curved path length and preserveAspectRatio="none", whose X/Y
  // scales differ substantially on phones.
  const lineEl = chapter.querySelector('.contact-line');
  const screenMatrix = lineEl?.getScreenCTM();
  let screenLen = 640;
  if (lineEl && screenMatrix) {
    const pathLen = lineEl.getTotalLength();
    let previous = lineEl.getPointAtLength(0);
    screenLen = 0;
    for (let index = 1; index <= 64; index += 1) {
      const point = lineEl.getPointAtLength((pathLen * index) / 64);
      const dx = (point.x - previous.x) * screenMatrix.a + (point.y - previous.y) * screenMatrix.c;
      const dy = (point.x - previous.x) * screenMatrix.b + (point.y - previous.y) * screenMatrix.d;
      screenLen += Math.hypot(dx, dy);
      previous = point;
    }
    screenLen = Math.max(screenLen, 1);
  }
  if (lineEl) lineEl.style.strokeDasharray = screenLen.toFixed(2);
  chapter.style.setProperty('--contact-line-offset', (screenLen * (1 - lineEase)).toFixed(2));
  chapter.style.setProperty('--contact-point-opacity', point.toFixed(3));
  chapter.style.setProperty('--contact-panel-opacity', panel.toFixed(3));
}

let lastExperienceProgress = null;
let lastContactProgress = null;

lifecycle.register({
  element: collisionChapter,
  scene: collisionScene,
});

sceneRecords.forEach((record) => {
  lifecycle.register({
    element: record.chapter,
    scene: createLifecycleAdapter(record.scene),
  });
});

scrollRuntime.onUpdate((state) => {
  const handoffProgress = getHandoffProgress(state);
  const handoffBlend = smootherStep((handoffProgress - 0.94) / 0.055);

  handoffScrub?.style.setProperty('--handoff-spine-opacity', handoffBlend.toFixed(3));
  collisionCanvas?.style.setProperty('--collision-handoff-opacity', (1 - handoffBlend).toFixed(3));

  ground.update(state);
  telemetry.update(state);

  lifecycle.tick({ ...state, handoffProgress });

  sceneRecords.forEach((record) => {
    const scrub = state.scrubs.get(record.id);

    if (!scrub) {
      return;
    }

    if (record.lastProgress === null || Math.abs(record.lastProgress - scrub.progress) > 0.0001) {
      record.scene.onProgress?.(scrub.progress);
      record.lastProgress = scrub.progress;
    }

    const rect = record.chapter.getBoundingClientRect();
    if (rect.bottom > -window.innerHeight && rect.top < window.innerHeight * 2) {
      const parallax = getScrollPx(scrub.element);
      if (record.lastParallax === null || Math.abs(record.lastParallax - parallax) > 0.25) {
        record.scene.onParallax?.(parallax);
        record.lastParallax = parallax;
      }
    }
  });

  const experienceProgress = state.scrubs.get('experience')?.progress ?? (reducedMotion ? 1 : 0);
  if (
    lastExperienceProgress === null ||
    Math.abs(lastExperienceProgress - experienceProgress) > 0.0001
  ) {
    updateExperienceScene(experienceProgress);
    lastExperienceProgress = experienceProgress;
  }

  const contactProgress = state.scrubs.get('contact')?.progress ?? (reducedMotion ? 1 : 0);
  if (lastContactProgress === null || Math.abs(lastContactProgress - contactProgress) > 0.0001) {
    updateContactScene(contactProgress);
    lastContactProgress = contactProgress;
  }

  // Keep the collapsed line alive until the collision chapter has actually
  // left the viewport. Retiring at scrub progress 1 leaves an entire sticky
  // viewport with no owner and creates a conspicuous blank seam before CH02.
  if (!reducedMotion) {
    const collisionHasViewport = collisionChapter.getBoundingClientRect().bottom > 0;

    if (!collisionHasViewport && !collisionScene.isRetired()) {
      collisionScene.collapse();
    } else if (collisionHasViewport && collisionScene.isRetired()) {
      collisionScene.expand();
    }

    collisionHudShell?.classList.toggle(
      'is-retired',
      !collisionHasViewport || handoffProgress > 0.9,
    );
  }

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
