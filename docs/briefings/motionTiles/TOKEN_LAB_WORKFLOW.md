# Token Lab Ingredients — Production Workflow Handoff

Operating manual for taking an ingredient from source video to a working, token-driven Rive component. The pipeline was developed and proven on row 1 (six cells, including the two difficulty extremes) and is the procedure for the remaining 30. Companion documents: `TOKEN_LAB_INGREDIENTS.md` (system recon, measured constants, React wiring), `row1_analysis.md` / `row1_specs.md` (worked examples of every artifact type).

Audience: whoever runs the next analysis session (Claude, with David), and whoever builds in the editor (David).

---

## 1. The system in one paragraph

36 ingredient artboards (`ing_r1c1` … `ing_r6c6`), each script-free: pose-A artwork + converter data bindings, linked to a shared `IngredientVM` with one number, `progress` (0..1). A single ingredient-agnostic Lua driver computes eased progress on a 4-beat cycle (hold A / A→B / hold B / B→A, 2.0s at speed 1) and writes that one number per instance per frame. The two runtime tokens are `speed` (period = 2.0 / speed) and `easing` (k in `t^k / (t^k + (1−t)^k)`; k = 1.70 is the measured source easing ≈ CSS ease-in-out). Palettes are not runtime tokens — they ride on VM instance names (`standard` / `snappy` / `cinematic`). All motion is a function of progress; if an analysis ever seems to require touching the driver, distrust the analysis.

## 2. The per-ingredient pipeline

Seven gates, in order. Skipping a gate is how every recorded failure happened.

1. **Description first.** David provides the motion/composition description before any analysis. Highest-value content, in order: anything hidden/occluded at either pose; rotation counts and directions; which pieces share behavior; authored design values if known. Timing/stagger can be omitted — measurement handles it.
2. **Measure against the description.** Verify composition claims; fit geometry (soft/area-weighted measurement only — hard thresholds eat ~1.5px of AA per edge); fit choreography windows. Challenge with specific measurements where pixels disagree; ask where data cannot resolve. Never silently accommodate or silently resolve.
3. **Confirmation gate.** Challenges and questions go back to David. No SVG or spec is emitted for a cell with an open composition question.
4. **Emit the SVG** (conventions in §4) and the **spec** (format in §5).
5. **Static sign-off sheet:** SVG render vs source pose stills, side by side. David eyeballs.
6. **Editor build** (checklist in §6), ending with the hand-scrub acceptance: progress 0 = source pose A, progress 1 = pose B, mid-scrub matches the reference feel.
7. **Driver test:** assign to a script node, confirm the 4-beat loop and live token response (easing 10 = hard snap; speed 0.1 = crawl for eyeballing rotations/directions).

Validation tiers: the sign-off sheet always; full 120-frame reconstruction (r1c2-style) for cells that misbehave or carry high-risk models. Reconstruction quality gates: **interior error (~1-2/255) + beats-the-pose-hold-null** — never raw diff alone (perimeter-heavy cells have proportionally high AA floors). Rotation claims validate in angle-space, not pixel diff (pixel diff is nearly blind to spin on symmetric shapes).

## 3. The discriminator toolkit (traps, and the probe that catches each)

Every entry below cost a correction once. They are now standard probes.

| Trap | Signature | Probe |
|---|---|---|
| **Pose-degenerate evidence** | Multiple compositions paint identical pixels at both poses (r1c5: solid pieces vs translucent overlaps; r1c6: quarters vs coincident copies) | Mid-frames discriminate where poses cannot. A noted residual discrepancy at mid-frame is a **rejection**, not a footnote. |
| **Occlusion ambiguity** | Geometry hidden behind other pieces at a pose (r1c2's rect read as bars) | Cannot be resolved from pixels at that pose — describe the hypothesis, flag it, ask. Prefer the simpler composition; mid-transition reveals (gap-fill widths, background troughs) can settle it. |
| **Occlusion-as-sequencing** | An element "appears late" (r1c1 red, r1c6 small yellows) | First hypothesis: it was there all along, underneath. Check stacking at mid-frame before adding stagger windows or opacity bindings. This is the source designer's signature move. |
| **Symmetry-folded rotation** | Per-frame orientation of an n-fold shape is only θ mod (360/n); fast spins alias (r1c2's 270° read as a 45° unwind) | Temporal unwrap with continuity across frames; joint-fit across pieces and both bursts; flag as ambiguous near the fold's Nyquist rate. Total rotation must land on a symmetry multiple. |
| **Rotated bbox ≠ scale change** | bbox grows while a square rotates | Blob **area** discriminates: rotation preserves it, scaling doesn't. |
| **Split formations** | "Splits/divides/breaks" in a description | Probe the first frames of separation: where the lobes appear (axes vs diagonals) identifies the formation; rest-pose tiling is degenerate. |
| **Unit assumptions** | 10000% scale, 15,469° rotation, an opacity that behaves as an on/off switch | Data-binding units are per-property and **normalized regardless of UI display**: Scale = factor (1.0 = 100%), Opacity = factor (0..1 — `progress*100` clamps into a pop), Rotation = radians, Position = px (absolute — include rest). **Probe every new property type with a test literal before writing formulas.** |

## 4. SVG conventions

- One file per ingredient, `viewBox="0 0 120 120"` — the inferred design scale (source video renders at 0.8×; measured sizes divide cleanly by 0.8, so snap to round design values, then revalidate).
- **Every piece has an id**; families in named groups. Names encode role/destination (`quad_nw`), not rest position. Document order = draw order (bottom first) — stacking is part of the spec.
- **The file holds the geometry the formulas transform FROM:** rest positions for translating pieces, full size for scaling pieces (rest applied by binding = fail-off to pose A), full opacity for fading pieces (selectable in editor).
- Plain filled paths only — no strokes-as-effects, masks, filters. Boring SVGs import best; names surviving import into layer names is confirmed.
- A comment block in each file states the composition and the binding summary.

## 5. Spec format (per cell — the memory-logged standard)

1. Composition paragraph with provenance tags: **[measured] / [inferred] / [confirmed] / [coarse] / [ambiguous]**. Ambiguities get their own flagged list.
2. Geometry table (design scale).
3. **Variable glossary** wherever formulas appear: p = the eased 0..1 the driver writes; w(p, a, b) = `clamp((p−a)/(b−a), 0, 1)`, the window ramp; all stagger lives in the (a, b) pairs; `1 − w` for disappearing elements.
4. **Data-binding table** — one row per binding target: Target piece | Property | **literal converter formula** in full Rive syntax (`{{IngredientVM/progress}}`, `min(max(…))` clamps, decimal literals). Paste-ready, no shorthand. **Negative literals must be parenthesized — `* (-45.0)`, never `* -45.0` — or the VM formula parser fails.** Position/radius constants are artboard-scale-dependent; scale/rotation factors are not.
5. Authoring notes: origins (set **before** binding — most bugs that look like formula errors are origin errors), group-vs-piece binding warnings (rotation can never live on a family group), rest/end-state checks, and the note that B→A comes free under descending p.

## 6. Editor build checklist (per ingredient)

1. Import the SVG; verify piece names survived in the hierarchy.
2. Set every piece's **origin** per the spec (usually its own center; r1c1-style cells specify pivots = hypotenuse midpoints/grid points).
3. Verify stacking survived import (spec states the order).
4. Link the artboard to the existing **`IngredientVM`** (Data Bind → Model) — do not create a new VM; one definition serves all 36 and is what type-matches the driver's slot.
5. **Shift+N** — flag as Component (unflagged artboards are invisible to the driver's dropdown and not exported).
6. Create/paste the converters from the binding table; bind per the Target column.
7. Hand-scrub `progress`: 0 = pose A exactly (fail-off check — a dead binding shows pose A), 1 = pose B, mid = reference feel.
8. Assign to a driver script node; confirm loop + token response.

## 7. Driver & runtime facts (all verified this project)

- One Node script, ingredient-agnostic (`ingredient_pilot.lua`); it changes exactly once more (pilot → director). Editor-side work never requires script edits.
- `Input<Artboard<Data.IngredientVM>>` + `late()`; `:instance()` returns `Artboard<T>` (there is no `ArtboardInstance` type); instances **can** be stored in table fields (pool test passed); `inst.data.progress.value = n` writes through per frame and overrides manual VM edits by design.
- `Data.*` types are generated from live VMs — create the VM before pasting any script; "Unknown type" = schema drift, not a code bug.
- Multiple script nodes stay in lockstep structurally (clocks zero at init, same deltas) — proven fallback if ever needed.
- **Director architecture — VERIFIED IN FULL (option 3).** Composition running: 6 nested row-1 ingredients, one `composition_driver.lua` (v3). Fan-out binding confirmed (composition VM `progress` → each nested `IngredientVM/progress`); script→VM write confirmed via the documented **context pattern**: `context` arrives as init's second parameter, stash it, then `ctx:viewModel():getNumber('progress').value = n` per frame (nil-guarded). The VM-input approach (v2) failed with "property vm does not have a valid data context" — avoid. Bonus runtime fact: an optional self field (`ctx: Context?`) omitted from the factory loads fine — the factory-completeness rule exempts optional types. React contract: one `IngredientVM` bound at the composition and fanned out to all 36 cells (`progress`, `speed`, `easing`, plus the eight palette colors); there is no separate composition VM. Preset switch = swap the bound instance, which recolors and retimes at once. Confirmed in React 2026-07-08; the preset mechanism is no longer TBD (see `TOKEN_LAB_INGREDIENTS.md` §6). Scaling to 36 = place + one fan-out binding each; the driver never changes again.

## 8. React wiring

See `TOKEN_LAB_INGREDIENTS.md` §6 — preset table as single source of truth; `speed` and `easing` pass straight through (the Lua divides internally — do **not** copy the Cadence `frameInterval` inversion); palette switching is the VM instance name only; keep `@rive-app/react-webgl2` current (stale runtime = silent script failure with non-script content still rendering — that's the diagnostic tell). Load facts confirmed 2026-07-08: master artboard `Parametric`, state machine `parametricSM`; the runtime file is `public/riveTiles/ingredients_v2.riv`; play the state machine only after the instance binds or the grid loads frozen. The single-VM correction, the play-after-bind gotcha, and the verified wiring are in `TOKEN_LAB_INGREDIENTS.md` §6.

## 9. State of the suite (as of this handoff)

| Cell | Status |
|---|---|
| 16 originals (`r1c1`–`r3c4`) | Built, driver-verified, passed. All three preset instances; driven live from React 2026-07-08. |
| 20 colorways (`r3c5`–`r6c6`) | Palette variants of the 16 originals. Each maps to its source as `<original>_var<N>` per `docs/references/ingredient_map.svg`. |

(Updated 2026-07-08: an earlier version of this table showed rows 1–2 built and row 3 awaiting build. All 16 originals and all 20 colorways are now present and driven; the 12-vs-16 count against `TOKEN_LAB_CLOSEOUT.md` is resolved in favor of CLOSEOUT.)

**Analysis phase: COMPLETE** — 16 originals, three rows of description-first pipeline, every mechanism converter-native except r2c6's pending vertex-bindability check.

Artifacts: `poses_A/B.png` (canonical numbering), `ingredient_poses.zip` (72 exact stills), `motion_strips_1/2.png`, `easing_fit.png`, per-cell SVGs + specs, `row1_svg_signoff.png`, `ingredient_pilot.lua`.

## 10. Session kickoff prompts

**Analysis session (per row):**
> Token Lab ingredients, row N. Descriptions follow — measure against them, challenge where pixels disagree, questions before emission per the workflow handoff. Standard probes: mid-frame discrimination, stacking reads, split-formation first-frames, rotation unwrap. Emit SVGs + specs only for confirmed compositions.

**Build session (per cell):**
> Building ing_rXcY from `rXcY.svg` + its spec. Walk me through the §6 checklist; units are per-property (scale factor / rotation radians / opacity 0–100); origins before bindings.

**Debugging:**
> Ingredient rXcY misbehaving in-editor: [symptom]. Check units first (10000%/15469° class), then origins, then binding liveness (progress 0 should show pose A exactly). Full reconstruction validation available on request.
