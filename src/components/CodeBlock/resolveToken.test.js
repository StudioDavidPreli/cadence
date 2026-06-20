import { describe, it, expect } from 'vitest'
import { extractTokenPaths, resolveTokenDisplay, tokenPathMatchesActive, isEditableToken } from './resolveToken'
import { DEMO_SNIPPETS } from '../TokenLab/demoSnippets'
import { EDITABLE_TOKEN_SCHEMA, FIXED_REFERENCE_PATHS } from '../../data/motionPresets'

// The schema and the fixed set use control-layer naming (`easing`); snippets and
// the runtime tokens use `ease`. These convert between the two so the partition
// can be checked in one naming space (same boundary isEditableToken crosses).
const toRuntime = p => (p.startsWith('easing.') ? p.replace(/^easing\./, 'ease.') : p)
const toControl = p => (p.startsWith('ease.') ? p.replace(/^ease\./, 'easing.') : p)

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

describe('isEditableToken', () => {
  it('is true for tokens the tool bar renders a control for', () => {
    expect(isEditableToken('duration.slow')).toBe(true)
    expect(isEditableToken('delay.short')).toBe(true)
    expect(isEditableToken('scale.lift')).toBe(true)
  })

  it('normalizes the runtime "ease." family to the schema\'s "easing."', () => {
    expect(isEditableToken('ease.standard')).toBe(true)
    expect(isEditableToken('ease.enter')).toBe(true)
    expect(isEditableToken('ease.exit')).toBe(true)
  })

  it('is false for fixed reference tokens no slider can reach', () => {
    expect(isEditableToken('ease.linear')).toBe(false)
    expect(isEditableToken('ease.spring')).toBe(false)
    expect(isEditableToken('delay.none')).toBe(false)
  })

  it('is false for a path that is not a token at all', () => {
    expect(isEditableToken('color.accent')).toBe(false)
  })
})

// The lock: the editable schema and the fixed-reference set must together
// classify every token the runtime carries, with no overlap and nothing left
// over. If someone adds a token to stateToTokens without giving it a slider
// (editable) or listing it as a fixed reference, this fails — the code view
// would otherwise show an unclassified token with no "(fixed)" marker and no
// slider behind it.
describe('every runtime token is classified editable or fixed', () => {
  // All token paths the runtime carries, in runtime naming, derived from the
  // TOKENS shape above (which mirrors stateToTokens / useMotionTokens output).
  const runtimePaths = Object.entries(TOKENS).flatMap(([group, keys]) =>
    Object.keys(keys).map(k => `${group}.${k}`)
  )
  const editable = Object.entries(EDITABLE_TOKEN_SCHEMA).flatMap(([family, keys]) =>
    keys.map(k => toRuntime(`${family}.${k}`))
  )
  const fixed = [...FIXED_REFERENCE_PATHS].map(toRuntime)

  it('editable and fixed sets do not overlap', () => {
    const overlap = editable.filter(p => fixed.includes(p))
    expect(overlap).toEqual([])
  })

  it('editable ∪ fixed covers exactly the runtime tokens', () => {
    expect(new Set([...editable, ...fixed])).toEqual(new Set(runtimePaths))
  })

  it('isEditableToken agrees with the schema for every runtime token', () => {
    for (const path of runtimePaths) {
      const expected = editable.includes(path)
      expect(isEditableToken(path), path).toBe(expected)
    }
  })
})

// Every token a snippet reads must be classifiable, so the code view never
// renders a token with neither a live slider nor a "(fixed)" tag.
describe('every demo snippet token is classified', () => {
  for (const [name, code] of Object.entries(DEMO_SNIPPETS)) {
    it(`${name} reads only editable or fixed-reference tokens`, () => {
      for (const path of extractTokenPaths(code)) {
        const classified = isEditableToken(path) || FIXED_REFERENCE_PATHS.has(toControl(path))
        expect(classified, `${name}: ${path}`).toBe(true)
      }
    })
  }
})
