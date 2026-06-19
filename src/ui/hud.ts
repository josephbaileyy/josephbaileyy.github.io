export class Hud {
  private dots: HTMLButtonElement[] = [];
  private live: HTMLDivElement;
  private hint: HTMLDivElement;

  constructor(
    private root: HTMLElement,
    scenes: ReadonlyArray<{ label: string }>,
    onNavigate: (index: number) => void,
    onZoomStep: (dir: 1 | -1) => void,
  ) {
    const name = document.createElement('div');
    name.className = 'hud-name';
    name.innerHTML = `<strong>Joseph Bailey</strong><span>physics @ stanford</span>`;
    root.appendChild(name);

    const plain = document.createElement('a');
    plain.className = 'hud-plain';
    plain.href = '/about.html';
    plain.textContent = 'plain site ↗';
    root.appendChild(plain);

    const dots = document.createElement('nav');
    dots.className = 'hud-dots';
    dots.setAttribute('aria-label', 'Zoom levels');
    scenes.forEach((scene, i) => {
      const dot = document.createElement('button');
      dot.className = 'hud-dot';
      dot.dataset.label = scene.label;
      dot.setAttribute('aria-label', `Go to ${scene.label}`);
      dot.addEventListener('click', () => onNavigate(i));
      dots.appendChild(dot);
      this.dots.push(dot);
    });
    root.appendChild(dots);

    const zoom = document.createElement('div');
    zoom.className = 'hud-zoom';
    const zin = document.createElement('button');
    zin.textContent = '+';
    zin.setAttribute('aria-label', 'Zoom in');
    zin.addEventListener('click', () => onZoomStep(1));
    const zout = document.createElement('button');
    zout.textContent = '−';
    zout.setAttribute('aria-label', 'Zoom out');
    zout.addEventListener('click', () => onZoomStep(-1));
    zoom.append(zin, zout);
    root.appendChild(zoom);

    this.hint = document.createElement('div');
    this.hint.className = 'hud-hint';
    this.hint.textContent = 'scroll, pinch, or use arrows · select glowing objects';
    root.appendChild(this.hint);

    this.live = document.createElement('div');
    this.live.className = 'sr-only';
    this.live.setAttribute('aria-live', 'polite');
    root.appendChild(this.live);
  }

  setActive(index: number): void {
    this.dots.forEach((d, i) => {
      const active = i === index;
      d.classList.toggle('active', active);
      if (active) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
  }

  setMode(mode: 'travel' | 'computer'): void {
    this.root.dataset.mode = mode;
    document.body.dataset.hudMode = mode;
  }

  announce(label: string): void {
    this.live.textContent = `Now viewing: ${label}`;
  }

  hideHint(): void {
    this.hint.classList.add('hidden');
  }
}
