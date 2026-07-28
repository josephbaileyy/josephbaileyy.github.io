export default function mountReveal(elements) {
  const targets = [...elements];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !targets.length || !('IntersectionObserver' in window)) {
    return { destroy() {} };
  }

  document.documentElement.classList.add('reveal-ready');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  targets.forEach((target) => observer.observe(target));
  return {
    destroy() {
      observer.disconnect();
      document.documentElement.classList.remove('reveal-ready');
    },
  };
}
