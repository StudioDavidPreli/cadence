import { describe, it, expect } from 'vitest'
import { FIELD, generateField } from './generateField'

// The properties under test are the ones the component leans on, not the
// aesthetic (that was tuned and approved in the sandbox, 2026-07-19):
// determinism, resize stability, calm-zone order, and HC sparse thinning.

describe('generateField', () => {
  it('is deterministic: same inputs, same field', () => {
    const a = generateField('easing', 900, 700)
    const b = generateField('easing', 900, 700)
    expect(a).toEqual(b)
  })

  it('draws a different field per seed', () => {
    const a = generateField('duration', 900, 700)
    const b = generateField('easing', 900, 700)
    expect(a).not.toEqual(b)
  })

  it('keeps existing marks in place when the layer grows', () => {
    // Left/top-anchored indices: growing the layer may only add marks at the
    // right and bottom margins. Every mark of the smaller field must appear
    // identically in the larger one.
    const small = generateField('delay', 800, 600)
    const large = generateField('delay', 1100, 800)
    const byKey = new Map(large.map((m) => [m.key, m]))
    for (const mark of small) {
      expect(byKey.get(mark.key)).toEqual(mark)
    }
  })

  it('holds a perfect grid inside the calm band', () => {
    // Freedom is 0 where the demos live, so marks there carry no jitter,
    // no rotation, no weight variance, and no dropout.
    const marks = generateField('scale', 1400, 700)
    const calm = marks.filter((m) => m.x <= FIELD.calmBand)
    expect(calm.length).toBeGreaterThan(0)
    for (const m of calm) {
      expect(m.x % FIELD.cell).toBe(0)
      expect(m.y % FIELD.cell).toBe(0)
      expect(m.rot).toBe(0)
      expect(m.sw).toBe(1)
    }
    // No dropout at f = 0: the band holds every vertex it spans.
    const cols = Math.floor(FIELD.calmBand / FIELD.cell)
    const rows = Math.floor(700 / FIELD.cell)
    expect(calm.length).toBe(cols * rows)
  })

  it('loosens outside the calm band', () => {
    // Far beyond the falloff the field must actually be irregular — some
    // jittered position, rotation, or weight on at least most marks.
    const marks = generateField('scale', 2000, 700)
    const wild = marks.filter((m) => m.x > FIELD.calmBand + FIELD.falloff)
    expect(wild.length).toBeGreaterThan(0)
    const irregular = wild.filter((m) => m.rot !== 0 || m.sw !== 1)
    expect(irregular.length).toBeGreaterThan(wild.length * 0.9)
  })

  it('thins the field in sparse mode', () => {
    const full = generateField('press-state', 1200, 800)
    const sparse = generateField('press-state', 1200, 800, { sparse: true })
    // sparseKeep is the survival probability, so the sparse count should sit
    // near that fraction; assert a generous band rather than an exact ratio.
    expect(sparse.length).toBeLessThan(full.length * (FIELD.sparseKeep + 0.1))
    expect(sparse.length).toBeGreaterThan(0)
  })
})
