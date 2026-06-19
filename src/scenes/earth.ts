import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
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
import { canvasTexture, loadStars, loadTexture, textSprite, type StarData } from './lib/assets';
import { latLonToVec3, STANFORD_LAT, STANFORD_LON, sunDirection } from './lib/astro';
import { earthGlobeMaterial } from './lib/earth-globe';
import { makeSky } from './lib/sky';

const R = 10;

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
    tick(loadTexture('/tex/milkyway.jpg')),
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
  const day = assets.day as Texture;
  const night = assets.night as Texture;
  const clouds = assets.clouds as Texture;

  // ---- the globe: day/night/city-lights/ocean-glint shader ----
  const uSunDir = new Uniform(new Vector3(1, 0, 0));
  const globe = new Mesh(
    new SphereGeometry(R, 96, 64),
    earthGlobeMaterial(day, night, uSunDir),
  );
  group.add(globe);

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
  group.add(cloudMesh);

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
  group.add(atmosphere);

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
  const pillar = new Sprite(new SpriteMaterial({ map: pillarTex, transparent: true, depthWrite: false }));
  pillar.scale.set(0.18, 1.1, 1);
  pillar.position.y = 0.55;
  beacon.add(pillar);
  const ring = new Mesh(
    new RingGeometry(0.12, 0.16, 32),
    new MeshBasicMaterial({ color: 0xff5a5a, transparent: true, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  beacon.add(ring);
  group.add(beacon);

  const label = textSprite(
    [
      { text: 'stanford, california', color: '#f5f8ff', size: 34 },
      { text: 'click to visit', color: '#9fddff', size: 25 },
    ],
    { worldWidth: 8, width: 640 },
  );
  label.position.copy(beaconPos).addScaledVector(beaconNormal, 1.9);
  group.add(label);

  // ---- hotspot ----
  const hit = new Mesh(new SphereGeometry(1.5, 8, 6), new MeshBasicMaterial({ visible: false }));
  hit.position.copy(beaconPos);
  group.add(hit);
  const hotspots: Hotspot3D[] = [
    {
      object: hit,
      label: 'Zoom in to Stanford University',
      action: { type: 'zoom', dir: 'in' },
      setHover(on) {
        pillar.material.opacity = on ? 1 : 0.8;
        label.material.opacity = on ? 1 : 0.85;
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
  let cloudSpin = 0;

  return {
    group,
    hotspots,
    childProxy: beacon,
    update(ctx) {
      sunDirection(Date.now(), sunDir);
      uSunDir.value.copy(sunDir);
      sunLight.position.copy(sunDir).multiplyScalar(100);
      sunSprite.position.copy(sunDir).multiplyScalar(750);

      if (!ctx.reducedMotion) {
        cloudSpin += ctx.dt * 0.004;
        cloudMesh.rotation.y = cloudSpin;
        moonPivot.rotation.y = (ctx.time * 2 * Math.PI) / 90;
        const pulse = (ctx.time % 2.2) / 2.2;
        ring.scale.setScalar(1 + pulse * 5);
        (ring.material as MeshBasicMaterial).opacity = 0.85 * (1 - pulse);
      }
    },
    setQuality() {},
    dispose() {
      group.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as MeshBasicMaterial | undefined;
        mat?.dispose?.();
      });
    },
  };
}
