import { Group } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { World, type SceneSource } from '../src/engine/world';
import type { SceneInstance } from '../src/engine/types3d';
import { CHAIN3D } from '../src/scenes/registry';
import { EARTH_RADIUS_AU } from '../src/scenes/lib/astro';

const scene = (): SceneInstance => ({
  group: new Group(), hotspots: [], update: vi.fn(), setQuality: vi.fn(), dispose: vi.fn(),
});

describe('World physical-scale transitions', () => {
  it('uses the moving child anchor and lowers the near plane before Earth', () => {
    const instances = CHAIN3D.map(() => scene());
    instances[1].childAnchor = { position: [1, 0, 0], scale: EARTH_RADIUS_AU / 10 };
    const source: SceneSource = { get: (index) => instances[index] ?? null, request: vi.fn() };
    const world = new World(CHAIN3D, source);
    world.update(1.99, { w: 1280, h: 800 }, 1 / 60, 0, true, Date.UTC(2026, 0, 1));
    expect(world.camera.near).toBeLessThan(1e-5);
    expect(instances[2].group.scale.x).toBeCloseTo(EARTH_RADIUS_AU / 10, 12);
  });
});
