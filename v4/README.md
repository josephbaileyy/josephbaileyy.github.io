# Current portfolio

The current site has an editorial homepage, an About page, and Markdown-backed Notes in this directory. `lab/index.html`
preserves the earlier interactive collision chamber. Older versions at the repository
root, `v3/`, and `worldline/` are not the deployed homepage.

From the repository root:

```sh
npm run dev       # http://localhost:5177
npm run build     # v4/dist, home, About, Notes, and /lab/
npm run preview   # http://localhost:4177
npm test
npm run lint
npm run test:e2e  # run with the preview server already running
npm run test:e2e:coursework # coursework filters, colors, and no-JavaScript fallback
npm run test:e2e:lab
```

The homepage is rendered at build time by `content/home.js`. Each research item
has a one-sentence summary and a linked title. Native “Details and links”
disclosures preserve the full contribution, evidence, and supplementary figures.
Three projects have visual previews; the remaining four are under “Four more projects.” Experience, coursework, and honors live on `/about.html`. Old experience and education anchors redirect there. All
records and disclosures work without JavaScript. Hash links open any enclosing
disclosures when JavaScript is available. The homepage loads no Three.js or Rapier.

The About page course atlas contains all 57 distinct courses and 61 enrollments from
the October 10, 2026 transcript. `content/coursework.js` holds full titles, shortened
tile titles, quarters, units, subject groupings, and related work; it contains no grades
or student identifiers. Status is a dated snapshot, so update the quarter metadata
when the current courses finish. `content/course-colors.js` pairs every color with a
label in one shared legend per area. The five area tabs are the only controls.
Display titles use sentence case, preserving proper names, acronyms, and Roman numerals.
Bubbles flow from the left with even gaps, in order of each course's first quarter.
Tiles show a course code and title, soft full-surface subject tint, an in-progress dot when applicable,
and a 4-by-3 quarter grid: academic years run left to right from 2023–24 through
2026–27, while Autumn/Winter/Spring run top to bottom. Each recorded enrollment
fills one cell. Compact bubbles place the code, title, and quarter grid in one row;
long titles wrap within the available width. Tiles are static list items; they do not expand and contain
no unit counts. Full titles are available as native hover text, and exact quarter
names remain in screen-reader text. Without JavaScript, all five areas remain
available. AP credit is listed separately without units.

## Content and assets

- `content/research.js`, `projects.js`, `experience.js`, and `education.js` hold
  the existing records. `content/home.js` supplies concise homepage contributions,
  the homepage layout and educational explanation. `content/personal.js` holds editable first-person introduction and music copy. Keep both in sync
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
- The main pages use local Outfit for headings and a native system sans-serif stack
  with Google Sans Flex as a fallback for text, navigation, and plots. Dates and code
  use Google Sans Code. These match the font families on tania.dev (checked October 10, 2026). No remote font service is requested. Licenses
  remain in `public/fonts/`; the legacy lab keeps its own typography.
- Instagram photos appear only inside the header widget. The track card uses
  `public/img/home/track-start.png`, copied unchanged from the supplied image. Project previews
  `public/img/projects/splora-chart.webp` and `lord-model.webp` are excerpts from
  their respective local posters, linked to the complete PDFs. The soccer graph
  is an explicitly labelled illustrative SVG, not measured model output.
- Add Markdown notes under `src/content/notes/`, with `title`, `date`, and `summary`
  frontmatter. `content/notes.js` shares the existing Markdown renderer with the
  archived universe's generator. At Vite startup, `content/note-pages.js` prepares
  every note's HTML entry and the sitemap. Notes appear on the homepage and index
  automatically and are rendered into the production build. Generated note HTML
  wrappers under `notes/` should be committed along with their Markdown source.
  The existing universe write-up is labelled as archived so it does not describe
  the new homepage as the older 3D experience.
- The music card links to the user-supplied Chino Hills HS 2023 indoor drumline
  show and includes the confirmed piano performance of Bach's Fugue No. 2 in
  C minor, BWV 847 (The Well-Tempered Clavier, Book I). The native audio player
  uses `public/audio/fugue.m4a` with `preload="none"` and no autoplay.

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
