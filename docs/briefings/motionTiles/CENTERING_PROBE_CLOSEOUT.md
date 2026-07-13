# Centered-viewBox probe — Closeout

**Date:** 2026-07-10
**Closes:** the centering probe gated in `GRAPHIC_SYSTEM_GRID_MANIFEST.md`, run on
the rotor (r2c6) in `t1_test`.
**Result:** pass. A tile authored on a centered viewBox carries its rotation pivot
in the group origin. Position the group at frame center and rotation-about-center
is free. The per-tile anchor drag is gone.

---

## The question

The T1 rotators each cost a hand step. Import a tile SVG drawn on `viewBox="0 0 120
120"`, and the group origin lands at the top-left corner. Rotation pivots on that
corner, so the origin gets dragged to (60,60) by hand, once per tile. The probe
asked whether moving the origin upstream, into the SVG, removes the step: author
the geometry about (0,0) on `viewBox="-60 -60 120 120"`, and the imported group
origin should land on the geometry center instead of the corner.

One tile, cheapest to falsify: the rotor. A semicircle and a dot, one channel.

---

## What passed

The rotor SVG places `center_dot` at (0,0) and draws `rotor_semi` around it,
`M0,0 L40,0 A40 40 0 0 1 -40,0 Z`. On import the group holds both, and its local
origin sits where the dot sits: (0,0), the geometry center. The pivot is baked in.

Dragging the asset onto the artboard dropped the group at (57,64), wherever the
cursor let go. Setting the group to (60,60) put the dot on the artboard center and
the whole tile with it. Rotation was bound to the group, `rot = 180 * progress` in
degrees, and the semicircle swept a half-turn about the dot while the dot held dead
center. Confirmed live.

No origin was touched. No anchor was dragged. The group moved to one coordinate and
the tile was correct.

---

## Why the group, not the blade

The rotor's earlier build drove `rotor_semi` and moved its origin by hand. A
semicircle's own origin imports at its bounding-box center, local (0,20), which is
twenty pixels off the disk center. Rotate about that and the flat edge walks away
from the middle. So the old rotor carried a hand-placed shape origin on top of the
hand-placed group anchor: two corrections per tile.

Driving the group removes both. The group origin is already the disk center, and
the one static piece, the dot, is a circle sitting on the pivot, so rotating it is
invisible. One bind on the group, no shape-origin move. This is the windmill
pattern, and it holds anywhere the movers share a center and the static pieces are
either absent or symmetric on the pivot. The target is the counterexample and stays
per-piece: ring2 renders between the two movers, so a group would break the stack.

---

## What the MCP could and could not do

- **Position: yes.** Setting the group x/y to (60,60) is a `set_property_values`
  write on keys 13 and 14. Precise and scriptable, which is what a generator needs.
- **Placement: no.** Dropping the SVG asset onto the artboard has no MCP path.
  `addImageInstance` rejects it, `assetId is not an ImageAsset`, and nothing else
  instantiates a vector asset. The drag stays a hand step, alongside placing the
  Script node.

So the division holds: the hand drops the asset and the script node, the MCP does
the rest, positioning included.

---

## What this clears

The generator can recenter. Re-author the grid on `viewBox="-60 -60 120 120"` with
geometry about (0,0), and every rotation tile imports with its pivot on the group
origin. The build per tile drops to: drop the asset, set the group to (60,60), wire
the bind, place the script. Two of those four the MCP can take.

T2 and T3 emit on the centered viewBox. The anchor drag does not come with them.

---

## Addendum — the dot got a scale (2026-07-10)

After the probe passed, the center dot was given motion of its own. A bind converter,
no script, `convert = (1.0) + ({{ViewModel1/progress}} * 5.0)`, drives `center_dot`
scale from 1.0 to 6.0 as `progress` runs. The group rotation still carries the dot
around the pivot, invisibly, since it is a circle sitting on the center, while the
converter swells it in place. Two motions on one piece from two independent binds.

It also drops a data point on the scale-unit question. The dot is a Shape, it rests
at scale 1.0 and reads as full size, and it grows to 6x, matching r1c6's circle. The
windmill's percent scale was a group Node. Node scale may be percent and Shape scale a
raw multiplier. Unconfirmed, recorded in the manifest.

## Where the record lives

- This file, the probe result.
- `public/riveTiles/t1_test/GRAPHIC_SYSTEM_GRID_MANIFEST.md`, the standing
  centered-viewBox rule and the per-tile detail, updated with the degrees factors
  and the group-drive rotor.
- Memory `graphic-system-grid-node-driver`, the group-versus-per-piece rule this
  extends.

The rotor rests at `progress` zero, flat edge down, dot at its middle. Scrub the
number to one and it swings its half-circle up and over, and the dot does not move.
