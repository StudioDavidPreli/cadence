# Hygiene Pair: Session Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session closes the two small items the tracker's pre-launch engineering queue bundles as the hygiene pair. Both are cheap; both exist because a latent risk sat unguarded. One session, both items, done.

## Read first, in this order

1. `CLAUDE.md` (all of it; the Grid Architecture section is load-bearing for item 1)
2. `docs/decisions/grid-architecture.md`: CLAUDE.md mandates reading it before touching grid CSS or `getExpandedFootprint`, and this session touches `getExpandedFootprint`
3. `src/components/PrincipleCard/index.jsx`, lines 50 to 88: the function and its header comment
4. `e2e/themes.spec.js`: the suite's conventions, and the comment at the top of the reduced-motion block explaining why `page.emulateMedia` is used instead of `test.use` (the option silently no-ops in this suite; the same discipline applies to forced colors)
5. `docs/deploy-checklist.md`, the forced-colors row, and `docs/deploy-verification-matrix.md`, the 2026-07-21 closure note that explicitly excludes the forced-colors row from the Tier 2 abandonment

## Item 1: the footprint extraction

### The bug

`getExpandedFootprint(index, columnCount, totalCards)` computes the grid placement for an expanded 2x2 card. Its edge-case rule extends left at the right edge and up at the bottom row by subtracting 1 from the start line. At `columnCount === 1`, the only column is also the right edge, so `colStart` becomes 0 and the function returns `gridColumn: "0 / span 2"`. CSS grid lines are 1-indexed; line 0 does not exist. A grid with a single row hits the same failure through `rowStart`. Today this is structurally unreachable only because the demo-column width floor keeps the column count at 2 or more, which means the guard is a CSS rule in a different file that does not know this function depends on it.

### The work

First verify the reachability claim rather than inheriting it: confirm what actually prevents `columnCount === 1` (the floor, the 574px minimum viewport, the ResizeObserver count) and state it in the plan.

Then two decisions to surface before coding, with a recommendation each:

- **How the function becomes testable.** This is the "export private functions" question that stalled the second Vitest slice in June, never decided. The options: export `getExpandedFootprint` from `index.jsx` as a named export, or extract it into a pure module beside the component (`footprint.js`), imported by the card. The project has since built its precedent: `parse.js` and `springCurve.js` are both pure, separately tested modules extracted for exactly this reason. Recommend extraction; David confirms.
- **What the function should return at the degenerate sizes.** A 1-column grid cannot hold a 2-column span; clamping the start line to 1 while keeping `span 2` still overflows the track list. The honest behavior is to degrade the span: at `columnCount === 1` the footprint is 1 wide (and the transform-origin math simplifies with it); a single-row grid degrades the row span the same way. Propose this, or something better, and let David rule before it lands.

Tests cover every case the header comment names plus the degenerate ones: interior, right edge, bottom row, bottom-right corner, first card, last card, single column, single row, and a single-card grid (both degeneracies at once). Keep the Phase 2 hook comment intact and move it with the function: the neighborhood-deformation seam is documented and deliberately unused, not dead.

## Item 2: the persisted forced-colors row

### The gap

The 2026-07-16 verification pass proved by hand that the forced-colors CSS survives: under `forced-colors: active`, the nav active-leaf marker and the Token Lab connection ring rebuild their box-shadow cues as outlines (the `@media (forced-colors: active)` blocks in `NavColumn.module.css` and `TokenLab.module.css`). Nothing pins it; a refactor could drop those blocks and no test would notice. The Tier 2 closure note explicitly kept this row alive.

### The work

One e2e test, in whichever spec file fits the suite's organization (`themes.spec.js` holds the media-emulation block today). Use `page.emulateMedia({ forcedColors: 'active' })`, never `test.use`, for the recorded reason. Assert the two cues the manual pass verified:

- The nav active-leaf marker renders a visible outline (solid, 2px) under forced colors.
- The Token Lab connection ring (`.demoGroupHighlighted`) renders its outline when raised. Raise it the keyboard way: focus a token slider, which sustains the highlight (the keyboard-parity behavior from the item 4 session).

Assert computed `outline-style` and `outline-width`, not colors: forced-colors substitutes system colors the test cannot predict, and the mechanism (an outline exists where a box-shadow would have been erased) is the thing worth pinning. The P06 title pulse is the checklist row's "not exercised" remainder; cover it if it falls out cheaply, skip it without guilt if it resists.

Then close the loop in the records, the suite convention being that every automated row cites its spec: the deploy-checklist forced-colors row gains the spec reference, and the tracker's pre-launch queue ticks the hygiene item with the date.

## Process rules for this session

- David is learning React through this project. Explain non-obvious decisions briefly; when two approaches are valid, name both and say why you chose one.
- Main is production: `npm run test:e2e` before every push. Item 1 changes component code, so verify the card expand on built output in a browser (every edge position: a right-edge card, a bottom-row card, the corner), not just the dev server.
- David does his own visual checks of feel; your built-output pass is for mechanism (the expand lands where the footprint says), not judgment.
- Stage files individually; never `git add -A`. Commit directly to main; read `git log --oneline` first and match the message style.
- Before writing any prose, read `archive/voice/voice-analysis.md`. No em-dashes, anywhere, in any form.

## Definition of done

- The footprint function lives in a tested pure module (or exported, if David rules that way), with the degenerate-size behavior he approved and the full edge-case test table green.
- The forced-colors test runs in the persisted suite and fails if either `@media (forced-colors: active)` block is removed (prove this once by deleting a block locally, watching the test fail, and restoring it).
- All unit suites and `npm run test:e2e` pass; the card expand verified on built output at the edge positions.
- The deploy-checklist row cites its spec; the tracker's pre-launch queue ticks the hygiene pair with the date; a dated closing line lands in `docs/decisions/grid-architecture.md` recording that the footprint debt from the 2026-06-18 handoff is paid.
