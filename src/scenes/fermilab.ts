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
  RingGeometry,
  TorusGeometry,
} from 'three';
import type { Hotspot3D, SceneAssets, SceneInstance } from '../engine/types3d';
import { textSprite } from './lib/assets';

export function createFermilab(_assets: SceneAssets): SceneInstance {
  const group = new Group();
  const prairie = new Mesh(
    new PlaneGeometry(62, 62),
    new MeshStandardMaterial({ color: 0x365638, roughness: 1, side: DoubleSide }),
  );
  prairie.rotation.x = -Math.PI / 2;
  prairie.receiveShadow = true;
  group.add(prairie);

  const concrete = new MeshStandardMaterial({ color: 0xd7d3c8, roughness: 0.82 });
  const dark = new MeshStandardMaterial({ color: 0x26323b, roughness: 0.72 });
  const wilson = new Group();
  for (const x of [-1.35, 1.35]) {
    const tower = new Mesh(new BoxGeometry(2.35, 12, 2.2), concrete);
    tower.position.set(x, 6, 0);
    tower.castShadow = true;
    wilson.add(tower);
    for (let floor = 1; floor < 11; floor++) {
      const stripe = new Mesh(new BoxGeometry(2.42, 0.22, 2.24), dark);
      stripe.position.set(x, floor + 0.25, 0);
      wilson.add(stripe);
    }
  }
  const bridge = new Mesh(new BoxGeometry(1.1, 8.2, 1.7), dark);
  bridge.position.y = 5.1;
  wilson.add(bridge);
  wilson.position.set(-7, 0, -2);
  group.add(wilson);

  const ring = new Mesh(
    new TorusGeometry(10.8, 0.62, 8, 72),
    new MeshStandardMaterial({ color: 0x758a52, roughness: 1 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(7.5, 0.5, 5.5);
  ring.receiveShadow = true;
  group.add(ring);
  const ringLabel = textSprite([{ text: 'MAIN INJECTOR · 3.3 km', color: '#cbd7b1', size: 24 }], {
    worldWidth: 7.2,
    width: 600,
    opacity: 0.58,
  });
  ringLabel.position.set(11, 2.2, 8);
  group.add(ringLabel);

  const beam = new Mesh(
    new PlaneGeometry(0.12, 26),
    new MeshBasicMaterial({ color: 0x6ee8ff, transparent: true, opacity: 0.35 }),
  );
  beam.rotation.set(-Math.PI / 2, 0, -0.5);
  beam.position.set(3, 0.12, -3);
  group.add(beam);

  const shaft = new Mesh(
    new CylinderGeometry(0.62, 0.92, 0.45, 20),
    new MeshStandardMaterial({ color: 0x18232b, roughness: 0.9 }),
  );
  shaft.position.set(5.4, -0.18, -5.8);
  group.add(shaft);
  const shaftRing = new Mesh(
    new RingGeometry(0.7, 1.05, 28),
    new MeshBasicMaterial({ color: 0xa8d6df, transparent: true, opacity: 0.52 }),
  );
  shaftRing.rotation.x = -Math.PI / 2;
  shaftRing.position.set(5.4, 0.05, -5.8);
  group.add(shaftRing);
  const shaftLabel = textSprite(
    [
      { text: 'NuMI', color: '#c5e5ea', size: 29 },
      { text: '120 m underground', color: '#d8dee3', size: 20 },
    ],
    { worldWidth: 5.5, width: 500, opacity: 0.7 },
  );
  shaftLabel.position.set(5.4, 2.3, -5.8);
  group.add(shaftLabel);

  group.add(new AmbientLight(0x7690a8, 1.25));
  const sun = new DirectionalLight(0xffe4bd, 2.55);
  sun.position.set(8, 18, 12);
  sun.castShadow = true;
  group.add(sun);

  const hit = new Mesh(
    new CylinderGeometry(1.5, 1.5, 2, 12),
    new MeshBasicMaterial({ visible: false }),
  );
  hit.position.set(5.4, 0.4, -5.8);
  group.add(hit);
  const hotspots: Hotspot3D[] = [
    {
      object: hit,
      label: 'Descend into the NuMI underground hall',
      action: { type: 'zoom', dir: 'in' },
      setHover(on) {
        shaftRing.scale.setScalar(on ? 1.3 : 1);
        shaftRing.material.opacity = on ? 0.8 : 0.52;
      },
    },
  ];

  return {
    group,
    hotspots,
    childProxy: shaft,
    update(ctx) {
      if (!ctx.reducedMotion) shaftRing.rotation.z = ctx.time * 0.25;
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
