# Follow Through and Overlapping Action

When a runner stops, the body halts but the hair keeps going. A coat swings forward, a ponytail lifts, an antenna whips and settles. Those are the parts the main action drags along, and they stop late because they have their own mass. Follow through is that trailing motion; overlapping action is the parts arriving at different times rather than in lockstep. A system that stops everything on the same frame reads as weightless.

## UI demonstration

The expanded card renders the Carousel from Token Lab's Gesture demo in `compact` mode, text only. Flick or drag to a new slide and it snaps into place, but the dot indicator catches up a beat behind it. That lag is the overlapping action. The dot runs on a CSS transition rather than the slide's spring, so it is not pinned to the slide's timing; the two move on their own clocks and the dot trails. The slide arrives, then the dot admits it arrived.

## Animation

`/public/rive/follow-through.riv`, state machine `followThroughSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 5.

## Icon

`/public/rive/principles_icon05.riv`, state machine `followThroughIconSM`. Wired in `PrincipleIcon` as principle 5.

## Tokens used

`duration.slow`, `ease.overshoot` (the slide snap). The dot indicator trails on its own CSS transition so the lag survives alongside the snap.
