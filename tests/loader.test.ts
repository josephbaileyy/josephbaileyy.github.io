import { Group } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { SceneLoader } from '../src/engine/loader';
import type { SceneDef3D, SceneInstance } from '../src/engine/types3d';

const instance = (dispose = vi.fn()): SceneInstance => ({
  group: new Group(),
  hotspots: [],
  update: vi.fn(),
  setQuality: vi.fn(),
  dispose,
});

const definition = (id: SceneDef3D['id'], factory: () => SceneInstance): SceneDef3D => ({
  id,
  label: id,
  frameWidthMeters: 1,
  restPose: { focus: [0, 0, 0], dir: [0, 0, 1], frameWidth: 1, fov: 45 },
  importScene: async () => ({ create: factory }),
});

describe('SceneLoader', () => {
  it('moves from idle through loading to ready', async () => {
    const statuses: string[] = [];
    const loader = new SceneLoader([definition('galaxy', instance)], undefined, (_i, status) => statuses.push(status));
    expect(loader.status(0)).toBe('idle');
    await loader.ensure(0);
    expect(loader.isReady(0)).toBe(true);
    expect(statuses).toEqual(['loading', 'ready']);
  });

  it('reports a failure and supports retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let attempts = 0;
    const def = definition('galaxy', instance);
    def.importScene = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return { create: () => instance() };
    };
    const loader = new SceneLoader([def]);
    await loader.ensure(0);
    expect(loader.status(0)).toBe('failed');
    expect(loader.error(0)?.message).toBe('offline');
    loader.retry(0);
    await loader.ensure(0);
    expect(loader.status(0)).toBe('ready');
  });

  it('retains the current scene and both neighbours', async () => {
    const disposed = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    const ids: SceneDef3D['id'][] = ['galaxy', 'solar', 'earth', 'stanford'];
    const loader = new SceneLoader(ids.map((id, i) => definition(id, () => instance(disposed[i]))));
    await Promise.all(ids.map((_id, i) => loader.ensure(i)));
    loader.prune(1);
    expect(loader.isReady(0)).toBe(true);
    expect(loader.isReady(1)).toBe(true);
    expect(loader.isReady(2)).toBe(true);
    expect(loader.isReady(3)).toBe(false);
    expect(disposed[3]).toHaveBeenCalledOnce();
  });
});
