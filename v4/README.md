# Current portfolio

The deployed site is the list-first homepage in this directory. `lab/index.html`
preserves the earlier interactive collision chamber. Older versions at the repository
root, `v3/`, and `worldline/` are not the deployed homepage.

From the repository root:

```sh
npm run dev       # http://localhost:5177
npm run build     # v4/dist, both the homepage and /lab/
npm run preview   # http://localhost:4177
npm test
npm run lint
npm run test:e2e  # run with the preview server already running
npm run test:e2e:lab
```

The homepage is rendered at build time by `content/home.js`. Each research item
has a one-sentence summary and a linked title. Native “Details and links”
disclosures preserve the full contribution, evidence, and supplementary figures.
Three projects are featured; the remaining four are under “More projects.” All
records and disclosures work without JavaScript. Hash links open any enclosing
disclosures when JavaScript is available. The homepage loads no Three.js or Rapier.

## Content and assets

- `content/research.js`, `projects.js`, `experience.js`, and `education.js` hold
  the existing records. `content/home.js` supplies concise homepage contributions,
  the two-sentence introduction, and the educational explanation. Keep both in sync
  when changing facts. Research dates come from the shared records; project dates
  are omitted where none have been supplied.
- `public/papers/` and `public/resume.pdf` are the directly linked evidence.
- `public/img/home/with-camera.jpg`, `amcvn-fit.png`, and
  `public/img/unfolding/face2024.png`, `face2025.png` were copied unchanged from
  the user-supplied design handoff. The camera photo remains the social preview.
- The header Instagram carousel uses `content/instagram.js` and local covers in
  `public/img/instagram/`, saved from the public @josphbailey profile on October 7, 2026. This is a curated snapshot, not an automatically synchronized feed. To add
  posts, save their covers as `<post-id>.jpg` and add their ID, date, label, and alt
  text to the records. Images and “View post” links open the original Instagram
  post in a new tab, where visitors can view its full album. Arrow buttons and
  keyboard Left/Right cycle through posts with wraparound; without JavaScript,
  the first post and profile links remain usable. No Instagram script, token, or
  third-party widget service is loaded.
- `public/data/acc-2025-400mh-splits.csv` is copied unchanged from the supplied
  recorded splits. Both the static plot and its accessible data table derive from
  that file at build time. Speeds use differences of cumulative times and nominal
  hurdle distances; they are interval averages.
- The homepage uses native system sans-serif fonts for text, navigation, and plots,
  without requesting a webfont. Its compact header carousel and three curated
  photos under “Outside research” share the existing local Instagram covers.
  Source Serif 4 assets and their SIL Open Font License remain in `public/fonts/`
  for future typography comparisons. The legacy lab retains its original fonts
  and licenses.

## Educational toy

“What is unfolding?” offers two versions for comparison: a static three-stage
schematic and a nested “Try the interactive version” disclosure. The schematic
is illustrative, not measured data or a calculated unfolding result. The toy
loads only when its own disclosure opens, uses one main step slider, and shows
measured data, current estimate, and known synthetic target side by side. The
three canvases use identical display binning and dot-area scale. Prior selection
and effective sample size are under “Change the starting simulation.”

`js/demos/omnifold-engine.js` adapts the supplied prototype, preserving the seeded
samples and two smoothed density-ratio steps. It reweights simulated events; it
does not restore individual photographs or recover event-by-event truth. The
histogram surrogate is binned and regularized, not the neural-network implementation
used in the research. Acceptance, inefficiency, backgrounds, detector-model
variations, and uncertainty estimation are excluded and stated on the page.

The toy starts at iteration zero with no autoplay. One display scale is shared by
both priors and all iterations, with the largest dots capped. Effective sample
size describes weight concentration, not accuracy. This work adds no prior ensemble,
uncertainty band, or neutrino toy.
