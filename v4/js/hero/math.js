export const FIXED_STEP = 1 / 120;
export const MAX_CHARGE_DISTANCE = 4.8;

export function createRng(seed = 17) {
  let state = Number(seed) >>> 0;

  return function next() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rng, minimum, maximum) {
  return minimum + (maximum - minimum) * rng();
}

export function chargeFromDistance(distance) {
  const normalized = Math.min(1, Math.max(0, Number(distance) / MAX_CHARGE_DISTANCE));
  const eased = normalized * normalized * (3 - 2 * normalized);

  return {
    normalized,
    tension: 0.12 + eased * 0.88,
    impulse: eased * 47,
    angularImpulse: eased * 14,
  };
}

export function selectCapabilityTier({
  width,
  devicePixelRatio = 1,
  hardwareConcurrency = 8,
  deviceMemory = 8,
}) {
  const safeWidth = Math.max(0, Number(width) || 0);
  const constrained = hardwareConcurrency <= 4 || (deviceMemory && deviceMemory <= 4);

  if (safeWidth < 620 || constrained) {
    return {
      name: 'phone',
      bodyLimit: 42,
      shadowMapSize: 0,
      postprocessing: false,
      pixelRatioCap: 1.15,
      chamberDepth: 1.55,
      pixelRatio: Math.min(devicePixelRatio, 1.15),
    };
  }

  if (safeWidth < 1100 || hardwareConcurrency < 8 || deviceMemory < 8) {
    return {
      name: 'mid',
      bodyLimit: 64,
      shadowMapSize: 1024,
      postprocessing: true,
      pixelRatioCap: 1.4,
      chamberDepth: 1.9,
      pixelRatio: Math.min(devicePixelRatio, 1.4),
    };
  }

  return {
    name: 'desktop',
    bodyLimit: 88,
    shadowMapSize: 2048,
    postprocessing: true,
    pixelRatioCap: 1.75,
    chamberDepth: 2.25,
    pixelRatio: Math.min(devicePixelRatio, 1.75),
  };
}

export function parseMachineParams(search = '') {
  const params = new URLSearchParams(search);
  const requestedMachine = params.get('machine') ?? 'idle';
  const machine = ['idle', 'charged', 'impact'].includes(requestedMachine)
    ? requestedMachine
    : 'idle';
  const seedValue = Number.parseInt(params.get('seed') ?? '17', 10);
  const frameValue = Number.parseInt(params.get('frame') ?? '42', 10);

  return {
    machine,
    seed: Number.isFinite(seedValue) ? seedValue : 17,
    frame: Number.isFinite(frameValue) ? Math.max(0, Math.min(10000, frameValue)) : 42,
  };
}

export function validateManifest(candidate) {
  if (!candidate || !Array.isArray(candidate.bodies)) {
    return { valid: false, errors: ['manifest.bodies must be an array'] };
  }

  const errors = [];
  const ids = new Set();
  const massClasses = new Set(['heavy', 'mid', 'light']);
  const kinds = new Set(['research', 'project', 'link']);

  candidate.bodies.forEach((body, index) => {
    const path = `bodies[${index}]`;
    if (!body || typeof body !== 'object') {
      errors.push(`${path} must be an object`);
      return;
    }

    if (body.id !== null) {
      if (typeof body.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.id)) {
        errors.push(`${path}.id must be null or URL-safe`);
      } else if (ids.has(body.id)) {
        errors.push(`${path}.id must be unique`);
      } else {
        ids.add(body.id);
      }
    }

    if (typeof body.label !== 'string' || body.label.length > 10) {
      errors.push(`${path}.label must be a string no longer than 10 characters`);
    }
    if (!massClasses.has(body.massClass)) {
      errors.push(`${path}.massClass is invalid`);
    }
    if (!kinds.has(body.kind)) {
      errors.push(`${path}.kind is invalid`);
    }
    if (
      !body.slot ||
      !Number.isFinite(body.slot.x) ||
      !Number.isFinite(body.slot.y) ||
      Math.abs(body.slot.x) > 1 ||
      Math.abs(body.slot.y) > 1
    ) {
      errors.push(`${path}.slot must contain x/y in chamber space`);
    }
    if (body.kind === 'link' && typeof body.href !== 'string') {
      errors.push(`${path}.href is required for links`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function seededDirection(seed) {
  const rng = createRng(seed ^ 0xa5a5a5a5);
  const x = 0.9 + rng() * 0.1;
  const y = (rng() - 0.5) * 0.22;
  const z = (rng() - 0.5) * 0.16;
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
}
