/**
 * Chapter 5 scene module — Music (the line learns to become a voice)
 * Self-contained module rendering Joseph Bailey's piano recording (Bach, Fugue in C minor) as falling note lanes
 * and managing minimal custom audio playback.
 */

export function createScene(rootEl, { reducedMotion = false, audioUrl, notesUrl, peaksUrl } = {}) {
  // 1. Inject Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .agy-music-scene {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 380px;
      background-color: #120d0b;
      color: #f2ede6;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      padding: 3rem 2rem;
      user-select: none;
    }

    .agy-music-canvas-container {
      flex-grow: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      margin-bottom: 2rem;
    }

    .agy-music-canvas {
      width: 100%;
      height: clamp(300px, 58vh, 520px);
      display: block;
      cursor: ew-resize;
    }

    .agy-music-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .agy-music-controls-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .agy-music-play-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1.5px solid rgba(242, 237, 230, 0.35);
      background: transparent;
      color: #f2ede6;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      box-sizing: border-box;
    }

    .agy-music-play-btn:hover {
      border-color: #ffb547;
      color: #ffb547;
      box-shadow: 0 0 12px rgba(255, 181, 71, 0.25);
      transform: scale(1.05);
    }

    .agy-music-play-btn:focus-visible {
      border-color: #ffb547;
      box-shadow: 0 0 0 3px rgba(255, 181, 71, 0.4);
    }

    .agy-music-play-btn svg {
      width: 16px;
      height: 16px;
    }

    .agy-music-time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 11px;
      letter-spacing: 0.1em;
      color: #7f8ea3;
    }

    .agy-music-time-current {
      color: #ffb547;
      font-weight: 500;
    }

    .agy-music-caption {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 11px;
      letter-spacing: 0.15em;
      color: #7f8ea3;
      line-height: 1.6;
    }

    .agy-music-link {
      color: #f2ede6;
      text-decoration: none;
      border-bottom: 1px dashed rgba(242, 237, 230, 0.3);
      margin-left: 0.5rem;
      transition: all 0.2s ease-in-out;
      white-space: nowrap;
    }

    .agy-music-link:hover {
      color: #ffb547;
      border-bottom-color: #ffb547;
    }

    .agy-music-speeds {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .agy-music-speed-btn {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 10px;
      letter-spacing: 0.05em;
      color: #7f8ea3;
      background: transparent;
      border: 1px solid rgba(242, 237, 230, 0.2);
      border-radius: 3px;
      padding: 3px 7px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }

    .agy-music-speed-btn:hover {
      color: #f2ede6;
      border-color: rgba(255, 181, 71, 0.5);
    }

    .agy-music-speed-btn:focus-visible {
      border-color: #ffb547;
      box-shadow: 0 0 0 2px rgba(255, 181, 71, 0.3);
    }

    .agy-music-speed-btn.is-active {
      color: #ffb547;
      border-color: #ffb547;
      background: rgba(255, 181, 71, 0.08);
    }

    @media (max-width: 768px) {
      .agy-music-scene {
        padding: 2rem 1.2rem 1.25rem;
      }

      .agy-music-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .agy-music-controls-left {
        width: 100%;
        flex-wrap: wrap;
        gap: 0.65rem;
      }

      .agy-music-play-btn {
        width: 40px;
        height: 40px;
      }

      .agy-music-speeds {
        gap: 0.3rem;
      }

      .agy-music-caption {
        max-width: 100%;
        font-size: 9px;
        letter-spacing: 0.08em;
      }
    }
    .music-trunk {
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

  // 2. Build DOM structure
  const container = document.createElement('div');
  container.className = 'agy-music-scene';
  container.innerHTML = `
    <div class="agy-music-canvas-container">
      <canvas class="agy-music-canvas"></canvas>
    </div>
    <div class="agy-music-controls">
      <div class="agy-music-controls-left">
        <button class="agy-music-play-btn" aria-label="Play piano recording" type="button">
          <!-- Play Icon -->
          <svg class="agy-music-icon-play" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" fill="currentColor"/>
          </svg>
          <!-- Pause Icon -->
          <svg class="agy-music-icon-pause" viewBox="0 0 24 24" style="display: none;">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>
          </svg>
        </button>
        <div class="agy-music-time" aria-live="polite">
          <span class="agy-music-time-current">T+ 0:00.0</span> / <span class="agy-music-time-total">2:05</span>
        </div>
        <div class="agy-music-speeds" role="group" aria-label="Playback speed">
          <button class="agy-music-speed-btn is-active" type="button" data-speed="1">1x</button>
          <button class="agy-music-speed-btn" type="button" data-speed="1.25">1.25x</button>
          <button class="agy-music-speed-btn" type="button" data-speed="1.5">1.5x</button>
          <button class="agy-music-speed-btn" type="button" data-speed="2">2x</button>
        </div>
      </div>
      <div class="agy-music-caption">
        J.S. BACH — FUGUE IN C MINOR / PIANO: JOSEPH BAILEY
      </div>
    </div>
  `;
  rootEl.appendChild(container);

  // Bridging trunks: the controls row (and the scene's own top padding) are
  // flex siblings of the canvas, so the canvas's fixed 160px height never
  // reaches the scene-root's true top/bottom edges - measured against the
  // neighboring chapters' lines (which do reach their true edges), that
  // reads as a visible gap. These close it by spanning from the scene-root
  // edge to wherever the canvas itself actually starts/ends on screen.
  const trunkIn = document.createElement('div');
  trunkIn.className = 'music-trunk';
  const trunkOut = document.createElement('div');
  trunkOut.className = 'music-trunk';
  rootEl.appendChild(trunkIn);
  rootEl.appendChild(trunkOut);

  function updateTrunks() {
    const rootRect = rootEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    if (rootRect.height <= 0) {
      return;
    }

    const topGap = Math.max(0, canvasRect.top - rootRect.top);
    const bottomGap = Math.max(0, rootRect.bottom - canvasRect.bottom);

    trunkIn.style.top = '0px';
    trunkIn.style.height = `${topGap.toFixed(1)}px`;
    trunkIn.style.transform = 'translateX(-50%)';

    trunkOut.style.bottom = '0px';
    trunkOut.style.height = `${bottomGap.toFixed(1)}px`;
    trunkOut.style.transform = 'translateX(-50%)';
  }

  // DOM references
  const canvas = container.querySelector('.agy-music-canvas');
  const ctx = canvas.getContext('2d');
  const playBtn = container.querySelector('.agy-music-play-btn');
  const playIcon = container.querySelector('.agy-music-icon-play');
  const pauseIcon = container.querySelector('.agy-music-icon-pause');
  const timeCurrentEl = container.querySelector('.agy-music-time-current');
  const timeTotalEl = container.querySelector('.agy-music-time-total');
  const speedBtns = [...container.querySelectorAll('.agy-music-speed-btn')];

  // Scene state
  let notes = [];
  let pitchMin = 36;
  let pitchMax = 84;
  let duration = 126.0;
  let currentTime = 0.0;
  let currentProgress = 0.0; // 0..1 scroll/chapter progress
  let isPlaying = false;
  let audioLoaded = false;
  let animationFrameId = null;
  let cssWidth = 0;
  let cssHeight = 0;
  const resolvedNotesUrl = notesUrl || deriveSiblingUrl(peaksUrl || audioUrl, 'fugue-notes.json');

  // Audio setup
  const audio = document.createElement('audio');
  audio.preload = 'none';
  container.appendChild(audio);

  // 3. Audio Handlers & Actions
  function togglePlay() {
    if (!audioLoaded) {
      audio.src = audioUrl;
      audio.load();
      audioLoaded = true;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('Audio play failed:', err);
      });
    }
  }

  function handlePlay() {
    isPlaying = true;
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    playBtn.setAttribute('aria-label', 'Pause piano recording');
    startAnimationLoop();
  }

  function handlePause() {
    isPlaying = false;
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    playBtn.setAttribute('aria-label', 'Play piano recording');
    stopAnimationLoop();
    draw();
  }

  // Define these variables so references are resolved
  let resizeObserver = null;

  function handleEnded() {
    audio.currentTime = 0;
    handlePause();
  }

  function handleTimeUpdate() {
    currentTime = audio.currentTime;
    updateReadout();
    if (!isPlaying) {
      draw(); // Draw static state if paused
    }
  }

  function handleDurationChange() {
    if (audio.duration && !isNaN(audio.duration)) {
      duration = audio.duration;
      updateReadout();
    }
  }

  // Bind audio listeners
  audio.addEventListener('play', handlePlay);
  audio.addEventListener('pause', handlePause);
  audio.addEventListener('ended', handleEnded);
  audio.addEventListener('timeupdate', handleTimeUpdate);
  audio.addEventListener('durationchange', handleDurationChange);

  // Bind button listeners
  playBtn.addEventListener('click', togglePlay);

  speedBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const rate = Number(btn.dataset.speed) || 1;
      audio.playbackRate = rate;
      speedBtns.forEach((other) => other.classList.toggle('is-active', other === btn));
    });
  });

  // Canvas interaction: preserve click-to-seek even though x now also maps to pitch.
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = progress * duration;
    if (audioLoaded) {
      audio.currentTime = seekTime;
      currentTime = audio.currentTime;
    } else {
      currentTime = seekTime;
    }
    updateReadout();
    draw();
  });

  // 4. Formatting Helpers
  function deriveSiblingUrl(url, filename) {
    if (!url) return filename;

    try {
      return new URL(filename, url).href;
    } catch {
      return String(url).replace(/[^/?#]+(?=([?#]|$))/, filename);
    }
  }

  function formatCurrentTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const tenths = Math.floor((t % 1) * 10);
    return `T+ ${m}:${s.toString().padStart(2, '0')}.${tenths}`;
  }

  function formatDuration(d) {
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updateReadout() {
    timeCurrentEl.textContent = formatCurrentTime(currentTime);
    timeTotalEl.textContent = formatDuration(duration);
  }

  // 5. Drawing & Animation
  function cubicPoint(a, b, c, d, t) {
    const mt = 1 - t;
    return {
      x: mt ** 3 * a.x + 3 * mt ** 2 * t * b.x + 3 * mt * t ** 2 * c.x + t ** 3 * d.x,
      y: mt ** 3 * a.y + 3 * mt ** 2 * t * b.y + 3 * mt * t ** 2 * c.y + t ** 3 * d.y,
    };
  }

  function musicDetourPoint(fraction, hitLineY) {
    const cx = cssWidth / 2;
    const edge = Math.max(24, cssWidth * 0.035);
    const left = cx;
    const rightEdge = cssWidth - edge;
    const turnRadius = Math.min(64, cssWidth * 0.05, (cssHeight - hitLineY) * 0.35);
    const horizontalEnd = rightEdge - turnRadius;

    if (fraction <= 0.32) {
      return cubicPoint(
        { x: cx, y: 0 },
        { x: cx, y: hitLineY * 0.4 },
        { x: cx - cssWidth * 0.08, y: hitLineY },
        { x: left, y: hitLineY },
        fraction / 0.32,
      );
    }

    if (fraction <= 0.68) {
      const t = (fraction - 0.32) / 0.36;
      return { x: left + (horizontalEnd - left) * t, y: hitLineY };
    }

    if (fraction <= 0.78) {
      const t = (fraction - 0.68) / 0.1;
      return cubicPoint(
        { x: horizontalEnd, y: hitLineY },
        { x: horizontalEnd + turnRadius * 0.62, y: hitLineY },
        { x: rightEdge, y: hitLineY + turnRadius * 0.38 },
        { x: rightEdge, y: hitLineY + turnRadius },
        t,
      );
    }

    const cornerY = hitLineY + turnRadius;
    const remaining = cssHeight - cornerY;
    const tail = Math.min(36, remaining * 0.45);
    const tailStartY = cssHeight - tail;

    if (fraction <= 0.95) {
      return cubicPoint(
        { x: rightEdge, y: cornerY },
        { x: rightEdge, y: cornerY + remaining * 0.24 },
        { x: cx, y: tailStartY - remaining * 0.28 },
        { x: cx, y: tailStartY },
        (fraction - 0.78) / 0.17,
      );
    }

    const t = (fraction - 0.95) / 0.05;
    return { x: cx, y: tailStartY + tail * t };
  }

  function drawMusicWorldline(hitLineY, bend) {
    const cx = cssWidth / 2;
    const steps = 180;

    ctx.save();
    ctx.beginPath();
    for (let index = 0; index <= steps; index += 1) {
      const fraction = index / steps;
      const detour = musicDetourPoint(fraction, hitLineY);
      const x = cx + (detour.x - cx) * bend;
      const straightY = fraction * cssHeight;
      const y = straightY + (detour.y - straightY) * bend;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#e8ecf1';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(232, 236, 241, 0.32)';
    ctx.stroke();
    ctx.restore();
  }

  function smoothStep(value) {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  }

  function pitchToX(pitch) {
    const edge = Math.max(24, cssWidth * 0.035);
    const left = cssWidth / 2 + Math.max(18, cssWidth * 0.02);
    const right = cssWidth - edge;
    const span = Math.max(1, pitchMax - pitchMin);
    return left + ((pitch - pitchMin) / span) * (right - left);
  }

  function getLaneWidth() {
    const pitchCount = Math.max(1, pitchMax - pitchMin + 1);
    return Math.max(3, Math.min(18, ((cssWidth * 0.42) / pitchCount) * 0.72));
  }

  function drawPitchGrid(hitLineY, alpha) {
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;

    for (let pitch = pitchMin; pitch <= pitchMax; pitch++) {
      const pitchClass = pitch % 12;
      const isC = pitchClass === 0;
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitchClass);
      const x = pitchToX(pitch);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hitLineY + 22);
      ctx.strokeStyle = isC
        ? 'rgba(232, 236, 241, 0.12)'
        : isBlackKey
          ? 'rgba(127, 142, 163, 0.055)'
          : 'rgba(242, 237, 230, 0.035)';
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFallingNotes(renderTime, hitLineY, alpha) {
    if (alpha <= 0 || notes.length === 0) return;

    const lookAheadSeconds = reducedMotion ? 10.5 : 5.6;
    const trailSeconds = reducedMotion ? 2.4 : 1.15;
    const pixelsPerSecond = Math.max(34, hitLineY / lookAheadSeconds);
    const laneWidth = getLaneWidth();
    const flashWindow = 0.2;

    ctx.save();
    ctx.globalAlpha = alpha;

    for (const note of notes) {
      if (note.start > renderTime + lookAheadSeconds || note.end < renderTime - trailSeconds) {
        continue;
      }

      const x = pitchToX(note.pitch);
      const noteBottom = hitLineY - (note.start - renderTime) * pixelsPerSecond;
      const noteTop = hitLineY - (note.end - renderTime) * pixelsPerSecond;
      const top = Math.min(noteTop, noteBottom);
      const bottom = Math.max(noteTop, noteBottom);

      if (bottom < -24 || top > cssHeight + 24) {
        continue;
      }

      const visibleTop = Math.max(-24, top);
      const visibleBottom = Math.min(cssHeight + 24, bottom);
      const height = Math.max(3, visibleBottom - visibleTop);
      const active = renderTime >= note.start && renderTime <= note.end;
      const justHit = renderTime >= note.start && renderTime <= note.start + flashWindow;
      const velocity = Math.max(0.2, note.velocity || 0.45);
      const hue = 34 + ((note.pitch - pitchMin) / Math.max(1, pitchMax - pitchMin)) * 150;
      const saturation = active ? 86 : 58;
      const lightness = active ? 64 : 45 + velocity * 16;
      const alphaBase = active ? 0.95 : 0.34 + velocity * 0.36;

      ctx.beginPath();
      ctx.roundRect(x - laneWidth / 2, visibleTop, laneWidth, height, Math.min(4, laneWidth / 2));
      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alphaBase})`;
      ctx.shadowBlur = active ? 14 + velocity * 12 : 0;
      ctx.shadowColor = active ? `hsla(${hue}, 92%, 62%, 0.55)` : 'transparent';
      ctx.fill();

      if (justHit) {
        const flash = 1 - (renderTime - note.start) / flashWindow;
        ctx.beginPath();
        ctx.arc(x, hitLineY, 7 + flash * 14 + velocity * 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 181, 71, ${0.1 + flash * 0.34})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(255, 181, 71, 0.45)';
        ctx.fill();
      }
    }

    const activeNotes = notes.filter((note) => renderTime >= note.start && renderTime <= note.end);
    if (activeNotes.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const note of activeNotes) {
        const x = pitchToX(note.pitch);
        ctx.beginPath();
        ctx.arc(x, hitLineY, 3 + (note.velocity || 0.45) * 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 181, 71, 0.68)';
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(255, 181, 71, 0.55)';
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  function draw() {
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const hitLineY = Math.max(150, cssHeight * 0.78);

    // Morph one continuous top-to-bottom path into the piano roll and back.
    // The old independent entry, horizontal, and exit segments visibly
    // separated whenever the scroll moved faster than their staggered cues.
    const bendIn = reducedMotion ? 1 : smoothStep((currentProgress - 0.06) / 0.14);
    const bendOut = reducedMotion ? 0 : smoothStep((currentProgress - 0.72) / 0.16);
    const bend = bendIn * (1 - bendOut);
    const rollAlpha = reducedMotion ? 0.9 : bend;
    const renderTime =
      reducedMotion && !isPlaying && currentTime <= 0.01 ? duration * 0.36 : currentTime;

    drawPitchGrid(hitLineY, rollAlpha);
    drawFallingNotes(renderTime, hitLineY, rollAlpha);
    drawMusicWorldline(hitLineY, bend);

    updateTrunks();
  }

  function startAnimationLoop() {
    if (animationFrameId) return;
    function tick() {
      currentTime = audio.currentTime;
      updateReadout();
      draw();
      animationFrameId = requestAnimationFrame(tick);
    }
    animationFrameId = requestAnimationFrame(tick);
  }

  function stopAnimationLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // 6. Resize Handling (Retina/High-DPI aware)
  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    updateTrunks();
    draw();
  }

  // Setup ResizeObserver (fallback to window resize)
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }

  // 7. Load transcribed note data
  fetch(resolvedNotesUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      notes = Array.isArray(data.notes) ? data.notes : [];
      duration = data.duration || 126.0;
      if (notes.length > 0) {
        pitchMin = Math.min(...notes.map((note) => note.pitch));
        pitchMax = Math.max(...notes.map((note) => note.pitch));
      }
      updateReadout();
      draw();
    })
    .catch((err) => {
      console.error('Failed to load fugue note JSON data:', err);
    });

  // Initial resize to set dimensions
  // Defer slightly to ensure bounding box layout has stabilized
  setTimeout(resize, 0);

  // Return Scene Object
  return {
    onProgress(p) {
      currentProgress = Math.max(0, Math.min(1, p));
      draw();
    },
    seekTo(time) {
      const nextTime = Math.max(0, Math.min(duration, Number(time) || 0));
      if (audioLoaded) {
        audio.currentTime = nextTime;
      }
      currentTime = nextTime;
      updateReadout();
      draw();
    },
    getDebugState() {
      return {
        currentTime,
        duration,
        hitLineY: Math.max(150, cssHeight * 0.78),
        noteCount: notes.length,
        pitchMin,
        pitchMax,
      };
    },
    onParallax(_scrollPx) {
      // Interface parity
    },
    onEnter() {
      // Activated state
    },
    onExit() {
      // Pause audio on exit
      if (isPlaying) {
        audio.pause();
      }
    },
    dispose() {
      // Pause audio
      audio.pause();
      stopAnimationLoop();

      // Clean up event listeners
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);

      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', resize);
      }

      // Remove style and container from DOM
      styleEl.remove();
      container.remove();
      trunkIn.remove();
      trunkOut.remove();

      // Clear refs to avoid leaks
      notes = null;
    },
  };
}
