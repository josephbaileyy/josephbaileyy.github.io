import { clamp, easeInOutCubic } from './tween';

const VEL_DECAY = 4.5; // 1/s exponential decay
const SNAP_DELAY = 0.22; // s of input silence before magnetic snap kicks in
const SNAP_RATE = 5; // 1/s pull toward nearest integer depth
const MAX_VEL = 3.5; // depth units per second

interface Tween {
  from: number;
  to: number;
  start: number;
  dur: number;
}

export class Camera {
  depth = 0;
  vel = 0;
  readonly max: number;

  private tween: Tween | null = null;
  private lastInput = -Infinity;
  private reduced: boolean;

  constructor(sceneCount: number, reducedMotion = false) {
    this.max = sceneCount - 1;
    this.reduced = reducedMotion;
  }

  /** Impulse input (wheel): adds velocity, decays naturally into a snap. */
  nudge(dv: number, now: number): void {
    this.tween = null;
    this.vel = clamp(this.vel + dv, -MAX_VEL, MAX_VEL);
    this.lastInput = now;
  }

  /** Tracking input (pinch): moves depth directly, keeps a little release inertia. */
  dragBy(dd: number, now: number): void {
    this.tween = null;
    this.depth = clamp(this.depth + dd, 0, this.max);
    this.vel = clamp(this.vel * 0.7 + dd * 18, -MAX_VEL, MAX_VEL);
    this.lastInput = now;
  }

  tweenTo(target: number, now: number, dur = 1.2): void {
    const to = clamp(target, 0, this.max);
    if (this.reduced || dur <= 0) {
      this.depth = to;
      this.vel = 0;
      this.tween = null;
      return;
    }
    this.vel = 0;
    this.tween = { from: this.depth, to, start: now, dur };
  }

  get isTweening(): boolean {
    return this.tween !== null;
  }

  /** Advance the camera; returns true while anything is still moving. */
  update(dt: number, now: number): boolean {
    if (this.tween) {
      const tw = this.tween;
      const p = clamp((now - tw.start) / tw.dur, 0, 1);
      this.depth = tw.from + (tw.to - tw.from) * easeInOutCubic(p);
      if (p >= 1) this.tween = null;
      return true;
    }

    let moving = false;

    if (Math.abs(this.vel) > 1e-4) {
      this.depth += this.vel * dt;
      this.vel *= Math.exp(-VEL_DECAY * dt);
      moving = true;
    } else {
      this.vel = 0;
    }

    if (this.depth <= 0) {
      this.depth = 0;
      this.vel = Math.max(0, this.vel);
    } else if (this.depth >= this.max) {
      this.depth = this.max;
      this.vel = Math.min(0, this.vel);
    }

    // Magnetic snap: once input is quiet and inertia has faded, settle on a scene.
    const nearest = Math.round(this.depth);
    const off = nearest - this.depth;
    if (now - this.lastInput > SNAP_DELAY && Math.abs(this.vel) < 0.05 && Math.abs(off) > 1e-5) {
      this.depth += off * Math.min(1, dt * SNAP_RATE);
      if (Math.abs(nearest - this.depth) < 5e-4) {
        this.depth = nearest;
        this.vel = 0;
      }
      moving = true;
    }

    return moving;
  }

  get settledIndex(): number | null {
    return !this.tween && this.vel === 0 && Number.isInteger(this.depth) ? this.depth : null;
  }
}
