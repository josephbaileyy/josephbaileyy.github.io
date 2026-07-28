import * as THREE from 'three';

const TRACKER_RADIUS = 2.5;
const MUON_RADIUS = 3.45;
const TRACKER_HALF_LENGTH = 2.9;
const MUON_HALF_LENGTH = 4.2;
const POSITIVE = new THREE.Color('#ff6b4c');
const NEGATIVE = new THREE.Color('#55a9ff');
const MUON = new THREE.Color('#f1f5ff');
const ECAL = new THREE.Color('#ffd166');
const HCAL = new THREE.Color('#f07a5b');

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function pointOnHelix(phi, curvature, transverseLength, zSlope) {
  if (Math.abs(curvature) < 0.00001) {
    return {
      x: Math.cos(phi) * transverseLength,
      y: Math.sin(phi) * transverseLength,
      z: transverseLength * zSlope,
    };
  }

  return {
    x: (Math.sin(phi + curvature * transverseLength) - Math.sin(phi)) / curvature,
    y: (-Math.cos(phi + curvature * transverseLength) + Math.cos(phi)) / curvature,
    z: transverseLength * zSlope,
  };
}

/**
 * Projects a measured pt/eta/phi/q tuple into a solenoidal transverse helix.
 * The display scale is illustrative; every direction and bend comes from data.
 */
export function projectTrack(track, { muon = false, samples = 30 } = {}) {
  const pt = Math.max(0.05, finite(track?.pt, 0.05));
  const eta = finite(track?.eta);
  const phi = finite(track?.phi);
  const charge = finite(track?.q ?? track?.charge, 1) < 0 ? -1 : 1;
  const targetRadius = muon ? MUON_RADIUS : TRACKER_RADIUS;
  const halfLength = muon ? MUON_HALF_LENGTH : TRACKER_HALF_LENGTH;
  const curvature = charge * (0.36 / pt);
  const zSlope = Math.sinh(clamp(eta, -4.5, 4.5)) * 0.11;
  const maximumLength = targetRadius * (muon ? 2.25 : 1.95);
  const points = [];

  for (let index = 0; index < Math.max(4, samples); index += 1) {
    const progress = index / (Math.max(4, samples) - 1);
    const point = pointOnHelix(phi, curvature, maximumLength * progress, zSlope);
    points.push({ ...point, progress });

    if (
      index > 2 &&
      (Math.hypot(point.x, point.y) >= targetRadius || Math.abs(point.z) >= halfLength)
    ) {
      break;
    }
  }

  return points;
}

function selectMeasuredTracks(tracks, maximum) {
  if (tracks.length <= maximum) {
    return tracks;
  }

  const selectedIndexes = new Set(
    tracks
      .map((track, index) => ({ index, pt: finite(track.pt) }))
      .sort((a, b) => b.pt - a.pt)
      .slice(0, maximum)
      .map(({ index }) => index),
  );

  return tracks.filter((_, index) => selectedIndexes.has(index));
}

function trackColor(track, isMuon) {
  if (isMuon) {
    return MUON.clone();
  }

  const pt = Math.max(0.05, finite(track.pt, 0.05));
  const strength = clamp(Math.log2(pt + 1) / 4.3, 0.16, 0.9);
  const color = (finite(track.q, 1) < 0 ? NEGATIVE : POSITIVE).clone();
  return color.multiplyScalar(0.58 + strength * 0.55);
}

function makeTrackInstances(tracks, { compact, isMuon = false, quiet = false }) {
  const sampleCount = compact ? (isMuon ? 25 : 16) : isMuon ? 42 : 25;
  const paths = tracks.map((track) => ({
    track,
    points: projectTrack(track, { muon: isMuon, samples: sampleCount }),
  }));
  const instanceCount = paths.reduce(
    (total, { points }) => total + Math.max(0, points.length - 1),
    0,
  );
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: quiet ? (isMuon ? 0.42 : 0.24) : isMuon ? 0.94 : 0.72,
    blending: quiet ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  let cursor = 0;

  for (const { track, points } of paths) {
    const pt = Math.max(0.05, finite(track.pt, 0.05));
    const width =
      (isMuon ? 0.026 : 0.0085 + clamp(Math.log2(pt + 1), 0, 5) * 0.0032) * (quiet ? 0.8 : 1);
    color.copy(trackColor(track, isMuon));

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      const midpointX = (start.x + end.x) * 0.5;
      const midpointY = (start.y + end.y) * 0.5;
      const angle = Math.atan2(dy, dx);

      matrix.compose(
        new THREE.Vector3(midpointX, midpointY, isMuon ? 0.04 : 0.02),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle),
        new THREE.Vector3(length * 1.05, width, 1),
      );
      mesh.setMatrixAt(cursor, matrix);
      mesh.setColorAt(cursor, color);
      cursor += 1;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.frustumCulled = false;
  mesh.renderOrder = isMuon ? 5 : 3;
  mesh.userData.disposable = true;
  return mesh;
}

function makeCaloInstances(hits, { quiet = false } = {}) {
  const geometry = new THREE.BoxGeometry(1, 1, 0.025);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: quiet ? 0.3 : 0.88,
    blending: quiet ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, hits.length);
  const matrix = new THREE.Matrix4();
  const radial = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const scale = new THREE.Matrix4();
  const color = new THREE.Color();

  hits.forEach((hit, index) => {
    const et = Math.max(0.05, finite(hit.et, 0.05));
    const phi = finite(hit.phi);
    const eta = clamp(Math.abs(finite(hit.eta)), 0, 5);
    const isHcal = String(hit.system).toLowerCase() === 'hcal';
    const innerRadius = (isHcal ? 3.12 : 2.78) + eta * 0.018;
    const depth = 0.09 + clamp(Math.sqrt(et) * 0.095, 0.06, 0.52);
    const width = (isHcal ? 0.16 : 0.105) + clamp(Math.log2(et + 1) * 0.012, 0, 0.05);
    radial.set(Math.cos(phi), Math.sin(phi), 0);
    tangent.set(-Math.sin(phi), Math.cos(phi), 0);
    basis.makeBasis(radial, tangent, new THREE.Vector3(0, 0, 1));
    basis.setPosition(
      radial.x * (innerRadius + depth * 0.5),
      radial.y * (innerRadius + depth * 0.5),
      isHcal ? 0.03 : 0.02,
    );
    scale.makeScale(depth, width, 1);
    matrix.multiplyMatrices(basis, scale);
    mesh.setMatrixAt(index, matrix);

    color.copy(isHcal ? HCAL : ECAL);
    color.multiplyScalar(0.62 + clamp(Math.log2(et + 1) / 4, 0.08, 0.55));
    mesh.setColorAt(index, color);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.userData.disposable = true;
  return mesh;
}

function makeCircle(radius, color, opacity, segments = 128) {
  const points = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.userData.disposable = true;
  return line;
}

function makeDetector(quiet) {
  const group = new THREE.Group();
  const opacity = quiet ? 0.2 : 0.28;
  [0.22, 0.72, 1.28, 1.86, TRACKER_RADIUS, 2.72, 3.08, MUON_RADIUS].forEach((radius, index) => {
    group.add(
      makeCircle(
        radius,
        index < 5 ? '#526276' : '#7d695f',
        opacity * (index === 4 || index === 7 ? 1.28 : 0.72),
        quiet ? 80 : 128,
      ),
    );
  });

  const beamGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.34, 0, 0.01),
    new THREE.Vector3(0.34, 0, 0.01),
    new THREE.Vector3(0, 0, 0.01),
    new THREE.Vector3(0, -0.34, 0.01),
    new THREE.Vector3(0, 0.34, 0.01),
  ]);
  const beam = new THREE.Line(
    beamGeometry,
    new THREE.LineBasicMaterial({
      color: '#d7e5f5',
      transparent: true,
      opacity: quiet ? 0.22 : 0.48,
    }),
  );
  beam.userData.disposable = true;
  group.add(beam);
  return group;
}

function makeLayer(event, { compact, quiet }) {
  const group = new THREE.Group();
  const trackLimit = compact ? 108 : 220;
  const tracks = selectMeasuredTracks(Array.isArray(event.tracks) ? event.tracks : [], trackLimit);
  const muons = Array.isArray(event.muons) ? event.muons : [];
  const calo = Array.isArray(event.calo) ? event.calo : [];
  const detector = makeDetector(quiet);
  const trackMesh = makeTrackInstances(tracks, { compact, quiet });
  const muonMesh = makeTrackInstances(muons, { compact, isMuon: true, quiet });
  const energyMesh = makeCaloInstances(calo, { quiet });

  group.add(detector, trackMesh, muonMesh, energyMesh);
  return { group, detector, trackMesh, muonMesh, energyMesh };
}

function disposeTree(root) {
  root.traverse((object) => {
    if (!object.userData.disposable) {
      return;
    }
    object.geometry?.dispose();
    object.material?.dispose();
  });
}

export function parseEventId(id) {
  const [run = '—', event = '—'] = String(id ?? '').split(':');
  return { run, event };
}

export function summarizeEvent(event) {
  const tracks = Array.isArray(event?.tracks) ? event.tracks : [];
  const muons = Array.isArray(event?.muons) ? event.muons : [];
  const calo = Array.isArray(event?.calo) ? event.calo : [];
  const sumPt = tracks.reduce((sum, track) => sum + finite(track.pt), 0);
  return {
    ...parseEventId(event?.id),
    tracks: tracks.length,
    muons: muons.length,
    cells: calo.length,
    sumPt: Math.round(sumPt),
  };
}

export function createEventVisuals(event, { compact = false, mode = 'all' } = {}) {
  const base = makeLayer(event, { compact, quiet: true });
  const detail = makeLayer(event, { compact, quiet: false });

  function setMode(nextMode) {
    detail.detector.visible = true;
    detail.trackMesh.visible = nextMode === 'all' || nextMode === 'tracks';
    detail.muonMesh.visible = nextMode === 'all' || nextMode === 'muons';
    detail.energyMesh.visible = nextMode === 'all' || nextMode === 'energy';
  }

  setMode(mode);
  return {
    base: base.group,
    detail: detail.group,
    setMode,
    stats: summarizeEvent(event),
    dispose() {
      disposeTree(base.group);
      disposeTree(detail.group);
    },
  };
}
