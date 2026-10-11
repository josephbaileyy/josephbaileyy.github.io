// A fixed display filter, shared by simulation, measured data, and reference.
// It never feeds the classifiers or uses a reference to alter an estimate.
export function densityPixels(grid, size, palette, scale, colorModel = 'categorical') {
  const area = size * size;
  const isRgb = colorModel === 'rgb';
  const isIntensity = colorModel === 'intensity';
  const colors = palette.map((hex) =>
    [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)),
  );
  const smooth = new Float32Array(grid.length);
  const temporary = new Float32Array(area);
  const kernel =
    isRgb || isIntensity
      ? [0.0545, 0.2442, 0.4026, 0.2442, 0.0545]
      : [0.006, 0.15, 0.688, 0.15, 0.006];
  const radius = (kernel.length - 1) / 2;
  for (let channel = 0; channel < (isRgb ? 4 : palette.length); channel++) {
    const offset = channel * area;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let value = 0;
        for (let k = -radius; k <= radius; k++)
          value +=
            grid[offset + y * size + Math.max(0, Math.min(size - 1, x + k))] * kernel[k + radius];
        temporary[y * size + x] = value;
      }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let value = 0;
        for (let k = -radius; k <= radius; k++)
          value +=
            temporary[Math.max(0, Math.min(size - 1, y + k)) * size + x] * kernel[k + radius];
        smooth[offset + y * size + x] = value;
      }
  }
  const pixels = new Uint8ClampedArray(area * 4);
  for (let i = 0; i < area; i++) {
    let total = isRgb ? smooth[i] : 0;
    if (!isRgb)
      for (let channel = 0; channel < palette.length; channel++)
        total += smooth[channel * area + i];
    if (isIntensity) {
      for (let component = 0; component < 3; component++)
        pixels[4 * i + component] = (255 * smooth[component * area + i]) / scale;
      pixels[4 * i + 3] = 255;
      continue;
    }
    if (!total) continue;
    for (let component = 0; component < 3; component++) {
      let value = isRgb ? 255 * smooth[(component + 1) * area + i] : 0;
      if (!isRgb)
        for (let channel = 0; channel < palette.length; channel++)
          value += smooth[channel * area + i] * colors[channel][component];
      pixels[4 * i + component] = value / total;
    }
    // RGB is a conditional mean-color image; event mass is shown separately
    // in the projections. Density opacity applies to the other examples.
    pixels[4 * i + 3] = isRgb ? 255 : 255 * Math.min(1, total / scale) ** 0.7;
  }
  return pixels;
}
