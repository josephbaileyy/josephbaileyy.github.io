import { mountInstagramCarousel } from './components/instagram.js';

mountInstagramCarousel(document.querySelector('[data-instagram]'));

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
  status.textContent = 'Preparing the synthetic samples…';
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
}

addEventListener('hashchange', revealLinkedExplanation);
revealLinkedExplanation();
