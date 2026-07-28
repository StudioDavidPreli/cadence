import { describe, it, expect } from 'vitest'
import { backgroundEnabledFrom } from './backgroundFlag'

// The flag flipped on 2026-07-28: the background ships on, and `?bg=0` opts out.
// Before that it was `has('bg')`, so `?bg=1` meant on and `?bg=0` ALSO meant on.
// Both halves of that inversion are silent if they go wrong. An inverted default
// ships an invisible feature that every test still passes; a missed off-spelling
// ships one a visitor cannot turn off and that needs a deploy to fix, which is
// the exact situation the escape hatch exists to avoid.

describe('backgroundEnabledFrom', () => {
  it('is on with no query string at all', () => {
    expect(backgroundEnabledFrom('')).toBe(true)
  })

  it('is on for unrelated params', () => {
    expect(backgroundEnabledFrom('?seed=4242&budget=60')).toBe(true)
  })

  it.each(['?bg=0', '?bg=off', '?bg=false'])('is off for %s', (search) => {
    expect(backgroundEnabledFrom(search)).toBe(false)
  })

  it.each(['?bg=OFF', '?bg=False', '?bg=Off'])('is off for %s regardless of case', (search) => {
    expect(backgroundEnabledFrom(search)).toBe(false)
  })

  it('is off when the opt-out sits among other params', () => {
    expect(backgroundEnabledFrom('?seed=1&bg=0&scale=0.5')).toBe(false)
  })

  // A typo must not silently remove the artwork. Only the three named spellings
  // turn it off; everything else, including the retired `?bg=1` and a bare
  // `?bg`, leaves it on.
  it.each(['?bg=1', '?bg=on', '?bg=true', '?bg', '?bg=', '?bg=nope'])(
    'stays on for %s',
    (search) => {
      expect(backgroundEnabledFrom(search)).toBe(true)
    },
  )
})
