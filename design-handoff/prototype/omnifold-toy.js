// OmniFold-style toy unfolding of a portrait (no ML: a smoothed histogram ratio stands in for
// the classifiers; it is what an ideal classifier would converge to).
// Truth = 2025 headshot density; data = 60k points sampled from it and Gaussian-smeared (sigma = 0.015);
// simulation = 120k points from the 2024 headshot (or uniform), smeared the same way.
// Each iteration: step 1 reweights sim at detector level to match data; step 2 pulls the weights
// back to truth level (smoothed histogram over truth). Frames store per-cell summed weight (96x96)
// and effective sample size. Must be served over http (canvas getImageData), not file://.
class OmniFoldToy {
  constructor() { this.alive = true; }
  loadFaces(cb) {
    const self = this, G = 128, urls = ['assets/face2024.png', 'assets/face2025.png'], out = [];
    let left = 2;
    urls.forEach((u, k) => {
      const im = new Image();
      im.onload = function () {
        const c = document.createElement('canvas'); c.width = c.height = G;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, G, G);
        out[k] = self.densFrom(x.getImageData(0, 0, G, G).data, G);
        if (--left === 0) cb(out[0], out[1]);
      };
      im.src = u;
    });
  }
  densFrom(d, G) {
    const T = new Float64Array(G * G);
    for (let i = 0; i < G * G; i++) {
      const L = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
      T[i] = Math.max(Math.pow(Math.min(1, Math.max(0, (1 - L - 0.12) / 0.75)), 1.6), 0.0012);
    }
    return T;
  }
  setupEngine(T24, T25) {
    const G = 128, B = 128, LO = -0.15, SPAN = 1.3, M = 96, SIG = 0.015, ND = 60000, NS = 120000;
    let seed = 11;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const gauss = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * rnd()); };
    const sampler = (T) => {
      const cdf = new Float64Array(G * G); let a = 0; for (let i = 0; i < G * G; i++) { a += T[i]; cdf[i] = a; }
      return () => { const u = rnd() * a; let lo = 0, hi = G * G - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m + 1; else hi = m; } return [(lo % G + rnd()) / G, ((lo / G | 0) + rnd()) / G]; };
    };
    const bin = (px, py) => { const j = Math.min(B - 1, Math.max(0, ((px - LO) / SPAN * B) | 0)), i = Math.min(B - 1, Math.max(0, ((py - LO) / SPAN * B) | 0)); return i * B + j; };
    const cell = (px, py) => { const j = Math.min(M - 1, Math.max(0, (px * M) | 0)), i = Math.min(M - 1, Math.max(0, (py * M) | 0)); return i * M + j; };
    const kern = []; let ks = 0; for (let k = -3; k <= 3; k++) { const v = Math.exp(-k * k / 1.28); kern.push(v); ks += v; }
    for (let k = 0; k < 7; k++) kern[k] /= ks;
    const smooth = (H) => {
      const tmp = new Float64Array(B * B), out = new Float64Array(B * B);
      for (let i = 0; i < B; i++) for (let j = 0; j < B; j++) { let s = 0; for (let k = -3; k <= 3; k++) { const jj = j + k; if (jj >= 0 && jj < B) s += H[i * B + jj] * kern[k + 3]; } tmp[i * B + j] = s; }
      for (let i = 0; i < B; i++) for (let j = 0; j < B; j++) { let s = 0; for (let k = -3; k <= 3; k++) { const ii = i + k; if (ii >= 0 && ii < B) s += tmp[ii * B + j] * kern[k + 3]; } out[i * B + j] = s; }
      return out;
    };
    const hist = (bins, w) => { const H = new Float64Array(B * B); for (let i = 0; i < bins.length; i++) H[bins[i]] += w ? w[i] : 1; return smooth(H); };
    const s25 = sampler(T25);
    const tx = new Float32Array(ND), ty = new Float32Array(ND), rx = new Float32Array(ND), ry = new Float32Array(ND), db = new Int32Array(ND);
    for (let n = 0; n < ND; n++) { const p = s25(); tx[n] = p[0]; ty[n] = p[1]; rx[n] = p[0] + gauss() * SIG; ry[n] = p[1] + gauss() * SIG; db[n] = bin(rx[n], ry[n]); }
    const Dh = hist(db, null); for (let b = 0; b < B * B; b++) Dh[b] /= ND;
    const mkSim = (draw) => {
      const tb = new Int32Array(NS), rb = new Int32Array(NS), cb = new Int32Array(NS), nu = new Float64Array(NS).fill(ND / NS);
      for (let i = 0; i < NS; i++) { const p = draw(); tb[i] = bin(p[0], p[1]); rb[i] = bin(p[0] + gauss() * SIG, p[1] + gauss() * SIG); cb[i] = cell(p[0], p[1]); }
      return { tb, rb, cb, nu, frames: [] };
    };
    const sims = { y2024: mkSim(sampler(T24)), uniform: mkSim(() => [rnd(), rnd()]) };
    const frame = (sim) => {
      const H = new Float32Array(M * M); let s = 0, s2 = 0;
      for (let i = 0; i < NS; i++) { H[sim.cb[i]] += sim.nu[i]; s += sim.nu[i]; s2 += sim.nu[i] * sim.nu[i]; }
      const sorted = Array.from(H).sort((a, b) => a - b);
      sim.frames.push({ H, ref: sorted[Math.floor(0.98 * (M * M - 1))], ess: s * s / s2 / NS });
    };
    const step = (sim) => {
      const nu = sim.nu; let tot = 0; for (let i = 0; i < NS; i++) tot += nu[i];
      const Sh = hist(sim.rb, nu); for (let b = 0; b < B * B; b++) Sh[b] /= tot;
      const w = new Float64Array(NS);
      for (let i = 0; i < NS; i++) w[i] = nu[i] * Dh[sim.rb[i]] / Math.max(Sh[sim.rb[i]], 1e-15);
      const Hw = hist(sim.tb, w), Hn = hist(sim.tb, nu);
      let t2 = 0;
      for (let i = 0; i < NS; i++) { nu[i] *= Hw[sim.tb[i]] / Math.max(Hn[sim.tb[i]], 1e-15); t2 += nu[i]; }
      for (let i = 0; i < NS; i++) nu[i] *= ND / t2;
      frame(sim);
    };
    frame(sims.y2024); frame(sims.uniform);
    this.E = { M, ND, tx, ty, rx, ry, sims, step, MAXIT: 20 };
  }
  runEngine(onProgress) {
    const E = this.E, order = ['y2024', 'uniform'];
    const tick = () => {
      if (!this.alive) return;
      const key = order.find((k) => E.sims[k].frames.length <= E.MAXIT);
      if (!key) return;
      E.step(E.sims[key]); onProgress();
      setTimeout(tick, 0);
    };
    setTimeout(tick, 0);
  }
  prep(sel, w, h) {
    const el = document.querySelector(sel); if (!el) return null;
    const dpr = window.devicePixelRatio || 1;
    if (el.width !== Math.round(w * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
    const c = el.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); return c;
  }
  halftone(c, S, f) {
    const M = this.E.M, s = S / M; c.fillStyle = '#1B1B1A';
    for (let g = 0; g < M * M; g++) {
      const v = Math.min(1, f.H[g] / f.ref); if (v < 0.05) continue;
      c.beginPath(); c.arc((g % M + 0.5) * s, ((g / M | 0) + 0.5) * s, s * 0.62 * Math.sqrt(v), 0, 6.2832); c.fill();
    }
  }
  stipple(c, S, xs, ys, n, alpha) {
    c.fillStyle = 'rgba(27,27,26,' + alpha + ')';
    for (let i = 0; i < n; i++) c.fillRect(xs[i] * S - 0.5, ys[i] * S - 0.5, 1, 1);
  }
}
