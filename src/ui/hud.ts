export class Hud {
  private dots: HTMLButtonElement[] = [];
  private live: HTMLDivElement;
  private hint: HTMLDivElement;
  private journey: HTMLButtonElement;

  constructor(
    private root: HTMLElement,
    scenes: ReadonlyArray<{ label: string }>,
    onNavigate: (index: number) => void,
    onZoomStep: (dir: 1 | -1) => void,
    onTour: () => void,
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

    this.journey = document.createElement('button');
    this.journey.className = 'hud-journey';
    this.journey.innerHTML = '<span aria-hidden="true">▶</span> take the journey';
    this.journey.setAttribute('aria-label', 'Take the guided journey from the galaxy to my desk');
    this.journey.addEventListener('click', () => {
      this.stopPulse();
      onTour();
    });
    root.appendChild(this.journey);

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

  /** Hide the journey button while the guided tour is running. */
  setTouring(active: boolean): void {
    this.journey.classList.toggle('hidden', active);
    if (active) this.stopPulse();
  }

  /** First-visit nudge: draw the eye to the journey button. */
  pulseJourney(): void {
    this.journey.classList.add('pulse');
  }

  stopPulse(): void {
    this.journey.classList.remove('pulse');
  }

  announce(label: string): void {
    this.live.textContent = `Now viewing: ${label}`;
  }

  showHint(text: string): void {
    this.hint.textContent = text;
    this.hint.classList.remove('hidden');
  }

  hideHint(): void {
    this.hint.classList.add('hidden');
  }
}
