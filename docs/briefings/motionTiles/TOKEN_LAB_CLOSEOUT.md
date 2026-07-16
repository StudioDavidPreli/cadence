# Token Lab Ingredients — Project Closeout

36-cell ingredient grid for the Token Lab landing page: reverse-engineered from a 2-second reference loop, rebuilt as Rive components driven by live design tokens. From first video probe to final seam fix. Companion references: `TOKEN_LAB_WORKFLOW.md` (the operating manual), `TOKEN_LAB_INGREDIENTS.md` (system recon + React contract), per-row analysis and spec files.

---

## 1. What got built

- **16 original ingredient components**, each script-free: pose-A artwork + converter data bindings on a shared `IngredientVM`, one number (`progress`) in. The remaining 20 grid cells are colorway instances of those originals — the palette-per-VM-instance mechanism doing double duty, no new artboards.
- **One driver** (~20 lines of logic): computes the eased 4-beat cycle from `speed` and `easing` tokens and writes a single VM number per frame. It changed three times during development and will never change again.
- **The option-3 composition**: components nested and laid out in the editor, `progress` fanned out by data bindings, React talking to one composition View Model. Tokens: `speed` (period = 2.0/speed), `easing` (k in `t^k/(t^k+(1−t)^k)`; k=1.70 measured from the source ≈ CSS ease-in-out), presets `standard`/`snappy`/`cinematic`.
- **The animation thesis, proven end-to-end**: every motion in the source — staggered choreographies, decoupled spins, morphs, flips, fan-folds — expressed as clamped window ramps of one eased number. The product's title demonstrates the product.

## 2. The process (how the workflow found its shape)

1. **Recon**: loop structure (4-beat, synchronized, 2.0s), pose extraction (72 stills), easing measurement (k=1.70 fitted from integrated per-frame motion across all 36 cells, cross-checked against a Bézier fit landing at CSS ease-in-out).
2. **Architecture decision** (option 1: runtime easing over baked timelines) and the **pilot** (r1c4): every runtime unknown falsified cheapest-first — instance storage, VM writes, converter bindings, token response.
3. **Hardest-first stress test** (r1c2, chosen by structural difficulty scoring): produced most of the measurement toolkit and, through its failures, the workflow's defining rules.
4. **Protocol inversion**: after r1c2's composition misreads, David supplies the motion description *first*; analysis verifies, quantifies, and challenges — never infers structure blind. Correction cycles dropped sharply from row 1 to row 3.
5. **Row cadence**: describe → measure/challenge → confirm → emit (SVG + spec + sign-off sheet) → build → report corrections back into the specs and rules. Three rows, each faster than the last.
6. **Composition**: fan-out verified by hand-scrub before any code; driver v3 landed on the documented context pattern; six-then-sixteen-then-thirty-six scaling with one binding per placement.

## 3. Debugging catalog (editor & runtime)

Every one of these is now a rule, a probe, or a spec convention:

| Issue | Resolution |
|---|---|
| `Unknown type 'ArtboardInstance'` | The type doesn't exist — `instance()` returns `Artboard<T>` |
| `Unknown type 'Data.X'` | Schema drift: the VM must exist (with the exact name/properties) before the script |
| Empty component dropdown | Two gates: Shift+N component flag + artboard linked to the matching VM |
| Scale = 10000% | Scale bindings take a factor (1.0 = 100%) |
| Rotation = 15,469.86° | = exactly 270 radians rendered in degrees — rotation bindings take radians |
| Dot as an on/off switch | Opacity bindings take a 0..1 factor; ×100 clamps into a pop |
| Diamond off the top of the cube | Position bindings are **absolute** — formulas must include the rest value |
| r2c4 petals snapping at rest | Rotation bindings are absolute too — `restRot +` (David's catch) |
| `Unknown global 'context'` | context is init's second *parameter*, not a global |
| `property vm does not have a valid data context` | The VM-input slot wouldn't resolve; the context pattern replaced it |
| Formula parse failures | Negative literals must be parenthesized: `* (-45.0)` |
| r1c3's growing side gap | Uniform scaleY was the wrong mechanism (rate 66 vs 45) → translate-and-clip |
| r3c4 radial seams | Same-color abutting wedges → solid cover piece popping in at fan completion |
| r3c2 collapse | Scale X only — the "collapse" is a through-zero flip |

Unit summary that emerged: **the binding path speaks normalized math regardless of what the property UI displays** — factor, factor, radians, absolute pixels.

## 4. Analysis corrections (the honest ledger)

The pixel pipeline was strong on *how much and when* and repeatedly wrong on *what things are* — which is why the description-first protocol became load-bearing, not courteous:

- **r1c2 "plaid bars"** → one solid rectangle behind the squares (David). The occlusion ambiguity was silently resolved toward the complex hypothesis; the correct model was simpler *and* validated better (6.38 vs 8.36).
- **r1c2 "diamond unwind"** → a 270° spin hidden behind the square's 90° symmetry fold (David's motion observation; temporal unwrapping confirmed, 720° ruled out).
- **r1c5 translucency model** → five solid pieces (David). The area arithmetic I cited was degenerate — both compositions paint identical pixels at the poses; the mid-frames I'd noted-but-shipped were the disqualifier.
- **r1c6 quarters** → four coincident full-size copies (settled by the sharp rest tip + diagonal first-lobes). "The diamond splits" was literal.
- **r1c1 stacking** → red under blue (David) — which also *explained* red's late emergence as pure occlusion, deleting a stagger window.
- **r2c6 "curved organic reach"** → straight edges to a farther vertex (David's annotated vertex-1 model); my curvature read was a sampling artifact.
- **r3c4** → the one that ran the other way: the description was written B→A; measurement caught the pose-orientation inversion against the suite invariant.

## 5. Skills & techniques used

**Measurement:** soft/area-weighted sizing (hard thresholds eat ~1.5px of AA per edge); row-profile and run-count analysis; mid-frame discrimination; temporal rotation unwrapping with fold-Nyquist awareness; area invariance (rotation preserves it, scale doesn't); occlusion accounting arithmetic; ASCII mask rendering for direct observation; template matching and principal-axis orientation; design-scale inference (everything ÷0.8 landed on round values); reconstruction validation gated on interior error + beats-the-null, with angle-space validation for spins.

**Rive vocabulary built:** converter window ramps of one progress; through-zero flips (scale 1→−1); coincident-copy formations (linear in r1c6, angular in r3c4's fan-fold); occlusion-as-sequencing (zero opacity bindings for emergence); translate-and-clip; corner-radius morphs both directions; palette-safe crossfades; stagger-and-stacking recolors; the seam-cover twin; the context-pattern VM write; VM fan-out through nested bindings.

**Process:** description-first with challenge rights in both directions; composition sign-off gates; provenance tagging ([measured]/[inferred]/[coarse]/[ambiguous]/[confirmed]); paste-ready binding tables with glossaries; cheapest-falsification-first pilots.

## 6. Surprises

- **The thesis never cracked.** One eased number, windowed ramps — the contract survived spins with decoupled windows, five-way staggers, vertex-level morphs, and a mid-transition frame-filling wipe. The nearest miss (r2c6) was rescued by David's model, not by abandoning the architecture.
- **The correct model kept being the simpler one, and it kept scoring better.** Rect beat bars, coincident copies beat quarters, five solid pieces beat translucency. "Simpler and fits better" was the signature of truth all project.
- **Degenerate evidence is everywhere.** Poses almost never discriminate compositions; the truth lives in mid-frames, first-frames-of-separation, and area invariants. Half the toolkit exists because pose-level agreement means little.
- **Occlusion as a design instrument.** The source designer sequences with stacking, not opacity — "appears late" meant "was underneath" every single time it was tested.
- **The design system rhymes.** R=45 recurring across unrelated cells, the ×0.8 render scale unmasking round authored values, 5×36°=180° tiling exactly — the grid kept confirming itself.
- **The human eye beat the estimators on motion, repeatedly.** Spin counts, solid-vs-translucent, vertex models — perception does temporal unwrapping and occlusion inference for free. The protocol inversion wasn't process hygiene; it was the correct division of labor.
- **The units zoo.** Four property types, four unit conventions, none matching the UI display — and each discovered by a distinct spectacular failure (10000%, 15,469°, a switch, a flying diamond).
- **How small the final system is.** Sixteen components, one twenty-line clock, one number per frame, and a 6×6 field that recolors, retimes, and re-eases from three VM values.

## 7. By the numbers

121 source frames · k = 1.70 (rmse 0.05) · 16 originals + 20 colorway instances · 3 driver versions (global → VM input → context) · ~130 data bindings specced across three rows · reconstruction validations at the AA floor (r1c4: 5.78/255; r1c2: 6.38 after correction) · 3 seam strategies · 4 memory-logged standing rules · 7 pipeline gates · 0 timelines (pending r2c6's fallback, if the vertex check went that way).

---

Handoff state: `TOKEN_LAB_WORKFLOW.md` carries the operating knowledge; per-row specs are build-current with all in-editor corrections folded back; the React contract is `TOKEN_LAB_INGREDIENTS.md` §6; snappy/cinematic remain [proposed] pending a tuning pass against the live grid — the one number-turning session left in the project, and a pleasant one. **Resolved 2026-07-16: David reviewed the shipped values against the live grid in the Tier 3 sign-off sweep and blessed them as final. No tuning session; [proposed] is retired. This note supersedes the same [proposed] marker in WORKFLOW, INGREDIENTS §3, and PHASE2 §6.**

React connection proven end to end 2026-07-08: the Cadence panel drives `IngredientVM` (`speed`, `easing`, preset instance) against the live `Parametric` grid on localhost, still gated behind a `?ingredients` test route. This closes the phase-1 preset-switch question; details in `TOKEN_LAB_INGREDIENTS.md` §6.
