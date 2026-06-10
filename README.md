# josephbaileyy.github.io — a zoomable universe

A personal site that zooms from the Milky Way down to my desk, Powers-of-Ten style:

```
galaxy → solar system → Earth → Stanford → my room → my computer screen
```

Built with Vite + TypeScript + SVG. No frameworks, zero runtime dependencies.

## Run it

```bash
npm install
npm run dev      # local dev server
npm test         # zoom-math invariant tests
npm run build    # production build to dist/
```

## How it works

The whole camera is one number: `depth ∈ [0, 5]`. `floor(depth)` is the current
scene, `frac(depth)` is the transition into the next. At most two scenes render
at once; each one's CSS transform is recomputed fresh from `depth` every frame,
so per-scene scale stays bounded and there is no floating-point blowup, ever.
Each scene declares a 16:10 "child anchor" rect — at transition end the child
scene fits that rect exactly, so handoffs are seamless by construction.
The math lives in [src/engine/transforms.ts](src/engine/transforms.ts).

## Editing content (do these!)

Placeholders are marked `TODO(joseph)` in the code and rendered as dashed gold
boxes on the site:

- **Resume** — replace `public/resume.pdf` with your real resume.
- **Email + GitHub links** — `src/ui/screen-ui.ts` and `about.html`
  (`hello@example.com` is a placeholder).
- **AM CVn project details** — `src/content/panels.ts`.
- **Bio / projects / interests** — `about.html`.

## Adding a scene or hotspot

A scene = one SVG + one entry in [src/scenes/registry.ts](src/scenes/registry.ts).

- Author SVGs at **1600×1000**. Edit in Figma/Inkscape or by hand.
- The parent scene needs a `<rect id="anchor-…">` with a **16:10 aspect ratio**
  marking where the child scene emerges. Smaller rect = stronger zoom
  (ratio K = 1600 / rect width; keep K between ~10 and ~20).
- Whatever sits at the *center* of the anchor should visually match what sits
  at the *center* of the child scene (the galaxy's anchor star becomes the
  solar system's sun) — that's what sells the transition.
- Hotspots are shapes with an `id`, registered in the manifest as either
  `{ type: 'zoom', dir: 'in' }` or `{ type: 'panel', panelId: '…' }`.
  Panel content lives in `src/content/panels.ts`.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. One-time setup in the repo:
**Settings → Pages → Source: "GitHub Actions"**.

URLs are shareable deep links: `/#/stanford`, `/#/galaxy/am-cvn`, etc.
`/about.html` is the plain, no-JS version of the site.
