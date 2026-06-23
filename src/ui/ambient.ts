/** Lightweight, user-gesture-gated ambient bed. No assets, no network. */
export class AmbientSound {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private on = false;

  get active(): boolean { return this.on; }

  async toggle(): Promise<boolean> {
    if (this.on) {
      this.stop();
      return false;
    }
    await this.start();
    return true;
  }

  private async start(): Promise<void> {
    const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    this.ctx ??= new AudioCtor();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.gain.gain.exponentialRampToValueAtTime(0.035, this.ctx.currentTime + 1.2);
    this.gain.connect(this.ctx.destination);

    const notes = [55, 82.41, 110];
    this.oscillators = notes.map((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      lfo.frequency.value = 0.025 + i * 0.01;
      lfoGain.gain.value = freq * 0.015;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(this.gain!);
      osc.start();
      lfo.start();
      return osc;
    });
    this.on = true;
  }

  stop(): void {
    if (!this.ctx || !this.gain) return;
    const end = this.ctx.currentTime + 0.5;
    this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gain.gain.setValueAtTime(Math.max(this.gain.gain.value, 0.0001), this.ctx.currentTime);
    this.gain.gain.exponentialRampToValueAtTime(0.0001, end);
    for (const osc of this.oscillators) osc.stop(end);
    this.oscillators = [];
    this.gain.disconnect();
    this.gain = null;
    this.on = false;
  }
}
