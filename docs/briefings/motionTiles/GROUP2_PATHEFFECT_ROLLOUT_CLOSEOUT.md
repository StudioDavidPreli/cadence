# Group2 PathEffect Rollout — Progress Closeout

**Date:** 2026-07-11
**Covers:** the per-shape `Pixelate` `ScriptedPathEffect` rollout across the
group2 grid, one `.riv` file per tile, driven through the Rive MCP.
**Status:** 16 of 36 tiles done (`r1c1` seed + `r1c2`…`r3c4`). 20 remain
(`r3c5`, `r3c6`, and all of rows 4–6). This session applied `r3c3` and `r3c4`.

This closes the session, not the rollout. The resume point and the exact
recipe are below so the next session picks up at `r3c5` with no re-derivation.

---

## Why group2 differs from the group1 rollout

Group1 (`Ingredients_v6`, closeout `PIXEL_PATHEFFECT_ROLLOUT_CLOSEOUT.md`) was
one file holding all 36 artboards, so a single hand-built template cloned
in-file to every shape. Group2 is **one `.riv` per tile**
(`public/riveTiles/36tiles/r{n}c{m}.riv`), the architecture the cascade pivot
forced (tracker fork 2). The MCP sees one open file at a time and cannot copy
objects across files, so each tile is provisioned on its own.

David seeds each file by editor-pasting a carrier shape that already carries
the `Pixelate` effect and its script (the `r1c1_pinwheel` node, with `tri0`–`tri3`
each holding one effect). The MCP clones off that carrier within the file, then
the carrier is deleted. The MCP cannot create a `ScriptedPathEffect` from
nothing; the pasted carrier is the seed.

---

## The per-tile recipe (verified, this is the one to reproduce)

Each tile's view model is named `PathEffectVM`. It already holds that tile's own
geometry properties (the node-driver animation inputs, different per tile). The
rollout adds the pixelation layer on top and wires the effect. Order matters at
one step; see the stale-path note.

1. **Recon.** `list_artboards` to confirm the open file. `get_artboard_hierarchy`
   to map the real shapes, their `Fill`/`SolidColor` ids, the background (skip),
   the node-driver `ScriptedDrawable` (`r_c 1`, leave untouched), and the carrier
   `r1c1_pinwheel` with its four effects. Read each real shape's authored
   `SolidColor` (key 37) and match it to the TSV `standard` column to get the
   palette mapping. `listViewModelInstances` to read the tile's live geometry
   seed values.

2. **Add pixelation properties** to `PathEffectVM` via `addProperties`: six colors
   (`background` `blue` `green` `red` `yellow` `black`) plus `speed` `easing`
   `cellSize` `gapSize`. Ten properties, on top of the existing geometry.

3. **Bind the layer colors** (`databind`, `SolidColor` color key **37**): each real
   shape's `SolidColor` to its palette entry, the background `SolidColor` to
   `background`. These are the original, un-reparented colors, so they never hit
   the stale-path bug in step 6.

4. **Create three named instances** `standard` / `snappy` / `cinematic`
   (`createViewModelInstances`), each carrying **all** VM variables: the palette +
   speed/easing/cell/gap from the TSV, and the tile's geometry seed. React binds
   the instance **by name**, so the names are exact. Colors are `#ffRRGGBB` strings
   (they store/read back as decimal ARGB).

5. **Bind `standard` to the artboard** (`bindViewModelToArtboard`) so the editor
   renders the real palette.

6. **Clone → reparent → bind → delete** the effects:
   - `duplicate_objects` off the carrier's four effects, enough rounds to cover
     the shape count (one round = 4 clones; repeat for more).
   - `reparent_objects` each clone onto a real shape's `Fill`.
   - **Fresh `get_artboard_hierarchy` read** of the target fills.
   - `databind` each clone's `cellSize` input to VM `cellSize` and `gap` input to
     VM `gapSize` (`ScriptInputNumber` value key **243**), using ids from the fresh
     read.
   - `delete_objects` the carrier `r1c1_pinwheel`, **last**.

7. **Verify.** `script_diagnostics` clean. David checks the render and the bind
   panel, then gates the next tile.

The value source is `public/riveTiles/VM instance group2 - Sheet1.tsv`
(`standard`/`snappy`/`cinematic` columns). The accent per tile is
`public/riveTiles/additionalColor/color_swap_hexcodes.tsv`.

---

## The three failure modes this rollout hit, and their fixes

1. **Stale bind path (`r1c4`).** `databind` on an effect input captures the
   input's hierarchy path at call time. Binding before the reparent settled, then
   deleting the carrier, left twelve "bound path is invalid" warnings. Fix: insert
   a fresh `get_artboard_hierarchy` read between reparent and databind, and delete
   the carrier last. Zero warnings since `r1c5`.

2. **Under-scoped provisioning (`r1c3`).** First pass added only `cellSize`/`gapSize`
   and bound the effect; the tile did not render ("VM instances were not ported").
   A tile only renders when `PathEffectVM` is fully provisioned: colors + speed/
   easing + three named instances carrying every VM variable. That is why steps
   2–5 exist.

3. **Silent schema mismatch (`r3c3`, this session).** `addProperties` with the
   wrong key names (`properties`/`type` instead of `viewModelProperties`/
   `propertyType`) returns `success:true` and adds **nothing**. Always confirm the
   new properties with a `listViewModels` read. Related: `duplicate_objects` takes
   `objectIds` (not `ids`) and does not return clone ids (find them in a hierarchy
   read); `reparent_objects` takes `operations:[{objectId,newParentId}]`.

Multi-source duplicate placement: duplicating the carrier's four effects in one
call lands all clones under the **first** source's fill; repeated rounds
distribute across the source fills. Either way, collect every clone from a
hierarchy read before reparenting.

---

## Tile status

| Tile | Design | Accent | Shapes | Notes |
|---|---|---|---|---|
| r1c1 | pinwheel | coral | 4 | David's hand-built seed (carrier source) |
| r1c2 | diagonal-flip | blue | 2 | two-tone (ink black + acc blue) |
| r1c3 | pie | green | 4 | green accent-only |
| r1c4 | — | gold | — | done, gated |
| r1c5 | — | coral | — | done, gated |
| r1c6 | — | blue | — | done, gated |
| r2c1 | — | green | — | done, gated |
| r2c2 | — | gold | — | done, gated |
| r2c3 | — | coral | — | done, gated |
| r2c4 | — | blue | — | done, gated |
| r2c5 | — | green | — | done, gated |
| r2c6 | — | gold | — | done, gated |
| r3c1 | — | coral | — | done, gated |
| r3c2 | — | blue | — | done, gated |
| **r3c3** | windmill | green | 4 blades | **this session.** two-tone black + green |
| **r3c4** | dissolve | gold | 16 cells | **this session.** accent-only, largest tile |

Dashes are values not re-verified in this session's transcript; the tiles were
built and gated in prior sessions. `r3c3` and `r3c4` are documented in full
above and in the memory doc.

Two geometry-seed decisions worth flagging for David's visual check:
- **r3c3:** seeded `scale=1` in all three instances. The tile's own live instance
  carried `scale=0`, which would render the blades collapsed at rest; the node
  driver overwrites it at runtime, but `1` is the safe resting seed.
- **r3c4:** seeded `sc0`–`sc6=100`, `phase=0` (from the file's own `Default`
  instance). The other pre-existing instance had the `sc` values at 0, which would
  render the 16-cell grid empty at rest.

---

## State at close

- **Rive files:** `r3c3.riv` and `r3c4.riv` edited in the Rive editor this session;
  diagnostics clean. Saving/exporting each file is David's step.
- **Runtime app:** untouched. No React, CSS, or token changes this session.
- **Memory:** `group2-patheffect-per-tile-provisioning.md` updated with the schema
  exactness note (the `r3c3` silent-failure trap).

---

## Open items

1. **Continue the rollout at `r3c5`.** 20 tiles remain (`r3c5`, `r3c6`, rows 4–6).
   Same recipe, one tile per David's "proceed" gate. Rows 4–6 are the accent
   variation tiles (`color_swap_hexcodes.tsv` generation column), so the palette
   mapping per tile comes from that file, not a fixed hue.
2. **Frame rate at full group2 load.** Group1's open question carries over: 36
   tiles, each with per-shape CPU pixelation. If the assembled grid drags, the
   fallback is the WebGL post-process (`?pixelrive`), David's call.
3. **Export + integration.** Once tiles are pixelated and saved, the `TileGrid`
   wiring (tracker fork 2) already drives `PathEffectVM`; confirm each re-exported
   tile still binds (the `r4c1` blank-tile regression at first export is the
   precedent to watch).
