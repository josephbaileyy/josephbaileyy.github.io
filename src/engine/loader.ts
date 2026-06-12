import type { SceneSource } from './world';
import type { SceneAssets, SceneDef3D, SceneInstance } from './types3d';

/**
 * Async scene lifecycle: load assets + create on request, keep a window of
 * {settled−1, settled, settled+1} instantiated, dispose everything outside it
 * (bounded GPU memory). Prefetch is the caller's policy; this just dedupes.
 */
export class SceneLoader implements SceneSource {
  private instances = new Map<number, SceneInstance>();
  private pending = new Map<number, Promise<void>>();

  constructor(
    private defs: SceneDef3D[],
    private onProgress?: (index: number, p: number) => void,
  ) {}

  get(index: number): SceneInstance | null {
    return this.instances.get(index) ?? null;
  }

  request(index: number): void {
    if (index < 0 || index >= this.defs.length) return;
    if (this.instances.has(index) || this.pending.has(index)) return;
    const def = this.defs[index];
    const job = (async () => {
      let assets: SceneAssets = {};
      if (def.load) {
        assets = await def.load((p) => this.onProgress?.(index, p));
      }
      this.instances.set(index, def.create(assets));
      this.pending.delete(index);
    })().catch((err) => {
      this.pending.delete(index);
      console.error(`scene ${def.id} failed to load`, err);
    });
    this.pending.set(index, job);
  }

  async ensure(index: number): Promise<void> {
    this.request(index);
    await this.pending.get(index);
  }

  isReady(index: number): boolean {
    return this.instances.has(index);
  }

  /** Dispose instances outside the keep-window around the settled scene. */
  prune(center: number): void {
    for (const [i, inst] of this.instances) {
      if (Math.abs(i - center) > 1) {
        inst.dispose();
        this.instances.delete(i);
      }
    }
  }
}
