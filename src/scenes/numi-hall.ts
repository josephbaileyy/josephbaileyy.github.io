import {
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
} from 'three';
import type { Hotspot3D, SceneAssets, SceneInstance } from '../engine/types3d';
import { textSprite } from './lib/assets';

export function createNumiHall(_assets: SceneAssets): SceneInstance {
  const group = new Group();
  const rock = new MeshStandardMaterial({ color: 0x4d4640, roughness: 1, side: DoubleSide });
  const floor = new Mesh(new PlaneGeometry(32, 34), rock);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.1;
  group.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(32, 34), rock);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 8;
  group.add(ceiling);
  for (const x of [-9, 9]) {
    const wall = new Mesh(new PlaneGeometry(34, 11), rock);
    wall.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    wall.position.set(x, 3, 0);
    group.add(wall);
  }

  const detector = new Group();
  detector.position.y = 1.65;
  const colors = [0x63d7bc, 0x63d7bc, 0x63d7bc, 0xf2cc69, 0xe47865];
  for (let plane = 0; plane < 24; plane++) {
    const section = plane < 15 ? 0 : plane < 20 ? 3 : 4;
    const slab = new Mesh(
      new CylinderGeometry(3.05, 3.05, 0.14, 6),
      new MeshStandardMaterial({
        color: colors[section],
        emissive: colors[section],
        emissiveIntensity: 0.07,
        roughness: 0.72,
      }),
    );
    slab.rotation.x = Math.PI / 2;
    slab.position.z = 2.3 - plane * 0.21;
    detector.add(slab);
  }
  group.add(detector);

  const minos = new Group();
  minos.position.set(0, 1.6, -8.2);
  const steel = new MeshStandardMaterial({ color: 0x384b5a, metalness: 0.5, roughness: 0.58 });
  for (let plane = 0; plane < 7; plane++) {
    const plate = new Mesh(new BoxGeometry(7.6, 7.6, 0.42), steel);
    plate.position.z = -plane * 0.65;
    minos.add(plate);
  }
  group.add(minos);

  const eventProxy = new Group();
  eventProxy.position.set(0, 1.65, -2.6);
  for (let i = 0; i < 12; i++) {
    const voxel = new Mesh(
      new SphereGeometry(0.06 + (i % 3) * 0.025, 8, 6),
      new MeshBasicMaterial({ color: i % 2 ? 0xffd36e : 0x7deaff }),
    );
    voxel.position.set((i - 5.5) * 0.09, Math.sin(i * 1.7) * 0.28, Math.cos(i) * 0.22);
    eventProxy.add(voxel);
  }
  group.add(eventProxy);

  const label = textSprite(
    [
      { text: 'MINERvA', color: '#8ff3df', size: 38 },
      { text: 'tracker · ECAL · HCAL', color: '#f5d98b', size: 22 },
    ],
    { worldWidth: 7, width: 620, opacity: 0.88 },
  );
  label.position.set(-4.8, 5.7, 0);
  group.add(label);
  const minosLabel = textSprite(
    [{ text: 'MINOS near detector · muon spectrometer', color: '#a9cfe8', size: 24 }],
    { worldWidth: 7.6, width: 700, opacity: 0.72 },
  );
  minosLabel.position.set(0, 6.3, -7.7);
  group.add(minosLabel);

  group.add(new AmbientLight(0x7891a4, 1.3));
  const key = new DirectionalLight(0xc5e4ff, 2.4);
  key.position.set(5, 9, 8);
  group.add(key);
  const work = new PointLight(0x75eaff, 16, 18);
  work.position.set(-5, 5.5, 2);
  group.add(work);

  const hit = new Mesh(new SphereGeometry(1.25, 10, 8), new MeshBasicMaterial({ visible: false }));
  hit.position.copy(eventProxy.position);
  group.add(hit);
  const hotspots: Hotspot3D[] = [
    {
      object: hit,
      label: 'Enter the MINERvA active volume and inspect an event',
      action: { type: 'zoom', dir: 'in' },
      setHover(on) {
        eventProxy.scale.setScalar(on ? 1.45 : 1);
      },
    },
  ];

  return {
    group,
    hotspots,
    childProxy: eventProxy,
    update(ctx) {
      if (!ctx.reducedMotion) eventProxy.rotation.z = Math.sin(ctx.time * 0.7) * 0.08;
    },
    setQuality() {},
    dispose() {
      group.traverse((object) => {
        const mesh = object as Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material?.dispose();
      });
    },
  };
}
