# Appeal

The quality that makes an audience want to watch. Charm, clarity, magnetism. In traditional animation, appeal was not beauty. A villain had appeal. A monster had appeal. Appeal was the quality that held the eye, that made the viewer lean in rather than look away. It emerges from the other eleven principles working in concert: timing gives weight, easing gives smoothness, follow-through gives life. Remove any one and the character loses something unnameable. In UI, appeal is what happens when the full token system is tuned and coherent. A grid of components that drift, settle, respond to selection, dim on deselection, and return to rest with perfectly calibrated easing becomes mesmerizing. Not because any single transition is remarkable, but because no transition is wrong.

## UI demonstration

A 2x2 grid of compact Cards with ASCII faces. The grid drifts continuously when nothing is selected (ambient y-axis oscillation with per-card phase offsets so the four never sync). Selecting any card freezes the drift, dims the unselected siblings (scale.pressSubtle + opacity 0.55), and lifts the selected card (scale.lift). All tokens work together: `duration.slower` drives the drift cycle, `duration.base` drives the settle/dim/lift, `ease.standard` smooths the neutral states, `ease.overshoot` marks selection.

## Animation

`/public/rive/appeal.riv`, state machine `appealSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 12.

## Icon

`/public/rive/principles_icon12.riv`, state machine `appealIconSM`. Wired in `PrincipleIcon` as principle 12.

## Tokens used

All tokens in concert.
