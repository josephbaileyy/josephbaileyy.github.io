import { describe, expect, it } from 'vitest';
import { layoutReticles } from '../src/ui/solar-overlay';

const el = {} as HTMLButtonElement;

describe('solar reticle layout', () => {
  it('keeps marker centers on their projected body positions', () => {
    const result = layoutReticles([
      { el, x: 320.25, y: 410.75, order: 0 },
      { el, x: 900.5, y: 220.5, order: 1 },
    ], { w: 1280, h: 800 });
    expect(result[0].x).toBe(320.25);
    expect(result[0].y).toBe(410.75);
    expect(result[1].x).toBe(900.5);
    expect(result[1].y).toBe(220.5);
  });

  it('declutters labels without moving coincident marker centers', () => {
    const result = layoutReticles([
      { el, x: 600, y: 400, order: 0 },
      { el, x: 610, y: 400, order: 2 },
    ], { w: 1280, h: 800 });
    expect(result.map(({ x, y }) => [x, y])).toEqual([[600, 400], [610, 400]]);
    expect(Math.abs(result[1].labelY - result[0].labelY)).toBeGreaterThanOrEqual(26);
  });
});
