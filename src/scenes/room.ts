import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Texture,
} from 'three';
import type { Hotspot3D, SceneAssets, SceneInstance } from '../engine/types3d';
import { canvasTexture, loadTexture, textSprite } from './lib/assets';

const BOOK_COLORS = [0xb83a3a, 0x7fd4ff, 0xffd479, 0x56a06b, 0x5a78e6, 0xcdd4f0, 0x8c5e9e];

export async function loadRoom(onProgress?: (p: number) => void): Promise<SceneAssets> {
  const wallpaper = await loadTexture('/tex/baileyos-wallpaper.png');
  wallpaper.repeat.set(1, 0.9375);
  wallpaper.offset.y = 0.03125;
  onProgress?.(1);
  return { wallpaper };
}

function amcvnPoster(): ReturnType<typeof canvasTexture> {
  return canvasTexture(384, 512, (ctx) => {
    ctx.fillStyle = '#0d1130';
    ctx.fillRect(0, 0, 384, 512);
    ctx.strokeStyle = '#2a2356';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.ellipse(192, 180, 130, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffb784';
    ctx.beginPath();
    ctx.arc(96, 196, 16, 0, Math.PI * 2);
    ctx.fill();
    // disk swirl
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(127, 212, 255, ${0.7 - i * 0.15})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(268, 162, 24 + i * 12, 9 + i * 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#eef2ff';
    ctx.beginPath();
    ctx.arc(268, 162, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7fd4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, 192);
    ctx.quadraticCurveTo(190, 150, 232, 152);
    ctx.stroke();
    // chirp spectrogram
    ctx.strokeStyle = '#ffd479';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(48, 420);
    for (let x = 0; x <= 280; x += 4) {
      ctx.lineTo(48 + x, 420 - Math.pow(x / 280, 3.2) * 110);
    }
    ctx.stroke();
    ctx.fillStyle = '#7fd4ff';
    ctx.font = 'bold 34px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AM CVn', 192, 300);
    ctx.fillStyle = '#9aa3c7';
    ctx.font = '20px ui-monospace, Menlo, monospace';
    ctx.fillText('P_orb 5–65 min', 192, 334);
    ctx.fillText('f ∝ (1−t/tc)^(−3/8)', 192, 470);
  });
}

function powersPoster(): ReturnType<typeof canvasTexture> {
  return canvasTexture(384, 512, (ctx) => {
    ctx.fillStyle = '#11102a';
    ctx.fillRect(0, 0, 384, 512);
    const labels = ['10²¹', '10¹³', '10⁷', '10²', '10⁰'];
    const colors = ['#8f7fff', '#ffd479', '#4f9fff', '#b8835a', '#7fd4ff'];
    for (let i = 0; i < 5; i++) {
      const s = 340 - i * 64;
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 3;
      ctx.strokeRect(192 - s / 2, 230 - s / 2 + 20, s, s);
      ctx.fillStyle = colors[i];
      ctx.font = '16px ui-monospace, Menlo, monospace';
      ctx.fillText(labels[i], 200 + s / 2 - 44, 230 - s / 2 + 42);
    }
    ctx.fillStyle = '#eef2ff';
    ctx.font = 'bold 26px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('POWERS OF TEN', 192, 475);
  });
}

export function createRoom(assets: SceneAssets): SceneInstance {
  const group = new Group();
  let quality: 'high' | 'med' | 'low' = 'high';

  // ---- shell: floor + two walls (open dollhouse corner) ----
  const floor = new Mesh(
    new BoxGeometry(17, 0.5, 13),
    new MeshStandardMaterial({ color: 0x6b5541, roughness: 0.9 }),
  );
  floor.position.set(0, -0.25, -0.5);
  floor.receiveShadow = true;
  group.add(floor);
  const rug = new Mesh(
    new CircleGeometry(3.4, 36),
    new MeshStandardMaterial({ color: 0x46345f, roughness: 1 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.5, 0.01, -1.5);
  rug.receiveShadow = true;
  group.add(rug);

  const wallMat = new MeshStandardMaterial({ color: 0x4b4478, roughness: 1 });
  const backWall = new Mesh(new BoxGeometry(17, 9.5, 0.4), wallMat);
  backWall.position.set(0, 4.75, -6.7);
  backWall.receiveShadow = true;
  group.add(backWall);
  const leftWall = new Mesh(new BoxGeometry(0.4, 9.5, 13), wallMat);
  leftWall.position.set(-8.7, 4.75, -0.5);
  leftWall.receiveShadow = true;
  group.add(leftWall);

  // ---- desk ----
  const deskMat = new MeshStandardMaterial({ color: 0x6b4f3a, roughness: 0.8 });
  const deskTop = new Mesh(new BoxGeometry(6.4, 0.25, 2.4), deskMat);
  deskTop.position.set(1.5, 1.95, -5.2);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  group.add(deskTop);
  for (const [lx, lz] of [
    [-1.4, -0.9],
    [4.4, -0.9],
    [-1.4, 0.9],
    [4.4, 0.9],
  ] as const) {
    const leg = new Mesh(new CylinderGeometry(0.09, 0.09, 1.85, 8), deskMat);
    leg.position.set(lx, 0.95, -5.2 + lz);
    group.add(leg);
  }

  // ---- monitor (screen face = childProxy; screen scene mounts here) ----
  const bezel = new Mesh(
    new BoxGeometry(1.62, 1.06, 0.1),
    new MeshStandardMaterial({ color: 0x15132e, roughness: 0.5 }),
  );
  // front face sits behind the nested screen scene's plane (z=-5.5) — no z-fight
  bezel.position.set(1.5, 2.6, -5.59);
  bezel.castShadow = true;
  group.add(bezel);
  const wallpaperMat = new MeshBasicMaterial({ map: assets.wallpaper as Texture });
  const screenFace = new Mesh(new PlaneGeometry(1.4, 0.875), wallpaperMat);
  screenFace.position.set(1.5, 2.6, -5.49);
  group.add(screenFace);
  const stand = new Mesh(new CylinderGeometry(0.07, 0.09, 0.45, 8), new MeshStandardMaterial({ color: 0x2c2750 }));
  stand.position.set(1.5, 1.95 + 0.22, -5.6);
  group.add(stand);

  // keyboard + mug + book stack
  const keyboard = new Mesh(new BoxGeometry(1.5, 0.07, 0.5), new MeshStandardMaterial({ color: 0x2c2750, roughness: 0.7 }));
  keyboard.position.set(1.4, 2.11, -4.6);
  group.add(keyboard);
  const mug = new Mesh(new CylinderGeometry(0.14, 0.12, 0.3, 12), new MeshStandardMaterial({ color: 0x8c1515, roughness: 0.6 }));
  mug.position.set(3.3, 2.23, -4.9);
  group.add(mug);
  const bookStack = new Mesh(new BoxGeometry(0.8, 0.36, 0.6), new MeshStandardMaterial({ color: 0x3d6b8f, roughness: 0.9 }));
  bookStack.position.set(-0.6, 2.26, -5.1);
  bookStack.rotation.y = 0.2;
  group.add(bookStack);

  // ---- lamp: the warm key light ----
  const lampBase = new Mesh(new CylinderGeometry(0.3, 0.36, 0.1, 12), new MeshStandardMaterial({ color: 0x2c2750 }));
  lampBase.position.set(4.2, 2.13, -5.5);
  group.add(lampBase);
  const lampArm = new Mesh(new CylinderGeometry(0.05, 0.05, 1.5, 8), new MeshStandardMaterial({ color: 0x2c2750 }));
  lampArm.position.set(4.2, 2.9, -5.5);
  lampArm.rotation.z = 0.3;
  group.add(lampArm);
  const lampShade = new Mesh(
    new CylinderGeometry(0.16, 0.42, 0.5, 12, 1, true),
    new MeshStandardMaterial({ color: 0xb83a3a, roughness: 0.8, side: 2 }),
  );
  lampShade.position.set(3.85, 3.6, -5.5);
  lampShade.rotation.z = 0.5;
  group.add(lampShade);
  const lampLight = new PointLight(0xffb36b, 40, 18, 2);
  lampLight.position.set(3.7, 3.4, -5.2);
  // Avoid a cross-scene shadow map while the room is nested in the Stanford
  // window. The modeled lighting remains; only the unstable map is removed.
  lampLight.castShadow = false;
  group.add(lampLight);
  const monitorGlow = new PointLight(0x9fc7ff, 8, 7, 2);
  monitorGlow.position.set(1.5, 2.7, -4.9);
  group.add(monitorGlow);
  group.add(new AmbientLight(0x5a5594, 3.0));
  group.add(new HemisphereLight(0x5d5aa0, 0x2d2745, 2.35));

  // ---- bookshelf on the left wall ----
  const shelfMat = new MeshStandardMaterial({ color: 0x4a3828, roughness: 0.9 });
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (const shelfY of [3.4, 5.0]) {
    const board = new Mesh(new BoxGeometry(0.18, 0.12, 4.4), shelfMat);
    board.position.set(-8.35, shelfY, -2.4);
    group.add(board);
    let z = -4.4;
    while (z < -0.6) {
      const bw = 0.14 + rand() * 0.12;
      const bh = 0.6 + rand() * 0.35;
      const book = new Mesh(
        new BoxGeometry(0.5, bh, bw),
        new MeshStandardMaterial({ color: BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)], roughness: 0.85 }),
      );
      book.position.set(-8.3, shelfY + 0.06 + bh / 2, z);
      if (rand() < 0.12) book.rotation.x = 0.18;
      group.add(book);
      z += bw + 0.025;
    }
  }

  // ---- posters ----
  const posterMatProps = { roughness: 0.95, emissive: 0xffffff as number | undefined, emissiveIntensity: 0.5 };
  const p1tex = amcvnPoster();
  const poster1 = new Mesh(
    new PlaneGeometry(1.7, 2.27),
    new MeshStandardMaterial({ map: p1tex, emissiveMap: p1tex, ...posterMatProps }),
  );
  poster1.position.set(-2.6, 5.0, -6.48);
  poster1.rotation.z = 0.012;
  group.add(poster1);
  const p2tex = powersPoster();
  const poster2 = new Mesh(
    new PlaneGeometry(1.55, 2.07),
    new MeshStandardMaterial({ map: p2tex, emissiveMap: p2tex, ...posterMatProps }),
  );
  poster2.position.set(-4.7, 4.6, -6.48);
  poster2.rotation.z = -0.018;
  group.add(poster2);

  // ---- pennant ----
  const pennantShape = new Shape();
  pennantShape.moveTo(0, 0);
  pennantShape.lineTo(2.4, 0.32);
  pennantShape.lineTo(0, 0.64);
  pennantShape.closePath();
  const pennantTex = canvasTexture(256, 96, (ctx) => {
    ctx.fillStyle = '#8c1515';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Avenir Next, sans-serif';
    ctx.fillText('STANFORD', 14, 58);
  });
  const pennant = new Mesh(
    new ShapeGeometry(pennantShape),
    new MeshStandardMaterial({ map: pennantTex, roughness: 1 }),
  );
  pennant.position.set(2.6, 5.6, -6.45);
  pennant.rotation.z = -0.08;
  group.add(pennant);

  // ---- window on the left wall: the sky you came from ----
  const windowTex = canvasTexture(256, 320, (ctx) => {
    ctx.fillStyle = '#0b1026';
    ctx.fillRect(0, 0, 256, 320);
    let s = 11;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    ctx.fillStyle = '#eef2ff';
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = 0.3 + r() * 0.7;
      ctx.fillRect(r() * 256, r() * 320, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    // tiny galaxy callback
    ctx.save();
    ctx.translate(170, 80);
    ctx.rotate(-0.4);
    for (let i = 3; i > 0; i--) {
      ctx.strokeStyle = `rgba(90, 120, 230, ${0.25 * i})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, i * 12, i * 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff6dd';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  const win = new Mesh(
    new PlaneGeometry(2.6, 3.2),
    new MeshStandardMaterial({ map: windowTex, emissiveMap: windowTex, emissive: 0xffffff, emissiveIntensity: 0.5 }),
  );
  win.rotation.y = Math.PI / 2;
  win.position.set(-8.48, 4.6, 1.6);
  group.add(win);
  const winFrame = new Mesh(new BoxGeometry(0.12, 3.5, 2.9), new MeshStandardMaterial({ color: 0x2c2750 }));
  winFrame.position.set(-8.52, 4.6, 1.6);
  group.add(winFrame);

  // ---- string lights ----
  const bulbs: Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -6.5 + i * 1.45;
    const y = 7.6 - Math.sin((i / 8) * Math.PI) * 0.7;
    const bulb = new Mesh(
      new SphereGeometry(0.07, 8, 6),
      new MeshBasicMaterial({ color: i % 2 ? 0xffd479 : 0x7fd4ff }),
    );
    bulb.position.set(x, y, -6.4);
    group.add(bulb);
    bulbs.push(bulb);
  }

  // ---- chair ----
  const chair = new Group();
  const chairMat = new MeshStandardMaterial({ color: 0x2c2554, roughness: 0.9 });
  const seat = new Mesh(new BoxGeometry(1.5, 0.18, 1.4), chairMat);
  seat.position.y = 1.35;
  seat.castShadow = true;
  chair.add(seat);
  const back = new Mesh(new BoxGeometry(1.4, 1.7, 0.16), chairMat);
  back.position.set(0, 2.2, 0.65);
  back.rotation.x = -0.12;
  back.castShadow = true;
  chair.add(back);
  const post = new Mesh(new CylinderGeometry(0.07, 0.07, 1.0, 8), chairMat);
  post.position.y = 0.8;
  chair.add(post);
  const base = new Mesh(new CylinderGeometry(0.55, 0.55, 0.08, 12), chairMat);
  base.position.y = 0.3;
  chair.add(base);
  // pulled aside so it never blocks the monitor from the rest pose
  chair.position.set(-2.4, 0, -3.6);
  chair.rotation.y = 0.7;
  group.add(chair);

  // ---- hotspot ----
  const hit = new Mesh(new BoxGeometry(2.2, 1.7, 1.2), new MeshBasicMaterial({ visible: false }));
  hit.position.set(1.5, 2.6, -5.4);
  group.add(hit);
  const hint = textSprite(
    [{ text: 'click the screen', color: '#7fd4ff', size: 25 }],
    { worldWidth: 3.6, width: 440, opacity: 0.92 },
  );
  hint.position.set(1.5, 1.55, -4.9);
  group.add(hint);
  const hotspots: Hotspot3D[] = [
    {
      object: hit,
      label: 'Zoom in to my computer screen',
      action: { type: 'zoom', dir: 'in' },
      setHover(on) {
        hint.material.opacity = on ? 1 : 0.85;
        monitorGlow.intensity = on ? 8 : 5;
      },
    },
  ];

  return {
    group,
    hotspots,
    childProxy: screenFace,
    update(ctx) {
      if (!ctx.reducedMotion) {
        lampLight.intensity = 26 * (1 + 0.03 * Math.sin(ctx.time * 9.1) * Math.sin(ctx.time * 3.7));
        bulbs.forEach((b, i) => {
          if (quality === 'low' && i % 2 === 1) return;
          (b.material as MeshBasicMaterial).opacity = 1;
          const tw = 0.75 + 0.25 * Math.sin(ctx.time * 1.7 + i * 1.3);
          b.scale.setScalar(0.9 + tw * 0.25);
        });
      }
    },
    setQuality(q) {
      quality = q;
      bulbs.forEach((bulb, index) => { bulb.visible = q !== 'low' || index % 2 === 0; });
    },
    dispose() {
      group.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        (m.material as MeshStandardMaterial | undefined)?.dispose?.();
      });
      (assets.wallpaper as Texture).dispose();
    },
  };
}
