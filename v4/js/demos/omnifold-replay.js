// All views read the same frozen events and classifier-derived weight frames.
// Aggregated grids only affect the display; they are not training inputs.
const cache = new Map();
export async function loadExperiment(prior = 'hurdler', response = '040') {
  if (
    !['photo', 'photo-rgb', 'photo-intensity', 'uniform', 'hurdler', 'flat'].includes(prior) ||
    !['015', '040', '055'].includes(response)
  )
    throw new Error('Unknown toy setting');
  const key = `${prior}-${response}`;
  if (cache.has(key)) return cache.get(key);
  const pending = (async () => {
    const base = new URL(`data/unfolding/${key}`, document.baseURI);
    const [metadataResponse, weightsResponse] = await Promise.all([
      fetch(`${base}.json`),
      fetch(`${base}.bin`),
    ]);
    if (!metadataResponse.ok || !weightsResponse.ok) throw new Error('Toy data could not load');
    const metadata = await metadataResponse.json();
    const buffer = await weightsResponse.arrayBuffer();
    if (![1, 2, 3].includes(metadata.version) || buffer.byteLength !== metadata.floats * 4)
      throw new Error('Invalid toy export');
    const values = new Float32Array(buffer);
    const channels = metadata.channels ?? 1;
    const gridSize = metadata.grid ** 2 * channels,
      count = metadata.sample_count;
    function read(offset, length) {
      if (!Number.isInteger(offset) || offset < 0 || offset + length > values.length)
        throw new Error('Invalid toy frame');
      return values.subarray(offset, offset + length);
    }
    return {
      ...metadata,
      // Shared normalization keeps fixed data visually fixed across settings.
      channels,
      pair_stride: metadata.pair_stride ?? 4,
      display_scale: metadata.version >= 2 ? metadata.display_scale : 0.00175,
      measured: read(metadata.data, gridSize),
      reference: read(metadata.reference, gridSize),
      measuredColor:
        metadata.version === 3 ? read(metadata.data_color, metadata.color_bins * 3) : null,
      referenceColor:
        metadata.version === 3 ? read(metadata.reference_color, metadata.color_bins * 3) : null,
      pairs: read(metadata.pairs, count * (metadata.pair_stride ?? 4)),
      frames: metadata.frames.map((frame) => ({
        ...frame,
        truthH: read(frame.truth, gridSize),
        recoH: read(frame.reco, gridSize),
        truthColorH:
          metadata.version === 3 ? read(frame.truth_color, metadata.color_bins * 3) : null,
        recoColorH: metadata.version === 3 ? read(frame.reco_color, metadata.color_bins * 3) : null,
        truthW: read(frame.truth_weights, count),
        recoW: read(frame.reco_weights, count),
      })),
    };
  })();
  cache.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

export function frameAt(experiment, position) {
  const clamped = Math.max(0, Math.min(experiment.frames.length - 1, position));
  const low = Math.floor(clamped);
  const high = Math.min(low + 1, experiment.frames.length - 1);
  return {
    before: experiment.frames[low],
    after: experiment.frames[high],
    fraction: clamped - low,
  };
}

export function project(grid, size, axis, bins, options = {}) {
  if (options.colorModel === 'rgb') {
    if (['red', 'green', 'blue'].includes(axis)) {
      const channel = ['red', 'green', 'blue'].indexOf(axis);
      const sourceBins = options.colorHistogram.length / 3;
      const counts = new Float64Array(bins);
      for (let i = 0; i < sourceBins; i++)
        counts[Math.min(bins - 1, Math.floor((i / sourceBins) * bins))] +=
          options.colorHistogram[channel * sourceBins + i];
      return counts;
    }
    // RGB-moment planes are sums of weight*intensity, not extra event mass.
    return project(grid.subarray(0, size * size), size, axis, bins);
  }
  const channels = grid.length / (size * size);
  if (axis === 'color') {
    return Float64Array.from({ length: channels }, (_, channel) =>
      grid
        .subarray(channel * size * size, (channel + 1) * size * size)
        .reduce((sum, x) => sum + x, 0),
    );
  }
  const counts = new Float64Array(bins);
  for (let channel = 0; channel < channels; channel++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const coordinate = axis === 'x' ? x : y;
        counts[Math.min(bins - 1, Math.floor((coordinate / size) * bins))] +=
          grid[channel * size * size + y * size + x];
      }
  return counts;
}
