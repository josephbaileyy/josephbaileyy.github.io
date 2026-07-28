// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import mountNav from '../js/components/nav.js';

function buildNavigation() {
  document.body.innerHTML = `
    <nav class="site-nav">
      <a href="#research">Research</a>
      <a href="#projects">Projects</a>
    </nav>
    <section id="research"></section>
    <section id="projects"></section>
  `;
  return {
    nav: document.querySelector('.site-nav'),
    sections: [...document.querySelectorAll('section')],
  };
}

describe('v4 navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
        window.__navigationObserver = this;
      }

      observe() {}

      disconnect() {}
    };
  });

  it('marks the active section without moving the document', () => {
    const { nav, sections } = buildNavigation();
    const movementSpy = vi.fn();
    for (const link of nav.querySelectorAll('a')) link.scrollIntoView = movementSpy;

    mountNav(nav, sections);
    window.__navigationObserver.callback([
      {
        isIntersecting: true,
        target: document.querySelector('#projects'),
        boundingClientRect: { top: 8 },
      },
    ]);

    expect(nav.querySelector('a[href="#projects"]').getAttribute('aria-current')).toBe('location');
    expect(movementSpy).not.toHaveBeenCalled();
  });

  it('cleans up observer state', () => {
    const { nav, sections } = buildNavigation();
    const mounted = mountNav(nav, sections);
    const disconnect = vi.spyOn(window.__navigationObserver, 'disconnect');
    mounted.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(nav.querySelector('[aria-current]')).toBeNull();
  });
});
