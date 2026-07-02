# Post-change UX heuristic analysis

Date: 2026-07-01

This is the follow-up to `UX_HEURISTIC_ANALYSIS.md`. It evaluates whether the implemented changes resolved the original findings rather than merely restyling them.

## Verification scope

- Cinematic landing at desktop and 390×844 mobile
- BaileyOS mobile launcher and Notes
- Quick portfolio navigation
- Generated note title and metadata
- Earth location states in component tests and rendered DOM
- Field-log reset flow
- Empty live-activity snapshot and populated-state implementation
- Production build, lint, unit tests, and targeted multi-browser interaction tests

The committed live snapshot is empty, so a populated GitHub/Letterboxd feed could not be visually inspected with real data. The actual operating-system location permission prompt was not accepted during the audit; initial, loading, success, clear, denial, timeout, and retry UI states are covered by implementation and component tests.

## Outcome

All four ship-priority problems and the five next-iteration problems from the original report are addressed.

At 390×844:

- The identity card ends at y=716 and the guidance starts at y=718, eliminating the previous overlap.
- Guidance stays within the viewport and wraps instead of clipping.
- Scene targets are 44×44 px.
- Zoom controls are at least 44 px high and use “zoom out” / “zoom in.”
- The current position is persistently labeled “The Milky Way · 1 of 6.”
- Profile actions are deferred until the visitor starts interacting.

The result preserves the site’s character while making its interaction model substantially easier to parse.

## Before-and-after findings

| Original problem                                       | Implemented change                                                                                                                                  | Verification                                                   | Result                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| Mobile lower HUD clipped and overlapped                | Reflowed identity, guidance, scale, and zoom into separate vertical bands; allowed guidance to wrap                                                 | Browser geometry check at 390×844 plus responsive E2E contract | **Resolved**                                              |
| Note title displayed literal source quotes             | Frontmatter parser now strips matched single or double quotes; content regression test added                                                        | Generated article, Notes app data, and unit test               | **Resolved**                                              |
| Scene and profile targets were too small               | Mobile scene targets now have 44×44 hit boxes; profile actions and travel controls use 44 px minimum heights                                        | Computed layout and responsive E2E test                        | **Resolved**                                              |
| Location lacked trust and reversal                     | “Locate me” previews permission; on-device privacy copy is visible; errors distinguish denial/timeout/unavailable; success becomes “Clear location” | Rendered DOM plus Earth overlay unit test                      | **Resolved**                                              |
| First view exposed too many equal-weight controls      | Journey remains primary; tools are collapsed behind “Help & tools”; mobile credentials appear after engagement                                      | Rendered landing and interaction tests                         | **Resolved**                                              |
| Touch scene dots required recall                       | Added persistent scene name and “n of 6” progress; retained accessible names for every direct destination                                           | DOM snapshot and responsive test                               | **Resolved**                                              |
| Quick-portfolio navigation hid off-screen destinations | Added an overflow fade, active-section styling, IntersectionObserver updates, and automatic active-link centering                                   | Generated page and cross-browser E2E assertion                 | **Resolved**                                              |
| Live signals lacked freshness and links                | Renamed to “Recent activity,” exposed snapshot date/local state, linked repos and films, and added an explicit empty state                          | Source/build inspection; empty-state render path               | **Resolved**, populated visual QA pending a live snapshot |
| Field-log reset was immediately destructive            | First activation changes to “Confirm reset” for five seconds; second activation clears progress                                                     | Multi-browser interaction test                                 | **Resolved**                                              |
| BaileyOS presented 19 equal-weight apps                | Grouped apps into Portfolio, Explore, Personal, Connect, and Projects while preserving favorites in the dock                                        | Rendered mobile launcher and existing launcher tests           | **Resolved**                                              |
| Themed vocabulary required interpretation              | “Help & tools” explains travel, Field Log, and Drift; touch controls now use conventional zoom wording                                              | DOM content and interaction tests                              | **Resolved**                                              |

## Nielsen’s 10 usability heuristics after changes

### 1. Visibility of system status — Strong

The current scene now has a persistent name and ordinal position on touch. Loading, scene, scale, selected controls, field-log progress, geolocation state, and live-snapshot freshness are all visible.

The previous ambiguity in location failure is gone: denial, timeout, unsupported, and unavailable states have different messages and retry behavior.

### 2. Match between the system and the real world — Improved

“Zoom in,” “Zoom out,” “Locate me,” “Clear location,” “Recent activity,” and grouped app categories use familiar language. The themed vocabulary remains, but first-use help now translates it instead of expecting visitors to infer it.

The custom universe and BaileyOS metaphors still carry a learning cost, but that cost is now intentional and supported.

### 3. User control and freedom — Strong

Existing strengths—tour/free exploration, direct destinations, deep links, quick portfolio, and multiple input methods—remain intact.

New improvements:

- Location can be cleared.
- Failed location can be retried.
- Field-log reset requires confirmation.
- Secondary controls can be opened and closed.
- Profile shortcuts become available after engagement without requiring users to leave the universe.

### 4. Consistency and standards — Improved

Conventional action labels now match their outcomes, Notes titles render consistently across every surface, and BaileyOS content is grouped using familiar launcher conventions.

Internal apps still use windows while full reading pages and external sources use links/new tabs. The distinction is clearer because linked activity now looks and behaves like linked content.

### 5. Error prevention — Strong

The location control previews that permission will be requested and explains that coordinates stay on the device. Reset now has a deliberate second step. The content generator has a regression test for a common frontmatter quoting style.

Existing WebGL, JavaScript, reduced-motion, live-fetch, and 404 fallbacks remain.

### 6. Recognition rather than recall — Strong

Touch users no longer have to memorize six anonymous dots: the active scene and progress count stay visible. BaileyOS categories make the app set scannable, and “Help & tools” defines the site-specific controls.

The terminal remains an optional expert surface; no core task depends on remembered commands.

### 7. Flexibility and efficiency of use — Excellent

The changes preserve scroll, pinch, arrows, touch buttons, direct steps, tour, deep links, quick portfolio, BaileyOS, and terminal paths.

Progressive disclosure separates novice and expert controls without removing expert efficiency.

### 8. Aesthetic and minimalist design — Improved

The galaxy is again the primary visual object. The initial interface now emphasizes:

1. Take the journey
2. Use the quick portfolio
3. Explore manually

Tools, profile shortcuts, and detailed help no longer compete at equal weight. The mobile layout uses discrete regions instead of stacking unrelated controls into the same lower band.

BaileyOS remains visually rich, but headings reduce the perceived choice count from 19 individual apps to five meaningful groups.

### 9. Help users recognize, diagnose, and recover from errors — Strong

Location errors identify the likely cause and provide a retry path. A successful location action becomes reversible. Reset communicates that a second activation is required. Existing load/WebGL and 404 recovery remain clear.

The only deliberately silent recovery is failed deploy-time live fetching, because the previous snapshot remains usable; visible freshness now prevents that fallback from appearing falsely live.

### 10. Help and documentation — Improved

The persistent “Help & tools” control provides a compact interaction guide and definitions for Field Log and Drift. It replaces the previous dependence on a clipped one-line instruction.

The guided journey, quick portfolio, accessible canvas description, README, and explanatory note continue to provide deeper help.

## UX laws after changes

- **Hick’s Law:** Secondary controls are collapsed and BaileyOS choices are grouped. Decision cost is substantially lower.
- **Fitts’s Law:** Scene and travel targets meet a 44 px mobile target size.
- **Jakob’s Law:** Conventional labels and phone-launcher grouping support the custom metaphors.
- **Miller’s Law:** Six scenes remain one manageable sequence; 19 apps are chunked into five groups.
- **Von Restorff Effect:** The gold journey CTA remains the dominant first action.
- **Goal-Gradient Effect:** “1 of 6” makes progress concrete.
- **Zeigarnik Effect:** Field-log progress remains motivating but is now harder to erase accidentally.
- **Peak-End Rule:** Nothing weakens the major transitions or BaileyOS arrival; the final launcher now gives clearer next choices.
- **Aesthetic-Usability Effect:** Visual polish is now supported by legible guidance and adequate targets instead of compensating for them.
- **Common Region and Proximity:** Identity, help, progress, guidance, and travel controls occupy distinct regions.
- **Doherty Threshold:** Existing immediate state changes remain; location and reset now acknowledge intermediate states explicitly.
- **Tesler’s Law:** More complexity is absorbed by labels, grouping, and disclosure rather than passed to the visitor.

## Remaining opportunities

These are not regressions or unresolved ship blockers:

- Test the populated Recent Activity layout after the next live fetch.
- Consider anchored headings, reading time, and next/previous navigation once Notes contains several articles.
- Use analytics to compare journey starts, manual depth, quick-portfolio exits, and Notes opens before adding more interface.
- Continue monitoring initial 3D load and frame performance on low-end devices; interaction clarity no longer depends on solving that separate performance problem.

## Conclusion

The original audit’s core pattern was “strong concept, weak first-screen hierarchy.” After the changes, the concept remains intact and the hierarchy is substantially stronger.

No critical or major heuristic violations remain in the reviewed paths. The remaining work is measurement and content-scale refinement, not remediation of the original usability problems.
