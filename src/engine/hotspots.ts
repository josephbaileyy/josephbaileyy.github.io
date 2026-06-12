import { Box3, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { projectToPx, type Viewport } from './rig';
import type { Hotspot3D, SceneInstance } from './types3d';

const tmpBox = new Box3();
const tmpVec = new Vector3();
const tmpPx = new Vector3();

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
    for (const h of this.active.hotspots) {
      tmpBox.setFromObject(h.object);
      if (tmpBox.isEmpty()) continue;
      tmpBox.getCenter(tmpVec);
      const radius = tmpBox.getSize(new Vector3()).length() / 2;
      projectToPx(tmpVec, this.camera, this.vp, tmpPx);
      if (tmpPx.z > 1) continue; // behind camera

      // approximate screen radius: project a point one radius to the side
      const side = projectToPx(
        tmpVec.clone().add(new Vector3(radius, 0, 0).applyQuaternion(this.camera.quaternion)),
        this.camera,
        this.vp,
      );
      const rPx = Math.max(18, Math.hypot(side.x - tmpPx.x, side.y - tmpPx.y));

      const btn = document.createElement('button');
      btn.className = 'hotspot-proxy';
      btn.setAttribute('aria-label', h.label);
      btn.style.left = `${tmpPx.x - rPx}px`;
      btn.style.top = `${tmpPx.y - rPx}px`;
      btn.style.width = `${rPx * 2}px`;
      btn.style.height = `${rPx * 2}px`;
      btn.addEventListener('focus', () => h.setHover(true));
      btn.addEventListener('blur', () => h.setHover(false));
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onActivate(h);
      });
      this.a11yLayer.appendChild(btn);
      this.proxies.push(btn);
    }
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
