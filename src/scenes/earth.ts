import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  Uniform,
  Vector3,
} from 'three';
import type { AnchorSpec, Hotspot3D, SceneAssets, SceneInstance } from '../engine/types3d';
import { EarthOverlay, type EarthPinProjection } from '../ui/earth-overlay';
import {
  canvasTexture,
  loadStars,
  loadTexture,
  loadTextureWithFallback,
  textSprite,
  type StarData,
} from './lib/assets';
import { latLonToVec3, STANFORD_LAT, STANFORD_LON, sunDirection } from './lib/astro';
import { earthGlobeMaterial } from './lib/earth-globe';
import { makeSky, setSkyOpacity, skyTransitionOpacity } from './lib/sky';
import { ephemeris } from '../astronomy/ephemeris';
import { daysSinceJ2000 } from './lib/astro';

const R = 10;
const COORDINATE_SIGNALS = [
  {
    id: 'earth-stanford-slac',
    label: 'Stanford / SLAC',
    lat: 37.4275,
    lon: -122.1697,
    color: 0xffd479,
  },
  { id: 'earth-pasadena', label: 'Pasadena', lat: 34.1478, lon: -118.1445, color: 0x7fd4ff },
  {
    id: 'earth-jefferson-lab',
    label: 'Jefferson Lab',
    lat: 37.0871,
    lon: -76.473,
    color: 0x7fd4ff,
  },
  { id: 'earth-nyc', label: 'New York City', lat: 40.7128, lon: -74.006, color: 0x7fd4ff },
] as const;

const DEFAULT_ANCHOR_SCALE = 0.04;
const MIN_ZOOM = 0.78;
const MAX_ZOOM = 1.5;
const FRONT_NORMAL = latLonToVec3(STANFORD_LAT, STANFORD_LON, 1).normalize();
const STANFORD_QUAT = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), FRONT_NORMAL);
const INTERACTIVE = 'input, textarea, select, button, a, [contenteditable="true"]';

export interface EarthViewState {
  zoom: number;
  targetZoom: number;
}

export function clampEarthZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function earthWheelZoom(state: EarthViewState, deltaY: number): EarthViewState {
  const factor = Math.exp(-deltaY * 0.0012);
  return { ...state, targetZoom: clampEarthZoom(state.targetZoom * factor) };
}

export async function loadEarth(onProgress?: (p: number) => void): Promise<SceneAssets> {
  let done = 0;
  const tick = <T>(p: Promise<T>): Promise<T> =>
    p.then((v) => {
      onProgress?.(++done / 6);
      return v;
    });
  const [day, night, clouds, moon, milkyway, stars] = await Promise.all([
    tick(loadTexture('/tex/earth_day.jpg')),
    tick(loadTexture('/tex/earth_night.jpg')),
    tick(loadTexture('/tex/earth_clouds.jpg', false)),
    tick(loadTexture('/tex/moon.jpg')),
    tick(loadTextureWithFallback('/tex/milkyway.webp', '/tex/milkyway.jpg')),
    tick(loadStars()),
  ]);
  return { day, night, clouds, moon, milkyway, stars };
}

function sunGlowTexture(): Texture {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 252, 240, 1)');
    g.addColorStop(0.18, 'rgba(255, 235, 180, 0.9)');
    g.addColorStop(0.5, 'rgba(255, 200, 110, 0.25)');
    g.addColorStop(1, 'rgba(255, 180, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

export function createEarth(assets: SceneAssets): SceneInstance {
  const group = new Group();
  const surface = new Group();
  group.add(surface);
  const day = assets.day as Texture;
  const night = assets.night as Texture;
  const clouds = assets.clouds as Texture;

  // ---- the globe: day/night/city-lights/ocean-glint shader ----
  const uSunDir = new Uniform(new Vector3(1, 0, 0));
  const globe = new Mesh(new SphereGeometry(R, 96, 64), earthGlobeMaterial(day, night, uSunDir));
  surface.add(globe);

  // ---- cloud layer ----
  const cloudMesh = new Mesh(
    new SphereGeometry(R * 1.007, 64, 48),
    new MeshLambertMaterial({
      color: 0xffffff,
      alphaMap: clouds,
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
    }),
  );
  surface.add(cloudMesh);

  // ---- atmosphere rim ----
  const atmosphere = new Mesh(
    new SphereGeometry(R * 1.045, 64, 48),
    new ShaderMaterial({
      uniforms: { uSunDir },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 n = normalize(vNormal);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float rim = pow(1.0 - abs(dot(viewDir, n)), 3.4);
          float lit = 0.35 + 0.65 * max(dot(n, uSunDir), 0.0);
          gl_FragColor = vec4(vec3(0.42, 0.66, 1.0) * rim * lit, rim * lit);
        }
      `,
      side: BackSide,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  surface.add(atmosphere);

  // ---- lighting for the Lambert layers (clouds, moon) ----
  const sunLight = new DirectionalLight(0xffffff, 2.4);
  group.add(sunLight);
  group.add(new AmbientLight(0x223044, 0.5));

  // ---- the visible Sun ----
  const sunSprite = new Sprite(
    new SpriteMaterial({ map: sunGlowTexture(), transparent: true, depthWrite: false }),
  );
  sunSprite.scale.setScalar(95);
  group.add(sunSprite);

  // ---- the Moon ----
  const moonPivot = new Group();
  const moon = new Mesh(
    new SphereGeometry(0.55, 32, 24),
    new MeshLambertMaterial({ map: assets.moon as Texture, color: 0xd8d8d8 }),
  );
  moon.position.set(26, 2.5, 0);
  moonPivot.add(moon);
  group.add(moonPivot);

  // ---- Stanford beacon (childProxy: hidden when the diorama mounts) ----
  const beaconNormal = latLonToVec3(STANFORD_LAT, STANFORD_LON, 1).normalize();
  const beaconPos = beaconNormal.clone().multiplyScalar(R * 1.002);
  const beacon = new Group();
  beacon.position.copy(beaconPos);
  beacon.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), beaconNormal);

  const dot = new Mesh(new SphereGeometry(0.07, 12, 8), new MeshBasicMaterial({ color: 0xff5a5a }));
  beacon.add(dot);
  const pillarTex = canvasTexture(32, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0, 'rgba(255, 90, 90, 0.85)');
    g.addColorStop(1, 'rgba(255, 90, 90, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 128);
  });
  const pillar = new Sprite(
    new SpriteMaterial({ map: pillarTex, transparent: true, depthWrite: false }),
  );
  pillar.scale.set(0.18, 1.1, 1);
  pillar.position.y = 0.55;
  beacon.add(pillar);
  const ring = new Mesh(
    new RingGeometry(0.12, 0.16, 32),
    new MeshBasicMaterial({ color: 0xff5a5a, transparent: true, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  beacon.add(ring);
  surface.add(beacon);

  const label = textSprite(
    [
      { text: 'stanford, california', color: '#f5f8ff', size: 34 },
      { text: 'click to visit', color: '#9fddff', size: 25 },
    ],
    { worldWidth: 5.8, width: 560, opacity: 0 },
  );
  label.position.copy(beaconPos).addScaledVector(beaconNormal, 1.45);
  surface.add(label);

  // ---- coordinate signal layer ----
  const signalHotspots: Hotspot3D[] = [];
  const pinObjects: EarthPinProjection[] = [];
  for (const [priority, signal] of COORDINATE_SIGNALS.entries()) {
    const normal = latLonToVec3(signal.lat, signal.lon, 1).normalize();
    const pos = normal.clone().multiplyScalar(R * 1.018);
    const pin = new Group();
    pin.position.copy(pos);
    pin.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);
    const dot = new Mesh(
      new SphereGeometry(0.055, 10, 8),
      new MeshBasicMaterial({ color: signal.color }),
    );
    pin.add(dot);
    const glow = new Sprite(
      new SpriteMaterial({
        map: sunGlowTexture(),
        color: signal.color,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    glow.scale.setScalar(1.1);
    pin.add(glow);
    surface.add(pin);
    const signalHit = new Mesh(
      new SphereGeometry(0.72, 8, 6),
      new MeshBasicMaterial({ visible: false }),
    );
    signalHit.position.copy(pos);
    surface.add(signalHit);
    pinObjects.push({ id: signal.id, object: pin, priority });
    signalHotspots.push({
      object: signalHit,
      label: `${signal.label} coordinate signal`,
      action: { type: 'signal', signalId: signal.id, route: false },
      setHover(on) {
        glow.material.opacity = on ? 0.78 : 0.34;
        dot.scale.setScalar(on ? 1.8 : 1);
      },
    });
  }

  // ---- hotspot ----
  const hit = new Mesh(new SphereGeometry(1.5, 8, 6), new MeshBasicMaterial({ visible: false }));
  hit.position.copy(beaconPos);
  surface.add(hit);
  const hotspots: Hotspot3D[] = [
    ...signalHotspots,
    {
      object: hit,
      label: 'Zoom in to Stanford University',
      action: { type: 'zoom', dir: 'in' },
      setHover(on) {
        pillar.material.opacity = on ? 1 : 0.8;
        label.material.opacity = on ? 0.95 : 0;
      },
    },
  ];

  // ---- sky ----
  const sky = makeSky(assets.stars as StarData, {
    panorama: assets.milkyway as Texture,
    earthFixed: true,
    panoramaIntensity: 0.38,
  });
  group.add(sky);

  const sunDir = new Vector3();
  const moonHelio = new Vector3();
  const earthHelio = new Vector3();
  const stateVelocity = new Vector3();
  const rotatedSunDir = new Vector3();
  const stanfordWorldNormal = new Vector3();
  const stanfordWorldQuat = new Quaternion();
  const dragYaw = new Quaternion();
  const dragPitch = new Quaternion();
  const childAnchor: AnchorSpec = {
    position: [beaconPos.x, beaconPos.y, beaconPos.z],
    quaternion: [STANFORD_QUAT.x, STANFORD_QUAT.y, STANFORD_QUAT.z, STANFORD_QUAT.w],
    scale: DEFAULT_ANCHOR_SCALE,
  };
  let cloudSpin = 0;
  let overlayActive = false;
  let dragging = false;
  let pointerMoved = false;
  let lastX = 0;
  let lastY = 0;
  let yawVelocity = 0;
  let pitchVelocity = 0;
  let focusQuat: Quaternion | null = null;
  const viewState: EarthViewState = { zoom: 1, targetZoom: 1 };
  const canvas = document.getElementById('universe') as HTMLCanvasElement | null;
  const overlay = new EarthOverlay(
    undefined,
    (id) => {
      const signal = COORDINATE_SIGNALS.find((candidate) => candidate.id === id);
      if (!signal) return;
      const normal = latLonToVec3(signal.lat, signal.lon, 1).normalize();
      const current = normal.clone().applyQuaternion(surface.quaternion).normalize();
      const delta = new Quaternion().setFromUnitVectors(current, FRONT_NORMAL);
      focusQuat = delta.multiply(surface.quaternion.clone()).normalize();
    },
    () => resetGlobe(),
  );

  function applyDrag(dx: number, dy: number): void {
    focusQuat = null;
    dragYaw.setFromAxisAngle(new Vector3(0, 1, 0), dx * 0.006);
    dragPitch.setFromAxisAngle(new Vector3(1, 0, 0), dy * 0.0038);
    surface.quaternion.premultiply(dragYaw).premultiply(dragPitch).normalize();
    yawVelocity = dx * 0.006;
    pitchVelocity = dy * 0.0038;
  }

  function resetGlobe(): void {
    focusQuat = new Quaternion();
    viewState.targetZoom = 1;
    yawVelocity = 0;
    pitchVelocity = 0;
    overlay.select('earth-stanford-slac', false);
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!overlayActive || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(INTERACTIVE)) return;
    dragging = true;
    pointerMoved = false;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas?.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    event.preventDefault();
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    if (Math.hypot(dx, dy) > 1) pointerMoved = true;
    applyDrag(dx, dy);
    lastX = event.clientX;
    lastY = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    canvas?.releasePointerCapture?.(event.pointerId);
    if (pointerMoved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const onWheel = (event: WheelEvent) => {
    if (!overlayActive || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('#universe')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = earthWheelZoom(viewState, event.deltaY);
    viewState.targetZoom = next.targetZoom;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!overlayActive) return;
    const target = event.target;
    if (target instanceof Element && target.closest(INTERACTIVE)) return;
    const keyMap: Record<string, [number, number] | undefined> = {
      ArrowLeft: [-22, 0],
      ArrowRight: [22, 0],
      ArrowUp: [0, -22],
      ArrowDown: [0, 22],
    };
    const drag = keyMap[event.key];
    if (drag) {
      event.preventDefault();
      applyDrag(drag[0], drag[1]);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      viewState.targetZoom = clampEarthZoom(viewState.targetZoom * 1.1);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      viewState.targetZoom = clampEarthZoom(viewState.targetZoom / 1.1);
    } else if (event.key === '0') {
      event.preventDefault();
      resetGlobe();
    }
  };
  canvas?.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp, { capture: true });
  window.addEventListener('pointercancel', onPointerUp, { capture: true });
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  window.addEventListener('keydown', onKeyDown, { capture: true });
  overlay.select('earth-stanford-slac', false);

  return {
    group,
    hotspots,
    childAnchor,
    childProxy: beacon,
    update(ctx) {
      sunDirection(ctx.utcMs, sunDir);
      rotatedSunDir.copy(sunDir).applyQuaternion(surface.quaternion);
      uSunDir.value.copy(rotatedSunDir);
      sunLight.position.copy(rotatedSunDir).multiplyScalar(100);
      sunSprite.position.copy(sunDir).multiplyScalar(750);

      if (!ephemeris.hasDate(ctx.utcMs) && ephemeris.status !== 'loading')
        void ephemeris.loadFor(ctx.utcMs);
      ephemeris.state('moon', ctx.utcMs, moonHelio, stateVelocity);
      ephemeris.state('earth', ctx.utcMs, earthHelio, stateVelocity);
      moon.position.copy(moonHelio.sub(earthHelio).normalize().multiplyScalar(26));
      const gmstDeg = (280.46061837 + 360.98564736629 * daysSinceJ2000(ctx.utcMs)) % 360;
      sky.rotation.y = (-gmstDeg * Math.PI) / 180;
      setSkyOpacity(sky, skyTransitionOpacity(ctx.localT));
      overlayActive = Math.abs(ctx.localT) < 0.02;
      if (focusQuat)
        surface.quaternion.slerp(focusQuat, ctx.reducedMotion ? 1 : Math.min(1, ctx.dt * 4.5));
      if (!ctx.reducedMotion && !dragging && !focusQuat) {
        const speed = Math.abs(yawVelocity) + Math.abs(pitchVelocity);
        if (speed > 0.0001) {
          dragYaw.setFromAxisAngle(new Vector3(0, 1, 0), yawVelocity);
          dragPitch.setFromAxisAngle(new Vector3(1, 0, 0), pitchVelocity);
          surface.quaternion.premultiply(dragYaw).premultiply(dragPitch).normalize();
          yawVelocity *= 0.91;
          pitchVelocity *= 0.91;
        }
      }
      viewState.zoom +=
        (viewState.targetZoom - viewState.zoom) * (ctx.reducedMotion ? 1 : Math.min(1, ctx.dt * 6));
      surface.scale.setScalar(viewState.zoom);
      stanfordWorldNormal.copy(beaconNormal).applyQuaternion(surface.quaternion).normalize();
      childAnchor.position[0] = stanfordWorldNormal.x * R * 1.002 * viewState.zoom;
      childAnchor.position[1] = stanfordWorldNormal.y * R * 1.002 * viewState.zoom;
      childAnchor.position[2] = stanfordWorldNormal.z * R * 1.002 * viewState.zoom;
      stanfordWorldQuat.copy(surface.quaternion).multiply(STANFORD_QUAT).normalize();
      childAnchor.quaternion = [
        stanfordWorldQuat.x,
        stanfordWorldQuat.y,
        stanfordWorldQuat.z,
        stanfordWorldQuat.w,
      ];
      childAnchor.scale = DEFAULT_ANCHOR_SCALE * viewState.zoom;

      if (!ctx.reducedMotion) {
        cloudSpin += ctx.dt * 0.004;
        cloudMesh.rotation.y = cloudSpin;
        const pulse = (ctx.time % 2.2) / 2.2;
        ring.scale.setScalar(1 + pulse * 5);
        (ring.material as MeshBasicMaterial).opacity = 0.85 * (1 - pulse);
      }
    },
    syncUi(camera, viewport) {
      overlay.sync(camera, viewport, overlayActive, pinObjects, viewState.zoom);
    },
    hideUi() {
      overlayActive = false;
      overlay.hide();
    },
    setQuality() {},
    dispose() {
      overlay.dispose();
      canvas?.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onPointerUp, { capture: true });
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      group.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as MeshBasicMaterial | undefined;
        mat?.dispose?.();
      });
    },
  };
}
