import { createEventDisplay } from './event-display.js';

export function createCollisionScene({ canvas, hud, reducedMotion = false }) {
  let display = null;
  let mounted = false;
  let active = false;
  let retired = reducedMotion;
  let lastRenderCount = 0;

  function setRetiredDomState() {
    canvas?.classList.add('is-retired');

    if (hud) {
      hud.closest('.collision-hud')?.classList.add('is-retired');
    }
  }

  if (reducedMotion) {
    setRetiredDomState();
  }

  return {
    mount() {
      if (mounted || retired || reducedMotion) {
        return;
      }

      display = createEventDisplay({ canvas, hud, reducedMotion });
      mounted = true;
      active = true;
    },
    resume() {
      active = !retired && mounted;
      display?.resume();
    },
    pause() {
      active = false;
      display?.pause();
    },
    update(options) {
      if (!active || retired || !display) {
        return lastRenderCount;
      }

      const progress = display.update(options);
      lastRenderCount = display.renderCount;
      return progress;
    },
    resize() {
      display?.resize();
    },
    renderEndState() {
      setRetiredDomState();
    },
    unmount() {
      if (retired) {
        return;
      }

      lastRenderCount = display?.renderCount || lastRenderCount;
      display?.unmount();
      display = null;
      mounted = false;
      active = false;
      retired = true;
      setRetiredDomState();
    },
    isActive() {
      return active && !retired;
    },
    isRetired() {
      return retired;
    },
    getRenderCount() {
      return display?.renderCount || lastRenderCount;
    },
  };
}
