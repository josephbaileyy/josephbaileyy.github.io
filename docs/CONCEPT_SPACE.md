# Concept space: method and evaluation

`/learning/space/` shows the STATS 310A / MATH 230A curriculum as 94 canonical
concepts linked by 206 typed mathematical relations, projected into a sphere. Every
relation has been checked against the Dembo notes by an independent reviewer
agent. This note explains where the relations come from, what the geometry means,
and what it does not show. The tables come from `npm run evaluate:concepts`, which
runs the same code as the browser (`v4/js/concept-space/model.js`).

## Where the relations come from

The concept graph is built in the private ledger (`scripts/concept_atlas.py`) in
three steps.

**1. Proposal.** An agent (Claude) proposed 190 relations from the lecture-note
headings, the Dembo subsection list and general mathematical knowledge.

**2. Automatic source evidence.** The Dembo notes (Apr 2019 edition, the
numbering the 2026 homework uses) were parsed on the student's machine. The
parser found the numbered results and the "Theorem / Lemma / … a.b.c" citations
inside each statement and proof, and counted each concept's name patterns. The
student's typeset lecture notes (lectures 1–8, with added explanations excluded)
and the archived homework solution sheets were processed the same way. Each
concept is anchored to the numbered results that state it (80 of 94). The
citation index added 34 relations the agent had missed, flagged one reversed
direction, and attached evidence to every relation. Only ids, page numbers, short
named-result titles and counts are stored.

**3. Independent review.** Eight fresh reviewer agents, each given 28 relations,
judged every relation against the actual Dembo statements and proofs (and the
lecture notes). They were not shown the proposer's rationale, confidence, or the
automatic evidence, and could search the whole textbook text. Each verdict
records the reviewer, the results read and a short reason in its own words. Two
small follow-up rounds checked relations the reviewers suggested.

|                                               | Agent proposals (190) | Extracted from citations (34) | Follow-ups (4) |
| --------------------------------------------- | --------------------- | ----------------------------- | -------------- |
| confirmed                                     | 158                   | 22                            | 3              |
| corrected by the reviewer (type or direction) | 15                    | 8                             | 0              |
| rejected                                      | 17                    | 4                             | 1              |

221 verdicts rest on the Dembo text, 4 on the lecture notes and 3 on general
mathematical knowledge. Some findings:

- _Automatic support is a pointer, not proof._ 12 of the 22 rejected relations had
  automatic support. One was "λ-system → outer measure", produced because Dembo's
  "λ-measurable" uses λ as the name of a set function. Another was "convergence in
  probability → bounded convergence", produced because the extracted text lost the
  a.s. label on an arrow. Dembo states bounded convergence for a.s. convergence, so
  that relation was replaced.
- _Reading proofs finds what citation matching cannot._ 58 confirmed relations have
  no automatic support; the reviewers found them in the proofs.
- _Typical corrections:_ "used in proof" pointing at a definition (definitions have
  no proofs, so these were changed to prerequisite); "equivalent" where one is a
  special case; "Chebyshev generalizes Kolmogorov's maximal inequality" reversed;
  "L² weak law generalizes the weak law" and "truncation is used in the Lindeberg
  CLT" rejected against Dembo's own proofs.
- _A type was missing._ Reviewers disagreed on whether "one convergence mode
  implies another" is a generalization, so an `implies` type was added and those
  links were recast and re-reviewed: a.s. ⇒ in probability, Lp ⇒ in probability,
  in probability ⇒ in distribution, and SLLN ⇒ WLLN (for i.i.d. integrable
  variables).

**What this does and does not establish.** The reviewers are the same model as the
proposer, but they started fresh, saw the textbook instead of the proposer's
reasoning, and were told to be strict. They rejected or corrected 20% of the
relations, so they were not rubber-stamping. "Agent-reviewed" still means checked
by an agent, not by a person. The status `verified` is reserved for a named
person, and no relation has it yet.

Relations still carry their automatic evidence, shown on the page as a second
badge: Dembo cites it (63), Dembo names it (66), the lecture notes mention it
(19), or no automatic source (58).

## Three channels

For concepts _i_, _j_ each channel is a nonnegative, positive-semidefinite
similarity in [0, 1] with S<sub>ii</sub> = 1.

| Channel                    | Built from                                                                                                                                                                                                                                                                                                                    | Role                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Structure S<sup>math</sup> | each concept's relation profile: itself (weight 1) plus each related concept at type weight × confidence × trust (prerequisite 1, used in proof 0.9, generalizes 0.9, equivalent 1, implies 0.8, application 0.7, shared structure 0.5, counterexample 0.5; trust 1 once reviewed, otherwise 0.5–1 by source support); cosine | **shapes the map by default**                                        |
| Language S<sup>sem</sup>   | TF-IDF (sublinear tf, ½-weight bigrams, name and aliases double-weighted) over the lecture-note sentences that mention the concept; the agent summary for the 34 concepts the notes do not reach yet                                                                                                                          | exploratory; finds candidate missing links                           |
| Syllabus S<sup>src</sup>   | Gaussian bumps over Dembo reading order and lecture-heading order, syllabus week, and per-exercise homework links                                                                                                                                                                                                             | a lens (colour by week, "taught through week N"), optionally a force |

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
  d being the longest dependency chain ending at the concept (max 12: the CLT and Lindeberg–Feller).
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
| structure (default) | pca              | 0.18     | 0.33      | 0.21     | 0.33   | 0.21  | 0.41   | 0.27  | 0.47             | 18/24       | 0.15    |
| structure (default) | force            | 0.21     | 0.45      | 0.26     | 0.45   | 0.36  | 0.54   | 0.32  | 0.37             | 23/24       |         |
| structure (default) | hybrid           | 0.22     | 0.48      | 0.25     | 0.48   | 0.38  | 0.56   | 0.29  | 0.36             | 23/24       |         |
| structure (default) | hybrid + shells  | 0.24     | 0.49      | 0.25     | 0.49   | 0.37  | 0.55   | 0.30  | 0.39             | 23/24       |         |
| structure (default) | hybrid (surface) | 0.21     | 0.39      | 0.23     | 0.39   | 0.37  | 0.52   | 0.32  | 0.36             | 23/24       |         |
| language only       | pca              | 0.24     | 0.18      | 0.22     | 0.24   | 0.33  | 0.26   | 0.20  | 0.65             | 18/24       | 0.12    |
| language only       | force            | 0.37     | 0.23      | 0.24     | 0.37   | 0.54  | 0.40   | 0.32  | 0.53             | 16/24       |         |
| language only       | hybrid           | 0.39     | 0.27      | 0.26     | 0.39   | 0.56  | 0.43   | 0.25  | 0.50             | 19/24       |         |
| syllabus only       | pca              | 0.20     | 0.23      | 0.59     | 0.59   | 0.30  | 0.27   | 0.46  | 0.52             | 12/24       | 0.27    |
| syllabus only       | force            | 0.23     | 0.26      | 0.74     | 0.74   | 0.23  | 0.26   | 0.61  | 0.54             | 13/24       |         |
| syllabus only       | hybrid           | 0.22     | 0.26      | 0.74     | 0.74   | 0.27  | 0.29   | 0.60  | 0.53             | 13/24       |         |
| mixed 0.3/0.5/0.2   | pca              | 0.27     | 0.33      | 0.34     | 0.36   | 0.40  | 0.43   | 0.35  | 0.46             | 19/24       | 0.13    |
| mixed 0.3/0.5/0.2   | force            | 0.28     | 0.44      | 0.37     | 0.50   | 0.42  | 0.53   | 0.40  | 0.38             | 23/24       |         |
| mixed 0.3/0.5/0.2   | hybrid           | 0.30     | 0.45      | 0.36     | 0.51   | 0.44  | 0.54   | 0.40  | 0.37             | 21/24       |         |
| equal               | pca              | 0.26     | 0.28      | 0.41     | 0.39   | 0.41  | 0.38   | 0.46  | 0.48             | 15/24       | 0.14    |
| equal               | force            | 0.29     | 0.38      | 0.43     | 0.52   | 0.41  | 0.47   | 0.42  | 0.41             | 18/24       |         |
| equal               | hybrid           | 0.33     | 0.40      | 0.42     | 0.55   | 0.45  | 0.51   | 0.44  | 0.39             | 20/24       |         |

Review pairs, distance percentile among all pairs (lower is nearer; ✓ = as expected):

| pair                                                     | category          | expect | structure (default)/pca | structure (default)/force | structure (default)/hybrid | structure (default)/hybrid + shells | structure (default)/hybrid (surface) | language only/hybrid | syllabus only/hybrid | mixed 0.3/0.5/0.2/hybrid | equal/hybrid |
| -------------------------------------------------------- | ----------------- | ------ | ----------------------- | ------------------------- | -------------------------- | ----------------------------------- | ------------------------------------ | -------------------- | -------------------- | ------------------------ | ------------ |
| fatou_lemma ~ dominated_convergence_theorem              | mathematical      | near   | 13 ✓                    | 2 ✓                       | 3 ✓                        | 3 ✓                                 | 6 ✓                                  | 1 ✓                  | 0 ✓                  | 1 ✓                      | 2 ✓          |
| pi_lambda_theorem ~ uniqueness_of_measures               | mathematical      | near   | 1 ✓                     | 2 ✓                       | 2 ✓                        | 0 ✓                                 | 2 ✓                                  | 0 ✓                  | 2 ✓                  | 0 ✓                      | 1 ✓          |
| holder_inequality ~ cauchy_schwarz_inequality            | mathematical      | near   | 0 ✓                     | 0 ✓                       | 0 ✓                        | 0 ✓                                 | 0 ✓                                  | 0 ✓                  | 2 ✓                  | 0 ✓                      | 0 ✓          |
| levy_continuity_theorem ~ central_limit_theorem          | mathematical      | near   | 4 ✓                     | 3 ✓                       | 1 ✓                        | 1 ✓                                 | 1 ✓                                  | 2 ✓                  | 34 ✗                 | 3 ✓                      | 8 ✓          |
| product_measure ~ fubini_tonelli                         | mathematical      | near   | 15 ✓                    | 2 ✓                       | 4 ✓                        | 4 ✓                                 | 2 ✓                                  | 18 ✓                 | 17 ✓                 | 8 ✓                      | 15 ✓         |
| weak_law_of_large_numbers ~ strong_law_of_large_numbers  | semantic_distinct | near   | 0 ✓                     | 0 ✓                       | 0 ✓                        | 0 ✓                                 | 1 ✓                                  | 1 ✓                  | 12 ✓                 | 0 ✓                      | 1 ✓          |
| convergence_in_probability ~ convergence_in_distribution | semantic_distinct | near   | 61 ✗                    | 34 ✗                      | 27 ✗                       | 22 ✗                                | 34 ✗                                 | 6 ✓                  | 28 ✗                 | 33 ✗                     | 35 ✗         |
| tail_sigma_algebra ~ tail_integral_formula               | semantic_distinct | far    | 47 ✓                    | 69 ✓                      | 48 ✓                       | 59 ✓                                | 90 ✓                                 | 60 ✓                 | 23 ✗                 | 41 ✓                     | 60 ✓         |
| kolmogorov_zero_one_law ~ kolmogorov_extension           | semantic_distinct | far    | 30 ✗                    | 36 ✓                      | 57 ✓                       | 55 ✓                                | 42 ✓                                 | 15 ✗                 | 10 ✗                 | 37 ✓                     | 24 ✗         |
| lebesgue_measure ~ dominated_convergence_theorem         | semantic_distinct | far    | 38 ✓                    | 72 ✓                      | 72 ✓                       | 61 ✓                                | 54 ✓                                 | 83 ✓                 | 99 ✓                 | 72 ✓                     | 80 ✓         |
| borel_sigma_algebra ~ borel_cantelli_first               | semantic_distinct | far    | 50 ✓                    | 74 ✓                      | 77 ✓                       | 55 ✓                                | 95 ✓                                 | 55 ✓                 | 65 ✓                 | 82 ✓                     | 77 ✓         |
| sigma_algebra ~ measurable_function                      | prerequisite      | near   | 26 ✗                    | 14 ✓                      | 11 ✓                       | 9 ✓                                 | 19 ✓                                 | 27 ✗                 | 31 ✗                 | 9 ✓                      | 4 ✓          |
| characteristic_function ~ levy_continuity_theorem        | prerequisite      | near   | 27 ✗                    | 6 ✓                       | 9 ✓                        | 15 ✓                                | 12 ✓                                 | 9 ✓                  | 4 ✓                  | 5 ✓                      | 5 ✓          |
| borel_cantelli_first ~ strong_law_of_large_numbers       | prerequisite      | near   | 12 ✓                    | 4 ✓                       | 5 ✓                        | 4 ✓                                 | 17 ✓                                 | 23 ✗                 | 8 ✓                  | 7 ✓                      | 11 ✓         |
| chebyshev_inequality ~ l2_weak_law                       | prerequisite      | near   | 3 ✓                     | 5 ✓                       | 3 ✓                        | 9 ✓                                 | 3 ✓                                  | 26 ✗                 | 84 ✗                 | 3 ✓                      | 7 ✓          |
| uniform_integrability ~ vitali_convergence_theorem       | prerequisite      | near   | 10 ✓                    | 0 ✓                       | 0 ✓                        | 1 ✓                                 | 0 ✓                                  | 8 ✓                  | 2 ✓                  | 1 ✓                      | 1 ✓          |
| fubini_tonelli ~ convolution                             | cross_chapter     | near   | 1 ✓                     | 1 ✓                       | 1 ✓                        | 2 ✓                                 | 2 ✓                                  | 2 ✓                  | 1 ✓                  | 1 ✓                      | 1 ✓          |
| change_of_variables ~ characteristic_function            | cross_chapter     | near   | 7 ✓                     | 3 ✓                       | 1 ✓                        | 2 ✓                                 | 2 ✓                                  | 10 ✓                 | 23 ✗                 | 5 ✓                      | 10 ✓         |
| borel_cantelli_first ~ probability_to_as_subsequence     | cross_chapter     | near   | 6 ✓                     | 7 ✓                       | 5 ✓                        | 5 ✓                                 | 8 ✓                                  | 10 ✓                 | 3 ✓                  | 10 ✓                     | 4 ✓          |
| completion_of_measure ~ measurable_function              | source_only       | far    | 24 ✗                    | 39 ✓                      | 41 ✓                       | 44 ✓                                | 35 ✓                                 | 45 ✓                 | 7 ✗                  | 18 ✗                     | 15 ✗         |
| kolmogorov_zero_one_law ~ fubini_tonelli                 | source_only       | far    | 84 ✓                    | 39 ✓                      | 42 ✓                       | 59 ✓                                | 52 ✓                                 | 25 ✗                 | 21 ✗                 | 32 ✗                     | 32 ✗         |
| convolution ~ tail_sigma_algebra                         | source_only       | far    | 67 ✓                    | 49 ✓                      | 47 ✓                       | 62 ✓                                | 54 ✓                                 | 46 ✓                 | 16 ✗                 | 41 ✓                     | 56 ✓         |
| cdf_characterization ~ almost_sure_convergence           | source_only       | far    | 73 ✓                    | 40 ✓                      | 48 ✓                       | 47 ✓                                | 84 ✓                                 | 81 ✓                 | 66 ✓                 | 60 ✓                     | 58 ✓         |
| essential_supremum ~ convergence_mode_counterexamples    | source_only       | far    | 34 ✗                    | 50 ✓                      | 57 ✓                       | 48 ✓                                | 58 ✓                                 | 50 ✓                 | 22 ✗                 | 64 ✓                     | 45 ✓         |

## What the geometry shows

1. **The default map shows reviewed mathematical structure.** The Hybrid layout's
   neighbourhoods agree with the structure channel (kNN∩ 0.48) far more than with
   language (0.22) or syllabus order (0.25). It places 23 of 24 review pairs as
   expected, up from 22 before the review removed 22 relations and corrected 23.
2. **The space is high-dimensional.** The structure kernel's participation ratio
   is about 38: 14 dimensions hold half its variance and 32 hold 80%. Three PCA
   axes keep 15%. Read neighbourhoods, not long distances.
3. **Language from the notes is a different signal, not a substitute.** Its
   correlation with structure is moderate (Spearman 0.35). A language-only map puts
   Kolmogorov 0–1 law next to Kolmogorov extension (15th percentile). It also misses
   foundational uses the notes do not put into words, such as tail-integral
   formula ↔ the laws of large numbers, variance of sums ↔ truncation, and CLT ↔
   characteristic-function expansions. It was still useful: its "possible missing
   links" list found the missing Lp ⇒ in-probability relation, which a reviewer
   then confirmed.
4. **Syllabus order is its own geometry.** A syllabus-only layout recovers course
   order (kNN∩ 0.74) but breaks cross-chapter mathematics: Lévy continuity ↔ CLT
   falls to the 34th percentile and Chebyshev ↔ L² weak law to the 84th.
5. **Force layouts serve the mathematics better than PCA** (23/24 vs 18/24 review
   pairs). PCA's axes are interpretable but keep too little variance to place local
   neighbourhoods.

### Known distortions

- _Convergence in probability ~ in distribution_ is still at the 27th percentile
  in the Hybrid layout, just outside "near", although an `implies` relation now
  joins them. The two sit in different chapters' clusters.
- _Completion of a measure ~ measurable function_ is labelled "far" but lands near
  in some layouts. Completion does bear on measurability, so the label is probably
  wrong.
- Concept anchors and name patterns were chosen by the agent. A wrong anchor
  produces wrong citations. The reviewers caught several cases, but the anchors
  themselves were not reviewed.
- Dependency depth follows prerequisite / used-in-proof / application links only.
  After the review retyped "Markov → Chebyshev" as a generalization, Chebyshev and
  Chernoff count as depth 0.
- Surface mode pushes central hubs outward (kNN∩ 0.39 vs 0.48).

## Limitations

- No relation is verified by a person. Agent review is strong evidence, not a
  human check, and the reviewers are the same model family as the proposer.
- Only STATS 310A is indexed; cross-course links are not representable yet.
- The lecture notes stop at lecture 8, so Chapters 2–3 have less automatic
  evidence and rely more on the reviewers' reading of the proofs, and their
  language channel uses agent summaries.
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
   in-proof citations), anchor concepts to results, add a per-course index, then
   run the independent agent review.
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
