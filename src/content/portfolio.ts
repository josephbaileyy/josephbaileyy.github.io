import data from './portfolio.json';

export interface PortfolioItem {
  title: string;
  description: string;
  meta?: string;
  href?: string;
  linkLabel?: string;
  /** Extra links (posters, reports, papers) shown alongside the primary one. */
  links?: Array<{ label: string; href: string }>;
  /** Present on projects surfaced as BaileyOS desktop apps: icon + short label. */
  app?: { icon: string; short: string };
}

export interface PortfolioData {
  profile: { name: string; tagline: string; summary: string; location: string; graduation: string };
  links: Array<{ label: string; href: string; kind?: string }>;
  research: PortfolioItem[];
  projects: PortfolioItem[];
  education: PortfolioItem[];
  honors: string[];
  beyond: string[];
  amCvn: { title: string; kicker: string; paragraphs: string[] };
}

export const PORTFOLIO = data as PortfolioData;

/** Projects surfaced as clickable apps on the BaileyOS desktop. */
export const APP_PROJECTS = PORTFOLIO.projects.filter((p) => p.app);

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]!);

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
        .map((l) => ` <a href="${escapeHtml(l.href)}"${externalAttrs(l.href)}>${escapeHtml(l.label)}</a>`)
        .join('');
      const meta = item.meta ? `<span class="panel-meta">${escapeHtml(item.meta)}</span>` : '';
      return `<li><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}${links}</p>${meta}</li>`;
    })
    .join('')}</ul>`;

const renderBullets = (items: string[]): string =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

const renderProfileLinks = (): string =>
  `<div class="panel-links">${PORTFOLIO.links
    .map((link) => `<a href="${escapeHtml(link.href)}"${externalAttrs(link.href)}>${escapeHtml(link.label)}</a>`)
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
    html: PORTFOLIO.amCvn.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join(''),
  },
  profile: {
    kicker: 'about · education · beyond research',
    title: PORTFOLIO.profile.name,
    html: `<p>${escapeHtml(PORTFOLIO.profile.summary)}</p>${renderProfileLinks()}<h3>Education</h3>${renderItems(PORTFOLIO.education)}<h3>Honors</h3>${renderBullets(PORTFOLIO.honors)}<h3>Beyond research</h3>${renderBullets(PORTFOLIO.beyond)}`,
  },
  research: {
    kicker: 'research · ai for fundamental physics',
    title: 'Research',
    html: renderItems(PORTFOLIO.research),
  },
  projects: {
    kicker: 'projects · ml, systems & security',
    title: 'Things I’ve built',
    html: renderItems(PORTFOLIO.projects),
  },
};
