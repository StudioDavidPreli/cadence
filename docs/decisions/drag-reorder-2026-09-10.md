# Drag-to-reorder: one list, two input modes (build-order item 13)

Written 2026-09-10, the day the pointer half landed on the keyboard half
(committed the same morning as `bf98d1e`). The working notes for the gate
stay untracked in `docs/briefings/`.

## What it is

The second Gesture demo, under Carousel. Four rows (Snappy, Standard,
Cinematic, Explore), each with a handle that is one control for two inputs:
the button the keyboard reaches, and the surface the pointer drags from.
Every other demo in Token Lab animates a timed transition. This one has a
stretch of time the token vocabulary cannot name. While the pointer holds a
row, the row's position is input. No duration, easing or delay applies. Let
go and the row lands from whatever velocity the hand had, which only the
spring family can express. Move the same row with the keyboard and there is
no hand, so the motion goes straight back to being timed.

## Decisions

**Route B, hand-rolled, over Framer's `Reorder`.** Read in the 11.18.2
source: `Reorder.Item` hardcodes `dragSnapToOrigin` and `layout`, so its drop
is a drag inertia composed with a FLIP. Neither takes
`{ type: 'spring', stiffness, damping, mass }`. Route A could not make the
spring argument at the one moment it exists for. Decided on that, not on the
projection worry, which was smaller than framed: the demo column mounts one
category at a time, so Toast and Skeleton are never in the tree beside
Gesture.

**Fixed DOM order, each row translated to its slot.** `y = (slot - domIndex)
* pitch`, the Carousel architecture. No `layout`, no `layoutId`, nothing on
the projection tree. A held row never remounts and a focused handle never
loses focus. The cost is that Tab order would not follow a reorder, so the
handles use a roving tabindex: one tab stop, and with nothing held the arrows
walk focus in visual order.

**Each row owns its y as a MotionValue.** Not the `animate` prop. Framer's
drag writes the pointer's travel straight into that value, so the pointer and
the settle share one number. And a drop has to animate from wherever the hand
left the row, with the hand's velocity, which the declarative prop cannot
express: its target is the slot, and the slot did not change at the drop. The
settle is imperative, `animate(y, target, transition)`, never
`useAnimation()`. A pitch-only change (first measurement, a resize) jumps
rather than animates, since nothing happened that the user did.

**The handle is the drag control, not the row.** `dragControls` started from
the handle's pointerdown, `dragListener={false}` on the row. Framer gates its
`touch-action` and `user-select` overrides on that flag, so the row keeps its
scrolling and text selection and only the handle carries `touch-action:
none`. Momentum is off because the settle is ours. Framer starts a drag after
a few px of travel, so a plain click on the handle never grabs.

**One reducer for both inputs.** `held.source` is `'pointer'` or
`'keyboard'`; the component reads it at the drop to pick the transition.
`order` is the live order during a hold, so the rows making room read their
slot from it. `MOVE_TO` computes from the origin snapshot, never
cumulatively. No-op actions return the same state by reference, so the live
region never repeats itself. Model: `src/components/ReorderList/reorderModel.js`,
36 tests.

**Keyboard first, then the drag on top.** The timed model is the baseline the
gesture interrupts. Building it first inverted the scope-creep risk, where
the keyboard half is the one most likely to be cut and the one that carries
the argument.

## Token consumption

| Moment | Token |
|---|---|
| Grab | `scale.lift` over `duration.fast`, `ease.standard` |
| Dragging | none |
| Rows making room | `duration.base`, `ease.standard` |
| Keyboard move | `duration.base`, `ease.standard` |
| Drop (pointer) | `spring.*` from the hand's velocity; with the toggle off, `duration.base` on `ease.overshoot` |
| Drop (keyboard) | the row is already in its slot; only the lift comes down |
| Cancel (Escape) | `duration.fast`, `ease.exit`, from either input |

The spring rows take Reorder as their seventh consumer and the first
necessary one. The bezier stand-in gets the same call and cannot take the
velocity; that difference is what the spring toggle is for.

## Two things found on built output

**Framer filters every pointer event through `isPrimaryPointer`.** Escape
during a pointer hold has to end the drag session, or Framer keeps writing y
from the pointer until release. Framer has no cancel, but a `PanSession` ends
on a window `pointercancel`, so one is dispatched. A bare
`new PointerEvent('pointercancel')` has no pointer type and `isPrimary`
false, and the filter dropped it. The session lived on, and the live session
wrote the pointer's position back over the cancel settle. It is dispatched as
a primary mouse event now.

**The Escape listener has to be capture-phase.** The handle has focus under
the pointer, so React sees the same keydown at its root first, cancels
synchronously (a discrete event flushes passive effects), and the effect
cleanup removed the window listener before the event would have bubbled to
it. At capture the window hears it before React does. Both paths dispatch
CANCEL; the reducer treats the second as a no-op.

## Verification

`e2e/reorder.spec.js`, six tests on built output: a keyboard grab, move and
drop with focus surviving the move; a two-row pointer drag committing and the
row's translate settling at exactly two pitches; a drag released short of
half a pitch returning; Escape mid-drag restoring the order, the release
after it changing nothing, and a fresh drag working after; the spring toggle
on and a drop still landing; a preset switch and a slider edit leaving every
row's translate where it was. Full suite 115 passed. Contrast read per theme
(held border on the plate 6.1 / 7.9 / 20.0 / 12.7; grip at rest on the row
fill 3.0 / 5.2 / 21 / 21). A reduced-motion drag lands on the bezier branch.

The one Playwright lesson: `page.mouse` does not scroll a target into view
the way `click()` does, and the demo column clips below Carousel at the
default viewport, so the first run of every drag test landed on the app
shell. `scrollIntoViewIfNeeded()` on the handle first.

## The runners (same day)

Each row ends in a runner, David's four small Rive scenes, one per preset
(`public/runnerSVGS/<id>run.riv`). Read through the web runtime the day they
arrived: one artboard each (`snappyRun`, `standardRun`, `cinematicRun`,
`exploreRun`), one timeline, one state machine (`<id>RunSM`) with no inputs,
and an unbound leftover view model the component ignores. No display-mode
instances: the files draw on a transparent canvas and React binds nothing.
Play and pause are the whole interface, so the runner runs while its row is
held, by keyboard or pointer alike, and pauses where it is on release.

`RunnerArt` follows the display-title convention. Reduced motion renders the
SVG poster (`public/runnerSVGS/fallbacks/`) and never fetches the `.riv`; on
the motion path the same poster shows until the canvas has drawn once and
stays if the file never loads. The poster is toggled with `hidden` beside a
canvas that is mounted once, never swapped with it. The rivLint contract
gate wants manifest entries for the four new files; that is David's review
(`RIVLINT_UPDATE=1`).

**The still frame comes from the render loop.** The first build shipped with
autoplay off on the reasoning that the runtime draws a frame on load and
idles until `play()`. Measured in a raw harness against the served file, on
a 28px canvas, screenshot bytes compared to a blank canvas: autoplay off
leaves the canvas blank; an explicit `drawFrame()` after sizing, blank; the
offscreen renderer off, blank; autoplay on with `pause()` at 0ms after load,
blank; autoplay on with `pause()` after one rendered frame, drawn, and after
two, drawn. So the file autoplays and the runtime's first per-frame event
is the signal for both handoffs: the poster hides, and a row that is not
held pauses on that frame. The event is `EventType.Advance`: `Draw` is
declared in this runtime and never fired (a subscription to it left every
poster on screen on built output), and `Advance` fires only from the frame
path, not from the load-time `advanceIfPaused`. Not a timer: the React wrapper stops rendering
for a canvas outside the viewport (an IntersectionObserver in
`react-webgl2`), and this demo loads below Carousel's fold, so
`useRivePainted`'s two frames would have hidden the poster onto a canvas
that had never drawn. With no draw the poster stays. Two more guards from
the same reading: an advance counts as a frame only when the canvas has
pixels, because the event fires before the runtime's zero-size check, and
the pause waits one animation frame so the announced frame has been flushed.

**The blank row below the fold, explained on the sixth reproduction.** A
capture had shown one runner blank at rest with its poster gone; a six-run
loop at Playwright's default viewport, where the list loads partly below
Carousel's fold, then showed it in three runs of six, always the rows that
were fully off-screen at load. The wrapper's viewport observer stops
rendering for a canvas outside the viewport and defers sizing it until it
scrolls in; sizing writes the canvas's width and height, which clears the
bitmap, and a paused instance is never told to redraw (its draw pass only
paints when the artboard changed, a redraw was requested, or the size it
last drew at differs; a write of the same size clears without any of
those). Rows in view at load are sized before they pause, so they survive.
The observer is off for the runners (`shouldUseIntersectionObserver:
false`): it exists to save off-screen rendering, and these render one frame
and pause. Six of six clean after.

**David's catch on the first capture: the poster never left.** The held
Standard row showed the running figure drawn over the standing poster. The
poster is toggled with the `hidden` attribute once the canvas has painted,
and the module's `.artPoster { display: block }` outranked the browser's
`[hidden] { display: none }`, so the attribute was set and the poster stayed.
At rest the canvas was blank (the next finding) and the poster was the whole
picture; held, it was a double image. The tool pane already carries the guard for the
same reason (`.toolPane:not([hidden])`); the poster's rule now has it. The
check that would have caught it is the computed display, not the attribute:
the probe read `hidden: true` and called it done.

A stale-copy lesson from the same hour: wrangler serves `dist/`, which is
`public/` as of the last build, so a `.riv` re-exported after a build loads
the old bytes (two of the four failed to load until the rebuild). Rebuild
before reading a file the runtime rejects.

## Observed, not changed

A token edit reflows the Carousel wrapper above the list by 14px (its height
changes with `duration.base`), which moves the whole Reorder demo down the
column. The rows' own translates hold, which is the item 11 rule. The
wrapper reflow is Carousel's.

## Limitations

- Touch was not driven by hand this session. Pointer events cover it and the
  handle carries `touch-action: none`; the demo column's scroll is the case
  to try on a device.
- Velocity comes from Framer's pan history at release, not from anything
  the demo measures. If the drop ever needs a documented velocity, it is
  `info.velocity.y` in px/s.
