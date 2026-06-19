# josephbaileyy.github.io — a zoomable universe, in 3D

A personal site that dives from the Milky Way down to my desk, Powers-of-Ten style:

```
galaxy → solar system → Earth → Stanford → my room → my computer screen
```

Three.js + TypeScript + Vite. Two runtime dependencies (`three`, `postprocessing`).

## Run it

```bash
npm install
npm run dev      # local dev server
npm test         # rig-math invariant tests (seam theorem etc.)
npm run build    # production build to dist/
npm run test:e2e # desktop + mobile browser smoke tests (after a build)
```

## How it works

The camera is one number: `depth ∈ [0, 5]`. The scene at `floor(depth)` is
mounted at the world origin; the next scene nests inside it at that scene's
**anchor** (position + 1/K scale, K ≈ 13–28). The camera flies a rail from the
scene's rest pose into the anchor with geometric distance interpolation, and
crossing an integer boundary just re-evaluates everything in the child's
coordinates — a pure function of depth, no accumulated transforms, so floats
stay healthy across 21 orders of magnitude. Most hops are genuine flight (you
really fly to Earth); the galaxy→solar scale cheat is covered by the galaxy
fading itself out, and Stanford→room flies through the lit dorm window.
Scene code and textures load on demand, with the current scene's neighbours
prefetched for smooth travel and a retryable error state if a scene fails.
The math lives in [src/engine/rig.ts](src/engine/rig.ts), with the seam
theorem tested in [tests/rig.test.ts](tests/rig.test.ts).

Nice touches: Earth's terminator and city lights are computed from the actual
UTC time; the solar system shows the planets at their real positions today;
the background stars are the real naked-eye catalog (HYG, packed to 30 KB by
[scripts/pack-stars.mjs](scripts/pack-stars.mjs)) so the constellations are
correct; the AM CVn binary's accretion stream is animated and its info panel
plays a synthesized gravitational-wave chirp with the real
f ∝ (1−t/tc)^(−3/8) law; the monitor at depth 5 runs a little draggable-window
OS with a working toy terminal.

## Editing content

- **Portfolio content** — edit `src/content/portfolio.json`. Panels, BaileyOS,
  terminal files, and the plain page all consume this source.
- **Plain page** — `npm run generate:about` regenerates `about.html`; dev and
  production builds run this automatically.
- **Resume** — replace `public/resume.pdf`.
- **Terminal behavior** — `src/ui/fake-os/terminal.ts`.

## Adding a scene

A scene = one module in `src/scenes/` exporting `create(assets)` (and an async
`load()` if it needs textures) + an entry in
[src/scenes/registry.ts](src/scenes/registry.ts) with a `restPose` (focus,
camera direction, 16:10 frame width, fov) and an `anchor` for where the next
scene nests. Keep `K = parentFrame / (childFrame × anchor.scale)` between ~10
and ~30, and make whatever the parent draws at the anchor match the child's
appearance at swap scale (the parent's stand-in goes in `childProxy`).

## Deploying

Push to `main` → `.github/workflows/deploy.yml` builds and publishes to GitHub
Pages. One-time setup: **Settings → Pages → Source: "GitHub Actions"**.

Deep links: `/#/stanford`, `/#/galaxy/am-cvn`, etc. `/about.html` is the
plain fallback (also shown to no-WebGL visitors).

## Credits

Milky Way panorama © ESO/S. Brunier (CC BY 4.0) · planet textures ©
Solar System Scope (CC BY 4.0) · star catalog: HYG Database (CC BY-SA 4.0) ·
Earth day/night imagery: NASA.
