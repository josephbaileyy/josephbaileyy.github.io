import { describe, expect, it } from 'vitest';
import { branchForHash, CHAIN3D, chainForBranch, FERMILAB_CHAIN3D } from '../src/scenes/registry';

describe('switchable linear scene chains', () => {
  it('keeps the Stanford chain as the default and selects explicit Fermilab deep links', () => {
    expect(chainForBranch('stanford')).toBe(CHAIN3D);
    expect(chainForBranch('fermilab')).toBe(FERMILAB_CHAIN3D);
    expect(CHAIN3D.map((scene) => scene.id)).toEqual([
      'galaxy',
      'solar',
      'earth',
      'stanford',
      'room',
      'screen',
    ]);
    expect(FERMILAB_CHAIN3D.map((scene) => scene.id)).toEqual([
      'galaxy',
      'solar',
      'earth',
      'fermilab',
      'numi-hall',
      'event',
    ]);
    expect(branchForHash('')).toBe('stanford');
    expect(branchForHash('#/earth')).toBe('stanford');
    expect(branchForHash('#/fermilab')).toBe('fermilab');
    expect(branchForHash('#/numi-hall')).toBe('fermilab');
    expect(branchForHash('#/event')).toBe('fermilab');
  });

  it('keeps every Fermilab hop inside the proxy size-match range', () => {
    for (let parent = 2; parent < FERMILAB_CHAIN3D.length - 1; parent++) {
      const parentDef = FERMILAB_CHAIN3D[parent];
      const childDef = FERMILAB_CHAIN3D[parent + 1];
      const k =
        parentDef.restPose.frameWidth /
        (childDef.restPose.frameWidth * (parentDef.anchor?.scale ?? 1));
      expect(k).toBeGreaterThanOrEqual(13);
      expect(k).toBeLessThanOrEqual(28);
    }
  });
});
