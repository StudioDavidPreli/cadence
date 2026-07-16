# Principles Library — Reference Document

> **Historical note (2026-07-16):** the placeholder strategy and Phase 6 are
> completed history, and the two drifted State 2 specs (P12, P15) carry
> as-built corrections inline. The principle-to-component mapping remains
> authoritative; `docs/principles/*.md` is the as-built record per principle.

For Claude Code: read this before building any Principles 
Library component. This document defines the scope, 
structure, and content of the Principles Library section 
of Cadence.

---

## Structure

Each principle is a card in a responsive grid. Cards have 
two states toggled by a button:

State 1 — Principle demonstration
A placeholder animation showing the principle in its 
original animation context. For the build phase, 
placeholders use simple SVG shapes with Framer Motion 
animation. Rive illustrations will replace these 
post-launch.

State 2 — UI component example  
The same principle demonstrated through a real UI 
component from the Cadence component library. 
Token-driven, interactive, connected to the Token Lab.

---

## The 18 Principles — Complete Mapping

### Classic 12 (Disney)

01 Squash and Stretch
Definition: Objects compress on impact and stretch on 
release, implying weight and flexibility.
UI application: Press interactions. The element 
physically responds to force.
State 1 placeholder: Bouncing circle that squashes 
on ground contact and stretches on rise.
State 2 component: Button (whileTap scale compression, 
spring release)
Tokens: scale.base, duration.fast, ease.spring

02 Anticipation
Definition: A small movement opposite to the main 
action prepares the viewer for what is coming.
UI application: Elements that dip or pull back before 
entering. Prepares the user's eye.
State 1 placeholder: Circle that pulls back before 
launching forward.
State 2 component: Drawer (slight negative y before 
positive y entrance)
Tokens: duration.base, ease.spring

03 Staging
Definition: Directing attention to what matters. 
Clearing the stage before the performance.
UI application: Modals and overlays. The backdrop 
dims everything except the focal element.
State 1 placeholder: Multiple shapes that fade to 
background while one steps forward.
State 2 component: Modal/Dialog (backdrop overlay, 
focus containment)
Tokens: duration.slow, ease.enter

04 Straight Ahead and Pose to Pose
Definition: Two approaches — frame by frame vs. 
key poses with fills between.
UI application: Steppers define key states (poses). 
Progress bars fill between them (straight ahead).
State 1 placeholder: Two animations side by side — 
one continuous, one jumping between key frames.
State 2 component: Stepper advancing to completion 
triggers a dialog containing Progress Bar completing 
to 100%.
Tokens: duration.slow, delay.short, delay.medium

05 Follow Through and Overlapping Action
Definition: Not everything stops at the same time. 
Secondary elements continue past the primary action.
UI application: Carousel snap with dot indicator 
following through independently.
State 1 placeholder: A shape stops while an 
attached tail continues and settles.
State 2 component: Carousel (slide snap + dot 
indicator with offset spring)
Tokens: duration.base, ease.spring

06 Slow In and Slow Out
Definition: Objects accelerate from rest and 
decelerate to rest. Nothing starts or stops instantly.
UI application: The easing curve is the principle. 
Linear feels mechanical. Ease.standard feels physical.
State 1 placeholder: Two balls rolling — one linear, 
one with ease.standard. Side by side comparison.
State 2 component: Progress Bar (fill animation 
decelerates approaching target)
Tokens: ease.standard vs ease.linear comparison, 
duration.slow

07 Arc
Definition: Natural movement follows curved paths, 
not straight lines.
UI application: Tooltips appear in spatial relation 
to their trigger, curving into position.
State 1 placeholder: Circle moving from A to B — 
one on a straight path, one on a curved arc.
State 2 component: Tooltip (arc entrance from 
trigger point)
Tokens: duration.fast, ease.enter

08 Secondary Action
Definition: A supporting action that reinforces 
the main action without competing with it.
UI application: Dropdown chevron rotating as the 
menu opens. Supports without distracting.
State 1 placeholder: A main shape moves while a 
smaller attached shape responds in a supporting role.
State 2 component: Dropdown (chevron rotation as 
secondary to menu open)
Tokens: duration.fast, ease.standard

09 Timing
Definition: The number of frames determines weight 
and personality. More frames = heavier, slower.
UI application: The same toggle interaction at 
different durations feels categorically different.
State 1 placeholder: Three identical shapes 
animating — slow, medium, fast. Same motion, 
different character.
State 2 component: Toggle (subtle vs expressive, 
duration slider changes character)
Tokens: duration.fast, duration.base, duration.slow 
comparison

10 Exaggeration
Definition: Amplifying an action beyond reality 
to clarify or heighten its emotional truth.
UI application: Notification badge count bounces 
beyond its target scale before settling.
State 1 placeholder: A shape overshoots its 
target dramatically before settling.
State 2 component: Notification Badge (count 
increment with scale overshoot)
Tokens: scale.expressive, ease.spring, duration.fast

11 Solid Drawing
Definition: Understanding three-dimensional form, 
weight, and balance even in 2D.
UI application: Scale and elevation imply the 
z-axis. Selected elements appear to come forward.
State 1 placeholder: A flat shape gains apparent 
depth through scale, shadow, and z-axis cues.
State 2 component: Card (scale.lift on selection 
implying elevation)
Tokens: scale.lift, duration.base, ease.standard

12 Appeal
Definition: The quality that makes an audience 
want to watch. Charm, clarity, magnetism.
UI application: When all principles work together, 
the result is appeal. A continuously evolving grid 
with perfectly tuned easing becomes mesmerizing.
State 1 placeholder: A single charming character 
animation — simple, readable, magnetic.
State 2 component: Lava lamp grid — abstract 
shapes or miniature components in continuous 
organic motion with tuned easing.
[Shipped 2026-05+ as a 2x2 ASCII-face Card grid
instead; the per-principle doc (appeal.md) is the
as-built record.]
Tokens: All tokens working together.

---

### Extended 6 (Design Engineering Principles)

13 Systematization
Definition: Parts integrate into a coherent whole. 
The system is legible because its parts follow rules.
State 1 illustration: Parts of a face assembling 
— eyes, nose, mouth arriving separately, snapping 
into relationship. (Rive post-launch)
State 1 placeholder: Geometric shapes assembling 
into a recognizable form.
State 2 component: Token Lab overview — all 
components responding to a single token change.

14 Hierarchy of Motion
Definition: One element's animation drives another. 
Authority flows from parent to child.
State 1 illustration: Conductor driving orchestra 
— gesture drives response. (Rive post-launch)
State 1 placeholder: A parent shape whose movement 
controls child shapes.
State 2 component: Parent container animation 
driving child element responses.

15 Economy
Definition: The minimum motion needed to communicate 
the intended meaning.
State 1 illustration: Parallax cityscape — 
foreground and background moving at different rates 
creating depth with minimal elements. (Rive post-launch)
State 1 placeholder: Layered elements moving at 
different speeds implying depth.
State 2 component: Layered scroll with parallax.
[Shipped as three panning bars at different speeds
instead; see economy.md for the as-built record.]

16 Token Fidelity
Definition: Animation values defined in a system 
should be used as intended. Deviation produces 
visible wrongness.
State 1 illustration: Character with two left hands 
— right-left hand corrects to right. (Rive post-launch)
State 1 placeholder: A component using a wrong 
token value visibly correcting to the right value.
State 2 component: Live token correction — wrong 
value applied, then corrected through the token system.

17 Reduced Motion
Definition: The system must meet the user where 
they are. Accessibility is a design constraint 
that improves the whole system.
State 1 illustration: Two characters meeting for 
a handshake — one moving wildly, one calm. Both 
must meet on common terms. (Rive post-launch)
State 1 placeholder: System and User labeled 
shapes — system adapts its motion to match user 
preference.
State 2 component: Toggle switching between 
full animation and reduced motion mode.

18 Shared Vocabulary
Definition: Motion values that cannot be named 
cannot be systematized. Named presets are the 
minimum unit of design-engineering communication.
State 1 illustration: Mouth speaking hanzi 木, 
character traveling to an ear and becoming a tree. 
(Rive post-launch)
State 1 placeholder: A word transforming into 
the thing it names.
State 2 component: Named token preset — the name 
communicates what the numbers alone cannot.

---

## Placeholder Strategy

[Completed history: every placeholder was replaced.
All 18 principles ship with authored .riv animations
and icons; Phase 6 closed with the Rive authoring
pass. Kept as the record of the build strategy.]

All State 1 animations use simple SVG shapes with 
Framer Motion for the build phase. Requirements:

- Simple geometric forms only (circles, rectangles, 
  lines)
- Demonstrate the principle clearly without 
  illustration complexity
- Use brand colors: --color-accent for active 
  elements, --color-border for passive elements
- Each placeholder runs on a loop with a 2-3 second 
  pause between cycles
- Must be replaced by Rive illustrations post-launch
- Each placeholder file lives in 
  src/principles/placeholders/

---

## Grid Behavior

18 cards in a responsive grid. When a card is selected:
- Selected card scales to 2×2 footprint
- Other cards reflow around it using Framer Motion 
  layout animation
- Selected card content populates via AnimatePresence
- Pressing Escape or clicking outside collapses 
  the card
- Grid reforms with layout animation

This behavior is itself a demonstration of 
Systematization — the parts reorganize to serve 
the whole without any piece disappearing.

---

## Build Order

Phase 1 — Grid and card shell
Phase 2 — Existing components wired to State 2
Phase 3 — New components (Modal, Tooltip, 
           Notification Badge, Lava lamp grid)
Phase 4 — Placeholder State 1 animations
Phase 5 — Extended principle cards (13-18)
Phase 6 — Rive illustrations (post-launch) [done]

---

## Sources

- Thomas and Johnston, The Illusion of Life (1981)
- https://medium.com/@bruno.mazza87/the-12-principles-of-animation-and-css-1492cc7c41a7
- https://www.userinterface.wiki/12-principles-of-animation
- https://github.com/dylantarre/animation-principles
