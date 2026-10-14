export const FIXED_STEP = 1 / 60;
export const PORTRAIT_MODES = Object.freeze(['idle', 'musician', 'runner', 'physicist']);

export function createRng(seed = 17) {
  let state = Number(seed) >>> 0 || 17;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeSeed(value, fallback = 17) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(0xffffffff, Math.trunc(number))) >>> 0;
}

export function parsePortraitParams(search = '') {
  const params = new URLSearchParams(search);
  const requestedMode = params.get('portrait');
  const mode = PORTRAIT_MODES.includes(requestedMode) ? requestedMode : 'idle';
  const seed = normalizeSeed(params.get('seed'), 17);
  const rawFrame = Number(params.get('frame'));
  const frame = Number.isFinite(rawFrame)
    ? Math.max(0, Math.min(60 * 60 * 10, Math.trunc(rawFrame)))
    : 0;

  return {
    mode,
    seed,
    frame,
    hasFrame: params.has('frame'),
  };
}

export function selectPortraitTier({
  width = 1024,
  devicePixelRatio = 1,
  hardwareConcurrency = 8,
  deviceMemory = 8,
} = {}) {
  const low =
    width <= 600 ||
    hardwareConcurrency <= 4 ||
    (Number.isFinite(deviceMemory) && deviceMemory <= 2);
  if (low) {
    return {
      name: 'low',
      textureSize: 288,
      pointCount: 288 * 288,
      assetSuffix: '-512',
      pixelRatio: Math.min(devicePixelRatio || 1, 1.5),
    };
  }

  const medium =
    width <= 1100 || devicePixelRatio > 2 || (Number.isFinite(deviceMemory) && deviceMemory <= 4);
  if (medium) {
    return {
      name: 'medium',
      textureSize: 480,
      pointCount: 480 * 480,
      assetSuffix: '',
      pixelRatio: Math.min(devicePixelRatio || 1, 1.6),
    };
  }

  return {
    name: 'high',
    textureSize: 576,
    pointCount: 576 * 576,
    assetSuffix: '',
    pixelRatio: Math.min(devicePixelRatio || 1, 1.75),
  };
}

export function fitPortraitProjection(width, height, margin = 0.94) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  const safeMargin = Math.max(0, Math.min(1, margin));
  return aspect >= 1
    ? [safeMargin / aspect, safeMargin]
    : [safeMargin, safeMargin * aspect];
}

export function modeImpulse(mode, step, data) {
  const time = step * FIXED_STEP;

  if (mode === 'musician') {
    const score = data?.score;
    const notes = score?.notes || [];
    if (!notes.length) return null;
    const duration = Number(score.duration) || 1;
    const scoreTime = time % duration;
    let strongest = null;
    for (const note of notes) {
      if (note.start < scoreTime || note.start >= scoreTime + FIXED_STEP) continue;
      if (!strongest || note.velocity > strongest.velocity) strongest = note;
    }
    if (!strongest) return null;
    const pitch = Math.max(36, Math.min(96, Number(strongest.pitch) || 66));
    return {
      x: 0.28 + 0.44 * ((strongest.start / duration) % 1),
      y: 0.18 + 0.64 * ((pitch - 36) / 60),
      amplitude: 0.32 + 0.72 * (Number(strongest.velocity) || 0.5),
      radius: 0.065,
    };
  }

  if (mode === 'runner') {
    const stride = data?.stride;
    if (!stride) return null;
    const raceTime = time % Math.max(0.01, Number(stride.finishTime) || 52.17);
    const events = [...(stride.touchdownTimes || []), stride.finishTime];
    const eventIndex = events.findIndex(
      (eventTime) => eventTime >= raceTime && eventTime < raceTime + FIXED_STEP,
    );
    if (eventIndex < 0) return null;
    const velocities = stride.intervalVelocities || [];
    const velocity = Number(velocities[Math.min(eventIndex, velocities.length - 1)]) || 7.5;
    return {
      x: 0.14 + 0.72 * (eventIndex / Math.max(1, events.length - 1)),
      y: 0.34 + 0.32 * (eventIndex % 2),
      amplitude: 0.42 + velocity / 18,
      radius: 0.085,
    };
  }

  if (mode === 'physicist') {
    const tracks = data?.tracks || [];
    if (!tracks.length) return null;
    const travelSteps = 34;
    const trackIndex = Math.floor(step / travelSteps) % tracks.length;
    const progress = (step % travelSteps) / (travelSteps - 1);
    const track = tracks[trackIndex];
    const phi = Number(track.phi) || 0;
    const eta = Math.max(-2.5, Math.min(2.5, Number(track.eta) || 0));
    const directionX = Math.cos(phi);
    const directionY = Math.sin(phi) * 0.66 + eta * 0.08;
    const signedProgress = progress * 1.4 - 0.2;
    return {
      x: 0.5 + directionX * signedProgress,
      y: 0.5 + directionY * signedProgress,
      amplitude: 0.26 + Math.min(1.1, Math.log2(1 + Math.max(0, Number(track.pt) || 0)) * 0.22),
      radius: 0.052,
    };
  }

  return null;
}

export function hexToRgb(value, fallback = [1, 1, 1]) {
  const match = String(value)
    .trim()
    .match(/^#([\da-f]{6})$/i);
  if (!match) return fallback;
  const number = Number.parseInt(match[1], 16);
  return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255];
}
