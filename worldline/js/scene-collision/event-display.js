import * as THREE from 'three';
import eventsData from '../../data/events.json';
import { createDetector } from './detector.js';

const BG = '#05060a';
const CYAN = new THREE.Color('#33d4ff');
const AMBER = new THREE.Color('#ffb547');
const MAGENTA = new THREE.Color('#ff4fd8');
const TRACKER_RADIUS = 0.9;
const CALO_RADIUS = 1.3;
const MUON_RADIUS = 1.8;
const TRACKER_HALF_LENGTH = 1.6;
const CALO_HALF_LENGTH = 2.2;
const MUON_HALF_LENGTH = 2.8;
const DRAW_MS = 1400;
const FADE_MS = 1150;
const USE_SYNTHETIC = false;
const MAX_REAL_TRACKS = 220;
const HIGH_PT_THRESHOLD = 2;
const REAL_TRACK_DELAY_MAX = 0.08;
const SURVIVOR_PIN_NDC = new THREE.Vector2(0, 0.16);
const SURVIVOR_VERTICAL_END_NDC_Y = -0.12;
const WORLDLINE_EXIT_NDC_Y = -0.42;

const trackVertexShader = `
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aTrackProgress;
  attribute float aDelay;
  attribute float aSurvivor;
  attribute float aLineProgress;
  uniform float uDraw;
  uniform float uFade;
  uniform float uCollapse;
  uniform vec3 uLineColor;
  uniform vec2 uSurvivorNdcOffset;
  uniform float uSurvivorClipProgress;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float localDraw = clamp((uDraw - aDelay) / max(0.001, 1.0 - aDelay), 0.0, 1.0);
    float visible = smoothstep(aTrackProgress - 0.012, aTrackProgress + 0.012, localDraw);
    float collapse = smoothstep(0.0, 1.0, uCollapse);
    vec4 projected = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    float survivor = step(0.5, aSurvivor);
    float survivorMix = collapse * survivor;
    float inverseCollapse = 1.0 - collapse;
    float survivorConvergence = 1.0 - inverseCollapse * inverseCollapse * inverseCollapse;
    float survivorFade = 1.0 - smoothstep(0.84, 0.94, uCollapse);
    float survivorClip = 1.0 - smoothstep(uSurvivorClipProgress, min(1.0, uSurvivorClipProgress + 0.024), aLineProgress);
    float regularAlpha = aAlpha * mix(1.0, 0.004, collapse);
    float survivorAlpha = mix(aAlpha, 1.0, smoothstep(0.0, 0.42, uCollapse)) * survivorFade * survivorClip;
    vColor = mix(aColor, uLineColor, survivorMix);
    vAlpha = mix(regularAlpha, survivorAlpha, survivor) * visible * uFade;
    projected.xy += uSurvivorNdcOffset * projected.w * survivor;
    vec2 survivorTargetNdc = vec2(
      0.0,
      mix(${SURVIVOR_PIN_NDC.y.toFixed(2)}, ${SURVIVOR_VERTICAL_END_NDC_Y.toFixed(2)}, aLineProgress)
    );
    projected.xy = mix(
      projected.xy,
      survivorTargetNdc * projected.w,
      survivor * survivorConvergence
    );
    gl_Position = projected;
  }
`;

const trackFragmentShader = `
  precision mediump float;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float alpha = vAlpha * uOpacity;
    if (alpha < 0.01) {
      discard;
    }
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const hitVertexShader = `
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aSize;
  attribute float aReveal;
  uniform float uDraw;
  uniform float uFade;
  uniform float uCollapse;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float local = clamp((uDraw - aReveal) / 0.14, 0.0, 1.0);
    float pop = smoothstep(0.0, 1.0, local);
    float bounce = 1.0 + 0.32 * sin(local * 3.14159265) * (1.0 - local);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float perspective = clamp(2.4 / max(0.25, -mvPosition.z), 0.55, 3.0);

    vColor = aColor;
    vAlpha = aAlpha * pop * uFade * (1.0 - smoothstep(0.0, 0.86, uCollapse));
    gl_PointSize = aSize * uPixelRatio * perspective * pop * bounce;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const hitFragmentShader = `
  precision mediump float;
  uniform sampler2D uSprite;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 sprite = texture2D(uSprite, gl_PointCoord);
    float alpha = sprite.a * vAlpha * uOpacity;
    if (alpha < 0.01) {
      discard;
    }
    gl_FragColor = vec4(vColor * sprite.rgb, alpha);
  }
`;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smootherStep(value) {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function collapseConvergence(value) {
  const inverse = 1 - clamp01(value);
  return 1 - inverse * inverse * inverse;
}

function readWorldlineStyle() {
  const style = getComputedStyle(document.documentElement);
  const color = style.getPropertyValue('--spine-color').trim() || '#e8ecf1';
  const width = Number.parseFloat(style.getPropertyValue('--spine-width'));

  return {
    color: new THREE.Color(color),
    width: Number.isFinite(width) ? width : 2,
  };
}

// Survivor tracks radiate outward from the vertex in every direction, so
// their tangent at the clip point can point anywhere - including mostly
// backward/upward, opposite the worldline's downward travel. Feeding that
// straight into the vertex shader's quadratic-bezier bevel makes it loop
// back on itself (a visible cusp/petal shape, worse than the plain kink it
// was meant to fix). Clamping the tangent's angle to a forward-facing cone
// around straight-down guarantees the bevel can bend but never reverse.
const MAX_TANGENT_ANGLE_FROM_DOWN = (70 * Math.PI) / 180;

function clampTangentToForwardCone(tangent) {
  const theta = Math.atan2(tangent.x, -tangent.y);
  const clamped = Math.max(
    -MAX_TANGENT_ANGLE_FROM_DOWN,
    Math.min(MAX_TANGENT_ANGLE_FROM_DOWN, theta),
  );
  return new THREE.Vector2(Math.sin(clamped), -Math.cos(clamped));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function samplePowerLaw(min, max, alpha = 2.18) {
  const exponent = 1 - alpha;
  const low = min ** exponent;
  const high = max ** exponent;
  return (low + Math.random() * (high - low)) ** (1 / exponent);
}

function makeSpriteTexture() {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.22, 'rgba(255, 255, 255, 0.86)');
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.22)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeTrackMaterial() {
  const worldlineStyle = readWorldlineStyle();

  return new THREE.ShaderMaterial({
    uniforms: {
      uDraw: { value: 0 },
      uFade: { value: 1 },
      uCollapse: { value: 0 },
      uLineColor: { value: worldlineStyle.color },
      uSurvivorNdcOffset: { value: new THREE.Vector2(0, 0) },
      uSurvivorClipProgress: { value: 1 },
      uOpacity: { value: 1.24 },
    },
    vertexShader: trackVertexShader,
    fragmentShader: trackFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
}

function makeHitMaterial(sprite, pixelRatio) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDraw: { value: 0 },
      uFade: { value: 1 },
      uCollapse: { value: 0 },
      uOpacity: { value: 1.08 },
      uPixelRatio: { value: pixelRatio },
      uSprite: { value: sprite },
    },
    vertexShader: hitVertexShader,
    fragmentShader: hitFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
}

function makeWorldlineMesh(width, height) {
  const segments = 24;
  const positions = [];
  const indices = [];
  const worldlineStyle = readWorldlineStyle();

  for (let i = 0; i <= segments; i++) {
    const y = i / segments;
    positions.push(-1, y, 0);
    positions.push(1, y, 0);
  }

  for (let i = 0; i < segments; i++) {
    const base = i * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 2, base + 1, base + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  const material = new THREE.RawShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2(width, height) },
      uExtend: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: worldlineStyle.color },
      uHalfWidthPx: { value: worldlineStyle.width / 2 },
      uOriginNDC: { value: new THREE.Vector2(0, 0.16) },
      uOriginTangent: { value: new THREE.Vector2(0, -1) },
      uOriginBlend: { value: 1.0 },
    },
    vertexShader: `
      precision highp float;
      attribute vec3 position;
      uniform vec2 uResolution;
      uniform float uExtend;
      uniform float uHalfWidthPx;
      uniform vec2 uOriginNDC;
      uniform vec2 uOriginTangent;
      uniform float uOriginBlend;
      varying float vAlpha;

      void main() {
        float E = clamp(uExtend, 0.0, 1.0);
        float u = position.y * E;
        float om_u = 1.0 - u;
        vec2 origin = uOriginNDC;
        vec2 tangent = normalize(mix(uOriginTangent, vec2(0.0, -1.0), uOriginBlend));
        vec2 P0 = origin;
        vec2 P1 = origin + tangent * 0.24;
        vec2 P2 = vec2(0.0, -0.20);
        vec2 P3 = vec2(0.0, ${WORLDLINE_EXIT_NDC_Y.toFixed(2)});
        vec2 C = om_u * om_u * om_u * P0
          + 3.0 * om_u * om_u * u * P1
          + 3.0 * om_u * u * u * P2
          + u * u * u * P3;
        vec2 C_prime = 3.0 * om_u * om_u * (P1 - P0)
          + 6.0 * om_u * u * (P2 - P1)
          + 3.0 * u * u * (P3 - P2);
        
        vec2 dirScreen = C_prime * uResolution;
        float len = length(dirScreen);
        if (len > 0.0001) {
          dirScreen /= len;
        } else {
          dirScreen = vec2(0.0, -1.0);
        }
        
        vec2 normalScreen = vec2(-dirScreen.y, dirScreen.x);
        vec2 offsetNDC = normalScreen * (uHalfWidthPx * 2.0) / max(vec2(1.0), uResolution);
        
        vec2 finalPos = C + position.x * offsetNDC;
        
        vAlpha = smoothstep(0.0, 0.18, uExtend);
        gl_Position = vec4(finalPos, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vAlpha;

      void main() {
        float alpha = uOpacity * vAlpha;
        if (alpha < 0.01) {
          discard;
        }
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 30;
  return mesh;
}

function pushColor(target, color, count = 1) {
  for (let index = 0; index < count; index += 1) {
    target.push(color.r, color.g, color.b);
  }
}

function pushVector(target, point) {
  target.push(point.x, point.y, point.z);
}

function pointOnHelix(phi, curvature, transverseLength, zSlope) {
  if (Math.abs(curvature) < 0.0001) {
    return new THREE.Vector3(
      Math.cos(phi) * transverseLength,
      Math.sin(phi) * transverseLength,
      transverseLength * zSlope,
    );
  }

  return new THREE.Vector3(
    (Math.sin(phi + curvature * transverseLength) - Math.sin(phi)) / curvature,
    (-Math.cos(phi + curvature * transverseLength) + Math.cos(phi)) / curvature,
    transverseLength * zSlope,
  );
}

function radial(point) {
  return Math.hypot(point.x, point.y);
}

function buildTrack({ pT, eta, phi, charge, isMuon, samples = randomInt(64, 96) }) {
  const curvatureRadius = Math.max(0.52, pT * 0.78);
  const curvature = charge / curvatureRadius;
  const zSlope = Math.sinh(eta) * 0.16;
  const targetRadius = isMuon ? MUON_RADIUS : TRACKER_RADIUS;
  const targetHalfLength = isMuon ? MUON_HALF_LENGTH : TRACKER_HALF_LENGTH;
  const maxLength = isMuon ? 6.2 : 4.1;
  const points = [];
  let trackerHit = null;
  let trackerHitFraction = 1;
  let muonHit = null;

  for (let index = 0; index < samples; index += 1) {
    const fraction = index / (samples - 1);
    const point = pointOnHelix(phi, curvature, maxLength * fraction, zSlope);
    points.push(point);

    if (!trackerHit && radial(point) >= TRACKER_RADIUS) {
      trackerHit = point.clone();
      trackerHitFraction = fraction;
    }

    if (radial(point) >= targetRadius || Math.abs(point.z) >= targetHalfLength) {
      if (isMuon) {
        muonHit = point.clone();
      }
      break;
    }
  }

  if (!trackerHit && points.length) {
    trackerHit = points[points.length - 1].clone();
    trackerHitFraction = 1;
  }

  if (isMuon && !muonHit && points.length) {
    muonHit = points[points.length - 1].clone();
  }

  return {
    points,
    trackerHit,
    trackerHitFraction,
    muonHit,
  };
}

function makeTrackSpecs(count) {
  const magentaCount = randomInt(2, 3);
  const amberCount = Math.max(4, Math.round(count * 0.1));
  const specs = [];

  for (let index = 0; index < count; index += 1) {
    let type = 'cyan';

    if (index < magentaCount) {
      type = 'magenta';
    } else if (index < magentaCount + amberCount) {
      type = 'amber';
    }

    specs.push({
      type,
      pT: type === 'magenta' ? randomBetween(8, 20) : samplePowerLaw(0.7, 20),
      eta: randomBetween(-2.4, 2.4),
      phi: randomBetween(0, Math.PI * 2),
      charge: Math.random() > 0.5 ? 1 : -1,
    });
  }

  return specs.sort(() => Math.random() - 0.5);
}

function alphaForPt(pT, type) {
  const normalized = Math.log(pT / 0.7) / Math.log(20 / 0.7);
  const alpha = 0.18 + clamp01(normalized) * 0.72;
  return type === 'magenta' ? Math.max(alpha, 0.78) : alpha;
}

function colorForType(type) {
  if (type === 'amber') {
    return AMBER;
  }

  if (type === 'magenta') {
    return MAGENTA;
  }

  return CYAN;
}

function addHit(buffers, point, color, size, alpha, reveal) {
  pushVector(buffers.hitPositions, point);
  pushColor(buffers.hitColors, color);
  buffers.hitSizes.push(size);
  buffers.hitAlphas.push(alpha);
  buffers.hitReveals.push(reveal);
}

function addNoiseHits(buffers, count) {
  for (let index = 0; index < count; index += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const radiusValue = randomBetween(0.86, 0.93);
    const z = randomBetween(-1.45, 1.45);
    const color = Math.random() > 0.86 ? AMBER : CYAN;
    const point = new THREE.Vector3(
      Math.cos(angle) * radiusValue,
      Math.sin(angle) * radiusValue,
      z,
    );
    addHit(
      buffers,
      point,
      color,
      randomBetween(6, 15),
      randomBetween(0.16, 0.38),
      randomBetween(0.32, 0.96),
    );
  }
}

function makeEventBuffers() {
  return {
    trackPositions: [],
    trackColors: [],
    trackAlphas: [],
    trackProgress: [],
    trackDelays: [],
    trackSurvivors: [],
    trackLineProgress: [],
    hitPositions: [],
    hitColors: [],
    hitSizes: [],
    hitAlphas: [],
    hitReveals: [],
    survivorEndpoint: null,
    survivorPoints: [],
    survivorStartpoint: null,
  };
}

function numberOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeCharge(value) {
  return value < 0 ? -1 : 1;
}

function makeOpenDataTrackSpec(track, type, isMuon = false) {
  return {
    type,
    isMuon,
    pT: Math.max(0.05, numberOr(track.pt, 0.05)),
    eta: numberOr(track.eta),
    phi: numberOr(track.phi),
    charge: normalizeCharge(numberOr(track.q ?? track.charge, 1)),
  };
}

function addTrackToBuffers(
  buffers,
  spec,
  { delayMax = 0.22, samplesMin = 64, samplesMax = 96, survivor = false } = {},
) {
  const isMuon = Boolean(spec.isMuon) || spec.type === 'amber';
  const color = colorForType(spec.type);
  const alpha = alphaForPt(spec.pT, spec.type);
  const delay = randomBetween(0, delayMax);
  const samples = randomInt(samplesMin, samplesMax);
  const track = buildTrack({ ...spec, isMuon, samples });
  const points = track.points;

  for (let index = 0; index < points.length - 1; index += 1) {
    const progressA = index / Math.max(1, points.length - 1);
    const progressB = (index + 1) / Math.max(1, points.length - 1);
    pushVector(buffers.trackPositions, points[index]);
    pushVector(buffers.trackPositions, points[index + 1]);
    pushColor(buffers.trackColors, color, 2);
    buffers.trackAlphas.push(alpha, alpha);
    buffers.trackProgress.push(progressA, progressB);
    buffers.trackDelays.push(delay, delay);
    buffers.trackSurvivors.push(survivor ? 1 : 0, survivor ? 1 : 0);
    buffers.trackLineProgress.push(progressA, progressB);
  }

  if (track.trackerHit) {
    const reveal = delay + track.trackerHitFraction * (1 - delay) * 0.96;
    const size = 9 + Math.min(34, Math.sqrt(spec.pT) * 8.5);
    addHit(buffers, track.trackerHit, color, size, Math.min(0.9, alpha + 0.1), reveal);
  }

  if (isMuon && track.muonHit) {
    addHit(buffers, track.muonHit, AMBER, 13 + Math.min(28, spec.pT * 1.8), 0.72, 0.98);
  }

  if (survivor) {
    buffers.survivorPoints = points.map((point) => point.clone());
    buffers.survivorStartpoint = points[0]?.clone() ?? null;
    buffers.survivorEndpoint = points[points.length - 1]?.clone() ?? null;
  }
}

function selectTracksForDisplay(tracks) {
  const decorated = tracks.map((track, index) => ({ track, index }));
  const highPt = decorated.filter(({ track }) => numberOr(track.pt) > HIGH_PT_THRESHOLD);
  const remainder = decorated
    .filter(({ track }) => numberOr(track.pt) <= HIGH_PT_THRESHOLD)
    .sort((a, b) => numberOr(b.track.pt) - numberOr(a.track.pt));

  const selected =
    highPt.length >= MAX_REAL_TRACKS
      ? highPt
      : highPt.concat(remainder.slice(0, MAX_REAL_TRACKS - highPt.length));

  return selected.sort((a, b) => a.index - b.index).map(({ track }) => track);
}

function selectSurvivorIndex(specs) {
  if (!specs.length) {
    return -1;
  }

  const sortedPt = specs
    .map((track) => Math.max(0.05, numberOr(track.pt ?? track.pT, 0.05)))
    .sort((a, b) => a - b);
  const medianPt = sortedPt[Math.floor(sortedPt.length / 2)] || 1;
  const candidates = specs
    .map((track, index) => ({
      index,
      eta: Math.abs(numberOr(track.eta)),
      pt: Math.max(0.05, numberOr(track.pt ?? track.pT, 0.05)),
    }))
    .filter(({ eta, pt }) => eta < 1.15 && pt > 0.45);
  const pool = candidates.length
    ? candidates
    : specs.map((track, index) => ({
        index,
        eta: Math.abs(numberOr(track.eta)),
        pt: Math.max(0.05, numberOr(track.pt ?? track.pT, 0.05)),
      }));

  pool.sort((a, b) => {
    const scoreA = Math.abs(Math.log(a.pt / medianPt)) + a.eta * 0.72;
    const scoreB = Math.abs(Math.log(b.pt / medianPt)) + b.eta * 0.72;
    return scoreA - scoreB;
  });

  return pool[0].index;
}

function pointFromEtaPhiAtRadius(eta, phi, radius, halfLength) {
  const z = Math.min(halfLength, Math.max(-halfLength, Math.sinh(eta) * radius * 0.16));
  return new THREE.Vector3(Math.cos(phi) * radius, Math.sin(phi) * radius, z);
}

function addCaloHits(buffers, caloHits) {
  caloHits.forEach((hit) => {
    const et = Math.max(0.05, numberOr(hit.et, 0.05));
    const point = pointFromEtaPhiAtRadius(
      numberOr(hit.eta),
      numberOr(hit.phi),
      CALO_RADIUS,
      CALO_HALF_LENGTH,
    );
    const color = String(hit.system).toLowerCase() === 'hcal' ? AMBER : MAGENTA;
    const size = 10 + Math.min(40, Math.sqrt(et) * 12);
    const alpha = 0.34 + clamp01(et / 8) * 0.46;
    addHit(buffers, point, color, size, alpha, randomBetween(0.2, 0.96));
  });
}

function parseEventId(id) {
  const [run = '----', ...eventParts] = String(id || '').split(':');
  return {
    run,
    event: eventParts.join(':') || '----',
  };
}

function buildSyntheticEventGeometry(trackCount) {
  const buffers = makeEventBuffers();

  const specs = makeTrackSpecs(trackCount);
  const survivorIndex = selectSurvivorIndex(specs);
  let sumPt = 0;

  specs.forEach((spec, index) => {
    sumPt += spec.pT;
    addTrackToBuffers(buffers, spec, { survivor: index === survivorIndex });
  });

  addNoiseHits(buffers, randomInt(12, 20));

  return {
    buffers,
    stats: {
      tracks: specs.length,
      sumPt: Math.round(sumPt),
    },
  };
}

function buildRealEventGeometry(eventRecord) {
  const buffers = makeEventBuffers();
  const rawTracks = Array.isArray(eventRecord.tracks) ? eventRecord.tracks : [];
  const rawMuons = Array.isArray(eventRecord.muons) ? eventRecord.muons : [];
  const rawCalo = Array.isArray(eventRecord.calo) ? eventRecord.calo : [];
  const selectedTracks = selectTracksForDisplay(rawTracks);
  const survivorIndex = selectSurvivorIndex(selectedTracks);
  const sumPt = rawTracks.reduce((sum, track) => sum + numberOr(track.pt), 0);
  const { run, event } = parseEventId(eventRecord.id);

  selectedTracks.forEach((track, index) => {
    const pT = numberOr(track.pt);
    const type = pT >= 8 ? 'magenta' : 'cyan';
    addTrackToBuffers(buffers, makeOpenDataTrackSpec(track, type), {
      delayMax: REAL_TRACK_DELAY_MAX,
      samplesMin: 40,
      samplesMax: 62,
      survivor: index === survivorIndex,
    });
  });

  rawMuons.forEach((muon) => {
    addTrackToBuffers(buffers, makeOpenDataTrackSpec(muon, 'amber', true), {
      delayMax: REAL_TRACK_DELAY_MAX,
      samplesMin: 72,
      samplesMax: 96,
    });
  });

  addCaloHits(buffers, rawCalo);

  return {
    buffers,
    stats: {
      run,
      event,
      tracks: rawTracks.length,
      drawnTracks: selectedTracks.length,
      sumPt: Math.round(sumPt),
    },
  };
}

function makeEventSet({ trackCount, sprite, pixelRatio, eventNumber, eventRecord }) {
  const { buffers, stats } = eventRecord
    ? buildRealEventGeometry(eventRecord)
    : buildSyntheticEventGeometry(trackCount);
  const group = new THREE.Group();

  const trackGeometry = new THREE.BufferGeometry();
  trackGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(buffers.trackPositions, 3),
  );
  trackGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(buffers.trackColors, 3));
  trackGeometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(buffers.trackAlphas, 1));
  trackGeometry.setAttribute(
    'aTrackProgress',
    new THREE.Float32BufferAttribute(buffers.trackProgress, 1),
  );
  trackGeometry.setAttribute('aDelay', new THREE.Float32BufferAttribute(buffers.trackDelays, 1));
  trackGeometry.setAttribute(
    'aSurvivor',
    new THREE.Float32BufferAttribute(buffers.trackSurvivors, 1),
  );
  trackGeometry.setAttribute(
    'aLineProgress',
    new THREE.Float32BufferAttribute(buffers.trackLineProgress, 1),
  );

  const trackMaterial = makeTrackMaterial();
  const tracks = new THREE.LineSegments(trackGeometry, trackMaterial);
  tracks.frustumCulled = false;
  group.add(tracks);

  const hitGeometry = new THREE.BufferGeometry();
  hitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.hitPositions, 3));
  hitGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(buffers.hitColors, 3));
  hitGeometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(buffers.hitAlphas, 1));
  hitGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(buffers.hitSizes, 1));
  hitGeometry.setAttribute('aReveal', new THREE.Float32BufferAttribute(buffers.hitReveals, 1));

  const hitMaterial = makeHitMaterial(sprite, pixelRatio);
  const hits = new THREE.Points(hitGeometry, hitMaterial);
  hits.frustumCulled = false;
  group.add(hits);

  return {
    eventNumber,
    eventRecord,
    group,
    hitMaterial,
    stats,
    trackMaterial,
    survivorEndpoint: buffers.survivorEndpoint,
    survivorPoints: buffers.survivorPoints,
    survivorStartpoint: buffers.survivorStartpoint,
    dispose() {
      trackGeometry.dispose();
      hitGeometry.dispose();
      trackMaterial.dispose();
      hitMaterial.dispose();
    },
  };
}

export function createEventDisplay({ canvas, context, hud, reducedMotion }) {
  return new EventDisplay({ canvas, context, hud, reducedMotion });
}

class EventDisplay {
  constructor({ canvas, context, hud, reducedMotion }) {
    this.canvas = canvas;
    this.hud = hud;
    this.reducedMotion = reducedMotion;
    this.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    this.scrollProgress = 0;
    this.collapseProgress = 0;
    this.viewportTop = 0;
    this.viewportHeight = window.innerHeight;
    this.anchorState = null;
    this.eventNumber = 4120;
    this.currentEvent = null;
    this.fadingEvents = [];
    this.nextEventAt = 0;
    this.isPaused = false;
    this.isDisposed = false;
    this.renderCount = 0;
    this.realEvents = Array.isArray(eventsData.events) ? eventsData.events : [];
    this.realEventOrder = [];
    this.realEventCursor = 0;
    this.lastRealEventIndex = -1;
    this.shuffleRealEvents();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(BG, 1);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.02, 80);

    this.eventRoot = new THREE.Group();
    this.detector = createDetector();
    this.detectorMaterials = [];
    this.detector.traverse((child) => {
      if (child.material) {
        child.material.userData.baseOpacity = child.material.opacity;
        this.detectorMaterials.push(child.material);
      }
    });
    this.worldlineMesh = makeWorldlineMesh(window.innerWidth, window.innerHeight);
    this.scene.add(this.detector);
    this.scene.add(this.eventRoot);
    this.scene.add(this.worldlineMesh);

    this.sprite = makeSpriteTexture();
    this.cameraCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.35, 1.7, 5.9),
      new THREE.Vector3(2.18, 1.0, 4.22),
      new THREE.Vector3(1.32, 0.58, 3.0),
      new THREE.Vector3(0.28, 0.1, 1.24),
      new THREE.Vector3(0.04, 0.02, 0.08),
      new THREE.Vector3(-0.22, -0.08, -1.35),
      new THREE.Vector3(-0.72, 0.14, -2.12),
      new THREE.Vector3(-1.4, 0.5, -3.25),
      new THREE.Vector3(-3.55, 1.08, -6.55),
    ]);
    this.lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, 0.02, 0.24),
      new THREE.Vector3(0.02, 0.02, 0.34),
      new THREE.Vector3(0, 0, 0.18),
      new THREE.Vector3(0, 0, -0.35),
      new THREE.Vector3(0.02, 0, -1.2),
      new THREE.Vector3(0.02, 0, -1.68),
      new THREE.Vector3(0, 0, -2.1),
      new THREE.Vector3(0, 0, -3.0),
    ]);

    this.resize();
    this.generateEvent(0);

    if (this.reducedMotion) {
      this.currentEvent.trackMaterial.uniforms.uDraw.value = 1;
      this.currentEvent.hitMaterial.uniforms.uDraw.value = 1;
    }
  }

  shuffleRealEvents() {
    this.realEventOrder = this.realEvents.map((_, index) => index);

    for (let index = this.realEventOrder.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(0, index);
      [this.realEventOrder[index], this.realEventOrder[swapIndex]] = [
        this.realEventOrder[swapIndex],
        this.realEventOrder[index],
      ];
    }

    if (this.realEventOrder.length > 1 && this.realEventOrder[0] === this.lastRealEventIndex) {
      [this.realEventOrder[0], this.realEventOrder[1]] = [
        this.realEventOrder[1],
        this.realEventOrder[0],
      ];
    }

    this.realEventCursor = 0;
  }

  getNextRealEventRecord() {
    if (!this.realEvents.length) {
      return null;
    }

    if (this.realEventCursor >= this.realEventOrder.length) {
      this.shuffleRealEvents();
    }

    const eventIndex = this.realEventOrder[this.realEventCursor];
    this.realEventCursor += 1;
    this.lastRealEventIndex = eventIndex;
    return this.realEvents[eventIndex] ?? null;
  }

  resize() {
    if (this.isDisposed) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const canvasRect = this.canvas.getBoundingClientRect();
    this.viewportTop = canvasRect.top;
    this.viewportHeight = canvasRect.height || height;
    this.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();

    if (this.currentEvent) {
      this.currentEvent.hitMaterial.uniforms.uPixelRatio.value = this.pixelRatio;
    }

    if (this.worldlineMesh) {
      this.worldlineMesh.material.uniforms.uResolution.value.set(width, height);
    }

    this.fadingEvents.forEach(({ event }) => {
      event.hitMaterial.uniforms.uPixelRatio.value = this.pixelRatio;
    });
  }

  renderStatic() {
    if (this.isDisposed) {
      return;
    }

    this.setCamera(1, 0, false);
    this.updateCollapse(1);
    this.renderer.render(this.scene, this.camera);
    this.renderCount += 1;
  }

  renderEndState() {
    this.renderStatic();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  update({ time, scrubProgress, idle }) {
    if (this.isPaused || this.isDisposed) {
      return this.scrollProgress;
    }

    const targetProgress = this.reducedMotion ? 1 : clamp01(scrubProgress);
    this.scrollProgress += (targetProgress - this.scrollProgress) * 0.1;
    this.collapseProgress = clamp01((this.scrollProgress - 0.5) / 0.5);

    if (!this.reducedMotion && this.scrollProgress < 0.45 && time >= this.nextEventAt) {
      this.generateEvent(time);
    }

    if (this.collapseProgress > 0.02) {
      this.clearFadingEvents();
    }

    this.setCamera(this.scrollProgress, time, idle);
    this.updateEvents(time);
    this.updateCollapse(this.collapseProgress);
    this.renderer.render(this.scene, this.camera);
    this.renderCount += 1;
    return this.scrollProgress;
  }

  setCamera(progress, time, idle) {
    const t = smootherStep(Math.min(0.42, (progress / 0.45) * 0.42));
    const position = this.cameraCurve.getPoint(t);
    const lookAt = this.lookCurve.getPoint(t);

    if (!this.reducedMotion && idle && progress < 0.48) {
      const drift = time * 0.00016;
      position.x += Math.sin(drift) * 0.06;
      position.y += Math.cos(drift * 0.8) * 0.045;
      lookAt.x += Math.sin(drift * 0.7) * 0.025;
      lookAt.y += Math.cos(drift * 0.55) * 0.02;
    }

    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
  }

  updateCollapse(collapse) {
    const detectorHold = smootherStep(Math.min(1, collapse / 0.62));
    const detectorExit = smootherStep(Math.max(0, (collapse - 0.62) / 0.38));
    const detectorScale = (1 - detectorHold * 0.9) * (1 - detectorExit);

    this.detectorMaterials.forEach((material) => {
      material.opacity = material.userData.baseOpacity * detectorScale;
    });

    let survivorProjection = null;

    if (this.currentEvent) {
      this.currentEvent.trackMaterial.uniforms.uCollapse.value = collapse;
      this.currentEvent.hitMaterial.uniforms.uCollapse.value = collapse;
      survivorProjection = this.updateSurvivorProjection(this.currentEvent, collapse);
    }

    this.fadingEvents.forEach(({ event }) => {
      event.trackMaterial.uniforms.uCollapse.value = collapse;
      event.hitMaterial.uniforms.uCollapse.value = collapse;
      this.updateSurvivorProjection(event, collapse);
    });

    if (this.worldlineMesh) {
      if (survivorProjection) {
        const { endpointNdc, endpointTangent } = survivorProjection;
        this.worldlineMesh.material.uniforms.uOriginNDC.value.set(endpointNdc.x, endpointNdc.y);
        this.worldlineMesh.material.uniforms.uOriginTangent.value.set(
          endpointTangent.x,
          endpointTangent.y,
        );
        // The survivor retracts along its own sampled curve, so the mesh
        // remains attached to its visible endpoint. Ease the endpoint tangent
        // toward vertical over that same full interval instead of redirecting
        // it during the final few frames.
        this.worldlineMesh.material.uniforms.uOriginBlend.value = collapseConvergence(collapse);
      } else {
        this.worldlineMesh.material.uniforms.uOriginNDC.value.copy(SURVIVOR_PIN_NDC);
        this.worldlineMesh.material.uniforms.uOriginTangent.value.set(0, -1);
        this.worldlineMesh.material.uniforms.uOriginBlend.value = 1.0;
      }

      const extend = smootherStep(collapse);
      const opacity = smootherStep(collapse / 0.24);
      this.worldlineMesh.material.uniforms.uExtend.value = extend;
      this.worldlineMesh.material.uniforms.uOpacity.value = opacity;
      this.updateAnchorState(collapse, extend, opacity);
    }
  }

  updateAnchorState(collapse, extend, opacity) {
    if (!this.worldlineMesh || collapse <= 0.01 || opacity <= 0.001) {
      this.anchorState = null;
      return;
    }

    const uniforms = this.worldlineMesh.material.uniforms;
    const origin = uniforms.uOriginNDC.value;
    const sourceTangent = uniforms.uOriginTangent.value;
    const verticalBlend = uniforms.uOriginBlend.value;
    const tangent = new THREE.Vector2(
      sourceTangent.x * (1 - verticalBlend),
      sourceTangent.y * (1 - verticalBlend) - verticalBlend,
    );

    if (tangent.lengthSq() < 0.0001) {
      tangent.set(0, -1);
    } else {
      tangent.normalize();
    }

    const p1Y = origin.y + tangent.y * 0.24;
    const t = collapse >= 0.999 ? 1 : extend;
    const inverse = 1 - t;
    const headNdcY =
      inverse * inverse * inverse * origin.y +
      3 * inverse * inverse * t * p1Y +
      3 * inverse * t * t * -0.2 +
      t * t * t * WORLDLINE_EXIT_NDC_Y;

    this.anchorState = {
      active: true,
      entryNdcY: SURVIVOR_PIN_NDC.y,
      exitNdcY: WORLDLINE_EXIT_NDC_Y,
      headNdcY: t === 1 ? WORLDLINE_EXIT_NDC_Y : headNdcY,
    };
  }

  getAnchors() {
    if (this.isDisposed || !this.anchorState) {
      return null;
    }

    const toViewportY = (ndcY) => this.viewportTop + ((1 - ndcY) * this.viewportHeight) / 2;
    const entryY = toViewportY(this.anchorState.entryNdcY);
    const exitY = toViewportY(this.anchorState.exitNdcY);
    const headY = toViewportY(this.anchorState.headNdcY);

    return {
      active: this.anchorState.active,
      entryY,
      exitY,
      headY: this.anchorState.headNdcY === this.anchorState.exitNdcY ? exitY : headY,
    };
  }

  projectSurvivorPoint(point, offset, lineProgress = 0, collapse = 0) {
    const ndc = point.clone().project(this.camera);

    if (!Number.isFinite(ndc.x) || !Number.isFinite(ndc.y)) {
      return null;
    }

    ndc.x += offset.x;
    ndc.y += offset.y;
    const convergence = collapseConvergence(collapse);
    ndc.x *= 1 - convergence;
    ndc.y =
      ndc.y * (1 - convergence) +
      (SURVIVOR_PIN_NDC.y + (SURVIVOR_VERTICAL_END_NDC_Y - SURVIVOR_PIN_NDC.y) * lineProgress) *
        convergence;
    return ndc;
  }

  getCorrectedSurvivorProjection(event, collapse = 0) {
    if (!event?.survivorStartpoint || !event?.survivorEndpoint) {
      return null;
    }

    const startNdc = event.survivorStartpoint.clone().project(this.camera);

    if (!Number.isFinite(startNdc.x) || !Number.isFinite(startNdc.y)) {
      return null;
    }

    const offset = new THREE.Vector2(
      SURVIVOR_PIN_NDC.x - startNdc.x,
      SURVIVOR_PIN_NDC.y - startNdc.y,
    );
    const points = event.survivorPoints?.length ? event.survivorPoints : [event.survivorEndpoint];
    let frameClipProgress = 1;
    let lastInsideIndex = -1;

    for (let index = 0; index < points.length; index += 1) {
      const lineProgress = index / Math.max(1, points.length - 1);
      const ndc = this.projectSurvivorPoint(points[index], offset, lineProgress, collapse);

      if (!ndc) {
        frameClipProgress = Math.max(0, lastInsideIndex) / Math.max(1, points.length - 1);
        break;
      }

      const insideHandoffFrame = ndc.x >= -0.98 && ndc.x <= 0.98 && ndc.y >= -0.9 && ndc.y <= 0.96;

      if (!insideHandoffFrame) {
        frameClipProgress = Math.max(0, lastInsideIndex) / Math.max(1, points.length - 1);
        break;
      }

      lastInsideIndex = index;
    }

    if (lastInsideIndex < 0) {
      return null;
    }

    // Pull the visible endpoint back through the actual projected track for
    // the whole collapse. The shader clips the survivor at this same sampled
    // point, so there is no detached lerp between two unrelated geometries.
    const clipProgress = frameClipProgress * (1 - collapseConvergence(collapse));
    const sampleIndex = clipProgress * Math.max(1, points.length - 1);
    const lowerIndex = Math.min(lastInsideIndex, Math.floor(sampleIndex));
    const upperIndex = Math.min(lastInsideIndex, lowerIndex + 1);
    const fraction = sampleIndex - Math.floor(sampleIndex);
    const denominator = Math.max(1, points.length - 1);
    const lowerNdc = this.projectSurvivorPoint(
      points[lowerIndex],
      offset,
      lowerIndex / denominator,
      collapse,
    );
    const upperNdc = this.projectSurvivorPoint(
      points[upperIndex],
      offset,
      upperIndex / denominator,
      collapse,
    );

    if (!lowerNdc || !upperNdc) {
      return null;
    }

    const endpointNdc = lowerNdc.lerp(upperNdc, fraction);
    const beforeIndex = Math.max(0, lowerIndex - 1);
    const afterIndex = Math.min(lastInsideIndex, upperIndex + 1);
    const beforeNdc = this.projectSurvivorPoint(
      points[beforeIndex],
      offset,
      beforeIndex / denominator,
      collapse,
    );
    const afterNdc = this.projectSurvivorPoint(
      points[afterIndex],
      offset,
      afterIndex / denominator,
      collapse,
    );
    const endpointTangent =
      beforeNdc && afterNdc
        ? new THREE.Vector2().subVectors(afterNdc, beforeNdc)
        : new THREE.Vector2(0, -1);

    if (endpointTangent.lengthSq() < 0.001) {
      endpointTangent.set(0, -1);
    } else {
      endpointTangent.normalize();
    }

    const clampedTangent = clampTangentToForwardCone(endpointTangent);

    return { clipProgress, endpointNdc, endpointTangent: clampedTangent, offset, startNdc };
  }

  updateSurvivorProjection(event, collapse) {
    const offset = event?.trackMaterial?.uniforms.uSurvivorNdcOffset.value;
    const clipProgress = event?.trackMaterial?.uniforms.uSurvivorClipProgress;

    if (!offset || !clipProgress) {
      return null;
    }

    const survivorProjection = this.getCorrectedSurvivorProjection(event, collapse);

    if (survivorProjection) {
      offset.copy(survivorProjection.offset);
      clipProgress.value = survivorProjection.clipProgress;
    } else {
      offset.set(0, 0);
      clipProgress.value = 1;
    }

    return survivorProjection;
  }

  generateEvent(time) {
    if (this.currentEvent) {
      this.fadingEvents.push({
        event: this.currentEvent,
        fadeStart: time,
      });
    }

    const eventRecord = USE_SYNTHETIC ? null : this.getNextRealEventRecord();

    if (eventRecord) {
      this.currentEvent = makeEventSet({
        eventNumber: this.eventNumber,
        eventRecord,
        pixelRatio: this.pixelRatio,
        sprite: this.sprite,
      });
    } else {
      const mobile = window.innerWidth < 700;
      const trackCount = mobile ? randomInt(38, 58) : randomInt(50, 90);
      this.eventNumber += 1;
      this.currentEvent = makeEventSet({
        eventNumber: this.eventNumber,
        pixelRatio: this.pixelRatio,
        sprite: this.sprite,
        trackCount,
      });
    }

    this.currentEvent.startTime = time;
    this.eventRoot.add(this.currentEvent.group);
    this.nextEventAt = time + randomBetween(9000, 12000);
    this.updateHud(this.currentEvent);
  }

  updateEvents(time) {
    if (this.currentEvent) {
      const age = this.reducedMotion ? DRAW_MS : Math.max(0, time - this.currentEvent.startTime);
      const draw = this.reducedMotion ? 1 : clamp01(age / DRAW_MS);
      const fade = this.reducedMotion ? 1 : Math.min(1, age / 520);
      this.currentEvent.trackMaterial.uniforms.uDraw.value = draw;
      this.currentEvent.trackMaterial.uniforms.uFade.value = fade;
      this.currentEvent.hitMaterial.uniforms.uDraw.value = draw;
      this.currentEvent.hitMaterial.uniforms.uFade.value = fade;
    }

    this.fadingEvents = this.fadingEvents.filter(({ event, fadeStart }) => {
      const fadeAge = time - fadeStart;
      const fade = 1 - clamp01(fadeAge / FADE_MS);
      event.trackMaterial.uniforms.uDraw.value = 1;
      event.hitMaterial.uniforms.uDraw.value = 1;
      event.trackMaterial.uniforms.uFade.value = fade;
      event.hitMaterial.uniforms.uFade.value = fade;

      if (fade <= 0) {
        this.eventRoot.remove(event.group);
        event.dispose();
        return false;
      }

      return true;
    });
  }

  clearFadingEvents() {
    this.fadingEvents.forEach(({ event }) => {
      this.eventRoot.remove(event.group);
      event.dispose();
    });
    this.fadingEvents = [];
  }

  unmount() {
    if (this.isDisposed) {
      return;
    }

    this.clearFadingEvents();

    if (this.currentEvent) {
      this.eventRoot.remove(this.currentEvent.group);
      this.currentEvent.dispose();
      this.currentEvent = null;
    }

    if (this.worldlineMesh) {
      this.scene.remove(this.worldlineMesh);
      this.worldlineMesh.geometry.dispose();
      this.worldlineMesh.material.dispose();
      this.worldlineMesh = null;
    }

    this.detector.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        child.material.dispose();
      }
    });

    this.sprite.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.classList.add('is-retired');
    this.canvas.dataset.webglUnmounted = 'true';
    this.isDisposed = true;
  }

  updateHud(event) {
    if (!this.hud) {
      return;
    }

    if (event.stats.run) {
      const parts = [
        `RUN ${event.stats.run}`,
        `EVT ${event.stats.event}`,
        `N_TRK ${event.stats.tracks}`,
      ];

      if (event.stats.drawnTracks < event.stats.tracks) {
        parts.push(`N_DRAWN ${event.stats.drawnTracks}`);
      }

      parts.push(`SUM_PT ${event.stats.sumPt} GEV`);
      this.hud.textContent = parts.join(' / ');
      return;
    }

    const eventLabel = String(event.eventNumber).padStart(6, '0');
    const tracks = String(event.stats.tracks).padStart(2, '0');
    const sumPt = String(event.stats.sumPt).padStart(3, '0');
    this.hud.textContent = `EVT ${eventLabel} / N_TRK ${tracks} / SUM_PT ${sumPt} GEV`;
  }
}
