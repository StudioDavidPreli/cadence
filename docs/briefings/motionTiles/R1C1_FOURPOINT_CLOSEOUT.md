# r1c1 pinwheel — Four-Point Construction Closeout

**Date:** 2026-07-10
**Closes:** the r1c1 pinwheel tile in the T1 batch (`T1_BUILD.md`), and the
question of how a pinwheel of triangles becomes four clean circles.
**Result:** Green. Four four-vertex blades, driven by one Luau script off a single
`progress`, morph from a pinwheel into four true circles while the group turns
clockwise 90 degrees. No timeline in the tile.

---

## The wall, and the way around it

The batch plan was simple: rotate four right-triangles and round their corners to
their incircles. It rounds too fast and it never makes a circle. A corner radius
clamps at half the shortest adjacent edge, so a right-triangle's two 42px legs
round away but the 59px hypotenuse keeps a flat. You get a bean.

The geometry is the lesson. Three arcs cannot close a circle; four can (four 90
degree corners sum to 360). So each blade is built as a **four-vertex** shape. At
rest it reads as a triangle because the fourth point hides on a leg near the apex.
Through the morph that point slides off the leg to become a real corner, the shape
turns into a small square, and full rounding closes it into a circle.

David built the motion first as a keyframed timeline on a throwaway artboard, to
see it move. That artboard was reference only. The tile itself carries no timeline.

---

## What drives it

`tiles/r1c1` reads `progress` and writes every animated value; the vertices and
the group node bind to those channels. The unlock behind the whole approach: a
`StraightVertex` exposes `x` (24), `y` (25), and `radius` (26) as bindable, so a
script can drive geometry, not just transforms.

Per blade, the apex stays pinned at the tile center and two vertices move: the
extra point and one leg-end slide to the square corners while all four corners
round 0 to 21. Four blades, four circles of radius 21 sitting at the quadrant
centers. The parent node, its origin at the frame center, carries a clockwise 90
degree turn on `rot`. The blades' own rotations are pinned to a `zero` channel so
only the group spins.

Channels: eight position movers, two extra tri3 movers, `rounded`, `rot`, `zero`,
and `progress` in. `DIST` (13) is one constant for how far the four extra points
sit from center at rest.

---

## Symmetry, fixed at the root

The first pass ran but looked sloppy, and the reason was structural. Three blades
carried their extra point as the second vertex in the path, so it landed on a leg
beside the apex. The fourth blade carried its extra point as the last vertex,
which forced it onto the +x leg, doubling with another blade and leaving the -y
leg empty. Two points on one axis, none on another, and four different distances
from center.

The fix put all four extra points one per axis at the same distance. That needed
the odd blade's extra vertex reordered to the second slot so it would sit on its
-y leg, then all four set to distance 13. Now the four extra points form a
symmetric square at rest and the four blades move as rotations of one another.

---

## What the MCP can and cannot do (carry forward)

- **Vertex geometry is bindable.** `x`/`y`/`radius` on a `StraightVertex` all bind.
  This is what makes script-driven morphs possible without a timeline.
- **`reorder_objects` reorders path vertices.** `bringForward` / `sendBackward` move
  a vertex within its path (sibling order is vertex order). This relocated the odd
  blade's point to the correct leg.
- **`rename_objects` renames ViewModel properties in place**, keeping their id, so
  existing binds survive. Used to fix two underscore channel names to camelCase.
- **There is no unbind.** To free a bound property, repoint it. Two patterns used
  here: repurpose a now-unused channel as a constant hold, and route the blades'
  rotations to a `zero` channel so driving `rot` never touches them.

---

## State at close

- `tiles/r1c1` compiles clean. Source synced to
  `public/riveTiles/t1/tiles_r1c1.lua`.
- rotor (r2c6) is green and holds the same template. The T1 status block and the
  r1c1 section in `T1_BUILD.md` are updated; the incircle plan is marked dead and
  kept as history.
- target (r1c5) and windmill (r3c3) are still to build. Both reuse rotation-at-
  center, so they are the low-risk fan-out.
- Nothing committed. The t1 folder and the Rive files are still working files.

---

## Next

target and windmill draw through the proven rotation template. When a tile needs a
shape that a transform cannot reach, the four-point pattern is now on the shelf:
build the blade from the vertices you need, bind them, and drive the points.

Four triangles go in. Four circles come out, and the wheel turns a quarter as they
do.
