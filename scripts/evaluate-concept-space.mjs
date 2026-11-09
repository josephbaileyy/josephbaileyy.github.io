// Evaluate concept-space layouts against each similarity channel and the review pairs.
// Usage: node scripts/evaluate-concept-space.mjs [--markdown]
// Uses the same model code as the browser, so the numbers describe what visitors see.
import { readFileSync } from 'node:fs';

import {
  CHANNELS,
  DEFAULT_WEIGHTS,
  DEFAULT_PHYSICS,
  computeLayout,
  decode,
  diagnose,
} from '../v4/js/concept-space/model.js';
import { curriculumIndex } from '../v4/js/concept-space/curriculum.js';

const data = JSON.parse(
  readFileSync(new URL('../v4/public/learning/data/concepts.public.json', import.meta.url), 'utf8'),
);
const model = decode(data);
const { bridges } = curriculumIndex(data, model);
const bridgeEnds = [...bridges].map((k) => {
  const { source, target } = model.relations[k];
  return [model.index.get(source), model.index.get(target)];
});
const legacyPhysics = { k: 6, repulsion: 0.0045 };
const rms = (a, b) =>
  Math.sqrt(
    a.reduce((sum, p, i) => sum + p.reduce((s, x, d) => s + (x - b[i][d]) ** 2, 0), 0) / a.length,
  );

function bridgeMetrics(points) {
  const deltas = bridgeEnds.map(([i, j]) => points[i].map((x, d) => x - points[j][d]));
  const mean = deltas.reduce((sum, delta) => sum + Math.hypot(...delta), 0) / deltas.length;
  // Separation proxy: when viewed along each cardinal axis, count endpoints
  // at least .05R apart (10 px for a projected ball of diameter 400 px).
  const clear = deltas.reduce(
    (sum, delta) =>
      sum +
      [0, 1, 2].filter((axis) => Math.hypot(...delta.filter((_, d) => d !== axis)) >= 0.05).length,
    0,
  );
  return [mean, clear / (3 * deltas.length)];
}
const markdown = process.argv.includes('--markdown');

const settings = [
  ['structure (default)', DEFAULT_WEIGHTS],
  ['language only', { semantic: 1, math: 0, source: 0 }],
  ['syllabus only', { semantic: 0, math: 0, source: 1 }],
  ['mixed 0.3/0.5/0.2', { semantic: 0.3, math: 0.5, source: 0.2 }],
  ['equal', { semantic: 1, math: 1, source: 1 }],
];
const layouts = [
  ['pca', 'volume', false, DEFAULT_PHYSICS, 'PCA'],
  ['force', 'volume', false, DEFAULT_PHYSICS, 'Seeded force'],
  ['hybrid', 'volume', false, DEFAULT_PHYSICS, 'Hybrid'],
  ['hybrid', 'volume', false, legacyPhysics, 'Hybrid (legacy forces)'],
  ['hybrid', 'volume', false, { ...DEFAULT_PHYSICS, k: 12 }, 'Hybrid (12 neighbours)'],
  ['hybrid', 'volume', true, DEFAULT_PHYSICS, 'Hybrid + shells'],
  [
    'hybrid',
    'volume',
    true,
    { ...DEFAULT_PHYSICS, repulsion: 0.0027 },
    'Hybrid + shells (more repulsion)',
  ],
  ['hybrid', 'surface', false, DEFAULT_PHYSICS, 'Hybrid (surface)'],
];

const fmt = (value) => value.toFixed(3);
const rows = [];
const reviewRows = new Map();
for (const [label, weights] of settings) {
  for (const [mode, geometry, shells, physics, name] of layouts) {
    if (label !== 'structure (default)' && !['PCA', 'Seeded force', 'Hybrid'].includes(name))
      continue;
    const options = { mode, weights, geometry, shells, physics };
    const start = performance.now();
    const layout = computeLayout(model, options);
    const elapsed = performance.now() - start;
    const result = diagnose(model, layout, data.review_pairs);
    const crossReviews = result.reviews.filter((review) => review.category === 'cross_course');
    const [bridgeLength, bridgeClear] = bridgeMetrics(layout.points);
    const isDefaultStructure = label === 'structure (default)';
    let motion = '';
    if (isDefaultStructure) {
      const changed = computeLayout(model, {
        ...options,
        previous: layout.points,
        warm: mode !== 'pca',
        weights: { ...DEFAULT_WEIGHTS, semantic: 0.05 },
      });
      motion = fmt(rms(layout.points, changed.points));
    }
    const passed = result.reviews.filter((review) => review.ok).length;
    rows.push([
      label,
      name,
      ...CHANNELS.map((c) => fmt(result.channel[c].overlap)),
      fmt(result.channel.combined.overlap),
      ...CHANNELS.map((c) => fmt(result.channel[c].spearman)),
      fmt(result.relationStretch),
      `${passed}/${result.reviews.length}`,
      `${crossReviews.filter((r) => r.ok).length}/${crossReviews.length}`,
      fmt(bridgeLength),
      `${Math.round(100 * bridgeClear)}%`,
      layout.points.filter((point) => Math.hypot(...point) < 0.999).length,
      motion,
      Math.round(elapsed),
      mode === 'pca' ? fmt(result.explained.reduce((a, b) => a + b, 0)) : '',
    ]);
    if (label === 'structure (default)' || name === 'Hybrid') {
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
  'cross-course review pass',
  'bridge length / R',
  'bridge separation',
  'interior nodes',
  'weight change RMS / R',
  'layout ms',
  'PCA var',
];
const canonical = computeLayout(model);
const repeat = computeLayout(model);
if (rms(canonical.points, repeat.points) !== 0)
  throw new Error('Default layout is not deterministic');
if (markdown) {
  console.log(
    `Snapshot ${data.as_of} · ${model.n} concepts · ${model.relations.length} relations · ${bridges.size} home-course bridges. Canonical repeat RMS = 0. Node ${process.version}, ${process.platform}/${process.arch}.\n`,
  );
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
