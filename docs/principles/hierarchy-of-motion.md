# Hierarchy of Motion

One element's animation drives another. Authority flows from parent to child. In traditional animation, this is the conductor and the orchestra: the conductor's gesture initiates, and every section responds in sequence. Reverse the hierarchy and the music breaks down. In UI animation, the same logic applies to container and content. A parent element moves, and its children follow with cascading delays. The delays are the hierarchy made visible.

## UI demonstration

The expanded card renders a PARENT pill above three indented CHILD rows, drawn as a vertical tree using `└` glyphs so the hierarchy reads before any click. Click the parent: all four elements translate `x: 24px` with `duration.base` and `ease.standard`. The parent has no delay; the three children use `delay.short` / `delay.medium` / `delay.long` from the active token set, producing a visible cascade. Authority flows downward. Children are not interactive. Only the parent has authority to initiate motion.

## Animation

`/public/rive/hierarchyofmotion.riv`, state machine `hierarchyOfMotionSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 14.

## Icon

`/public/rive/principles_icon14.riv`, state machine `hierarchyOfMotionSM`. Wired in `PrincipleIcon` as principle 14.

## Tokens used

`duration.base`, `ease.standard`, `delay.short`, `delay.medium`, `delay.long`.
