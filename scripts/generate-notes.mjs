/**
 * Notes pipeline: src/content/notes/*.md → static pages + app data.
 *
 * Outputs:
 *   public/notes/<slug>.html   — self-contained pages (copied verbatim to dist)
 *   public/notes/index.html    — the notes index
 *   src/content/notes.json     — {slug,title,date,summary,html} for BaileyOS
 *   public/sitemap.xml         — /, /about.html, and every note
 *
 * The renderer is a deliberately small markdown subset (headings, paragraphs,
 * fenced code, lists, blockquotes, links, bold/italic/inline code). Content is
 * first-party, so a dependency-free renderer beats pulling in a full parser.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const ORIGIN = 'https://josephbaileyy.github.io';
const notesDir = new URL('../src/content/notes/', import.meta.url);
const outDir = new URL('../public/notes/', import.meta.url);

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char],
  );

/** Inline markdown on already-escaped text: code, links, bold, italic. */
const inline = (text) =>
  text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, label, href) =>
        `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error('note is missing frontmatter');
  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body: raw.slice(match[0].length) };
}

function renderMarkdown(body) {
  const lines = body.split('\n');
  const out = [];
  let paragraph = [];
  let list = null;
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(escapeHtml(paragraph.join(' ')))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<ul>${list.map((item) => `<li>${inline(escapeHtml(item))}</li>`).join('')}</ul>`);
      list = null;
    }
  };

  for (const line of lines) {
    if (code !== null) {
      if (line.startsWith('```')) {
        out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }
    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      code = [];
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.max(2, heading[1].length); // h1 is the page title
      out.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }
    const item = line.match(/^[-*]\s+(.*)$/);
    if (item) {
      flushParagraph();
      (list ??= []).push(item[1]);
      continue;
    }
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      out.push(`<blockquote><p>${inline(escapeHtml(line.slice(2)))}</p></blockquote>`);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return out.join('\n');
}

const STYLE = `
      :root{--bg:#0b1026;--panel:#131a3a;--ink:#eef2ff;--dim:#aeb7d9;--gold:#ffd479;--cyan:#7fd4ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -20%,#1b1740 0,var(--bg) 38%);color:var(--ink);font-family:"Avenir Next","Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.75}main{max-width:720px;margin:0 auto;padding:48px 24px 96px}a{color:var(--cyan)}.crumbs{font:13px ui-monospace,Menlo,monospace;color:var(--dim)}.crumbs a{text-decoration:none}h1{font-size:clamp(30px,5.5vw,42px);line-height:1.15;margin:14px 0 6px}h2{font-size:22px;margin:40px 0 10px;color:var(--gold)}h3{font-size:18px;margin:28px 0 8px}.note-meta{color:var(--dim);font:13px ui-monospace,Menlo,monospace;margin:0 0 28px}p{margin:0 0 18px;color:#d9dff4}pre{background:#0a0e24;border:1px solid rgb(127 212 255/.18);border-radius:12px;padding:16px 18px;overflow-x:auto;margin:0 0 18px}code{font:0.92em ui-monospace,Menlo,monospace;color:var(--cyan)}p code,li code{background:rgb(127 212 255/.1);border-radius:5px;padding:1px 5px}ul{margin:0 0 18px;padding-left:24px;color:#d9dff4}blockquote{margin:0 0 18px;padding:2px 18px;border-left:3px solid var(--gold);color:var(--dim)}.note-card{display:block;background:linear-gradient(145deg,#171f46,var(--panel));border:1px solid rgb(174 183 217/.2);border-radius:14px;padding:20px 22px;margin:0 0 14px;text-decoration:none;color:var(--ink)}.note-card:hover,.note-card:focus-visible{border-color:var(--cyan)}.note-card h2{margin:2px 0 8px;font-size:19px;color:var(--ink)}.note-card p{margin:0;color:var(--dim);font-size:15px}.note-card span{color:var(--gold);font:11px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}footer{margin-top:56px;color:var(--dim);font:13px/1.6 ui-monospace,Menlo,monospace}@media(max-width:620px){main{padding:36px 20px 72px}}`;

const GOATCOUNTER = `<script data-goatcounter="https://josephbaileyy.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;

const page = ({ title, description, path, body }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${ORIGIN}${path}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${ORIGIN}${path}" />
    <meta property="og:image" content="${ORIGIN}/og-preview.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0b1026" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='12' cy='16' r='7' fill='%23eef2ff'/%3E%3Ccircle cx='24' cy='13' r='4' fill='%23ffd479'/%3E%3C/svg%3E" />
    <style>${STYLE}</style>
  </head>
  <body>
    <main>${body}
      <footer>© Joseph Bailey · <a href="/">the universe</a> · <a href="/about.html">quick portfolio</a></footer>
    </main>
    ${GOATCOUNTER}
  </body>
</html>
`;

const files = (await readdir(notesDir)).filter((name) => name.endsWith('.md')).sort();
const notes = [];
for (const file of files) {
  const raw = await readFile(new URL(file, notesDir), 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  if (!meta.title || !meta.date || !meta.summary) {
    throw new Error(`${file}: frontmatter needs title, date, and summary`);
  }
  notes.push({
    slug: file.replace(/\.md$/, ''),
    title: meta.title,
    date: meta.date,
    summary: meta.summary,
    html: renderMarkdown(body),
  });
}
notes.sort((a, b) => (a.date < b.date ? 1 : -1));

await mkdir(outDir, { recursive: true });

for (const note of notes) {
  const body = `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/notes/">← notes</a></nav>
      <article>
        <h1>${escapeHtml(note.title)}</h1>
        <p class="note-meta">${escapeHtml(note.date)} · Joseph Bailey</p>
        ${note.html}
      </article>`;
  await writeFile(
    new URL(`${note.slug}.html`, outDir),
    page({
      title: `${note.title} · Joseph Bailey`,
      description: note.summary,
      path: `/notes/${note.slug}.html`,
      body,
    }),
  );
}

const indexBody = `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/about.html">← portfolio</a></nav>
      <h1>Notes</h1>
      <p class="note-meta">Short write-ups on physics, ML, and how this site is built.</p>
      ${notes
        .map(
          (note) =>
            `<a class="note-card" href="/notes/${note.slug}.html"><span>${escapeHtml(note.date)}</span><h2>${escapeHtml(note.title)}</h2><p>${escapeHtml(note.summary)}</p></a>`,
        )
        .join('\n      ')}`;
await writeFile(
  new URL('index.html', outDir),
  page({
    title: 'Notes · Joseph Bailey',
    description: 'Short write-ups on physics, machine learning, and building a zoomable universe.',
    path: '/notes/',
    body: indexBody,
  }),
);

await writeFile(
  new URL('../src/content/notes.json', import.meta.url),
  JSON.stringify(
    notes.map(({ slug, title, date, summary, html }) => ({ slug, title, date, summary, html })),
    null,
    2,
  ) + '\n',
);

const urls = [
  { loc: `${ORIGIN}/`, priority: '1.0' },
  { loc: `${ORIGIN}/about.html`, priority: '0.9' },
  { loc: `${ORIGIN}/notes/`, priority: '0.6' },
  ...notes.map((note) => ({
    loc: `${ORIGIN}/notes/${note.slug}.html`,
    lastmod: note.date,
    priority: '0.6',
  })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) =>
      `  <url><loc>${url.loc}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}<priority>${url.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>
`;
await writeFile(new URL('../public/sitemap.xml', import.meta.url), sitemap);

console.log(`notes: ${notes.length} note(s), index, notes.json, sitemap.xml`);
