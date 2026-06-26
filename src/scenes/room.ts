import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  Texture,
  Vector3,
} from 'three';
import type { Hotspot3D, SceneAssets, SceneInstance } from '../engine/types3d';
import { canvasTexture, loadTextureWithFallback, textSprite } from './lib/assets';

const BOOK_COLORS = [0xb83a3a, 0x7fd4ff, 0xffd479, 0x56a06b, 0x5a78e6, 0xcdd4f0, 0x8c5e9e];

export async function loadRoom(onProgress?: (p: number) => void): Promise<SceneAssets> {
  const wallpaper = await loadTextureWithFallback(
    '/tex/baileyos-wallpaper.webp',
    '/tex/baileyos-wallpaper.png',
  );
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

function roomSurfaceTexture(
  kind: 'floor' | 'wall' | 'rug' | 'wood',
): ReturnType<typeof canvasTexture> {
  return canvasTexture(
    512,
    512,
    (ctx) => {
      const base =
        kind === 'floor'
          ? '#6b5541'
          : kind === 'wall'
            ? '#4b4478'
            : kind === 'rug'
              ? '#46345f'
              : '#6b4f3a';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      let seed = kind.charCodeAt(0) * 991;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      if (kind === 'floor' || kind === 'wood') {
        for (let y = 0; y < 512; y += 44) {
          ctx.fillStyle = y % 88 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.08)';
          ctx.fillRect(0, y, 512, 2);
          ctx.strokeStyle = 'rgba(26,20,48,.28)';
          ctx.beginPath();
          ctx.moveTo(0, y + 42);
          ctx.lineTo(512, y + 42);
          ctx.stroke();
        }
        for (let i = 0; i < 130; i++) {
          const y = rand() * 512;
          ctx.strokeStyle = `rgba(20, 14, 32, ${0.06 + rand() * 0.08})`;
          ctx.lineWidth = 1 + rand() * 2;
          ctx.beginPath();
          ctx.moveTo(rand() * 512, y);
          ctx.bezierCurveTo(
            rand() * 512,
            y + rand() * 24 - 12,
            rand() * 512,
            y + rand() * 30 - 15,
            rand() * 512,
            y,
          );
          ctx.stroke();
        }
      } else if (kind === 'wall') {
        for (let i = 0; i < 4200; i++) {
          const alpha = rand() * 0.06;
          ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
          ctx.fillRect(rand() * 512, rand() * 512, 1.5, 1.5);
        }
        ctx.fillStyle = 'rgba(255, 212, 121, .035)';
        for (let y = 0; y < 512; y += 64) ctx.fillRect(0, y, 512, 1);
      } else {
        const gradient = ctx.createRadialGradient(256, 256, 20, 256, 256, 260);
        gradient.addColorStop(0, '#70598f');
        gradient.addColorStop(0.55, '#46345f');
        gradient.addColorStop(1, '#231a3a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        for (let r = 50; r < 250; r += 42) {
          ctx.strokeStyle = r % 84 ? 'rgba(127,212,255,.18)' : 'rgba(255,212,121,.2)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.ellipse(256, 256, r * 1.24, r * 0.72, -0.18, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
    1,
  );
}

function pennantTexture(): ReturnType<typeof canvasTexture> {
  return canvasTexture(
    512,
    160,
    (ctx) => {
      ctx.clearRect(0, 0, 512, 160);
      ctx.beginPath();
      ctx.moveTo(18, 24);
      ctx.lineTo(486, 80);
      ctx.lineTo(18, 136);
      ctx.closePath();
      ctx.fillStyle = '#8c1515';
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#f5f1e6';
      ctx.stroke();
      ctx.save();
      ctx.translate(42, 91);
      ctx.rotate(0.01);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px Avenir Next, system-ui, sans-serif';
      ctx.fillText('STANFORD', 0, 0);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.fillRect(25, 28, 18, 104);
    },
    2,
  );
}

type PosterKind = 'fortnite' | 'league' | 'clash';

function gamingPoster(kind: PosterKind): ReturnType<typeof canvasTexture> {
  return canvasTexture(
    512,
    704,
    (ctx) => {
      const palette =
        kind === 'fortnite'
          ? { bg: '#1a1630', a: '#ff8a1c', b: '#ffd479', title: 'ORANGE\nOMEGA' }
          : kind === 'league'
            ? { bg: '#230912', a: '#df2f42', b: '#ffd1dc', title: 'RED\nDAGGER' }
            : { bg: '#171842', a: '#8fd9ff', b: '#ffd479', title: 'ROYAL\nARCHER' };
      const gradient = ctx.createLinearGradient(0, 0, 512, 704);
      gradient.addColorStop(0, palette.bg);
      gradient.addColorStop(1, '#050816');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 704);
      ctx.strokeStyle = palette.a;
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 472, 664);

      ctx.save();
      ctx.translate(256, 310);
      if (kind === 'fortnite') {
        ctx.fillStyle = '#101322';
        ctx.beginPath();
        ctx.moveTo(-98, -120);
        ctx.lineTo(98, -120);
        ctx.lineTo(136, -28);
        ctx.lineTo(76, 102);
        ctx.lineTo(-76, 102);
        ctx.lineTo(-136, -28);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.a;
        ctx.lineWidth = 15;
        ctx.stroke();
        ctx.fillStyle = palette.a;
        ctx.fillRect(-74, -36, 148, 14);
        ctx.fillStyle = '#ffd479';
        ctx.fillRect(-58, -68, 116, 18);
        for (const sx of [-1, 1]) {
          ctx.strokeStyle = palette.a;
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.moveTo(sx * 34, 112);
          ctx.lineTo(sx * 86, 190);
          ctx.stroke();
        }
      } else if (kind === 'league') {
        for (const sx of [-1, 1]) {
          ctx.save();
          ctx.scale(sx, 1);
          ctx.rotate(-0.42);
          ctx.fillStyle = '#f1d4d9';
          ctx.fillRect(38, -190, 22, 330);
          ctx.fillStyle = palette.a;
          ctx.beginPath();
          ctx.moveTo(49, -250);
          ctx.lineTo(80, -180);
          ctx.lineTo(49, -122);
          ctx.lineTo(18, -180);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#2b0b18';
        ctx.beginPath();
        ctx.arc(0, -42, 88, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = palette.a;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-120, 72);
        ctx.bezierCurveTo(-40, 10, 40, 10, 120, 72);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#20245d';
        ctx.beginPath();
        ctx.arc(0, -40, 92, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.b;
        ctx.beginPath();
        ctx.moveTo(-84, -128);
        ctx.lineTo(-22, -90);
        ctx.lineTo(0, -152);
        ctx.lineTo(22, -90);
        ctx.lineTo(84, -128);
        ctx.lineTo(50, -60);
        ctx.lineTo(-50, -60);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.a;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(0, 42, 132, -1.1, 1.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-118, -12);
        ctx.lineTo(118, 100);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = '#eef2ff';
      ctx.textAlign = 'center';
      ctx.font = '900 50px Avenir Next, system-ui, sans-serif';
      const [top, bottom] = palette.title.split('\n');
      ctx.fillText(top, 256, 92);
      ctx.fillText(bottom, 256, 150);
      ctx.fillStyle = palette.b;
      ctx.font = '24px ui-monospace, Menlo, monospace';
      ctx.fillText(kind === 'league' ? 'noskillzjusthaxx#0425' : 'NoSkillzJustHaxx', 256, 614);
      if (kind === 'clash') {
        ctx.font = '20px ui-monospace, Menlo, monospace';
        ctx.fillText('The Newbie #QGCVQP2U', 256, 646);
      }
    },
    2,
  );
}

type SocialCardKind = 'instagram' | 'letterboxd' | 'goodreads' | 'beli' | 'steam';

function socialObjectTexture(kind: SocialCardKind): ReturnType<typeof canvasTexture> {
  return canvasTexture(
    384,
    256,
    (ctx) => {
      const styles: Record<
        SocialCardKind,
        { bg: string; fg: string; title: string; body: string }
      > = {
        instagram: { bg: '#2c225d', fg: '#ff9fd7', title: 'PHOTO STRIP', body: '@josphbailey' },
        letterboxd: { bg: '#12222d', fg: '#40bc74', title: 'MOVIE TICKET', body: '@josephbaileyy' },
        goodreads: { bg: '#efe3c9', fg: '#5a3825', title: 'BOOKPLATE', body: 'GOODREADS' },
        beli: { bg: '#f7eddf', fg: '#2f2945', title: 'BELI RECEIPT', body: '@josephbailey' },
        steam: { bg: '#111827', fg: '#7fd4ff', title: 'GAME CASE', body: 'NoSkillzJustHaxx' },
      };
      const style = styles[kind];
      ctx.fillStyle = style.bg;
      ctx.fillRect(0, 0, 384, 256);
      ctx.strokeStyle = style.fg;
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, 356, 228);
      ctx.fillStyle = style.fg;
      ctx.font = '900 28px ui-monospace, Menlo, monospace';
      ctx.fillText(style.title, 30, 54);
      ctx.font = '700 26px ui-monospace, Menlo, monospace';
      ctx.fillText(style.body, 30, 220);
      if (kind === 'instagram') {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = ['#ffd479', '#7fd4ff', '#ff9fd7', '#8f7fff'][i];
          ctx.fillRect(36 + i * 78, 86, 58, 74);
          ctx.fillStyle = 'rgba(0,0,0,.28)';
          ctx.beginPath();
          ctx.arc(65 + i * 78, 123, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (kind === 'letterboxd') {
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.arc(42 + i * 36, 102, 7, 0, Math.PI * 2);
          ctx.arc(42 + i * 36, 166, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ff7a45';
        ctx.beginPath();
        ctx.arc(168, 135, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#40bc74';
        ctx.beginPath();
        ctx.arc(210, 135, 34, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'goodreads') {
        ctx.strokeStyle = style.fg;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(74, 88);
        ctx.lineTo(312, 88);
        ctx.moveTo(74, 156);
        ctx.lineTo(312, 156);
        ctx.stroke();
        ctx.font = 'italic 34px Georgia, serif';
        ctx.fillText('JB', 168, 142);
      } else if (kind === 'beli') {
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(42, 82);
        ctx.lineTo(342, 82);
        ctx.moveTo(42, 158);
        ctx.lineTo(342, 158);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(304, 120, 24, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#0b1026';
        ctx.fillRect(46, 86, 292, 90);
        ctx.strokeStyle = style.fg;
        ctx.strokeRect(46, 86, 292, 90);
        ctx.beginPath();
        ctx.arc(154, 132, 28, 0, Math.PI * 2);
        ctx.arc(230, 132, 28, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    2,
  );
}

export function createRoom(assets: SceneAssets): SceneInstance {
  const group = new Group();
  let quality: 'high' | 'med' | 'low' = 'high';

  // ---- shell: floor + two walls (open dollhouse corner) ----
  const floorTex = roomSurfaceTexture('floor');
  const floor = new Mesh(
    new BoxGeometry(17, 0.5, 13),
    new MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: 0.92 }),
  );
  floor.position.set(0, -0.25, -0.5);
  floor.receiveShadow = true;
  group.add(floor);
  const rugTex = roomSurfaceTexture('rug');
  const rug = new Mesh(
    new CircleGeometry(3.4, 36),
    new MeshStandardMaterial({ map: rugTex, color: 0xffffff, roughness: 1 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.5, 0.01, -1.5);
  rug.receiveShadow = true;
  group.add(rug);

  const wallTex = roomSurfaceTexture('wall');
  const wallMat = new MeshStandardMaterial({ map: wallTex, color: 0xffffff, roughness: 1 });
  const backWall = new Mesh(new BoxGeometry(17, 9.5, 0.4), wallMat);
  backWall.position.set(0, 4.75, -6.7);
  backWall.receiveShadow = true;
  group.add(backWall);
  const leftWall = new Mesh(new BoxGeometry(0.4, 9.5, 13), wallMat);
  leftWall.position.set(-8.7, 4.75, -0.5);
  leftWall.receiveShadow = true;
  group.add(leftWall);

  // ---- desk ----
  const deskTex = roomSurfaceTexture('wood');
  const deskMat = new MeshStandardMaterial({ map: deskTex, color: 0xffffff, roughness: 0.82 });
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
  const stand = new Mesh(
    new CylinderGeometry(0.07, 0.09, 0.45, 8),
    new MeshStandardMaterial({ color: 0x2c2750 }),
  );
  stand.position.set(1.5, 1.95 + 0.22, -5.6);
  group.add(stand);
  const screenPool = new Mesh(
    new PlaneGeometry(2.0, 0.42),
    new MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  screenPool.rotation.x = -Math.PI / 2;
  screenPool.position.set(1.5, 2.116, -4.72);
  group.add(screenPool);

  // keyboard + mug + book stack
  const keyboard = new Mesh(
    new BoxGeometry(1.5, 0.07, 0.5),
    new MeshStandardMaterial({ color: 0x2c2750, roughness: 0.7 }),
  );
  keyboard.position.set(1.4, 2.11, -4.6);
  group.add(keyboard);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const key = new Mesh(
        new BoxGeometry(0.1, 0.018, 0.06),
        new MeshStandardMaterial({
          color: row === 0 && col > 6 ? 0x51498a : 0x11162d,
          roughness: 0.7,
        }),
      );
      key.position.set(0.92 + col * 0.12 + row * 0.02, 2.158, -4.74 + row * 0.1);
      group.add(key);
    }
  }
  const cable = new Mesh(
    new CylinderGeometry(0.018, 0.018, 1.3, 8),
    new MeshStandardMaterial({ color: 0x15132e, roughness: 0.9 }),
  );
  cable.position.set(0.45, 2.13, -4.98);
  cable.rotation.z = Math.PI / 2;
  cable.rotation.y = -0.22;
  group.add(cable);
  const mug = new Mesh(
    new CylinderGeometry(0.14, 0.12, 0.3, 12),
    new MeshStandardMaterial({ color: 0x8c1515, roughness: 0.6 }),
  );
  mug.position.set(3.3, 2.23, -4.9);
  group.add(mug);
  const bookStack = new Mesh(
    new BoxGeometry(0.8, 0.36, 0.6),
    new MeshStandardMaterial({ color: 0x3d6b8f, roughness: 0.9 }),
  );
  bookStack.position.set(-0.6, 2.26, -5.1);
  bookStack.rotation.y = 0.2;
  group.add(bookStack);
  for (let i = 0; i < 3; i++) {
    const notebook = new Mesh(
      new BoxGeometry(0.86 - i * 0.03, 0.055, 0.62 - i * 0.02),
      new MeshStandardMaterial({
        color: [0x314d7b, 0xf4eddc, 0x8c1515][i],
        roughness: 0.86,
      }),
    );
    notebook.position.set(-0.6 + i * 0.03, 2.08 + i * 0.07, -5.1 - i * 0.015);
    notebook.rotation.y = 0.2;
    group.add(notebook);
  }

  // ---- lamp: the warm key light ----
  const lampBase = new Mesh(
    new CylinderGeometry(0.3, 0.36, 0.1, 12),
    new MeshStandardMaterial({ color: 0x2c2750 }),
  );
  lampBase.position.set(4.2, 2.13, -5.5);
  group.add(lampBase);
  const lampArm = new Mesh(
    new CylinderGeometry(0.05, 0.05, 1.5, 8),
    new MeshStandardMaterial({ color: 0x2c2750 }),
  );
  lampArm.position.set(4.2, 2.9, -5.5);
  lampArm.rotation.z = 0.3;
  group.add(lampArm);
  const lampShade = new Mesh(
    new CylinderGeometry(0.16, 0.42, 0.5, 12, 1, true),
    new MeshStandardMaterial({ color: 0xb83a3a, roughness: 0.8, side: DoubleSide }),
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
  const posterWash = new PointLight(0x9fc7ff, 5.5, 8, 2);
  posterWash.position.set(-3.6, 5.2, -4.5);
  group.add(posterWash);
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
        new MeshStandardMaterial({
          color: BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)],
          roughness: 0.85,
        }),
      );
      book.position.set(-8.3, shelfY + 0.06 + bh / 2, z);
      if (rand() < 0.12) book.rotation.x = 0.18;
      group.add(book);
      z += bw + 0.025;
    }
  }

  // ---- posters ----
  const posterMatProps = {
    roughness: 0.95,
    emissive: 0xffffff as number | undefined,
    emissiveIntensity: 0.82,
  };
  const p1tex = amcvnPoster();
  const poster1 = new Mesh(
    new PlaneGeometry(1.7, 2.27),
    new MeshStandardMaterial({ map: p1tex, emissiveMap: p1tex, ...posterMatProps }),
  );
  poster1.position.set(-2.6, 5.0, -6.48);
  poster1.rotation.z = 0.012;
  const poster1Frame = new Mesh(
    new BoxGeometry(1.86, 2.43, 0.08),
    new MeshStandardMaterial({ color: 0x19172d, roughness: 0.8 }),
  );
  poster1Frame.position.set(-2.6, 5.0, -6.51);
  group.add(poster1Frame);
  group.add(poster1);
  const p2tex = powersPoster();
  const poster2 = new Mesh(
    new PlaneGeometry(1.55, 2.07),
    new MeshStandardMaterial({ map: p2tex, emissiveMap: p2tex, ...posterMatProps }),
  );
  poster2.position.set(-4.7, 4.6, -6.48);
  poster2.rotation.z = -0.018;
  const poster2Frame = new Mesh(
    new BoxGeometry(1.71, 2.23, 0.08),
    new MeshStandardMaterial({ color: 0x19172d, roughness: 0.8 }),
  );
  poster2Frame.position.set(-4.7, 4.6, -6.51);
  group.add(poster2Frame);
  group.add(poster2);

  // ---- pennant ----
  const pennantTex = pennantTexture();
  const pennant = new Mesh(
    new PlaneGeometry(2.7, 0.84),
    new MeshStandardMaterial({
      map: pennantTex,
      transparent: true,
      roughness: 1,
      side: DoubleSide,
    }),
  );
  pennant.position.set(2.95, 5.92, -6.46);
  pennant.rotation.z = -0.08;
  group.add(pennant);

  // ---- personal orbit: stylized socials as physical room objects ----
  const socialBoard = new Mesh(
    new BoxGeometry(4.3, 2.55, 0.09),
    new MeshStandardMaterial({ color: 0x2d2648, roughness: 0.95 }),
  );
  socialBoard.position.set(4.95, 4.22, -6.56);
  group.add(socialBoard);

  const makeWallCard = (
    tex: ReturnType<typeof canvasTexture>,
    width: number,
    height: number,
    x: number,
    y: number,
    z = -6.49,
  ) => {
    const frame = new Mesh(
      new BoxGeometry(width + 0.1, height + 0.1, 0.06),
      new MeshStandardMaterial({ color: 0x11162d, roughness: 0.84 }),
    );
    frame.position.set(x, y, z - 0.035);
    group.add(frame);
    const card = new Mesh(
      new PlaneGeometry(width, height),
      new MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.25,
        roughness: 0.92,
      }),
    );
    card.position.set(x, y, z);
    group.add(card);
    return card;
  };

  const clashPoster = makeWallCard(gamingPoster('clash'), 0.88, 1.22, 3.35, 4.33);
  const fortnitePoster = makeWallCard(gamingPoster('fortnite'), 0.88, 1.22, 4.52, 4.33);
  const leaguePoster = makeWallCard(gamingPoster('league'), 0.88, 1.22, 5.69, 4.33);
  const instagramCard = makeWallCard(socialObjectTexture('instagram'), 1.0, 0.66, 6.55, 5.5);
  const letterboxdCard = makeWallCard(socialObjectTexture('letterboxd'), 1.0, 0.66, 6.55, 4.73);

  const goodreadsCard = new Mesh(
    new PlaneGeometry(0.88, 0.58),
    new MeshStandardMaterial({
      map: socialObjectTexture('goodreads'),
      roughness: 0.9,
    }),
  );
  goodreadsCard.rotation.y = Math.PI / 2;
  goodreadsCard.position.set(-8.12, 5.63, -1.0);
  group.add(goodreadsCard);

  const beliReceipt = new Mesh(
    new PlaneGeometry(0.74, 0.49),
    new MeshStandardMaterial({
      map: socialObjectTexture('beli'),
      roughness: 0.9,
      side: DoubleSide,
    }),
  );
  beliReceipt.rotation.x = -Math.PI / 2;
  beliReceipt.rotation.z = -0.22;
  beliReceipt.position.set(3.42, 2.13, -4.28);
  group.add(beliReceipt);

  const steamCase = new Mesh(
    new PlaneGeometry(0.86, 0.58),
    new MeshStandardMaterial({
      map: socialObjectTexture('steam'),
      roughness: 0.88,
      side: DoubleSide,
    }),
  );
  steamCase.rotation.x = -Math.PI / 2;
  steamCase.rotation.z = 0.12;
  steamCase.position.set(4.34, 2.14, -4.42);
  group.add(steamCase);
  const controller = new Group();
  const controllerMat = new MeshStandardMaterial({ color: 0x171c34, roughness: 0.75 });
  const pad = new Mesh(new BoxGeometry(0.62, 0.11, 0.28), controllerMat);
  controller.add(pad);
  for (const x of [-0.22, 0.22]) {
    const grip = new Mesh(new SphereGeometry(0.12, 12, 8), controllerMat);
    grip.scale.set(0.82, 0.42, 1);
    grip.position.set(x, -0.02, 0.02);
    controller.add(grip);
  }
  controller.position.set(4.3, 2.22, -3.96);
  controller.rotation.y = -0.18;
  group.add(controller);

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
    new MeshStandardMaterial({
      map: windowTex,
      emissiveMap: windowTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
    }),
  );
  win.rotation.y = Math.PI / 2;
  win.position.set(-8.48, 4.6, 1.6);
  group.add(win);
  const winFrame = new Mesh(
    new BoxGeometry(0.12, 3.5, 2.9),
    new MeshStandardMaterial({ color: 0x2c2750 }),
  );
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

  // ---- personal evidence objects ----
  const spikes = new Group();
  const spikeMat = new MeshStandardMaterial({ color: 0xffd479, roughness: 0.75 });
  for (const offset of [-0.24, 0.24]) {
    const shoe = new Mesh(new BoxGeometry(0.62, 0.16, 0.24), spikeMat);
    shoe.position.set(offset, 0.12, 0);
    shoe.rotation.y = offset > 0 ? -0.18 : 0.18;
    spikes.add(shoe);
    const toe = new Mesh(new CylinderGeometry(0.025, 0.012, 0.18, 6), spikeMat);
    toe.rotation.x = Math.PI / 2;
    toe.position.set(offset + 0.2, 0.03, 0.14);
    spikes.add(toe);
  }
  spikes.position.set(-2.4, 0.08, -1.8);
  spikes.rotation.y = -0.45;
  group.add(spikes);

  const musicTex = canvasTexture(256, 192, (ctx) => {
    ctx.fillStyle = '#f4eddc';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#2a2356';
    ctx.lineWidth = 2;
    for (let staff = 0; staff < 3; staff++) {
      const y0 = 30 + staff * 48;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(24, y0 + i * 5);
        ctx.lineTo(232, y0 + i * 5);
        ctx.stroke();
      }
      ctx.fillStyle = '#2a2356';
      for (let note = 0; note < 5; note++) {
        const x = 48 + note * 34;
        const y = y0 + 7 + ((note + staff) % 4) * 4;
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.4, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + 4, y - 22, 2, 22);
      }
    }
  });
  const musicSheet = new Mesh(
    new PlaneGeometry(0.92, 0.68),
    new MeshStandardMaterial({ map: musicTex, roughness: 0.9 }),
  );
  musicSheet.rotation.x = -Math.PI / 2;
  musicSheet.rotation.z = 0.18;
  musicSheet.position.set(2.65, 2.12, -4.35);
  group.add(musicSheet);

  const signalTargets = [
    {
      id: 'room-am-cvn-poster',
      label: 'AM CVn poster',
      position: poster1.position.clone(),
      size: new Vector3(1.8, 2.4, 0.7),
    },
    {
      id: 'room-powers-poster',
      label: 'Powers-of-Ten poster',
      position: poster2.position.clone(),
      size: new Vector3(1.7, 2.2, 0.7),
    },
    {
      id: 'room-neutrino-notebook',
      label: 'Neutrino notebook',
      position: bookStack.position.clone(),
      size: new Vector3(1.2, 0.8, 1.0),
    },
    {
      id: 'room-track-spikes',
      label: 'Track spikes',
      position: spikes.position.clone().add(new Vector3(0, 0.25, 0)),
      size: new Vector3(1.4, 0.8, 1.0),
    },
    {
      id: 'room-music-sheet',
      label: 'Music sheet',
      position: musicSheet.position.clone(),
      size: new Vector3(1.2, 0.8, 0.9),
    },
    {
      id: 'room-socials-board',
      label: 'Personal orbit',
      position: socialBoard.position.clone().add(new Vector3(0, 1.02, 0.12)),
      size: new Vector3(2.4, 0.5, 0.7),
    },
    {
      id: 'room-instagram-strip',
      label: 'Instagram strip',
      position: instagramCard.position.clone(),
      size: new Vector3(1.1, 0.8, 0.7),
    },
    {
      id: 'room-letterboxd-ticket',
      label: 'Letterboxd ticket',
      position: letterboxdCard.position.clone(),
      size: new Vector3(1.1, 0.8, 0.7),
    },
    {
      id: 'room-goodreads-bookplate',
      label: 'Goodreads bookplate',
      position: goodreadsCard.position.clone(),
      size: new Vector3(0.8, 0.8, 0.9),
    },
    {
      id: 'room-beli-receipt',
      label: 'Beli receipt',
      position: beliReceipt.position.clone().add(new Vector3(0, 0.18, 0)),
      size: new Vector3(0.9, 0.5, 0.8),
    },
    {
      id: 'room-steam-case',
      label: 'Steam game case',
      position: steamCase.position.clone().add(new Vector3(0, 0.2, 0)),
      size: new Vector3(1.0, 0.55, 0.8),
    },
    {
      id: 'room-fortnite-poster',
      label: 'Fortnite poster',
      position: fortnitePoster.position.clone(),
      size: new Vector3(1.0, 1.35, 0.7),
    },
    {
      id: 'room-league-poster',
      label: 'League poster',
      position: leaguePoster.position.clone(),
      size: new Vector3(1.0, 1.35, 0.7),
    },
    {
      id: 'room-clash-poster',
      label: 'Clash poster',
      position: clashPoster.position.clone(),
      size: new Vector3(1.0, 1.35, 0.7),
    },
  ];
  const signalHotspots: Hotspot3D[] = [];
  for (const target of signalTargets) {
    const hit = new Mesh(
      new BoxGeometry(target.size.x, target.size.y, target.size.z),
      new MeshBasicMaterial({ visible: false }),
    );
    hit.position.copy(target.position);
    group.add(hit);
    const tag = textSprite([{ text: target.label, color: '#7fd4ff', size: 21 }], {
      worldWidth: 3.1,
      width: 360,
      opacity: 0.0,
    });
    tag.position.copy(target.position).add(new Vector3(0, target.size.y * 0.55 + 0.35, 0.15));
    group.add(tag);
    signalHotspots.push({
      object: hit,
      label: `${target.label} signal`,
      action: { type: 'signal', signalId: target.id },
      setHover(on) {
        tag.material.opacity = on ? 1 : 0;
      },
    });
  }

  // ---- hotspot ----
  const hit = new Mesh(new BoxGeometry(2.2, 1.7, 1.2), new MeshBasicMaterial({ visible: false }));
  hit.position.set(1.5, 2.6, -5.4);
  group.add(hit);
  const hint = textSprite([{ text: 'click the screen', color: '#7fd4ff', size: 25 }], {
    worldWidth: 3.6,
    width: 440,
    opacity: 0.92,
  });
  hint.position.set(1.5, 1.55, -4.9);
  group.add(hint);
  const hotspots: Hotspot3D[] = [
    ...signalHotspots,
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
      bulbs.forEach((bulb, index) => {
        bulb.visible = q !== 'low' || index % 2 === 0;
      });
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
