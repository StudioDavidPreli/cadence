# Token Fidelity

Animation values defined in a system should be used as intended. Deviation produces visible wrongness. In traditional animation, a character drawn with two left hands is not a style choice, it is an error in the reference. In UI animation, a component using a hardcoded duration instead of the system token reads as incongruous before the viewer consciously identifies why. The motion is showing you a system problem.

## UI demonstration

Three identical pills stacked vertically. Click Run: top and bottom translate 40 px with `duration.base` and `ease.standard`. The middle pill defaults to a hardcoded 600 ms linear, a value not in the token set. It arrives later and slides at constant velocity, reading as mechanical. The "harmonize" toggle swaps the middle pill's transition to the system pair. On the next Run, the three move in lockstep.

## Icon

`/public/rive/principles_icon16.riv`, state machine `tokenFidelityIconSM`. Wired in `PrincipleIcon` as principle 16.

## Tokens used

`duration.base`, `ease.standard` (and the deliberate absence of both on the deviant pill).
