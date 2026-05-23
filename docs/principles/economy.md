# Economy

The minimum motion needed to communicate the intended meaning. In traditional animation, three layers of parallax suggest an entire world. Thirty layers just suggest thirty layers. The principle is restraint: every motion element earns its place by what it communicates, and motion added to empty time communicates nothing. In UI animation, economy means choosing the smallest set of properties and the fewest moving parts that produce the intended depth or spatial relationship.

## UI demonstration

The expanded card renders three horizontal bars stacked vertically. Click Pan: all three translate `x: 40px` simultaneously, but each bar reads a different duration token (slow, base, fast), so the front bar arrives first and the back bar arrives last. Opacity (0.4 / 0.7 / 1.0) communicates depth without stacking order or shadow. Three layers, three speeds, three opacities: the smallest set of moves that produces depth.

## Animation

`/public/rive/economy.riv`, state machine `economySM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 15.

## Icon

`/public/rive/principles_icon15.riv`, state machine `economyIconSM`. Wired in `PrincipleIcon` as principle 15.

## Tokens used

`duration.slow`, `duration.base`, `duration.fast`, `ease.standard`.
