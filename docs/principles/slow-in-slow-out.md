# Slow In and Slow Out

Objects accelerate from rest and decelerate to rest. Nothing starts or stops instantly. In traditional animation, this meant drawing more frames near the beginning and end of an action, fewer in the middle. In UI animation, the easing curve is the principle itself. Linear motion feels mechanical. Ease.standard feels physical.

## UI demonstration

The expanded card renders a ProgressBar with a fill animation that decelerates as it approaches its target. A toggle below the bar lets the user switch between `ease.standard` and linear, side by side against the same duration. The contrast is the lesson: identical timing, different curves, categorically different character.

## Animation

`/public/rive/slowinslowout.riv`, state machine `slowInSlowOutSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 6.

## Icon

`/public/rive/principles_icon06.riv`, state machine `slowInSlowOutIconSM`. Wired in `PrincipleIcon` as principle 6.

## Tokens used

`ease.standard`, `ease.linear` (comparison), `duration.slow` (fill animation).
