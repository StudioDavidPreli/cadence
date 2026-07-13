# Token Lab Ingredients — Source Recon, Scrub Architecture & Token Contract

Reference document for the Token Lab landing-page ingredient system: what was measured out of the source loop (`ingredientsLoop.mp4`), the values that fell out, the runtime architecture (option 1: script-scrubbed linear timelines), the r1c4 pilot spec, and wiring instructions for Claude Code.

Provenance key: **[measured]** = extracted from the source video this session. **[proposed]** = starting values awaiting design sign-off. **[unverified]** = known pattern not yet confirmed in this build.

---

## 1. Source loop recon [measured]

- Source: `ingredientsLoop.mp4`, 720×720, 60fps, 121 frames (2.017s). Frame 121 ≈ frame 1 within codec noise — the loop closes.
- Content: a 6×6 grid of 36 geometric ingredients on light gray `rgb(239,239,239)`. Canonical numbering `r1c1`…`r6c6` (row-major, top-left origin) — see `poses_A.png` / `poses_B.png`.
- Cell crops: 104×104 px centered on each cell (band centers ≈ 96px pitch). Exact pose stills for all 36 in `ingredient_poses.zip` (`rXcY_A.png` / `rXcY_B.png`, native resolution, no scaling).

**Cycle structure.** Every ingredient has exactly two rest poses and a shared, synchronized 4-beat cycle:

| Beat | Frames | Duration | State |
|---|---|---|---|
| hold A | 1–26 | 0.43s | pose A static |
| A → B | 26–57 | 0.52s | eased transition |
| hold B | 57–86 | 0.48s | pose B static |
| B → A | 86–120 | 0.57s | eased transition |

All 36 cells fire on the same beat — no stagger. The measured beat is within authoring noise of four clean 0.5s quarters; **the build uses equal quarters** unless the slight asymmetry was intentional.

## 2. Easing [measured]

Method: per-frame absolute pixel change integrated over each transition window ≈ arc-length progress vs time; averaged across all 36 cells; both bursts measured independently (they agree).

- Fitted family: `ease(t, k) = t^k / (t^k + (1−t)^k)` — one parameter, `k=1` exactly linear, higher = snappier. Luau-trivial.
- Fit: **k = 1.70**, rmse ≈ 0.05 against both bursts.
- Cross-check: a symmetric cubic-Bézier fit lands at control point **0.41** — i.e., the source easing is effectively CSS `ease-in-out` (0.42, 0, 0.58, 1). Same rmse; the power-logistic form wins on runtime cost.

## 3. Preset token values

The easing token is `k`; the speed token scales the cycle rate (`period = 2.0 / speed`). Colors are **not** runtime tokens — palettes live inside each artboard and switch with the preset's VM instance name.

| Preset | easing k | speed | VM instance name | Provenance |
|---|---|---|---|---|
| standard | **1.70** | **1.0** | `standard` | k [measured]; speed [measured] (source period 2.0s) |
| snappy | **3.6** | **1.25** | `snappy` | [proposed] |
| cinematic | **1.15** | **0.8** | `cinematic` | [proposed] |

See `easing_fit.png` (curves) and `r1c4_recon.gif` / `easing_demo.gif` (timing feel). Snappy/cinematic values are design starting points — tune against the demos.

## 4. Runtime architecture (option 1, signed off)

Easing is computed at runtime, so both tokens stay continuous — the animation *is* the product demo.

**Per ingredient artboard** (36 total, named `ing_r1c1` … `ing_r6c6`):
- Artwork for pose A.
- View model `IngredientVM` with a number `progress` (0..1). The artboard is linked to this VM (Data Bind → Model) — mandatory both for bindings to work and for the artboard to appear in the script's typed `ingredient` slot (which also requires the artboard be flagged as a Component, Shift+N).
- **Simple ingredients (default): no timeline.** Bind the moving properties directly to `progress` with converters, authored *inside* the component (bindings are scoped per artboard — a component's internals are unreachable from the composition). r1c4: piece L Position X = `poseA_x + progress×R`; piece R mirrored; dot Opacity = `progress×100`. Since the driver writes eased progress, direct linear bindings are exactly equivalent to scrubbing a linear timeline.
- **Complex ingredients (fallback): linear timeline + 1D blend.** Where many properties move, author a linear 0→1 `morph` timeline and drive it from a state machine 1D blend on the number (the Rive loading-bar pattern: a 0–100 progress number driving continuous animation). Keys stay linear — authored curves would multiply with the runtime easing. The 0..1 → 0–100 conversion lives in a converter on the Rive side, per the suite decision.
- Palette colors internal to the artboard, one VM instance per preset (`standard` / `snappy` / `cinematic`).

**The director** computes one global value per frame and writes it to every instance:

```
period = 2.0 / speed
ph     = (time % period) / period
beats:  ph < .25 → 0 | < .5 → ease((ph−.25)·4, k) | < .75 → 1 | else 1 − ease((ph−.75)·4, k)
```

One number write per instance per frame — no Color inputs anywhere in the hot path. Pilot driver: `ingredient_pilot.lua`.

**Note:** this suite is smooth vector artwork, not pixel-grid sprites — the Cadence grid-snap and flip-don't-rotate rules do **not** apply here.

## 5. r1c4 pilot spec [measured, validated]

Geometry (in 104px cell coordinates, center at 52,52; scale to taste in the editor):
- Two half-discs, radius **36**, body color **rgb(0, 57, 120)**. Pose A: flat edges outward at x = 16 / 88, curved edges touching at center (the bowtie).
- Center dot, radius **8**, color **rgb(24, 81, 195)**.

Transition mechanics — validated by rebuilding all 120 frames in simulation:
- **The two half-discs translate horizontally by exactly R (36 px in cell scale), passing through each other and swapping sides.** Piece L's shape (flat-left, curve-right) *is* the circle's right half; no morph, no rotation, no scale. Same-color overlap mid-transition renders cleanly regardless of draw order.
- **The dot's opacity = progress** (0 at pose A, 1 at pose B).
- Validation: reconstruction vs source, mean |diff| **5.78**/255 with measured per-frame progress and **6.42** with the full parametric model (schedule + k=1.70) — both at the anti-aliasing noise floor of the static holds. An earlier per-piece vertex-morph hypothesis was rejected at ~11.0 mean / 42 max. See `r1c4_recon.gif`.

Editor build for `ing_r1c4`:
1. Artboard `ing_r1c4`, transparent or `rgb(239,239,239)` ground per composition needs.
2. Two half-disc shapes + dot at pose A; dot opacity 0 (fail-off: a broken binding shows pose A, obviously wrong mid-cycle, never ambiguous).
3. Linear timeline `morph`: key 0 = pose A positions, dot opacity 0; key 1 = each half-disc translated ±R, dot opacity 100. Linear interpolation on all keys.
4. VM `IngredientVM`, number `progress`, bound to scrub `morph`. Create the VM **before** pasting the script — the Luau checker reads the live schema, and a missing property is a type error, not a code bug.
5. Three VM instances: `standard`, `snappy`, `cinematic`, each carrying that preset's palette.
6. Composition artboard: add `ingredient_pilot.lua` as a Node script, drag `ing_r1c4` onto its `ingredient` slot.

Pilot verification checklist, in order:
- [x] Loads with no `:0 attempt to call a nil value` (verified after the `ArtboardInstance` → `Artboard<T>` type fix; `Data.*` types require the VM to exist in the file first)
- [x] Instance renders (zero-animation rig: rectangle + `progress` → Scale binding)
- [x] **`inst.data.progress.value = n` writes through to a VM-bound property per frame — VERIFIED.** The write also overrides any manually-set VM value every frame, by design.
- [x] Speed and easing tokens respond live
- [x] `progress` driving the actual r1c4 transition — **VERIFIED via direct converter bindings, zero keyframes** (pieces: `x₀ ± progress×R`; dot: `progress × 100`). No timeline or state machine needed for simple ingredients; motion matches the reference. Suite invariant confirmed along the way: **progress 0 = the source's pose A** on every artboard (uniform orientation, or the shared global progress desynchronizes the field during holds).
- [x] **Full pipeline confirmed on r1c2** (the highest-difficulty cell): description-first analysis → measured spec → design-scale SVG with named pieces → Rive import (names survive) → converter bindings → shared driver. r1c2 running against the driver alongside r1c4.
- [x] **Two script nodes on one composition artboard, driving two different ingredient artboards through the same `IngredientVM` — confirmed working.** One VM definition type-matches multiple component artboards; sync is structural (both clocks zero at init, same advance deltas).
- [x] **Two instances in one script's pool — PASSED.** Artboard instances stored in a table field load and run in this runtime version (re-confirming the parallax-era finding). Both copies ran in sync off one progress write. Pilot verification is complete; every runtime assumption under the director design is now tested. (This also resolves the §5 storage unknown for the Cadence component-critter brief — same runtime, same question.)

Unit lessons (verified in-editor, superseding the earlier percent note): **data-binding units are per-property.** Scale bindings take a *factor* (1.0 = 100%); Rotation bindings take *radians* (a degrees formula produced 15,469° = 270 rad); Opacity takes 0–100. Editor UI display units do not predict binding input units — probe every new property type with a test value before writing converter formulas. The VM contract stays `progress` 0..1; all unit conversion lives in the artboard-side converters.

## 6. Instructions for Claude Code — preset token wiring (React)

Context: `@rive-app/react-webgl2` (data binding requires it; not react-canvas — and keep it current: a stale runtime pins old Luau bytecode and scripts fail silently while non-script content renders). Composition exposes a View Model with numbers `speed` and `easing`; ingredient palettes switch by VM instance name.

1. **Preset table — single source of truth.** Define once, import everywhere:

```ts
export const INGREDIENT_PRESETS = {
  standard:  { speed: 1.0,  easing: 1.70, vmInstance: 'standard'  },
  snappy:    { speed: 1.25, easing: 3.6,  vmInstance: 'snappy'    },
  cinematic: { speed: 0.8,  easing: 1.15, vmInstance: 'cinematic' },
} as const;
```

`easing` is the k parameter of `t^k / (t^k + (1−t)^k)`. `standard` values are measured from the source video — do not adjust them; tune only snappy/cinematic.

2. **Mapping rules.** `speed` passes straight through — the Lua computes `period = 2.0 / speed`, so React must NOT invert it (this is the opposite of the Cadence `frameInterval` convention, where React had to invert; do not copy that pattern here). `easing` passes straight through as k. Clamp user-adjustable speed to roughly [0.25, 4] before writing.

3. **Hook pattern.** `useRive({ autoBind: false })` → `useViewModel(rive, { name })` → `useViewModelInstance(vm, { name: preset.vmInstance, rive })` → `useViewModelInstanceNumber('speed', vmi)` / `useViewModelInstanceNumber('easing', vmi)`. Preset change = switch the VM instance by name (recolors everything, since palettes ride on the instance), then write that preset's `speed` and `easing` via the imperative `setValue`.

4. **Live token edits** (user dragging a speed/easing control): subscribe to the MotionValue (`useMotionValueEvent`) and call `setValue` imperatively — never route per-frame updates through React state.

5. **Do not** wire palette colors from React. Colors are authored in Rive per preset instance by design; the only color-adjacent write from React is the instance-name switch.

### Verified in React (2026-07-08)

The contract above is built and proven on localhost: the Cadence panel drives the live grid, presets recolor and retime it, sliders bend speed and easing. Facts confirmed against the running app:

- **One view model, not two.** There is a single `IngredientVM`. It carries `progress`, `speed`, `easing`, and the eight palette colors (`bg`, `darkBlue`, `green`, `lightBlue`, `magenta`, `orange`, `red`, `yellow`). Earlier notes here and in `TOKEN_LAB_WORKFLOW.md` §7 called the React-facing surface a "composition VM" as if it were separate. It is the same `IngredientVM`, bound at the composition artboard and fanned out to the 36 nested cells. Binding one instance at the parent drives every cell.
- **Master artboard `Parametric`, state machine `parametricSM`.** React loads that artboard and plays that state machine so the artboard advances, which ticks `compDriver`. The old `main` composition is gone; `Parametric` is the master. The exported runtime file is `public/riveTiles/ingredients_v2.riv`.
- **Runtime must be `@rive-app/react-webgl2`.** `compDriver` is a Luau script; script execution needs webgl2. `react-canvas` renders the static grid and silently never ticks the driver. (This is why `PrincipleAnimation`, whose `.riv` files are state-machine-only, can use `react-canvas` while this cannot.)
- **Play after the instance binds, not on autoplay.** `autoplay: true` starts `parametricSM` before the VM instance is bound; the driver reads no `speed`, the machine settles, and the grid loads frozen until a preset toggle rebinds it. Fix: `autoplay: false`, then `rive.play('parametricSM')` in an effect gated on the bound instance, so it fires on load and on every preset switch.
- **Preset switch is a complete switch, confirmed.** Each instance bakes its own palette and its own speed/easing (live speed/easing: standard 1.0/1.70, snappy 1.25/3.6, cinematic 0.8/1.15). Switching the bound instance recolors and retimes in one move. This closes the "preset mechanism TBD" line in `TOKEN_LAB_WORKFLOW.md` §7 and the Phase 2 §6 open item.
- **Build location.** `src/components/IngredientGrid/`: `index.jsx` (binding), `IngredientLab.jsx` (test harness), `presets.js` (values). Mounted behind a temporary `?ingredients` query gate in `src/App.jsx`, not yet folded into the Token Lab panel.

---

## 7. Artifact inventory

| File | What |
|---|---|
| `poses_A.png`, `poses_B.png` | Labeled 6×6 pose sheets (canonical numbering) |
| `motion_strips_1/2.png` | A → mid → B → mid strips, all 36 |
| `ingredient_poses.zip` | 72 exact pose stills, native res |
| `easing_fit.png` | Measured easing vs fitted family + preset curves |
| `easing_demo.gif`, `r1c4_recon.gif` | Timing-feel demos; recon GIF is the validated r1c4 model |
| `ingredient_pilot.lua` | Pilot scrub driver (this doc §5 is its setup guide) |
| `docs/references/ingredient_map.svg` | Authoritative tile naming and lineage: the 16 originals (`r1c1`–`r3c4`) and each colorway's source, labeled `<original>_var<N>` |

Open items: r1c4 pilot checklist above; per-ingredient transition analysis for the remaining 35 (r1c4's translation-swap suggests a small vocabulary of rigid moves — verify per cell before authoring, the same profile-measurement method applies); snappy/cinematic value sign-off.
