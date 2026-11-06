// Evaluate concept-space layouts against each similarity channel and the review pairs.
// Usage: node scripts/evaluate-concept-space.mjs [--markdown]
// Uses the same model code as the browser, so the numbers describe what visitors see.
import { readFileSync } from 'node:fs';

import {
  CHANNELS,
  DEFAULT_WEIGHTS,
  computeLayout,
  decode,
  diagnose,
} from '../v4/js/concept-space/model.js';

const data = JSON.parse(
  readFileSync(
    new URL('../v4/public/learning/data/concepts.stats310a.public.json', import.meta.url),
    'utf8',
  ),
);
const model = decode(data);
const markdown = process.argv.includes('--markdown');

const settings = [
  ['structure (default)', DEFAULT_WEIGHTS],
  ['language only', { semantic: 1, math: 0, source: 0 }],
  ['syllabus only', { semantic: 0, math: 0, source: 1 }],
  ['mixed 0.3/0.5/0.2', { semantic: 0.3, math: 0.5, source: 0.2 }],
  ['equal', { semantic: 1, math: 1, source: 1 }],
];
const layouts = [
  ['pca', 'volume', false],
  ['force', 'volume', false],
  ['hybrid', 'volume', false],
  ['hybrid', 'volume', true],
  ['hybrid', 'surface', false],
];

const fmt = (value) => value.toFixed(2);
const rows = [];
const reviewRows = new Map();
for (const [label, weights] of settings) {
  for (const [mode, geometry, shells] of layouts) {
    if (label !== 'structure (default)' && (geometry !== 'volume' || shells)) continue;
    const layout = computeLayout(model, { mode, weights, geometry, shells });
    const result = diagnose(model, layout, data.review_pairs);
    const name = `${mode}${geometry === 'surface' ? ' (surface)' : ''}${shells ? ' + shells' : ''}`;
    const passed = result.reviews.filter((review) => review.ok).length;
    rows.push([
      label,
      name,
      ...CHANNELS.map((c) => fmt(result.channel[c].overlap)),
      fmt(result.channel.combined.overlap),
      ...CHANNELS.map((c) => fmt(result.channel[c].spearman)),
      fmt(result.relationStretch),
      `${passed}/${result.reviews.length}`,
      mode === 'pca' ? fmt(result.explained.reduce((a, b) => a + b, 0)) : '',
    ]);
    if (label === 'structure (default)' || mode === 'hybrid') {
      for (const review of result.reviews) {
        const key = `${review.a.slice(8)} ~ ${review.b.slice(8)}`;
        if (!reviewRows.has(key)) reviewRows.set(key, { review, cells: [] });
        reviewRows.get(key).cells.push([`${label}/${name}`, review.percentile, review.ok]);
      }
    }
  }
}

const header = [
  'weights',
  'layout',
  'kNN∩ sem',
  'kNN∩ math',
  'kNN∩ src',
  'kNN∩ W',
  'ρ sem',
  'ρ math',
  'ρ src',
  'relation stretch',
  'review pass',
  'PCA var',
];
if (markdown) {
  console.log(`| ${header.join(' | ')} |\n|${header.map(() => '---').join('|')}|`);
  for (const row of rows) console.log(`| ${row.join(' | ')} |`);
  console.log(
    '\nReview pairs, distance percentile among all pairs (lower is nearer; ✓ = as expected):\n',
  );
  const columns = [...reviewRows.values()][0].cells.map(([name]) => name);
  console.log(`| pair | category | expect | ${columns.join(' | ')} |`);
  console.log(`|---|---|---|${columns.map(() => '---').join('|')}|`);
  for (const [key, { review, cells }] of reviewRows) {
    console.log(
      `| ${key} | ${review.category} | ${review.expect} | ${cells
        .map(([, p, ok]) => `${Math.round(p * 100)}${ok ? ' ✓' : ' ✗'}`)
        .join(' | ')} |`,
    );
  }
} else {
  console.log(header.join('\t'));
  for (const row of rows) console.log(row.join('\t'));
}
