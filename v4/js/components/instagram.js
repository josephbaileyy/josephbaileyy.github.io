export function mountInstagramCarousel(card) {
  if (!card) return;
  const slides = [...card.querySelectorAll('[data-instagram-slide]')];
  if (slides.length < 2) return;
  const dots = [...card.querySelectorAll('[data-instagram-dot]')];
  const count = card.querySelector('[data-instagram-count]');
  const status = card.querySelector('[data-instagram-status]');
  let index = 0;

  function move(direction) {
    index = (index + direction + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
    });
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    count.textContent = `${index + 1} / ${slides.length}`;
    status.textContent = `Post ${index + 1} of ${slides.length}, ${slides[index].dataset.postDate}.`;
  }

  card.querySelector('[data-instagram-prev]').addEventListener('click', () => move(-1));
  card.querySelector('[data-instagram-next]').addEventListener('click', () => move(1));
  card.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      // Retain keyboard focus on a stable control when the focused slide is hidden.
      if (event.target.closest('[data-instagram-slide]')) {
        card.querySelector('[data-instagram-next]').focus();
      }
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  card.querySelectorAll('[data-instagram-controls]').forEach((control) => {
    control.hidden = false;
  });
}
