import { frameAt, loadExperiment } from './omnifold-replay.js';
import { densityPixels } from './unfolding-density.js';

const examples = {
  hurdler: {
    response: '040',
    description:
      'The hurdler starts with distorted shape and colors. The detector blurs positions and sometimes confuses color categories.',
  },
  'photo-intensity': {
    response: '015',
    description:
      'The portrait uses the original photos as red, green, and blue intensity distributions. Both position and color are learned. The detector adds mild blur and color confusion.',
  },
};
const blend = (a, b, t) => Float32Array.from(a, (value, i) => value + (b[i] - value) * t);

export default async function mountUnfolding(root) {
  let experiment = await loadExperiment();
  const host = root.querySelector('[data-shared-demo]');
  const q = (name) => host.querySelector(`[data-shared-${name}]`);
  const timeline = q('iteration');
  const play = q('play');
  const selector = q('prior');
  const canvases = ['estimate', 'reference', 'reco', 'data'].map(q);
  for (const canvas of canvases)
    if (!canvas.getContext('2d')) throw new Error('Canvas is unavailable');
  root.querySelector('[data-demo-view]').hidden = false;

  let position = 0,
    playing = false,
    raf = 0,
    last = 0;
  let activeExample = 'hurdler',
    loading = false,
    failedExample = null;
  let fixedImages = new Map();
  const densityCanvas = document.createElement('canvas');
  const iterations = () => experiment.recommended_iteration ?? experiment.iterations;
  const end = () => iterations() * 3;
  const visible = () => {
    for (let ancestor = root; ancestor; ancestor = ancestor.parentElement)
      if (ancestor instanceof HTMLDetailsElement && !ancestor.open) return false;
    return true;
  };

  function densityImage(values, fixed = false) {
    if (fixed && fixedImages.has(values)) return fixedImages.get(values);
    const canvas = fixed ? document.createElement('canvas') : densityCanvas;
    canvas.width = canvas.height = experiment.grid;
    const pixels = densityPixels(
      values,
      experiment.grid,
      experiment.palette,
      experiment.display_scale,
      experiment.color_model,
    );
    canvas
      .getContext('2d')
      .putImageData(new ImageData(pixels, experiment.grid, experiment.grid), 0, 0);
    if (fixed) fixedImages.set(values, canvas);
    return canvas;
  }
  function paintDensity(canvas, values, fixed = false) {
    const width = Math.round(
      canvas.getBoundingClientRect().width * Math.min(devicePixelRatio || 1, 2),
    );
    if (!width) return;
    if (canvas.width !== width || canvas.height !== width) canvas.width = canvas.height = width;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, width, width);
    ctx.drawImage(densityImage(values, fixed), 0, 0, width, width);
  }
  function paint() {
    if (!visible()) return;
    const { before, after, fraction } = frameAt(experiment, position);
    const mix = (key) => (fraction ? blend(before[key], after[key], fraction) : before[key]);
    paintDensity(q('estimate'), mix('truthH'));
    paintDensity(q('reco'), mix('recoH'));
    paintDensity(q('reference'), experiment.reference, true);
    paintDensity(q('data'), experiment.measured, true);
    const completed = Math.floor((position + 1e-6) / 3);
    timeline.max = String(iterations());
    timeline.value = String(completed);
    q('iteration-value').textContent = `${completed} / ${iterations()}`;
    q('stage').textContent =
      position === 0
        ? 'Starting simulation'
        : `Iteration ${Math.ceil(position / 3)} of ${iterations()}`;
    timeline.setAttribute(
      'aria-valuetext',
      completed === 0 ? 'Starting simulation' : `Iteration ${completed} of ${iterations()}`,
    );
    play.textContent = playing ? 'Pause' : position >= end() ? 'Replay' : 'Play';
    q('method-example').textContent =
      examples[activeExample].description +
      (experiment.recommended_iteration
        ? ` Playback stops at iteration ${iterations()}, selected using independent detector data. Later iterations can amplify fluctuations; reference truth does not choose the stopping point.`
        : ` Playback shows ${iterations()} iterations.`);
  }
  function pause() {
    playing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    play.textContent = position >= end() ? 'Replay' : 'Play';
  }
  function frame(now) {
    if (!playing) return;
    // Render at most 30 fps. Each saved learning step takes just over half a second.
    if (now - last >= 1000 / 30) {
      position = Math.min(end(), position + Math.min(0.1, (now - last) / 1000) / 0.55);
      last = now;
      if (position >= end()) pause();
      paint();
    }
    if (playing) raf = requestAnimationFrame(frame);
  }
  play.addEventListener('click', () => {
    if (playing) return pause();
    if (position >= end()) position = 0;
    playing = true;
    last = performance.now();
    paint();
    raf = requestAnimationFrame(frame);
  });
  timeline.addEventListener('input', () => {
    pause();
    position = Number(timeline.value) * 3;
    paint();
  });
  async function changeExample(requested = selector.value) {
    if (loading) return;
    pause();
    loading = true;
    selector.disabled = play.disabled = timeline.disabled = true;
    q('loading').hidden = false;
    q('loading').textContent = 'Loading…';
    q('settings-retry').hidden = true;
    try {
      const replacement = await loadExperiment(requested, examples[requested].response);
      experiment = replacement;
      activeExample = selector.value = requested;
      position = 0;
      fixedImages = new Map();
      failedExample = null;
      q('loading').hidden = true;
      paint();
    } catch {
      failedExample = requested;
      selector.value = activeExample;
      q('loading').textContent = 'This example could not load. The current one is still available.';
      q('settings-retry').hidden = false;
    } finally {
      loading = false;
      selector.disabled = play.disabled = timeline.disabled = false;
    }
  }
  selector.addEventListener('change', () => changeExample());
  q('settings-retry').addEventListener('click', () => changeExample(failedExample));
  for (let ancestor = root; ancestor; ancestor = ancestor.parentElement)
    if (ancestor instanceof HTMLDetailsElement)
      ancestor.addEventListener('toggle', () => {
        if (!visible()) pause();
        else paint();
      });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  new ResizeObserver(paint).observe(host);
  paint();
}
