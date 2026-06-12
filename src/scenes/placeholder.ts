import {
  BoxGeometry,
  CanvasTexture,
  Color,
  EdgesGeometry,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from 'three';
import type { Hotspot3D, SceneAssets, SceneDef3D, SceneInstance } from '../engine/types3d';

/**
 * Engine-milestone stand-in scenes: a wireframe 16:10 frame, a floor grid,
 * scattered boxes for parallax, an emissive marker at the anchor (the thing
 * you dive into — doubles as childProxy), and a label sprite.
 */

function textSprite(text: string, color: string): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.font = 'bold 56px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 256, 64);
  const sprite = new Sprite(new SpriteMaterial({ map: new CanvasTexture(canvas), transparent: true }));
  sprite.scale.set(4, 1, 1);
  return sprite;
}

export function placeholderCreate(def: SceneDef3D, colorHex: number) {
  return (_assets: SceneAssets): SceneInstance => {
    const group = new Group();
    const W = def.restPose.frameWidth;
    const H = W / 1.6;
    const color = new Color(colorHex);

    const frame = new LineSegments(
      new EdgesGeometry(new BoxGeometry(W, H, W / 4)),
      new LineBasicMaterial({ color }),
    );
    frame.position.set(...def.restPose.focus);
    group.add(frame);

    const grid = new GridHelper(W, 16, colorHex, 0x222244);
    grid.position.y = -H / 2 + def.restPose.focus[1];
    group.add(grid);

    // deterministic scatter for parallax depth cues
    for (let i = 0; i < 14; i++) {
      const s = W * (0.015 + 0.03 * ((i * 37) % 10) / 10);
      const box = new Mesh(
        new BoxGeometry(s, s, s),
        new MeshBasicMaterial({ color, wireframe: true }),
      );
      box.position.set(
        (((i * 131) % 100) / 100 - 0.5) * W * 0.9,
        (((i * 73) % 100) / 100 - 0.5) * H * 0.8,
        (((i * 211) % 100) / 100 - 0.5) * W * 0.3,
      );
      group.add(box);
    }

    const label = textSprite(def.label, `#${color.getHexString()}`);
    label.position.set(def.restPose.focus[0], def.restPose.focus[1] + H * 0.32, def.restPose.focus[2]);
    label.scale.multiplyScalar(W / 10);
    group.add(label);

    const hotspots: Hotspot3D[] = [];
    let childProxy;
    if (def.anchor) {
      const apparent = def.anchor.scale; // child frame width × scale ÷ ... marker sized below
      void apparent;
      const markerR = (W / 18) * 0.5;
      const marker = new Mesh(
        new SphereGeometry(markerR, 16, 12),
        new MeshBasicMaterial({ color: 0xffd479 }),
      );
      marker.position.set(...def.anchor.position);
      group.add(marker);
      childProxy = marker;

      const hit = new Mesh(
        new SphereGeometry(markerR * 3, 8, 6),
        new MeshBasicMaterial({ visible: false }),
      );
      hit.position.copy(marker.position);
      group.add(hit);
      const mat = marker.material;
      hotspots.push({
        object: hit,
        label: `Zoom in`,
        action: { type: 'zoom', dir: 'in' },
        setHover(on) {
          mat.color.set(on ? 0xffffff : 0xffd479);
        },
      });
    }

    // the screen scene exposes a monitor-face plane for the DOM overlay
    let uiMount;
    if (def.id === 'screen') {
      uiMount = new Mesh(
        new BoxGeometry(W * 0.62, (W * 0.62) / 1.6, 0.01),
        new MeshBasicMaterial({ color: 0x10142e }),
      );
      uiMount.position.set(...def.restPose.focus);
      uiMount.userData.w = W * 0.62;
      uiMount.userData.h = (W * 0.62) / 1.6;
      group.add(uiMount);
    }

    return {
      group,
      hotspots,
      childProxy,
      uiMount,
      update(ctx) {
        frame.rotation.z = Math.sin(ctx.time * 0.3) * 0.01;
      },
      setQuality() {},
      dispose() {
        group.traverse((o) => {
          const m = o as Mesh;
          m.geometry?.dispose?.();
          const mat = m.material as MeshBasicMaterial | undefined;
          mat?.map?.dispose?.();
          mat?.dispose?.();
        });
      },
    };
  };
}
