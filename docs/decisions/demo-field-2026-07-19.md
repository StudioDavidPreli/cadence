# The demo field: a procedural backdrop for the Token Lab

**Date: 2026-07-19**
**Status: complete, verified on built output, all four themes**

The demo column needed to stop reading as empty white. David's idea from the
first message: a grid that stays regular near the components and grows
complex and irregular in the open space, drawn fresh for each Token Lab
page. The session ran in three movements: a discussion that settled scope
before any code, a sandbox where David tuned the aesthetic by hand, and the
integration, which took two rounds because the site differs from the sandbox
in one way that mattered.

## Scope, settled up front

Token Lab category pages only. The hero, the guide, and the Principles grid
stay clean. Static in v1: nothing back there moves, because the
demonstrations are the point of the column and the field is furniture. Each
page seeds its own field from the destination key, so "new background per
page" means parametric, not random: the Easing page draws the same field
every visit. Same inputs, same output. The backdrop makes the token argument
without saying so.

## The sandbox

`archive/demo-grid-sandbox/index.html`, a single file David opened directly
and drove with sliders: theme (the real token values), seed, pattern mode,
cell size, jitter, falloff distance and curve, dropout, mark size, rotation,
weight variance, opacity, and a sparse mode for high contrast. The handoff
was a copy-params button. He returned one JSON block: ticks at cell 32,
jitter 14, falloff 237, gamma 1.7, drop 0.3, mark size 4, rotation 18,
weight variance 0.9, and sparse kept for the HC themes at a 0.2 survival
rate. Those numbers are the spec. They live in the `FIELD` constant in
`src/components/DemoField/generateField.js` with a comment saying so.

## Architecture

**The generator is pure.** `(seed, width, height, options)` in, an array of
marks out. Every random draw is a hash of seed, grid index, and salt: no
sequential PRNG state anywhere. A vertex owns its numbers regardless of
visit order, so a resize re-derives the identical field and only the margins
gain or lose marks. Six Vitest tests pin the properties the component leans
on: determinism, per-seed distinctness, resize stability, a perfect grid in
the calm zone, irregularity past the falloff, sparse thinning.

**Freedom is horizontal only.** The sandbox measured distance from a
centered mock card. The real demos hug the left of the column, so freedom
became distance past a left-anchored calm band (520 px), ramping over the
falloff. Vertical position never enters the function. That is also what
makes the next choice safe.

**The field is a sticky mask, not scrolling content.** DemoArea mounts
`DemoField` as the first child of each crossfade layer. The wrapper is
`position: sticky` at height 0 with `z-index: -1`: pinned to the layer's
visible box, painting above the layer's opaque background and below the
in-flow content. Content scrolls over a stationary field, and because
freedom ignores y, scrolling cannot drift the calm zone. The negative
z-index depends on the layer being a stacking context, which DemoArea's
inline zIndex already guarantees; the CSS comment names that dependency.

**The crossfade does the transition for free.** Each layer owns its field,
AnimatePresence caches the exiting layer's element with its old seed, and
the existing fade carries one field into the next. No new animation code.

**Chrome, not demonstration.** The field reads no `--motion-*` tokens. Ink
is the new `--color-demo-field`, one value per theme in color.css: border2
gray in dark and light, pure black and white in the HC themes. Decorative
only, never text, never a UI stroke, so no WCAG minimum applies; the
constraint runs the other way, quieter than real borders. High contrast has
no quiet gray to offer, so both HC themes switch the generator to sparse
mode instead: scattered ticks at a fifth the density, deliberate rather
than broken.

## Round two: the clearing plates

The sandbox never showed pattern under text because its mock card was
opaque. The site put instruction text straight on the layer, and the ticks
ran under it. David called the legibility issue and proposed the fix
himself: solid fills behind the component areas, and the code toggle pulled
in from the far right so it belongs to the component.

True clipping (measured exclusion zones, SVG clipPath) was considered and
rejected: content rects move against a pinned backdrop on every scroll
tick, so clipping would force the field to scroll, size to content, and
re-measure on every layout change. An opaque fill is the same pixels for
free.

`.demoMain` became the plate: `--color-surface-raised` at max-width 520 px,
a 20 px padding and negative-margin apron so nothing moved, border-radius
matching the highlight. Invisible clearing, pure mask, no border: David's
call. The 40 px demoContent gap minus two 20 px aprons means consecutive
plates touch, one continuous clearing down the column, no slivers of
pattern between groups. The toggle needed no code: the label row's
space-between now ends at the plate, which lands `</>` at the component
area's top-right corner, constant on every plate. Most windows keep their
controls at the corners; David's phrase for why it reads.

Gesture takes a 620 px plate through the `demoMainCarousel` class it
already had: the carousel's wide layout fires at a 480 px container width
and grows the card to 560, and a standard plate would have parked it
exactly on the breakpoint.

Field opacity dropped from the sandbox's 0.8 to 0.6 alongside the plates.

**The highlight moved onto the plate.** The active-token highlight used to
tint and outline the full-width demo group; against a 520 px plate the
outline would have crossed 700 px of open field. `.demoGroupHighlighted`
now styles `.demoMain`: outline tracing the component area, the
accent-subtle tint layered as a background-image over the plate's opaque
fill so the green reads exactly as before inside it. In the wide split
layout the code panel now sits outside the outline, which is the honest
reading: the token affects the component, the code view is reference. The
forced-colors variant moved with it.

## Verification

112 Vitest tests green, token-integrity gate included. Built output served
by the real Worker and driven with Playwright: field present and sized to
the layer, 0.6 alpha in the DOM, distinct fields on different pages, pinned
under scroll, 141 marks against 711 in HC sparse, plate geometry exact
(520/620, plates touching at zero), toggle inset 20 px from every plate
edge, highlight outline flush on all four sides, the wide carousel alive
inside its plate. David passed the look in all four themes on his own
screen before this record was written.

## Files

- `src/components/DemoField/` (component, generator, tests, module CSS)
- `src/components/DemoArea/index.jsx` (the mount, gated to CATEGORY_IDS)
- `src/tokens/color.css` (`--color-demo-field`, four themes)
- `src/components/TokenLab/TokenLab.module.css` (plates, wide plate,
  highlight-on-plate)
- `archive/demo-grid-sandbox/index.html` (the tuning sandbox, gitignored)
