# Pooled Motion-Tile Mosaic + Rive Statics — Session Closeout

Date: 2026-07-12
Surface: `?v8grid` (`src/components/IngredientGrid/IngredientV8Grid.jsx`)

## Goal for the session

Turn the fixed 6x6 `ingredients_v8` composition into a pooled mosaic: cells filled
from a pool of Rive animations plus static tiles by an adjustable motion-to-static
ratio, with more animations added to the pool and an adjustable grid size. Statics
had to respond to preset changes (palette) and the pixelation controls, so they were
built as Rive stills rather than SVGs.

## What shipped and works

These are in place, built clean, and pass the token-integrity gate:

- **Pooled mosaic.** `ANIM_POOL` (36 shared-file artboards + 16 group-two files) and a
  static pool feed cells by a seeded permutation. Raising the ratio only turns more
  cells on; reshuffle re-seeds layout and source placement.
- **Adjustable grid size** 1x1 to 8x8. The stagger weight tables (ripple, diagonal,
  rows, columns, centre-in, scatter) were generalised from hardcoded 36-length arrays
  to generators that reproduce the 6x6 character at any size.
- **Motion/static ratio slider + reshuffle**, in a new Composition panel section.
  Default 4x4, a lighter default draw load for older machines.
- **16 group-two animations wired in** with a per-source `driverProp`: the four
  geometry tiles (r2c1/r2c2/r2c3/r3c4) drive `phase`, the rest drive `progress`.
  `Tile` subscribes to both and writes the one the source exposes.
- **`?group2grid` retired.** Its probe purpose was served and the files moved to a flat
  `group2/` folder; route, flag, import, and `Group2TileGrid.jsx` removed.

The animated half of the mosaic is the success. The failure is isolated to the Rive
statics.

## What failed: Rive stills that respond to presets and pixelation

The statics were meant to be cheap (idle when nothing changes) yet preset- and
pixelation-responsive. Two constructions were attempted.

**Attempt 1 — scrub a paused timeline (Option A).** One artboard, a `carousel`
timeline whose 32 frames each hold one artwork, held by `rive.scrub('carousel', k)`
and paused. Result: the still showed, but no palette response and no pixelation. Root
cause identified correctly: Rive applies data binding and runs path-effect scripts on
artboard **advance**, and a paused, scrubbed artboard never advances. A held still
cannot be preset-responsive.

**Attempt 2 — `frameIndex` VM number + running state machine.** Frame selection moved
to a VM number the script reads, and the state machine runs so binding, the script,
and the pixelate effect all apply on advance. Sub-steps:

- Selection lives in the pixelate effect itself, since a PathEffect script can only
  reshape its own path and cannot set a sibling's opacity. Each artwork's effect hides
  itself (returns an empty path) unless its own `frameSelf` Input matches the shared
  `frameIndex`. Script: `docs/riveScripts/pixelateBoundFrameGated.lua`. This part is
  correct: scrubbing `frameIndex` in the Rive editor selects the right artwork.
- React writes `frameIndex`/`cellSize`/`gapSize` to the bound instance and nudges the
  artboard to advance on change (`rive.play` then `rive.startRendering`), so statics
  stay idle otherwise.

**Final observed state in the app:** every static cell stuck on frame f0, cell/gap
sliders inert, palette (preset) changes working. That signature means the pixelate
script's `advance` never ran for the statics: `liveFrame` stayed at its default 0 (so
every cell showed f0) and `liveCell` stayed at the seeded 4 (so pixelation was frozen),
while the palette still updated because colour binding is applied by the renderer on
instance rebind without needing the script.

Two fixes were tried and neither changed the behaviour:

1. A real bug found along the way: the statics file's view model was accidentally
   named `PathEffectSM` instead of `PathEffectVM` (found by reading the `.riv` strings).
   Corrected, but it was not the blocker for the advance problem.
2. Naming the artboard explicitly (`artboard: 'statics'`, matching the tiles' pattern),
   on the theory that `play('staticsSM')` could not resolve the state machine without
   it. No change.

## Best current understanding of the root cause

The statics artboard never advances from the React `@rive-app/react-webgl2` runtime.
The animated tiles work only because the React clock writes `progress` to each one
every frame, which keeps their artboards continuously advancing. The statics have no
such per-frame driver, and the idle-then-nudge model could not produce even a single
reliable advance: `rive.play(stateMachine)` plus `rive.startRendering()` did not make
the pixelate script's `advance` run. Everything that depends on advance (frame gate,
cell/gap, path effect) stayed frozen; only renderer-applied colour binding survived.

The many-artboards method sidesteps this entirely because each static becomes an
artboard instanced and driven the same way the animated tiles already are, which is a
path proven to advance and respond.

## What was proven or learned

- A Rive PathEffect script reads the VM through `self.context:viewModel():getNumber(name).value`
  inside `advance`, transforms the path in `update`, and returns a `PathData`. It cannot
  write another node's properties (no sibling opacity). Confirmed from the two working
  scripts in `docs/riveScripts/`.
- Frame selection among stacked artworks therefore belongs inside each artwork's own
  effect (a per-effect `frameSelf` Input gating to an empty path), not a separate script
  that sets 32 opacities. The gate logic is correct in-editor.
- Data binding and path-effect scripts apply on advance, not on scrub. A paused still
  is inert to both.
- `strings` on a `.riv` reliably surfaces artboard, state-machine, view-model, instance,
  and property names, and caught the `PathEffectSM` typo. Probe the file, do not assume.

## Open questions for the failed design

1. Why did `rive.play('staticsSM')` followed by `rive.startRendering()` not run the
   artboard's `advance` in the webgl2 React runtime? Was the state machine never
   actually started, did it settle before the first advance, or does the runtime not
   resume a settled machine this way?
2. Was `artboard: 'statics'` correct? "Nothing changed" (statics still rendered f0)
   suggests the name was right enough to render but advance still did not run, which
   points at the runtime, not the name. Unconfirmed.
3. Does writing a bound VM number through `useViewModelInstanceNumber().setValue` mark
   the artboard dirty and schedule an advance on its own? For the tiles this is masked
   by the per-frame clock. If it does not schedule an advance, that is the crux of the
   idle-statics failure.
4. Is there a public API in `@rive-app/react-webgl2` to force exactly one artboard
   advance on demand (to flush binding and run path-effect scripts once), without
   running the state machine continuously? `advanceAndReportChanges` is private;
   `drawFrame()` redraws without advancing. If no such API exists, idle-plus-nudge is
   not achievable and continuous advance is the only option.
5. Was the named instance React bound (snappy/standard/cinematic) the same instance the
   script reads via `self.context:viewModel()`? Palette worked, which suggests yes, but
   the numbers never reached the script. Distinguish "advance never ran" from "wrong
   instance scope" before reusing any of this.
6. If statics must run their state machine continuously to stay responsive, what is the
   real per-tile draw cost versus an SVG, and does it undercut the motion-density
   performance argument enough to matter on the target older machines?

## The pivot

Statics move to one `.riv` file with many artboards (one per still), instanced and
driven like the animated tiles. This drops `frameIndex`, `frameSelf`, the gated script,
and the advance-nudge. The React side becomes another entry in `ANIM_POOL`-style
instancing rather than the bespoke `StaticRiveTile`. The pooled-mosaic, grid-size,
ratio, reshuffle, and group-two work above all stay.

## Current code state (for the next session)

- `StaticRiveTile` / `StaticTile` in `IngredientV8Grid.jsx` still hold the failed
  frameIndex + nudge approach and will be replaced by the many-artboards instancing.
- `STATIC_POOL` is 32 index entries over `motionTilesStatics.riv`; the placeholder path
  still renders until `staticFile` loads.
- `docs/riveScripts/pixelateBoundFrameGated.lua` is the gate script. Keep it as the
  reference for the gate logic even though the surrounding approach was abandoned.
