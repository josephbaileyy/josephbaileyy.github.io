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

    @keyframes agy-music-spin {
      to { transform: rotate(360deg); }
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

    .agy-music-caption-note {
      display: block;
      margin-top: 0.2rem;
      font-size: 9px;
      letter-spacing: 0.11em;
      color: rgba(127, 142, 163, 0.68);
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

      .agy-music-caption-note {
        font-size: 8px;
        letter-spacing: 0.06em;
      }
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
          <!-- Load Icon -->
          <svg class="agy-music-icon-load" viewBox="0 0 24 24" style="display: none; animation: agy-music-spin 1s linear infinite;">
            <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" fill="currentColor"/>
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
        <span class="agy-music-caption-note">NOTE DATA MACHINE-TRANSCRIBED FROM THE AUDIO</span>
      </div>
    </div>
  `;
  rootEl.appendChild(container);

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  // DOM references
  const canvas = container.querySelector('.agy-music-canvas');
  const ctx = canvas.getContext('2d');
  const playBtn = container.querySelector('.agy-music-play-btn');
  const playIcon = container.querySelector('.agy-music-icon-play');
  const pauseIcon = container.querySelector('.agy-music-icon-pause');
  const loadIcon = container.querySelector('.agy-music-icon-load');
  const timeCurrentEl = container.querySelector('.agy-music-time-current');
  const timeTotalEl = container.querySelector('.agy-music-time-total');
  const speedBtns = [...container.querySelectorAll('.agy-music-speed-btn')];
  const rootStyles = getComputedStyle(document.documentElement);
  const spineX = Number.parseFloat(rootStyles.getPropertyValue('--spine-x')) / 100;
  const spineColor = rootStyles.getPropertyValue('--spine-color').trim();
  const spineWidth = Number.parseFloat(rootStyles.getPropertyValue('--spine-width'));
  const spineGlow = rootStyles.getPropertyValue('--spine-glow').trim();
  const spineGlowMatch = spineGlow.match(
    /drop-shadow\(\s*0(?:px)?\s+0(?:px)?\s+([\d.]+)px\s+(.+)\)$/,
  );
  const spineShadowBlur = Number.parseFloat(spineGlowMatch?.[1] ?? '0');
  const spineShadowColor = spineGlowMatch?.[2]?.trim() ?? spineColor;

  // Scene state
  let notes = [];
  let pitchMin = 36;
  let pitchMax = 84;
  let duration = 126.0;
  let currentTime = 0.0;
  let currentProgress = 0.0; // 0..1 scroll/chapter progress
  let isPlaying = false;
  let audioLoaded = false;
  let isLoading = false;
  let animationFrameId = null;
  let cssWidth = 0;
  let cssHeight = 0;
  const resolvedNotesUrl = notesUrl || deriveSiblingUrl(peaksUrl || audioUrl, 'fugue-notes.json');

  // Audio setup
  const audio = document.createElement('audio');
  audio.preload = 'none';
  container.appendChild(audio);

  // 3. Audio Handlers & Actions
  async function togglePlay() {
    if (isLoading) return;

    if (!audioLoaded) {
      isLoading = true;
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'none';
      loadIcon.style.display = 'block';
      playBtn.setAttribute('aria-label', 'Loading piano recording');

      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        audio.src = URL.createObjectURL(blob);
        audioLoaded = true;
      } catch (err) {
        console.error('Failed to load audio:', err);
        isLoading = false;
        loadIcon.style.display = 'none';
        playIcon.style.display = 'block';
        playBtn.setAttribute('aria-label', 'Play piano recording');
        return; // Abort play on failure
      } finally {
        if (audioLoaded) {
          isLoading = false;
          loadIcon.style.display = 'none';
        }
      }
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
    loadIcon.style.display = 'none';
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    playBtn.setAttribute('aria-label', 'Pause piano recording');
    startAnimationLoop();
  }

  function handlePause() {
    isPlaying = false;
    loadIcon.style.display = 'none';
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
    const cx = cssWidth * spineX;
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

  function worldlineBend(progress) {
    if (reducedMotion) return 1;

    const bendIn = smoothStep((progress - 0.06) / 0.14);
    const bendOut = smoothStep((progress - 0.72) / 0.16);
    return bendIn * (1 - bendOut);
  }

  function musicWorldlinePoint(fraction, hitLineY, progress) {
    const cx = cssWidth * spineX;
    const detour = musicDetourPoint(fraction, hitLineY);
    const bend = worldlineBend(progress);
    const straightY = fraction * cssHeight;
    return {
      x: cx + (detour.x - cx) * bend,
      y: straightY + (detour.y - straightY) * bend,
    };
  }

  // The polyline the scene's own path is drawn as. Both the stroke and the
  // anchor the worldline controller reads are derived from these, so the head
  // it is told about is the pixel that actually got painted.
  const WORLDLINE_STEPS = 180;

  function worldlineHeadFraction() {
    return clamp01((currentProgress - 0.1) / 0.8);
  }

  function worldlinePointAt(index, hitLineY) {
    const fraction = index / WORLDLINE_STEPS;
    const reachedAtProgress = 0.1 + fraction * 0.8;
    const pointProgress = Math.min(currentProgress, reachedAtProgress);
    return musicWorldlinePoint(fraction, hitLineY, pointProgress);
  }

  function worldlineHeadPoint(hitLineY) {
    const headStep = worldlineHeadFraction() * WORLDLINE_STEPS;
    const completeSegments = Math.floor(headStep);
    const partialSegment = headStep - completeSegments;

    if (partialSegment <= 0 || completeSegments >= WORLDLINE_STEPS) {
      return worldlinePointAt(Math.min(completeSegments, WORLDLINE_STEPS), hitLineY);
    }

    const from = worldlinePointAt(completeSegments, hitLineY);
    const to = worldlinePointAt(completeSegments + 1, hitLineY);
    return {
      x: from.x + (to.x - from.x) * partialSegment,
      y: from.y + (to.y - from.y) * partialSegment,
    };
  }

  function drawMusicWorldline(hitLineY) {
    const headFrac = worldlineHeadFraction();

    if (headFrac <= 0) return;

    const completeSegments = Math.floor(headFrac * WORLDLINE_STEPS);

    ctx.save();
    ctx.beginPath();
    const start = worldlinePointAt(0, hitLineY);
    ctx.moveTo(start.x, start.y);

    for (let index = 1; index <= completeSegments; index += 1) {
      const point = worldlinePointAt(index, hitLineY);
      ctx.lineTo(point.x, point.y);
    }

    const head = worldlineHeadPoint(hitLineY);
    ctx.lineTo(head.x, head.y);
    ctx.strokeStyle = spineColor;
    ctx.lineWidth = spineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = spineShadowBlur;
    ctx.shadowColor = spineShadowColor;
    ctx.stroke();
    ctx.restore();
  }

  function smoothStep(value) {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  }

  const blackPitchClasses = new Set([1, 3, 6, 8, 10]);
  let keyboardMetricsCache = null;

  function isBlackPitch(pitch) {
    return blackPitchClasses.has(((pitch % 12) + 12) % 12);
  }

  function getKeyboardMetrics() {
    const cacheKey = `${cssWidth}:${pitchMin}:${pitchMax}`;
    if (keyboardMetricsCache?.cacheKey === cacheKey) {
      return keyboardMetricsCache;
    }

    const edge = Math.max(24, cssWidth * 0.035);
    const firstKeyCenter = cssWidth / 2 + Math.max(18, cssWidth * 0.02);
    const lastKeyCenter = cssWidth - edge;
    const whitePitches = [];

    for (let pitch = pitchMin; pitch <= pitchMax; pitch += 1) {
      if (!isBlackPitch(pitch)) {
        whitePitches.push(pitch);
      }
    }

    const whiteKeyWidth =
      whitePitches.length > 1
        ? (lastKeyCenter - firstKeyCenter) / (whitePitches.length - 1)
        : Math.max(2, lastKeyCenter - firstKeyCenter);
    const keyboardLeft = firstKeyCenter - whiteKeyWidth / 2;
    const blackKeyWidth = Math.max(1, whiteKeyWidth * 0.62);
    const keys = new Map();

    whitePitches.forEach((pitch, index) => {
      keys.set(pitch, {
        pitch,
        isBlack: false,
        x: keyboardLeft + (index + 0.5) * whiteKeyWidth,
        left: keyboardLeft + index * whiteKeyWidth,
        width: whiteKeyWidth,
      });
    });

    let precedingWhiteKeys = 0;
    for (let pitch = pitchMin; pitch <= pitchMax; pitch += 1) {
      if (isBlackPitch(pitch)) {
        const x = keyboardLeft + precedingWhiteKeys * whiteKeyWidth;
        keys.set(pitch, {
          pitch,
          isBlack: true,
          x,
          left: x - blackKeyWidth / 2,
          width: blackKeyWidth,
        });
      } else {
        precedingWhiteKeys += 1;
      }
    }

    keyboardMetricsCache = {
      cacheKey,
      blackKeyWidth,
      keyboardLeft,
      keyboardRight: keyboardLeft + whitePitches.length * whiteKeyWidth,
      keys,
      whiteKeyWidth,
    };
    return keyboardMetricsCache;
  }

  function pitchToX(pitch) {
    return getKeyboardMetrics().keys.get(pitch)?.x ?? cssWidth / 2;
  }

  function getLaneWidth(pitch) {
    const key = getKeyboardMetrics().keys.get(pitch);
    const keyWidth = key?.width ?? getKeyboardMetrics().whiteKeyWidth;
    return Math.max(1.25, Math.min(18, keyWidth * (key?.isBlack ? 0.78 : 0.7)));
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

  function drawPianoKeyboard(renderTime, hitLineY, alpha) {
    if (alpha <= 0) return;

    const metrics = getKeyboardMetrics();
    const activeNotes = notes.filter((note) => renderTime >= note.start && renderTime <= note.end);
    const activePitches = new Map();
    for (const note of activeNotes) {
      const current = activePitches.get(note.pitch);
      if (!current || (note.velocity || 0) > (current.velocity || 0)) {
        activePitches.set(note.pitch, note);
      }
    }

    const keyboardY = hitLineY + 1;
    const availableHeight = Math.max(24, cssHeight - keyboardY - 7);
    const keyboardHeight = Math.min(Math.max(48, cssHeight * 0.18), 94, availableHeight);
    const blackKeyHeight = keyboardHeight * 0.62;
    const pressedOffset = Math.min(2.5, keyboardHeight * 0.035);
    const baseWhiteGradient = ctx.createLinearGradient(0, keyboardY, 0, keyboardY + keyboardHeight);
    baseWhiteGradient.addColorStop(0, '#f2efe8');
    baseWhiteGradient.addColorStop(0.72, '#d7d1c8');
    baseWhiteGradient.addColorStop(1, '#aaa39a');
    const baseBlackGradient = ctx.createLinearGradient(0, keyboardY, 0, keyboardY + blackKeyHeight);
    baseBlackGradient.addColorStop(0, '#36312d');
    baseBlackGradient.addColorStop(0.18, '#1c1917');
    baseBlackGradient.addColorStop(1, '#070606');

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 14;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
    ctx.fillStyle = '#090807';
    ctx.fillRect(
      metrics.keyboardLeft - 2,
      keyboardY - 2,
      metrics.keyboardRight - metrics.keyboardLeft + 4,
      keyboardHeight + 5,
    );
    ctx.shadowBlur = 0;

    for (let pitch = pitchMin; pitch <= pitchMax; pitch += 1) {
      const key = metrics.keys.get(pitch);
      if (!key || key.isBlack) continue;

      const activeNote = activePitches.get(pitch);
      const offset = activeNote ? pressedOffset : 0;
      const hue = 34 + ((pitch - pitchMin) / Math.max(1, pitchMax - pitchMin)) * 150;

      ctx.fillStyle = activeNote ? `hsl(${hue}, 76%, 61%)` : baseWhiteGradient;
      ctx.fillRect(key.left, keyboardY + offset, key.width, keyboardHeight);
      ctx.strokeStyle = activeNote ? `hsla(${hue}, 72%, 28%, 0.72)` : 'rgba(20, 16, 13, 0.42)';
      ctx.lineWidth = 1;
      ctx.strokeRect(key.left + 0.5, keyboardY + offset + 0.5, key.width, keyboardHeight - 1);

      if (activeNote) {
        ctx.fillStyle = `hsla(${hue}, 78%, 23%, 0.58)`;
        ctx.fillRect(key.left + 1, keyboardY + offset, Math.max(0, key.width - 2), 2);
      }
    }

    for (let pitch = pitchMin; pitch <= pitchMax; pitch += 1) {
      const key = metrics.keys.get(pitch);
      if (!key?.isBlack) continue;

      const activeNote = activePitches.get(pitch);
      const offset = activeNote ? pressedOffset : 0;
      const hue = 34 + ((pitch - pitchMin) / Math.max(1, pitchMax - pitchMin)) * 150;

      ctx.fillStyle = activeNote ? `hsl(${hue}, 82%, 43%)` : baseBlackGradient;
      ctx.shadowBlur = activeNote ? 8 : 3;
      ctx.shadowColor = activeNote ? `hsla(${hue}, 92%, 58%, 0.48)` : 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(key.left, keyboardY + offset, key.width, blackKeyHeight);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = activeNote ? `hsla(${hue}, 86%, 22%, 0.84)` : 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(key.left + 0.5, keyboardY + offset + 0.5, key.width - 1, blackKeyHeight - 1);

      if (activeNote) {
        ctx.fillStyle = `hsla(${hue}, 88%, 18%, 0.72)`;
        ctx.fillRect(key.left + 1, keyboardY + offset, Math.max(0, key.width - 2), 2);
      }
    }

    ctx.restore();
  }

  function drawFallingNotes(renderTime, hitLineY, alpha) {
    if (alpha <= 0 || notes.length === 0) return;

    const lookAheadSeconds = reducedMotion ? 10.5 : 5.6;
    const trailSeconds = reducedMotion ? 2.4 : 1.15;
    const pixelsPerSecond = Math.max(34, hitLineY / lookAheadSeconds);
    const flashWindow = 0.2;

    ctx.save();
    ctx.globalAlpha = alpha;

    for (const note of notes) {
      if (note.start > renderTime + lookAheadSeconds || note.end < renderTime - trailSeconds) {
        continue;
      }

      const x = pitchToX(note.pitch);
      const laneWidth = getLaneWidth(note.pitch);
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

  function getHitLineY() {
    return Math.max(150, cssHeight * 0.78);
  }

  /**
   * The worldline contract (see WORLDLINE.md). This scene owns exactly the
   * oscillating path it paints on the canvas: it starts at canvas y = 0 and
   * ends at canvas y = cssHeight, both on the centre line, so the anchors are
   * the canvas box itself plus the live tip. The canvas bitmap is stretched to
   * the element box, so drawn Y is scaled by rect.height / cssHeight rather
   * than assumed equal - a resize the ResizeObserver has not delivered yet
   * would otherwise report a head a few pixels off the painted one.
   */
  function getAnchors() {
    if (!canvas || cssHeight <= 0) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) {
      return null;
    }

    // Only claim the line once the chapter has pinned. Before that the sticky
    // is still sliding up from the bottom of the viewport with nothing drawn on
    // it, and claiming ownership would drag the head backwards up the screen as
    // the canvas rose.
    if (rootEl.getBoundingClientRect().top > 0) {
      return null;
    }

    const scale = rect.height / cssHeight;

    return {
      active: true,
      entryY: rect.top,
      exitY: rect.bottom,
      headY: rect.top + worldlineHeadPoint(getHitLineY()).y * scale,
    };
  }

  function draw() {
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const hitLineY = getHitLineY();

    // Morph one continuous top-to-bottom path into the piano roll and back.
    // The old independent entry, horizontal, and exit segments visibly
    // separated whenever the scroll moved faster than their staggered cues.
    const bend = worldlineBend(currentProgress);
    const rollAlpha = reducedMotion ? 0.9 : bend;
    const renderTime =
      reducedMotion && !isPlaying && currentTime <= 0.01 ? duration * 0.36 : currentTime;

    drawPitchGrid(hitLineY, rollAlpha);
    drawPianoKeyboard(renderTime, hitLineY, rollAlpha);
    drawFallingNotes(renderTime, hitLineY, rollAlpha);
    drawMusicWorldline(hitLineY);
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
    getAnchors,
    getDebugState() {
      return {
        currentTime,
        duration,
        hitLineY: getHitLineY(),
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

      // Clear refs to avoid leaks
      notes = null;
    },
  };
}
