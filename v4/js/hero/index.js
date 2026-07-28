import './hero.css';
import { createMachineAudio } from './audio.js';
import { createChamber } from './chamber.js';
import { renderFallbackPoster } from './fallback.js';
import {
  FIXED_STEP,
  MAX_CHARGE_DISTANCE,
  chargeFromDistance,
  parseMachineParams,
  selectCapabilityTier,
  validateManifest,
} from './math.js';
import { createPhysics } from './physics.js';

function cssToken(styles, name) {
  return styles.getPropertyValue(name).trim() || styles.color;
}

function readColors(element) {
  const styles = getComputedStyle(element);
  return {
    void: cssToken(styles, '--void'),
    surface: cssToken(styles, '--surface'),
    rule: cssToken(styles, '--rule'),
    text: cssToken(styles, '--text'),
    charge: cssToken(styles, '--charge'),
    chargeMax: cssToken(styles, '--charge-max'),
    heavy: cssToken(styles, '--mass-heavy'),
    mid: cssToken(styles, '--mass-mid'),
    light: cssToken(styles, '--mass-light'),
    track: cssToken(styles, '--track'),
  };
}

function canUseWebGL() {
  try {
    const probe = document.createElement('canvas');
    const context =
      probe.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      probe.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function createAccessibleItems(container, manifest, onOpenItem) {
  const navigation = document.createElement('nav');
  navigation.className = 'unfolding-machine__items';
  navigation.setAttribute('aria-label', 'Collision chamber items');
  const title = document.createElement('p');
  title.textContent = 'EXPLORE THE FIELD';
  const list = document.createElement('ul');
  manifest.bodies
    .filter((body) => body.id && body.label)
    .forEach((body) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = body.label;
      button.dataset.itemId = body.id;
      button.addEventListener('click', () => onOpenItem(body.id));
      item.append(button);
      list.append(item);
    });
  navigation.append(title, list);
  container.append(navigation);
  return navigation;
}

function createInterface(element, manifest, callbacks) {
  element.classList.add('unfolding-machine');
  const canvas = document.createElement('canvas');
  canvas.className = 'unfolding-machine__canvas';
  canvas.setAttribute(
    'aria-label',
    'Interactive physics chamber. Drag and release objects to collide them.',
  );
  canvas.setAttribute('role', 'img');
  const instruments = document.createElement('div');
  instruments.className = 'unfolding-machine__instruments';
  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'unfolding-machine__control';
  sound.textContent = 'SOUND OFF';
  sound.setAttribute('aria-pressed', 'false');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'unfolding-machine__control unfolding-machine__control--reset';
  reset.textContent = 'FIELD RESET';
  instruments.append(sound, reset);
  element.append(canvas, instruments);
  const navigation = createAccessibleItems(element, manifest, callbacks.onOpenItem);
  return { canvas, instruments, sound, reset, navigation };
}

export default function mountUnfoldingMachine(el, options = {}) {
  const {
    manifest,
    seed: optionSeed = 17,
    onOpenItem = () => {},
    onSoundPreference = () => {},
  } = options;
  el.dataset.state = 'loading';
  const validation = validateManifest(manifest);
  const parsed = parseMachineParams(window.location.search);
  const params = new URLSearchParams(window.location.search);
  const seed = params.has('seed') ? parsed.seed : optionSeed;
  const colors = readColors(el);
  let usingFallback = false;
  let destroyed = false;
  let resetAction = () => {};
  let destroyAction = () => {};
  let bodyPositionsAction = () => [];
  let statistics = {
    fps: 0,
    bodyCount: 0,
    tier: 'pending',
    seed,
    state: parsed.machine,
  };

  if (!validation.valid) {
    usingFallback = true;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const webgl = canUseWebGL();
  if (reducedMotion || !webgl) usingFallback = true;

  const ready = (async () => {
    const callbacks = { onOpenItem };
    const ui = createInterface(el, manifest || { bodies: [] }, callbacks);

    if (usingFallback) {
      ui.canvas.remove();
      ui.instruments.remove();
      const reason = !validation.valid
        ? 'The interactive chamber is unavailable because its content manifest is invalid.'
        : reducedMotion
          ? 'The interactive chamber is paused because reduced motion is enabled.'
          : 'The interactive chamber is unavailable because WebGL is not supported.';
      renderFallbackPoster(el, manifest || { bodies: [] }, colors, reason);
      el.dataset.state = 'fallback';
      return;
    }

    const tier = selectCapabilityTier({
      width: el.clientWidth || window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency: navigator.hardwareConcurrency || 8,
      deviceMemory: navigator.deviceMemory || 8,
    });
    statistics = {
      ...statistics,
      tier: tier.name,
      bodyCount: Math.min(manifest.bodies.length, tier.bodyLimit) + 1,
    };
    el.dataset.tier = tier.name;
    el.dataset.seed = String(seed);
    const audio = createMachineAudio(onSoundPreference);
    let chamber = null;
    const physics = await createPhysics({
      manifest,
      seed,
      tier,
      onImpact: (impact) => {
        chamber?.impact(impact);
        if (impact.impulse > 3.2) audio.impact(impact.impulse);
      },
    });
    bodyPositionsAction = () =>
      physics.records.map((record) => {
        const position = record.body.translation();
        return {
          id: record.isProjectile
            ? 'projectile'
            : record.source.id || record.source.label || `body-${record.index}`,
          x: position.x,
          y: position.y,
          z: position.z,
        };
      });
    if (destroyed) {
      physics.destroy();
      audio.destroy();
      return;
    }

    chamber = createChamber({
      canvas: ui.canvas,
      records: physics.records,
      bounds: physics.bounds,
      tier,
      colors,
      deterministicCapture: parsed.machine === 'impact',
    });

    const resize = () => {
      const rect = el.getBoundingClientRect();
      chamber.resize(rect.width, rect.height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);

    const activePointers = new Map();
    let activePointer = null;
    let selectedRecord = null;
    let downPoint = null;
    let longPressTimer = 0;

    function chargeVisual(forcedMaximum = false) {
      if (!physics.grabbed || !physics.grabTarget) {
        chamber.updateCharge(null, null, chargeFromDistance(0));
        el.style.setProperty('--machine-charge', '0');
        return;
      }
      const origin = physics.grabOrigin || physics.grabbed.home;
      const target = physics.grabTarget;
      const charge = forcedMaximum
        ? chargeFromDistance(MAX_CHARGE_DISTANCE)
        : chargeFromDistance(
            Math.hypot(target.x - origin.x, target.y - origin.y, target.z - origin.z),
          );
      chamber.updateCharge(origin, target, charge);
      el.style.setProperty('--machine-charge', String(charge.normalized));
    }

    function clearLongPress() {
      if (longPressTimer) window.clearTimeout(longPressTimer);
      longPressTimer = 0;
    }

    function onPointerDown(event) {
      if (event.button !== 0) return;
      activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
      });
      ui.canvas.setPointerCapture(event.pointerId);

      if (activePointers.size === 2) {
        const samples = [...activePointers.values()];
        if (Math.abs(samples[0].time - samples[1].time) < 280) {
          resetAction();
          clearLongPress();
          event.preventDefault();
          return;
        }
      }
      if (activePointer !== null) return;

      const rect = ui.canvas.getBoundingClientRect();
      const record = chamber.pick(event.clientX, event.clientY, rect);
      const target = chamber.worldPoint(event.clientX, event.clientY, rect);
      if (!record || !target) return;
      event.preventDefault();
      activePointer = event.pointerId;
      selectedRecord = record;
      downPoint = {
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
      };
      physics.beginGrab(record, target, event.timeStamp);
      chargeVisual();

      if (record.source.id) {
        longPressTimer = window.setTimeout(() => {
          onOpenItem(record.source.id);
          physics.releaseGrab(false);
          selectedRecord = null;
          chargeVisual();
        }, 620);
      }
    }

    function onPointerMove(event) {
      if (event.pointerId !== activePointer || !physics.grabbed) return;
      event.preventDefault();
      const rect = ui.canvas.getBoundingClientRect();
      const target = chamber.worldPoint(event.clientX, event.clientY, rect);
      if (!target) return;
      physics.moveGrab(target, event.timeStamp);
      if (downPoint && Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) > 9) {
        clearLongPress();
      }
      chargeVisual();
    }

    function onPointerEnd(event) {
      activePointers.delete(event.pointerId);
      if (event.pointerId !== activePointer) return;
      clearLongPress();
      const movement = downPoint
        ? Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y)
        : 999;
      const duration = downPoint ? event.timeStamp - downPoint.time : 999;
      const activated =
        movement < 7 &&
        duration < 500 &&
        selectedRecord?.source.id &&
        event.type !== 'pointercancel';
      if (activated) onOpenItem(selectedRecord.source.id);
      physics.releaseGrab(!activated && event.type !== 'pointercancel');
      activePointer = null;
      selectedRecord = null;
      downPoint = null;
      chargeVisual();
    }

    ui.canvas.addEventListener('pointerdown', onPointerDown);
    ui.canvas.addEventListener('pointermove', onPointerMove);
    ui.canvas.addEventListener('pointerup', onPointerEnd);
    ui.canvas.addEventListener('pointercancel', onPointerEnd);

    ui.sound.addEventListener('click', async () => {
      const enabled = await audio.setEnabled(!audio.enabled);
      ui.sound.textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
      ui.sound.setAttribute('aria-pressed', String(enabled));
    });

    resetAction = () => {
      physics.startReset();
      chamber.clearTracks();
      el.dataset.machine = 'resetting';
    };
    ui.reset.addEventListener('click', resetAction);

    let pausedByVisibility = document.hidden;
    let pausedByIntersection = false;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        pausedByIntersection = !entry.isIntersecting;
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(el);
    const visibilityListener = () => {
      pausedByVisibility = document.hidden;
    };
    document.addEventListener('visibilitychange', visibilityListener);

    let animationFrame = 0;
    let previousTime = null;
    let accumulator = 0;
    let fpsStart = null;
    let fpsFrames = 0;

    function fixedStep() {
      physics.step();
      chamber.advance();
      chargeVisual(parsed.machine === 'charged');
      if (el.dataset.machine === 'resetting' && !physics.resetting) {
        el.dataset.machine = 'idle';
      }
    }

    if (parsed.machine === 'charged') {
      physics.poseCharged();
      chargeVisual(true);
      chamber.render();
    } else if (parsed.machine === 'impact') {
      physics.launchDeterministic();
      for (let index = 0; index < parsed.frame; index += 1) fixedStep();
      chamber.render();
    } else {
      chamber.render();
    }

    el.dataset.machine = parsed.machine;
    el.dataset.state = 'ready';

    function animate(time) {
      animationFrame = requestAnimationFrame(animate);
      if (previousTime === null) {
        previousTime = time;
        fpsStart = time;
      }
      if (destroyed || pausedByVisibility || pausedByIntersection || parsed.machine !== 'idle') {
        previousTime = time;
        return;
      }
      const delta = Math.min(0.1, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      accumulator += delta * chamber.timeScale;
      let substeps = 0;
      while (accumulator >= FIXED_STEP && substeps < 12) {
        fixedStep();
        accumulator -= FIXED_STEP;
        substeps += 1;
      }
      chamber.render();
      fpsFrames += 1;
      if (fpsStart !== null && time - fpsStart >= 500) {
        statistics.fps = (fpsFrames * 1000) / (time - fpsStart);
        el.dataset.fps = statistics.fps.toFixed(1);
        fpsFrames = 0;
        fpsStart = time;
      }
    }
    animationFrame = requestAnimationFrame(animate);

    destroyAction = () => {
      cancelAnimationFrame(animationFrame);
      clearLongPress();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityListener);
      ui.canvas.removeEventListener('pointerdown', onPointerDown);
      ui.canvas.removeEventListener('pointermove', onPointerMove);
      ui.canvas.removeEventListener('pointerup', onPointerEnd);
      ui.canvas.removeEventListener('pointercancel', onPointerEnd);
      chamber.destroy();
      physics.destroy();
      audio.destroy();
    };

    if (el.dataset.debug === 'true') {
      const overlay = document.createElement('output');
      overlay.className = 'unfolding-machine__debug';
      el.append(overlay);
      const updateDebug = () => {
        if (destroyed) return;
        const readout = [
          `BODIES ${statistics.bodyCount}`,
          `TIER ${statistics.tier.toUpperCase()}`,
          `SEED ${statistics.seed}`,
          `STATE ${el.dataset.machine?.toUpperCase()}`,
        ];
        if (parsed.machine === 'idle' && statistics.fps > 0) {
          readout.unshift(`FPS ${statistics.fps.toFixed(1)}`);
        }
        overlay.textContent = readout.join(' · ');
        requestAnimationFrame(updateDebug);
      };
      updateDebug();
    }
  })().catch((error) => {
    if (destroyed) return;
    usingFallback = true;
    el.replaceChildren();
    el.classList.add('unfolding-machine');
    createAccessibleItems(el, manifest || { bodies: [] }, onOpenItem);
    renderFallbackPoster(
      el,
      manifest || { bodies: [] },
      colors,
      'The interactive chamber could not start. Its static charged state is shown instead.',
    );
    el.dataset.state = 'fallback';
    el.dataset.error = error instanceof Error ? error.name : 'UnknownError';
  });

  return {
    reset() {
      resetAction();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      destroyAction();
      el.replaceChildren();
      el.classList.remove('unfolding-machine');
      delete el.dataset.state;
    },
    ready,
    get usingFallback() {
      return usingFallback;
    },
    get statistics() {
      return { ...statistics };
    },
    get bodyPositions() {
      return bodyPositionsAction();
    },
  };
}
