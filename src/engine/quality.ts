import type { QualityTier, SceneId } from './types3d';

const TIERS: QualityTier[] = ['high', 'med', 'low'];
const SCENE_BUDGET_MS: Record<SceneId, number> = {
  galaxy: 18,
  solar: 18,
  earth: 20,
  stanford: 20,
  room: 18,
  screen: 17,
};
const EXTREME_FRAME_MS = 250;
const LONG_FRAME_WINDOW_S = 2;
const CUMULATIVE_EXCESS_MS = 180;
const DEMOTION_COOLDOWN_S = 6;
const PROBE_AFTER_S = 12;

/**
 * Rolling frame-time monitor. Demotes after a sustained overrun, probes a
 * promotion after a clean stretch. Consumers map tiers to pixelRatio /
 * composer bypass / scene LODs.
 */
export class QualityMonitor {
  tier: QualityTier = 'high';
  private maxTier: QualityTier = 'high';
  private worstTier: QualityTier = 'low';
  private ema = 16;
  private cleanSince = 0;
  private changed = false;
  private budgetMs = SCENE_BUDGET_MS.galaxy;
  private constrained = false;
  private transitionLow = false;
  private longFrames: Array<{ time: number; excessMs: number }> = [];
  private lastDemotion = -Infinity;

  get renderTier(): QualityTier {
    return this.transitionLow ? 'low' : this.tier;
  }

  configureDevice(
    pixelCount: number,
    deviceMemoryGb = 8,
    profile: { isMobile?: boolean; isWebKit?: boolean; lowPowerGpu?: boolean } = {},
  ): void {
    this.constrained = Boolean(profile.isMobile || profile.lowPowerGpu);
    this.maxTier = profile.lowPowerGpu
      ? 'low'
      : profile.isMobile || profile.isWebKit
        ? 'med'
        : 'high';
    this.worstTier = this.constrained ? 'low' : 'med';

    if (profile.lowPowerGpu) this.tier = 'low';
    else if (profile.isMobile || profile.isWebKit || deviceMemoryGb <= 4 || pixelCount > 6_000_000)
      this.tier = 'med';
    else this.tier = 'high';

    this.tier = this.clampToAllowedTier(this.tier);
  }

  setScene(scene: SceneId): void {
    this.budgetMs = SCENE_BUDGET_MS[scene];
    this.longFrames = [];
  }

  update(dt: number, now: number): boolean {
    this.changed = false;
    const ms = dt * 1000;
    this.ema = this.ema * 0.92 + ms * 0.08;
    const excessMs = Math.max(0, ms - this.budgetMs);
    if (excessMs > 0) {
      this.longFrames.push({ time: now, excessMs });
      this.cleanSince = now;
    }
    this.longFrames = this.longFrames.filter((sample) => now - sample.time <= LONG_FRAME_WINDOW_S);
    const cumulativeExcess = this.longFrames.reduce((sum, sample) => sum + sample.excessMs, 0);

    if (
      (ms > EXTREME_FRAME_MS || cumulativeExcess > CUMULATIVE_EXCESS_MS) &&
      now - this.lastDemotion > DEMOTION_COOLDOWN_S
    ) {
      this.shift(1, now);
      this.lastDemotion = now;
      this.longFrames = [];
    } else if (
      this.longFrames.length === 0 &&
      this.ema < this.budgetMs * 0.8 &&
      now - this.cleanSince > PROBE_AFTER_S
    ) {
      this.shift(-1, now);
    }
    return this.changed;
  }

  beginTransition(): boolean {
    const previous = this.renderTier;
    this.transitionLow = this.constrained;
    return previous !== this.renderTier;
  }

  endTransition(now: number): boolean {
    const previous = this.renderTier;
    this.transitionLow = false;
    this.cleanSince = now;
    this.longFrames = [];
    return previous !== this.renderTier;
  }

  private shift(dir: 1 | -1, now: number): void {
    const idx = TIERS.indexOf(this.tier) + dir;
    if (idx < 0 || idx >= TIERS.length) {
      this.cleanSince = now;
      return;
    }
    const next = this.clampToAllowedTier(TIERS[idx]);
    if (next === this.tier) {
      this.cleanSince = now;
      return;
    }
    this.tier = next;
    this.cleanSince = now;
    this.ema = 16;
    this.changed = true;
  }

  private clampToAllowedTier(tier: QualityTier): QualityTier {
    const cappedBest = Math.max(TIERS.indexOf(tier), TIERS.indexOf(this.maxTier));
    return TIERS[Math.min(cappedBest, TIERS.indexOf(this.worstTier))];
  }
}
