# Staging

A spotlight does two things at once: it lights the actor and it darkens everything else. Staging is the darkening as much as the lighting. The principle is about presenting one idea clearly enough that the eye cannot land anywhere else, which means clearing the stage before the performance begins. In an interface the stage is the whole screen, and the cheapest way to clear it is to dim it.

## UI demonstration

The expanded card renders the Modal from a scoped demo. A trigger opens it: the backdrop fades from transparent to `0.8` opacity, darkening the page, while the panel rises from `scale 0.96` to `1` at the center. Both run on `ease.enter` at `duration.slow`, a deceleration that arrives gently rather than snapping. The dim is not decoration. It is the stage being cleared so the panel is the only thing left to look at.

## Animation

`/public/rive/staging.riv`, state machine `stagingSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 3.

## Icon

`/public/rive/principles_icon03.riv`, state machine `stagingIconSM`. Wired in `PrincipleIcon` as principle 3.

## Tokens used

`duration.slow` (backdrop and panel enter), `ease.enter` (the gentle deceleration into rest).
