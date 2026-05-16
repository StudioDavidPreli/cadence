# Timing

The number of frames determines weight and personality. More frames means heavier, slower. Fewer frames means lighter, snappier. In traditional animation, timing was the single most expressive variable: the same arc, the same spacing, read as a bowling ball or a balloon depending solely on how many drawings filled the interval. In UI animation, duration tokens carry this entire argument. The same Toggle interaction at 100 ms feels decisive. At 400 ms it feels considered. At 800 ms it feels sluggish. Same motion, different character.

## UI demonstration

The expanded card renders two Toggles, each scoped to a different motion preset via `MotionTokensProvider`. One runs at the Default preset's duration values, the other at Cinematic. The user flips both and perceives the character shift directly. No easing difference, no path difference. Duration alone changes the personality.

## Animation

`/public/rive/timing.riv`, state machine `timingSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 9.

## Icon

`/public/rive/principles_icon09.riv`, state machine `timingSM`. Wired in `PrincipleIcon` as principle 9.

## Tokens used

`duration.fast`, `duration.base`, `duration.slow` (comparison across presets).
