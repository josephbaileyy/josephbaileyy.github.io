import { describe, expect, it } from 'vitest';
import { computeLayers, restScale } from '../src/engine/transforms';
import { DESIGN_W, DESIGN_H, type Rect, type SceneMeta } from '../src/engine/types';

const VP = { w: 1280, h: 800 };
const anchor: Rect = { x: 1010, y: 588.75, w: 100, h: 62.5 };
const metas: SceneMeta[] = [{ anchor }, { anchor }, {}];

function applyMatrix(m: number[], x: number, y: number): [number, number] {
  return [m[0] * x + m[4], m[3] * y + m[5]];
}

describe('computeLayers', () => {
  it('shows exactly one scene at rest, identity-fitted to the viewport', () => {
    for (const d of [0, 1, 2]) {
      const layers = computeLayers(d, metas, VP);
      expect(layers.filter((l) => l.visible).map((l) => l.index)).toEqual([d]);
      const m = layers[d].matrix;
      const fit = restScale(VP);
      expect(m[0]).toBeCloseTo(fit, 10);
      // design center lands on viewport center
      const [cx, cy] = applyMatrix(m, DESIGN_W / 2, DESIGN_H / 2);
      expect(cx).toBeCloseTo(VP.w / 2, 8);
      expect(cy).toBeCloseTo(VP.h / 2, 8);
    }
  });

  it('keeps the child glued to the parent anchor throughout the transition', () => {
    for (const t of [0.31, 0.5, 0.75, 0.95]) {
      const layers = computeLayers(t, metas, VP);
      const parent = layers[0];
      const child = layers[1];
      expect(parent.visible).toBe(true);
      expect(child.visible).toBe(true);
      // child design origin must land exactly on the parent anchor's corner
      const [ax, ay] = applyMatrix(parent.matrix, anchor.x, anchor.y);
      const [cx, cy] = applyMatrix(child.matrix, 0, 0);
      expect(cx).toBeCloseTo(ax, 6);
      expect(cy).toBeCloseTo(ay, 6);
      // and the child's width must equal the anchor's on-screen width
      expect(child.matrix[0] * DESIGN_W).toBeCloseTo(parent.matrix[0] * anchor.w, 6);
    }
  });

  it('hands off seamlessly: at t→1 the child converges to its rest transform', () => {
    const nearEnd = computeLayers(1 - 1e-7, metas, VP);
    const rest = computeLayers(1, metas, VP);
    const child = nearEnd[1].matrix;
    const settled = rest[1].matrix;
    expect(child[0]).toBeCloseTo(settled[0], 3);
    expect(child[4]).toBeCloseTo(settled[4], 2);
    expect(child[5]).toBeCloseTo(settled[5], 2);
    expect(nearEnd[1].opacity).toBe(1);
  });

  it('keeps per-layer scale bounded regardless of depth', () => {
    const K = DESIGN_W / anchor.w;
    const fit = restScale(VP);
    for (const d of [0.1, 0.5, 0.9, 1.2, 1.8]) {
      for (const layer of computeLayers(d, metas, VP).filter((l) => l.visible)) {
        expect(layer.matrix[0]).toBeGreaterThanOrEqual(fit / K - 1e-9);
        expect(layer.matrix[0]).toBeLessThanOrEqual(fit * K + 1e-9);
      }
    }
  });

  it('clamps out-of-range depths', () => {
    expect(computeLayers(-1, metas, VP)[0].visible).toBe(true);
    expect(computeLayers(99, metas, VP)[2].visible).toBe(true);
  });
});
