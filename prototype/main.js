import Lenis from 'lenis';
import { createEventDisplay } from './js/event-display.js';
import { createStoryFigures } from './js/story-figures.js';

const canvas = document.querySelector('#event-canvas');
const hud = document.querySelector('#event-hud-readout');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = reduceMotionQuery.matches;

const display = createEventDisplay({
  canvas,
  hud,
  reducedMotion,
});
const storyFigures = createStoryFigures({ reducedMotion });

const revealTargets = [...document.querySelectorAll('.reveal')];

if (reducedMotion) {
  revealTargets.forEach((target) => target.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -18% 0px',
      threshold: 0.18,
    },
  );

  revealTargets.forEach((target) => observer.observe(target));
}

let lenis = null;
let frameId = 0;
let lastScrollTime = performance.now();

if (!reducedMotion) {
  lenis = new Lenis({
    lerp: 0.08,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.08,
    smoothWheel: true,
  });

  lenis.on('scroll', () => {
    lastScrollTime = performance.now();
  });

  window.addEventListener(
    'scroll',
    () => {
      lastScrollTime = performance.now();
    },
    { passive: true },
  );
}

function getScrollMetrics() {
  const root = document.documentElement;
  const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
  return {
    maxScroll,
    progress: Math.min(1, Math.max(0, window.scrollY / maxScroll)),
  };
}

function frame(time) {
  if (document.hidden) {
    frameId = 0;
    return;
  }

  if (lenis) {
    lenis.raf(time);
  }

  const scrollMetrics = getScrollMetrics();
  const idle = time - lastScrollTime > 260;
  const smoothedScrollProgress = display.update({
    time,
    rawScrollProgress: scrollMetrics.progress,
    idle,
  });
  storyFigures.update({
    time,
    scrollProgress: smoothedScrollProgress,
    maxScroll: scrollMetrics.maxScroll,
  });

  frameId = window.requestAnimationFrame(frame);
}

function startLoop() {
  if (!frameId && !reducedMotion && !document.hidden) {
    frameId = window.requestAnimationFrame(frame);
  }
}

window.addEventListener('resize', () => {
  display.resize();
  storyFigures.resize();

  if (reducedMotion) {
    display.renderStatic();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  } else {
    startLoop();
  }
});

if (reducedMotion) {
  display.renderStatic();
} else {
  startLoop();
}
