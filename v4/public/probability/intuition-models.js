// Exact teaching models. Display geometry is never used to compute probabilities.
export function cdfExperiment(x, middle = .5) {
  const values = [-1, 1, 3];
  const masses = [.4 * (1 - middle), middle, .6 * (1 - middle)];
  const below = masses.reduce((s, p, i) => s + (values[i] < x ? p : 0), 0);
  const at = masses.reduce((s, p, i) => s + (values[i] === x ? p : 0), 0);
  return {values, masses, below, at, cdf: below + at};
}
export function typewriter(n, w) {
  const k = Math.ceil((Math.sqrt(8 * n + 1) - 1) / 2), i = n - k * (k - 1) / 2;
  return {k, i, left: (i - 1) / k, right: i / k,
    value: w >= (i - 1) / k && w <= i / k ? 1 : 0, probability: 1 / k};
}
export function nextVisit(n, w) {
  // Closed cells can give two visits at a shared endpoint; inspect both.
  let k = typewriter(n, w).k;
  for (;;) {
    const cell = Math.max(1, Math.ceil(k * w));
    for (const i of [cell, cell + 1]) {
      const t = k * (k - 1) / 2 + i;
      if (i <= k && t > n && typewriter(t, w).value) return t;
    }
    k++;
  }
}
export function spikeExperiment(n, q, w) {
  const width = 1 / n, height = n ** (1 / q);
  return {width, height, value: w <= width ? height : 0, moment: 1,
    goneFrom: Math.floor(1 / w) + 1};
}
export function tailExperiment(N, M, family) {
  const witness = Math.floor(family ? M * M : M) + 1;
  const height = family ? Math.sqrt(witness) : witness;
  const supremum = family ? 1 / Math.sqrt(witness) : 1;
  const tails = Array.from({length: N}, (_, i) => {
    const n = i + 1, h = family ? Math.sqrt(n) : n;
    return h > M ? h / n : 0;
  });
  return {witness, height, supremum, tails, finite: Math.max(...tails)};
}
