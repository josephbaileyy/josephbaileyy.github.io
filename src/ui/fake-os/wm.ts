export interface WindowSpec {
  id: string;
  title: string;
  body: HTMLElement;
  x: number; // % of desktop
  y: number;
  w: number; // px
  h?: number; // px
}

interface SavedWindowState {
  left: string;
  top: string;
  width: string;
  height: string;
  minimized: boolean;
  maximized: boolean;
}

const STORAGE_PREFIX = 'baileyos:window:';

/** Draggable, resizable, persistent window manager for BaileyOS. */
export class WindowManager {
  private zCounter = 10;
  private windows = new Map<string, HTMLElement>();

  constructor(private desktop: HTMLElement) {}

  open(spec: WindowSpec): void {
    const existing = this.windows.get(spec.id);
    if (existing) {
      existing.classList.remove('minimized');
      this.focus(spec.id, existing);
      this.save(spec.id, existing);
      return;
    }

    const win = document.createElement('section');
    win.className = 'os-window';
    win.dataset.windowId = spec.id;
    win.setAttribute('aria-label', spec.title);
    win.style.left = `${spec.x}%`;
    win.style.top = `${spec.y}%`;
    win.style.width = `${spec.w}px`;
    if (spec.h) win.style.height = `${spec.h}px`;
    win.style.zIndex = String(++this.zCounter);
    this.restore(spec.id, win);

    const bar = document.createElement('div');
    bar.className = 'os-titlebar';
    const controls = document.createElement('div');
    controls.className = 'os-window-controls';
    const close = control('os-close', `Close ${spec.title}`);
    const minimize = control('os-minimize', `Minimize ${spec.title}`);
    const maximize = control('os-maximize', `Maximize ${spec.title}`);
    controls.append(close, minimize, maximize);
    const title = document.createElement('span');
    title.textContent = spec.title;
    bar.append(controls, title);
    win.append(bar, spec.body);

    const resize = document.createElement('div');
    resize.className = 'os-resize-handle';
    resize.tabIndex = 0;
    resize.setAttribute('role', 'separator');
    resize.setAttribute('aria-label', `Resize ${spec.title}`);
    resize.setAttribute('aria-orientation', 'horizontal');
    win.appendChild(resize);

    close.addEventListener('click', () => {
      win.remove();
      this.windows.delete(spec.id);
      const remaining = [...this.windows.entries()].sort((a, b) => Number(b[1].style.zIndex) - Number(a[1].style.zIndex));
      if (remaining[0]) this.focus(remaining[0][0], remaining[0][1]);
    });
    minimize.addEventListener('click', () => {
      win.classList.toggle('minimized');
      win.classList.remove('maximized');
      maximize.setAttribute('aria-label', `Maximize ${spec.title}`);
      this.save(spec.id, win);
    });
    maximize.addEventListener('click', () => {
      win.classList.remove('minimized');
      win.classList.toggle('maximized');
      maximize.setAttribute('aria-label', `${win.classList.contains('maximized') ? 'Restore' : 'Maximize'} ${spec.title}`);
      this.focus(spec.id, win);
      this.save(spec.id, win);
    });
    win.addEventListener('pointerdown', () => this.focus(spec.id, win));

    let drag: { px: number; py: number; left: number; top: number } | null = null;
    bar.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('button')) return;
      if (event.pointerType === 'touch' || this.isMobile() || win.classList.contains('maximized')) return;
      drag = { px: event.clientX, py: event.clientY, left: win.offsetLeft, top: win.offsetTop };
      bar.setPointerCapture(event.pointerId);
    });
    bar.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const maxX = this.desktop.clientWidth - 60;
      const maxY = this.desktop.clientHeight - 40;
      win.style.left = `${Math.min(maxX, Math.max(-win.offsetWidth + 80, drag.left + event.clientX - drag.px))}px`;
      win.style.top = `${Math.min(maxY, Math.max(0, drag.top + event.clientY - drag.py))}px`;
    });
    const releaseDrag = () => {
      if (drag) this.save(spec.id, win);
      drag = null;
    };
    bar.addEventListener('pointerup', releaseDrag);
    bar.addEventListener('pointercancel', releaseDrag);

    const resizeTo = (width: number, height: number) => {
      const maxWidth = Math.max(280, this.desktop.clientWidth - Math.max(0, win.offsetLeft) - 8);
      const maxHeight = Math.max(180, this.desktop.clientHeight - Math.max(0, win.offsetTop) - 8);
      win.style.width = `${Math.min(maxWidth, Math.max(280, width))}px`;
      win.style.height = `${Math.min(maxHeight, Math.max(180, height))}px`;
    };
    let sizing: { x: number; y: number; w: number; h: number } | null = null;
    resize.addEventListener('pointerdown', (event) => {
      if (this.isMobile() || win.classList.contains('maximized')) return;
      sizing = { x: event.clientX, y: event.clientY, w: win.offsetWidth, h: win.offsetHeight };
      resize.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    resize.addEventListener('pointermove', (event) => {
      if (!sizing) return;
      resizeTo(sizing.w + event.clientX - sizing.x, sizing.h + event.clientY - sizing.y);
    });
    const stopSizing = () => {
      if (sizing) this.save(spec.id, win);
      sizing = null;
    };
    resize.addEventListener('pointerup', stopSizing);
    resize.addEventListener('pointercancel', stopSizing);
    resize.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 32 : 16;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!delta) return;
      event.preventDefault();
      resizeTo(win.offsetWidth + delta[0], win.offsetHeight + delta[1]);
      this.save(spec.id, win);
    });

    this.desktop.appendChild(win);
    this.windows.set(spec.id, win);
    this.focus(spec.id, win);
  }

  private focus(id: string, win: HTMLElement): void {
    win.style.zIndex = String(++this.zCounter);
    if (!this.isMobile()) return;
    for (const [otherId, other] of this.windows) other.classList.toggle('mobile-inactive', otherId !== id);
    win.classList.remove('mobile-inactive');
  }

  private isMobile(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches;
  }

  private restore(id: string, win: HTMLElement): void {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + id);
      if (!raw) return;
      const state = JSON.parse(raw) as SavedWindowState;
      if (state.left) win.style.left = state.left;
      if (state.top) win.style.top = state.top;
      if (state.width) win.style.width = state.width;
      if (state.height) win.style.height = state.height;
      win.classList.toggle('minimized', state.minimized);
      win.classList.toggle('maximized', state.maximized);
    } catch { /* storage can be unavailable in privacy modes */ }
  }

  private save(id: string, win: HTMLElement): void {
    try {
      const state: SavedWindowState = {
        left: win.style.left,
        top: win.style.top,
        width: win.style.width,
        height: win.style.height,
        minimized: win.classList.contains('minimized'),
        maximized: win.classList.contains('maximized'),
      };
      localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(state));
    } catch { /* storage can be unavailable in privacy modes */ }
  }
}

function control(className: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  return button;
}
