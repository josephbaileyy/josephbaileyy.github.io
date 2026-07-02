# UX heuristic analysis

Date: 2026-07-01

## Scope

This review covers the current uncommitted change set and the resulting experience across:

- The cinematic universe at desktop (1280×720) and mobile (390×844)
- BaileyOS and the new Notes app on mobile
- The quick portfolio on mobile
- The generated Notes article page
- The related source, generated content, fallback, analytics, and deployment paths

The production build succeeds and all 62 unit tests pass. Live GitHub and Letterboxd data are empty in the committed local snapshot, so their populated visual state was assessed from the implementation rather than rendered data.

Severity scale:

- **S1 — Critical:** blocks a core task
- **S2 — Major:** causes likely confusion, failure, or loss of trust
- **S3 — Moderate:** creates friction or weakens comprehension
- **S4 — Minor:** polish or consistency issue

## Changes noted

The change set adds:

- A Markdown-to-static-HTML writing pipeline, notes index, sitemap entries, and a Notes app/terminal surface inside BaileyOS
- Deploy-time GitHub and Letterboxd snapshots, weekly refreshes, and “Live signals” presentation
- An opt-in “you are here” Earth marker using browser geolocation
- Cookieless GoatCounter pageview and event tracking
- MSAA/antialiasing improvements for direct and post-processing render paths
- A custom 404 page, `robots.txt`, sitemap, and custom-domain documentation
- Supporting navigation, styling, tests, and generated quick-portfolio content

These changes move the site beyond a portfolio demo toward a living personal publication. The strongest addition is Notes: it gives the spectacle an evidence-rich, indexable destination. The main risk is additive complexity—new content has been placed into an interface that was already dense.

## Executive assessment

The site has an unusually memorable concept, a clear personal voice, and excellent escape hatches. Its strongest UX qualities are:

- A compelling journey with strong peak and end moments
- Multiple navigation modes: tour, scrolling, keyboard, direct scene selection, deep links, and quick portfolio
- Visible system status through loading, scale, current scene, selected controls, progress, and location states
- Graceful fallbacks for no JavaScript, no WebGL2, failed live-data fetches, reduced motion, and conventional browsing
- A mobile BaileyOS interface that becomes substantially more familiar and legible than the universe HUD

The main weakness is first-screen hierarchy. The galaxy view presents the journey CTA, quick portfolio, identity card, three profile actions, six unlabeled scene dots, contextual hotspots, tools, a scale readout, and travel guidance at once. On mobile, the guidance is clipped and the lower controls overlap visually. Hick’s Law, Fitts’s Law, and Nielsen’s minimalist-design heuristic all point to the same recommendation: establish one primary action, one escape hatch, and defer the rest.

## Priority findings

| Priority | Finding                                                              | Evidence                                                                                                                                                                      | Principles                                              | Suggested change                                                                                                                                                                                                                                |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S2       | Mobile galaxy HUD is visually congested and partially clipped        | At 390×844 the travel hint runs beyond the viewport; the name/actions card, scale ribbon, and `out`/`in` controls occupy the same lower band                                  | Fitts, Hick, Common Region; N1, N8                      | Create a mobile-specific bottom sheet: show the scene name and one concise instruction above the `out`/`in` controls; collapse the profile card to a small identity trigger; constrain the hint to two lines or hide it after first interaction |
| S2       | The generated note title includes literal single quotes              | The article, quick portfolio, Notes app, document title, and social metadata show `'How this site works…'`                                                                    | Consistency; N2, N5                                     | Parse both single- and double-quoted frontmatter values, or remove the quotes in the source frontmatter; add a generator test covering both                                                                                                     |
| S2       | Important mobile targets are too small                               | Scene dots are 14×14 px; profile actions are 34 px high; several text controls use 10–12 px type                                                                              | Fitts; N7, N8                                           | Give dots an invisible minimum 44×44 hit area and persistent/selected labels on touch; raise primary action targets to at least 44 px and avoid essential text below 12–14 px                                                                   |
| S2       | Location is opt-in but lacks complete trust and reversal affordances | The accessible label mentions permission, but the visible label does not explain it; success has no “clear my marker” action; globe reset does not remove the location marker | Error prevention, Peak-End; N3, N5, N9                  | Rename to “Locate me”; show just-in-time copy that coordinates stay on-device; after success offer “Clear location”; distinguish denied, timed out, and unsupported states with a retry path                                                    |
| S3       | The first view has too many equally available choices                | Tour, quick portfolio, identity actions, dots, hotspots, tools, and travel controls compete before users understand the model                                                 | Hick, Von Restorff, Progressive Disclosure; N6, N8, N10 | Preserve the gold “Take the journey” CTA and quick-portfolio escape; reveal profile actions, tools, and secondary hotspots after the first interaction or through one “Explore” drawer                                                          |
| S3       | Scene dots are recognizable only after hover/focus                   | Desktop labels appear on hover/focus; touch users see six circles without names                                                                                               | Recognition over recall, Jakob’s Law; N2, N6            | On touch, show the active scene label plus the next destination, or replace dots with a compact labeled stepper such as “Galaxy · 1 of 6”                                                                                                       |
| S3       | Quick-portfolio section navigation hides destinations off-screen     | On mobile only the first several of nine sticky pills are visible, with no cue that the row scrolls; Writing is initially outside the viewport                                | Serial Position, Hick; N1, N6, N7                       | Add an edge fade/partial next pill, current-section state, and automatic scroll-into-view; consider grouping later sections under “More” on narrow screens                                                                                      |
| S3       | Live signals can appear stale or non-actionable                      | The visual list does not show `fetchedAt`, and repo/film entries are rendered as plain text even though source URLs are available                                             | Visibility of status, Information Scent; N1, N2, N4     | Label the block “Recent activity,” display “Updated YYYY-MM-DD,” link repositories and films, and use a neutral empty state instead of hiding the section entirely                                                                              |
| S3       | Destructive progress reset has weak recovery                         | “Reset field log progress” is immediately available beside progress content                                                                                                   | Error prevention; N3, N5, N9                            | Require a second confirmation or provide a five-second undo toast; keep the action visually secondary                                                                                                                                           |
| S3       | Custom vocabulary adds avoidable learning cost                       | Terms such as “signals,” “field log,” “drift,” “dock,” and “cinematic scale” fit the theme but obscure conventional functions                                                 | Match to real world, Jakob’s Law; N2, N6, N10           | Keep the themed label but append plain-language help on first use: “Field log — saved progress,” “Drift — free camera,” “Signals — research details”                                                                                            |
| S4       | Notes are readable but lack long-form wayfinding                     | The article has a breadcrumb and strong typography, but no reading progress, heading links, or next/previous navigation                                                       | Goal Gradient, Zeigarnik; N1, N7                        | For multiple/longer notes, add a compact table of contents, anchored headings, reading time, and previous/next links; avoid adding these while there is only one short article                                                                  |

## Nielsen’s 10 usability heuristics

### 1. Visibility of system status — Good, with gaps

Loading progress, “Now viewing,” scale, active scene, selected coordinates, tour state, window state, and geolocation labels provide strong feedback. The field log also turns exploration into visible progress.

Gaps:

- Mobile travel guidance is clipped, so status exists but is not reliably readable.
- Live data has no visible refresh date.
- “Location unavailable” combines denial, timeout, and technical failure.

Recommended: fix the mobile status band, expose live-data freshness, and use distinct location outcomes with retry guidance.

### 2. Match between the system and the real world — Mixed

The nested physical-scale model is exceptionally coherent, and the desktop metaphor makes the final scene understandable. “Quick portfolio,” CV, Research, Notes, and Contact use familiar language.

The themed terms “signals,” “field log,” “drift,” and “dock” require interpretation. The mobile buttons `out` and `in` are also less natural than “Zoom out” and “Zoom in.”

Recommended: pair themed language with a conventional subtitle or accessible label, especially on first use.

### 3. User control and freedom — Good

Users can choose the tour or free exploration, jump to any scene, pause the tour, use deep links, open a conventional portfolio, and navigate BaileyOS apps independently. This is one of the site’s strongest areas.

Gaps:

- No visible way to remove a successful location marker.
- Field-log reset lacks undo.
- Long animated jumps may temporarily feel less controllable even if technically interruptible.

Recommended: add “Clear location,” undo for reset, and ensure any long jump can be interrupted by direct input.

### 4. Consistency and standards — Mixed to good

The dark palette, cyan/gold semantics, card treatment, typography, and hover/focus patterns are cohesive. BaileyOS uses familiar mobile-home and window conventions.

Inconsistencies:

- “Take the journey,” “guided journey,” and “tour” name the same concept.
- “Quick portfolio,” “portfolio,” and “about” overlap.
- Some internal content opens in a window, some in a new tab, and some as a page without a predictable rule.
- The single-quote parsing bug makes source notation visible as content.

Recommended: choose one label for each destination and define a simple rule: internal apps stay in BaileyOS; source documents and full-page reading explicitly use an external-page icon/label.

### 5. Error prevention — Good foundations, several fixable risks

The WebGL gate, no-script copy, reduced-motion path, keyless snapshot fallback, non-blocking CI fetch, and opt-in location request all prevent hard failure.

Risks:

- The visible location CTA does not preview the permission request.
- Resetting progress is easy to trigger.
- The handcrafted frontmatter parser accepts a common YAML style but renders it incorrectly.

Recommended: add just-in-time permission context, confirmation/undo for reset, and content-pipeline tests for quoting and malformed dates.

### 6. Recognition rather than recall — Mixed

Labeled BaileyOS icons, the quick portfolio, breadcrumbs, visible profile actions, and Notes cards are easy to scan. Terminal commands are optional rather than required.

The scene dots, hotspots, and thematic tools are much weaker on touch, where hover labels do not exist. Users must remember the six-level sequence and infer several controls.

Recommended: show labels for the active and next scenes on touch, retain tool descriptions after first opening, and make the route explicit as “1 of 6.”

### 7. Flexibility and efficiency of use — Excellent

The experience supports novice and expert paths: guided tour, scroll/pinch, arrow keys, buttons, direct scene navigation, hash deep links, quick portfolio, and BaileyOS/terminal access. This is an unusually complete set of alternate paths.

Recommended: preserve these paths, but visually separate novice defaults from expert controls. Keyboard shortcuts could be disclosed in a compact help panel rather than in always-visible guidance.

### 8. Aesthetic and minimalist design — Visually strong, informationally dense

The universe, Notes article, quick portfolio, and mobile BaileyOS all have a distinctive and coherent visual identity. Aesthetic-usability bias works in the site’s favor.

The cinematic home screen weakens minimalism because many small controls compete with the focal galaxy. The mobile lower HUD is the clearest failure.

Recommended: use progressive disclosure, one dominant CTA, larger type, and fewer simultaneous overlays. The galaxy should remain the visual hero.

### 9. Help users recognize, diagnose, and recover from errors — Mixed

The site provides quick-portfolio recovery from loading/WebGL failure and a themed 404 page with three useful destinations. Those are strong recovery patterns.

Location failure is generic, live-data failure is silent, and progress reset has no recovery.

Recommended: use actionable messages (“Location permission was denied — enable it in browser settings or try again”), show a subtle stale-data state, and provide undo for reset.

### 10. Help and documentation — Good onboarding, weak persistence

The guided journey, first-view instruction, accessible canvas description, quick portfolio, README, and new explanatory article provide multiple layers of help.

The mobile instruction is clipped, and there is no persistent, compact “How to explore” reference after the initial hint fades.

Recommended: turn the mobile Tools control into “Help & tools,” with a three-line interaction guide and definitions for the themed controls.

## UX laws synthesis

- **Hick’s Law:** The first view and 19-app mobile home offer many choices. Group secondary actions and stage disclosure.
- **Fitts’s Law:** The 14 px scene dots and 34 px action pills are too small for reliable touch. Increase hit areas without necessarily increasing visible ornament.
- **Jakob’s Law:** The quick portfolio and mobile OS wisely reuse familiar web/phone patterns. Use those patterns to explain the custom space vocabulary.
- **Miller’s Law:** Six scenes form a manageable chunk; 19 equal-weight apps do not. Group apps into Portfolio, Work, Personal, and Explore—or keep the grid but emphasize 4–6 core apps.
- **Von Restorff Effect:** The pulsing gold journey CTA is memorable. Avoid giving nearby controls equal emphasis.
- **Goal-Gradient Effect:** The six-scene route and field-log progress can motivate completion. Make “1 of 6” and the next destination explicit.
- **Zeigarnik Effect:** Collected signals and visited scales create productive incompleteness. Preserve progress and make reset recoverable.
- **Peak-End Rule:** The journey’s scale transitions and BaileyOS arrival are strong peaks/endings. Make the final state offer a simple next choice: Research, Notes, or CV.
- **Aesthetic-Usability Effect:** Visual polish earns patience, but it should not conceal small targets or clipped guidance.
- **Law of Common Region and Proximity:** Desktop HUD groups are coherent; the mobile bottom region combines unrelated identity, status, and navigation. Separate them into distinct layers.
- **Doherty Threshold:** Immediate loading copy and state changes are good. Keep transition feedback responsive and avoid long unexplained animation.
- **Tesler’s Law:** The underlying complexity is real; the interface should absorb more of it. Users should not need to learn the camera model, signals taxonomy, and OS metaphor simultaneously.

## Recommended sequence

### Before shipping

1. Fix single-quoted frontmatter parsing and add a regression test.
2. Redesign the mobile lower HUD to eliminate clipping/overlap.
3. Increase mobile hit targets for scene navigation and profile actions.
4. Add clear/retry/privacy states to geolocation.

### Next iteration

5. Simplify the first view with progressive disclosure.
6. Add labels/current state to mobile scene navigation.
7. Improve quick-portfolio nav discoverability and active-section feedback.
8. Make live signals linked and visibly timestamped.
9. Add confirmation or undo for field-log reset.

### Measure

Use the new analytics to compare:

- Journey starts versus direct manual travel
- Reach from Galaxy → Earth → BaileyOS
- Quick-portfolio exits from the initial scene
- Notes opens from BaileyOS versus the quick portfolio
- Location CTA starts versus successful marker placement

Avoid adding more events until these answer a specific design question. The useful product question is not “what was clicked?” but “which route helps visitors reach credible work fastest without losing the wonder?”
