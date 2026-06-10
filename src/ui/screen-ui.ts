import { designRectToScreen } from '../engine/transforms';
import type { Rect, Size } from '../engine/types';

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
      <a href="mailto:hello@example.com"><span class="icon">✉️</span>email</a>
    </div>
  </div>
`;

export class ScreenUi {
  private el: HTMLDivElement;
  private uiRect: Rect;

  constructor(screenSvgText: string, onPanel: (panelId: string) => void) {
    // Read the ui-mount rect straight out of the screen scene's SVG markup.
    const doc = new DOMParser().parseFromString(screenSvgText, 'image/svg+xml');
    const mount = doc.getElementById('ui-mount');
    if (!mount) throw new Error('screen scene: #ui-mount not found');
    this.uiRect = {
      x: Number(mount.getAttribute('x')),
      y: Number(mount.getAttribute('y')),
      w: Number(mount.getAttribute('width')),
      h: Number(mount.getAttribute('height')),
    };

    this.el = document.createElement('div');
    this.el.className = 'screen-ui';
    this.el.innerHTML = LINKS;
    this.el.querySelector('[data-panel]')!.addEventListener('click', (e) => {
      onPanel((e.currentTarget as HTMLElement).dataset.panel!);
    });
    document.body.appendChild(this.el);
  }

  show(vp: Size): void {
    // Map the SVG's ui-mount rect to pixels, then clamp to the viewport —
    // on narrow screens the cover-fit pushes the rect past the edges.
    const r = designRectToScreen(this.uiRect, vp);
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
}
