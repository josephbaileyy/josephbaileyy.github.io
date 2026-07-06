import * as THREE from 'three';

const DETECTOR_COLOR = new THREE.Color('#5a6b85');
const OUTER_COLOR = new THREE.Color('#70839f');
const BEAM_COLOR = new THREE.Color('#33d4ff');

function pushSegment(target, start, end) {
  target.push(start.x, start.y, start.z, end.x, end.y, end.z);
}

function addCircle(target, radius, z, segments = 96, startAngle = 0, endAngle = Math.PI * 2) {
  const span = endAngle - startAngle;

  for (let index = 0; index < segments; index += 1) {
    const a0 = startAngle + (span * index) / segments;
    const a1 = startAngle + (span * (index + 1)) / segments;
    pushSegment(
      target,
      new THREE.Vector3(Math.cos(a0) * radius, Math.sin(a0) * radius, z),
      new THREE.Vector3(Math.cos(a1) * radius, Math.sin(a1) * radius, z),
    );
  }
}

function addRail(target, radius, halfLength, angle) {
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  pushSegment(target, new THREE.Vector3(x, y, -halfLength), new THREE.Vector3(x, y, halfLength));
}

function makeLineSegments(positions, color, opacity) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  return lines;
}

export function createDetector() {
  const group = new THREE.Group();
  const base = [];
  const outer = [];
  const beam = [];

  const layers = [
    { radius: 0.3, halfLength: 0.8, rails: 12 },
    { radius: 0.55, halfLength: 1.2, rails: 14 },
    { radius: 0.9, halfLength: 1.6, rails: 16 },
    { radius: 1.3, halfLength: 2.2, rails: 18 },
    { radius: 1.8, halfLength: 2.8, rails: 24, outer: true },
  ];

  layers.forEach((layer) => {
    const target = layer.outer ? outer : base;
    addCircle(target, layer.radius, -layer.halfLength, layer.outer ? 128 : 88);
    addCircle(target, layer.radius, layer.halfLength, layer.outer ? 128 : 88);

    for (let rail = 0; rail < layer.rails; rail += 1) {
      const angle = (Math.PI * 2 * rail) / layer.rails;
      addRail(target, layer.radius, layer.halfLength, angle);
    }
  });

  const outerRadius = 1.8;
  const outerHalfLength = 2.8;
  const octants = 8;
  const panelZ = [-outerHalfLength, -1.4, 0, 1.4, outerHalfLength];

  panelZ.forEach((z) => {
    for (let octant = 0; octant < octants; octant += 1) {
      const start = (Math.PI * 2 * octant) / octants + 0.025;
      const end = (Math.PI * 2 * (octant + 1)) / octants - 0.025;
      addCircle(outer, outerRadius, z, 8, start, end);
    }
  });

  for (let octant = 0; octant < octants; octant += 1) {
    addRail(outer, outerRadius, outerHalfLength, (Math.PI * 2 * octant) / octants);
  }

  [-outerHalfLength, outerHalfLength].forEach((z) => {
    [0.6, 1.2, 1.8].forEach((radius) => addCircle(base, radius, z, 96));

    for (let spoke = 0; spoke < 16; spoke += 1) {
      const angle = (Math.PI * 2 * spoke) / 16;
      pushSegment(
        base,
        new THREE.Vector3(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, z),
        new THREE.Vector3(Math.cos(angle) * 1.8, Math.sin(angle) * 1.8, z),
      );
    }
  });

  for (let z = -3.2; z < 3.2; z += 0.18) {
    pushSegment(beam, new THREE.Vector3(0, 0, z), new THREE.Vector3(0, 0, z + 0.1));
  }

  group.add(makeLineSegments(base, DETECTOR_COLOR, 0.16));
  group.add(makeLineSegments(outer, OUTER_COLOR, 0.25));
  group.add(makeLineSegments(beam, BEAM_COLOR, 0.22));
  return group;
}
