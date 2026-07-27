async function mountNavigation() {
  try {
    const { default: mountNav } = await import('./components/nav.js');
    mountNav(
      document.querySelector('.site-nav'),
      document.querySelectorAll('main section[id], footer[id]'),
    );
  } catch (error) {
    console.error('Navigation enhancement unavailable.', error);
  }
}

async function mountReveals() {
  try {
    const { default: mountReveal } = await import('./components/reveal.js');
    mountReveal(document.querySelectorAll('[data-reveal]'));
  } catch (error) {
    console.error('Reveal enhancement unavailable.', error);
  }
}

async function mountSignals() {
  const elements = [...document.querySelectorAll('.signal-figure[data-signal]')];
  if (!elements.length) return;
  try {
    const { default: mountSignalFigure } = await import('./components/signal-figure/index.js');
    elements.forEach((element) => {
      try {
        mountSignalFigure(element, { signal: element.dataset.signal, playing: false });
      } catch (error) {
        element.dataset.state = 'fallback';
        console.error(`Signal figure "${element.dataset.signal}" unavailable.`, error);
      }
    });
  } catch (error) {
    elements.forEach((element) => {
      element.dataset.state = 'fallback';
    });
    console.error('Signal figure module unavailable.', error);
  }
}

function mountEventLensWhenVisible() {
  const element = document.querySelector('#event-lens');
  if (!element) return;

  let requested = false;
  const load = async () => {
    if (requested) return;
    requested = true;
    try {
      const { default: mountEventLens } = await import('./components/event-lens/index.js');
      mountEventLens(element, { src: element.dataset.eventSrc });
    } catch (error) {
      element.dataset.state = 'fallback';
      console.error('Event Lens unavailable.', error);
    }
  };

  if (!('IntersectionObserver' in window)) {
    void load();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void load();
    },
    { rootMargin: '240px 0px', threshold: 0.01 },
  );
  observer.observe(element);
}

function bootstrap() {
  void mountNavigation();
  void mountReveals();
  void mountSignals();
  mountEventLensWhenVisible();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
