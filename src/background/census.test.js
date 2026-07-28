import { describe, it, expect } from 'vitest'
import { inkCensus, markDensity, markCensus, normalizationFactors } from './census'

// A stroke is a subpath: { pts, color, tokenBound }. These fixtures use straight
// runs so the lengths are checkable by hand.
const line = (color, len, opts = {}) => ({
  color,
  tokenBound: !!opts.tokenBound,
  pts: [{ x: 0, y: 0 }, { x: len, y: 0 }],
})

const mark = (name, strokes) => ({ name, strokes })

describe('inkCensus', () => {
  it('weights by stroke length, not by how often an ink appears', () => {
    // #aaa appears three times but carries 30 units; #bbb appears once with 70.
    const lib = [mark('m', [line('#aaa', 10), line('#aaa', 10), line('#aaa', 10), line('#bbb', 70)])]
    const [first, second] = inkCensus(lib)
    expect(first.ink).toBe('#bbb')
    expect(first.share).toBeCloseTo(0.7, 6)
    expect(second.ink).toBe('#aaa')
    expect(second.share).toBeCloseTo(0.3, 6)
  })

  it('shares sum to one', () => {
    const lib = [mark('a', [line('#aaa', 3), line('#bbb', 7)]), mark('b', [line('#ccc', 5)])]
    expect(inkCensus(lib).reduce((n, e) => n + e.share, 0)).toBeCloseTo(1, 10)
  })

  it('folds token-bound strokes into one currentColor entry and flags it', () => {
    const lib = [mark('m', [line('#111', 5, { tokenBound: true }), line('#999', 5, { tokenBound: true })])]
    const rows = inkCensus(lib)
    expect(rows).toHaveLength(1)
    expect(rows[0].ink).toBe('currentColor')
    expect(rows[0].tokenBound).toBe(true)
  })

  it('survives an empty library', () => expect(inkCensus([])).toEqual([]))
})

describe('markDensity', () => {
  // The normalization is by sqrt(area), so density describes authoring style
  // rather than how big the mark happens to be drawn.
  it('is scale-invariant', () => {
    const small = mark('s', [
      { color: '#000', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] },
    ])
    const big = mark('b', [
      { color: '#000', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] },
    ])
    expect(markDensity(small).density).toBeCloseTo(markDensity(big).density, 10)
  })

  it('reports a denser mark as denser', () => {
    const sparse = mark('s', [{ color: '#000', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }])
    const dense = mark('d', [
      { color: '#000', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] },
      { color: '#000', pts: [{ x: 0, y: 5 }, { x: 10, y: 5 }] },
      { color: '#000', pts: [{ x: 5, y: 0 }, { x: 5, y: 10 }] },
    ])
    expect(markDensity(dense).density).toBeGreaterThan(markDensity(sparse).density)
  })
})

describe('markCensus', () => {
  it('uses the median, so one extreme outlier does not move the target', () => {
    const thin = mark('thin', [{ color: '#000', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }])
    const monster = mark('monster', [])
    monster.strokes = Array.from({ length: 40 }, (_, i) => ({
      color: '#000',
      pts: [{ x: 0, y: i / 4 }, { x: 10, y: i / 4 }],
    }))
    const withoutOutlier = markCensus([thin, thin, thin]).median
    const withOutlier = markCensus([thin, thin, thin, monster]).median
    // A mean would have been dragged upward here; the median holds.
    expect(withOutlier).toBeCloseTo(withoutOutlier, 10)
  })
})

describe('normalizationFactors', () => {
  const thin = mark('thin', [{ color: '#000', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }])
  const dense = mark('dense', [
    { color: '#000', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] },
    { color: '#000', pts: [{ x: 0, y: 3 }, { x: 10, y: 3 }] },
    { color: '#000', pts: [{ x: 0, y: 6 }, { x: 10, y: 6 }] },
  ])

  it('is inert at strength 0, so the committed drawing is untouched', () => {
    expect(normalizationFactors([thin, dense, thin], 0)).toEqual([1, 1, 1])
  })

  it('thickens the thin mark and thins the dense one', () => {
    const [a, b] = normalizationFactors([thin, dense], 1)
    expect(a).toBeGreaterThan(1)
    expect(b).toBeLessThan(1)
  })

  it('clamps, so a future outlier cannot draw a blob', () => {
    const hairline = mark('hair', [{ color: '#000', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] }])
    const packed = mark('packed', [])
    packed.strokes = Array.from({ length: 200 }, (_, i) => ({
      color: '#000',
      pts: [{ x: 0, y: i / 2 }, { x: 100, y: i / 2 }],
    }))
    for (const f of normalizationFactors([hairline, packed], 1)) {
      expect(f).toBeGreaterThanOrEqual(0.25)
      expect(f).toBeLessThanOrEqual(3)
    }
  })

  // The floor is loose on purpose (see normalizationFactors): thinning degrades
  // toward invisible, where thickening degrades toward wrong, so a dense outlier
  // is allowed to be corrected all the way down.
  //
  // Three marks, not two. With two the median sits halfway between them, so the
  // factor cannot fall below 0.5 however dense the outlier is. A library needs a
  // mass of ordinary marks before one of them can be an outlier against it,
  // which is the same reason markCensus takes the median rather than the mean.
  it('thins a dense outlier past the old 0.4 floor', () => {
    const ordinary = () => [{ color: '#000', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] }]
    const heavy = mark('heavy', [])
    heavy.strokes = Array.from({ length: 120 }, (_, i) => ({
      color: '#000',
      pts: [{ x: 0, y: i }, { x: 100, y: i }],
    }))
    const factors = normalizationFactors([mark('a', ordinary()), mark('b', ordinary()), heavy], 1)
    expect(factors[2]).toBeLessThan(0.4)
    expect(factors[2]).toBeGreaterThanOrEqual(0.25)
  })

  it('strength scales the correction between none and full', () => {
    const [full] = normalizationFactors([thin, dense], 1)
    const [half] = normalizationFactors([thin, dense], 0.5)
    expect(half).toBeGreaterThan(1)
    expect(half).toBeLessThan(full)
  })
})
