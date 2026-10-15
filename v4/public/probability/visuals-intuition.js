import {cdfExperiment, typewriter, nextVisit, spikeExperiment, tailExperiment} from './intuition-models.js';

const green = '#285e4b', gold = '#976318', pale = '#dbe9e2', light = '#f0ede4', ink = '#35483e';
const f = x => Number(x.toFixed(4)).toString();
const text = (x, y, s, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const line = (x1, y1, x2, y2, color = '#bdc9c0', dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const dot = (x, y, filled = true, color = green) => `<circle cx="${x}" cy="${y}" r="5" fill="${filled ? color : 'white'}" stroke="${color}" stroke-width="2"/>`;
const svg = (body, h, label, control = '') => `<svg viewBox="0 0 480 ${h}" role="img" aria-label="${label}" ${control ? `data-scrub="${control}"` : ''}>${body}</svg>`;
const panel = (title, body, note = '') => `<section class="intuition-panel"><h4>${title}</h4>${body}${note ? `<p class="intuition-note">${note}</p>` : ''}</section>`;
const cards = items => `<div class="intuition-metrics">${items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
const button = (title, action) => `<button type="button" data-experiment="${action}">${title}</button>`;
const prompt = s => `<p class="intuition-prompt"><b>Predict first.</b> ${s}</p>`;

// Keep controls and self-explanations outside the redrawn chart, preserving focus
// and open disclosures. Native sliders are also the keyboard alternative to scrubbing.
function enhance(root, {question, explanation, actions = {}, disabled = {}, play = false}) {
  const controls = root.querySelector('.controls');
  if (!controls) return; // Pure draw callbacks are also exercised by Node tests.
  root.classList.add('intuition-lab');
  const reflection = document.createElement('details');
  reflection.className = 'intuition-reflection';
  reflection.innerHTML = `<summary>${question}</summary><p>${explanation}</p>`;
  root.append(reflection);
  const get = name => Number(root.querySelector(`[data-control="${name}"]`).value);
  const set = (name, value) => {
    const input = root.querySelector(`[data-control="${name}"]`);
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles: true}));
  };
  const updateButtons = () => {
    for (const [action, predicate] of Object.entries(disabled)) {
      const b = root.querySelector(`[data-experiment="${action}"]`);
      if (b) b.disabled = predicate(get);
    }
  };
  root.addEventListener('input', e => { if (e.isTrusted) stop(); updateButtons(); });
  root.addEventListener('change', updateButtons);
  updateButtons();
  let timer;
  const stop = () => {
    clearInterval(timer); timer = null;
    const b = root.querySelector('[data-experiment="play"]');
    if (b) { b.textContent = 'Play sweep'; b.setAttribute('aria-pressed', 'false'); }
  };
  if (play) {
    controls.insertAdjacentHTML('beforeend', button('Play sweep', 'play'));
    root.querySelector('[data-experiment="play"]').setAttribute('aria-pressed', 'false');
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-experiment]');
    if (!b) return;
    if (b.dataset.experiment === 'play') {
      if (timer) { stop(); return; }
      if (get('n') >= 210) set('n', 1);
      b.textContent = 'Pause'; b.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => {
        if (!root.isConnected || !root.getClientRects().length || document.hidden || get('n') >= 210) { stop(); return; }
        set('n', get('n') + 1);
      }, 450);
    } else { stop(); actions[b.dataset.experiment]?.({get, set}); }
  });
  // Document visibility is shared, but the listener owns only this lab's timer.
  if (play) document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') stop(); });
  let dragging = false;
  function scrub(e) {
    const plot = root.querySelector('[data-scrub]');
    if (!plot) return;
    const box = plot.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, ((e.clientX - box.left) / box.width * 480 - 48) / 400));
    const name = plot.dataset.scrub;
    set(name, name === 'x' ? Math.round((-2 + 6 * t) * 100) / 100 : Math.max(.01, Math.round(t * 100) / 100));
  }
  root.addEventListener('pointerdown', e => {
    if (!e.target.closest('[data-scrub]') || e.button !== 0) return;
    stop(); dragging = true; root.setPointerCapture(e.pointerId); scrub(e);
  });
  root.addEventListener('pointermove', e => { if (dragging) scrub(e); });
  root.addEventListener('pointerup', () => { dragging = false; });
  root.addEventListener('pointercancel', () => { dragging = false; });
  root.addEventListener('lostpointercapture', () => { dragging = false; });
}

export function mountCDF(root, {setup, range}) {
  setup(root, prompt('At a jump, is the mass already counted? Compare just before, exactly at, and just after 1.') +
    range('x', 'Threshold α', -2, 4, 1, .01) + range('p', 'Mass at 1', 0, 1, .5, .05) +
    `<div class="intuition-actions">${button('Just before 1', 'before')}${button('Exactly at 1', 'at')}${button('Just after 1', 'after')}${button('Reset experiment', 'reset')}</div>`, v => {
    const m = cdfExperiment(v.x, v.p), X = x => 48 + (x + 2) / 6 * 400, Y = y => 150 - 115 * y;
    let masses = line(48, 150, 448, 150) + line(48, 35, 48, 150) + text(39, 40, '1', 'end') + text(39, 155, '0', 'end');
    m.values.forEach((x, i) => {
      const color = x <= v.x ? green : '#86968c';
      masses += line(X(x), 150, X(x), Y(m.masses[i]), color) + dot(X(x), Y(m.masses[i]), true, color) + text(X(x), 177, x, 'middle') + text(X(x), Y(m.masses[i]) - 12, f(m.masses[i]), 'middle');
    });
    masses += line(X(v.x), 22, X(v.x), 150, gold, '5 4');
    let cdf = line(48, 150, 448, 150) + line(48, 35, 48, 150) + text(39, 40, '1', 'end') + text(39, 155, '0', 'end');
    let start = -2, total = 0;
    m.values.forEach((x, i) => {
      cdf += line(X(start), Y(total), X(x), Y(total), green);
      if (m.masses[i] > 0) cdf += dot(X(x), Y(total), false) + line(X(x), Y(total), X(x), Y(total + m.masses[i]), green, '3 4');
      total += m.masses[i];
      cdf += dot(X(x), Y(total)) + text(X(x), 177, x, 'middle'); start = x;
    });
    cdf += line(X(start), Y(total), X(4), Y(total), green) + line(X(v.x), 22, X(v.x), 150, gold, '5 4') + dot(X(v.x), Y(m.cdf), true, gold);
    return [panel('1 · Choose which masses to collect', svg(masses, 195, 'Probability masses with a movable threshold', 'x'), 'Drag across this plot, or use the threshold slider. Green masses are included.') +
      panel('2 · Read their accumulated probability', svg(cdf, 195, 'Right-continuous CDF for the same masses'), 'Same horizontal scale. A filled dot is included; an open dot is the left limit.') +
      cards([['P(X &lt; α)', f(m.below)], ['P(X = α)', f(m.at)], ['F(α) = P(X ≤ α)', f(m.cdf)]]),
      `<b>${f(m.below)} + ${f(m.at)} = ${f(m.cdf)}.</b> ${m.at > 0 ? 'The endpoint contributes the entire jump now.' : 'There is no mass exactly at this threshold, so strict and non-strict probabilities agree.'}`];
  });
  enhance(root, {question: 'Explain: why does the CDF include the upper dot?', explanation: 'The event is X ≤ α. At α = 1 it already includes every outcome with value 1. Moving a little farther right adds nothing until the next atom. In this finite law, changing the mass at 1 changes the jump by exactly that amount; the remaining mass is split 40% at −1 and 60% at 3.', actions: {
    before: ({set}) => set('x', .99), at: ({set}) => set('x', 1), after: ({set}) => set('x', 1.01), reset: ({set}) => {set('x', 1); set('p', .5);}
  }});
}

export function mountTypewriter(root, {setup, range}) {
  setup(root, prompt('If the lit interval becomes rare, must your fixed outcome eventually stop lighting up? Keep ω fixed and seek its next visit.') +
    range('n', 'Time n', 1, 210, 8) + range('w', 'Fixed outcome ω', .01, 1, .37, .01) +
    `<div class="intuition-actions">${button('Next visit to ω', 'visit')}${button('Next sweep', 'sweep')}${button('Reset experiment', 'reset')}</div>`, v => {
    const t = typewriter(v.n, v.w), next = nextVisit(v.n, v.w), X = x => 48 + 400 * x;
    let space = line(48, 80, 448, 80) + `<rect x="${X(t.left)}" y="48" width="${400 / t.k}" height="32" fill="${pale}" stroke="${green}" stroke-width="2"/>`;
    space += dot(X(t.left), 64) + dot(X(t.right), 64) + line(X(v.w), 25, X(v.w), 100, gold, '4 3') + text(X(v.w), 20, `ω = ${f(v.w)}`, v.w < .15 ? 'start' : v.w > .85 ? 'end' : 'middle') + text(48, 125, '0') + text(448, 125, '1', 'end');
    const start = Math.floor((v.n - 1) / 35) * 35 + 1, end = Math.min(210, start + 34);
    let history = line(48, 85, 448, 85) + text(38, 39, '1', 'end') + text(38, 90, '0', 'end');
    for (let n = start; n <= end; n++) {
      const x = 48 + (n - start + .5) * 400 / 35, hit = typewriter(n, v.w).value;
      history += `<rect x="${x - 3}" y="${hit ? 35 : 80}" width="6" height="${hit ? 50 : 5}" fill="${hit ? gold : '#bac7be'}"/>`;
      if (n === v.n) history += `<rect x="${x - 5}" y="26" width="10" height="66" fill="none" stroke="${green}" stroke-width="2"/>`;
    }
    history += text(48, 117, `n = ${start}`) + text(448, 117, end, 'end');
    let sweeps = '';
    for (let row = 0; row < 3; row++) {
      const k = t.k + row, y = 34 + row * 43;
      sweeps += `<text class="sweep-label" x="6" y="${y + 19}">k=${k}</text>`;
      for (let i = 1; i <= k; i++) {
        const n = k * (k - 1) / 2 + i, hit = typewriter(n, v.w).value;
        sweeps += `<rect x="${X((i - 1) / k)}" y="${y}" width="${400 / k}" height="27" fill="${n === v.n ? green : hit ? '#e9d5ae' : light}" stroke="white"/>`;
      }
    }
    sweeps += line(X(v.w), 26, X(v.w), 151, gold, '4 3') + text(48, 177, '0') + text(448, 177, '1', 'end');
    return [panel(`1 · Freeze time: sweep ${t.k}, cell ${t.i}`, svg(space, 143, 'Current closed interval and fixed outcome', 'w'), `Active interval [${f(t.left)}, ${f(t.right)}]. Drag to choose ω. The sample space excludes 0.`) +
      cards([['Chance of a lit outcome', `1/${t.k} = ${f(t.probability)}`], ['At your fixed ω', `Xₙ(ω) = ${t.value}`]]) +
      panel('2 · Freeze ω: follow it through time', svg(history, 134, 'Thirty-five successive values along the selected outcome'), 'Gold bars are visits (value 1); short marks are zeros. The green outline marks now. This window follows the time slider.') +
      panel('3 · Each complete sweep visits you again', svg(sweeps, 194, 'Three consecutive sweeps, each partitioning the unit interval'), 'Cells in a row occur at different times. Gold cells contain ω; green is the current cell. Closed boundaries can belong to two cells. The extra sweeps are a finite look ahead.'),
      `<b>Next visit: n = ${next}${next > 210 ? ' (beyond the time slider)' : ''}.</b> At each fixed time, the lit probability is 1/k → 0. But every complete sweep covers ω, so visits recur at arbitrarily late times.`];
  });
  enhance(root, {play: true, disabled: {visit: get => nextVisit(get('n'),get('w')) > 210, sweep: get => typewriter(get('n'),get('w')).k >= 20}, question: 'Explain: which quantifier changes?', explanation: 'Convergence in probability looks at one time n and measures the whole bad event. Almost sure convergence fixes an outcome first and asks about all sufficiently late times. Here P(Xₙ > ε) = 1/k for 0 &lt; ε &lt; 1, yet every ω is visited in every sweep. No finite animation proves this: the covering property of every sweep does.', actions: {
    visit: ({get, set}) => set('n', Math.min(210, nextVisit(get('n'), get('w')))),
    sweep: ({get, set}) => {const k = typewriter(get('n'), get('w')).k; set('n', Math.min(210, k * (k + 1) / 2 + 1));},
    reset: ({set}) => {set('n', 8); set('w', .37);}
  }});
}

function rectanglePlot(width, height, ymax, marker, label) {
  const X = x => 48 + 400 * x, Y = y => 152 - 115 * y / ymax;
  let b = line(48, 152, 448, 152) + line(48, 37, 48, 152) + text(48, 20, `height ${f(ymax)}`) + text(40, 157, '0', 'end');
  b += `<rect x="48" y="${Y(height)}" width="${400 * width}" height="${115 * height / ymax}" fill="${pale}" stroke="${green}" stroke-width="1.5"/>`;
  if (marker !== undefined) b += line(X(marker), 25, X(marker), 152, gold, '5 3');
  b += text(48, 179, '0') + text(448, 179, '1', 'end');
  return svg(b, 196, label);
}

export function mountSpike(root, {setup, range}) {
  setup(root, prompt('Double n. The support halves, but what happens to the area after raising the height to the qth power?') +
    range('n', 'Stage n', 1, 128, 4) + range('q', 'Moment exponent q', .5, 4, 2, .5) + range('w', 'Fixed outcome ω', .01, 1, .37, .01) +
    `<div class="intuition-actions">${button('Double n', 'double')}${button('Move past this outcome', 'escape')}${button('Reset experiment', 'reset')}</div>`, v => {
    const s = spikeExperiment(v.n, v.q, v.w), later = spikeExperiment(2 * v.n, v.q, v.w), ymax = later.height;
    return [panel('1 · Narrower support, taller values', `<div class="intuition-compare"><div><p>Now · n = ${v.n}</p>${rectanglePlot(s.width, s.height, ymax, v.w, 'Current spike')}</div><div><p>Compare · n = ${2 * v.n}</p>${rectanglePlot(later.width, later.height, ymax, v.w, 'Spike at twice the index')}</div></div>`, `Both charts use the same height scale, 0 to ${f(ymax)}; it changes with n and q. Gold fixes ω. Widths are drawn to scale.`) +
      cards([['Support probability 1/n', f(s.width)], ['Height n¹/ᑫ', f(s.height)], ['At your fixed ω', f(s.value)]]) +
      panel('2 · Raise to q: the area stays one', rectanglePlot(s.width, v.n, 2 * v.n, undefined, 'Powered spike with height n and width one over n'), `|Yₙ|ᑫ has height ${v.n} and width 1/${v.n}. The powered plot has its own labeled height scale.`) +
      `<div class="intuition-equation">E|Yₙ|ᑫ = <span>${v.n}</span> × <span>1/${v.n}</span> = <strong>1</strong></div>`,
      `<b>At ω = ${f(v.w)}, Yₙ is zero for every n ≥ ${s.goneFrom}.</b> The support probability tends to zero, while the qth moment stays exactly 1. Thus Yₙ → 0 almost surely and in probability, but not in Lᑫ.`];
  });
  enhance(root, {disabled: {double: get => get('n') * 2 > 128, escape: get => get('n') >= Math.floor(1 / get('w')) + 1}, question: 'Explain: where does the integral go?', explanation: 'At each positive ω the spike eventually disappears. The positive height moves into a smaller region near 0, which is outside the sample space (0,1]. The qth power increases the height to n, exactly compensating for width 1/n. So the integral of the pointwise limit is 0 while every integral of the powered spike is 1. For 0 &lt; q &lt; 1 the moment criterion still makes sense, although it does not define a norm.', actions: {
    double: ({get, set}) => set('n', Math.min(128, get('n') * 2)),
    escape: ({get, set}) => set('n', Math.min(128, Math.floor(1 / get('w')) + 1)),
    reset: ({set}) => {set('n', 4); set('q', 2); set('w', .37);}
  }});
}

export function mountUI(root, {setup, range}) {
  setup(root, prompt('Can a cutoff that clears every displayed tail still fail for the whole sequence? Clear the preview, then inspect a later spike.') +
    '<label>Spike family<select data-control="family" aria-label="Spike family"><option value="0">Height n; mean 1</option><option value="1">Height √n; mean 1/√n</option></select></label>' +
    range('n', 'Preview through index N', 1, 40, 12) + range('M', 'Tail cutoff M', 0, 40, 5, .5) + range('eps', 'Target tail budget ε', .05, .5, .2, .05) +
    `<div class="intuition-actions">${button('Clear every preview tail', 'clear')}${button('Try a larger cutoff', 'raise')}${button('Reset experiment', 'reset')}</div>`, v => {
    const m = tailExperiment(v.n, v.M, v.family), Y = y => 145 - 110 * y;
    let bars = line(48, 145, 448, 145) + text(40, 40, '1', 'end') + text(40, 150, '0', 'end');
    m.tails.forEach((tail, i) => {bars += `<rect x="${48 + i * 400 / v.n}" y="${Y(tail)}" width="${Math.max(1, 400 / v.n - 2)}" height="${110 * tail}" fill="${green}"/>`;});
    bars += line(48, Y(v.eps), 448, Y(v.eps), gold, '5 4') + text(48, 174, 'n = 1') + text(448, 174, `N = ${v.n}`, 'end');
    const width = 400 / m.witness, top = 34, bottom = 149, cut = bottom - 115 * v.M / m.height;
    let witness = line(48, bottom, 448, bottom) + line(48, top, 48, bottom) + `<rect x="48" y="34" width="${width}" height="115" fill="#e9d5ae" stroke="${gold}"/>` + line(48, cut, 448, cut, green, '5 4') + text(448, Math.max(20, cut - 8), `M = ${f(v.M)}`, 'end') + text(48, 178, '0') + text(448, 178, '1', 'end');
    return [panel('1 · Test the finite preview', svg(bars, 192, 'Tail expectations for the first N spikes'), `Each bar is E[|Xₙ| 1{|Xₙ| > M}]. Dashed line: target ε = ${f(v.eps)}. Zero-height bars vanish.`) +
      cards([['Maximum over n ≤ N', f(m.finite)], ['Supremum over all n ≥ 1', f(m.supremum)]]) +
      panel(`2 · Inspect the witness n* = ${m.witness}`, svg(witness, 196, 'A spike whose entire positive rectangle exceeds the cutoff'), `Height ${f(m.height)} > M; width 1/${m.witness}. Gold is the whole tail contribution, not just the part above M. Height scale resets to ${f(m.height)}; very thin supports can be subpixel.`) +
      `<div class="intuition-equation">${v.family ? 'n* = ⌊M²⌋ + 1 · tail = 1/√n*' : 'n* = ⌊M⌋ + 1 · tail = 1'}</div>`,
      `<b>${m.supremum < v.eps ? 'One cutoff controls the whole family at this budget.' : m.finite < v.eps ? 'The preview passes; the whole family fails this budget.' : 'The tail budget is not yet met.'}</b> ${v.family ? 'The first integer n > M² has the largest remaining tail. Its value 1/√n* tends to zero as M grows: this family is uniformly integrable.' : 'For every finite M there is an integer n > M. That spike still has tail expectation 1: this family is not uniformly integrable.'}`];
  });
  enhance(root, {disabled: {raise: get => get('M') >= 40}, question: 'Explain: why is checking finitely many n insufficient?', explanation: 'Any finite collection here has bounded heights, so some cutoff makes all its tails zero. Uniform integrability asks for one cutoff that works for every index, including the unshown ones. The height-n family always has a later tail of size 1. For height √n, every remaining tail is at most 1/√(⌊M²⌋+1), which tends to zero. The exact formulas, rather than the finite bars, establish these conclusions. The strict inequality > M excludes a spike whose height equals M.', actions: {
    clear: ({get, set}) => set('M', Math.ceil((get('family') ? Math.sqrt(get('n')) : get('n')) * 2) / 2),
    raise: ({get, set}) => set('M', Math.min(40, get('M') + 5)),
    reset: ({set}) => {set('family', 0); set('n', 12); set('M', 5); set('eps', .2);}
  }});
}
