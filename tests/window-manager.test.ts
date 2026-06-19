// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { WindowManager } from '../src/ui/fake-os/wm';

afterEach(() => document.body.replaceChildren());

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
});
