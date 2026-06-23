export class Hud {
  private dots: HTMLButtonElement[] = [];
  private live: HTMLDivElement;
  private hint: HTMLDivElement;
  private journey: HTMLButtonElement;
  private scaleToggle: HTMLButtonElement;
  private ambientToggle: HTMLButtonElement;
  private driftToggle: HTMLButtonElement;
  private logPanel: HTMLDivElement;
  private logList: HTMLUListElement;
  private observations = new Map<string, { title: string; body: string }>();

  constructor(
    private root: HTMLElement,
    scenes: ReadonlyArray<{ label: string }>,
    onNavigate: (index: number) => void,
    onZoomStep: (dir: 1 | -1) => void,
    onTour: () => void,
    options: {
      onScaleToggle?: () => 'cinematic' | 'real';
      onAmbientToggle?: () => Promise<boolean> | boolean;
      onDriftToggle?: () => boolean;
    } = {},
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

    const touchNav = document.createElement('div');
    touchNav.className = 'hud-touch-nav';
    const outward = document.createElement('button');
    outward.type = 'button';
    outward.textContent = 'out';
    outward.setAttribute('aria-label', 'Travel outward one level');
    outward.addEventListener('click', () => onZoomStep(-1));
    const inward = document.createElement('button');
    inward.type = 'button';
    inward.textContent = 'in';
    inward.setAttribute('aria-label', 'Travel inward one level');
    inward.addEventListener('click', () => onZoomStep(1));
    touchNav.append(outward, inward);
    root.appendChild(touchNav);

    const tools = document.createElement('div');
    tools.className = 'hud-tools';
    this.scaleToggle = document.createElement('button');
    this.scaleToggle.type = 'button';
    this.scaleToggle.textContent = 'scale: cinematic';
    this.scaleToggle.setAttribute('aria-label', 'Toggle Solar System scale mode');
    this.scaleToggle.addEventListener('click', () => {
      const mode = options.onScaleToggle?.() ?? 'cinematic';
      this.scaleToggle.textContent = `scale: ${mode}`;
      this.addObservation('scale-mode', 'Scale mode', mode === 'cinematic'
        ? 'Cinematic scale enlarges planet bodies while keeping real orbital positions.'
        : 'Real scale keeps body sizes physically honest; reticles keep planets discoverable.');
    });
    this.ambientToggle = document.createElement('button');
    this.ambientToggle.type = 'button';
    this.ambientToggle.textContent = 'ambient: off';
    this.ambientToggle.setAttribute('aria-label', 'Toggle ambient space audio');
    this.ambientToggle.addEventListener('click', async () => {
      const active = await options.onAmbientToggle?.();
      this.ambientToggle.textContent = `ambient: ${active ? 'on' : 'off'}`;
    });
    this.driftToggle = document.createElement('button');
    this.driftToggle.type = 'button';
    this.driftToggle.textContent = 'drift: off';
    this.driftToggle.setAttribute('aria-label', 'Toggle free drift camera mode');
    this.driftToggle.addEventListener('click', () => {
      const active = options.onDriftToggle?.() ?? false;
      this.driftToggle.textContent = `drift: ${active ? 'on' : 'off'}`;
      if (active) this.addObservation('drift-mode', 'Drift mode', 'Pointer movement adds a gentle free-flight offset inside the current scale.');
    });
    const logToggle = document.createElement('button');
    logToggle.type = 'button';
    logToggle.textContent = 'log';
    logToggle.setAttribute('aria-label', 'Open observation log');
    logToggle.addEventListener('click', () => this.logPanel.classList.toggle('open'));
    tools.append(this.scaleToggle, this.ambientToggle, this.driftToggle, logToggle);
    root.appendChild(tools);

    this.logPanel = document.createElement('div');
    this.logPanel.className = 'observation-log';
    this.logPanel.innerHTML = '<strong>Observation log</strong><p>Travel through the universe to collect notes.</p>';
    this.logList = document.createElement('ul');
    this.logPanel.appendChild(this.logList);
    root.appendChild(this.logPanel);

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

  addObservation(id: string, title: string, body: string): void {
    if (this.observations.has(id)) return;
    this.observations.set(id, { title, body });
    const item = document.createElement('li');
    item.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
    this.logList.appendChild(item);
    this.logPanel.classList.add('has-items');
  }

  showHint(text: string): void {
    this.hint.textContent = text;
    this.hint.classList.remove('hidden');
  }

  hideHint(): void {
    this.hint.classList.add('hidden');
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]!);
}
