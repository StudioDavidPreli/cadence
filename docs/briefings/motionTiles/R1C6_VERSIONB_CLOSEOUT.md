# r1c6 "inscribe" — Version B Closeout

**Date:** 2026-07-09
**Closes:** the Version B probe for the graphic-system r1c6 tile, the test build
that corrected an earlier one which mistook the Token Lab ingredient r1c6 for
this one.
**Result:** Phase 0 green. A per-tile Node script reads eased `progress` from the
bound ViewModel every frame and drives a VM-bound scale, live, on scrub. Both
probes pass.

---

## The question, answered

Does the editor run a per-frame Luau hook when `progress` is scrubbed, so a
per-tile script can read eased progress and write a scale the circle binds to? Or
does the hook stay dark on a static scrub, leaving the circle at rest?

It runs. Scrubbing `progress` to 100 pushed `circleScale` to 651, exactly
`1 + 6.5 * 100`, and the blue circle grew with it. Set `progress` to 1.0 and
`circleScale` lands at 7.5 on the money: r4 to r30, the circle inscribed in the
60 px square. The per-frame hook fires (probe 1), and the write reaches the bound
transform the same frame with no trailing lag (probe 2). Version B is alive.

That answers the go/no-go the tile was built to be. One animated property, one
channel, two binds, and it moves.

---

## The correction that made it work

The probe script in the briefing would not have run as written. Two errors, one
surprise:

- **Wrong return shape.** The briefing returned the module table directly
  (`return { init = init, update = update }`). A Node script has to return a
  factory: `return function(): Node<InscribeNode>`. The runtime calls the factory
  to build each instance.
- **Wrong per-frame hook.** The briefing used `update` for the per-frame work.
  `update(self)` fires only when an input value changes. The per-frame hook is
  `advance(self, seconds)`, and it returns `true` to keep receiving ticks. The
  write belongs there.
- **The surprise:** `context:viewModel()` was right all along. It is a real
  `Context` method that returns the ViewModel bound to the node's data context.
  The briefing doubted the part that held.

The corrected pattern is now the template for all 16 tiles:

```lua
type InscribeNode = { vm: ViewModel?, progress: Property<number>?, circleScale: Property<number>? }

function init(self, context)
  local vm = context:viewModel()
  if vm then
    self.vm = vm                              -- held so it is not collected after init
    self.progress = vm:getNumber('progress')
    self.circleScale = vm:getNumber('circleScale')
  end
  return true
end

function advance(self, seconds)               -- the per-frame hook, not update
  if self.progress and self.circleScale then
    self.circleScale.value = 1.0 + 6.5 * self.progress.value
  end
  return true
end

return function(): Node<InscribeNode>         -- the factory the briefing was missing
  return { vm = nil, progress = nil, circleScale = nil, init = init, advance = advance }
end
```

---

## What the MCP did, and where the hand had to

The second report-back question was whether the MCP can add ViewModel
properties. It can. Both `progress` and `circleScale` went on `ViewModel1`
through `addProperties`, no hand-templating.

Through the MCP, on artboard `r1c6` (0-2):

- Added VM numbers `progress` (0-31) and `circleScale` (0-33) to `ViewModel1`
  (0-14).
- Created the corrected script `tiles/r1c6` (0-1513). Compiles clean, no
  diagnostics.
- Bound instance `Instance` (0-15) to the artboard.
- Bound `accent_circle` (0-19) Scale X (key 16) and Scale Y (key 17) to
  `circleScale`.
- Set the resting `circleScale` to 1.0 so a script that never runs leaves a
  visible r4 circle. `circleScale` defaults to 0, and a bind to 0 collapses the
  circle to nothing, not to pose A. Resting at 1.0 makes the fail-off state the
  obvious-wrong r4 the design wants, not an empty frame.

The one step the MCP could not take: attaching the script module to a node. The
node and artboard expose transform properties only, no script slot, so placing
the Script node and assigning `tiles/r1c6` is a hand step in the editor. So is
confirming the circle's origin sits at its own center, which the bind-key list
does not fully report.

---

## The caveat this does not clear

Version B is one `advance`-driven script per tile. That is the same shape the
cascade closeout named as the perf cost: the per-instance Luau driver David
already pulled in favor of one React clock over no-driver `.riv` files. Phase 0
proves the per-tile script is correct for a single tile. It says nothing about 16
or 36 of them ticking `advance` every frame at once.

The path that would clear it is not a scripted converter. That fires on every
source change, so it ticks as often as `advance` while `progress` animates, and
the clock rewrites `progress` every frame. The path that clears it is a built-in
bind converter with no script, evaluated in the runtime's native binding pass.
That is the no-driver direction the ingredient cascade already ships, and it
stays open for the 16-tile rollout.

---

## The converter comparison, resolved

The `Converter` variant was built (`convert(p) = 1 + 6.5*p`) and run against the
script. In the editor they draw the same pose. One difference showed at frame 0:
the script left the circle collapsed while the converter drew it. The script
writes `circleScale` in `advance`, and the f0 write lands after the first draw.
The converter computes the value inside the binding pass, so f0 is right by
construction. Seeding `circleScale` in the script's `init`, computed once from the
initial `progress` before the first draw, closed the gap. f0 now lands r4 clean.

That settles it. Same result either way once the seed is in. The converter's
remaining edges are structural: it needs no init patch to draw f0, and it does
nothing while `progress` holds still, where the script keeps ticking `advance`.
For a continuously cascading grid, idle time is near zero, so that second edge is
small, and during motion neither escapes per-instance Luau: the clock rewrites
`progress` every frame, so `convert` fires as often as `advance`. The converter
also costs a hand step the MCP cannot take, creating the DataConverter object that
wraps it, while the script places and wires end to end. Script chosen: same
result, simpler setup, first frame fixed. The 36-instance perf gap was not
measured, so the choice rests on setup and f0 correctness, not on numbers.

The scripted converter was removed from the file once the comparison was done.

---

## What is deferred

**The 16-tile emit.** Phase 0 green clears the way to generate pose-A SVGs and
channel/bind plans for the whole graphic-system sheet from the generator. One
caveat rides along: the linear tiles (`diagonal-cascade`, `grid-dissolve`, the
ripple and sonar orderings) read raw phase, not the driver's eased progress.
Their tile scripts take a linear phase input. `inscribe` is eased, so it was
clean here.

---

## Where the record lives

- This file — the build brief, the API correction, the green result, the perf
  caveat.
- Memory `ingredient-grid-cascade-architecture` — the per-instance-driver perf
  cost this caveat points back at.

The file rests at `progress` 0, the circle at r4. Scrub the number to one and it
fills the square.
