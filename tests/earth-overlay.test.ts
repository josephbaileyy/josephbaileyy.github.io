// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { earthWheelZoom, type EarthViewState } from '../src/scenes/earth';
import { EarthOverlay, layoutEarthPins } from '../src/ui/earth-overlay';

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

  it('explains, updates, and reverses the opt-in location state', () => {
    const overlay = new EarthOverlay(undefined, vi.fn(), vi.fn(), vi.fn());
    const locate = document.querySelector<HTMLButtonElement>(
      '[aria-label*="browser location permission"]',
    );
    expect(locate?.textContent).toBe('locate me');
    expect(document.querySelector('.earth-location-note')?.textContent).toContain(
      'stays on this device',
    );

    overlay.setLocateState({
      label: 'clear location',
      ariaLabel: 'Clear my location marker from the globe',
      message: 'marker shown locally · coordinates were not stored',
    });
    expect(locate?.textContent).toBe('clear location');
    expect(locate?.getAttribute('aria-label')).toContain('Clear my location');
    expect(document.querySelector('.earth-location-note')?.textContent).toContain('not stored');
    overlay.dispose();
  });
});
