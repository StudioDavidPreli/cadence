# Exaggeration

Amplifying an action beyond reality to clarify or heighten its emotional truth. In traditional animation, exaggeration is not distortion for its own sake. It is caricature: the essential quality of a gesture, pushed past physical accuracy until it communicates at a glance. A surprised character's eyes widen past anatomical possibility because surprise IS the widening. In UI animation, the same logic applies to scale and spring overshoot. A notification badge that scales to exactly 1.0 on increment registers as a state change. One that overshoots to 1.1 and settles back registers as an alert. The overshoot is the meaning.

## UI demonstration

The expanded card renders a NotificationBadge with two triggers: New (increment) and Clear (reset to zero). Each increment re-keys the badge so Framer Motion's enter animation fires: the pill starts at `tokens.scale.pressExpressive` (0.9), launches through a peak of 1.2 on `tokens.ease.overshoot`, holds there, then settles to 1 on `tokens.ease.standard`, all inside one `tokens.duration.slow` window. The compress is system-correct. The peak is a hand-tuned keyframe above any scale token, and that violation is the point: exaggeration is the system going past its own rules to signal intensity.

## Animation

`/public/rive/exaggeration.riv`, state machine `exaggerationSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 10.

## Icon

`/public/rive/principles_icon10.riv`, state machine `exaggerationIconSM`. Wired in `PrincipleIcon` as principle 10.

## Tokens used

`scale.pressExpressive`, `ease.overshoot`, `duration.slow`.
