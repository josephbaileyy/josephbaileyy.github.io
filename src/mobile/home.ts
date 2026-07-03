import { NOTES } from '../content/notes';
import { PORTFOLIO, SOCIALS, itemLinks, renderItems } from '../content/portfolio';
import { athleticsBody, musicStudioBody } from '../ui/fake-os/showcase-apps';
import '../styles/mobile-home.css';

const UNIVERSE_PREFERENCE_KEY = 'jb-universe-opt-in';
const DESTINATIONS = [
  'research',
  'projects',
  'cv',
  'music',
  'athletics',
  'notes',
  'contact',
] as const;
type Destination = (typeof DESTINATIONS)[number];

const labels: Record<Destination, string> = {
  research: 'Research',
  projects: 'Projects',
  cv: 'CV',
  music: 'Music',
  athletics: 'Athletics',
  notes: 'Notes',
  contact: 'Contact',
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character]!,
  );

const externalAttributes = (href: string): string =>
  href.startsWith('http') || href.endsWith('.pdf') ? ' target="_blank" rel="noopener"' : '';

function currentDestination(): Destination | null {
  const match = location.hash.match(/^#\/mobile\/([^/]+)$/);
  return match && DESTINATIONS.includes(match[1] as Destination) ? (match[1] as Destination) : null;
}

function cleanUniverseShell(): void {
  document.querySelector('.skip-link')?.remove();
  document.querySelector('body > header')?.remove();
  document.querySelector('.noscript-note')?.remove();
  document.querySelector('#universe')?.remove();
  document.querySelector('#universe-description')?.remove();
  document.querySelector('#a11y-layer')?.remove();
  document.querySelector('#hud')?.remove();
}

function renderLanding(root: HTMLElement): void {
  document.title = 'Joseph Bailey — Research, projects, and more';
  root.innerHTML = `
    <header class="mobile-hero">
      <p class="mobile-eyebrow">Joseph Bailey · Stanford Physics + CS</p>
      <h1>Machine learning for fundamental physics.</h1>
      <p>${escapeHtml(PORTFOLIO.profile.summary)}</p>
    </header>
    <main id="main-content">
      <nav class="mobile-destinations" aria-label="Portfolio destinations">
        ${DESTINATIONS.map(
          (destination) =>
            `<a href="#/mobile/${destination}" data-destination="${destination}">${labels[destination]}<span aria-hidden="true">→</span></a>`,
        ).join('')}
      </nav>
      <a class="mobile-universe-cta" href="#/galaxy" data-explore-universe>
        <span><strong>Explore the universe →</strong><small>The full interactive journey</small></span>
      </a>
    </main>`;

  root.querySelector('[data-explore-universe]')?.addEventListener('click', () => {
    try {
      localStorage.setItem(UNIVERSE_PREFERENCE_KEY, '1');
    } catch {
      /* The explicit route still opens the universe without persistence. */
    }
  });
}

function linksFor(item: (typeof PORTFOLIO.research)[number]): string {
  return itemLinks(item)
    .map(
      ({ label, href }) =>
        `<a href="${escapeHtml(href)}"${externalAttributes(href)}>${escapeHtml(label)}</a>`,
    )
    .join('');
}

function renderNotes(): string {
  return `<div class="mobile-card-list">${NOTES.map(
    (note) => `<article>
      <p class="mobile-meta">${escapeHtml(note.date)}</p>
      <h2><a href="/notes/${escapeHtml(note.slug)}.html">${escapeHtml(note.title)}</a></h2>
      <p>${escapeHtml(note.summary)}</p>
    </article>`,
  ).join('')}</div>`;
}

function renderContact(): string {
  const directLinks = PORTFOLIO.links.filter((link) =>
    ['Email', 'Stanford', 'GitHub', 'LinkedIn'].includes(link.label),
  );
  const socialLinks = SOCIALS.flatMap((social) => social.links ?? []);
  return `<div class="mobile-contact-list">
    ${[...directLinks, ...socialLinks]
      .map(
        ({ label, href }) =>
          `<a href="${escapeHtml(href)}"${externalAttributes(href)}><strong>${escapeHtml(label)}</strong><span>${escapeHtml(href.replace(/^mailto:/, ''))}</span></a>`,
      )
      .join('')}
  </div>`;
}

function renderCv(): string {
  return `
    <p>${escapeHtml(PORTFOLIO.profile.summary)}</p>
    <p><a class="mobile-primary-link" href="/resume.pdf" target="_blank" rel="noopener">Open CV (PDF) →</a></p>
    <h2>Experience</h2>
    ${renderItems(PORTFOLIO.experience)}
    <h2>Education</h2>
    ${renderItems(PORTFOLIO.education)}`;
}

function destinationHtml(destination: Destination): string {
  if (destination === 'research') return renderItems(PORTFOLIO.research);
  if (destination === 'projects') return renderItems(PORTFOLIO.projects);
  if (destination === 'cv') return renderCv();
  if (destination === 'notes') return renderNotes();
  if (destination === 'contact') return renderContact();
  return '';
}

function renderDestination(root: HTMLElement, destination: Destination): void {
  const label = labels[destination];
  document.title = `${label} — Joseph Bailey`;
  root.innerHTML = `
    <header class="mobile-page-header">
      <button type="button" data-mobile-back aria-label="Back to mobile home">← Home</button>
      <p class="mobile-eyebrow">Joseph Bailey</p>
      <h1>${label}</h1>
    </header>
    <main id="main-content" class="mobile-content"></main>`;
  const content = root.querySelector<HTMLElement>('.mobile-content')!;
  if (destination === 'music') content.appendChild(musicStudioBody());
  else if (destination === 'athletics') content.appendChild(athleticsBody());
  else content.innerHTML = destinationHtml(destination);

  root.querySelector('[data-mobile-back]')?.addEventListener('click', () => history.back());

  if (destination === 'research' || destination === 'projects') {
    for (const [itemIndex, item] of PORTFOLIO[destination].entries()) {
      const listItem = content.querySelectorAll('li')[itemIndex];
      if (!listItem || !itemLinks(item).length) continue;
      const existing = listItem.querySelectorAll('a');
      if (existing.length === 0) {
        listItem.insertAdjacentHTML('beforeend', linksFor(item));
      }
    }
  }
}

function render(root: HTMLElement): void {
  const destination = currentDestination();
  if (destination) renderDestination(root, destination);
  else renderLanding(root);
  window.scrollTo(0, 0);
}

export function mountMobileHome(): void {
  cleanUniverseShell();
  document.body.className = 'mobile-dom-home';
  document.body.dataset.app = 'mobile-home';
  document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute(
      'content',
      'Joseph Bailey’s research, projects, CV, music, athletics, notes, and contact information.',
    );
  const root = document.createElement('div');
  root.id = 'mobile-app';
  document.body.appendChild(root);
  render(root);
  window.addEventListener('hashchange', () => {
    if (location.hash === '#/galaxy') {
      location.reload();
      return;
    }
    render(root);
  });
}
