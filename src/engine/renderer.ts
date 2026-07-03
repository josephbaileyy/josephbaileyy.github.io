import {
  ACESFilmicToneMapping,
  Light,
  Material,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from 'three';

export function webgl2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

/**
 * Thin wrapper around WebGLRenderer. The post-processing composer (bloom,
 * bloom and warp) wraps this in renderer-fx.ts; this class stays the
 * minimal direct path (also used outright in the LOW quality tier).
 */
export class Renderer3D {
  readonly gl: WebGLRenderer;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new WebGLRenderer({
      canvas,
      // MSAA on the default framebuffer covers the direct path (LOW tier and
      // post-fx-disabled devices). The composer path gets its own multisampled
      // render targets in renderer-fx.ts. Nearly free on tiled mobile GPUs.
      antialias: true,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.gl.outputColorSpace = SRGBColorSpace;
    this.gl.toneMapping = ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = PCFShadowMap;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.gl.setPixelRatio(this.dpr);
  }

  setExposure(e: number): void {
    if (this.gl.toneMappingExposure !== e) this.gl.toneMappingExposure = e;
  }

  setPixelRatio(dpr: number): void {
    if (dpr !== this.dpr) {
      this.dpr = dpr;
      this.gl.setPixelRatio(dpr);
    }
  }

  resize(w: number, h: number): void {
    this.gl.setSize(w, h, false);
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    this.gl.render(scene, camera);
  }

  /**
   * Upload a destination's textures and compile its material programs before
   * camera motion exposes it. Work is split across animation frames so several
   * texture uploads cannot combine into one long main-thread task.
   */
  async prepare(group: Object3D, camera: PerspectiveCamera): Promise<void> {
    const textures = new Set<Texture>();
    group.traverse((object) => {
      const materials = (object as Object3D & { material?: unknown }).material;
      for (const material of Array.isArray(materials) ? materials : [materials]) {
        if (!material || typeof material !== 'object') continue;
        for (const value of Object.values(material)) {
          if (value instanceof Texture) textures.add(value);
        }
        const uniforms = (material as { uniforms?: Record<string, { value?: unknown }> }).uniforms;
        for (const uniform of Object.values(uniforms ?? {})) {
          if (uniform.value instanceof Texture) textures.add(uniform.value);
        }
      }
    });
    for (const texture of textures) {
      this.gl.initTexture(texture);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    const lights: Light[] = [];
    const renderables = new Map<string, Object3D>();
    group.traverseVisible((object) => {
      if (object instanceof Light) {
        lights.push(object.clone());
        return;
      }
      const materials = (object as Object3D & { material?: Material | Material[] }).material;
      for (const material of Array.isArray(materials) ? materials : [materials]) {
        if (!material) continue;
        const geometry = (object as Object3D & { geometry?: { attributes?: object } }).geometry;
        const attributes = Object.keys(geometry?.attributes ?? {})
          .sort()
          .join(',');
        const key = `${material.uuid}:${object.type}:${attributes}`;
        if (!renderables.has(key)) renderables.set(key, object);
      }
    });

    const objects = [...renderables.values()];
    const batchSize = 6;
    for (let start = 0; start < objects.length; start += batchSize) {
      const preparationScene = new Scene();
      preparationScene.add(...lights.map((light) => light.clone()));
      const batch = objects.slice(start, start + batchSize).map((object) => object.clone(false));
      preparationScene.add(...batch);
      await this.gl.compileAsync(preparationScene, camera);
      preparationScene.clear();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  dispose(): void {
    this.gl.dispose();
  }
}
