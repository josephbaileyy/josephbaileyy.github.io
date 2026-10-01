import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { raceIntervals } from '../content/home.js';
import OmniFoldToy from '../js/demos/omnifold-engine.js';

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
