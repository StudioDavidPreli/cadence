import { describe, it, expect } from 'vitest'
import { hash32, draw, signedDraw, mulberry32 } from './rng'

describe('hash32', () => {
  it('is deterministic', () => {
    expect(hash32('nav-column')).toBe(hash32('nav-column'))
  })

  it('separates similar strings', () => {
    expect(hash32('seed-1')).not.toBe(hash32('seed-2'))
    expect(hash32('ab')).not.toBe(hash32('ba'))
  })

  it('returns a 32-bit unsigned integer', () => {
    for (const s of ['', 'a', 'nav-column', '11', 'a much longer seed string']) {
      const h = hash32(s)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(2 ** 32)
    }
  })
})

describe('draw', () => {
  it('is deterministic for the same cell and salt', () => {
    expect(draw(11, 4, 9, 1)).toBe(draw(11, 4, 9, 1))
  })

  it('stays in [0, 1)', () => {
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        const v = draw(11, i, j, 1)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    }
  })

  it('gives a cell its own numbers regardless of visit order', () => {
    // The property the whole sampler is built on. A cell's value cannot depend
    // on how many cells were drawn before it, because nothing is drawn before
    // it: there is no stream.
    const forward = []
    for (let i = 0; i < 10; i++) forward.push(draw(11, i, 3, 1))
    const backward = []
    for (let i = 9; i >= 0; i--) backward.unshift(draw(11, i, 3, 1))
    expect(forward).toEqual(backward)
  })

  it('decorrelates salts, so jitter and rotation are not the same number', () => {
    let same = 0
    for (let i = 0; i < 200; i++) {
      if (Math.abs(draw(11, i, 0, 1) - draw(11, i, 0, 2)) < 1e-12) same++
    }
    expect(same).toBe(0)
  })

  it('decorrelates seeds', () => {
    let same = 0
    for (let i = 0; i < 200; i++) {
      if (Math.abs(draw(11, i, 0, 1) - draw(12, i, 0, 1)) < 1e-12) same++
    }
    expect(same).toBe(0)
  })

  it('separates the two grid axes, so (3,7) and (7,3) differ', () => {
    expect(draw(11, 3, 7, 1)).not.toBe(draw(11, 7, 3, 1))
  })

  it('handles negative grid indices', () => {
    // Cells left of and above the surface origin are real: the armature can
    // wander out of bounds before raster clips it.
    for (const [i, j] of [[-1, -1], [-40, 3], [5, -12]]) {
      const v = draw(11, i, j, 1)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is roughly uniform', () => {
    const buckets = new Array(10).fill(0)
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 100; j++) buckets[Math.floor(draw(11, i, j, 1) * 10)]++
    }
    // 10000 draws over 10 buckets; a fair spread is 1000 each. Loose bounds:
    // this is a smoke check on the mixing, not a statistical certification.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(800)
      expect(count).toBeLessThan(1200)
    }
  })
})

describe('signedDraw', () => {
  it('stays in [-1, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = signedDraw(11, i, 0, 1)
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThan(1)
    }
  })

  it('centers near zero, so jitter does not drift one way', () => {
    let sum = 0
    let n = 0
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 100; j++) { sum += signedDraw(11, i, j, 2); n++ }
    }
    expect(Math.abs(sum / n)).toBeLessThan(0.02)
  })
})

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    for (let i = 0; i < 20; i++) expect(a()).toBe(b())
  })

  it('diverges on different seeds', () => {
    const a = mulberry32(7)
    const b = mulberry32(8)
    let same = 0
    for (let i = 0; i < 50; i++) if (a() === b()) same++
    expect(same).toBe(0)
  })

  it('stays in [0, 1)', () => {
    const next = mulberry32(7)
    for (let i = 0; i < 500; i++) {
      const v = next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('keeps two streams independent', () => {
    // Two concurrent L-system expansions (one per root) must not interfere,
    // which is why the state is closed over per call rather than module-level.
    const a = mulberry32(7)
    const b = mulberry32(7)
    a(); a(); a()
    const bFirst = b()
    const aFresh = mulberry32(7)
    expect(bFirst).toBe(aFresh())
  })

  it('advances, rather than returning the same value', () => {
    const next = mulberry32(7)
    const first = next()
    let changed = false
    for (let i = 0; i < 10; i++) if (next() !== first) changed = true
    expect(changed).toBe(true)
  })
})
