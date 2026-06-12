import { ShaderMaterial, Uniform, Vector2 } from 'three';

/**
 * One fullscreen pass combining the three cheap cinematic tools:
 * - radial warp streaks (zoom blur toward screen center) for jumps + the flare hop
 * - luminance flare (white-out that covers the galaxy→solar scale cheat)
 * - tilt-shift (vertical gradient blur) for the diorama scenes
 * Kept as a single hand-rolled pass so we control cost: it collapses to a
 * plain copy when all uniforms are 0.
 */
export function makeCinematicMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      inputBuffer: new Uniform(null),
      uTexel: new Uniform(new Vector2(1 / 1280, 1 / 800)),
      uStreak: new Uniform(0),
      uFlare: new Uniform(0),
      uTilt: new Uniform(0),
      uFocusY: new Uniform(0.45),
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
      uniform vec2 uTexel;
      uniform float uStreak;
      uniform float uFlare;
      uniform float uTilt;
      uniform float uFocusY;
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

        if (uTilt > 0.001) {
          // tilt-shift: blur grows with distance from the focus band
          float d = abs(vUv.y - uFocusY);
          float blur = smoothstep(0.05, 0.5, d) * uTilt;
          if (blur > 0.01) {
            vec3 b = vec3(0.0);
            float r = blur * 10.0;
            b += texture2D(inputBuffer, vUv + vec2(0.0,  1.5) * uTexel * r).rgb;
            b += texture2D(inputBuffer, vUv + vec2(0.0, -1.5) * uTexel * r).rgb;
            b += texture2D(inputBuffer, vUv + vec2( 1.2,  0.8) * uTexel * r).rgb;
            b += texture2D(inputBuffer, vUv + vec2(-1.2,  0.8) * uTexel * r).rgb;
            b += texture2D(inputBuffer, vUv + vec2( 1.2, -0.8) * uTexel * r).rgb;
            b += texture2D(inputBuffer, vUv + vec2(-1.2, -0.8) * uTexel * r).rgb;
            color = mix(color, b / 6.0, clamp(blur * 1.2, 0.0, 0.85));
          }
        }

        color = mix(color, vec3(1.0), clamp(uFlare, 0.0, 1.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
}
