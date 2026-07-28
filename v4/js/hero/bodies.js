import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NearestFilter,
  Object3D,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function createLabelTexture(label, colors, accent, deterministicCapture, includePlate) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 384;
  const context = canvas.getContext('2d');
  const inset = 22;
  const maximumWidth = canvas.width - 180;
  let fontSize = 164;

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (includePlate) {
    context.globalAlpha = 0.94;
    context.fillStyle = colors.surface;
    context.fillRect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2);
    context.globalAlpha = 0.72;
    context.strokeStyle = accent;
    context.lineWidth = 12;
    context.strokeRect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2);
    context.globalAlpha = 1;
  }

  do {
    context.font = `760 ${fontSize}px "JetBrains Mono", monospace`;
    if (context.measureText(label).width <= maximumWidth) break;
    fontSize -= 4;
  } while (fontSize > 64);

  context.fillStyle = colors.text;
  context.strokeStyle = colors.void;
  context.lineJoin = 'round';
  context.lineWidth = 22;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.strokeText(label, canvas.width / 2, canvas.height / 2 + 4, maximumWidth);
  context.fillText(label, canvas.width / 2, canvas.height / 2 + 4, maximumWidth);

  if (deterministicCapture) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 1) {
      pixels.data[index] = Math.round(pixels.data[index] / 16) * 16;
    }
    context.putImageData(pixels, 0, 0);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = deterministicCapture ? 1 : 8;
  if (deterministicCapture) {
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
  }
  return texture;
}

function createProjectileCoreTexture(colors) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 248);
  gradient.addColorStop(0, colors.chargeMax);
  gradient.addColorStop(0.18, colors.chargeMax);
  gradient.addColorStop(0.48, colors.charge);
  gradient.addColorStop(0.72, `${colors.charge}9a`);
  gradient.addColorStop(1, `${colors.charge}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function accentFor(record, colors) {
  return record.source.massClass === 'heavy'
    ? colors.heavy
    : record.source.massClass === 'mid'
      ? colors.mid
      : record.source.massClass === 'light'
        ? colors.light
        : colors.charge;
}

function mixedColor(first, second, amount) {
  return new Color(first).lerp(new Color(second), amount);
}

function materialFor(record, colors) {
  const accent = accentFor(record, colors);
  const mix =
    record.isProjectile || record.source.massClass === 'heavy'
      ? 0.62
      : record.source.massClass === 'mid'
        ? 0.3
        : 0.52;
  const base = record.isProjectile ? new Color(colors.charge) : mixedColor(colors.surface, accent, mix);

  return new MeshPhysicalMaterial({
    color: base,
    emissive: accent,
    emissiveIntensity: record.isProjectile ? 2.35 : record.source.massClass === 'mid' ? 0.05 : 0.1,
    envMapIntensity: record.isProjectile ? 2.4 : 1.45,
    metalness: record.source.massClass === 'mid' ? 0.18 : 0.42,
    roughness: record.source.massClass === 'heavy' ? 0.18 : 0.23,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
    transparent: record.source.massClass === 'mid',
    opacity: record.source.massClass === 'mid' ? 0.88 : 1,
    transmission: record.source.massClass === 'mid' ? 0.04 : 0,
    thickness: 0.2,
  });
}

function geometryFor(record, filler = false) {
  if (record.isProjectile) {
    return new SphereGeometry(0.4, 32, 20);
  }
  if (record.source.massClass === 'light') {
    return filler
      ? new IcosahedronGeometry(0.14, 1)
      : new RoundedBoxGeometry(0.84, 0.3, 0.16, 3, 0.055);
  }
  const size = record.halfExtents;
  return new RoundedBoxGeometry(
    size.x * 2,
    size.y * 2,
    size.z * 2,
    filler ? 2 : 3,
    record.source.massClass === 'heavy' ? 0.075 : 0.055,
  );
}

function applyPhysicsTransform(object, record) {
  const translation = record.body.translation();
  const rotation = record.body.rotation();
  object.position.set(translation.x, translation.y, translation.z);
  object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
}

function addJewelEdge(group, geometry, record, colors) {
  const edge = new LineSegments(
    new EdgesGeometry(geometry, 28),
    new LineBasicMaterial({
      color: accentFor(record, colors),
      transparent: true,
      opacity: record.source.massClass === 'mid' ? 0.38 : 0.58,
    }),
  );
  edge.scale.setScalar(1.006);
  group.add(edge);
  return edge;
}

function createJewelFace(width, height, accent, colors) {
  const faceGeometry = new PlaneGeometry(width, height);
  const face = new Mesh(
    faceGeometry,
    new MeshPhysicalMaterial({
      color: colors.surface,
      emissive: accent,
      emissiveIntensity: 0.025,
      envMapIntensity: 0,
      metalness: 0,
      roughness: 0.72,
      clearcoat: 0.24,
      clearcoatRoughness: 0.3,
    }),
  );
  face.renderOrder = 2;
  const faceEdge = new LineSegments(
    new EdgesGeometry(faceGeometry),
    new LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.82,
    }),
  );
  faceEdge.position.z = 0.002;
  face.add(faceEdge);
  return face;
}

export function createBodyVisuals(scene, records, colors, tier, deterministicCapture) {
  const interactive = [];
  const bloomObjects = [];
  const byRecord = new Map();
  const labelled = records.filter((record) => record.isProjectile || record.source.label);
  const fillers = records.filter((record) => !record.isProjectile && !record.source.label);
  const fillerGroups = new Map();
  const helper = new Object3D();
  const viewDirection = new Vector3();
  const fillerFlashColor = new Color(colors.charge);
  const projectileChargeColor = new Color(colors.charge);
  const projectileMaximumColor = new Color(colors.chargeMax);
  let projectileVisual = null;

  labelled.forEach((record) => {
    const group = new Group();
    const geometry = geometryFor(record);
    const material = materialFor(record, colors);
    const bodyMesh = new Mesh(geometry, material);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);
    group.userData.record = record;
    bodyMesh.userData.record = record;
    interactive.push(bodyMesh);
    bloomObjects.push(bodyMesh);

    if (!record.isProjectile) addJewelEdge(group, geometry, record, colors);

    let haloMaterial = null;
    let coreMaterial = null;
    if (record.isProjectile) {
      haloMaterial = new MeshBasicMaterial({
        color: colors.charge,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const halo = new Mesh(
        new SphereGeometry(0.455, 24, 16),
        haloMaterial,
      );
      group.add(halo);
      bloomObjects.push(halo);
      coreMaterial = new SpriteMaterial({
        map: createProjectileCoreTexture(colors),
        color: colors.charge,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const core = new Sprite(coreMaterial);
      core.scale.setScalar(1.06);
      core.renderOrder = 3;
      group.add(core);
      bloomObjects.push(core);
    }

    const isLight = record.source.massClass === 'light';
    const jewelFaces = [];
    const labelWidth = record.isProjectile ? 0.98 : isLight ? 0.72 : record.halfExtents.x * 1.68;
    const labelHeight = record.isProjectile ? 0.29 : isLight ? 0.2 : record.halfExtents.y * 1.28;
    const accent = accentFor(record, colors);
    if (!record.isProjectile) {
      const face = createJewelFace(labelWidth, labelHeight, accent, colors);
      face.position.z = isLight ? 0.086 : record.halfExtents.z + 0.012;
      face.userData.viewNormal = { x: 0, y: 0, z: 1 };
      group.add(face);
      bloomObjects.push(face);
      jewelFaces.push(face);

      if (record.source.massClass === 'heavy') {
        const sideWidth = record.halfExtents.z * 1.4;
        const capHeight = record.halfExtents.z * 1.28;
        const inset = 0.012;
        const back = createJewelFace(labelWidth, labelHeight, accent, colors);
        back.position.z = -record.halfExtents.z - inset;
        back.rotation.y = Math.PI;
        back.userData.viewNormal = { x: 0, y: 0, z: -1 };
        const left = createJewelFace(sideWidth, labelHeight, accent, colors);
        left.position.x = -record.halfExtents.x - inset;
        left.rotation.y = -Math.PI / 2;
        left.userData.viewNormal = { x: -1, y: 0, z: 0 };
        const right = createJewelFace(sideWidth, labelHeight, accent, colors);
        right.position.x = record.halfExtents.x + inset;
        right.rotation.y = Math.PI / 2;
        right.userData.viewNormal = { x: 1, y: 0, z: 0 };
        const top = createJewelFace(labelWidth, capHeight, accent, colors);
        top.position.y = record.halfExtents.y + inset;
        top.rotation.x = -Math.PI / 2;
        top.userData.viewNormal = { x: 0, y: 1, z: 0 };
        const bottom = createJewelFace(labelWidth, capHeight, accent, colors);
        bottom.position.y = -record.halfExtents.y - inset;
        bottom.rotation.x = Math.PI / 2;
        bottom.userData.viewNormal = { x: 0, y: -1, z: 0 };
        const alternateFaces = [back, left, right, top, bottom];
        alternateFaces.forEach((alternate) => {
          alternate.visible = false;
        });
        group.add(...alternateFaces);
        bloomObjects.push(...alternateFaces);
        jewelFaces.push(...alternateFaces);
      }
    }
    const labelMaterial = new MeshBasicMaterial({
      map: createLabelTexture(
        record.source.label,
        colors,
        accent,
        deterministicCapture,
        record.isProjectile,
      ),
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const label = new Mesh(new PlaneGeometry(labelWidth, labelHeight), labelMaterial);
    label.userData.record = record;
    label.renderOrder = 4;
    scene.add(label);
    interactive.push(label);

    scene.add(group);
    const visual = {
      kind: 'labelled',
      group,
      material,
      haloMaterial,
      coreMaterial,
      label,
      labelMaterial,
      jewelFaces,
      baseEmissive: record.isProjectile ? 2.35 : record.source.massClass === 'mid' ? 0.05 : 0.1,
      flash: 0,
    };
    byRecord.set(record, visual);
    if (record.isProjectile) projectileVisual = visual;
  });

  ['heavy', 'mid', 'light'].forEach((massClass) => {
    const groupRecords = fillers.filter((record) => record.source.massClass === massClass);
    if (!groupRecords.length) return;
    const sample = groupRecords[0];
    const accent = accentFor(sample, colors);
    const mix = massClass === 'mid' ? 0.09 : massClass === 'heavy' ? 0.07 : 0.07;
    const baseColor = mixedColor(colors.surface, accent, mix);
    const material = new MeshPhysicalMaterial({
      color: colors.chargeMax,
      emissive: accent,
      emissiveIntensity: massClass === 'light' ? 0.012 : massClass === 'heavy' ? 0.008 : 0.02,
      envMapIntensity: massClass === 'heavy' ? 1.25 : 1.55,
      metalness: massClass === 'light' ? 0.72 : 0.48,
      roughness: massClass === 'heavy' ? 0.3 : 0.36,
      clearcoat: 0.82,
      clearcoatRoughness: 0.18,
      transparent: massClass === 'mid',
      opacity: massClass === 'mid' ? 0.76 : 1,
      vertexColors: true,
    });
    const instances = new InstancedMesh(geometryFor(sample, true), material, groupRecords.length);
    instances.instanceMatrix.setUsage(DynamicDrawUsage);
    instances.castShadow = true;
    instances.receiveShadow = true;
    instances.userData.records = groupRecords;
    const details =
      massClass === 'heavy'
        ? groupRecords.map(() => {
            const detail = new LineSegments(
              new EdgesGeometry(instances.geometry, 28),
              new LineBasicMaterial({
                color: colors.track,
                transparent: true,
                opacity: 0.28,
              }),
            );
            scene.add(detail);
            return detail;
          })
        : [];
    groupRecords.forEach((record, index) => {
      instances.setColorAt(index, baseColor);
      byRecord.set(record, {
        kind: 'instance',
        instances,
        instanceIndex: index,
        baseColor,
        flash: 0,
      });
    });
    fillerGroups.set(massClass, {
      instances,
      records: groupRecords,
      details,
    });
    interactive.push(instances);
    scene.add(instances);
  });

  function sync(camera) {
    labelled.forEach((record) => {
      const visual = byRecord.get(record);
      applyPhysicsTransform(visual.group, record);
      visual.group.scale.setScalar(tier.name === 'phone' ? (record.isProjectile ? 0.9 : 0.8) : 1);
      const labelScale = tier.name === 'phone' ? (record.isProjectile ? 0.9 : 0.8) : 1;
      visual.label.position.copy(visual.group.position);
      visual.label.quaternion.copy(camera.quaternion);
      visual.label.scale.setScalar(labelScale);
      visual.labelMaterial.opacity = 1;
      visual.label.visible = true;
      if (visual.jewelFaces.length > 1) {
        helper.quaternion.copy(visual.group.quaternion).invert();
        viewDirection
          .copy(camera.position)
          .sub(visual.group.position)
          .applyQuaternion(helper.quaternion);
        let visibleFace = visual.jewelFaces[0];
        if (viewDirection.z <= 0) {
          let visibleScore = -Infinity;
          visual.jewelFaces.slice(1).forEach((face) => {
            const normal = face.userData.viewNormal;
            const score =
              normal.x * viewDirection.x +
              normal.y * viewDirection.y +
              normal.z * viewDirection.z;
            if (score > visibleScore) {
              visibleFace = face;
              visibleScore = score;
            }
          });
        }
        visual.jewelFaces.forEach((face) => {
          face.visible = face === visibleFace;
        });
      }
      if (visual.flash > 0) {
        visual.material.emissiveIntensity = visual.baseEmissive + (visual.flash / 12) * 2.1;
      } else {
        visual.material.emissiveIntensity = visual.baseEmissive;
      }
    });

    fillerGroups.forEach(({ instances, records: groupRecords, details }) => {
      let colorChanged = false;
      groupRecords.forEach((record, index) => {
        const visual = byRecord.get(record);
        applyPhysicsTransform(helper, record);
        const scale =
          record.source.massClass === 'mid' ? 0.76 : record.source.massClass === 'heavy' ? 0.84 : 1;
        helper.scale.setScalar(scale);
        helper.updateMatrix();
        instances.setMatrixAt(index, helper.matrix);
        if (details[index]) {
          details[index].position.copy(helper.position);
          details[index].quaternion.copy(helper.quaternion);
          details[index].scale.copy(helper.scale).multiplyScalar(1.008);
        }
        if (visual.flash > 0) {
          instances.setColorAt(
            index,
            visual.baseColor.clone().lerp(fillerFlashColor, (visual.flash / 15) * 0.3),
          );
          colorChanged = true;
        } else {
          instances.setColorAt(index, visual.baseColor);
          colorChanged = true;
        }
      });
      instances.instanceMatrix.needsUpdate = true;
      if (colorChanged && instances.instanceColor) {
        instances.instanceColor.needsUpdate = true;
      }
    });
  }

  function advance() {
    byRecord.forEach((visual) => {
      if (visual.flash > 0) visual.flash -= 1;
    });
  }

  function flash(...recordsToFlash) {
    recordsToFlash.filter(Boolean).forEach((record) => {
      const visual = byRecord.get(record);
      if (visual) visual.flash = 12;
    });
  }

  function updateCharge(charge) {
    if (!projectileVisual) return;
    const normalized = Math.min(1, Math.max(0, charge?.normalized || 0));
    const heat = normalized * normalized;
    projectileVisual.material.emissive
      .copy(projectileChargeColor)
      .lerp(projectileMaximumColor, heat * 0.32);
    projectileVisual.material.color
      .copy(projectileChargeColor)
      .lerp(projectileMaximumColor, heat * 0.5);
    projectileVisual.baseEmissive = 2.35 + normalized * 1.25;
    projectileVisual.haloMaterial.color
      .copy(projectileChargeColor)
      .lerp(projectileMaximumColor, heat * 0.16);
    projectileVisual.haloMaterial.opacity = 0.22 + normalized * 0.24;
    projectileVisual.coreMaterial.opacity = 0.46 + normalized * 0.48;
  }

  function destroy() {
    labelled.forEach((record) => {
      const visual = byRecord.get(record);
      visual.group.traverse((object) => {
        object.geometry?.dispose();
        object.material?.map?.dispose();
        object.material?.dispose();
      });
      scene.remove(visual.group);
      visual.label.geometry.dispose();
      visual.label.material.map?.dispose();
      visual.label.material.dispose();
      scene.remove(visual.label);
    });
    fillerGroups.forEach(({ instances, details }) => {
      instances.geometry.dispose();
      instances.material.dispose();
      scene.remove(instances);
      details.forEach((detail) => {
        detail.geometry.dispose();
        detail.material.dispose();
        scene.remove(detail);
      });
    });
  }

  return { interactive, bloomObjects, advance, sync, flash, updateCharge, destroy };
}
