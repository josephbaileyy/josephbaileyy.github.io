---
title: 'How this site works: one number from the galaxy to my desk'
date: 2026-07-01
summary: "The whole zoomable universe is driven by a single scalar. Here's the camera math that keeps 21 orders of magnitude numerically honest — and why nothing on this site accumulates."
---

This site zooms from the Milky Way down to the monitor on my desk — about 21 orders of magnitude. The obvious way to build that is a camera that flies through one giant scene graph, and the obvious way fails: 32-bit floats run out of precision long before you get from galactic scale to desk scale, and everything starts to jitter.

The fix is that the entire camera is **one number**: `depth ∈ [0, 5]`. Galaxy is 0, solar system is 1, Earth 2, Stanford 3, my room 4, the screen 5. Every frame, everything — camera pose, which scenes are mounted, effects, even the scale ribbon in the corner — is recomputed as a pure function of that number. Nothing accumulates, so nothing drifts.

## Nesting instead of flying

At any moment, at most two scenes exist. The scene at `floor(depth)` is mounted at the world origin at unit scale. The next scene nests inside it at that scene's **anchor** — a position, orientation, and scale that says "the solar system lives _here_ inside the galaxy, this small." When you cross an integer boundary, the child becomes the new base, mounted at identity, and the old parent is dropped. The coordinates the GPU sees are always modest numbers in the base scene's local space, no matter how deep you are.

The camera rail between a scene's rest pose and its child's rest pose is where the actual math lives. Linear interpolation of position feels wrong across scale — you'd spend 99% of the flight at the far end. Instead the distance to the anchor is interpolated **geometrically**:

```
D(t) = dS^(1-t) · dE^t
```

where `dS` and `dE` are the start and end distances from the anchor point. That's a constant _ratio_ per unit time, which is what a zoom perceptually is. Direction is slerped on the unit sphere, orientation is a quaternion slerp, and field of view is lerped in log-tan space so the zoom rate stays perceptually constant even when two scenes are authored with different FOVs.

## The seam theorem

The part that has to be exactly right is the boundary crossing. At `depth = 1.999…` the camera pose is expressed in the galaxy's coordinates; at `depth = 2.000…1` it's expressed in the solar system's. Those are different coordinate systems related by the anchor transform, and the two expressions must agree to the pixel or every scene handoff visibly pops.

That agreement is a small theorem about the rig functions, and it's the one piece of the site covered by property-style unit tests: evaluate the pose just below and just above each integer boundary, map one through the anchor transform, and assert they match to tolerance — for every seam in the chain, at many viewport aspect ratios. When a test fails here, the site is unshippable; everything else is polish.

## Feel

The scroll wheel doesn't set depth, it adds _velocity_, which decays exponentially and then a magnetic snap pulls you onto the nearest integer once input goes quiet. That's the difference between "scrubbing a slider" and "traveling." Long jumps (say, screen back to galaxy) don't force-load every scene en route — the camera ramps a streak effect, teleports to just above the target, and dives in, which reads as continuous motion but only ever loads two scenes.

A rolling frame-time monitor watches the render budget per scene and demotes quality — pixel ratio, post-processing, scene LODs — after a sustained overrun, then quietly probes a promotion after a clean stretch. Reduced-motion preferences swap the flight for instant cuts.

## The honest parts

Two hops cheat, and I'd rather document than hide them. The galaxy→solar transition covers a scale gap too large even for geometric interpolation to feel right, so the galaxy fades itself out on the way in. And Stanford→room flies through a conveniently lit dorm window. Everything else is genuine flight.

The rest of the site tries to be similarly literal: the background stars are the real naked-eye HYG catalog packed into a 30 KB binary, so the constellations are correct; planet and Moon positions come from NASA/JPL DE440s ephemerides, valid 1950–2050, at literal AU scale; Earth's terminator and city lights follow the selected UTC time; and the AM CVn binary in the galaxy scene — a system I actually studied — plays a synthesized gravitational-wave chirp with the real `f ∝ (1−t/tc)^(−3/8)` frequency law.

If you want the details, the rig math is in [`src/engine/rig.ts`](https://github.com/josephbaileyy/josephbaileyy.github.io/blob/main/src/engine/rig.ts) and the seam tests in [`tests/rig.test.ts`](https://github.com/josephbaileyy/josephbaileyy.github.io/blob/main/tests/rig.test.ts).
