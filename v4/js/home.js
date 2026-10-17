import { mountInstagramCarousel } from './components/instagram.js';
import mountPianoRoll from './components/piano-roll.js';
import { mountCourseAtlas } from './components/course-atlas.js';

mountInstagramCarousel(document.querySelector('[data-instagram]'));
mountPianoRoll(document.querySelector('#music'));

// The recording stays unloaded with the page. Once the music card is close to
// the viewport, fetch only its metadata so the player shows the real duration
// instead of 0:00.
const recording = document.querySelector('#music audio');
if (recording && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      if (recording.preload === 'none' && recording.paused && !recording.currentTime) {
        recording.preload = 'metadata';
        recording.load();
      }
    },
    { rootMargin: '300px 0px' },
  );
  observer.observe(recording);
}
mountCourseAtlas(document.querySelector('[data-course-atlas]'));

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
