import { describe, it, expect } from 'vitest'
import {
  axial,
  bucketOf,
  smoothstep,
  walkSegment,
  densityMap,
  aggregate,
  AGGREGATION,
  DEGENERATE_EPSILON,
} from './raster'

// Collect every visit a walk makes, so the traversal's behavior can be asserted
// directly rather than through a consumer.
function collect(p0, p1, cell) {
  const visits = []
  const completed = walkSegment(p0, p1, cell, (ix, iy, length, angle) =>
    visits.push({ ix, iy, length, angle }),
  )
  return { visits, completed }
}

const totalLength = (visits) => visits.reduce((sum, v) => sum + v.length, 0)

// A horizontal stroke from (x0,y) to (x1,y), as aggregate() wants it.
const hLine = (x0, x1, y, color = null) => ({ pts: [{ x: x0, y }, { x: x1, y }], color })
const vLine = (y0, y1, x, color = null) => ({ pts: [{ x, y: y0 }, { x, y: y1 }], color })

describe('axial', () => {
  it('folds an angle into [0, PI)', () => {
    expect(axial(0)).toBe(0)
    expect(axial(Math.PI / 4)).toBeCloseTo(Math.PI / 4)
    expect(axial(Math.PI / 2)).toBeCloseTo(Math.PI / 2)
  })

  it('treats opposite directions as the same axis', () => {
    // The property the whole orientation rule depends on: a stroke and its
    // reverse lie on one axis and must not land in different buckets.
    expect(axial(Math.PI)).toBeCloseTo(0)
    expect(axial(-Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(axial((3 * Math.PI) / 4)).toBeCloseTo(axial(-Math.PI / 4))
  })

  it('never returns a negative angle', () => {
    for (const a of [-0.1, -Math.PI, -2 * Math.PI, -7]) {
      expect(axial(a)).toBeGreaterThanOrEqual(0)
      expect(axial(a)).toBeLessThan(Math.PI)
    }
  })
})

describe('bucketOf', () => {
  it('places the band centers', () => {
    // Four bands, centers at 0, 45, 90 and 135 degrees.
    expect(bucketOf(0, 4)).toBe(0)
    expect(bucketOf(Math.PI / 4, 4)).toBe(1)
    expect(bucketOf(Math.PI / 2, 4)).toBe(2)
    expect(bucketOf((3 * Math.PI) / 4, 4)).toBe(3)
  })

  it('breaks an exact boundary tie toward the higher band', () => {
    // This is the ruling. Dividing PI by 8 and by 4 are exact in binary
    // floating point, so PI/8 over PI/4 is exactly 0.5 and the assertion is
    // about Math.round's behavior rather than about luck.
    expect((Math.PI / 8) / (Math.PI / 4)).toBe(0.5)
    expect(bucketOf(Math.PI / 8, 4)).toBe(1)
    expect(bucketOf((3 * Math.PI) / 8, 4)).toBe(2)
    expect(bucketOf(Math.PI / 4, 2)).toBe(1)
  })

  it('folds the top edge back to zero, because orientation is axial', () => {
    expect(bucketOf(Math.PI, 4)).toBe(0)
    expect(bucketOf(Math.PI, 2)).toBe(0)
  })

  it('never returns a band outside the range', () => {
    for (const buckets of [2, 4]) {
      for (let t = 0; t < Math.PI; t += Math.PI / 64) {
        const b = bucketOf(t, buckets)
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThan(buckets)
      }
    }
  })
})

describe('smoothstep', () => {
  it('clamps outside the edges', () => {
    expect(smoothstep(10, 20, 5)).toBe(0)
    expect(smoothstep(10, 20, 25)).toBe(1)
  })

  it('is a half at the midpoint and monotonic between', () => {
    expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5)
    let prev = -1
    for (let x = 0; x <= 10; x += 1) {
      const v = smoothstep(0, 10, x)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  it('collapses to a hard step when the span is zero', () => {
    // fade: 0 is a legitimate clearance setting (David ran it), so a zero span
    // must not divide by zero.
    expect(smoothstep(10, 10, 9.9)).toBe(0)
    expect(smoothstep(10, 10, 10)).toBe(1)
    expect(Number.isNaN(smoothstep(10, 10, 11))).toBe(false)
  })
})

describe('walkSegment', () => {
  it('visits a single cell when the segment stays inside one', () => {
    const { visits, completed } = collect({ x: 2, y: 2 }, { x: 8, y: 8 }, 12)
    expect(completed).toBe(true)
    expect(visits).toHaveLength(1)
    expect(visits[0]).toMatchObject({ ix: 0, iy: 0 })
  })

  it('conserves length: crossings sum to the segment length', () => {
    // The strongest invariant in the file. Presence is measured in crossing
    // length, so if the traversal loses or double-counts length, every
    // threshold decision downstream is wrong.
    const cases = [
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      [{ x: 0, y: 0 }, { x: 0, y: 100 }],
      [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      [{ x: 3.7, y: 91.2 }, { x: 64.1, y: 12.9 }],
      [{ x: 100, y: 100 }, { x: 0, y: 0 }],
      [{ x: -40, y: -13 }, { x: 27, y: 55 }],
    ]
    for (const [p0, p1] of cases) {
      for (const cell of [4, 8, 10, 12, 37]) {
        const { visits, completed } = collect(p0, p1, cell)
        expect(completed).toBe(true)
        expect(totalLength(visits)).toBeCloseTo(Math.hypot(p1.x - p0.x, p1.y - p0.y), 6)
      }
    }
  })

  it('visits each cell exactly once', () => {
    const { visits } = collect({ x: 1, y: 1 }, { x: 97, y: 61 }, 8)
    const keys = visits.map((v) => `${v.ix},${v.iy}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('visits cells in contiguous steps, never skipping one', () => {
    // A shallow crossing is where a sampling approach drops a cell. Each step
    // must move exactly one cell on exactly one axis.
    const { visits } = collect({ x: 0.5, y: 0.5 }, { x: 96, y: 9 }, 8)
    for (let i = 1; i < visits.length; i++) {
      const d = Math.abs(visits[i].ix - visits[i - 1].ix) + Math.abs(visits[i].iy - visits[i - 1].iy)
      expect(d).toBe(1)
    }
  })

  it('reports the direction angle on every visit', () => {
    const { visits } = collect({ x: 0, y: 0 }, { x: 50, y: 50 }, 10)
    for (const v of visits) expect(v.angle).toBeCloseTo(Math.PI / 4)
  })

  it('walks negative coordinates without losing length', () => {
    const { visits, completed } = collect({ x: -30, y: -30 }, { x: -5, y: -2 }, 8)
    expect(completed).toBe(true)
    expect(totalLength(visits)).toBeCloseTo(Math.hypot(25, 28), 6)
    expect(visits.every((v) => v.ix < 0 && v.iy < 0)).toBe(true)
  })

  it('handles a segment starting exactly on a grid line', () => {
    const { visits, completed } = collect({ x: 12, y: 0 }, { x: 36, y: 0 }, 12)
    expect(completed).toBe(true)
    expect(totalLength(visits)).toBeCloseTo(24, 6)
  })

  it('treats a zero-length segment as complete and visits nothing', () => {
    const { visits, completed } = collect({ x: 5, y: 5 }, { x: 5, y: 5 }, 12)
    expect(completed).toBe(true)
    expect(visits).toHaveLength(0)
  })

  it('refuses non-finite input rather than looping', () => {
    expect(collect({ x: 0, y: 0 }, { x: NaN, y: 10 }, 12).completed).toBe(false)
    expect(collect({ x: Infinity, y: 0 }, { x: 10, y: 10 }, 12).completed).toBe(false)
  })

  it('refuses a non-positive cell size', () => {
    expect(collect({ x: 0, y: 0 }, { x: 10, y: 10 }, 0).completed).toBe(false)
    expect(collect({ x: 0, y: 0 }, { x: 10, y: 10 }, -4).completed).toBe(false)
  })

  it('completes long segments, so the step guard is not a silent truncator', () => {
    // The lab's guard was a flat 4000 that would quietly stop mid-segment. The
    // bound here is derived per segment, so a long walk still finishes.
    const { visits, completed } = collect({ x: 0, y: 0 }, { x: 4000, y: 2500 }, 2)
    expect(completed).toBe(true)
    expect(totalLength(visits)).toBeCloseTo(Math.hypot(4000, 2500), 4)
  })
})

describe('densityMap', () => {
  const opts = { cell: 10, width: 100, height: 200, baseline: 0, fade: 0 }

  it('weights cells by the length of armature crossing them', () => {
    const { cells } = densityMap([[{ x: 5, y: 55 }, { x: 95, y: 55 }]], opts)
    expect(cells.length).toBeGreaterThan(0)
    expect(cells.every((c) => c.iy === 5)).toBe(true)
    expect(cells.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(90, 6)
  })

  it('drops everything above the protected baseline', () => {
    const line = [{ x: 50, y: 5 }, { x: 50, y: 195 }]
    const { cells } = densityMap([line], { ...opts, baseline: 100, fade: 0 })
    expect(cells.length).toBeGreaterThan(0)
    // Cell centers below the baseline only. y = 100 is the step's own edge.
    expect(cells.every((c) => c.cy >= 100)).toBe(true)
  })

  it('ramps weight in across the fade instead of stepping', () => {
    const line = [{ x: 50, y: 0 }, { x: 50, y: 200 }]
    const { cells } = densityMap([line], { ...opts, baseline: 20, fade: 100 })
    const byY = [...cells].sort((a, b) => a.cy - b.cy)
    // Every cell crosses the same length, so weight differences are the ramp.
    for (let i = 1; i < byY.length; i++) {
      expect(byY[i].weight).toBeGreaterThanOrEqual(byY[i - 1].weight - 1e-9)
    }
    expect(byY[0].weight).toBeLessThan(byY[byY.length - 1].weight)
  })

  it('clips to the surface bounds', () => {
    const { cells } = densityMap([[{ x: -50, y: 100 }, { x: 150, y: 100 }]], opts)
    expect(cells.every((c) => c.ix >= 0 && c.cx < 100)).toBe(true)
  })

  it('reports the mean orientation of each cell', () => {
    const { cells } = densityMap([[{ x: 0, y: 55 }, { x: 100, y: 55 }]], opts)
    for (const c of cells) expect(c.orientation).toBeCloseTo(0)
  })

  it('returns cells in a stable order', () => {
    const lines = [[{ x: 5, y: 5 }, { x: 95, y: 190 }], [{ x: 95, y: 5 }, { x: 5, y: 190 }]]
    const a = densityMap(lines, opts).cells.map((c) => `${c.ix},${c.iy}`)
    const b = densityMap(lines, opts).cells.map((c) => `${c.ix},${c.iy}`)
    expect(a).toEqual(b)
    const sorted = [...a].sort()
    expect(new Set(a).size).toBe(a.length)
    expect(sorted.length).toBe(a.length)
  })
})

describe('aggregate', () => {
  const opts = { cell: 10, width: 200, height: 200 }

  it('drops cells below the presence threshold', () => {
    // A stub of ink 1px long in a 10px cell: 0.1 x cell, under the 0.2 bar.
    const { cells } = aggregate([hLine(2, 3, 5)], opts)
    expect(cells).toHaveLength(0)
  })

  it('keeps a cell once crossing length clears the threshold', () => {
    const { cells } = aggregate([hLine(2, 8, 5)], opts)   // 6px = 0.6 x cell
    expect(cells).toHaveLength(1)
  })

  it('measures length, not coverage, so stroke width is irrelevant', () => {
    // Nothing in the input carries a width, which is the point: presence is a
    // property of the path, so a hairline registers exactly like a heavy line.
    const thin = aggregate([hLine(0, 200, 5)], opts)
    expect(thin.cells.length).toBe(20)
  })

  it('puts horizontal ink in bucket 0', () => {
    const { cells } = aggregate([hLine(0, 200, 5)], opts)
    expect(cells.every((c) => c.level === 0)).toBe(true)
  })

  it('puts vertical ink in the middle bucket', () => {
    // theta = PI/2, bucket width PI/4, so level 2 of 4.
    const { cells } = aggregate([vLine(0, 200, 5)], opts)
    expect(cells.every((c) => c.level === 2)).toBe(true)
  })

  it('inverts the tone map', () => {
    const { cells } = aggregate([hLine(0, 200, 5)], opts)
    expect(cells.every((c) => c.tone === AGGREGATION.buckets - 1 - c.level)).toBe(true)
    const straight = aggregate([hLine(0, 200, 5)], { ...opts, invert: false })
    expect(straight.cells.every((c) => c.tone === c.level)).toBe(true)
  })

  it('is deterministic on a knife-edge boundary angle', () => {
    // The tie-break itself is asserted on bucketOf, where an exact boundary is
    // representable. Through the accumulator it is not: the mean comes back
    // from atan2 a rounding error either side of PI/8, so the only property
    // worth asserting at this level is that the answer never wobbles.
    const a = Math.PI / 8
    const stroke = { pts: [{ x: 0, y: 0 }, { x: 100 * Math.cos(a), y: 100 * Math.sin(a) }], color: null }
    const first = aggregate([stroke], opts).cells
    expect(first.length).toBeGreaterThan(0)
    for (let i = 0; i < 5; i++) {
      expect(aggregate([stroke], opts).cells).toEqual(first)
    }
    expect(first.every((c) => c.level === 0 || c.level === 1)).toBe(true)
  })

  it('cancels perpendicular crossings and flags them degenerate', () => {
    // The arithmetic recon finding F2 was built on, pinned here so nobody
    // "fixes" it later: a horizontal crossing adds (+l, 0) to the double-angle
    // accumulator and a vertical one adds (-l, 0). Equal amounts of each leave
    // no resultant, so the orientation is an artifact, not a reading.
    const strokes = [hLine(0, 10, 5), vLine(0, 10, 5)]
    const box = { ...opts, width: 10, height: 10 }
    const { cells, stats } = aggregate(strokes, box)
    expect(cells).toHaveLength(1)
    expect(stats.degenerate).toBe(1)
    // The tone is NOT zero. sin(PI) evaluates to ~1.2e-16 rather than 0, so a
    // perfectly balanced cell resolves to wherever that residue points. It is
    // repeatable, which is all that is required, but it is noise and not a
    // reading of the ink. That is the whole reason the flag exists.
    expect(aggregate(strokes, box).cells).toEqual(cells)
  })

  it('does not flag parallel crossings as degenerate', () => {
    const { stats } = aggregate([hLine(0, 10, 3), hLine(0, 10, 7)], {
      ...opts, width: 10, height: 10,
    })
    expect(stats.degenerate).toBe(0)
  })

  it('gives the cell to the longest-crossing color', () => {
    const { cells } = aggregate(
      [hLine(0, 9, 5, '#aaaaaa'), hLine(0, 3, 5, '#bbbbbb')],
      { ...opts, width: 10, height: 10 },
    )
    expect(cells).toHaveLength(1)
    expect(cells[0].color).toBe('#aaaaaa')
  })

  it('resolves color per stroke, so one mark can carry two inks', () => {
    const { cells } = aggregate(
      [hLine(0, 10, 5, '#aaaaaa'), hLine(100, 110, 5, '#bbbbbb')],
      opts,
    )
    const inks = new Set(cells.map((c) => c.color))
    expect(inks).toEqual(new Set(['#aaaaaa', '#bbbbbb']))
  })

  it('leaves color null when no stroke carries one', () => {
    const { cells } = aggregate([hLine(0, 10, 5)], { ...opts, width: 10, height: 10 })
    expect(cells[0].color).toBeNull()
  })

  it('runs the high-contrast variant on two buckets with no second code path', () => {
    const buckets = AGGREGATION.bucketsHighContrast
    const h = aggregate([hLine(0, 200, 5)], { ...opts, buckets })
    const v = aggregate([vLine(0, 200, 5)], { ...opts, buckets })
    expect(h.cells.every((c) => c.level === 0 && c.tone === 1)).toBe(true)
    // theta = PI/2 with bucket width PI/2 rounds to 1, folded by the modulo.
    expect(v.cells.every((c) => c.tone === 0)).toBe(true)
    expect(h.cells.concat(v.cells).every((c) => c.tone < buckets)).toBe(true)
  })

  it('clips to the surface bounds', () => {
    const { cells } = aggregate([hLine(-100, 300, 5)], opts)
    expect(cells.every((c) => c.ix >= 0 && c.ix * 10 < 200)).toBe(true)
  })

  it('reports no truncation for well-formed input', () => {
    const { stats } = aggregate([hLine(0, 200, 5), vLine(0, 200, 5)], opts)
    expect(stats.truncated).toBe(0)
    expect(stats.inked).toBeGreaterThan(0)
  })

  it('is deterministic: identical input gives identical output', () => {
    // The claim the whole system rests on. No rng and no time in this file, so
    // this is a structural guarantee rather than a sampled one.
    const strokes = [hLine(3, 187, 41, '#aaaaaa'), vLine(11, 190, 63, '#bbbbbb')]
    const a = aggregate(strokes, opts)
    const b = aggregate(strokes, opts)
    expect(a.cells).toEqual(b.cells)
    expect(a.stats).toEqual(b.stats)
  })

  it('is order-independent in the ink, not just repeatable', () => {
    // Two strokes crossing the same cells must aggregate the same regardless of
    // which was walked first, or the composition would depend on draw order.
    const s1 = hLine(0, 200, 45, '#aaaaaa')
    const s2 = vLine(0, 200, 85, '#bbbbbb')
    const forward = aggregate([s1, s2], opts).cells
    const reverse = aggregate([s2, s1], opts).cells
    expect(forward).toEqual(reverse)
  })

  it('exposes the degeneracy epsilon it measures against', () => {
    expect(DEGENERATE_EPSILON).toBeGreaterThan(0)
    expect(DEGENERATE_EPSILON).toBeLessThan(1)
  })
})
