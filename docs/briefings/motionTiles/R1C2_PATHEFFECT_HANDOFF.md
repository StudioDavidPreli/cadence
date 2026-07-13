# r1c2 PathEffect — Session Handoff

**Date:** 2026-07-11
**Status:** colors, binds, and instances DONE and verified on r1c2. Pixelate effect
NOT yet applied (it is the one hand step, see below). Written to hand off to a
fresh session because this one got tangled on the single-window constraint.

---

## What got done on r1c2 this session

r1c2 is the `diagonal-flip` tile (BLUE). Two colored shapes plus the artboard
background. Working from the corrected instance table
(`public/riveTiles/VM instance group2 - Sheet1.tsv`), all via MCP:

- **Added to `PathEffectVM` (id `1-14`):** the 6-color palette and the four
  reconciliation numbers, on top of the existing `progress`/`rot`/`gapAcc`/`gapInk`.
- **Bound the layers** to the correct palette entries.
- **Created the three named instances** with the full table baked in.
- **Bound `standard` to the artboard** so the editor renders the real palette.

### VM property ids (r1c2 file)

| property | id | | property | id |
|---|---|---|---|---|
| background | `1-1750` | | cellSize | `1-1768` |
| blue | `1-1753` | | gapSize | `1-1771` |
| green | `1-1756` | | speed | `1-1774` |
| red | `1-1759` | | easing | `1-1777` |
| yellow | `1-1762` | | progress | `1-34` (pre-existing) |
| black | `1-1765` | | rot / gapAcc / gapInk | `1-36` / `1-38` / `1-40` |

### Layer color binds (done)

| layer | SolidColor id | → VM color |
|---|---|---|
| `flip_ink` | `1-25` (Fill `1-32`, Shape `1-20`) | `black` (`1-1765`) |
| `flip_acc` | `1-31` (Fill `1-33`, Shape `1-26`) | `blue` (`1-1753`) |
| artboard background | `1-4` (Fill `1-3`) | `background` (`1-1750`) |

Bound with `viewmodel_editor.databind`, SolidColor color key = **37**. Note:
`query_property_values` still shows each SolidColor's authored literal (e.g. bg
`#282828`); the bind overrides it at render, so the instance value drives the color.

### Instances (done)

`standard` (`1-1780`), `snappy` (`1-1795`), `cinematic` (`1-1810`). Two pre-existing
default `Instance` entries (`1-1678`, `1-15`) remain and are harmless (React binds by
name); the MCP has no delete-instance command, so clear them in-editor if wanted.

### The color / preset table (source of truth)

`public/riveTiles/VM instance group2 - Sheet1.tsv`. Colors are RRGGBB, stored `#ffRRGGBB`.

| | standard | snappy | cinematic |
|---|---|---|---|
| background | ededed | d7e1f2 | 161616 |
| blue | 3c5a9c | 2f559a | 767676 |
| green | 4ca06a | 54b948 | 565656 |
| red | e0563a | ed1c24 | 666666 |
| yellow | ddaa3c | f5db12 | 868686 |
| black | 232323 | 231f20 | 363636 |
| speed | 1 | 1.25 | 0.8 |
| easing | 1.7 | 3.6 | 1.15 |
| cellSize | 4 | 2 | 8 |
| gapSize | 0.05 | 0.25 | 1 |

Verified: r1c2's three instances decode to exactly these values.

---

## The workflow, stated correctly (this is where the session went wrong)

The MCP drives **one open Rive file at a time**. It cannot see or copy objects
across tabs. Confirmed this session: with r1c1 active, `get_artboard_hierarchy` on
r1c2's artboard (`1-2`) returned "not found." The `0-`/`1-` id prefixes are per-file
id blocks, not a file index, so a file can hold both (r1c1 has `1-*` Pixelate effects
on `0-*` fills) — but two files never share a session.

Why the group-one pixelate rollout worked and this is different:

- **Group one was ONE file** (`ingredients_v6`, all 36 tiles). Hand-attach one
  Pixelate template, MCP clones it to the other shapes **within that file**.
- **Group two is ONE FILE PER TILE.** r1c1 and r1c2 are separate `.riv` files. There
  is no in-file template in r1c2 to clone, and no cross-file copy exists.

"Read the example, apply to the next board" means read the **recipe** and reproduce
it in the target file while that target is the sole open file. It is not a live
cross-file copy. The recipe is below, captured from the live r1c1 example this session.

---

## The Pixelate recipe (verified against live r1c1)

A `Pixelate` is a `ScriptedPathEffect`, a child of a shape's **Fill**, alongside its
`SolidColor`. The MCP **cannot create a ScriptedPathEffect from scratch** (clone-only,
same class as the node-driver `ScriptedDrawable` David places by hand on every tile).

Structure of each r1c1 effect (e.g. effect `1-8174` on Fill `0-43`):
- three `ScriptInputNumber` children, contiguous at effect+1/+2/+3:
  `cellSize` (`1-8175`), `gap` (`1-8176`), `bakeInverse` (`1-8177`).
- each `ScriptInputNumber`'s bindable **value key = 243**.
- `cellSize` input databound to the VM `cellSize`, `gap` input to the VM `gapSize`.
  (`bakeInverse` left at its default 1.)

The `Pixelate` pathEffect **script** already exists in r1c2's file (`get_scripts`
lists it), so it is available in the effects panel with nothing to recreate.

---

## Remaining step for r1c2 (do in the fresh session, r1c2 as the SOLE open file)

1. **Hand step (David):** attach a `Pixelate` effect to `flip_ink`'s Fill (`1-32`)
   and `flip_acc`'s Fill (`1-33`). Two shapes, so attaching both by hand from the
   effects panel is fastest; or attach one and have the MCP clone it to the other via
   `duplicate_objects` + `reparent_objects` (in-file clone works).
   Do NOT pixelate the artboard background (group-one rule: backgrounds are skipped).
2. **MCP:** for each attached effect, `viewmodel_editor.databind` its `cellSize`
   input (key 243) → `PathEffectVM.cellSize` (`1-1768`) and its `gap` input (key 243)
   → `PathEffectVM.gapSize` (`1-1771`). Binds do not survive duplication, so create
   them after any clone.
3. **Verify:** `script_diagnostics` clean; David scrubs `progress` and confirms the
   two triangles pixelate and hold their colors.

Re-probe r1c2 first (`list_artboards`, `viewmodel_editor.listViewModels`) to confirm
the ids above are current before binding — they are stable unless the file is
re-imported, but verify.

---

## For the next session, in order

1. Confirm the last group-two pixelate application's exact steps (David is locating
   that session doc) and reconcile with the recipe above.
2. Open r1c2 alone. Attach Pixelate to the two flip fills. MCP binds cell/gap.
3. Export r1c2 to `public/riveTiles/group2/` and point the `?group2` lab at it (the
   lab already drives `r1c1.riv`; it is the model for r1c2).
