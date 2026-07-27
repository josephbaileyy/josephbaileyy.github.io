import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import { education } from './content/education.js';
import { experience } from './content/experience.js';
import { profile } from './content/profile.js';
import { projects } from './content/projects.js';
import { research } from './content/research.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (typeof value === 'string' ? value.trim() : '');
const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
const safeHref = (value) => {
  const href = asText(value);
  return /^(?:https?:\/\/|mailto:|#|\.{0,2}\/)/i.test(href) ? escapeHtml(href) : '#';
};
const empty = (label) =>
  `<p class="empty-state" role="status">${escapeHtml(label)} will appear here when available.</p>`;

function link(item, className = '') {
  if (!item || !asText(item.label) || !asText(item.href)) return '';
  const external = /^https?:\/\//i.test(item.href) || /\.pdf(?:$|[?#])/i.test(item.href);
  return `<a${className ? ` class="${escapeHtml(className)}"` : ''} href="${safeHref(item.href)}"${
    external ? ' target="_blank" rel="noopener noreferrer"' : ''
  }>${escapeHtml(item.label)}</a>`;
}

function linkList(items, label = 'Related links') {
  const links = asArray(items)
    .map((item) => link(item))
    .filter(Boolean);
  return links.length
    ? `<ul class="link-list" aria-label="${escapeHtml(label)}">${links
        .map((item) => `<li>${item}</li>`)
        .join('')}</ul>`
    : '';
}

function renderProfile() {
  const thesis = asText(profile?.tagline) || 'Making AI an honest instrument for physics';
  const github = asArray(profile?.links).find(
    (item) => /github/i.test(asText(item?.label)) || /github/i.test(asText(item?.href)),
  );
  const actions = [
    { label: 'Resume PDF', href: './resume.pdf' },
    github,
    asText(profile?.email) ? { label: 'Email', href: `mailto:${asText(profile.email)}` } : null,
  ]
    .filter(Boolean)
    .map((item) => link(item, 'button-link'))
    .join('');
  return `
    <h1 id="hero-title">${escapeHtml(asText(profile?.name) || 'Portfolio')}</h1>
    <p class="hero-thesis">${escapeHtml(thesis)}.</p>
    ${asText(profile?.statement) ? `<p class="hero-statement">${escapeHtml(profile.statement)}</p>` : ''}
    ${actions ? `<nav class="hero-actions" aria-label="Profile actions">${actions}</nav>` : ''}
  `;
}

function renderCurrent() {
  const item = asArray(research).find((entry) => entry?.current);
  if (!item) return empty('Current research');
  const meta = [item.role, item.venue, item.period].map(asText).filter(Boolean);
  const evidence = [
    ['Method', item.method],
    ['Result', item.result],
  ].filter(([, value]) => asText(value));
  return `
    <article class="measurement" data-reveal>
      <p class="current-marker">Current</p>
      <h3>${escapeHtml(item.title)}</h3>
      ${meta.length ? `<p class="record-meta">${meta.map(escapeHtml).join(' · ')}</p>` : ''}
      ${asText(item.question) ? `<p class="question-block">${escapeHtml(item.question)}</p>` : ''}
      ${
        evidence.length
          ? `<dl class="evidence-grid">${evidence
              .map(
                ([label, value]) =>
                  `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
              )
              .join('')}</dl>`
          : ''
      }
      ${linkList(item.links)}
    </article>
  `;
}

function renderResearch() {
  const records = asArray(research).filter((item) => !item?.current);
  if (!records.length) return empty('Research records');
  return records
    .map((item) => {
      const meta = [item.role, item.venue, item.period].map(asText).filter(Boolean);
      const evidence = [
        ['Question', item.question],
        ['Method', item.method],
        ['Result', item.result],
      ].filter(([, value]) => asText(value));
      const tags = asArray(item.tags).map(asText).filter(Boolean);
      const hasStar =
        asText(item.signal) === 'star' ||
        /am[\s-]?cvn/i.test(asText(item.id)) ||
        /am[\s-]?cvn/i.test(asText(item.title));
      return `
        <article class="record" id="${escapeHtml(item.id || '')}" data-reveal>
          <div class="record-title-line"><h3>${escapeHtml(item.title)}</h3></div>
          ${meta.length ? `<p class="record-meta">${meta.map(escapeHtml).join(' · ')}</p>` : ''}
          ${
            evidence.length
              ? `<dl class="record-copy">${evidence
                  .map(
                    ([label, value]) =>
                      `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
                  )
                  .join('')}</dl>`
              : ''
          }
          ${
            tags.length
              ? `<ul class="tags" aria-label="Topics">${tags
                  .map((tag) => `<li>${escapeHtml(tag)}</li>`)
                  .join('')}</ul>`
              : ''
          }
          ${linkList(item.links)}
          ${hasStar ? '<div class="signal-figure" data-signal="star"></div>' : ''}
        </article>
      `;
    })
    .join('');
}

function renderProjects() {
  if (!asArray(projects).length) return empty('Projects');
  return asArray(projects)
    .map((item, index) => {
      const evidence = [
        ['Signal', item.signal],
        ['Work', item.work],
        ['Evidence', item.evidence],
      ].filter(([, value]) => asText(value));
      const stack = asArray(item.stack).map(asText).filter(Boolean);
      return `
        <article class="project" id="${escapeHtml(item.id || '')}" data-reveal>
          <div class="project-title-line">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="record-meta">${String(index + 1).padStart(2, '0')}</span>
          </div>
          ${asText(item.summary) ? `<p class="project-summary">${escapeHtml(item.summary)}</p>` : ''}
          ${
            evidence.length
              ? `<dl class="project-evidence">${evidence
                  .map(
                    ([label, value]) =>
                      `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
                  )
                  .join('')}</dl>`
              : ''
          }
          ${
            stack.length
              ? `<ul class="tags" aria-label="Technology">${stack
                  .map((tag) => `<li>${escapeHtml(tag)}</li>`)
                  .join('')}</ul>`
              : ''
          }
          ${linkList(item.links)}
        </article>
      `;
    })
    .join('');
}

function renderExperience() {
  if (!asArray(experience).length) return empty('Experience');
  return asArray(experience)
    .map((item) => {
      const meta = [item.org, item.location].map(asText).filter(Boolean);
      return `
        <article class="experience" id="${escapeHtml(item.id || '')}" data-reveal>
          <div class="experience-title-line">
            <h3>${escapeHtml(item.role)}</h3>
            ${asText(item.period) ? `<span class="record-meta">${escapeHtml(item.period)}</span>` : ''}
          </div>
          ${meta.length ? `<p class="record-meta">${meta.map(escapeHtml).join(' · ')}</p>` : ''}
          ${asText(item.summary) ? `<p class="experience-summary">${escapeHtml(item.summary)}</p>` : ''}
        </article>
      `;
    })
    .join('');
}

function metaDescription(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(' · ');
  if (value && typeof value === 'object')
    return asText(value.summary || value.description || value.text);
  return '';
}

function renderOutside() {
  const meta = profile?.meta && typeof profile.meta === 'object' ? profile.meta : {};
  const athletics = metaDescription(meta.athletics || meta.track);
  const music = metaDescription(meta.music);
  return `
    <article class="signal-item" data-reveal>
      <p class="figure-label">A / 400 m hurdles</p>
      ${athletics ? `<p class="signal-intro">${escapeHtml(athletics)}</p>` : ''}
      <div class="signal-figure" data-signal="stride"></div>
    </article>
    <article class="signal-item" data-reveal>
      <p class="figure-label">B / Music</p>
      ${music ? `<p class="signal-intro">${escapeHtml(music)}</p>` : ''}
      <div class="signal-figure" data-signal="score"></div>
    </article>
  `;
}

function renderEducation() {
  if (!education || typeof education !== 'object') return empty('Education');
  const heading = [education.degree, education.school].map(asText).filter(Boolean);
  const coursework = asArray(education.coursework).map(asText).filter(Boolean);
  const honors = asArray(education.honors).map(asText).filter(Boolean);
  if (!heading.length && !coursework.length && !honors.length) return empty('Education');
  return `
    <article class="education-card" data-reveal>
      ${heading.length ? `<h3>${heading.map(escapeHtml).join(' · ')}</h3>` : ''}
      ${asText(education.period) ? `<p class="record-meta">${escapeHtml(education.period)}</p>` : ''}
      <div class="education-lists">
        <div>
          <h3>Selected coursework</h3>
          ${coursework.length ? `<ul>${coursework.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : empty('Coursework')}
        </div>
        <div>
          <h3>Honors</h3>
          ${honors.length ? `<ul>${honors.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : empty('Honors')}
        </div>
      </div>
    </article>
  `;
}

function renderFooter() {
  const email = asText(profile?.email);
  const contacts = [
    email ? { label: email, href: `mailto:${email}` } : null,
    ...asArray(profile?.links),
    { label: 'Resume PDF', href: './resume.pdf' },
  ]
    .filter(Boolean)
    .map((item) => `<div>${link(item)}</div>`)
    .join('');
  const seen = new Set();
  const papers = [...asArray(research), ...asArray(projects)]
    .flatMap((item) => asArray(item?.links))
    .filter((item) => /\.pdf(?:$|[?#])/i.test(asText(item?.href)))
    .filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  return `
    ${contacts ? `<nav class="footer-links" aria-label="Contact and profile links">${contacts}</nav>` : ''}
    <div class="paper-index">
      <p class="figure-label">Paper index</p>
      ${papers.length ? `<ol>${papers.map((item) => `<li>${link(item)}</li>`).join('')}</ol>` : empty('Papers')}
    </div>
    <p class="footer-note">
      Event data: CMS Open Data, record 303 (CC0). Prior astronomical visual source:
      ESO / S. Brunier. Built as a static-first scientific monograph.
    </p>
  `;
}

const contentMarkers = {
  profile: ['<!-- PROFILE_CONTENT -->', renderProfile],
  current: ['<!-- CURRENT_CONTENT -->', renderCurrent],
  research: ['<!-- RESEARCH_CONTENT -->', renderResearch],
  projects: ['<!-- PROJECTS_CONTENT -->', renderProjects],
  experience: ['<!-- EXPERIENCE_CONTENT -->', renderExperience],
  outside: ['<!-- OUTSIDE_CONTENT -->', renderOutside],
  education: ['<!-- EDUCATION_CONTENT -->', renderEducation],
  footer: ['<!-- FOOTER_CONTENT -->', renderFooter],
};

export default defineConfig({
  root,
  base: './',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5175,
  },
  plugins: [
    {
      name: 'static-content-fallback',
      transformIndexHtml(html) {
        return Object.values(contentMarkers).reduce(
          (output, [marker, render]) => output.replace(marker, render()),
          html,
        );
      },
    },
  ],
});
