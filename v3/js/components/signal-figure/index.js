/**
 * Mounts a Canvas 2D Signal Figure into a container element.
 *
 * @param {HTMLElement} el - Container element
 * @param {{ signal: 'stride'|'score'|'star', playing?: boolean, data?: any }} options
 * @returns {{ play(): void, pause(): void, seek(t: number): void, destroy(): void, ready: Promise<void> }}
 */
export default function mountSignalFigure(el, options = {}) {
  const signalKey = options.signal || el.dataset.signal || 'stride';
  el.dataset.state = 'loading';

  let isDestroyed = false;
  let animationFrameId = null;
  let isPlaying = options.playing ?? false;
  let currentTime = 0;
  let maxTime = 1;
  let resizeObserver = null;
  let resizeCanvasHandler = null;
  let ctx = null;

  let resolveReady;
  const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Asynchronously initialize figure
  initFigure();

  async function initFigure() {
    try {
      const signalsData = await loadSignalsData(options, el);
      const signalData = signalsData ? signalsData[signalKey] : null;

      if (!signalData) {
        markFallback(el, `Signal dataset "${signalKey}" not found.`);
        resolveReady();
        return;
      }

      if (signalKey === 'star') {
        el.replaceChildren(buildStarFigure(signalData, el));
        el.dataset.state = 'ready';
        el.dispatchEvent(new CustomEvent('signal-figure:ready', { bubbles: true }));
        resolveReady();
        return;
      }

      // Calculate max time for scrubber
      if (signalKey === 'stride') {
        maxTime = signalData.finishTime || 52.17;
      } else if (signalKey === 'score') {
        maxTime = signalData.duration || 125.967;
      }

      // Build DOM Structure
      el.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'signal-figure-container';

      // 1. Header
      const header = document.createElement('div');
      header.className = 'signal-figure-header';
      const titleSpan = document.createElement('span');
      titleSpan.className = 'signal-figure-title';
      titleSpan.textContent = signalData.title || signalKey;
      const sourceSpan = document.createElement('span');
      sourceSpan.className = 'signal-figure-source';
      sourceSpan.textContent = signalData.event || signalData.method || signalData.performer || '';
      header.appendChild(titleSpan);
      header.appendChild(sourceSpan);
      container.appendChild(header);

      // 2. Canvas Wrapper
      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'signal-figure-canvas-wrap';
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-label', `${signalData.title || signalKey} visualization`);
      canvasWrap.appendChild(canvas);
      container.appendChild(canvasWrap);

      // 3. Controls
      const controls = document.createElement('div');
      controls.className = 'signal-figure-controls';

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'signal-figure-btn signal-figure-play';
      playBtn.textContent = isPlaying ? 'Pause' : 'Play';
      playBtn.setAttribute('aria-label', isPlaying ? 'Pause animation' : 'Play animation');

      const scrubber = document.createElement('input');
      scrubber.type = 'range';
      scrubber.className = 'signal-figure-scrubber';
      scrubber.min = '0';
      scrubber.max = maxTime.toString();
      scrubber.step = (maxTime / 500).toString();
      scrubber.value = '0';
      scrubber.setAttribute('aria-label', 'Time scrubber');

      const readout = document.createElement('span');
      readout.className = 'signal-figure-readout';
      readout.setAttribute('aria-live', 'polite');
      readout.textContent = formatReadout(0);

      controls.appendChild(playBtn);
      controls.appendChild(scrubber);
      controls.appendChild(readout);
      container.appendChild(controls);

      // 4. Caption
      const caption = document.createElement('div');
      caption.className = 'signal-figure-caption';
      caption.textContent = getCaptionText(signalKey, signalData);
      container.appendChild(caption);

      // 5. Accessible Data Table
      const table = buildDataTable(signalKey, signalData);
      container.appendChild(table);

      el.appendChild(container);

      // Canvas context setup
      ctx = canvas.getContext('2d');
      if (!ctx) {
        markFallback(el, 'Canvas 2D context not supported');
        resolveReady();
        return;
      }

      function render() {
        if (isDestroyed) return;
        drawCanvas(ctx, canvas, signalKey, signalData, currentTime, maxTime, prefersReducedMotion);
        scrubber.value = currentTime.toString();
        readout.textContent = formatReadout(currentTime);
      }

      resizeCanvasHandler = function resizeCanvas() {
        if (isDestroyed) return;
        const rect = canvasWrap.getBoundingClientRect();
        const width = Math.max(rect.width || 600, 300);
        const height = Math.min(Math.max(width * 0.45, 200), 320);
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.save();
        ctx.scale(dpr, dpr);
        render();
        ctx.restore();
      };

      // Animation Loop
      let lastTimestamp = null;
      function animate(timestamp) {
        if (isDestroyed) return;
        if (isPlaying && !prefersReducedMotion) {
          if (lastTimestamp !== null) {
            const delta = (timestamp - lastTimestamp) / 1000;
            currentTime += delta * (signalKey === 'star' ? 100 : 1);
            if (currentTime >= maxTime) {
              currentTime = 0;
            }
          }
          lastTimestamp = timestamp;
          render();
          animationFrameId = requestAnimationFrame(animate);
        } else {
          lastTimestamp = null;
        }
      }

      // Controls Event Listeners
      playBtn.addEventListener('click', () => {
        if (isPlaying) {
          pauseInternal();
        } else {
          playInternal();
        }
      });

      scrubber.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        seekInternal(val);
      });

      function playInternal() {
        if (isDestroyed) return;
        isPlaying = true;
        playBtn.textContent = 'Pause';
        playBtn.setAttribute('aria-label', 'Pause animation');
        if (!animationFrameId) {
          lastTimestamp = null;
          animationFrameId = requestAnimationFrame(animate);
        }
      }

      function pauseInternal() {
        isPlaying = false;
        playBtn.textContent = 'Play';
        playBtn.setAttribute('aria-label', 'Play animation');
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        render();
      }

      function seekInternal(t) {
        currentTime = Math.max(0, Math.min(t, maxTime));
        render();
      }

      // Resize handling
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (resizeCanvasHandler) resizeCanvasHandler();
        });
        resizeObserver.observe(canvasWrap);
      } else if (typeof window !== 'undefined') {
        window.addEventListener('resize', resizeCanvasHandler);
      }

      // Initial draw
      resizeCanvasHandler();

      // Set ready state
      el.dataset.state = 'ready';
      el.dispatchEvent(new CustomEvent('signal-figure:ready', { bubbles: true }));
      resolveReady();

      if (isPlaying && !prefersReducedMotion) {
        playInternal();
      }
    } catch (err) {
      markFallback(el, err.message || 'Error initializing signal figure');
      resolveReady();
    }
  }

  function play() {
    if (el.dataset.state === 'ready') {
      const btn = el.querySelector('.signal-figure-play');
      if (btn && btn.textContent === 'Play') btn.click();
    }
  }

  function pause() {
    if (el.dataset.state === 'ready') {
      const btn = el.querySelector('.signal-figure-play');
      if (btn && btn.textContent === 'Pause') btn.click();
    }
  }

  function seek(t) {
    if (el.dataset.state === 'ready') {
      const scrubber = el.querySelector('.signal-figure-scrubber');
      if (scrubber) {
        scrubber.value = t.toString();
        scrubber.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  function destroy() {
    isDestroyed = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    } else if (typeof window !== 'undefined' && resizeCanvasHandler) {
      window.removeEventListener('resize', resizeCanvasHandler);
    }
    el.innerHTML = '';
  }

  return {
    play,
    pause,
    seek,
    destroy,
    ready: readyPromise,
  };
}

async function loadSignalsData(options, el) {
  if (options.data) return options.data;

  const candidateUrls = [
    el?.dataset?.src,
    './data/signals.json',
    '../data/signals.json',
    '../../data/signals.json',
    '../../../data/signals.json',
    '../../../../data/signals.json',
    '/v3/data/signals.json',
  ].filter(Boolean);

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Continue next candidate
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helper Functions & Canvas Drawing
// ---------------------------------------------------------------------------

function markFallback(el, message) {
  el.dataset.state = 'fallback';
  el.innerHTML = `<div class="signal-figure-container"><p class="signal-figure-caption">Fallback: ${message}</p></div>`;
  el.dispatchEvent(new CustomEvent('signal-figure:ready', { bubbles: true }));
}

function formatOptionalNumber(value, digits, suffix = '') {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—';
}

function buildStarTable(data) {
  const table = document.createElement('table');
  table.className = 'visually-hidden';

  const caption = document.createElement('caption');
  caption.textContent = 'AM CVn model fit statistics';
  table.appendChild(caption);

  const head = document.createElement('thead');
  head.innerHTML = `
    <tr>
      <th>Model</th>
      <th>Period</th>
      <th>A1</th>
      <th>A2</th>
      <th>Chi-squared / degrees of freedom</th>
      <th>RMS</th>
      <th>Effective BIC</th>
      <th>Comparison</th>
    </tr>
  `;
  table.appendChild(head);

  const body = document.createElement('tbody');
  data.fitStatistics.forEach((fit) => {
    const row = document.createElement('tr');
    const comparison = Number.isFinite(fit.deltaBicVsFree)
      ? `Delta BIC versus free fit: ${fit.deltaBicVsFree.toFixed(2)}`
      : Number.isFinite(fit.precessionHours)
        ? `Precession period: ${fit.precessionHours.toFixed(2)} hours`
        : '—';
    const values = [
      fit.model,
      formatOptionalNumber(fit.periodSeconds, 2, ' s'),
      formatOptionalNumber(fit.amplitude1Percent, 2, '%'),
      formatOptionalNumber(fit.amplitude2Percent, 2, '%'),
      Number.isFinite(fit.chiSquared) && Number.isFinite(fit.degreesOfFreedom)
        ? `${fit.chiSquared.toFixed(1)} / ${fit.degreesOfFreedom}`
        : '—',
      formatOptionalNumber(fit.rmsPercent, 2, '%'),
      formatOptionalNumber(fit.bic, 2),
      comparison,
    ];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  table.appendChild(body);
  return table;
}

function buildStarFigure(data, el) {
  const container = document.createElement('div');
  container.className = 'signal-figure-container signal-figure-container--star';

  const header = document.createElement('div');
  header.className = 'signal-figure-header';
  const title = document.createElement('span');
  title.className = 'signal-figure-title';
  title.textContent = data.title;
  const source = document.createElement('span');
  source.className = 'signal-figure-source';
  source.textContent = `${data.method} · ${data.filter}`;
  header.append(title, source);

  const figure = document.createElement('figure');
  figure.className = 'signal-figure-star';
  const imageLink = document.createElement('a');
  imageLink.className = 'signal-figure-star__image-link';
  imageLink.href = data.imageSrc;
  imageLink.target = '_blank';
  imageLink.rel = 'noopener noreferrer';
  imageLink.setAttribute('aria-label', 'Open the full-size AM CVn light-curve comparison');
  const image = document.createElement('img');
  image.className = 'signal-figure-star__image';
  image.src = data.imageSrc;
  image.alt =
    'Five stacked AM CVn relative-flux light curves compare a constant baseline, best-fit single sine, fixed harmonic superhump template, beat-constrained proxy, and free double-wave fit across about 110 minutes.';
  image.addEventListener(
    'error',
    () => {
      markFallback(el, 'AM CVn light-curve image unavailable');
    },
    { once: true },
  );
  imageLink.appendChild(image);

  const caption = document.createElement('figcaption');
  caption.className = 'signal-figure-caption signal-figure-caption--star';
  const observation = document.createElement('p');
  observation.textContent =
    '138 retained V-band exposures (of 140), spanning about 110 minutes from the first exposure. Source: AAVSO differential photometry.';
  const fixed = document.createElement('p');
  fixed.textContent =
    'Fixed harmonic superhump template: P = 1051.20 s; A1 = 0.58%; A2 = 1.00%; χ²/dof = 688.3/133; RMS = 1.25%; effective BIC = 712.91.';
  const comparison = document.createElement('p');
  comparison.textContent =
    'Constant-flux baseline rejected: BIC = 1006.40 (ΔBIC vs free = 288.75). Best-fit single sine: P = 524.35 s (the harmonic), BIC = 783.12.';
  const beat = document.createElement('p');
  beat.textContent =
    'Beat-constrained superhump proxy: P = 1050.03 s; precession period = 14.09 hr.';
  caption.append(observation, fixed, comparison, beat);

  figure.append(imageLink, caption);
  container.append(header, figure, buildStarTable(data));
  return container;
}

function formatReadout(time) {
  return `${time.toFixed(2)} s`;
}

function getCaptionText(signalKey, data) {
  if (signalKey === 'stride') {
    return 'Track Position vs. Cumulative Time (cobalt line, left axis) and Interval Velocity (step bars, right axis) for 400m hurdles at 2025 ACC Championships.';
  } else if (signalKey === 'score') {
    return 'Piano roll visualization of my performance of a Bach fugue. Horizontal bars represent note durations across MIDI pitch levels.';
  }
  return data.note || '';
}

function buildDataTable(signalKey, data) {
  const table = document.createElement('table');
  table.className = 'visually-hidden';
  const caption = document.createElement('caption');
  caption.textContent = `${data.title} Data Table`;
  table.appendChild(caption);

  if (signalKey === 'stride') {
    table.innerHTML = `
      <thead>
        <tr><th>Hurdle Mark</th><th>Distance (m)</th><th>Touchdown / Race Time (s)</th><th>Interval Velocity (m/s)</th></tr>
      </thead>
      <tbody>
        ${data.trackPositions
          .map(
            (pos, i) => `
          <tr>
            <td>${data.hurdleLabels[i] || i}</td>
            <td>${pos}</td>
            <td>${data.raceTimes[i]}</td>
            <td>${data.intervalVelocities[i] || '-'}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    `;
  } else if (signalKey === 'score') {
    table.innerHTML = `
      <thead>
        <tr><th>Pitch (MIDI)</th><th>Start (s)</th><th>End (s)</th><th>Velocity</th></tr>
      </thead>
      <tbody>
        ${data.notes
          .slice(0, 50)
          .map(
            (n) => `
          <tr>
            <td>${n.pitch}</td>
            <td>${n.start}</td>
            <td>${n.end}</td>
            <td>${n.velocity}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    `;
  }
  return table;
}

function drawCanvas(ctx, canvas, signalKey, data, time, maxTime, isReducedMotion) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, w, h);

  // Padding
  const pad = { top: 30, right: 55, bottom: 45, left: 55 };
  const graphW = w - pad.left - pad.right;
  const graphH = h - pad.top - pad.bottom;

  // Grid line styling
  ctx.strokeStyle = '#d6d1c4';
  ctx.lineWidth = 1;
  ctx.font = '10px "IBM Plex Mono", monospace';

  if (signalKey === 'stride') {
    drawStrideChart(ctx, pad, graphW, graphH, data, time, isReducedMotion);
  } else if (signalKey === 'score') {
    drawScoreChart(ctx, pad, graphW, graphH, data, time, isReducedMotion);
  }
}

function drawStrideChart(ctx, pad, gw, gh, data, time, isReducedMotion) {
  const positions = data.trackPositions;
  const raceTimes = data.raceTimes;
  const velocities = data.intervalVelocities;

  // Axes ranges: X = 0..400m, Y1 (Left) = 0..60s (Time), Y2 (Right) = 6..10 m/s (Velocity)
  const xMin = 0,
    xMax = 400;
  const y1Min = 0,
    y1Max = 60;
  const y2Min = 6,
    y2Max = 10;

  // Draw grid
  ctx.strokeStyle = '#eae6dc';
  ctx.beginPath();
  for (let t = 0; t <= y1Max; t += 15) {
    const y = pad.top + gh - ((t - y1Min) / (y1Max - y1Min)) * gh;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + gw, y);

    ctx.fillStyle = '#55595f';
    ctx.textAlign = 'right';
    ctx.fillText(`${t}s`, pad.left - 6, y + 3);
  }
  ctx.stroke();

  // Right axis ticks (Velocity)
  for (let v = 6; v <= 10; v += 1) {
    const y = pad.top + gh - ((v - y2Min) / (y2Max - y2Min)) * gh;
    ctx.fillStyle = '#1b46d8';
    ctx.textAlign = 'left';
    ctx.fillText(`${v}m/s`, pad.left + gw + 6, y + 3);
  }

  // Draw X axis ticks (Hurdles)
  positions.forEach((pos, i) => {
    const x = pad.left + ((pos - xMin) / (xMax - xMin)) * gw;
    ctx.strokeStyle = '#d6d1c4';
    ctx.beginPath();
    ctx.moveTo(x, pad.top + gh);
    ctx.lineTo(x, pad.top + gh + 4);
    ctx.stroke();

    if (i % 2 === 0 || i === positions.length - 1) {
      ctx.fillStyle = '#55595f';
      ctx.textAlign = 'center';
      ctx.fillText(`${pos}m`, x, pad.top + gh + 16);
    }
  });

  // Axis Labels
  ctx.fillStyle = '#14161a';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Track Position (m)', pad.left + gw / 2, pad.top + gh + 34);

  // Velocity Step Bars
  for (let i = 0; i < velocities.length; i++) {
    const x1 = pad.left + ((positions[i] - xMin) / (xMax - xMin)) * gw;
    const x2 = pad.left + ((positions[i + 1] - xMin) / (xMax - xMin)) * gw;
    const v = velocities[i];
    const y = pad.top + gh - ((v - y2Min) / (y2Max - y2Min)) * gh;
    const barH = pad.top + gh - y;

    ctx.fillStyle = 'rgba(27, 70, 216, 0.12)';
    ctx.fillRect(x1, y, x2 - x1, barH);
    ctx.strokeStyle = '#1b46d8';
    ctx.strokeRect(x1, y, x2 - x1, barH);
  }

  // Cumulative Time Line (Cobalt)
  ctx.beginPath();
  ctx.strokeStyle = '#1b46d8';
  ctx.lineWidth = 2.5;
  positions.forEach((pos, i) => {
    const x = pad.left + ((pos - xMin) / (xMax - xMin)) * gw;
    const t = raceTimes[i];
    const y = pad.top + gh - ((t - y1Min) / (y1Max - y1Min)) * gh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw points
  positions.forEach((pos, i) => {
    const x = pad.left + ((pos - xMin) / (xMax - xMin)) * gw;
    const t = raceTimes[i];
    const y = pad.top + gh - ((t - y1Min) / (y1Max - y1Min)) * gh;
    ctx.fillStyle = '#1b46d8';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Playhead line
  if (time > 0 || isReducedMotion) {
    const currentDist = getDistFromTime(time, raceTimes, positions);
    const px = pad.left + ((currentDist - xMin) / (xMax - xMin)) * gw;
    ctx.strokeStyle = '#d8451f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + gh);
    ctx.stroke();
  }
}

function drawScoreChart(ctx, pad, gw, gh, data, time, isReducedMotion) {
  const notes = data.notes;
  const duration = data.duration;

  // MIDI Pitch range
  const pitchMin = 36; // C2
  const pitchMax = 84; // C6

  // Grid background
  ctx.strokeStyle = '#eae6dc';
  for (let p = 40; p <= 80; p += 12) {
    const y = pad.top + gh - ((p - pitchMin) / (pitchMax - pitchMin)) * gh;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + gw, y);
    ctx.stroke();

    ctx.fillStyle = '#55595f';
    ctx.textAlign = 'right';
    ctx.fillText(`MIDI ${p}`, pad.left - 6, y + 3);
  }

  // Time grid
  for (let t = 0; t <= duration; t += 30) {
    const x = pad.left + (t / duration) * gw;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + gh);
    ctx.stroke();

    ctx.fillStyle = '#55595f';
    ctx.textAlign = 'center';
    ctx.fillText(`${t}s`, x, pad.top + gh + 16);
  }

  // Axis Labels
  ctx.fillStyle = '#14161a';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Performance Time (s)', pad.left + gw / 2, pad.top + gh + 34);

  // Draw Notes
  notes.forEach((note) => {
    const x = pad.left + (note.start / duration) * gw;
    const w = Math.max(2, ((note.end - note.start) / duration) * gw);
    const y = pad.top + gh - ((note.pitch - pitchMin) / (pitchMax - pitchMin)) * gh;
    const noteH = Math.max(3, gh / (pitchMax - pitchMin));

    const alpha = 0.4 + note.velocity * 0.55;
    ctx.fillStyle = `rgba(27, 70, 216, ${alpha})`;
    ctx.fillRect(x, y - noteH / 2, w, noteH);
  });

  // Playhead line
  if (time > 0 || isReducedMotion) {
    const px = pad.left + (time / duration) * gw;
    ctx.strokeStyle = '#d8451f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + gh);
    ctx.stroke();
  }
}

function getDistFromTime(time, raceTimes, positions) {
  if (time <= 0) return 0;
  if (time >= raceTimes[raceTimes.length - 1]) return 400;
  for (let i = 1; i < raceTimes.length; i++) {
    if (time <= raceTimes[i]) {
      const pct = (time - raceTimes[i - 1]) / (raceTimes[i] - raceTimes[i - 1]);
      return positions[i - 1] + pct * (positions[i] - positions[i - 1]);
    }
  }
  return 400;
}
