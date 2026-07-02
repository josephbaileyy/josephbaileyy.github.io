const TRUTH = [0.12, 0.25, 0.51, 0.83, 1, 0.86, 0.58, 0.36, 0.22, 0.14];
const DETECTOR = [0.24, 0.38, 0.56, 0.7, 0.75, 0.7, 0.59, 0.46, 0.34, 0.25];

function chartPath(values: number[]): string {
  return values
    .map((value, index) => {
      const x = 38 + (index / (values.length - 1)) * 424;
      const y = 180 - value * 132;
      return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
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
      <span>research instrument · schematic</span>
      <h2>Unfolding Lab</h2>
      <p>Move from a detector-smeared distribution toward particle level by iteratively
      reweighting simulated events. This illustrates the OmniFold idea; it is not a
      thesis result.</p>
    </header>
    <ol class="os-omnifold-flow" aria-label="OmniFold workflow">
      <li><b>1</b><span>simulated<br />events</span></li>
      <li><b>2</b><span>detector-level<br />classifier</span></li>
      <li><b>3</b><span>event<br />weights</span></li>
      <li><b>4</b><span>particle-level<br />estimate</span></li>
    </ol>
    <figure class="os-unfold-chart">
      <svg viewBox="0 0 500 210" role="img" aria-labelledby="unfold-title unfold-desc">
        <title id="unfold-title">Schematic detector and unfolded distributions</title>
        <desc id="unfold-desc">A broad detector-level curve approaches a sharper reference
        curve as the number of reweighting passes increases.</desc>
        <g class="os-chart-grid" aria-hidden="true">
          <path d="M38 48H462M38 92H462M38 136H462M38 180H462" />
          <path d="M38 34V180H470" />
        </g>
        <text x="250" y="204">reconstructed observable</text>
        <text x="12" y="112" transform="rotate(-90 12 112)">relative events</text>
        <path class="os-curve os-curve-truth" d="${chartPath(TRUTH)}" />
        <path class="os-curve os-curve-detector" d="${chartPath(DETECTOR)}" />
        <path class="os-curve os-curve-unfolded" />
      </svg>
      <figcaption>
        <span><i class="truth"></i> reference</span>
        <span><i class="detector"></i> detector-smeared</span>
        <span><i class="unfolded"></i> reweighted estimate</span>
      </figcaption>
    </figure>
    <div class="os-lab-controls">
      <label for="omnifold-pass">Reweighting passes <output>3 / 5</output></label>
      <input id="omnifold-pass" type="range" min="0" max="5" value="3" step="1" />
      <button type="button">Run iteration</button>
    </div>
    <p class="os-lab-status" role="status" aria-live="polite"></p>
    <aside class="os-method-note">
      <strong>What the thesis tests</strong>
      <p>OmniFold versus iterative Bayesian unfolding on MINERvA open data, using closure
      tests, generator stress tests, bootstrap resampling, and covariance analysis.</p>
    </aside>`;

  const range = wrap.querySelector<HTMLInputElement>('input[type="range"]')!;
  const output = wrap.querySelector<HTMLOutputElement>('output')!;
  const curve = wrap.querySelector<SVGPathElement>('.os-curve-unfolded')!;
  const status = wrap.querySelector<HTMLElement>('.os-lab-status')!;
  const button = wrap.querySelector<HTMLButtonElement>('.os-lab-controls button')!;
  let timer = 0;

  const render = () => {
    const pass = Number(range.value);
    const progress = 1 - Math.exp(-pass * 0.7);
    const estimate = DETECTOR.map((value, index) => value + (TRUTH[index] - value) * progress);
    curve.setAttribute('d', chartPath(estimate));
    output.value = `${pass} / 5`;
    status.textContent =
      pass === 0
        ? 'Pass 0: the detector response broadens and shifts the distribution.'
        : `Pass ${pass}: classifier-derived event weights move the estimate toward particle level.`;
  };
  range.addEventListener('input', render);
  button.addEventListener('click', () => {
    window.clearInterval(timer);
    range.value = '0';
    render();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      range.value = '5';
      render();
      return;
    }
    timer = window.setInterval(() => {
      if (!wrap.isConnected || Number(range.value) >= 5) {
        window.clearInterval(timer);
        return;
      }
      range.value = String(Number(range.value) + 1);
      render();
    }, 430);
  });
  render();
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
