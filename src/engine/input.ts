import type { Camera } from './camera';

const WHEEL_GAIN = 0.013; // depth-velocity impulse per wheel pixel
const PINCH_GAIN = 0.55; // depth per doubling of finger spread
const LINE_HEIGHT = 16; // px per wheel line (deltaMode 1)

// Surfaces inside the fake-OS that own their own scroll — wheel over these
// must NOT zoom the camera (and must keep native scrolling).
const SCROLLABLE = '.os-term-scrollback, .os-doc';
const INTERACTIVE = 'input, textarea, select, button, a, [contenteditable="true"]';

export interface InputOptions {
  reducedMotion: boolean;
  isModalOpen: () => boolean;
  onFirstInteraction?: () => void;
  /** Prefetch the scene a gesture is moving toward before the camera arrives. */
  onSceneIntent?: (index: number) => void;
  /** mutable target written with normalized mouse position for camera parallax */
  parallaxTarget?: { x: number; y: number };
}

export function attachInput(stage: HTMLElement, camera: Camera, opts: InputOptions): void {
  const now = () => performance.now() / 1000;
  let interacted = false;
  const markInteracted = () => {
    if (!interacted) {
      interacted = true;
      opts.onFirstInteraction?.();
    }
  };

  // Reduced motion: accumulate wheel and step whole scenes instantly.
  let reducedAcc = 0;

  // Bound to window (not the canvas) so wheel zooms even when a DOM overlay
  // like the fake-OS sits on top of the canvas.
  window.addEventListener(
    'wheel',
    (e) => {
      if (opts.isModalOpen()) return;
      if (e.ctrlKey || e.metaKey) return;
      // let scrollable OS surfaces (terminal, doc windows) scroll natively
      const tgt = e.target;
      if (!(tgt instanceof Element) || !tgt.closest('#universe, .screen-ui')) return;
      if (tgt.closest(SCROLLABLE) || tgt.closest(INTERACTIVE) || tgt.closest('dialog')) return;
      e.preventDefault();
      markInteracted();
      const px = e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT : e.deltaY;
      opts.onSceneIntent?.(Math.round(camera.depth) + Math.sign(-px));
      if (opts.reducedMotion) {
        reducedAcc += -px;
        if (Math.abs(reducedAcc) > 140) {
          camera.tweenTo(Math.round(camera.depth) + Math.sign(reducedAcc), now(), 0);
          reducedAcc = 0;
        }
        return;
      }
      // Scroll up = zoom deeper. Modifier-assisted wheel remains browser zoom.
      camera.nudge(-px * WHEEL_GAIN, now());
    },
    { passive: false },
  );

  // --- Mouse parallax (mouse only; no gyro on touch) ---
  if (opts.parallaxTarget && !opts.reducedMotion) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      opts.parallaxTarget!.x = (e.clientX / window.innerWidth) * 2 - 1;
      opts.parallaxTarget!.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  // --- Touch pinch via pointer events ---
  const pointers = new Map<number, { x: number; y: number }>();
  let lastSpread = 0;

  const spread = (): number => {
    const [p1, p2] = [...pointers.values()];
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  };

  window.addEventListener('pointerdown', (e) => {
    const target = e.target;
    if (!(target instanceof Element) || !target.closest('#universe, .screen-ui')) return;
    if (target.closest(SCROLLABLE) || target.closest(INTERACTIVE) || target.closest('dialog')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) lastSpread = spread();
  });

  window.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && !opts.isModalOpen()) {
      const s = spread();
      if (lastSpread > 0 && s > 0) {
        markInteracted();
        const delta = Math.log2(s / lastSpread) * PINCH_GAIN;
        opts.onSceneIntent?.(Math.round(camera.depth) + Math.sign(delta));
        camera.dragBy(delta, now());
      }
      lastSpread = s;
    }
  });

  const releasePointer = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    lastSpread = 0;
  };
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);

  // --- Safari trackpad pinch (proprietary gesture events) ---
  // Native trackpad gestures remain browser zoom for accessibility. Touch
  // pinching on the canvas is handled by pointer events above.

  // --- Double-click zooms one scene deeper (map idiom) ---
  stage.addEventListener('dblclick', (e) => {
    if (opts.isModalOpen()) return;
    e.preventDefault();
    markInteracted();
    const target = Math.round(camera.depth) + 1;
    opts.onSceneIntent?.(target);
    camera.tweenTo(target, now());
  });

  // --- Keyboard ---
  window.addEventListener('keydown', (e) => {
    if (opts.isModalOpen()) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE)) return;
    const step = (dir: 1 | -1) => {
      e.preventDefault();
      markInteracted();
      const target = Math.round(camera.depth) + dir;
      opts.onSceneIntent?.(target);
      camera.tweenTo(target, now(), 0.9);
    };
    switch (e.key) {
      case '+':
      case '=':
      case 'ArrowUp':
        step(1);
        break;
      case '-':
      case '_':
      case 'ArrowDown':
        step(-1);
        break;
      case 'Escape':
        step(-1);
        break;
    }
  });
}
