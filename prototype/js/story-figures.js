const CYAN = { r: 51, g: 212, b: 255 };
const AMBER = { r: 255, g: 181, b: 71 };
const DIM = { r: 127, g: 142, b: 163 };
const BG = { r: 5, g: 6, b: 10 };
const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

const TOUCHDOWN_TIMES = [6.09, 10.23, 14.33, 18.49, 22.78, 27.27, 31.89, 36.59, 41.45, 46.26];
const FINISH_TIME = 52.17;
const TRACK_POSITIONS = [0, 45, 80, 115, 150, 185, 220, 255, 290, 325, 360, 400];
const RACE_TIMES = [0, ...TOUCHDOWN_TIMES, FINISH_TIME];
const INTERVAL_VELOCITIES = TRACK_POSITIONS.slice(1).map((position, index) => {
  const distance = position - TRACK_POSITIONS[index];
  const elapsed = RACE_TIMES[index + 1] - RACE_TIMES[index];
  return distance / elapsed;
});

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

function easeOutCubic(value) {
  const x = 1 - clamp01(value);
  return 1 - x * x * x;
}

function rgba(color, alpha) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function mixColor(start, end, amount, alpha) {
  const x = smootherStep(amount);
  return `rgba(${Math.round(lerp(start.r, end.r, x))}, ${Math.round(lerp(start.g, end.g, x))}, ${Math.round(
    lerp(start.b, end.b, x),
  )}, ${alpha})`;
}

function setMono(ctx, size, weight = 500) {
  ctx.font = `${weight} ${size}px ${MONO}`;
}

function fillFittedMono(ctx, text, x, y, maxWidth, size, minSize = 8) {
  for (let fontSize = size; fontSize >= minSize; fontSize -= 0.5) {
    setMono(ctx, fontSize);

    if (ctx.measureText(text).width <= maxWidth || fontSize <= minSize) {
      ctx.fillText(text, x, y);
      return;
    }
  }
}

function buildUnfoldingData() {
  const binCount = 30;
  const truth = Array.from({ length: binCount }, (_, index) => {
    const x = index / (binCount - 1);
    const falling = 102 * Math.exp(-3.05 * x);
    const shoulder = 18 * Math.exp(-0.5 * ((index - 17.5) / 3.1) ** 2);
    const turnOn = 5.5 * Math.exp(-0.5 * ((index - 4) / 2.6) ** 2);
    return falling + shoulder + turnOn + 3.2;
  });

  const detector = Array.from({ length: binCount }, () => 0);
  const sigma = 1.35;
  const shift = 0.85;

  truth.forEach((value, truthBin) => {
    const weights = [];
    let norm = 0;

    for (let recoBin = 0; recoBin < binCount; recoBin += 1) {
      const delta = recoBin - (truthBin + shift);
      const weight = Math.exp(-0.5 * (delta / sigma) ** 2);
      weights.push(weight);
      norm += weight;
    }

    weights.forEach((weight, recoBin) => {
      detector[recoBin] += value * 0.75 * (weight / norm);
    });
  });

  return {
    detector,
    truth,
    maxValue: Math.max(...truth, ...detector) * 1.08,
  };
}

function positionAtRaceTime(raceTime) {
  if (raceTime <= 0) {
    return 0;
  }

  for (let index = 0; index < RACE_TIMES.length - 1; index += 1) {
    const startTime = RACE_TIMES[index];
    const endTime = RACE_TIMES[index + 1];

    if (raceTime <= endTime) {
      const localProgress = smootherStep((raceTime - startTime) / (endTime - startTime));
      return lerp(TRACK_POSITIONS[index], TRACK_POSITIONS[index + 1], localProgress);
    }
  }

  return 400;
}

class CanvasFigure {
  constructor(element, { reducedMotion }) {
    this.element = element;
    this.canvas = element.querySelector('canvas');
    this.ctx = this.canvas?.getContext('2d') ?? null;
    this.section = element.closest('.story-section');
    this.reducedMotion = reducedMotion;
    this.inView = false;
    this.hasEntered = reducedMotion;
    this.enteredAt = reducedMotion ? 0 : null;
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.sectionTop = 0;
    this.sectionHeight = 1;
    this.resize();
  }

  resize() {
    if (!this.ctx) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }

    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.measureSection();
  }

  measureSection() {
    if (!this.section) {
      return;
    }

    const rect = this.section.getBoundingClientRect();
    this.sectionTop = rect.top + window.scrollY;
    this.sectionHeight = Math.max(1, rect.height);
  }

  getSectionProgress(smoothScrollY) {
    return clamp01((smoothScrollY + window.innerHeight - this.sectionTop) / (window.innerHeight + this.sectionHeight));
  }

  markEntered(time) {
    if (!this.hasEntered) {
      this.hasEntered = true;
      this.enteredAt = time;
    }
  }

  getDrawProgress(time, duration) {
    if (this.reducedMotion) {
      return 1;
    }

    if (!this.hasEntered || this.enteredAt === null) {
      return 0;
    }

    return easeOutCubic((time - this.enteredAt) / duration);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

class UnfoldingFigure extends CanvasFigure {
  constructor(element, options) {
    super(element, options);
    this.data = buildUnfoldingData();
  }

  update({ time, smoothScrollY }) {
    if (!this.ctx || (!this.inView && !this.reducedMotion)) {
      return;
    }

    this.resize();
    this.draw({
      drawProgress: this.getDrawProgress(time, 850),
      morphProgress: this.reducedMotion ? 1 : this.getSectionProgress(smoothScrollY),
    });
  }

  drawStatic() {
    if (!this.ctx) {
      return;
    }

    this.resize();
    this.draw({ drawProgress: 1, morphProgress: 1 });
  }

  draw({ drawProgress, morphProgress }) {
    const { ctx, width, height } = this;
    const compact = width < 520;
    const left = compact ? 34 : 46;
    const right = width - (compact ? 14 : 20);
    const top = compact ? 48 : 54;
    const baseline = height - (compact ? 46 : 54);
    const plotWidth = Math.max(1, right - left);
    const plotHeight = Math.max(1, baseline - top);
    const binWidth = plotWidth / this.data.truth.length;
    const gap = Math.max(1.1, Math.min(2.6, binWidth * 0.18));
    const labelFade = smootherStep((morphProgress - 0.38) / 0.24);
    const barColor = mixColor(AMBER, CYAN, morphProgress, 0.82);
    const fillColor = mixColor(AMBER, CYAN, morphProgress, 0.1);

    this.clear();

    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(DIM, 0.42);
    ctx.beginPath();
    ctx.moveTo(left, baseline + 0.5);
    ctx.lineTo(right, baseline + 0.5);
    ctx.moveTo(left + 0.5, top);
    ctx.lineTo(left + 0.5, baseline);
    ctx.stroke();

    ctx.strokeStyle = rgba(DIM, 0.36);
    setMono(ctx, compact ? 9 : 10);
    ctx.fillStyle = rgba(DIM, 0.84);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    [0, 10, 20, 30].forEach((tick) => {
      const x = left + (tick / 30) * plotWidth;
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

    this.data.truth.forEach((truthValue, index) => {
      const detectorValue = this.data.detector[index];
      const value = lerp(detectorValue, truthValue, morphProgress) * drawProgress;
      const barHeight = (value / this.data.maxValue) * plotHeight;
      const x = left + index * binWidth + gap * 0.5;
      const y = baseline - barHeight;
      const w = Math.max(1, binWidth - gap);

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = barColor;
      ctx.fillRect(x, y, w, barHeight);
      ctx.strokeRect(x, y, w, barHeight);
    });

    setMono(ctx, compact ? 10 : 11, 600);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(AMBER, (1 - labelFade) * 0.95);
    ctx.fillText('DETECTOR-LEVEL', left, 22);
    ctx.fillStyle = rgba(CYAN, labelFade * 0.95);
    ctx.fillText('UNFOLDED / TRUTH-LEVEL', left, 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = rgba(DIM, 0.74);
    fillFittedMono(ctx, 'SMEARING MATRIX + 75% EFFICIENCY', right, 22, plotWidth * 0.55, compact ? 8.5 : 10, 7.5);
  }
}

class HurdlesFigure extends CanvasFigure {
  update({ time }) {
    if (!this.ctx || (!this.inView && !this.reducedMotion)) {
      return;
    }

    this.resize();
    const animationProgress = this.reducedMotion ? 1 : clamp01((time - (this.enteredAt ?? time)) / 2050);

    this.draw({
      drawProgress: this.getDrawProgress(time, 650),
      raceProgress: animationProgress,
    });
  }

  drawStatic() {
    if (!this.ctx) {
      return;
    }

    this.resize();
    this.draw({ drawProgress: 1, raceProgress: 1 });
  }

  draw({ drawProgress, raceProgress }) {
    const { ctx, width, height } = this;
    const compact = width < 520;
    const left = compact ? 34 : 48;
    const right = width - (compact ? 16 : 24);
    const top = compact ? 48 : 54;
    const curveBottom = height - (compact ? 100 : 112);
    const axisY = height - (compact ? 58 : 62);
    const plotWidth = Math.max(1, right - left);
    const plotHeight = Math.max(1, curveBottom - top);
    const minVelocity = Math.min(...INTERVAL_VELOCITIES) - 0.16;
    const maxVelocity = Math.max(...INTERVAL_VELOCITIES) + 0.16;
    const raceTime = FINISH_TIME * raceProgress;
    const dotDistance = positionAtRaceTime(raceTime);
    const drawLimitX = left + (dotDistance / 400) * plotWidth;

    const xForDistance = (distance) => left + (distance / 400) * plotWidth;
    const yForVelocity = (velocity) =>
      curveBottom - ((velocity - minVelocity) / (maxVelocity - minVelocity)) * plotHeight * drawProgress;

    this.clear();

    setMono(ctx, compact ? 9.2 : 11, 600);
    ctx.fillStyle = rgba(DIM, 0.94);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    fillFittedMono(
      ctx,
      '400M HURDLES / 52.17 / ACC CHAMPIONSHIPS 2025',
      left,
      22,
      plotWidth,
      compact ? 9.2 : 11,
      7.8,
    );

    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(DIM, 0.3);
    ctx.beginPath();
    ctx.moveTo(left + 0.5, top);
    ctx.lineTo(left + 0.5, curveBottom);
    ctx.moveTo(left, curveBottom + 0.5);
    ctx.lineTo(right, curveBottom + 0.5);
    ctx.stroke();

    setMono(ctx, compact ? 8.5 : 9.5);
    ctx.fillStyle = rgba(DIM, 0.72);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('M/S', left - 8, top + 4);
    [minVelocity, maxVelocity].forEach((velocity) => {
      const y = yForVelocity(velocity);
      ctx.beginPath();
      ctx.moveTo(left - 5, y + 0.5);
      ctx.lineTo(left, y + 0.5);
      ctx.stroke();
      ctx.fillText(velocity.toFixed(1), left - 8, y);
    });

    ctx.strokeStyle = rgba(DIM, 0.46);
    ctx.beginPath();
    ctx.moveTo(left, axisY + 0.5);
    ctx.lineTo(right, axisY + 0.5);
    ctx.stroke();

    setMono(ctx, compact ? 8.2 : 9.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    TRACK_POSITIONS.forEach((position, index) => {
      const x = xForDistance(position);
      const isFinish = index === TRACK_POSITIONS.length - 1;
      const isStart = index === 0;
      const tickTop = isFinish ? axisY - 13 : axisY - 9;

      ctx.strokeStyle = isStart ? rgba(DIM, 0.36) : rgba(DIM, 0.52);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, tickTop);
      ctx.lineTo(x + 0.5, axisY + 7);
      ctx.stroke();

      if (!isStart) {
        const label = index === TRACK_POSITIONS.length - 1 ? FINISH_TIME.toFixed(2) : TOUCHDOWN_TIMES[index - 1].toFixed(2);
        ctx.fillStyle = isFinish ? rgba(AMBER, 0.88) : rgba(DIM, 0.82);
        ctx.fillText(label, x, axisY + 12);
      }
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = rgba(DIM, 0.72);
    ctx.fillText('400M', right, axisY + (compact ? 27 : 30));

    ctx.save();
    ctx.beginPath();
    ctx.rect(left - 1, top - 8, Math.max(0, drawLimitX - left + 2), curveBottom - top + 20);
    ctx.clip();
    ctx.strokeStyle = rgba(CYAN, 0.86);
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    INTERVAL_VELOCITIES.forEach((velocity, index) => {
      const x0 = xForDistance(TRACK_POSITIONS[index]);
      const x1 = xForDistance(TRACK_POSITIONS[index + 1]);
      const y = yForVelocity(velocity);

      if (index === 0) {
        ctx.moveTo(x0, y);
      }

      ctx.lineTo(x1, y);

      if (index < INTERVAL_VELOCITIES.length - 1) {
        ctx.lineTo(x1, yForVelocity(INTERVAL_VELOCITIES[index + 1]));
      }
    });
    ctx.stroke();
    ctx.restore();

    INTERVAL_VELOCITIES.forEach((velocity, index) => {
      const midpoint = (TRACK_POSITIONS[index] + TRACK_POSITIONS[index + 1]) / 2;
      const x = xForDistance(midpoint);

      if (x > drawLimitX + 1) {
        return;
      }

      const y = yForVelocity(velocity);
      ctx.fillStyle = rgba(BG, 0.92);
      ctx.strokeStyle = rgba(CYAN, 0.88);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, compact ? 2.6 : 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.fillStyle = rgba(CYAN, 0.95);
    ctx.strokeStyle = rgba(CYAN, 0.28);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(drawLimitX, axisY, compact ? 3.2 : 3.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
  }
}

class StoryFigures {
  constructor({ reducedMotion }) {
    this.reducedMotion = reducedMotion;
    this.figures = [...document.querySelectorAll('[data-figure]')]
      .map((element) => {
        if (element.dataset.figure === 'unfolding') {
          return new UnfoldingFigure(element, { reducedMotion });
        }

        if (element.dataset.figure === 'hurdles') {
          return new HurdlesFigure(element, { reducedMotion });
        }

        return null;
      })
      .filter(Boolean);

    this.observer = new IntersectionObserver(
      (entries) => {
        const now = performance.now();

        entries.forEach((entry) => {
          const figure = this.figures.find((candidate) => candidate.element === entry.target);

          if (!figure) {
            return;
          }

          figure.inView = entry.isIntersecting;

          if (entry.intersectionRatio >= 0.48 || (entry.isIntersecting && entry.boundingClientRect.height > window.innerHeight)) {
            figure.markEntered(now);
          }

          if (this.reducedMotion && entry.isIntersecting) {
            figure.markEntered(now);
            figure.drawStatic();
          }
        });
      },
      {
        threshold: [0, 0.02, 0.48, 0.72],
      },
    );

    this.figures.forEach((figure) => this.observer.observe(figure.element));
  }

  resize() {
    this.figures.forEach((figure) => {
      figure.resize();

      if (this.reducedMotion && figure.inView) {
        figure.drawStatic();
      }
    });
  }

  update({ time, scrollProgress, maxScroll }) {
    const smoothScrollY = scrollProgress * maxScroll;
    this.figures.forEach((figure) => figure.update({ time, smoothScrollY }));
  }

  renderStatic() {
    this.figures.forEach((figure) => {
      if (figure.inView) {
        figure.drawStatic();
      }
    });
  }
}

export function createStoryFigures(options) {
  return new StoryFigures(options);
}
