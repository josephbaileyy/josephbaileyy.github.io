interface Star {
  x: number; // 0..1 of viewport
  y: number;
  z: number; // parallax depth 0.2..1
  r: number;
  phase: number;
  speed: number;
}

/**
 * Parallax starfield behind the transparent space scenes (galaxy/solar/earth).
 * From depth 3 on (Stanford and deeper) the scenes are opaque, so we stop drawing.
 */
export class Starfield {
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private w = 0;
  private h = 0;

  constructor(private canvas: HTMLCanvasElement, count = 260) {
    this.ctx = canvas.getContext('2d')!;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        z: 0.2 + Math.random() * 0.8,
        r: 0.4 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.2,
      });
    }
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(depth: number, time: number): void {
    if (depth >= 3) {
      if (this.canvas.style.opacity !== '0') this.canvas.style.opacity = '0';
      return;
    }
    if (this.canvas.style.opacity !== '1') this.canvas.style.opacity = '1';

    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    for (const s of this.stars) {
      // Stars drift outward slightly as we dive deeper — cheap parallax.
      const spread = 1 + depth * 0.16 * s.z;
      const x = cx + (s.x - 0.5) * w * spread;
      const y = cy + (s.y - 0.5) * h * spread;
      if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
      const tw = 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = tw * (0.35 + 0.5 * s.z);
      ctx.fillStyle = s.z > 0.75 ? '#eef2ff' : '#9aa3c7';
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
