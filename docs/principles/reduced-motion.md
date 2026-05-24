# Reduced Motion

The system must meet the user where they are. Accessibility is a design constraint that improves the whole system. Reduced motion is not a fallback, it is a first-class state: durations flatten, delays drop, and the interface communicates the same information without requiring the user to process continuous movement.

Architecture decision for the global wiring: `docs/decisions/reduced-motion-2026-05-06.md`.

## UI demonstration

A "Reduce" toggle sits below a Run button, a ProgressBar, and a compact Card. Click Run: Card lifts and ProgressBar fills smoothly. Toggle Reduce on, reset, then Run: both snap to their end states in ~10 ms. The demo's local toggle is the single source of truth for motion within the scoped provider. The OS preference does not override inside the demo, so both states are visible regardless of the user's actual setting.

## Icon

`/public/rive/principles_icon17.riv`, state machine `reducedMotionIconSM`. Wired in `PrincipleIcon` as principle 17.

## Tokens used

All tokens, conditional. Durations flatten to 0.01 s, delays to 0. Easing and scale remain unchanged because they are not perceived at near-zero duration.
