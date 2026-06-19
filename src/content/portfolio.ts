import data from './portfolio.json';

export interface PortfolioItem {
  title: string;
  description: string;
  meta?: string;
  href?: string;
  linkLabel?: string;
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

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]!);

const externalAttrs = (href: string): string =>
  href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';

export const renderItems = (items: PortfolioItem[]): string =>
  `<ul class="panel-list">${items
    .map((item) => {
      const link = item.href
        ? ` <a href="${escapeHtml(item.href)}"${externalAttrs(item.href)}>${escapeHtml(item.linkLabel ?? 'Open')}</a>`
        : '';
      const meta = item.meta ? `<span class="panel-meta">${escapeHtml(item.meta)}</span>` : '';
      return `<li><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}${link}</p>${meta}</li>`;
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
