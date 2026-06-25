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
    Object.defineProperties(desktop, {
      clientWidth: { value: 1000 },
      clientHeight: { value: 700 },
    });
    document.body.appendChild(desktop);
    const manager = new WindowManager(desktop);
    manager.open({
      id: 'test',
      title: 'test window',
      body: document.createElement('div'),
      x: 5,
      y: 5,
      w: 400,
      h: 300,
    });
    const win = desktop.querySelector('.os-window') as HTMLDivElement;
    Object.defineProperties(win, {
      offsetWidth: { get: () => Number.parseFloat(win.style.width) },
      offsetHeight: { get: () => Number.parseFloat(win.style.height) },
      offsetLeft: { value: 50 },
      offsetTop: { value: 35 },
    });
    const handle = desktop.querySelector('[aria-label="Resize test window"]') as HTMLDivElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(win.style.width).toBe('416px');
    expect(win.style.height).toBe('316px');
  });

  it('minimizes, maximizes, and restores saved geometry', () => {
    const desktop = document.createElement('div');
    Object.defineProperties(desktop, {
      clientWidth: { value: 1000 },
      clientHeight: { value: 700 },
    });
    document.body.appendChild(desktop);
    const manager = new WindowManager(desktop);
    const spec = {
      id: 'saved',
      title: 'saved window',
      body: document.createElement('div'),
      x: 5,
      y: 5,
      w: 400,
      h: 300,
    };
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

  it('cascades activated windows without covering earlier control clusters', () => {
    const desktop = document.createElement('div');
    Object.defineProperties(desktop, {
      clientWidth: { value: 1100 },
      clientHeight: { value: 650 },
    });
    document.body.appendChild(desktop);
    const manager = new WindowManager(desktop);
    for (const id of ['research', 'experience', 'profile', 'terminal']) {
      manager.open({
        id,
        title: `${id} window`,
        body: document.createElement('div'),
        x: 10,
        y: 10,
        w: 430,
        h: 320,
      });
    }
    const windows = [...desktop.querySelectorAll<HTMLElement>('.os-window')];
    const terminal = windows.at(-1)!;
    const active = rect(terminal);
    for (const other of windows.slice(0, -1)) {
      const target = rect(other);
      const controls = {
        left: target.left,
        top: target.top,
        right: target.left + 92,
        bottom: target.top + 36,
      };
      expect(overlaps(active, controls)).toBe(false);
    }
  });

  it('repairs stale persisted geometry to the current desktop', () => {
    localStorage.setItem(
      'baileyos:window:stale',
      JSON.stringify({
        left: '1400px',
        top: '900px',
        width: '1200px',
        height: '800px',
        minimized: false,
        maximized: false,
      }),
    );
    const desktop = document.createElement('div');
    Object.defineProperties(desktop, {
      clientWidth: { value: 800 },
      clientHeight: { value: 500 },
    });
    document.body.appendChild(desktop);
    const manager = new WindowManager(desktop);
    manager.open({
      id: 'stale',
      title: 'stale window',
      body: document.createElement('div'),
      x: 5,
      y: 5,
      w: 400,
      h: 300,
    });
    const win = desktop.querySelector('.os-window') as HTMLElement;
    expect(Number.parseFloat(win.style.left)).toBeLessThanOrEqual(700);
    expect(Number.parseFloat(win.style.top)).toBeLessThanOrEqual(456);
    expect(Number.parseFloat(win.style.width)).toBeLessThanOrEqual(784);
    expect(Number.parseFloat(win.style.height)).toBeLessThanOrEqual(484);
  });

  it('reports dock-facing state and arranges windows without changing their sizes', () => {
    const desktop = document.createElement('div');
    Object.defineProperties(desktop, {
      clientWidth: { value: 1000 },
      clientHeight: { value: 650 },
    });
    document.body.appendChild(desktop);
    const manager = new WindowManager(desktop);
    const snapshots: Array<Array<{ id: string; active: boolean; minimized: boolean }>> = [];
    manager.subscribe((states) => snapshots.push(states));
    manager.open({
      id: 'one',
      title: 'one',
      body: document.createElement('div'),
      x: 5,
      y: 5,
      w: 400,
      h: 280,
    });
    manager.open({
      id: 'two',
      title: 'two',
      body: document.createElement('div'),
      x: 6,
      y: 6,
      w: 460,
      h: 300,
    });
    const before = [...desktop.querySelectorAll<HTMLElement>('.os-window')].map((win) => ({
      width: win.style.width,
      height: win.style.height,
    }));
    manager.arrange();
    const after = [...desktop.querySelectorAll<HTMLElement>('.os-window')];
    expect(after.map((win) => ({ width: win.style.width, height: win.style.height }))).toEqual(
      before,
    );
    expect(after[0].style.top).not.toBe(after[1].style.top);
    expect(snapshots.at(-1)?.find((state) => state.id === 'two')?.active).toBe(true);
  });
});

function rect(win: HTMLElement) {
  const left = Number.parseFloat(win.style.left);
  const top = Number.parseFloat(win.style.top);
  const width = Number.parseFloat(win.style.width);
  const height = Number.parseFloat(win.style.height);
  return { left, top, right: left + width, bottom: top + height };
}

function overlaps(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
