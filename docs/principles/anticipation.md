# Anticipation

Before a pitcher throws, the arm goes back. Before a jump, the knees bend. The motion that matters is preceded by a smaller motion in the opposite direction, and the eye reads the windup as the cause of what follows. Take the windup away and the throw looks like a glitch: correct in its endpoint, wrong in its origin. Anticipation is the difference between an action that happens and an action that is caused.

## UI demonstration

The expanded card renders the scoped Drawer from Token Lab's Enter & Exit demo. An "Open drawer" trigger sends it up from the bottom edge, but the panel first dips a few pixels downward before it climbs. That dip is the countermotion. It runs on `ease.spring` at `duration.base`, so the reverse travel and the overshoot at the top come from the same curve. The drawer announces itself before it arrives.

## Animation

`/public/rive/anticipation.riv`, state machine `anticipationSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 2.

## Icon

`/public/rive/principles_icon02.riv`, state machine `anticipationIconSM`. Wired in `PrincipleIcon` as principle 2.

## Tokens used

`duration.base`, `ease.spring` (the dip and the overshoot share one curve).
