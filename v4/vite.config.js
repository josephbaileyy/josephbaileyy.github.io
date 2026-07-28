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

function safeHref(value) {
  const href = asText(value);
  return /^(?:https?:\/\/|mailto:|#|\.{0,2}\/)/i.test(href) ? escapeHtml(href) : '#';
}

function renderLink(item, className = '') {
  if (!item || !asText(item.label) || !asText(item.href)) return '';
  const external = /^https?:\/\//i.test(item.href);
  const downloadable = /\.pdf(?:$|[?#])/i.test(item.href);
  const newContext = external || downloadable;
  return `<a${className ? ` class="${escapeHtml(className)}"` : ''} href="${safeHref(item.href)}"${
    newContext ? ' target="_blank" rel="noopener noreferrer"' : ''
  }>${escapeHtml(item.label)}</a>`;
}

function renderLinkList(items, label = 'Related links') {
  const links = asArray(items)
    .map((item) => renderLink(item))
    .filter(Boolean);
  return links.length
    ? `<ul class="link-list" aria-label="${escapeHtml(label)}">${links
        .map((item) => `<li>${item}</li>`)
        .join('')}</ul>`
    : '';
}

function renderProfile() {
  const primaryActions = asArray(profile.links).filter((item) =>
    ['github-link', 'resume-link', 'contact-link'].includes(item.id),
  );
  return `
    <p class="hero-thesis">${escapeHtml(profile.tagline)}</p>
    <p class="hero-statement">${escapeHtml(profile.statement)}</p>
    <nav class="hero-actions" aria-label="Profile actions">
      ${primaryActions.map((item) => renderLink(item, 'button-link')).join('')}
    </nav>
  `;
}

function renderResearch() {
  return asArray(research)
    .map((item, index) => {
      const meta = [item.role, item.venue, item.period, item.grant].map(asText).filter(Boolean);
      const evidence = [
        ['Method', item.method],
        ['Evidence', item.result],
      ].filter(([, value]) => asText(value));
      return `
        <article class="record" id="${escapeHtml(item.id)}" data-item-id="${escapeHtml(item.id)}" data-reveal>
          <header class="record-header">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="record-meta">${String(index + 1).padStart(2, '0')}</span>
          </header>
          <p class="record-meta">${meta.map(escapeHtml).join(' · ')}</p>
          <p class="record-question">${escapeHtml(item.question)}</p>
          <dl class="evidence-grid">
            ${evidence
              .map(
                ([label, value]) =>
                  `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
              )
              .join('')}
          </dl>
          <ul class="tag-list" aria-label="Research topics">
            ${asArray(item.tags)
              .map((tag) => `<li>${escapeHtml(tag)}</li>`)
              .join('')}
          </ul>
          ${renderLinkList(item.links)}
          <p class="ordinary-access"><a href="#${escapeHtml(item.id)}" data-drawer-id="${escapeHtml(
            item.id,
          )}">Open detector record</a></p>
        </article>
      `;
    })
    .join('');
}

function renderProjects() {
  return asArray(projects)
    .map(
      (item, index) => `
        <article class="project" id="${escapeHtml(item.id)}" data-item-id="${escapeHtml(item.id)}" data-reveal>
          <header class="project-header">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="record-meta">${String(index + 1).padStart(2, '0')}</span>
          </header>
          <p class="project-summary">${escapeHtml(item.summary)}</p>
          <dl class="evidence-grid">
            <div><dt>Work</dt><dd>${escapeHtml(item.work)}</dd></div>
            <div><dt>Evidence</dt><dd>${escapeHtml(item.evidence)}</dd></div>
          </dl>
          <ul class="tag-list" aria-label="Technology">
            ${asArray(item.stack)
              .map((tag) => `<li>${escapeHtml(tag)}</li>`)
              .join('')}
          </ul>
          ${renderLinkList(item.links)}
          <p class="ordinary-access"><a href="#${escapeHtml(item.id)}" data-drawer-id="${escapeHtml(
            item.id,
          )}">Open project record</a></p>
        </article>
      `,
    )
    .join('');
}

function renderExperience() {
  return asArray(experience)
    .map(
      (item) => `
        <article class="experience-card" id="${escapeHtml(item.id)}" data-reveal>
          <header class="experience-header">
            <h3>${escapeHtml(item.role)}</h3>
            <span class="record-meta">${escapeHtml(item.period)}</span>
          </header>
          <p class="record-meta">${escapeHtml(item.org)} · ${escapeHtml(item.location)}</p>
          <p>${escapeHtml(item.summary)}</p>
        </article>
      `,
    )
    .join('');
}

function renderEducation() {
  return `
    <article class="education-card" data-reveal>
      <h3>${escapeHtml(education.degree)}</h3>
      <p class="record-meta">${escapeHtml(education.school)} · ${escapeHtml(education.period)}</p>
      <div class="education-lists">
        <div>
          <h3>Selected coursework</h3>
          <ul>${asArray(education.coursework)
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join('')}</ul>
        </div>
        <div>
          <h3>Honors</h3>
          <ul>${asArray(education.honors)
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join('')}</ul>
        </div>
      </div>
    </article>
  `;
}

function renderInstruments() {
  const trackLink = asArray(profile.links).find((item) => item.id === 'tfrrs-link');
  return `
    <article class="instrument-card" data-reveal>
      <p class="instrument-label">A / Track</p>
      <h3>${escapeHtml(education.athletics.event)}</h3>
      <p>${escapeHtml(education.athletics.division)} athlete for ${escapeHtml(
        education.athletics.team,
      )}.</p>
      ${trackLink ? renderLink(trackLink, 'text-link') : ''}
    </article>
    <article class="instrument-card music" data-reveal>
      <p class="instrument-label">B / Music</p>
      <h3>${escapeHtml(education.music.genres.join(' + '))}</h3>
      <p>${escapeHtml(education.music.instruments.join(', '))}. ${escapeHtml(
        education.music.level,
      )}.</p>
    </article>
  `;
}

function renderFooter() {
  return `
    <nav class="footer-links" aria-label="Contact and profile links">
      ${asArray(profile.links)
        .map(
          (item) => `
            <div class="footer-link-item" id="${escapeHtml(item.id)}" data-item-id="${escapeHtml(
              item.id,
            )}">
              ${renderLink(item)}
              <span class="footer-meta">${escapeHtml(item.description)}</span>
            </div>
          `,
        )
        .join('')}
    </nav>
    <p class="footer-meta">${escapeHtml(profile.site)} · ${escapeHtml(
      profile.meta.institution,
    )} · Expected ${escapeHtml(profile.meta.graduation)}</p>
  `;
}

const contentMarkers = [
  ['<!-- PROFILE_CONTENT -->', renderProfile],
  ['<!-- RESEARCH_CONTENT -->', renderResearch],
  ['<!-- PROJECTS_CONTENT -->', renderProjects],
  ['<!-- EXPERIENCE_CONTENT -->', renderExperience],
  ['<!-- EDUCATION_CONTENT -->', renderEducation],
  ['<!-- INSTRUMENTS_CONTENT -->', renderInstruments],
  ['<!-- FOOTER_CONTENT -->', renderFooter],
];

export default defineConfig({
  root,
  base: './',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('/node_modules/@dimforge/rapier3d-compat/')) return 'rapier';
          if (id.includes('/node_modules/gsap/')) return 'gsap';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5177,
    strictPort: true,
  },
  preview: {
    port: 4177,
    strictPort: true,
  },
  plugins: [
    {
      name: 'static-portfolio-content',
      transformIndexHtml(html) {
        return contentMarkers.reduce(
          (output, [marker, render]) => output.replace(marker, render()),
          html,
        );
      },
    },
  ],
});
