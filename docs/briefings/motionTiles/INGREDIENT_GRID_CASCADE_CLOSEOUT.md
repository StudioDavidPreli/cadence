# Ingredient Grid Cascade — Closeout

**Date:** 2026-07-09
**Closes:** the per-tile animation offset ("cascade") feature and the architecture
question it forced open.
**Result:** the ingredient grid ships as 36 individual no-driver `.riv` files
driven by one React rAF clock. The cascade offset is a JS calculation, not an
in-Rive edit. Real 36-tile grid holds 55-60fps with presets and seven offset
patterns. Standalone at `?tilegrid`; not yet folded into the Token Lab panel.

---

## What was built

- **`src/components/IngredientGrid/TileGrid.jsx`** — the real grid. Loads all 36
  tiles from `public/riveTiles/36tiles/`, advances every one from a single rAF
  loop, computes each tile's phase-offset `progress` from a weight table and
  `spread`, and writes it into that tile's `PathEffectVM`. Presets, the offset
  table menu, live sliders, an fps readout, and a per-tile bind diagnostic.
- **`src/components/IngredientGrid/TilePerfSpike.jsx`** — the throwaway spike that
  answered the perf question before the real grid existed.
- **`IngredientGrid.module.css`** — `perf*` classes for both.
- **`src/App.jsx`** — `?tilegrid` and `?tileperf` gates, alongside the existing
  `?ingredients` / `?patheffect` / `?pixel*` test mounts.

---

## The decision path, including two reversals

This is the part worth keeping, because the conclusion inverted twice and the
reasoning is not obvious from the final code.

1. **Start.** Single file, 36 nested tiles, one Luau `compDriver` writing a shared
   `progress`. Every tile phase-locked. Adding a cascade means giving each tile a
   different phase.

2. **The converter wall.** Motion enters each shape through a converter whose
   formula embeds the VM reference literally (`1.0 - {{PathEffectVM/progress}}*0.394`).
   A spatial wave needs per-position references; the converters are shared across
   colorway instances. Position-based offset and design-based sharing pull apart,
   forcing ~257 converters to be un-shared and rewritten. The Rive MCP exposes no
   command to create or edit a formula converter, so that rewrite could not be
   automated. Full introspection in `docs/references/RIVE_CONVERTER_AUTOMATION.md`.

3. **The pivot.** 36 separate files with the clock in React (the Phase 2 handoff's
   "promote the clock to React, boards carry no Lua driver" endstate). The offset
   becomes `progressᵢ = cycleProgress((ph − spread·wᵢ) % 1, easing)` in JS, applied
   to the value before it is written, so no converter is ever touched.

4. **Reversal one — the perf spike.** Prediction on record: 36 instances would be
   too heavy and the instance count was the cost. Wrong. 36 instances of a tile
   that still carried its internal Luau driver ran ~40fps; the same tile exported
   with the driver stripped ran a **stable 60**. The per-instance Luau driver was
   the tax. The instance count of 36 was never the problem.

5. **Reversal two — the "light" tile.** r1c1, used as the stress tile, was assumed
   light. It is the **densest** tile in the grid: 18 shapes (a 3×3 grid of blue
   triangles and a 3×3 of red), each carrying a `Pixelate` effect. The others
   average 5-9. So 36 copies of r1c1 (648 pixelated shapes) was already 2.5× the
   real grid's ~257-shape load, and it held 60. The heavy test was already passed.

6. **The real grid.** All 36 distinct tiles at their true frequencies: 55-60fps,
   Ripple and Diagonal both correct.

7. **An unplanned property.** At `spread` 0 the whole grid transitions on the same
   frame, so all 36 rasterize at once and the frame dips (56). Raise `spread` and
   the stagger spreads that work across frames, so it rides at 60. The cascade the
   look wants also smooths the load rather than costing it.

---

## Final architecture

- **36 files, one clock.** Each tile is a self-contained no-driver `.riv`
  (artboard `r{n}c{m}`, state machine `r{n}c{m}SM`, view model `PathEffectVM`). A
  single `requestAnimationFrame` loop owns the clock the Luau driver used to own.
- **Offset in JS.** `cycleProgress` (the hold/ease/hold/ease-back envelope) is
  ported to JS. Per-tile phase offset is `spread · weight[i]`, applied in the phase
  domain before easing, never on the eased output (the §3 rule from the Phase 2
  handoff). `easeK` is one shared function feeding both the clock envelope and the
  generated spatial tables.
- **Seven offset tables.** `Sync` (all zeros), `Ripple` (radial bloom-out),
  `Center-in` (radial gather), `Diagonal`, `Rows`, `Columns` (all eased at k=1.70),
  and `Scatter` (fixed per-tile hash, incoherent). Each is a 36-number array; the
  pattern is data, not code.
- **Presets.** Each preset binds its named `PathEffectVM` instance per tile, which
  carries that preset's baked palette (the instance-swap recolor, now per tile),
  and sets the JS clock's speed / easing / spread plus each tile's cell / gap.
  `spread` is ours to set now that the clock is in JS; ordered snappy 0.20 <
  standard 0.40 < cinematic 0.70, so the loosest preset cascades the most.
- **Context sharing.** `useOffscreenRenderer: true` shares one offscreen GL context
  across all 36 instances, past the browser's per-page WebGL context cap.

---

## Lessons worth carrying

- **Per-instance Luau drivers do not scale; instance count does.** 36 WebGL Rive
  instances on a shared offscreen context are fine. 36 per-instance script VMs
  advancing every frame are not. Strip scripts from fan-out artboards and drive
  from one JS clock.
- **Move the offset upstream of the thing you cannot edit.** The converter formulas
  were unautomatable, so the offset moved to the value written into them. The
  problem class changed from "edit 257 converters" to "add a term in JS".
- **A staggered cascade is cheaper than a synchronized one.** Desynchronizing the
  per-tile transitions spreads rasterization spikes across frames.
- **The clock in React is the on-thesis version.** token → JS → animation is fully
  legible; nothing hides in a script.
- **The export can silently drop a per-tile VM binding.** r4c1 came back blank
  because its `PathEffectVM` link did not survive the first export. The grid's
  unbound-tile diagnostic caught it; a re-export fixed it. Keep that diagnostic
  until the grid is folded into the panel.

---

## Remaining work (integration, not capability)

- Fold the grid out of the `?tilegrid` lab into the real Token Lab panel with
  proper presentation; retire the `?tile*` and `?pixel*` gates.
- Preload or bundle the 36 files so they do not waterfall on load.
- Layout polish: tile spacing and arrangement to match the intended composition.
- The converter-automation questions this work parked are answered where they can
  be and left open where they cannot in
  `docs/references/RIVE_CONVERTER_AUTOMATION.md`. They matter only to a future
  single-file in-Rive offset effort, not to this shipped direction.
