const R = 113.4;
const HS = 130;
const CX = 400;
const CY = 210;

const P_ENTRY_END = 0.12;
const P_LAP_END = 0.88;

const E1_len = 300;
const E2_len = Math.sqrt(130 ** 2 + 173.4 ** 2);
const L_entry = E1_len + E2_len;

const L1 = Math.PI * R;
const L2 = 2 * HS;
const L3 = Math.PI * R;
const L4 = 2 * HS;
const L_lap = L1 + L2 + L3 + L4; // 1232.513165181745

const X1_len = Math.sqrt(130 ** 2 + 96.6 ** 2);
const X2_len = 250;
const L_exit = X1_len + X2_len;

// Point along the entry lead-in at a given trailing arc-length distance
// (mirrors the M 400 -150 L 400 150 L 530 323.4 geometry baked into the
// worldline path's `d` attribute below).
function getEntryPointAtDistance(distance) {
  const d = Math.max(0, Math.min(L_entry, distance));
  if (d <= E1_len) {
    return { x: 400, y: -150 + d };
  }
  const pct = (d - E1_len) / E2_len;
  return { x: 400 + 130 * pct, y: 150 + 173.4 * pct };
}

const TOUCHDOWN_TIMES = [6.09, 10.23, 14.33, 18.49, 22.78, 27.27, 31.89, 36.59, 41.45, 46.26];
const FINISH_TIME = 52.17;
const TRACK_POSITIONS = [0, 45, 80, 115, 150, 185, 220, 255, 290, 325, 360, 400];
const RACE_TIMES = [0, ...TOUCHDOWN_TIMES, FINISH_TIME];

const INTERVAL_VELOCITIES = TRACK_POSITIONS.slice(1).map((position, index) => {
  const distance = position - TRACK_POSITIONS[index];
  const elapsed = RACE_TIMES[index + 1] - RACE_TIMES[index];
  return distance / elapsed;
});

function getRaceTime(dist) {
  if (dist <= 0) return 0;
  if (dist >= 400) return FINISH_TIME;

  for (let i = 1; i < TRACK_POSITIONS.length; i++) {
    if (dist <= TRACK_POSITIONS[i]) {
      const pct = (dist - TRACK_POSITIONS[i - 1]) / (TRACK_POSITIONS[i] - TRACK_POSITIONS[i - 1]);
      return RACE_TIMES[i - 1] + pct * (RACE_TIMES[i] - RACE_TIMES[i - 1]);
    }
  }
  return FINISH_TIME;
}

function getStatusText(dist) {
  if (dist <= 0) return 'START';
  if (dist >= 400) return `FINISH — ${FINISH_TIME.toFixed(2)}`;

  const hurdles = [45, 80, 115, 150, 185, 220, 255, 290, 325, 360];
  let crossed = 0;
  for (let i = 0; i < hurdles.length; i++) {
    if (dist >= hurdles[i]) {
      crossed = i + 1;
    }
  }
  return crossed > 0 ? `H${crossed} DOWN` : 'START';
}

function getLapPosition(d) {
  const Rt = CX + HS; // 530
  const L = CX - HS; // 270
  const top = CY - R; // 96.6
  const bot = CY + R; // 323.4

  const L1 = Math.PI * R; // 356.2566
  const L2 = 2 * HS; // 260
  const L3 = Math.PI * R; // 356.2566

  if (d <= L1) {
    const angle = Math.PI / 2 - (d / L1) * Math.PI;
    return {
      x: Rt + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
      nx: Math.cos(angle),
      ny: Math.sin(angle),
    };
  } else if (d <= L1 + L2) {
    const d2 = d - L1;
    return {
      x: Rt - d2,
      y: top,
      nx: 0,
      ny: -1,
    };
  } else if (d <= L1 + L2 + L3) {
    const d3 = d - L1 - L2;
    const angle = 1.5 * Math.PI - (d3 / L3) * Math.PI;
    return {
      x: L + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
      nx: Math.cos(angle),
      ny: Math.sin(angle),
    };
  } else {
    const d4 = d - L1 - L2 - L3;
    return {
      x: L + d4,
      y: bot,
      nx: 0,
      ny: 1,
    };
  }
}

function getTrackState(p) {
  p = Math.min(1, Math.max(0, p));

  if (p <= P_ENTRY_END) {
    const p_entry = p / P_ENTRY_END;
    const d = p_entry * L_entry;
    if (d <= E1_len) {
      return {
        x: 400,
        y: -150 + d,
        nx: 0,
        ny: 1,
        distance: 0,
        time: 0,
        statusText: 'START',
      };
    } else {
      const d2 = d - E1_len;
      const pct = d2 / E2_len;
      return {
        x: 400 + 130 * pct,
        y: 150 + 173.4 * pct,
        nx: 130 / E2_len,
        ny: 173.4 / E2_len,
        distance: 0,
        time: 0,
        statusText: 'START',
      };
    }
  } else if (p <= P_LAP_END) {
    const p_lap = (p - P_ENTRY_END) / (P_LAP_END - P_ENTRY_END);
    const distance = p_lap * 400;
    const time = getRaceTime(distance);
    const statusText = getStatusText(distance);
    const pos = getLapPosition(p_lap * L_lap);
    return {
      x: pos.x,
      y: pos.y,
      nx: pos.nx,
      ny: pos.ny,
      distance,
      time,
      statusText,
    };
  } else {
    const p_exit = (p - P_LAP_END) / (1 - P_LAP_END);
    const d = p_exit * L_exit;
    if (d <= X1_len) {
      const pct = d / X1_len;
      return {
        x: 530 - 130 * pct,
        y: 323.4 + 96.6 * pct,
        nx: -130 / X1_len,
        ny: 96.6 / X1_len,
        distance: 400,
        time: FINISH_TIME,
        statusText: `FINISH — ${FINISH_TIME.toFixed(2)}`,
      };
    } else {
      const d2 = d - X1_len;
      return {
        x: 400,
        y: 420 + d2,
        nx: 0,
        ny: 1,
        distance: 400,
        time: FINISH_TIME,
        statusText: `FINISH — ${FINISH_TIME.toFixed(2)}`,
      };
    }
  }
}

export function createScene(rootEl, { reducedMotion = false } = {}) {
  // Clear root
  rootEl.innerHTML = '';

  // Create stylesheet
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .track-scene-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      justify-content: space-between;
      padding: 2vh 24px;
      background: transparent;
      color: #f2ede6;
      font-family: system-ui, -apple-system, sans-serif;
      user-select: none;
    }
    .track-hud {
      display: flex;
      justify-content: space-between;
      font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      letter-spacing: 0.14em;
      color: #7f8ea3;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 8px;
      flex-shrink: 0;
    }
    .track-clock {
      color: #ffb547;
      font-weight: 600;
    }
    .track-svg-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      margin: 2vh 0;
    }
    .track-svg {
      width: 100%;
      height: auto;
      max-height: 48vh;
      display: block;
    }
    .track-analysis {
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1.5vh;
      flex-shrink: 0;
      gap: 24px;
    }
    .track-pr-container {
      flex: 1;
    }
    .track-pr-label {
      font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
      font-size: 9px;
      letter-spacing: 0.12em;
      color: #7f8ea3;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .track-pr-link {
      font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      color: #f2ede6;
      text-decoration: none;
      border-bottom: 1px dashed rgba(242, 237, 230, 0.4);
      padding-bottom: 2px;
      transition: border-color 0.2s, color 0.2s;
      letter-spacing: 0.05em;
      display: inline-block;
    }
    .track-pr-link:hover {
      border-bottom-color: #ffb547;
      color: #ffb547;
    }
    .track-velocity-container {
      flex: 1;
      max-width: 320px;
      display: flex;
      flex-direction: column;
    }
    .track-velocity-label {
      font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
      font-size: 9px;
      letter-spacing: 0.12em;
      color: #7f8ea3;
      text-transform: uppercase;
      margin-bottom: 4px;
      text-align: right;
    }
    .track-chart-svg {
      width: 100%;
      height: auto;
      display: block;
    }
    @media (max-width: 640px) {
      .track-analysis {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 1.5vh !important;
      }
      .track-pr-container {
        text-align: center !important;
      }
      .track-pr-link {
        font-size: 11px !important;
      }
      .track-velocity-container {
        max-width: 100% !important;
      }
      .track-velocity-label {
        text-align: center !important;
      }
    }
    .reduced-motion * {
      transition: none !important;
      animation: none !important;
    }
    .track-trunk {
      position: absolute;
      left: 50%;
      width: 2px;
      transform: translateX(-50%);
      background: #e8ecf1;
      filter: drop-shadow(0 0 8px rgba(232, 236, 241, 0.32));
      pointer-events: none;
      z-index: 0;
    }
  `;
  document.head.appendChild(styleEl);

  // Bridging trunks: the HUD row and analysis panel are flex siblings of the
  // svg wrap, so the drawn worldline never actually reaches the scene-root's
  // true top/bottom edges - measured against the previous/next chapters'
  // lines (which do reach their true edges), that reads as a visible gap.
  // These plain, unanimated elements close that gap by spanning from the
  // scene-root edge to wherever the entry/exit segment's endpoint actually
  // renders on screen (measured live via getScreenCTM, since the perspective
  // tilt during entry moves that point every frame).
  const trunkIn = document.createElement('div');
  trunkIn.className = 'track-trunk';
  const trunkOut = document.createElement('div');
  trunkOut.className = 'track-trunk';

  // Set up container
  const container = document.createElement('div');
  container.className = 'track-scene-container';
  if (reducedMotion) {
    container.classList.add('reduced-motion');
  }

  // HUD
  const hud = document.createElement('div');
  hud.className = 'track-hud';
  hud.innerHTML = `
    <span>CH 03 / TRACK</span>
    <span>T+ <span class="track-clock">0.00</span> &nbsp;&nbsp; <span class="track-status">START</span></span>
  `;
  container.appendChild(hud);

  const clockEl = hud.querySelector('.track-clock');
  const statusEl = hud.querySelector('.track-status');

  // SVG Wrap
  const svgWrap = document.createElement('div');
  svgWrap.className = 'track-svg-wrap';

  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'track-svg');
  svg.setAttribute('viewBox', '0 0 800 370');
  svg.style.overflow = 'visible';

  // Lanes
  const lanesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  lanesG.setAttribute('class', 'track-lanes');
  lanesG.setAttribute('stroke', '#3a3542');
  lanesG.setAttribute('stroke-width', '1.2');
  lanesG.setAttribute('fill', 'none');

  // Helper to build lane paths
  const getOvalPathD = (r) => {
    const top = CY - r;
    const bot = CY + r;
    const L = CX - HS;
    const Rt = CX + HS;
    return `M ${Rt} ${bot} A ${r} ${r} 0 0 0 ${Rt} ${top} L ${L} ${top} A ${r} ${r} 0 0 0 ${L} ${bot} Z`;
  };

  // Draw lanes outward
  const laneRadii = [R, R + 10, R + 20, R + 30];
  laneRadii.forEach((r, idx) => {
    const lanePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    lanePath.setAttribute('d', getOvalPathD(r));
    lanePath.setAttribute('opacity', idx === 0 ? '0.6' : '0.35');
    lanesG.appendChild(lanePath);
  });
  svg.appendChild(lanesG);

  // Finish line line (at CX + HS = 530, across all lanes)
  const finishLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  finishLine.setAttribute('x1', '530');
  finishLine.setAttribute('y1', (CY + R - 5).toString());
  finishLine.setAttribute('x2', '530');
  finishLine.setAttribute('y2', (CY + R + 35).toString());
  finishLine.setAttribute('stroke', '#7f8ea3');
  finishLine.setAttribute('stroke-width', '1.5');
  finishLine.setAttribute('opacity', '0.6');
  svg.appendChild(finishLine);

  // Hurdles group
  const hurdlesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hurdlesG.setAttribute('class', 'track-hurdles');
  svg.appendChild(hurdlesG);

  // Split labels group
  const splitsG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  splitsG.setAttribute('class', 'track-splits');
  splitsG.setAttribute(
    'font-family',
    'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
  );
  splitsG.setAttribute('font-size', '9');
  splitsG.setAttribute('fill', '#7f8ea3');
  svg.appendChild(splitsG);

  // Place hurdles ticks & labels mathematically
  const L1 = Math.PI * R;
  const L2 = 2 * HS;
  const L3 = Math.PI * R;
  const L4 = 2 * HS;
  const L_lap = L1 + L2 + L3 + L4; // 1232.5132

  const hurdleDists = [45, 80, 115, 150, 185, 220, 255, 290, 325, 360];
  const splitTextElements = [];

  hurdleDists.forEach((d_meters, idx) => {
    const d_lap = (d_meters / 400) * L_lap;
    const pos = getLapPosition(d_lap);

    // Draw tick line perpendicular
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick.setAttribute('x1', (pos.x - 7 * pos.nx).toFixed(1));
    tick.setAttribute('y1', (pos.y - 7 * pos.ny).toFixed(1));
    tick.setAttribute('x2', (pos.x + 7 * pos.nx).toFixed(1));
    tick.setAttribute('y2', (pos.y + 7 * pos.ny).toFixed(1));
    tick.setAttribute('stroke', '#7f8ea3');
    tick.setAttribute('stroke-width', '1.5');
    tick.setAttribute('opacity', '0.8');
    hurdlesG.appendChild(tick);

    // Draw H1-H10 label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', (pos.x + 16 * pos.nx).toFixed(1));
    label.setAttribute('y', (pos.y + 16 * pos.ny + 3).toFixed(1));
    label.setAttribute('text-anchor', 'middle');
    label.textContent = `H${idx + 1}`;
    splitsG.appendChild(label);

    // Draw split value (hidden initially)
    const splitText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    splitText.setAttribute('x', (pos.x + 27 * pos.nx).toFixed(1));
    splitText.setAttribute('y', (pos.y + 27 * pos.ny + 3).toFixed(1));
    splitText.setAttribute('text-anchor', 'middle');
    splitText.setAttribute('font-size', '8');
    splitText.setAttribute('fill', '#7f8ea3');
    splitText.setAttribute('opacity', '0');
    splitText.textContent = TOUCHDOWN_TIMES[idx].toFixed(2);
    splitsG.appendChild(splitText);
    splitTextElements.push(splitText);
  });

  // Worldline path
  const worldlinePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const entryPathD = 'M 400 -150 L 400 60 C 400 180 420 323.4 530 323.4';
  const lapPathD =
    'M 530 323.4 A 113.4 113.4 0 0 0 530 96.6 L 270 96.6 A 113.4 113.4 0 0 0 270 323.4 L 530 323.4';
  const exitPathD = 'M 530 323.4 C 610 323.4 400 360 400 430 L 400 670';
  const d_worldline = `${entryPathD} ${lapPathD} ${exitPathD}`;
  worldlinePath.setAttribute('d', d_worldline);
  worldlinePath.setAttribute('fill', 'none');
  worldlinePath.setAttribute('stroke', '#f2ede6');
  worldlinePath.setAttribute('stroke-width', '2.2');
  worldlinePath.setAttribute('stroke-linecap', 'round');

  svg.appendChild(worldlinePath);

  const measurePath = (pathD) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('visibility', 'hidden');
    svg.appendChild(path);
    const length = path.getTotalLength();
    path.remove();
    return length;
  };
  const renderedEntryLength = measurePath(entryPathD);
  const renderedLapLength = measurePath(lapPathD);
  const renderedExitLength = measurePath(exitPathD);
  const renderedTotalLength = renderedEntryLength + renderedLapLength + renderedExitLength;
  worldlinePath.style.strokeDasharray = renderedTotalLength.toFixed(2);
  worldlinePath.style.strokeDashoffset = renderedTotalLength.toFixed(2);

  // Runner dot
  const runner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  runner.setAttribute('r', '4.5');
  runner.setAttribute('fill', '#ffb547');
  // Initial position at top
  runner.setAttribute('cx', '400');
  runner.setAttribute('cy', '-150');
  svg.appendChild(runner);

  svgWrap.appendChild(svg);
  container.appendChild(svgWrap);

  // Analysis Panel (fades in at finish)
  const analysis = document.createElement('div');
  analysis.className = 'track-analysis';
  analysis.innerHTML = `
    <div class="track-pr-container">
      <div class="track-pr-label">PERSONAL RECORDS</div>
      <a href="https://www.tfrrs.org/athletes/8731395/Stanford/Joseph_Bailey.html" target="_blank" rel="noopener noreferrer" class="track-pr-link">
        400H 52.17 &middot; 400M 49.09i &middot; 200M 22.23i &middot; 60M 7.21i
      </a>
    </div>
    <div class="track-velocity-container">
      <div class="track-velocity-label">INTERVAL VELOCITIES (M/S)</div>
      <svg class="track-chart-svg" viewBox="0 0 300 90">
        <!-- Axes -->
        <line x1="24" y1="10" x2="24" y2="60" stroke="rgba(127,142,163,0.3)" stroke-width="1"/>
        <line x1="24" y1="60" x2="296" y2="60" stroke="rgba(127,142,163,0.3)" stroke-width="1"/>
        
        <!-- Y Axis Labels -->
        <text x="18" y="13" font-family="ui-monospace, monospace" font-size="8" fill="#7f8ea3" text-anchor="end">8.7</text>
        <text x="18" y="63" font-family="ui-monospace, monospace" font-size="8" fill="#7f8ea3" text-anchor="end">6.6</text>
        <text x="18" y="38" font-family="ui-monospace, monospace" font-size="8" fill="rgba(127,142,163,0.5)" text-anchor="end">M/S</text>
        
        <!-- X Axis Labels -->
        <text x="24" y="82" font-family="ui-monospace, monospace" font-size="8" fill="#7f8ea3" text-anchor="middle">0M</text>
        <text x="296" y="82" font-family="ui-monospace, monospace" font-size="8" fill="#7f8ea3" text-anchor="middle">400M</text>
        
        <!-- Axis ticks -->
        <line x1="24" y1="60" x2="24" y2="64" stroke="rgba(127,142,163,0.3)" stroke-width="1"/>
        <line x1="296" y1="60" x2="296" y2="64" stroke="rgba(127,142,163,0.3)" stroke-width="1"/>

        <!-- Ticks for Hurdles on X-axis -->
        <g class="track-chart-axis-ticks"></g>

        <!-- Chart Stepped Path -->
        <path class="track-chart-path" fill="none" stroke="#ffb547" stroke-width="1.5" stroke-linecap="round"/>
        
        <!-- Chart Midpoint Circles -->
        <g class="track-chart-dots"></g>
      </svg>
    </div>
  `;
  container.appendChild(analysis);

  // Populates Chart
  const chartTicks = analysis.querySelector('.track-chart-axis-ticks');
  const chartPath = analysis.querySelector('.track-chart-path');
  const chartDots = analysis.querySelector('.track-chart-dots');

  const minV = Math.min(...INTERVAL_VELOCITIES) - 0.16; // 6.608
  const maxV = Math.max(...INTERVAL_VELOCITIES) + 0.16; // 8.697

  const xForD = (d) => 24 + (d / 400) * 272;
  const yForV = (v) => 60 - ((v - minV) / (maxV - minV)) * 50;

  // Stepped path calculation
  let chartD = '';
  INTERVAL_VELOCITIES.forEach((v, idx) => {
    const xStart = xForD(TRACK_POSITIONS[idx]);
    const xEnd = xForD(TRACK_POSITIONS[idx + 1]);
    const yVal = yForV(v);

    if (idx === 0) {
      chartD += `M ${xStart.toFixed(1)} ${yVal.toFixed(1)}`;
    }
    chartD += ` H ${xEnd.toFixed(1)}`;

    if (idx < INTERVAL_VELOCITIES.length - 1) {
      const yNext = yForV(INTERVAL_VELOCITIES[idx + 1]);
      chartD += ` V ${yNext.toFixed(1)}`;
    }
  });
  chartPath.setAttribute('d', chartD);

  // Midpoint dots and ticks
  TRACK_POSITIONS.forEach((pos, idx) => {
    // Add ticks on the chart's bottom axis
    if (idx > 0 && idx < 11) {
      const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tickLine.setAttribute('x1', xForD(pos).toFixed(1));
      tickLine.setAttribute('y1', '60');
      tickLine.setAttribute('x2', xForD(pos).toFixed(1));
      tickLine.setAttribute('y2', '64');
      tickLine.setAttribute('stroke', 'rgba(127,142,163,0.3)');
      tickLine.setAttribute('stroke-width', '1');
      chartTicks.appendChild(tickLine);
    }
  });

  INTERVAL_VELOCITIES.forEach((v, idx) => {
    const midD = (TRACK_POSITIONS[idx] + TRACK_POSITIONS[idx + 1]) / 2;
    const xVal = xForD(midD);
    const yVal = yForV(v);

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', xVal.toFixed(1));
    dot.setAttribute('cy', yVal.toFixed(1));
    dot.setAttribute('r', '2.8');
    dot.setAttribute('fill', '#f2ede6');
    dot.setAttribute('stroke', '#ffb547');
    dot.setAttribute('stroke-width', '1.2');
    chartDots.appendChild(dot);
  });

  rootEl.appendChild(container);
  rootEl.appendChild(trunkIn);
  rootEl.appendChild(trunkOut);

  let currentTrailingEdge = 0;
  let currentExitAlpha = 0;

  // Bridge the scene-root edge to the SVG's canonical center entry. The
  // lead-in remains part of the path for the whole lap, so this endpoint
  // never drifts sideways away from the center trunk.
  function updateTrunks() {
    const rootRect = rootEl.getBoundingClientRect();
    const point = svg.createSVGPoint();
    const ctm = svg.getScreenCTM();

    if (!ctm || rootRect.height <= 0) {
      trunkIn.style.height = '0px';
      trunkOut.style.height = '0px';
      return;
    }

    const entryAnchor = getEntryPointAtDistance(currentTrailingEdge);
    point.x = entryAnchor.x;
    point.y = entryAnchor.y;
    const entryTop = point.matrixTransform(ctm);
    point.x = 400;
    point.y = 670;
    const exitBottom = point.matrixTransform(ctm);

    const topGap = Math.max(0, entryTop.y - rootRect.top);
    const bottomGap = Math.max(0, rootRect.bottom - exitBottom.y);

    trunkIn.style.top = '0px';
    trunkIn.style.height = `${topGap.toFixed(1)}px`;
    trunkIn.style.transform = 'translateX(-50%)';

    trunkOut.style.bottom = '0px';
    trunkOut.style.height = `${bottomGap.toFixed(1)}px`;
    trunkOut.style.transformOrigin = 'top';
    trunkOut.style.transform = `translateX(-50%) scaleY(${currentExitAlpha.toFixed(3)})`;
  }

  window.addEventListener('resize', updateTrunks);

  function onProgress(p) {
    p = Math.min(1, Math.max(0, p));

    // Map p to strokeDashoffset. The entry segment grows as you scroll into
    // it, off a small floor rather than literal zero: the chapter boundary
    // is a hard cut (sticky positioning swaps content instantly, no blended
    // overlap), so p=0 is the exact frame after the previous chapter showed
    // its line reaching this same screen position - zero here reads as the
    // line vanishing at the seam. The exit segment settles to fully-drawn
    // before p=1 (not exactly at it) so the lerp-smoothed scrub progress has
    // margin to catch up before the sticky handoff into the next chapter,
    // even on a fast scroll.
    const ENTRY_FLOOR = 0.04;
    const EXIT_SETTLE_FRAC = 0.75;
    let leadingEdge = 0;
    let runnerDistance = 0;
    let exitMapped = 0;
    if (p <= P_ENTRY_END) {
      const entryRaw = p / P_ENTRY_END;
      const entryEased = Math.max(ENTRY_FLOOR, entryRaw * entryRaw * (3 - 2 * entryRaw));
      leadingEdge = entryEased * renderedEntryLength;
      runnerDistance = entryRaw * renderedEntryLength;
    } else if (p <= P_LAP_END) {
      const lapProgress = (p - P_ENTRY_END) / (P_LAP_END - P_ENTRY_END);
      leadingEdge = renderedEntryLength + lapProgress * renderedLapLength;
      runnerDistance = leadingEdge;
    } else {
      const exitRaw = (p - P_LAP_END) / (1 - P_LAP_END);
      exitMapped = Math.min(1, exitRaw / EXIT_SETTLE_FRAC);
      leadingEdge = renderedEntryLength + renderedLapLength + exitMapped * renderedExitLength;
      runnerDistance = renderedEntryLength + renderedLapLength + exitRaw * renderedExitLength;
    }

    // Keep the entry lead-in visible. Retracting it moved the SVG endpoint
    // to the right side of the oval while the HTML trunk remained centered,
    // visibly splitting the supposedly invariant worldline.
    const trailingEdge = 0;
    currentTrailingEdge = trailingEdge;
    currentExitAlpha = exitMapped;

    const visibleLen = Math.max(0, leadingEdge - trailingEdge);
    // The gap must safely exceed the path's real rendered length so the dash
    // pattern never wraps around and shows a second, stray fragment near the
    // end of the path (the arc segments' length is a JS approximation, not
    // exact, so this needs real margin, not just a few extra units).
    worldlinePath.style.strokeDasharray = `${visibleLen.toFixed(2)} ${(renderedTotalLength * 3).toFixed(2)}`;
    worldlinePath.style.strokeDashoffset = (-trailingEdge).toFixed(2);

    // 3D Perspective Tilt during entry
    if (!reducedMotion) {
      let tilt = 0;
      if (p < P_ENTRY_END) {
        const progress = p / P_ENTRY_END;
        const eased = 1 - Math.pow(1 - progress, 3);
        tilt = 38 * (1 - eased);
      }
      svgWrap.style.transform = `perspective(900px) rotateX(${tilt}deg)`;
      svgWrap.style.transformOrigin = 'center center';
    } else {
      svgWrap.style.transform = 'none';
    }

    updateTrunks();

    // Get state
    const state = getTrackState(p);
    const runnerPoint = worldlinePath.getPointAtLength(runnerDistance);

    // Update runner dot
    runner.setAttribute('cx', runnerPoint.x.toFixed(1));
    runner.setAttribute('cy', runnerPoint.y.toFixed(1));

    // Update clock and status
    clockEl.textContent = state.time.toFixed(2);
    statusEl.textContent = state.statusText;

    // Update hurdle split visibility
    const hurdles = [45, 80, 115, 150, 185, 220, 255, 290, 325, 360];
    hurdles.forEach((dist, idx) => {
      const splitText = splitTextElements[idx];
      if (splitText) {
        const opacity = Math.min(1, Math.max(0, (state.distance - dist) / 5));
        splitText.setAttribute('opacity', opacity.toFixed(2));
      }
    });

    // Update post-race analysis section opacity
    if (p >= 0.95) {
      const fade = (p - 0.95) / 0.05;
      analysis.style.opacity = fade.toFixed(2);
      analysis.style.visibility = 'visible';
    } else {
      analysis.style.opacity = '0';
      analysis.style.visibility = 'hidden';
    }
  }

  // Set initial state
  onProgress(0);

  return {
    onProgress(p) {
      onProgress(p);
    },
    onParallax(_scrollPx) {
      // no-op for interface parity
    },
    onEnter() {
      // no-op
    },
    onExit() {
      // no-op
    },
    dispose() {
      window.removeEventListener('resize', updateTrunks);
      // Remove dynamically created stylesheet if needed, or let clear handle it
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
      rootEl.innerHTML = '';
    },
  };
}
