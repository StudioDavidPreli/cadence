# Pixel PathEffect Rollout — Closeout

**Date:** 2026-07-08
**Closes:** the per-shape `Pixelate` PathEffect rollout across the full
36-tile ingredient grid, automated through the Rive MCP.
**Result:** every tile pixelated. ~257 shapes across all 36 artboards carry
the effect, each with `cellSize`/`gap` bound to the shared `IngredientVM`.
File: `Ingredients_v6` (Rive editor, not yet exported to `public/riveTiles/`).

---

## What this session did

David attached the `Pixelate` `ScriptedPathEffect` to one tile by hand
(`r1c3`, the cube, all three shapes) as a template. The MCP cloned that effect
across every other shape in the grid, tile by tile, and rebound each clone's
`cellSize` and `gap` inputs to the VM. Rolled out in five passes, David
checking the render and frame rate between each:

| Pass | Tiles | Shapes |
|---|---|---|
| Proof | `r1c1` | 18 |
| Row 1 finish | `r1c2` `r1c4` `r1c5` `r1c6` | 36 |
| Row 2 | all six | 31 |
| Rows 3–4 | all twelve | 86 |
| Rows 5–6 | all twelve | 83 |

Plus the three hand-built `r1c3` template shapes. Total ~257 live effects.

Every pass verified visually by David before the next. Reported "looks and
runs great" through rows 1–4; rows 5–6 landed clean.

---

## The method (why it works, and its one cost)

The effect is a `ScriptedPathEffect`, a child of a shape's **Fill** (or
**Stroke**), sitting alongside the `SolidColor`. It runs inside each shape's own
render, so it keeps that shape's color, opacity, and animation for free. This is
the fidelity win over the abandoned `pixelMirror2` route, which only saw merged
geometry and could not reproduce opacity exits or overlapping same-color shapes.

The cost is runtime: each shape rasterizes on the CPU (Luau) every frame. ~257
of them now do so at once. Whether that holds 60fps at full grid animation is
the open question this rollout was structured to answer incrementally. It read
smooth through row 4 (174 shapes) per David; the full 257 is the real test.

### The clone recipe (MCP)

No script recompile at any point, so no crash risk (the crash lesson that drove
this whole approach: recompiling while a scripted drawable is live-rendering).

1. Grow a clone pool from the one source effect by repeated `duplicate_objects`,
   doubling each round with **distinct** ids. Same-id-repeated collapses to one
   copy and misreports the count, so ids must be distinct.
2. `reparent_objects` each clone onto a target shape's paint object (Fill, or
   Stroke for stroked shapes). Cross-artboard reparent works.
3. `viewmodel_editor.databind` each clone's `cellSize` input to VM `cellSize`
   and `gap` input to VM `gapSize` (propertyKey 243 for a `ScriptInputNumber`
   value). Binds are stored off-tree and do not survive duplication, so they are
   created after cloning.

A duplicated effect's child inputs land at `clone id + 1` (cellSize),
`+2` (gap), `+3` (bakeInverse), contiguous. This held for every one of the ~257
clones without exception, which let the later batches skip a verification read.

---

## Shape-type rules applied throughout

Three cases recurred across the reused tile designs and were handled the same
way every time:

- **Stroked shapes** (`r1c4`, `r4c2`, `r6c6` "Custom Shape") have a Stroke, no
  Fill. The effect attaches to the Stroke. The `Pixelate` effect emits filled
  cells, so on a stroke it traces the cell outlines rather than filling them
  solid. Flagged to David for visual review each time; worth a final look now
  that they sit in context.
- **Cube tiles** (`r1c3`, `r4c1`, `r6c5`) pixelate all three shapes including the
  `clip` shape that doubles as `cube_body`'s clip mask. This matches the
  hand-built `r1c3` template, confirmed against the original before applying.
- **Backgrounds and clip-mask shapes** (`rect_bg`, artboard fills, `bg_square`
  and `bg_square clip` in the `r3c2`/`r5c6` design) are always skipped.
  Pixelating a solid full-tile rect is invisible and only adds per-frame cost.

---

## Where this sits against the WebGL post-process

The WebGL post-process (G1 passed earlier the same day, see
`G1_PROBE_CLOSEOUT.md`) remains the proven browser-side alternative with zero
per-shape cost. This session did not retire it. It completed the in-Rive route
via a better method than the `pixelMirror2` rasterization the earlier notes
assumed, so the two approaches are now both viable and the choice is a
frame-rate decision:

- **In-Rive PathEffect holds 60fps at full load** → asset-intrinsic pixelation,
  no browser shader plumbing, the effect ships inside the `.riv`.
- **It drags** → fall back to the WebGL post-process, already built and tuned at
  the `?pixelrive` gate.

That measurement is the next concrete step, and it is David's to make (visual
and performance checks are his).

---

## State at close

- **Rive file:** `Ingredients_v6`, all 36 tiles pixelated. Not yet exported to
  `public/riveTiles/`, so the running app is unchanged.
- **Runtime app:** untouched this session. No React, CSS, or token changes.
- **Memory:** `rive-mcp-pixelation.md` updated with the completed full-grid
  rollout and the shape-type rules.

---

## Open items

1. **Frame rate at full grid animation.** The one measurement that picks
   in-Rive vs WebGL. David's call.
2. **Stroked-shape read.** Confirm the three "Custom Shape" tiles pixelate the
   way David wants, or handle those shapes differently.
3. **Export and integration.** If the in-Rive route wins, export `Ingredients_v6`
   to `public/riveTiles/` and point `IngredientGrid` at it. The React VM binding
   (fork 1) already drives it.
