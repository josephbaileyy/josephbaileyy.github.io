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
import { canvasTexture, loadStars, loadTexture, type StarData } from './lib/assets';
import {
  daysSinceJ2000,
  orbitDistance,
  PLANETS,
  planetPosition,
  planetRadius,
  sunDirection,
} from './lib/astro';
import { earthGlobeMaterial } from './lib/earth-globe';
import { makeSky } from './lib/sky';

/** Earth year = 120 s of session time; Kepler scaling comes free. */
const DAYS_PER_SECOND = 365.25 / 120;

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
  const total = names.length + 5;
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

function labelSprite(text: string, color = '#9aa3c7'): Sprite {
  const tex = canvasTexture(256, 64, (ctx) => {
    ctx.font = '500 30px ui-monospace, Menlo, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 42);
  });
  const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.75 }));
  s.scale.set(3.4, 0.85, 1);
  return s;
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
  const sun = new Mesh(new SphereGeometry(3.0, 48, 32), sunMat);
  group.add(sun);
  const corona = new Sprite(
    new SpriteMaterial({ map: coronaTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  corona.scale.setScalar(17);
  group.add(corona);
  group.add(new PointLight(0xffffff, 3.2, 0, 0));
  group.add(new AmbientLight(0x16182e, 0.6));

  // ---- orbit rings ----
  for (const p of PLANETS) {
    const r = orbitDistance(p.a);
    const segs = 96;
    const positions = new Float32Array(segs * 3);
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      positions[i * 3] = r * Math.cos(a);
      positions[i * 3 + 2] = r * Math.sin(a);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    group.add(
      new LineLoop(geo, new LineBasicMaterial({ color: 0x5a4ec2, transparent: true, opacity: 0.42 })),
    );
  }

  // ---- planets ----
  const earthNow = planetPosition(PLANETS[2], daysSinceJ2000());
  const planetMeshes = new Map<string, { pivot: Group; mesh: Mesh; label: Sprite; spin: number }>();
  for (const p of PLANETS) {
    const radius = planetRadius(p.radius);
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
    const label = labelSprite(p.name);
    label.position.y = radius + 0.9;
    pivot.add(label);

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

    if (p.name === 'earth') {
      pivot.position.copy(earthNow); // parked at its real position today
      const moonMesh = new Mesh(
        new SphereGeometry(0.16, 16, 12),
        new MeshStandardMaterial({ map: assets.moon as Texture, roughness: 1 }),
      );
      moonMesh.position.set(1.3, 0.12, 0);
      pivot.add(moonMesh);
      label.material.color.set(0x7fd4ff);
    }

    group.add(pivot);
    planetMeshes.set(p.name, { pivot, mesh, label, spin: 0.05 + 0.4 / radius });
  }

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
  const hit = new Mesh(new SphereGeometry(1.7, 8, 6), new MeshBasicMaterial({ visible: false }));
  hit.position.copy(earthNow);
  group.add(hit);
  const hint = labelSprite('← home, click to land', '#7fd4ff');
  hint.position.copy(earthNow).add(new Vector3(0, -1.6, 0));
  hint.material.opacity = 0.65;
  group.add(hint);
  const hotspots: Hotspot3D[] = [
    {
      object: hit,
      label: 'Zoom in to Earth',
      action: { type: 'zoom', dir: 'in' },
      setHover(on) {
        earthEntry.label.material.opacity = on ? 1 : 0.75;
        hint.material.opacity = on ? 1 : 0.65;
      },
    },
  ];

  let simDays = daysSinceJ2000();

  return {
    group,
    hotspots,
    childProxy: earthEntry.pivot,
    update(ctx) {
      sunMat.uniforms.uTime.value = ctx.time;
      sunDirection(Date.now(), earthSunDir.value);
      if (ctx.reducedMotion) return;
      simDays += ctx.dt * DAYS_PER_SECOND;
      for (const p of PLANETS) {
        if (p.name === 'earth') continue; // the dive target stays put
        const entry = planetMeshes.get(p.name)!;
        planetPosition(p, simDays, entry.pivot.position);
        entry.mesh.rotation.y += ctx.dt * entry.spin;
      }
      belt.rotation.y += ctx.dt * 0.008;
    },
    setQuality() {},
    dispose() {
      group.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        (m.material as MeshBasicMaterial | undefined)?.dispose?.();
      });
    },
  };
}
