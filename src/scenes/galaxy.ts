import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Uniform,
  Vector3,
} from 'three';
import type { Hotspot3D, SceneAssets, SceneInstance } from '../engine/types3d';
import { canvasTexture, textSprite } from './lib/assets';

/** deterministic RNG so the galaxy is identical every visit */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PointLayer {
  points: Points;
  material: ShaderMaterial;
}

function makePointLayer(
  count: number,
  fill: (i: number, pos: Float32Array, col: Float32Array, size: Float32Array) => void,
  blending: typeof AdditiveBlending | typeof NormalBlending = AdditiveBlending,
): PointLayer {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) fill(i, pos, col, size);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new BufferAttribute(col, 3));
  geo.setAttribute('aSize', new BufferAttribute(size, 1));
  const material = new ShaderMaterial({
    uniforms: { uFade: new Uniform(1) },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (180.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * uFade;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    blending,
    depthWrite: false,
  });
  return { points: new Points(geo, material), material };
}

function buildGalaxyPoints(): { group: Group; materials: ShaderMaterial[] } {
  const group = new Group();
  const materials: ShaderMaterial[] = [];
  const rand = mulberry32(20260611);
  const blue = new Color(0.68, 0.8, 1.0);
  const yellow = new Color(1.0, 0.88, 0.62);

  // spiral arms: r = 4·e^(0.28θ), two strong + two weak
  const arms = makePointLayer(60000, (i, pos, col, size) => {
    const armPick = rand();
    const offset = armPick < 0.36 ? 0 : armPick < 0.72 ? Math.PI : armPick < 0.86 ? Math.PI / 2 : -Math.PI / 2;
    const weak = offset === 0 || offset === Math.PI ? 1 : 0.55;
    const r = 3 + 52 * Math.pow(rand(), 1.45);
    const theta = Math.log(Math.max(r, 4) / 4) / 0.28 + offset;
    const spread = (0.55 + 0.05 * r) * weak;
    const dx = (rand() + rand() + rand() - 1.5) * spread;
    const dz = (rand() + rand() + rand() - 1.5) * spread;
    const y = (rand() + rand() + rand() - 1.5) * 1.5 * Math.exp(-r / 30);
    pos[i * 3] = r * Math.cos(theta) + dx;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = r * Math.sin(theta) + dz;
    const onSpine = Math.exp(-(dx * dx + dz * dz) / (spread * spread));
    const c = blue.clone().lerp(yellow, 1 - onSpine * 0.8);
    const bright = 0.25 + rand() * 0.9;
    col[i * 3] = c.r * bright;
    col[i * 3 + 1] = c.g * bright;
    col[i * 3 + 2] = c.b * bright;
    size[i] = 0.5 + rand() * 1.6;
  });
  group.add(arms.points);
  materials.push(arms.material);

  // central bulge
  const bulge = makePointLayer(12000, (i, pos, col, size) => {
    const g = () => rand() + rand() + rand() + rand() - 2;
    pos[i * 3] = g() * 4.5;
    pos[i * 3 + 1] = g() * 2.0;
    pos[i * 3 + 2] = g() * 4.5;
    const bright = 0.4 + rand() * 0.9;
    col[i * 3] = 1.0 * bright;
    col[i * 3 + 1] = 0.85 * bright;
    col[i * 3 + 2] = 0.6 * bright;
    size[i] = 0.6 + rand() * 1.6;
  });
  group.add(bulge.points);
  materials.push(bulge.material);

  // halo
  const halo = makePointLayer(3000, (i, pos, col, size) => {
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const r = 25 + 45 * Math.pow(rand(), 0.7);
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(phi);
    pos[i * 3 + 1] = r * u * 0.8;
    pos[i * 3 + 2] = r * s * Math.sin(phi);
    const bright = 0.15 + rand() * 0.35;
    col[i * 3] = 0.8 * bright;
    col[i * 3 + 1] = 0.82 * bright;
    col[i * 3 + 2] = 1.0 * bright;
    size[i] = 0.4 + rand() * 0.9;
  });
  group.add(halo.points);
  materials.push(halo.material);

  // dust lanes hugging arm inner edges (normal blending, drawn last)
  const dust = makePointLayer(
    3000,
    (i, pos, col, size) => {
      const offset = rand() < 0.5 ? 0 : Math.PI;
      const r = 6 + 40 * Math.pow(rand(), 1.3);
      const theta = Math.log(r / 4) / 0.28 + offset - 0.12; // inner edge
      pos[i * 3] = r * Math.cos(theta) + (rand() - 0.5) * 1.4;
      pos[i * 3 + 1] = (rand() - 0.5) * 0.8 * Math.exp(-r / 30);
      pos[i * 3 + 2] = r * Math.sin(theta) + (rand() - 0.5) * 1.4;
      col[i * 3] = 0.13;
      col[i * 3 + 1] = 0.07;
      col[i * 3 + 2] = 0.05;
      size[i] = 2.2 + rand() * 2.6;
    },
    NormalBlending,
  );
  group.add(dust.points);
  materials.push(dust.material);

  return { group, materials };
}

function makeLabel(lines: Array<[string, string, number]>): Sprite {
  return textSprite(
    lines.map(([text, color, size]) => ({ text, color, size })),
    { worldWidth: 18, width: 640 },
  );
}

/** The AM CVn binary: rotating frame, shader disk, particle stream. */
function buildBinary(): {
  group: Group;
  rotor: Group;
  diskMat: ShaderMaterial;
  streamMat: ShaderMaterial;
  stream: Points;
  streamPhase: Float32Array;
  hotSpot: Sprite;
  glint: Sprite;
} {
  const group = new Group();
  const rotor = new Group();
  group.add(rotor);

  const donor = new Mesh(
    new SphereGeometry(0.28, 24, 16),
    new MeshBasicMaterial({ color: 0xffb784 }),
  );
  donor.position.set(-0.6, 0, 0);
  donor.scale.set(1.22, 1, 1); // Roche teardrop hint, stretched toward the accretor
  rotor.add(donor);

  const accretor = new Mesh(
    new SphereGeometry(0.1, 20, 14),
    new MeshBasicMaterial({ color: 0xe8f2ff }),
  );
  accretor.position.set(0.6, 0, 0);
  rotor.add(accretor);

  // accretion disk: one shader quad, T ∝ r^(-3/4) color ramp + sheared streaks
  const diskMat = new ShaderMaterial({
    uniforms: { uTime: new Uniform(0), uDetail: new Uniform(1) },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDetail;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float r = length(vUv);
        if (r > 1.0 || r < 0.14) discard;
        float ang = atan(vUv.y, vUv.x);
        // keplerian shear: inner annuli sweep faster
        float swirl = ang + uTime * 2.2 / (sqrt(r) + 0.18);
        float streaks = 0.75 + 0.25 * hash(vec2(floor(swirl * 9.0), floor(r * 14.0)));
        // T ∝ r^(-3/4): white-hot rim of the boundary layer → orange edge
        float temp = pow(max(r, 0.16), -0.75);
        vec3 hot = vec3(0.92, 0.97, 1.0);
        vec3 cool = vec3(1.0, 0.55, 0.2);
        vec3 color = mix(cool, hot, clamp(temp * 0.34, 0.0, 1.0)) * streaks;
        float alpha = smoothstep(1.0, 0.82, r) * smoothstep(0.14, 0.3, r);
        // hot spot wedge where the stream lands (azimuth ~210°)
        float spot = exp(-pow((ang - 3.67) / 0.5, 2.0)) * smoothstep(1.0, 0.7, r) * smoothstep(0.5, 0.85, r);
        color += vec3(1.0, 0.9, 0.7) * spot * 1.4;
        gl_FragColor = vec4(color * alpha * uDetail * 1.4, alpha * uDetail);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
  const disk = new Mesh(new PlaneGeometry(2.1, 2.1), diskMat);
  disk.rotation.x = -Math.PI / 2;
  disk.position.copy(accretor.position);
  rotor.add(disk);

  // stream: 400 particles along a bent path donor-nose → disk rim
  const N = 400;
  const streamGeo = new BufferGeometry();
  const streamPos = new Float32Array(N * 3);
  const streamPhase = new Float32Array(N);
  for (let i = 0; i < N; i++) streamPhase[i] = Math.random();
  streamGeo.setAttribute('position', new BufferAttribute(streamPos, 3));
  const streamMat = new ShaderMaterial({
    uniforms: { uDetail: new Uniform(1) },
    vertexShader: /* glsl */ `
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 26.0 / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uDetail;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * uDetail;
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.55) * a, a);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const stream = new Points(streamGeo, streamMat);
  rotor.add(stream);

  // hot spot flicker sprite at the stream impact point
  const hotTex = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 240, 210, 1)');
    g.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  const hotSpot = new Sprite(
    new SpriteMaterial({ map: hotTex, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  hotSpot.scale.setScalar(0.5);
  hotSpot.position.set(0.6 + 0.82 * Math.cos(3.67), 0, 0.82 * Math.sin(3.67));
  rotor.add(hotSpot);

  // always-on beacon glint so the binary beckons from across the galaxy
  const glint = new Sprite(
    new SpriteMaterial({ map: hotTex, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  glint.scale.setScalar(2.6);
  group.add(glint);

  group.scale.setScalar(2.0);
  return { group, rotor, diskMat, streamMat, stream, streamPhase, hotSpot, glint };
}

export function createGalaxy(_assets: SceneAssets): SceneInstance {
  const group = new Group();

  const { group: points, materials: pointMats } = buildGalaxyPoints();
  points.rotation.z = 0.08;
  group.add(points);

  // distant galaxies
  const blobTex = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(230, 235, 255, 0.9)');
    g.addColorStop(0.4, 'rgba(180, 190, 240, 0.35)');
    g.addColorStop(1, 'rgba(140, 150, 220, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  const rand = mulberry32(777);
  for (let i = 0; i < 220; i++) {
    const s = new Sprite(
      new SpriteMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.12 + rand() * 0.3 }),
    );
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const r = 700 + rand() * 500;
    const sq = Math.sqrt(1 - u * u);
    s.position.set(r * sq * Math.cos(phi), r * u, r * sq * Math.sin(phi));
    s.scale.set(4 + rand() * 14, 2 + rand() * 6, 1);
    group.add(s);
  }

  // ---- AM CVn binary ----
  const binary = buildBinary();
  binary.group.position.set(-26, 6, 10);
  group.add(binary.group);
  const binaryLabel = makeLabel([
    ['AM CVn', '#7fd4ff', 34],
    ['observational project — click', '#9aa3c7', 22],
  ]);
  binaryLabel.position.copy(binary.group.position).add(new Vector3(0, -4.2, 0));
  group.add(binaryLabel);

  // ---- pulsar → particle & neutrino physics research ----
  const pulsar = new Group();
  pulsar.position.set(-16, 16, -5);
  const pulsarStar = new Mesh(new SphereGeometry(0.25, 12, 8), new MeshBasicMaterial({ color: 0x9fd4ff }));
  pulsar.add(pulsarStar);
  const beamTex = canvasTexture(32, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(159, 212, 255, 0)');
    g.addColorStop(0.5, 'rgba(159, 212, 255, 0.5)');
    g.addColorStop(1, 'rgba(159, 212, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 128);
  });
  const beams = new Mesh(
    new PlaneGeometry(0.5, 9),
    new MeshBasicMaterial({ map: beamTex, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
  );
  pulsar.add(beams);
  group.add(pulsar);
  const pulsarLabel = makeLabel([
    ['particle & neutrino physics', '#9fd4ff', 28],
    ['my research — click', '#9aa3c7', 22],
  ]);
  pulsarLabel.position.copy(pulsar.position).add(new Vector3(0, -3.4, 0));
  group.add(pulsarLabel);

  // ---- black hole → ML, systems & security projects ----
  const bh = new Group();
  bh.position.set(10, -17, 3);
  bh.add(new Mesh(new SphereGeometry(0.5, 24, 16), new MeshBasicMaterial({ color: 0x000000 })));
  const bhDisk = new Mesh(
    new PlaneGeometry(3.2, 3.2),
    new ShaderMaterial({
      uniforms: { uTime: new Uniform(0) },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2.0-1.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float r = length(vUv);
          if (r > 1.0 || r < 0.22) discard;
          float ang = atan(vUv.y, vUv.x);
          // doppler beaming: approaching side brighter
          float dopp = 0.65 + 0.5 * sin(ang);
          vec3 color = mix(vec3(1.0, 0.85, 0.5), vec3(1.0, 0.5, 0.15), r) * dopp;
          float alpha = smoothstep(1.0, 0.75, r) * smoothstep(0.22, 0.34, r);
          gl_FragColor = vec4(color * alpha * 1.3, alpha);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  bhDisk.rotation.x = -Math.PI / 2 + 0.35;
  bh.add(bhDisk);
  group.add(bh);
  const bhLabel = makeLabel([
    ['my projects, on my desk', '#ffb784', 28],
    ['dive in — click', '#9aa3c7', 22],
  ]);
  bhLabel.position.copy(bh.position).add(new Vector3(0, -3.2, 0));
  group.add(bhLabel);

  // ---- the Sun: gateway anchor ----
  const sunPos = new Vector3(24, 0.5, -10);
  const sunMarker = new Group();
  sunMarker.position.copy(sunPos);
  const sunTex = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 248, 225, 1)');
    g.addColorStop(0.3, 'rgba(255, 212, 121, 0.8)');
    g.addColorStop(1, 'rgba(255, 212, 121, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  const sunGlow = new Sprite(new SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  sunGlow.scale.setScalar(3.2);
  sunMarker.add(sunGlow);
  const sunRing = new Mesh(
    new PlaneGeometry(4, 4),
    new ShaderMaterial({
      uniforms: { uTime: new Uniform(0) },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2.0-1.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float r = length(vUv);
          float pulse = fract(uTime / 2.4);
          float ring = smoothstep(0.04, 0.0, abs(r - (0.25 + pulse * 0.6)));
          gl_FragColor = vec4(vec3(1.0, 0.83, 0.47) * ring * (1.0 - pulse), ring * (1.0 - pulse));
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  sunMarker.add(sunRing);
  group.add(sunMarker);
  const sunLabel = makeLabel([
    ['the Sun — you are here', '#ffd479', 26],
    ['click to fly home', '#9aa3c7', 20],
  ]);
  sunLabel.position.copy(sunPos).add(new Vector3(0, -3.4, 0));
  group.add(sunLabel);

  // ---- hotspots ----
  const binaryHit = new Mesh(new SphereGeometry(5, 8, 6), new MeshBasicMaterial({ visible: false }));
  binaryHit.position.copy(binary.group.position);
  group.add(binaryHit);
  const sunHit = new Mesh(new SphereGeometry(4, 8, 6), new MeshBasicMaterial({ visible: false }));
  sunHit.position.copy(sunPos);
  group.add(sunHit);
  const pulsarHit = new Mesh(new SphereGeometry(4, 8, 6), new MeshBasicMaterial({ visible: false }));
  pulsarHit.position.copy(pulsar.position);
  group.add(pulsarHit);
  const bhHit = new Mesh(new SphereGeometry(4, 8, 6), new MeshBasicMaterial({ visible: false }));
  bhHit.position.copy(bh.position);
  group.add(bhHit);

  const hotspots: Hotspot3D[] = [
    {
      object: binaryHit,
      label: 'AM CVn — observational photometry project',
      action: { type: 'panel', panelId: 'am-cvn' },
      setHover(on) {
        binaryLabel.material.opacity = on ? 1 : 0.9;
        binary.glint.scale.setScalar(on ? 3.4 : 2.6);
      },
    },
    {
      object: pulsarHit,
      label: 'Particle & neutrino physics research',
      action: { type: 'panel', panelId: 'research' },
      setHover(on) {
        pulsarLabel.material.opacity = on ? 1 : 0.9;
        pulsarStar.scale.setScalar(on ? 1.6 : 1);
      },
    },
    {
      object: bhHit,
      label: 'Dive to my computer — projects live in BaileyOS',
      action: { type: 'navigate', index: 5 },
      setHover(on) {
        bhLabel.material.opacity = on ? 1 : 0.9;
      },
    },
    {
      object: sunHit,
      label: 'Zoom in to the Solar System',
      action: { type: 'zoom', dir: 'in' },
      setHover(on) {
        sunLabel.material.opacity = on ? 1 : 0.9;
        sunGlow.scale.setScalar(on ? 4.2 : 3.2);
      },
    },
  ];

  const P0 = new Vector3(-0.34, 0, 0);
  const P1 = new Vector3(-0.45, 0, -0.38);
  const P2 = new Vector3(0.6 + 0.82 * Math.cos(3.67), 0, 0.82 * Math.sin(3.67));
  const tmp = new Vector3();
  const binWorld = new Vector3();

  return {
    group,
    hotspots,
    childProxy: sunMarker,
    update(ctx) {
      const reduced = ctx.reducedMotion;
      if (!reduced) points.rotation.y += ctx.dt * 0.004;

      // dive fade: the galaxy dissolves as the camera plunges into the Sun —
      // this is what covers the 10^9 scale cheat
      const fade = 1 - smoothstep(0.62, 0.96, Math.max(ctx.localT, 0));
      for (const m of pointMats) m.uniforms.uFade.value = fade;

      // AM CVn
      if (!reduced) binary.rotor.rotation.y = (ctx.time * 2 * Math.PI) / 6;
      binary.diskMat.uniforms.uTime.value = ctx.time;
      const positions = binary.stream.geometry.attributes.position as BufferAttribute;
      for (let i = 0; i < binary.streamPhase.length; i++) {
        if (!reduced) {
          binary.streamPhase[i] += ctx.dt * (0.22 + 0.95 * binary.streamPhase[i]);
          if (binary.streamPhase[i] > 1) binary.streamPhase[i] -= 1;
        }
        const s = binary.streamPhase[i];
        // quadratic bézier with a little jitter
        tmp
          .copy(P0)
          .multiplyScalar((1 - s) * (1 - s))
          .addScaledVector(P1, 2 * (1 - s) * s)
          .addScaledVector(P2, s * s);
        positions.setXYZ(
          i,
          tmp.x + (Math.sin(i * 37.3) * 0.02),
          tmp.y + (Math.cos(i * 51.7) * 0.015),
          tmp.z + (Math.sin(i * 17.9) * 0.02),
        );
      }
      positions.needsUpdate = true;

      // hot spot flickers once per orbit (superhump photometry, basically)
      const orbPhase = (ctx.time % 6) / 6;
      binary.hotSpot.material.opacity = 0.55 + 0.45 * Math.exp(-Math.pow((orbPhase - 0.5) / 0.12, 2));
      binary.glint.material.opacity = 0.6 + 0.4 * Math.sin(ctx.time * 2.1);

      // LOD: full detail only when reasonably close
      binary.group.getWorldPosition(binWorld);
      const dist = ctx.camera.position.distanceTo(binWorld);
      const detail = 1 - smoothstep(55, 110, dist);
      binary.diskMat.uniforms.uDetail.value = detail;
      binary.streamMat.uniforms.uDetail.value = detail;

      if (!reduced) {
        beams.rotation.z = ctx.time * (Math.PI * 2) / 1.5;
        (bhDisk.material as ShaderMaterial).uniforms.uTime.value = ctx.time;
        (sunRing.material as ShaderMaterial).uniforms.uTime.value = ctx.time;
      }
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

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
