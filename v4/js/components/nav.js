export default function mountNav(nav, sections) {
  if (!nav) return { destroy() {} };

  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sectionList = [...sections];
  const linksById = new Map(links.map((link) => [decodeURIComponent(link.hash.slice(1)), link]));
  const visible = new Map();

  function setCurrent(id) {
    links.forEach((link) => link.removeAttribute('aria-current'));
    const active = linksById.get(id);
    if (active) active.setAttribute('aria-current', 'location');
  }

  const firstLinkedSection = sectionList.find((section) => linksById.has(section.id));
  if (firstLinkedSection) setCurrent(firstLinkedSection.id);

  if (!('IntersectionObserver' in window)) return { destroy() {} };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.set(entry.target.id, entry);
        else visible.delete(entry.target.id);
      });
      const active = [...visible.values()]
        .filter((entry) => linksById.has(entry.target.id))
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (active) setCurrent(active.target.id);
    },
    {
      rootMargin: '-12% 0px -70% 0px',
      threshold: [0, 0.25, 0.5, 0.75],
    },
  );

  sectionList.forEach((section) => observer.observe(section));

  return {
    destroy() {
      observer.disconnect();
      links.forEach((link) => link.removeAttribute('aria-current'));
    },
  };
}
