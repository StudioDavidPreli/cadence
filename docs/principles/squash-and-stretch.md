# Squash and Stretch

A rubber ball flattens against the floor and stretches as it climbs away. Its volume never changes; only its shape gives. That deformation is what tells the eye the ball has weight and the floor is hard. In UI animation the gesture shrinks to a press: an element compresses under the cursor and springs back when it lifts. The travel is a few percent of scale. The sense of weight is the whole point.

## UI demonstration

The expanded card renders the Button from Token Lab's Press & State demo, the same component the user has already met. Pressing it scales down to `scale.base` and releases on `ease.spring`, a curve that overshoots past rest before settling. The overshoot is the stretch: the button does not just return, it springs. `duration.fast` keeps the whole exchange inside the window of a real click.

## Animation

`/public/rive/squash-stretch.riv`, state machine `squash&stretchSM` (the literal `&` is intentional). View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 1.

## Icon

`/public/rive/principles_icon01.riv`, state machine `squash&stretchIconSM`. Wired in `PrincipleIcon` as principle 1.

## Tokens used

`scale.base` (compression on press), `duration.fast` (press feedback), `ease.spring` (the overshoot on release).
