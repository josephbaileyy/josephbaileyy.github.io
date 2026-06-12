import { Vector3 } from 'three';

/**
 * Circular, coplanar planet positions from J2000 mean longitudes — errors of
 * a few degrees, invisible at orrery scale, but the configuration matches the
 * real sky today.
 */
export interface PlanetElements {
  name: string;
  /** J2000 mean longitude, degrees */
  L0: number;
  /** mean motion, degrees/day */
  n: number;
  /** semi-major axis, AU */
  a: number;
  /** radius, Earth radii */
  radius: number;
}

export const PLANETS: PlanetElements[] = [
  { name: 'mercury', L0: 252.251, n: 4.09234, a: 0.387, radius: 0.383 },
  { name: 'venus', L0: 181.98, n: 1.60213, a: 0.723, radius: 0.949 },
  { name: 'earth', L0: 100.464, n: 0.98561, a: 1.0, radius: 1.0 },
  { name: 'mars', L0: 355.453, n: 0.52403, a: 1.524, radius: 0.532 },
  { name: 'jupiter', L0: 34.396, n: 0.08309, a: 5.203, radius: 11.21 },
  { name: 'saturn', L0: 49.954, n: 0.03346, a: 9.537, radius: 9.45 },
  { name: 'uranus', L0: 313.238, n: 0.01173, a: 19.191, radius: 4.01 },
  { name: 'neptune', L0: 304.88, n: 0.00598, a: 30.069, radius: 3.88 },
];

const J2000_MS = 946727935816; // 2000-01-01T11:58:55.816Z (J2000.0 epoch)

export function daysSinceJ2000(nowMs: number = Date.now()): number {
  return (nowMs - J2000_MS) / 86400000;
}

/** Scene-space orbital distance: power-law compression keeps all 8 in frame. */
export function orbitDistance(aAU: number): number {
  return 7.0 * Math.pow(aAU, 0.4);
}

/** Scene-space planet radius (compressed; Sun is 3.0 by convention). */
export function planetRadius(earthRadii: number): number {
  return Math.max(0.18, 0.6 * Math.sqrt(earthRadii));
}

/** Heliocentric position in scene units at `d` days since J2000 (y = 0 plane). */
export function planetPosition(p: PlanetElements, d: number, out = new Vector3()): Vector3 {
  const lambda = ((p.L0 + p.n * d) * Math.PI) / 180;
  const r = orbitDistance(p.a);
  return out.set(r * Math.cos(lambda), 0, -r * Math.sin(lambda));
}

/**
 * lat/lon (degrees) → position on a sphere of radius R, matching three.js
 * equirect texture orientation (lon 0 at +x after the standard 0.5 u-offset;
 * calibrate the texture offset once against Africa).
 */
export function latLonToVec3(lat: number, lon: number, R: number, out = new Vector3()): Vector3 {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  return out.set(R * Math.cos(phi) * Math.cos(lambda), R * Math.sin(phi), -R * Math.cos(phi) * Math.sin(lambda));
}

export const STANFORD_LAT = 37.4275;
export const STANFORD_LON = -122.1697;

/**
 * Unit vector toward the Sun in Earth-fixed coordinates, from real UTC time:
 * solar declination + subsolar longitude (equation of time skipped, ≤±4°).
 */
export function sunDirection(nowMs: number = Date.now(), out = new Vector3()): Vector3 {
  const date = new Date(nowMs);
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = (nowMs - start) / 86400000 + 1;
  const decl = (-23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365.25) * Math.PI) / 180;
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const subsolarLon = (-15 * (utcHours - 12) * Math.PI) / 180;
  return out
    .set(Math.cos(decl) * Math.cos(subsolarLon), Math.sin(decl), -Math.cos(decl) * Math.sin(subsolarLon))
    .normalize();
}
