import type { SceneSource } from './world';
import type { SceneDef3D, SceneInstance, SceneModule } from './types3d';

export type SceneLoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Async scene lifecycle: load assets + create on request, keep a window of
 * a configurable window around the settled scene, dispose everything outside it
 * (bounded GPU memory). Prefetch is the caller's policy; this just dedupes.
 */
export class SceneLoader implements SceneSource {
  private instances = new Map<number, SceneInstance>();
  private pending = new Map<number, Promise<void>>();
  private modules = new Map<number, SceneModule>();
  private modulePending = new Map<number, Promise<SceneModule>>();
  private states = new Map<number, SceneLoadStatus>();
  private errors = new Map<number, Error>();

  constructor(
    private defs: SceneDef3D[],
    private onProgress?: (index: number, p: number) => void,
    private onStatus?: (index: number, status: SceneLoadStatus, error?: Error) => void,
  ) {}

  get(index: number): SceneInstance | null {
    return this.instances.get(index) ?? null;
  }

  request(index: number): void {
    if (index < 0 || index >= this.defs.length) return;
    if (this.instances.has(index) || this.pending.has(index)) return;
    this.setStatus(index, 'loading');
    const job = (async () => {
      const mod = await this.importModule(index);
      const assets = mod.load ? await mod.load((p) => this.onProgress?.(index, p)) : {};
      this.instances.set(index, mod.create(assets));
      this.pending.delete(index);
      this.errors.delete(index);
      this.setStatus(index, 'ready');
    })().catch((err) => {
      this.pending.delete(index);
      const error = err instanceof Error ? err : new Error(String(err));
      this.errors.set(index, error);
      this.setStatus(index, 'failed', error);
      console.error(`scene ${this.defs[index].id} failed to load`, error);
    });
    this.pending.set(index, job);
  }

  /**
   * Fetch and parse a scene module without invoking its asset loader or
   * creating GPU resources. This is safe for adjacent-scene speculation.
   */
  async warmManifest(index: number): Promise<void> {
    if (index < 0 || index >= this.defs.length) return;
    try {
      await this.importModule(index);
    } catch (err) {
      console.warn(`scene ${this.defs[index].id} manifest failed to warm`, err);
    }
  }

  async ensure(index: number): Promise<void> {
    this.request(index);
    await this.pending.get(index);
  }

  isReady(index: number): boolean {
    return this.instances.has(index);
  }

  status(index: number): SceneLoadStatus {
    return this.states.get(index) ?? 'idle';
  }

  error(index: number): Error | undefined {
    return this.errors.get(index);
  }

  retry(index: number): void {
    if (this.status(index) !== 'failed') return;
    this.states.delete(index);
    this.errors.delete(index);
    this.request(index);
  }

  private importModule(index: number): Promise<SceneModule> {
    const cached = this.modules.get(index);
    if (cached) return Promise.resolve(cached);
    const pending = this.modulePending.get(index);
    if (pending) return pending;
    const job = this.defs[index]
      .importScene()
      .then((mod) => {
        this.modules.set(index, mod);
        this.modulePending.delete(index);
        return mod;
      })
      .catch((err) => {
        this.modulePending.delete(index);
        throw err;
      });
    this.modulePending.set(index, job);
    return job;
  }

  /** Dispose instances outside the keep-window around the settled scene. */
  prune(center: number, radius = 1): void {
    for (const [i, inst] of this.instances) {
      if (Math.abs(i - center) > radius) {
        inst.dispose();
        this.instances.delete(i);
      }
    }
  }

  private setStatus(index: number, status: SceneLoadStatus, error?: Error): void {
    this.states.set(index, status);
    this.onStatus?.(index, status, error);
  }
}
