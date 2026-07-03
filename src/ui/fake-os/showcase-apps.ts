import { trackEvent } from '../../analytics';

export const UNFOLDING_SEED = 0x51a7e;
const BIN_COUNT = 10;
const MAX_ITERATIONS = 6;

export interface ToyEvent {
  truth: number;
  reco: number | null;
}

export type UnfoldingScene = 1 | 2 | 3;
export type UnfoldingSceneAction = 'next' | 'previous' | 'restart';

function seededRandom(seed = UNFOLDING_SEED): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** A deterministic detector toy. Values are normalized to the displayed observable range. */
export function seededToyEvents(count: number, smearing = 0.42): ToyEvent[] {
  const random = seededRandom();
  const events: ToyEvent[] = [];
  for (let index = 0; index < count; index++) {
    const truth = Math.min(0.999, Math.max(0.001, (random() + random() + random() + random()) / 4));
    const lossProbability = 0.06 + smearing * 0.16;
    if (random() < lossProbability) {
      events.push({ truth, reco: null });
      continue;
    }
    const noise = (random() + random() + random() - 1.5) * smearing * 0.5;
    const reco = Math.min(0.999, Math.max(0.001, truth + 0.04 * smearing + noise));
    events.push({ truth, reco });
  }
  return events;
}

/** Precomputed-looking ill-conditioned inversion: alternating signs and edge growth. */
export function naiveInversionBins(): number[] {
  return [-1.08, 0.78, -0.53, 0.42, -0.31, 0.35, -0.46, 0.61, -0.86, 1.22];
}

export function nextUnfoldingScene(
  scene: UnfoldingScene,
  action: UnfoldingSceneAction,
): UnfoldingScene {
  if (action === 'restart') return 1;
  if (action === 'next') return Math.min(3, scene + 1) as UnfoldingScene;
  return Math.max(1, scene - 1) as UnfoldingScene;
}

function binEvents(events: ToyEvent[]): { truth: number[]; reco: number[]; lost: number } {
  const truth = Array<number>(BIN_COUNT).fill(0);
  const reco = Array<number>(BIN_COUNT).fill(0);
  let lost = 0;
  for (const event of events) {
    truth[Math.floor(event.truth * BIN_COUNT)]++;
    if (event.reco === null) lost++;
    else reco[Math.floor(event.reco * BIN_COUNT)]++;
  }
  return { truth, reco, lost };
}

function histogramBars(values: number[], kind: string, signed = false): string {
  const maximum = Math.max(1, ...values.map(Math.abs));
  return values
    .map((value, index) => {
      const height = (Math.abs(value) / maximum) * (signed ? 42 : 70);
      const x = 8 + index * 9.2;
      const y = signed ? (value >= 0 ? 50 - height : 50) : 88 - height;
      return `<rect class="${kind} ${value < 0 ? 'negative' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="7.2" height="${height.toFixed(1)}" />`;
    })
    .join('');
}

function eventCloud(): string {
  const random = seededRandom(UNFOLDING_SEED ^ 0xabc);
  return Array.from({ length: 30 }, (_, index) => {
    const truthX = 12 + random() * 33;
    const truthY = 12 + random() * 76;
    const recoX = 57 + random() * 32;
    const recoY = Math.min(88, Math.max(10, truthY + (random() - 0.42) * 27));
    const targetY = 49 + Math.sin((recoX - 57) * 0.2) * 25 + (random() - 0.5) * 8;
    return `<g class="os-pair" style="--delay:${(index * 31) % 500}ms">
      <line x1="${truthX.toFixed(1)}" y1="${truthY.toFixed(1)}" x2="${recoX.toFixed(1)}" y2="${recoY.toFixed(1)}" />
      <circle class="truth-dot" cx="${truthX.toFixed(1)}" cy="${truthY.toFixed(1)}" r="1.35"
        data-y="${truthY.toFixed(1)}" data-target-y="${(truthY + (targetY - recoY) * 0.58).toFixed(1)}" />
      <circle class="reco-dot" cx="${recoX.toFixed(1)}" cy="${recoY.toFixed(1)}" r="1.35"
        data-y="${recoY.toFixed(1)}" data-target-y="${targetY.toFixed(1)}" />
    </g>`;
  }).join('');
}

/**
 * An educational, deliberately schematic OmniFold visual. It demonstrates
 * classifier reweighting without presenting synthetic points as research data.
 */
export function unfoldingLabBody(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'os-doc os-lab';
  wrap.innerHTML = `
    <header class="os-instrument-hero">
      <span>research instrument · schematic — illustrative, not real data</span>
      <h2>Unfolding Lab</h2>
      <p>Why detector measurements are hard to reverse — and how paired event weights
      preserve more information than bins.</p>
    </header>
    <nav class="os-lab-scenes" aria-label="Unfolding demo scenes">
      <button type="button" data-scene="1" aria-current="step">1 · Shoot.</button>
      <button type="button" data-scene="2">2 · Try to invert.</button>
      <button type="button" data-scene="3">3 · Reweight instead.</button>
    </nav>
    <section class="os-lab-scene" data-scene-panel="1" aria-labelledby="unfold-scene-1">
      <div class="os-lab-heading"><span>schematic — illustrative, not real data</span><h3 id="unfold-scene-1">Shoot.</h3></div>
      <div class="os-gun-layout">
        <svg class="os-particle-gun" viewBox="0 0 240 105" role="img" aria-label="Particle gun firing through detector planes">
          <path class="gun" d="M10 45h38l18 8-18 8H10z" />
          <path class="beam" d="M65 53H224" />
          <path class="detector-plane" d="M105 12v82M150 12v82M195 12v82" />
          <circle class="event-tracer" cx="65" cy="53" r="4" />
          <text x="27" y="80">GUN</text><text x="150" y="103">DETECTOR</text>
        </svg>
        <div class="os-hist-pair">
          <figure><figcaption>TRUTH · clean</figcaption><svg viewBox="0 0 108 96" aria-label="Truth histogram"><g class="truth-bars"></g><path d="M5 5v84h99" /></svg></figure>
          <figure><figcaption>RECO · smeared + losses</figcaption><svg viewBox="0 0 108 96" aria-label="Reconstructed histogram"><g class="reco-bars"></g><path d="M5 5v84h99" /></svg></figure>
        </div>
      </div>
      <div class="os-lab-controls os-fire-controls">
        <button type="button" data-fire="1" aria-label="Fire one particle event">fire 1</button>
        <button type="button" data-fire="1000" aria-label="Fire one thousand particle events">fire 1000</button>
        <label>Smearing strength <output data-smear-output>42%</output>
          <input data-smear type="range" min="10" max="90" value="42" aria-label="Detector smearing strength" />
        </label>
      </div>
      <p class="os-lab-status" data-shoot-status role="status" aria-live="polite">Ready. Truth and reconstruction do not share a bin automatically.</p>
    </section>
    <section class="os-lab-scene" data-scene-panel="2" aria-labelledby="unfold-scene-2" hidden>
      <div class="os-lab-heading"><span>schematic — illustrative, not real data</span><h3 id="unfold-scene-2">Try to invert.</h3></div>
      <div class="os-invert-layout">
        <figure><figcaption>naive inverse</figcaption><svg viewBox="0 0 108 104" aria-label="Naive matrix inversion histogram"><path d="M5 50h99M5 5v94" /><g class="inverse-bars"></g></svg></figure>
        <div class="os-cell-demo" data-cells="20" aria-label="20 analysis cells"><span>20 cells</span></div>
      </div>
      <div class="os-lab-controls">
        <button type="button" data-invert>invert the matrix</button>
        <button type="button" data-observable>add an observable</button>
      </div>
      <p class="os-cell-counter" role="status" aria-live="polite">events per cell: <strong>50.0</strong></p>
      <p class="os-lab-caption">Binned unfolding drowns in dimensions — this is why 3D measurements didn't exist here.</p>
    </section>
    <section class="os-lab-scene" data-scene-panel="3" aria-labelledby="unfold-scene-3" hidden>
      <div class="os-lab-heading"><span>schematic — illustrative, not real data</span><h3 id="unfold-scene-3">Reweight instead.</h3></div>
      <figure class="os-paired-events">
        <svg viewBox="0 0 100 100" role="img" aria-label="Paired truth and reconstructed simulation events reweighted toward data">
          <path class="data-silhouette" d="M55 72C62 65 62 24 72 19s10 38 18 46" />
          ${eventCloud()}
          <text x="27" y="97">TRUTH</text><text x="73" y="97">RECO → DATA</text>
        </svg>
        <figcaption>The same event weight travels across each truth–reco pairing.</figcaption>
      </figure>
      <div class="os-lab-controls os-iterate-controls">
        <label>Iterate <output data-iteration-output>1 / ${MAX_ITERATIONS}</output>
          <input data-iteration type="range" min="1" max="${MAX_ITERATIONS}" value="1" step="1" aria-label="OmniFold iteration" />
        </label>
      </div>
      <aside class="os-unfold-end-card">
        <strong>What the method made possible</strong>
        <p>This method reproduced a published MINERvA measurement with a fully independent
        uncertainty budget, then extended it to 3, 4, and 5 simultaneous observables —
        measurements binned methods couldn't produce.</p>
        <small>Qualitative research context · no unpublished numerical results shown.</small>
      </aside>
    </section>
    <div class="os-lab-footer">
      <button type="button" data-previous aria-label="Previous unfolding scene">← previous</button>
      <span data-scene-count>scene 1 / 3</span>
      <button type="button" data-next aria-label="Next unfolding scene">next →</button>
    </div>
    <p class="os-attract-status" aria-live="polite">Attract mode · any interaction pauses autoplay</p>`;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const truthBars = wrap.querySelector<SVGGElement>('.truth-bars')!;
  const recoBars = wrap.querySelector<SVGGElement>('.reco-bars')!;
  const shootStatus = wrap.querySelector<HTMLElement>('[data-shoot-status]')!;
  const smear = wrap.querySelector<HTMLInputElement>('[data-smear]')!;
  const smearOutput = wrap.querySelector<HTMLOutputElement>('[data-smear-output]')!;
  const inverseBars = wrap.querySelector<SVGGElement>('.inverse-bars')!;
  const cellDemo = wrap.querySelector<HTMLElement>('.os-cell-demo')!;
  const cellCounter = wrap.querySelector<HTMLElement>('.os-cell-counter strong')!;
  const iteration = wrap.querySelector<HTMLInputElement>('[data-iteration]')!;
  const iterationOutput = wrap.querySelector<HTMLOutputElement>('[data-iteration-output]')!;
  const attractStatus = wrap.querySelector<HTMLElement>('.os-attract-status')!;
  let scene: UnfoldingScene = 1;
  let fired = 0;
  let autoplay = !reducedMotion;
  const timers: number[] = [];

  const renderEvents = (count: number) => {
    const events = seededToyEvents(count, Number(smear.value) / 100);
    const bins = binEvents(events);
    truthBars.innerHTML = histogramBars(bins.truth, 'truth-bar');
    recoBars.innerHTML = histogramBars(bins.reco, 'reco-bar');
    fired = count;
    const mismatch = events.find(
      (event) =>
        event.reco !== null &&
        Math.floor(event.truth * BIN_COUNT) !== Math.floor(event.reco * BIN_COUNT),
    );
    wrap.classList.toggle('tracing-event', Boolean(mismatch) && count < 10 && !reducedMotion);
    shootStatus.textContent = `${count.toLocaleString()} event${count === 1 ? '' : 's'} fired · ${bins.lost} lost${mismatch ? ' · tracer crossed a bin boundary' : ''}.`;
  };

  const renderIteration = () => {
    const pass = Number(iteration.value);
    const progress = pass / MAX_ITERATIONS;
    iterationOutput.value = `${pass} / ${MAX_ITERATIONS}`;
    for (const dot of wrap.querySelectorAll<SVGCircleElement>('.os-pair circle')) {
      const start = Number(dot.dataset.y);
      const target = Number(dot.dataset.targetY);
      dot.setAttribute('cy', String(start + (target - start) * progress));
      dot.setAttribute('r', String(1.15 + progress * 0.75));
    }
    wrap.querySelector('.os-paired-events')?.setAttribute('data-iteration', String(pass));
  };

  const renderCells = (cells: number) => {
    cellDemo.dataset.cells = String(cells);
    cellDemo.setAttribute('aria-label', `${cells.toLocaleString()} analysis cells`);
    cellDemo.querySelector('span')!.textContent = `${cells.toLocaleString()} cells`;
    cellCounter.textContent = Math.max(0.01, 1000 / cells).toFixed(cells >= 8000 ? 2 : 1);
  };

  const enterScene = (next: UnfoldingScene) => {
    scene = next;
    for (const panel of wrap.querySelectorAll<HTMLElement>('[data-scene-panel]')) {
      panel.hidden = Number(panel.dataset.scenePanel) !== scene;
    }
    for (const button of wrap.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
      const current = Number(button.dataset.scene) === scene;
      button.toggleAttribute('aria-current', current);
    }
    wrap.querySelector<HTMLElement>('[data-scene-count]')!.textContent = `scene ${scene} / 3`;
    trackEvent(`/event/unfolding-lab/scene-${scene}`);
    if (reducedMotion) {
      if (scene === 1) renderEvents(1000);
      if (scene === 2) {
        inverseBars.innerHTML = histogramBars(naiveInversionBins(), 'inverse-bar', true);
        renderCells(8000);
      }
      if (scene === 3) {
        iteration.value = String(MAX_ITERATIONS);
        renderIteration();
      }
    }
  };

  const stopAutoplay = () => {
    if (!autoplay) return;
    autoplay = false;
    timers.forEach((timer) => window.clearTimeout(timer));
    attractStatus.textContent = 'Attract mode paused · explore with the controls';
  };

  wrap.addEventListener('pointerdown', stopAutoplay);
  wrap.addEventListener('keydown', stopAutoplay);
  for (const button of wrap.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
    button.addEventListener('click', () =>
      enterScene(Number(button.dataset.scene) as UnfoldingScene),
    );
  }
  wrap
    .querySelector<HTMLButtonElement>('[data-next]')!
    .addEventListener('click', () => enterScene(nextUnfoldingScene(scene, 'next')));
  wrap
    .querySelector<HTMLButtonElement>('[data-previous]')!
    .addEventListener('click', () => enterScene(nextUnfoldingScene(scene, 'previous')));
  for (const button of wrap.querySelectorAll<HTMLButtonElement>('[data-fire]')) {
    button.addEventListener('click', () => renderEvents(Number(button.dataset.fire)));
  }
  smear.addEventListener('input', () => {
    smearOutput.value = `${smear.value}%`;
    if (fired) renderEvents(fired);
  });
  wrap.querySelector<HTMLButtonElement>('[data-invert]')!.addEventListener('click', () => {
    inverseBars.innerHTML = histogramBars(naiveInversionBins(), 'inverse-bar', true);
    shootStatus.textContent =
      'The inverse amplifies noise into alternating positive and negative bins.';
  });
  wrap.querySelector<HTMLButtonElement>('[data-observable]')!.addEventListener('click', () => {
    const stages = [20, 400, 8000];
    stages.forEach((cells, index) => {
      const update = () => renderCells(cells);
      if (reducedMotion) update();
      else timers.push(window.setTimeout(update, index * 520));
    });
  });
  iteration.addEventListener('input', renderIteration);

  inverseBars.innerHTML = '';
  renderEvents(reducedMotion ? 1000 : 1);
  renderCells(reducedMotion ? 8000 : 20);
  renderIteration();
  enterScene(1);
  if (autoplay) {
    const autoplaySteps: Array<[number, () => void]> = [
      [4500, () => renderEvents(1000)],
      [15000, () => enterScene(2)],
      [
        18500,
        () => (inverseBars.innerHTML = histogramBars(naiveInversionBins(), 'inverse-bar', true)),
      ],
      [22000, () => renderCells(8000)],
      [30000, () => enterScene(3)],
      [
        34000,
        () => {
          iteration.value = '3';
          renderIteration();
        },
      ],
      [
        41000,
        () => {
          iteration.value = String(MAX_ITERATIONS);
          renderIteration();
        },
      ],
    ];
    for (const [delay, action] of autoplaySteps) {
      timers.push(
        window.setTimeout(() => {
          if (autoplay && wrap.isConnected) action();
        }, delay),
      );
    }
  } else {
    attractStatus.textContent = 'Reduced motion · autoplay disabled; transitions are instant';
  }
  return wrap;
}

const NOTES = [
  ['C4', 261.63, 'A'],
  ['D4', 293.66, 'S'],
  ['E4', 329.63, 'D'],
  ['F4', 349.23, 'F'],
  ['G4', 392, 'G'],
  ['A4', 440, 'H'],
  ['B4', 493.88, 'J'],
  ['C5', 523.25, 'K'],
] as const;

type Instrument = 'piano' | 'saxophone';

function playTone(context: AudioContext, frequency: number, instrument: Instrument): void {
  const now = context.currentTime;
  const output = context.createGain();
  output.connect(context.destination);
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(instrument === 'piano' ? 0.18 : 0.11, now + 0.018);
  output.gain.exponentialRampToValueAtTime(0.0001, now + (instrument === 'piano' ? 1.25 : 0.72));

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = instrument === 'piano' ? 3600 : 1500;
  filter.Q.value = instrument === 'piano' ? 0.7 : 4.5;
  filter.connect(output);

  const oscillators =
    instrument === 'piano' ? (['sine', 'triangle'] as const) : (['sawtooth'] as const);
  oscillators.forEach((type, index) => {
    const oscillator = context.createOscillator();
    const voiceGain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency * (index ? 2 : 1);
    voiceGain.gain.value = index ? 0.14 : 1;
    oscillator.connect(voiceGain).connect(filter);
    oscillator.start(now);
    oscillator.stop(now + (instrument === 'piano' ? 1.3 : 0.76));
  });

  if (instrument === 'saxophone') {
    const carrier = context.createOscillator();
    const vibrato = context.createOscillator();
    const vibratoDepth = context.createGain();
    carrier.type = 'square';
    carrier.frequency.value = frequency;
    vibrato.frequency.value = 5.2;
    vibratoDepth.gain.value = 3.8;
    vibrato.connect(vibratoDepth).connect(carrier.frequency);
    const carrierGain = context.createGain();
    carrierGain.gain.value = 0.22;
    carrier.connect(carrierGain).connect(filter);
    carrier.start(now);
    vibrato.start(now);
    carrier.stop(now + 0.76);
    vibrato.stop(now + 0.76);
  }
}

/** A small, dependency-free WebAudio instrument with pointer and keyboard input. */
export function musicStudioBody(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'os-doc os-music';
  wrap.tabIndex = 0;
  wrap.innerHTML = `
    <header class="os-instrument-hero">
      <span>practice room · WebAudio</span>
      <h2>Music Studio</h2>
      <p>Classical piano and jazz saxophone are two ways of thinking in real time:
      structure first, then interpretation.</p>
    </header>
    <div class="os-instrument-tabs" role="group" aria-label="Choose an instrument">
      <button type="button" class="selected" data-instrument="piano" aria-pressed="true">Piano</button>
      <button type="button" data-instrument="saxophone" aria-pressed="false">Alto sax</button>
    </div>
    <div class="os-keyboard" role="group" aria-label="Playable C major scale"></div>
    <p class="os-music-help">Select a key, or focus this window and use A S D F G H J K.</p>
    <p class="os-music-status" role="status" aria-live="polite">Audio starts after your first note.</p>
    <div class="os-music-credentials">
      <span><b>Piano</b> MTAC Certificate of Merit Level 10 · State + Branch Honors</span>
      <span><b>Winds</b> Stanford Jazz Orchestra & combos · alto sax, flute, clarinet</span>
    </div>`;

  let instrument: Instrument = 'piano';
  let context: AudioContext | null = null;
  const status = wrap.querySelector<HTMLElement>('.os-music-status')!;
  const keyboard = wrap.querySelector<HTMLElement>('.os-keyboard')!;
  const trigger = (note: (typeof NOTES)[number]) => {
    const AudioContextClass = window.AudioContext;
    context ??= new AudioContextClass();
    void context.resume();
    playTone(context, note[1], instrument);
    status.textContent = `${instrument === 'piano' ? 'Piano' : 'Alto sax'} · ${note[0]}`;
    const key = keyboard.querySelector<HTMLElement>(`[data-note="${note[0]}"]`);
    key?.classList.add('playing');
    window.setTimeout(() => key?.classList.remove('playing'), 150);
  };

  for (const note of NOTES) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'os-music-key';
    key.dataset.note = note[0];
    key.setAttribute('aria-label', `Play ${note[0]}`);
    key.innerHTML = `<span>${note[0]}</span><kbd>${note[2]}</kbd>`;
    key.addEventListener('click', () => trigger(note));
    keyboard.appendChild(key);
  }
  for (const button of wrap.querySelectorAll<HTMLButtonElement>('[data-instrument]')) {
    button.addEventListener('click', () => {
      instrument = button.dataset.instrument as Instrument;
      for (const peer of wrap.querySelectorAll<HTMLButtonElement>('[data-instrument]')) {
        const selected = peer === button;
        peer.classList.toggle('selected', selected);
        peer.setAttribute('aria-pressed', String(selected));
      }
      status.textContent = `${instrument === 'piano' ? 'Piano' : 'Alto sax'} selected.`;
    });
  }
  wrap.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
    const note = NOTES.find((entry) => entry[2].toLowerCase() === event.key.toLowerCase());
    if (!note) return;
    event.preventDefault();
    trigger(note);
  });
  return wrap;
}

export function athleticsBody(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'os-doc os-athletics';
  wrap.innerHTML = `
    <header class="os-instrument-hero os-track-hero">
      <span>stanford track & field · ncaa division i</span>
      <h2>Ten hurdles. One lap.</h2>
      <p>The 400-meter hurdles compresses sprint mechanics, rhythm, and fatigue into
      roughly fifty seconds. Progress is measured in hundredths and built across seasons.</p>
      <div class="os-track-stat">
        <strong>52.17</strong><span>400 m hurdles personal best<br />2025 ACC Championships</span>
      </div>
    </header>
    <section class="os-track-progress" aria-labelledby="track-progress-title">
      <h3 id="track-progress-title">Collegiate progression</h3>
      <div class="os-track-bars">
        <div><span>2024 · Big Meet</span><b style="--progress: 64%">54.65</b></div>
        <div><span>2025 · ACC Championships</span><b style="--progress: 91%">52.17</b></div>
      </div>
      <p>2.48 seconds faster across the first two outdoor seasons.</p>
    </section>
    <ol class="os-track-timeline">
      <li><time>2024</time><div><strong>First Stanford outdoor season</strong><span>54.65 personal best at the Big Meet.</span></div></li>
      <li><time>2025</time><div><strong>Four 400H personal bests</strong><span>Won the Payton Jordan Invitational in 53.16.</span></div></li>
      <li><time>2025</time><div><strong>ACC Championships · 52.17</strong><span>No. 14 on Stanford’s all-time list at the time of the race.</span></div></li>
      <li><time>2025</time><div><strong>Heart and Hustle Award</strong><span>Stanford Track & Field.</span></div></li>
    </ol>
    <a class="os-project-link" href="https://gostanford.com/sports/track-field/roster/player/joseph-bailey"
      target="_blank" rel="noopener">Official Stanford profile ↗</a>`;
  return wrap;
}
