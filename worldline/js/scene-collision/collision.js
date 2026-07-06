import { createEventDisplay } from './event-display.js';

export function createCollisionScene({ canvas, hud, reducedMotion = false }) {
  let display = null;
  let mounted = false;
  let active = false;
  // Reduced-motion never mounts the WebGL scene at all - that's permanent.
  // "collapsed" is the scroll-driven handoff-into-worldline state, which is
  // reversible: scrolling back up above the handoff threshold should bring
  // the event display back, not leave it retired forever.
  const permanentlyDisabled = reducedMotion;
  let collapsed = reducedMotion;
  let lastRenderCount = 0;

  function setRetiredDomState() {
    canvas?.classList.add('is-retired');

    if (hud) {
      hud.closest('.collision-hud')?.classList.add('is-retired');
    }
  }

  function clearRetiredDomState() {
    canvas?.classList.remove('is-retired');

    if (hud) {
      hud.closest('.collision-hud')?.classList.remove('is-retired');
    }
  }

  if (reducedMotion) {
    setRetiredDomState();
  }

  return {
    mount() {
      if (mounted || permanentlyDisabled) {
        return;
      }

      display = createEventDisplay({ canvas, hud, reducedMotion });
      mounted = true;
      active = !collapsed;
    },
    resume() {
      active = !collapsed && mounted;
      display?.resume();
    },
    pause() {
      active = false;
      display?.pause();
    },
    update(options) {
      if (!active || collapsed || !display) {
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
    // Reversible: the collision->worldline handoff just pauses rendering and
    // shows the retired visual state, it does not tear down the WebGL
    // context. Destroying and recreating a THREE.WebGLRenderer on the same
    // canvas is fragile (context-loss is asynchronous and can race with a
    // fresh renderer's capability queries), so scrolling back up simply
    // resumes the still-live renderer instead of reconstructing it.
    collapse() {
      if (permanentlyDisabled || collapsed) {
        return;
      }

      collapsed = true;
      active = false;
      display?.pause();
      lastRenderCount = display?.renderCount || lastRenderCount;
      setRetiredDomState();
    },
    expand() {
      if (permanentlyDisabled || !collapsed) {
        return;
      }

      collapsed = false;
      clearRetiredDomState();

      if (mounted) {
        display?.resume();
        active = true;
      } else {
        // Shouldn't normally happen (mount() runs on initial visibility), but
        // guard in case the chapter was never mounted for some reason.
        display = createEventDisplay({ canvas, hud, reducedMotion });
        mounted = true;
        active = true;
      }
    },
    // Full teardown, only for page-lifecycle destroy (not the reversible
    // scroll-driven collapse above).
    unmount() {
      if (!mounted) {
        return;
      }

      lastRenderCount = display?.renderCount || lastRenderCount;
      display?.unmount();
      display = null;
      mounted = false;
      active = false;
      collapsed = true;
      setRetiredDomState();
    },
    isActive() {
      return active && !collapsed;
    },
    isRetired() {
      return collapsed;
    },
    getRenderCount() {
      return display?.renderCount || lastRenderCount;
    },
  };
}
