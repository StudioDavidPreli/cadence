import { describe, it, expect, vi } from 'vitest'
import { parseMs, parseCubicBezier, parseUnitless, parseTokenValue } from './parse'

// Regression coverage for the production NaN crash: the CSS minifier rewrites
// token values ("400ms" → ".4s", spaces dropped in cubic-bezier), and the old
// parsers assumed the authored spelling. See
// docs/decisions/motion-token-nan-crash-2026-07-15.md.

describe('parseMs (CSS time → seconds)', () => {
  it('authored milliseconds', () => expect(parseMs('200ms')).toBeCloseTo(0.2, 12))
  it('minified fractional seconds (.Ns)', () => expect(parseMs('.2s')).toBeCloseTo(0.2, 12))
  it('explicit fractional seconds (0.Ns)', () => expect(parseMs('0.2s')).toBeCloseTo(0.2, 12))
  it('whole seconds', () => expect(parseMs('1s')).toBeCloseTo(1, 12))
  it('zero seconds', () => expect(parseMs('0s')).toBeCloseTo(0, 12))
  it('small fractional seconds', () => expect(parseMs('.05s')).toBeCloseTo(0.05, 12))
  it('surrounding whitespace', () => expect(parseMs(' .2s ')).toBeCloseTo(0.2, 12))
  it('uppercase unit', () => expect(parseMs('400MS')).toBeCloseTo(0.4, 12))
  it('invalid string → NaN (caller falls back)', () => expect(Number.isNaN(parseMs('nope'))).toBe(true))
})

describe('parseCubicBezier (CSS easing → [x1,y1,x2,y2])', () => {
  it('authored, comma-space separated', () =>
    expect(parseCubicBezier('cubic-bezier(0, 0, 0.2, 1)')).toEqual([0, 0, 0.2, 1]))
  it('minified with spaces (esbuild output)', () =>
    expect(parseCubicBezier('cubic-bezier(.4, 0, .2, 1)')).toEqual([0.4, 0, 0.2, 1]))
  it('minified without spaces', () =>
    expect(parseCubicBezier('cubic-bezier(0,0,.2,1)')).toEqual([0, 0, 0.2, 1]))
  it('malformed → array containing NaN (caller falls back)', () =>
    expect(parseCubicBezier('cubic-bezier(a,b)').some(Number.isNaN)).toBe(true))
})

describe('parseUnitless', () => {
  it('passes a decimal through', () => expect(parseUnitless('.95')).toBeCloseTo(0.95, 12))
  it('handles values above 1', () => expect(parseUnitless('1.02')).toBeCloseTo(1.02, 12))

  // Spring params ride the same unitless parser as scale. They are the only
  // tokens that read as large whole numbers (stiffness, damping), so pin those
  // and the fractional mass. Unitless values are minifier-safe (no ms→s
  // rewrite), but the parser is verified here regardless.
  it('reads whole-number stiffness and damping', () => {
    expect(parseUnitless('400')).toBe(400)
    expect(parseUnitless('30')).toBe(30)
  })
  it('reads a fractional mass', () => expect(parseUnitless('1.2')).toBeCloseTo(1.2, 12))
})

describe('parseTokenValue (NaN-fallback guard)', () => {
  it('returns the parsed value on success', () =>
    expect(parseTokenValue('.4s', parseMs, 0.9, '--x')).toBeCloseTo(0.4, 12))

  it('falls back when the value is empty or missing', () => {
    expect(parseTokenValue('', parseMs, 0.9)).toBe(0.9)
    expect(parseTokenValue(null, parseMs, 0.9)).toBe(0.9)
    expect(parseTokenValue(undefined, parseMs, 0.9)).toBe(0.9)
  })

  it('falls back when a scalar parses to NaN', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(parseTokenValue('nope', parseMs, 0.9, '--x')).toBe(0.9)
    spy.mockRestore()
  })

  it('falls back when an easing array contains NaN', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(parseTokenValue('cubic-bezier(a,b)', parseCubicBezier, [0, 0, 1, 1])).toEqual([0, 0, 1, 1])
    spy.mockRestore()
  })

  it('logs the failing token in dev', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    parseTokenValue('nope', parseMs, 0.9, '--motion-duration-slow')
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0].join(' ')).toContain('--motion-duration-slow')
    spy.mockRestore()
  })
})

describe('production minified forms (the exact values that crashed)', () => {
  const durations = [['.1s', 0.1], ['.2s', 0.2], ['.4s', 0.4], ['.6s', 0.6]]
  const delays = [['0s', 0], ['50ms', 0.05], ['.1s', 0.1], ['.2s', 0.2]]

  it.each([...durations, ...delays])('parseMs(%s) → %f, never NaN', (raw, expected) => {
    const v = parseMs(raw)
    expect(Number.isNaN(v)).toBe(false)
    expect(v).toBeCloseTo(expected, 12)
  })
})
