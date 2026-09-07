import { describe, it, expect } from 'vitest'
import { importTokens } from 'cadence-tokens'
import {
  proposeDurationSlot, proposeCurveSlot, buildMeasuredTokens, bezierCss, libraryBezier,
} from './measureExport'

describe('slot proposals', () => {
  it('picks the nearest duration slot on a log scale', () => {
    expect(proposeDurationSlot(99)).toBe('fast')
    expect(proposeDurationSlot(140)).toBe('fast')     // ratio 1.4 to fast, 1.43 to base
    expect(proposeDurationSlot(233)).toBe('base')
    expect(proposeDurationSlot(599)).toBe('slower')
    expect(proposeDurationSlot(20)).toBe('fast')
    expect(proposeDurationSlot(2000)).toBe('slower')
  })
  it('maps library names to slots, with linear reading as standard', () => {
    expect(proposeCurveSlot('overshoot')).toBe('overshoot')
    expect(proposeCurveSlot('enter')).toBe('enter')
    expect(proposeCurveSlot('linear')).toBe('standard')
    expect(proposeCurveSlot('nonsense')).toBe('standard')
  })
})

describe('the measured token file', () => {
  it('imports cleanly, fills the unmeasured keys from Standard, and keeps the measured ones', () => {
    const text = buildMeasuredTokens({
      durationSlot: 'fast', durationMs: 99, curveSlot: 'standard', bezier: libraryBezier('standard'),
    })
    const r = importTokens(text)
    expect(r.ok).toBe(true)
    expect(r.state.duration.fast).toBe(99)
    expect(r.state.duration.base).toBe(200)
    // A measured curve equal to a library curve comes back under its name.
    expect(r.state.easing.standard).toBe('standard')
    expect(r.report.filled.length).toBeGreaterThan(10)
    expect(r.report.clamped).toEqual([])
  })
  it('carries a free bezier as a four-number curve and a label the importer ignores', () => {
    const text = buildMeasuredTokens({
      durationSlot: 'slow', durationMs: 446.4, curveSlot: 'overshoot', bezier: [0.31, 1.5, 0.38, 1],
    })
    const doc = JSON.parse(text)
    expect(doc.label).toBe('Measured')
    expect(doc.duration).toEqual({ slow: '446ms' })
    expect(doc.easing.overshoot).toBe('cubic-bezier(0.31, 1.5, 0.38, 1)')
    const r = importTokens(text)
    expect(r.ok).toBe(true)
    expect(r.state.duration.slow).toBe(446)
    expect(r.state.easing.overshoot).toEqual([0.31, 1.5, 0.38, 1])
  })
  it('rejects a slot it does not know', () => {
    expect(() => buildMeasuredTokens({ durationSlot: 'x', durationMs: 1, curveSlot: 'standard', bezier: [0, 0, 1, 1] })).toThrow()
  })
  it('spells a bezier the way the package does', () => {
    expect(bezierCss([0.4, 0, 0.2, 1])).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
  })
})
