import { describe, it, expect } from 'vitest'
import { extractTokenPaths, resolveTokenDisplay, tokenPathMatchesActive } from './resolveToken'
import { DEMO_SNIPPETS } from '../TokenLab/demoSnippets'

// A tokens object in the exact shape useMotionTokens() returns: seconds for
// duration/delay, four-number bezier arrays for ease, unitless scale. Mirrors
// the FALLBACKS in useMotionTokens, so it is the authority a snippet's token
// references must satisfy.
const TOKENS = {
  duration: { fast: 0.1, base: 0.2, slow: 0.4, slower: 0.6 },
  ease: {
    linear: [0, 0, 1, 1],
    standard: [0.4, 0, 0.2, 1],
    enter: [0, 0, 0.2, 1],
    exit: [0.4, 0, 1, 1],
    spring: [0.34, 1.56, 0.64, 1],
  },
  delay: { none: 0, short: 0.05, medium: 0.1, long: 0.2 },
  scale: { subtle: 0.98, base: 0.95, expressive: 0.9, lift: 1.02 },
}

describe('resolveTokenDisplay', () => {
  it('formats duration and delay as trimmed seconds', () => {
    expect(resolveTokenDisplay('duration.slow', TOKENS)).toBe('0.4s')
    expect(resolveTokenDisplay('delay.short', TOKENS)).toBe('0.05s')
  })

  it('formats ease as a four-number bezier array', () => {
    expect(resolveTokenDisplay('ease.enter', TOKENS)).toBe('[0, 0, 0.2, 1]')
  })

  it('formats scale as a unitless number', () => {
    expect(resolveTokenDisplay('scale.base', TOKENS)).toBe('0.95')
  })

  it('returns null for a path the token set does not carry', () => {
    expect(resolveTokenDisplay('duration.fastt', TOKENS)).toBeNull()
    expect(resolveTokenDisplay('color.accent', TOKENS)).toBeNull()
  })
})

describe('extractTokenPaths', () => {
  it('pulls every tokens.<group>.<key> read in source order', () => {
    const code = 'duration: tokens.duration.slow,\nease: tokens.ease.exit,'
    expect(extractTokenPaths(code)).toEqual(['duration.slow', 'ease.exit'])
  })
})

describe('tokenPathMatchesActive', () => {
  it('matches duration / delay / scale paths directly', () => {
    expect(tokenPathMatchesActive('duration.slow', 'duration.slow')).toBe(true)
    expect(tokenPathMatchesActive('scale.lift', 'scale.lift')).toBe(true)
    expect(tokenPathMatchesActive('duration.slow', 'duration.fast')).toBe(false)
  })

  it('normalizes the control-layer "easing." prefix to the runtime "ease."', () => {
    // A dragged easing slider reports 'easing.enter'; the snippet reads 'ease.enter'.
    expect(tokenPathMatchesActive('ease.enter', 'easing.enter')).toBe(true)
    expect(tokenPathMatchesActive('ease.exit', 'easing.exit')).toBe(true)
    expect(tokenPathMatchesActive('ease.enter', 'easing.exit')).toBe(false)
  })

  it('is false when nothing is active', () => {
    expect(tokenPathMatchesActive('duration.slow', null)).toBe(false)
  })
})

// The drift guard: every token a snippet names must resolve against the real
// token shape. A rename or typo in a snippet (or a token removed from the
// system) fails here instead of silently showing a blank comment in the UI.
describe('demo snippet token references resolve', () => {
  for (const [name, code] of Object.entries(DEMO_SNIPPETS)) {
    it(`${name} references only real tokens`, () => {
      for (const path of extractTokenPaths(code)) {
        expect(resolveTokenDisplay(path, TOKENS), `${name}: ${path}`).not.toBeNull()
      }
    })
  }
})
