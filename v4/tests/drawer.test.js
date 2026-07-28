// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import mountDrawer from '../js/components/drawer.js';

function buildDrawer() {
  document.body.innerHTML = `
    <header><button id="trigger">Open</button></header>
    <main>
      <article id="record" data-item-id="record">
        <h2>Detector record</h2>
        <a href="./paper.pdf">Paper</a>
      </article>
    </main>
    <dialog id="drawer" aria-labelledby="drawer-title">
      <p id="drawer-title">Selected detector record</p>
      <button type="button" data-drawer-close>Close</button>
      <div data-drawer-content></div>
    </dialog>
  `;

  const dialog = document.querySelector('#drawer');
  dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
  dialog.close = vi.fn(() => {
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
  });

  return {
    dialog,
    trigger: document.querySelector('#trigger'),
    main: document.querySelector('main'),
    closeButton: dialog.querySelector('[data-drawer-close]'),
  };
}

describe('detector record drawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('moves focus in, makes the background inert, and restores focus on Escape', () => {
    const { dialog, trigger, main, closeButton } = buildDrawer();
    const drawer = mountDrawer(dialog);
    trigger.focus();

    expect(drawer.open('record', trigger)).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(document.activeElement).toBe(closeButton);
    expect(main.inert).toBe(true);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(main.inert).toBeFalsy();
    expect(document.activeElement).toBe(trigger);
  });

  it('traps forward and reverse tab navigation inside the dialog', () => {
    const { dialog, trigger, closeButton } = buildDrawer();
    const drawer = mountDrawer(dialog);
    drawer.open('record', trigger);

    const paperLink = dialog.querySelector('[data-drawer-content] a');
    paperLink.focus();
    paperLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(closeButton);

    closeButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(paperLink);
  });

  it('leaves ordinary source content and anchor links in place', () => {
    const { dialog } = buildDrawer();
    const drawer = mountDrawer(dialog);
    expect(drawer.open('missing')).toBe(false);
    expect(document.querySelector('#record a').getAttribute('href')).toBe('./paper.pdf');
    expect(document.querySelector('#record').textContent).toContain('Detector record');
  });
});
