# Background: four colorways, a native face, and the tool bar finally reaching it

**Date: 2026-07-27**
**Status: built behind `?bg=1`. Tests, lint and build green. Looked at by David in dev across all four themes. Not verified on built output, not shipped.**

The background stopped being drawn and started being stamped. Three separate
things moved to get there, and one of them moved twice because the first answer
was wrong.

## The art changed under the system, twice

The Token Lab library arrived as pixel exports: one rect per pixel, on a unit
grid, four folders deep. `darkMode`, `lightMode`, `contrastDark`,
`contrastLight`. Then it changed again, down to ten marks, six rats and four
runners, every box 11px. Principles followed with hand-drawn versions of the
same animals in the same sizes.

Each swap broke something the loader could not see, and each one was caught by
the loader once it was taught to look.

**Group fill.** The pixel exports declare their ink once on a wrapping `<g>` and
leave every rect bare. `resolvePaint` read the shape tag and nothing above it, so
62.9% of the Token Lab library's total stroke length resolved to no ink at all.
Nothing errored. A stroke with no ink key falls through to `--color-text-base` at
paint time, so the art still drew, in one flat colour, looking like a decision
somebody had made. The parser now carries an open element stack and walks
ancestors for `fill` and `stroke` separately, per property, so an explicit
`fill="none"` still means none while an absent one asks its parent.

**The SVG default.** Two `contrastLight` runners have 136 paths between them with
no `fill` attribute anywhere. That is not a broken export. SVG's initial value
for `fill` is black, and every renderer draws those paths black. The parser had
been treating "nothing declared" as a gap and falling through to the token ink,
which in high-contrast-light happens to be near black. Right answer by luck.

**Ordering.** The four principles colorways used four disjoint Illustrator
numbering ranges, and `darkMode` had one artboard exported last instead of
fourth. Renaming by position would have given every principle mark the wrong
colour in dark mode from index 3 down, and nothing would have complained: 24
marks would still load, still draw, still theme. Matched by geometry instead,
then renamed `00.svg` through `23.svg`, verified aligned at 24 of 24.

## Geometry once, paint per theme

Four colorways of a mark are the same drawing in different inks, so `library.js`
loads the geometry from one of them and reduces the other three to a lookup from
canonical ink to theme ink.

That is not a size optimisation. Ruling A says a theme switch must not regenerate
or re-reveal, and the composition memo keys on `library`. Four library objects
would rebuild the L-system, the density map and the aggregation on every theme
toggle, and remount every stamp. Holding the geometry still and swapping only the
paint means the memo never sees a theme change at all.

It works because the colorways really are the same drawing: identical stroke
counts across all twelve folders, identical flattened geometry in tokenLab and
motionTiles, and 21 of 24 in principles.

A new test file runs against the real assets rather than fixtures, because every
way a colorway can drift is silent. A mark missing from one folder shortens that
library and shifts every index above it, and each theme would quietly draw a
different animal. It fails the build the day an export goes out of step.

### The limit it found

`#76c17d` maps to two different colours in three colorways. The rats carry it on
one path each, a detail; the runners carry it on sixty to seventy, a body. In
high contrast they are given different treatments, which is a good call and
exactly where two populations most need telling apart.

An ink-keyed table cannot say "this green, but only on a runner." It keeps the
first mapping and names the conflict. The shipped native face is unaffected: it
reads each colorway's own fills path by path. Only the traced and pixel faces
resolve through the palette, and both would paint those three marks wrong.

The suite asserts no unexpected warnings and separately pins these three splits
by name. A fourth one still fails.

## The native face

The traced face flattens every shape to a polyline and strokes the outline with a
1.3px pen. That was written for hand-drawn line work, where outlining a filled
region gives you a drawing. On pixel art it outlines every box:

```
box, drawn      1.59 world px   (11 × 84 × 0.34 ÷ 198)
stroke pen      1.30 world px
gap left over   0.29 px
```

The pen is 82% as wide as the cell it is outlining. Every interior edge gets
drawn twice, once by each neighbour, and the whole thing fills in. That is why
the art read as mass instead of as pixels.

The native face draws the authored shapes filled, one `<g>` per mark in `<defs>`
and one `<use>` per stamp carrying the placement as a transform. No flattening,
no stroking, no ink resolution: the file already says what colour it is in this
theme, because the theme has its own file.

Placement was verified against the traced face rather than trusted: same mark,
same placement, 530 points compared, maximum deviation 5.7e-14 px.

It is not a performance win at the shipped settings. 1,058 elements against 777,
because the defs are a fixed cost and the 30px spacing keeps the stamp count
below the crossover near 36. It scales the other way as the budget climbs. The
argument for it is that the drawing comes out right.

### The transform clash

Placement lives in a `transform` attribute, and a presentation attribute is the
weakest thing in the cascade. The reveal animates `transform`. Put both on one
element and the animation wins: every mark drew at authored size in the top-left
for the whole reveal, then snapped into position when the class dropped. It
shipped that way for an afternoon.

Three fixes were built and compared side by side. A wrapper group that owns the
placement while the inner `<use>` owns the reveal. The individual `scale`
property, which composes with the attribute instead of replacing it and keeps one
element per stamp. Opacity only, which never declares a transform at all. All
three worked. Nesting won: it asks nothing of the browser and it is exactly how
the traced face already behaves, since that face bakes placement into coordinates
and leaves its animated group nothing to lose.

The guard is structural, because a cascade is invisible to markup assertions: no
element may carry both a `transform` attribute and a class whose animation
declares `transform`.

## The tool bar reaches the background

It never had. The reveal runs once on mount, the background mounts with the nav
column before the tool bar is reachable, and active token state is not persisted,
so every load started at defaults. The wire was connected at both ends and
nothing was ever sent down it.

`revealKey` was named in the header comment months ago and never implemented. It
is a counter, incremented by TokenLab's dispatch wrapper on `LOAD_PRESET` and
`RESET_TO_DEFAULTS` and on nothing else. A slider drag still changes nothing,
which is the rule that mattered. A named, deliberate act now replays the reveal.

The half that would have made it theatre: `useMotionTokens` reads CSS once, in an
effect keyed only on `override`. A replayed reveal would have run at the
mount-time defaults while claiming to show the new preset. The hook gained a
`readKey` that sits in the dependency list and does nothing else. Absent, it is
`undefined` forever and every existing caller behaves as before.

## The drift, and the answer that was wrong first

The idle sway is two sine translations at different periods, a Lissajous wander.
Its period was a fixed chrome constant, because an infinite animation dragged
toward zero sets the nav column vibrating.

First attempt: shape each swing with `--motion-ease-standard` and leave the
period alone, on the reasoning that a curve has no degenerate value. True, and
beside the point.

```
duration.base    Snappy 120ms    Standard 200ms    Cinematic 500ms
standard curve   overshoot       standard          enter
                 [.34,1.56,…]    [.4,0,.2,1]       [0,0,.2,1]
```

Standard and Cinematic differ by one control point's x and decelerate into the
same endpoint. As drift they are the same drift. Holding the period fixed threw
away the 4x that separates these presets and kept the part that barely registers.
Cinematic read as Snappy. Making the difference visible took an amplitude that
made the whole background distracting, and 8px was still not enough.

Second attempt, and the one that shipped: scale the period by
`--motion-duration-slower` and clamp it.

```
Snappy       350ms  ->  2.80s
Standard     600ms  ->  4.80s     the chrome constant, exactly
Cinematic   1400ms  -> 11.20s

Explore extremes: 50ms would be 0.40s, held at 2.50s
                2000ms would be 16.0s, held at 12.0s
```

The clamp is the honest reading of the chrome rule rather than a way around it.
The rule was written against unbounded input, not against input. A floor of 2.5s
puts the strobe out of reach of anything Explore mode can do, and the fixed
constant keeps its job as the anchor Standard maps to.

`driftEase` was removed the same day it was added. Amplitude went back to 3px,
because once the period carried the preset, 3px was plenty. A speed reads at a
size a curve does not.

## Settings, as David set them

```
budget           40, every theme
stamp scale      0.45
min spacing      30px
normalize ink    100%
stroke width     1.3
colour           authored
face             native
drift amplitude  3px
drift clamp      2.5s to 12s
```

High contrast used to run at 0.6x budget, on the argument that the HC themes had
no quiet grey to spend on a dense field. The contrast colorways answer that at
the source now, so the multiplier is gone and every theme asks for the same
field.

The sway had to enter the baseline clearance when amplitude became adjustable.
`markReach` reserved room for a mark's own extent and its jitter, but the drift
moves ink after the sampler has finished deciding where ink may go. At 3px that
was 4.2px of overhang nobody noticed. At 8px it was into the nav headers.
`maxSwayReach` lives beside the constant so the two cannot separate again.

## Three things that were broken by the work and caught by it

A CSS edit truncated the stylesheet from a comment marker to the end of the file,
taking `.swayX`, `.swayY`, `.breathe` and the reduced-motion media block with it.
The component went on asking for `styles.breathe`, the module went on resolving
it to nothing, and the idle simply stopped. No error, no failing test, because
the markup stayed correct and only the rule behind it was gone. There is a
stylesheet test now: every class the component names must exist, every
`animation-name` must point at a real `@keyframes`, and the reduced-motion block
must still cover all three idle classes.

A `const` that evaluates during render referenced a binding declared sixty lines
below it, and every native render threw into the error boundary. Lint, 516 unit
tests and a clean build all missed it, because nothing in the project had ever
rendered `BackgroundArt`. It renders in the suite now, server-side, no new
dependency: the render body is the part that can throw and effects are the part
that needs a DOM.

The removal of `driftEase` sliced between two comment markers that sit in the
opposite order in the file, and deleted `driftPeriodSeconds` instead. Lint passed,
because a missing export only fails at import time.

## What is still carried

The traced face, the pixel face, the flattener, the census and the ink transform
all still exist and are all still reachable. None of them is shipped. The
colorways answered the question the ink transform was built for, the native face
answered the one the flattener was built for, and the pixel face has not been
drawn on a real surface since the 2026-07-23 experiment put every section on
vector.

The pixel face is also the most expensive dead thing in the system: `aggregate()`
runs on every regeneration and `face` is not in the memo's dependency list, so it
is computed in full for a face nobody sees. Gating it is smaller than removing
it.

Handing that decision forward rather than taking it here:
`docs/decisions/background-handoff-2026-07-27.md`.

The rats are still in the nav column, drifting at whatever speed the preset says.
