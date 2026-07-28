import { describe, it, expect } from 'vitest'
import { axial, smoothstep, walkSegment, densityMap } from './raster'

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

