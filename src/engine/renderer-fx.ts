import type { PerspectiveCamera, Scene, ShaderMaterial } from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ShaderPass } from 'postprocessing';
import { makeCinematicMaterial } from '../postfx/cinematic';
import type { Renderer3D } from './renderer';

export interface FxState {
  bloom: number; // 0..1 blend
  streak: number;
  flare: number;
}

export interface FxOptions {
  soft?: boolean;
}

/**
 * Post pipeline: RenderPass → EffectPass(Bloom) → ShaderPass(cinematic).
 * The LOW quality tier bypasses this entirely (Renderer3D.render direct).
 */
export class FxPipeline {
  private composer: EffectComposer;
  private bloom: BloomEffect;
  private cinematic: ShaderMaterial;

  constructor(
    r3d: Renderer3D,
    scene: Scene,
    camera: PerspectiveCamera,
    private options: FxOptions = {},
  ) {
    // WebGL2 is guaranteed by the entry gate, so multisampled render targets
    // are available: 4× MSAA on full quality, 2× on softened (WebKit/mobile)
    // profiles. Without this, geometry edges alias badly whenever the DPR cap
    // drops below the display's native ratio.
    this.composer = new EffectComposer(r3d.gl, { multisampling: options.soft ? 2 : 4 });
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new BloomEffect({
      intensity: options.soft ? 0.45 : 1.1,
      luminanceThreshold: options.soft ? 0.42 : 0.32,
      luminanceSmoothing: options.soft ? 0.18 : 0.25,
      mipmapBlur: !options.soft,
    });
    this.composer.addPass(new EffectPass(camera, this.bloom));

    this.cinematic = makeCinematicMaterial();
    this.composer.addPass(new ShaderPass(this.cinematic, 'inputBuffer'));
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
  }

  apply(fx: FxState): void {
    const softness = this.options.soft ? 0.55 : 1;
    this.bloom.blendMode.opacity.value = fx.bloom * softness;
    this.cinematic.uniforms.uStreak.value = fx.streak * softness;
    this.cinematic.uniforms.uFlare.value = fx.flare;
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  dispose(): void {
    this.composer.dispose();
    this.cinematic.dispose();
  }
}
