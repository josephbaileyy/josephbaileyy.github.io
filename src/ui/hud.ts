export type ObservationDestination =
  | { type: 'panel'; panelId: string; label: string }
  | { type: 'scene'; index: number; label: string }
  | { type: 'app'; appId: string; label: string }
  | { type: 'url'; href: string; label: string };

type LogKind = 'scene' | 'signal';

interface ObservationEntry {
  title: string;
  body: string;
  destination?: ObservationDestination;
}

interface PersistedFieldLog {
  scenes: Record<string, ObservationEntry>;
  signals: Record<string, ObservationEntry>;
}

const FIELD_LOG_KEY = 'jb-field-log-v2';

export class Hud {
  private dots: HTMLButtonElement[] = [];
  private live: HTMLDivElement;
  private hint: HTMLDivElement;
  private stepLabel: HTMLDivElement;
  private journey: HTMLButtonElement;
  private tools: HTMLDivElement;
  private toolsToggle: HTMLButtonElement;
  private scaleToggle: HTMLButtonElement;
  private ambientToggle: HTMLButtonElement;
  private driftToggle: HTMLButtonElement;
  private logToggle: HTMLButtonElement;
  private logPanel: HTMLDivElement;
  private sceneLogList: HTMLUListElement;
  private signalLogList: HTMLUListElement;
  private resetLog: HTMLButtonElement;
  private resetConfirmTimer: ReturnType<typeof setTimeout> | null = null;
  private onOpenDestination?: (destination: ObservationDestination) => void;
  private sceneVisits = new Map<string, ObservationEntry>();
  private signalObservations = new Map<string, ObservationEntry>();

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
      onOpenPanel?: (panelId: string) => void;
      onOpenDestination?: (destination: ObservationDestination) => void;
    } = {},
  ) {
    this.onOpenDestination = options.onOpenDestination;
    const name = document.createElement('div');
    name.className = 'hud-name';
    name.innerHTML = `
      <strong>Joseph Bailey</strong>
      <span>Physics + CS at Stanford</span>
      <em>ML for fundamental science</em>
      <div class="hud-credentials">
        <button type="button" data-action="research">Research</button>
        <a href="/resume.pdf" target="_blank" rel="noopener">CV</a>
        <a href="mailto:jrbailey555@gmail.com">Contact</a>
      </div>`;
    name
      .querySelector<HTMLButtonElement>('[data-action="research"]')!
      .addEventListener('click', () => {
        options.onOpenPanel?.('research');
      });
    root.appendChild(name);

    const plain = document.createElement('a');
    plain.className = 'hud-plain';
    plain.href = '/about.html';
    plain.textContent = 'quick portfolio ↗';
    root.appendChild(plain);

    this.journey = document.createElement('button');
    this.journey.className = 'hud-journey';
    this.journey.innerHTML = '<span aria-hidden="true">▶</span> take the journey';
    this.journey.setAttribute('aria-label', 'Take the guided journey from the galaxy to my desk');
    this.journey.addEventListener('click', () => {
      this.engage();
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
      dot.addEventListener('click', () => {
        this.engage();
        onNavigate(i);
      });
      dots.appendChild(dot);
      this.dots.push(dot);
    });
    root.appendChild(dots);

    this.stepLabel = document.createElement('div');
    this.stepLabel.className = 'hud-step-label';
    this.stepLabel.setAttribute('aria-hidden', 'true');
    root.appendChild(this.stepLabel);

    const zoom = document.createElement('div');
    zoom.className = 'hud-zoom';
    const zin = document.createElement('button');
    zin.textContent = '+';
    zin.setAttribute('aria-label', 'Zoom in');
    zin.addEventListener('click', () => {
      this.engage();
      onZoomStep(1);
    });
    const zout = document.createElement('button');
    zout.textContent = '−';
    zout.setAttribute('aria-label', 'Zoom out');
    zout.addEventListener('click', () => {
      this.engage();
      onZoomStep(-1);
    });
    zoom.append(zin, zout);
    root.appendChild(zoom);

    const touchNav = document.createElement('div');
    touchNav.className = 'hud-touch-nav';
    const outward = document.createElement('button');
    outward.type = 'button';
    outward.textContent = 'zoom out';
    outward.setAttribute('aria-label', 'Travel outward one level');
    outward.addEventListener('click', () => {
      this.engage();
      onZoomStep(-1);
    });
    const inward = document.createElement('button');
    inward.type = 'button';
    inward.textContent = 'zoom in';
    inward.setAttribute('aria-label', 'Travel inward one level');
    inward.addEventListener('click', () => {
      this.engage();
      onZoomStep(1);
    });
    touchNav.append(outward, inward);
    root.appendChild(touchNav);

    this.toolsToggle = document.createElement('button');
    this.toolsToggle.type = 'button';
    this.toolsToggle.className = 'hud-tools-toggle';
    this.toolsToggle.textContent = 'help & tools';
    this.toolsToggle.setAttribute('aria-label', 'Open help and universe tools');
    this.toolsToggle.setAttribute('aria-controls', 'universe-tools');
    this.toolsToggle.setAttribute('aria-expanded', 'false');
    this.toolsToggle.addEventListener('click', () => {
      const open = !this.tools.classList.contains('mobile-open');
      this.tools.classList.toggle('mobile-open', open);
      this.toolsToggle.setAttribute('aria-expanded', String(open));
    });
    root.appendChild(this.toolsToggle);

    this.tools = document.createElement('div');
    this.tools.id = 'universe-tools';
    this.tools.className = 'hud-tools';
    const toolsHelp = document.createElement('p');
    toolsHelp.className = 'hud-tools-help';
    toolsHelp.textContent =
      'Travel: scroll, pinch, arrows, or scene steps. Field log = saved progress. Drift = free camera.';
    this.scaleToggle = document.createElement('button');
    this.scaleToggle.type = 'button';
    this.scaleToggle.textContent = 'scale: cinematic';
    this.scaleToggle.setAttribute('aria-label', 'Toggle Solar System scale mode');
    this.scaleToggle.setAttribute('aria-pressed', 'false');
    this.scaleToggle.addEventListener('click', () => {
      const mode = options.onScaleToggle?.() ?? 'cinematic';
      this.scaleToggle.textContent = `scale: ${mode}`;
      this.scaleToggle.setAttribute('aria-pressed', String(mode === 'real'));
      this.addObservation(
        'scale-mode',
        'Scale mode',
        mode === 'cinematic'
          ? 'Cinematic scale enlarges planet bodies while keeping real orbital positions.'
          : 'Real scale keeps body sizes physically honest; reticles keep planets discoverable.',
      );
    });
    this.ambientToggle = document.createElement('button');
    this.ambientToggle.type = 'button';
    this.ambientToggle.textContent = 'ambient: off';
    this.ambientToggle.setAttribute('aria-label', 'Toggle ambient space audio');
    this.ambientToggle.setAttribute('aria-pressed', 'false');
    this.ambientToggle.addEventListener('click', async () => {
      const active = await options.onAmbientToggle?.();
      this.ambientToggle.textContent = `ambient: ${active ? 'on' : 'off'}`;
      this.ambientToggle.setAttribute('aria-pressed', String(Boolean(active)));
    });
    this.driftToggle = document.createElement('button');
    this.driftToggle.type = 'button';
    this.driftToggle.textContent = 'drift: off';
    this.driftToggle.setAttribute('aria-label', 'Toggle free drift camera mode');
    this.driftToggle.setAttribute('aria-pressed', 'false');
    this.driftToggle.addEventListener('click', () => {
      const active = options.onDriftToggle?.() ?? false;
      this.driftToggle.textContent = `drift: ${active ? 'on' : 'off'}`;
      this.driftToggle.setAttribute('aria-pressed', String(active));
      if (active)
        this.addObservation(
          'drift-mode',
          'Drift mode',
          'Pointer movement adds a gentle free-flight offset inside the current scale.',
        );
    });
    this.logToggle = document.createElement('button');
    this.logToggle.type = 'button';
    this.logToggle.textContent = 'field log';
    this.logToggle.setAttribute('aria-label', 'Open field log');
    this.logToggle.setAttribute('aria-expanded', 'false');
    this.logToggle.setAttribute('aria-controls', 'observation-log');
    this.logToggle.addEventListener('click', () => {
      const open = !this.logPanel.classList.contains('open');
      this.logPanel.classList.toggle('open', open);
      this.logToggle.setAttribute('aria-expanded', String(open));
    });
    this.tools.append(
      toolsHelp,
      this.scaleToggle,
      this.ambientToggle,
      this.driftToggle,
      this.logToggle,
    );
    root.appendChild(this.tools);

    this.logPanel = document.createElement('div');
    this.logPanel.id = 'observation-log';
    this.logPanel.className = 'observation-log';
    const logHead = document.createElement('div');
    logHead.className = 'observation-log-head';
    const logTitle = document.createElement('strong');
    logTitle.textContent = 'Field log';
    this.resetLog = document.createElement('button');
    this.resetLog.type = 'button';
    this.resetLog.textContent = 'reset';
    this.resetLog.setAttribute('aria-label', 'Reset field log progress');
    this.resetLog.addEventListener('click', () => this.requestFieldLogReset());
    logHead.append(logTitle, this.resetLog);
    const intro = document.createElement('p');
    intro.textContent =
      'Travel through the universe to collect visited scales and evidence signals.';
    const sceneTitle = document.createElement('h3');
    sceneTitle.textContent = 'Visited scales';
    this.sceneLogList = document.createElement('ul');
    this.sceneLogList.dataset.kind = 'scene';
    const signalTitle = document.createElement('h3');
    signalTitle.textContent = 'Collected signals';
    this.signalLogList = document.createElement('ul');
    this.signalLogList.dataset.kind = 'signal';
    this.logPanel.append(
      logHead,
      intro,
      sceneTitle,
      this.sceneLogList,
      signalTitle,
      this.signalLogList,
    );
    root.appendChild(this.logPanel);
    this.restoreFieldLog();
    this.renderFieldLog();

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
    const label = this.dots[index]?.dataset.label ?? `Scene ${index + 1}`;
    this.stepLabel.textContent = `${label} · ${index + 1} of ${this.dots.length}`;
    this.root.dataset.scene = String(index);
    this.scaleToggle.hidden = index !== 1;
    if (index !== 1 && this.scaleToggle === document.activeElement) {
      this.toolsToggle.focus();
    }
  }

  setMode(mode: 'travel' | 'computer'): void {
    this.root.dataset.mode = mode;
    document.body.dataset.hudMode = mode;
  }

  /** Hide the journey button while the guided tour is running. */
  setTouring(active: boolean): void {
    this.journey.classList.toggle('hidden', active);
    document.body.dataset.tour = active ? 'active' : 'idle';
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

  addObservation(
    id: string,
    title: string,
    body: string,
    destination?: ObservationDestination,
  ): void {
    this.collectSignal(id, title, body, destination);
  }

  markSceneVisited(
    id: string,
    title: string,
    body: string,
    destination?: ObservationDestination,
  ): void {
    this.addLogEntry('scene', id, title, body, destination);
  }

  collectSignal(
    id: string,
    title: string,
    body: string,
    destination?: ObservationDestination,
  ): void {
    this.addLogEntry('signal', id, title, body, destination);
  }

  private addLogEntry(
    kind: LogKind,
    id: string,
    title: string,
    body: string,
    destination?: ObservationDestination,
  ): void {
    const map = kind === 'scene' ? this.sceneVisits : this.signalObservations;
    if (map.has(id)) return;
    map.set(id, { title, body, destination });
    this.persistFieldLog();
    this.renderFieldLog();
  }

  private requestFieldLogReset(): void {
    if (this.resetLog.dataset.confirming === 'true') {
      this.resetFieldLog();
      return;
    }
    this.resetLog.dataset.confirming = 'true';
    this.resetLog.textContent = 'confirm reset';
    this.resetLog.setAttribute('aria-label', 'Confirm reset field log progress');
    this.live.textContent = 'Press confirm reset to clear saved field log progress';
    if (this.resetConfirmTimer) clearTimeout(this.resetConfirmTimer);
    this.resetConfirmTimer = setTimeout(() => this.cancelFieldLogReset(), 10_000);
  }

  private cancelFieldLogReset(): void {
    if (this.resetConfirmTimer) clearTimeout(this.resetConfirmTimer);
    this.resetConfirmTimer = null;
    delete this.resetLog.dataset.confirming;
    this.resetLog.textContent = 'reset';
    this.resetLog.setAttribute('aria-label', 'Reset field log progress');
  }

  private resetFieldLog(): void {
    this.cancelFieldLogReset();
    this.sceneVisits.clear();
    this.signalObservations.clear();
    try {
      localStorage.removeItem(FIELD_LOG_KEY);
    } catch {
      /* private mode: in-memory reset is enough */
    }
    this.renderFieldLog();
    this.live.textContent = 'Field log reset';
  }

  private restoreFieldLog(): void {
    try {
      const raw = localStorage.getItem(FIELD_LOG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedFieldLog>;
      for (const [id, entry] of Object.entries(parsed.scenes ?? {})) {
        if (validEntry(entry)) this.sceneVisits.set(id, entry);
      }
      for (const [id, entry] of Object.entries(parsed.signals ?? {})) {
        if (validEntry(entry)) this.signalObservations.set(id, entry);
      }
    } catch {
      /* corrupted/private storage: start fresh */
    }
  }

  private persistFieldLog(): void {
    try {
      const data: PersistedFieldLog = {
        scenes: Object.fromEntries(this.sceneVisits),
        signals: Object.fromEntries(this.signalObservations),
      };
      localStorage.setItem(FIELD_LOG_KEY, JSON.stringify(data));
    } catch {
      /* private mode: keep the in-memory log */
    }
  }

  private renderFieldLog(): void {
    this.sceneLogList.replaceChildren();
    this.signalLogList.replaceChildren();
    for (const entry of this.sceneVisits.values()) {
      this.sceneLogList.appendChild(this.renderLogItem(entry));
    }
    for (const entry of this.signalObservations.values()) {
      this.signalLogList.appendChild(this.renderLogItem(entry));
    }
    const hasItems = this.sceneVisits.size > 0 || this.signalObservations.size > 0;
    this.logPanel.classList.toggle('has-items', hasItems);
    this.sceneLogList.classList.toggle('empty', this.sceneVisits.size === 0);
    this.signalLogList.classList.toggle('empty', this.signalObservations.size === 0);
    if (this.sceneVisits.size === 0) {
      this.sceneLogList.appendChild(emptyItem('No scales visited in this browser yet.'));
    }
    if (this.signalObservations.size === 0) {
      this.signalLogList.appendChild(emptyItem('Select a glowing signal to collect evidence.'));
    }
  }

  private renderLogItem(entry: ObservationEntry): HTMLLIElement {
    const item = document.createElement('li');
    const heading = document.createElement('strong');
    heading.textContent = entry.title;
    const copy = document.createElement('span');
    copy.textContent = entry.body;
    item.append(heading, copy);
    if (entry.destination) {
      const destination = entry.destination;
      const action =
        destination.type === 'url' ? document.createElement('a') : document.createElement('button');
      action.className = 'observation-route';
      action.textContent = `${destination.label} →`;
      if (destination.type === 'url') {
        const link = action as HTMLAnchorElement;
        link.href = destination.href;
        if (destination.href.startsWith('http') || destination.href.endsWith('.pdf')) {
          link.target = '_blank';
          link.rel = 'noopener';
        }
      } else {
        action.type = 'button';
        action.addEventListener('click', () => {
          this.logPanel.classList.remove('open');
          this.logToggle.setAttribute('aria-expanded', 'false');
          this.onOpenDestination?.(destination);
        });
      }
      item.appendChild(action);
    }
    return item;
  }

  showHint(text: string): void {
    this.hint.textContent = text;
    this.hint.classList.remove('hidden');
  }

  hideHint(): void {
    this.hint.classList.add('hidden');
  }

  private engage(): void {
    this.root.dataset.engaged = 'true';
    this.stopPulse();
  }
}

function emptyItem(text: string): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'empty';
  const copy = document.createElement('span');
  copy.textContent = text;
  item.appendChild(copy);
  return item;
}

function validEntry(value: unknown): value is ObservationEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ObservationEntry).title === 'string' &&
    typeof (value as ObservationEntry).body === 'string'
  );
}
