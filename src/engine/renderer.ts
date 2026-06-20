import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
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
      antialias: false,
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

  dispose(): void {
    this.gl.dispose();
  }
}
