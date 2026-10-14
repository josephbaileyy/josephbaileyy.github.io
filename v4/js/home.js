import { mountInstagramCarousel } from './components/instagram.js';
import mountPianoRoll from './components/piano-roll.js';

mountInstagramCarousel(document.querySelector('[data-instagram]'));
mountPianoRoll(document.querySelector('#music'));

const disclosure = document.querySelector('[data-demo="unfolding"]');
let loading = false;
let initialized = false;

async function loadDemo() {
  if (initialized || loading || !disclosure?.open) return;
  loading = true;
  const status = disclosure.querySelector('[data-demo-status]');
  const retry = disclosure.querySelector('[data-demo-retry]');
  retry.hidden = true;
  status.hidden = false;
  status.textContent = 'Preparing the interactive example…';
  try {
    const { default: mountUnfolding } = await import('./demos/unfolding.js');
    await mountUnfolding(disclosure);
    initialized = true;
    status.hidden = true;
  } catch {
    disclosure.querySelector('[data-demo-view]').hidden = true;
    status.textContent =
      'The interactive toy could not load. You can still read the explanation and the research write-up.';
    retry.hidden = false;
  } finally {
    loading = false;
  }
}

disclosure?.addEventListener('toggle', loadDemo);
disclosure?.querySelector('[data-demo-retry]')?.addEventListener('click', loadDemo);

// Deep links to a figure reveal its native disclosure without intercepting
// anchor navigation or taking control of scrolling.
function revealLinkedExplanation() {
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) target.open = true;
  let ancestor = target?.parentElement;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }
}

addEventListener('hashchange', revealLinkedExplanation);
revealLinkedExplanation();

// Keep previously shared experience and education anchors useful after the move.
function redirectMovedSection() {
  if (
    document.querySelector('.introduction') &&
    ['#experience', '#education', '#wisdomtree', '#polytec'].includes(location.hash)
  ) {
    location.replace(new URL(`./about.html${location.hash}`, location.href));
  }
}

addEventListener('hashchange', redirectMovedSection);
redirectMovedSection();
