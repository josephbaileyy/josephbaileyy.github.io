// Falling-note piano roll for the music card. The note list is a transcription
// of the recording itself, so it follows the performance's own timing. Nothing
// is fetched until the visitor presses play.

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
const LOOKAHEAD_S = 2.4;
const MAX_EXTRAPOLATION_S = 0.25;
// Draw slightly ahead of the playhead. A frame reaches the screen a frame or two
// after it is drawn, so without a lead the keys light just after the sound.
// The note data itself is aligned to the audio's attacks to within ~12 ms.
const VISUAL_LEAD_S = 0.05;

export const isBlackKey = (pitch) => BLACK_KEYS.has(((pitch % 12) + 12) % 12);

// Notes are [startMs, durationMs, pitch, velocity] rows, sorted by start.
export function parseNotes(data) {
  const rows = Array.isArray(data?.notes) ? data.notes : [];
  return rows
    .filter((row) => Array.isArray(row) && row.length >= 3 && row.every(Number.isFinite))
    .map(([startMs, durationMs, pitch, velocity = 80]) => ({
      start: startMs / 1000,
      end: (startMs + durationMs) / 1000,
      pitch,
      velocity,
    }))
    .sort((a, b) => a.start - b.start);
}

// Index of the first note whose start is >= time (binary search).
export function firstStartingAt(notes, time) {
  let low = 0;
  let high = notes.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (notes[mid].start < time) low = mid + 1;
    else high = mid;
  }
  return low;
}

// Notes overlapping [from, to], given the longest note duration in the piece.
export function notesInWindow(notes, from, to, longest) {
  const visible = [];
  for (let i = firstStartingAt(notes, from - longest); i < notes.length; i++) {
    const note = notes[i];
    if (note.start > to) break;
    if (note.end >= from) visible.push(note);
  }
  return visible;
}

export function soundingPitches(notes, time, longest) {
  const pitches = new Set();
  for (const note of notesInWindow(notes, time, time, longest)) {
    if (note.start <= time && note.end > time) pitches.add(note.pitch);
  }
  return pitches;
}

export default function mountPianoRoll(card) {
  const audio = card?.querySelector('audio');
  const stage = card?.querySelector('[data-piano-roll]');
  const canvas = stage?.querySelector('canvas');
  const context = canvas?.getContext?.('2d');
  if (!audio || !stage || !context) return null;

  const keyElements = new Map(
    [...stage.querySelectorAll('[data-pitch]')].map((key) => [Number(key.dataset.pitch), key]),
  );
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let notes = null;
  let longest = 0;
  let loading = null;
  let frame = 0;
  let lanes = new Map();
  let size = { width: 0, height: 0 };
  let lit = new Set();
  let lastClock = { media: -1, stamp: 0 };

  function measure() {
    const keyboard = stage.querySelector('.piano-keys');
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    size = { width: canvas.clientWidth, height: canvas.clientHeight };
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // offsetLeft ignores the stage's rotation, so lanes stay in key coordinates.
    lanes = new Map();
    const origin = keyboard.offsetLeft - canvas.offsetLeft;
    for (const [pitch, key] of keyElements) {
      const parent = key.parentElement.closest('[data-pitch]');
      const left = origin + key.offsetLeft + (parent ? parent.offsetLeft : 0);
      lanes.set(pitch, { left, width: key.offsetWidth, black: isBlackKey(pitch) });
    }
  }

  function clock(now) {
    const media = audio.currentTime;
    if (media !== lastClock.media || audio.paused) lastClock = { media, stamp: now };
    if (audio.paused) return media;
    // currentTime advances in coarse steps in some browsers; interpolate between them.
    const elapsed = Math.min((now - lastClock.stamp) / 1000, MAX_EXTRAPOLATION_S);
    return media + elapsed * (audio.playbackRate || 1);
  }

  function lightKeys(pitches) {
    for (const pitch of lit)
      if (!pitches.has(pitch)) keyElements.get(pitch)?.classList.remove('is-on');
    for (const pitch of pitches) keyElements.get(pitch)?.classList.add('is-on');
    lit = pitches;
  }

  function draw(time) {
    context.clearRect(0, 0, size.width, size.height);
    if (reducedMotion?.matches || !size.height) return;
    const speed = size.height / LOOKAHEAD_S;
    for (const note of notesInWindow(notes, time, time + LOOKAHEAD_S, longest)) {
      const lane = lanes.get(note.pitch);
      if (!lane) continue;
      const bottom = Math.min(size.height, size.height - (note.start - time) * speed);
      const top = Math.max(0, size.height - (note.end - time) * speed);
      const height = Math.max(bottom - top, 2);
      const inset = lane.black ? 0.5 : Math.max(1.5, lane.width * 0.14);
      const sounding = note.start <= time;
      context.globalAlpha =
        (sounding ? 0.95 : 0.6) + 0.3 * Math.min(Math.max((note.velocity - 40) / 60, 0), 1);
      context.fillStyle = lane.black ? '#2f4a33' : '#5d7d58';
      context.beginPath();
      context.roundRect(lane.left + inset, top, lane.width - inset * 2, height, 2.5);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function render(now = performance.now()) {
    if (!notes) return;
    const time = clock(now) + (audio.paused ? 0 : VISUAL_LEAD_S);
    draw(time);
    lightKeys(audio.ended ? new Set() : soundingPitches(notes, time, longest));
  }

  function loop(now) {
    render(now);
    frame = audio.paused ? 0 : requestAnimationFrame(loop);
  }

  function start() {
    card.classList.add('is-playing');
    if (!frame) frame = requestAnimationFrame(loop);
  }

  function stop() {
    card.classList.toggle('is-playing', !audio.paused);
    cancelAnimationFrame(frame);
    frame = 0;
    render();
  }

  function load() {
    loading ||= fetch(stage.dataset.notes)
      .then((response) => {
        if (!response.ok) throw new Error(`Piano notes: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        notes = parseNotes(data);
        longest = notes.reduce((max, note) => Math.max(max, note.end - note.start), 0);
        canvas.hidden = false;
        measure();
        new ResizeObserver(() => {
          measure();
          render();
        }).observe(stage);
      })
      .catch(() => {
        // The recording still plays; the keyboard simply stays still.
        loading = null;
      });
    return loading;
  }

  audio.addEventListener('play', () => {
    load()?.then(() => {
      if (notes && !audio.paused) start();
    });
  });
  audio.addEventListener('playing', () => notes && start());
  audio.addEventListener('pause', stop);
  audio.addEventListener('ended', stop);
  audio.addEventListener('seeked', () => (audio.paused ? render() : start()));
  return { load, render };
}
