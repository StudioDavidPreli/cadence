# The hygiene pair: footprint module and forced-colors row (2026-07-21)

Two small items the tracker's pre-launch queue bundled as the hygiene pair.
Both existed because a latent risk sat unguarded, and both were cheap. One
session, both closed. Kickoff: `docs/briefings/HYGIENE_PAIR_KICKOFF.md`.

---

## Item 1: the footprint extraction

### The bug it fixed

`getExpandedFootprint(index, columnCount, totalCards)` computes the grid
placement for an expanded 2x2 principle card. Its edge-case rule extends left at
the right column and up at the bottom row by subtracting 1 from the start line.
At `columnCount === 1` the only column is also the right edge, so `colStart`
became 0 and the function returned `gridColumn: "0 / span 2"`. CSS grid lines
are 1-indexed; line 0 does not exist. A single-row grid hit the same failure
through `rowStart`.

The reason it never bit production, re-verified this session rather than
inherited: `.grid { min-width: 420px }` in `PrinciplesLibrary.module.css`. With
`box-sizing: border-box` global, 420px border box minus 48px padding leaves
372px of content, which is exactly `2 × 180 + 12 gap`, so `repeat(auto-fit,
180px)` always lays down at least two tracks and the ResizeObserver that reads
the column count never sees one. The demo column above it is floored at
`minmax(420px, 1fr)`, and the documented minimum desktop viewport is 574px. The
guard is real. It is also a CSS `min-width` in a different file that has no idea
this function depends on it. That distance is the whole reason the item existed.

### Two decisions, both David's

**How the function becomes testable.** This was the "export private functions"
question that stalled the second Vitest slice back in June, never decided. The
project has since built the precedent that answers it: `parse.js` and
`springCurve.js` are both pure, React-free modules extracted so they unit-test
on their own. `getExpandedFootprint` followed them into
`src/components/PrincipleCard/footprint.js`, imported by the card. The header
comment and the Phase 2 neighborhood-deformation hook moved with it; the seam is
documented and deliberately unused, not dead.

**What it returns at the degenerate sizes.** Clamping the start line to 1 while
keeping `span 2` removes the invalid line but the span still overflows the
single track, so the card bleeds past it. The honest behavior degrades the span:
`span = min(2, available)` on each axis, and the down-right bias only applies
where the span is 2. A 1-column grid gets a 1-wide footprint, a single-row grid
a 1-tall one, and neither emits a line 0. At span 1 the natural cell fills the
footprint, so there is nothing to bias and the transform-origin simplifies to
the interior corner. David ruled for the degrade.

### The tests

`footprint.test.js`, 11 cases. The full edge table the header comment names,
verified against a 3-column, 6-card grid: interior, right edge, bottom row,
bottom-right corner, first card, last card. Then the degenerate sizes that carry
the fix: single column, single column at the bottom row, single row, single row
at the right edge, and the single-card grid where both degeneracies land at
once. Every case asserts the full return, so a wrong line or a wrong span fails
loudly.

The mechanism was confirmed on built output, not just the dev server: driving
the real principle grid, the expand lands where the footprint says at every edge
position. A right-edge card extends left, a bottom-row card extends up, the
corner does both, and no line 0 appears anywhere.

---

## Item 2: the persisted forced-colors row

### The gap it closed

The 2026-07-16 verification pass proved by hand that under `forced-colors:
active` two state cues survive. The nav active-leaf marker and the Token Lab
connection ring both lose their box-shadow to forced colors and rebuild it as an
outline, through the `@media (forced-colors: active)` blocks in
`NavColumn.module.css` and `TokenLab.module.css`. Nothing pinned it. A refactor
could drop either block and no test would notice. The Tier 2 abandonment note of
the same day kept this row alive on purpose.

### The test

One block in `e2e/themes.spec.js`, using `page.emulateMedia({ forcedColors:
'active' })` and never `test.use`, for the same reason the reduced-motion block
in that file documents: the context option silently no-ops in this suite. Two
assertions, one per cue:

- The nav active-leaf marker renders a solid 2px outline. Reached by a
  category deep link (`#/token-lab/press-state`) so the active leaf has a
  unique name.
- The Token Lab connection ring (`.demoGroupHighlighted .demoMain`) renders its
  outline when raised. Raised the keyboard way: focusing a token slider sustains
  the highlight, the keyboard-parity behavior from the item 4 session.

Both assert `outline-style` and `outline-width`, never color. Forced colors
substitutes system colors the test cannot predict, and the mechanism worth
pinning is that an outline exists where a box-shadow would have been erased. The
width is the discriminating assertion for the connection ring: its base rule
already draws a 1px solid outline, so only the 2px width proves the `@media`
block ran. The nav leaf has no base outline at all, so both assertions catch its
removal.

Proven once, as the kickoff asked: deleting each `@media (forced-colors:
active)` block, rebuilding, and watching the matching test go red. The
connection ring fell back to its base 1px and failed the width assertion; the
nav leaf lost its outline entirely. Both blocks restored. The P06 title pulse is
the checklist row's "not exercised" remainder; it resisted cheap coverage and
was left.

---

## Records

- `docs/decisions/grid-architecture.md` records the footprint debt from the
  2026-06-18 handoff paid, with the degrade-vs-clamp reasoning.
- The forced-colors rows in `docs/deploy-checklist.md` and
  `docs/deploy-verification-matrix.md` cite the spec.
- The tracker's pre-launch queue ticks the hygiene pair.

All unit suites (160) and `npm run test:e2e` (53, up from 51) pass on built
output.
