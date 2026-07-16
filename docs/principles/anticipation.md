# Anticipation

Before a pitcher throws, the arm goes back. Before a jump, the knees bend. The motion that matters is preceded by a smaller motion in the opposite direction, and the eye reads the windup as the cause of what follows. Take the windup away and the throw looks like a glitch: correct in its endpoint, wrong in its origin. Anticipation is the difference between an action that happens and an action that is caused.

## UI demonstration

The expanded card renders the scoped Drawer from Token Lab's Enter & Exit demo. An "Open drawer" trigger sends it up from the bottom edge; it rises past its mark by a few percent and settles on `ease.enter`. The countermotion lives on the exit: close the drawer and the panel lifts in the first fifth of the clock, then accelerates down and away on `ease.exit`. Both directions share `duration.slow`. The keyframes carry the reverse travel, the curves carry the character, and the drawer states its intent before it leaves.

## Animation

`/public/rive/anticipation.riv`, state machine `anticipationSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 2.

## Icon

`/public/rive/principles_icon02.riv`, state machine `anticipationIconSM`. Wired in `PrincipleIcon` as principle 2.

## Tokens used

`duration.slow` (both directions), `ease.enter` (the arrival and settle), `ease.exit` (the lift, then the leave).
