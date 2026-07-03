import { describe, expect, it } from 'vitest';
import {
  HOTSPOT_PROXY_MAX_PX,
  HOTSPOT_PROXY_MIN_PX,
  clampHotspotProxySize,
  layoutHotspotProxyRects,
} from '../src/engine/hotspots';

describe('hotspot proxy layout', () => {
  it('clamps projected hit sizes to mobile tap bounds', () => {
    expect(clampHotspotProxySize(12)).toBe(HOTSPOT_PROXY_MIN_PX);
    expect(clampHotspotProxySize(64)).toBe(64);
    expect(clampHotspotProxySize(340)).toBe(HOTSPOT_PROXY_MAX_PX);
  });

  it('keeps oversized proxies within the viewport and under the maximum', () => {
    const [rect] = layoutHotspotProxyRects([{ x: 195, y: 422, projectedSize: 333.4 }], {
      w: 390,
      h: 844,
    });

    expect(rect.size).toBe(HOTSPOT_PROXY_MAX_PX);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.left + rect.size).toBeLessThanOrEqual(390);
    expect(rect.top + rect.size).toBeLessThanOrEqual(844);
  });

  it('resolves overlapping proxies deterministically', () => {
    const candidates = [
      { x: 120, y: 120, projectedSize: 60 },
      { x: 120, y: 120, projectedSize: 60 },
      { x: 120, y: 120, projectedSize: 60 },
    ];
    const first = layoutHotspotProxyRects(candidates, { w: 320, h: 320 });
    const second = layoutHotspotProxyRects(candidates, { w: 320, h: 320 });

    expect(second).toEqual(first);
    for (let i = 0; i < first.length; i++) {
      for (let j = i + 1; j < first.length; j++) {
        expect(rectsOverlap(first[i], first[j])).toBe(false);
      }
    }
  });
});

function rectsOverlap(
  a: { left: number; top: number; size: number },
  b: { left: number; top: number; size: number },
): boolean {
  return (
    a.left < b.left + b.size &&
    a.left + a.size > b.left &&
    a.top < b.top + b.size &&
    a.top + a.size > b.top
  );
}
