import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CHANNELS,
  DEFAULT_WEIGHTS,
  alignTo,
  combine,
  computeLayout,
  decode,
  diagnose,
  kernelPCA,
  normalizeWeights,
  symmetricEigen,
} from '../js/concept-space/model.js';
import { EVIDENCE_STATES, readOverlay } from '../js/concept-space/overlay.js';

const data = JSON.parse(
  readFileSync(
    new URL('../public/learning/data/concepts.stats310a.public.json', import.meta.url),
    'utf8',
  ),
);
const model = decode(data);

function keysIn(value) {
  if (Array.isArray(value)) return value.flatMap(keysIn);
  if (value && typeof value === 'object') {
    return [...Object.keys(value), ...Object.values(value).flatMap(keysIn)];
  }
  return [];
}
const radius = (p) => Math.hypot(p[0], p[1], p[2]);

describe('concept graph data integrity', () => {
  it('has unique stable concept ids and resolvable relations', () => {
    const ids = data.concepts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(50);
    for (const id of ids) expect(id).toMatch(/^concept:[a-z0-9]+(?:_[a-z0-9]+)*$/);
    for (const r of data.relations) {
      expect(model.index.has(r.source)).toBe(true);
      expect(model.index.has(r.target)).toBe(true);
      expect(Object.keys(data.relation_types)).toContain(r.type);
    }
    // These ids are linked from elsewhere (URLs, ledger); renaming them breaks links.
    for (const id of [
      'concept:sigma_algebra',
      'concept:dominated_convergence_theorem',
      'concept:central_limit_theorem',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('cites only known source sections and lecture topics', () => {
    for (const concept of data.concepts) {
      for (const sid of concept.sources.dembo_sections) expect(data.sections).toHaveProperty(sid);
      for (const tid of concept.sources.lecture_topics)
        expect(data.lecture_topics).toHaveProperty(tid);
    }
  });

  it('keeps provenance and separates agent review from human verification', () => {
    for (const r of data.relations) {
      expect(r.rationale.length).toBeGreaterThan(5);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(['proposed', 'agent_reviewed', 'verified']).toContain(r.status);
      if (r.status === 'agent_reviewed') {
        expect(r.review.reviewer).toMatch(/^agent:/);
        expect(r.review.reviewer).not.toBe(r.provenance);
        expect(r.review.reason.length).toBeLessThanOrEqual(300);
      }
      if (r.status === 'verified') expect(r.verified_by).not.toMatch(/^agent:/);
    }
  });

  it('preserves directed relations without mirroring them', () => {
    const keys = new Set(data.relations.map((r) => `${r.source}>${r.target}>${r.type}`));
    for (const r of data.relations) {
      if (data.relation_types[r.type].directed) {
        expect(keys.has(`${r.target}>${r.source}>${r.type}`)).toBe(false);
      }
    }
    expect(
      keys.has('concept:fatou_lemma>concept:dominated_convergence_theorem>used_in_proof'),
    ).toBe(true);
  });
});

describe('similarity normalization', () => {
  it('decodes symmetric channels in [0, 1] with unit diagonal', () => {
    for (const name of CHANNELS) {
      const S = model.S[name];
      for (let i = 0; i < model.n; i++) {
        expect(S[i * model.n + i]).toBe(1);
        for (let j = 0; j < model.n; j++) {
          expect(S[i * model.n + j]).toBeGreaterThanOrEqual(0);
          expect(S[i * model.n + j]).toBeLessThanOrEqual(1);
          expect(S[i * model.n + j]).toBe(S[j * model.n + i]);
        }
      }
    }
  });

  it('scales each channel so a typical strongest-neighbour link has weight one', () => {
    for (const name of CHANNELS) {
      const weights = { semantic: 0, math: 0, source: 0, [name]: 1 };
      const W = combine(model, weights);
      let total = 0;
      for (let i = 0; i < model.n; i++) {
        const row = [];
        for (let j = 0; j < model.n; j++) if (j !== i) row.push(W[i * model.n + j]);
        row.sort((a, b) => b - a);
        total += row.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      }
      // The exported scale is rounded to six decimals.
      expect(total / model.n).toBeCloseTo(1, 3);
    }
  });

  it('normalizes weights and treats all-zero as equal', () => {
    expect(normalizeWeights({ semantic: 2, math: 0, source: 0 })).toEqual({
      semantic: 1,
      math: 0,
      source: 0,
    });
    const equal = normalizeWeights({ semantic: 0, math: 0, source: 0 });
    for (const name of CHANNELS) expect(equal[name]).toBeCloseTo(1 / 3);
  });

  it('keeps the combined kernel positive semidefinite', () => {
    const { values } = symmetricEigen(combine(model, DEFAULT_WEIGHTS), model.n);
    expect(Math.min(...values)).toBeGreaterThan(-1e-8);
  });
});

describe('layouts', () => {
  it('are reproducible for every mode', () => {
    for (const mode of ['pca', 'force', 'hybrid']) {
      const a = computeLayout(model, { mode });
      const b = computeLayout(model, { mode });
      expect(a.points).toEqual(b.points);
    }
  });

  it('respect the ball and surface constraints', () => {
    const ball = computeLayout(model, { mode: 'hybrid', geometry: 'volume' });
    for (const p of ball.points) expect(radius(p)).toBeLessThanOrEqual(1 + 1e-9);
    const surface = computeLayout(model, { mode: 'force', geometry: 'surface' });
    for (const p of surface.points) expect(radius(p)).toBeCloseTo(1, 9);
  });

  it('places foundations inward when depth shells are enabled', () => {
    const layout = computeLayout(model, { mode: 'hybrid', shells: true });
    const shallow = [];
    const deep = [];
    data.concepts.forEach((c, i) =>
      (c.depth <= 2 ? shallow : c.depth >= 8 ? deep : []).push(radius(layout.points[i])),
    );
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(shallow)).toBeLessThan(mean(deep));
  });

  it('stays stable when re-aligned to a previous layout', () => {
    const before = computeLayout(model, { mode: 'hybrid' });
    const after = computeLayout(model, {
      mode: 'hybrid',
      weights: { ...DEFAULT_WEIGHTS, semantic: 0.05 },
      previous: before.points,
      warm: true,
    });
    const rms = (a, b) =>
      Math.sqrt(
        a.reduce(
          (s, p, i) => s + (p[0] - b[i][0]) ** 2 + (p[1] - b[i][1]) ** 2 + (p[2] - b[i][2]) ** 2,
          0,
        ) / a.length,
      );
    expect(rms(after.points, before.points)).toBeLessThan(0.35);
    // Alignment is a rotation: it preserves every radius.
    const rotated = alignTo(after.points, before.points);
    rotated.forEach((p, i) => expect(radius(p)).toBeCloseTo(radius(after.points[i]), 9));
  });

  it('reports PCA explained variance honestly', () => {
    const { explained } = kernelPCA(combine(model, DEFAULT_WEIGHTS), model.n);
    const total = explained.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(0.5); // most structure lives outside three dimensions
    expect(explained[0]).toBeGreaterThanOrEqual(explained[1]);
  });

  it('places mathematically related review pairs nearer than source-only pairs', () => {
    const layout = computeLayout(model, {
      mode: 'hybrid',
      weights: { semantic: 0, math: 1, source: 0 },
    });
    const { reviews } = diagnose(model, layout, data.review_pairs);
    const mean = (cat) => {
      const xs = reviews.filter((r) => r.category === cat).map((r) => r.percentile);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(mean('mathematical')).toBeLessThan(mean('source_only'));
  });
});

describe('public and private separation', () => {
  it('ships no student evidence in the public concept graph', () => {
    expect(data.visibility).toBe('public_curriculum_only');
    const forbidden =
      /^(?:ledger_topics|linked_topics|scores?|observations|evidence_refs|next_probe|assessment_status|state|retention_verified)$/i;
    expect(keysIn(data).filter((key) => forbidden.test(key))).toEqual([]);
    expect(JSON.stringify(data)).not.toMatch(/sessions\/|private_learning_evidence/);
  });

  it('never bundles a private overlay into the public site', () => {
    const files = readdirSync(new URL('../public/learning/data/', import.meta.url));
    expect(files.some((file) => /private|overlay/i.test(file))).toBe(false);
    const app = readFileSync(new URL('../js/concept-space/app.js', import.meta.url), 'utf8');
    expect(app.match(/fetch\(/g)).toHaveLength(1);
    expect(app).not.toMatch(
      /localStorage|sessionStorage|indexedDB|sendBeacon|WebSocket|XMLHttpRequest/,
    );
  });

  it('accepts only a matching private overlay and treats missing evidence as untested', () => {
    expect(() => readOverlay({ visibility: 'public_curriculum_only' }, data)).toThrow();
    expect(() =>
      readOverlay(
        { visibility: 'private_learning_evidence', graph_id: 'other', concepts: {} },
        data,
      ),
    ).toThrow();
    const overlay = readOverlay(
      {
        visibility: 'private_learning_evidence',
        graph_id: data.graph_id,
        concepts: {
          'concept:fatou_lemma': {
            state: 'provisional',
            retention_verified: false,
            linked_topics: [],
          },
          'concept:not_in_graph': { state: 'known_difficulty' },
          'concept:jensen_inequality': { state: 'mastered' },
        },
      },
      data,
    );
    expect(overlay.concepts['concept:fatou_lemma'].state).toBe('provisional');
    expect(overlay.concepts['concept:central_limit_theorem'].state).toBe('no_evidence');
    expect(overlay.concepts['concept:jensen_inequality'].state).toBe('no_evidence');
    expect(overlay.concepts).not.toHaveProperty('concept:not_in_graph');
    expect(EVIDENCE_STATES.no_evidence.label).toMatch(/untested/i);
  });
});
