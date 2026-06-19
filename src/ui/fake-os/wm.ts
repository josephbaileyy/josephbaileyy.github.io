export interface WindowSpec {
  id: string;
  title: string;
  body: HTMLElement;
  x: number; // % of desktop
  y: number;
  w: number; // px
  h?: number; // px
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
    if (spec.h) win.style.height = `${spec.h}px`;
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
    });
    win.addEventListener('pointerdown', () => {
      win.style.zIndex = String(++this.zCounter);
    });

    // drag by titlebar
    let drag: { px: number; py: number; left: number; top: number } | null = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target === close) return;
      if (e.pointerType === 'touch' || window.matchMedia('(max-width: 760px)').matches) return;
      drag = { px: e.clientX, py: e.clientY, left: win.offsetLeft, top: win.offsetTop };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const maxX = this.desktop.clientWidth - 60;
      const maxY = this.desktop.clientHeight - 40;
      win.style.left = `${Math.min(maxX, Math.max(-win.offsetWidth + 80, drag.left + e.clientX - drag.px))}px`;
      win.style.top = `${Math.min(maxY, Math.max(0, drag.top + e.clientY - drag.py))}px`;
    });
    const release = () => (drag = null);
    bar.addEventListener('pointerup', release);
    bar.addEventListener('pointercancel', release);

    const resizeTo = (width: number, height: number) => {
      const left = win.offsetLeft;
      const top = win.offsetTop;
      const maxWidth = Math.max(280, this.desktop.clientWidth - Math.max(0, left) - 8);
      const maxHeight = Math.max(180, this.desktop.clientHeight - Math.max(0, top) - 8);
      win.style.width = `${Math.min(maxWidth, Math.max(280, width))}px`;
      win.style.height = `${Math.min(maxHeight, Math.max(180, height))}px`;
    };
    let sizing: { x: number; y: number; w: number; h: number } | null = null;
    resize.addEventListener('pointerdown', (event) => {
      if (window.matchMedia('(max-width: 760px)').matches) return;
      sizing = { x: event.clientX, y: event.clientY, w: win.offsetWidth, h: win.offsetHeight };
      resize.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    resize.addEventListener('pointermove', (event) => {
      if (!sizing) return;
      resizeTo(sizing.w + event.clientX - sizing.x, sizing.h + event.clientY - sizing.y);
    });
    const stopSizing = () => { sizing = null; };
    resize.addEventListener('pointerup', stopSizing);
    resize.addEventListener('pointercancel', stopSizing);
    resize.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 32 : 16;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!delta) return;
      event.preventDefault();
      resizeTo(win.offsetWidth + delta[0], win.offsetHeight + delta[1]);
    });

    this.desktop.appendChild(win);
    this.windows.set(spec.id, win);
  }
}
