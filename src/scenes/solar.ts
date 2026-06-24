import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  PointLight,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  Uniform,
  Vector3,
} from 'three';
import type { Hotspot3D, SceneAssets, SceneInstance } from '../engine/types3d';
import type { AnchorSpec } from '../engine/types3d';
import { ephemeris, EPHEMERIS_BODIES, type EphemerisBody } from '../astronomy/ephemeris';
import { simulationClock } from '../astronomy/clock';
import { osculatingOrbitPoints } from '../astronomy/orbit';
import { SolarOverlay, type TrackedBody } from '../ui/solar-overlay';
import { canvasTexture, loadStars, loadTexture, type StarData } from './lib/assets';
import {
  AU_KM,
  EARTH_RADIUS_AU,
  orbitDistance,
  PLANETS,
  planetRadius,
  SUN_RADIUS_AU,
} from './lib/astro';
import { earthGlobeMaterial } from './lib/earth-globe';
import { makeSky, setSkyOpacity, skyTransitionOpacity } from './lib/sky';

const TEXTURES: Record<string, string> = {
  mercury: '/tex/mercury.jpg',
  venus: '/tex/venus.jpg',
  earth: '/tex/earth_day.jpg',
  mars: '/tex/mars.jpg',
  jupiter: '/tex/jupiter.jpg',
  saturn: '/tex/saturn.jpg',
  uranus: '/tex/uranus.jpg',
  neptune: '/tex/neptune.jpg',
};

export async function loadSolar(onProgress?: (p: number) => void): Promise<SceneAssets> {
  const names = Object.keys(TEXTURES);
  let done = 0;
  const total = names.length + 6;
  const tick = <T>(p: Promise<T>): Promise<T> =>
    p.then((v) => {
      onProgress?.(++done / total);
      return v;
    });
  const planetTex = await Promise.all(names.map((n) => tick(loadTexture(TEXTURES[n]))));
  const [ring, moon, milkyway, stars, earthNight] = await Promise.all([
    tick(loadTexture('/tex/saturn_ring.png')),
    tick(loadTexture('/tex/moon.jpg')),
    tick(loadTexture('/tex/milkyway.jpg')),
    tick(loadStars()),
    tick(loadTexture('/tex/earth_night.jpg')),
  ]);
  await tick(ephemeris.loadFor(simulationClock.utcMs));
  const assets: SceneAssets = { ring, moon, milkyway, stars, earthNight };
  names.forEach((n, i) => (assets[`tex_${n}`] = planetTex[i]));
  return assets;
}

function coronaTexture(): Texture {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 246, 220, 1)');
    g.addColorStop(0.25, 'rgba(255, 214, 130, 0.55)');
    g.addColorStop(0.6, 'rgba(255, 160, 60, 0.14)');
    g.addColorStop(1, 'rgba(255, 140, 40, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

function glowTexture(color: string): Texture {
  const r = parseInt(color.slice(1, 3), 16);
  const gChan = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const rgba = (alpha: number) => `rgba(${r}, ${gChan}, ${b}, ${alpha})`;
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, rgba(0.28));
    g.addColorStop(0.42, rgba(0.14));
    g.addColorStop(1, rgba(0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

function cometTexture(): Texture {
  return canvasTexture(96, 96, (ctx) => {
    const g = ctx.createRadialGradient(60, 48, 0, 60, 48, 48);
    g.addColorStop(0, 'rgba(240, 255, 255, 1)');
    g.addColorStop(0.22, 'rgba(127, 212, 255, 0.72)');
    g.addColorStop(1, 'rgba(127, 212, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
  });
}

export function createSolar(assets: SceneAssets): SceneInstance {
  const group = new Group();
  const earthSunDir = new Uniform(new Vector3(1, 0, 0));

  // ---- the Sun: procedural granulation + corona + light ----
  const sunMat = new ShaderMaterial({
    uniforms: { uTime: new Uniform(0) },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                   mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }

      void main() {
        vec2 p = vUv * vec2(14.0, 7.0);
        float n = noise(p + uTime * 0.18) * 0.6 + noise(p * 2.7 - uTime * 0.11) * 0.4;
        vec3 hot = vec3(1.0, 0.94, 0.78);
        vec3 cool = vec3(1.0, 0.55, 0.16);
        vec3 color = mix(cool, hot, n) * 2.4;

        // limb darkening
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float limb = pow(max(dot(viewDir, normalize(vNormal)), 0.0), 0.55);
        color *= 0.55 + 0.45 * limb;

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sun = new Mesh(new SphereGeometry(SUN_RADIUS_AU, 48, 32), sunMat);
  group.add(sun);
  const corona = new Sprite(
    new SpriteMaterial({ map: coronaTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  corona.scale.setScalar(SUN_RADIUS_AU * 8);
  group.add(corona);
  group.add(new PointLight(0xffffff, 3.2, 0, 0));
  group.add(new AmbientLight(0x16182e, 0.6));

  // Orbit guides are recomputed from each JPL position/velocity state, so the
  // displayed body always lies on its current osculating ellipse.
  const orbitLines = new Map<EphemerisBody, LineLoop>();
  for (const p of PLANETS) {
    const line = new LineLoop(
      new BufferGeometry(),
      new LineBasicMaterial({ color: 0x5a4ec2, transparent: true, opacity: 0.42 }),
    );
    group.add(line);
    orbitLines.set(p.name as EphemerisBody, line);
  }

  // ---- planets ----
  const planetMeshes = new Map<EphemerisBody, { pivot: Group; mesh: Mesh; spin: number }>();
  const trackedObjects = new Map<EphemerisBody | 'sun', import('three').Object3D>();
  trackedObjects.set('sun', sun);
  const glowColors: Record<string, string> = {
    mercury: '#bdb6aa',
    venus: '#f2c777',
    earth: '#7fd4ff',
    mars: '#ff7c52',
    jupiter: '#ffd79a',
    saturn: '#ffe0a1',
    uranus: '#9de7ff',
    neptune: '#7aa5ff',
  };
  for (const p of PLANETS) {
    const radius = planetRadius(p.radiusKm);
    const material = p.name === 'earth'
      ? earthGlobeMaterial(assets.tex_earth as Texture, assets.earthNight as Texture, earthSunDir)
      : new MeshStandardMaterial({
        map: assets[`tex_${p.name}`] as Texture,
        roughness: 1,
        metalness: 0,
        // keep night sides readable — Earth especially is the gateway and
        // can legitimately face us with its dark side
        emissiveMap: assets[`tex_${p.name}`] as Texture,
        emissive: 0xffffff,
        emissiveIntensity: p.name === 'earth' ? 0.42 : 0.18,
      });
    const mesh = new Mesh(
      new SphereGeometry(radius, p.name === 'earth' ? 64 : 40, p.name === 'earth' ? 48 : 28),
      material,
    );
    const pivot = new Group();
    pivot.add(mesh);

    const atmosphere = new Sprite(
      new SpriteMaterial({
        map: glowTexture(glowColors[p.name]),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: p.name === 'earth' ? 0.9 : 0.42,
      }),
    );
    atmosphere.scale.setScalar(radius * (p.name === 'earth' ? 8 : 5));
    pivot.add(atmosphere);

    if (p.name === 'saturn') {
      const ringGeo = new RingGeometry(radius * 1.35, radius * 2.25, 96);
      // remap UVs radially so the ring strip texture reads outward
      const pos = ringGeo.attributes.position;
      const uv = ringGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const len = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (len - radius * 1.35) / (radius * 0.9), 0.5);
      }
      const ringMesh = new Mesh(
        ringGeo,
        new MeshBasicMaterial({
          map: assets.ring as Texture,
          side: DoubleSide,
          transparent: true,
          depthWrite: false,
        }),
      );
      ringMesh.rotation.x = Math.PI / 2 + 0.466; // 26.7° tilt, opened toward the camera
      pivot.add(ringMesh);

      const shadow = new Mesh(
        new PlaneGeometry(radius * 2.25, radius * 0.36),
        new MeshBasicMaterial({ color: 0x05030a, transparent: true, opacity: 0.36, depthWrite: false }),
      );
      shadow.rotation.x = Math.PI / 2 + 0.466;
      shadow.rotation.z = -0.18;
      pivot.add(shadow);
    }

    group.add(pivot);
    const name = p.name as EphemerisBody;
    planetMeshes.set(name, { pivot, mesh, spin: 0.2 + 0.04 / Math.max(p.a, 0.3) });
    trackedObjects.set(name, pivot);
  }

  const moonPivot = new Group();
  moonPivot.add(new Mesh(
    new SphereGeometry(1737.4 / AU_KM, 24, 16),
    new MeshStandardMaterial({ map: assets.moon as Texture, roughness: 1 }),
  ));
  group.add(moonPivot);
  trackedObjects.set('moon', moonPivot);

  // ---- a lightweight comet: line trail + glow sprite, no external assets ----
  const cometOrbit = new BufferGeometry();
  const cometTrailPoints = 120;
  const cometTrail = new Float32Array(cometTrailPoints * 3);
  for (let i = 0; i < cometTrailPoints; i++) {
    const a = (i / (cometTrailPoints - 1)) * Math.PI * 2;
    const r = 4.5 / (1 + 0.62 * Math.cos(a));
    cometTrail[i * 3] = r * Math.cos(a) - 1.2;
    cometTrail[i * 3 + 1] = Math.sin(a) * 0.16;
    cometTrail[i * 3 + 2] = r * Math.sin(a) * 0.78;
  }
  cometOrbit.setAttribute('position', new BufferAttribute(cometTrail, 3));
  const cometLine = new Line(
    cometOrbit,
    new LineBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.22 }),
  );
  group.add(cometLine);
  const comet = new Sprite(
    new SpriteMaterial({ map: cometTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  comet.scale.setScalar(0.18);
  group.add(comet);

  // ---- asteroid belt ----
  const beltCount = 2200;
  const beltGeo = new BufferGeometry();
  const beltPos = new Float32Array(beltCount * 3);
  const rIn = orbitDistance(1.524) + 0.8;
  const rOut = orbitDistance(5.203) - 1.2;
  for (let i = 0; i < beltCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rIn + Math.random() * (rOut - rIn) * (0.3 + 0.7 * Math.random());
    beltPos[i * 3] = r * Math.cos(a);
    beltPos[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    beltPos[i * 3 + 2] = r * Math.sin(a);
  }
  beltGeo.setAttribute('position', new BufferAttribute(beltPos, 3));
  const belt = new Points(
    beltGeo,
    new PointsMaterial({ color: 0x8a7a5e, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.5 }),
  );
  group.add(belt);

  // ---- sky ----
  const sky = makeSky(assets.stars as StarData, {
    panorama: assets.milkyway as Texture,
    ecliptic: true,
    panoramaIntensity: 0.45,
  });
  group.add(sky);

  // ---- Earth hotspot (the gateway) ----
  const earthEntry = planetMeshes.get('earth')!;
  const hotspots: Hotspot3D[] = [];
  const childAnchor: AnchorSpec = { position: [0, 0, 0], scale: EARTH_RADIUS_AU / 10 };
  let focusBody: TrackedBody | null = null;
  let cameraScale = 1;
  const overlay = new SolarOverlay(trackedObjects, ephemeris, (body) => {
    focusBody = body;
    for (const [name, line] of orbitLines) {
      const selected = name === body;
      const material = line.material as LineBasicMaterial;
      material.color.setHex(selected ? 0xffd479 : 0x5a4ec2);
      material.opacity = selected ? 0.9 : 0.34;
    }
  });
  const earthPosition = new Vector3();
  const velocity = new Vector3();
  const velocities = new Map<EphemerisBody, Vector3>(EPHEMERIS_BODIES.map((name) => [name, new Vector3()]));
  let displayUtcMs = simulationClock.utcMs;
  let orbitEpochMs = -Infinity;
  let orbitUpdateTime = -Infinity;
  let requestedYear = new Date(displayUtcMs).getUTCFullYear();
  let prefetchedYear = Number.NaN;
  let overlayActive = false;
  let scaleMode: 'cinematic' | 'real' = document.body.dataset.scaleMode === 'real' ? 'real' : 'cinematic';
  let qualityScale = 900;
  const applyVisualScale = () => {
    const visualScale = scaleMode === 'real' ? 1 : qualityScale;
    for (const { pivot } of planetMeshes.values()) pivot.scale.setScalar(visualScale);
    moonPivot.scale.setScalar(scaleMode === 'real' ? 1 : visualScale * 0.82);
    sun.scale.setScalar(scaleMode === 'real' ? 1 : 18);
    corona.scale.setScalar(SUN_RADIUS_AU * 8 * (scaleMode === 'real' ? 1 : 3));
    const showComet = scaleMode === 'cinematic' && qualityScale > 360;
    comet.visible = showComet;
    cometLine.visible = showComet;
  };
  const scaleListener = (event: Event) => {
    scaleMode = (event as CustomEvent<'cinematic' | 'real'>).detail === 'real' ? 'real' : 'cinematic';
    overlay.setScaleMode(scaleMode);
    applyVisualScale();
  };
  window.addEventListener('universe:scale-mode', scaleListener);
  overlay.setScaleMode(scaleMode);
  applyVisualScale();

  return {
    group,
    hotspots,
    childProxy: earthEntry.pivot,
    childAnchor,
    update(ctx) {
      sunMat.uniforms.uTime.value = ctx.time;
      const targetYear = new Date(ctx.utcMs).getUTCFullYear();
      if (ephemeris.isLoaded(ctx.utcMs)) displayUtcMs = ctx.utcMs;
      else if (targetYear !== requestedYear) {
        requestedYear = targetYear;
        void ephemeris.loadFor(ctx.utcMs);
      }
      const direction = Math.sign(simulationClock.speed);
      if (direction !== 0 && Math.abs(simulationClock.speed) >= 86400) {
        const prefetchTime = ctx.utcMs + direction * 2 * 365.25 * 86400000;
        const year = new Date(prefetchTime).getUTCFullYear();
        if (year !== prefetchedYear && !ephemeris.isLoaded(prefetchTime)) {
          prefetchedYear = year;
          void ephemeris.loadFor(prefetchTime);
        }
      }
      for (const name of EPHEMERIS_BODIES) {
        const object = trackedObjects.get(name)!;
        ephemeris.state(name, displayUtcMs, object.position, velocity);
        velocities.get(name)!.copy(velocity);
        const entry = planetMeshes.get(name);
        if (entry && !ctx.reducedMotion) entry.mesh.rotation.y += ctx.dt * entry.spin;
      }
      if (Math.abs(displayUtcMs - orbitEpochMs) >= 30 * 86400000 && ctx.time - orbitUpdateTime >= 0.25) {
        orbitEpochMs = displayUtcMs;
        orbitUpdateTime = ctx.time;
        for (const p of PLANETS) {
          const name = p.name as EphemerisBody;
          updateOsculatingOrbit(orbitLines.get(name)!, trackedObjects.get(name)!.position, velocities.get(name)!);
        }
      }
      earthPosition.copy(earthEntry.pivot.position);
      childAnchor.position[0] = earthPosition.x;
      childAnchor.position[1] = earthPosition.y;
      childAnchor.position[2] = earthPosition.z;
      earthSunDir.value.copy(earthPosition).multiplyScalar(-1).normalize();
      overlayActive = Math.abs(ctx.localT) < 0.02;
      if (ctx.localT >= 0) {
        // A focused orbit uses a closer camera while settled. Fade that
        // offset out over the opening third of the Earth dive so the camera
        // joins the physical anchor rig continuously instead of snapping
        // back to the overview pose when the overlay disappears.
        const targetScale = solarCameraScale(focusBody, ctx.localT);
        const blend = ctx.reducedMotion ? 1 : 1 - Math.exp(-ctx.dt * 4.2);
        cameraScale += (targetScale - cameraScale) * blend;
        ctx.camera.position.multiplyScalar(cameraScale);
      } else {
        cameraScale = 1;
      }
      // Fade the solar-system scaffolding — the asteroid belt ("circle of
      // dots") and orbit guides — out as the Earth dive begins, so you fly
      // through clean space toward Earth instead of a cluttered field. Full
      // opacity is restored the moment you settle back at the overview.
      const diveFade = ctx.localT > 0 ? 1 - smooth01(ctx.localT / 0.35) : 1;
      (belt.material as PointsMaterial).opacity = 0.5 * diveFade;
      for (const [name, line] of orbitLines) {
        (line.material as LineBasicMaterial).opacity = (name === focusBody ? 0.9 : 0.34) * diveFade;
      }
      setSkyOpacity(sky, skyTransitionOpacity(ctx.localT));

      if (ctx.reducedMotion) return;
      belt.rotation.y += ctx.dt * 0.008;
      const cometPhase = (ctx.time * 0.08) % (Math.PI * 2);
      const cometR = 4.5 / (1 + 0.62 * Math.cos(cometPhase));
      comet.position.set(cometR * Math.cos(cometPhase) - 1.2, Math.sin(cometPhase) * 0.16, cometR * Math.sin(cometPhase) * 0.78);
      comet.material.opacity = 0.45 + 0.35 * Math.sin(ctx.time * 1.7);
    },
    syncUi(camera, viewport) {
      overlay.update(camera, viewport, overlayActive);
    },
    hideUi() {
      overlayActive = false;
      overlay.hide();
    },
    setQuality(q) {
      belt.visible = q !== 'low';
      sky.visible = q !== 'low';
      qualityScale = q === 'high' ? 900 : q === 'med' ? 650 : 360;
      applyVisualScale();
    },
    dispose() {
      window.removeEventListener('universe:scale-mode', scaleListener);
      overlay.dispose();
      group.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        (m.material as MeshBasicMaterial | undefined)?.dispose?.();
      });
    },
  };
}

function focusScale(body: TrackedBody): number {
  if (body === 'sun') return 3 / 64;
  if (body === 'moon') return 8 / 64;
  const planet = PLANETS.find((candidate) => candidate.name === body);
  return Math.min(1, Math.max(3, (planet?.a ?? 1) * 4 + 4) / 64);
}

export function solarCameraScale(body: TrackedBody | null, localT: number): number {
  if (body === null || localT < 0) return 1;
  const focusWeight = 1 - smooth01(localT / 0.35);
  return 1 + (focusScale(body) - 1) * focusWeight;
}

function smooth01(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function updateOsculatingOrbit(line: LineLoop, position: Vector3, velocity: Vector3): void {
  const points = osculatingOrbitPoints(position, velocity);
  if (!points) return;
  line.geometry.setAttribute('position', new BufferAttribute(points, 3));
  line.geometry.computeBoundingSphere();
}
