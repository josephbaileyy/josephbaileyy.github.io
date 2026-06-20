import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Hotspot3D, SceneAssets, SceneInstance } from '../engine/types3d';
import { canvasTexture, textSprite } from './lib/assets';

const SANDSTONE = 0x8f7f63;
const ROOF = 0x7e2424;
const DARKWOOD = 0x3a2f26;

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

function palm(rand: () => number): Group {
  const g = new Group();
  const trunkMat = new MeshStandardMaterial({ color: 0x4a3b30, roughness: 1 });
  let y = 0;
  let lean = (rand() - 0.5) * 0.12;
  for (let i = 0; i < 3; i++) {
    const seg = new Mesh(new CylinderGeometry(0.09 - i * 0.015, 0.11 - i * 0.015, 0.9, 6), trunkMat);
    seg.position.set(lean * i, y + 0.45, 0);
    seg.rotation.z = lean;
    seg.castShadow = true;
    g.add(seg);
    y += 0.86;
  }
  const frondMat = new MeshStandardMaterial({ color: 0x214d38, roughness: 1, side: DoubleSide });
  for (let i = 0; i < 8; i++) {
    const frond = new Mesh(new PlaneGeometry(0.16, 1.3, 1, 4), frondMat);
    const pos = frond.geometry.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const yy = pos.getY(v) + 0.65;
      pos.setZ(v, -yy * yy * 0.25); // droop
    }
    frond.geometry.computeVertexNormals();
    frond.position.set(lean * 2.6, y + 0.1, 0);
    frond.rotation.y = (i / 8) * Math.PI * 2;
    frond.rotation.x = -0.9;
    g.add(frond);
  }
  return g;
}

function archBuilding(width: number, arches: number): Group {
  const g = new Group();
  const wallMat = new MeshStandardMaterial({ color: SANDSTONE, roughness: 0.95 });
  const wall = new Mesh(new BoxGeometry(width, 2.8, 1.6), wallMat);
  wall.position.y = 1.4 + 0.8;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  // arcade: extruded wall slab with semicircular holes
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, 2.2);
  shape.lineTo(-width / 2, 2.2);
  shape.closePath();
  const step = width / arches;
  for (let i = 0; i < arches; i++) {
    const cx = -width / 2 + step * (i + 0.5);
    const hole = new Shape();
    hole.moveTo(cx - 0.45, 0);
    hole.lineTo(cx - 0.45, 1.1);
    hole.absarc(cx, 1.1, 0.45, Math.PI, 0, true);
    hole.lineTo(cx + 0.45, 0);
    hole.closePath();
    shape.holes.push(hole);
  }
  const arcade = new Mesh(new ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false }), wallMat);
  arcade.position.set(0, 0.8, 1.0);
  arcade.castShadow = true;
  arcade.receiveShadow = true;
  g.add(arcade);

  // red tile roof: triangular prism
  const roofShape = new Shape();
  roofShape.moveTo(-1.4, 0);
  roofShape.lineTo(1.4, 0);
  roofShape.lineTo(0, 1.0);
  roofShape.closePath();
  const roof = new Mesh(
    new ExtrudeGeometry(roofShape, { depth: width, bevelEnabled: false }),
    new MeshStandardMaterial({ color: ROOF, roughness: 0.9 }),
  );
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-width / 2, 4.2 - 1.0 + 0.8, 0);
  roof.castShadow = true;
  g.add(roof);
  return g;
}

export function createStanford(_assets: SceneAssets): SceneInstance {
  const group = new Group();
  const rand = rng(1885);

  // ---- floating base slab (the #1 miniature cue: a visible thick rim) ----
  const slab = new Group();
  const top = new Mesh(
    new BoxGeometry(40, 0.5, 40),
    new MeshStandardMaterial({ color: 0x35462e, roughness: 1 }),
  );
  top.position.y = -0.25;
  top.receiveShadow = true;
  slab.add(top);
  const rim = new Mesh(
    new BoxGeometry(40, 1.6, 40),
    new MeshStandardMaterial({ color: DARKWOOD, roughness: 1 }),
  );
  rim.position.y = -1.3;
  slab.add(rim);
  group.add(slab);

  // ---- lighting: moonlight + warm lamps ----
  group.add(new HemisphereLight(0x5a6eb0, 0x1a1528, 2.2));
  group.add(new AmbientLight(0x6777a8, 1.15));
  const moon = new DirectionalLight(0xa8c4ff, 3.0);
  moon.position.set(18, 30, 12);
  // Real-time shadow maps become unstable while this entire diorama is
  // nested, rotated, and scaled on Earth's surface. Directional shading keeps
  // the miniature dimensional without the transition-time shadow crawl.
  moon.castShadow = false;
  group.add(moon);
  const lamp1 = new PointLight(0xffb36b, 30, 14, 2);
  lamp1.position.set(-4, 2.6, 6);
  group.add(lamp1);
  const lamp2 = new PointLight(0xffb36b, 22, 12, 2);
  lamp2.position.set(6, 2.6, -2);
  group.add(lamp2);

  // ---- Main Quad ----
  const quad = archBuilding(16, 9);
  quad.position.set(-6, 0, 2);
  group.add(quad);
  const wing = archBuilding(10, 6);
  wing.position.set(-14, 0, -4);
  wing.rotation.y = Math.PI / 2;
  group.add(wing);

  // Memorial Church facade
  const church = new Group();
  const facadeTex = canvasTexture(256, 192, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, '#caa64f');
    g.addColorStop(1, '#7a5d2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 192);
    ctx.fillStyle = 'rgba(60, 40, 110, 0.55)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(36 + i * 46, 130, 14, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(128, 56, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a4525';
    ctx.lineWidth = 5;
    ctx.stroke();
  });
  const churchBody = new Mesh(
    new BoxGeometry(4.6, 3.6, 3),
    new MeshStandardMaterial({ color: SANDSTONE, roughness: 0.95 }),
  );
  churchBody.position.y = 1.8 + 0.0;
  churchBody.castShadow = true;
  church.add(churchBody);
  const facade = new Mesh(
    new PlaneGeometry(4.0, 3.0),
    new MeshStandardMaterial({ map: facadeTex, emissive: 0xffffff, emissiveMap: facadeTex, emissiveIntensity: 0.32 }),
  );
  facade.position.set(0, 2.0, 1.55);
  church.add(facade);
  const gableShape = new Shape();
  gableShape.moveTo(-2.3, 0);
  gableShape.lineTo(2.3, 0);
  gableShape.lineTo(0, 1.6);
  gableShape.closePath();
  const gable = new Mesh(
    new ExtrudeGeometry(gableShape, { depth: 3, bevelEnabled: false }),
    new MeshStandardMaterial({ color: ROOF, roughness: 0.9 }),
  );
  gable.position.set(0, 3.6, -1.5);
  gable.castShadow = true;
  church.add(gable);
  church.position.set(-6, 0, -2.2);
  group.add(church);

  // ---- Hoover Tower ----
  const hoover = new Group();
  const shaft = new Mesh(
    new BoxGeometry(2.4, 9, 2.4),
    new MeshStandardMaterial({ color: 0x9c8c6e, roughness: 0.95 }),
  );
  shaft.position.y = 4.5;
  shaft.castShadow = true;
  hoover.add(shaft);
  const clockTex = canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#fff6dd';
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2f24';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(32, 12);
    ctx.moveTo(32, 32);
    ctx.lineTo(46, 38);
    ctx.stroke();
  });
  const clock = new Mesh(new CircleGeometry(0.5, 24), new MeshBasicMaterial({ map: clockTex }));
  clock.position.set(0, 8.2, 1.21);
  hoover.add(clock);
  const drum = new Mesh(
    new CylinderGeometry(1.0, 1.0, 0.9, 16),
    new MeshStandardMaterial({ color: 0x9c8c6e, roughness: 0.95 }),
  );
  drum.position.y = 9.45;
  hoover.add(drum);
  const dome = new Mesh(
    new SphereGeometry(1.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshStandardMaterial({ color: ROOF, roughness: 0.85 }),
  );
  dome.position.y = 9.9;
  hoover.add(dome);
  const beaconLight = new Mesh(new SphereGeometry(0.09, 8, 6), new MeshBasicMaterial({ color: 0xff4444 }));
  beaconLight.position.y = 11.05;
  hoover.add(beaconLight);
  hoover.position.set(3, 0, -8);
  group.add(hoover);

  // ---- generic red-roof buildings ----
  for (let i = 0; i < 6; i++) {
    const w = 3 + rand() * 4;
    const h = 1.6 + rand() * 1.6;
    const d = 2.5 + rand() * 2;
    const b = new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({ color: SANDSTONE, roughness: 1 }));
    const x = -16 + rand() * 22;
    const z = -14 + rand() * 10;
    if (Math.hypot(x - 3, z + 8) < 4 || Math.hypot(x + 6, z - 2) < 5) continue;
    b.position.set(x, h / 2, z);
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
    const roofShape = new Shape();
    roofShape.moveTo(-w / 2 - 0.2, 0);
    roofShape.lineTo(w / 2 + 0.2, 0);
    roofShape.lineTo(0, 0.4 + rand() * 0.5);
    roofShape.closePath();
    const roof = new Mesh(
      new ExtrudeGeometry(roofShape, { depth: d + 0.3, bevelEnabled: false }),
      new MeshStandardMaterial({ color: ROOF, roughness: 0.9 }),
    );
    roof.position.set(x, h, z - d / 2 - 0.15);
    roof.castShadow = true;
    group.add(roof);
  }

  // ---- palms ----
  const palms: Group[] = [];
  for (let i = 0; i < 11; i++) {
    const p = palm(rand);
    const x = -17 + rand() * 32;
    const z = 4 + rand() * 12;
    p.position.set(x, 0, z);
    p.rotation.y = rand() * Math.PI * 2;
    group.add(p);
    palms.push(p);
  }

  // ---- the Oval + Palm Drive hint ----
  const oval = new Mesh(
    new CircleGeometry(3.4, 32),
    new MeshStandardMaterial({ color: 0x24341f, roughness: 1 }),
  );
  oval.rotation.x = -Math.PI / 2;
  oval.scale.y = 0.62;
  oval.position.set(2, 0.01, 10);
  oval.receiveShadow = true;
  group.add(oval);
  const drive = new Mesh(
    new PlaneGeometry(1.4, 9),
    new MeshStandardMaterial({ color: 0x2c2a33, roughness: 1 }),
  );
  drive.rotation.x = -Math.PI / 2;
  drive.position.set(2, 0.012, 16);
  group.add(drive);

  // ---- foothills + the Dish ----
  const hillMat = new MeshStandardMaterial({ color: 0x141021, roughness: 1 });
  for (const [hx, hz, hr] of [
    [-24, -16, 9],
    [-14, -20, 11],
    [-2, -22, 10],
  ] as const) {
    const hill = new Mesh(new SphereGeometry(hr, 24, 12), hillMat);
    hill.scale.y = 0.32;
    hill.position.set(hx, -1.2, hz);
    group.add(hill);
  }
  const dish = new Mesh(
    new SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshStandardMaterial({ color: 0x8a93a8, roughness: 0.6, side: DoubleSide }),
  );
  dish.rotation.x = Math.PI * 0.78;
  dish.position.set(-14, 2.6, -18);
  group.add(dish);

  // ---- the dorm with the lit window (anchor at (9, 3.0, -7), normal (0.48,0,0.87)) ----
  const v = new Vector3(0.48, 0, 0.87).normalize();
  const dorm = new Group();
  const dormWallMat = new MeshStandardMaterial({ color: 0x6e6250, roughness: 1 });
  const addDormWall = (geometry: BoxGeometry, x: number, y: number, z: number): void => {
    const wall = new Mesh(geometry, dormWallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    dorm.add(wall);
  };
  // A real opening at the anchor avoids flying through a solid box. The front
  // facade is four slabs around a 2.5 × 1.7 window; sides and back remain solid.
  addDormWall(new BoxGeometry(8, 6, 0.3), 0, 0, -1.85);
  addDormWall(new BoxGeometry(0.3, 6, 4), -3.85, 0, 0);
  addDormWall(new BoxGeometry(0.3, 6, 4), 3.85, 0, 0);
  addDormWall(new BoxGeometry(2.75, 6, 0.3), -2.625, 0, 1.85);
  addDormWall(new BoxGeometry(2.75, 6, 0.3), 2.625, 0, 1.85);
  addDormWall(new BoxGeometry(2.5, 2.15, 0.3), 0, 1.925, 1.85);
  addDormWall(new BoxGeometry(2.5, 2.15, 0.3), 0, -1.925, 1.85);
  const dormRoofShape = new Shape();
  dormRoofShape.moveTo(-4.3, 0);
  dormRoofShape.lineTo(4.3, 0);
  dormRoofShape.lineTo(0, 1.2);
  dormRoofShape.closePath();
  const dormRoof = new Mesh(
    new ExtrudeGeometry(dormRoofShape, { depth: 4.4, bevelEnabled: false }),
    new MeshStandardMaterial({ color: ROOF, roughness: 0.9 }),
  );
  dormRoof.position.set(0, 3, -2.2);
  dormRoof.castShadow = true;
  dorm.add(dormRoof);
  // dark windows grid
  const darkWinMat = new MeshBasicMaterial({ color: 0x232043 });
  for (const wx of [-3.0, 3.0]) {
    for (const wy of [-1.4, 0.4, 1.9]) {
      const win = new Mesh(new PlaneGeometry(1.1, 0.8), darkWinMat);
      win.position.set(wx, wy, 2.01);
      dorm.add(win);
    }
  }
  dorm.rotation.y = Math.atan2(v.x, v.z);
  // place body so the lit window lands exactly at the anchor
  const windowPos = new Vector3(9, 3.0, -7);
  dorm.position.copy(windowPos).addScaledVector(v, -2.01).setY(3);
  group.add(dorm);

  // the lit window — also the wipe occluder the camera flies through
  const glass = new Mesh(
    new PlaneGeometry(2.2, 1.375),
    new MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 1 }),
  );
  glass.name = 'window-glass';
  glass.position.copy(windowPos).addScaledVector(v, 0.02);
  glass.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), v);
  group.add(glass);
  const frame = new Group();
  frame.position.copy(windowPos).addScaledVector(v, 0.015);
  frame.quaternion.copy(glass.quaternion);
  const frameMat = new MeshStandardMaterial({ color: DARKWOOD, roughness: 1 });
  const frameRail = (w: number, h: number, x: number, y: number): void => {
    const rail = new Mesh(new PlaneGeometry(w, h), frameMat);
    rail.position.set(x, y, 0);
    frame.add(rail);
  };
  frameRail(0.15, 1.7, -1.175, 0);
  frameRail(0.15, 1.7, 1.175, 0);
  frameRail(2.2, 0.1625, 0, 0.76875);
  frameRail(2.2, 0.1625, 0, -0.76875);
  group.add(frame);
  const winGlow = new PointLight(0xffc98a, 8, 8, 2);
  winGlow.position.copy(windowPos).addScaledVector(v, 0.5);
  group.add(winGlow);

  const label = textSprite(
    [{ text: "my room — the light's on", color: '#ffd479', size: 28 }],
    { worldWidth: 8, width: 600 },
  );
  label.position.copy(windowPos).add(new Vector3(0, 2.4, 0));
  group.add(label);

  // ---- a few faint stars so the void isn't empty ----
  const starCount = 260;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const r = 220;
    const s = Math.sqrt(1 - u * u);
    starPos[i * 3] = r * s * Math.cos(phi);
    starPos[i * 3 + 1] = Math.abs(r * u) * 0.8 + 6;
    starPos[i * 3 + 2] = r * s * Math.sin(phi);
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new BufferAttribute(starPos, 3));
  const starField = new Points(
    starGeo,
    new PointsMaterial({ color: 0xcdd4f0, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6 }),
  );
  group.add(starField);

  // ---- hotspot ----
  const hit = new Mesh(new BoxGeometry(3, 2.4, 1.5), new MeshBasicMaterial({ visible: false }));
  hit.position.copy(windowPos);
  group.add(hit);
  const hotspots: Hotspot3D[] = [
    {
      object: hit,
      label: 'Zoom in to my room',
      action: { type: 'zoom', dir: 'in' },
      setHover(on) {
        label.material.opacity = on ? 1 : 0.9;
        winGlow.intensity = on ? 12 : 8;
      },
    },
  ];

  const glassMat = glass.material as MeshBasicMaterial;

  return {
    group,
    hotspots,
    update(ctx) {
      // through-the-window wipe: the glass dissolves just before arrival
      const t = Math.max(ctx.localT, 0);
      glassMat.opacity = 1 - smooth(0.78, 0.93, t);

      if (!ctx.reducedMotion) {
        // window flicker + hoover beacon blink
        const flicker = 0.68 + 0.025 * Math.sin(ctx.time * 7.3) * Math.sin(ctx.time * 2.1);
        glassMat.color.setHSL(0.09, 0.78, flicker);
        beaconLight.visible = ctx.time % 2 < 1.4;
      }
    },
    setQuality(q) {
      starField.visible = q !== 'low';
      palms.forEach((tree, index) => { tree.visible = q !== 'low' || index % 2 === 0; });
    },
    dispose() {
      group.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        (m.material as MeshStandardMaterial | undefined)?.dispose?.();
      });
    },
  };
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
