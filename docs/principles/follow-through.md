# Follow Through and Overlapping Action

When a runner stops, the body halts but the hair keeps going. A coat swings forward, a ponytail lifts, an antenna whips and settles. Those are the parts the main action drags along, and they stop late because they have their own mass. Follow through is that trailing motion; overlapping action is the parts arriving at different times rather than in lockstep. A system that stops everything on the same frame reads as weightless.

## UI demonstration

The expanded card renders the Carousel from Token Lab's Gesture demo in `compact` mode, text only. Flick or drag to a new slide and it snaps into place on a real physics spring: the slide carries past its target and eases back, and that overshoot is the follow through, momentum spending itself against the rest position. The dot indicator springs on the same transition, so the slide and its indicator move as one control and overshoot together.

Earlier the dot trailed on its own CSS clock, a beat behind the slide, and that lag was the overlapping action. Harmonizing it onto the slide's spring (2026-07-20) trades the lag for a unified settle, so the demonstration now leads with follow through rather than overlap. Under reduced motion the snap falls back to the flattened overshoot bezier, so the card respects the OS setting like every other demo.

## Animation

`/public/rive/follow-through.riv`, state machine `followThroughSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 5.

## Icon

`/public/rive/principles_icon05.riv`, state machine `followThroughIconSM`. Wired in `PrincipleIcon` as principle 5.

## Tokens used

`spring.stiffness`, `spring.damping`, `spring.mass` (the snap and the dot, one shared spring). Under reduced motion the snap falls back to `duration.slow` on `ease.overshoot`, flattened like the rest of the UI.
