import { Quaternion, Vector3 } from 'three';
import type { SceneDef3D, SceneModule } from '../engine/types3d';
import {
  daysSinceJ2000,
  latLonToVec3,
  PLANETS,
  planetPosition,
  STANFORD_LAT,
  STANFORD_LON,
  EARTH_RADIUS_AU,
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
const FERMILAB_LAT = 41.8412;
const FERMILAB_LON = -88.2611;
const FERMILAB_NORMAL = latLonToVec3(FERMILAB_LAT, FERMILAB_LON, 1).normalize();
const FERMILAB_POS = FERMILAB_NORMAL.clone().multiplyScalar(GLOBE_R * 1.002);
const FERMILAB_QUAT = new Quaternion().setFromUnitVectors(Y, FERMILAB_NORMAL);

// --- stanford: dorm window the camera flies through ---
const WINDOW_POS = new Vector3(9, 3.0, -7);
const WINDOW_NORMAL = new Vector3(0.48, 0, 0.87).normalize();
const WINDOW_QUAT = new Quaternion().setFromUnitVectors(Z, WINDOW_NORMAL);

const lazyScene =
  <T>(
    importer: () => Promise<T>,
    createKey: keyof T,
    loadKey?: keyof T,
  ): SceneDef3D['importScene'] =>
  async () => {
    const mod = await importer();
    return {
      create: mod[createKey] as SceneModule['create'],
      load: loadKey ? (mod[loadKey] as SceneModule['load']) : undefined,
    };
  };

const prefix = (earthBranch: 'stanford' | 'fermilab'): SceneDef3D[] => [
  {
    id: 'galaxy',
    label: 'The Milky Way',
    frameWidthMeters: 1e21,
    restPose: { focus: [0, 0, 0], dir: [0, 0.5, 1], frameWidth: 120, fov: 50, fit: 'contain' },
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
    // A high oblique orrery view keeps the physical X-Z ecliptic plane
    // legible on screen: planets visibly travel around, rather than mostly
    // up and down along edge-on orbit guides.
    restPose: { focus: [0, 0, 0], dir: [0, 1, 0.42], frameWidth: 64, fov: 50, fit: 'contain' },
    // Literal Earth radius: the dynamic solar anchor updates this position
    // from the JPL ephemeris while preserving a seamless physical-size dive.
    anchor: { position: [EARTH_NOW.x, EARTH_NOW.y, EARTH_NOW.z], scale: EARTH_RADIUS_AU / GLOBE_R },
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
    importScene: lazyScene(
      () => import('./earth'),
      earthBranch === 'fermilab' ? 'createEarthFermilab' : 'createEarthStanford',
      'loadEarth',
    ),
  },
];

const stanfordSuffix: SceneDef3D[] = [
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
    exposure: 1.3,
    effects: {},
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
    exposure: 1.25,
    effects: {},
    importScene: lazyScene(() => import('./room'), 'createRoom', 'loadRoom'),
  },
  {
    id: 'screen',
    label: 'My computer',
    frameWidthMeters: 0.316,
    restPose: { focus: [0, 0, 0], dir: [0, 0, 1], frameWidth: 16, fov: 45 },
    exposure: 1.0,
    effects: {},
    importScene: lazyScene(() => import('./screen'), 'createScreen', 'loadScreen'),
  },
];

const fermilabSuffix: SceneDef3D[] = [
  {
    id: 'fermilab',
    label: 'Fermilab',
    frameWidthMeters: 316,
    restPose: { focus: [0, 2, 0], dir: [0.62, 0.48, 1], frameWidth: 46, fov: 38 },
    // NuMI hall frame 24 × 0.0833 = 2 apparent units → K ≈ 23
    anchor: { position: [5.4, -0.45, -5.8], scale: 2 / 24 },
    exposure: 1.15,
    effects: {},
    importScene: lazyScene(() => import('./fermilab'), 'createFermilab'),
  },
  {
    id: 'numi-hall',
    label: 'NuMI underground hall',
    frameWidthMeters: 25,
    restPose: { focus: [0, 1.6, 0], dir: [0.38, 0.22, 1], frameWidth: 24, fov: 42 },
    // event frame 18 × 0.06 = 1.08 apparent units → K ≈ 22.2
    anchor: { position: [0, 1.65, -2.6], scale: 0.06 },
    exposure: 1.1,
    effects: {},
    importScene: lazyScene(() => import('./numi-hall'), 'createNumiHall'),
  },
  {
    id: 'event',
    label: 'MINERvA event',
    frameWidthMeters: 2,
    restPose: { focus: [0, 0, 0], dir: [0.2, 0.1, 1], frameWidth: 18, fov: 44 },
    exposure: 1.05,
    effects: {},
    importScene: lazyScene(() => import('./event'), 'createEvent'),
  },
];

/** Default chain: retained as the Stanford route for backwards compatibility. */
export const CHAIN3D: SceneDef3D[] = [...prefix('stanford'), ...stanfordSuffix];
export const FERMILAB_CHAIN3D: SceneDef3D[] = [
  ...prefix('fermilab').map((scene) =>
    scene.id === 'earth'
      ? {
          ...scene,
          restPose: {
            ...scene.restPose,
            dir: [FERMILAB_NORMAL.x, FERMILAB_NORMAL.y, FERMILAB_NORMAL.z] as [
              number,
              number,
              number,
            ],
          },
          anchor: {
            position: [FERMILAB_POS.x, FERMILAB_POS.y, FERMILAB_POS.z] as [number, number, number],
            quaternion: quat(FERMILAB_QUAT),
            scale: 0.04,
          },
        }
      : scene,
  ),
  ...fermilabSuffix,
];

export function branchForHash(hash: string): 'stanford' | 'fermilab' {
  return /^#\/(?:fermilab|numi-hall|event)(?:\/|$)/.test(hash) ? 'fermilab' : 'stanford';
}

export function chainForBranch(branch: 'stanford' | 'fermilab'): SceneDef3D[] {
  return branch === 'fermilab' ? FERMILAB_CHAIN3D : CHAIN3D;
}
