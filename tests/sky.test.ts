import { describe, expect, it } from 'vitest';
import { skyTransitionOpacity } from '../src/scenes/lib/sky';

describe('sky transition opacity', () => {
  it('shows the sky only when its scene is settled', () => {
    expect(skyTransitionOpacity(0)).toBe(1);
    expect(skyTransitionOpacity(-1)).toBe(0);
    expect(skyTransitionOpacity(1)).toBe(0);
  });

  it('fades symmetrically near either side of the settled scene', () => {
    expect(skyTransitionOpacity(-0.09)).toBeCloseTo(0.5);
    expect(skyTransitionOpacity(0.09)).toBeCloseTo(0.5);
  });
});
