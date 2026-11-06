# Concept space: method and evaluation

`/learning/space/` shows the STATS 310A / MATH 230A curriculum as 94 canonical
concepts linked by 224 typed mathematical relations, projected into a sphere. This
note explains where the relations come from, what the geometry means, and what it
does not show. The tables come from `npm run evaluate:concepts`, which runs the
same code as the browser (`v4/js/concept-space/model.js`).

## Where the relations come from

The concept graph is built in the private ledger (`scripts/concept_atlas.py`).
Each relation is either an agent proposal or extracted from a source, and every
relation carries the evidence found for it:

| Support       | Meaning                                                                                         | Count | Weight in the map |
| ------------- | ----------------------------------------------------------------------------------------------- | ----- | ----------------- |
| Dembo cites   | a numbered result in the Dembo notes cites the other result by number in its statement or proof | 69    | 1.0               |
| Dembo names   | the statement or proof names the other concept (e.g. "by Fatou's lemma")                        | 70    | 0.9               |
| Lecture notes | the student's typeset lecture notes mention it under the concept's heading                      | 21    | 0.85              |
| No source yet | an agent proposal that no source confirms                                                       | 64    | 0.5               |
| Verified      | confirmed by a person                                                                           | 0     | 1.0               |

190 relations were first proposed by an agent (Claude) from the lecture-note
headings, the Dembo subsection list and general mathematical knowledge. The
textbook, notes and homework were then checked locally, on the student's machine:

- **Dembo notes** (Apr 2019 edition, the numbering the 2026 homework uses):
  `pdftotext`, then a parser for numbered results and for "Theorem / Lemma /
  Proposition / … a.b.c" citations inside each statement and proof, plus counts of
  each concept's name patterns. Each concept is anchored to the numbered results
  that state it (80 of 94 concepts; e.g. dominated convergence → Theorem 1.3.34).
  Only ids, page numbers, short named-result titles and counts left the machine.
- **Lecture notes**: the student's typeset notes (lectures 1–8), excluding blocks
  marked "Added explanation" or "Added schematic", and recall questions.
- **Homework**: each assigned exercise is linked to the concepts its Dembo
  statement cites or names, plus the archived solution sheet when that sheet uses
  this term's numbering (6 of 8 sheets; hw2 and hw6 are renumbered and ignored).

Results: 126 of the 190 agent proposals (66%) found support. Unsourced proposals
are 20% of Chapter 1 relations but 49% of Chapter 2 and 43% of Chapter 3, because
the lecture notes stop at lecture 8 and the later chapters name results less often.
The citation index also produced 34 new relations the agent had missed (for example
Corollary 1.4.33 citing Definition 1.2.40, density → convolution; Lemma 1.1.31
inside the Kolmogorov extension proof). One proposed direction was wrong:
"density → change of variables" is the other way round (Corollary 1.3.62 cites
Theorem 1.3.61), and it has been corrected. A Dembo-cited link that would have
created a dependency cycle (lemma 3.1.6, a smoothing lemma inside the CLT
section, cited in proposition 3.2.18) was not added.

No relation is verified yet. The ledger writes a review queue
(`knowledge_graph/concepts/stats310a.review-queue.md`) sorted by how much each
relation shapes the map. Marking lines `[x]` or `[r]` and running `--apply-review`
records the reviewer.

## Three channels

For concepts _i_, _j_ each channel is a nonnegative, positive-semidefinite
similarity in [0, 1] with S<sub>ii</sub> = 1.

| Channel                    | Built from                                                                                                                                                                                                                                                      | Role                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Structure S<sup>math</sup> | each concept's relation profile: itself (weight 1) plus each related concept at type weight × confidence × support weight (prerequisite 1, used in proof 0.9, generalizes 0.9, equivalent 1, application 0.7, shared structure 0.5, counterexample 0.5); cosine | **shapes the map by default**                                        |
| Language S<sup>sem</sup>   | TF-IDF (sublinear tf, ½-weight bigrams, name and aliases double-weighted) over the lecture-note sentences that mention the concept; the agent summary for the 34 concepts the notes do not reach yet                                                            | exploratory; finds candidate missing links                           |
| Syllabus S<sup>src</sup>   | Gaussian bumps over Dembo reading order and lecture-heading order, syllabus week, and per-exercise homework links                                                                                                                                               | a lens (colour by week, "taught through week N"), optionally a force |

Each channel is divided by its strong-neighbour scale (the mean of each concept's
five largest similarities), and W<sub>ij</sub> = α S<sup>sem</sup>/m<sub>sem</sub> +
β S<sup>math</sup>/m<sub>math</sub> + γ S<sup>src</sup>/m<sub>src</sub> with α + β + γ = 1.
The default is α = γ = 0, β = 1. The other two are under "Explore other affinities".

Syllabus proximity is not a dependency, so by default it does not move concepts.
It is a colour (week first taught) and a filter: the "taught through week N"
slider fades concepts scheduled later, and the page says which week the
syllabus has reached on the data date.

## Projections

- **PCA**: kernel PCA of W (double-centred, top three eigenvectors scaled by √λ,
  sign-fixed), rescaled so 95% of concepts lie within 0.9 R.
- **Force**: deterministic seeded start; 360 steps of linear springs along each
  concept's six strongest affinities plus all relations, inverse-square
  repulsion, projection onto ‖x‖ ≤ R (or ‖x‖ = R) after each step.
- **Hybrid** (default): the force model started from the PCA layout.
- **Foundations toward the centre** adds a radial spring to R(0.2 + 0.8 d/d<sub>max</sub>),
  d being the longest dependency chain ending at the concept (max 14: the CLT and Lindeberg–Feller).
- Mode changes give the canonical layout for that mode, rotated (Procrustes)
  onto the previous view. Moving a weight slider relaxes from the current layout
  instead (220 gentler steps), so +5 points of language moves concepts 0.04 R RMS;
  "Reset layout" returns to the canonical, reproducible layout.

## Evaluation

kNN∩ is the mean Jaccard overlap between each concept's 8 nearest neighbours in
3D and its 8 most similar concepts in a channel. ρ is the Spearman correlation
between 3D distance and dissimilarity. Relation stretch is mean 3D length of
relations ÷ mean distance of all pairs. Review pass counts review pairs in the
nearest 20% ("near") or beyond the 35th percentile ("far").

| weights             | layout           | kNN∩ sem | kNN∩ math | kNN∩ src | kNN∩ W | ρ sem | ρ math | ρ src | relation stretch | review pass | PCA var |
| ------------------- | ---------------- | -------- | --------- | -------- | ------ | ----- | ------ | ----- | ---------------- | ----------- | ------- |
| structure (default) | pca              | 0.17     | 0.30      | 0.19     | 0.30   | 0.18  | 0.39   | 0.25  | 0.49             | 18/24       | 0.15    |
| structure (default) | force            | 0.22     | 0.46      | 0.24     | 0.46   | 0.37  | 0.57   | 0.26  | 0.37             | 20/24       |         |
| structure (default) | hybrid           | 0.23     | 0.49      | 0.26     | 0.49   | 0.38  | 0.58   | 0.28  | 0.37             | 22/24       |         |
| structure (default) | hybrid + shells  | 0.24     | 0.46      | 0.27     | 0.46   | 0.37  | 0.57   | 0.29  | 0.38             | 21/24       |         |
| structure (default) | hybrid (surface) | 0.22     | 0.40      | 0.25     | 0.40   | 0.35  | 0.53   | 0.33  | 0.37             | 21/24       |         |
| language only       | pca              | 0.24     | 0.19      | 0.22     | 0.24   | 0.33  | 0.28   | 0.20  | 0.65             | 18/24       | 0.12    |
| language only       | force            | 0.37     | 0.24      | 0.23     | 0.37   | 0.53  | 0.41   | 0.32  | 0.52             | 16/24       |         |
| language only       | hybrid           | 0.40     | 0.27      | 0.26     | 0.40   | 0.56  | 0.44   | 0.26  | 0.50             | 19/24       |         |
| syllabus only       | pca              | 0.20     | 0.24      | 0.59     | 0.59   | 0.30  | 0.27   | 0.46  | 0.53             | 12/24       | 0.27    |
| syllabus only       | force            | 0.23     | 0.28      | 0.75     | 0.75   | 0.22  | 0.25   | 0.60  | 0.56             | 12/24       |         |
| syllabus only       | hybrid           | 0.22     | 0.28      | 0.73     | 0.73   | 0.27  | 0.29   | 0.60  | 0.54             | 13/24       |         |
| mixed 0.3/0.5/0.2   | pca              | 0.27     | 0.32      | 0.36     | 0.37   | 0.39  | 0.43   | 0.36  | 0.47             | 15/24       | 0.13    |
| mixed 0.3/0.5/0.2   | force            | 0.26     | 0.42      | 0.35     | 0.46   | 0.39  | 0.52   | 0.35  | 0.40             | 20/24       |         |
| mixed 0.3/0.5/0.2   | hybrid           | 0.30     | 0.45      | 0.37     | 0.50   | 0.44  | 0.55   | 0.39  | 0.38             | 20/24       |         |
| equal               | pca              | 0.26     | 0.29      | 0.41     | 0.39   | 0.41  | 0.38   | 0.44  | 0.48             | 15/24       | 0.14    |
| equal               | force            | 0.29     | 0.37      | 0.44     | 0.51   | 0.40  | 0.48   | 0.41  | 0.42             | 20/24       |         |
| equal               | hybrid           | 0.32     | 0.40      | 0.45     | 0.52   | 0.46  | 0.53   | 0.45  | 0.40             | 21/24       |         |

| pair                                                     | category          | expect | structure (default)/pca | structure (default)/force | structure (default)/hybrid | structure (default)/hybrid + shells | structure (default)/hybrid (surface) | language only/hybrid | syllabus only/hybrid | mixed 0.3/0.5/0.2/hybrid | equal/hybrid |
| -------------------------------------------------------- | ----------------- | ------ | ----------------------- | ------------------------- | -------------------------- | ----------------------------------- | ------------------------------------ | -------------------- | -------------------- | ------------------------ | ------------ |
| fatou_lemma ~ dominated_convergence_theorem              | mathematical      | near   | 18 ✓                    | 6 ✓                       | 4 ✓                        | 4 ✓                                 | 7 ✓                                  | 1 ✓                  | 1 ✓                  | 1 ✓                      | 1 ✓          |
| pi_lambda_theorem ~ uniqueness_of_measures               | mathematical      | near   | 3 ✓                     | 2 ✓                       | 2 ✓                        | 4 ✓                                 | 3 ✓                                  | 0 ✓                  | 3 ✓                  | 0 ✓                      | 0 ✓          |
| holder_inequality ~ cauchy_schwarz_inequality            | mathematical      | near   | 0 ✓                     | 0 ✓                       | 0 ✓                        | 0 ✓                                 | 0 ✓                                  | 0 ✓                  | 2 ✓                  | 1 ✓                      | 1 ✓          |
| levy_continuity_theorem ~ central_limit_theorem          | mathematical      | near   | 14 ✓                    | 9 ✓                       | 5 ✓                        | 5 ✓                                 | 6 ✓                                  | 2 ✓                  | 34 ✗                 | 4 ✓                      | 9 ✓          |
| product_measure ~ fubini_tonelli                         | mathematical      | near   | 18 ✓                    | 5 ✓                       | 5 ✓                        | 5 ✓                                 | 8 ✓                                  | 18 ✓                 | 18 ✓                 | 10 ✓                     | 19 ✓         |
| weak_law_of_large_numbers ~ strong_law_of_large_numbers  | semantic_distinct | near   | 1 ✓                     | 2 ✓                       | 1 ✓                        | 2 ✓                                 | 4 ✓                                  | 1 ✓                  | 12 ✓                 | 0 ✓                      | 2 ✓          |
| convergence_in_probability ~ convergence_in_distribution | semantic_distinct | near   | 71 ✗                    | 30 ✗                      | 33 ✗                       | 30 ✗                                | 50 ✗                                 | 6 ✓                  | 31 ✗                 | 50 ✗                     | 36 ✗         |
| tail_sigma_algebra ~ tail_integral_formula               | semantic_distinct | far    | 43 ✓                    | 66 ✓                      | 48 ✓                       | 63 ✓                                | 81 ✓                                 | 59 ✓                 | 24 ✗                 | 46 ✓                     | 56 ✓         |
| kolmogorov_zero_one_law ~ kolmogorov_extension           | semantic_distinct | far    | 58 ✓                    | 72 ✓                      | 69 ✓                       | 68 ✓                                | 54 ✓                                 | 15 ✗                 | 10 ✗                 | 39 ✓                     | 24 ✗         |
| lebesgue_measure ~ dominated_convergence_theorem         | semantic_distinct | far    | 51 ✓                    | 57 ✓                      | 67 ✓                       | 55 ✓                                | 57 ✓                                 | 83 ✓                 | 98 ✓                 | 73 ✓                     | 78 ✓         |
| borel_sigma_algebra ~ borel_cantelli_first               | semantic_distinct | far    | 62 ✓                    | 56 ✓                      | 69 ✓                       | 52 ✓                                | 96 ✓                                 | 57 ✓                 | 69 ✓                 | 86 ✓                     | 70 ✓         |
| sigma_algebra ~ measurable_function                      | prerequisite      | near   | 30 ✗                    | 7 ✓                       | 9 ✓                        | 9 ✓                                 | 17 ✓                                 | 25 ✗                 | 30 ✗                 | 11 ✓                     | 5 ✓          |
| characteristic_function ~ levy_continuity_theorem        | prerequisite      | near   | 22 ✗                    | 9 ✓                       | 9 ✓                        | 14 ✓                                | 9 ✓                                  | 9 ✓                  | 4 ✓                  | 3 ✓                      | 3 ✓          |
| borel_cantelli_first ~ strong_law_of_large_numbers       | prerequisite      | near   | 12 ✓                    | 12 ✓                      | 6 ✓                        | 7 ✓                                 | 23 ✗                                 | 22 ✗                 | 8 ✓                  | 12 ✓                     | 11 ✓         |
| chebyshev_inequality ~ l2_weak_law                       | prerequisite      | near   | 6 ✓                     | 10 ✓                      | 6 ✓                        | 6 ✓                                 | 5 ✓                                  | 28 ✗                 | 81 ✗                 | 2 ✓                      | 6 ✓          |
| uniform_integrability ~ vitali_convergence_theorem       | prerequisite      | near   | 4 ✓                     | 1 ✓                       | 1 ✓                        | 1 ✓                                 | 1 ✓                                  | 9 ✓                  | 1 ✓                  | 1 ✓                      | 1 ✓          |
| fubini_tonelli ~ convolution                             | cross_chapter     | near   | 3 ✓                     | 1 ✓                       | 1 ✓                        | 1 ✓                                 | 2 ✓                                  | 2 ✓                  | 1 ✓                  | 0 ✓                      | 2 ✓          |
| change_of_variables ~ characteristic_function            | cross_chapter     | near   | 25 ✗                    | 6 ✓                       | 5 ✓                        | 3 ✓                                 | 5 ✓                                  | 10 ✓                 | 23 ✗                 | 6 ✓                      | 11 ✓         |
| borel_cantelli_first ~ probability_to_as_subsequence     | cross_chapter     | near   | 5 ✓                     | 8 ✓                       | 11 ✓                       | 9 ✓                                 | 18 ✓                                 | 10 ✓                 | 3 ✓                  | 15 ✓                     | 4 ✓          |
| completion_of_measure ~ measurable_function              | source_only       | far    | 13 ✗                    | 25 ✗                      | 23 ✗                       | 18 ✗                                | 25 ✗                                 | 45 ✓                 | 8 ✗                  | 21 ✗                     | 14 ✗         |
| kolmogorov_zero_one_law ~ fubini_tonelli                 | source_only       | far    | 93 ✓                    | 55 ✓                      | 54 ✓                       | 70 ✓                                | 56 ✓                                 | 26 ✗                 | 22 ✗                 | 31 ✗                     | 38 ✓         |
| convolution ~ tail_sigma_algebra                         | source_only       | far    | 56 ✓                    | 61 ✓                      | 55 ✓                       | 66 ✓                                | 55 ✓                                 | 46 ✓                 | 17 ✗                 | 35 ✗                     | 50 ✓         |
| cdf_characterization ~ almost_sure_convergence           | source_only       | far    | 68 ✓                    | 32 ✗                      | 38 ✓                       | 30 ✗                                | 97 ✓                                 | 81 ✓                 | 68 ✓                 | 59 ✓                     | 54 ✓         |
| essential_supremum ~ convergence_mode_counterexamples    | source_only       | far    | 11 ✗                    | 35 ✗                      | 40 ✓                       | 40 ✓                                | 42 ✓                                 | 49 ✓                 | 22 ✗                 | 50 ✓                     | 43 ✓         |

## What the geometry shows

1. **Structure, now mostly sourced, is what the default map shows.** 160 of 224
   relations are backed by the textbook or notes, and unsourced ones pull half as
   hard. The Hybrid layout's neighbourhoods agree with the structure channel
   (kNN∩ 0.49) far more than with language (0.23) or syllabus order (0.26), and
   it places 22 of 24 review pairs as expected.
2. **The space is high-dimensional.** The structure kernel's participation ratio
   is about 40; 14 dimensions hold half its variance and 33 hold 80%. Three PCA
   axes keep 15%. Read neighbourhoods, not long distances: only about half of each
   concept's true nearest neighbours are also nearest in 3D.
3. **Language from the notes is a different signal, not a substitute.** Built from
   the student's own lecture sentences, its correlation with structure stays
   moderate (Spearman 0.37). A language-only map produces the expected false
   neighbours (Kolmogorov 0–1 law next to Kolmogorov extension, 15th percentile)
   and misses foundational uses that the notes do not spell out in words
   (tail-integral formula ↔ both laws of large numbers; variance of sums ↔
   truncation; CLT ↔ characteristic-function expansions). Its best use is the
   review queue's "possible missing links" list, which already surfaced one real
   gap (Lp convergence ⇒ convergence in probability has no relation yet).
4. **Syllabus order is its own geometry.** A syllabus-only layout recovers course
   order (kNN∩ 0.73) but breaks cross-chapter mathematics: Lévy continuity ↔ CLT
   falls to the 34th percentile and Chebyshev ↔ L² weak law to the 81st.
5. **Force layouts serve the mathematics better than PCA** (22/24 vs 18/24 review
   pairs; kNN∩ structure 0.49 vs 0.30). PCA's axes are interpretable but keep too
   little variance to place local neighbourhoods well.

### Known distortions

- _Convergence in probability ~ in distribution_ stays too far (30th–71st
  percentile in the structure layouts): a single unsourced "application" relation
  joins them. A relation to verify, and probably to add alongside Slutsky.
- _Completion of a measure ~ measurable function_ is labelled "far" but is close
  in every layout; completion does bear on measurability, so the label is
  probably wrong.
- "Dembo names" evidence includes broad patterns ("random variable", "σ-algebra",
  "independent") that confirm a prerequisite only loosely. Cited-by-number
  evidence is the strong kind.
- Concept anchors and name patterns were chosen by the agent. A wrong anchor
  produces wrong citations; the review queue lists the evidence so it can be
  checked.
- The archived hw4 solution sheet runs the inline Lp problem into exercise 1.4.18,
  so that exercise also links to Lp concepts.
- Surface mode pushes central hubs outward (kNN∩ 0.40 vs 0.49).

## Limitations

- No relation is verified yet. Sourced does not mean correct; it means a source
  supports the link and can be checked.
- Only STATS 310A is indexed; cross-course links are not representable yet.
- The lecture notes stop at lecture 8, so Chapters 2–3 rely more on agent
  proposals and agent summaries.
- Labels are greedy and can hide each other; the List view and search are the
  complete, keyboard-accessible alternative. Without WebGL the page falls back to
  a flat, rotatable SVG projection.
- The three.js chunk is about 140 kB gzipped (the same `three` chunk as the site's
  other 3D pages); the page script is about 17 kB and the data about 45 kB gzipped.

## Extending to the other courses

1. Add `knowledge_graph/concepts/<course>.json` and its id registry in the ledger,
   reusing curriculum heading ids and the course's source registry (Stein &
   Shakarchi, Dummit & Foote, Schwartz / Tong). Aim for 50–100 concepts per course.
2. Run the same local citation extraction on each textbook (numbered results and
   in-proof citations), anchor concepts to results, and add a per-course index.
3. Put shared concepts (dominated convergence, power series, Fourier transform,
   group actions, Green's functions) in a course-neutral namespace with several
   courses' sources.
4. Add cross-course relations as proposals, with review pairs such as
   characteristic function ↔ Fourier transform and Lévy inversion ↔ contour
   integration.
5. Keep the syllabus channel per course and zero across courses.
6. Around 400 concepts, replace the dense Jacobi eigen-solver with Lanczos and the
   all-pairs repulsion with Barnes–Hut.

## Running it

```sh
npm run dev                      # http://localhost:5177/learning/space/
npm run evaluate:concepts        # regenerate the tables above
npm run build && npm run preview
npm run test:e2e:concepts        # browser checks (desktop, mobile, no-WebGL, overlay)
```

To regenerate the data, in the private ledger:

```sh
python3 scripts/concept_atlas.py --public ../josephbaileyy.github.io/v4/public/learning/data/concepts.stats310a.public.json
```
