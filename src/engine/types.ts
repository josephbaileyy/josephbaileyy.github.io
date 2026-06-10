export const DESIGN_W = 1600;
export const DESIGN_H = 1000;

export type SceneId = 'galaxy' | 'solar' | 'earth' | 'stanford' | 'room' | 'screen';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

export type HotspotAction =
  | { type: 'panel'; panelId: string }
  | { type: 'zoom'; dir: 'in' | 'out' };

export interface HotspotDef {
  elementId: string;
  label: string;
  action: HotspotAction;
}

export interface SceneDef {
  id: SceneId;
  label: string;
  svg: string;
  /** id of a 16:10 <rect> inside the SVG marking where the next scene lives */
  childAnchorId?: string;
  hotspots: HotspotDef[];
}

export interface SceneMeta {
  anchor?: Rect;
}

export interface LayerTransform {
  index: number;
  visible: boolean;
  /** CSS matrix(a, b, c, d, e, f) mapping design px -> viewport px */
  matrix: [number, number, number, number, number, number];
  opacity: number;
}
