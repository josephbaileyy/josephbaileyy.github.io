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
Three projects have visual previews; the remaining three are under “More projects.” Notes are temporarily hidden from the homepage and shared navigation; their existing URLs and Markdown sources remain available. Experience, coursework, and honors live on `/about.html`. Old experience and education anchors redirect there. All
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
  `public/img/projects/splora-chart.webp` and `lord-model.webp` are complete,
  high-resolution crops of the original poster figures, linked to the full PDFs.
  `public/img/projects/lord-architecture.svg` reflows that same architecture into
  two rows for the LoRD thumbnail: per-frame DINO encoding above temporal
  aggregation, BNNeck, and cosine retrieval. The original labels and options
  are retained. Thumbnail frames preserve each figure's aspect ratio. The soccer graph
  is an explicitly labelled illustrative SVG, not measured model output.
- Add Markdown notes under `src/content/notes/`, with `title`, `date`, and `summary`
  frontmatter. `content/notes.js` shares the existing Markdown renderer with the
  archived universe's generator. At Vite startup, `content/note-pages.js` prepares
  every note's HTML entry and the sitemap. Notes appear on the notes index
  automatically and are rendered into the production build. Generated note HTML
  wrappers under `notes/` should be committed along with their Markdown source.
  The existing universe write-up is labelled as archived so it does not describe
  the new homepage as the older 3D experience.
- The music card links to the user-supplied Chino Hills HS 2023 indoor drumline
  show and includes the confirmed piano performance of Bach's Fugue No. 2 in
  C minor, BWV 847 (The Well-Tempered Clavier, Book I). The native audio player
  uses `public/audio/fugue.m4a` with `preload="none"` and no autoplay.

## Educational toy

“What is unfolding?” includes the static schematic and a lazy-loaded interactive
experiment. The interface has just two examples, one Play/Pause/Replay button,
and an iteration slider. Four images show the weighted estimate and reference
truth before the detector, with simulated detector output and measured data
below. Reference truth is always visible for comparison and never used to fit.
The event, histogram, per-step, and extra settings interfaces have been removed.
Method details are collapsed by default. Playback starts only on request, pauses
when its disclosure or enclosing disclosure closes, and pauses when the page is
hidden. Switching examples resets to the starting simulation.

`js/demos/unfolding.js` renders the images from `js/demos/omnifold-replay.js`.
The default is a three-color illustration of a hurdler. Its 100,000 simulated
event pairs and 100,000 synthetic data events have two position coordinates and
a categorical color feature. The detector adds Gaussian position noise (width
0.040) and misidentifies color with probability 0.20, selecting either other
category equally. The mild response uses width 0.015 and confusion probability
0.08. A shifted, broadened, recolored prior has full support and overlaps the
target. The interface offers two fixed examples: this distorted hurdler with the
stronger response, and the original-color intensity portrait with mild blur and
color confusion. Green, terracotta and ochre denote event categories, not learning stages.

`public/data/unfolding/` contains four version-2 color exports (`hurdler`/`flat`
and `015`/`040`) and the previous version-1 photo exports. The portrait preset
uses the intensity-channel model (`photo-intensity-015`, version 2). Other
response strengths, the uniform prior, continuous RGB (`photo-rgb`, version 3),
and grayscale (`photo`, version 1) exports remain for reference, but are not
choices in the interface.
Every experiment has 12 full iterations. Two separate neural-network
classifiers implement detector-space density-ratio estimation and truth-space
reweighting. Every iteration exports three beats: detector reweight, pairwise
pullback, truth learning/push. Two deliberately coincident truth events have
different detector outcomes, so their detector weights can differ while the
truth classifier assigns them the same weight.

The browser replays the computed weights and interpolates between beats for
motion. It does not retrain models, move the events, or use hidden truth to fit.
The completed-iteration slider selects full iterations. The portrait plays to its
independent-detector-validation stopping point (iteration 3); the hurdler shows
all 12 iterations. All exported later frames remain available for scientific
checks and reference, outside the visitor interface.
`unfolding-density.js` applies the same small, separable smoothing filter, fixed
tone curve (power 0.7), and saturation cap to every panel and iteration. It mixes
the three palette colors in proportion to their weighted density; it never uses
the reference to render a simulation estimate. Display scale is 0.0007 per
96×96 cell for color and 0.00175 per 64×64 cell for portraits. The reference projection utility sums channels for x/y or displays three masses
for color; these display bins do not feed the classifiers. All event features remain fixed, including both truth and
detector colors; weights change the joint distribution rather than recoloring
individual events. The exports retain a 2,048-event subset for inspecting paired weights; image
summaries use all events. Images crop
to [0,1]², while all detector outcomes enter training.

The original-color portrait now uses a joint (x, y, color-channel) density.
Each photo's three nonnegative RGB planes are normalized together, so their
relative color intensities are part of the learned distribution. The source
photo has simulated channel gains [0.80, 1.00, 1.20] and 5% uniform support;
no target pixels determine this prior. 995,328 stratified simulation points
cover all 96×96×3 cells, with initial importance weights from the source density.
The measured sample contains 995,328 unit-weight events sampled from the target
density and passed through the same detector response as the simulation.
Spatial blur widths are 0.040/0.015 and channel-confusion probabilities 0.35/0.15.
A mistaken channel is replaced by either other channel equally. This coupling
requires iterative correction of the deliberate color-calibration bias.

At each of the two learning steps, three independently initialized 128×128
SiLU classifiers are trained, then their class probabilities are averaged before
converting to a ratio. Fourier position frequencies are 1, 2, 4, 8, 16, 32; channel
inputs are one-hot. Adam uses learning rate 0.0015,
up to 1,000 steps in iteration 1 and 500 later, batch size 8,192, and checkpoint
early stopping. Logits are clipped to [-4,4] before ensemble probability
averaging. The 60/20/20 split separates training, checkpoint validation, and
independent detector stopping diagnostics. The suggested iteration is the
first completed iteration within 0.002 TV of the best independent detector
score, measured in 24×24×3 cells on [-0.2,1.2]², including smeared tails.
This predeclared toy heuristic is not an uncertainty estimate or a universal
OmniFold stopping rule. Hidden truth does not choose checkpoints or stopping.

The intensity export has three probability-density planes, not conditional RGB
moments. The renderer convolves each plane with one fixed seven-tap filter (approximately 1.3 display cells wide) and
adds the weighted red, green, and blue intensities with an opaque alpha channel.
One brightness scale, derived solely from the original source photo's total
intensity, is held fixed across panels and iterations. Clipping is the usual
RGB display limit. The target is therefore displayed at the same integrated
brightness as the source; no target-dependent brightness or sharpening is
applied to the estimate. Stratification reduces simulation display noise without
moving events. The starting-simulation toggle changes only the displayed image.

The RGB portrait is trained on one million simulation events and one million
synthetic data events, using the original `face2024.png` and `face2025.png`.
An event has `(x,y,r,g,b)` features. Positions are uniform within the image;
truth RGB values have narrow Gaussian noise (width 0.02) around the original
pixel colors. Simulation starts from the older photo, with 55% of events drawing
color from random pixels in that same older photo. An independent 5% uniform-RGB
component and RGB jitter (width 0.06) provide broad support. No target colors
enter construction of the starting simulation. Detector noise is 0.015/0.040
in position and 0.045/0.090 in each RGB channel, clipped to [0,1].

Version-3 image grids contain event mass and three sums of weight times RGB,
not four probability channels. Rendering smooths those sums and divides by mass
to show the conditional mean color, with opaque pixels where events exist.
The same fixed display smoothing applies to simulation, data, and reference;
it never blends in the target. Spatial histograms use the mass plane alone.
RGB intensity histograms use separate 64-bin summaries of all events, including
detector events outside the spatial image window. Event pairs keep all five
features per level, including identical truth features for the two twins.

Reproduce the exports from the repository root with a Python environment containing
NumPy, Pillow, SciPy and PyTorch:

```sh
python v4/scripts/train-intensity-unfolding.py --sigma .015 --device mps
python v4/scripts/train-intensity-unfolding.py --sigma .040 --device mps
python v4/scripts/train-rgb-unfolding.py --sigma .015 --device mps
python v4/scripts/train-rgb-unfolding.py --sigma .040 --device mps
python v4/scripts/train-color-unfolding.py --sigma .040 --prior hurdler
python v4/scripts/train-color-unfolding.py --sigma .040 --prior flat
python v4/scripts/train-color-unfolding.py --sigma .015 --prior hurdler
python v4/scripts/train-color-unfolding.py --sigma .015 --prior flat
python v4/scripts/train-unfolding.py --sigma .040 --prior photo --steps 240
python v4/scripts/train-unfolding.py --sigma .055 --prior photo --steps 240
python v4/scripts/train-unfolding.py --sigma .055 --prior uniform --steps 240
python v4/scripts/train-unfolding.py --sigma .015 --prior photo --steps 240
python v4/scripts/train-unfolding.py --sigma .015 --prior uniform --steps 240
```

The RGB recipe uses two 128-unit SiLU hidden layers, Fourier features of position
and RGB, Adam at 0.0015, up to 600 optimizer steps in the first iteration and 300
later, and held-out BCE checkpoint selection. The local GPU is used by default;
`--device cpu` supports systems without Apple's MPS backend. Metadata records
conditional RGB RMSE for display diagnostics only. It does not choose models or
iterations from reference-image agreement. Floating-point GPU results may differ
slightly across systems. The grayscale comparison has 40,000 events per sample.

The seed is 714. Networks have Fourier position features and two SiLU hidden
layers: 96 units plus one-hot color inputs for the illustration, 64 units for
the portrait. The color trainer uses at most 360 optimizer steps per classifier
in the first iteration, 180 later, with validation early stopping; the portrait
uses 240/120. Weighted binary cross entropy, held-out validation early stopping, and
clipped log-ratios bound classifier capacity and extreme weights. Both classifier
copies of each truth event stay in the same train/validation split. Normalization
keeps mean simulation weight at one. Metadata records losses, training steps,
effective sample size, descriptive smoothed histogram distances and the binary
buffer's SHA-256 digest. Reference-distance diagnostics are computed only for
export; model selection uses validation loss. The default's first iteration
accounts for about 54% of its 12-iteration reduction in the descriptive smoothed
joint-distribution distance. This is a toy diagnostic, not a measure of accuracy
or a training target. The remaining difference is visible rather than replaced
by the reference at the end of playback.

Playback starts only with Play and stops on closing either enclosing disclosure
or hiding the browser tab. Initial-data failures allow a retry; settings failures
preserve the current experiment and allow retrying the requested configuration.
The toy is synthetic, with position/color features: acceptance losses, backgrounds,
uncertainties and real MINERvA events are excluded. Later iterations can amplify
sampling and classifier fluctuations; no perfect recovery or monotonic improvement
is claimed.

The former histogram-ratio engine (`js/demos/omnifold-engine.js`) and July 16
presentation adaptation (`js/demos/unfolding-iteration.js`) remain as reference
implementations. The shared interactive experiment uses the neural classifier
exports instead.
