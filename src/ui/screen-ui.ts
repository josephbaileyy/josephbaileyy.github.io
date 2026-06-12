export interface PxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LINKS = `
  <div class="screen-window">
    <div class="screen-titlebar">
      <i style="background:#b83a3a"></i><i style="background:#ffd479"></i><i style="background:#56a06b"></i>
      <span>welcome.txt — joseph bailey</span>
    </div>
    <div class="screen-links">
      <a href="/resume.pdf" target="_blank" rel="noopener"><span class="icon">📄</span>resume.pdf</a>
      <a href="/about.html"><span class="icon">🧑‍🚀</span>about &amp; cv</a>
      <button type="button" data-panel="projects"><span class="icon">🔭</span>projects</button>
      <a href="https://github.com/josephbaileyy" target="_blank" rel="noopener"><span class="icon">💻</span>github</a>
      <a href="mailto:jrbailey555@gmail.com"><span class="icon">✉️</span>email</a>
    </div>
  </div>
`;

/**
 * The DOM overlay that takes over when the camera docks at the monitor.
 * Positioning is the caller's job (project the 3D screen quad to pixels);
 * this class just clamps to the viewport and shows/hides.
 * Superseded by the fake OS at the screen scene; kept as the simple fallback
 * content host until fake-os lands.
 */
export class ScreenUi {
  private el: HTMLDivElement;

  constructor(onPanel: (panelId: string) => void) {
    this.el = document.createElement('div');
    this.el.className = 'screen-ui';
    this.el.innerHTML = LINKS;
    this.el.querySelector('[data-panel]')!.addEventListener('click', (e) => {
      onPanel((e.currentTarget as HTMLElement).dataset.panel!);
    });
    document.body.appendChild(this.el);
  }

  /** Position over a pixel rect, clamped to the viewport with padding. */
  show(r: PxRect, vp: { w: number; h: number }): void {
    const pad = 14;
    const left = Math.max(r.x, pad);
    const top = Math.max(r.y, pad);
    const right = Math.min(r.x + r.w, vp.w - pad);
    const bottom = Math.min(r.y + r.h, vp.h - pad);
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
    this.el.style.width = `${right - left}px`;
    this.el.style.height = `${bottom - top}px`;
    this.el.classList.add('visible');
  }

  hide(): void {
    this.el.classList.remove('visible');
  }

  get visible(): boolean {
    return this.el.classList.contains('visible');
  }

  setContent(el: HTMLElement): void {
    this.el.replaceChildren(el);
  }
}
