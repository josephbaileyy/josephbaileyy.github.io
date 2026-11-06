import { plainLabel } from './labels.js';

export const defaultWeights = Object.freeze({ meaning: 75, math: 40, source: 65 });
const stop = new Set(
  'about after also and are but can case does example examples for from has how into its let more note notes one only over some than that the their then there these this through two use using was what when where which while why will with without'.split(
    ' ',
  ),
);
const axes = ['x', 'y', 'z'];

function termRows(nodes, edges) {
  const dictionary = new Map();
  const documents = nodes.map(({ label }) => {
    const words =
      plainLabel(label.replace(/^Lecture \d+:\s*/, ''))
        .toLowerCase()
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .match(/[\p{L}][\p{L}\p{N}]{1,}/gu) ?? [];
    const terms = new Set(
      words
        .filter((word) => !stop.has(word))
        .map((word) => (word.length > 4 && /[^s]s$/.test(word) ? word.slice(0, -1) : word)),
    );
    for (const term of terms) {
      if (!dictionary.has(term)) dictionary.set(term, { index: dictionary.size, count: 0 });
      dictionary.get(term).count++;
    }
    return terms;
  });
  const titles = documents.map((terms) => {
    const entries = [];
    for (const term of terms) {
      const { index, count } = dictionary.get(term);
      if (count > 1) entries.push([index, Math.log1p(nodes.length / count)]);
    }
    return normalize(entries);
  });
  const indices = new Map(nodes.map(({ id }, i) => [id, i]));
  const context = nodes.map(() => new Set());
  for (const { source, target, kind } of edges) {
    if (kind !== 'contains' && kind !== 'next_in_notes') continue;
    const a = indices.get(source);
    const b = indices.get(target);
    if (a === undefined || b === undefined || a === b) continue;
    context[a].add(b);
    context[b].add(a);
  }
  const rows = titles.map((title, index) => {
    const profile = new Map(title);
    const neighbors = context[index];
    // Use nearby vocabulary as context, without adding any graph links.
    for (const neighbor of neighbors) {
      for (const [term, value] of titles[neighbor]) {
        profile.set(term, (profile.get(term) ?? 0) + (0.23 * value) / neighbors.size);
      }
    }
    return normalize([...profile]);
  });
  return { columns: dictionary.size, rows };
}

function normalize(entries) {
  const norm = Math.sqrt(entries.reduce((sum, [, value]) => sum + value * value, 0));
  return norm ? entries.map(([index, value]) => [index, value / norm]) : [];
}

function relationRows(nodes, edges) {
  const indices = new Map(nodes.map(({ id }, i) => [id, i]));
  const math = nodes.map(() => new Map());
  const source = nodes.map(() => new Map());
  const connect = (rows, a, b, value) => {
    rows[a].set(b, Math.max(value, rows[a].get(b) ?? 0));
    rows[b].set(a, Math.max(value, rows[b].get(a) ?? 0));
  };
  const mathematical = {
    proposed_supports: 0.68,
    mapped_to_dembo_proposed: 0.52,
    prerequisite: 1,
    supports: 1,
    equivalent_to: 1,
    generalizes: 0.9,
    analogous_to: 0.82,
  };
  for (const { source: from, target: to, kind } of edges) {
    const a = indices.get(from);
    const b = indices.get(to);
    if (a === undefined || b === undefined || a === b) continue;
    if (Object.hasOwn(mathematical, kind)) connect(math, a, b, mathematical[kind]);
    if (kind === 'contains' || kind === 'next_in_notes') connect(source, a, b, 0.87);
  }
  const sequences = new Map();
  const sourceColumn = new Map();
  const sourceIndex = new Map();
  for (const [i, node] of nodes.entries()) {
    const section = typeof node.section === 'string' && /^(\d+)\.(\d+)\.(\d+)$/.exec(node.section);
    const lecture = Number(node.lecture);
    const order = Number(/:topic(\d+)$/.exec(node.id)?.[1] ?? 0);
    const isLecture =
      lecture > 0 && Number.isFinite(lecture) && (node.kind === 'lecture' || node.kind === 'note');
    if (!section && !isLecture) continue;
    const key = section ? `${node.course}/reading/${section[1]}` : `${node.course}/lectures`;
    const collection = section ? `${node.course}/reading` : `${node.course}/lectures`;
    if (!sourceColumn.has(collection))
      sourceColumn.set(collection, nodes.length + sourceColumn.size);
    sourceIndex.set(i, sourceColumn.get(collection));
    const position = section
      ? Number(section[2]) + Number(section[3]) * 0.08
      : lecture + Math.min(0.72, order * 0.055);
    if (!sequences.has(key)) sequences.set(key, []);
    sequences.get(key).push({ i, position });
  }
  for (const sequence of sequences.values()) {
    sequence.sort((a, b) => a.position - b.position);
    for (const [index, a] of sequence.entries()) {
      for (let j = index + 1; j < sequence.length; j++) {
        const b = sequence[j];
        const distance = b.position - a.position;
        if (distance > 1.55) break;
        connect(source, a.i, b.i, Math.exp(-1.55 * distance));
      }
    }
  }

  function profiles(rows, bySource = false) {
    return {
      columns: nodes.length + (bySource ? sourceColumn.size : 0),
      rows: rows.map((row, i) => {
        const entries = [...row];
        if (row.size) entries.push([i, Math.max(...row.values()) * 1.15]);
        const profile = normalize(entries);
        if (bySource && sourceIndex.has(i)) profile.push([sourceIndex.get(i), 0.49]);
        return profile;
      }),
    };
  }
  return { math: profiles(math), source: profiles(source, true) };
}

function energy({ columns, rows }) {
  const sums = new Float64Array(columns);
  let squares = 0;
  for (const row of rows) {
    for (const [column, value] of row) {
      sums[column] += value;
      squares += value * value;
    }
  }
  return Math.max(0, squares - dot(sums, sums) / rows.length);
}

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function center(vector) {
  const mean = vector.reduce((sum, value) => sum + value, 0) / vector.length;
  for (let i = 0; i < vector.length; i++) vector[i] -= mean;
  return vector;
}

function unit(vector) {
  const norm = Math.sqrt(dot(vector, vector));
  if (norm < 1e-12) return null;
  for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  return vector;
}

export function projectCurriculum(nodes, edges, weights = defaultWeights) {
  if (!nodes.length) return new Map();
  const channels = { meaning: termRows(nodes, edges), ...relationRows(nodes, edges) };
  const blocks = Object.entries(channels).flatMap(([key, block]) => {
    const variance = energy(block);
    const weight = weights[key];
    return weight > 0 && variance > 1e-10
      ? [
          {
            ...block,
            // A rare relationship channel should not set the scale for all the other topics.
            factor: weight / Math.max(variance, nodes.length * 0.35),
            transpose: new Float64Array(block.columns),
          },
        ]
      : [];
  });
  const size = nodes.length;
  const output = nodes.map(() => ({ x: 0, y: 0, z: 0 }));
  const basis = [];

  // The centered Gram operator computes X Xᵀ times a vector without forming a dense matrix.
  function apply(vector) {
    const result = new Float64Array(size);
    for (const { rows, factor, transpose } of blocks) {
      transpose.fill(0);
      for (let i = 0; i < size; i++) {
        for (const [column, value] of rows[i]) transpose[column] += value * vector[i];
      }
      for (let i = 0; i < size; i++) {
        let sum = 0;
        for (const [column, value] of rows[i]) sum += value * transpose[column];
        result[i] += factor * sum;
      }
    }
    return center(result);
  }

  function perpendicular(vector) {
    for (const previous of basis) {
      const length = dot(vector, previous);
      for (let i = 0; i < size; i++) vector[i] -= length * previous[i];
    }
    return unit(vector);
  }

  if (blocks.length) {
    for (const [component, axis] of axes.entries()) {
      const seed = Float64Array.from(
        nodes,
        (_, i) => Math.sin((i + 1) * (1.13 + component * 1.37)) + Math.cos((i + 1) * 0.59),
      );
      let vector = perpendicular(center(seed));
      for (let iteration = 0; vector && iteration < 100; iteration++) {
        const next = perpendicular(apply(vector));
        const converged = next && Math.abs(dot(vector, next)) > 1 - 1e-10;
        vector = next;
        if (converged) break;
      }
      if (!vector) break;
      const variance = dot(vector, apply(vector));
      if (variance < 1e-10) break;
      basis.push(vector);
      // The sign of a component is arbitrary. Anchor it to its largest loading for stable views.
      const peak = vector.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
      const scale = Math.sqrt(variance) * Math.sign(peak);
      for (let i = 0; i < size; i++) output[i][axis] = vector[i] * scale;
    }
  }
  return new Map(nodes.map(({ id }, i) => [id, output[i]]));
}

export function constrainToSphere(points, strength = 0.8) {
  const radii = points.map(({ x, y, z }) => Math.hypot(x, y, z)).sort((a, b) => a - b);
  const typical = radii[Math.floor((radii.length - 1) * 0.8)] || radii.at(-1) || 1;
  return points.map((point) => {
    const radius = Math.hypot(point.x, point.y, point.z);
    const scale = 1 / Math.sqrt(1 + ((strength * radius) / typical) ** 2);
    return { ...point, x: point.x * scale, y: point.y * scale, z: point.z * scale };
  });
}
