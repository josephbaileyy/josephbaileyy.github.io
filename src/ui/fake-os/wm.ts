export interface WindowSpec {
  id: string;
  title: string;
  body: HTMLElement;
  x: number; // fallback % of desktop
  y: number;
  w: number; // px
  h?: number; // px
}

export interface WindowState {
  id: string;
  active: boolean;
  minimized: boolean;
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
const TITLEBAR_HEIGHT = 36;
const CONTROL_WIDTH = 92;
const EDGE_GAP = 8;
const CASCADE_X = 38;
const CASCADE_Y = 34;

/** Draggable, resizable, persistent window manager for BaileyOS. */
export class WindowManager {
  private zCounter = 10;
  private windows = new Map<string, HTMLElement>();
  private listeners = new Set<(states: WindowState[]) => void>();
  private resizeObserver: ResizeObserver | null = null;

  constructor(private desktop: HTMLElement) {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.repairAll());
      this.resizeObserver.observe(desktop);
    }
  }

  subscribe(listener: (states: WindowState[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.states());
    return () => this.listeners.delete(listener);
  }

  open(spec: WindowSpec): void {
    const existing = this.windows.get(spec.id);
    if (existing) {
      existing.classList.remove('minimized');
      this.activate(spec.id, existing);
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
    const restored = this.restore(spec.id, win);

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
      const remaining = [...this.windows.entries()].sort(
        (a, b) => Number(b[1].style.zIndex) - Number(a[1].style.zIndex),
      );
      if (remaining[0]) this.focus(remaining[0][0], remaining[0][1]);
      else this.emit();
    });
    minimize.addEventListener('click', () => {
      win.classList.toggle('minimized');
      win.classList.remove('maximized');
      maximize.setAttribute('aria-label', `Maximize ${spec.title}`);
      this.save(spec.id, win);
      this.emit();
    });
    maximize.addEventListener('click', () => {
      win.classList.remove('minimized');
      win.classList.toggle('maximized');
      maximize.setAttribute(
        'aria-label',
        `${win.classList.contains('maximized') ? 'Restore' : 'Maximize'} ${spec.title}`,
      );
      this.focus(spec.id, win);
      this.save(spec.id, win);
    });
    win.addEventListener('pointerdown', () => this.focus(spec.id, win));

    let drag: { px: number; py: number; left: number; top: number } | null = null;
    bar.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('button')) return;
      if (event.pointerType === 'touch' || this.isMobile() || win.classList.contains('maximized'))
        return;
      drag = {
        px: event.clientX,
        py: event.clientY,
        left: this.windowLeft(win),
        top: this.windowTop(win),
      };
      bar.setPointerCapture(event.pointerId);
    });
    bar.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const maxX = this.desktop.clientWidth - CONTROL_WIDTH - EDGE_GAP;
      const maxY = this.desktop.clientHeight - TITLEBAR_HEIGHT - EDGE_GAP;
      win.style.left = `${Math.min(maxX, Math.max(EDGE_GAP, drag.left + event.clientX - drag.px))}px`;
      win.style.top = `${Math.min(maxY, Math.max(EDGE_GAP, drag.top + event.clientY - drag.py))}px`;
    });
    const releaseDrag = () => {
      if (drag) {
        win.dataset.userPositioned = 'true';
        this.repair(win);
        this.save(spec.id, win);
      }
      drag = null;
    };
    bar.addEventListener('pointerup', releaseDrag);
    bar.addEventListener('pointercancel', releaseDrag);

    const resizeTo = (width: number, height: number) => {
      const maxWidth = Math.max(
        280,
        this.desktop.clientWidth - Math.max(0, win.offsetLeft) - EDGE_GAP,
      );
      const maxHeight = Math.max(
        180,
        this.desktop.clientHeight - Math.max(0, win.offsetTop) - EDGE_GAP,
      );
      win.style.width = `${Math.min(maxWidth, Math.max(280, width))}px`;
      win.style.height = `${Math.min(maxHeight, Math.max(180, height))}px`;
    };
    let sizing: { x: number; y: number; w: number; h: number } | null = null;
    resize.addEventListener('pointerdown', (event) => {
      if (this.isMobile() || win.classList.contains('maximized')) return;
      sizing = {
        x: event.clientX,
        y: event.clientY,
        w: this.windowWidth(win),
        h: this.windowHeight(win),
      };
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
      const delta = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }[event.key];
      if (!delta) return;
      event.preventDefault();
      resizeTo(this.windowWidth(win) + delta[0], this.windowHeight(win) + delta[1]);
      this.save(spec.id, win);
    });

    this.desktop.appendChild(win);
    this.windows.set(spec.id, win);
    this.repair(win);
    this.activate(spec.id, win, !restored);
  }

  arrange(): void {
    if (this.isMobile()) return;
    const ordered = [...this.windows.entries()].sort(
      (a, b) => Number(a[1].style.zIndex) - Number(b[1].style.zIndex),
    );
    ordered.forEach(([id, win], index) => {
      const position = this.cascadePosition(index, win);
      win.style.left = `${position.left}px`;
      win.style.top = `${position.top}px`;
      delete win.dataset.userPositioned;
      this.repair(win);
      this.save(id, win);
    });
    const active = ordered.at(-1);
    if (active) this.focus(active[0], active[1]);
    else this.emit();
  }

  repairAll(): void {
    if (this.isMobile()) return;
    for (const [id, win] of this.windows) {
      this.repair(win);
      this.save(id, win);
    }
    this.emit();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.listeners.clear();
  }

  private activate(id: string, win: HTMLElement, newlyOpened = false): void {
    this.focus(id, win);
    if (this.isMobile() || win.classList.contains('maximized')) return;
    this.repair(win);
    if (newlyOpened || this.coversAnotherControlCluster(id, win)) {
      const safe = this.findSafePosition(win);
      win.style.left = `${safe.left}px`;
      win.style.top = `${safe.top}px`;
      this.repair(win);
    }
    this.save(id, win);
    this.emit();
  }

  private focus(id: string, win: HTMLElement): void {
    win.style.zIndex = String(++this.zCounter);
    for (const [otherId, other] of this.windows) {
      other.classList.toggle('active', otherId === id);
      if (this.isMobile()) other.classList.toggle('mobile-inactive', otherId !== id);
    }
    win.classList.remove('mobile-inactive');
    this.emit();
  }

  private isMobile(): boolean {
    return (
      typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches
    );
  }

  private restore(id: string, win: HTMLElement): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + id);
      if (!raw) return false;
      const state = JSON.parse(raw) as SavedWindowState;
      if (state.left) win.style.left = state.left;
      if (state.top) win.style.top = state.top;
      if (state.width) win.style.width = state.width;
      if (state.height) win.style.height = state.height;
      win.classList.toggle('minimized', state.minimized);
      win.classList.toggle('maximized', state.maximized);
      return true;
    } catch {
      /* storage can be unavailable in privacy modes */
      return false;
    }
  }

  private repair(win: HTMLElement): void {
    if (this.isMobile() || win.classList.contains('maximized')) return;
    const desktopWidth = this.desktop.clientWidth;
    const desktopHeight = this.desktop.clientHeight;
    if (!desktopWidth || !desktopHeight) return;
    const measuredWidth = this.windowWidth(win);
    const measuredHeight = this.windowHeight(win);
    const width = Math.min(Math.max(280, measuredWidth), desktopWidth - EDGE_GAP * 2);
    const height = Math.min(Math.max(180, measuredHeight), desktopHeight - EDGE_GAP * 2);
    const left = Math.min(
      desktopWidth - CONTROL_WIDTH - EDGE_GAP,
      Math.max(EDGE_GAP, this.windowLeft(win)),
    );
    const top = Math.min(
      desktopHeight - TITLEBAR_HEIGHT - EDGE_GAP,
      Math.max(EDGE_GAP, this.windowTop(win)),
    );
    win.style.width = `${width}px`;
    win.style.height = `${height}px`;
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
  }

  private coversAnotherControlCluster(id: string, win: HTMLElement): boolean {
    const activeRect = this.localRect(win);
    for (const [otherId, other] of this.windows) {
      if (otherId === id || other.classList.contains('minimized')) continue;
      if (rectsOverlap(activeRect, this.controlRect(other))) return true;
    }
    return false;
  }

  private findSafePosition(win: HTMLElement): { left: number; top: number } {
    const origin = { left: this.windowLeft(win), top: this.windowTop(win) };
    const candidates = Array.from({ length: Math.max(16, this.windows.size * 6) }, (_, index) =>
      this.cascadePosition(index, win),
    ).sort(
      (a, b) =>
        Math.hypot(a.left - origin.left, a.top - origin.top) -
        Math.hypot(b.left - origin.left, b.top - origin.top),
    );
    return (
      candidates.find((candidate) => !this.positionCoversControlCluster(candidate, win)) ??
      this.cascadePosition(this.windows.size - 1, win)
    );
  }

  private positionCoversControlCluster(
    position: { left: number; top: number },
    win: HTMLElement,
  ): boolean {
    const activeRect = {
      left: position.left,
      top: position.top,
      right: position.left + this.windowWidth(win),
      bottom: position.top + this.windowHeight(win),
    };
    for (const other of this.windows.values()) {
      if (other === win || other.classList.contains('minimized')) continue;
      if (rectsOverlap(activeRect, this.controlRect(other))) return true;
    }
    return false;
  }

  private cascadePosition(index: number, win: HTMLElement): { left: number; top: number } {
    const maxLeft = Math.max(EDGE_GAP, this.desktop.clientWidth - this.windowWidth(win) - EDGE_GAP);
    const maxTop = Math.max(
      EDGE_GAP,
      this.desktop.clientHeight - this.windowHeight(win) - EDGE_GAP,
    );
    const columns = Math.max(1, Math.floor(Math.max(1, maxLeft - 88) / CASCADE_X) + 1);
    return {
      left: Math.min(maxLeft, 88 + (index % columns) * CASCADE_X),
      top: Math.min(maxTop, EDGE_GAP + (index % 8) * CASCADE_Y),
    };
  }

  private localRect(win: HTMLElement): {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } {
    return {
      left: this.windowLeft(win),
      top: this.windowTop(win),
      right: this.windowLeft(win) + this.windowWidth(win),
      bottom: this.windowTop(win) + this.windowHeight(win),
    };
  }

  private controlRect(win: HTMLElement): {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } {
    return {
      left: this.windowLeft(win),
      top: this.windowTop(win),
      right: this.windowLeft(win) + Math.min(CONTROL_WIDTH, this.windowWidth(win)),
      bottom: this.windowTop(win) + TITLEBAR_HEIGHT,
    };
  }

  private windowWidth(win: HTMLElement): number {
    return win.offsetWidth || Number.parseFloat(win.style.width) || 280;
  }

  private windowHeight(win: HTMLElement): number {
    return win.offsetHeight || Number.parseFloat(win.style.height) || 180;
  }

  private windowLeft(win: HTMLElement): number {
    return win.offsetLeft || Number.parseFloat(win.style.left) || 0;
  }

  private windowTop(win: HTMLElement): number {
    return win.offsetTop || Number.parseFloat(win.style.top) || 0;
  }

  private states(): WindowState[] {
    const topZ = Math.max(0, ...[...this.windows.values()].map((win) => Number(win.style.zIndex)));
    return [...this.windows.entries()].map(([id, win]) => ({
      id,
      active: Number(win.style.zIndex) === topZ && !win.classList.contains('minimized'),
      minimized: win.classList.contains('minimized'),
    }));
  }

  private emit(): void {
    const states = this.states();
    for (const listener of this.listeners) listener(states);
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
    } catch {
      /* storage can be unavailable in privacy modes */
    }
  }
}

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function control(className: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  return button;
}
