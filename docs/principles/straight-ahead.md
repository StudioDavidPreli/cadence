# Straight Ahead and Pose to Pose

Two approaches to building motion sequences. Straight ahead: each frame flows from the last, producing continuous, unpredictable movement. Pose to pose: key states are defined first, then the system interpolates between them.

In UI animation, pose to pose is the dominant pattern. Framer Motion variants, CSS keyframes, and design token presets all define discrete states and let the engine fill the gaps. The designer controls the poses. The system controls the in-betweens.

## UI demonstration

The expanded card renders a compact Stepper above a ProgressBar, both driven by a single `step` counter. Clicking Next advances the counter; the Stepper marks the four key poses while the ProgressBar fills the continuous space between them. Two visualizations of the same advance: one discrete, one continuous.

## Animation

`/public/rive/pose2pose.riv`, state machine `pose2poseSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 4.

## Icon

`/public/rive/principles_icon04.riv`, state machine `pose2poseIconSM`. Wired in `PrincipleIcon` as principle 4.

## Tokens used

`duration.slow` (Stepper beat 1, the checkmark, and beat 2, the connector fill; also the ProgressBar fill), `duration.fast` (the step number swapping out), `ease.standard` (the connector fill, and the ProgressBar's forward curve), `delay.short` (the gap between beat 1 and beat 2). Beat 3's `delay.medium` and `ease.enter` are still read in compact mode but drive the label and description, which the card hides; `delay.long` reaches only the completion overlay, which compact does not mount. The Stepper reads `duration.base` nowhere (corrected 2026-09-15; the line had said `base` since the card was built).
