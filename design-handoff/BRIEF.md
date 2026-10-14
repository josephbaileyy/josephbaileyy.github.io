# Personal website: context

Updated 2026-10-13. This file is background for anyone (human or Claude) working on the site. It sets facts and constraints, not a visual direction. Jo prefers the current look of the deployed site (`v4/`), and new ideas are welcome.

## Who and for whom

- **Joseph (Jo) Bailey.** Stanford coterm, Physics B.S. and CS M.S. (AI track), graduating June 2027.
  - Research: OmniFold (ML unbinned unfolding) on MINERvA neutrino data, with Prof. Benjamin Nachman.
  - Also: X17 Gaussian-process bump hunting at Jefferson Lab (APS Far West talk), SLAC collider ML, AM CVn photometry, Caltech LIGO.
  - Outside research: D1 400m hurdler and pianist/saxophonist.
- **Audience this year:** physics PhD admissions, potential supervisors, and UK scholarship panels. They should know who Jo is and what he works on within a few seconds, and curiosity should be rewarded.
- **Site:** josephrbailey.com, served from this repo via GitHub Pages. The page is in `v4/`; see `README.md` and `v4/README.md`.

## Physics honesty (hard constraints for any demo or figure)

Unfolding recovers *distributions*, not individual events or images. These points come from earlier experiments and still apply:

- Do not present a demo as deblurring or restoring a photo. It can't remove statistical noise, and more iterations are not monotonically better.
- Binning is not resolution.
- OmniFold reweights simulation. It never samples from the truth, so the result depends on the starting simulation and its support. Where the prior has no events, the answer is prior only.
- A uniform prior on a pixel image makes the prior do no work, so the demo reads as plain deconvolution. Use a prior with structure.
- Hurdling is not an unfolding demo. One race is one event; unfolding needs distributions. Don't fabricate many races.
- Every chart shows real data or says it is a schematic. Real data currently on the site: ACC 2025 splits (`v4/public/data/acc-2025-400mh-splits.csv`) and the AM CVn light-curve fit.
- State simplifications on the page (no acceptance or backgrounds, 2D only, histogram vs. neural-network classifier, etc.).
- Don't invent facts. Placeholders like `[link]` are fine.
- Respect `prefers-reduced-motion`; motion should carry information.

## Open questions

- Should the unfolding figure stay inside the list (current), or become more prominent?
- A second demo? Candidates: prior swap with a systematic band (same data, three priors, plus where they disagree), a draggable acceptance hole showing "prior only," a pick-when-to-stop mode that reveals bias and variance, or a 2D neutrino toy (E_ν vs. muon angle with invisible hadronic energy), which is closest to Jo's real research.
- Fact checks still pending: "2026–, with Ben Nachman" and the photo caption date.

## Reference material in this folder

- `prototype/`: standalone prototype of an earlier OmniFold toy (`omnifold-toy.js`). Serve over http: `cd design-handoff/prototype && python3 -m http.server 8000`.
- `reference/`: numpy reference for that toy, its output, and screenshots.
- `data/`: ACC 2025 400m hurdles splits.
