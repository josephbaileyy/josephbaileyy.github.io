const CYAN = '51, 212, 255';
const AMBER = '255, 181, 71';
const DIM = '127, 142, 163';
const LINE = '232, 236, 241';
const GROUND = '#060913';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
const BIN_COUNT = 30;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smootherStep(value) {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function mapRange(value, from, to) {
  if (from === to) {
    return value >= to ? 1 : 0;
  }
  return clamp01((value - from) / (to - from));
}

function rgba(channels, alpha) {
  return `rgba(${channels}, ${alpha})`;
}

function mixChannels(fromChannels, toChannels, amount) {
  const a = fromChannels.split(',').map(Number);
  const b = toChannels.split(',').map(Number);
  const x = smootherStep(amount);
  return `${Math.round(lerp(a[0], b[0], x))}, ${Math.round(lerp(a[1], b[1], x))}, ${Math.round(lerp(a[2], b[2], x))}`;
}

function buildData() {
  const truth = Array.from({ length: BIN_COUNT }, (_, index) => {
    const x = index / (BIN_COUNT - 1);
    const falling = 102 * Math.exp(-3.05 * x);
    const shoulder = 18 * Math.exp(-0.5 * ((index - 17.5) / 3.1) ** 2);
    const turnOn = 5.5 * Math.exp(-0.5 * ((index - 4) / 2.6) ** 2);
    return falling + shoulder + turnOn + 3.2;
  });

  const detector = Array.from({ length: BIN_COUNT }, () => 0);
  const sigma = 1.35;
  const shift = 0.85;

  truth.forEach((value, truthBin) => {
    const weights = [];
    let norm = 0;

    for (let recoBin = 0; recoBin < BIN_COUNT; recoBin += 1) {
      const delta = recoBin - (truthBin + shift);
      const weight = Math.exp(-0.5 * (delta / sigma) ** 2);
      weights.push(weight);
      norm += weight;
    }

    weights.forEach((weight, recoBin) => {
      detector[recoBin] += value * 0.75 * (weight / norm);
    });
  });

  return { detector, truth, maxValue: Math.max(...truth, ...detector) * 1.08 };
}

function setMono(ctx, size, weight = 500) {
  ctx.font = `${weight} ${size}px ${MONO}`;
}

function measureSpaced(ctx, text, spacing) {
  let width = 0;
  for (const ch of text) {
    width += ctx.measureText(ch).width + spacing;
  }
  return width - spacing;
}

function fillSpacedText(ctx, text, x, y, spacing, align = 'left') {
  const total = measureSpaced(ctx, text, spacing);
  let startX = x;

  if (align === 'right') {
    startX = x - total;
  } else if (align === 'center') {
    startX = x - total / 2;
  }

  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let cursorX = startX;

  for (const ch of text) {
    ctx.fillText(ch, cursorX, y);
    cursorX += ctx.measureText(ch).width + spacing;
  }

  ctx.textAlign = prevAlign;
}

function computeLayout(width, height) {
  const compact = width < 520;
  const left = compact ? 40 : 56;
  const right = width - (compact ? 18 : 28);
  const top = compact ? 56 : 64;
  const baseline = height - (compact ? 60 : 72);
  const plotWidth = Math.max(1, right - left);
  const plotHeight = Math.max(1, baseline - top);
  const binWidth = plotWidth / BIN_COUNT;
  const gap = Math.max(1.1, Math.min(2.6, binWidth * 0.18));
  return { compact, left, right, top, baseline, plotWidth, plotHeight, binWidth, gap };
}

function drawHistogram(ctx, layout, data, p) {
  const { left, right, top, baseline, plotWidth, plotHeight, binWidth, gap, compact } = layout;
  const barColor = mixChannels(AMBER, CYAN, p);

  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(DIM, 0.4);
  ctx.beginPath();
  ctx.moveTo(left, baseline + 0.5);
  ctx.lineTo(right, baseline + 0.5);
  ctx.moveTo(left + 0.5, top);
  ctx.lineTo(left + 0.5, baseline);
  ctx.stroke();

  ctx.strokeStyle = rgba(DIM, 0.34);
  setMono(ctx, compact ? 9 : 10);
  ctx.fillStyle = rgba(DIM, 0.8);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  [0, 10, 20, 30].forEach((tick) => {
    const x = left + (tick / BIN_COUNT) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, baseline);
    ctx.lineTo(x + 0.5, baseline + 5);
    ctx.stroke();
    ctx.fillText(String(tick), x, baseline + 10);
  });

  ctx.textAlign = 'right';
  ctx.fillText('OBSERVABLE BIN', right, baseline + (compact ? 24 : 26));

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('YIELD', left - 9, top + 2);
  ctx.beginPath();
  ctx.moveTo(left - 5, top + 0.5);
  ctx.lineTo(left, top + 0.5);
  ctx.stroke();

  data.truth.forEach((truthValue, index) => {
    const detectorValue = data.detector[index];
    const value = lerp(detectorValue, truthValue, smootherStep(p));
    const barHeight = (value / data.maxValue) * plotHeight;
    const x = left + index * binWidth + gap * 0.5;
    const y = baseline - barHeight;
    const w = Math.max(1, binWidth - gap);

    ctx.fillStyle = rgba(barColor, 0.1);
    ctx.strokeStyle = rgba(barColor, 0.82);
    ctx.fillRect(x, y, w, barHeight);
    ctx.strokeRect(x, y, w, barHeight);
  });
}

function outlinePoints(layout, data, p) {
  const { left, baseline, plotWidth, plotHeight } = layout;
  const binWidth = plotWidth / data.truth.length;

  return data.truth.map((truthValue, index) => {
    const detectorValue = data.detector[index];
    const value = lerp(detectorValue, truthValue, smootherStep(p));
    const barHeight = (value / data.maxValue) * plotHeight;
    return {
      x: left + index * binWidth + binWidth / 2,
      y: baseline - barHeight,
    };
  });
}

function liftedYAt(points, x) {
  if (!points.length) {
    return 0;
  }

  if (x <= points[0].x) {
    return points[0].y;
  }

  const last = points[points.length - 1];

  if (x >= last.x) {
    return last.y;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];

    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return lerp(a.y, b.y, t);
    }
  }

  return last.y;
}

function drawWorldline(ctx, layout, data, p, time) {
  const { left, right, baseline, plotWidth, compact } = layout;
  const arcRadiusMax = compact ? 15 : 22;
  const bendT = smootherStep(mapRange(p, 0.15, 0.3));
  const axisExtendT = smootherStep(mapRange(p, 0.15, 0.5));
  const liftT = smootherStep(mapRange(p, 0.5, 1.0));
  const radius = arcRadiusMax * bendT;
  const cornerX = left;
  const arcCenterX = cornerX + radius;
  const arcCenterY = baseline - radius;
  const horizontalStartX = arcCenterX;
  const horizontalMaxLength = Math.max(0, right - horizontalStartX);
  const horizontalEndX = horizontalStartX + horizontalMaxLength * axisExtendT;
  const glow = time === 0 ? 0.95 : 0.92 + 0.08 * Math.sin(time * 0.0016);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(cornerX, 0);
  ctx.lineTo(cornerX, arcCenterY);

  if (radius > 0.1) {
    ctx.arc(arcCenterX, arcCenterY, radius, Math.PI, Math.PI * 0.5, true);
  }

  ctx.strokeStyle = rgba(LINE, glow);
  ctx.stroke();

  let tipX = horizontalEndX;
  let tipY = baseline;

  if (horizontalEndX > horizontalStartX + 0.5) {
    ctx.beginPath();
    ctx.moveTo(horizontalStartX, baseline);
    ctx.lineTo(horizontalEndX, baseline);
    ctx.strokeStyle = rgba(LINE, glow * (1 - liftT * 0.85));
    ctx.stroke();
  }

  if (liftT > 0.001) {
    const points = outlinePoints(layout, data, p);
    const steps = 48;
    ctx.beginPath();

    for (let index = 0; index <= steps; index += 1) {
      const x = left + (plotWidth * index) / steps;
      const y = lerp(baseline, liftedYAt(points, x), liftT);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      if (index === steps) {
        tipX = x;
        tipY = y;
      }
    }

    ctx.strokeStyle = rgba(LINE, glow * liftT);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(tipX, tipY, compact ? 2.4 : 3, 0, Math.PI * 2);
  ctx.fillStyle = rgba(LINE, glow);
  ctx.fill();
}

function drawLabels(ctx, layout, p) {
  const { left, right, compact } = layout;
  const labelFade = smootherStep(mapRange(p, 0.4, 0.62));

  setMono(ctx, compact ? 10 : 11, 600);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = rgba(AMBER, (1 - labelFade) * 0.95);
  fillSpacedText(ctx, 'DETECTOR-LEVEL', left, 24, 1, 'left');
  ctx.fillStyle = rgba(CYAN, labelFade * 0.95);
  fillSpacedText(ctx, 'UNFOLDED / TRUTH-LEVEL', left, 24, 1, 'left');

  setMono(ctx, compact ? 8 : 9.5, 500);
  ctx.fillStyle = rgba(DIM, 0.7);
  const captionY = compact ? 42 : 24;
  const captionAlign = compact ? 'left' : 'right';
  const captionX = compact ? left : right;
  fillSpacedText(
    ctx,
    'ILLUSTRATIVE — OMNIFOLD-STYLE ITERATIVE UNFOLDING',
    captionX,
    captionY,
    compact ? 0.8 : 1.2,
    captionAlign,
  );
}

function drawDetectorLayer(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const base = Math.min(width, height);

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = `rgb(${DIM})`;
  ctx.lineWidth = 1;

  [0.14, 0.24, 0.35, 0.48, 0.6].forEach((fraction) => {
    ctx.beginPath();
    ctx.arc(cx, cy, base * fraction, 0, Math.PI * 2);
    ctx.stroke();
  });

  const spokes = 16;

  for (let index = 0; index < spokes; index += 1) {
    const angle = (index / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * base * 0.14, cy + Math.sin(angle) * base * 0.14);
    ctx.lineTo(cx + Math.cos(angle) * base * 0.6, cy + Math.sin(angle) * base * 0.6);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.stroke();
  ctx.restore();
}

function drawGhostHistogramLayer(ctx, width, height, data) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.strokeStyle = `rgb(${LINE})`;
  ctx.lineWidth = 1;

  const bandHeight = 420;
  const bands = Math.max(1, Math.ceil(height / bandHeight));
  const maxTruth = Math.max(...data.truth) * 1.1;
  const plotWidth = width * 0.62;
  const plotHeight = 220;
  const left = width * 0.22;
  const binWidth = plotWidth / data.truth.length;

  for (let band = 0; band < bands; band += 1) {
    const bandTop = band * bandHeight + 60;
    ctx.beginPath();

    data.truth.forEach((value, index) => {
      const x0 = left + index * binWidth;
      const y = bandTop + plotHeight - (value / maxTruth) * plotHeight;

      if (index === 0) {
        ctx.moveTo(x0, y);
      } else {
        ctx.lineTo(x0, y);
      }

      ctx.lineTo(x0 + binWidth, y);
    });

    ctx.stroke();
  }

  ctx.restore();
}

class ParallaxLayer {
  constructor(canvas, { factor, draw }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.factor = factor;
    this.draw = draw;
    this.width = 0;
    this.height = 0;
    this.lastScroll = 0;
  }

  resize(width, containerHeight) {
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const bufferHeight = containerHeight + 1600;
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(bufferHeight * pixelRatio);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }

    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.width = width;
    this.height = bufferHeight;
    this.canvas.style.height = `${bufferHeight}px`;
    this.canvas.style.top = `${-(bufferHeight - containerHeight) / 2}px`;
    this.draw(this.ctx, width, bufferHeight);
    this.setParallax(this.lastScroll);
  }

  setParallax(scrollPx) {
    this.lastScroll = scrollPx;
    this.canvas.style.transform = `translate3d(0, ${(-scrollPx * this.factor).toFixed(1)}px, 0)`;
  }
}

class ResearchScene {
  constructor(rootEl, reducedMotion) {
    this.rootEl = rootEl;
    this.reducedMotion = reducedMotion;
    this.progress = 0;
    this.width = 0;
    this.height = 0;
    this.rafId = null;
    this.data = buildData();

    this.container = document.createElement('div');
    this.container.style.cssText = `position:relative;width:100%;height:100%;overflow:hidden;background:${GROUND};`;

    this.detectorCanvas = document.createElement('canvas');
    this.histGhostCanvas = document.createElement('canvas');
    this.mainCanvas = document.createElement('canvas');

    [this.detectorCanvas, this.histGhostCanvas, this.mainCanvas].forEach((canvas, index) => {
      canvas.style.cssText = 'position:absolute;left:0;width:100%;display:block;pointer-events:none;';
      canvas.style.zIndex = String(index);
    });

    this.mainCanvas.style.top = '0';
    this.mainCanvas.style.height = '100%';

    this.container.appendChild(this.detectorCanvas);
    this.container.appendChild(this.histGhostCanvas);
    this.container.appendChild(this.mainCanvas);
    this.rootEl.appendChild(this.container);

    this.mainCtx = this.mainCanvas.getContext('2d');
    this.detectorLayer = new ParallaxLayer(this.detectorCanvas, {
      factor: 0.85,
      draw: (ctx, w, h) => drawDetectorLayer(ctx, w, h),
    });
    this.histGhostLayer = new ParallaxLayer(this.histGhostCanvas, {
      factor: 0.93,
      draw: (ctx, w, h) => drawGhostHistogramLayer(ctx, w, h, this.data),
    });

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  resize() {
    const rect = this.rootEl.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.width = width;
    this.height = height;

    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);

    if (this.mainCanvas.width !== targetWidth || this.mainCanvas.height !== targetHeight) {
      this.mainCanvas.width = targetWidth;
      this.mainCanvas.height = targetHeight;
    }

    this.mainCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.detectorLayer.resize(width, height);
    this.histGhostLayer.resize(width, height);
    this.renderMain(this.reducedMotion ? 0 : performance.now());
  }

  renderMain(time) {
    if (!this.mainCtx || this.width <= 0 || this.height <= 0) {
      return;
    }

    const ctx = this.mainCtx;
    const layout = computeLayout(this.width, this.height);
    ctx.clearRect(0, 0, this.width, this.height);
    drawHistogram(ctx, layout, this.data, this.progress);
    drawWorldline(ctx, layout, this.data, this.progress, time);
    drawLabels(ctx, layout, this.progress);
  }

  tick(time) {
    this.renderMain(time);
    this.rafId = requestAnimationFrame(this.tick);
  }

  onProgress(p) {
    this.progress = clamp01(p);

    if (this.reducedMotion || this.rafId === null) {
      this.renderMain(this.reducedMotion ? 0 : performance.now());
    }
  }

  onParallax(scrollPx) {
    this.detectorLayer.setParallax(scrollPx);
    this.histGhostLayer.setParallax(scrollPx);
  }

  onEnter() {
    if (this.reducedMotion) {
      this.renderMain(0);
      return;
    }

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  onExit() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  dispose() {
    this.onExit();
    window.removeEventListener('resize', this.resize);
    this.container.remove();
  }
}

export function createScene(rootEl, { reducedMotion = false } = {}) {
  return new ResearchScene(rootEl, reducedMotion);
}
