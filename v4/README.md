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

The homepage is rendered at build time by `content/home.js`. Research contributions,
dates, and evidence links are visible without opening a disclosure or enabling
JavaScript. Native disclosures reveal the optional unfolding toy, the AM CVn
figure, recorded hurdle splits, and coursework. The homepage loads no Three.js or
Rapier; the toy code and images load only after opening its explanation.

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
- Source Serif 4 is self-hosted in `public/fonts/`, with the SIL Open Font License
  in `LICENSE-SOURCE-SERIF-4.txt`. Font files came from Google Fonts; the license
  came from the Google Fonts Source Serif 4 directory. The legacy lab retains its
  original fonts and licenses.

## Educational toy

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
