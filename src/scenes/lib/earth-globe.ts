import { ShaderMaterial, Texture, Uniform, Vector3 } from 'three';

/** Shared Earth surface so the solar proxy and full Earth scene meet cleanly. */
export function earthGlobeMaterial(
  day: Texture,
  night: Texture,
  sunDirection: Uniform<Vector3>,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      dayMap: new Uniform(day),
      nightMap: new Uniform(night),
      uSunDir: sunDirection,
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform vec3 uSunDir;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      void main() {
        vec3 n = normalize(vNormal);
        float dayness = dot(n, uSunDir);
        vec3 dayTex = texture2D(dayMap, vUv).rgb;
        vec3 color = dayTex * (0.12 + 1.05 * max(dayness, 0.0));

        float nightK = pow(smoothstep(0.08, -0.18, dayness), 1.3);
        vec3 nightTex = texture2D(nightMap, vUv).rgb;
        vec3 cityGlow = max(nightTex - vec3(0.06), 0.0) * 2.4;
        color += cityGlow * nightK;

        float band = exp(-pow(dayness / 0.09, 2.0));
        color += vec3(0.85, 0.38, 0.16) * band * 0.16;

        float water = smoothstep(0.02, 0.18, dayTex.b - max(dayTex.r, dayTex.g) + 0.05);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 h = normalize(uSunDir + viewDir);
        float spec = pow(max(dot(n, h), 0.0), 90.0) * water * max(dayness, 0.0);
        color += vec3(1.0, 0.95, 0.82) * spec * 0.9;

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
