export const compositeVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const compositeFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uBase;
  uniform sampler2D uDetail;
  uniform vec2 uLens;
  uniform float uRadius;
  uniform float uPixelRatio;
  varying vec2 vUv;

  float circleSdf(vec2 point, vec2 center, float radius) {
    return length(point - center) - radius;
  }

  void main() {
    vec2 delta = vUv - uLens;
    float distanceFromRim = circleSdf(vUv, uLens, uRadius);
    float aa = max(fwidth(distanceFromRim), 0.0012 / max(uPixelRatio, 1.0));
    float inside = 1.0 - smoothstep(-aa, aa, distanceFromRim);

    vec2 direction = normalize(delta + vec2(0.00001));
    float rimBand = exp(-pow(abs(distanceFromRim) / 0.018, 2.0));
    float interiorDepth = smoothstep(0.0, -0.055, distanceFromRim);
    vec2 refractedUv = vUv - direction * (0.0045 * rimBand + 0.002 * interiorDepth);

    float dispersion = 0.0024 * rimBand;
    vec3 detail;
    detail.r = texture2D(uDetail, refractedUv + direction * dispersion).r;
    detail.g = texture2D(uDetail, refractedUv).g;
    detail.b = texture2D(uDetail, refractedUv - direction * dispersion).b;

    vec3 base = texture2D(uBase, vUv).rgb;
    vec3 color = mix(base, detail, inside);

    float outerHighlight = exp(-pow((distanceFromRim - 0.004) / 0.005, 2.0));
    float innerShadow = exp(-pow((distanceFromRim + 0.008) / 0.009, 2.0));
    float lowerShade = smoothstep(-0.4, 0.55, -direction.y);
    float upperGlint = smoothstep(0.1, 0.95, direction.y);

    color += vec3(0.72, 0.86, 1.0) * outerHighlight * (0.13 + upperGlint * 0.19);
    color -= vec3(0.025, 0.035, 0.055) * innerShadow * (0.32 + lowerShade * 0.24);

    float glassWash = inside * (1.0 - smoothstep(-0.03, -0.16, distanceFromRim));
    color += vec3(0.025, 0.045, 0.07) * glassWash;

    gl_FragColor = vec4(color, 1.0);
  }
`;
