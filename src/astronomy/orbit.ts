import { Vector3 } from 'three';

const MU_SUN_AU3_DAY2 = 0.0002959122082855911;

/** Current two-body osculating ellipse derived from a JPL position/velocity state. */
export function osculatingOrbitPoints(position: Vector3, velocity: Vector3, segments = 256): Float32Array | null {
  const h = position.clone().cross(velocity);
  const h2 = h.lengthSq();
  if (h2 < 1e-16) return null;
  const eccentricity = velocity.clone().cross(h).multiplyScalar(1 / MU_SUN_AU3_DAY2)
    .sub(position.clone().normalize());
  const e = eccentricity.length();
  if (!Number.isFinite(e) || e >= 1) return null;
  const periapsis = eccentricity.multiplyScalar(1 / Math.max(e, 1e-8));
  const transverse = h.normalize().cross(periapsis).normalize();
  const semilatus = h2 / MU_SUN_AU3_DAY2;
  const points = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const radius = semilatus / (1 + e * Math.cos(theta));
    const point = periapsis.clone().multiplyScalar(radius * Math.cos(theta))
      .addScaledVector(transverse, radius * Math.sin(theta));
    points[i * 3] = point.x;
    points[i * 3 + 1] = point.y;
    points[i * 3 + 2] = point.z;
  }
  return points;
}
