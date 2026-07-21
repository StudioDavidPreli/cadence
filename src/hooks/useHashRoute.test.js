import { describe, it, expect } from 'vitest'
import { parseHash, stateToHash, principleHash, LANDING } from './useHashRoute'

// The deep-link segment (#/principles/<filter>/<slug>) is the reason this hook
// grew a third principles segment. State carries the numeric principleId; the URL
// carries the authored slug. These cover that translation both directions plus
// the fail-soft and normalization rules from
// docs/decisions/principle-deep-links-2026-07-21.md.

describe('parseHash — principles deep link', () => {
  it('resolves a slug to its principleId and keeps the matching filter', () => {
    const state = parseHash('#/principles/classic/follow-through')
    expect(state).toMatchObject({
      section: 'principles',
      destination: 'principles',
      principleFilter: 'classic',
      principleId: 5,
    })
  })

  it('normalizes a mismatched filter to the principle\'s own family', () => {
    // staging is classic (id 3); the URL says extended. The id wins.
    const state = parseHash('#/principles/extended/staging')
    expect(state.principleId).toBe(3)
    expect(state.principleFilter).toBe('classic')
  })

  it('resolves an extended principle and normalizes an all filter', () => {
    const state = parseHash('#/principles/all/shared-vocabulary')
    expect(state.principleId).toBe(18)
    expect(state.principleFilter).toBe('extended')
  })

  it('fails soft on an unknown slug: plain grid at the parsed filter', () => {
    const state = parseHash('#/principles/classic/not-a-principle')
    expect(state.principleId).toBeNull()
    expect(state.principleFilter).toBe('classic')
    expect(state.section).toBe('principles')
  })

  it('accepts a numeric-id alias in the slug position', () => {
    expect(parseHash('#/principles/classic/5').principleId).toBe(5)
  })

  it('leaves principleId null for a bare grid route', () => {
    expect(parseHash('#/principles').principleId).toBeNull()
    expect(parseHash('#/principles/classic').principleId).toBeNull()
  })

  it('leaves principleId null on non-principles routes', () => {
    expect(parseHash('#/token-lab').principleId).toBeNull()
    expect(parseHash('#/motion-tiles/grid').principleId).toBeNull()
    expect(parseHash('').principleId).toBeNull()
  })
})

describe('stateToHash — principles deep link', () => {
  it('serializes an open principle to the three-segment slug form', () => {
    const hash = stateToHash({
      section: 'principles',
      destination: 'principles',
      principleFilter: 'classic',
      principleId: 5,
    })
    expect(hash).toBe('#/principles/classic/follow-through')
  })

  it('serializes a grid (no principleId) to the plain filtered route', () => {
    expect(
      stateToHash({ section: 'principles', principleFilter: 'classic', principleId: null }),
    ).toBe('#/principles/classic')
    expect(
      stateToHash({ section: 'principles', principleFilter: 'all', principleId: null }),
    ).toBe('#/principles')
  })
})

describe('principleHash', () => {
  it('builds the canonical #/principles/<category>/<slug> string', () => {
    expect(principleHash(5)).toBe('#/principles/classic/follow-through')
    expect(principleHash(13)).toBe('#/principles/extended/systematization')
  })

  it('returns null for an out-of-range id', () => {
    expect(principleHash(0)).toBeNull()
    expect(principleHash(99)).toBeNull()
  })
})

describe('deep-link round-trip', () => {
  it('parseHash(stateToHash(state)) preserves filter and principleId', () => {
    for (const id of [1, 5, 12, 13, 18]) {
      const hash = principleHash(id)
      const state = parseHash(hash)
      expect(stateToHash(state)).toBe(hash)
      expect(state.principleId).toBe(id)
    }
  })
})

describe('LANDING', () => {
  it('carries principleId: null so the shape is complete', () => {
    expect(LANDING).toHaveProperty('principleId', null)
  })
})
