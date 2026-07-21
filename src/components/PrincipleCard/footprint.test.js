import { describe, it, expect } from 'vitest'
import { getExpandedFootprint } from './footprint'

// Covers every case the header comment names plus the degenerate sizes. The
// degenerate rows are the point of the extraction: getExpandedFootprint(index,
// 1, n) used to return "0 / span 2" (line 0 is invalid in a 1-indexed grid),
// reachable only because a CSS min-width in a different file keeps auto-fit at
// ≥2 columns. See docs/decisions/grid-architecture.md.

// A 3×2 grid (3 columns, 6 cards) exercises interior, both edges, and the
// corner. Indices are 0-based; positions are 1-indexed in the footprint.
//
//   0  1  2      row 1
//   3  4  5      row 2
describe('getExpandedFootprint: 3 columns, 6 cards', () => {
  const COLS = 3
  const TOTAL = 6

  it('interior card biases down-right from its natural corner', () => {
    // index 1 → row 1, col 2. Interior: extend right and down.
    expect(getExpandedFootprint(1, COLS, TOTAL)).toEqual({
      gridColumn: '2 / span 2',
      gridRow: '1 / span 2',
      transformOrigin: '0% 0%',
    })
  })

  it('right-edge card extends left', () => {
    // index 2 → row 1, col 3 (== columnCount). Extend left: colStart = 2.
    expect(getExpandedFootprint(2, COLS, TOTAL)).toEqual({
      gridColumn: '2 / span 2',
      gridRow: '1 / span 2',
      transformOrigin: '100% 0%',
    })
  })

  it('bottom-row card extends up', () => {
    // index 3 → row 2 (== totalRows), col 1. Extend up: rowStart = 1.
    expect(getExpandedFootprint(3, COLS, TOTAL)).toEqual({
      gridColumn: '1 / span 2',
      gridRow: '1 / span 2',
      transformOrigin: '0% 100%',
    })
  })

  it('bottom-right corner extends left and up', () => {
    // index 5 → row 2, col 3. Both edges: colStart 2, rowStart 1.
    expect(getExpandedFootprint(5, COLS, TOTAL)).toEqual({
      gridColumn: '2 / span 2',
      gridRow: '1 / span 2',
      transformOrigin: '100% 100%',
    })
  })

  it('first card is a plain interior expansion', () => {
    // index 0 → row 1, col 1. No edge.
    expect(getExpandedFootprint(0, COLS, TOTAL)).toEqual({
      gridColumn: '1 / span 2',
      gridRow: '1 / span 2',
      transformOrigin: '0% 0%',
    })
  })

  it('last card is the bottom-right corner', () => {
    // index 5 is the last card and the corner; covered above, asserted here as
    // the "last card" case the header comment names.
    expect(getExpandedFootprint(TOTAL - 1, COLS, TOTAL)).toEqual({
      gridColumn: '2 / span 2',
      gridRow: '1 / span 2',
      transformOrigin: '100% 100%',
    })
  })
})

// Degenerate sizes: the span degrades rather than emitting an invalid line or
// overflowing the track list.
describe('getExpandedFootprint: degenerate grid sizes', () => {
  it('single column degrades the column span to 1 (no line 0)', () => {
    // The bug: columnCount 1 → col 1 == columnCount → old colStart = 0, and
    // "0 / span 2" names a line that does not exist. Now: 1-wide footprint.
    // Two rows remain, so the row span still expands and biases.
    //   index 0 in a 1-col, 3-card grid → row 1 of 3, col 1.
    expect(getExpandedFootprint(0, 1, 3)).toEqual({
      gridColumn: '1 / span 1',
      gridRow: '1 / span 2',
      transformOrigin: '0% 0%',
    })
  })

  it('single column, bottom row: row span still extends up, column stays 1', () => {
    // index 2 in a 1-col, 3-card grid → row 3 (== totalRows), col 1.
    expect(getExpandedFootprint(2, 1, 3)).toEqual({
      gridColumn: '1 / span 1',
      gridRow: '2 / span 2',
      transformOrigin: '0% 100%',
    })
  })

  it('single row degrades the row span to 1 (no line 0)', () => {
    // Symmetric bug on the other axis. 3 columns, 3 cards → one row.
    //   index 0 → row 1 (== totalRows), col 1. Column span still expands.
    expect(getExpandedFootprint(0, 3, 3)).toEqual({
      gridColumn: '1 / span 2',
      gridRow: '1 / span 1',
      transformOrigin: '0% 0%',
    })
  })

  it('single row, right edge: column span still extends left, row stays 1', () => {
    // index 2 in a 3-col, 3-card single-row grid → row 1, col 3 (== columnCount).
    expect(getExpandedFootprint(2, 3, 3)).toEqual({
      gridColumn: '2 / span 2',
      gridRow: '1 / span 1',
      transformOrigin: '100% 0%',
    })
  })

  it('single-card grid degrades both axes at once', () => {
    // columnCount 1, one card: one column and one row. No span, no bias, no
    // invalid line on either axis.
    expect(getExpandedFootprint(0, 1, 1)).toEqual({
      gridColumn: '1 / span 1',
      gridRow: '1 / span 1',
      transformOrigin: '0% 0%',
    })
  })
})
