export const FULLSCREEN_VERTEX = `#version 300 es
precision highp float;

const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

out vec2 vUv;

void main() {
  vec2 position = POSITIONS[gl_VertexID];
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const HOME_FUNCTION = `
float hash12(vec2 value) {
  vec3 p = fract(vec3(value.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33 + uSeed * 0.000001);
  return fract((p.x + p.y) * p.z);
}

vec4 homePosition(vec2 uv) {
  vec2 sourceUv = vec2(uv.x, 1.0 - uv.y);
  float matte = texture(uMatte, sourceUv).r;
  float depth = texture(uDepth, sourceUv).r;

  // Depth Anything reads the dark fold below the chin as near. Confine and
  // soften that spike so the neck closes into the torso instead of bulging.
  vec2 chinDelta = (uv - vec2(0.50, 0.385)) / vec2(0.24, 0.115);
  float chinMask = exp(-dot(chinDelta, chinDelta) * 1.7);
  depth = mix(depth, min(depth, 0.61), chinMask * 0.82);
  depth = smoothstep(0.04, 0.96, depth);

  vec2 cell = floor(uv * uTextureSize);
  vec2 jitter = vec2(hash12(cell + 7.1), hash12(cell + 31.7)) - 0.5;
  vec2 xy = (uv - 0.5) * 1.88 + jitter / uTextureSize * 0.78;
  float z = (depth - 0.52) * 0.46;
  return vec4(xy, z, smoothstep(0.035, 0.32, matte));
}`;

export const INITIALIZE_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D uDepth;
uniform sampler2D uMatte;
uniform float uSeed;
uniform float uTextureSize;

in vec2 vUv;
layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outVelocity;

${HOME_FUNCTION}

void main() {
  outPosition = homePosition(vUv);
  outVelocity = vec4(0.0);
}`;

export const SIMULATION_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D uPosition;
uniform sampler2D uVelocity;
uniform sampler2D uDepth;
uniform sampler2D uMatte;
uniform float uSeed;
uniform float uTextureSize;
uniform float uStep;
uniform float uDelta;
uniform vec4 uPointer;
uniform vec3 uPointerMotion;
uniform vec4 uImpulse;
uniform int uMode;

in vec2 vUv;
layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outVelocity;

${HOME_FUNCTION}

void main() {
  vec4 positionSample = texture(uPosition, vUv);
  vec3 position = positionSample.xyz;
  vec4 velocitySample = texture(uVelocity, vUv);
  vec3 velocity = velocitySample.xyz;
  float pointerWake = velocitySample.w * exp(-uDelta * 0.18);
  vec4 home = homePosition(vUv);

  vec3 acceleration = (home.xyz - position) * 7.6 - velocity * 3.35;

  float phase = uStep * 0.018 + home.x * 7.1 + home.y * 5.3 + uSeed * 0.001;
  float breath = sin(phase) * cos(phase * 0.613 + home.y * 4.0);
  acceleration.z += breath * 0.021 * home.w;
  acceleration.xy += vec2(cos(phase * 0.77), sin(phase * 0.91)) * 0.0028 * home.w;

  if (uPointerMotion.z > 0.0001) {
    vec2 pointerXY = (uPointer.xy - 0.5) * 1.88;
    vec2 previousPointerXY = (uPointer.zw - 0.5) * 1.88;
    vec2 segment = pointerXY - previousPointerXY;
    float segmentLengthSquared = max(0.000001, dot(segment, segment));
    float along = clamp(
      dot(position.xy - previousPointerXY, segment) / segmentLengthSquared,
      0.0,
      1.0
    );
    vec2 closest = previousPointerXY + segment * along;
    vec2 delta = position.xy - closest;
    vec2 strokeVelocity = uPointerMotion.xy * 1.88;
    float speed = length(uPointerMotion.xy);
    float speedGain = 0.58 + smoothstep(0.0, 2.6, speed) * 1.18;
    float force = exp(-dot(delta, delta) / 0.050) * uPointerMotion.z * home.w;
    float scatterAngle = hash12(floor(vUv * uTextureSize) + 93.7) * 6.2831853;
    vec2 scatter = vec2(cos(scatterAngle), sin(scatterAngle)) * 0.018;
    vec2 outward = normalize(delta + scatter);
    vec2 strokeDirection = normalize(strokeVelocity + vec2(0.0001));
    acceleration.xy +=
      (outward * 27.0 + strokeDirection * (13.0 + speed * 5.5)) * force * speedGain;
    acceleration.z -= (38.0 + speed * 8.5) * force * speedGain;
    pointerWake = max(pointerWake, step(0.002, force));
  }

  if (pointerWake > 0.001) {
    // The touched region has a temporarily stronger, under-damped tether. This
    // closes a broad wake promptly without changing the untouched living field.
    float recoveryScale = uPointerMotion.z > 0.0001 ? 0.45 : 1.0;
    acceleration += (home.xyz - position) * 34.0 * pointerWake * recoveryScale;
    acceleration -= velocity * 8.5 * pointerWake * recoveryScale;
  }

  if (uMode > 0 && uImpulse.w > 0.0) {
    vec2 impulseXY = (uImpulse.xy - 0.5) * 1.88;
    vec2 delta = position.xy - impulseXY;
    float radius = max(0.018, uImpulse.w);
    float wave = exp(-dot(delta, delta) / radius) * home.w;
    vec2 direction = normalize(delta + vec2(0.0001));
    float modeSign = uMode == 2 ? -1.0 : 1.0;
    acceleration.xy += direction * wave * uImpulse.z * (uMode == 2 ? 4.1 : 2.4);
    acceleration.z += wave * uImpulse.z * (3.0 + float(uMode) * 0.42) * modeSign;
  }

  velocity += acceleration * uDelta;
  velocity *= 0.992;
  if (pointerWake > 0.001) {
    float speedLimit = 0.9 + pointerWake * 0.55;
    float velocityLength = length(velocity);
    if (velocityLength > speedLimit) {
      velocity *= speedLimit / velocityLength;
    }
  }
  position += velocity * uDelta;
  if (pointerWake > 0.001) {
    float closeRate = uPointerMotion.z > 0.0001 ? 1.2 : 4.2;
    float closeAmount = 1.0 - exp(-uDelta * closeRate * pointerWake);
    position = mix(position, home.xyz, closeAmount);
    vec3 displacement = position - home.xyz;
    float displacementLength = length(displacement);
    if (displacementLength > 0.36) {
      position = home.xyz + displacement * (0.36 / displacementLength);
    }
    if (length(position - home.xyz) < 0.0015 && length(velocity) < 0.008) {
      pointerWake = 0.0;
    }
  }

  outPosition = vec4(position, home.w);
  outVelocity = vec4(velocity, pointerWake);
}`;

export const POINT_VERTEX = `#version 300 es
precision highp float;

uniform sampler2D uPosition;
uniform float uTextureSize;
uniform float uPixelRatio;
uniform float uPointScale;
uniform vec2 uFit;
uniform float uResolve;

out vec2 vSourceUv;
out float vDepth;
out float vEligibility;

void main() {
  int size = int(uTextureSize);
  ivec2 coordinate = ivec2(gl_VertexID % size, gl_VertexID / size);
  vec4 position = texelFetch(uPosition, coordinate, 0);
  vSourceUv = (vec2(coordinate) + 0.5) / uTextureSize;
  vDepth = position.z;
  vEligibility = position.w;

  float perspective = 1.0 + position.z * 0.14;
  gl_Position = vec4(position.xy * perspective * uFit, position.z * 0.25, 1.0);
  float coverageFill = 0.96;
  gl_PointSize = (uPointScale + coverageFill) * uPixelRatio * (1.0 + position.z * 0.55);
}`;

export const POINT_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D uColour;
uniform vec3 uVoid;
uniform vec3 uCharge;
uniform vec3 uHeavy;
uniform vec3 uMid;
uniform vec3 uLight;
uniform float uResolve;

in vec2 vSourceUv;
in float vDepth;
in float vEligibility;
out vec4 outColour;

void main() {
  vec2 point = gl_PointCoord - 0.5;
  float disc = smoothstep(0.52, 0.18, length(point));
  vec3 photo = texture(uColour, vec2(vSourceUv.x, 1.0 - vSourceUv.y)).rgb;
  float luminance = dot(photo, vec3(0.2126, 0.7152, 0.0722));
  float warmth = smoothstep(0.02, 0.38, photo.r - photo.b);
  vec3 coolField = mix(uHeavy, uCharge, smoothstep(0.12, 0.92, luminance));
  vec3 warmField = mix(uLight, uMid, smoothstep(0.24, 0.78, luminance));
  vec3 palette = mix(coolField, warmField, warmth * 0.46);
  float paletteLuminance = dot(palette, vec3(0.2126, 0.7152, 0.0722));
  float retainedLuminance = mix(paletteLuminance, max(paletteLuminance, luminance), uResolve);
  palette *= retainedLuminance / max(0.001, paletteLuminance);
  vec3 graded = mix(photo, palette, mix(0.28, 0.58, uResolve));
  graded = mix(uVoid, graded, 0.78 + max(-0.08, vDepth) * 0.32);

  float alpha = disc * vEligibility * (0.64 + luminance * 0.34) * 1.22;
  if (alpha < 0.015) discard;
  outColour = vec4(graded, alpha);
}`;
