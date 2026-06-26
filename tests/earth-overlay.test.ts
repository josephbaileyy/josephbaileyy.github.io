// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { earthWheelZoom, type EarthViewState } from '../src/scenes/earth';
import { layoutEarthPins } from '../src/ui/earth-overlay';

describe('Earth interaction helpers', () => {
  it('clamps wheel zoom to inspection-friendly bounds', () => {
    const state: EarthViewState = { zoom: 1, targetZoom: 1 };
    expect(earthWheelZoom(state, -10_000).targetZoom).toBe(1.5);
    expect(earthWheelZoom(state, 10_000).targetZoom).toBe(0.78);
  });

  it('separates overlapping coordinate labels by side', () => {
    const pins = layoutEarthPins(
      [
        { el: document.createElement('button'), x: 420, y: 160, priority: 0 },
        { el: document.createElement('button'), x: 430, y: 162, priority: 2 },
        { el: document.createElement('button'), x: 120, y: 161, priority: 1 },
      ],
      { w: 800, h: 600 },
    );
    const rightSide = pins.filter((pin) => !pin.labelLeft).sort((a, b) => a.labelY - b.labelY);
    expect(Math.abs(rightSide[1].labelY - rightSide[0].labelY)).toBeGreaterThanOrEqual(32);
    expect(pins.every((pin) => pin.labelY >= 74 && pin.labelY <= 530)).toBe(true);
  });
});
