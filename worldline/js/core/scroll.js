import Lenis from 'lenis';

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function scrubIdFor(element, index) {
  return element.dataset.scrub || element.id || `scrub-${index + 1}`;
}

function getPageProgress() {
  const root = document.documentElement;
  const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
  return {
    maxScroll,
    pageProgress: clamp01(window.scrollY / maxScroll),
  };
}

export function createScrollRuntime({ reducedMotion = false } = {}) {
  const subscribers = new Set();
  const scrubRecords = [...document.querySelectorAll('[data-scrub]')].map((element, index) => {
    const height = Number(element.dataset.scrubVh || element.dataset.scrubHeight || 300);
    element.style.setProperty('--scrub-height', `${Math.min(400, Math.max(200, height))}vh`);

    return {
      element,
      id: scrubIdFor(element, index),
      progress: reducedMotion ? 1 : 0,
      rawProgress: reducedMotion ? 1 : 0,
    };
  });

  let frameId = 0;
  let lastScrollTime = performance.now();
  let lenis = null;

  if (!reducedMotion) {
    lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      touchMultiplier: 1.08,
      wheelMultiplier: 0.9,
    });

    lenis.on('scroll', () => {
      lastScrollTime = performance.now();
    });
  }

  window.addEventListener(
    'scroll',
    () => {
      lastScrollTime = performance.now();
    },
    { passive: true },
  );

  function measureScrubs() {
    const map = new Map();

    scrubRecords.forEach((record) => {
      if (reducedMotion) {
        record.rawProgress = 1;
        record.progress = 1;
      } else {
        const rect = record.element.getBoundingClientRect();
        const start = rect.top + window.scrollY;
        const range = Math.max(1, record.element.offsetHeight - window.innerHeight);
        record.rawProgress = clamp01((window.scrollY - start) / range);
        record.progress += (record.rawProgress - record.progress) * 0.1;
      }

      record.element.style.setProperty('--scrub-progress', record.progress.toFixed(4));
      map.set(record.id, {
        element: record.element,
        progress: record.progress,
        rawProgress: record.rawProgress,
      });
    });

    return map;
  }

  function buildState(time) {
    const metrics = getPageProgress();

    return {
      idle: time - lastScrollTime > 260,
      lenis,
      maxScroll: metrics.maxScroll,
      pageProgress: metrics.pageProgress,
      reducedMotion,
      scrubs: measureScrubs(),
      time,
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

    const state = buildState(time);
    subscribers.forEach((subscriber) => subscriber(state));
    frameId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (!frameId && !document.hidden) {
      frameId = window.requestAnimationFrame(frame);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      return;
    }

    start();
  });

  return {
    onUpdate(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    start,
    stop() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    },
    destroy() {
      this.stop();
      if (lenis) {
        lenis.destroy();
      }
      subscribers.clear();
    },
    getSnapshot() {
      return buildState(performance.now());
    },
  };
}
