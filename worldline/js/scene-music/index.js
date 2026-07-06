/**
 * Chapter 5 scene module — Music (the line learns to oscillate)
 * Self-contained module rendering Joseph Bailey's piano recording (Bach, Fugue in C minor) as a waveform
 * and managing minimal custom audio playback.
 */

export function createScene(rootEl, { reducedMotion = false, audioUrl, peaksUrl } = {}) {
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
      height: 160px;
      display: block;
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

    @media (max-width: 768px) {
      .agy-music-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 1.25rem;
      }
      
      .agy-music-caption {
        font-size: 10px;
        letter-spacing: 0.1em;
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
        </button>
        <div class="agy-music-time" aria-live="polite">
          <span class="agy-music-time-current">T+ 0:00.0</span> / <span class="agy-music-time-total">2:05</span>
        </div>
      </div>
      <div class="agy-music-caption">
        J.S. BACH — FUGUE IN C MINOR / PIANO: JOSEPH BAILEY
      </div>
    </div>
  `;
  rootEl.appendChild(container);

  // DOM references
  const canvas = container.querySelector('.agy-music-canvas');
  const ctx = canvas.getContext('2d');
  const playBtn = container.querySelector('.agy-music-play-btn');
  const playIcon = container.querySelector('.agy-music-icon-play');
  const pauseIcon = container.querySelector('.agy-music-icon-pause');
  const timeCurrentEl = container.querySelector('.agy-music-time-current');
  const timeTotalEl = container.querySelector('.agy-music-time-total');

  // Scene state
  let peaks = [];
  let duration = 126.0;
  let currentTime = 0.0;
  let currentProgress = 0.0; // 0..1 scroll/chapter progress
  let isPlaying = false;
  let audioLoaded = false;
  let animationFrameId = null;
  let cssWidth = 0;
  let cssHeight = 0;

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
      audio.play().catch(err => {
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

  // Canvas interaction: Clicking canvas seeks audio if loaded
  canvas.addEventListener('click', (e) => {
    if (!audioLoaded) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = progress * duration;
    currentTime = audio.currentTime;
    updateReadout();
    draw();
  });

  // 4. Formatting Helpers
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
  function drawCanonicalLine(x, y1, y2) {
    if (Math.abs(y1 - y2) < 0.1) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.strokeStyle = '#e8ecf1';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(232, 236, 241, 0.32)';
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const cx = cssWidth / 2;
    const centerY = cssHeight / 2;

    let t_entry = 1;
    let t_exit = 0;
    if (!reducedMotion) {
      // Entry: p=0.10 to p=0.20
      t_entry = Math.max(0, Math.min(1, (currentProgress - 0.10) / 0.10));
      t_entry = t_entry * t_entry * (3 - 2 * t_entry);

      // Exit: p=0.75 to p=0.85
      t_exit = Math.max(0, Math.min(1, (currentProgress - 0.75) / 0.10));
      t_exit = t_exit * t_exit * (3 - 2 * t_exit);
    }

    const horizMinX = cx - cx * t_entry * (1 - t_exit);
    const horizMaxX = cx + (cssWidth - cx) * t_entry * (1 - t_exit);

    if (peaks.length === 0) {
      // Draw horizontal centerline if peaks haven't loaded yet
      if (horizMaxX > horizMinX) {
        ctx.beginPath();
        ctx.moveTo(horizMinX, centerY);
        ctx.lineTo(horizMaxX, centerY);
        ctx.strokeStyle = 'rgba(242, 237, 230, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw vertical entry/exit lines
      if (reducedMotion) {
        drawCanonicalLine(cx, 0, centerY);
        drawCanonicalLine(cx, centerY, cssHeight);
      } else {
        if (t_entry < 1) drawCanonicalLine(cx, centerY * t_entry, centerY);
        if (t_exit > 0) drawCanonicalLine(cx, centerY, centerY + t_exit * (cssHeight - centerY));
      }
      return;
    }

    const maxAmplitude = cssHeight * 0.38;

    // Morph progress (only if reducedMotion is false, otherwise fully formed)
    const morphProgress = reducedMotion ? 1 : Math.min(1, currentProgress / 0.3);

    // Playback progress (0..1)
    const playProgress = duration > 0 ? currentTime / duration : 0;
    const playheadX = playProgress * cssWidth;

    // Compute RMS from current audio peaks for playhead/centerline glow
    let rms = 0;
    if (isPlaying && peaks.length > 0) {
      const currentIndex = playProgress * peaks.length;
      const windowSize = 24; // 24 peak window
      const startIdx = Math.max(0, Math.floor(currentIndex - windowSize / 2));
      const endIdx = Math.min(peaks.length - 1, Math.floor(currentIndex + windowSize / 2));
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j <= endIdx; j++) {
        sum += peaks[j] * peaks[j];
        count++;
      }
      if (count > 0) {
        rms = Math.sqrt(sum / count);
      }
    }

    // Draw active centerline glow (thicker semi-transparent line behind the centerline)
    if (isPlaying && rms > 0 && playheadX > 0) {
      const glowStartX = Math.max(horizMinX, 0);
      const glowEndX = Math.min(horizMaxX, playheadX);
      if (glowEndX > glowStartX) {
        ctx.beginPath();
        ctx.moveTo(glowStartX, centerY);
        ctx.lineTo(glowEndX, centerY);
        ctx.strokeStyle = `rgba(255, 181, 71, ${0.05 + rms * 0.35})`;
        ctx.lineWidth = 2 + rms * 12;
        ctx.stroke();
      }
    }

    // Draw peaks as thin vertical strokes
    const numPeaks = peaks.length;
    for (let i = 0; i < numPeaks; i++) {
      const peak = peaks[i];
      const x = (i / (numPeaks - 1)) * cssWidth;

      // Morph factor for this peak
      let factor = 1;
      if (!reducedMotion) {
        // Starts growing from left-to-right as morphProgress goes 0 -> 1
        const startMorph = (i / (numPeaks - 1)) * 0.7;
        const endMorph = startMorph + 0.3;
        if (morphProgress >= endMorph) {
          factor = 1;
        } else if (morphProgress <= startMorph) {
          factor = 0;
        } else {
          const linearFactor = (morphProgress - startMorph) / 0.3;
          // smoothstep easing
          factor = linearFactor * linearFactor * (3 - 2 * linearFactor);
        }
      }

      const h = peak * maxAmplitude * factor;

      if (h > 0.5) { // Only draw if visible
        ctx.beginPath();
        ctx.moveTo(x, centerY - h);
        ctx.lineTo(x, centerY + h);

        if (x <= playheadX && playProgress > 0) {
          ctx.strokeStyle = '#ffb547'; // amber for played peaks
        } else {
          ctx.strokeStyle = 'rgba(242, 237, 230, 0.12)'; // dim warm white for remaining peaks
        }
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw active centerline (Amber #ffb547)
    if (playheadX > 0) {
      const activeStartX = Math.max(horizMinX, 0);
      const activeEndX = Math.min(horizMaxX, playheadX);
      if (activeEndX > activeStartX) {
        ctx.beginPath();
        ctx.moveTo(activeStartX, centerY);
        ctx.lineTo(activeEndX, centerY);
        ctx.strokeStyle = '#ffb547';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw inactive centerline (Warm white #f2ede6, slightly brighter than background peaks)
    const inactiveStartX = Math.max(horizMinX, playheadX);
    const inactiveEndX = Math.min(horizMaxX, cssWidth);
    if (inactiveEndX > inactiveStartX) {
      ctx.beginPath();
      ctx.moveTo(inactiveStartX, centerY);
      ctx.lineTo(inactiveEndX, centerY);
      ctx.strokeStyle = 'rgba(242, 237, 230, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw playhead indicator (Small glowing amber circle)
    if (playProgress > 0 && playProgress < 1 && playheadX >= horizMinX && playheadX <= horizMaxX) {
      // Glow circle
      if (isPlaying && rms > 0) {
        ctx.beginPath();
        ctx.arc(playheadX, centerY, 4 + rms * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 181, 71, ${0.15 + rms * 0.4})`;
        ctx.fill();
      }
      // Inner circle
      ctx.beginPath();
      ctx.arc(playheadX, centerY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffb547';
      ctx.fill();
    }

    // Draw vertical entry/exit lines
    if (reducedMotion) {
      drawCanonicalLine(cx, 0, centerY);
      drawCanonicalLine(cx, centerY, cssHeight);
    } else {
      if (t_entry < 1) drawCanonicalLine(cx, centerY * t_entry, centerY);
      if (t_exit > 0) drawCanonicalLine(cx, centerY, centerY + t_exit * (cssHeight - centerY));
    }
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

  // 7. Load Peaks Data
  fetch(peaksUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      peaks = data.peaks || [];
      duration = data.duration || 126.0;
      updateReadout();
      draw();
    })
    .catch(err => {
      console.error('Failed to load peaks JSON data:', err);
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
    onParallax(scrollPx) {
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
      peaks = null;
    }
  };
}
