import OmniFoldToy from './omnifold-engine.js';

export default async function mountUnfolding(root) {
  const toy = new OmniFoldToy();
  const [simulation, truth] = await toy.loadFaces();
  toy.setupEngine(simulation, truth);
  await toy.runEngine();

  const view = root.querySelector('[data-demo-view]');
  const iteration = root.querySelector('#unfolding-iteration');
  const iterationValue = root.querySelector('#unfolding-iteration-value');
  const ess = root.querySelector('[data-ess]');
  const caption = root.querySelector('[data-result-caption]');
  const truthButton = root.querySelector('[data-reveal-truth]');
  let prior = 'y2024';
  let showTruth = false;

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
    toy.stipple(measured.context, measured.size, toy.E.rx, toy.E.ry, toy.E.ND, 0.35);
    const actual = prepare(root.querySelector('[data-truth]'));
    if (showTruth) {
      toy.stipple(actual.context, actual.size, toy.E.tx, toy.E.ty, toy.E.ND, 0.35);
    } else {
      actual.context.strokeStyle = '#dedbd3';
      actual.context.beginPath();
      actual.context.moveTo(0, 0);
      actual.context.lineTo(actual.size, actual.size);
      actual.context.moveTo(actual.size, 0);
      actual.context.lineTo(0, actual.size);
      actual.context.stroke();
    }
    iterationValue.value = String(index);
    ess.value = `${Math.round(frame.ess * 100)}%`;
    caption.textContent =
      index === 0
        ? 'Starting simulation, before reweighting.'
        : `Reweighted simulation after ${index} iteration${index === 1 ? '' : 's'}. Fixed display scale; largest dots capped.`;
    root
      .querySelector('[data-unfolded]')
      .setAttribute(
        'aria-label',
        `${prior === 'y2024' ? '2024-photo' : 'Uniform'} starting simulation, iteration ${index}. Effective sample size ${ess.value}. Summed weights in each display cell.`,
      );
    truthButton.textContent = showTruth ? 'Hide synthetic truth' : 'Show synthetic truth';
    truthButton.setAttribute('aria-pressed', String(showTruth));
    root
      .querySelector('[data-truth]')
      .setAttribute(
        'aria-label',
        showTruth
          ? 'Synthetic generating sample used to make the measured data'
          : 'Synthetic generating sample hidden. Use Show synthetic truth to reveal it.',
      );
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
  truthButton.addEventListener('click', () => {
    showTruth = !showTruth;
    paint();
  });
  root.addEventListener('toggle', paint);
  const observer = new ResizeObserver(paint);
  observer.observe(view);
  paint();
}
