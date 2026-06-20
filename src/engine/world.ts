import { PerspectiveCamera, Scene, Vector3 } from 'three';
import { anchorMatrix, cameraPoseWithAnchors, nextMountPlan, type MountPlan, type Viewport } from './rig';
import type { FrameCtx, QualityTier, SceneDef3D, SceneInstance } from './types3d';

/**
 * Provides scene instances to the world. Returns null while a scene's assets
 * are still loading; request() kicks the load off.
 */
export interface SceneSource {
  get(index: number): SceneInstance | null;
  request(index: number): void;
}

/**
 * Owns the THREE.Scene graph and applies the MountPlan: base scene at
 * identity, child nested at the base's anchor transform. Pure diffing —
 * crossing an integer boundary just re-evaluates, in either direction.
 */
export class World {
  readonly root = new Scene();
  readonly camera: PerspectiveCamera;
  private plan: MountPlan | null = null;
  private quality: QualityTier = 'high';

  constructor(
    private defs: SceneDef3D[],
    private source: SceneSource,
  ) {
    this.camera = new PerspectiveCamera(50, 1, 0.02, 3000);
  }

  setQuality(q: QualityTier): void {
    if (q === this.quality) return;
    this.quality = q;
    for (const def of this.defs) {
      void def; // instances notified lazily below on next mount/update
    }
    for (let i = 0; i < this.defs.length; i++) {
      this.source.get(i)?.setQuality(q);
    }
  }

  /** True when the base scene needed at `depth` is loaded and mounted. */
  isReady(depth: number): boolean {
    const plan = nextMountPlan(this.plan, depth, this.defs.length);
    if (!this.source.get(plan.base)) return false;
    if (plan.child !== null && !this.source.get(plan.child)) return false;
    return true;
  }

  /**
   * Returns the highest depth the camera may occupy right now given loading
   * state (used to stall the dive just before an unloaded child).
   */
  maxTravelDepth(depth: number): number {
    const n = this.defs.length;
    const base = Math.min(Math.floor(Math.min(Math.max(depth, 0), n - 1)), n - 1);
    if (base < n - 1 && !this.source.get(base + 1)) {
      this.source.request(base + 1);
      return base + 0.85;
    }
    return n - 1;
  }

  update(depth: number, vp: Viewport, dt: number, time: number, reducedMotion: boolean, utcMs = Date.now()): void {
    const n = this.defs.length;
    const plan = nextMountPlan(this.plan, depth, n);

    if (plan !== this.plan || !this.isPlanMounted(plan)) {
      this.applyPlan(plan);
      this.plan = plan;
    }
    this.syncChildAnchor(plan);

    const rig = cameraPoseWithAnchors(depth, this.defs, vp, (index) => this.anchorFor(index));
    this.camera.position.copy(rig.pose.position);
    this.camera.quaternion.copy(rig.pose.quaternion);
    if (this.camera.fov !== rig.pose.fov) {
      this.camera.fov = rig.pose.fov;
      this.camera.updateProjectionMatrix();
    }
    const aspect = vp.w / vp.h;
    if (this.camera.aspect !== aspect) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    const focus = this.anchorFor(rig.base)?.position;
    if (focus) {
      const distance = this.camera.position.distanceTo(new Vector3(...focus));
      const near = Math.max(1e-8, Math.min(0.02, distance * 0.001));
      if (Math.abs(this.camera.near - near) > near * 0.01) {
        this.camera.near = near;
        this.camera.updateProjectionMatrix();
      }
    } else if (this.camera.near !== 0.02) {
      this.camera.near = 0.02;
      this.camera.updateProjectionMatrix();
    }

    const ctxBase: FrameCtx = {
      dt,
      time,
      localT: rig.t,
      camera: this.camera,
      quality: this.quality,
      reducedMotion,
      utcMs,
      viewport: vp,
    };
    this.source.get(plan.base)?.update(ctxBase);
    if (plan.child !== null) {
      this.source.get(plan.child)?.update({ ...ctxBase, localT: rig.t - 1 });
    }
  }

  /** The mounted base instance (for hotspot picking etc.). */
  baseInstance(): SceneInstance | null {
    return this.plan ? this.source.get(this.plan.base) : null;
  }

  baseIndex(): number {
    return this.plan?.base ?? 0;
  }

  syncUi(viewport: Viewport): void {
    if (!this.plan) return;
    this.source.get(this.plan.base)?.syncUi?.(this.camera, viewport);
    if (this.plan.child !== null) this.source.get(this.plan.child)?.syncUi?.(this.camera, viewport);
  }

  private applyPlan(plan: MountPlan): void {
    if (this.plan) {
      this.source.get(this.plan.base)?.hideUi?.();
      if (this.plan.child !== null) this.source.get(this.plan.child)?.hideUi?.();
    }
    this.root.clear();

    const base = this.source.get(plan.base);
    if (base) {
      base.group.matrix.identity();
      base.group.matrix.decompose(base.group.position, base.group.quaternion, base.group.scale);
      this.root.add(base.group);
      base.setQuality(this.quality);
      if (base.childProxy) base.childProxy.visible = plan.child === null;
    }

    if (plan.child !== null) {
      const child = this.source.get(plan.child);
      const anchor = this.anchorFor(plan.base);
      if (child && anchor) {
        const m = anchorMatrix(anchor);
        m.decompose(child.group.position, child.group.quaternion, child.group.scale);
        this.root.add(child.group);
        child.setQuality(this.quality);
        // the child's own proxy stays visible (its grandchild isn't mounted)
        if (child.childProxy) child.childProxy.visible = true;
      }
    }
  }

  private syncChildAnchor(plan: MountPlan): void {
    if (plan.child === null) return;
    const child = this.source.get(plan.child);
    const anchor = this.anchorFor(plan.base);
    if (!child || !anchor) return;
    anchorMatrix(anchor).decompose(child.group.position, child.group.quaternion, child.group.scale);
  }

  private anchorFor(index: number) {
    return this.source.get(index)?.childAnchor ?? this.defs[index].anchor;
  }

  private isPlanMounted(plan: MountPlan): boolean {
    const base = this.source.get(plan.base);
    if (!base || base.group.parent !== this.root) return false;
    if (plan.child === null) return true;
    const child = this.source.get(plan.child);
    return Boolean(child && child.group.parent === this.root);
  }
}
