# Open Items Audit: 2026-07-16

A full sweep of the project record: TRACKER.md, all 22 decision docs, all 26 briefings and closeouts (including `motionTiles/`), the 9 archived status reports and handoffs, the deploy checklist and verification matrix, the reference docs, the principle docs, and the case-study material. Every item below was checked against the current source tree where a check was possible; items the docs left ambiguous are marked.

The structure: Part 1 is what the tracker already carries. Part 2 is what it does not. Part 3 is the record-keeping drift, where the work happened but no doc says so. Critical flags are marked **[CRITICAL]** inline and collected at the top.

---

**END OF DAY, 2026-07-16. This audit is complete.** All five critical flags are resolved. Every quick win and every cheap win is banked: the README and release tag, the WASM pin, the reconciliation pass, fifteen verified checklist rows with three accessibility fixes, David's full Tier 3 sweep, the HC-dark accent re-hue across tokens and five assets, the short-viewport floor, the case-study draft, keyboard highlight parity, the grid-chunk prefetch, the orphaned assets and dead CSS, and the tracker tidy. Fourteen commits, `v1.0.0` tagged, everything live at cadence.davidpreli.com.

What remains is elective, session-sized work, none of it production risk: ~~the **Principles lazy retrofit**~~ (done 2026-07-16, the session after this close; see the Part 1 row and the rive-scaling doc's addendum), the physics-spring token family, the `.riv` asset-prefetch half, the preset vocabulary unification, the automated Tier 1 suite, the CSS import asymmetry, the reserved deep-link route, an ESLint baseline (David to approve the churn first), the `claude-workflow.md` stub, and the conditional git-history purge if the repo ever goes public. On the case study: David's What I Learned rewrite, the hiring-manager edit, portfolio integration, and the sharing pass. This document is now a record, not a to-do list; the tracker's Future work section carries what stays alive.

---

**Progress, same day (2026-07-16):** suggested-order items 1 and 2 are done (README URL, `v1.0.0` tag, the WASM pin applied and verified on built output). The mechanical half of item 3 is done: every Part 3 one-liner is closed (r3c1 and the Modal focus trap corrected in the tracker and closeout, the scroll-architecture and chronology headers closed, the WEBGL handoff superseded note, the r2c6 verdict recorded as reconstructed), stale banners are on `principle-component-status.md`, `cover-letter-reference.md`, `principles-reference.md`, and `component-accounting.md`, the CLAUDE.md token-architecture one-liner is extended, the voice doc's own em-dashes are fixed (eight, not the two first counted), and both duplicate `.txt` files are deleted. What remains of item 3 is the case-study half: the framing decisions (12-vs-18, timeline) and the full source-doc refresh, which belong to the Week 10 session.

**Principles lazy retrofit (2026-07-16, evening, the session this close queued):** done, one session as scoped. The build exposed what the docs did not record: `react-canvas` had three eager importers, not one. PrinciplesLibrary, the Carousel demo in Token Lab's Gesture category, and the same-day WASM pin (`riveWasm.js` imported `@rive-app/canvas` from `main.jsx` to call `setWasmUrl`). All three moved: the two components to `React.lazy` chunks with ErrorBoundary + Suspense boundaries and an idle prefetch from TokenLab, the canvas pin into `src/utils/riveWasmCanvas.js` via `useHCContrastColors` inside the lazy graph. Eager JS 225 → 170 kB gzipped; the canvas runtime and its 686 kB WASM binary are unreachable from first paint. The Suspense-inside-crossfade problem this audit flagged dissolved on contact: the crossfade layers are absolutely positioned, so the boundary sits inside a fixed-geometry layer and the crossfade's motion.div never suspends. Verified on built output via Playwright (load order, on-demand WASM fetch, 18 cards, card expand, Gesture Carousel, zero console messages); 104 tests pass. Record: the addendum in `docs/decisions/rive-scaling-future-work-2026-07-07.md`. Ships with the next deploy, alongside the WASM pin.

**Item 4 run (2026-07-16, same day):** the verification session against the deploy checklist, on built output via Playwright. Fifteen checklist rows now carry dated verifications. Three real failures found, fixed, and re-verified on built output: the eight token sliders had no accessible name (now `aria-label={tokenKey}`), no visible keyboard-focus indicator (now a 2px accent `:focus-visible` outline), and the DurationVisualizer time readouts used muted2 (#888, 3.25:1 in light; now muted). The thesis test passed by hand: a slider drive rewrote `--motion-duration-fast` and the code view's live value followed. Reduced-motion and forced-colors pass under emulation; the matrix's open question resolves as "Playwright cannot emulate prefers-reduced-transparency" (manual Tier 3). Still open from the two documents: the automated Tier 1 suite itself, easing-slot/Explore-mode/out-of-range propagation checks, the in-flight/absent-state rows, OS-preference first-load, the HC Rive repaint check, and the per-principle Tier 2/3 matrix. One session note with teeth: the Claude Browser pane runs pages as a hidden tab (rAF frozen), which manufactured a convincing false "stuck modal" bug on dev AND prod before Playwright disproved it; recorded in memory so no future session chases it.

---

## Critical flags

Five items rise above the rest. Each is expanded in its section below.

1. ~~**[CRITICAL] The WebGL2 WASM loads from the jsDelivr CDN at runtime on the live site.**~~ **Resolved 2026-07-16.** Confirmed real: both runtimes fetched WASM from unpkg with a jsdelivr fallback, no pin anywhere in `src/`. Applied the documented `setWasmUrl` pin for both runtimes (`src/utils/riveWasm.js`, imported first in `main.jsx`); verified on built output that both binaries fetch from our origin with zero CDN requests. Addendum added to the hero wiring doc. *(Ships with the next deploy.)*

2. ~~**[CRITICAL] The accessibility verification debt is real and its deferral condition has lapsed.**~~ **Largely resolved 2026-07-16** by the item 4 session: fifteen checklist rows verified on built output via Playwright (keyboard, focus, contrast floors across four themes and four views, reduced-motion, forced-colors, the thesis test by hand), and three real failures found and fixed same day (unnamed sliders, missing slider focus ring, trackTime contrast). What remains: the **automated** Tier 1 suite is still unwritten, the in-flight/absent-state rows, easing-slot/Explore/out-of-range propagation, OS-preference first load, the HC Rive repaint check, and extending both documents' row sets to cover Motion Tiles as a first-class surface.

3. ~~**[CRITICAL] The case-study source documents contradict the shipped app.**~~ **Closed 2026-07-16 by the Week 10 session:** `cover-letter-reference.md` fully refreshed (banner removed; four themes, three tools, 32-folder census, current facts), `principle-component-status.md` retired as a dated historical record, `principles-reference.md` corrected in place (both drifted specs, placeholder era closed), `component-accounting.md` censused, `knowledge/06-current-status.md` rewritten to current state. The Thomas & Johnston quote check is moot: the case study cites no direct quotes; they render only in the UI with the existing sourced attributions. *(Update 2026-07-16: all four files now carry stale-warning banners, so wrong facts cannot leak in silently; the full refresh still belongs before the Week 10 writing pass.)* `docs/principle-component-status.md` (last refreshed 2026-05-05) lists six principles as unbuilt or unwired; `docs/cover-letter-reference.md` says three themes, two sections, twenty components, and omits Motion Tiles entirely; `docs/references/principles-reference.md` still describes the pre-Rive placeholder era. The gap-analysis kickoff names these files as case-study sources. Reconciling them belongs before the Week 10 writing pass, or wrong facts land in the artifact hiring managers read. *(The case study is on the tracker; the stale-source problem is not.)*

4. ~~**[CRITICAL] Short desktop windows break the demo-area crossfade.**~~ **Resolved 2026-07-16.** The reachable manifestation was the 720px boundary (gate fires below 720, the controls rail-collapse at 720) with sub-600px height: the demo column collapsed to 105px. Fixed with a `min-height: 600px` floor on `.demoArea` under the same media query; verified on built output at 720x550, 1200x550, and the normal viewport. Addendum in the navigation-architecture doc. At 720px or wider and 600px or shorter, the `max-height` unlock makes `.tokenLab` auto-height and collapses the absolutely-positioned crossfade layers. The 2026-07-14 mobile gate covers width only, so this remains reachable on the deployed site by resizing, and pairs with 200% browser zoom. Recorded as a known gap in `docs/decisions/navigation-architecture-2026-06-17.md`, never scheduled. *(On the tracker only as a buried weekly note.)*

5. ~~**[CRITICAL] Motion Tiles shipped with its design sign-offs unrecorded.**~~ **Closed 2026-07-16: David ran the full Tier 3 sweep** (thirteen rows, all ticked below); verdicts recorded in the tracker's Motion Tiles section and `TOKEN_LAB_CLOSEOUT.md`. The preset values are blessed as final; [proposed] is retired. *(Update 2026-07-16: David is running the Tier 3 visual sweep now; record each verdict in `GROUP2_PATHEFFECT_ROLLOUT_CLOSEOUT.md` or the tracker as it lands.)* The snappy and cinematic preset values are marked `[proposed]` in four briefing docs, "pending a tuning pass against the live grid" that no doc records happening; the values shipped verbatim. Three per-tile visual confirmations flagged for David were never recorded as done: the stroked-shape pixelation read (r1c4, r4c2, r6c6), the r1c6 `circleScale` percent-rule scrub (a potential collapsed-at-rest state), and the flip (r1c2) amplitude read against the reference sheet. All of these tiles are live in the shipped pool. These may all be fine on screen; the record does not say. *(Not on tracker.)*

---

## Part 1: On the tracker

### Declared open (the tracker's own open sections)

| Item | Where | Status |
|---|---|---|
| Case Study, Week 10 | Week 10 | **Draft written 2026-07-16** (`docs/case-study.md`); first three tracker boxes ticked. Remaining: David's What I Learned rewrite, the hiring-manager edit, portfolio integration, then the sharing pass. |
| README Live-URL fill | Status header + Week 9 | **Done 2026-07-16** (commit 635c51b): "(pending first deploy)" dropped. |
| Release tag | Status header + Week 9 | **Done 2026-07-16**: annotated `v1.0.0` pushed; package.json bumped to match. |
| Demo video (optional) | Week 9 | Open, explicitly optional. |
| "Complete token architecture documentation" | Week 9, unchecked box | Ambiguous scope. `docs/token-architecture.md` is substantial; nothing defines what "complete" adds. Worth deciding whether to check it or name the gap. |
| Physics-spring token family | Future work, architecture | Deliberately deferred, scoped as its own pass. The harmonized presets doc calls it the highest-value case-study addition, which raises its priority relative to the other two. |
| Scale press/lift legibility split | Future work, architecture | Deferred, internal legibility only. Note: `motion-presets-harmonized.md` already uses the new names while `motion-presets.md` uses the flat ones, so the two reference docs currently disagree. |
| Duration scalar for the distance-and-speed visualizer | Future work, architecture | Deferred. The visualizer it serves is itself unplanned work. |
| Per-section lazy loading, seeded on the new page | Future work, Rive scaling | Effectively done: Motion Tiles shipped as a landing-gated `React.lazy` chunk. The checkbox was never ticked. |
| Prefetch the active section's `.riv` set on nav open or hover | Future work, Rive scaling | Half done 2026-07-16: the grid's JS chunk prefetches on landing mount (verified: both chunk files fetch before Enter), so the Suspense fallback rarely paints. The `.riv` asset half stays open. |
| Retrofit Principles to lazy | Future work, Rive scaling | **Done 2026-07-16, same day.** PrinciplesLibrary, the Carousel demo (a second eager `react-canvas` importer the plan predated), and the WASM pin's canvas half all moved behind lazy boundaries with idle prefetch; eager JS 225 → 170 kB gzipped, verified on built output. The Suspense-inside-crossfade problem dissolved against the absolutely-positioned layers. Record: the rive-scaling doc's addendum. |

### Buried in tracker weekly notes (on the file, not in any open-items section)

- **Deep-linking to a specific expanded principle** (`#/principles/<filter>/<id>`). Deferred 2026-06-17; confirmed still reserved-only in `src/hooks/useHashRoute.js:28`.
- **Three-column responsive reflow / nav collapse on narrow screens.** Deferred 2026-06-17, folded into the mobile item. Partially mooted by the 2026-07-14 hard mobile gate; the gate decision never circled back to close this note.
- **True phone layouts and short-viewport handling.** "Still future" per the 2026-06-17 note. The phone half is superseded by the mobile gate; the short-viewport half is Critical flag 4.
- ~~**Modal focus trap** (P03 note).~~ **Closed 2026-07-16.** The trap has existed in `Modal/index.jsx:53` all along and the item 4 session verified it behaviorally (cycles, Escape closes, focus not lost). The stale tracker note and `principle-component-status.md` were both corrected.
- **HC backdrop dimming reads subtly** (P03/Drawer note). Accepted as-is; still true, now across four themes.
- **onExitComplete cascade idea for the case-study slideshow.** Week 3 note says "file that as a planned feature in the tracker." It never got filed anywhere but that sentence.
- **Optional follow-ups from the naming-docs session** (2026-06-20): the in-tool editable-vs-fixed explainer (the Token Lab guide FAQ now exists as its natural home), the grep-based `TOKEN_COMPONENT_MAP` lock test (deliberately declined as brittle), and ~~the CLAUDE.md References one-liner for token-architecture.md~~ (done 2026-07-16).
- **Rive canvases ignore forced-colors.** Accepted limitation from 2026-06-22, recorded pre-Motion-Tiles. The Rive surface area has since grown by roughly 50 canvases, so the acceptance is worth a conscious re-affirmation rather than an inheritance.
- ~~**r3c1 state-machine gap.**~~ **Closed 2026-07-16 (retroactive).** Fixed by the 2026-07-12 re-export; the tracker note and closeout now record it.
- **Tracker hygiene.** The trailing "## Pending Items" heading is empty, and the Decisions Log table has three undated rows. Cosmetic.

---

## Part 2: Not on the tracker

### Verification debt *(Critical flags 1 and 2)*

- ~~**`docs/deploy-checklist.md`, unchecked blocks.**~~ **Fifteen rows verified and dated 2026-07-16** (built output, Playwright): guide contrast and code chips, nav keyboard, focus rings, keyboard operability, four-mode text parity, reduced-motion, theme re-read, forced-colors, live token propagation, both contrast floors, focus-never-lost. Still unchecked and real: disabled state, hover-independence, pressed-vs-hover, all four In-flight/absent rows, out-of-range input, Constrained-vs-Explore, every-animated-value-traces, OS-preference first load, HC Rive repaint, accent-never-decorative, hero-final-art (Tier 3), guide voice pass (Tier 3), deep-link back-button traversal.
- **`docs/deploy-verification-matrix.md`:** the thesis test now has a passing manual run (2026-07-16) but the automated test the matrix specifies is still unwritten, as is the rest of the Tier 1 suite and the four-phase plan. ~~One explicit open question: whether Playwright `emulateMedia` supports `prefers-reduced-transparency`.~~ Answered 2026-07-16: it does not; that row is manual Tier 3 permanently.
- **Coverage gap in both docs:** neither mentions Motion Tiles, the fourth theme, or the Worker deployment. The checklists describe an app two tools and one theme smaller than the one that shipped.
- **Found and fixed in the item 4 session (2026-07-16):** the eight token sliders had no accessible name and no keyboard-focus indicator, and the DurationVisualizer time readouts failed AA in light theme. All three fixed and re-verified on built output (commit 43ec278).
- ~~**Keyboard slider adjustment fires no active-token highlight**~~ Resolved 2026-07-16: `onFocus`/`onBlur` on the slider sustain and clear the highlight; verified on built output (three connected demo groups light on keyboard focus, clear on blur). Pointer behavior unchanged.

### Production and correctness risks

- ~~**[CRITICAL] WASM CDN dependency**~~ Resolved 2026-07-16 (flag 1 above): both runtimes pinned in `src/utils/riveWasm.js`, verified on built output.
- ~~**[CRITICAL] Short-desktop crossfade collapse**~~ Resolved 2026-07-16 (flag 4 above).
- **Two view-model contracts under one name.** Desktop `hero3.riv` moved to four homogenized theme instances 2026-07-15; `heromobile.riv` and `MobileGate` deliberately stayed on the three-instance-plus-runtime-flip contract. Both docs (`hero-webgl2-wiring`, `mobile-gate`) warn that a future "make them match" edit fails silently if only one side moves. A landmine, not a task.
- **`getExpandedFootprint` at `columnCount === 1`** still computes an invalid grid line. Structurally unreachable since the 420px demo-column floor; the code was never patched and carries no test. Fine as long as the floor holds; the second Vitest slice (footprint extraction) from the 2026-06-18 handoff never happened.
- **Re-export bind regression rule.** Any future group-2 tile re-export needs the HUD unbound check; the r4c1 blank-tile export is the precedent. Standing rule, no owner.

### Motion Tiles sign-offs *(Critical flag 5)*: all closed by David's Tier 3 sweep, 2026-07-16; verdicts in the tracker

- snappy / cinematic preset values shipped as `[proposed]`; the tuning pass ("the one number-turning session left in the project") is unrecorded.
- Stroked-shape pixelation read on r1c4, r4c2, r6c6: flagged for visual confirmation in three docs, never closed.
- r1c6 `circleScale` percent-rule scrub: a possible collapsed-at-rest circle, flagged in `T1_ROTATORS_CLOSEOUT.md`, never closed.
- flip (r1c2) amplitude and rotor (r2c6) rotation-unit reads: model-inferred values awaiting David's eye; a wrong rotor unit would be visually loud, so it is probably fine, but nothing says so.
- pull (r2c2) ramp-width `W` tuning: the 0.60 default was never revisited. The ping-pong phase contract it depends on is met by the shipped clock.
- Enter button hover: the integration doc assumes the Rive may carry hover and never verified it; a CSS hover is the fallback if not.
- MotionTilesTitle optical size: "adjust if the glyphs read small once the artwork settles" was never revisited.
- Grid-panel rail collapse: the v8 closeout said port Token Lab's ≤720px collapse "only if this graduates from a lab route." It graduated. The mobile gate likely moots the narrow case; one resize check between the gate width and 1024px would settle it.

### Design decisions parked in docs only

- **M2 vs M3 easing lineage.** `motion-presets-harmonized.md`: "Confirm M2, or switch to M3." The doc's point is knowing the fork exists; the confirmation was never recorded.
- **Reduced-motion pedagogy for P14, P15, P16.** The demos respect OS reduce-motion and snap instead of animating; the wrap-in-`respectReducedMotion={false}` alternative is documented as a possible future change. Genuine open design question, four themes deep.
- **HC-light AAA option.** Accent could drop to `#6b4400` (8.6:1) at the cost of a browner tone. Answer pre-computed, question never asked.
- **Nav column placement** (middle vs far left). Explicitly David's call, explicitly non-blocking, never made.
- **Preset vocabulary unification** (Token Lab's tokens vs Motion Tiles' presets). The integration doc calls it a case-study thread: one motion vocabulary driving a component set and a tile field. CLAUDE.md's Motion Tiles pitch already describes the unified state. Strategic, and directly feeds Week 10.
- **Two token candidates from the Modal era**, `--motion-ease-decelerate-expressive` and `--motion-delay-xshort`, deferred to "decide during the Modal build." The Modal shipped long ago; the decision was never made either way.
- **Grid Phase 2: proportional deformation of neighbor cards.** The documented seam is still clean and still unused.
- **Hero interactivity: feeding React-side data (token values) into the hover.** Tabled 2026-06-17, partially overtaken by the state-machine-driven hero, never revisited.
- **Preset enter/exit pinning vs Carbon's per-preset curves.** Documented deliberate divergence, offered for reconsideration; no action unless the lesson changes.

### Case study inputs *(Critical flag 3)*

From `docs/case-study-kickoff-gap-analysis.md` (the working plan; committed 2026-07-16, no longer untracked):

- Resolve the 12-vs-18 principles framing and add the six extended-principle slots. The gap analysis calls the extensions the strongest single talking point.
- Pick one timeline framing (calendar span vs week-numbered arc) and fill it.
- Write the formerly completion-gated sections; the tool is live, they are unblocked.
- The 18 per-principle build notes, "the largest lift."
- Links section: live URL and repo, known values, paste them.
- Sharing material (posts, portfolio blurbs) queued as its own pass after.

Source-doc reconciliation the gap analysis does not list but the writing depends on:

- `docs/principle-component-status.md`: refresh from 2026-05-05 state or mark superseded. *(Stale banner added 2026-07-16; full refresh open.)*
- `docs/cover-letter-reference.md`: three themes → four, two sections → three tools, add Motion Tiles, recount components. *(Stale banner added 2026-07-16; full refresh open.)*
- `docs/references/principles-reference.md`: retire the placeholder strategy; fix drifted specs. *(Stale banner naming both drifted specs added 2026-07-16; full refresh open.)*
- `docs/references/principle-quotes.md`: verify Thomas & Johnston wording against a print edition if the quotes appear in the case study; they render attributed in the UI.
- ~~`docs/component-accounting.md`: refresh or date-stamp.~~ Date-stamped 2026-07-16.
- Browser-project knowledge files (`docs/browser-project/README.md` maintenance list): the uploads predate deployment; the case-study Project needs current versions before the writing session.
- Duration-scalar attribution: earlier drafts credited a named system, removed as unverifiable; confirm before citing in the case study.

### Repo and asset hygiene

- **No ESLint or Prettier config.** Flagged 2026-06-18 as the expected baseline for a React portfolio repo; confirmed still absent.
- ~~**Orphaned public assets ship to the deploy.**~~ Removed 2026-07-16: `tokenlabhero.riv`, `subTitleThemed.svg`, `titleThemed.svg` (all verified unreferenced; a stale color.css comment pointing at titleThemed corrected to title2). The remaining title SVGs are source art David may still want; left in place.
- ~~**Dead CSS.**~~ Removed 2026-07-16: the pre-Rive `.animationPlaceholder` rules are gone from PrincipleCard.module.css.
- ~~**Duplicate files.**~~ Both `.txt` copies deleted 2026-07-16.
- **`docs/claude-workflow.md`** is a stub ("_To be written._") that other docs cite.
- **Git history purge** if the repo ever goes public: the 2026-07-14 cleanup trimmed the tree, not history. Conditional.
- **CSS import asymmetry:** Token Lab exports CSS but imports only JSON. The "Framer Motion config" export format named in the 2026-06-18 handoff was never built. Both are feature gaps for the tool's stated audience, neither tracked.
- ~~**Voice doc self-violation.**~~ Fixed 2026-07-16: eight prose em-dashes (the audit first counted two), replaced per the doc's own preference order; the one remaining is the rule naming the character.
- **Stale accent hex** in `docs/skills/rectangle-diagram-technique.md` (`#76c17d`, pre-2026-06-22). Cosmetic.

---

## Part 3: Resolved but unrecorded (doc drift to close)

Work that happened; the record still said otherwise. **All items below were closed 2026-07-16** (commit 4897bda). Kept struck through as the record of what drifted.

- ~~**r3c1 is fixed.** `r3c1.riv` re-exported 2026-07-12 with `r3c1SM`; the tracker's 2026-07-11 note and `GROUP2_TILEGRID_16_CLOSEOUT.md` still call it the remaining gap.~~
- ~~**All temporary query gates are retired.** `?pixel`, `?pixeltest`, `?pixelrive`, `?tilegrid`, `?tileperf`, `?ingredients`, `?group2grid`, `?v8grid`: none remain in `src/App.jsx`, and `src/components/IngredientGrid/` is deleted (with its `backingSize` and `GATE` scaffolds). Five briefing docs still list gate retirement as open.~~
- ~~**The Vite 8 step happened** (`^8.0.16`, commit 9e781f7); two docs still describe it as a kept-open door.~~
- ~~**`hero.riv` authoring, the HC-dark theme, the Cloudflare dashboard steps, and the group-2 16-tile build** are all done and recorded in their own docs, but remain phrased as open in earlier docs (`chrome-timing` "Still open", `deployment-prep` remaining list, June handoffs). No action beyond knowing the later doc wins.~~
- ~~**`docs/decisions/tokenlab-scroll-architecture-2026-05-05.md`** still reads "Status: Decision pending"; Option B shipped as the app-shell. Add the closing line.~~
- ~~**`docs/references/WEBGL_PIXELATION_HANDOFF.md`** ends with a remaining-steps list for a route that lost; the PathEffect route shipped. Add a superseded note.~~
- ~~**The 36-file preload concern** resolved by architecture: group 1 consolidated into one `ingredients_v8.riv`; the 16 group-2 files are mitigated by the landing gate.~~
- ~~**r2c6 vertex-binding verdict:** the tile shipped, the "record which mechanism won" instruction in `TOKEN_LAB_PHASE2.md` §6 was never executed. One sentence in `TOKEN_LAB_WORKFLOW.md` §7 closes it.~~
- ~~**`principle-component-status.md` P03 notes** claim the focus trap and easing-slot tabs are deferred; the tabs shipped 2026-05-05 (tracker) and the focus trap is claimed done in token-architecture.md. Reconcile alongside the Part 2 verification.~~

---

## Suggested order

1. ~~The two quick wins: README Live URL, release tag.~~ Done 2026-07-16.
2. ~~Verify the WASM fetch on the live site; apply the `setWasmUrl` pin.~~ Done 2026-07-16; ships with the next deploy.
3. ~~The source-doc reconciliation pass.~~ Done in full 2026-07-16: the mechanical half in the afternoon, the case-study half (source refresh, framings) in the Week 10 session.
4. ~~A single verification session against the deploy checklist on built output.~~ Done 2026-07-16: fifteen rows dated, three failures fixed (commit 43ec278). The automated suite and the remaining rows are listed under Critical flag 2.
5. ~~The Motion Tiles sign-off sweep.~~ Done 2026-07-16: David closed all thirteen Tier 3 rows; three assets re-authored along the way for the HC-dark accent re-hue.
6. Week 10. **Started 2026-07-16, same day: the full case-study draft is written** (`docs/case-study.md`) with the agreed framings (classic 12 extended by 6; calendar span; Motion Tiles featured as the third Approach thread). Remaining: David's rewrite of What I Learned, the hiring-manager edit pass, portfolio integration, then the sharing-material pass.

The rest is future work in the honest sense, and the tracker's Future work section is the right home for the items in Part 2 worth keeping alive: the Principles lazy retrofit, the prefetch pass, the preset vocabulary unification, and the physics-spring family.

---

## Tier 3 shortlist: CLOSED (David, 2026-07-16)

The rows only eyes can close. Tick each here as the verdict lands, and note it in the source doc named in parentheses so the drift this audit chased does not restart.

Motion Tiles sign-offs (record in `GROUP2_PATHEFFECT_ROLLOUT_CLOSEOUT.md` or the tracker):

- [x] snappy / cinematic preset values: bless the shipped `[proposed]` numbers as final, or run the tuning session (`TOKEN_LAB_CLOSEOUT.md` and three siblings)
- [x] Stroked-shape pixelation read on r1c4, r4c2, r6c6 in context (`PIXELATION_METHODS_COMPARISON.md`)
- [x] r1c6 rest-state scrub: confirm the circle is not collapsed at progress 0 (`T1_ROTATORS_CLOSEOUT.md`)
- [x] flip (r1c2) amplitude and open/close profile against the reference sheet (`T2_TRANSLATORS_CLOSEOUT.md`)
- [x] rotor (r2c6) rotation reads as a half-turn, not a twitch (`T1_ROTATORS_CLOSEOUT.md`)
- [x] pull (r2c2) ramp-width `W` at 0.60: keep or tune (`T3_LINEAR_PHASE_CLOSEOUT.md`)

Site-wide visual rows (record in `docs/deploy-checklist.md`):

- [x] Landing renders the final hero art on the live site, not the fallback prompt
- [x] Four-theme visual parity on the Rive surfaces (the text-contrast sweep is done; art is the open half)
- [x] HC-light ↔ HC-dark switch repaints the Rive artwork in both directions
- [x] Token Lab guide voice pass (register, em-dash count zero)
- [x] Reduced-transparency scrim on Modal and Drawer backdrops (OS setting; un-automatable in Playwright)
- [x] Enter button hover: confirm the Rive carries a hover response, or ask for the CSS fallback
- [x] MotionTilesTitle optical size now that the artwork has settled
