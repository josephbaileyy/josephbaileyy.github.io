// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import mountNav from '../js/components/nav.js';

function build() {
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

describe('site nav scroll-spy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.IntersectionObserver = class {
      constructor(cb) {
        this.cb = cb;
        window.__io = this;
      }
      observe() {}
      disconnect() {}
    };
  });

  it('marks the active link with aria-current', () => {
    const { nav, sections } = build();
    mountNav(nav, sections);
    expect(nav.querySelector('a[href="#research"]').getAttribute('aria-current')).toBe('location');
  });

  it('never calls scrollIntoView — doing so scrolls the document to the top on every update', () => {
    const { nav, sections } = build();
    const spy = vi.fn();
    for (const link of nav.querySelectorAll('a')) link.scrollIntoView = spy;

    mountNav(nav, sections);
    // drive a scroll-spy update as the observer would
    window.__io.cb([
      {
        isIntersecting: true,
        target: document.getElementById('projects'),
        boundingClientRect: { top: 10 },
      },
    ]);

    expect(nav.querySelector('a[href="#projects"]').getAttribute('aria-current')).toBe('location');
    expect(spy).not.toHaveBeenCalled();
  });
});
