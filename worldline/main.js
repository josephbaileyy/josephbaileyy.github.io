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
const worldlineSvg = document.querySelector('#worldline-svg');
const handoffScrub = document.querySelector('[data-scrub="collision-handoff"]');
const researchChapter = document.querySelector('#chapter-research');

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-external-url]');

  if (!link) {
    return;
  }

  event.preventDefault();
  window.open(link.dataset.externalUrl, '_blank', 'noopener');
});

function layoutWorldline(handoffProgress) {
  if (!worldlineSvg || !handoffScrub || !researchChapter) {
    return;
  }

  const scrubTop = handoffScrub.getBoundingClientRect().top + window.scrollY;
  const seamY = scrubTop + handoffScrub.offsetHeight - window.innerHeight * 0.58;
  const endY = researchChapter.getBoundingClientRect().top + window.scrollY + researchChapter.offsetHeight;
  const height = Math.max(0, endY - seamY);
  const visible = reducedMotion ? 1 : smootherStep((handoffProgress - 0.82) / 0.16);

  worldlineSvg.style.top = `${Math.round(seamY)}px`;
  worldlineSvg.style.height = `${Math.round(height)}px`;
  worldlineSvg.style.opacity = visible.toFixed(3);
  worldlineSvg.classList.toggle('is-live', visible > 0.01);
}

function getHandoffProgress(state) {
  return state.scrubs.get('collision-handoff')?.progress ?? (reducedMotion ? 1 : 0);
}

lifecycle.register({
  element: collisionChapter,
  scene: collisionScene,
  unmountWhen: ({ handoffProgress }) => !reducedMotion && handoffProgress >= 0.996,
});

scrollRuntime.onUpdate((state) => {
  const handoffProgress = getHandoffProgress(state);

  ground.update(state);
  telemetry.update(state);
  layoutWorldline(handoffProgress);

  lifecycle.tick({ ...state, handoffProgress });

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
    webglRetired: collisionScene.isRetired(),
    webglRenderCount: collisionScene.getRenderCount(),
  };
});

window.addEventListener('resize', () => {
  collisionScene.resize();
  layoutWorldline(scrollRuntime.getSnapshot().scrubs.get('collision-handoff')?.progress ?? 0);
});

layoutWorldline(reducedMotion ? 1 : 0);
scrollRuntime.start();
