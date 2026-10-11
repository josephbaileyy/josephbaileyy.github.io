// Adapted from Joseph's July 16, 2026 MINERvA talk, talk/anims.js (specA3).
// Preserve the seeded paired-event toy; expose pullback and truth-space learning
// as separate beats. Histogram ratios/conditional averages replace classifiers.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const phase = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
const blend = (a, b, p) => a.map((w, i) => lerp(w, b[i], p));
const bins = 18;
const duration = 31;
const beats = [0, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 31];
const C = {
  data: '#e9e9ed',
  prior: '#5b8ed6',
  weighted: '#d96c6c',
  accent: '#b5abfc',
  dim: '#b0b4c6',
  rule: '#41465d',
};

function histogram(values, weights) {
  const h = Array(bins).fill(0);
  values.forEach((x, i) => {
    h[clamp(Math.floor(x * bins), 0, bins - 1)] += weights ? weights[i] : 1;
  });
  return h;
}

export function createIterationToy() {
  let seed = 20260716;
  function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const gauss = () =>
    Math.sqrt(-2 * Math.log(Math.max(random(), 1e-9))) * Math.cos(2 * Math.PI * random());
  const mix = (m1, s1, m2, s2, f) => {
    const g = gauss();
    return random() < f ? clamp(m1 + s1 * g, 0.02, 0.98) : clamp(m2 + s2 * g, 0.02, 0.98);
  };
  const smear = (t) => clamp(t + 0.055 * gauss(), 0, 1);
  const simT = [],
    simR = [],
    dataT = [],
    dataR = [],
    jitter = [];
  for (let i = 0; i < 280; i++) {
    const t = mix(0.35, 0.07, 0.7, 0.05, 0.6);
    simT.push(t);
    simR.push(smear(t));
  }
  for (let i = 0; i < 280; i++) {
    const t = mix(0.33, 0.075, 0.72, 0.055, 0.42);
    dataT.push(t);
    dataR.push(smear(t));
  }
  for (let i = 0; i < 280; i++) jitter.push(random());
  const dataH = histogram(dataR);
  const truthH = histogram(dataT);
  const weights = [Array(280).fill(1)],
    corrections = [];
  const bin = (v) => clamp(Math.floor(v * bins), 0, bins - 1);
  for (let k = 0; k < 4; k++) {
    const simH = histogram(simR, weights[k]);
    const corrected = weights[k].map(
      (w, i) => w * clamp((dataH[bin(simR[i])] + 0.25) / (simH[bin(simR[i])] + 0.25), 0.15, 6),
    );
    corrections.push(corrected);
    const sums = Array(bins).fill(0),
      counts = Array(bins).fill(0);
    simT.forEach((t, i) => {
      sums[bin(t)] += corrected[i];
      counts[bin(t)]++;
    });
    const learned = sums.map((sum, b) => (counts[b] ? sum / counts[b] : 1));
    weights.push(simT.map((t) => learned[bin(t)]));
  }
  // One vertical scale for all frames, including the hidden reference.
  const peak = Math.max(
    ...dataH,
    ...truthH,
    ...weights.flatMap((w) => histogram(simT, w)),
    ...corrections.flatMap((w) => histogram(simR, w)),
    ...corrections.flatMap((w) => histogram(simT, w)),
  );
  return { simT, simR, dataH, truthH, jitter, weights, corrections, peak };
}

function stateAt(toy, t) {
  let truth = toy.weights[0],
    reco = truth;
  let pull = 0;
  for (let k = 0; k < 4; k++) {
    const start = 4 + 6 * k;
    if (t < start) break;
    const p1 = phase(t, start, start + 2);
    const p2 = phase(t, start + 2, start + 4);
    const p3 = phase(t, start + 4, start + 6);
    reco =
      p3 > 0
        ? blend(toy.corrections[k], toy.weights[k + 1], p3)
        : blend(toy.weights[k], toy.corrections[k], p1);
    truth =
      p3 > 0
        ? blend(toy.corrections[k], toy.weights[k + 1], p3)
        : blend(toy.weights[k], toy.corrections[k], p2);
    pull = t >= start + 2 && t < start + 4 ? p2 : 0;
  }
  return { truth, reco, pull };
}

function describe(t) {
  if (t < 4)
    return {
      stage: 'Starting simulation',
      caption:
        'Data are measured only at detector level. Each simulated event has a truth partner above and a detector partner below. Play the animation or step through it.',
    };
  if (t >= 28)
    return {
      stage: 'Toy truth revealed',
      caption:
        'The dashed curve reveals the hidden toy truth. Compare it with the weighted estimate: finite samples and the toy approximation leave differences. The algorithm never used this curve.',
    };
  const k = Math.floor((t - 4) / 6) + 1;
  const part = (t - 4) % 6;
  if (part < 2)
    return {
      stage: `Iteration ${k} / 4 · Reweight`,
      caption:
        'Step 1: compare simulation with measured data at detector level and learn a correction. The dots change area, while their positions and the measured data stay fixed.',
    };
  if (part < 4)
    return {
      stage: `Iteration ${k} / 4 · Pull back`,
      caption:
        'Carry each detector correction to its own truth partner through the simulated pairing. The moving pulses show information travelling; the events themselves stay fixed.',
    };
  return {
    stage: `Iteration ${k} / 4 · Learn at truth`,
    caption:
      'Step 2: learn a truth-space reweight from the corrected sample. This toy averages weights within truth bins. Send the new weights back to the detector partners for the next iteration.',
  };
}

export function mountIteration(root) {
  const host = root.querySelector('[data-iteration-demo]');
  const canvas = host.querySelector('[data-iteration-canvas]');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const toy = createIterationToy();
  const playButton = host.querySelector('[data-iteration-play]');
  const progress = host.querySelector('[data-iteration-progress]');
  const stage = host.querySelector('[data-iteration-stage]');
  const caption = host.querySelector('[data-iteration-caption]');
  let time = 0,
    playing = false,
    raf = 0,
    last = 0;
  let lastStage = '';

  function draw() {
    if (!root.open) return;
    const w = canvas.getBoundingClientRect().width;
    if (!w) return;
    const h = w < 500 ? 410 : Math.max(420, Math.min(510, w * 0.57));
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.style.height = `${h}px`;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const x0 = w < 500 ? 18 : 34,
      x1 = w - x0;
    const upper = h * 0.39,
      lower = h * 0.88;
    const scale = (h * 0.25) / toy.peak;
    const { truth, reco, pull } = stateAt(toy, time);
    const warm = phase(time, 4, 6);
    const color = `rgb(${Math.round(lerp(91, 217, warm))},${Math.round(lerp(142, 108, warm))},${Math.round(lerp(214, 108, warm))})`;
    const x = (v) => x0 + v * (x1 - x0);
    const ty = (i) => upper + 12 + toy.jitter[i] * 18;
    const ry = (i) => lower - 12 - toy.jitter[i] * 18;
    const text = (s, px, py, fill = C.dim) => {
      ctx.fillStyle = fill;
      ctx.font = '500 12px system-ui, sans-serif';
      ctx.fillText(s, px, py);
    };
    text('TRUTH · before the detector', x0, 25);
    text('DETECTOR · what we measure', x0, h * 0.55);
    text('Observable →', x1 - 82, h - 12);
    ctx.strokeStyle = 'rgba(176,180,198,0.14)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.moveTo(x(toy.simT[i]), ty(i));
      ctx.lineTo(x(toy.simR[i]), ry(i));
      ctx.stroke();
    }
    if (pull > 0) {
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = Math.sin(Math.PI * pull) * 0.85;
      for (let i = 0; i < 90; i += 3) {
        ctx.beginPath();
        ctx.arc(
          lerp(x(toy.simR[i]), x(toy.simT[i]), pull),
          lerp(ry(i), ty(i), pull),
          2.5,
          0,
          2 * Math.PI,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function hist(values, base, stroke, fill, dashed = false) {
      const dx = (x1 - x0) / bins;
      ctx.beginPath();
      ctx.moveTo(x0, base);
      values.forEach((v, i) => {
        const y = base - v * scale;
        ctx.lineTo(x0 + i * dx, y);
        ctx.lineTo(x0 + (i + 1) * dx, y);
      });
      ctx.lineTo(x1, base);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = dashed ? 1.4 : 1.8;
      ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const base of [upper, lower]) {
      ctx.strokeStyle = C.rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, base);
      ctx.lineTo(x1, base);
      ctx.stroke();
    }
    // Keep the starting simulation as a faint reference as weights change.
    if (time > 4) {
      ctx.globalAlpha = 0.4;
      hist(histogram(toy.simT), upper, C.prior);
      hist(histogram(toy.simR), lower, C.prior);
      ctx.globalAlpha = 1;
    }
    hist(
      histogram(toy.simT, truth),
      upper,
      color,
      time > 4 ? 'rgba(217,108,108,0.18)' : 'rgba(91,142,214,0.18)',
    );
    hist(
      histogram(toy.simR, reco),
      lower,
      color,
      time > 4 ? 'rgba(217,108,108,0.18)' : 'rgba(91,142,214,0.18)',
    );
    const radius = w < 500 ? 1.5 : 2.3;
    for (let i = 0; i < toy.simT.length; i++) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.55;
      for (const [px, py, weight] of [
        [x(toy.simT[i]), ty(i), truth[i]],
        [x(toy.simR[i]), ry(i), reco[i]],
      ]) {
        ctx.beginPath();
        ctx.arc(px, py, clamp(radius * Math.sqrt(weight), 0.6, 7), 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.data;
    ctx.strokeStyle = C.data;
    ctx.lineWidth = 1;
    toy.dataH.forEach((v, b) => {
      if (!v) return;
      const px = x((b + 0.5) / bins),
        py = lower - v * scale;
      // Full sqrt(N) count bars for this synthetic sample.
      const e = Math.sqrt(v) * scale;
      ctx.beginPath();
      ctx.moveTo(px, py - e);
      ctx.lineTo(px, py + e);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, w < 500 ? 2.3 : 3, 0, 2 * Math.PI);
      ctx.fill();
    });
    if (time >= 28) {
      ctx.globalAlpha = phase(time, 28, 30);
      hist(toy.truthH, upper, C.data, null, true);
      text('– – Hidden toy truth', x0, 47, C.data);
      ctx.globalAlpha = 1;
    }
    const description = describe(time);
    stage.textContent = description.stage;
    if (lastStage !== description.stage) {
      caption.textContent = description.caption;
      lastStage = description.stage;
    }
    canvas.setAttribute('aria-label', `${description.stage}. ${description.caption}`);
    progress.value = String(Math.round(time * 10));
    host.querySelector('[data-iteration-prev]').disabled = time === 0;
    host.querySelector('[data-iteration-next]').disabled = time === duration;
  }

  function pause() {
    playing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    playButton.textContent = 'Play';
    playButton.setAttribute('aria-pressed', 'false');
  }
  function frame(now) {
    if (!playing) return;
    time = Math.min(duration, time + Math.min((now - last) / 1000, 0.05));
    last = now;
    draw();
    if (time >= duration) pause();
    else raf = requestAnimationFrame(frame);
  }
  function play() {
    if (time >= duration) time = 0;
    playing = true;
    last = performance.now();
    playButton.textContent = 'Pause';
    playButton.setAttribute('aria-pressed', 'true');
    raf = requestAnimationFrame(frame);
  }
  playButton.addEventListener('click', () => (playing ? pause() : play()));
  progress.addEventListener('input', () => {
    pause();
    time = Number(progress.value) / 10;
    draw();
  });
  for (const [selector, direction] of [
    ['prev', -1],
    ['next', 1],
  ]) {
    host.querySelector(`[data-iteration-${selector}]`).addEventListener('click', () => {
      pause();
      time =
        direction > 0
          ? (beats.find((b) => b > time + 0.01) ?? duration)
          : (beats.findLast((b) => b < time - 0.01) ?? 0);
      draw();
    });
  }
  host.querySelector('[data-iteration-reset]').addEventListener('click', () => {
    pause();
    time = 0;
    draw();
  });
  host.querySelector('[data-iteration-final]').addEventListener('click', () => {
    pause();
    time = duration;
    draw();
  });
  // Never autoplay; closing either disclosure or leaving the tab stops the loop.
  for (let ancestor = root; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor instanceof HTMLDetailsElement)
      ancestor.addEventListener('toggle', () => {
        if (!ancestor.open) pause();
        else draw();
      });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  new ResizeObserver(draw).observe(canvas);
  draw();
}
