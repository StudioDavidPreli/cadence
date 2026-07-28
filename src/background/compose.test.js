import { describe, it, expect } from 'vitest'
import { samplePlacements, COMPOSE } from './compose'

// A field of weighted cells, `rows` tall, uniform weight unless `weightAt` says
// otherwise. Mirrors the shape raster.densityMap returns.
function field(rows, { cols = 8, cell = 14, weightAt = () => 1 } = {}) {
  const cells = []
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const w = weightAt(ix, iy)
      if (w > 0) {
        cells.push({
          ix, iy,
          cx: ix * cell + cell / 2,
          cy: iy * cell + cell / 2,
          weight: w,
          orientation: 0,
        })
      }
    }
  }
  return cells
}

const base = { seed: 11, budget: 120, markCount: 6, scale: 0.21, cellSize: 14 }
const key = (p) => `${p.ix},${p.iy},${p.k}`

describe('samplePlacements minSpacing', () => {
  const spread = { ...base, budget: 200 }

  it('is inert at 0, which is the committed behaviour', () => {
    const off = samplePlacements(field(30), spread).placements
    const zero = samplePlacements(field(30), { ...spread, minSpacing: 0 }).placements
    expect(zero).toEqual(off)
  })

  it('leaves no two accepted centers closer than the spacing', () => {
    const { placements } = samplePlacements(field(30), { ...spread, minSpacing: 20 })
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const d = Math.hypot(placements[i].x - placements[j].x, placements[i].y - placements[j].y)
        expect(d).toBeGreaterThanOrEqual(20)
      }
    }
  })

  it('thins rather than rearranges: every survivor was in the unspaced set', () => {
    const off = new Set(samplePlacements(field(30), spread).placements.map(key))
    const on = samplePlacements(field(30), { ...spread, minSpacing: 20 }).placements
    for (const p of on) expect(off.has(key(p))).toBe(true)
  })

  it('reports what it dropped', () => {
    const off = samplePlacements(field(30), spread).placements.length
    const { placements, stats } = samplePlacements(field(30), { ...spread, minSpacing: 20 })
    expect(stats.rejected).toBe(off - placements.length)
    expect(stats.budget).toBe(placements.length)
  })

  it('is deterministic, so the reveal cannot restagger between runs', () => {
    const a = samplePlacements(field(30), { ...spread, minSpacing: 25 }).placements
    const b = samplePlacements(field(30), { ...spread, minSpacing: 25 }).placements
    expect(a.map(key)).toEqual(b.map(key))
  })

  it('drops more as the spacing grows', () => {
    const counts = [0, 15, 30, 60].map(
      (minSpacing) => samplePlacements(field(30), { ...spread, minSpacing }).placements.length,
    )
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
  })
})

describe('samplePlacements', () => {
  it('returns nothing for an empty field', () => {
    const { placements, stats } = samplePlacements([], base)
    expect(placements).toEqual([])
    expect(stats.budget).toBe(0)
  })

  it('returns nothing for a zero budget or an empty library', () => {
    expect(samplePlacements(field(10), { ...base, budget: 0 }).placements).toEqual([])
    expect(samplePlacements(field(10), { ...base, markCount: 0 }).placements).toEqual([])
  })

  it('returns nothing when every cell weighs zero', () => {
    const cells = field(4).map((c) => ({ ...c, weight: 0 }))
    expect(samplePlacements(cells, base).placements).toEqual([])
  })

  it('lands near the requested budget', () => {
    // Approximate by design: the fractional part of each cell's expected count
    // is a Bernoulli trial, so the total is a sum of independent draws rather
    // than an exact N.
    const { placements } = samplePlacements(field(30), base)
    expect(placements.length).toBeGreaterThan(120 * 0.8)
    expect(placements.length).toBeLessThan(120 * 1.2)
  })

  it('is deterministic', () => {
    const cells = field(30)
    const a = samplePlacements(cells, base).placements
    const b = samplePlacements(cells, base).placements
    expect(a).toEqual(b)
  })

  it('does not depend on the order the cells arrive in', () => {
    // The reason for hash draws over a stream. A cumulative-distribution
    // sampler fails this outright.
    const cells = field(30)
    const forward = samplePlacements(cells, base).placements
    const shuffled = samplePlacements([...cells].reverse(), base).placements
    expect(shuffled.map(key)).toEqual(forward.map(key))
  })

  it('gives a different field for a different seed', () => {
    const cells = field(30)
    const a = samplePlacements(cells, base).placements
    const b = samplePlacements(cells, { ...base, seed: 12 }).placements
    expect(a.map(key)).not.toEqual(b.map(key))
  })

  it('preserves clustering: a heavy cell can take more than one stamp', () => {
    // The integer part of the expected count is guaranteed, so weight really
    // does concentrate rather than capping at one stamp per cell.
    const cells = field(6, { cols: 4, weightAt: (ix, iy) => (ix === 1 && iy === 1 ? 400 : 1) })
    const { placements } = samplePlacements(cells, cells.length ? base : base)
    const inHot = placements.filter((p) => p.ix === 1 && p.iy === 1)
    expect(inHot.length).toBeGreaterThan(1)
    expect(new Set(inHot.map((p) => p.k)).size).toBe(inHot.length)
  })

  it('gives stamps in one cell different jitter and rotation', () => {
    const cells = field(4, { cols: 2, weightAt: (ix, iy) => (ix === 0 && iy === 0 ? 500 : 1) })
    const { placements } = samplePlacements(cells, base)
    const inHot = placements.filter((p) => p.ix === 0 && p.iy === 0)
    expect(inHot.length).toBeGreaterThan(2)
    expect(new Set(inHot.map((p) => p.x)).size).toBe(inHot.length)
    expect(new Set(inHot.map((p) => p.rotation)).size).toBe(inHot.length)
  })

  it('weights placement by cell weight', () => {
    const cells = field(10, { cols: 6, weightAt: (ix) => (ix < 3 ? 8 : 1) })
    const { placements } = samplePlacements(cells, base)
    const heavy = placements.filter((p) => p.ix < 3).length
    const light = placements.filter((p) => p.ix >= 3).length
    expect(heavy).toBeGreaterThan(light * 3)
  })

  it('tightens the scatter as gamma rises', () => {
    const cells = field(10, { cols: 6, weightAt: (ix) => (ix < 2 ? 4 : 1) })
    const soft = samplePlacements(cells, { ...base, gamma: 0.6 }).placements
    const hard = samplePlacements(cells, { ...base, gamma: 2.6 }).placements
    const share = (ps) => ps.filter((p) => p.ix < 2).length / ps.length
    expect(share(hard)).toBeGreaterThan(share(soft))
  })

  it('keeps jitter inside the cell it was weighted for', () => {
    const { placements } = samplePlacements(field(30), base)
    const span = base.cellSize * COMPOSE.jitter
    for (const p of placements) {
      const cx = p.ix * base.cellSize + base.cellSize / 2
      const cy = p.iy * base.cellSize + base.cellSize / 2
      expect(Math.abs(p.x - cx)).toBeLessThanOrEqual(span)
      expect(Math.abs(p.y - cy)).toBeLessThanOrEqual(span)
    }
  })

  it('aligns rotation to the cell flow, with jitter around it', () => {
    const cells = field(20).map((c) => ({ ...c, orientation: 1 }))
    const { placements } = samplePlacements(cells, base)
    for (const p of placements) {
      expect(Math.abs(p.rotation - 1)).toBeLessThanOrEqual(COMPOSE.rotationJitter / 2)
    }
    expect(new Set(placements.map((p) => p.rotation)).size).toBeGreaterThan(1)
  })

  it('spreads rotation over the full turn when flow align is off', () => {
    const cells = field(20).map((c) => ({ ...c, orientation: 1 }))
    const { placements } = samplePlacements(cells, { ...base, alignFlow: false })
    const max = Math.max(...placements.map((p) => p.rotation))
    const min = Math.min(...placements.map((p) => p.rotation))
    expect(max - min).toBeGreaterThan(Math.PI)
  })

  it('picks marks inside the library range', () => {
    const { placements } = samplePlacements(field(30), { ...base, markCount: 3 })
    for (const p of placements) {
      expect(p.markIndex).toBeGreaterThanOrEqual(0)
      expect(p.markIndex).toBeLessThan(3)
      expect(Number.isInteger(p.markIndex)).toBe(true)
    }
  })

  it('varies stamp scale around the base', () => {
    const { placements } = samplePlacements(field(30), base)
    const scales = placements.map((p) => p.scale)
    expect(Math.min(...scales)).toBeLessThan(base.scale)
    expect(Math.max(...scales)).toBeGreaterThan(base.scale)
    for (const s of scales) {
      expect(s).toBeGreaterThan(base.scale * (1 - COMPOSE.scaleVariance - 1e-9))
      expect(s).toBeLessThan(base.scale * (1 + COMPOSE.scaleVariance + 1e-9))
    }
  })

  it('sorts top to bottom with a total tiebreak', () => {
    const { placements } = samplePlacements(field(30), base)
    for (let i = 1; i < placements.length; i++) {
      expect(placements[i].y).toBeGreaterThanOrEqual(placements[i - 1].y - 1e-9)
    }
    // The order must be total, or two stamps at an identical y could swap
    // between runs and restagger the reveal.
    const cells = field(6, { cols: 3, weightAt: () => 1 })
    const a = samplePlacements(cells, base).placements.map(key)
    const b = samplePlacements([...cells].reverse(), base).placements.map(key)
    expect(a).toEqual(b)
  })

  it('degrades gracefully when the field grows, rather than reshuffling', () => {
    // This is the property the hash idiom buys, stated precisely because the
    // amendment that specified this sampler overclaimed it.
    //
    // A cumulative-distribution sampler reshuffles COMPLETELY when the field
    // changes size: every draw after the first shifts. This one does not,
    // because each cell's numbers are its own. But it is not perfectly stable
    // either: the expected count divides by the TOTAL weight of the field, so
    // adding cells lowers every cell's expectation slightly, and cells whose
    // fraction sat near their Bernoulli threshold can flip.
    //
    // So the guarantee is: most of the composition survives a resize, and the
    // part that changes is proportional to how much the field grew.
    const short = field(20)
    const tall = field(26)                       // six more rows at the bottom
    const a = samplePlacements(short, base).placements
    const b = samplePlacements(tall, base).placements

    const inShared = (p) => p.iy < 20
    const aShared = new Set(a.filter(inShared).map(key))
    const bShared = new Set(b.filter(inShared).map(key))
    const kept = [...aShared].filter((k) => bShared.has(k)).length
    const survival = kept / aShared.size

    expect(survival).toBeGreaterThan(0.6)

    // And what does survive is identical, not merely present: a surviving
    // stamp keeps its exact position, rotation and mark.
    const byKey = new Map(b.map((p) => [key(p), p]))
    for (const p of a.filter((q) => inShared(q) && byKey.has(key(q)))) {
      const q = byKey.get(key(p))
      expect(q.x).toBe(p.x)
      expect(q.y).toBe(p.y)
      expect(q.rotation).toBe(p.rotation)
      expect(q.markIndex).toBe(p.markIndex)
    }
  })

  it('reports the budget it actually placed', () => {
    const { placements, stats } = samplePlacements(field(30), base)
    expect(stats.budget).toBe(placements.length)
    expect(stats.cells).toBe(field(30).length)
    expect(stats.occupied).toBeGreaterThan(0)
    expect(stats.occupied).toBeLessThanOrEqual(stats.cells)
  })
})

