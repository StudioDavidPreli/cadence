# Background System: Rulings

**Date:** 2026-07-22
**From:** David, via planning session, replying to `background_system_recon.md`
**Status:** Concept closed. Gate items resolved. Next action is step 1, which is design time.

Reading order for a fresh session: this file first, then `background_system_recon.md` for the evidence behind the corrections, then `background-system-handoff-2026-07-22.md` for the original concept. Where they disagree, this file wins, then the recon, then the handoff.

---

## 1. The split (closes the gate)

The reveal is one-shot and bounded, so it reads the editable `--motion-*` tokens and demonstrates. The ambient idle is infinite, so it reads fixed chrome constants and never responds to Explore mode. Each half gets the rule that fits its nature.

**Reveal triggers on mount and theme change only. Never on motion token edits.** Geometry depends on seed and theme, not on motion tokens, so a token edit needs no regeneration and the next natural reveal reads the new values. Without this clause, dragging a duration slider would re-reveal the nav background continuously. (Amendment A below narrows "theme change" further.)

**Frozen idle constants,** derived once from Standard and carrying a provenance comment naming the formula, the source values, and this date:

| constant | formula | value |
|---|---|---|
| sway amplitude | `(1 - 0.98) x 150` | `3` px |
| breathe dip | `(1 - 0.98) x 12` | `0.24` |
| idle period | `8 x 600` | `4800` ms |

The `pressSubtle` rename (recon 3.1) is now provenance only, not a runtime dependency. No press token is read at runtime, so the PixelPlant mapping argument does not need extending here.

**Reveal keeps `8 x delay.long`.** It is the only invented coefficient left in demonstration territory, it is bounded, and a collapsed reveal window under Explore drag degrades gracefully because the reveal runs once. Revisit only if it reads wrong at the lab walk.

**One named exported config object** holds the spatial and structural constants (cell size, threshold, gamma, budget, chunk count) and the frozen idle constants, with tuning provenance in comments. The token-integrity gate does not touch them and should not. See amendment B for the one constant that belongs elsewhere.

---

## 2. Mark classes: v1 is currentColor only

The authoring spec (`stroke="currentColor"`, free re-theming) and full color mode (source colors survive) are mutually exclusive per mark. Naming the conflict resolves it.

**Superseded 2026-07-22 by section 2a.** The original ruling was currentColor-only marks for v1, with full color deferred behind a second mark class. Kept here because the conflict it names is real and the amendment resolves it differently: the two options were never "which one," they were "which one per theme."

**Origin convention: author-set.** Prusinkiewicz's per-surface contact point is the argument (feasibility report, section 1): where a mark attaches is a design decision, not a bounding-box accident. The attachment point is the viewBox center and the author positions ink relative to it. The flattener scales by viewBox and leaves geometry alone. No bounding-box normalization in production, which is where the lab's `parseSvgText` diverges and does not come along. Unaffected by the amendment.

---

## 2a. Mark color, amended

**Amended 2026-07-22, David. Supersedes section 2's currentColor ruling.**

Marks retain their incoming colors in `light` and `dark`, and the pixel face shades them in 4 luminance steps. In both high-contrast themes, marks adopt the active theme's accent color and the pixel face drops to 2 steps.

This resolves the section 2 conflict by splitting it per theme instead of per mark. There is one mark class, it carries authored color, and high contrast overrides it. The second mark class is not needed and the door closes.

**What changes for the authoring spec (step 1):**

- Marks carry **authored stroke colors**, not `stroke="currentColor"`. The renderer writes each stroke's color from flattened data, so nothing depends on CSS inheritance and the HC override is a value substitution at render time.
- `fill="none"` holds, now for a load-bearing reason rather than convention: presence is measured as crossing length precisely because hand-drawn strokes are thin, and a filled region has no crossing length to measure. A filled mark would need a different presence rule. Strokes only.
- **The palette has to survive two opposite backgrounds.** `--color-bg` is `#141414` in dark and `#f5f5f5` in light, and the same ink sits on both. The lab's own palette fails this: `#e6e1d3` is near-invisible on the light background. Mid-luminance colors survive both; anything near white dies on light, anything near black dies on dark. This is a design constraint on tracing, not something engineering can fix afterward. If a chosen palette turns out to need help, the fallback is a single fixed luminance multiplier applied in one theme, held in reserve rather than designed in.

**What changes downstream:**

- The flattener's optional color field is non-null in v1 and load-bearing.
- **Full color is v1.** Open question 4 (dominant color per cell vs per stamp) reopens and is judged on ink at step 2. It only applies to light and dark; in high contrast every stroke is one color, so the question does not arise there.
- Open question 5 half-closes: the step count is ruled (4 in light and dark, 2 in high contrast). The luminance range is still a dial, `0.35 to 1.0` as prototyped versus something compressed. Judge at step 2.
- Recon 5.4 largely dissolves. The color math now runs on authored colors known at trace time rather than on resolved theme tokens, so the derived steps can be checked once by eye instead of being an unbounded function of the token layer.
- High contrast simplifies rather than complicating: one hue, 2 steps, reduced budget. Ruling 12 stands and the aggregation already takes both as parameters.

The high-contrast marks read `--color-accent` directly. That was challenged as an accent-role violation and ruled in favor of reading it: see amendment E in section 5 for the reasoning, and the follow-up it owes CLAUDE.md.

---

## 2b. The failing ink binds to `--color-text-base`

**Ruled 2026-07-22, David, from the lab at 220px.** Resolves finding F4. The `#232323` block (Assets 28 to 33, six of the 32 files, one of them in the chosen six) does not keep its authored value. It binds to `--color-text-base` and resolves per theme.

**Why the text role and not the accent.** The failing ink is a text-weight ink, so what it wants is the text role flipping dark to light, not the accent role meaning "active, currently affecting the system." The token values make the argument better than the reasoning does:

| theme | `--color-text-base` | authored ink |
|---|---|---|
| light | `#1a1a1a` | `#232323` |
| dark | `#e1e1e1` | `#232323` |

Light's text-base and the authored ink are the same ink to the eye. So the binding changes nothing in the theme where the ink already worked (14.42:1 becomes 15.96:1, imperceptible) and flips only the theme where it failed. Accent was the wrong fit for exactly this reason: it would have repainted the marks in light too, for no reason, and `#5a4fcf` is a visible change there.

Measured on each background, with the loaded palette's band for comparison:

| substitute | on dark | on light |
|---|---|---|
| as authored `#232323` | **1.17** | 14.42 |
| **`--color-text-base`** (ruled) | **14.09** | **15.96** |
| `--color-text-muted` | 5.77 | 5.27 |
| `--color-accent` | 8.50 | 5.58 |
| rest of the loaded palette | 2.75 to 8.68 | 1.95 to 6.14 |

**Provenance, not a caveat.** 14.09:1 on dark is roughly twice the contrast of the loudest other ink in the field, and `text-muted` was offered at 5.77 as the same role one rung quieter. David ruled text-base with both numbers in view and the comparison on screen. Recorded here so a later reader does not correct it back as an oversight.

**No role exception needed.** Unlike accent, whose "never decorative" rule required amendment E, the text tokens carry no such restriction, so binding artwork to `--color-text-base` needs no exception and adds nothing to the CLAUDE.md follow-up E already owes. E still covers the high-contrast blanket and is unchanged.

**What this does to the data model.** Amendment 2a established that a theme can substitute a mark's ink, with one entry: the high-contrast blanket. This adds a second entry that is *per mark* rather than blanket, so the model is now "a mark's ink is either a literal or a token reference," not "the theme overrides everything." That is a real shape change and it is the useful one, because it is also the mechanism the accent-tagged-subset idea would use if it ever ships.

**The carrier: `currentColor`. Ruled 2026-07-22, David.** A mark authored with `currentColor` as its paint is token-bound; a mark authored with a literal hex keeps it. The distinction lives in the file, in a channel SVG already has, and is legible the moment the file is opened. No side table, no filename convention.

This gives the abandoned section 2 ruling a real job. `currentColor` stops being the rule for every mark and becomes the marker for the token-bound subset, which is the shape 2a's data model needed.

Filename suffixes were considered and argued against: stringly-typed with no validation, they couple a design decision to a rename, and they do not extend when a mark needs two facts. `currentColor` has the opposite property, which is worth stating as the reason it wins rather than as a happy accident: there is nothing to misspell. A file either carries the exact literal `currentColor` or it does not, so a typo is not a silently unbound mark, it is a mark with an invalid paint value that the parser can reject.

Four things this commits, none of them obvious:

- **The parser reads the attribute, not the computed style.** `currentColor` resolves against the inherited `color` property, so by the time `getComputedStyle` sees it, it is an ordinary hex and indistinguishable from an authored one. The lab's `parseSvgText` reads computed style today and would erase the distinction it is now supposed to detect. This is load-bearing, not a note.
- **`currentColor` is the marker, not the runtime mechanism.** It would be possible to let the vector face inherit a container `color` and get the binding free from the cascade. Do not: the pixel face computes rect fills in JS from the dominant source color, the cascade never reaches it, and the two faces would resolve the same mark differently. Resolution stays in data, ahead of aggregation, through the single point the lab already uses. The cascade is the authoring vocabulary; it is not the plumbing.
- **The attribute depends on walk item 1.** The ruling says `stroke`, and the test library is fill-only with zero strokes in all 32 files. If silhouette wins, marks are authored as fills and outlined by the flattener, so the marked attribute is `fill="currentColor"`. The principle is the same and only the attribute name follows from item 1: the rule is "the paint attribute is `currentColor`," and which paint attribute that is gets decided at the walk.
- **It unifies high contrast with the text binding at the render layer.** The stroke a mark emits becomes `currentColor` when the mark is token-bound *or* the theme is high contrast, and the container's resolved ink is `--color-text-base` in light and dark and `--color-accent` in high contrast. The blanket override and the per-mark binding stop being two mechanisms and become one channel with two sources. The data-level resolution still runs for both faces; this is what it resolves *to*.

Fold the rule into the authoring README in step 1: explicit `viewBox`, one mark per file, attachment point at viewBox center, and a paint that is either a literal color the mark owns or `currentColor` to take the theme's ink.

**Amendment A is narrowed by this.** A currently says a `light` ↔ `dark` switch changes nothing at all. That is no longer true for these six marks: their ink resolves differently per theme, so the switch is a **repaint**. Still no regeneration and no reveal, because geometry is untouched. A's three-case table stands with that one correction to the first row.

---

## 3. Disposition of the twelve

**Closed**

1. **8x multipliers.** Idle coefficient becomes a chrome constant; reveal keeps `8 x delay.long`. Section 1.
7. **Ambient temperament.** Closed by the split. One temperament by structure, not taste.
10. **45-degree tie-breaks.** Suspended 2026-07-22, **un-suspended and re-ruled 2026-07-23**: keep round-toward-higher, with one comment in `raster/` naming it. The suspension existed because the rule presumes an angle-based tone rule and the walk might not keep one. Blend won, so it does.

    Cheap to commit on this library. With four buckets the centers sit at 0, 45, 90 and 135 degrees and the boundaries at 22.5, 67.5, 112.5 and 157.5. Every segment in these marks is horizontal or vertical before rotation, so the ink's natural angles land on bucket **centers**, not boundaries. The tie-break fires only where a stamp's rotation carries a run onto a boundary, which is scattered rather than systematic.

5. **Luminance step count.** Half-closed by amendment 2a: 4 steps in light and dark, 2 in high contrast. The luminance range stays open as a dial.

**Carried into the step 2 lab walk**

4. **Color per cell vs per stamp.** Reopened by amendment 2a, which makes full color v1. Judge on ink. Applies to light and dark only; high contrast is single-hue, so boundary-cell flicker cannot occur there.

2. **Pixel reveal.** The pop is the pixel default; scale-in behind a toggle. The structural argument (the only face with no transform anywhere, end to end) is the stronger reason and compounds with the Firefox finding. Final call by eye, because the pop has never been seen.
3. **Reveal order.** Nav stays top to bottom. Amendment in section 4 decouples chunk membership from reveal order, which shrinks this to nothing.
6. **Breathe coupling rate.** Judge `dx x 0.5` against `dx x 1.0` at 220px.
8. **Cell size.** The first question the retargeted lab answers. Test 8, 10, and 12px at 220px before judging anything else on the pixel face. Expectation on record: this surface wants 8 to 10.
9. **Idle start coherence.** Confirm the existing reverse-direction alternation by eye before adding any mechanism.
11. **Roots.** Re-place for 220px, and carry a single root with wider stochastic spread as the comparison case. Two roots may not have room to read as two at this width.
12. **High contrast.** Reduced budget plus 2 tone levels instead of 4. The aggregation already takes both as parameters, so the HC answer stays inside committed machinery.

---

## 4. Engineering specs, as ruled

**Determinism.** Hash-keyed draws for everything indexed by grid position, sequential mulberry32 for the L-system expansion, the boundary named in a comment.

**Sampler, restructured.** "N budget draws from a cumulative distribution" is sequential and dies on resize. The resize-stable form is per-cell expected count (`budget x weight / total`), with hash-keyed draws resolving the fractional part, jitter, rotation, and glyph pick per cell. Budget becomes approximate rather than exact, which is acceptable for a background and says so in the config comment. See amendment C for a consequence to watch.

**Chunk membership.** Both faces derive chunks from one explicit y-band partition: `band = floor(y / (H / CHUNKS))`. Both current sorts already approximate it, it is resize-stable under the hash idiom, and it makes the coupling enforced instead of emergent.

**Glass and clearance, one shape for both.** Worst-case clearance (the tallest expanded section). The glass is a property of the expanded panel element and rides the accordion's own `grid-template-rows` transition on `--feedback-nav-duration`. The glass never animates its own height as a separate layer, and the background never reflows on expand. The recon's measurement request becomes a confirmation pass, not a decision.

**Glass base is feathered** (David, 2026-07-22): the panel's bottom edge must not end on a hard line. Done with `mask-image: linear-gradient(to bottom, #000 calc(100% - <feather>), transparent 100%)` on the glass element itself. One gradient covers both the blur and the tint, because the mask applies to the element's own paint and the backdrop-filter result is part of that paint. No second scrim element. Confirmed coexisting in Chrome (computed style keeps `backdrop-filter` and `mask-image` on the same element and feathers rather than dropping). The feather amount is a slider in the 220px lab, defaulting to 22% of the panel depth. **Firefox is the risk**: masking a backdrop-filtered element is the combination most likely to drop the filter entirely rather than feather it, so this needs the standing built-output check. Fallback if it drops: stacked zones of decreasing blur instead of one masked zone.

**Accepted as the recon wrote them:** sticky-height-0 pin with `ResizeObserver`, per DemoField (6.2). Seed as an authored constant picked by browsing and committed beside the spatial constants, with reroll staying a lab affordance (6.4). Traversal guard derived from surface diagonal and cell size, with a dev assert (5.7). No artwork below 1024px; the surface exists only above the breakpoint (3.4). `raster/` as a pure module with tests in the `parse.js` shape, built first.

---

## 5. Amendments raised against these rulings

Five items. A through D were found while recording the rulings; E comes from amendment 2a and is **ruled**. None blocks step 1. A and B still want a decision before the code they touch is built. C and D are things to watch, not decisions.

**A. "Theme change" is not one event, and three of the four transitions do not need a reveal.**

Geometry does not depend on theme in general. It depends on theme only across the high-contrast boundary, where ruling 12 changes budget and tone levels, and that is a different composition.

Amendment 2a strengthens this rather than weakening it. Across the four themes:

- `light` ↔ `dark`: **a repaint, nothing more** (corrected by section 2b). Marks with a literal authored ink are identical in both. The six token-bound marks resolve `--color-text-base` differently per theme, so paint changes. Geometry does not, so no regeneration and no reveal.
- `high-contrast-light` ↔ `high-contrast-dark`: color only, and only because the accent differs between them (`#855a0d` amber and `#aaccf6` light blue). Same budget, same 2 steps, same geometry. Re-paint the stroke color, no regeneration and no reveal.
- Anything crossing into or out of high contrast: budget, step count, and hue all change, so the composition is new. Regenerate, crossfade, reveal.

Proposed narrowing: the reveal triggers on mount and on a theme change that crosses the HC boundary. Otherwise every light/dark toggle re-reveals the nav column for no reason, which is the same noise the token-edit clause exists to prevent. Ruling wanted before the choreography layer is built.

**B. The idle period is a chrome timing value and should live in `motion.css`, not the config object.**

The gate was checked rather than assumed. `src/tokens/tokenIntegrity.test.js` matches `duration:\s*[0-9]` in `.jsx?` files and `\d+ms` in `.module.css` files only. So `period: 4800` in a config `.js` passes silently, while `animation-duration: 4800ms` in the idle keyframes' module CSS fails the build. Two consequences:

- The keyframes cannot carry the period as a literal regardless, so it arrives either as a CSS custom property or as an inline style set from JS.
- If it arrives from a JS config object, a chrome timing value exists outside `motion.css` and outside the gate's view, honored by convention alone. That is the one thing the chrome rule exists to prevent.

Proposed: the period lands as `--feedback-background-idle-period: 4800ms` in `motion.css` beside the other three fixed constants, consumed the way the existing chrome constants are (`src/utils/feedbackDuration.js`). Amplitude (3px) and dip (0.24) are not timing, the gate never looks at them, and they stay in the config object as ruled. Timing with timing, everything else in the config object.

**C. The sampler amendment flattens clustering, and it will look like the width retarget did it.**

Per-cell expected count is `budget x weight / total`. With a budget of 120 spread over several hundred weighted cells, the expected count is below 1 in nearly every cell, so the integer part is 0 and each cell contributes at most one mark from its Bernoulli draw. The old sequential sampler drew with replacement, so a hot cell could take three or four marks and clump. Resize stability costs clumping.

This is the right trade, but it will show up at the step 2 walk as "the composition reads flatter than the lab did," and the obvious suspect will be the 300 to 220 retarget. Name it in advance. If it does read too even, the fix stays inside the hash idiom: k sub-draws per cell, salted `0..k-1`, which restores stacking without reintroducing order dependence.

**D. Two things to confirm on the glass, both on built output.**

`backdrop-filter` blurs what is painted behind it. The artwork is a sticky layer inside `.nav` and the accordion panel is also inside `.nav`, so the panel must sit above the artwork in paint order or the glass has nothing to blur. Separately, `backdrop-filter` establishes a stacking context and a containing block, and under this ruling it sits inside `.bodyInner` (`overflow: hidden`) while the parent runs a `grid-template-rows` animation. That combination is worth watching in Firefox and Safari specifically, per the standing built-output rule.

Minor, same area: y-band chunking makes bands equal in height rather than equal in population, so a sparse band near the bottom can hold two marks and still own a full timing slot. Probably correct, since it is spatially honest, but the felt density of the coupling will differ from the lab's equal-count chunks.

**E. Reading `--color-accent` for background artwork contradicts the accent role. RULED 2026-07-22: read the accent directly. The proposal below is overruled and kept as the reasoning behind the exception.**

> **Ruling, David.** The artwork reads `--color-accent` in both high-contrast themes. The background is displaying the role of the color token in themed elements: although the background decorates the site, it is not divorced from the tokens, and it is a real recursive example of the tokens and motion design at work. The accent role is "active, connected, currently affecting the system," and a background drawn by the token system, retimed by the token system, is exactly that. The "never decorative" exclusion does not bite, because this is not decoration standing apart from the system, it is the system drawing itself.
>
> Consequences accepted: the artwork tracks the accent value permanently, including future hue changes of the kind HC-dark already had (amber to light blue, 2026-07-16). That coupling is the point, not the risk.
>
> **Follow-up owed:** the accent section of CLAUDE.md needs a line recording this exception and its reasoning, so a later reader does not correct it back as a role violation. Write it when the artwork's color layer lands, not before, since a rule for code that does not exist yet is a rule nobody can check.

The proposal that was overruled, kept because it names what the ruling is choosing against:

Raised by amendment 2a. CLAUDE.md is explicit: `--color-accent` means active, connected, currently affecting the system, and is never decorative. Background artwork is decorative by definition. The precedent is on record and cuts the same way: the PrincipleCard category chips deliberately do **not** read accent, they read their own `--color-chip-*` tokens, on David's 2026-07-16 call, specifically so taxonomy color stays out of the accent role.

The instinct behind the ruling is right, though. In both high-contrast themes the accent is the only chromatic ink that exists; everything else is pure black and white. So the value is correct and only the channel is wrong.

Proposed: mint a per-theme decorative token for the artwork, following `--color-demo-field` (four values, decorative role, no text ever). Set its two high-contrast values to the same hexes the HC accents currently hold, `#855a0d` in HC-light and `#aaccf6` in HC-dark. Identical pixels, no role violation, and the artwork stops silently tracking the accent. That last part is not hypothetical: HC-dark's accent already changed once, amber to light blue on 2026-07-16, and a background borrowing the token would have followed it without anyone deciding to.

Its `light` and `dark` values are unused under amendment 2a, since marks carry their own color there. Either leave them unset, or set them as the fallback ink for a mark that arrives with no color, which the flattener already allows for.

---

## 6. Sequence

- **Step 0.** Done. These are the rulings.
- **Step 1.** David's. Three to six traced marks plus the authoring README per section 2. All marks `currentColor`. Unblocked.
- **Step 2.** Retarget the lab in `archive/backgroundSystem/` to 220px and carry: the pop as the pixel default, re-placed roots plus the single-root comparison, cell size candidates 8/10/12, the HC preview at reduced budget and 2 tone levels, and David's marks. Then walk the open list. Everything tuned before this step was tuned at the wrong width and does not count.
- **Step 3.** `raster/` as a pure module with tests, built first.
- **Step 4.** Vector face on the nav column behind a flag. Pixel face after.

Scope: roughly three times the feasibility report's estimate once tests are counted, with the flattener the fiddliest part. Sequencing unchanged: post-launch v1.x, behind the case study, the git-history sweep, and the Token Lab toolbar audit.

---

## 7. Test library findings

**Source:** `archive/backgroundSystem/testSVGS/`, 32 files, surveyed 2026-07-22.

### What is actually in there

Every file is `viewBox="0 0 84 84"`, no `width` or `height` attributes, one path group, a single fill color declared as a `.cls-1` class, and **zero strokes anywhere in the library**. The geometry is axis-aligned pixel-staircase work on a 3.36 or 3.5 unit grid (84/25 and 84/24): every segment is horizontal or vertical.

Eight colors in blocks: lavender `#b49bc4` (Assets 2 to 3), dusty pink `#d9a0a8` (4 to 7), green `#4ca06a` (8 to 11), orange `#de803b` (12 to 15), red-orange `#e0563a` (16 to 19), amber `#ddaa3c` (20 to 23), blue `#3c5a9c` (24 to 27), near-black `#232323` (28 to 33). One color per file. Complexity spans 109 to 2013 path characters and 1 to 9 subpaths.

### F1. Fills, not strokes. This forks the authoring spec.

Amendment 2a specifies `fill="none"` and stroke-only marks, with a load-bearing reason: presence is crossing length, and a filled region has no crossing length to measure. Nothing in this library satisfies that.

The lab already has a working interpretation. `parseSvgText` walks any path with `getTotalLength` and falls back to fill when stroke is absent, so a filled shape enters the pipeline as **its silhouette outline**, traced as a polyline, colored by the fill. It runs, and both faces will render something. But what they render is the outline of each blob, not the blob: the pixel face lights the cells the silhouette edge crosses and leaves the interior empty.

That may be the right look, since it keeps the thin-stroke aesthetic the aggregation was tuned for, and it is what the lab has been showing all along. It is not what "retain their incoming colors" implies visually if the expectation was filled shapes. Three ways, David's call, and it changes the authoring README:

- **Outline the fills** (what the lab does today). No spec change, no code change, interiors stay empty.
- **Keep fills and add an area presence rule** for filled marks. Correct for fills, contradicts the thin-stroke reasoning, and needs a second presence path in `raster/`.
- **Re-author as strokes.** Matches the spec as written and costs tracing time.

First thing to look at in the retargeted lab, because it is visible immediately and it decides the README.

### F2. Axis-aligned marks degenerate the blended-orientation tone rule.

This is the significant finding. The blend rule accumulates a double-angle vector: `vx += l·cos(2θ)`, `vy += l·sin(2θ)`, with axial `θ ∈ [0, π)`. For a horizontal segment `θ = 0`, so `2θ = 0` and the contribution is `(+l, 0)`. For a vertical segment `θ = π/2`, so `2θ = π` and the contribution is `(−l, 0)`.

**Perpendicular pairs cancel.** A cell holding equal horizontal and vertical ink resolves to `vx = vy = 0`, `atan2(0, 0) = 0`, bucket 0, tone 3. And a hair of imbalance flips the result between tone 3 and tone 1, the two extremes of the four: slightly positive `vx` gives mean 0 (bucket 0), slightly negative gives mean `π/2` (bucket 2). It is a knife-edge, not a gradient.

Pixel-staircase outlines are h/v balanced by construction, so a large share of cells sit on that edge. The 4-step shading ruled in amendment 2a may not read as four steps with this library.

Stamp rotation is the mitigation and it is already on: flow-align plus jitter turns each mark off-axis in world space, which spreads the angular content and mostly dissolves the cancellation. It returns near rotations of 0 and 90 degrees, which flow-align will produce wherever the armature runs axially.

The handoff already holds the answer in reserve. The **density** profile (total crossing length quantized to n levels) passed the same eye test at identical settings and has no degeneracy of this kind, because it never takes an angle. For an axis-aligned library it is the robust rule. Test both profiles at step 2 with real marks; expect density to win, and if it does, the "second named profile" becomes the default rather than the alternate.

Related: open question 10 (45-degree tie-breaks, "visible on exact geometric rulesets") is the same phenomenon seen from the other side. Both close together.

### F3. Open question 4 gets easier.

Every file carries exactly one color, so no mark in this library is two-color. The boundary-cell flicker the handoff worried about, at "the boundary cells of two-color marks," cannot occur inside a mark. It can only arise where two stamps of different colors overlap in one cell, which is rarer and milder. Per-cell dominance is probably fine; judge it at step 2 with a lower expectation of trouble.

### F4. The light and dark palette constraint, measured.

Contrast of each ink against the two backgrounds it must sit on, `--color-bg` `#141414` in dark and `#f5f5f5` in light:

| ink | on dark | on light |
|---|---|---|
| `#232323` near-black | **1.17** | 14.4 |
| `#3c5a9c` blue | 2.75 | 6.15 |
| `#e0563a` red-orange | 4.88 | 3.47 |
| `#4ca06a` green | 5.74 | 2.94 |
| `#de803b` orange | 6.37 | 2.65 |
| `#b49bc4` lavender | 7.39 | 2.59 |
| `#d9a0a8` pink | 8.38 | 2.02 |
| `#ddaa3c` amber | 8.68 | 1.95 |

Seven of eight survive both. A background wants to be quiet, so the 2:1 end is acceptable and arguably ideal. **`#232323` fails**: at 1.17:1 it is invisible on the dark theme, and it is the most-used color in the library (6 files, Assets 28 to 33).

**Resolved 2026-07-22 by section 2b:** the block binds to `--color-text-base` and resolves per theme. Not a re-ink, not an inversion, and not the runtime color math this paragraph originally worried about, because both values are authored token values rather than anything computed.

`#e0563a` is the most evenly balanced ink in the set and the safest anchor for the palette.

### F5. The `width` and `height` spec line can be dropped.

No file carries them, and they are not needed. That requirement came from the feasibility report's Canvas gotcha (Firefox Bugzilla 700533, `drawImage` failing silently on an SVG with no intrinsic size). We are not on the Canvas path. On inline SVG the `viewBox` alone is sufficient and the flattener scales by it.

The uniform `0 0 84 84` is a good fit for the rest: the attachment point at viewBox center is exactly `(42, 42)` for every mark, which is the author-set origin ruling satisfied for free, and 84 is already the span the lab normalizes to.

### F6. The six for the test

"First six" read numerically is Assets 2 through 7, which is two colors (lavender and pink) and no complexity spread. That set cannot exercise the questions step 2 exists to answer.

Chosen instead, six of the eight colors, complexity from the floor to the ceiling, and subpath counts from 1 to 9:

| file | ink | chars | subpaths | why |
|---|---|---|---|---|
| Asset 17 | `#e0563a` | 109 | 1 | simplest mark, best-balanced ink |
| Asset 6 | `#d9a0a8` | 179 | 1 | simple, second hue |
| Asset 10 | `#4ca06a` | 348 | 1 | mid complexity, mid contrast both ways |
| Asset 30 | `#232323` | 360 | 1 | the ink that fails on dark, carried on purpose so F4 is visible in the lab rather than discovered later |
| Asset 26 | `#3c5a9c` | 776 | 9 | most fragmented, exercises multi-subpath flattening |
| Asset 20 | `#ddaa3c` | 2013 | 1 | complexity ceiling, and the weakest ink on light |

Swap Asset 30 for Asset 27 (`#3c5a9c`, 257 chars, 2 subpaths) if the failing ink is a distraction rather than a demonstration.

---

## 8. Step 2 walk protocol

**Ordered by David, 2026-07-22.** The lab is built: `archive/backgroundSystem/nav-composition-lab-220.html`, with the six chosen marks in `marks-six.js` beside it. The original `landscape-composition-lab.html` is untouched and stays as the record of the 300px sessions.

1. **Silhouette vs native fill.** The library is all fill and no stroke, so this decides the authoring spec before anything else.
2. **Density vs blend** on the real marks.
3. **Flow align off** as the control.

All at 220px, across cell sizes 8, 10, and 12. The section 3 tone-rule ruling (open question 10) is suspended pending the outcome.

What the lab carries beyond the three: the pop as the pixel default with scale-in behind a toggle, re-placed roots plus the single-root comparison, all four themes with amendment 2a's color treatment live, the frozen idle constants, the shared y-band chunking, the viewBox-centered origin, and the traversal guard derived from the surface diagonal.

### First measurements, before David's eye

Instrumented from the lab at the default seed, budget 120, Cadence branch, two roots. These rank the rules on **level usage**, which is a proxy for whether four steps are available, not a judgment about whether they read. The judgment is David's.

**Blend degeneracy** (cells whose double-angle orientation cancelled to near zero, as a share of ink-bearing cells):

| cell | flow on | flow off |
|---|---|---|
| 8px | 6% | 6% |
| 10px | 8% | 8% |
| 12px | 8% | 9% |

**Tone distribution** across the four levels, tone 0 (dimmest) to tone 3:

| mode | rule | cell | cells | tone 0 / 1 / 2 / 3 |
|---|---|---|---|---|
| silhouette | blend | 12 | 231 | 26 / 35 / 12 / 26 |
| silhouette | density | 12 | 231 | **70** / 8 / 11 / 11 |
| silhouette | dominant | 12 | 231 | 18 / 41 / 10 / 31 |
| native fill | coverage | 12 | 174 | 41 / 20 / 25 / 14 |
| silhouette | blend | 8 | 435 | 25 / 34 / 11 / 30 |
| silhouette | density | 8 | 435 | **66** / 10 / 13 / 11 |
| native fill | coverage | 8 | 356 | 46 / 18 / 24 / 12 |

**This corrects finding F2's recommendation.** F2 predicted the blend rule would degenerate badly on axis-aligned marks and that density would win. The degeneracy is real but small, 6 to 9 percent rather than the large share F2 implied, because cancellation needs balanced perpendicular ink *within a single cell* and a 8 to 12px cell usually catches one run of the staircase rather than a balanced mix. Blend keeps all four levels populated. Density is the one that skews, putting 66 to 70 percent of cells in the dimmest level, because its normalization span (2.5 cell-lengths, absolute) was tuned against the lab's dense bezier marks and these outlines rarely clear it.

Density could be rescued by re-normalizing the span. As committed, it is the worse of the two on this library. Walk it with eyes anyway: a distribution skewed dim may be exactly right for a background, and an even spread may read busy. The numbers say which levels are *available*, not which composition is better.

Native fill produces fewer, denser cells (174 against 231 at 12px) and the second most even spread. It also forecloses the blend rule entirely, since there are no crossings to take an angle from, so item 1 of the walk partly decides item 2.

---

## 9. Walk rulings, 2026-07-23

### Item 2, the tone rule: blended orientation

**Ruled.** Blend, on the grounds that it produces the most aesthetically pleasing idle breathing on the pixel face. Not on level distribution, which was the axis the measurements ranked, and which favored blend anyway (all four levels populated at 26/35/12/26, against density's 70/8/11/11 skew).

Worth naming why the aesthetic ground is the right one here rather than a softer one. The pixel face's idle is an opacity breathe applied per y-band chunk. What breathes is a *set of cells sharing a tone*, so how the tones distribute across the field is what the breathing has to work with. A rule that puts 70% of cells in one level gives the breathe one large undifferentiated mass; a rule that spreads them gives it structure to move through. The distribution measurement and the aesthetic judgment were reading the same property from two directions.

Recon finding F2 predicted the opposite outcome and recommended density. It was wrong twice: the blend degeneracy it feared measured 6 to 9 percent rather than a large share, and density's own distribution turned out to be the skewed one. F2's arithmetic about perpendicular cancellation was correct; its prediction of the consequence was not.

### Item 1, the presence rule: silhouette, by consequence

**Decided by the tone ruling rather than separately.** Blend needs angles, angles need crossings, and crossings only exist where ink is a line. Native fill has no crossings, so blend is unavailable there; the lab enforces this and reports it in the readout. Blend therefore implies silhouette.

This is the mode everything so far was measured and judged under: the lab's default, and David's config of 2026-07-22.

**What silhouette means in production**, since this is the ruling that decides the authoring spec:

- Marks are authored as fills, which is what the whole test library already is. The flattener walks each path's outline and emits it as polylines. Interiors are empty.
- Both faces agree, and this is the point that settles the crossing-length-versus-coverage tension: the vector face draws those same outlines, so it shows hollow marks too. In native fill both faces would have shown solid marks. Neither mode has a vector face that disagrees with its pixel face, so there was never a representation gap to correct, only a choice between two internally consistent compositions.
- The hybrid (filled on the vector face, outlines in the aggregation) is available and rejected: the two faces would show genuinely different compositions, which breaks the premise that they are one composition seen twice.
- **The `currentColor` carrier resolves to `fill`.** Section 2b left the attribute open pending this item. The marks are authored as fills, so the marked attribute is `fill="currentColor"`, not `stroke`. The rule as written stands unchanged: the paint attribute is `currentColor`.

### Item 3, flow align: still open

The control is in the lab and has not been ruled. Not blocking `raster/`: flow align is a sampler input, and the sampler's shape (per-cell expected count, hash-keyed draws) is already settled either way.

### What this unblocks

`raster/` is now fully specified. Presence is crossing length at the 0.20 x cell threshold, tone is blended orientation with the double-angle vector mean quantized to 4 buckets and inverted, 2 buckets in high contrast, ties round toward the higher bucket. The step 3 split proposed on 2026-07-22 is no longer needed; the module can be built in one pass.

---

## 10. Step 3 landed: `raster/`

**Built 2026-07-23.** `src/background/raster.js` with `raster.test.js` beside it, 45 tests. Full unit suite green at 234 across 11 files.

**Location.** A new `src/background/` rather than `src/components/BackgroundSystem/`. The module boundaries from the handoff (`lsystem`, `raster`, `glyphs`, `compose`, `render`) describe a generation subsystem shared by two renderers, not a component, so it parallels `src/tokens/` rather than sitting under `components/`. Flat files in that folder until one of them genuinely needs more than one, matching the `parse.js` / `springCurve.js` / `footprint.js` precedent for pure modules.

**Surface.** `axial`, `bucketOf`, `smoothstep`, `walkSegment`, `densityMap`, `aggregate`, plus the `AGGREGATION` constants and `DEGENERATE_EPSILON`. No DOM, no React, no time, no randomness.

**Cell size is not in `AGGREGATION`.** It is a per-surface value (open question 8), so every entry point takes it as a parameter and the surface's own config owns the number. David's 2026-07-22 config ran the nav column at 8px; that is a config value, not a committed constant, and it has not been formally ruled.

**The tie-break became a named function rather than a comment.** `bucketOf(theta, buckets)` is the ruling, so it is testable in isolation. This matters more than it sounds: an exact boundary is not reachable through the accumulator, because a mean orientation comes back from `atan2` a rounding error either side of the boundary. Through `bucketOf` it is exactly reachable, since dividing PI by 4 and by 8 are exact in binary floating point, so `(PI/8)/(PI/4)` is exactly 0.5 and the assertion tests `Math.round`'s behavior rather than luck. The rule at the aggregate level is therefore about being deterministic at a boundary, not about which side a knife-edge input lands on.

### Two corrections the tests forced

**A real order-dependence bug, caught by a test written to fail.** Dominant ink per cell was decided by crossing length alone. Where two strokes of different colors cross a cell by exactly the same length, which they do at every intersection of one horizontal and one vertical stroke, the winner fell out of `Map` insertion order, so the drawing depended on which stroke was walked first. That is precisely what the determinism rules forbid. Fixed by falling back to the lower color string, which makes the choice a property of the ink rather than of the iteration. The test asserts the same cells come back from `[s1, s2]` and `[s2, s1]`.

**The degeneracy note in section 7 (finding F2) was wrong about the tone.** It said a cancelled cell resolves to `atan2(0, 0)` and therefore bucket 0. It does not. The accumulator does not cancel to exactly `(0, 0)`: `sin(PI)` evaluates to about `1.2e-16` rather than 0, so a perfectly balanced cell resolves to wherever that residue points, which for the horizontal-plus-vertical case is bucket 1 rather than 0. Repeatable, so reproducibility holds, but it is rounding noise rather than a reading of the ink. This makes the degenerate flag more important than the original note implied, not less. Corrected in the module comment and pinned by a test.

### Still ahead

`compose/` (sampler, stamp transform, display list), `glyphs/` (library import, owned flattener, authoring README), `lsystem/` (expand, interpret, profiles), `render/` (both faces, choreography, reduced motion). Walk item 3, flow align, remains unruled and does not block: it is a sampler input, and the sampler's shape was settled independently in section 4.

---

## 11. `compose/` and `rng/` landed

**Built 2026-07-23.** `src/background/rng.js` (17 tests) and `src/background/compose.js` (37 tests). Full unit suite green at 285 across 13 files.

### rng: the determinism boundary in one file

Section 4 ruled "hash-keyed draws for grid-indexed things, sequential mulberry32 for the L-system expansion, the boundary named in a comment." The comment now has a file to live in, and the rule is stated as: **if a value belongs to a cell, hash it; if it belongs to a step in a sequence, stream it.** `draw(seed, i, j, salt)` follows `DemoField/generateField.js`'s FNV-1a idiom so the two procedural surfaces in the codebase share one approach.

The salt argument carries weight: without it a cell's x-jitter and its rotation would be literally the same number and the field would show a visible correlation between the two. A test asserts they never coincide across 200 cells.

### compose: the sampler, the stamp transform, the display list

`samplePlacements` implements the ruled form: each cell computes its own expected count (`budget x weight^gamma / total`), takes the integer part outright, and resolves the fraction with a hash draw keyed on its own grid position. `transformPoint` is owned arithmetic rather than an SVG transform attribute, because both faces need the resulting *points*: a transform attribute would move the vector face's paint and leave the aggregation reading unrotated geometry, which is the drift the single-resolution-point discipline exists to prevent. `composeStamps` emits the display list and carries per-stroke color through untouched, since resolving it to a theme value is the renderer's job and must happen once for both faces.

### Correction: the amendment overclaimed resize stability

Section 4 called per-cell expected count "the resize-stable form." Writing the test for that claim showed it is not quite true, and the reason is structural: the expected count divides by the **total** weight of the field, so adding cells lowers every cell's expectation slightly, and cells whose fraction sat near their Bernoulli threshold flip. The normalizer is global even though the draw is local.

Measured, growing a 20-row field and counting how much of the shared region survives unchanged:

| field grows | hash-keyed (shipped) | sequential (the form it replaces) |
|---|---|---|
| 20 → 21 rows | **96%** | 6% |
| 20 → 22 rows | 92% | — |
| 20 → 24 rows | 84% | — |
| 20 → 26 rows | 78% | 1% |
| 20 → 30 rows | 71% | — |
| 20 → 40 rows | 54% | 0% |

So the amendment was right about which form to build and wrong about what it guarantees. A cumulative-distribution sampler reshuffles essentially completely on **any** growth, because every draw after the first shifts: one extra row costs it 94% of the composition. The hash form degrades in proportion to how much the field actually grew, and what survives is identical rather than merely present, keeping its exact position, rotation, scale and mark. The test asserts both halves of that.

The honest statement of the guarantee, which replaces "resize-stable": **most of the composition survives a resize, and the part that changes is proportional to the growth.** If perfect stability is ever wanted, the fix is a fixed normalizer (a target density per unit area) instead of a global budget, which trades an exact budget for exact stability. Not needed unless the nav column turns out to resize often enough to notice.

### Still ahead

`glyphs/` (library import, the owned flattener, the authoring README) and `lsystem/` (expand, interpret, profiles), then `render/`. The flattener is the fiddly one, and `archive/backgroundSystem/build-marks.cjs` is already most of its paint-resolution logic.

---

## 12. `glyphs/` landed, and the harness is now four-fifths production

**Built 2026-07-23.** `src/background/glyphs.js` with 54 tests. Full unit suite green at 339 across 14 files.

### The owned flattener replaces `getPointAtLength`

This module exists to retire the labs' flattening, for the two reasons the handoff recorded: `getPointAtLength` is browser numerics, so it is not guaranteed bit-identical across engines and breaks the same-seed-same-drawing claim, and it ignores element transform attributes, so a mark authored with a transform flattens to the wrong geometry with no error.

Three layers, each tested on its own. `parsePathData` normalizes a `d` string to absolute commands, covering relative forms, implicit repeats (a coordinate pair after an `M` continues as an `L`, which Illustrator emits and which would otherwise split a subpath in two), the shorthand curves `S` and `T` with their reflected controls, and elliptical arcs through the endpoint-to-center parameterization. `flattenPath` turns those into polylines. `parseMarkSvg` reads a file's text into a mark definition, with paint resolution promoted verbatim from `build-marks.cjs` so the offline generator and the runtime loader can never disagree.

**Subdivision is the standard chord-error bound, not a heuristic.** The first draft derived segment count from the control polygon's length, which is conservative but arbitrary. The test that measured deviation against the tolerance forced the correct form: the distance between a Bezier and a chord across a parameter step is at most `max|B''| * dt^2 / 8`, and for a cubic `|B''|` is bounded by 6 times the larger of the two second differences of the control points. Inverting for `n` gives a closed-form count that holds the deviation under any requested tolerance, verified at 1.0, 0.25 and 0.05.

That test also caught a mistake in itself worth recording: the first version measured each curve sample's distance to the nearest polyline **vertex**, which reports the vertex spacing rather than the deviation and is a much larger number. Measuring to the nearest point on the nearest **segment** is the thing tolerance actually means.

### Harness status

`archive/backgroundSystem/raster-harness.html` now imports four production modules and inlines one lab layer:

| layer | source |
|---|---|
| traversal, density map, aggregation | `raster.js` |
| sampler, stamp transform, display list | `compose.js` |
| hash draws and the sequential stream | `rng.js` |
| path parsing, flattening, paint, normalization | `glyphs.js` |
| L-system expand and interpret | still inlined lab code |

Verified running after the swap: 32 marks flattened to 134 strokes and 2689 points at tolerance 0.25 with no `getPointAtLength` anywhere, 125 stamps placed against a budget of 120 (approximate by design), 782 inked cells, zero truncation, about 7ms to generate.

**Serving note for the next session.** The harness path 307-redirects to its extension-less form, so `curl` needs `-L` or it grades an empty body. And Vite extracts an inline `<script type="module">` into a separate `html-proxy` module, so grepping the served HTML for the page's own JavaScript finds nothing and proves nothing; fetch the proxy module instead. Both of those cost time here and looked exactly like a stale cache.

### Still ahead

`lsystem/` (expand, interpret, ruleset profiles) is the last generation module. Then `render/`, which is where the reveal choreography, the frozen idle constants, the crossfade and the reduced-motion branches finally read the token layer.

---

## 13. `lsystem/` landed. The generation half is complete.

**Built 2026-07-23.** `src/background/lsystem.js` with 42 tests. Full unit suite green at 381 across 15 files.

`expand` rewrites the alphabet, `interpret` walks it with a turtle, `growArmature` runs a profile from one or more roots, and `RULESETS` holds the three the handoff named as suited to a tall narrow column. All randomness here is the **sequential** stream, which is the far side of the boundary `rng.js` names: a production rule's choice depends on where it sits in the rewrite and the turtle's jitter depends on which step of the walk it is on, so both belong to a position in a sequence rather than a position on a grid.

Three behaviors worth having written down, because each one is a decision rather than an accident:

- **A branch is its own polyline.** Without closing the current line on `[` and `]`, popping the stack draws a chord from the branch tip back to the fork, which lays crossing length where the armature has none and makes `densityMap` weight empty space.
- **One shared stream drives every root**, rather than one stream per root. Two roots seeded identically grow identical plants, and a field of clones reads as wallpaper. Sharing the stream makes each root continue where the last left off, so they differ without separate seeds to manage. A test asserts the two roots do not produce the same branch structure.
- **Heading jitter accumulates.** It is added to the angle, not the position, so a long branch performs a random walk and curls. That is most of what makes growth read as grown rather than ruled. A test I wrote first asserted the opposite (that a long branch stays near its axis) and failed correctly; the property that actually holds is that the drift has no preferred direction across seeds, so branches do not all bend the same way. The module comment now says which of the two it is.

`expand` also carries the growth guard the rest of the system has: a stochastic rule set at a high iteration count grows exponentially, and an armature that eats the main thread is worse than one that stops early and reports `truncated`. All three shipped rulesets run well under it.

### The harness is now entirely production

Every layer on `archive/backgroundSystem/raster-harness.html` is imported from `src/background/`. Nothing is inlined lab code. Verified across all three rulesets, both root modes, flow align on and off, with the smoke test passing.

A useful accident: the production `lsystem` reproduces the lab's armature **exactly** for the same seed, 307 density cells and 125 stamps either way. The port is faithful, not merely equivalent-looking.

| layer | module |
|---|---|
| rewriting, turtle, profiles | `lsystem.js` |
| path parsing, flattening, paint, normalization | `glyphs.js` |
| traversal, density map, committed aggregation | `raster.js` |
| sampler, stamp transform, display list | `compose.js` |
| hash draws and the sequential stream | `rng.js` |

### What is left

`render/` alone: both faces as SVG, the reveal choreography reading `--motion-*`, the frozen idle constants, the crossfade, and the reduced-motion branches. It is also the first module that touches the app rather than sitting beside it, so amendments A and B (the theme-change trigger, and where the idle period constant lives) need answering before it is built. Both are still open.

---

## 14. Amendments A and B ruled. Choreography built. A production bug found on the way.

**Ruled 2026-07-23, David.**

**A. No reveal on any theme switch.** Simpler than the narrowing proposed in section 5: the reveal fires on mount and never again for a theme change, including one that crosses the high-contrast boundary and genuinely changes the geometry. That composition swaps without animation, which is defensible because entering high contrast repaints the whole page anyway and an animated background would be the odd element out. If it ever reads badly the fix is a plain crossfade, not a reveal.

**B. The idle period lives in `motion.css`.** Shipped as `--feedback-background-idle-period: 4800ms`, the fourth fixed chrome constant, with a comment stating why a chrome timing value belongs beside the other chrome timing values rather than in the artwork's config object. Read through a new `backgroundIdlePeriodSeconds()` in `src/utils/feedbackDuration.js`. Amplitude (3px) and dip (0.24) stay frozen numbers in `choreography.js`, since neither is timing.

### A live production bug, found because B pointed at the helper

Adding a fourth constant meant reading the helper that serves the other three, and `feedbackSeconds` did a bare `parseFloat(raw) / 1000`, which assumes the value is spelled in `ms`.

It is not, in the built app. Verified in `dist/` on 2026-07-23:

```
--feedback-flash-duration:3s
--feedback-nav-duration:.36s
--feedback-ui-duration:.1s
--feedback-background-idle-period:4.8s
```

The minifier rewrites every one of them to seconds, exactly as it rewrote the `--motion-duration-*` tokens in the 2026-07-15 incident. So `navDurationSeconds()` returned **0.00036 seconds instead of 0.36**, `uiDurationSeconds()` 0.0001 instead of 0.1, and the flash 0.003 instead of 3. Every JS-driven chrome transition in the shipped app has been running a thousand times too fast, while behaving correctly under `npm run dev`.

What hid it is worth recording, because it is the reason a whole class of bug survives review here: **the CSS-side uses were never affected.** `transition: color var(--feedback-nav-duration)` consumes `.36s` perfectly well. Only the JavaScript reads were wrong, so accordions and hovers kept animating and the broken paths were the Framer Motion ones that simply snapped. Consumers: `DemoArea`, `TokenLab`, `RailDrawer`, `QuoteBlock`, and everything downstream of `useChromeTransition`.

Fixed by routing through `parseMs` and `parseTokenValue` from `src/tokens/parse.js`, which already handle both spellings and exist because of the 2026-07-15 incident. The helper simply was not using them. `src/utils/feedbackDuration.test.js` is new and pins both spellings, the fallbacks, and the reduced-motion snapping. This is a shipped-app fix that happens to have surfaced during background-system work; it is not part of the background system and can be committed on its own.

### `choreography.js`

33 tests. Full suite green at 422 across 17 files.

The module is where the split ruling lives in code. `revealTiming` reads the editable `--motion-*` tokens through the caller, so a preset change retimes the reveal. `idleTimings` reads the fixed period and the frozen amplitudes, so Explore mode cannot touch the idle. `bandOf` is the single y-band partition both faces derive chunk membership from, replacing the lab's two independent sorts that happened to co-locate.

Three behaviors pinned by test that would otherwise be discovered later:

- **`idleTimings` returns `null` under reduced motion**, rather than a slowed or quantized table. The caller must drop the animation, because a zero-duration infinite animation is still an infinite animation.
- **The reveal's reduced-motion quantization needs an unflattened window.** If the caller derives the window from tokens `reduceMotion` has already flattened, `delay.long` is 0, the window is 0, and the four steps all land at the same instant. That is pinned as a known consequence with the caller's obligation named, and the P17 demo's `respectReducedMotion: false` read is the existing precedent for supplying one.
- **The idle table is hash-keyed on the chunk index**, so changing the chunk count keeps surviving chunks' timings intact instead of reshuffling all of them. Same reasoning as the sampler.

### What is left

The renderer itself: a React component drawing both faces as inline SVG, with the CSS module holding the sway, breathe and arrival keyframes, plus the crossfade. It is the first piece that mounts in the app, so it needs a placement decision (behind a flag in `NavColumn`, or a standalone route first) that has not been made.

---

## 15. The renderer, on a standalone route

**Built 2026-07-23.** `src/components/BackgroundArt/` (component plus CSS module). Lint clean, build clean, full suite green at 422.

**Placement: standalone first, David's call.** The view is `archive/backgroundSystem/background-route.html`, which bootstraps the same token layer `main.jsx` does (motion.css, color.css, ThemeProvider) and mounts the component directly. Nothing in `App.jsx`, `NavigationContext` or `useHashRoute` was touched, so the renderer is not reachable from the shipped shell and no navigation state had to learn about it. It lives in gitignored `archive/`, and Vite only builds `index.html`, so it cannot ship by accident.

Controls on the route: theme (all four), ruleset, cell size, face (both / vector / pixel), cell arrival (pop or scale-in, open question 2), budget, replay, reroll.

### Ruling A needed more than leaving `theme` out of the memo

Keeping the reveal off theme switches is not just a matter of which values the geometry memo depends on. Crossing the high-contrast boundary genuinely changes the composition, because ruling 12 drops it to two tone levels on a reduced budget. Fewer cells means React mounts a **different set of elements**, and a freshly mounted element carrying an arrival animation plays it.

Measured on the route before the guard existed: switching dark to high-contrast-dark took the pixel face from 779 rects to 592, and those 592 re-revealed.

The fix is a mount-scoped guard. The arrival class and its inline timing are attached only while the first reveal is in flight; once it lands, both are dropped, so a later composition simply appears. The effect that flips it is keyed on mount alone and deliberately not on the timing values, because a token edit mid-reveal must not restart the clock, which would hold the background permanently in its arrival state while a duration slider is dragged.

Verified on the route after the fix:

| moment | pixel cells | arrival class | animation |
|---|---|---|---|
| during reveal | 779 | `cellPop` | `popIn` running |
| after reveal | 779 | none | `none` |
| after switching to high contrast | 592 | none | `none` |

The composition changes and nothing re-reveals. Ruling A holds.

### What the route confirms about the split

Reveal timing read live from the tokens: `animation-duration: 0.2s` (duration.base) on `cubic-bezier(0,0,0.2,1)` (ease.enter), with the window at 8 x delay.long. Idle read from the fixed constant: a sample chunk at 3.97s, which is the 4800ms constant carried through its per-chunk variance, starting at 1.88s (window 1.6 + stamp 0.2 + settle 0.08).

### Not verified in-browser

Reduced motion. `idleTimings` returning null and the reveal's four-step quantization are covered by unit tests, and the CSS module carries an `@media (prefers-reduced-motion: reduce)` block as a second line, but none of that was exercised with the preference actually on in this session. Worth doing on the route before the component goes anywhere near `NavColumn`.

### Still ahead

The mount itself: `NavColumn` behind a flag, the worst-case clearance baseline measured from the tallest expanded accordion section, the glass on the expanded panel, and the sticky-height-0 wrapper with its `ResizeObserver`. All ruled already; none built.

### 15a. The renderer was invisible. Two faults, one of them a real host contract.

David reported seeing nothing on the route. Diagnosed 2026-07-23.

**Fault 1, and it is the one that matters: the host must be a stacking context.**

The layer paints at `z-index: -1`, which is what puts the artwork behind the host's in-flow content (nav items, labels) while staying above the host's own background. The second half of that has a precondition nobody states out loud: **a negative-z child paints above its parent's background only if the parent is a stacking context.** Where it is not, the child paints *behind* the background instead, and since every surface in this app sets an opaque `--color-bg`, the artwork vanishes completely.

The symptom is nasty. Nothing renders, while the DOM holds 553 correct paths and 779 correct rects with correct fills, and every computed style on the artwork itself looks right. There is nothing to see in an inspector unless you already suspect paint order.

`position: relative` alone does **not** create a stacking context. The route's stage had `position: relative` and an opaque background and nothing else, so it failed exactly this way.

This answers David's question directly. The nav background being opaque is not itself the problem, and making it transparent is not the fix: the fix is making `.nav` a stacking context so the layer paints above the nav's background and below the nav items. `isolation: isolate` is the honest trigger, because it says what it is for and has no other effect.

Why not simply drop the negative z-index: a sticky element at `z-index: auto` paints in the positioned-descendant step, which is above in-flow text, so the artwork would cover the nav items rather than sit behind them. The negative z-index is load-bearing, and so is the host contract that comes with it.

Recorded three ways so the next person does not lose an hour to it: a block comment on `.layer` in the CSS module, a HOST CONTRACT note above the component, and a dev-only `console.warn` that fires at mount when the host is not a stacking context and has an opaque background.

Worth noting `DemoField` carries the same requirement and satisfies it **by accident**: DemoArea's crossfade layer happens to have an inline z-index. Nothing guaranteed that, and nothing guarantees the next host.

**Fault 2: the stage was a flex item with default shrink**, so it collapsed rather than holding 220px. Fixed with `flexShrink: 0`.

**Consequence for the eventual mount:** `.nav` in `NavColumn.module.css` sets `background-color: var(--color-bg)` and creates no stacking context. It will need `isolation: isolate` before the artwork can appear inside it. That is now a known prerequisite of the mount rather than a discovery waiting to happen.

**A note on verification limits.** The Claude browser pane reports a 0x0 viewport, so layout measurements taken there are meaningless (a paragraph measured 1459px tall because text wrapped one word per line). Structural facts, computed styles, paint-order preconditions and DOM counts are reliable there; anything about size, position or visual result is not, and belongs to David's own browser.

### 15b. High contrast coloured the vector face but not the pixel face

David, 2026-07-23. Both high-contrast themes repainted the strokes to the accent correctly and left the pixel cells shading the library's own inks.

**Cause: the component resolved ink where each face painted, which the pixel face cannot honour.** The vector face paints strokes, so resolving at paint time works for it. The pixel face does not paint strokes; it paints cells whose dominant ink was decided during aggregation, inside the geometry memo, long before any paint. So the aggregation ran on the authored library colours and the vector face ran on resolved ones. In light and dark the two happen to coincide, which is why it only showed in high contrast, where the blanket override changes every stroke.

This is the failure the single-resolution-point discipline exists to prevent, and it was written into the module comments three times over before being broken in the one place it mattered.

**Why the obvious fix does not work.** Resolving before aggregation would mean the geometry memo depends on the theme, and ruling A says a theme switch must not regenerate or re-reveal.

**The fix: aggregate on an ink KEY, resolve the key at paint time.** The dominant-by-crossing-length decision only ever needed a stable identity per stroke, never a final colour. Strokes now carry either their authored colour or the sentinel `currentColor` as a key; `aggregate` picks a dominant key; one function (`inkFromKey`) turns a key into an ink at paint time, and both faces call it. Geometry stays theme-independent and the faces cannot drift.

A side benefit worth noting: previously a `currentColor` stroke contributed no colour to aggregation at all (its colour was null), so a cell made entirely of token-bound strokes fell through to the tone ramp instead of taking the theme's ink. The sentinel fixes that too.

Verified on the route:

| theme | strokes | pixel fills |
|---|---|---|
| high-contrast-dark | all `#aaccf6` | 2 shades, `rgb(170,204,246)` and `rgb(59,71,86)` |
| high-contrast-light | all `#855a0d` | 2 shades, `rgb(133,90,13)` and `rgb(47,31,5)` |
| dark | 8 authored inks | 32 fills, being 8 inks x 4 tone levels |

Two tone levels in high contrast and four in light and dark, which is ruling 12 and amendment 2a landing exactly as specified. The shade factors are the prototyped 0.35 to 1.0 range: `rgb(59,71,86)` is the accent at 0.35.

### 15c. The marks were not following the text-base binding

David, 2026-07-23. Ruling 2b binds the failing `#232323` ink to `--color-text-base`; the marks were still painting the authored near-black.

**The component was right and the library was not.** `inkFromKey` resolves a `currentColor` key to the theme's text ink exactly as ruled, and nothing else to it. The generated library declared zero token-bound paths: all six near-black marks (Assets 28 to 33, fifteen paths) still carried the literal hex, so the correct answer for a literal ink is to return it unchanged.

That is the carrier ruling working as designed rather than failing. A mark takes the theme's ink by declaring `currentColor`, and these were authored before the ruling existed.

**Fix, in two places, neither of them the component.**

`build-marks.cjs` gained `--bind=<hex>[,<hex>]`, which rewrites an authored ink to `currentColor` at generation time. Non-destructive: the source SVGs keep their authored value and can be re-authored properly later. The library is now generated with `--bind=#232323`, which reports what it bound and to how many marks. For a library authored **after** the ruling this flag should go unused, because the file simply declares `fill="currentColor"`.

The route stopped transcribing the token values into a hardcoded palette table and now reads `--color-text-base` and `--color-accent` off the live token layer. That matters for what the route is for: it was previously agreeing with the ruling by coincidence, and is now demonstrating it.

**Two bugs found inside that second fix, both worth keeping.**

*Effect ordering.* React runs a child's effects before its parent's, so reading tokens in the route's own effect samples one theme behind: `ThemeProvider` has not yet written the new `data-theme`. Light rendered dark's text-base and high contrast rendered light's accent.

*Frames.* Deferring the read with `requestAnimationFrame` fixed the ordering and introduced something worse: **rAF does not run in a background tab**, so the palette stayed at its initial placeholder and every token-bound mark painted `#000`. This surfaced only because the Claude browser pane is itself a hidden tab and never ticks rAF, which turned an intermittent real-world bug into a deterministic one. A user who switches tabs during load would have hit it.

Settled with a `MutationObserver` on the root's `data-theme`, which fires on the mutation itself and needs neither a frame nor a particular effect order.

Verified across all four themes:

| theme | `--color-text-base` | strokes on it | pixel cells shading it |
|---|---|---|---|
| dark | `#e1e1e1` | 96 | 131 |
| light | `#1a1a1a` | 96 | 131 |
| high-contrast-dark | `#ffffff` | 0 | 0 |
| high-contrast-light | `#000000` | 0 | 0 |

Both faces follow the binding in light and dark, and the high-contrast blanket correctly overrides it, which is why text-base does not appear there at all.

---

## 16. Mounted in NavColumn, behind a flag

**Built 2026-07-23, David's call.** Lint clean, 422 unit tests green, the 60-test Playwright suite green on built output.

### The flag

`?bg=1` anywhere in the query string, e.g. `https://cadence.davidpreli.com/?bg=1#/token-lab`. Read once at module scope in `src/components/NavColumn/backgroundFlag.js`. A query flag rather than a build-time constant because the checks that matter are on the deployed site and on built output, where a rebuild to flip a constant is a poor trade; the app's own routing lives in the hash, so a query parameter sits beside it without colliding.

**Verified the flag actually costs nothing when off.** The lazy boundary is a thin wrapper (`NavBackgroundArt.jsx`) that holds every heavy import, so the flagged-off path pulls in neither the mark library nor the L-system nor the flattener. In the built output the background code is a separate 24K JS chunk plus 4K CSS, and `currentColor`, `popIn`, `swayX` and the keyframes appear **zero** times in the 600K main bundle. With the flag absent at runtime, none of `library.js`, `glyphs.js`, `raster.js` or `lsystem.js` is ever requested. Same split shape the Motion Tiles grid chunk uses.

### The mark library finally exists in `src/`

`src/background/marks/` holds six placeholder marks promoted from `testSVGS`, loaded by `src/background/library.js` through `import.meta.glob` — the last piece of the `glyphs/` boundary. `src/background/marks/README.md` carries the authoring spec, including the constraint that actually bites (a literal ink has to survive two opposite backgrounds) and the measured band.

`mark-30.svg` is authored `fill="currentColor"` rather than the `#232323` it carries in the archive copy. For committed art that is the correct expression of ruling 2b: the file declares that it takes the theme's ink, instead of a build step mapping it.

### Three things the mount needed that nothing else did

**`.nav` had to become a stacking context.** Predicted in 15a and confirmed: without `isolation: isolate` the layer's `z-index: -1` would paint behind the column's opaque background and nothing would appear. Added with a comment explaining that it is load-bearing rather than decorative.

**The baseline is the worst case, computed from measured rows.** Three headers plus the largest section's leaves (Token Lab's Overview plus every category), multiplied by heights read from the live DOM rather than hardcoded. The collapsed accordion clips its rows with `overflow` rather than unmounting them, so a real header and a real row are always measurable. In the nav that resolves to `8 + 3x43 + 6x37 = 359px`, and it does not move when a section opens, so the artwork never reflows on expand.

**Clearance gates centers, but ink has extent.** The first mount put stroke ink at y=334 against a 359px baseline, behind the last nav header, because a stamp is not a point: it reaches outward from its placement center. The density baseline is now pushed down by the worst case a stamp can reach, which is half the normalized span along its diagonal (a rotated mark presents a corner, not an edge) at the largest scale the variance allows, plus the placement jitter. Ink now starts at y=366, clearing items that end at 358.

### Verified in the real nav

| check | result |
|---|---|
| flag on, 1440px | nav 220x678, `isolation: isolate`, 1221 paths and 395 rects |
| ink vs. nav items | ink starts y=366, items end y=358 |
| dark / light | 20 strokes on `--color-text-base`, 6 distinct inks |
| both high-contrast | 1 ink, the accent blanket; text-base absent as expected |
| flag off | no artwork, and no heavy module requested |
| flag on at 960px | no inline nav, no artwork, no chunk requested |

### Still open

Reduced motion has never been exercised with the preference actually on, in the nav or on the standalone route. The unit tests cover `idleTimings` returning null and the four-step quantization, and the CSS module carries an `@media` block, but the real behaviour is unconfirmed. It is the last unverified ruling.

The glass on the expanded panel is also unbuilt: ruled in section 4 (a property of the expanded panel, riding the accordion's own `grid-template-rows` transition, with the feathered base from the 2026-07-22 exchange), but nothing in `NavColumn` implements it yet.
