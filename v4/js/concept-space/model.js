// Concept-space mathematics: channel decoding, weighted affinity, kernel PCA,
// spherical force layouts and layout diagnostics. Pure functions with no DOM or
// three.js dependency, so the browser, the tests and the evaluation script all
// run exactly the same code. Every function is deterministic.

export const CHANNELS = ['semantic', 'math', 'source'];
export const DEFAULT_WEIGHTS = Object.freeze({ semantic: 0.35, math: 0.45, source: 0.2 });
export const MODES = ['pca', 'force', 'hybrid'];
const DEPENDENCY_TYPES = new Set(['prerequisite', 'used_in_proof', 'application']);

/** Expand the upper-triangle channel arrays of the public export into dense matrices. */
export function decode(data) {
  const concepts = data.concepts;
  const n = concepts.length;
  const index = new Map(concepts.map((concept, i) => [concept.id, i]));
  const S = {};
  const scale = {};
  for (const name of CHANNELS) {
    const channel = data.channels[name];
    if (!channel || channel.values.length !== (n * (n - 1)) / 2) {
      throw new Error(`Channel ${name} does not match ${n} concepts`);
    }
    const matrix = new Float64Array(n * n);
    let k = 0;
    for (let i = 0; i < n; i++) {
      matrix[i * n + i] = 1;
      for (let j = i + 1; j < n; j++) {
        matrix[i * n + j] = matrix[j * n + i] = channel.values[k++];
      }
    }
    S[name] = matrix;
    scale[name] = channel.scale;
  }
  const relations = data.relations.filter(
    (relation) => index.has(relation.source) && index.has(relation.target),
  );
  return { n, concepts, index, relations, S, scale, types: data.relation_types };
}

/** Weights are clamped to [0, 1] and renormalized; all-zero falls back to equal weights. */
export function normalizeWeights(weights) {
  const clean = Object.fromEntries(
    CHANNELS.map((name) => [name, Math.min(1, Math.max(0, Number(weights?.[name]) || 0))]),
  );
  const total = CHANNELS.reduce((sum, name) => sum + clean[name], 0);
  if (total === 0) return Object.fromEntries(CHANNELS.map((name) => [name, 1 / 3]));
  return Object.fromEntries(CHANNELS.map((name) => [name, clean[name] / total]));
}

/**
 * Combined affinity W_ij = sum_c w_c S^c_ij / m_c, where m_c is the channel's
 * strong-neighbour scale (mean of each concept's five largest similarities).
 * With equal weights a typical strongest link counts the same in every channel.
 * The diagonal holds the kernel self-similarity sum_c w_c / m_c.
 */
export function combine(model, weights) {
  const w = normalizeWeights(weights);
  const { n } = model;
  const out = new Float64Array(n * n);
  for (const name of CHANNELS) {
    const factor = w[name] / model.scale[name];
    if (!factor) continue;
    const matrix = model.S[name];
    for (let k = 0; k < n * n; k++) out[k] += factor * matrix[k];
  }
  return out;
}

/** Cyclic Jacobi eigen-decomposition of a dense symmetric matrix. */
export function symmetricEigen(input, n, { sweeps = 60, tolerance = 1e-12 } = {}) {
  const a = Float64Array.from(input);
  const v = new Float64Array(n * n);
  for (let i = 0; i < n; i++) v[i * n + i] = 1;
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p * n + q] ** 2;
    if (off < tolerance) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p * n + q];
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (a[q * n + q] - a[p * n + p]) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k * n + p];
          const akq = a[k * n + q];
          a[k * n + p] = c * akp - s * akq;
          a[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p * n + k];
          const aqk = a[q * n + k];
          a[p * n + k] = c * apk - s * aqk;
          a[q * n + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k * n + p];
          const vkq = v[k * n + q];
          v[k * n + p] = c * vkp - s * vkq;
          v[k * n + q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = [...Array(n).keys()].sort((x, y) => a[y * n + y] - a[x * n + x]);
  return {
    values: order.map((i) => a[i * n + i]),
    vectors: order.map((i) => Float64Array.from({ length: n }, (_, k) => v[k * n + i])),
  };
}

/**
 * Kernel PCA of the combined kernel: double-centre K, take the top three
 * eigenvectors, scale by sqrt(eigenvalue). Each axis is sign-fixed so its
 * largest-magnitude entry is positive, which makes the output deterministic.
 */
export function kernelPCA(kernel, n, dims = 3) {
  const rowMean = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) rowMean[i] += kernel[i * n + j];
    total += rowMean[i];
    rowMean[i] /= n;
  }
  total /= n * n;
  const centred = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      centred[i * n + j] = kernel[i * n + j] - rowMean[i] - rowMean[j] + total;
    }
  }
  const { values, vectors } = symmetricEigen(centred, n);
  const positive = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const axes = [];
  for (let d = 0; d < dims; d++) {
    const vector = vectors[d];
    let pivot = 0;
    for (let i = 1; i < n; i++) if (Math.abs(vector[i]) > Math.abs(vector[pivot])) pivot = i;
    const sign = vector[pivot] < 0 ? -1 : 1;
    const root = Math.sqrt(Math.max(0, values[d]));
    axes.push(Float64Array.from(vector, (value) => sign * value * root));
  }
  const points = Array.from({ length: n }, (_, i) => axes.map((axis) => axis[i]));
  return {
    points,
    explained: values.slice(0, dims).map((value) => Math.max(0, value) / positive),
    spectrum: values.slice(0, 12).map((value) => Math.max(0, value) / positive),
  };
}

const norm = (p) => Math.hypot(p[0], p[1], p[2]);

/** Rescale a point cloud into the ball (volume) or onto the sphere (surface) of radius R. */
export function fitToSphere(points, { radius = 1, geometry = 'volume' } = {}) {
  const centre = [0, 1, 2].map((d) => points.reduce((sum, p) => sum + p[d], 0) / points.length);
  const shifted = points.map((p) => p.map((value, d) => value - centre[d]));
  if (geometry === 'surface') {
    return shifted.map((p, i) => {
      const r = norm(p);
      if (r > 1e-9) return p.map((value) => (value * radius) / r);
      // A point at the centre has no direction: give it a deterministic one.
      const angle = i * 2.399963;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
    });
  }
  const radii = shifted.map(norm).sort((x, y) => x - y);
  const reference = radii[Math.floor(0.95 * (radii.length - 1))] || 1;
  const factor = (0.9 * radius) / reference;
  return shifted.map((p) => {
    const q = p.map((value) => value * factor);
    const r = norm(q);
    return r > radius ? q.map((value) => (value * radius) / r) : q;
  });
}

/** Seeded PRNG (mulberry32) and a stable string hash for deterministic initialization. */
export function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededBall(model, radius = 1) {
  return model.concepts.map(({ id }) => {
    const next = random(hash(id));
    const u = next() * 2 - 1;
    const phi = next() * Math.PI * 2;
    const r = radius * Math.cbrt(next()) * 0.9;
    const s = Math.sqrt(1 - u * u);
    return [r * s * Math.cos(phi), r * s * Math.sin(phi), r * u];
  });
}

/** Longest dependency chain ending at each concept, from the exported depth or the relations. */
export function depths(model) {
  if (model.concepts.every((concept) => Number.isInteger(concept.depth))) {
    return model.concepts.map((concept) => concept.depth);
  }
  const incoming = model.concepts.map(() => []);
  for (const relation of model.relations) {
    if (DEPENDENCY_TYPES.has(relation.type)) {
      incoming[model.index.get(relation.target)].push(model.index.get(relation.source));
    }
  }
  const memo = new Map();
  const visit = (i) => {
    if (!memo.has(i)) {
      memo.set(i, 0);
      memo.set(i, 1 + Math.max(-1, ...incoming[i].map(visit)));
    }
    return memo.get(i);
  };
  return model.concepts.map((_, i) => visit(i));
}

/** Sparse attraction graph: each concept's k strongest combined affinities plus its direct relations. */
export function attractionEdges(model, W, k = 6) {
  const { n } = model;
  const pairs = new Map();
  const add = (i, j, weight) => {
    if (i === j || weight <= 0) return;
    const key = i < j ? i * n + j : j * n + i;
    pairs.set(key, Math.max(pairs.get(key) ?? 0, weight));
  };
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) if (j !== i) row.push([j, W[i * n + j]]);
    row.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    for (const [j, weight] of row.slice(0, k)) add(i, j, weight);
  }
  for (const relation of model.relations) {
    const i = model.index.get(relation.source);
    const j = model.index.get(relation.target);
    add(i, j, W[i * n + j]);
  }
  let max = 0;
  for (const weight of pairs.values()) max = Math.max(max, weight);
  return [...pairs].map(([key, weight]) => [Math.floor(key / n), key % n, weight / (max || 1)]);
}

/**
 * Force-directed layout inside (volume) or on (surface) a sphere of radius R.
 * Forces: linear springs along the attraction graph, inverse-square repulsion
 * between all pairs, an optional radial anchor pulling dependency depth d to
 * radius R*(0.2 + 0.8 d / max d), and projection onto the constraint set after
 * every step. Fixed iteration count and cooling schedule: fully deterministic.
 */
export function forceLayout(
  model,
  W,
  initial,
  {
    radius = 1,
    geometry = 'volume',
    shells = false,
    iterations = 360,
    attraction = 0.9,
    repulsion = 0.0045,
    anchor = 0.9,
    k = 6,
  } = {},
) {
  const { n } = model;
  const edges = attractionEdges(model, W, k);
  const levels = depths(model);
  const maxLevel = Math.max(1, ...levels);
  const target = levels.map((level) => radius * (0.2 + (0.8 * level) / maxLevel));
  const x = initial.map((p) => [...p]);
  const force = x.map(() => [0, 0, 0]);
  let step = 0.08 * radius;
  for (let t = 0; t < iterations; t++) {
    for (const f of force) f.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = x[i][0] - x[j][0];
        const dy = x[i][1] - x[j][1];
        const dz = x[i][2] - x[j][2];
        const d2 = dx * dx + dy * dy + dz * dz + 1e-4 * radius * radius;
        const scale = (repulsion * radius * radius * radius) / (d2 * Math.sqrt(d2));
        force[i][0] += dx * scale;
        force[i][1] += dy * scale;
        force[i][2] += dz * scale;
        force[j][0] -= dx * scale;
        force[j][1] -= dy * scale;
        force[j][2] -= dz * scale;
      }
    }
    for (const [i, j, weight] of edges) {
      for (let d = 0; d < 3; d++) {
        const pull = attraction * weight * (x[j][d] - x[i][d]);
        force[i][d] += pull;
        force[j][d] -= pull;
      }
    }
    if (shells && geometry === 'volume') {
      for (let i = 0; i < n; i++) {
        const r = norm(x[i]) || 1e-6;
        const pull = (anchor * (target[i] - r)) / r;
        for (let d = 0; d < 3; d++) force[i][d] += pull * x[i][d];
      }
    }
    for (let i = 0; i < n; i++) {
      const magnitude = norm(force[i]);
      const move = magnitude > 1 ? step / magnitude : step;
      for (let d = 0; d < 3; d++) x[i][d] += force[i][d] * move;
      const r = norm(x[i]);
      if (geometry === 'surface' || r > radius) {
        const s = radius / (r || 1);
        for (let d = 0; d < 3; d++) x[i][d] *= s;
      }
    }
    step *= 0.992;
  }
  return x;
}

function multiply3(a, b) {
  return [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]),
  );
}
function transpose3(a) {
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[j][i]));
}
function det3(a) {
  return (
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
  );
}

/** Rotate `points` (proper rotation, no scaling) to best match `reference`: orthogonal Procrustes. */
export function alignTo(points, reference) {
  if (!reference || reference.length !== points.length) return points;
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let k = 0; k < points.length; k++) {
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) M[i][j] += reference[k][i] * points[k][j];
  }
  const MtM = multiply3(transpose3(M), M);
  const { values, vectors } = symmetricEigen(MtM.flat(), 3);
  const V = [0, 1, 2].map((i) => [0, 1, 2].map((j) => vectors[j][i]));
  const sigma = values.map((value) => Math.sqrt(Math.max(value, 0)));
  if (sigma[1] < 1e-12) return points;
  const MV = multiply3(M, V);
  const U = [0, 1, 2].map((i) => [0, 1].map((j) => MV[i][j] / sigma[j]));
  // Complete U to an orthonormal frame with the cross product, then fix the handedness.
  const u0 = U.map((row) => row[0]);
  const u1 = U.map((row) => row[1]);
  const u2 = [
    u0[1] * u1[2] - u0[2] * u1[1],
    u0[2] * u1[0] - u0[0] * u1[2],
    u0[0] * u1[1] - u0[1] * u1[0],
  ];
  const Ufull = [0, 1, 2].map((i) => [u0[i], u1[i], u2[i]]);
  let R = multiply3(Ufull, transpose3(V));
  if (det3(R) < 0) {
    const flip = [0, 1, 2].map((i) => [Ufull[i][0], Ufull[i][1], -Ufull[i][2]]);
    R = multiply3(flip, transpose3(V));
  }
  return points.map((p) => [0, 1, 2].map((i) => R[i][0] * p[0] + R[i][1] * p[1] + R[i][2] * p[2]));
}

/** Compute a layout. Returns positions in the ball/sphere of radius 1 plus PCA diagnostics. */
export function computeLayout(model, options = {}) {
  const {
    mode = 'hybrid',
    weights = DEFAULT_WEIGHTS,
    geometry = 'volume',
    shells = false,
    previous,
  } = options;
  if (!MODES.includes(mode)) throw new Error(`Unknown layout mode ${mode}`);
  const W = combine(model, weights);
  const pca = kernelPCA(W, model.n);
  let points;
  if (mode === 'pca') {
    points = fitToSphere(pca.points, { geometry });
  } else {
    const start = mode === 'hybrid' ? fitToSphere(pca.points, { geometry }) : seededBall(model);
    points = forceLayout(model, W, start, { geometry, shells });
  }
  return { points: alignTo(points, previous), W, explained: pca.explained, spectrum: pca.spectrum };
}

// --------------------------------------------------------------------------
// Diagnostics used by the interface and docs/CONCEPT_SPACE.md

export function distances(points) {
  const n = points.length;
  const out = new Float64Array((n * (n - 1)) / 2);
  let k = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      out[k++] = Math.hypot(
        points[i][0] - points[j][0],
        points[i][1] - points[j][1],
        points[i][2] - points[j][2],
      );
    }
  }
  return out;
}

function rank(values) {
  const order = [...values.keys()].sort((a, b) => values[a] - values[b]);
  const out = new Float64Array(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && values[order[j + 1]] === values[order[i]]) j++;
    for (let k = i; k <= j; k++) out[order[k]] = (i + j) / 2;
    i = j + 1;
  }
  return out;
}

export function spearman(a, b) {
  const ra = rank(a);
  const rb = rank(b);
  const n = ra.length;
  const mean = (n - 1) / 2;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let k = 0; k < n; k++) {
    cov += (ra[k] - mean) * (rb[k] - mean);
    va += (ra[k] - mean) ** 2;
    vb += (rb[k] - mean) ** 2;
  }
  return cov / Math.sqrt(va * vb);
}

function upperOf(matrix, n) {
  const out = new Float64Array((n * (n - 1)) / 2);
  let k = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out[k++] = matrix[i * n + j];
  return out;
}

function neighbours(score, n, i, k, larger = true) {
  const row = [];
  for (let j = 0; j < n; j++) if (j !== i) row.push([j, score(i, j)]);
  row.sort((a, b) => (larger ? b[1] - a[1] : a[1] - b[1]) || a[0] - b[0]);
  return new Set(row.slice(0, k).map(([j]) => j));
}

/** Mean Jaccard overlap between each concept's k nearest neighbours in the layout and in a similarity matrix. */
export function neighbourhoodOverlap(points, matrix, n, k = 8) {
  const dist = (i, j) =>
    Math.hypot(
      points[i][0] - points[j][0],
      points[i][1] - points[j][1],
      points[i][2] - points[j][2],
    );
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = neighbours(dist, n, i, k, false);
    const b = neighbours((x, y) => matrix[x * n + y], n, i, k, true);
    let shared = 0;
    for (const j of a) if (b.has(j)) shared++;
    total += shared / (a.size + b.size - shared);
  }
  return total / n;
}

/** Summary diagnostics of one layout against every channel and the review pairs. */
export function diagnose(model, layout, reviewPairs = []) {
  const { n } = model;
  const d = distances(layout.points);
  const negated = (matrix) => upperOf(matrix, n).map((value) => -value);
  const channel = {};
  for (const name of [...CHANNELS, 'combined']) {
    const matrix = name === 'combined' ? layout.W : model.S[name];
    channel[name] = {
      spearman: spearman(d, negated(matrix)),
      overlap: neighbourhoodOverlap(layout.points, matrix, n),
    };
  }
  const sorted = Float64Array.from(d).sort();
  const percentile = (value) => {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < value) lo = mid + 1;
      else hi = mid;
    }
    return lo / sorted.length;
  };
  const pairIndex = (i, j) => {
    const [a, b] = i < j ? [i, j] : [j, i];
    return a * n - (a * (a + 1)) / 2 + (b - a - 1);
  };
  const reviews = reviewPairs.map((pair) => {
    const i = model.index.get(pair.a);
    const j = model.index.get(pair.b);
    const p = percentile(d[pairIndex(i, j)]);
    const ok = pair.expect === 'near' ? p <= 0.2 : p >= 0.35;
    return { ...pair, percentile: p, ok };
  });
  let related = 0;
  for (const relation of model.relations) {
    related += d[pairIndex(model.index.get(relation.source), model.index.get(relation.target))];
  }
  const meanDistance = d.reduce((sum, value) => sum + value, 0) / d.length;
  return {
    channel,
    reviews,
    relationStretch: related / model.relations.length / meanDistance,
    explained: layout.explained,
  };
}
