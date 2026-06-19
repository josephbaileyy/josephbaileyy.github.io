import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Texture,
} from 'three';
import type { SceneAssets, SceneInstance } from '../engine/types3d';
import { loadTexture } from './lib/assets';

export async function loadScreen(onProgress?: (p: number) => void): Promise<SceneAssets> {
  const wallpaper = await loadTexture('/tex/baileyos-wallpaper.png');
  wallpaper.repeat.set(1, 0.9375);
  wallpaper.offset.y = 0.03125;
  onProgress?.(1);
  return { wallpaper };
}

/**
 * The final scene: the monitor face, full frame. The wallpaper stays in GL;
 * the actual interface is the DOM fake OS that docks over `uiMount`.
 */
export function createScreen(assets: SceneAssets): SceneInstance {
  const group = new Group();

  const bezel = new Mesh(
    new BoxGeometry(17.4, 11.2, 0.6),
    new MeshBasicMaterial({ color: 0x100e24 }),
  );
  bezel.position.z = -0.32;
  group.add(bezel);

  const wallpaper = new MeshBasicMaterial({ map: assets.wallpaper as Texture });
  const face = new Mesh(new PlaneGeometry(16, 10), wallpaper);
  group.add(face);

  const uiMount = new Object3D();
  uiMount.position.set(0, -0.1, 0.02);
  uiMount.userData.w = 14.4;
  uiMount.userData.h = 8.6;
  group.add(uiMount);

  return {
    group,
    hotspots: [],
    uiMount,
    update() {},
    setQuality() {},
    dispose() {
      bezel.geometry.dispose();
      (bezel.material as MeshBasicMaterial).dispose();
      face.geometry.dispose();
      wallpaper.map?.dispose();
      wallpaper.dispose();
    },
  };
}
