export const EPHEMERIS_MIN_MS = Date.UTC(1950, 0, 1);
export const EPHEMERIS_MAX_MS = Date.UTC(2050, 11, 31, 23, 59, 59);

export class SimulationClock extends EventTarget {
  private valueMs = Date.now();
  private live = true;
  private rate = 1;

  get utcMs(): number { return this.live ? Date.now() : this.valueMs; }
  get isLive(): boolean { return this.live; }
  get speed(): number { return this.rate; }

  tick(dtSeconds: number): number {
    if (!this.live && this.rate !== 0) {
      this.valueMs = clampTime(this.valueMs + dtSeconds * 1000 * this.rate);
      this.emit();
    }
    return this.utcMs;
  }

  setLive(): void {
    this.live = true;
    this.rate = 1;
    this.emit();
  }

  pause(): void {
    this.valueMs = this.utcMs;
    this.live = false;
    this.rate = 0;
    this.emit();
  }

  setRate(rate: number): void {
    this.valueMs = this.utcMs;
    this.live = false;
    this.rate = rate;
    this.emit();
  }

  setUtcMs(value: number): void {
    this.valueMs = clampTime(value);
    this.live = false;
    this.rate = 0;
    this.emit();
  }

  private emit(): void { this.dispatchEvent(new Event('change')); }
}

function clampTime(value: number): number {
  return Math.min(EPHEMERIS_MAX_MS, Math.max(EPHEMERIS_MIN_MS, value));
}

export const simulationClock = new SimulationClock();
