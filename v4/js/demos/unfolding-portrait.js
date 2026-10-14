import OmniFoldToy from './omnifold-engine.js';

export default async function mountUnfolding(root) {
  const toy = new OmniFoldToy();
  const [simulation, truth] = await toy.loadFaces();
  toy.setupEngine(simulation, truth);
  await toy.runEngine();

  const view = root.querySelector('[data-portrait-view]');
  const iteration = root.querySelector('#unfolding-iteration');
  const iterationValue = root.querySelector('#unfolding-iteration-value');
  const ess = root.querySelector('[data-ess]');
  const caption = root.querySelector('[data-result-caption]');
  const insight = root.querySelector('[data-demo-insight]');
  let prior = 'y2024';

  // Render data, estimate, and target with identical binning and dot-area scale.
  const sampleFrame = (xs, ys) => {
    const { M, ND } = toy.E;
    const H = new Float32Array(M * M);
    for (let i = 0; i < ND; i++) {
      const x = Math.min(M - 1, Math.max(0, Math.floor(xs[i] * M)));
      const y = Math.min(M - 1, Math.max(0, Math.floor(ys[i] * M)));
      H[y * M + x]++;
    }
    const sorted = Array.from(H).sort((a, b) => a - b);
    return { H, ref: sorted[Math.floor(0.98 * (M * M - 1))] };
  };
  const measuredFrame = sampleFrame(toy.E.rx, toy.E.ry);
  const targetFrame = sampleFrame(toy.E.tx, toy.E.ty);
  toy.E.displayRef = Math.max(toy.E.displayRef, measuredFrame.ref, targetFrame.ref);

  function prepare(canvas) {
    const size = Math.max(1, canvas.getBoundingClientRect().width);
    const ratio = devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(size * ratio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);
    return { context, size };
  }

  function paint() {
    if (!root.open) return;
    const index = Number(iteration.value);
    const frame = toy.E.sims[prior].frames[index];
    const main = prepare(root.querySelector('[data-unfolded]'));
    toy.halftone(main.context, main.size, frame);
    const measured = prepare(root.querySelector('[data-measured]'));
    toy.halftone(measured.context, measured.size, measuredFrame);
    const actual = prepare(root.querySelector('[data-truth]'));
    toy.halftone(actual.context, actual.size, targetFrame);
    iterationValue.value = String(index);
    ess.value = `${Math.round(frame.ess * 100)}%`;
    caption.textContent =
      index === 0
        ? 'Starting simulation'
        : `After ${index} reweighting step${index === 1 ? '' : 's'}`;
    root
      .querySelector('[data-unfolded]')
      .setAttribute(
        'aria-label',
        `${prior === 'y2024' ? '2024-photo' : 'Uniform'} starting simulation, iteration ${index}. Effective sample size ${ess.value}. Summed weights in each display cell.`,
      );
    insight.textContent =
      index === 0
        ? 'At step 0, the estimate is just the starting simulation. Move the slider to change the weights.'
        : 'Only the middle panel changes. Compare it with the target: the simulation is being reweighted, while the measured data stay fixed.';
  }

  view.hidden = false;
  // Check canvas support before attaching listeners, so a failed mount can retry.
  if (!root.querySelector('[data-unfolded]').getContext('2d'))
    throw new Error('Canvas is unavailable');
  iteration.addEventListener('input', paint);
  root.querySelectorAll('[name="unfolding-prior"]').forEach((input) => {
    input.addEventListener('change', () => {
      prior = input.value;
      paint();
    });
  });
  root.addEventListener('toggle', paint);
  const observer = new ResizeObserver(paint);
  observer.observe(view);
  paint();
}
