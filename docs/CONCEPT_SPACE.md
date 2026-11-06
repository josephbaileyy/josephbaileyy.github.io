# Concept space: method and evaluation

`/learning/space/` shows the STATS 310A / MATH 230A curriculum as a network of 94
canonical concepts with 190 typed mathematical relations, projected into a sphere.
This note explains what the geometry means, how it is computed and what it does
not show. The numbers below come from `npm run evaluate:concepts`, which runs the
same code the browser runs (`v4/js/concept-space/model.js`).

## Data

`v4/public/learning/data/concepts.stats310a.public.json` is generated in the
private ledger by `scripts/concept_atlas.py --public`. It contains only curriculum
structure: concepts, aliases, original short summaries, source locations (Dembo
subsections, lecture-note headings, syllabus weeks, homework chapters), typed
relations with provenance and confidence, three similarity channels, and a review
set. It contains no scores, assessments, session evidence or ledger topic links.
Every relation was proposed by an agent on 2026-11-06 and is marked `proposed`
until a person verifies it.

A private evidence overlay can be generated in the ledger and opened from disk in
the page. It is read in the tab, held in memory, and never fetched or stored.

## Three channels

For concepts _i_, _j_ each channel is a nonnegative, positive-semidefinite
similarity in [0, 1] with S<sub>ii</sub> = 1.

| Channel                    | Built from                                                                                                                                                                                                                                              | Measures                                      | Does not measure                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Language S<sup>sem</sup>   | TF-IDF (sublinear tf, unigrams + ½-weight bigrams, name and aliases double-weighted, Unicode math mapped to words) over each concept's own name, aliases and summary; cosine                                                                            | shared distinctive vocabulary                 | dependence, proof structure                            |
| Structure S<sup>math</sup> | each concept's relation profile: itself (weight 1) plus each related concept weighted by type weight × confidence (prerequisite 1, used in proof 0.9, generalizes 0.9, equivalent 1, application 0.7, shared structure 0.5, counterexample 0.5); cosine | direct links and shared link partners (2-hop) | direction (kept separately), anything not yet authored |
| Syllabus S<sup>src</sup>   | Gaussian bumps over Dembo reading order (bandwidth 0.6 subsections) and lecture-heading order (bandwidth 1 heading), plus syllabus week and homework-chapter indicators, block-normalized and weighted 1 : 1 : ½ : ½; cosine                            | when and where the course treats it           | prerequisite order                                     |

**Normalization.** Each channel is divided by its _strong-neighbour scale_
m<sub>c</sub>, the mean over concepts of the five largest off-diagonal similarities
(semantic 0.31, math 0.43, source 0.72). The combined affinity is

W<sub>ij</sub> = α S<sup>sem</sup><sub>ij</sub>/m<sub>sem</sub> + β S<sup>math</sup><sub>ij</sub>/m<sub>math</sub> + γ S<sup>src</sup><sub>ij</sub>/m<sub>src</sub>, with α + β + γ = 1.

So with equal weights a concept's typical strongest link pulls equally hard in
every channel, and a weight of 0.5 means "half the pull". Without this the
syllabus channel, whose raw values are large and blocky, dominates every mix.
W is a positive combination of PSD kernels, so it is itself a valid kernel: it is
the Gram matrix of an implicit high-dimensional feature map, which is the
"word2vec-like" representation being projected.

## Projections

- **PCA**: kernel PCA of W (double-centred, top three eigenvectors scaled by √λ,
  sign-fixed), rescaled so 95% of concepts lie within 0.9 R. Axes are the
  directions of largest variance.
- **Force**: deterministic seeded start in the ball; 360 steps of linear springs
  along each concept's six strongest affinities plus all authored relations,
  inverse-square repulsion between all pairs, cooling step size, projection onto
  ‖x‖ ≤ R (or ‖x‖ = R) after each step. Axes are arbitrary.
- **Hybrid** (default): the force model started from the PCA layout.
- **Foundations toward the centre** adds a radial spring to R(0.2 + 0.8 d/d<sub>max</sub>),
  where d is the longest chain of prerequisite / used-in-proof / application links
  ending at the concept (max 12, the CLT). This is a display choice.
- Every new layout is rotated (orthogonal Procrustes, no reflection) onto the
  previous one so moving a slider does not spin the picture. A 5-point change to α
  moves concepts by 0.09 R RMS.

A layout takes about 65 ms for 94 concepts on a laptop.

## Evaluation

kNN∩ is the mean Jaccard overlap between each concept's 8 nearest neighbours in
3D and its 8 most similar concepts in a channel (1 = identical neighbourhoods).
ρ is the Spearman correlation between 3D distance and dissimilarity (−S).
Relation stretch is mean 3D length of authored relations ÷ mean distance of all
pairs (lower = relations are short). Review pass counts review pairs whose 3D
distance lies in the nearest 20% ("near") or beyond the 35th percentile ("far").

| weights       | layout           | kNN∩ sem | kNN∩ math | kNN∩ src | kNN∩ W | ρ sem | ρ math | ρ src | relation stretch | review pass | PCA var |
| ------------- | ---------------- | -------- | --------- | -------- | ------ | ----- | ------ | ----- | ---------------- | ----------- | ------- |
| default       | pca              | 0.26     | 0.31      | 0.33     | 0.37   | 0.48  | 0.43   | 0.37  | 0.43             | 19/24       | 0.13    |
| default       | force            | 0.32     | 0.45      | 0.37     | 0.53   | 0.37  | 0.49   | 0.34  | 0.38             | 20/24       |         |
| default       | hybrid           | 0.33     | 0.47      | 0.34     | 0.54   | 0.40  | 0.52   | 0.29  | 0.36             | 22/24       |         |
| default       | hybrid + shells  | 0.33     | 0.46      | 0.34     | 0.54   | 0.37  | 0.51   | 0.25  | 0.38             | 22/24       |         |
| default       | hybrid (surface) | 0.31     | 0.42      | 0.33     | 0.49   | 0.41  | 0.48   | 0.28  | 0.37             | 22/24       |         |
| semantic only | pca              | 0.28     | 0.18      | 0.20     | 0.28   | 0.54  | 0.29   | 0.18  | 0.60             | 14/24       | 0.12    |
| semantic only | force            | 0.40     | 0.26      | 0.25     | 0.40   | 0.51  | 0.36   | 0.22  | 0.52             | 19/24       |         |
| semantic only | hybrid           | 0.40     | 0.27      | 0.24     | 0.40   | 0.55  | 0.38   | 0.24  | 0.51             | 19/24       |         |
| math only     | pca              | 0.18     | 0.34      | 0.21     | 0.34   | 0.31  | 0.44   | 0.21  | 0.44             | 18/24       | 0.14    |
| math only     | force            | 0.24     | 0.48      | 0.27     | 0.48   | 0.29  | 0.49   | 0.24  | 0.38             | 22/24       |         |
| math only     | hybrid           | 0.24     | 0.52      | 0.26     | 0.52   | 0.33  | 0.54   | 0.18  | 0.35             | 21/24       |         |
| source only   | pca              | 0.23     | 0.25      | 0.71     | 0.71   | 0.31  | 0.25   | 0.54  | 0.47             | 14/24       | 0.30    |
| source only   | force            | 0.24     | 0.28      | 0.75     | 0.75   | 0.17  | 0.20   | 0.48  | 0.57             | 13/24       |         |
| source only   | hybrid           | 0.23     | 0.26      | 0.77     | 0.77   | 0.22  | 0.24   | 0.70  | 0.52             | 13/24       |         |
| equal         | pca              | 0.25     | 0.27      | 0.42     | 0.39   | 0.47  | 0.38   | 0.47  | 0.44             | 15/24       | 0.14    |
| equal         | force            | 0.31     | 0.37      | 0.43     | 0.52   | 0.39  | 0.46   | 0.42  | 0.40             | 20/24       |         |
| equal         | hybrid           | 0.32     | 0.39      | 0.44     | 0.53   | 0.42  | 0.50   | 0.37  | 0.38             | 20/24       |         |

| pair                                                     | category          | expect | default/pca | default/force | default/hybrid | default/hybrid + shells | default/hybrid (surface) | semantic only/hybrid | math only/hybrid | source only/hybrid | equal/hybrid |
| -------------------------------------------------------- | ----------------- | ------ | ----------- | ------------- | -------------- | ----------------------- | ------------------------ | -------------------- | ---------------- | ------------------ | ------------ |
| fatou_lemma ~ dominated_convergence_theorem              | mathematical      | near   | 7 ✓         | 2 ✓           | 1 ✓            | 2 ✓                     | 3 ✓                      | 7 ✓                  | 1 ✓              | 0 ✓                | 1 ✓          |
| pi_lambda_theorem ~ uniqueness_of_measures               | mathematical      | near   | 5 ✓         | 1 ✓           | 3 ✓            | 0 ✓                     | 1 ✓                      | 2 ✓                  | 5 ✓              | 1 ✓                | 2 ✓          |
| holder_inequality ~ cauchy_schwarz_inequality            | mathematical      | near   | 0 ✓         | 2 ✓           | 1 ✓            | 1 ✓                     | 1 ✓                      | 0 ✓                  | 0 ✓              | 0 ✓                | 1 ✓          |
| levy_continuity_theorem ~ central_limit_theorem          | mathematical      | near   | 8 ✓         | 1 ✓           | 2 ✓            | 3 ✓                     | 3 ✓                      | 5 ✓                  | 2 ✓              | 32 ✗               | 5 ✓          |
| product_measure ~ fubini_tonelli                         | mathematical      | near   | 14 ✓        | 2 ✓           | 3 ✓            | 3 ✓                     | 3 ✓                      | 4 ✓                  | 3 ✓              | 7 ✓                | 2 ✓          |
| weak_law_of_large_numbers ~ strong_law_of_large_numbers  | semantic_distinct | near   | 0 ✓         | 1 ✓           | 1 ✓            | 1 ✓                     | 1 ✓                      | 1 ✓                  | 4 ✓              | 15 ✓               | 3 ✓          |
| convergence_in_probability ~ convergence_in_distribution | semantic_distinct | near   | 39 ✗        | 27 ✗          | 29 ✗           | 25 ✗                    | 23 ✗                     | 14 ✓                 | 23 ✗             | 99 ✗               | 23 ✗         |
| tail_sigma_algebra ~ tail_integral_formula               | semantic_distinct | far    | 32 ✗        | 58 ✓          | 41 ✓           | 67 ✓                    | 75 ✓                     | 93 ✓                 | 28 ✗             | 11 ✗               | 37 ✓         |
| kolmogorov_zero_one_law ~ kolmogorov_extension           | semantic_distinct | far    | 18 ✗        | 47 ✓          | 54 ✓           | 53 ✓                    | 47 ✓                     | 27 ✗                 | 55 ✓             | 8 ✗                | 29 ✗         |
| lebesgue_measure ~ dominated_convergence_theorem         | semantic_distinct | far    | 77 ✓        | 83 ✓          | 90 ✓           | 84 ✓                    | 67 ✓                     | 74 ✓                 | 64 ✓             | 67 ✓               | 92 ✓         |
| borel_sigma_algebra ~ borel_cantelli_first               | semantic_distinct | far    | 63 ✓        | 33 ✗          | 67 ✓           | 58 ✓                    | 90 ✓                     | 80 ✓                 | 52 ✓             | 90 ✓               | 56 ✓         |
| sigma_algebra ~ measurable_function                      | prerequisite      | near   | 22 ✗        | 9 ✓           | 8 ✓            | 7 ✓                     | 18 ✓                     | 21 ✗                 | 9 ✓              | 28 ✗               | 13 ✓         |
| characteristic_function ~ levy_continuity_theorem        | prerequisite      | near   | 10 ✓        | 1 ✓           | 3 ✓            | 4 ✓                     | 4 ✓                      | 2 ✓                  | 9 ✓              | 3 ✓                | 3 ✓          |
| borel_cantelli_first ~ strong_law_of_large_numbers       | prerequisite      | near   | 8 ✓         | 10 ✓          | 4 ✓            | 7 ✓                     | 12 ✓                     | 19 ✓                 | 6 ✓              | 10 ✓               | 12 ✓         |
| chebyshev_inequality ~ l2_weak_law                       | prerequisite      | near   | 19 ✓        | 3 ✓           | 3 ✓            | 5 ✓                     | 4 ✓                      | 2 ✓                  | 4 ✓              | 42 ✗               | 6 ✓          |
| uniform_integrability ~ vitali_convergence_theorem       | prerequisite      | near   | 11 ✓        | 1 ✓           | 0 ✓            | 1 ✓                     | 1 ✓                      | 2 ✓                  | 1 ✓              | 1 ✓                | 0 ✓          |
| fubini_tonelli ~ convolution                             | cross_chapter     | near   | 3 ✓         | 0 ✓           | 1 ✓            | 1 ✓                     | 0 ✓                      | 4 ✓                  | 0 ✓              | 5 ✓                | 0 ✓          |
| change_of_variables ~ characteristic_function            | cross_chapter     | near   | 10 ✓        | 8 ✓           | 4 ✓            | 6 ✓                     | 5 ✓                      | 9 ✓                  | 4 ✓              | 40 ✗               | 7 ✓          |
| borel_cantelli_first ~ probability_to_as_subsequence     | cross_chapter     | near   | 9 ✓         | 14 ✓          | 11 ✓           | 11 ✓                    | 16 ✓                     | 7 ✓                  | 6 ✓              | 5 ✓                | 9 ✓          |
| completion_of_measure ~ measurable_function              | source_only       | far    | 5 ✗         | 19 ✗          | 15 ✗           | 17 ✗                    | 21 ✗                     | 22 ✗                 | 16 ✗             | 11 ✗               | 22 ✗         |
| kolmogorov_zero_one_law ~ fubini_tonelli                 | source_only       | far    | 45 ✓        | 31 ✗          | 38 ✓           | 70 ✓                    | 65 ✓                     | 51 ✓                 | 38 ✓             | 6 ✗                | 20 ✗         |
| convolution ~ tail_sigma_algebra                         | source_only       | far    | 39 ✓        | 37 ✓          | 42 ✓           | 67 ✓                    | 55 ✓                     | 66 ✓                 | 38 ✓             | 10 ✗               | 36 ✓         |
| cdf_characterization ~ almost_sure_convergence           | source_only       | far    | 57 ✓        | 38 ✓          | 51 ✓           | 38 ✓                    | 56 ✓                     | 22 ✗                 | 37 ✓             | 42 ✓               | 57 ✓         |
| essential_supremum ~ convergence_mode_counterexamples    | source_only       | far    | 38 ✓        | 40 ✓          | 45 ✓           | 37 ✓                    | 42 ✓                     | 9 ✗                  | 42 ✓             | 18 ✗               | 40 ✓         |

## What the geometry shows

**It is not "just text", but the structure it shows is authored, not discovered.**

1. _The space is genuinely high-dimensional._ The combined kernel's participation
   ratio is about 51; 19 dimensions hold half its variance and 46 hold 80%. Three
   PCA axes keep only 13%. The 3D picture is a heavy compression: at default
   weights only about half of each concept's eight true nearest neighbours (kNN∩ W
   = 0.54 for Hybrid, 0.37 for PCA) are also its nearest in 3D. Read local
   neighbourhoods, not global distances.
2. _Language alone produces the expected false neighbours._ With semantic weight
   only, Kolmogorov 0–1 law ~ Kolmogorov extension and essential supremum ~
   convergence counterexamples land among the nearest 9–27% of pairs, and the
   highest-similarity unrelated pairs (no authored relation at all) include
   density-weighted measure ~ convolution, Scheffé ~ Slutsky and σ(X) ~
   independence. Adding the structure channel separates them; the default Hybrid
   layout places the Kolmogorov and tail pairs beyond the 40th percentile.
3. _Language and structure are strongly correlated here, partly by construction._
   Spearman(semantic, math) = 0.36. Of 100 most textually similar pairs, 81 share
   relation partners and 52 are directly related; 63% of directly related pairs are
   in the top 10% of textual similarity. One reason is mathematical: related
   concepts share objects and notation. Another is an artefact: the same agent
   wrote the summaries and the relations, and summaries often name their own
   prerequisites ("proved by applying Fatou"). The independence of the two
   channels is therefore overstated until relations are verified or summaries
   rewritten from the student's own notes.
4. _Structure catches what text misses._ The highest structural similarities with
   near-zero textual overlap are foundational uses: expectation ~ Hölder /
   Cauchy–Schwarz / Jensen / variance, Jensen ~ Lp, CLT ~ characteristic-function
   moments, DCT ~ Lévy inversion. These are exactly the cross-topic dependencies
   an exam tests and a keyword map would never draw.
5. _Syllabus proximity is a different geometry._ A syllabus-only layout recovers
   the course order (kNN∩ src 0.77, PCA keeps 30% variance because order is nearly
   one-dimensional) but fails cross-chapter mathematics: Lévy continuity ~ CLT, and
   Chebyshev ~ L² weak law, fall to the 32nd and 42nd percentiles because they are
   taught weeks apart. Source adjacency is not dependence.
6. _Force-based layouts serve the mathematics better than PCA._ At default
   weights Hybrid passes 22/24 review pairs against PCA's 19/24 and agrees more
   with the structure channel (kNN∩ 0.47 vs 0.31). PCA is still useful: its axes
   are interpretable and it shows the chapter-level arrangement that the force
   refinement keeps.

### Known distortions and doubtful review labels

- _Convergence in probability ~ convergence in distribution_ is expected near but
  sits at the 23rd–29th percentile in most layouts: the structure channel links
  them only through a single "application" edge, and distribution-side concepts
  cluster with Chapter 3. Likely a missing relation (e.g. Slutsky, Skorokhod
  links to probability-mode results), not a mistake in the geometry.
- _Completion of a measure ~ measurable function_ is labelled "source-only, far"
  but is near everywhere. Completion has only two structural links and sits
  near the σ-algebra cluster in all three channels. This label is probably wrong:
  completion does bear on measurability of functions (a.e.-defined limits).
- _Essential supremum ~ convergence counterexamples_ is two structural hops apart
  (via Lp space and Lp convergence), so "far" was a miscalibrated expectation.
- Surface mode forces every concept onto ‖x‖ = R; foundational hubs that sit near
  the centre in the ball are pushed outward and neighbourhoods degrade slightly
  (kNN∩ W 0.49 vs 0.54). It is experimental.
- Depth shells are arranged by the longest authored dependency chain, so they
  inherit any missing or extra prerequisite links.

## Limitations

- All 190 relations and all summaries are agent-proposed. Until verified, the
  structure channel encodes a plausible textbook dependency graph, not the course
  as taught. Use it to find relations to check, not as an authority.
- Only STATS 310A is indexed. Cross-course links (for example characteristic
  functions ↔ Fourier analysis and contour integration in MATH 116) are not yet
  representable and do not appear.
- Homework links are at chapter-section granularity (HW2 draws on §1.2.\*), not per
  exercise.
- Labels are greedy and can hide each other in dense regions; the List view and
  search are the complete, keyboard-accessible alternative. Without WebGL the page
  falls back to a flat, rotatable SVG projection of the same layout.
- The three.js chunk is about 140 kB gzipped (the same `three` chunk as the site's
  other 3D pages); the page script is 16 kB and the data 35 kB gzipped.

## Extending to the other courses

1. Add `knowledge_graph/concepts/<course>.json` and its id registry in the ledger,
   reusing the curriculum heading ids and each course's source registry (Stein &
   Shakarchi, Dummit & Foote, Schwartz / Tong). Start from lecture headings; aim
   for 50–100 concepts per course.
2. Put shared concepts (dominated convergence, power series, Fourier transform,
   group actions, Green's functions) in a course-neutral namespace and list their
   courses, so one node can carry several source locations.
3. Add a `cross_course` relation family that is always proposed until verified,
   with the review set extended by known cross-course pairs (characteristic
   function ↔ Fourier transform, Lévy inversion ↔ contour integration, Gaussian
   integrals ↔ QFT path integrals).
4. Generalize the source channel per course (each course's own reading and
   lecture order) and make it zero across courses, so cross-course proximity can
   only come from language or structure.
5. At around 400 concepts the dense Jacobi eigen-solver (O(n³), roughly 3–5 s in
   the browser) should be replaced by Lanczos for the top three eigenvectors, and
   the all-pairs repulsion by Barnes–Hut or a precomputed layout per preset.
6. Replace agent-written summaries with excerpts of the student's own notes
   processed locally (TF-IDF or a local sentence-embedding model run in the private
   pipeline), so the language channel stops sharing an author with the structure
   channel.

## Running it

```sh
npm run dev                      # http://localhost:5177/learning/space/
npm run evaluate:concepts        # regenerate the tables above
npm run build && npm run preview
npm run test:e2e:concepts        # browser checks (desktop, mobile, no-WebGL, overlay)
```

To regenerate the data, run in the private ledger:

```sh
python3 scripts/concept_atlas.py --public ../josephbaileyy.github.io/v4/public/learning/data/concepts.stats310a.public.json
```
