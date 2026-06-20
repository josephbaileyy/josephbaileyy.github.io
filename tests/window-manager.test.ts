// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { WindowManager } from '../src/ui/fake-os/wm';

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe('BaileyOS window manager', () => {
  it('creates an accessible keyboard-resizable window', () => {
    const desktop = document.createElement('div');
    Object.defineProperties(desktop, { clientWidth: { value: 1000 }, clientHeight: { value: 700 } });
    document.body.appendChild(desktop);
    const manager = new WindowManager(desktop);
    manager.open({ id: 'test', title: 'test window', body: document.createElement('div'), x: 5, y: 5, w: 400, h: 300 });
    const win = desktop.querySelector('.os-window') as HTMLDivElement;
    Object.defineProperties(win, {
      offsetWidth: { get: () => Number.parseFloat(win.style.width) },
      offsetHeight: { get: () => Number.parseFloat(win.style.height) },
      offsetLeft: { value: 50 }, offsetTop: { value: 35 },
    });
    const handle = desktop.querySelector('[aria-label="Resize test window"]') as HTMLDivElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(win.style.width).toBe('416px');
    expect(win.style.height).toBe('316px');
  });

  it('minimizes, maximizes, and restores saved geometry', () => {
    const desktop = document.createElement('div');
    Object.defineProperties(desktop, { clientWidth: { value: 1000 }, clientHeight: { value: 700 } });
    document.body.appendChild(desktop);
    const manager = new WindowManager(desktop);
    const spec = { id: 'saved', title: 'saved window', body: document.createElement('div'), x: 5, y: 5, w: 400, h: 300 };
    manager.open(spec);
    const win = desktop.querySelector('.os-window') as HTMLDivElement;
    (desktop.querySelector('[aria-label="Maximize saved window"]') as HTMLButtonElement).click();
    expect(win.classList.contains('maximized')).toBe(true);
    (desktop.querySelector('[aria-label="Restore saved window"]') as HTMLButtonElement).click();
    (desktop.querySelector('[aria-label="Minimize saved window"]') as HTMLButtonElement).click();
    expect(win.classList.contains('minimized')).toBe(true);
    (desktop.querySelector('[aria-label="Close saved window"]') as HTMLButtonElement).click();
    manager.open({ ...spec, body: document.createElement('div') });
    expect(desktop.querySelector('.os-window')?.classList.contains('minimized')).toBe(true);
  });
});
