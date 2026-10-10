export function mountCourseAtlas(root) {
  if (!root) return;
  const controls = root.querySelector('[data-atlas-controls]');
  const buttons = [...root.querySelectorAll('[data-atlas-area]')];
  const groups = [...root.querySelectorAll('[data-atlas-group]')];

  function selectArea(area) {
    for (const group of groups) {
      group.hidden = group.dataset.atlasGroup !== area;
    }
    buttons.forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.atlasArea === area)),
    );
  }

  controls.addEventListener('click', (event) => {
    const button = event.target.closest('[data-atlas-area]');
    if (button) selectArea(button.dataset.atlasArea);
  });
  selectArea('ai');
  root.classList.add('is-enhanced');
  controls.hidden = false;
}
