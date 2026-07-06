function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function createTelemetry({
  chapterReadout = document.querySelector('#chapter-readout'),
  progressBar = document.querySelector('#page-progress-bar'),
} = {}) {
  const chapters = [...document.querySelectorAll('.chapter')].map((element) => ({
    element,
    label: `${element.dataset.chapter || '--'} ${element.dataset.title || 'UNTITLED'}`,
  }));

  let currentLabel = '';

  function getChapterLabel() {
    const centerY = window.scrollY + window.innerHeight * 0.5;
    const active = chapters.find(({ element }) => {
      const rect = element.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + element.offsetHeight;
      return centerY >= top && centerY < bottom;
    });

    return (active || chapters[chapters.length - 1])?.label || '-- WORLDLINE';
  }

  function update({ pageProgress = 0 } = {}) {
    const label = getChapterLabel();

    if (chapterReadout && label !== currentLabel) {
      chapterReadout.textContent = label;
      currentLabel = label;
    }

    if (progressBar) {
      progressBar.style.transform = `scaleX(${clamp01(pageProgress).toFixed(4)})`;
    }
  }

  update();

  return {
    update,
  };
}
