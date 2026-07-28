import { manifest } from '../content/manifest.js';

import mountDrawer from './components/drawer.js';
import mountNav from './components/nav.js';
import mountReveal from './components/reveal.js';

function mountMachine(element, onOpenItem) {
  if (!element) return;

  const fallback = () => {
    element.dataset.state = 'fallback';
  };

  const load = () => {
    import('./hero/index.js')
      .then(({ default: mountUnfoldingMachine }) => {
        const machine = mountUnfoldingMachine(element, {
          manifest,
          seed: 17,
          onOpenItem,
          onSoundPreference() {},
        });
        machine?.ready?.catch(fallback);
      })
      .catch(fallback);
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(load, { timeout: 800 });
      } else {
        window.setTimeout(load, 0);
      }
    });
  });
}

function bootstrap() {
  const drawer = mountDrawer(document.querySelector('#item-drawer'));

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('a[data-drawer-id]');
    if (!trigger) return;
    const opened = drawer.open(trigger.dataset.drawerId, trigger);
    if (!opened) return;
    event.preventDefault();
    history.replaceState(null, '', trigger.hash);
  });

  mountMachine(document.querySelector('#unfolding-machine'), (id) => {
    drawer.open(id, document.activeElement);
  });

  mountNav(
    document.querySelector('.site-nav'),
    document.querySelectorAll('main section[id], footer[id]'),
  );
  mountReveal(document.querySelectorAll('[data-reveal]'));

  const initialId = decodeURIComponent(location.hash.slice(1));
  if (initialId && document.querySelector(`[data-item-id="${CSS.escape(initialId)}"]`)) {
    drawer.open(initialId, document.querySelector(`a[href="#${CSS.escape(initialId)}"]`));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
