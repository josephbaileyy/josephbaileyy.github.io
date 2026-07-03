import { Box3, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { projectToPx, type Viewport } from './rig';
import type { Hotspot3D, SceneInstance } from './types3d';

const tmpBox = new Box3();
const tmpVec = new Vector3();
const tmpPx = new Vector3();
const tmpSide = new Vector3();

export const HOTSPOT_PROXY_MIN_PX = 44;
export const HOTSPOT_PROXY_MAX_PX = 88;
const HOTSPOT_PROXY_GAP_PX = 4;

export interface HotspotProxyCandidate {
  x: number;
  y: number;
  projectedSize: number;
}

export interface HotspotProxyRect {
  left: number;
  top: number;
  size: number;
}

export function clampHotspotProxySize(projectedSize: number): number {
  if (!Number.isFinite(projectedSize)) return HOTSPOT_PROXY_MIN_PX;
  return Math.min(HOTSPOT_PROXY_MAX_PX, Math.max(HOTSPOT_PROXY_MIN_PX, Math.abs(projectedSize)));
}

export function layoutHotspotProxyRects(
  candidates: readonly HotspotProxyCandidate[],
  viewport: Viewport,
): HotspotProxyRect[] {
  const placed: Array<HotspotProxyRect & { cx: number; cy: number }> = [];
  for (const candidate of candidates) {
    const size = clampHotspotProxySize(candidate.projectedSize);
    const base = clampCenter(candidate.x, candidate.y, size, viewport);
    const center = firstNonOverlappingCenter(base, size, placed, viewport);
    placed.push({
      left: center.x - size / 2,
      top: center.y - size / 2,
      size,
      cx: center.x,
      cy: center.y,
    });
  }
  return placed.map(({ left, top, size }) => ({ left, top, size }));
}

/**
 * Pointer picking + keyboard accessibility for 3D hotspots.
 * Active only while the camera is settled on a scene (mid-flight clicks were
 * never meaningful). On settle, each hotspot also gets a transparent DOM
 * proxy <button> so Tab/Enter and screen readers work exactly like the 2D site.
 */
export class HotspotManager {
  private raycaster = new Raycaster();
  private pointer = new Vector2(2, 2); // offscreen until first move
  private pointerFresh = false;
  private hovered: Hotspot3D | null = null;
  private active: SceneInstance | null = null;
  private proxies: HTMLButtonElement[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private a11yLayer: HTMLElement,
    private camera: PerspectiveCamera,
    private vp: Viewport,
    private onActivate: (h: Hotspot3D) => void,
  ) {
    canvas.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / vp.w) * 2 - 1, -(e.clientY / vp.h) * 2 + 1);
      this.pointerFresh = true;
    });
    canvas.addEventListener('click', () => {
      if (this.hovered) this.onActivate(this.hovered);
    });
  }

  /** Call on settle (instance) / unsettle (null). */
  setActive(instance: SceneInstance | null): void {
    if (instance === this.active) return;
    this.active = instance;
    this.setHovered(null);
    this.rebuildProxies();
  }

  rebuildProxies(): void {
    for (const p of this.proxies) p.remove();
    this.proxies = [];
    if (!this.active) return;

    this.camera.updateMatrixWorld();
    const hotspotData: Array<{ h: Hotspot3D; candidate: HotspotProxyCandidate }> = [];
    for (const h of this.active.hotspots) {
      tmpBox.setFromObject(h.object);
      if (tmpBox.isEmpty()) continue;
      h.object.getWorldPosition(tmpVec);
      const radius = tmpBox.getSize(new Vector3()).length() / 2;
      projectToPx(tmpVec, this.camera, this.vp, tmpPx);
      if (tmpPx.z > 1) continue; // behind camera

      // Approximate visual scale only as an input to the clamp. The final DOM
      // target stays in a practical touch range, independent of object size.
      tmpSide.set(radius, 0, 0).applyQuaternion(this.camera.quaternion).add(tmpVec);
      const side = projectToPx(tmpSide, this.camera, this.vp);
      const projectedSize = Math.hypot(side.x - tmpPx.x, side.y - tmpPx.y) * 2;
      hotspotData.push({ h, candidate: { x: tmpPx.x, y: tmpPx.y, projectedSize } });
    }

    const rects = layoutHotspotProxyRects(
      hotspotData.map(({ candidate }) => candidate),
      this.vp,
    );

    hotspotData.forEach(({ h }, index) => {
      const rect = rects[index];
      const btn = document.createElement('button');
      btn.className = 'hotspot-proxy';
      btn.setAttribute('aria-label', h.label);
      btn.dataset.hotspotLabel = h.label;
      btn.style.left = `${rect.left}px`;
      btn.style.top = `${rect.top}px`;
      btn.style.width = `${rect.size}px`;
      btn.style.height = `${rect.size}px`;
      btn.addEventListener('focus', () => h.setHover(true));
      btn.addEventListener('blur', () => h.setHover(false));
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onActivate(h);
      });
      this.a11yLayer.appendChild(btn);
      this.proxies.push(btn);
    });
  }

  /** Per-frame mouse hover via raycast (no-op when unsettled or pointer idle). */
  update(): void {
    if (!this.active || !this.pointerFresh) return;
    this.pointerFresh = false;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objects = this.active.hotspots.map((h) => h.object);
    const hits = this.raycaster.intersectObjects(objects, true);
    let hit: Hotspot3D | null = null;
    if (hits.length > 0) {
      const obj = hits[0].object;
      hit =
        this.active.hotspots.find(
          (h) => h.object === obj || (h.object.children.length > 0 && isDescendant(h.object, obj)),
        ) ?? null;
    }
    this.setHovered(hit);
  }

  private setHovered(h: Hotspot3D | null): void {
    if (h === this.hovered) return;
    this.hovered?.setHover(false);
    this.hovered = h;
    this.hovered?.setHover(true);
    this.canvas.style.cursor = h ? 'pointer' : 'grab';
  }
}

function isDescendant(parent: { children: unknown[] }, child: { parent: unknown }): boolean {
  let p = child.parent;
  while (p) {
    if (p === parent) return true;
    p = (p as { parent: unknown }).parent;
  }
  return false;
}

function clampCenter(
  x: number,
  y: number,
  size: number,
  viewport: Viewport,
): { x: number; y: number } {
  const half = size / 2;
  return {
    x: Math.min(Math.max(x, half), Math.max(half, viewport.w - half)),
    y: Math.min(Math.max(y, half), Math.max(half, viewport.h - half)),
  };
}

function firstNonOverlappingCenter(
  base: { x: number; y: number },
  size: number,
  placed: ReadonlyArray<{ left: number; top: number; size: number; cx: number; cy: number }>,
  viewport: Viewport,
): { x: number; y: number } {
  if (!overlapsAny(base, size, placed)) return base;

  const step = size + HOTSPOT_PROXY_GAP_PX;
  const angleOffset = placed.length * 0.73;
  for (let ring = 1; ring <= 6; ring++) {
    const radius = step * ring;
    const points = Math.max(8, ring * 8);
    for (let point = 0; point < points; point++) {
      const angle = angleOffset + (point / points) * Math.PI * 2;
      const center = clampCenter(
        base.x + Math.cos(angle) * radius,
        base.y + Math.sin(angle) * radius,
        size,
        viewport,
      );
      if (!overlapsAny(center, size, placed)) return center;
    }
  }
  return base;
}

function overlapsAny(
  center: { x: number; y: number },
  size: number,
  placed: ReadonlyArray<{ left: number; top: number; size: number }>,
): boolean {
  const half = size / 2;
  const rect = {
    left: center.x - half,
    top: center.y - half,
    right: center.x + half,
    bottom: center.y + half,
  };
  return placed.some((other) => {
    const gap = HOTSPOT_PROXY_GAP_PX;
    return (
      rect.left < other.left + other.size + gap &&
      rect.right > other.left - gap &&
      rect.top < other.top + other.size + gap &&
      rect.bottom > other.top - gap
    );
  });
}
