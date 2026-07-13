# T3 linear-phase tiles — Closeout

**Date:** 2026-07-10
**Closes:** the T3 batch of four tiles for the graphic-system grid, the ones that
read the linear `phase` instead of the eased `progress`.
**Result:** four green. cascade (r2c1), dissolve (r3c4), ripple (r2c3), pull
(r2c2). T3 settled two bind units, escalated the origin rule from T2 into two
sharper import findings, and turned centering into a build step.

---

## What T3 was

T1 turned things, T2 moved them, T3 runs a front across the sheet. Three of the
four are field effects over the 16-cell grid, a diagonal that lights, a diagonal
that shrinks, a corner ripple, and each reads raw `phase` off its bound ViewModel
through the same typed Node script, `init` seeds frame 0, `advance` writes every
frame, the shapes bind the channels. The fourth, pull, leaves the field model
behind and drives 64 individual vertices off four boundary channels.

| Tile | Motion | Channels | Binds | Unit |
|---|---|---|---|---|
| r2c1 cascade | 16 cells ramp to full as a diagonal front passes | op0..op6 | 16 | opacity 0-1 |
| r3c4 dissolve | 16 cells scale to nothing along the diagonal | sc0..sc6 | 32 | scale percent |
| r2c3 ripple | 4 quarter-annuli, opacity ripples out from the corner | opr0..opr3 | 4 | opacity 0-1 |
| r2c2 pull | 4x4 checkerboard, 4 boundaries pull out and return | colB1/colB3/rowR1/rowR3 | 64 | vertex px |

---

## Two bind units, both read back not guessed

The rule that came out of the batch: the bind unit is per property, and you find it
by seeding a bound target and reading its stored value back, never by assuming.

- **Opacity binds 0-1.** cascade fed a channel `20` and it rendered 2000 percent.
  Rive's transducer scales a bound opacity to percent, `1.0` is full, so the
  channels run `0.2 + 0.8*clamp01(...)`, rest 0.2, full 1.0. ripple inherited the
  unit and dropped the `100*` it was drafted with.
- **Scale binds percent, for shapes as well as nodes.** dissolve seeded a cell's
  bound `sc` to 100 and its stored ScaleX read back 1.0, so the `100*` in the Lua
  is right and the T2 guess that shape scale might be raw is retired.

cascade also carries one arithmetic note worth keeping: seven diagonals, d0 through
d6, so the denominator is `/7`, not `/6`. At `/6` the H corner started its ramp at
phase 1 and sat stuck at 0.2. At `/7` all seven fit in [0,1] and d6 completes exactly
as phase lands on 1.

---

## The import does not hand you what the SVG drew

T2 found that an imported piece does not keep its origin at its own center. T3 hit
the same class of problem twice, each time worse than a shifted origin, each time
in a way the emitted spec had assumed away.

**Fill, on ripple.** cascade's faint field imported as it expected: the `0.2`
fill-opacity landed as the fill color alpha, so the 16 cells were reset to full
alpha and the driven shape opacity became the sole factor. ripple looked like the
same job and was not. Three of its four arcs were drafted at `fill-opacity="0"`,
and a zero-opacity shape imports with no fill node at all, not a faded one. Only
arc0, the one non-zero arc, carried a fill. arc2 is coral, a ring that would have
stayed blank. The fix was to duplicate a fill onto the three empty arcs, reparent,
and set full alpha at the SVG colors. Check that the fill exists before you reach
for the alpha reset.

**Geometry, on pull.** The four-vertex model needs every cell in one frame so the
four shared channels mean the same thing to all of them, and the r1c1 precedent
said imported vertices are artboard-absolute. They were not. The importer baked a
per-cell offset into each shape's position and stored the vertices shape-local, and
the offset differed cell to cell, cell_1 at -21, cell_5 at -10.5, cell_C at 10.5,
cell_H at 31.5. A single channel value can only be right if every cell shares one
frame, so before wiring, all 16 cells were normalized: shape transform zeroed, every
vertex rewritten to its absolute SVG coordinate, child order confirmed TL,TR,BR,BL
on four cells first. The precondition is an assumption, not a guarantee. Read one
cell's shape transform back before you trust it.

---

## Centering is a build step

David centered the first three tiles by hand and named the pattern: the importer
lands the top group off the artboard center, and setting the top node's position to
the center closes the gap. For a 120x120 board that is `(60,60)`. It is one write,
it is deterministic, and it belongs in the build order, not in a pass of dragging
after the fact. pull was centered in-build and the manual step is gone.

---

## pull: measured, then made linear

pull was measured off `r2c2ref.mp4`, a 4x4 checkerboard where only the second and
fourth boundary line per axis moves, each pulsing 16px outward and back on a
staggered clockwise wave. The emitted Lua carried that as an out-and-back `pulse`
per boundary, with hold plateaus and a hand-tuned release.

That timing belongs upstream. Easing and phase are set by the instances and React,
so the tile was cut back to a linear map like the rest of the batch:
`ramp(ph,t0) = clamp01((ph - t0)/W)`, W = 0.60, the four boundaries keeping their
clockwise start offsets, 0.04, 0.16, 0.28, 0.40. No hold, no baked return. The one
piece that could not move upstream is the stagger: a single `phase` cannot offset
four boundaries downstream, so the offsets stay in the tile, the same way cascade
bakes its `d/7`. The return comes from React ping-ponging `phase`, and with the
offsets kept the release stagger runs in reverse, top and right lead out, bottom
and left lead back, which is the up-right then down-left read the reference showed.

One process note landed here too. The emitted Lua threw ten Luau diagnostics, an
untyped mapper and a helper reading `.value` off an optional without the nil guard.
They are lint only, erased at runtime, and never touched the motion, but they do not
surface in `read_console`, which shows execution output. Type errors live in
`script_diagnostics`. Run it after every script edit.

---

## What is deferred

- **pull's `W` and the phase clock.** The 0.60 width is the one knob left, and the
  return depends on React driving `phase` as a ping-pong rather than a reset. Both
  are David's to set when the grid drives the tile.
- **Node placement stays manual.** The MCP wires the ViewModel, the binds, the
  script, and the recompile, but it does not place the ScriptedDrawable. David
  drops the `tiles/rNcM` node in and scrubs, as on every tile.

---

## Where the record lives

- This file, the batch result, the two units, and the two import findings.
- `public/riveTiles/t3/T3_BUILD.md`, the per-tile bind tables and the full session log.
- The disk scripts `tiles_r2c1.lua` through `tiles_r2c2.lua`, synced to the built
  formulas, `tiles_r2c2.lua` carrying the linear ramp rather than the emitted pulse.
- Memory `rive-tile-wiring-gotchas`, centering as a build step, the identity/absolute
  break, the zero-opacity fill, and the diagnostics tool, for the next batch.

Four tiles at rest, `phase` on zero. Scrub the number and the light walks the
diagonal, the gold thins out behind it, the corner throws its rings, and the grid
draws a breath in from its edges and lets it go.
