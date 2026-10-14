import {
  FULLSCREEN_VERTEX,
  INITIALIZE_FRAGMENT,
  POINT_FRAGMENT,
  POINT_VERTEX,
  SIMULATION_FRAGMENT,
} from './shaders.js';
import { FIXED_STEP, fitPortraitProjection, modeImpulse } from './math.js';

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown shader link error';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function uniform(gl, program, name) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`Shader uniform ${name} is unavailable`);
  return location;
}

function createImageTexture(gl, image) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return texture;
}

function createFloatTexture(gl, size) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);
  return texture;
}

function createStateTarget(gl, size) {
  const framebuffer = gl.createFramebuffer();
  const position = createFloatTexture(gl, size);
  const velocity = createFloatTexture(gl, size);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, position, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, velocity, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Floating-point simulation framebuffer is incomplete');
  }
  return { framebuffer, position, velocity };
}

function bindTexture(gl, texture, unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

function setRgb(gl, location, value) {
  gl.uniform3f(location, value[0], value[1], value[2]);
}

function modeNumber(mode) {
  return { idle: 0, musician: 1, runner: 2, physicist: 3 }[mode] || 0;
}

export function createPortraitRenderer({
  canvas,
  tier,
  seed,
  assets,
  data,
  colors,
  mode = 'idle',
}) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
  });
  if (!gl) throw new Error('WebGL2 is unavailable');
  if (!gl.getExtension('EXT_color_buffer_float')) {
    throw new Error('Floating-point framebuffer support is unavailable');
  }
  if (gl.getParameter(gl.MAX_DRAW_BUFFERS) < 2) {
    throw new Error('Multiple render targets are unavailable');
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const initializeProgram = createProgram(gl, FULLSCREEN_VERTEX, INITIALIZE_FRAGMENT);
  const simulationProgram = createProgram(gl, FULLSCREEN_VERTEX, SIMULATION_FRAGMENT);
  const pointProgram = createProgram(gl, POINT_VERTEX, POINT_FRAGMENT);

  const sourceTextures = {
    colour: createImageTexture(gl, assets.colour),
    depth: createImageTexture(gl, assets.depth),
    matte: createImageTexture(gl, assets.matte),
  };
  const targets = [
    createStateTarget(gl, tier.textureSize),
    createStateTarget(gl, tier.textureSize),
  ];

  const initUniforms = {
    depth: uniform(gl, initializeProgram, 'uDepth'),
    matte: uniform(gl, initializeProgram, 'uMatte'),
    seed: uniform(gl, initializeProgram, 'uSeed'),
    textureSize: uniform(gl, initializeProgram, 'uTextureSize'),
  };
  const simulationUniforms = {
    position: uniform(gl, simulationProgram, 'uPosition'),
    velocity: uniform(gl, simulationProgram, 'uVelocity'),
    depth: uniform(gl, simulationProgram, 'uDepth'),
    matte: uniform(gl, simulationProgram, 'uMatte'),
    seed: uniform(gl, simulationProgram, 'uSeed'),
    textureSize: uniform(gl, simulationProgram, 'uTextureSize'),
    step: uniform(gl, simulationProgram, 'uStep'),
    delta: uniform(gl, simulationProgram, 'uDelta'),
    pointer: uniform(gl, simulationProgram, 'uPointer'),
    pointerMotion: uniform(gl, simulationProgram, 'uPointerMotion'),
    impulse: uniform(gl, simulationProgram, 'uImpulse'),
    mode: uniform(gl, simulationProgram, 'uMode'),
  };
  const pointUniforms = {
    position: uniform(gl, pointProgram, 'uPosition'),
    colour: uniform(gl, pointProgram, 'uColour'),
    textureSize: uniform(gl, pointProgram, 'uTextureSize'),
    pixelRatio: uniform(gl, pointProgram, 'uPixelRatio'),
    pointScale: uniform(gl, pointProgram, 'uPointScale'),
    fit: uniform(gl, pointProgram, 'uFit'),
    resolve: uniform(gl, pointProgram, 'uResolve'),
    void: uniform(gl, pointProgram, 'uVoid'),
    charge: uniform(gl, pointProgram, 'uCharge'),
    heavy: uniform(gl, pointProgram, 'uHeavy'),
    mid: uniform(gl, pointProgram, 'uMid'),
    light: uniform(gl, pointProgram, 'uLight'),
  };

  let currentTarget = 0;
  let currentMode = mode;
  let step = 0;
  let width = 1;
  let height = 1;
  let destroyed = false;

  function initializeTarget(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, tier.textureSize, tier.textureSize);
    gl.useProgram(initializeProgram);
    bindTexture(gl, sourceTextures.depth, 0);
    bindTexture(gl, sourceTextures.matte, 1);
    gl.uniform1i(initUniforms.depth, 0);
    gl.uniform1i(initUniforms.matte, 1);
    gl.uniform1f(initUniforms.seed, seed);
    gl.uniform1f(initUniforms.textureSize, tier.textureSize);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  initializeTarget(targets[0]);
  initializeTarget(targets[1]);
  const homePositions = new Float32Array(tier.pointCount * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, targets[0].framebuffer);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.readPixels(
    0,
    0,
    tier.textureSize,
    tier.textureSize,
    gl.RGBA,
    gl.FLOAT,
    homePositions,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  function advance(pointer = null) {
    if (destroyed) return;
    const source = targets[currentTarget];
    const nextIndex = 1 - currentTarget;
    const target = targets[nextIndex];
    const impulse = modeImpulse(currentMode, step, data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, tier.textureSize, tier.textureSize);
    gl.useProgram(simulationProgram);
    bindTexture(gl, source.position, 0);
    bindTexture(gl, source.velocity, 1);
    bindTexture(gl, sourceTextures.depth, 2);
    bindTexture(gl, sourceTextures.matte, 3);
    gl.uniform1i(simulationUniforms.position, 0);
    gl.uniform1i(simulationUniforms.velocity, 1);
    gl.uniform1i(simulationUniforms.depth, 2);
    gl.uniform1i(simulationUniforms.matte, 3);
    gl.uniform1f(simulationUniforms.seed, seed);
    gl.uniform1f(simulationUniforms.textureSize, tier.textureSize);
    gl.uniform1f(simulationUniforms.step, step);
    gl.uniform1f(simulationUniforms.delta, FIXED_STEP);
    gl.uniform1i(simulationUniforms.mode, modeNumber(currentMode));
    if (pointer?.active) {
      gl.uniform4f(
        simulationUniforms.pointer,
        pointer.x,
        pointer.y,
        pointer.previousX,
        pointer.previousY,
      );
      gl.uniform3f(
        simulationUniforms.pointerMotion,
        pointer.velocityX,
        pointer.velocityY,
        pointer.strength,
      );
    } else {
      gl.uniform4f(simulationUniforms.pointer, 0, 0, 0, 0);
      gl.uniform3f(simulationUniforms.pointerMotion, 0, 0, 0);
    }
    if (impulse) {
      gl.uniform4f(
        simulationUniforms.impulse,
        impulse.x,
        impulse.y,
        impulse.amplitude,
        impulse.radius,
      );
    } else {
      gl.uniform4f(simulationUniforms.impulse, 0, 0, 0, 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    currentTarget = nextIndex;
    step += 1;
  }

  function render() {
    if (destroyed) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(colors.void[0], colors.void[1], colors.void[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(pointProgram);
    bindTexture(gl, targets[currentTarget].position, 0);
    bindTexture(gl, sourceTextures.colour, 1);
    gl.uniform1i(pointUniforms.position, 0);
    gl.uniform1i(pointUniforms.colour, 1);
    gl.uniform1f(pointUniforms.textureSize, tier.textureSize);
    gl.uniform1f(pointUniforms.pixelRatio, tier.pixelRatio);
    gl.uniform1f(
      pointUniforms.pointScale,
      tier.name === 'high' ? 1.48 : tier.name === 'medium' ? 1.58 : 1.74,
    );
    const fit = fitPortraitProjection(width, height);
    gl.uniform2f(pointUniforms.fit, fit[0], fit[1]);
    gl.uniform1f(pointUniforms.resolve, Math.min(1, step / 70));
    setRgb(gl, pointUniforms.void, colors.void);
    setRgb(gl, pointUniforms.charge, colors.charge);
    setRgb(gl, pointUniforms.heavy, colors.heavy);
    setRgb(gl, pointUniforms.mid, colors.mid);
    setRgb(gl, pointUniforms.light, colors.light);
    gl.drawArrays(gl.POINTS, 0, tier.pointCount);
  }

  function resize(cssWidth, cssHeight) {
    const nextWidth = Math.max(1, Math.round(cssWidth * tier.pixelRatio));
    const nextHeight = Math.max(1, Math.round(cssHeight * tier.pixelRatio));
    if (canvas.width !== nextWidth) canvas.width = nextWidth;
    if (canvas.height !== nextHeight) canvas.height = nextHeight;
    width = nextWidth;
    height = nextHeight;
  }

  function getDigest() {
    if (destroyed) return 'destroyed';
    const values = readPositions();
    if (!values) return 'destroyed';
    const words = new Uint32Array(values.buffer);
    let hash = 2166136261;
    for (let index = 0; index < words.length; index += 97) {
      hash ^= words[index];
      hash = Math.imul(hash, 16777619);
    }
    return `${tier.name}:${step}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function readPositions() {
    if (destroyed) return null;
    const values = new Float32Array(tier.pointCount * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets[currentTarget].framebuffer);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, tier.textureSize, tier.textureSize, gl.RGBA, gl.FLOAT, values);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return values;
  }

  function getDisplacementStats(threshold = 0.02) {
    const positions = readPositions();
    if (!positions) return null;
    const velocities = new Float32Array(tier.pointCount * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets[currentTarget].framebuffer);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(
      0,
      0,
      tier.textureSize,
      tier.textureSize,
      gl.RGBA,
      gl.FLOAT,
      velocities,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const safeThreshold = Math.max(0, Number(threshold) || 0);
    let displacedCount = 0;
    let eligibleCount = 0;
    let eligibleDisplacedCount = 0;
    let distanceSum = 0;
    let maxDistance = 0;
    let displacedWakeSum = 0;
    let maxWake = 0;
    let maxSpeed = 0;
    for (let index = 0; index < positions.length; index += 4) {
      const dx = positions[index] - homePositions[index];
      const dy = positions[index + 1] - homePositions[index + 1];
      const dz = positions[index + 2] - homePositions[index + 2];
      const distance = Math.hypot(dx, dy, dz);
      const displaced = distance > safeThreshold;
      const wake = velocities[index + 3];
      const speed = Math.hypot(
        velocities[index],
        velocities[index + 1],
        velocities[index + 2],
      );
      if (displaced) {
        displacedCount += 1;
        displacedWakeSum += wake;
      }
      if (homePositions[index + 3] > 0.035) {
        eligibleCount += 1;
        if (displaced) eligibleDisplacedCount += 1;
      }
      distanceSum += distance;
      maxDistance = Math.max(maxDistance, distance);
      maxWake = Math.max(maxWake, wake);
      maxSpeed = Math.max(maxSpeed, speed);
    }
    return {
      threshold: safeThreshold,
      pointCount: tier.pointCount,
      displacedCount,
      fraction: displacedCount / tier.pointCount,
      eligibleCount,
      eligibleDisplacedCount,
      eligibleFraction: eligibleDisplacedCount / Math.max(1, eligibleCount),
      meanDistance: distanceSum / tier.pointCount,
      maxDistance,
      meanDisplacedWake: displacedWakeSum / Math.max(1, displacedCount),
      maxWake,
      maxSpeed,
    };
  }

  return {
    advance,
    render,
    resize,
    getDigest,
    getDisplacementStats,
    setMode(nextMode) {
      currentMode = nextMode;
    },
    get step() {
      return step;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      targets.forEach((target) => {
        gl.deleteFramebuffer(target.framebuffer);
        gl.deleteTexture(target.position);
        gl.deleteTexture(target.velocity);
      });
      Object.values(sourceTextures).forEach((texture) => gl.deleteTexture(texture));
      gl.deleteProgram(initializeProgram);
      gl.deleteProgram(simulationProgram);
      gl.deleteProgram(pointProgram);
      gl.deleteVertexArray(vao);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
