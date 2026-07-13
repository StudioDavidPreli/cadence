# T1 rotators — Closeout

**Date:** 2026-07-10
**Closes:** the T1 batch of four rotator tiles for the graphic-system grid.
**Result:** all four green. rotor (r2c6), pinwheel (r1c1), windmill (r3c3),
target (r1c5). This session built the last two and found the two unit rules that
govern every data-bound transform in the tile system.

---

## What T1 was

Four tiles that move by turning. Each reads an eased `progress` off its bound
ViewModel and writes a rotation the shapes follow, through the corrected Node
script template: `init` seeds frame 0, `advance(self, seconds)` writes every
frame, a `function(): Node<T>` factory returns it. rotor and pinwheel closed
earlier. windmill and target were the fan-out this session was meant to be, and
they were low-risk right up until they weren't.

| Tile | Channels | Drive | Binds |
|---|---|---|---|
| r2c6 rotor | `rot` | rotor_semi | 1 |
| r1c1 pinwheel | `rot`, `rounded` | four-vertex driver | per-blade |
| r3c3 windmill | `rot`, `scale` | group node at center | 3 |
| r1c5 target | `rot45` | ring1 + ring3 | 2 |

---

## windmill: drive the group, not the blades

The plan called for twelve binds, three transforms on each of four blades, every
blade origin dragged to (60,60) by hand. The group `r3c3_windmill` was anchored at
(60,60) instead, so the whole windmill drives off the group node: rotation on key
15, scale on keys 16 and 17, three binds. All four blades share the center, so
turning and shrinking the group about (60,60) lands exactly where twelve per-blade
transforms would. Twelve became three, and there was one origin to trust instead
of five.

The move works because the pieces share a center and nothing static sits between
them. The target is where that second condition fails.

## target: per-ring, because z-order forbids the shortcut

Four concentric squares. ring1 and ring3 turn 45 degrees into diamonds; ring0 and
ring2 hold as squares. The tempting shortcut is to group the two movers and drive
the group, the windmill move again. It breaks the picture: ring2 renders between
ring1 and ring3, so pulling the movers into one group stacks them together and
ring2 loses its place in the pile. So ring1 and ring3 bind Rotation to `rot45`
each, two binds, no reparenting. Their local origins already sit at (0,0) inside
the group at (60,60), so each turns about the center on its own.

The rule the two tiles draw between them: drive the group when the movers share a
center and no static piece interleaves their depth. Otherwise bind per piece.

---

## The two unit rules

A data-bound transform does not carry Rive's raw storage value. It carries the
number the editor shows in its inspector. Both surprises this session came from
that gap.

**Scale is percent.** Bind a ViewModel number to ScaleX or ScaleY and the runtime
reads it as a percentage: 100 is full size, 41 is 41 percent. The windmill first
rested at `scale = 1` and the blades vanished. One bound to one percent, a
sub-pixel dot. The channel carries `100.0 - 59.0 * progress` now, full to 41, and
`init` seeds 100 before the first draw so frame 0 is the four blades at rest, not a
blank square.

**Rotation is degrees, because Rive inserts a converter.** Bind a number to a
rotation and Rive attaches a degrees-to-radians converter to that bind on its own.
The channel is degrees from then on: 45 turns 45, 90 turns 90. r1c5 rested at
`0.785398` (the radian value for 45 degrees) and the ring moved 0.79 degrees, a
twitch. `rot45 = 45.0 * progress` turns the full quarter. The pinwheel took the
other road: its converter was removed by hand, so its bind carries raw radians and
`3.14159` reads as pi. Two valid setups. Keep the converter and feed it degrees, or
remove it and feed it radians. The tile has to know which it is.

The windmill carried the same latent error, `rot = 1.5708`, a 1.57 degree turn
hidden under a shrink to 41 percent that was doing all the visible work. It reads
`90.0 * progress` now.

---

## The clean-typing lesson

The first windmill script compiled and ran, and it filled the console: ten Luau
type errors on every `.value` write. The cause was untyped function parameters.
The Node protocol expects `init(self: Tile, context: Context): boolean` and
`advance(self: Tile, seconds: number): boolean`. Left untyped, Luau infers `self`
from the factory table where every field is `nil`, so a write to `self.rot.value`
has nowhere to land. Annotating the two signatures clears all ten. The bytecode was
fine either way. The noise was not.

---

## What the MCP did, and the one hand step

Through the MCP, per tile: added the ViewModel numbers, created the typed script,
created and bound the instance, wired the transform binds, recompiled to clean
diagnostics. The step it cannot take is the same one every tile leaves for the
editor: placing the Script node on the artboard and assigning it. A node exposes
transform slots and no script slot, so that one is done by hand.

---

## Open threads

- **r1c6 `circleScale`.** It rests at 1.0 and binds to scale. By the percent rule
  that is one percent at frame 0, a collapsed circle until `progress` climbs. Worth
  a live scrub against the finding.
- **rotor and pinwheel rotation.** Their disk scripts still hold radian values.
  That is correct only if their rotation converters were removed. pinwheel's was.
  rotor should be confirmed the same way, by eye, on a scrub.

---

## Where the record lives

- This file, the batch closeout.
- `public/riveTiles/t1/T1_BUILD.md`, the per-tile channel and bind tables, updated
  with both unit rules.
- Memory `graphic-system-grid-node-driver`, the display-units finding and the
  group-versus-per-piece rule, for the T2 and T3 builds.

Four tiles at rest, `progress` on zero. Scrub the number to one and the rotor
sweeps its half-turn, the pinwheel rounds and spins, the windmill quarters and
folds inward, and the target opens two diamonds inside two squares.
