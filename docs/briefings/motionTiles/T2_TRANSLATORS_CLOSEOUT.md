# T2 translators — Closeout

**Date:** 2026-07-10
**Closes:** the T2 batch of seven translate / sine / step tiles for the
graphic-system grid.
**Result:** all seven green. explode (r1c3), converge (r3c2), split (r3c1),
butterfly (r2c4), bloom (r2c5), bar-sweep (r1c4), flip (r1c2). T2 proved the
position convention and turned up one rule that governs every animated piece in
the sheet: the origin is never free.

---

## What T2 was

T1 turned things. T2 moves them. Seven tiles that translate, some on a sine, one
in discrete steps, one folding a rotation into the mix. Each reads the eased
`progress` off its bound ViewModel through the same typed Node script, `init`
seeds frame 0, `advance` writes every frame, and drives a channel the shapes bind.
The batch was built to answer one question first, then it kept answering a
second one it was not asked.

| Tile | Motion | Channels | Binds |
|---|---|---|---|
| r1c3 explode | quarters cross through center to the opposite corner | posP/posN | 8 |
| r3c2 converge | 4 squares slide from the corners inward | convP/convN | 8 |
| r3c1 split | 2 halves open and close on a sine | splitUp/splitDown | 2 |
| r2c4 butterfly | 2 wings flap on a sine, hinged at center | angPos/angNeg | 2 |
| r2c5 bloom | 4 squares move out and spin 90 in place | bloomP/bloomN/rot90 | 12 |
| r1c4 bar-sweep | 1 highlight teleports across 5 slots | hiX | 1 |
| r1c2 flip | 180 turn with a diagonal open/close, accent swap | rot/gapAcc/gapInk | 5 |

---

## The position convention

The first question: does a bound position land in raw pixels, or does Rive slip a
converter under it the way it does for rotation? split answered it. A bound Pos
takes raw px, no converter. A channel of `-38` moves the piece 38 pixels and no
scaling stands between the number and the transform. Rotation stays the exception:
Rive attaches its degrees-to-radians converter to any rotation bind, so the T2
rotators (butterfly, bloom, flip) still speak degrees.

The second half of the convention came from the shape of the rest pose. The spec
listed explode and split as resting at zero. They do not. Every translator was
authored with its pieces already placed, own-center, at a nonzero rest: split at
+/-18, explode at +/-15, converge at +/-33. So the driver does not push a piece
outward from zero. It binds the absolute position, `authored_rest +/- delta`, and
the instance carries the authored rest so a script that never runs leaves pose A
standing rather than collapsing every piece onto the center. Seed the rest, bind
the absolute, let the delta ride the eased `progress`.

---

## The origin is never free

The rule the whole batch kept circling back to. A shape imported from the sheet
does not keep its origin at its own center. On every tile, the pieces sitting on a
negative axis came in with their origin shoved off toward the middle: converge by
10.5 px, bloom by 1, the bar-sweep highlight by 16. The pieces looked right, their
centers sat where the SVG drew them, but the transform origin, the point a bound
Pos writes to and a bound Rotation turns about, was somewhere else.

For a pure translate that misplaces the piece: bind converge's Pos to the spec's
-33 rest and the square jumps to -43.5, because -33 lands the offset origin, not
the center. For a rotation it is worse: the piece orbits a point it should be
spinning around. So each animated piece was normalized before wiring, its vertices
reset to a canonical box and its Pos set to the true center, an edit that leaves
the picture untouched and moves only the origin under it. sq_se and both flip
triangles came in clean and were left alone. The rest were squared up by hand
through the MCP.

The pivot, once centered, is a choice, and the two rotators make the point:

- **butterfly** hinges both wings at the body center. The wings' origins imported
  out on their own bodies, so each was pulled back to (0,0), the shared hinge, and
  the flap reads.
- **bloom** spins each square about its own center while it travels. Same
  normalization, opposite intent: the origin stays on the piece so the 90 turn is
  in place, not an orbit.

The check that now runs before any T2-style wiring: read the piece's Pos, confirm
it equals the visual center or the intended pivot, normalize if it does not.

---

## explode, against the reference

explode was built once to the spec and it was wrong. The spec read it as an
outward burst, four quarters flying to their own corners. The animation ran, and
it did not match the sheet. The stroke-and-number SVG settled it: the quarters do
not fly out, they slide diagonally through the center and reassemble inside-out on
the far side, SE to NW, SW to NE, each keeping its orientation. Bbox-center travels
+/-15 to -/+24, crossing near p 0.39. The fix was two lines, `posP = 15 - 39*p`
instead of `15 + 30*p`, because the binds already read `posN = -posP` and only the
travel direction was wrong. The lesson costs nothing to state and would have cost a
tile to ignore: when a reference timeline exists, read it before trusting the prose.

---

## flip stands apart

flip is the one tile the spec marked model-inferred, and it stays that way until
the sheet confirms it. The inner group turns 180 while two triangles slide apart on
the TL-BR diagonal, `m = 24*|cos(pi*p)|*0.707`. The absolute-value is load-bearing:
it keeps the gap outward at both ends, open at p0, shut at p0.5, open at p1, so the
half-turn carries the accent from one corner to the other instead of cancelling it.
The instance rests closed, a solid square, so a dark tile is the graceful failure
and the script opens it to pose A on the first frame. The amplitude and the profile
are David's to tune against the sheet. The model is wired; the verdict is his.

---

## What is deferred

- **flip tuning.** The `24` amplitude and the open/close timing wait on a read
  against the sheet.
- **T3.** The linear-`phase` tiles: diagonal-cascade, corner-ripple, grid-dissolve,
  and the r2c2 row/col pull. They read raw `phase`, not the eased `progress`, and
  three of them carry the 16-cell binder load. Emit after flip is dialed in.

---

## Where the record lives

- This file, the batch result and the two conventions.
- `public/riveTiles/t2/T2_BUILD.md`, the per-tile bind tables, updated with the
  corrected explode motion and the origin note.
- The disk scripts `tiles_r1c3.lua` and `tiles_r3c1.lua`, synced to the built
  formulas after the spec versions drifted stale.
- Memory `graphic-system-grid-node-driver`, the position convention and the
  origin-normalization check, for T3.

Seven tiles at rest, `progress` on zero. Scrub the number and the quarters cross,
the squares draw in, the halves breathe, the wings beat, the bloom opens and turns,
the light walks the slots, and the accent falls from one corner to its opposite.
