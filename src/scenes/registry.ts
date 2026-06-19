import { Quaternion, Vector3 } from 'three';
import type { SceneDef3D, SceneModule } from '../engine/types3d';
import {
  daysSinceJ2000,
  latLonToVec3,
  PLANETS,
  planetPosition,
  STANFORD_LAT,
  STANFORD_LON,
} from './lib/astro';

/**
 * The zoom chain. Anchor scales are pinned by the size-match constraint:
 * (child frameWidth × anchor.scale) must equal the apparent size the parent
 * draws for the child (so the proxy↔real swap is invisible). K = parent
 * frameWidth / (child frameWidth × scale), kept ≈ 13–28 per hop.
 */

const quat = (q: Quaternion): [number, number, number, number] => [q.x, q.y, q.z, q.w];
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

// --- solar: Earth parked at its real position today (the dive target can't
// time-lapse; everything else in the scene animates) ---
const EARTH_NOW = planetPosition(PLANETS[2], daysSinceJ2000());

// --- earth: Stanford beacon on the real lat/lon of a radius-10 globe ---
const GLOBE_R = 10;
const STANFORD_NORMAL = latLonToVec3(STANFORD_LAT, STANFORD_LON, 1).normalize();
const STANFORD_POS = STANFORD_NORMAL.clone().multiplyScalar(GLOBE_R * 1.002);
const STANFORD_QUAT = new Quaternion().setFromUnitVectors(Y, STANFORD_NORMAL);

// --- stanford: dorm window the camera flies through ---
const WINDOW_POS = new Vector3(9, 3.0, -7);
const WINDOW_NORMAL = new Vector3(0.48, 0, 0.87).normalize();
const WINDOW_QUAT = new Quaternion().setFromUnitVectors(Z, WINDOW_NORMAL);

const lazyScene = <T>(
  importer: () => Promise<T>,
  createKey: keyof T,
  loadKey?: keyof T,
): SceneDef3D['importScene'] => async () => {
  const mod = await importer();
  return {
    create: mod[createKey] as SceneModule['create'],
    load: loadKey ? (mod[loadKey] as SceneModule['load']) : undefined,
  };
};

const defs: SceneDef3D[] = [
  {
    id: 'galaxy',
    label: 'The Milky Way',
    frameWidthMeters: 1e21,
    restPose: { focus: [0, 0, 0], dir: [0, 0.5, 1], frameWidth: 120, fov: 50 },
    // solar frame 60 × 0.1333 = 8 apparent units → K = 15
    anchor: { position: [24, 0.5, -10], scale: 8 / 60 },
    exposure: 1.1,
    effects: { bloom: true },
    importScene: lazyScene(() => import('./galaxy'), 'createGalaxy'),
  },
  {
    id: 'solar',
    label: 'The Solar System',
    frameWidthMeters: 1e13,
    restPose: { focus: [0, 0, 0], dir: [0, 0.6, 1], frameWidth: 60, fov: 50 },
    // earth frame 36 × 0.06 = 2.16 apparent (globe ∅20 × 0.06 = 1.2 = drawn Earth ∅) → K ≈ 28
    // (the galaxy→solar scale cheat is hidden scene-side: the galaxy fades
    // itself out via localT as the camera dives into the anchor star)
    anchor: { position: [EARTH_NOW.x, EARTH_NOW.y, EARTH_NOW.z], scale: 0.06 },
    exposure: 1.0,
    effects: { bloom: true },
    importScene: lazyScene(() => import('./solar'), 'createSolar', 'loadSolar'),
  },
  {
    id: 'earth',
    label: 'Earth',
    frameWidthMeters: 1e7,
    restPose: {
      focus: [0, 0, 0],
      dir: [STANFORD_NORMAL.x, STANFORD_NORMAL.y, STANFORD_NORMAL.z],
      frameWidth: 36,
      fov: 50,
    },
    // stanford frame 50 × 0.04 = 2 apparent units on the globe → K = 18
    anchor: {
      position: [STANFORD_POS.x, STANFORD_POS.y, STANFORD_POS.z],
      quaternion: quat(STANFORD_QUAT),
      scale: 0.04,
    },
    exposure: 1.1,
    effects: { bloom: true },
    importScene: lazyScene(() => import('./earth'), 'createEarth', 'loadEarth'),
  },
  {
    id: 'stanford',
    label: 'Stanford University',
    frameWidthMeters: 316,
    restPose: { focus: [0, 1.5, 0], dir: [0.55, 0.5, 1], frameWidth: 46, fov: 35 },
    // room frame 18 × 0.1222 = 2.2 apparent units (the lit window) → K ≈ 22.7
    anchor: {
      position: [WINDOW_POS.x, WINDOW_POS.y, WINDOW_POS.z],
      quaternion: quat(WINDOW_QUAT),
      scale: 2.2 / 18,
    },
    exposure: 1.15,
    effects: { tiltShift: true },
    importScene: lazyScene(() => import('./stanford'), 'createStanford'),
  },
  {
    id: 'room',
    label: 'My room',
    frameWidthMeters: 3.16,
    restPose: { focus: [0, 2.2, 0], dir: [0.25, 0.35, 1], frameWidth: 18, fov: 35 },
    hopIn: { kind: 'wipe', occluderName: 'window-glass' },
    // screen frame 16 × 0.0875 = 1.4 apparent units (monitor width) → K ≈ 12.9
    anchor: { position: [1.5, 2.6, -5.5], scale: 1.4 / 16 },
    exposure: 1.15,
    effects: { tiltShift: true },
    importScene: lazyScene(() => import('./room'), 'createRoom'),
  },
  {
    id: 'screen',
    label: 'My computer',
    frameWidthMeters: 0.316,
    restPose: { focus: [0, 0, 0], dir: [0, 0, 1], frameWidth: 16, fov: 45 },
    exposure: 1.0,
    effects: {},
    importScene: lazyScene(() => import('./screen'), 'createScreen'),
  },
];

export const CHAIN3D: SceneDef3D[] = defs;
