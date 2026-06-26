import data from './portfolio.json';

export interface PortfolioItem {
  title: string;
  description: string;
  meta?: string;
  featured?: boolean;
  challenge?: string;
  contribution?: string;
  outcome?: string;
  tools?: string[];
  href?: string;
  linkLabel?: string;
  /** Extra links (posters, reports, papers) shown alongside the primary one. */
  links?: Array<{ label: string; href: string }>;
  /** Present on projects surfaced as BaileyOS desktop apps: icon + short label. */
  app?: { icon: string; short: string };
}

export type PortfolioSceneId = 'galaxy' | 'solar' | 'earth' | 'stanford' | 'room' | 'screen';

export interface SceneDestination {
  type: 'panel' | 'scene' | 'app' | 'url';
  label: string;
  panelId?: string;
  index?: number;
  appId?: string;
  href?: string;
}

export interface PortfolioScene {
  id: PortfolioSceneId;
  label: string;
  scale: string;
  comparison: string;
  meaning: string;
  route: string;
}

export interface SceneSignal {
  id: string;
  scene: PortfolioSceneId;
  title: string;
  body: string;
  category: 'route' | 'evidence' | 'research' | 'life' | 'simulation';
  destination?: SceneDestination;
  links?: Array<{ label: string; href: string }>;
}

export interface PortfolioData {
  profile: { name: string; tagline: string; summary: string; location: string; graduation: string };
  links: Array<{ label: string; href: string; kind?: string }>;
  scenes: PortfolioScene[];
  sceneSignals: SceneSignal[];
  research: PortfolioItem[];
  experience: PortfolioItem[];
  projects: PortfolioItem[];
  education: PortfolioItem[];
  honors: string[];
  beyond: string[];
  amCvn: { title: string; kicker: string; paragraphs: string[] };
}

export const PORTFOLIO = data as PortfolioData;

/** Projects surfaced as clickable apps on the BaileyOS desktop. */
export const APP_PROJECTS = PORTFOLIO.projects.filter((p) => p.app);
export const SCENES = PORTFOLIO.scenes;
export const SCENE_SIGNALS = PORTFOLIO.sceneSignals;
export const SIGNAL_BY_ID = new Map(SCENE_SIGNALS.map((signal) => [signal.id, signal]));

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char]!,
  );

const externalAttrs = (href: string): string =>
  href.startsWith('http') || href.endsWith('.pdf') ? ' target="_blank" rel="noopener"' : '';

export const itemLinks = (item: PortfolioItem): Array<{ label: string; href: string }> => [
  ...(item.href ? [{ label: item.linkLabel ?? 'Open', href: item.href }] : []),
  ...(item.links ?? []),
];

export const isPdfHref = (href: string): boolean => href.endsWith('.pdf');

export const renderItems = (items: PortfolioItem[]): string =>
  `<ul class="panel-list">${items
    .map((item) => {
      const links = itemLinks(item)
        .map(
          (l) =>
            ` <a href="${escapeHtml(l.href)}"${externalAttrs(l.href)}>${escapeHtml(l.label)}</a>`,
        )
        .join('');
      const meta = item.meta ? `<span class="panel-meta">${escapeHtml(item.meta)}</span>` : '';
      const showcase =
        item.featured && item.challenge && item.contribution && item.outcome
          ? `<dl class="project-evidence"><div><dt>Signal</dt><dd>${escapeHtml(item.challenge)}</dd></div><div><dt>Work</dt><dd>${escapeHtml(item.contribution)}</dd></div><div><dt>Evidence</dt><dd>${escapeHtml(item.outcome)}</dd></div></dl>${item.tools?.length ? `<span class="project-tools">${item.tools.map(escapeHtml).join(' · ')}</span>` : ''}`
          : '';
      return `<li${item.featured ? ' class="featured-item"' : ''}><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}${links}</p>${showcase}${meta}</li>`;
    })
    .join('')}</ul>`;

export const renderSceneScaleMap = (): string =>
  `<div class="scale-map">${SCENES.map((scene) => {
    const signals = SCENE_SIGNALS.filter((signal) => signal.scene === scene.id);
    return `<article class="scale-card" id="scale-${escapeHtml(scene.id)}"><span>${escapeHtml(scene.scale)}</span><h3>${escapeHtml(scene.label)}</h3><p>${escapeHtml(scene.meaning)}</p><small>${escapeHtml(scene.comparison)}</small>${
      signals.length
        ? `<ul>${signals
            .slice(0, 4)
            .map((signal) => `<li>${escapeHtml(signal.title)}</li>`)
            .join('')}</ul>`
        : ''
    }<a href="/#/${escapeHtml(scene.id)}">Open scene →</a></article>`;
  }).join('')}</div>`;

const renderBullets = (items: string[]): string =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

const renderProfileLinks = (): string =>
  `<div class="panel-links">${PORTFOLIO.links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.href)}"${externalAttrs(link.href)}>${escapeHtml(link.label)}</a>`,
    )
    .join('')}</div>`;

export interface PanelContent {
  kicker: string;
  title: string;
  html: string;
}

export const PANELS: Record<string, PanelContent> = {
  'am-cvn': {
    kicker: PORTFOLIO.amCvn.kicker,
    title: PORTFOLIO.amCvn.title,
    html: `${PORTFOLIO.amCvn.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}<figure class="amcvn-figure"><img src="/img/am-cvn-light-curve.png" alt="AM CVn relative V-band light curve with five model overlays from Joseph Bailey's report" loading="lazy" /><figcaption>Real Figure 3 crop from the AM CVn report: differential photometry with constant, sinusoidal, harmonic-superhump, beat-constrained, and double-wave model overlays.</figcaption></figure><div class="panel-links"><a href="/papers/am-cvn-report.pdf" target="_blank" rel="noopener">Report (PDF)</a><a href="/papers/am-cvn-presentation.pdf" target="_blank" rel="noopener">Slides (PDF)</a></div>`,
  },
  profile: {
    kicker: 'about · experience · education',
    title: PORTFOLIO.profile.name,
    html: `<p>${escapeHtml(PORTFOLIO.profile.summary)}</p>${renderProfileLinks()}<h3>Professional experience</h3>${renderItems(PORTFOLIO.experience)}<h3>Education</h3>${renderItems(PORTFOLIO.education)}<h3>Honors</h3>${renderBullets(PORTFOLIO.honors)}<h3>Beyond research</h3>${renderBullets(PORTFOLIO.beyond)}`,
  },
  research: {
    kicker: 'research · ai for fundamental physics',
    title: 'Research',
    html: renderItems(PORTFOLIO.research),
  },
  experience: {
    kicker: 'professional experience · product & engineering',
    title: 'Experience',
    html: renderItems(PORTFOLIO.experience),
  },
  projects: {
    kicker: 'projects · ml, systems & security',
    title: 'Things I’ve built',
    html: renderItems(PORTFOLIO.projects),
  },
  scale: {
    kicker: 'powers of ten · scene map',
    title: 'Explore by scale',
    html: renderSceneScaleMap(),
  },
};
