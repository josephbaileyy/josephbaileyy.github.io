import {
  AdditiveBlending,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from 'three';

export function createTrackSystem(scene, colors) {
  const flashMaterial = new MeshBasicMaterial({
    color: colors.chargeMax,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const flashes = new InstancedMesh(new SphereGeometry(0.12, 10, 7), flashMaterial, 12);
  flashes.instanceMatrix.setUsage(DynamicDrawUsage);
  flashes.count = 12;
  flashes.frustumCulled = false;
  scene.add(flashes);

  const flashEntries = Array.from({ length: 12 }, () => null);
  const helper = new Object3D();
  const hidden = new Matrix4().makeScale(0, 0, 0);
  let flashCursor = 0;
  let emissionStep = -1;
  let emissionsThisStep = 0;

  for (let index = 0; index < 12; index += 1) {
    flashes.setMatrixAt(index, hidden);
  }

  function emit(impact) {
    if (impact.impulse < 1.05) return;
    const projectileImpact = impact.first?.isProjectile || impact.second?.isProjectile;
    if (!projectileImpact && impact.impulse < 7) return;
    if (impact.step !== emissionStep) {
      emissionStep = impact.step;
      emissionsThisStep = 0;
    }
    if (emissionsThisStep >= 2) return;
    emissionsThisStep += 1;
    const intensity = Math.min(1, impact.impulse / 18);

    const slot = flashCursor % flashEntries.length;
    flashCursor += 1;
    flashEntries[slot] = {
      position: new Vector3(impact.position.x, impact.position.y, impact.position.z),
      age: 0,
      intensity,
    };
  }

  function update() {
    flashEntries.forEach((entry, index) => {
      if (!entry) {
        flashes.setMatrixAt(index, hidden);
        return;
      }
      entry.age += 1;
      if (entry.age > 11) {
        flashEntries[index] = null;
        flashes.setMatrixAt(index, hidden);
        return;
      }
      const life = 1 - entry.age / 11;
      helper.position.copy(entry.position);
      helper.quaternion.identity();
      helper.scale.setScalar((0.25 + entry.intensity * 0.55) * life);
      helper.updateMatrix();
      flashes.setMatrixAt(index, helper.matrix);
    });
    flashes.instanceMatrix.needsUpdate = true;
    flashMaterial.opacity = flashEntries.some(Boolean) ? 0.72 : 0;
  }

  function clear() {
    flashEntries.fill(null);
  }

  function destroy() {
    flashes.geometry.dispose();
    flashes.material.dispose();
    scene.remove(flashes);
  }

  return {
    bloomObjects: [flashes],
    emit,
    update,
    clear,
    destroy,
  };
}
