# Open Items Audit: 2026-07-16

A full sweep of the project record: TRACKER.md, all 22 decision docs, all 26 briefings and closeouts (including `motionTiles/`), the 9 archived status reports and handoffs, the deploy checklist and verification matrix, the reference docs, the principle docs, and the case-study material. Every item below was checked against the current source tree where a check was possible; items the docs left ambiguous are marked.

The structure: Part 1 is what the tracker already carries. Part 2 is what it does not. Part 3 is the record-keeping drift, where the work happened but no doc says so. Critical flags are marked **[CRITICAL]** inline and collected at the top.

---

## Critical flags

Five items rise above the rest. Each is expanded in its section below.

1. **[CRITICAL] The WebGL2 WASM loads from the jsDelivr CDN at runtime on the live site.** The hero, the mobile gate, the Token Lab title, and all of Motion Tiles sit on that runtime. A blocked CDN fetch (ad blocker, corporate firewall, CSP) blanks them silently. The `setWasmUrl` local pin is documented as "one edit away" in `docs/decisions/hero-webgl2-wiring-2026-07-02.md` and was never applied or verified post-deploy. The audience is hiring managers on unknown networks. *(Not on tracker.)*

2. **[CRITICAL] The accessibility verification debt is real and its deferral condition has lapsed.** `docs/deploy-checklist.md` and `docs/deploy-verification-matrix.md` are almost entirely unchecked: keyboard operability, focus management, contrast floors, forced-colors, reduced-transparency, and the live token-propagation test (the matrix's own "highest-value test in the suite"). The chrome-timing decision doc deferred the Tier 1 suite "to post-integration"; integration closed 2026-07-13 and the site is deployed. Neither document covers Motion Tiles or the fourth theme at all. *(Not on tracker.)*

3. **[CRITICAL] The case-study source documents contradict the shipped app.** `docs/principle-component-status.md` (last refreshed 2026-05-05) lists six principles as unbuilt or unwired; `docs/cover-letter-reference.md` says three themes, two sections, twenty components, and omits Motion Tiles entirely; `docs/references/principles-reference.md` still describes the pre-Rive placeholder era. The gap-analysis kickoff names these files as case-study sources. Reconciling them belongs before the Week 10 writing pass, or wrong facts land in the artifact hiring managers read. *(The case study is on the tracker; the stale-source problem is not.)*

4. **[CRITICAL] Short desktop windows break the demo-area crossfade.** At 720px or wider and 600px or shorter, the `max-height` unlock makes `.tokenLab` auto-height and collapses the absolutely-positioned crossfade layers. The 2026-07-14 mobile gate covers width only, so this remains reachable on the deployed site by resizing, and pairs with 200% browser zoom. Recorded as a known gap in `docs/decisions/navigation-architecture-2026-06-17.md`, never scheduled. *(On the tracker only as a buried weekly note.)*

5. **[CRITICAL] Motion Tiles shipped with its design sign-offs unrecorded.** The snappy and cinematic preset values are marked `[proposed]` in four briefing docs, "pending a tuning pass against the live grid" that no doc records happening; the values shipped verbatim. Three per-tile visual confirmations flagged for David were never recorded as done: the stroked-shape pixelation read (r1c4, r4c2, r6c6), the r1c6 `circleScale` percent-rule scrub (a potential collapsed-at-rest state), and the flip (r1c2) amplitude read against the reference sheet. All of these tiles are live in the shipped pool. These may all be fine on screen; the record does not say. *(Not on tracker.)*

---

## Part 1: On the tracker

### Declared open (the tracker's own open sections)

| Item | Where | Status |
|---|---|---|
| Case Study, Week 10: narrative, decisions, learning arc, hiring-manager edit, portfolio integration | Week 10, five unchecked boxes | Untouched. The kickoff gap analysis (`docs/case-study-kickoff-gap-analysis.md`, currently untracked in git) is the working plan. |
| README Live-URL fill | Status header + Week 9 | Confirmed still open: README line 9 reads "(pending first deploy)". Site went live 2026-07-15. Quick win. |
| Release tag | Status header + Week 9 | Confirmed still open: `git tag` returns nothing. Quick win. |
| Demo video (optional) | Week 9 | Open, explicitly optional. |
| "Complete token architecture documentation" | Week 9, unchecked box | Ambiguous scope. `docs/token-architecture.md` is substantial; nothing defines what "complete" adds. Worth deciding whether to check it or name the gap. |
| Physics-spring token family | Future work, architecture | Deliberately deferred, scoped as its own pass. The harmonized presets doc calls it the highest-value case-study addition, which raises its priority relative to the other two. |
| Scale press/lift legibility split | Future work, architecture | Deferred, internal legibility only. Note: `motion-presets-harmonized.md` already uses the new names while `motion-presets.md` uses the flat ones, so the two reference docs currently disagree. |
| Duration scalar for the distance-and-speed visualizer | Future work, architecture | Deferred. The visualizer it serves is itself unplanned work. |
| Per-section lazy loading, seeded on the new page | Future work, Rive scaling | Effectively done: Motion Tiles shipped as a landing-gated `React.lazy` chunk. The checkbox was never ticked. |
| Prefetch the active section's `.riv` set on nav open or hover | Future work, Rive scaling | Open. Overlaps the motion-tiles integration doc's "prefetch the grid chunk" item; one covers assets, the other the code chunk. |
| Retrofit Principles to lazy | Future work, Rive scaling | Open, and its stated precondition ("after the pattern is proven on Tiles") is now met. This is the move that takes `react-canvas` off first paint. The bundle-revisit trigger ("when the second Rive-heavy section lands") has also fired. |

### Buried in tracker weekly notes (on the file, not in any open-items section)

- **Deep-linking to a specific expanded principle** (`#/principles/<filter>/<id>`). Deferred 2026-06-17; confirmed still reserved-only in `src/hooks/useHashRoute.js:28`.
- **Three-column responsive reflow / nav collapse on narrow screens.** Deferred 2026-06-17, folded into the mobile item. Partially mooted by the 2026-07-14 hard mobile gate; the gate decision never circled back to close this note.
- **True phone layouts and short-viewport handling.** "Still future" per the 2026-06-17 note. The phone half is superseded by the mobile gate; the short-viewport half is Critical flag 4.
- **Modal focus trap** (P03 note: "production use requires Tab/Shift-Tab containment"). Resolved in code: `Modal/index.jsx` carries a full Tab/Shift-Tab trap with focus-in on open (line 53). The tracker's P03 deferral note and `principle-component-status.md` are stale; `token-architecture.md` is right. Moved to Part 3 in spirit; listed here because the stale note lives on the tracker.
- **HC backdrop dimming reads subtly** (P03/Drawer note). Accepted as-is; still true, now across four themes.
- **onExitComplete cascade idea for the case-study slideshow.** Week 3 note says "file that as a planned feature in the tracker." It never got filed anywhere but that sentence.
- **Optional follow-ups from the naming-docs session** (2026-06-20): the in-tool editable-vs-fixed explainer (the Token Lab guide FAQ now exists as its natural home), the grep-based `TOKEN_COMPONENT_MAP` lock test (deliberately declined as brittle), and the CLAUDE.md References one-liner for token-architecture.md (confirmed still not done; trivial).
- **Rive canvases ignore forced-colors.** Accepted limitation from 2026-06-22, recorded pre-Motion-Tiles. The Rive surface area has since grown by roughly 50 canvases, so the acceptance is worth a conscious re-affirmation rather than an inheritance.
- **r3c1 state-machine gap.** The tracker (2026-07-11 note) and the group-2 closeout both say r3c1 remains broken. It does not: `public/riveTiles/group2/r3c1.riv` (re-exported 2026-07-12) carries `r3c1SM`. See Part 3.
- **Tracker hygiene.** The trailing "## Pending Items" heading is empty, and the Decisions Log table has three undated rows. Cosmetic.

---

## Part 2: Not on the tracker

### Verification debt *(Critical flags 1 and 2)*

- **`docs/deploy-checklist.md`, unchecked blocks:** all five Interaction states rows (disabled, focus-visible at 3:1, keyboard, hover-independence, pressed-vs-hover); all four In-flight/absent states rows; nine of ten Theme and motion parity rows (forced-colors, reduced-transparency, OS-preference first load, four-mode parity, and more); all four Accessibility floors rows; three live Token integrity rows; the hero row (stale, hero shipped); guide contrast, guide voice pass, nav keyboard operability, deep-link checks. Some rows are done-but-unticked (the theme work landed 2026-06-22); most were never verified on the shipped app.
- **`docs/deploy-verification-matrix.md`:** one checked box in the whole document (the static token-integrity grep). The Playwright token-propagation test the matrix calls "the thesis executed" is unwritten. The four-phase execution plan never ran. One explicit open question: whether Playwright `emulateMedia` supports `prefers-reduced-transparency`.
- **Coverage gap in both docs:** neither mentions Motion Tiles, the fourth theme, or the Worker deployment. The checklists describe an app two tools and one theme smaller than the one that shipped.
- **Keyboard slider adjustment fires no active-token highlight** (`docs/decisions/code-view-active-highlight-2026-06-19.md`, "left as is"). Keyboard users get less feedback than pointer users in the code view. The one open item in this audit that is itself an accessibility behavior rather than an unverified check.

### Production and correctness risks

- **[CRITICAL] WASM CDN dependency** (flag 1 above). One edit to apply the documented `setWasmUrl` pin, plus the react-canvas twin. At minimum, verify the fetch on `cadence.davidpreli.com` under an ad blocker before deciding it can wait.
- **[CRITICAL] Short-desktop crossfade collapse** (flag 4 above).
- **Two view-model contracts under one name.** Desktop `hero3.riv` moved to four homogenized theme instances 2026-07-15; `heromobile.riv` and `MobileGate` deliberately stayed on the three-instance-plus-runtime-flip contract. Both docs (`hero-webgl2-wiring`, `mobile-gate`) warn that a future "make them match" edit fails silently if only one side moves. A landmine, not a task.
- **`getExpandedFootprint` at `columnCount === 1`** still computes an invalid grid line. Structurally unreachable since the 420px demo-column floor; the code was never patched and carries no test. Fine as long as the floor holds; the second Vitest slice (footprint extraction) from the 2026-06-18 handoff never happened.
- **Re-export bind regression rule.** Any future group-2 tile re-export needs the HUD unbound check; the r4c1 blank-tile export is the precedent. Standing rule, no owner.

### Motion Tiles sign-offs *(Critical flag 5)*

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

From `docs/case-study-kickoff-gap-analysis.md` (the working plan, currently untracked in git; consider committing it):

- Resolve the 12-vs-18 principles framing and add the six extended-principle slots. The gap analysis calls the extensions the strongest single talking point.
- Pick one timeline framing (calendar span vs week-numbered arc) and fill it.
- Write the formerly completion-gated sections; the tool is live, they are unblocked.
- The 18 per-principle build notes, "the largest lift."
- Links section: live URL and repo, known values, paste them.
- Sharing material (posts, portfolio blurbs) queued as its own pass after.

Source-doc reconciliation the gap analysis does not list but the writing depends on:

- `docs/principle-component-status.md`: refresh from 2026-05-05 state or mark superseded.
- `docs/cover-letter-reference.md`: three themes → four, two sections → three tools, add Motion Tiles, recount components.
- `docs/references/principles-reference.md`: retire the "Rive illustrations post-launch" placeholder strategy; fix drifted specs (P12 shipped as the ASCII-face card grid, not the lava lamp; P15 as panning bars, not parallax scroll).
- `docs/references/principle-quotes.md`: verify Thomas & Johnston wording against a print edition if the quotes appear in the case study; they render attributed in the UI.
- `docs/component-accounting.md`: counts 13 components, no Motion Tiles era; self-describes as a record, so either refresh or date-stamp it.
- Browser-project knowledge files (`docs/browser-project/README.md` maintenance list): the uploads predate deployment; the case-study Project needs current versions before the writing session.
- Duration-scalar attribution: earlier drafts credited a named system, removed as unverifiable; confirm before citing in the case study.

### Repo and asset hygiene

- **No ESLint or Prettier config.** Flagged 2026-06-18 as the expected baseline for a React portfolio repo; confirmed still absent.
- **Orphaned public assets ship to the deploy:** `public/rive/tokenlabhero.riv` (superseded by v2), `public/titleSVGS/subTitleThemed.svg`, `titleThemed.svg`, and several older wordmark SVGs. Dead CDN weight, and the repo may go public for the portfolio.
- **Dead CSS:** `.animationPlaceholder` / `.animationPlaceholderText` in `PrincipleCard.module.css:231`, pre-Rive leftovers, confirmed present.
- **Duplicate files:** `docs/references/animation-principles-notes.md` and `.txt` are byte-identical; `docs/decisions/contrast-audit-2026-04-16.txt` is an older copy of the `.md` missing the accent addendum. Delete the copies or they drift.
- **`docs/claude-workflow.md`** is a stub ("_To be written._") that other docs cite.
- **Git history purge** if the repo ever goes public: the 2026-07-14 cleanup trimmed the tree, not history. Conditional.
- **CSS import asymmetry:** Token Lab exports CSS but imports only JSON. The "Framer Motion config" export format named in the 2026-06-18 handoff was never built. Both are feature gaps for the tool's stated audience, neither tracked.
- **Voice doc self-violation:** `docs/voice/voice-analysis.md` contains two em-dashes against its own zero rule (lines 193 and 227). Trivial, and worth fixing in the authoritative style source.
- **Stale accent hex** in `docs/skills/rectangle-diagram-technique.md` (`#76c17d`, pre-2026-06-22). Cosmetic.

---

## Part 3: Resolved but unrecorded (doc drift to close)

Work that happened; the record still says otherwise. Each is a one-line doc edit.

- **r3c1 is fixed.** `r3c1.riv` re-exported 2026-07-12 with `r3c1SM`; the tracker's 2026-07-11 note and `GROUP2_TILEGRID_16_CLOSEOUT.md` still call it the remaining gap.
- **All temporary query gates are retired.** `?pixel`, `?pixeltest`, `?pixelrive`, `?tilegrid`, `?tileperf`, `?ingredients`, `?group2grid`, `?v8grid`: none remain in `src/App.jsx`, and `src/components/IngredientGrid/` is deleted (with its `backingSize` and `GATE` scaffolds). Five briefing docs still list gate retirement as open.
- **The Vite 8 step happened** (`^8.0.16`, commit 9e781f7); two docs still describe it as a kept-open door.
- **`hero.riv` authoring, the HC-dark theme, the Cloudflare dashboard steps, and the group-2 16-tile build** are all done and recorded in their own docs, but remain phrased as open in earlier docs (`chrome-timing` "Still open", `deployment-prep` remaining list, June handoffs). No action beyond knowing the later doc wins.
- **`docs/decisions/tokenlab-scroll-architecture-2026-05-05.md`** still reads "Status: Decision pending"; Option B shipped as the app-shell. Add the closing line.
- **`docs/references/WEBGL_PIXELATION_HANDOFF.md`** ends with a remaining-steps list for a route that lost; the PathEffect route shipped. Add a superseded note.
- **The 36-file preload concern** resolved by architecture: group 1 consolidated into one `ingredients_v8.riv`; the 16 group-2 files are mitigated by the landing gate.
- **r2c6 vertex-binding verdict:** the tile shipped, the "record which mechanism won" instruction in `TOKEN_LAB_PHASE2.md` §6 was never executed. One sentence in `TOKEN_LAB_WORKFLOW.md` §7 closes it.
- **`principle-component-status.md` P03 notes** claim the focus trap and easing-slot tabs are deferred; the tabs shipped 2026-05-05 (tracker) and the focus trap is claimed done in token-architecture.md. Reconcile alongside the Part 2 verification.

---

## Suggested order

1. The two quick wins: README Live URL, release tag. Ten minutes.
2. Verify the WASM fetch on the live site; apply the `setWasmUrl` pin if it fails anywhere plausible.
3. The source-doc reconciliation pass (Part 2, case-study inputs, plus Part 3's one-liners). It unblocks Week 10 and shrinks this audit by a third.
4. A single verification session against the deploy checklist on built output: keyboard, focus, contrast floors, the four themes, Motion Tiles included. Check what passes, fix or file what fails.
5. The Motion Tiles sign-off sweep: one session in front of the live grid with the five flagged tiles and the two preset values.
6. Week 10.

The rest is future work in the honest sense, and the tracker's Future work section is the right home for the items in Part 2 worth keeping alive: the Principles lazy retrofit, the prefetch pass, the preset vocabulary unification, and the physics-spring family.
