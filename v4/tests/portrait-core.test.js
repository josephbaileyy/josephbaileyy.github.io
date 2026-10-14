import { describe, expect, it } from 'vitest';
import {
  FIXED_STEP,
  createRng,
  fitPortraitProjection,
  modeImpulse,
  parsePortraitParams,
  selectPortraitTier,
} from '../js/portrait/math.js';

describe('portrait deterministic core', () => {
  it('repeats seeded values without using ambient randomness', () => {
    const first = createRng(17);
    const second = createRng(17);
    const other = createRng(18);

    expect(Array.from({ length: 16 }, first)).toEqual(Array.from({ length: 16 }, second));
    expect(createRng(17)()).not.toBe(other());
  });

  it('parses and clamps deep-link capture parameters', () => {
    expect(parsePortraitParams('?portrait=physicist&seed=91&frame=180')).toEqual({
      mode: 'physicist',
      seed: 91,
      frame: 180,
      hasFrame: true,
    });
    expect(parsePortraitParams('?portrait=unknown&seed=nope&frame=-4')).toEqual({
      mode: 'idle',
      seed: 17,
      frame: 0,
      hasFrame: true,
    });
  });
});

describe('portrait capability tiers', () => {
  it('selects explicit desktop, constrained, and phone point budgets', () => {
    expect(
      selectPortraitTier({
        width: 1440,
        devicePixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }),
    ).toMatchObject({ name: 'high', textureSize: 576, pointCount: 331776, assetSuffix: '' });
    expect(
      selectPortraitTier({
        width: 900,
        devicePixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }),
    ).toMatchObject({ name: 'medium', textureSize: 480, pointCount: 230400, assetSuffix: '' });
    expect(
      selectPortraitTier({
        width: 390,
        devicePixelRatio: 3,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }),
    ).toMatchObject({
      name: 'low',
      textureSize: 288,
      pointCount: 82944,
      assetSuffix: '-512',
      pixelRatio: 1.5,
    });
  });

  it('contains the square portrait with equal breathing room at every aspect ratio', () => {
    expect(fitPortraitProjection(1280, 900)).toEqual([0.6609375, 0.94]);
    expect(fitPortraitProjection(390, 844)).toEqual([0.94, 0.4343601895734597]);
    expect(fitPortraitProjection(2560, 1080)).toEqual([0.3965625, 0.94]);
  });
});

describe('real-data mode impulses', () => {
  it('maps note pitch and velocity into a deterministic field disturbance', () => {
    const data = {
      score: {
        duration: 10,
        notes: [{ pitch: 72, start: FIXED_STEP, velocity: 0.75 }],
      },
    };
    const impulse = modeImpulse('musician', 1, data);
    expect(impulse.x).toBeCloseTo(0.2807333);
    expect(impulse.y).toBeCloseTo(0.564);
    expect(impulse.amplitude).toBeCloseTo(0.86);
    expect(impulse.radius).toBe(0.065);
  });

  it('uses interval velocity for hurdle impulses and track kinematics for CMS impulses', () => {
    const runner = modeImpulse('runner', 365, {
      stride: {
        touchdownTimes: [6.09],
        finishTime: 52.17,
        intervalVelocities: [7.389],
      },
    });
    expect(runner).toMatchObject({ x: 0.14, amplitude: 0.8305, radius: 0.085 });

    const physicist = modeImpulse('physicist', 17, {
      tracks: [{ pt: 4.742, eta: 0.997, phi: -3.024, q: 1 }],
    });
    expect(physicist).toEqual(
      modeImpulse('physicist', 17, {
        tracks: [{ pt: 4.742, eta: 0.997, phi: -3.024, q: 1 }],
      }),
    );
    expect(physicist.amplitude).toBeGreaterThan(0.7);
  });
});
