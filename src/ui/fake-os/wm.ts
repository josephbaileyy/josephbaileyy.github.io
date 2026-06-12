export interface WindowSpec {
  id: string;
  title: string;
  body: HTMLElement;
  x: number; // % of desktop
  y: number;
  w: number; // px
}

/** Tiny draggable-window manager for the fake OS. */
export class WindowManager {
  private zCounter = 10;
  private windows = new Map<string, HTMLDivElement>();

  constructor(private desktop: HTMLElement) {}

  open(spec: WindowSpec): void {
    const existing = this.windows.get(spec.id);
    if (existing) {
      existing.style.zIndex = String(++this.zCounter);
      return;
    }

    const win = document.createElement('div');
    win.className = 'os-window';
    win.style.left = `${spec.x}%`;
    win.style.top = `${spec.y}%`;
    win.style.width = `${spec.w}px`;
    win.style.zIndex = String(++this.zCounter);

    const bar = document.createElement('div');
    bar.className = 'os-titlebar';
    const close = document.createElement('button');
    close.className = 'os-close';
    close.setAttribute('aria-label', `Close ${spec.title}`);
    const title = document.createElement('span');
    title.textContent = spec.title;
    bar.append(close, title);
    win.append(bar, spec.body);

    close.addEventListener('click', () => {
      win.remove();
      this.windows.delete(spec.id);
    });
    win.addEventListener('pointerdown', () => {
      win.style.zIndex = String(++this.zCounter);
    });

    // drag by titlebar
    let drag: { px: number; py: number; left: number; top: number } | null = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target === close) return;
      drag = { px: e.clientX, py: e.clientY, left: win.offsetLeft, top: win.offsetTop };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const maxX = this.desktop.clientWidth - 60;
      const maxY = this.desktop.clientHeight - 40;
      win.style.left = `${Math.min(maxX, Math.max(-spec.w + 80, drag.left + e.clientX - drag.px))}px`;
      win.style.top = `${Math.min(maxY, Math.max(0, drag.top + e.clientY - drag.py))}px`;
    });
    const release = () => (drag = null);
    bar.addEventListener('pointerup', release);
    bar.addEventListener('pointercancel', release);

    this.desktop.appendChild(win);
    this.windows.set(spec.id, win);
  }
}
