// three.js renderer for the concept space. Owns the WebGL scene, orbit camera,
// node meshes, relation lines, labels and the orientation gizmo. All layout
// mathematics lives in model.js; this module only draws positions it is given.
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Fog,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  RingGeometry,
  Scene,
  TetrahedronGeometry,
  TorusGeometry,
  BoxGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const KIND_SHAPES = {
  definition: 'sphere',
  construction: 'cube',
  theorem: 'octahedron',
  inequality: 'tetrahedron',
  technique: 'ring',
  example: 'cone',
};

const geometries = {
  sphere: new IcosahedronGeometry(1, 2),
  cube: new BoxGeometry(1.45, 1.45, 1.45),
  octahedron: new OctahedronGeometry(1.25),
  tetrahedron: new TetrahedronGeometry(1.4),
  ring: new TorusGeometry(0.85, 0.32, 8, 20),
  cone: new ConeGeometry(0.95, 1.8, 10),
};

export const RELATION_STYLE = {
  prerequisite: { color: '#a9b2c6', label: 'Prerequisite' },
  used_in_proof: { color: '#7fa7ee', label: 'Used in proof' },
  application: { color: '#6cc3a2', label: 'Application' },
  generalizes: { color: '#b9a8f5', label: 'Generalizes' },
  equivalent_formulation: { color: '#e9e3c4', label: 'Equivalent' },
  shares_structure: { color: '#7d8494', label: 'Shared structure' },
  counterexample: { color: '#ec835a', label: 'Counterexample' },
  implies: { color: '#d7a6e6', label: 'Implies' },
};

const BACKGROUND = '#101217';
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function createScene({ canvas, labels, gizmo, model, onSelect, onHover, reducedMotion }) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(BACKGROUND, 1);

  const scene = new Scene();
  scene.fog = new Fog(BACKGROUND, 2.6, 6.5);
  const camera = new PerspectiveCamera(42, 1, 0.01, 50);
  const home = new Vector3(0.35, 0.55, 3.35);
  camera.position.copy(home);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.minDistance = 0.35;
  controls.maxDistance = 7;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.45;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    cancelFocus();
  });

  scene.add(new AmbientLight('#ffffff', 1.6));
  const sun = new DirectionalLight('#ffffff', 1.4);
  sun.position.set(2, 3, 4);
  scene.add(sun);

  // Guides: the constraint sphere as latitude/longitude lines, plus optional depth shells.
  const guides = new Group();
  scene.add(guides);
  const guideMaterial = new LineBasicMaterial({
    color: '#2f3542',
    transparent: true,
    opacity: 0.55,
  });
  const shellMaterial = new LineBasicMaterial({
    color: '#2a3040',
    transparent: true,
    opacity: 0.35,
  });
  function sphereLines(radius, latitudes = [-60, -30, 0, 30, 60], meridians = 8) {
    const points = [];
    const segments = 72;
    for (const lat of latitudes) {
      const phi = (lat * Math.PI) / 180;
      for (let s = 0; s < segments; s++) {
        for (const t of [s, s + 1]) {
          const theta = (t / segments) * Math.PI * 2;
          points.push(
            radius * Math.cos(phi) * Math.cos(theta),
            radius * Math.sin(phi),
            radius * Math.cos(phi) * Math.sin(theta),
          );
        }
      }
    }
    for (let m = 0; m < meridians; m++) {
      const theta = (m / meridians) * Math.PI;
      for (let s = 0; s < segments; s++) {
        for (const t of [s, s + 1]) {
          const phi = (t / segments) * Math.PI * 2;
          points.push(
            radius * Math.cos(phi) * Math.cos(theta),
            radius * Math.sin(phi),
            radius * Math.cos(phi) * Math.sin(theta),
          );
        }
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
    return geometry;
  }
  const outer = new LineSegments(sphereLines(1), guideMaterial);
  guides.add(outer);
  const shells = new Group();
  for (const r of [0.2, 0.47, 0.73])
    shells.add(new LineSegments(sphereLines(r, [0], 3), shellMaterial));
  shells.visible = false;
  guides.add(shells);

  // Nodes
  const nodeGroup = new Group();
  scene.add(nodeGroup);
  const degree = model.concepts.map(() => 0);
  for (const relation of model.relations) {
    degree[model.index.get(relation.source)]++;
    degree[model.index.get(relation.target)]++;
  }
  const baseSize = model.concepts.map((_, i) => 0.019 * (1 + 0.16 * Math.sqrt(degree[i])));
  const meshes = model.concepts.map((concept, i) => {
    const material = new MeshLambertMaterial({ color: '#888', transparent: true, opacity: 1 });
    const mesh = new Mesh(geometries[KIND_SHAPES[concept.kind]] ?? geometries.sphere, material);
    mesh.scale.setScalar(baseSize[i]);
    mesh.userData.index = i;
    mesh.rotation.set(i * 0.7, i * 1.3, 0);
    nodeGroup.add(mesh);
    return mesh;
  });
  // Overlay rings (evidence states and selection) face the camera.
  const ringGeometry = new RingGeometry(1.55, 1.95, 40);
  const rings = model.concepts.map((_, i) => {
    const ring = new Mesh(
      ringGeometry,
      new MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false }),
    );
    ring.scale.setScalar(baseSize[i]);
    ring.visible = false;
    nodeGroup.add(ring);
    return ring;
  });
  const focusRing = new Mesh(
    new RingGeometry(2.2, 2.5, 48),
    new MeshBasicMaterial({ color: '#f0f0f3', transparent: true, opacity: 0.9, depthWrite: false }),
  );
  focusRing.visible = false;
  nodeGroup.add(focusRing);

  // Relations: one LineSegments per type, vertex colours fade from source (dim) to target.
  const relationGroup = new Group();
  scene.add(relationGroup);
  const relationIndex = model.relations.map((relation) => [
    model.index.get(relation.source),
    model.index.get(relation.target),
  ]);
  // One line set per relation type and per support (sourced vs agent-only), so
  // unsourced proposals can be dimmed or hidden independently.
  const sourced = (relation) =>
    ['agent_reviewed', 'verified'].includes(relation.status) ||
    (relation.support && relation.support !== 'agent_only');
  const relationLines = {};
  for (const [key, type, style, isSourced] of Object.entries(RELATION_STYLE).flatMap(
    ([type, style]) => [
      [`${type}:s`, type, style, true],
      [`${type}:u`, type, style, false],
    ],
  )) {
    const members = model.relations
      .map((relation, k) => (relation.type === type && sourced(relation) === isSourced ? k : -1))
      .filter((k) => k >= 0);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(members.length * 6), 3));
    const colors = new Float32Array(members.length * 6);
    const tip = new Color(style.color);
    const tail = new Color(style.color).lerp(new Color(BACKGROUND), 0.72);
    members.forEach((_, m) => {
      colors.set([tail.r, tail.g, tail.b, tip.r, tip.g, tip.b], m * 6);
    });
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    const material = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const lines = new LineSegments(geometry, material);
    relationGroup.add(lines);
    relationLines[key] = { lines, members, type, isSourced };
  }
  // Highlighted neighbourhood relations (brighter) and affinity links (dashed).
  const highlight = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false }),
  );
  const affinity = new LineSegments(
    new BufferGeometry(),
    new LineDashedMaterial({
      color: '#f0f0f3',
      dashSize: 0.018,
      gapSize: 0.014,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  scene.add(highlight, affinity);
  const arrowGeometry = new ConeGeometry(0.011, 0.034, 8);
  arrowGeometry.translate(0, -0.017, 0);
  const arrows = new Group();
  scene.add(arrows);

  // State
  let positions = model.concepts.map(() => new Vector3());
  let from = positions.map((p) => p.clone());
  let to = positions.map((p) => p.clone());
  let transition = 1;
  let transitionStart = 0;
  const transitionTime = reducedMotion ? 1 : 900;
  let colors = model.concepts.map(() => '#888');
  let visible = model.concepts.map(() => true);
  let relationVisible = Object.fromEntries(Object.keys(RELATION_STYLE).map((type) => [type, true]));
  let showUnsourced = true;
  let selected = -1;
  let hovered = -1;
  let neighbourhood = { relations: [], affinity: [] };
  let landmarks = [];
  let focus = null;
  let dirty = true;
  let width = 1;
  let height = 1;

  function setLayout(points, { animate = true } = {}) {
    from = positions.map((p) => p.clone());
    to = points.map(([x, y, z]) => new Vector3(x, y, z));
    transition = animate ? 0 : 1;
    transitionStart = performance.now();
    if (!animate) positions = to.map((p) => p.clone());
    dirty = true;
  }

  function setGeometry({ geometry, shells: showShells }) {
    guideMaterial.opacity = geometry === 'surface' ? 0.8 : 0.55;
    shells.visible = Boolean(showShells) && geometry === 'volume';
    dirty = true;
  }

  function setColors(list) {
    colors = list;
    meshes.forEach((mesh, i) => mesh.material.color.set(list[i]));
    dirty = true;
  }

  function setRings(list) {
    // list[i] = null or { color, dashed }
    rings.forEach((ring, i) => {
      const style = list?.[i];
      ring.visible = Boolean(style);
      if (style) {
        ring.material.color.set(style.color);
        ring.material.opacity = style.opacity ?? 0.95;
      }
    });
    dirty = true;
  }

  function setVisibility(list) {
    visible = list;
    dirty = true;
  }

  function setRelationTypes(map, unsourced = true) {
    relationVisible = { ...map };
    showUnsourced = unsourced;
    dirty = true;
  }

  function setLandmarks(list) {
    landmarks = list;
    dirty = true;
  }

  function setSelection(index, neighbours) {
    selected = index;
    neighbourhood = neighbours ?? { relations: [], affinity: [] };
    dirty = true;
  }

  let focusAnimation = null;
  function cancelFocus() {
    focusAnimation = null;
  }
  function focusOn(index, distance = 1.75) {
    const target = index >= 0 ? to[index].clone() : new Vector3();
    const direction = camera.position.clone().sub(controls.target).normalize();
    const endPosition =
      index >= 0 ? target.clone().add(direction.multiplyScalar(distance)) : home.clone();
    focusAnimation = {
      start: performance.now(),
      fromTarget: controls.target.clone(),
      toTarget: target,
      fromPosition: camera.position.clone(),
      toPosition: endPosition,
      duration: reducedMotion ? 1 : 750,
    };
    controls.autoRotate = false;
    focus = index;
  }
  function resetCamera() {
    focusOn(-1);
  }

  // Picking
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      meshes.filter((_, i) => visible[i]),
      false,
    );
    if (hits.length) return hits[0].object.userData.index;
    // Fall back to the nearest projected node within a finger-sized radius.
    let best = -1;
    let bestDistance = (window.matchMedia('(pointer: coarse)').matches ? 26 : 14) ** 2;
    const v = new Vector3();
    for (let i = 0; i < positions.length; i++) {
      if (!visible[i]) continue;
      v.copy(positions[i]).project(camera);
      if (v.z > 1) continue;
      const x = ((v.x + 1) / 2) * rect.width + rect.left;
      const y = ((1 - v.y) / 2) * rect.height + rect.top;
      const d = (x - clientX) ** 2 + (y - clientY) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    return best;
  }
  let down = null;
  canvas.addEventListener('pointerdown', (event) => {
    down = { x: event.clientX, y: event.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
    if (moved > 6) return;
    onSelect(pick(event.clientX, event.clientY));
  });
  let hoverFrame = 0;
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || down) return;
    cancelAnimationFrame(hoverFrame);
    hoverFrame = requestAnimationFrame(() => {
      const index = pick(event.clientX, event.clientY);
      if (index !== hovered) {
        hovered = index;
        canvas.style.cursor = index >= 0 ? 'pointer' : 'grab';
        onHover(index);
        dirty = true;
      }
    });
  });
  canvas.addEventListener('pointerleave', () => {
    if (hovered !== -1) {
      hovered = -1;
      onHover(-1);
      dirty = true;
    }
  });

  // Shift the projection centre so a node in focus is not hidden behind the detail card.
  let inset = 0;
  function applyInset() {
    if (inset) camera.setViewOffset(width, height, -inset / 2, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function setInset(px) {
    inset = width > 960 ? px : 0;
    applyInset();
    dirty = true;
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the whole sphere in view on narrow screens.
    camera.fov = camera.aspect < 0.8 ? 50 : 42;
    applyInset();
    dirty = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  resize();

  function updateLines() {
    for (const { lines, members, type, isSourced } of Object.values(relationLines)) {
      const attribute = lines.geometry.getAttribute('position');
      members.forEach((k, m) => {
        const [i, j] = relationIndex[k];
        const a = positions[i];
        const b = positions[j];
        attribute.setXYZ(m * 2, a.x, a.y, a.z);
        attribute.setXYZ(m * 2 + 1, b.x, b.y, b.z);
      });
      attribute.needsUpdate = true;
      lines.geometry.computeBoundingSphere();
      lines.visible = relationVisible[type] && (isSourced || showUnsourced);
      const focusMode = selected >= 0;
      lines.material.opacity = (focusMode ? 0.07 : 0.42) * (isSourced ? 1 : 0.45);
    }
    // Neighbourhood relations, brighter, with arrowheads at the target.
    const hl = [];
    const hc = [];
    arrows.clear();
    for (const k of neighbourhood.relations) {
      const relation = model.relations[k];
      if (!relationVisible[relation.type] || (!showUnsourced && !sourced(relation))) continue;
      const [i, j] = relationIndex[k];
      if (!visible[i] || !visible[j]) continue;
      const a = positions[i];
      const b = positions[j];
      const color = new Color(RELATION_STYLE[relation.type].color);
      if (!sourced(relation)) color.lerp(new Color(BACKGROUND), 0.4);
      const tail = color.clone().lerp(new Color(BACKGROUND), 0.45);
      hl.push(a.x, a.y, a.z, b.x, b.y, b.z);
      hc.push(tail.r, tail.g, tail.b, color.r, color.g, color.b);
      if (model.types[relation.type]?.directed) {
        const direction = b.clone().sub(a);
        const length = direction.length();
        if (length > 0.06) {
          direction.normalize();
          const tip = b.clone().sub(direction.clone().multiplyScalar(baseSize[j] * 1.9));
          const cone = new Mesh(arrowGeometry, new MeshBasicMaterial({ color }));
          cone.position.copy(tip);
          cone.quaternion.copy(
            new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction),
          );
          arrows.add(cone);
        }
      }
    }
    highlight.geometry.dispose();
    highlight.geometry = new BufferGeometry();
    highlight.geometry.setAttribute('position', new BufferAttribute(new Float32Array(hl), 3));
    highlight.geometry.setAttribute('color', new BufferAttribute(new Float32Array(hc), 3));
    const al = [];
    for (const j of neighbourhood.affinity) {
      if (selected < 0 || !visible[j]) continue;
      const a = positions[selected];
      const b = positions[j];
      al.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    affinity.geometry.dispose();
    affinity.geometry = new BufferGeometry();
    affinity.geometry.setAttribute('position', new BufferAttribute(new Float32Array(al), 3));
    affinity.computeLineDistances();
  }

  // Labels: priority-ordered, greedy collision avoidance in screen space.
  const labelNodes = model.concepts.map((concept) => {
    const span = document.createElement('span');
    span.textContent = concept.name;
    span.hidden = true;
    labels.append(span);
    return span;
  });
  function updateLabels() {
    const priority = [];
    const add = (i, level) => {
      if (i >= 0 && visible[i] && !priority.some(([j]) => j === i)) priority.push([i, level]);
    };
    add(selected, 'selected');
    add(hovered, 'hovered');
    if (selected >= 0) {
      const ids = new Set();
      for (const k of neighbourhood.relations) relationIndex[k].forEach((i) => ids.add(i));
      neighbourhood.affinity.forEach((i) => ids.add(i));
      for (const i of ids) add(i, 'neighbour');
    } else {
      landmarks.forEach((i) => add(i, 'landmark'));
    }
    const placed = [];
    const v = new Vector3();
    const shown = new Set();
    for (const [i, level] of priority) {
      v.copy(positions[i]).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      const x = ((v.x + 1) / 2) * width;
      const y = ((1 - v.y) / 2) * height;
      const node = labelNodes[i];
      const w = Math.min(220, node.textContent.length * 6.6 + 12);
      const box = [x + 9, y - 9, x + 9 + w, y + 9];
      const blocked = placed.some(
        (b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1],
      );
      if (blocked && level !== 'selected' && level !== 'hovered') continue;
      placed.push(box);
      shown.add(i);
      node.hidden = false;
      node.dataset.level = level;
      const depthFade = Math.max(
        0.35,
        Math.min(1, 1.6 - camera.position.distanceTo(positions[i]) / 3.2),
      );
      node.style.opacity = String(level === 'landmark' ? depthFade * 0.85 : 1);
      node.style.transform = `translate(${Math.round(x + 9)}px, ${Math.round(y - 9)}px)`;
    }
    labelNodes.forEach((node, i) => {
      if (!shown.has(i)) node.hidden = true;
    });
  }

  function updateGizmo() {
    const q = camera.quaternion.clone().invert();
    const axes = [
      ['1', new Vector3(1, 0, 0), '#3987e5'],
      ['2', new Vector3(0, 1, 0), '#d95926'],
      ['3', new Vector3(0, 0, 1), '#199e70'],
    ].map(([label, axis, color]) => {
      const p = axis.applyQuaternion(q);
      return { label, x: p.x * 20, y: -p.y * 20, z: p.z, color };
    });
    axes.sort((a, b) => a.z - b.z);
    gizmo.innerHTML =
      '<circle r="27" fill="#14171d" stroke="#2b3039"/>' +
      axes
        .map(
          ({ label, x, y, z, color }) =>
            `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="${z < 0 ? 0.45 : 1}"/>` +
            `<text x="${(x * 1.22).toFixed(1)}" y="${(y * 1.22 + 3).toFixed(1)}" text-anchor="middle">${label}</text>`,
        )
        .join('');
  }

  let running = true;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    let moving = controls.update() || controls.autoRotate;
    if (focusAnimation) {
      const t = Math.min(1, (now - focusAnimation.start) / focusAnimation.duration);
      const k = ease(t);
      controls.target.lerpVectors(focusAnimation.fromTarget, focusAnimation.toTarget, k);
      camera.position.lerpVectors(focusAnimation.fromPosition, focusAnimation.toPosition, k);
      if (t >= 1) focusAnimation = null;
      moving = true;
    }
    if (transition < 1) {
      transition = Math.min(1, (now - transitionStart) / transitionTime);
      const k = ease(transition);
      positions.forEach((p, i) => p.lerpVectors(from[i], to[i], k));
      moving = true;
      if (focus >= 0 && focus !== null && !focusAnimation) controls.target.lerp(to[focus], 0.15);
    }
    if (!moving && !dirty) return;
    dirty = false;
    meshes.forEach((mesh, i) => {
      mesh.position.copy(positions[i]);
      const emphasis = i === selected ? 1.6 : i === hovered ? 1.35 : 1;
      mesh.scale.setScalar(baseSize[i] * emphasis);
      mesh.visible = visible[i];
      const faded = selected >= 0 && i !== selected && !neighbourIds().has(i);
      // Nodes passing close to the camera would fill the view; fade them out.
      const near = Math.min(
        1,
        Math.max(0, (camera.position.distanceTo(positions[i]) - 0.15) / 0.55),
      );
      mesh.material.opacity = (faded ? 0.28 : 1) * near;
      rings[i].position.copy(positions[i]);
      rings[i].quaternion.copy(camera.quaternion);
      rings[i].scale.setScalar(baseSize[i] * emphasis);
      if (rings[i].visible) rings[i].material.opacity = faded ? 0.25 : 0.95;
    });
    if (selected >= 0 && visible[selected]) {
      focusRing.visible = true;
      focusRing.position.copy(positions[selected]);
      focusRing.quaternion.copy(camera.quaternion);
      focusRing.scale.setScalar(baseSize[selected] * 1.6);
    } else focusRing.visible = false;
    updateLines();
    renderer.render(scene, camera);
    updateLabels();
    updateGizmo();
  }
  let neighbourCache = null;
  let neighbourKey = null;
  function neighbourIds() {
    if (neighbourKey !== neighbourhood) {
      neighbourKey = neighbourhood;
      neighbourCache = new Set(neighbourhood.affinity);
      for (const k of neighbourhood.relations)
        relationIndex[k].forEach((i) => neighbourCache.add(i));
    }
    return neighbourCache;
  }
  requestAnimationFrame(frame);

  return {
    setLayout,
    setGeometry,
    setColors,
    setRings,
    setVisibility,
    setRelationTypes,
    setSelection,
    setLandmarks,
    setInset,
    focusOn,
    resetCamera,
    redraw: () => (dirty = true),
    colors: () => colors,
    dispose() {
      running = false;
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}
