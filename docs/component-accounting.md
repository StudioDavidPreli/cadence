# Cadence — Component Accounting

A record, not a to-do list. This is where Cadence sits within the canonical
component set that Material, Carbon, Polaris, Radix, and Primer converge on.

Cadence is a motion design system explorer, not a component library. Components
exist to carry the 18 principles. A component is present because it demonstrates
a principle, not because a complete system is supposed to have it. The unbuilt
rows below are open territory for further React practice, not gaps to apologize
for.

Built: 13 components across every canonical category. (Count as of the
accounting date; predates the Motion Tiles era and the counts cited in
later docs. Date-stamped 2026-07-16 by the open-items audit.)

---

## Forms and inputs

| Component | In Cadence | Principle / role |
|---|---|---|
| Button | yes | Squash and Stretch |
| Toggle / switch | yes | Timing |
| Slider | yes | Token Lab controls |
| Select / dropdown | yes | Secondary Action |
| Text input | no | |
| Textarea | no | |
| Checkbox | no | |
| Radio | no | |
| Date picker | no | |
| Search | no | |

## Navigation

| Component | In Cadence | Principle / role |
|---|---|---|
| Tabs | yes | Token Lab panels |
| Stepper | yes | Pose to Pose |
| Breadcrumbs | no | |
| Pagination | no | |
| Menu / nav bar | no | |

## Feedback and status

| Component | In Cadence | Principle / role |
|---|---|---|
| Modal / dialog | yes | Staging |
| Tooltip | yes | Arc |
| Badge | yes | Exaggeration |
| Progress / spinner | yes | Slow In / Slow Out |
| Toast / notification | no | |
| Alert / banner | no | |
| Popover | no | |
| Skeleton loader | no | |
| Empty state | no | |

## Containers and layout

| Component | In Cadence | Principle / role |
|---|---|---|
| Card | yes | Solid Drawing |
| Accordion | no | |
| Table / data grid | no | |
| Avatar | no | |
| Divider | no | |

## Overlays

| Component | In Cadence | Principle / role |
|---|---|---|
| Drawer | yes | Anticipation |
| Dropdown menu | yes | Secondary Action |
| Carousel | yes | Follow Through and Overlapping Action |

---

## If you extend later, these carry the most interesting motion

Notes for future practice, not a backlog. Each one is worth building only when
it teaches a motion behavior the library does not already show.

- Toast: an entrance, a timed auto-dismiss exit, and a stack reflow when one
  clears. The timed exit and the stack settle are motion none of the current
  cards demonstrate.
- Skeleton loader: the shimmer-to-content handoff, a loading-to-loaded transition
  the library does not currently cover.
- Table sort/filter: rows reordering with position animation, a layout problem at
  list scale rather than card scale.
- Text input: focus-ring and label-float, small but precise, the kind of motion
  motion designers notice.

Accordion is deliberately left off this list. Its expand-collapse is the problem
already solved on the principle cards. Building it would duplicate the solution,
not demonstrate a new one.
