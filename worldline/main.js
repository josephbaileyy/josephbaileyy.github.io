import { createGroundController } from './js/core/ground.js';
import { createSceneLifecycle, getReducedMotionPreference } from './js/core/lifecycle.js';
import { createScrollRuntime } from './js/core/scroll.js';
import { createTelemetry } from './js/core/telemetry.js';
import { createWorldline } from './js/core/worldline.js';
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
    getAnchors() {
      return scene?.getAnchors?.() ?? null;
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

function updateExperienceScene() {
  const chapter = document.querySelector('#chapter-experience');

  if (!chapter) {
    return;
  }

  // Each entry lights up as the worldline's head reaches its tick, rather than
  // on a scrub schedule of its own - otherwise entries appear below the head,
  // which reads as the content arriving before the line that is supposed to be
  // delivering it.
  const headY = worldline.getHeadY();

  for (const entry of chapter.querySelectorAll('.experience-entry')) {
    const tick = entry.querySelector('.experience-tick') || entry;
    const y = tick.getBoundingClientRect().top;
    const reveal = headY === null ? 0 : clamp01((headY - y) / 56);
    const eased = smootherStep(reveal);
    entry.style.setProperty('--experience-entry-opacity', eased.toFixed(3));
    entry.style.setProperty('--experience-entry-y', `${((1 - eased) * 1.2).toFixed(3)}rem`);
  }
}

function updateContactScene() {
  const chapter = document.querySelector('#chapter-contact');

  if (!chapter) {
    return;
  }

  // Same rule as CH04: the panel arrives when the head reaches its tick.
  const headY = worldline.getHeadY();
  const tick = chapter.querySelector('.contact-tick') || chapter.querySelector('.contact-panel');
  const y = tick ? tick.getBoundingClientRect().top : 0;
  const panel = headY === null ? 0 : smootherStep(clamp01((headY - y) / 56));
  chapter.style.setProperty('--contact-panel-opacity', panel.toFixed(3));
  chapter.style.setProperty('--contact-point-opacity', panel.toFixed(3));
}

// The connective worldline. js/core/worldline.js is the single owner of every
// stretch of line the scenes do not draw themselves; see WORLDLINE.md. Chapters
// with no scene of their own register here and the controller sweeps the head
// through its band across them.
const worldline = createWorldline();
const allChapters = [...document.querySelectorAll('.chapter')];
const lastChapter = allChapters[allChapters.length - 1];

for (const selector of ['#chapter-experience', '#chapter-contact']) {
  const element = document.querySelector(selector);
  worldline.registerChapter(selector, element, { isLast: element === lastChapter });
}

// Scenes contribute a path shape and report where it enters, exits and
// currently ends. They never decide where the connective line runs.
worldline.registerScene('collision', () => collisionScene.getAnchors?.() ?? null);

for (const record of sceneRecords) {
  worldline.registerScene(record.id, () => record.scene.getAnchors?.() ?? null);
}

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
  // No spine cross-fade any more: the collapse ends exactly on the controller's
  // line, so dissolving one geometry into another is what made the handoff look
  // disconnected and snap to vertical.

  ground.update(state);
  telemetry.update(state);
  worldline.update({ maxScroll: state.maxScroll });

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

  // Not gated on scrub progress: these follow the worldline's head, which keeps
  // advancing after a chapter's scrub has already completed.
  updateExperienceScene();
  updateContactScene();

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

updateExperienceScene();
updateContactScene();
scrollRuntime.start();

window.addEventListener('pagehide', () => {
  scrollRuntime.destroy();
  lifecycle.destroy();
});
