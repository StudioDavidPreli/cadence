# Arc

Natural movement follows curved paths, not straight lines. A ball thrown across a room traces a parabola. A hand reaching for a glass sweeps an arc, not a ruler-straight diagonal. In traditional animation, arcs give motion its organic quality: the eye reads a straight-line translation as mechanical, a curved one as physical.

In UI, the principle surfaces wherever an element travels between two points. A tooltip that rises straight up from its trigger reads as a notification, something pushed into view by the system. A tooltip that arcs into position reads as an answer, something arriving with the spatial memory of where it came from. The curve implies a relationship between origin and destination that a straight path erases.

Cadence demonstrates this with a Tooltip component. The bubble travels from below-right of its resting position through a midpoint above it before settling. Three keyframes define the path: start, apex, rest. Two keyframes would produce a straight line with eased speed, the path itself still flat. The third keyframe bends the trajectory, and that bend is the principle.

Tokens: `duration.base`, `ease.enter`.
