import * as THREE from 'three';
import { createDetector } from './detector.js';

const BG = '#05060a';
const CYAN = new THREE.Color('#33d4ff');
const AMBER = new THREE.Color('#ffb547');
const MAGENTA = new THREE.Color('#ff4fd8');
const TRACKER_RADIUS = 0.9;
const MUON_RADIUS = 1.8;
const TRACKER_HALF_LENGTH = 1.6;
const MUON_HALF_LENGTH = 2.8;
const DRAW_MS = 1400;
const FADE_MS = 1150;

const trackVertexShader = `
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aTrackProgress;
  attribute float aDelay;
  uniform float uDraw;
  uniform float uFade;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float localDraw = clamp((uDraw - aDelay) / max(0.001, 1.0 - aDelay), 0.0, 1.0);
    float visible = smoothstep(aTrackProgress - 0.012, aTrackProgress + 0.012, localDraw);
    vColor = aColor;
    vAlpha = aAlpha * visible * uFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
    vAlpha = aAlpha * pop * uFade;
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
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
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
  return new THREE.ShaderMaterial({
    uniforms: {
      uDraw: { value: 0 },
      uFade: { value: 1 },
      uOpacity: { value: 1 },
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
      uOpacity: { value: 0.92 },
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

function buildTrack({ pT, eta, phi, charge, isMuon }) {
  const curvatureRadius = Math.max(0.52, pT * 0.78);
  const curvature = charge / curvatureRadius;
  const zSlope = Math.sinh(eta) * 0.16;
  const targetRadius = isMuon ? MUON_RADIUS : TRACKER_RADIUS;
  const targetHalfLength = isMuon ? MUON_HALF_LENGTH : TRACKER_HALF_LENGTH;
  const samples = randomInt(64, 96);
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
    const point = new THREE.Vector3(Math.cos(angle) * radiusValue, Math.sin(angle) * radiusValue, z);
    addHit(buffers, point, color, randomBetween(6, 15), randomBetween(0.16, 0.38), randomBetween(0.32, 0.96));
  }
}

function buildEventGeometry(trackCount) {
  const buffers = {
    trackPositions: [],
    trackColors: [],
    trackAlphas: [],
    trackProgress: [],
    trackDelays: [],
    hitPositions: [],
    hitColors: [],
    hitSizes: [],
    hitAlphas: [],
    hitReveals: [],
  };

  const specs = makeTrackSpecs(trackCount);
  let sumPt = 0;

  specs.forEach((spec) => {
    const isMuon = spec.type === 'amber';
    const color = colorForType(spec.type);
    const alpha = alphaForPt(spec.pT, spec.type);
    const delay = randomBetween(0, 0.22);
    const track = buildTrack({ ...spec, isMuon });
    const points = track.points;
    sumPt += spec.pT;

    for (let index = 0; index < points.length - 1; index += 1) {
      const progressA = index / Math.max(1, points.length - 1);
      const progressB = (index + 1) / Math.max(1, points.length - 1);
      pushVector(buffers.trackPositions, points[index]);
      pushVector(buffers.trackPositions, points[index + 1]);
      pushColor(buffers.trackColors, color, 2);
      buffers.trackAlphas.push(alpha, alpha);
      buffers.trackProgress.push(progressA, progressB);
      buffers.trackDelays.push(delay, delay);
    }

    if (track.trackerHit) {
      const reveal = delay + track.trackerHitFraction * (1 - delay) * 0.96;
      const size = 9 + Math.min(34, Math.sqrt(spec.pT) * 8.5);
      addHit(buffers, track.trackerHit, color, size, Math.min(0.9, alpha + 0.1), reveal);
    }

    if (isMuon && track.muonHit) {
      addHit(buffers, track.muonHit, AMBER, 13 + Math.min(28, spec.pT * 1.8), 0.72, 0.98);
    }
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

function makeEventSet({ trackCount, sprite, pixelRatio, eventNumber }) {
  const { buffers, stats } = buildEventGeometry(trackCount);
  const group = new THREE.Group();

  const trackGeometry = new THREE.BufferGeometry();
  trackGeometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.trackPositions, 3));
  trackGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(buffers.trackColors, 3));
  trackGeometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(buffers.trackAlphas, 1));
  trackGeometry.setAttribute('aTrackProgress', new THREE.Float32BufferAttribute(buffers.trackProgress, 1));
  trackGeometry.setAttribute('aDelay', new THREE.Float32BufferAttribute(buffers.trackDelays, 1));

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
    group,
    hitMaterial,
    stats,
    trackMaterial,
    dispose() {
      trackGeometry.dispose();
      hitGeometry.dispose();
      trackMaterial.dispose();
      hitMaterial.dispose();
    },
  };
}

export function createEventDisplay({ canvas, hud, reducedMotion }) {
  return new EventDisplay({ canvas, hud, reducedMotion });
}

class EventDisplay {
  constructor({ canvas, hud, reducedMotion }) {
    this.canvas = canvas;
    this.hud = hud;
    this.reducedMotion = reducedMotion;
    this.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    this.scrollProgress = 0;
    this.eventNumber = 4120;
    this.currentEvent = null;
    this.fadingEvents = [];
    this.nextEventAt = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: reducedMotion,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(BG, 1);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.02, 80);

    this.eventRoot = new THREE.Group();
    this.detector = createDetector();
    this.scene.add(this.detector);
    this.scene.add(this.eventRoot);

    this.sprite = makeSpriteTexture();
    this.cameraCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.35, 1.7, 5.9),
      new THREE.Vector3(1.32, 0.58, 3.0),
      new THREE.Vector3(0.28, 0.1, 1.24),
      new THREE.Vector3(0.04, 0.02, 0.08),
      new THREE.Vector3(-0.22, -0.08, -1.35),
      new THREE.Vector3(-1.4, 0.5, -3.25),
      new THREE.Vector3(-3.55, 1.08, -6.55),
    ]);
    this.lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, 0.02, 0.34),
      new THREE.Vector3(0, 0, 0.18),
      new THREE.Vector3(0, 0, -0.35),
      new THREE.Vector3(0.02, 0, -1.2),
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

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();

    if (this.currentEvent) {
      this.currentEvent.hitMaterial.uniforms.uPixelRatio.value = this.pixelRatio;
    }

    this.fadingEvents.forEach(({ event }) => {
      event.hitMaterial.uniforms.uPixelRatio.value = this.pixelRatio;
    });
  }

  renderStatic() {
    this.setCamera(0, 0, false);
    this.renderer.render(this.scene, this.camera);
  }

  update({ time, rawScrollProgress, idle }) {
    this.scrollProgress += (rawScrollProgress - this.scrollProgress) * 0.08;

    if (!this.reducedMotion && time >= this.nextEventAt) {
      this.generateEvent(time);
    }

    this.updateEvents(time);
    this.setCamera(this.scrollProgress, time, idle);
    this.renderer.render(this.scene, this.camera);
  }

  setCamera(progress, time, idle) {
    const t = smootherStep(progress);
    const position = this.cameraCurve.getPoint(t);
    const lookAt = this.lookCurve.getPoint(t);

    if (!this.reducedMotion && idle) {
      const drift = time * 0.00016;
      position.x += Math.sin(drift) * 0.06;
      position.y += Math.cos(drift * 0.8) * 0.045;
      lookAt.x += Math.sin(drift * 0.7) * 0.025;
      lookAt.y += Math.cos(drift * 0.55) * 0.02;
    }

    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
  }

  generateEvent(time) {
    if (this.currentEvent) {
      this.fadingEvents.push({
        event: this.currentEvent,
        fadeStart: time,
      });
    }

    const mobile = window.innerWidth < 700;
    const trackCount = mobile ? randomInt(38, 58) : randomInt(50, 90);
    this.eventNumber += 1;
    this.currentEvent = makeEventSet({
      eventNumber: this.eventNumber,
      pixelRatio: this.pixelRatio,
      sprite: this.sprite,
      trackCount,
    });
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

  updateHud(event) {
    if (!this.hud) {
      return;
    }

    const eventLabel = String(event.eventNumber).padStart(6, '0');
    const tracks = String(event.stats.tracks).padStart(2, '0');
    const sumPt = String(event.stats.sumPt).padStart(3, '0');
    this.hud.textContent = `EVT ${eventLabel} / N_TRK ${tracks} / SUM_PT ${sumPt} GEV`;
  }
}
