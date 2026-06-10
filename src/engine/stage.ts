import { computeLayers } from './transforms';
import type { HotspotDef, Rect, SceneDef, SceneMeta, Size } from './types';

export interface MountedScene {
  def: SceneDef;
  layer: HTMLDivElement;
  svg: SVGSVGElement;
  anchor?: Rect;
}

export type HotspotHandler = (sceneIndex: number, hotspot: HotspotDef) => void;

export class Stage {
  readonly scenes: MountedScene[] = [];
  private metas: SceneMeta[] = [];
  private lastApplied: string[] = [];

  constructor(
    private root: HTMLElement,
    defs: SceneDef[],
    onHotspot: HotspotHandler,
  ) {
    defs.forEach((def, index) => {
      const layer = document.createElement('div');
      layer.className = 'scene-layer';
      layer.dataset.scene = def.id;
      layer.innerHTML = def.svg;
      layer.style.display = 'none';

      const svg = layer.querySelector('svg');
      if (!svg) throw new Error(`scene ${def.id}: no <svg> root`);

      let anchor: Rect | undefined;
      if (def.childAnchorId) {
        const el = svg.querySelector<SVGRectElement>(`#${def.childAnchorId}`);
        if (!el) throw new Error(`scene ${def.id}: anchor #${def.childAnchorId} not found`);
        anchor = {
          x: Number(el.getAttribute('x')),
          y: Number(el.getAttribute('y')),
          w: Number(el.getAttribute('width')),
          h: Number(el.getAttribute('height')),
        };
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', 'none');
      }

      for (const h of def.hotspots) {
        const el = svg.querySelector<SVGGraphicsElement>(`#${h.elementId}`);
        if (!el) throw new Error(`scene ${def.id}: hotspot #${h.elementId} not found`);
        el.classList.add('hotspot');
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', h.label);
        const activate = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          onHotspot(index, h);
        };
        el.addEventListener('click', activate);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') activate(e);
        });
      }

      this.root.appendChild(layer);
      this.scenes.push({ def, layer, svg, anchor });
      this.metas.push({ anchor });
      this.lastApplied.push('');
    });
  }

  render(depth: number, vp: Size): void {
    const layers = computeLayers(depth, this.metas, vp);
    for (const lt of layers) {
      const scene = this.scenes[lt.index];
      if (!lt.visible) {
        if (this.lastApplied[lt.index] !== 'hidden') {
          scene.layer.style.display = 'none';
          scene.layer.classList.remove('active');
          this.lastApplied[lt.index] = 'hidden';
        }
        continue;
      }
      const [a, b, c, d, e, f] = lt.matrix;
      const key = `${a.toFixed(5)},${e.toFixed(2)},${f.toFixed(2)},${lt.opacity.toFixed(3)}`;
      if (this.lastApplied[lt.index] === key) continue;
      scene.layer.style.display = 'block';
      scene.layer.classList.add('active');
      scene.layer.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
      scene.layer.style.opacity = String(lt.opacity);
      this.lastApplied[lt.index] = key;
    }
  }
}
