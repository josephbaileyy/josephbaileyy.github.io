import { DESIGN_W, DESIGN_H, type LayerTransform, type Rect, type SceneMeta, type Size } from './types';

/**
 * The whole camera is one number: depth d in [0, n-1]. floor(d) is the parent
 * scene, frac(d) is transition progress into its child. Every layer transform
 * is recomputed fresh from d each frame, so per-scene scale never leaves
 * [1/K, K] and floating point stays healthy no matter how deep the chain goes.
 */

/** Cover-fit scale: design viewBox fills the viewport with no letterbox. */
export function restScale(vp: Size): number {
  return Math.max(vp.w / DESIGN_W, vp.h / DESIGN_H);
}

function restMatrix(vp: Size): [number, number, number, number, number, number] {
  const s = restScale(vp);
  return [s, 0, 0, s, vp.w / 2 - (DESIGN_W / 2) * s, vp.h / 2 - (DESIGN_H / 2) * s];
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function anchorZoomRatio(anchor: Rect): number {
  return DESIGN_W / anchor.w;
}

export function computeLayers(depth: number, metas: SceneMeta[], vp: Size): LayerTransform[] {
  const n = metas.length;
  const d = Math.min(Math.max(depth, 0), n - 1);
  let i = Math.floor(d);
  if (i >= n - 1) i = n - 1;
  const t = d - i;

  const out: LayerTransform[] = metas.map((_, index) => ({
    index,
    visible: false,
    matrix: [1, 0, 0, 1, 0, 0],
    opacity: 1,
  }));

  if (t < 1e-6) {
    const layer = out[i];
    layer.visible = true;
    layer.matrix = restMatrix(vp);
    return out;
  }

  const anchor = metas[i].anchor;
  if (!anchor) throw new Error(`scene ${i} has no child anchor but depth=${depth}`);

  const fit = restScale(vp);
  const K = anchorZoomRatio(anchor);
  const sp = fit * Math.pow(K, t);

  // Camera center in parent design coords: chosen so the anchor center's
  // *screen* position glides linearly from its rest position to viewport
  // center while scale grows geometrically. c(0)=scene center, c(1)=anchor center.
  const c0x = DESIGN_W / 2;
  const c0y = DESIGN_H / 2;
  const cax = anchor.x + anchor.w / 2;
  const cay = anchor.y + anchor.h / 2;
  const k = (1 - t) * Math.pow(K, -t);
  const cx = cax - (cax - c0x) * k;
  const cy = cay - (cay - c0y) * k;

  const vcx = vp.w / 2;
  const vcy = vp.h / 2;

  const parent = out[i];
  parent.visible = true;
  parent.matrix = [sp, 0, 0, sp, vcx - cx * sp, vcy - cy * sp];
  parent.opacity = t < 0.9 ? 1 : 1 - (t - 0.9) / 0.1;

  // Child: its full design viewBox mapped onto the parent's anchor rect.
  // At t=1 this reduces exactly to the child's rest matrix — seamless handoff.
  const sc = sp / K;
  const child = out[i + 1];
  child.visible = t >= 0.3;
  child.matrix = [sc, 0, 0, sc, vcx + (anchor.x - cx) * sp, vcy + (anchor.y - cy) * sp];
  child.opacity = smoothstep(0.45, 0.85, t);

  return out;
}

/** Map a rect in a settled scene's design coords to viewport pixels. */
export function designRectToScreen(rect: Rect, vp: Size): Rect {
  const [a, , , , e, f] = restMatrix(vp);
  return { x: rect.x * a + e, y: rect.y * a + f, w: rect.w * a, h: rect.h * a };
}
