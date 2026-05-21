# Solid Drawing

Understanding three-dimensional form, weight, and balance even in 2D. In traditional animation, solid drawing meant the character retained volume and structure across frames. A turning head still had depth. A bending arm still had mass. The principle translated two-dimensional marks into the perception of three-dimensional bodies. In UI, the z-axis is implied through scale and shadow. A selected card that grows 2% and gains a deeper shadow is not merely highlighted. It has come forward. The surface it was embedded in is now behind it. That spatial relationship is solid drawing applied to interface design.

## UI demonstration

The expanded card renders a Card component centered in the demo frame with 16 px margin on all sides so the lift reads against empty space. Clicking the card toggles `isSelected`, which triggers `scale.lift` (1.02) with `duration.base` and `ease.standard`. The small grow and the accompanying shadow shift produce the perception of elevation: the card is no longer on the page, it is above it.

## Animation

`/public/rive/solid-drawing.riv`, state machine `solidDrawingSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 11.

## Icon

`/public/rive/principles_icon11.riv`, state machine `solidDrawingIconSM`. Wired in `PrincipleIcon` as principle 11.

## Tokens used

`scale.lift`, `duration.base`, `ease.standard`.
