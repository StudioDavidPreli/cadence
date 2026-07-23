# Background System: Repo Recon

**Date:** 2026-07-22
**Reads against:** `docs/briefings/background-system-handoff-2026-07-22.md` (the planning-session handoff) and the four artifacts in `archive/backgroundSystem/`
**Status:** Recon complete and accepted in full. Nothing built. This document is the handoff's requested "confirm any assumption this document makes about existing code" pass.

**Ruled on 2026-07-22.** David's rulings are in `background_system_rulings.md` and supersede this document where they overlap: the gate item in section 4 resolves as the split, the open questions in section 7 have dispositions, and three engineering specs are amended (sampler, chunk membership, glass). Read the rulings first. This document stays as the evidence behind the corrections in section 3 and the lab findings in section 5.

The handoff says recon supersedes it wherever they disagree. Everything below is verified against the working tree, so where this document contradicts the handoff, this document is current. Where the labs contradict the handoff, the labs are cited by line.

---

## 1. Verdict

The concept survives recon. Every timing token the system builds formulas on exists, the render path has a working precedent in this repo, and the lab's copy of the preset table is exact. There is no architectural obstacle.

Five things are wrong or stale in the handoff, four findings sit in the labs that the handoff does not carry, and one project rule has to be ruled on before a line is written. None of them threaten the design. All of them would cost a rebuild if discovered mid-build.

---

## 2. Verified correct

**The token formulas resolve.** `duration.base`, `duration.slow`, `duration.slower`, `delay.long`, `ease.enter`, `ease.exit` all exist in `src/tokens/motion.css` and are parsed and exposed through `src/hooks/useMotionTokens.js`. Nothing in the choreography needs a new timing token.

**The lab's preset table is an exact copy of the real one.** `landscape-composition-lab.html:363` hardcodes a `MOTION` table because it has no `motion.css`. Checked value by value against `src/data/motionPresets.js`:

| | base | slow | slower | delay.long | pressSubtle |
|---|---|---|---|---|---|
| Standard | 200 | 400 | 600 | 200 | 0.98 |
| Snappy | 120 | 200 | 350 | 80 | 0.97 |
| Cinematic | 500 | 900 | 1400 | 400 | 0.99 |

Every value matches. This matters more than it looks: it means the numbers David tuned by eye in the lab transfer to production unchanged, and the ambient amplitudes and periods he approved are the amplitudes and periods the real tokens will produce. The tuning is not lost.

**Inline SVG over canvas is right, and this repo has already run the pattern.** `src/components/DemoField/` is a procedural, seeded, static field rendered as inline SVG, regenerated on a key change, colored by a per-theme token, pinned with `position: sticky; height: 0` over a scrolling parent, sized by a `ResizeObserver` on that parent. That is four of the background system's structural problems already solved once in this codebase, in ~190 lines. Read it before writing the renderer.

**No new dependencies.** Confirmed: no canvas, no GL context, no library. `import.meta.glob` does not appear anywhere in `src/` yet, so the glyph library would be its first use, which is standard Vite and carries no risk.

**Presence threshold, aggregation defaults, and the traversal are what the handoff says.** `pixelCells` at `landscape-composition-lab.html:715` gates on `c.total < THRESH * CS_P` with `THRESH = 0.2`, `CS_P = 12`, `NB = 4`, inverted at line 718. The Amanatides and Woo walk at line 575 is correct and pure arithmetic. The aggregation lab's header comment (line 9) states the same committed set.

---

## 3. Corrections

**3.1 `scale.subtle` does not exist.** It was renamed `--motion-scale-press-subtle` on 2026-07-21, the day before the handoff was written. React side it is `tokens.scale.pressSubtle`. Both ambient formulas depend on it: `(1 - scale.subtle) x 150` for sway amplitude and `x 12` for breathe depth. The arithmetic is unaffected (0.98 gives 3px and a 0.24 dip). Only the name changes. Record: `docs/decisions/scale-rename-2026-07-21.md`.

There is a live precedent for using a press token as an amplitude source, with a written argument: `PixelPlant` maps `scale.pressExpressive` to chromatic-aberration travel on the grounds that the "largest departure from rest" slot should drive the largest fringe. Reuse that reasoning or reject it deliberately, but do not leave the mapping unexplained. Token Fidelity is a principle this project teaches.

**3.2 The preset is called Standard, not Default.** Renamed 2026-07-16 to align the three personalities with Motion Tiles. The lab's label at `landscape-composition-lab.html:364` is stale; its values are not.

**3.3 The nav column is 220px wide, not 300px.** `--col-nav: 220px` in `src/components/TokenLab/TokenLab.module.css:29`. The lab ran at `W = 300` (`landscape-composition-lab.html:327`), which is the *controls* column width. Every composition David approved was judged 36% wider than the real surface.

This lands directly on open question 8. At 220px, 12px cells give 18 columns, not the 25 the handoff already called coarse. The question is no longer "if marks dissolve at nav scale"; the geometry says test it first. Retarget the lab to 220px before anything else is judged.

**3.4 Below 1024px there is no nav column.** `NavColumn` renders a 44px `RailDrawer` instead. The full three-column layout only exists above 1024px. The handoff's nav-column case describes one of two forms and says nothing about the other. Simplest v1 answer: no artwork in the rail or the drawer, and the surface is defined as existing only above the breakpoint.

**3.5 There are no reducer channels to subscribe to.** `src/context/MotionTokensContext.jsx` is `createContext` plus a provider, nothing more. A background reads tokens through `useMotionTokens()` like every other consumer and regenerates when the returned values change. Simpler than the handoff hedged for.

**3.6 mulberry32 is the wrong determinism idiom for a resizable surface.** The handoff commits to "mulberry32 everywhere, seeded streams with fixed consumption order," which the feasibility report recommends and the labs use. It works, and it is what the lab needed. It does not survive a resize: a sequential stream re-consumed over a different cell count produces a different drawing.

`DemoField/generateField.js` solves exactly this and documents why: every draw is an FNV-1a hash of `(seed, grid index, salt)`, never a sequential PRNG, so a vertex owns its numbers regardless of visit order and a resize re-derives an identical field, gaining or losing marks only at the margins. The nav column resizes with the viewport.

Recommendation: hash-keyed draws for anything indexed by grid position (the density map, per-cell decisions). A sequential stream is still correct for the L-system expansion itself, which is inherently ordered and does not re-run on resize. Two idioms, each where it belongs, and the boundary between them named in a comment.

---

## 4. The ruling that gates the build

This is the one item that needs David before code, and it is a project-rule conflict, not a taste question.

CLAUDE.md splits motion into two classes. Demonstration motion reads the editable `--motion-*` tokens, because the point is that editing a token changes it. Chrome reads the fixed `--feedback-*` constants, so a near-zero duration in Explore mode can never collapse the interface's own feedback into nothing. The nav column is chrome by every existing measure: every transition in `NavColumn.module.css` reads `--feedback-nav-duration`, deliberately.

The handoff's section 4 says the opposite for this system: every timing is a formula over the editable tokens, and "a hardcoded millisecond in the shipped system is a bug by project rules." Both statements are accurate quotations of project rules. They point in opposite directions for this surface.

The consequence is concrete. Explore mode can drag `duration.slower` to 50ms. The ambient period is `8 x duration.slower`. The nav column would vibrate at 0.4s per cycle behind the navigation. Drag `delay.long` down and the reveal window collapses with it.

Three resolutions:

- **Chrome.** Reads `--feedback-*`. Honest to the existing split. Requires new constants: the three that exist top out at 3s and nothing is long enough for an ambient period. Cost: the background stops demonstrating anything.
- **Demonstration.** Reads `--motion-*`. The background becomes a fourth surface proving the tokens govern everything, including the furniture. Requires clamping, and a clamp is its own small dishonesty.
- **Split.** The reveal is one-shot and bounded, so it reads `--motion-*` and demonstrates. The ambient idle is infinite, so it reads a fixed constant and stays chrome.

Recommendation: the split. It gives each half the rule that fits its nature, and it answers open question 7 with the same stroke. Question 7 asks whether ambient should always read Standard's temperament regardless of the active preset; the split says yes, and gives a structural reason rather than an aesthetic one. Hierarchy of Motion expressed as token scoping, which is the framing the handoff already reached for.

Two smaller notes in the same area:

- **The spatial constants are not a token problem.** Cell size 12px, presence 0.20, gamma 1.4, budget 120, chunk count 12: all spatial or structural, none temporal. Precedent covers them (`FIELD` in `generateField.js`, and PixelPlant's rule that cells and gap stay embed-local because Token Fidelity keeps time-domain tokens on time-domain jobs). They belong in one named exported config object with the tuning provenance in a comment. The token-integrity gate does not touch them.
- **The gate will scan this code.** `src/tokens/tokenIntegrity.test.js` walks `src/components/**` and `src/principles/**` for `.jsx` and `.css` and fails the build on any inline animation literal. A background system living in `src/components/` is inside the scan. Plan for it rather than discovering it.

---

## 5. Findings in the labs the handoff does not carry

**5.1 The pixel face already animates a transform, and it is the one the grid-hold rule outlaws.** `.cellAnim` (`landscape-composition-lab.html:182`) uses the `stampIn` keyframe, which is `opacity 0 to 1` plus `transform: scale(0.55) to scale(1)` (line 154). Both faces reveal with the same scale-in.

Two things follow. First, open question 2 has never actually been tested: the lab only ever ran scale-in on the pixel face, so the "pure opacity pop" alternative exists on paper only. Second, and more useful, the question has a structural answer the handoff does not offer. The stated reason for grid-hold is that Firefox does not composite SVG child transforms cleanly and sub-pixel offsets read as blur on pixel art. A reveal scale is an SVG child transform. It runs once instead of forever, so it is less exposed, but it is the same mechanism. Choosing the pop makes the pixel face transform-free end to end, and the argument for it stops being "more honest to the quantized aesthetic" and becomes "the only face with no transform anywhere." That is a stronger reason for the same call.

**5.2 Odd chunks run their sway in reverse.** `landscape-composition-lab.html:932` passes `i % 2 === 1` into `swayWrapper`, which sets `animation-direction: reverse`. The handoff's motion section does not mention it. It is a partial answer to open question 9: half the chunks already lean the other way at the start, so the communal lean is weaker than the question assumes. Confirm what it actually looks like before adding phase offsets to solve a problem that may be half solved.

**5.3 Chunk membership is not shared between the faces, only the timing table is.** Vector chunks are slices of the y-sorted stamp list (line 928). Pixel chunks are slices of the scanline-sorted cell list (line 977). Both sorts descend, so chunk k of one face and chunk k of the other cover roughly the same horizontal band, and the coupling reads. But "spatially coherent groups" is emergent from two independent sorts, not enforced. If the reveal order ever changes on one face, the coupling silently decouples. Production should either derive both chunkings from one spatial partition or write the dependency down.

**5.4 Full-color mode needs color math on resolved token values, and the handoff compresses that into one clause.** `shadeColor` (line 335) parses a hex or rgb string and multiplies the channels. In the lab the input is a hardcoded palette. In production the input is a theme token, and the output is a color that exists in no palette and has passed no contrast check.

The repo's decorative-role precedent is a single flat value per theme (`--color-demo-field`, four values in `color.css`). Four luminance steps per hue across four themes is a different animal. Two ways out: author the steps as tokens per theme (contrast-checkable, more token surface, and it constrains the "dominant source color" idea since source colors come from the marks, not the palette), or do the multiply at runtime on resolved values and accept derived colors. The contrast rule for decorative fills is looser than for text, but CLAUDE.md still requires any rule changing `background-color` to set `color` explicitly, and "never decorative" governs accent specifically. Resolve this before full color ships; the tone-ramp mode has no such problem and could ship first.

**5.5 The lab's SVG parser auto-normalizes, and the authoring spec says the author does.** `parseSvgText` (line 432) centers on the bounding box and scales the longest span to 84 units (lines 482-484), and it captures color from `getComputedStyle` (line 452). So the production flattener must carry color as well as geometry, which the handoff's flattener bullet does not say. And auto-centering conflicts with the plan for a "consistent origin convention" in the authoring spec. Pick one: either the flattener normalizes and the spec only needs `width`, `height`, `viewBox`, `stroke="currentColor"`, `fill="none"`, or the author sets the origin and the flattener leaves it alone. Prusinkiewicz's per-surface contact point (cited in the feasibility report, section 1) is the argument for author-set origins: where the mark attaches is a design decision, not a bounding-box accident.

**5.6 The glass transitions its own height under the blur.** `.glassZone` (line 125) is an absolutely positioned layer at `z-index: 1` beneath the nav at `z-index: 2`, going from `height: 0` to `height: 305px` with `backdrop-filter: blur(9px)`, transitioning height and background over 240ms. The handoff's own gotcha says backdrop-filter is cheap over static content and expensive over per-frame repaints. The content underneath is static, which is the point, but the glass layer itself is resizing every frame of the expand. Verify the cost of the transition, not just the resting state. In production the expand is the accordion's `grid-template-rows: 0fr to 1fr` on `--feedback-nav-duration` (360ms), so the two would run together.

**5.7 The traversal has a silent truncation.** `walkSegment` guards with `guard++ < 4000` (line 591). At 12px cells over an 880px column no real segment reaches it, but it fails quietly rather than loudly. Production should derive the bound from the surface diagonal and cell size, or assert.

---

## 6. Constraints from the real surface

**6.1 The protected baseline moves.** The lab fixes `NAV_Y = 140` (line 330) and ramps clearance from it. The real nav is a single-open accordion: opening Token Lab, Principles, or Motion Tiles pushes the item stack down by that section's leaf count. The clearance ramp either tracks the live baseline (measured, so it recomputes on expand, which means regenerating during a 360ms layout animation) or takes the worst case (the tallest expanded section) and lets the collapsed state carry more clearance than it needs. The second is cheaper and probably correct: a background that reflows when you open a nav section is a background that is asking to be looked at.

**6.2 The column scrolls.** `.nav` is `overflow-y: auto`. The artwork either scrolls with the accordion or pins. DemoField's sticky-height-0 wrapper plus a `ResizeObserver` on the parent is the solved version of this exact problem, and it also gives the resize handling that section 3.6 depends on.

**6.3 High contrast has no plan.** There are four themes, and both high-contrast themes have only pure black and white as available ink. A 120-mark composition in HC-dark will either vanish or shout; there is no quiet gray to whisper with. DemoField hit this wall and answered it by switching the generator to a sparse mode, thinning the field rather than trying to whisper with a color that cannot. The background system will need its own answer, and it is judged on real marks, not in the abstract. This is open question 12.

**6.4 The seed needs a policy, and the feasibility report says why.** Its own caveat (section "Aesthetic yield") quotes Anders Hoff wading through 4554 glyphs to select 420. Most seeds are dull. The handoff treats seed as a live input that triggers regeneration and crossfade, which implies a reroll affordance, which implies shipping whatever the reroll draws.

DemoField's precedent answers it: the seed is the Token Lab category id, authored, deterministic, never random, so each page always draws its own reproducible field. Recommendation: the nav column's seed is a constant David picks by browsing, committed in the config object next to the spatial constants. Regeneration on theme change stays. Regeneration on seed change becomes a build-time affordance in the lab, not a runtime one in the product. If a reroll ever ships, it ships as a deliberate feature with its own argument.

---

## 7. Open decisions, with recon attached

The handoff's eleven, plus one, annotated with what recon changes. Unmarked items are unchanged and still need David's eye on real ink.

1. **The 8x multipliers.** Unchanged, and now downstream of section 4. If the split ruling lands, the idle's `8 x duration.slower` becomes `8 x <a new fixed constant>` and the invented coefficient moves into a chrome constant where inventing a number is normal. The reveal's `8 x delay.long` stays token-native.
2. **Pixel cell reveal, scale-in vs pop.** Recon offers a structural argument for the pop (5.1). Also note the pop has never been seen; the lab only ran scale-in.
3. **Draw order as the only reveal order.** Recon note: the two faces already sort differently (5.3). Vector sorts by y, pixel by scanline. Both descend.
4. **Dominant color per cell vs per stamp.** Judge on real marks. Blocked on the glyph library.
5. **Luminance step count in full color.** Now entangled with 5.4. The token-vs-runtime color question should be settled at the same time.
6. **Breathe coupling rate.** Unchanged.
7. **Ambient temperament scoping.** Answered as a side effect if the split in section 4 lands.
8. **Cell size as a per-surface token.** Sharper now: the surface is 220px, not 300px, so 12px cells are 18 columns (3.3).
9. **Idle start coherence.** Half answered already by the reverse-direction alternation (5.2).
10. **45-degree tie-breaks.** Unchanged.
11. **Root spread.** Recon note: the lab's `ROOTS_X = [88, 212]` sit at 29% and 71% of 300px. Retargeted to 220px they need re-placing, not just re-scaling, since the canopies have less room to merge.
12. **High contrast.** New (6.3).

---

## 8. Proposed sequence

**Step 0. The ruling.** Section 4. Nothing else is blocked on it, but building either half first and re-deciding later means rewriting the choreography layer.

**Step 1. The glyph library. David's, and nothing before it.** Three to six traced marks plus the authoring README. Questions 4, 5, 8, and the high-contrast gap can only be judged on real ink, and the handoff's own closing line says the same. The spec the marks are authored against depends on 5.5, so settle the origin convention first: one sentence, either the flattener normalizes or the author sets the origin.

**Step 2. Retarget the lab, then walk the questions.** The lab is a static file in `archive/backgroundSystem/`, which is the same sandbox-then-port arrangement `archive/demo-grid-sandbox` had for DemoField, and the tracker records the rule for it: tune in the sandbox, approve as spec, then port. Retarget to 220px, place the roots for the narrower column, load the real marks, and walk the open list with David. Everything tuned before this step was tuned at the wrong width.

**Step 3. `raster/` first, not `lsystem/`.** The traversal, density map, and committed aggregation are pure arithmetic with no DOM and no React, which puts them in the shape this repo already has three examples of: `src/tokens/parse.js`, `springCurve.js`, `src/components/PrincipleCard/footprint.js`. A pure module with unit tests, landing before anything renders. It is also the piece both faces share, which makes it the expensive thing to get wrong.

**Step 4. Vector face on the nav column, behind a flag. Pixel face after.** The vector face has no aggregation, no color math, and no grid-hold constraint, so it exercises the generator, the flattener, the sampler, the token plumbing, and the reveal with the smallest surface. The pixel face then adds one new thing at a time.

**Scope, honestly.** The feasibility report's "few hundred lines" covers the generator core only: rewriting, turtle, stamp dispatch, glob import, render component. That estimate holds and the labs confirm it. It does not cover the density map, the committed aggregation, the second face, the choreography, reduced motion, four themes, high contrast, or tests. The lab's algorithmic core alone (`landscape-composition-lab.html:391` to `726`) is ~335 lines of plain JS with no React, no tokens, and no themes. Expect the production system at roughly three times that with its tests, and expect the flattener to be the fiddliest part, because `getPointAtLength` is doing real work in the lab and cannot come along.

---

## 9. Reference map

**Artifacts (`archive/backgroundSystem/`)**
- `landscape-composition-lab.html`: the closest thing to a product spec. Algorithms at 391-726, choreography at 763-1028, keyframes at 154-203, glass at 125-140.
- `cell-aggregation-lab.jsx`: where the committed aggregation set was chosen. Defaults stated at line 9.
- `reveal-motion-lab.html`: reveal orders (`rankCells`, line 494), reduced-motion quantization (line 255), crossfade.
- `compass_artifact_...markdown.md`: the feasibility report. Prior art in section 1, the canvas gotchas in 2, the recoloring argument in 4, the aesthetic-yield caveat in Caveats.

**Repo files this system touches or learns from**
- `src/components/DemoField/`: the closest existing precedent. Generator, sticky layer, ResizeObserver, per-theme decorative token, HC sparse mode.
- `src/tokens/motion.css`, `src/hooks/useMotionTokens.js`, `src/data/motionPresets.js`: the token layer and the preset table the lab copied.
- `src/tokens/tokenIntegrity.test.js`: the gate that will scan this code.
- `src/components/NavColumn/`, `src/components/TokenLab/TokenLab.module.css:29`: the target surface and its real width.
- `src/components/PixelPlant/index.jsx`: the precedent for mapping a press token to an amplitude, with the argument written out.
- `src/tokens/parse.js`, `src/components/PrincipleCard/footprint.js`: the pure-module-plus-tests shape `raster/` should take.
- `docs/decisions/scale-rename-2026-07-21.md`, `docs/decisions/chrome-timing-and-token-integrity-2026-06-23.md`, `docs/decisions/demo-field-2026-07-19.md`.

---

## 10. Sequencing

Unchanged from the handoff: post-launch v1.x. The tracker's remaining work is the case study, the git-history sweep and publish decision, and the Token Lab toolbar audit. Step 1 above is David's and can happen any time, because traced marks are design time and cost the engineering queue nothing.
