/**
 * Gravitational-wave chirp, synthesized: f(t) = f0·(1 − t/tc)^(−3/8) — the
 * actual leading-order inspiral law — swept over ~3.5 s, then a soft ring-down.
 * Zero assets; physically the right curve.
 */
export function playChirp(): void {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);

  const f0 = 70;
  const tc = 3.8; // coalescence time
  const tEnd = 3.55; // stop just shy of the singularity
  const now = ctx.currentTime;

  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tEnd;
    const f = Math.min(1500, f0 * Math.pow(1 - t / tc, -3 / 8));
    osc.frequency.setValueAtTime(f, now + t);
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
  gain.gain.setValueAtTime(0.16, now + tEnd - 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + tEnd + 0.5);

  osc.start(now);
  osc.stop(now + tEnd + 0.6);
  osc.onended = () => void ctx.close();
}
