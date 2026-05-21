# Exaggeration

Amplifying an action beyond reality to clarify or heighten its emotional truth. In traditional animation, exaggeration is not distortion for its own sake. It is caricature: the essential quality of a gesture, pushed past physical accuracy until it communicates at a glance. A surprised character's eyes widen past anatomical possibility because surprise IS the widening. In UI animation, the same logic applies to scale and spring overshoot. A notification badge that scales to exactly 1.0 on increment registers as a state change. One that overshoots to 1.1 and settles back registers as an alert. The overshoot is the meaning.

## UI demonstration

The expanded card renders a NotificationBadge with two triggers: New (increment) and Clear (reset to zero). Each increment re-keys the badge so Framer Motion's enter animation fires: `initial: { scale: tokens.scale.expressive }` (0.9) to `animate: { scale: 1 }` with `tokens.ease.spring`. The compress comes from the initial value. The overshoot above 1 comes from the spring bezier (0.34, 1.56, 0.64, 1). Two motion sources combine into one alert.

## Animation

`/public/rive/exaggeration.riv`, state machine `exaggerationSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 10.

## Icon

`/public/rive/principles_icon10.riv`, state machine `exaggerationIconSM`. Wired in `PrincipleIcon` as principle 10.

## Tokens used

`scale.expressive`, `ease.spring`, `duration.fast`.
