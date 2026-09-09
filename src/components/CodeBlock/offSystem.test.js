import { describe, it, expect } from 'vitest'
import { INITIAL_STATE, stateToTokens } from 'cadence-tokens'
import {
  formatLiteral, formatDisplay, parseLiteral, nearestToken, offSystemComment,
  patchTokens, adoptAction, deviationsFromOverrides, overridesFromDeviations,
} from './offSystem'

const tokens = stateToTokens(INITIAL_STATE)

describe('parseLiteral', () => {
  it('reads a number in runtime units and bounds it to Explore', () => {
    expect(parseLiteral('duration.fast', '0.25')).toEqual({ ok: true, value: 0.25 })
    expect(parseLiteral('duration.fast', ' .5 ')).toEqual({ ok: true, value: 0.5 })
    expect(parseLiteral('duration.fast', '3').ok).toBe(false)       // 2s cap
    expect(parseLiteral('scale.pressBase', '0.93')).toEqual({ ok: true, value: 0.93 })
    expect(parseLiteral('scale.pressBase', '1.5').ok).toBe(false)
    expect(parseLiteral('spring.stiffness', '420')).toEqual({ ok: true, value: 420 })
    expect(parseLiteral('spring.mass', '0').ok).toBe(false)
  })

  it('rejects text that is not a number', () => {
    expect(parseLiteral('duration.fast', 'fast').ok).toBe(false)
    expect(parseLiteral('duration.fast', '0.2s').ok).toBe(false)
    expect(parseLiteral('duration.fast', '').ok).toBe(false)
  })

  it('reads a curve with or without brackets and checks the x range', () => {
    expect(parseLiteral('ease.overshoot', '[0.3, 1.4, 0.6, 1]')).toEqual({ ok: true, value: [0.3, 1.4, 0.6, 1] })
    expect(parseLiteral('ease.overshoot', '0.3,1.4,0.6,1').value).toEqual([0.3, 1.4, 0.6, 1])
    expect(parseLiteral('ease.overshoot', '[0.3, 1.4, 0.6]').ok).toBe(false)
    expect(parseLiteral('ease.overshoot', '[1.3, 1.4, 0.6, 1]').ok).toBe(false)
  })
})

describe('formatting', () => {
  it('prints the literal as source and the display with its unit', () => {
    expect(formatLiteral('duration.fast', 0.25)).toBe('0.25')
    expect(formatLiteral('duration.fast', 0.1234567)).toBe('0.123')
    expect(formatLiteral('ease.standard', [0.4, 0, 0.2, 1])).toBe('[0.4, 0, 0.2, 1]')
    expect(formatDisplay('duration.fast', 0.25)).toBe('0.25s')
    expect(formatDisplay('delay.short', 0.05)).toBe('0.05s')
    expect(formatDisplay('scale.lift', 1.02)).toBe('1.02')
  })
})

describe('nearestToken and the comment', () => {
  it('finds the nearest key in the family and says whether it matches', () => {
    expect(nearestToken('duration.fast', 0.25, tokens)).toEqual({ key: 'duration.base', value: 0.2, matches: false })
    expect(nearestToken('duration.fast', 0.2, tokens).matches).toBe(true)
    expect(nearestToken('ease.overshoot', [0.34, 1.56, 0.64, 1], tokens)).toEqual({ key: 'ease.overshoot', value: [0.34, 1.56, 0.64, 1], matches: true })
    expect(nearestToken('ease.overshoot', [0.4, 0.1, 0.2, 1], tokens).key).toBe('ease.standard')
  })

  it('words the three cases', () => {
    expect(offSystemComment('duration.fast', 0.2, tokens)).toBe('off-system: matches duration.base today')
    expect(offSystemComment('duration.fast', 0.15, tokens)).toBe('off-system: 0.15s, nearest duration.fast (0.1s)')
    expect(offSystemComment('ease.overshoot', [0.4, 0.1, 0.2, 1], tokens)).toBe('off-system: nearest ease.standard')
    expect(offSystemComment('scale.pressBase', 0.93, tokens)).toBe('off-system: 0.93, nearest scale.pressBase (0.95)')
  })
})

describe('patchTokens', () => {
  it('returns the same object when there is nothing to patch', () => {
    expect(patchTokens(tokens, {})).toBe(tokens)
    expect(patchTokens(tokens, undefined)).toBe(tokens)
  })

  it('writes overrides over the live values without touching the source', () => {
    const patched = patchTokens(tokens, { 'duration.fast': 0.25, 'ease.overshoot': [0.3, 1.4, 0.6, 1] })
    expect(patched.duration.fast).toBe(0.25)
    expect(patched.duration.base).toBe(0.2)
    expect(patched.ease.overshoot).toEqual([0.3, 1.4, 0.6, 1])
    expect(patched.ease.standard).toBe(tokens.ease.standard)
    expect(tokens.duration.fast).toBe(0.1)
  })
})

describe('adoptAction', () => {
  it('moves a duration back to ms and a curve to its named key when it has one', () => {
    expect(adoptAction('duration.fast', 0.25)).toEqual({ type: 'SET_DURATION', key: 'fast', value: 250 })
    expect(adoptAction('delay.short', 0.123)).toEqual({ type: 'SET_DELAY', key: 'short', value: 123 })
    expect(adoptAction('scale.lift', 1.05)).toEqual({ type: 'SET_SCALE', key: 'lift', value: 1.05 })
    expect(adoptAction('spring.damping', 30)).toEqual({ type: 'SET_SPRING', key: 'damping', value: 30 })
    expect(adoptAction('ease.standard', [0.34, 1.56, 0.64, 1])).toEqual({ type: 'SET_EASING', slot: 'standard', value: 'overshoot' })
    expect(adoptAction('ease.standard', [0.3, 1.4, 0.6, 1])).toEqual({ type: 'SET_EASING', slot: 'standard', value: [0.3, 1.4, 0.6, 1] })
  })
})

describe('overrides <-> deviations', () => {
  it('flattens and rebuilds losslessly', () => {
    const overrides = { Button: { 'duration.fast': 0.25, 'ease.overshoot': [0.3, 1.4, 0.6, 1] }, Card: { 'scale.lift': 1.05 } }
    const deviations = deviationsFromOverrides(overrides)
    expect(deviations).toEqual([
      { component: 'Button', token: 'duration.fast', value: 0.25 },
      { component: 'Button', token: 'ease.overshoot', value: [0.3, 1.4, 0.6, 1] },
      { component: 'Card', token: 'scale.lift', value: 1.05 },
    ])
    expect(overridesFromDeviations(deviations)).toEqual(overrides)
    expect(overridesFromDeviations([])).toEqual({})
  })
})
