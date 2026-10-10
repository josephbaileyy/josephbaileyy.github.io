import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { notes } from './notes.js';

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character],
  );

function writeIfChanged(filename, content) {
  if (!existsSync(filename) || readFileSync(filename, 'utf8') !== content)
    writeFileSync(filename, content);
}

// Prepare Vite's HTML entries from the same Markdown files used by the homepage
// and note index. A new note needs no separate route or template to maintain.
export function prepareNotePages(root) {
  const directory = path.join(root, 'notes');
  mkdirSync(directory, { recursive: true });
  const entries = {};
  for (const note of notes) {
    if (!/^[\w-]+$/.test(note.slug) || note.slug === 'index')
      throw new Error(`Invalid note slug: ${note.slug}`);
    const filename = path.join(directory, `${note.slug}.html`);
    const url = `https://josephbaileyy.github.io/notes/${note.slug}.html`;
    writeIfChanged(
      filename,
      `<!doctype html>
<!-- Generated from src/content/notes/${note.slug}.md; edit the Markdown source. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escape(note.title)} — Joseph Bailey</title>
    <meta name="description" content="${escape(note.summary)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escape(note.title)}" />
    <meta property="og:description" content="${escape(note.summary)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="https://josephbaileyy.github.io/img/home/with-camera.jpg" />
    <meta name="theme-color" content="#f9f8f3" />
    <link rel="stylesheet" href="../styles/home.css" />
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to the content</a>
    <main id="main-content"><!-- NOTE_CONTENT:${note.slug} --></main>
    <script type="module" src="../js/home.js"></script>
  </body>
</html>
`,
    );
    entries[`note-${note.slug}`] = filename;
  }
  const routes = [
    '/',
    '/about.html',
    '/notes/',
    '/lab/',
    ...notes.map((note) => `/notes/${note.slug}.html`),
  ];
  writeIfChanged(
    path.join(root, 'public/sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>https://josephbaileyy.github.io${route}</loc></url>`).join('\n')}
</urlset>
`,
  );
  return entries;
}
