import { readFileSync, readdirSync } from 'node:fs';

import { parseFrontmatter, renderMarkdown } from '../../scripts/lib/note-markdown.js';

const directory = new URL('../../src/content/notes/', import.meta.url);
export const notes = readdirSync(directory)
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const { meta, body } = parseFrontmatter(readFileSync(new URL(name, directory), 'utf8'));
    if (!meta.title || !meta.date || !meta.summary) throw new Error(`Incomplete note: ${name}`);
    return { ...meta, slug: name.slice(0, -3), html: renderMarkdown(body) };
  })
  .sort((a, b) => b.date.localeCompare(a.date));
