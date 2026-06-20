import { ShaderMaterial, Uniform } from 'three';

/**
 * One fullscreen pass combining the three cheap cinematic tools:
 * - radial warp streaks (zoom blur toward screen center) for jumps + the flare hop
 * - luminance flare (white-out that covers the galaxy→solar scale cheat)
 * Kept as a single hand-rolled pass so we control cost: it collapses to a
 * plain copy when all uniforms are 0.
 */
export function makeCinematicMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      inputBuffer: new Uniform(null),
      uStreak: new Uniform(0),
      uFlare: new Uniform(0),
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D inputBuffer;
      uniform float uStreak;
      uniform float uFlare;
      varying vec2 vUv;

      void main() {
        vec3 color;

        if (uStreak > 0.001) {
          // zoom blur: accumulate taps sliding toward screen center
          vec2 toCenter = vec2(0.5) - vUv;
          vec3 acc = vec3(0.0);
          float wsum = 0.0;
          for (int i = 0; i < 14; i++) {
            float s = float(i) / 13.0;
            float w = 1.0 - s * 0.85;
            acc += texture2D(inputBuffer, vUv + toCenter * s * 0.35 * uStreak).rgb * w;
            wsum += w;
          }
          vec3 streaked = acc / wsum;
          color = mix(texture2D(inputBuffer, vUv).rgb, streaked, clamp(uStreak * 1.4, 0.0, 1.0));
        } else {
          color = texture2D(inputBuffer, vUv).rgb;
        }

        color = mix(color, vec3(1.0), clamp(uFlare, 0.0, 1.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
}
