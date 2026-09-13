import { describe, it, expect } from 'vitest'
import { REDUCED_MOTION_RESOLUTION, INITIAL_STATE, stateToTokens } from 'cadence-tokens'
import { reduceMotion } from './MotionTokensContext'

// Three things answer reduced motion for this system and they have to give the
// same answer: the provider flattens live tokens, the CSS export writes a
// prefers-reduced-motion block, and the resolver document writes a reduced
// context. The two numbers live in the package so there is one source; this
// file is the site-side half of that contract, the same shape
// motionCssDrift.test.js takes for the token values themselves.
//
// The export half is pinned in motionCssDrift.test.js (the media block) and in
// the package's own suite (the resolver document).
describe('the provider applies the package resolution', () => {
  const tokens = stateToTokens(INITIAL_STATE)
  const reduced = reduceMotion(tokens)

  it('collapses every duration to the resolution, in runtime units', () => {
    const expected = REDUCED_MOTION_RESOLUTION.duration / 1000
    expect(Object.keys(reduced.duration).sort()).toEqual(Object.keys(tokens.duration).sort())
    for (const [key, value] of Object.entries(reduced.duration)) {
      expect(value, key).toBe(expected)
    }
  })

  it('takes every delay to the resolution, delay.none included', () => {
    const expected = REDUCED_MOTION_RESOLUTION.delay / 1000
    expect(Object.keys(reduced.delay).sort()).toEqual(Object.keys(tokens.delay).sort())
    for (const [key, value] of Object.entries(reduced.delay)) {
      expect(value, key).toBe(expected)
    }
  })

  it('leaves untouched exactly what the resolution says it leaves untouched', () => {
    // easing, scale and spring travel through unchanged. The scalar never
    // reaches the runtime token object at all (it has no consumer under a
    // provider), so the resolution names it while this assertion cannot.
    expect(REDUCED_MOTION_RESOLUTION.unchanged).toEqual(['easing', 'scale', 'spring', 'scalar'])
    expect(reduced.ease).toEqual(tokens.ease)
    expect(reduced.scale).toEqual(tokens.scale)
    expect(reduced.spring).toEqual(tokens.spring)
  })

  it('flags itself, which is how a spring consumer knows', () => {
    // A physics spring has no duration, so flattening durations does nothing to
    // it. The flag is the only way a spring consumer can tell, and it is the
    // part of the resolution a token file cannot carry.
    expect(reduced.reducedMotion).toBe(true)
    expect(tokens.reducedMotion).toBeUndefined()
  })
})
