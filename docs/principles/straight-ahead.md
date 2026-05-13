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

`duration.base`, `ease.standard`, `delay.short`, `delay.medium`, `delay.long` (Stepper cascade). `duration.slow` (ProgressBar fill).
