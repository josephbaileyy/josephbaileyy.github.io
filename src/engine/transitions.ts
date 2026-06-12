import type { Camera } from './camera';
import type { FxState } from './renderer-fx';
import type { SceneDef3D } from './types3d';

function gaussian(x: number, sigma: number): number {
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

/**
 * Per-frame effect levels derived purely from depth (plus the jump overlay):
 * - bloom/tilt follow the scenes' effect flags, lerped across hops
 * - 'flare' hops get a white-out gaussian centered exactly on the boundary,
 *   wide streaks leading in/out — symmetric in both travel directions
 */
export function fxAt(depth: number, defs: SceneDef3D[], jumpStreak: number): FxState {
  const n = defs.length;
  const d = Math.min(Math.max(depth, 0), n - 1);
  const i = Math.min(Math.floor(d), n - 2);
  const t = d - i;

  const flag = (def: SceneDef3D, key: 'bloom' | 'tiltShift'): number =>
    def.effects?.[key] ? 1 : 0;
  const bloom = flag(defs[i], 'bloom') + (flag(defs[i + 1], 'bloom') - flag(defs[i], 'bloom')) * t;
  const tilt =
    flag(defs[i], 'tiltShift') + (flag(defs[i + 1], 'tiltShift') - flag(defs[i], 'tiltShift')) * t;

  let flare = 0;
  let streak = jumpStreak;
  for (let j = 1; j < n; j++) {
    if (defs[j].hopIn?.kind === 'flare') {
      const x = d - j; // 0 exactly at the boundary
      flare = Math.max(flare, gaussian(x, 0.055));
      streak = Math.max(streak, gaussian(x, 0.22) * 0.8);
    }
  }

  return { bloom, streak, flare, tilt };
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

  update(now: number): void {
    if (this.phase === 'ramp' && now - this.start >= RAMP) {
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
