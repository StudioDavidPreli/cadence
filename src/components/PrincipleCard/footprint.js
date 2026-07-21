// ─── getExpandedFootprint ─────────────────────────────────────────────────────
//
// Kept pure and React-free so it unit-tests on its own, the same discipline
// parse.js and springCurve.js follow. Extracted from PrincipleCard 2026-07-21 to
// pin the grid-line math with the edge-case table below (see
// docs/decisions/grid-architecture.md).
//
// Computes the grid-column, grid-row span, and matching transform-origin for
// an expanded card.
//
// Bias rule (down-right): the expansion extends right and down from the card's
// natural 1-indexed position. Edge cases:
//   - Right edge (col === columnCount): extend left instead of right.
//   - Bottom row (row === totalRows): extend up instead of down.
//
// transformOrigin matches the natural cell's corner within the expanded
// footprint, so the close animation's scale shrinks toward the resting
// collapsed position with no horizontal or vertical jump:
//   - Interior:    "0% 0%"     (top-left)
//   - Right edge:  "100% 0%"   (top-right)
//   - Bottom row:  "0% 100%"   (bottom-left)
//   - Bottom-right corner: "100% 100%"
//
// Degenerate sizes: a 1-column grid cannot hold a 2-column span, and a
// single-row grid cannot hold a 2-row span. Production never reaches either:
// the .grid { min-width: 420px } floor keeps auto-fit at ≥2 columns (2 × 180 +
// 12 gap fits in the 372px content box), and the demo column above it is
// floored at minmax(420px, 1fr). But the floor is a CSS rule in a different
// file that has no idea this function depends on it, so the honest degenerate
// return is a degraded span: span = min(2, available). At span 1 the natural
// cell fills the footprint, so there is nothing to bias and no invalid line 0
// (the old `col - 1` at columnCount === 1 produced "0 / span 2", and CSS grid
// lines are 1-indexed). See docs/decisions/grid-architecture.md.
//
// Phase 2 hook: this function receives index, columnCount, and totalCards.
// It is the correct place to add neighborhood-relative logic when Phase 2
// card deformation is implemented.

export function getExpandedFootprint(index, columnCount, totalCards) {
  const row       = Math.floor(index / columnCount) + 1  // 1-indexed
  const col       = (index % columnCount) + 1            // 1-indexed
  const totalRows = Math.ceil(totalCards / columnCount)

  // Degrade the span when the grid is too small to hold a 2×2 footprint.
  const colSpan = Math.min(2, columnCount)
  const rowSpan = Math.min(2, totalRows)

  // The down-right bias only applies where there is room to bias (span 2). At
  // the right edge / bottom row, extend the other way by starting one line
  // back. At span 1 the start is simply the natural line, so no clamp is ever
  // needed and colStart / rowStart stay ≥ 1.
  const extendsLeft = colSpan === 2 && col === columnCount
  const extendsUp   = rowSpan === 2 && row === totalRows

  const colStart = extendsLeft ? col - 1 : col
  const rowStart = extendsUp   ? row - 1 : row

  const transformOrigin =
    `${extendsLeft ? '100%' : '0%'} ${extendsUp ? '100%' : '0%'}`

  return {
    gridColumn: `${colStart} / span ${colSpan}`,
    gridRow:    `${rowStart} / span ${rowSpan}`,
    transformOrigin,
  }
}
