export function createCollisionScene({ canvas, hud, reducedMotion = false }) {
  let display = null;
  let mounted = false;
  let active = false;
  let generation = 0;
  let loadPromise = null;
  // Reduced-motion never mounts the WebGL scene at all - that's permanent.
  // "collapsed" is the scroll-driven handoff-into-worldline state, which is
  // reversible: scrolling back up above the handoff threshold should bring
  // the event display back, not leave it retired forever.
  let permanentlyDisabled = reducedMotion;
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

  function disableRenderer() {
    permanentlyDisabled = true;
    collapsed = true;
    active = false;
    canvas?.classList.add('is-unavailable');
    document.documentElement.classList.add('is-webgl-unavailable');
    setRetiredDomState();
  }

  function createWebGLContext() {
    if (!canvas) {
      return null;
    }

    const attributes = {
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    };

    try {
      return canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes);
    } catch {
      return null;
    }
  }

  function ensureDisplay() {
    if (display || loadPromise || permanentlyDisabled || !mounted) {
      return;
    }

    const context = createWebGLContext();
    if (!context) {
      disableRenderer();
      return;
    }

    const loadGeneration = generation;
    loadPromise = import('./event-display.js')
      .then(({ createEventDisplay }) => {
        if (generation !== loadGeneration || !mounted || permanentlyDisabled) {
          return;
        }

        display = createEventDisplay({ canvas, context, hud, reducedMotion });
        loadPromise = null;

        if (active) {
          display.resume();
        } else {
          display.pause();
        }
      })
      .catch(() => {
        loadPromise = null;
        disableRenderer();
        console.warn('Collision scene unavailable; continuing with the static worldline.');
      });
  }

  return {
    mount() {
      if (mounted || permanentlyDisabled) {
        return;
      }

      mounted = true;
      active = !collapsed;
      ensureDisplay();
    },
    resume() {
      active = !collapsed && mounted;
      display?.resume();
      ensureDisplay();
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
        ensureDisplay();
      } else {
        // Shouldn't normally happen (mount() runs on initial visibility), but
        // guard in case the chapter was never mounted for some reason.
        mounted = true;
        active = true;
        ensureDisplay();
      }
    },
    // Full teardown, only for page-lifecycle destroy (not the reversible
    // scroll-driven collapse above).
    unmount() {
      if (!mounted) {
        return;
      }

      generation += 1;
      lastRenderCount = display?.renderCount || lastRenderCount;
      display?.unmount();
      display = null;
      loadPromise = null;
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
