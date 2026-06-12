import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Uniform,
} from 'three';
import type { SceneAssets, SceneInstance } from '../engine/types3d';

/**
 * The final scene: the monitor face, full frame. The animated wallpaper runs
 * in GL; the actual interface is the DOM fake OS that docks over `uiMount`.
 */
export function createScreen(_assets: SceneAssets): SceneInstance {
  const group = new Group();

  const bezel = new Mesh(
    new BoxGeometry(17.4, 11.2, 0.6),
    new MeshBasicMaterial({ color: 0x100e24 }),
  );
  bezel.position.z = -0.32;
  group.add(bezel);

  const wallpaper = new ShaderMaterial({
    uniforms: { uTime: new Uniform(0) },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 base = mix(vec3(0.05, 0.066, 0.19), vec3(0.145, 0.106, 0.306), vUv.y);
        // the binary motif: two orbiting glows + a faint trailing arc
        float a = uTime * 0.78;
        vec2 c = vec2(0.5, 0.52);
        vec2 p1 = c + vec2(0.21 * cos(a), 0.15 * sin(a));
        vec2 p2 = c - vec2(0.115 * cos(a), 0.082 * sin(a));
        base += vec3(0.5, 0.83, 1.0) * 0.4 * exp(-90.0 * dot(vUv - p1, vUv - p1));
        base += vec3(1.0, 0.83, 0.47) * 0.36 * exp(-130.0 * dot(vUv - p2, vUv - p2));
        float ring = abs(length((vUv - c) * vec2(1.0, 1.4)) - 0.21);
        base += vec3(0.35, 0.45, 0.8) * 0.12 * smoothstep(0.012, 0.0, ring);
        // film grain + glass sheen
        base += (hash(vUv * 800.0 + uTime) - 0.5) * 0.025;
        base += vec3(0.9, 0.95, 1.0) * 0.05 * pow(1.0 - abs(vUv.y - 0.85), 8.0);
        gl_FragColor = vec4(base, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const face = new Mesh(new PlaneGeometry(16, 10), wallpaper);
  group.add(face);

  const uiMount = new Object3D();
  uiMount.position.set(0, -0.1, 0.02);
  uiMount.userData.w = 14.4;
  uiMount.userData.h = 8.6;
  group.add(uiMount);

  return {
    group,
    hotspots: [],
    uiMount,
    update(ctx) {
      wallpaper.uniforms.uTime.value = ctx.time;
    },
    setQuality() {},
    dispose() {
      bezel.geometry.dispose();
      (bezel.material as MeshBasicMaterial).dispose();
      face.geometry.dispose();
      wallpaper.dispose();
    },
  };
}
