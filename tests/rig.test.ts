import { describe, expect, it } from 'vitest';
import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import {
  anchorMatrix,
  cameraPose,
  childRestInParent,
  nextMountPlan,
  restCameraPose,
  restDistance,
  scaleExponent,
  type MountPlan,
} from '../src/engine/rig';
import { CHAIN3D } from '../src/scenes/registry';

const VP = { w: 1280, h: 800 };

function projectToNDC(point: Vector3, pose: { position: Vector3; quaternion: Quaternion; fov: number }, vp: { w: number; h: number }): Vector3 {
  const cam = new PerspectiveCamera(pose.fov, vp.w / vp.h, 0.001, 5000);
  cam.position.copy(pose.position);
  cam.quaternion.copy(pose.quaternion);
  cam.updateMatrixWorld();
  return point.clone().project(cam);
}

describe('restCameraPose', () => {
  it('frames the focus at NDC origin with the configured fit distance', () => {
    for (const def of CHAIN3D) {
      const pose = restCameraPose(def, VP);
      const ndc = projectToNDC(new Vector3(...def.restPose.focus), pose, VP);
      expect(Math.abs(ndc.x)).toBeLessThan(1e-6);
      expect(Math.abs(ndc.y)).toBeLessThan(1e-6);
      const D = pose.position.distanceTo(new Vector3(...def.restPose.focus));
      expect(D).toBeCloseTo(restDistance(def.restPose, VP), 8);
    }
  });

  it('contain-fits the galaxy so every authored hotspot remains visible', () => {
    const def = CHAIN3D[0];
    for (const vp of [VP, { w: 2560, h: 1080 }, { w: 390, h: 844 }]) {
      const pose = restCameraPose(def, vp);
      const W = def.restPose.frameWidth;
      // frame corners in the camera-facing plane through the focus
      const right = new Vector3(1, 0, 0).applyQuaternion(pose.quaternion);
      const upv = new Vector3(0, 1, 0).applyQuaternion(pose.quaternion);
      const focus = new Vector3(...def.restPose.focus);
      const corner = focus
        .clone()
        .addScaledVector(right, W / 2)
        .addScaledVector(upv, W / 3.2);
      const ndc = projectToNDC(corner, pose, vp);
      expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1 + 1e-6);
      expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1 + 1e-6);
    }
  });

  it('cover-fits the enclosed scenes', () => {
    const def = CHAIN3D[1];
    for (const vp of [{ w: 2560, h: 1080 }, { w: 390, h: 844 }]) {
      const pose = restCameraPose(def, vp);
      const W = def.restPose.frameWidth;
      const right = new Vector3(1, 0, 0).applyQuaternion(pose.quaternion);
      const upv = new Vector3(0, 1, 0).applyQuaternion(pose.quaternion);
      const corner = new Vector3(...def.restPose.focus)
        .addScaledVector(right, W / 2)
        .addScaledVector(upv, W / 3.2);
      const ndc = projectToNDC(corner, pose, vp);
      expect(Math.max(Math.abs(ndc.x), Math.abs(ndc.y))).toBeGreaterThanOrEqual(1 - 1e-6);
    }
  });
});

describe('seam theorem', () => {
  it('A_i⁻¹ ∘ pose(i+1−ε) converges to pose(i+1) for every hop', () => {
    for (let i = 0; i < CHAIN3D.length - 1; i++) {
      const eps = 1e-7;
      const before = cameraPose(i + 1 - eps, CHAIN3D, VP).pose;
      const after = cameraPose(i + 1, CHAIN3D, VP).pose;

      // express `before` (parent space) in child space via the anchor inverse
      const inv = anchorMatrix(CHAIN3D[i].anchor!).invert();
      const posChild = before.position.clone().applyMatrix4(inv);
      const aq = CHAIN3D[i].anchor!.quaternion;
      const aQuat = aq ? new Quaternion(...aq).normalize() : new Quaternion();
      const quatChild = aQuat.invert().multiply(before.quaternion);

      expect(posChild.distanceTo(after.position)).toBeLessThan(1e-3);
      expect(Math.abs(quatChild.dot(after.quaternion))).toBeGreaterThan(1 - 1e-8);
      expect(before.fov).toBeCloseTo(after.fov, 4);
    }
  });

  it('a probe point fixed in child space projects continuously across the boundary', () => {
    for (let i = 0; i < CHAIN3D.length - 1; i++) {
      const probeChild = new Vector3(1.3, 0.7, -0.5); // arbitrary child-space point
      const A = anchorMatrix(CHAIN3D[i].anchor!);
      const probeParent = probeChild.clone().applyMatrix4(A);

      const justBefore = cameraPose(i + 1 - 1e-6, CHAIN3D, VP).pose; // parent space
      const atBoundary = cameraPose(i + 1, CHAIN3D, VP).pose; // child space

      const ndcBefore = projectToNDC(probeParent, justBefore, VP);
      const ndcAfter = projectToNDC(probeChild, atBoundary, VP);
      expect(ndcBefore.x).toBeCloseTo(ndcAfter.x, 3);
      expect(ndcBefore.y).toBeCloseTo(ndcAfter.y, 3);
    }
  });
});

describe('zoom rate', () => {
  it('camera distance to the anchor focus is geometric in t (log-linear)', () => {
    const def = CHAIN3D[0];
    const F = new Vector3(...def.anchor!.position);
    const samples = [0.2, 0.4, 0.6, 0.8].map((t) => {
      const { pose } = cameraPose(t, CHAIN3D, VP);
      return Math.log(pose.position.distanceTo(F));
    });
    const slope1 = samples[1] - samples[0];
    for (let k = 1; k < samples.length - 1; k++) {
      expect(samples[k + 1] - samples[k]).toBeCloseTo(slope1, 6);
    }
  });

  it('distance stays bounded within [D_end, D_start] all along the hop', () => {
    const def = CHAIN3D[0];
    const F = new Vector3(...def.anchor!.position);
    const dStart = cameraPose(0, CHAIN3D, VP).pose.position.distanceTo(F);
    const dEnd = childRestInParent(def.anchor!, CHAIN3D[1], VP).position.distanceTo(F);
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9, 0.99]) {
      const d = cameraPose(t, CHAIN3D, VP).pose.position.distanceTo(F);
      expect(d).toBeLessThanOrEqual(dStart + 1e-9);
      expect(d).toBeGreaterThanOrEqual(dEnd - 1e-9);
    }
  });
});

describe('mount plan reducer', () => {
  const n = CHAIN3D.length;
  it('settled integers mount only the base', () => {
    for (let i = 0; i < n; i++) {
      const plan = nextMountPlan(null, i, n);
      expect(plan).toEqual({ base: i, child: null });
    }
  });

  it('mounts the child past the threshold with hysteresis on unmount', () => {
    let plan: MountPlan | null = nextMountPlan(null, 0, n);
    plan = nextMountPlan(plan, 0.01, n);
    expect(plan.child).toBeNull(); // below mount threshold
    plan = nextMountPlan(plan, 0.03, n);
    expect(plan.child).toBe(1); // mounted
    plan = nextMountPlan(plan, 0.01, n);
    expect(plan.child).toBe(1); // hysteresis: stays mounted
    plan = nextMountPlan(plan, 0.004, n);
    expect(plan.child).toBeNull(); // below release threshold
  });

  it('is referentially stable when nothing changes', () => {
    const a = nextMountPlan(null, 0.5, n);
    const b = nextMountPlan(a, 0.55, n);
    expect(b).toBe(a);
  });

  it('clamps out-of-range depths', () => {
    expect(nextMountPlan(null, -3, n).base).toBe(0);
    expect(nextMountPlan(null, 99, n).base).toBe(n - 1);
  });
});

describe('scale ribbon', () => {
  it('hits the authored exponents at integer depths and lerps between', () => {
    expect(scaleExponent(0, CHAIN3D)).toBeCloseTo(21, 6);
    expect(scaleExponent(5, CHAIN3D)).toBeCloseTo(Math.log10(0.316), 6);
    const mid = scaleExponent(0.5, CHAIN3D);
    expect(mid).toBeCloseTo((21 + 13) / 2, 6);
  });
});

describe('anchor sanity (registry)', () => {
  it('every non-terminal scene has an anchor with K in a sane range', () => {
    for (let i = 0; i < CHAIN3D.length - 1; i++) {
      const def = CHAIN3D[i];
      expect(def.anchor).toBeDefined();
      const apparent = CHAIN3D[i + 1].restPose.frameWidth * def.anchor!.scale;
      const K = def.restPose.frameWidth / apparent;
      expect(K).toBeGreaterThan(8);
      expect(K).toBeLessThan(32);
    }
  });
});
