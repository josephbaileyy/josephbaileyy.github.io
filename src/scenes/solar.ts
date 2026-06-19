import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
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
import { SolarOverlay } from '../ui/solar-overlay';
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
import { makeSky } from './lib/sky';

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
  const overlay = new SolarOverlay(trackedObjects, ephemeris);
  const earthPosition = new Vector3();
  const velocity = new Vector3();
  const velocities = new Map<EphemerisBody, Vector3>(EPHEMERIS_BODIES.map((name) => [name, new Vector3()]));
  let displayUtcMs = simulationClock.utcMs;
  let orbitEpochMs = -Infinity;
  let orbitUpdateTime = -Infinity;
  let requestedYear = new Date(displayUtcMs).getUTCFullYear();
  let prefetchedYear = Number.NaN;
  let overlayActive = false;

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
      if (ctx.reducedMotion) return;
      belt.rotation.y += ctx.dt * 0.008;
    },
    syncUi(camera, viewport) {
      overlay.update(camera, viewport, overlayActive);
    },
    setQuality() {},
    dispose() {
      overlay.dispose();
      group.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        (m.material as MeshBasicMaterial | undefined)?.dispose?.();
      });
    },
  };
}

function updateOsculatingOrbit(line: LineLoop, position: Vector3, velocity: Vector3): void {
  const points = osculatingOrbitPoints(position, velocity);
  if (!points) return;
  line.geometry.setAttribute('position', new BufferAttribute(points, 3));
  line.geometry.computeBoundingSphere();
}
