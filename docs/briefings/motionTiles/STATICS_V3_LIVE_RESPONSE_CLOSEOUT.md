# Rive Statics v3, Live Response — Session Closeout

Date: 2026-07-12 (follow-up to `POOLED_MOSAIC_AND_RIVE_STATICS_CLOSEOUT.md`)
Surface: `?v8grid` (`src/components/IngredientGrid/IngredientV8Grid.jsx`)

## Goal for the session

Finish the one piece the prior session left failing: Rive stills that respond live to
the preset palette and the pixelation controls. The prior session pivoted to the
many-artboards method but had not gotten it working. This session took the new build,
`public/riveTiles/motiontilesstatics_v3.riv`, and made it functional.

## The v3 file

32 separate artboards, `asset1` through `asset32`, one artwork per artboard, each with
its own state machine `a1SM` through `a32SM`. All share `PathEffectVM`, which carries
`cellSize`, `gapSize`, and the three preset instances (snappy/standard/cinematic). It has
no `progress` property, unlike `ingredients_v8`'s view model. Selecting a still is naming
its artboard. The `frameIndex` / frameGated stacking from the prior attempt is gone.

Deployed the same way as `ingredients_v8`: one `useRiveFile` at the grid level, instanced
per cell.

## What was wrong, in three stages

Each stage exposed the next once fixed.

1. **Only `asset1` rendered, the rest blank.** Every tile shares one offscreen renderer
   (`useOffscreenRenderer` default true), and that renderer keeps compositing an instance
   only while it is still advancing. A static settles at once, drops out, and its cell
   goes blank. The file's default artboard, `asset1`, was the only survivor. Three
   artboards were also misnamed `"asset1 19"`, `"asset1 22"`, `"asset1 23"` (Rive
   paste-dedup names) instead of `asset19/22/23`, so those cells stayed blank until the
   rename and re-export.

2. **Statics appeared only after a reshuffle or preset toggle.** Rebinding the instance
   or remounting woke the render loop. First mount needs `rive.play(source.stateMachine)`
   once the instance is bound, the same order the animated `Tile` uses.

3. **Statics appeared but ignored the pixelation controls.** This was the real problem
   and the one the prior session could not crack.

## Root cause of the frozen controls

The self-binding pixelate script (`pixelateBound` / `PixelateBound2`) reads `cellSize`
and `gapSize` off the view model by name inside `advance()`:
`self.context:viewModel():getNumber("cellSize").value`. Those are view-model reads, not
script `Input`s.

A Rive PathEffect rebuilds its geometry in `update()`, and `update()` re-runs only on an
Input change or a path change. A view-model read is neither. So moving a slider updated
the script's stored `liveCell` / `liveGap` but never triggered a rebuild, and the tile
looked frozen once its artboard settled. `ingredients_v8` never showed this because its
pixelate consumes `progress`, which the React clock writes every frame, forcing a
continuous rebuild that also happens to re-read cell/gap.

## The fix

One line in the pixelate script's `advance()`, before `return true`:

```lua
self.context:markNeedsUpdate()
```

This is the documented pattern for a path effect that changes over time while its path
stays the same. It re-runs `update()` each frame so the live cell/gap take effect, and it
keeps the artboard advancing so the cell stays composited in the shared renderer. Applied
to both `pixelateBound` and `PixelateBound2` (byte-identical duplicates; whichever the
artboards reference is covered) and to the repo reference copy at
`docs/riveScripts/pixelateBound.lua`.

With the script self-advancing, the React side needs no clock keep-alive. `StaticRiveTile`
is now the animated `Tile` minus the progress driver: `autoplay:false`, play the state
machine on instance bind, write `cellSize` / `gapSize` on change. The `gapSize`-toggle
keep-alive from mid-session was removed; a view-model write cannot force `update()` to
re-run, so it never solved the problem and it fought the real control.

## Prior open questions, now answered

From the earlier closeout:

- **Q3 (does a bound VM write schedule an advance?)** No. A `useViewModelInstanceNumber`
  write updates the value but does not schedule an advance or re-run `update()`. That was
  the crux.
- **Q4 (is there an API to force one advance on demand?)** Not needed. The script keeps
  itself advancing with `markNeedsUpdate()`, so the on-demand single-advance question is
  moot.
- **Q1 / Q2 (why did play + startRendering not run advance, was the artboard name right?)**
  The names were right. A one-shot `play()` plus `startRendering()` settles and stays
  settled; nothing sustained the advance. `markNeedsUpdate()` inside `advance()` sustains
  it.
- **Q5 (was the React-bound instance the one the script reads?)** Yes. Palette and the
  now-live cell/gap both act on the same instance.

## Dead ends, so they are not retried

- `autoplay:true` alone. Paints one frame and settles.
- `rive.play()` plus `rive.startRendering()` on change. A one-shot play settles.
- A per-frame React `gapSize` nudge through the grid clock. Keeps the tile composited but
  never rebuilds geometry, and interferes with the real gapSize control.

## Tradeoff

`markNeedsUpdate()` every frame rebuilds each static's mosaic every frame, the same cost
profile as an animated tile. The motion-to-static ratio is therefore a composition
control, not a hard performance one. If frame rate suffers at large grids, the call can
be gated to fire only when cell/gap change, at the risk of the artboard re-settling.

## Handling notes

- Editing script source through the Rive MCP `text_editor` is safe. The recompile and
  re-export are the crash risk: do them with scripted drawables off-screen in the editor.
- Probe artboard, state-machine, and view-model names with `mcp__rive__list_artboards` or
  `strings` on the `.riv`. The intended naming scheme is not guaranteed by the export.

## Current code state

- `StaticRiveTile` / `StaticTile` in `IngredientV8Grid.jsx` hold the final clean version.
- `STATIC_FILE` points at `motiontilesstatics_v3.riv`; `STATIC_POOL` is 32 entries,
  `asset1`..`asset32` with `a1SM`..`a32SM`.
- Script fix lives in `pixelateBound` and `PixelateBound2` in the Rive file and in
  `docs/riveScripts/pixelateBound.lua`.
