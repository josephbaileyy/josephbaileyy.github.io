/**
 * The worldline controller — the single owner of the connective line.
 *
 * See WORLDLINE.md. Scenes contribute a path shape and report where that path
 * enters, exits and currently ends, all in viewport pixels. This module decides
 * everything else: which stretches of the viewport the connective line covers,
 * where the head is, and whether the head dot is shown. Nothing else in the
 * codebase may draw a connective segment.
 */

// The head settles here by the end of a connective chapter: low enough to read
// as travelled, never at the very bottom edge.
const BAND_BOTTOM = 0.76;
// A scene's path and the connective line meeting within this many pixels reads
// as continuous; below it, bridging would just produce a visible stub.
const JOIN_EPSILON = 1.5;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smootherStep(value) {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function createWorldline({
  element = document.querySelector('#wl-connector'),
  headElement = document.querySelector('#wl-head'),
} = {}) {
  const providers = [];
  const chapters = [];
  let segmentNodes = [];
  let lastKey = '';
  let currentHead = null;

  /**
   * A scene that draws part of the line itself.
   * `getAnchors()` returns { entryY, exitY, headY, active } in viewport px, or
   * null when the scene has nothing on screen.
   */
  function registerScene(id, getAnchors) {
    providers.push({ id, getAnchors });
  }

  /**
   * A chapter with no scene of its own. The controller sweeps the head through
   * the band across the chapter's whole extent, so the head keeps advancing
   * even while the chapter's sticky is sliding away.
   */
  function registerChapter(id, element_, { isLast = false } = {}) {
    if (element_) {
      chapters.push({ id, element: element_, isLast });
    }
  }

  function ensureSegmentNodes(count) {
    while (segmentNodes.length < count) {
      const node = document.createElement('div');
      node.className = 'wl-segment';
      element.appendChild(node);
      segmentNodes.push(node);
    }
  }

  function render(segments, head, spineX) {
    // Key on the rounded geometry so we only touch the DOM when it changes.
    const key = `${spineX}|${segments.map((s) => `${s.top | 0}:${s.bottom | 0}`).join(',')}|${
      head ? `${head.y | 0}:${head.visible ? 1 : 0}` : '-'
    }`;

    if (key === lastKey) {
      return;
    }

    lastKey = key;
    ensureSegmentNodes(segments.length);

    segmentNodes.forEach((node, index) => {
      const segment = segments[index];

      if (!segment) {
        node.style.opacity = '0';
        return;
      }

      node.style.opacity = segment.opacity.toFixed(3);
      node.style.transform = `translate(-50%, ${segment.top.toFixed(1)}px)`;
      node.style.height = `${Math.max(0, segment.bottom - segment.top).toFixed(1)}px`;
    });

    if (spineX) {
      element.style.setProperty('--spine-x', spineX);
    }

    if (headElement) {
      headElement.style.opacity = head && head.visible ? head.opacity.toFixed(3) : '0';
      headElement.style.transform = `translate(-50%, ${head ? head.y.toFixed(1) : 0}px)`;
    }
  }

  function update({ maxScroll = 0 } = {}) {
    if (!element) {
      return;
    }

    const viewport = window.innerHeight;

    // 1. What are the scenes drawing right now?
    const active = [];
    for (const provider of providers) {
      const anchors = provider.getAnchors?.();

      if (anchors && anchors.active) {
        active.push({ id: provider.id, ...anchors });
      }
    }
    active.sort((a, b) => a.entryY - b.entryY);

    // 2. Does a connective-only chapter own the head instead?
    let bandHead = null;
    let spineX = '';

    for (const chapter of chapters) {
      const rect = chapter.element.getBoundingClientRect();

      if (rect.bottom <= 0 || rect.top >= viewport) {
        continue;
      }

      const chapterTop = rect.top + window.scrollY;
      const reachable = Math.max(1, maxScroll - chapterTop);
      const travel = Math.max(1, Math.min(rect.height, reachable));
      const u = clamp01(-rect.top / travel);

      // Grow, never fade. The line starts at this chapter's own top edge —
      // which is exactly where the previous chapter's line ended, since the
      // sections are contiguous — and extends downward as you scroll. Fading
      // it in was the old workaround for a gap that no longer exists, and it
      // read as the line materialising rather than arriving.
      const from = Math.max(0, rect.top);
      bandHead = {
        y: from + (BAND_BOTTOM * viewport - from) * smootherStep(u),
        opacity: 1,
      };
      spineX = getComputedStyle(chapter.element).getPropertyValue('--spine-x').trim();
      break;
    }

    // 3. Build the connective segments: from the top of the viewport, filling
    //    every stretch a scene is NOT drawing, down to whatever is the head.
    const segments = [];
    let cursor = 0;
    let head = null;

    for (const scene of active) {
      if (scene.entryY - cursor > JOIN_EPSILON) {
        segments.push({ top: cursor, bottom: scene.entryY, opacity: 1 });
      }

      // The scene's own head is the bottom end while it is still drawing.
      if (scene.headY < scene.exitY - JOIN_EPSILON) {
        head = { y: scene.headY, visible: false, opacity: 1 };
        cursor = scene.headY;
        break;
      }

      cursor = Math.max(cursor, scene.exitY);
    }

    if (!head) {
      if (bandHead) {
        // A connective chapter owns the head. Never let it sit above where the
        // line already reaches, or the line would appear to retract.
        const y = Math.max(bandHead.y, cursor);
        segments.push({ top: cursor, bottom: y, opacity: bandHead.opacity });
        head = { y, visible: true, opacity: bandHead.opacity };
      } else if (cursor > 0 && cursor < viewport) {
        // Between owners: carry the line to the bottom of the viewport rather
        // than leaving it terminating in mid-air.
        segments.push({ top: cursor, bottom: viewport, opacity: 1 });
        head = null;
      }
    }

    render(segments, head, spineX);
    currentHead = head ? head.y : null;
  }

  /** Viewport Y of the line's bottom end this frame, or null. */
  function getHeadY() {
    return currentHead;
  }

  return { getHeadY, registerChapter, registerScene, update };
}
