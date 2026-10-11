import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { project } from '../js/demos/omnifold-replay.js';
import { densityPixels } from '../js/demos/unfolding-density.js';

import { describe, expect, it } from 'vitest';

import { raceIntervals } from '../content/home.js';
import OmniFoldToy from '../js/demos/omnifold-engine.js';
import { createIterationToy } from '../js/demos/unfolding-iteration.js';

describe('race intervals from the supplied recorded splits', () => {
  it('uses cumulative differences and preserves the complete race duration', () => {
    const csv = readFileSync(
      new URL('../public/data/acc-2025-400mh-splits.csv', import.meta.url),
      'utf8',
    );
    const records = raceIntervals(csv);
    expect(records).toHaveLength(11);
    expect(records.reduce((sum, record) => sum + record.intervalS, 0)).toBeCloseTo(52.17, 10);
    expect(records[2].speed).toBeCloseTo(35 / 4.1, 10);
    expect(records.at(-1).intervalS).toBeCloseTo(5.91, 10);
    expect(records.at(-1).speed).toBeCloseTo(40 / 5.91, 10);
  });
});

describe('educational unfolding invariants', () => {
  it('preserves paired event membership and corrected weight totals through truth-space learning', () => {
    const toy = createIterationToy();
    expect(toy.simT).toHaveLength(280);
    expect(toy.simR).toHaveLength(toy.simT.length);
    expect(toy.weights[0].every((w) => w === 1)).toBe(true);
    for (let k = 0; k < toy.corrections.length; k++) {
      const corrected = toy.corrections[k];
      const learned = toy.weights[k + 1];
      expect(learned).toHaveLength(toy.simT.length);
      expect(learned.every((w) => Number.isFinite(w) && w > 0)).toBe(true);
      expect(learned.reduce((sum, w) => sum + w, 0)).toBeCloseTo(
        corrected.reduce((sum, w) => sum + w, 0),
        8,
      );
    }
  });
  it('changes only weights, keeps the measured sample fixed, and preserves normalization', () => {
    const toy = new OmniFoldToy();
    const density = Float64Array.from({ length: 128 * 128 }, (_, i) => (i % 128 < 64 ? 1 : 0.1));
    toy.setupEngine(density, new Float64Array(128 * 128).fill(1));
    const measured = [...toy.E.rx];
    const truth = [...toy.E.tx];
    const pairedBins = [...toy.E.sims.y2024.rb];
    expect(toy.E.sims.y2024.frames[0].ess).toBe(1);
    for (const sim of Object.values(toy.E.sims)) {
      toy.E.step(sim);
      expect(sim.nu.every((weight) => Number.isFinite(weight) && weight >= 0)).toBe(true);
      expect(sim.nu.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(toy.E.ND, 5);
      expect(sim.frames[1].H.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(toy.E.ND, 1);
      expect(sim.frames[1].ess).toBeGreaterThan(0);
      expect(sim.frames[1].ess).toBeLessThanOrEqual(1);
    }
    expect([...toy.E.rx]).toEqual(measured);
    expect([...toy.E.tx]).toEqual(truth);
    expect([...toy.E.sims.y2024.rb]).toEqual(pairedBins);
    expect(toy.E.sims.y2024.frames[1].ess).toBeLessThan(0.9);
  });
});

// Verify the actual exported classifier replay, not just the reference engines.
describe('shared classifier replay', () => {
  const exports = new Map();
  for (const name of [
    'photo-015',
    'photo-040',
    'photo-055',
    'uniform-015',
    'uniform-055',
    'hurdler-015',
    'hurdler-040',
    'flat-015',
    'flat-040',
    'photo-rgb-015',
    'photo-rgb-040',
    'photo-intensity-015',
    'photo-intensity-040',
  ]) {
    const metadata = JSON.parse(
      readFileSync(new URL(`../public/data/unfolding/${name}.json`, import.meta.url), 'utf8'),
    );
    const bytes = readFileSync(new URL(`../public/data/unfolding/${name}.bin`, import.meta.url));
    const values = new Float32Array(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    exports.set(name, { metadata, bytes, values });
  }
  it('retains valid buffers, fixed pairs, and the two distinct learning steps', () => {
    for (const { metadata: m, bytes, values: v } of exports.values()) {
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(m.sha256);
      expect(v.length).toBe(m.floats);
      expect(m.frames).toHaveLength(1 + m.iterations * 3);
      expect(Array.from(v).every(Number.isFinite)).toBe(true);
      const stride = m.pair_stride ?? 4;
      const dimension = stride / 2;
      const pairs = v.subarray(m.pairs, m.pairs + 2 * stride);
      expect(Array.from(pairs.subarray(0, dimension))).toEqual(
        Array.from(pairs.subarray(stride, stride + dimension)),
      );
      expect(Array.from(pairs.subarray(dimension, stride))).not.toEqual(
        Array.from(pairs.subarray(stride + dimension)),
      );
      if (m.channels === 3) {
        expect(pairs[5]).not.toBe(pairs[11]);
        for (let i = 0; i < m.sample_count; i++)
          for (const at of [2, 5]) {
            const color = v[m.pairs + stride * i + at];
            expect(Number.isInteger(color) && color >= 0 && color < 3).toBe(true);
          }
      }
      if (m.color_model === 'rgb') {
        expect(m.features).toEqual(['x', 'y', 'red', 'green', 'blue']);
        for (let i = 0; i < m.sample_count; i++)
          for (const at of [2, 3, 4, 7, 8, 9]) {
            const color = v[m.pairs + stride * i + at];
            expect(color >= 0 && color <= 1).toBe(true);
          }
      }
      for (let k = 1; k <= m.iterations; k++) {
        const previous = m.frames[3 * (k - 1)];
        const detector = m.frames[3 * k - 2],
          pull = m.frames[3 * k - 1],
          learned = m.frames[3 * k];
        expect(detector.beat).toBe('detector');
        expect(
          Array.from(v.subarray(detector.truth_weights, detector.truth_weights + m.sample_count)),
        ).toEqual(
          Array.from(v.subarray(previous.truth_weights, previous.truth_weights + m.sample_count)),
        );
        expect(
          Array.from(v.subarray(pull.truth_weights, pull.truth_weights + m.sample_count)),
        ).toEqual(
          Array.from(v.subarray(detector.reco_weights, detector.reco_weights + m.sample_count)),
        );
        expect(v[learned.truth_weights]).toBeCloseTo(v[learned.truth_weights + 1], 5);
        expect(learned.ess).toBeGreaterThan(0);
        expect(learned.ess).toBeLessThanOrEqual(1);
      }
    }
  });
  it('keeps the measured sample fixed when the prior changes', () => {
    for (const [a, b] of [
      ['photo-015', 'uniform-015'],
      ['photo-055', 'uniform-055'],
      ['hurdler-015', 'flat-015'],
      ['hurdler-040', 'flat-040'],
    ]) {
      const photo = exports.get(a),
        uniform = exports.get(b);
      const size = photo.metadata.grid ** 2 * (photo.metadata.channels ?? 1);
      expect(
        Array.from(photo.values.subarray(photo.metadata.data, photo.metadata.data + size)),
      ).toEqual(
        Array.from(uniform.values.subarray(uniform.metadata.data, uniform.metadata.data + size)),
      );
    }
  });
  it('preserves histogram mass for every projection and display binning', () => {
    const { metadata: m, values: v } = exports.get('hurdler-040');
    const grid = v.subarray(m.frames[24].truth, m.frames[24].truth + m.grid ** 2 * m.channels);
    const total = grid.reduce((sum, x) => sum + x, 0);
    for (const axis of ['x', 'y', 'color'])
      for (const bins of [16, 32, 64]) {
        expect(project(grid, m.grid, axis, bins).reduce((sum, x) => sum + x, 0)).toBeCloseTo(
          total,
          10,
        );
      }
  });
  it('has substantial improvement remaining after the first full default iteration', () => {
    const { frames } = exports.get('hurdler-040').metadata;
    const initial = frames[0].reference_distance,
      first = frames[3].reference_distance,
      final = frames.at(-1).reference_distance;
    expect(final).toBeLessThan(first);
    expect(final).toBeLessThan(0.15);
    expect((initial - first) / (initial - final)).toBeLessThan(0.7);
  });
  it('recovers color proportions as well as spatial structure', () => {
    const { metadata: m, values: v } = exports.get('hurdler-040');
    const size = m.grid ** 2 * m.channels;
    const reference = project(v.subarray(m.reference, m.reference + size), m.grid, 'color', 3);
    const error = (frame) =>
      project(v.subarray(frame.truth, frame.truth + size), m.grid, 'color', 3).reduce(
        (sum, mass, i) => sum + Math.abs(mass - reference[i]),
        0,
      );
    expect(error(m.frames.at(-1))).toBeLessThan(error(m.frames[0]) * 0.2);
  });
  it('preserves RGB event mass and improves photo color recovery', () => {
    for (const name of ['photo-rgb-015', 'photo-rgb-040']) {
      const { metadata: m, values: v } = exports.get(name);
      const area = m.grid ** 2;
      for (const frame of m.frames) {
        for (const level of ['truth', 'reco']) {
          const grid = v.subarray(frame[level], frame[level] + 4 * area);
          const colorHistogram = v.subarray(
            frame[`${level}_color`],
            frame[`${level}_color`] + m.color_bins * 3,
          );
          for (const bins of [16, 32, 64]) {
            for (const axis of ['x', 'y'])
              expect(
                project(grid, m.grid, axis, bins, { colorModel: 'rgb' }).reduce(
                  (sum, x) => sum + x,
                  0,
                ),
              ).toBeCloseTo(
                grid.subarray(0, area).reduce((sum, x) => sum + x, 0),
                9,
              );
            for (const axis of ['red', 'green', 'blue'])
              expect(
                project(grid, m.grid, axis, bins, { colorModel: 'rgb', colorHistogram }).reduce(
                  (sum, x) => sum + x,
                  0,
                ),
              ).toBeCloseTo(1, 5);
          }
          let maximumMomentExcess = 0;
          for (let i = 0; i < area; i++)
            for (let color = 1; color <= 3; color++)
              maximumMomentExcess = Math.max(maximumMomentExcess, grid[color * area + i] - grid[i]);
          expect(maximumMomentExcess).toBeLessThanOrEqual(1e-8);
        }
      }
      expect(m.frames.at(-1).reference_distance).toBeLessThan(m.frames[0].reference_distance * 0.6);
    }
  });
  it('renders intensity channels independently with a fixed brightness scale', () => {
    const grid = Float32Array.from([
      0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75, 0.75, 0.75,
    ]);
    const pixels = densityPixels(grid, 2, ['#ff0000', '#00ff00', '#0000ff'], 1, 'intensity');
    for (let i = 0; i < 4; i++)
      expect(Array.from(pixels.subarray(i * 4, i * 4 + 4))).toEqual([64, 128, 191, 255]);
  });
  it('selects intensity stopping from independent detector validation and retains useful support', () => {
    for (const name of ['photo-intensity-015', 'photo-intensity-040']) {
      const { metadata: m, values: v } = exports.get(name);
      const completed = m.frames.filter((f) => f.beat === 'truth');
      const best = Math.min(...completed.map((f) => f.stopping_score));
      const suggested = completed.find((f) => f.stopping_score <= best + m.stopping_rule.tolerance);
      expect(m.recommended_iteration).toBe(suggested.iteration);
      expect(suggested.ess).toBeGreaterThan(0.6);
      expect(suggested.reference_distance).toBeLessThan(m.frames[0].reference_distance);
      expect(
        m.stopping_rule.training_fraction +
          m.stopping_rule.checkpoint_fraction +
          m.stopping_rule.stopping_fraction,
      ).toBe(1);
      const area = m.grid ** 2;
      for (const frame of m.frames) {
        const grid = v.subarray(frame.truth, frame.truth + 3 * area);
        expect(grid.reduce((sum, x) => sum + x, 0)).toBeCloseTo(1, 6);
        expect(project(grid, m.grid, 'color', 3).reduce((sum, x) => sum + x, 0)).toBeCloseTo(1, 6);
      }
    }
  });
  it('renders RGB from weighted color sums rather than a target photo', () => {
    // Red weight 1 and blue weight 3: the conditional mean is (1/4, 0, 3/4).
    const moments = Float32Array.from([
      1, 1, 1, 1, 0.25, 0.25, 0.25, 0.25, 0, 0, 0, 0, 0.75, 0.75, 0.75, 0.75,
    ]);
    const pixels = densityPixels(moments, 2, [], 1, 'rgb');
    for (let i = 0; i < 4; i++)
      expect(Array.from(pixels.subarray(i * 4, i * 4 + 4))).toEqual([64, 0, 191, 255]);
  });
});
