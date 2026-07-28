# The worldline: one line, one owner

The site's whole conceit is that a single continuous line threads every chapter.
Historically it was implemented six separate times — a WebGL mesh, a CSS spine,
three scene canvases/SVGs, and a fixed CSS connector — each deciding for itself
where the line began and ended. **Every** bug reported against the worldline has
been at a boundary between two of those owners, and fixing one seam retuned the
timing a neighbouring seam depended on. This document exists so that structure
does not come back.

## The invariant

At any scroll position:

1. There is exactly **one head** — one visible bottom end of the line.
2. The head's screen Y stays inside a band (never at the very top or bottom).
3. Everything above the head is drawn; nothing below it is.
4. The line is continuous: no gaps, no stray fragments, no retraction.

## The architecture

`js/core/worldline.js` is the **single owner**. Each frame it computes a list of
connective segments in *viewport* coordinates and renders them.

Scenes do **not** decide where the line starts or ends. A scene contributes a
*path shape* and reports two anchors:

```js
getAnchors() // -> { entryY, exitY, headY, active } | null
```

- `entryY` — viewport Y where the scene's own drawn path begins
- `exitY`  — viewport Y where it ends when fully drawn
- `headY`  — viewport Y of the scene path's current head (its leading tip)
- `active` — whether the scene is currently drawing anything

All in CSS pixels relative to the viewport. Return `null` when the scene has
nothing on screen.

The controller then:

- draws connective line from the top of the viewport down to the topmost active
  scene's `entryY`
- resumes below that scene's `exitY` and runs to the next scene's `entryY`
- if no scene owns the head, sweeps the head through the band itself
- renders the head dot at whichever point is genuinely the bottom end

Because there is one number for "where is the head", continuity stops being
something tuned at six seams and becomes true by construction.

## Geometry constraints that bit us (do not relearn these)

**A `position: sticky; top: 0` chapter cannot grow its own line from zero.**
The chapter already fills the viewport before its scrub starts, so a trunk
animating 0→full leaves the chapter on screen with no line while the previous
chapter's line has already exited. Anything anchored inside a sticky also slides
off the top during the final 100vh, when the sticky unpins. This is why the
connective line is `position: fixed` and lives outside the chapters.

**A chapter's usable scrub range is `height - 100vh`, not `height`.** Sizing
chapters by total height silently changes animation speed. Size by scrub range.

**The last chapter's reachable travel is capped by the document**, not by its own
height — most of a tall final chapter is unreachable, which will freeze anything
driven off its progress.

**Hardcoded `min-height` on a chapter goes stale.** `.chapter-collision` had
`min-height: 400vh` against 300vh of content, leaving a dead viewport with no
line on it.

**Padding `.scene-root` insets the scene canvases**, moving the line's drawing
origin and leaving it starting in mid-air. Pad the scene's own container.

## Verification traps

**The rAF loop halts when the document is hidden.** A backgrounded tab in a real
browser returns frozen frames, which will make you report bugs that do not
exist (this cost two false findings: a "stuck" chapter readout and a "black"
hero, both fine). A headless Playwright page reports `visibilityState:
'visible'` and is safe. Always launch with
`['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']` or
CH01 renders black and you will misdiagnose it.

**Scroll by stepping `window.scrollTo` across `requestAnimationFrame` ticks**
(~40 steps), then wait ~800ms. A single jump does not let scroll-driven
animation settle. Lenis smooth-scrolling means programmatic jumps are not
equivalent to real scrolling.

**Never hardcode scrollY in a check.** Derive chapter positions at runtime from
`getBoundingClientRect().top + scrollY` and `offsetHeight`.

**Element bounding boxes lie for overlap tests.** A block-level heading's box is
full width even when its glyphs stop far short, and a curved SVG path's box
envelopes everything. Use `range.selectNodeContents(el); range.getClientRects()`
for true text extents, and pixel sampling for curved strokes.

**The line is 2px wide**, so any intersection threshold `>= 2` can never fire on
a vertical trunk.

**Overlap harnesses that only query the DOM are blind to canvas-drawn lines and
histograms.** A "clean" result from a DOM-only check is partial; look at the
screenshots too.

## Tokens

The line is one colour, one width, one glow, everywhere. Scenes read these and
never restate them (there were once three whites and two widths):

```
--spine-x      50%        (0.5rem left rail in CH04/CH06 under 760px)
--spine-color  #e8ecf1
--spine-width  2px
--spine-glow   drop-shadow(0 0 8px rgba(232, 236, 241, 0.32))
```
