const CYAN = '51, 212, 255';
const AMBER = '255, 181, 71';
const DIM = '127, 142, 163';
const LINE = '232, 236, 241';
const GROUND = '#060913';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
const BIN_COUNT = 30;
const PATH_EXIT_RATIO = 0.76;
const PATH_TRACE_START_X_RATIO = 0.66;
const PATH_TRACE_TOP_RATIO = 0.16;
const PATH_TRACE_BOTTOM_RATIO = 0.58;

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

function getHudRowY(rootStyles) {
  const rootRem = Number.parseFloat(rootStyles.fontSize) || 16;
  const hudBandRem = Number.parseFloat(rootStyles.getPropertyValue('--hud-band')) || 0;
  return hudBandRem * rootRem + rootRem;
}

function rgbToHsl([r, g, b]) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === rn) {
    hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    hue = (bn - rn) / delta + 2;
  } else {
    hue = (rn - gn) / delta + 4;
  }

  return { h: hue * 60, s: saturation, l: lightness };
}

function hueToRgb(p, q, t) {
  let x = t;

  if (x < 0) {
    x += 1;
  }

  if (x > 1) {
    x -= 1;
  }

  if (x < 1 / 6) {
    return p + (q - p) * 6 * x;
  }

  if (x < 1 / 2) {
    return q;
  }

  if (x < 2 / 3) {
    return p + (q - p) * (2 / 3 - x) * 6;
  }

  return p;
}

function hslToRgb({ h, s, l }) {
  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const hue = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, hue) * 255),
    Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  ];
}

function mixChannels(fromChannels, toChannels, amount) {
  const a = rgbToHsl(fromChannels.split(',').map(Number));
  const b = rgbToHsl(toChannels.split(',').map(Number));
  const x = smootherStep(amount);
  let hueDelta = ((b.h - a.h + 540) % 360) - 180;

  if (a.h < 80 && b.h > 160 && b.h < 230 && hueDelta > 0) {
    hueDelta -= 360;
  }

  const mixed = hslToRgb({
    h: a.h + hueDelta * x,
    s: lerp(a.s, b.s, x),
    l: lerp(a.l, b.l, x),
  });

  return `${mixed[0]}, ${mixed[1]}, ${mixed[2]}`;
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
  return {
    compact,
    width,
    height,
    left,
    right,
    top,
    baseline,
    plotWidth,
    plotHeight,
    binWidth,
    gap,
  };
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

function cubicPoint(a, b, c, d, t) {
  const mt = 1 - t;
  return {
    x: mt ** 3 * a.x + 3 * mt ** 2 * t * b.x + 3 * mt * t ** 2 * c.x + t ** 3 * d.x,
    y: mt ** 3 * a.y + 3 * mt ** 2 * t * b.y + 3 * mt * t ** 2 * c.y + t ** 3 * d.y,
  };
}

function appendCubic(target, a, b, c, d, segments) {
  for (let index = 1; index <= segments; index += 1) {
    target.push(cubicPoint(a, b, c, d, index / segments));
  }
}

function catmullValue(a, b, c, d, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  );
}

function smoothOutline(points, top, baseline) {
  const smoothed = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[Math.max(0, index - 1)];
    const b = points[index];
    const c = points[index + 1];
    const d = points[Math.min(points.length - 1, index + 2)];

    for (let step = index === 0 ? 0 : 1; step <= 4; step += 1) {
      const t = step / 4;
      smoothed.push({
        x: lerp(b.x, c.x, t),
        y: Math.min(baseline, Math.max(top, catmullValue(a.y, b.y, c.y, d.y, t))),
      });
    }
  }

  return smoothed;
}

// Cumulative arc-length table for a polyline, so we can sample it by fraction.
function polylineLengths(points) {
  const cum = [0];
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
    cum.push(total);
  }

  return { cum, total };
}

// Point at a normalized arc-length fraction (0 = first point, 1 = last point).
function samplePolyline(points, cum, total, fraction) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  if (total <= 0) {
    return points[0];
  }

  const target = clamp01(fraction) * total;

  for (let index = 1; index < points.length; index += 1) {
    if (target <= cum[index]) {
      const segLength = cum[index] - cum[index - 1] || 1;
      const t = (target - cum[index - 1]) / segLength;
      return {
        x: lerp(points[index - 1].x, points[index].x, t),
        y: lerp(points[index - 1].y, points[index].y, t),
      };
    }
  }

  return points[points.length - 1];
}

// The "bent" state of the worldline: a continuous path that enters at top-center,
// dives into the right side of the plot to echo the current (morphing) histogram
// outline, then collects back to the canonical center. Keeping the trace on the
// right prevents the worldline from crossing the research index and its scrim.
// The path ends in the controller's head band; the controller owns everything
// below it.
function buildDetourPath(layout, data, p, spineX) {
  const { width, height, top, baseline } = layout;
  const cx = width * spineX;
  const exitY = height * PATH_EXIT_RATIO;
  const traceTop = height * PATH_TRACE_TOP_RATIO;
  const traceBottom = height * PATH_TRACE_BOTTOM_RATIO;
  const traceStartX = Math.max(cx + 1, width * PATH_TRACE_START_X_RATIO);
  const sourceOutline = outlinePoints(layout, data, p);
  const rightOutline = sourceOutline.filter((point) => point.x >= traceStartX);
  const selectedOutline = rightOutline.length ? rightOutline : sourceOutline.slice(-1);
  let previousY = traceTop;
  const outline = selectedOutline.map((point) => {
    const y = Math.max(previousY, lerp(traceTop, traceBottom, mapRange(point.y, top, baseline)));
    previousY = y;
    return { x: point.x, y };
  });
  const start = { x: cx, y: 0 };
  const end = { x: cx, y: exitY };
  const path = [start];

  if (!outline.length) return [start, end];

  const first = outline[0];
  const last = outline[outline.length - 1];
  appendCubic(
    path,
    start,
    { x: cx, y: traceTop * 0.55 },
    { x: first.x, y: Math.max(traceTop, first.y - height * 0.06) },
    first,
    20,
  );
  previousY = first.y;
  path.push(
    ...smoothOutline(outline, traceTop, traceBottom)
      .slice(1)
      .map((point) => {
        const y = Math.max(previousY, point.y);
        previousY = y;
        return { x: point.x, y };
      }),
  );
  appendCubic(
    path,
    last,
    { x: last.x, y: Math.min(exitY, last.y + height * 0.08) },
    { x: cx, y: Math.max(last.y, exitY - height * 0.08) },
    end,
    28,
  );
  return path;
}

function drawWorldline(ctx, layout, data, p, spineStyle, visible) {
  const { width, height } = layout;
  const cx = width * spineStyle.x;
  const exitY = height * PATH_EXIT_RATIO;
  // Bends in as you scroll and stays bent - it doesn't need to straighten
  // back out before handing off to the next chapter, and it doesn't need to
  // stay pinned to the top edge either.
  const bend = smootherStep(mapRange(p, 0.12, 0.45));
  // The line draws itself down the screen as you scroll. A small floor
  // (not literally 0) keeps a thin sliver connected to the previous
  // chapter's exit point at the exact instant this chapter's sticky content
  // appears - the handoff between chapters is a hard cut (sticky positioning
  // swaps content instantly, there's no blended overlap), so p=0 IS the
  // frame right after the previous chapter showed its line reaching this
  // same screen position. Zero here reads as the line vanishing.
  const REVEAL_FLOOR = 0.04;
  const revealFrac = Math.max(REVEAL_FLOOR, smootherStep(p));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = spineStyle.width;
  ctx.strokeStyle = spineStyle.color;
  ctx.shadowColor = spineStyle.shadowColor;
  ctx.shadowBlur = spineStyle.shadowBlur;

  ctx.beginPath();

  {
    // Morph each sample between the straight spine and the detour path. The two
    // endpoints coincide, so the top and bottom stay locked to center at any bend.
    // (When bend=0 this reduces exactly to the straight vertical spine.)
    const detour = buildDetourPath(layout, data, p, spineStyle.x);
    const { cum, total } = polylineLengths(detour);
    const steps = 160;
    // Never round up to the endpoint before the scrub is genuinely complete.
    // The controller resumes below exitY as soon as headY reaches it.
    const drawSteps =
      p >= 1 ? steps : Math.min(steps - 1, Math.max(1, Math.floor(revealFrac * steps)));
    let headY = 0;

    for (let index = 0; index <= drawSteps; index += 1) {
      const s = index / steps;
      const bent = samplePolyline(detour, cum, total, s);
      const x = lerp(cx, bent.x, bend);
      const y = lerp(s * exitY, bent.y, bend);
      headY = y;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (visible) {
      ctx.stroke();
    }

    ctx.restore();
    return {
      entryY: 0,
      exitY,
      headY: drawSteps === steps ? exitY : headY,
    };
  }
}

function drawLabels(ctx, layout, p, hudRowY) {
  const { left, right, compact } = layout;
  const detectorAlpha = 1 - smootherStep(mapRange(p, 0.15, 0.21));
  const truthAlpha = smootherStep(mapRange(p, 0.24, 0.3));

  setMono(ctx, compact ? 10 : 11, 600);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = rgba(AMBER, detectorAlpha * 0.95);
  fillSpacedText(ctx, 'DETECTOR-LEVEL', left, hudRowY, 1, 'left');
  ctx.fillStyle = rgba(CYAN, truthAlpha * 0.95);
  fillSpacedText(ctx, 'UNFOLDED / TRUTH-LEVEL', left, hudRowY, 1, 'left');

  setMono(ctx, compact ? 8 : 9.5, 500);
  ctx.fillStyle = rgba(DIM, 0.7);
  const captionY = compact ? hudRowY + 18 : hudRowY;
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
    this.active = false;
    this.pathAnchors = null;
    this.pathVisible = false;
    this.rafId = null;
    this.data = buildData();
    const rootStyles = getComputedStyle(document.documentElement);
    this.hudRowY = getHudRowY(rootStyles);
    const spineGlow = rootStyles.getPropertyValue('--spine-glow').trim();
    const spineGlowMatch = spineGlow.match(
      /drop-shadow\(\s*0(?:px)?\s+0(?:px)?\s+([\d.]+)px\s+(.+)\)$/,
    );
    this.spineStyle = {
      x: Number.parseFloat(rootStyles.getPropertyValue('--spine-x')) / 100,
      color: rootStyles.getPropertyValue('--spine-color').trim(),
      width: Number.parseFloat(rootStyles.getPropertyValue('--spine-width')),
      shadowBlur: Number.parseFloat(spineGlowMatch?.[1] ?? '0'),
      shadowColor: spineGlowMatch?.[2]?.trim(),
    };

    this.container = document.createElement('div');
    this.container.style.cssText = `position:relative;width:100%;height:100%;overflow:hidden;background:${GROUND};`;

    this.detectorCanvas = document.createElement('canvas');
    this.histGhostCanvas = document.createElement('canvas');
    this.mainCanvas = document.createElement('canvas');

    [this.detectorCanvas, this.histGhostCanvas, this.mainCanvas].forEach((canvas, index) => {
      canvas.style.cssText =
        'position:absolute;left:0;width:100%;display:block;pointer-events:none;';
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
    this.hudRowY = getHudRowY(getComputedStyle(document.documentElement));
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
    this.renderMain();
  }

  renderMain() {
    if (!this.mainCtx || this.width <= 0 || this.height <= 0) {
      return;
    }

    const ctx = this.mainCtx;
    const layout = computeLayout(this.width, this.height);
    ctx.clearRect(0, 0, this.width, this.height);
    drawHistogram(ctx, layout, this.data, this.progress);
    this.pathAnchors = drawWorldline(
      ctx,
      layout,
      this.data,
      this.progress,
      this.spineStyle,
      this.pathVisible,
    );
    drawLabels(ctx, layout, this.progress, this.hudRowY);
  }

  tick() {
    this.renderMain();
    this.rafId = requestAnimationFrame(this.tick);
  }

  onProgress(p) {
    this.progress = clamp01(p);

    if (this.reducedMotion) {
      this.renderMain();
    }
  }

  onParallax(scrollPx) {
    this.detectorLayer.setParallax(scrollPx);
    this.histGhostLayer.setParallax(scrollPx);
  }

  getAnchors() {
    if (!this.active || !this.pathAnchors || !this.mainCanvas.isConnected) {
      this.pathVisible = false;
      return null;
    }

    const rect = this.mainCanvas.getBoundingClientRect();
    const scaleY = rect.height / this.height;
    const entryY = rect.top + this.pathAnchors.entryY * scaleY;
    const exitY = rect.top + this.pathAnchors.exitY * scaleY;
    const pathIsComplete = this.pathAnchors.headY === this.pathAnchors.exitY;
    const headY = pathIsComplete ? exitY : rect.top + this.pathAnchors.headY * scaleY;
    const onScreen = rect.bottom > 0 && entryY < window.innerHeight && exitY > 0;
    const insideHeadBand = headY <= window.innerHeight * PATH_EXIT_RATIO + 0.5;

    this.pathVisible = onScreen && insideHeadBand;

    if (!this.pathVisible) {
      return null;
    }

    return { active: true, entryY, exitY, headY };
  }

  onEnter() {
    this.active = true;
    this.pathVisible = true;
    if (this.reducedMotion) {
      this.renderMain();
      return;
    }

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  onExit() {
    this.active = false;
    this.pathVisible = false;
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
