import type { Camera } from './camera';
import type { FxState } from './renderer-fx';
import type { SceneDef3D } from './types3d';

/**
 * Per-frame effect levels: bloom/tilt follow the scenes' effect flags, lerped
 * across hops; streaks and flare come from the jump controller (time-based,
 * so they always decay — a pure function of depth would stay lit when the
 * camera settles on a boundary).
 */
export function fxAt(
  depth: number,
  defs: SceneDef3D[],
  jumpStreak: number,
  jumpFlare: number,
): FxState {
  const n = defs.length;
  const d = Math.min(Math.max(depth, 0), n - 1);
  const i = Math.min(Math.floor(d), n - 2);
  const t = d - i;

  const flag = (def: SceneDef3D, key: 'bloom' | 'tiltShift'): number =>
    def.effects?.[key] ? 1 : 0;
  const bloom = flag(defs[i], 'bloom') + (flag(defs[i + 1], 'bloom') - flag(defs[i], 'bloom')) * t;
  const tilt =
    flag(defs[i], 'tiltShift') + (flag(defs[i + 1], 'tiltShift') - flag(defs[i], 'tiltShift')) * t;

  return { bloom, streak: jumpStreak, flare: jumpFlare, tilt };
}

const RAMP = 0.35; // s of streak ramp before the teleport

/**
 * Multi-level navigation: ramp streaks, teleport to just above the target,
 * then a normal dive in. Avoids force-loading every scene en route.
 */
export class JumpController {
  private phase: 'idle' | 'ramp' | 'dive' = 'idle';
  private start = 0;
  private target = 0;

  constructor(
    private camera: Camera,
    private reduced: boolean,
  ) {}

  /** Streak overlay contribution for fxAt(). */
  streak(now: number): number {
    if (this.phase === 'ramp') return Math.min(1, (now - this.start) / RAMP);
    if (this.phase === 'dive') {
      const k = 1 - Math.min(1, (now - this.start) / 0.9);
      return k * k;
    }
    return 0;
  }

  /** Brief white flash that covers the teleport instant, decaying in time. */
  flare(now: number): number {
    if (this.phase !== 'dive') return 0;
    return Math.exp(-(now - this.start) / 0.1) * 0.85;
  }

  go(target: number, now: number): void {
    const dist = Math.abs(target - this.camera.depth);
    if (this.reduced) {
      this.camera.tweenTo(target, now, 0);
      return;
    }
    if (dist <= 1.5) {
      this.camera.tweenTo(target, now, 0.7 + 0.4 * dist);
      return;
    }
    this.phase = 'ramp';
    this.start = now;
    this.target = target;
  }

  update(now: number, ready?: (target: number) => boolean): void {
    if (this.phase === 'ramp' && now - this.start >= RAMP) {
      // hold at full streak until the destination scenes are loaded
      if (ready && !ready(this.target)) return;
      const from = this.camera.depth;
      const approach = this.target > from ? this.target - 0.7 : Math.min(this.target + 0.7, this.camera.max);
      this.camera.depth = Math.max(0, Math.min(approach, this.camera.max));
      this.camera.vel = 0;
      this.camera.tweenTo(this.target, now, 0.9);
      this.phase = 'dive';
      this.start = now;
    } else if (this.phase === 'dive' && now - this.start > 0.9) {
      this.phase = 'idle';
    }
  }
}
