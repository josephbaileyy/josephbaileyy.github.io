import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  PMREMGenerator,
  Raycaster,
  Scene,
  SpotLight,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SelectiveBloomEffect,
  VignetteEffect,
} from 'postprocessing';
import { createBodyVisuals } from './bodies.js';
import { createTrackSystem } from './tracks.js';

function createRoom(scene, bounds, colors) {
  const group = new Group();
  const width = bounds.width * 2 + 0.24;
  const height = bounds.height * 2 + 0.24;
  const depth = bounds.depth * 2 + 0.24;
  const panelMaterial = new MeshPhysicalMaterial({
    color: colors.surface,
    transparent: true,
    opacity: 0.76,
    metalness: 0.58,
    roughness: 0.34,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.7,
    side: DoubleSide,
  });
  const backPanel = new Mesh(new BoxGeometry(width, height, 0.09), panelMaterial);
  backPanel.position.z = -bounds.depth - 0.1;
  backPanel.receiveShadow = true;
  group.add(backPanel);

  const wallMaterial = new MeshPhysicalMaterial({
    color: colors.surface,
    transparent: true,
    opacity: 0.82,
    metalness: 0.72,
    roughness: 0.28,
    clearcoat: 0.45,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.15,
  });
  const sideDepth = depth * 0.92;
  const wallThickness = 0.13;
  const leftWall = new Mesh(new BoxGeometry(wallThickness, height, sideDepth), wallMaterial);
  leftWall.position.set(-bounds.width - 0.11, 0, -0.18);
  leftWall.receiveShadow = true;
  const rightWall = leftWall.clone();
  rightWall.position.x = bounds.width + 0.11;
  const topWall = new Mesh(new BoxGeometry(width, wallThickness, sideDepth), wallMaterial);
  topWall.position.set(0, bounds.height + 0.11, -0.18);
  topWall.receiveShadow = true;
  const bottomWall = topWall.clone();
  bottomWall.position.y = -bounds.height - 0.11;
  group.add(leftWall, rightWall, topWall, bottomWall);

  const frameMaterial = new MeshPhysicalMaterial({
    color: colors.rule,
    metalness: 0.86,
    roughness: 0.21,
    clearcoat: 0.58,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.7,
  });
  const frontZ = Math.min(1.04, bounds.depth * 0.55);
  const beam = 0.17;
  const topBeam = new Mesh(new BoxGeometry(width + beam, beam, 0.24), frameMaterial);
  topBeam.position.set(0, bounds.height + 0.08, frontZ);
  topBeam.castShadow = true;
  const bottomBeam = topBeam.clone();
  bottomBeam.position.y = -bounds.height - 0.08;
  const leftBeam = new Mesh(new BoxGeometry(beam, height + beam, 0.24), frameMaterial);
  leftBeam.position.set(-bounds.width - 0.08, 0, frontZ);
  leftBeam.castShadow = true;
  const rightBeam = leftBeam.clone();
  rightBeam.position.x = bounds.width + 0.08;
  group.add(topBeam, bottomBeam, leftBeam, rightBeam);

  const insetMaterial = new MeshBasicMaterial({
    color: colors.track,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const horizontalInset = new Mesh(new BoxGeometry(width - 0.2, 0.018, 0.018), insetMaterial);
  horizontalInset.position.set(0, bounds.height - 0.03, frontZ + 0.13);
  const lowerInset = horizontalInset.clone();
  lowerInset.position.y = -bounds.height + 0.03;
  const verticalInset = new Mesh(new BoxGeometry(0.018, height - 0.2, 0.018), insetMaterial);
  verticalInset.position.set(-bounds.width + 0.03, 0, frontZ + 0.13);
  const rightInset = verticalInset.clone();
  rightInset.position.x = bounds.width - 0.03;
  group.add(horizontalInset, lowerInset, verticalInset, rightInset);

  const aperture = new Mesh(
    new TorusGeometry(Math.min(bounds.height * 0.78, 2.65), 0.012, 6, 96),
    new MeshBasicMaterial({
      color: colors.track,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
    }),
  );
  aperture.position.z = -bounds.depth - 0.035;
  group.add(aperture);
  scene.add(group);
  return group;
}

function createEnvironment(renderer, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const field = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  field.addColorStop(0, colors.void);
  field.addColorStop(0.4, colors.surface);
  field.addColorStop(1, colors.void);
  context.fillStyle = field;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const lights = [
    { x: 0.18, y: 0.2, radius: 0.31, color: colors.charge, alpha: 0.82 },
    { x: 0.76, y: 0.3, radius: 0.26, color: colors.light, alpha: 0.46 },
    { x: 0.58, y: 0.82, radius: 0.2, color: colors.mid, alpha: 0.24 },
  ];
  lights.forEach((light) => {
    const gradient = context.createRadialGradient(
      canvas.width * light.x,
      canvas.height * light.y,
      0,
      canvas.width * light.x,
      canvas.height * light.y,
      canvas.width * light.radius,
    );
    gradient.addColorStop(0, light.color);
    gradient.addColorStop(1, colors.void);
    context.globalAlpha = light.alpha;
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  });
  context.globalAlpha = 1;

  const source = new CanvasTexture(canvas);
  source.mapping = EquirectangularReflectionMapping;
  source.colorSpace = SRGBColorSpace;
  const generator = new PMREMGenerator(renderer);
  generator.compileEquirectangularShader();
  const target = generator.fromEquirectangular(source);
  source.dispose();
  generator.dispose();
  return target;
}

function createChargeField(scene, colors) {
  const material = new MeshBasicMaterial({
    color: colors.charge,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const glowMaterial = new MeshBasicMaterial({
    color: colors.charge,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const line = new Mesh(new CylinderGeometry(1, 1, 1, 12), material);
  const glow = new Mesh(new CylinderGeometry(1, 1, 1, 12), glowMaterial);
  const ringMaterial = new MeshBasicMaterial({
    color: colors.charge,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const ring = new Mesh(new TorusGeometry(0.24, 0.018, 8, 32), ringMaterial);
  const tensionRings = Array.from({ length: 9 }, (_, index) => {
    const tensionMaterial = new MeshBasicMaterial({
      color: colors.charge,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const tensionRing = new Mesh(new TorusGeometry(0.1, 0.009, 6, 24), tensionMaterial);
    tensionRing.userData.phase = index / 8;
    scene.add(tensionRing);
    return tensionRing;
  });
  scene.add(glow, line, ring);
  const bloomObjects = [glow, line, ring, ...tensionRings];
  const yAxis = new Vector3(0, 1, 0);
  const startColor = new Color(colors.charge);
  const endColor = new Color(colors.chargeMax);

  function update(start, end, charge) {
    if (!start || !end) {
      material.opacity = 0;
      glowMaterial.opacity = 0;
      ringMaterial.opacity = 0;
      tensionRings.forEach((tensionRing) => {
        tensionRing.material.opacity = 0;
      });
      return;
    }
    const first = new Vector3(start.x, start.y, start.z);
    const second = new Vector3(end.x, end.y, end.z);
    const delta = second.clone().sub(first);
    const length = delta.length();
    const midpoint = first.clone().add(second).multiplyScalar(0.5);
    const quaternion = line.quaternion.setFromUnitVectors(yAxis, delta.clone().normalize());
    const thickness = 0.012 + charge.normalized * charge.normalized * 0.024;
    line.position.copy(midpoint);
    line.scale.set(thickness, length, thickness);
    glow.position.copy(midpoint);
    glow.quaternion.copy(quaternion);
    glow.scale.set(thickness * 7.5, length, thickness * 7.5);
    material.color.copy(startColor).lerp(endColor, charge.normalized * 0.28);
    glowMaterial.color.copy(startColor);
    material.opacity = 0.62 + charge.normalized * 0.38;
    glowMaterial.opacity = 0.12 + charge.normalized * 0.34;
    ring.position.copy(second);
    ring.quaternion.copy(quaternion);
    const ringScale = 0.8 + charge.normalized * 0.95;
    ring.scale.setScalar(ringScale);
    ringMaterial.opacity = 0.22 + charge.normalized * 0.58;
    tensionRings.forEach((tensionRing, index) => {
      const phase = tensionRing.userData.phase;
      tensionRing.position.copy(first).lerp(second, phase);
      tensionRing.quaternion.copy(quaternion);
      const pulse = 0.72 + Math.sin(index * 2.14) * 0.16;
      tensionRing.scale.setScalar((0.56 + charge.normalized * 0.72) * pulse);
      tensionRing.material.opacity = 0.12 + charge.normalized * 0.3;
    });
  }

  function destroy() {
    [line, glow, ring, ...tensionRings].forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
      scene.remove(mesh);
    });
  }

  return { bloomObjects, update, destroy };
}

export function createChamber({ canvas, records, bounds, tier, colors, deterministicCapture }) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: tier.name !== 'phone' && !deterministicCapture,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  const renderingContext = renderer.getContext();
  renderer.setPixelRatio(tier.pixelRatio);
  renderer.setClearColor(colors.void, 1);
  if (deterministicCapture) {
    renderingContext.disable(renderingContext.DITHER);
  }
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = tier.name === 'phone' ? 1.08 : 1.18;
  renderer.shadowMap.enabled = tier.shadowMapSize > 0;
  renderer.shadowMap.autoUpdate = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const scene = new Scene();
  scene.background = new Color(colors.void);
  scene.fog = new Fog(colors.void, 10.2, 14.8);
  const camera = new PerspectiveCamera(42, 1, 0.1, 80);
  const environmentTarget = createEnvironment(renderer, colors);
  scene.environment = environmentTarget.texture;

  const ambient = new HemisphereLight(colors.text, colors.void, 0.28);
  scene.add(ambient);
  const key = new SpotLight(colors.charge, 58, 28, Math.PI * 0.2, 0.58, 1.15);
  key.position.set(-4.8, 5.6, 7.8);
  key.target.position.set(-0.8, 0.25, -0.2);
  key.castShadow = tier.shadowMapSize > 0;
  key.shadow.mapSize.set(tier.shadowMapSize || 512, tier.shadowMapSize || 512);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.00025;
  scene.add(key, key.target);
  const rim = new DirectionalLight(colors.light, 2.6);
  rim.position.set(6.5, -3.6, 5.2);
  scene.add(rim);
  const warmFill = new DirectionalLight(colors.mid, 0.62);
  warmFill.position.set(1.5, 5.2, -2.8);
  scene.add(warmFill);

  const room = createRoom(scene, bounds, colors);
  const bodies = createBodyVisuals(scene, records, colors, tier, deterministicCapture);
  const tracks = createTrackSystem(
    scene,
    colors,
    tier.name === 'desktop' ? 112 : tier.name === 'mid' ? 72 : 40,
  );
  const chargeField = createChargeField(scene, colors);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const dragPlane = new Plane(new Vector3(0, 0, 1), 0);
  const intersection = new Vector3();
  const baseCamera = new Vector3();
  let composer = null;

  if (tier.postprocessing && !deterministicCapture) {
    composer = new EffectComposer(renderer, {
      multisampling: tier.name === 'desktop' ? 4 : 0,
    });
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new SelectiveBloomEffect(scene, camera, {
      intensity: tier.name === 'desktop' ? 1.05 : 0.72,
      luminanceThreshold: 0.24,
      luminanceSmoothing: 0.38,
      mipmapBlur: true,
    });
    [...bodies.bloomObjects, ...tracks.bloomObjects, ...chargeField.bloomObjects].forEach(
      (object) => bloom.selection.add(object),
    );
    if (tier.name === 'desktop') {
      const depthOfField = new DepthOfFieldEffect(camera, {
        focusDistance: 10.7,
        focusRange: 3.6,
        bokehScale: 0.48,
        resolutionScale: 0.5,
      });
      composer.addPass(new EffectPass(camera, depthOfField));
    }
    const vignette = new VignetteEffect({
      offset: 0.28,
      darkness: 0.48,
    });
    composer.addPass(new EffectPass(camera, bloom, vignette));
  }

  let width = 1;
  let height = 1;
  let visualStep = 0;
  let shake = 0;
  let flex = 0;
  let slowSteps = 0;

  function resize(nextWidth, nextHeight) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    renderer.setSize(width, height, false);
    composer?.setSize(width, height);
    camera.aspect = width / height;
    const verticalFov = (camera.fov * Math.PI) / 180;
    const widthDistance =
      (bounds.width + (tier.name === 'phone' ? 0.25 : 0.8)) /
      (Math.tan(verticalFov / 2) * camera.aspect);
    const heightDistance = (bounds.height + 0.65) / Math.tan(verticalFov / 2);
    const distance = Math.max(widthDistance, heightDistance, 10.8);
    baseCamera.set(0, 0.05, distance);
    camera.position.copy(baseCamera);
    scene.fog.near = Math.max(0.1, distance - bounds.depth - 0.85);
    scene.fog.far = distance + bounds.depth + 1.65;
    camera.updateProjectionMatrix();
  }

  function pointerNdc(clientX, clientY, rect) {
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
  }

  function pick(clientX, clientY, rect) {
    pointerNdc(clientX, clientY, rect);
    const hits = raycaster.intersectObjects(bodies.interactive, false);
    const hit = hits[0];
    return hit?.object.userData.record ?? hit?.object.userData.records?.[hit.instanceId] ?? null;
  }

  function worldPoint(clientX, clientY, rect) {
    pointerNdc(clientX, clientY, rect);
    if (!raycaster.ray.intersectPlane(dragPlane, intersection)) return null;
    return { x: intersection.x, y: intersection.y, z: intersection.z };
  }

  function impact(event) {
    tracks.emit(event);
    bodies.flash(event.first, event.second);
    if (event.impulse > 4) {
      shake = Math.max(shake, Math.min(1, event.impulse / 22));
      flex = Math.max(flex, Math.min(1, event.impulse / 28));
      if (event.impulse > 11) slowSteps = Math.max(slowSteps, 8);
    }
  }

  function advance() {
    visualStep += 1;
    tracks.update();
    bodies.advance();
    if (shake > 0.004) {
      const amplitude = shake * 0.095;
      camera.position.set(
        baseCamera.x + Math.sin(visualStep * 2.17) * amplitude,
        baseCamera.y + Math.cos(visualStep * 1.73) * amplitude * 0.7,
        baseCamera.z + Math.sin(visualStep * 1.31) * amplitude * 0.35,
      );
      shake *= 0.84;
    } else {
      shake = 0;
      camera.position.copy(baseCamera);
    }
    if (flex > 0.003) {
      const value = Math.sin(visualStep * 0.72) * flex * 0.012;
      room.scale.set(1 + value, 1 - value * 0.55, 1 + value * 0.3);
      flex *= 0.87;
    } else {
      flex = 0;
      room.scale.set(1, 1, 1);
    }
    if (slowSteps > 0) slowSteps -= 1;
  }

  function render() {
    camera.updateMatrixWorld();
    bodies.sync(camera);
    if (composer) composer.render();
    else renderer.render(scene, camera);
    if (deterministicCapture) renderingContext.finish();
  }

  function updateCharge(start, end, charge) {
    chargeField.update(start, end, charge);
    bodies.updateCharge(charge);
  }

  function destroy() {
    bodies.destroy();
    tracks.destroy();
    chargeField.destroy();
    room.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    scene.remove(room);
    environmentTarget.dispose();
    composer?.dispose();
    renderer.dispose();
  }

  return {
    resize,
    pick,
    worldPoint,
    impact,
    advance,
    render,
    destroy,
    clearTracks: tracks.clear,
    updateCharge,
    get timeScale() {
      return slowSteps > 0 ? 0.62 : 1;
    },
    get renderer() {
      return renderer;
    },
  };
}
