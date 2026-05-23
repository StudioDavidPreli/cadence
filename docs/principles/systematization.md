# Systematization

Parts integrate into a coherent whole. The system is legible because its parts follow rules. In traditional animation, a face is recognizable because every feature knows what every other feature is doing: the mouth widens, the cheeks rise, the eyes narrow, and none of these decisions happen in isolation. In UI animation, the same logic applies at the token level. When every component reads its duration from the same token set, a single change retimes the whole system proportionally. One slider moves. Every component responds. The system has one voice.

## UI demonstration

The expanded card renders a Tempo slider driving a scoped `MotionTokensProvider` whose duration tokens are scaled by the slider value. Three components stack vertically: Toggle (`duration.fast`), compact Card (`duration.base`), ProgressBar (`duration.slow`). All share a single `running` boolean. Click any trigger, the other two follow at their own native token speeds. Drag the slider, every component retimes proportionally. The delay tokens stay proportional, the easing stays untouched. The principle is temporal coherence, not curve shape.

## Animation

`/public/rive/systematization.riv`, state machine `systematizationSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 13.

## Icon

`/public/rive/principles_icon13.riv`, state machine `systematizationIconSM`. Wired in `PrincipleIcon` as principle 13.

## Tokens used

The whole token set (duration family scaled proportionally by the Tempo slider).
