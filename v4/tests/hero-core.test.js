import { describe, expect, it } from 'vitest';
import {
  MAX_CHARGE_DISTANCE,
  chargeFromDistance,
  createRng,
  parseMachineParams,
  selectCapabilityTier,
  validateManifest,
} from '../js/hero/math.js';
import { fixtureManifest } from '../js/hero/fixture-manifest.js';
import { createPhysics } from '../js/hero/physics.js';

describe('seeded PRNG', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = createRng(17);
    const second = createRng(17);

    expect(Array.from({ length: 12 }, first)).toEqual(Array.from({ length: 12 }, second));
  });

  it('changes sequence when the seed changes', () => {
    expect(createRng(17)()).not.toBe(createRng(18)());
  });
});

describe('charge curve', () => {
  it('clamps and reaches a clear maximum', () => {
    expect(chargeFromDistance(-2).normalized).toBe(0);
    expect(chargeFromDistance(MAX_CHARGE_DISTANCE).normalized).toBe(1);
    expect(chargeFromDistance(999)).toEqual(chargeFromDistance(MAX_CHARGE_DISTANCE));
  });

  it('builds non-linearly toward a violent maximum impulse', () => {
    const quarter = chargeFromDistance(MAX_CHARGE_DISTANCE * 0.25);
    const half = chargeFromDistance(MAX_CHARGE_DISTANCE * 0.5);
    const full = chargeFromDistance(MAX_CHARGE_DISTANCE);

    expect(quarter.impulse).toBeLessThan(half.impulse / 2);
    expect(full.impulse).toBeGreaterThan(40);
    expect(full.angularImpulse).toBeGreaterThan(10);
  });
});

describe('capability tiers', () => {
  it('selects desktop, mid, and phone at explicit thresholds', () => {
    expect(
      selectCapabilityTier({
        width: 1280,
        devicePixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }).name,
    ).toBe('desktop');
    expect(
      selectCapabilityTier({
        width: 768,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }).name,
    ).toBe('mid');
    expect(
      selectCapabilityTier({
        width: 390,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }).name,
    ).toBe('phone');
  });

  it('caps pixel ratio and lowers expensive effects', () => {
    const phone = selectCapabilityTier({
      width: 390,
      devicePixelRatio: 3,
    });
    expect(phone.pixelRatio).toBe(1.15);
    expect(phone.postprocessing).toBe(false);
    expect(phone.shadowMapSize).toBe(0);
  });
});

describe('manifest validation', () => {
  it('accepts the standalone fixture', () => {
    expect(validateManifest(fixtureManifest)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('reports duplicate IDs and invalid slots', () => {
    const invalid = {
      bodies: [
        {
          id: 'same',
          label: 'GOOD',
          massClass: 'heavy',
          slot: { x: 0, y: 0 },
          kind: 'research',
          href: null,
        },
        {
          id: 'same',
          label: 'TOO-LONG-LABEL',
          massClass: 'other',
          slot: { x: 2, y: 0 },
          kind: 'research',
          href: null,
        },
      ],
    };

    const result = validateManifest(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('bodies[1].id must be unique');
    expect(result.errors).toContain('bodies[1].slot must contain x/y in chamber space');
  });
});

describe('URL parameter parsing', () => {
  it('parses deterministic capture controls', () => {
    expect(parseMachineParams('?machine=impact&seed=17&frame=42')).toEqual({
      machine: 'impact',
      seed: 17,
      frame: 42,
    });
  });

  it('uses safe defaults and clamps frame count', () => {
    expect(parseMachineParams('?machine=unknown&seed=nope&frame=-10')).toEqual({
      machine: 'idle',
      seed: 17,
      frame: 0,
    });
  });
});

describe('impact propagation', () => {
  it('wakes and disturbs most of the desktop pack', async () => {
    const physics = await createPhysics({
      manifest: fixtureManifest,
      seed: 17,
      tier: selectCapabilityTier({
        width: 1280,
        devicePixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }),
    });

    try {
      const initialPositions = physics.records.map((record) => ({ ...record.body.translation() }));

      physics.launchDeterministic();
      expect(physics.records.every((record) => !record.body.isSleeping())).toBe(true);

      for (let frame = 0; frame < 120; frame += 1) physics.step();

      const movedCount = physics.records.filter((record, index) => {
        const initial = initialPositions[index];
        const position = record.body.translation();
        return (
          Math.hypot(
            position.x - initial.x,
            position.y - initial.y,
            position.z - initial.z,
          ) > 0.05
        );
      }).length;

      expect(physics.records).toHaveLength(85);
      expect(movedCount).toBeGreaterThanOrEqual(75);
    } finally {
      physics.destroy();
    }
  });
});
