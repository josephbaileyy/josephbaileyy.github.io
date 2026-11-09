# Concept Space

[/learning/space/](https://josephrbailey.com/learning/space/) is the public curriculum map for STATS 310A / MATH 230A, MATH 116, MATH 120 and PHYSICS 330. The former Learning Atlas address, `/learning/`, redirects to the same explorer. Probability deep links such as `?c=fatou_lemma` continue to use the original concept IDs.

## Curriculum snapshot

The 2026-11-08 snapshot comes from the strict unified export at ledger commit `f3e7c12` (PR #12). It includes 353 concepts, 372 course occurrences, 637 agent-reviewed mathematical relations and 105 near/far review pairs. A shared concept has one ID and one position, with separate anchors in each course that uses it. The inspector groups anchors by course and records relation type, direction, conditions, rationale, review basis and available source locators. Automated citation evidence and reviewer judgments are distinct. Some standard mathematical dependencies were reviewed through mathematical reasoning and show endpoint readings where available. No edge is marked human-verified. Associations such as homonyms and analogies appear separately from mathematical links.

A gold line in the global map connects concepts with different home courses. The 35 such lines include 10 explicitly cross-course relations and 25 uses of shared concepts in another course. Filtering by course keeps its occurrences, including reused concepts, and adds only eligible one-hop external endpoints. The local view centers the selected concept and draws its visible typed connections. Search covers the whole index, and List offers keyboard access to concepts and bridge context in the current filter. Filters preserve coordinates.

The timeline distinguishes the **indexed concept scope** from **blocks whose first scheduled meeting has begun**. The date control starts at the visitor’s local date. STATS 310A has 6/9 blocks begun and MATH 120 has 7/10 as of November 8. Individual concept dates come from the earliest dated syllabus anchor for that course occurrence. Schedule colours separate material scheduled by the cutoff, material scheduled later and material without dates. MATH 116 has undated topic groupings. PHYSICS 330 has documented lectures and readings but lacks a dated lecture-by-lecture syllabus. Both show scope and explicitly mark schedule dates unavailable. Indexed scope may be incomplete and a scheduled date gives no evidence of delivery or learning.

## Study evidence

Without an overlay the practice queue uses reviewed dependency direction and prioritizes foundational concepts with downstream uses. For courses with dated syllabus blocks it uses concepts scheduled by the cutoff. Where dates are unavailable it uses the documented scope. A loaded overlay prioritizes missing independent evidence and identifies unmet prerequisite concepts, including cross-course dependencies. Counts describe linked skill evidence. Retention is shown as a distinct state when the concept is independently demonstrated and the overlay includes delayed retention evidence. Otherwise the course-level state stays provisional, difficulty recorded or untested as appropriate. Missing evidence represents unknown ability.

Generate either format **in the private ledger**, then select it under **Private evidence**. Both formats stay in memory in that tab.

```sh
# Unified overlay
python3 scripts/concept_space.py --private-overlay local/concept-overlay.private.json

# Existing probability-only overlay
python3 scripts/concept_atlas.py --private-overlay local/concept-overlay.stats310a.private.json
```

The older Learning Atlas topic export uses a separate topic schema. To use that ledger with the unified Concept Space, generate a concept overlay using the commands above. Public refreshes use only the guarded curriculum export. The picker uses `File.text()`, and no code uploads or persists its contents. The layout worker receives curriculum and layout settings only. There is no synchronization service.

## Geometry

The ledger supplies three independent similarities. Structure is cosine similarity of typed-relation profiles, weighted by relation class, confidence and review/source support. Language uses TF-IDF over course-note language with curriculum summaries as a fallback. Source proximity uses course-specific reading order, lecture headings, syllabus blocks and homework anchors. The explorer divides each channel by its mean top-five neighbor similarity and combines the scaled kernels with normalized weights. Default weights are language 0, structure 1, source 0. The schedule lens and inspector give the source channel its primary interpretive role. The advanced panel can mix channels or isolate one.

For the hybrid, double-center the combined kernel, take its three largest eigenpairs with the symmetric Jacobi solver, and scale the eigenvectors by the square roots of the eigenvalues. Fix signs by their largest-magnitude entry and fit the resulting points to the ball. These are projection axes ordered by kernel variance. The default map then relaxes the points for 360 deterministic steps, with:

- A quadratic spring potential along each node's nine strongest affinities and direct relations admitted to the structure channel. Spring weights come from the combined kernel.
- A softened inverse-distance potential over node pairs, giving inverse-square repulsion away from the softening radius. The default repulsion coefficient is 0.0012.
- Projection onto the closed unit ball after each cooled step. Interior nodes remain free to move. The surface and dependency-depth shell variants are advanced controls.

Cold starts and resets reproduce the canonical layout. Mode changes align to the previous coordinates by a proper rotation. Weight changes use a gentler warm relaxation when a layout already exists. The camera stays still until the visitor acts. Transitions respect reduced motion, and the SVG fallback uses the same layout, filters and local relationship mask. The worker isolates the dense eigensolve and pairwise forces from the UI thread.

## Evaluation and default

The tuned, structure-only hybrid with nine attraction neighbors gives the preferred balance for this snapshot. It improves mathematical-neighbor overlap from 0.357 to 0.418, lowers mean relation stretch from 0.222 to 0.174, and moves the review pass count from 81 to 83 of 105 compared with legacy forces on the same data. It leaves 99 nodes inside 0.999 R, compared with eight under the legacy forces. The twelve-neighbor variant has slightly shorter relations and one more cross-course review pass. The nine-neighbor layout has higher mathematical overlap, one more total review pass and higher projected bridge separation. Depth shells give the strongest neighbor overlap (0.469) with longer mathematical links and fewer review passes. Seeded force is faster and passes one more cross-course pair, while the hybrid gives shorter relationships and lower weight-change displacement.

[Full comparison and individual review pairs](CONCEPT_SPACE_EVALUATION.md)

- **Neighbors and rank** use mean Jaccard overlap of the top eight neighbors and Spearman correlation between 3D distance and channel dissimilarity.
- **Relation stretch** divides average relation length by average pair distance. The near/far tests expect near pairs within the 20th percentile and far pairs at or beyond the 35th percentile.
- **Bridge visibility** measures average bridge length in radius units and the percentage of endpoints at least 0.05 R apart across three orthogonal projections. This is a separation proxy and does not model occlusion or label collisions. Browser tests also verify that the filter preserves bridge context, typed inspectors remain navigable and the SVG renders and hides bridges consistently.
- **Stability and performance** compare repeat-run positions, aligned RMS displacement with five points of language weight added, and runtime at full graph size. Warm changes move the default about 0.04 R RMS. Layout timings are one local Node sample per configuration and exclude fetching, rendering and diagnostics. The default computed in 1.27 s. The larger curriculum snapshot is about 239 kB gzipped, up from 55 kB for the probability-only graph.

The three PCA components account for about 4.5% of default kernel variance. Some reviewed near pairs still land far apart, and the evaluator retains those failures. Visual proximity helps navigation. Inspect the typed links for mathematical claims.

## Refresh and checks

```sh
python3 scripts/sync-concept-space.py /path/to/academic-learning-ledger --as-of YYYY-MM-DD
npm run --silent evaluate:concepts > docs/CONCEPT_SPACE_EVALUATION.md
npm run lint && npm test && npm run build
npm run preview
npm run test:e2e:concepts
```

The refresh script invokes strict `--public-unified` with the ledger privacy guard. It adds probability syllabus-unit IDs and reader fragments from the Dembo crosswalk and maps MATH 116 topic units from public lecture and reading anchors. The browser tests use synthetic overlay entries, verify no private network requests, and exercise keyboard search, mobile touch navigation, reduced motion and forced no-WebGL behavior. In a local Chromium run, the map was ready in 5.15 s via the legacy redirect and 2.96 s on direct navigation at a 390 px touch viewport with 4× page CPU throttling. The worker reported 1.39 s on the latter run. These are local browser samples, and page throttling may not apply to the worker. An axe-core 4.10.3 audit reported zero violations in the global and local views at 1440 px and 390 px. Screenshots are written to `test-results/concept-space/`. Set `CHROME_PATH` to run with an installed Chromium executable.

Cross-device sync would require an authenticated server and a private evidence store. The server would have to verify identity, enforce per-user authorization for every read and write, and prevent private responses from being cached publicly. The static site uses no such service.
