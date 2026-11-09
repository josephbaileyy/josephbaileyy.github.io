import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { curriculumIndex, mapVisibility, practiceQueue } from '../js/concept-space/curriculum.js';
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
import { evidenceState, readOverlay } from '../js/concept-space/overlay.js';

const data = JSON.parse(
  readFileSync(new URL('../public/learning/data/concepts.public.json', import.meta.url), 'utf8'),
);
const model = decode(data);
const index = curriculumIndex(data, model);
const ids = model.index;
const radius = (p) => Math.hypot(...p);
const first = (id) => ids.get(`concept:${id}`);

function keysIn(value) {
  if (Array.isArray(value)) return value.flatMap(keysIn);
  if (value && typeof value === 'object') {
    return [...Object.keys(value), ...Object.values(value).flatMap(keysIn)];
  }
  return [];
}

describe('unified public graph', () => {
  it('has four courses with stable identities, valid occurrences and reviewed edges', () => {
    expect(data.courses.map((c) => c.id)).toEqual([
      'stats310a',
      'math116',
      'math120',
      'physics330',
    ]);
    expect(ids.size).toBe(353);
    expect(model.relations).toHaveLength(data.relations.length);
    expect(data.relations).toHaveLength(637);
    expect(index.bridges.size).toBe(35);
    expect(first('central_limit_theorem')).toBeDefined();
    for (const [i, concept] of model.concepts.entries()) {
      expect(concept.id).toMatch(/^concept:[a-z0-9]+(?:_[a-z0-9]+)*$/);
      expect(index.occurrences[i].map((o) => o.course)).toEqual(concept.courses);
      expect(concept.courses).toContain(concept.home_course);
      for (const occurrence of index.occurrences[i]) {
        for (const anchor of occurrence.anchors) {
          if (anchor.source) expect(data.sources[anchor.source]).toBeDefined();
          if (anchor.unit) expect(index.units[occurrence.course].has(anchor.unit)).toBe(true);
        }
      }
    }
    for (const r of data.relations) {
      expect(model.types[r.type].class).toBe(r.class);
      expect(r.review.reviewer).toMatch(/^agent:/);
      expect(r.review.reviewer).not.toBe(r.provenance);
      expect(r.review.reason).toBeTruthy();
      if (r.review.basis !== 'mathematical_knowledge')
        expect(r.review.read.length).toBeGreaterThan(0);
      expect(r.status).toBe('agent_reviewed');
    }
    expect(data.review_pairs.every(({ a, b }) => ids.has(a) && ids.has(b))).toBe(true);
  });

  it('keeps shared nodes canonical and uses only dated syllabus anchors for the cutoff', () => {
    expect(
      index.occurrences[first('fubini_tonelli')].map((o) => [o.course, o.firstScheduled]),
    ).toEqual([
      ['stats310a', '2026-10-19'],
      ['math116', null],
      ['physics330', null],
    ]);
    const group = index.occurrences[first('group')].find((o) => o.course === 'math120');
    expect(group.firstScheduled).toMatch(/^2026-/);
  });

  it('retains only applicable bridge endpoints as context for a course filter', () => {
    const state = {
      concepts: model.concepts,
      endpoints: model.relations.map(({ source, target }) => [ids.get(source), ids.get(target)]),
      course: 'math116',
      kinds: new Set(model.concepts.map((c) => c.kind)),
      selected: -1,
      showBridges: true,
      cutoff: data.as_of,
      scheduledOnly: false,
    };
    const matches = mapVisibility(index, state, () => true);
    expect(matches.primary.filter(Boolean)).toHaveLength(84);
    expect(matches.context[first('characteristic_function')]).toBe(true);
    expect(matches.visible[first('central_limit_theorem')]).toBe(false);
    const local = mapVisibility(
      index,
      { ...state, selected: first('fourier_transform') },
      () => true,
    );
    expect(local.visible[first('characteristic_function')]).toBe(true);
    expect(local.visible.filter(Boolean).length).toBeLessThan(10);
    expect(
      mapVisibility(index, { ...state, showBridges: false }, () => true).context.some(Boolean),
    ).toBe(false);
    expect(
      mapVisibility(index, { ...state, scheduledOnly: true }, () => true).visible.some(Boolean),
    ).toBe(false);
  });

  it('prioritizes missing independent evidence with reviewed dependency direction', () => {
    const fatou = first('fatou_lemma');
    const dct = first('dominated_convergence_theorem');
    expect(practiceQueue(index, [dct], null, 'stats310a')[0].missing).toContain(fatou);
    const overlay = {
      entry(i) {
        return i === fatou ? { state: 'independently_demonstrated' } : { state: 'provisional' };
      },
    };
    const [choice] = practiceQueue(index, [dct, fatou], overlay, 'stats310a');
    expect(choice.i).toBe(dct);
    expect(choice.missing).not.toContain(fatou);
  });
});

describe('geometry and channel integrity', () => {
  it('decodes symmetric normalized channels with unit diagonal and scale', () => {
    const { n } = model;
    for (const name of CHANNELS) {
      const S = model.S[name];
      const W = combine(model, { [name]: 1 });
      let total = 0;
      for (let i = 0; i < n; i++) {
        const row = Array.from({ length: n }, (_, j) => S[i * n + j]);
        expect(row[i]).toBe(1);
        expect(row.every((v, j) => v >= 0 && v <= 1 && v === S[j * n + i])).toBe(true);
        total +=
          Array.from(W.slice(i * n, (i + 1) * n))
            .filter((_, j) => j !== i)
            .sort((a, b) => b - a)
            .slice(0, 5)
            .reduce((a, b) => a + b, 0) / 5;
      }
      expect(total / n).toBeCloseTo(1, 3);
    }
    expect(normalizeWeights({ semantic: 2, math: 0, source: 0 })).toEqual({
      semantic: 1,
      math: 0,
      source: 0,
    });
    for (const name of CHANNELS) expect(normalizeWeights({})[name]).toBeCloseTo(1 / 3);
  });

  it('computes orthogonal eigenvectors and orders the kernel projection axes by variance', () => {
    const { values, vectors } = symmetricEigen([2, 1, 1, 2], 2);
    expect(values).toEqual([3, 1]);
    expect(vectors[0][0] * vectors[1][0] + vectors[0][1] * vectors[1][1]).toBeCloseTo(0, 12);
    const { explained } = kernelPCA(combine(model, DEFAULT_WEIGHTS), model.n);
    expect(explained[0]).toBeGreaterThanOrEqual(explained[1]);
    expect(explained[1]).toBeGreaterThanOrEqual(explained[2]);
    const sum = explained.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
    expect(sum).toBeLessThan(0.1);
  }, 15000);

  it('keeps the canonical hybrid deterministic, bounded and stable as affinity changes', () => {
    const before = computeLayout(model);
    expect(computeLayout(model).points).toEqual(before.points);
    expect(before.points.every((p) => radius(p) <= 1 + 1e-9)).toBe(true);
    expect(before.points.filter((p) => radius(p) < 0.999).length).toBeGreaterThan(50);
    const after = computeLayout(model, {
      weights: { ...DEFAULT_WEIGHTS, semantic: 0.05 },
      previous: before.points,
      warm: true,
    });
    const rms = Math.sqrt(
      after.points.reduce(
        (s, p, i) => s + p.reduce((sum, x, j) => sum + (x - before.points[i][j]) ** 2, 0),
        0,
      ) / model.n,
    );
    expect(rms).toBeLessThan(0.14);
    const rotated = alignTo(after.points, before.points);
    rotated.forEach((p, i) => expect(radius(p)).toBeCloseTo(radius(after.points[i]), 9));
    const { reviews, relationStretch, channel } = diagnose(model, before, data.review_pairs);
    expect(channel.math.overlap).toBeGreaterThan(0.4);
    expect(relationStretch).toBeLessThan(0.19);
    expect(reviews.filter((r) => r.ok).length).toBeGreaterThanOrEqual(80);
  }, 15000);
});

describe('public and private separation', () => {
  it('ships only curriculum and keeps the private loader local', () => {
    expect(data.visibility).toBe('public_curriculum_only');
    const { channels: _channels, ...content } = data;
    const forbidden =
      /^(?:ledger_topics|linked_topics|scores?|observations|evidence_refs|next_probe|assessment_status|state|retention_verified|diagnostic_queue)$/i;
    expect(keysIn(content).filter((key) => forbidden.test(key))).toEqual([]);
    expect(JSON.stringify(content)).not.toMatch(
      /sessions\/|private_learning_evidence|github_pat_|ghp_/,
    );
    expect(readdirSync(new URL('../public/learning/data/', import.meta.url))).toEqual([
      'concepts.public.json',
    ]);
    const app = readFileSync(new URL('../js/concept-space/app.js', import.meta.url), 'utf8');
    expect(app.match(/fetch\(/g)).toHaveLength(1);
    expect(app).not.toMatch(
      /localStorage|sessionStorage|indexedDB|sendBeacon|WebSocket|XMLHttpRequest/,
    );
  });

  it('accepts unified and legacy concept overlays with safe defaults for missing entries', () => {
    expect(() => readOverlay({ visibility: 'public_curriculum_only' }, data)).toThrow();
    const base = { visibility: 'private_learning_evidence' };
    expect(() => readOverlay({ ...base, graph_id: 'other', concepts: {} }, data)).toThrow();
    const dct = 'concept:dominated_convergence_theorem';
    const fatou = 'concept:fatou_lemma';
    const demonstrated = { state: 'independently_demonstrated', retention_verified: true };
    const provisional = { state: 'provisional' };
    const unified = readOverlay(
      {
        ...base,
        schema_version: 2,
        export_id: data.export_id,
        concepts: {
          [dct]: {
            overall: provisional,
            by_course: { stats310a: demonstrated, math116: provisional },
          },
        },
      },
      data,
    );
    expect(evidenceState(unified.concepts[dct].byCourse.stats310a)).toBe('retention_verified');
    expect(evidenceState(unified.concepts[dct].byCourse.math116)).toBe('provisional');
    expect(evidenceState(unified.concepts[fatou])).toBe('no_evidence');
    const legacy = readOverlay(
      {
        ...base,
        graph_id: 'concept-atlas:stats310a',
        concepts: { [fatou]: provisional, 'concept:unknown': demonstrated },
      },
      data,
    );
    expect(legacy.legacy).toBe(true);
    expect(evidenceState(legacy.concepts[fatou].byCourse.stats310a)).toBe('provisional');
    expect(legacy.concepts['concept:unknown']).toBeUndefined();
  });
});
