import type { Camera } from './camera';

const WHEEL_GAIN = 0.0011; // depth-velocity per wheel pixel
const PINCH_GAIN = 0.55; // depth per doubling of finger spread
const LINE_HEIGHT = 16; // px per wheel line (deltaMode 1)

export interface InputOptions {
  reducedMotion: boolean;
  isModalOpen: () => boolean;
  onFirstInteraction?: () => void;
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

  stage.addEventListener(
    'wheel',
    (e) => {
      if (opts.isModalOpen()) return;
      e.preventDefault();
      markInteracted();
      const px = e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT : e.deltaY;
      if (opts.reducedMotion) {
        reducedAcc += -px;
        if (Math.abs(reducedAcc) > 140) {
          camera.tweenTo(Math.round(camera.depth) + Math.sign(reducedAcc), now(), 0);
          reducedAcc = 0;
        }
        return;
      }
      // Scroll up / pinch-out = zoom deeper. ctrlKey wheels are trackpad
      // pinches in Chrome/Firefox — same axis, finer deltas, higher gain.
      const gain = e.ctrlKey ? WHEEL_GAIN * 3 : WHEEL_GAIN;
      camera.nudge(-px * gain * 60, now());
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

  stage.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) lastSpread = spread();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && !opts.isModalOpen()) {
      const s = spread();
      if (lastSpread > 0 && s > 0) {
        markInteracted();
        camera.dragBy(Math.log2(s / lastSpread) * PINCH_GAIN, now());
      }
      lastSpread = s;
    }
  });

  const releasePointer = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    lastSpread = 0;
  };
  stage.addEventListener('pointerup', releasePointer);
  stage.addEventListener('pointercancel', releasePointer);

  // --- Safari trackpad pinch (proprietary gesture events) ---
  let gestureScale = 1;
  stage.addEventListener('gesturestart' as keyof HTMLElementEventMap, (e) => {
    e.preventDefault();
    gestureScale = 1;
  });
  stage.addEventListener('gesturechange' as keyof HTMLElementEventMap, (e) => {
    e.preventDefault();
    if (opts.isModalOpen()) return;
    const scale = (e as unknown as { scale: number }).scale;
    if (scale > 0 && gestureScale > 0) {
      markInteracted();
      camera.dragBy(Math.log2(scale / gestureScale) * PINCH_GAIN, now());
    }
    gestureScale = scale;
  });

  // --- Double-click zooms one scene deeper (map idiom) ---
  stage.addEventListener('dblclick', (e) => {
    if (opts.isModalOpen()) return;
    e.preventDefault();
    markInteracted();
    camera.tweenTo(Math.round(camera.depth) + 1, now());
  });

  // --- Keyboard ---
  window.addEventListener('keydown', (e) => {
    if (opts.isModalOpen()) return;
    const target = e.target as HTMLElement | null;
    if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
    const step = (dir: 1 | -1) => {
      e.preventDefault();
      markInteracted();
      camera.tweenTo(Math.round(camera.depth) + dir, now(), 0.9);
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
