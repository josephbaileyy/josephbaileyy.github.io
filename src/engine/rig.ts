import { Matrix4, Quaternion, Vector3 } from 'three';
import type { AnchorSpec, RestPose, SceneDef3D } from './types3d';

/**
 * Pure math: depth → camera pose + mount plan. The 3D generalization of the
 * old 2D transforms.ts, with the same philosophy — everything is recomputed
 * fresh from `depth` each frame; nothing accumulates. The base scene is always
 * mounted at identity and the child at the base's anchor transform, so
 * per-frame numbers stay bounded no matter how deep the chain goes.
 */

export interface Viewport {
  w: number;
  h: number;
}

export interface CameraPose {
  position: Vector3;
  quaternion: Quaternion;
  fov: number;
}

export interface MountPlan {
  base: number;
  child: number | null;
}

const UP = new Vector3(0, 1, 0);
const DEG = Math.PI / 180;

/**
 * Rest distance for the authored 16:10 frame. Cover-fit crops the sides on a
 * narrow viewport; contain-fit preserves the full frame for hotspot layouts.
 */
export function restDistance(pose: RestPose, vp: Viewport): number {
  const aspect = vp.w / vp.h;
  const halfH = pose.frameWidth / 1.6 / 2;
  const halfW = pose.frameWidth / 2;
  const tanV = Math.tan((pose.fov / 2) * DEG);
  const tanH = tanV * aspect;
  const distances = [halfH / tanV, halfW / tanH];
  return pose.fit === 'contain' ? Math.max(...distances) : Math.min(...distances);
}

/** Settled camera pose for a scene, in that scene's local space. */
export function restCameraPose(def: SceneDef3D, vp: Viewport): CameraPose {
  const p = def.restPose;
  const focus = new Vector3(...p.focus);
  const dir = new Vector3(...p.dir).normalize();
  const position = focus.clone().addScaledVector(dir, restDistance(p, vp));
  const m = new Matrix4().lookAt(position, focus, UP);
  return { position, quaternion: new Quaternion().setFromRotationMatrix(m), fov: p.fov };
}

export function anchorMatrix(anchor: AnchorSpec): Matrix4 {
  const q = anchor.quaternion
    ? new Quaternion(...anchor.quaternion).normalize()
    : new Quaternion();
  return new Matrix4().compose(
    new Vector3(...anchor.position),
    q,
    new Vector3(anchor.scale, anchor.scale, anchor.scale),
  );
}

/** The child's rest pose pushed through the parent's anchor transform. */
export function childRestInParent(
  anchor: AnchorSpec,
  childDef: SceneDef3D,
  vp: Viewport,
): CameraPose {
  const child = restCameraPose(childDef, vp);
  const aq = anchor.quaternion
    ? new Quaternion(...anchor.quaternion).normalize()
    : new Quaternion();
  const position = child.position
    .clone()
    .multiplyScalar(anchor.scale)
    .applyQuaternion(aq)
    .add(new Vector3(...anchor.position));
  return { position, quaternion: aq.multiply(child.quaternion), fov: child.fov };
}

/** Spherical interpolation of unit direction vectors. */
function slerpDir(a: Vector3, b: Vector3, t: number): Vector3 {
  let dot = a.dot(b);
  dot = Math.min(1, Math.max(-1, dot));
  const theta = Math.acos(dot);
  if (theta < 1e-6) return a.clone().lerp(b, t).normalize();
  if (theta > Math.PI - 1e-4) {
    // antiparallel: rotate through an arbitrary perpendicular
    const axis = Math.abs(a.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const perp = axis.cross(a).normalize();
    return slerpDir(a, perp, Math.min(1, t * 2)).lerp(
      slerpDir(perp, b, Math.max(0, t * 2 - 1)),
      t < 0.5 ? 0 : 1,
    );
  }
  const s = Math.sin(theta);
  return a
    .clone()
    .multiplyScalar(Math.sin((1 - t) * theta) / s)
    .addScaledVector(b, Math.sin(t * theta) / s)
    .normalize();
}

function lerpFov(fovA: number, fovB: number, t: number): number {
  // log-tan lerp: perceptually constant zoom rate when fovs differ
  const a = Math.log(Math.tan((fovA / 2) * DEG));
  const b = Math.log(Math.tan((fovB / 2) * DEG));
  return (2 * Math.atan(Math.exp(a + (b - a) * t))) / DEG;
}

export interface RigResult {
  pose: CameraPose;
  base: number;
  /** frac(depth) seen from the base scene */
  t: number;
}

/**
 * Camera pose at `depth`, expressed in the BASE scene's local space
 * (= world space, since the base is mounted at identity).
 */
export function cameraPose(depth: number, defs: SceneDef3D[], vp: Viewport): RigResult {
  return cameraPoseWithAnchors(depth, defs, vp);
}

export function cameraPoseWithAnchors(
  depth: number,
  defs: SceneDef3D[],
  vp: Viewport,
  anchorAt?: (index: number) => AnchorSpec | undefined,
): RigResult {
  const n = defs.length;
  const d = Math.min(Math.max(depth, 0), n - 1);
  let base = Math.floor(d);
  if (base >= n - 1) base = n - 1;
  const t = d - base;

  const start = restCameraPose(defs[base], vp);
  if (t < 1e-9) return { pose: start, base, t: 0 };

  const anchor = anchorAt?.(base) ?? defs[base].anchor;
  if (!anchor) throw new Error(`scene ${defs[base].id} has no anchor but depth=${depth}`);
  const end = childRestInParent(anchor, defs[base + 1], vp);

  const F = new Vector3(...anchor.position);
  const vS = start.position.clone().sub(F);
  const vE = end.position.clone().sub(F);
  const dS = vS.length();
  const dE = vE.length();
  // geometric distance interpolation — the 3D K^t
  const D = Math.pow(dS, 1 - t) * Math.pow(dE, t);
  const dir = slerpDir(vS.divideScalar(dS), vE.divideScalar(dE), t);

  return {
    pose: {
      position: F.clone().addScaledVector(dir, D),
      quaternion: start.quaternion.clone().slerp(end.quaternion, t),
      fov: lerpFov(start.fov, end.fov, t),
    },
    base,
    t,
  };
}

/**
 * Which scenes are mounted, as a reducer (hysteresis on the child to avoid
 * mount thrash at integer boundaries). Base at identity; child at the base's
 * anchor transform.
 */
export function nextMountPlan(prev: MountPlan | null, depth: number, n: number): MountPlan {
  const d = Math.min(Math.max(depth, 0), n - 1);
  let base = Math.floor(d);
  if (base >= n - 1) base = n - 1;
  const t = d - base;

  let child: number | null = null;
  if (base < n - 1) {
    const wasMounted = prev !== null && prev.base === base && prev.child === base + 1;
    if (t > 0.02 || (wasMounted && t > 0.005)) child = base + 1;
  }
  if (prev && prev.base === base && prev.child === child) return prev;
  return { base, child };
}

/** Project a world-space point to viewport pixels (z>1 means behind camera). */
export function projectToPx(
  point: Vector3,
  camera: { matrixWorldInverse: Matrix4; projectionMatrix: Matrix4 },
  vp: Viewport,
  out = new Vector3(),
): Vector3 {
  out
    .copy(point)
    .applyMatrix4(camera.matrixWorldInverse)
    .applyMatrix4(camera.projectionMatrix);
  out.x = ((out.x + 1) / 2) * vp.w;
  out.y = ((1 - out.y) / 2) * vp.h;
  return out;
}

/** Scale-ribbon exponent: piecewise log-lerp of authored frame widths. */
export function scaleExponent(depth: number, defs: SceneDef3D[]): number {
  const n = defs.length;
  const d = Math.min(Math.max(depth, 0), n - 1);
  let i = Math.floor(d);
  if (i >= n - 1) i = n - 1;
  const t = d - i;
  const a = Math.log10(defs[i].frameWidthMeters);
  if (t < 1e-9) return a;
  const b = Math.log10(defs[i + 1].frameWidthMeters);
  return a + (b - a) * t;
}
