import type { PerspectiveCamera, Scene, ShaderMaterial } from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ShaderPass } from 'postprocessing';
import { makeCinematicMaterial } from '../postfx/cinematic';
import type { Renderer3D } from './renderer';

export interface FxState {
  bloom: number; // 0..1 blend
  streak: number;
  flare: number;
  tilt: number;
}

/**
 * Post pipeline: RenderPass → EffectPass(Bloom) → ShaderPass(cinematic).
 * The LOW quality tier bypasses this entirely (Renderer3D.render direct).
 */
export class FxPipeline {
  private composer: EffectComposer;
  private bloom: BloomEffect;
  private cinematic: ShaderMaterial;

  constructor(r3d: Renderer3D, scene: Scene, camera: PerspectiveCamera) {
    this.composer = new EffectComposer(r3d.gl);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new BloomEffect({
      intensity: 1.1,
      luminanceThreshold: 0.32,
      luminanceSmoothing: 0.25,
      mipmapBlur: true,
    });
    this.composer.addPass(new EffectPass(camera, this.bloom));

    this.cinematic = makeCinematicMaterial();
    this.composer.addPass(new ShaderPass(this.cinematic, 'inputBuffer'));
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.cinematic.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  apply(fx: FxState): void {
    this.bloom.blendMode.opacity.value = fx.bloom;
    this.cinematic.uniforms.uStreak.value = fx.streak;
    this.cinematic.uniforms.uFlare.value = fx.flare;
    this.cinematic.uniforms.uTilt.value = fx.tilt;
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  dispose(): void {
    this.composer.dispose();
    this.cinematic.dispose();
  }
}
