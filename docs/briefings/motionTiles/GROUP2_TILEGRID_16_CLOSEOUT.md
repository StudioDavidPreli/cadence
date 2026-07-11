# Group2 TileGrid — 16-Tile Harness + Provisioning Audit Closeout

**Date:** 2026-07-11
**Covers:** a multi-tile test harness that drives all 16 group-two tiles in
`public/riveTiles/group2/36 Tiles 2/` from one React clock, and the per-file
provisioning audit that harness surfaced.
**Status:** harness built and wired (`?group2grid`). 15 of 16 tiles render and
cascade correctly. One tile (r3c1) has a real export gap and needs rebuilding in
Rive. r1c5 was fixed live (state-machine rename). The four tiles first logged as
"missing `progress`" were not export gaps at all: see the 2026-07-11 update
below.

This closes the harness work, not the tile batch. The one remaining resume point
is `r3c1`, which is David's to re-export.

> **Update 2026-07-11:** the original close listed six deficient files. Four of
> them (r2c1, r2c2, r2c3, r3c4) turned out to be correct by design, not broken.
> The harness was driving the wrong property. Corrected below under "The four
> `progress` gaps were not gaps." Only r3c1 remains.

---

## What was built

`src/components/IngredientGrid/Group2TileGrid.jsx`, mounted at
`localhost/?group2grid` (gate added in `App.jsx` alongside the other lab gates).

It is the multi-tile version of `Group2TileLab` (the single r1c1 probe), and the
group-two analog of `TileGrid` (the group-one 36-tile grid). One rAF loop in
React owns the clock, computes each tile's phase-offset eased `progress` from an
offset table, and writes it into that tile's `PathEffectVM`. The tiles carry the
node script; React never re-renders per frame. Reused verbatim from the existing
labs: `autoBind:false` / play-after-instance-bound, `useOffscreenRenderer:true`
for one shared GL context, `PATHEFFECT_PRESETS` for speed/easing/cell/gap, and
`TileGrid`'s `reportReady`/`notReady` per-tile bind diagnostic.

Two adaptations for this batch:

- **VM name is `PathEffectVM`**, not `ViewModel1`. `Group2TileLab`'s r1c1 still
  carries the older `ViewModel1` name; the `36 Tiles 2` files were exported with
  the unified `PathEffectVM` name. This was the first bug: the harness bound
  nothing until the constant was corrected.
- **Ragged layout (6, 6, 4 = 16 tiles).** The offset weight tables (sync,
  ripple, center-in, diagonal, rows, columns, scatter) are **generated** from
  each tile's normalized (row, col) over the 3×6 bounding grid, not hardcoded
  36-entry arrays like `TileGrid`. Adding a tile is one entry in `TILE_LAYOUT`.

The folder name has a literal space; the src path encodes it with
`encodeURIComponent('36 Tiles 2')` so the fetch URL is valid while the on-disk
name is preserved (Vite serves `/public` verbatim).

---

## The provisioning audit (the real finding)

Verified per file with `strings <tile>.riv | grep` for the state-machine name
(`rXcYSM`), the `progress` property, and `PathEffectVM`. Two independent export
gaps, each with a distinct on-screen symptom:

| Gap | Symptom | Caught by HUD? | Tiles |
|-----|---------|----------------|-------|
| No state machine (`rXcYSM` missing) | tile renders **blank** — artboard never advances, node script never ticks | **No** | r1c5 (fixed), **r3c1** |
| No `progress` property on `PathEffectVM` | tile renders but is **frozen** — VM binds, but the `progress` setter is null so the clock can't drive it | **Yes** (listed as "unbound") | **r2c1, r2c2, r2c3, r3c4** |

Fully provisioned (10): r1c1, r1c2, r1c3, r1c4, r1c6, r2c4, r2c5, r2c6, r3c2,
r3c3.

Note the two gaps are complementary and only one is self-reporting. A
`progress`-missing tile returns a null setter, so `reportReady` flags it in the
HUD "unbound" list. A state-machine-missing tile still binds the VM and gets a
valid `progress` setter, so the HUD does **not** flag it — it only fails at
render time, showing as a blank cell. That is why r1c5 appeared blank with no
warning. Diagnosis rule for this batch: **blank cell → missing state machine;
HUD "unbound" → missing `progress` bind.**

### r1c5 fix (done, the template for the rest)

r1c5's artboard existed but its state machine was not named `r1c5SM`. Renaming
the state machine to match the `rXcYSM` convention made the tile appear. r3c1 has
the identical gap and the identical fix.

---

## Resume point — six files to rebuild in Rive

David rebuilds these; the MCP cannot (per the group2 provisioning constraints in
`GROUP2_PATHEFFECT_ROLLOUT_CLOSEOUT.md` and the `group2-patheffect-per-tile-provisioning`
memory). Re-export each to match the working-tile convention:

- **State machine named `rXcYSM`:** r3c1. (r1c5 already fixed.)
- **`progress` number property bound on `PathEffectVM`:** r2c1, r2c2, r2c3, r3c4.

Cause of the `progress` gap is unknown at close — the property is simply absent
from those four exports. Suspect the same under-scoped VM provisioning the memory
warns about (colors ported but the driver-input properties not fully carried).
Rebuild rather than patch: confirm all three instances (standard/snappy/cinematic)
carry the full property set before export.

Once the six are rebuilt, reload `?group2grid`; a clean run shows 0 unbound in
the HUD and no blank cells, with all 16 cascading under the offset tables.

---

## The four `progress` gaps were not gaps (2026-07-11 resolution)

The resume point above was wrong about r2c1, r2c2, r2c3, r3c4. They were never
missing a driver property. Reading each `.riv`'s VM strings directly showed the
"36 Tiles 2" grid is a MIX of two tile families under one VM name (`PathEffectVM`):

- **12 path-effect pixelation tiles** expose a `progress` number property (the
  eased 0-to-1-to-0 pixelation driver) plus `cellSize`/`gapSize`.
- **4 geometry tiles** expose a `phase` number property instead. Their motion
  channels are driven inside the tile's Lua from `phase`, not from `progress`:
  r2c1 cascade (`op0..op6`), r2c2 pull (`colB1/colB3/rowR1/rowR3`), r2c3 ripple
  (`opr0..opr3`), r3c4 dissolve (`sc0..sc6`). These are the T3 linear-phase tiles
  (`public/riveTiles/t3/T3_BUILD.md`); `phase` linear vs `progress` eased is the
  documented distinction, not an omission.

So the harness's `useViewModelInstanceNumber('progress', ...)` returned a null
setter for those four, and the HUD correctly flagged them "unbound." The fault
was in the harness (one hardcoded property name for a mixed grid), not the exports.

**Fix:** each tile now registers the setter for the property IT exposes. A
`GEOMETRY_TILES` set names the four `phase` tiles; `tileDriverProp(name)` returns
`'phase'` for those and `'progress'` for the rest. Both hooks run every render
(hooks cannot be conditional); the tile keeps the one whose property exists and
drops the null. The clock loop is unchanged: it writes the same `cycleProgress`
0-to-1-to-0 value to whatever setter was registered, so only the property name
differs. Grid-level spread still applies to the geometry tiles; their internal
per-diagonal self-stagger is a finer scale that composes on top.

Verified working by David: 0 unbound in the HUD except r3c1, all four geometry
tiles cascading in step with the pixelation tiles. Diagnosis rule for this batch
is now three-way: **blank cell -> missing state machine; HUD "unbound" on a
pixelation tile -> missing `progress` bind; a geometry tile (r2c1/r2c2/r2c3/r3c4)
-> drive it by `phase`, not `progress`.**

The `tile-family-phase-vs-progress-collision` memory records the family split.

---

## Files touched

- `src/components/IngredientGrid/Group2TileGrid.jsx` — new harness; per-property
  driver routing added 2026-07-11 (`GEOMETRY_TILES` / `tileDriverProp`).
- `src/App.jsx` — `?group2grid` gate + import (temporary test mount, same block
  as the other lab gates).
