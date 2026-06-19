import { describe, it, expect } from 'vitest'
import { reduceMotion } from './MotionTokensContext'

// A representative token set in the React-side shape (seconds, bezier arrays).
const tokens = {
  duration: { fast: 0.1, base: 0.2, slow: 0.4, slower: 0.6 },
  delay: { none: 0, short: 0.05, medium: 0.1, long: 0.2 },
  ease: { standard: [0.4, 0, 0.2, 1] },
  scale: { base: 0.95 },
}

describe('reduceMotion', () => {
  it('flattens every duration to 0.01, not 0', () => {
    // The 0.01-not-0 choice is a documented invariant: duration 0 has edge
    // cases in Framer Motion's completion/interruption logic. See the comment
    // on reduceMotion in MotionTokensContext.jsx.
    expect(reduceMotion(tokens).duration).toEqual({
      fast: 0.01, base: 0.01, slow: 0.01, slower: 0.01,
    })
  })

  it('flattens every delay to 0', () => {
    expect(reduceMotion(tokens).delay).toEqual({
      none: 0, short: 0, medium: 0, long: 0,
    })
  })

  it('leaves easing and scale untouched', () => {
    // At ~10ms total, curve shape and scale are imperceptible, so they are
    // deliberately passed through rather than flattened.
    const reduced = reduceMotion(tokens)
    expect(reduced.ease).toBe(tokens.ease)
    expect(reduced.scale).toBe(tokens.scale)
  })

  it('does not mutate its input', () => {
    reduceMotion(tokens)
    expect(tokens.duration.base).toBe(0.2)
    expect(tokens.delay.short).toBe(0.05)
  })
})
