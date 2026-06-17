# Slow In and Slow Out

Objects accelerate from rest and decelerate to rest. Nothing starts or stops instantly. In traditional animation, this meant drawing more frames near the beginning and end of an action, fewer in the middle. In UI animation, the easing curve is the principle itself. Linear motion feels mechanical. Ease.standard feels physical.

## UI demonstration

The expanded card renders a ProgressBar with a fill animation that decelerates as it approaches its target. A `Tokens` / `Linear` toggle below the bar swaps the fill curve at the same duration: `Tokens` follows the curve held in the controls panel (`ease.standard`), `Linear` overrides it with `ease.linear`. The contrast is the lesson: identical timing, different curve, categorically different character. The toggle drives `easeOverride`, an optional prop on ProgressBar; when omitted elsewhere the component keeps its directional `ease.standard` / `ease.exit` behavior, so TokenLab and the P04 Stepper are untouched.

When the user opens the UI view, or returns the toggle to `Tokens`, the demo flashes the controls panel's "Tokens" title once. This draws the thread between the toggle word and where the value originates. The flash uses a dedicated `--feedback-flash-duration` (a fixed 3s, decoupled from the editable `--motion-*` tokens so an Explore-mode edit cannot shrink it to an imperceptible blink) and holds statically under `prefers-reduced-motion`.

## Animation

`/public/rive/slowinslowout.riv`, state machine `slowInSlowOutSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 6.

## Icon

`/public/rive/principles_icon06.riv`, state machine `slowInSlowOutIconSM`. Wired in `PrincipleIcon` as principle 6.

## Tokens used

`ease.standard`, `ease.linear` (comparison), `duration.slow` (fill animation).
