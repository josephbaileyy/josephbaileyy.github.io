import type { Group, Object3D, PerspectiveCamera } from 'three';

export type SceneId = 'galaxy' | 'solar' | 'earth' | 'stanford' | 'room' | 'screen';
export type QualityTier = 'high' | 'med' | 'low';

export type HotspotAction =
  | { type: 'panel'; panelId: string }
  | { type: 'zoom'; dir: 'in' | 'out' };

/**
 * The camera's settled framing for a scene, authored against a 16:10 reference
 * frame of width `frameWidth` (scene units) centered on `focus`. The actual
 * rest distance is derived per-frame from the live viewport. Most scenes use
 * cover-fit; wide layouts such as the galaxy can opt into contain-fit.
 */
export interface RestPose {
  focus: [number, number, number];
  /** direction from focus toward the camera (normalized at use) */
  dir: [number, number, number];
  frameWidth: number;
  /** vertical fov, degrees */
  fov: number;
  /** `contain` keeps every authored hotspot visible on narrow screens. */
  fit?: 'cover' | 'contain';
}

/** Where the child scene nests inside this one. scale = 1/K, K ≈ 12–25. */
export interface AnchorSpec {
  position: [number, number, number];
  /** default identity */
  quaternion?: [number, number, number, number];
  scale: number;
}

export type HopTreatment =
  | { kind: 'dive' }
  | { kind: 'flare' }
  | { kind: 'wipe'; occluderName: string };

export interface FrameCtx {
  dt: number;
  time: number;
  /**
   * Transition progress from this scene's perspective: 0 when settled as the
   * base, rising to 1 while diving into the child; negative (-1 → 0) while
   * this scene is the incoming child.
   */
  localT: number;
  camera: PerspectiveCamera;
  quality: QualityTier;
  reducedMotion: boolean;
  /** Selected astronomical time, independent of animation-frame time. */
  utcMs: number;
  viewport: { w: number; h: number };
}

export interface Hotspot3D {
  /** invisible enlarged hit mesh, raycast target */
  object: Object3D;
  label: string;
  action: HotspotAction;
  setHover(on: boolean): void;
}

export interface SceneInstance {
  group: Group;
  hotspots: Hotspot3D[];
  /** screen scene only: plane marking the monitor face for the DOM overlay */
  uiMount?: Object3D;
  /** cheap stand-in for the child scene, hidden while the real child is mounted */
  childProxy?: Object3D;
  /** Runtime anchor override for moving child targets such as Earth. */
  childAnchor?: AnchorSpec;
  update(ctx: FrameCtx): void;
  setQuality(q: QualityTier): void;
  dispose(): void;
}

export type SceneAssets = Record<string, unknown>;

export interface SceneModule {
  load?(onProgress?: (p: number) => void): Promise<SceneAssets>;
  create(assets: SceneAssets): SceneInstance;
}

export interface SceneDef3D {
  id: SceneId;
  label: string;
  /** physical width of the authored frame in meters — drives the scale ribbon */
  frameWidthMeters: number;
  restPose: RestPose;
  anchor?: AnchorSpec;
  /** treatment of the parent→this hop (default dive) */
  hopIn?: HopTreatment;
  /** tone-mapping exposure when settled here (lerped across hops) */
  exposure?: number;
  effects?: { bloom?: boolean; tiltShift?: boolean };
  /** Lazy code boundary for the scene and its optional asset loader. */
  importScene(): Promise<SceneModule>;
}
