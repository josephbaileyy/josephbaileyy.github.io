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
const DEMOTE_FRAMES = 60;
const PROBE_AFTER_S = 12;

/**
 * Rolling frame-time monitor. Demotes after a sustained overrun, probes a
 * promotion after a clean stretch. Consumers map tiers to pixelRatio /
 * composer bypass / scene LODs.
 */
export class QualityMonitor {
  tier: QualityTier = 'high';
  private ema = 16;
  private over = 0;
  private cleanSince = 0;
  private changed = false;
  private budgetMs = SCENE_BUDGET_MS.galaxy;

  configureDevice(pixelCount: number, deviceMemoryGb = 8): void {
    if (deviceMemoryGb <= 4 || pixelCount > 6_000_000) this.tier = 'med';
  }

  setScene(scene: SceneId): void {
    this.budgetMs = SCENE_BUDGET_MS[scene];
    this.over = 0;
  }

  update(dt: number, now: number): boolean {
    this.changed = false;
    const ms = dt * 1000;
    this.ema = this.ema * 0.92 + ms * 0.08;

    if (this.ema > this.budgetMs * 1.4) {
      this.over++;
      if (this.over > DEMOTE_FRAMES) {
        this.shift(1, now);
      }
    } else {
      this.over = Math.max(0, this.over - 2);
      if (this.ema < this.budgetMs * 0.8 && now - this.cleanSince > PROBE_AFTER_S) {
        this.shift(-1, now);
      }
    }
    return this.changed;
  }

  private shift(dir: 1 | -1, now: number): void {
    const idx = TIERS.indexOf(this.tier) + dir;
    if (idx < 0 || idx >= TIERS.length) {
      this.cleanSince = now;
      return;
    }
    this.tier = TIERS[idx];
    this.over = 0;
    this.cleanSince = now;
    this.ema = 16;
    this.changed = true;
  }
}
