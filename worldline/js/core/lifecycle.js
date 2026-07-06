export function getReducedMotionPreference() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

export function createSceneLifecycle({ reducedMotion = false } = {}) {
  const records = new Set();
  const observer = reducedMotion
    ? null
    : new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const record = [...records].find((item) => item.element === entry.target);

            if (!record || record.unmounted) {
              return;
            }

            if (entry.isIntersecting) {
              if (!record.mounted) {
                record.scene.mount?.();
                record.mounted = true;
              }

              record.scene.resume?.();
              record.active = true;
              return;
            }

            record.scene.pause?.();
            record.active = false;
          });
        },
        {
          rootMargin: '18% 0px 18% 0px',
          threshold: 0.01,
        },
      );

  function register({ element, scene, unmountWhen }) {
    const record = {
      active: false,
      element,
      mounted: false,
      scene,
      unmounted: false,
      unmountWhen,
    };

    records.add(record);

    if (reducedMotion) {
      scene.renderEndState?.();
      record.unmounted = true;
      return record;
    }

    observer.observe(element);

    if (isElementVisible(element)) {
      scene.mount?.();
      scene.resume?.();
      record.active = true;
      record.mounted = true;
    }

    return record;
  }

  function tick(context) {
    records.forEach((record) => {
      if (record.unmounted || !record.unmountWhen?.(context)) {
        return;
      }

      record.scene.unmount?.();
      record.unmounted = true;
      record.active = false;

      if (observer) {
        observer.unobserve(record.element);
      }
    });
  }

  function destroy() {
    if (observer) {
      observer.disconnect();
    }

    records.forEach((record) => record.scene.unmount?.());
    records.clear();
  }

  return {
    destroy,
    register,
    tick,
  };
}
