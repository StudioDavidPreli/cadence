import { describe, it, expect } from 'vitest'
import { buildTimeline } from './toastTimeline'

// Standard, in seconds, as the tokens reach a component.
const STANDARD = {
  duration: { fast: 0.1, base: 0.2, slow: 0.4, slower: 0.6 },
  delay: { none: 0, short: 0.05, medium: 0.1, long: 0.2 },
}

describe('buildTimeline', () => {
  it('staggers arrivals on delay.short', () => {
    const t = buildTimeline(STANDARD, 3)
    expect(t.map(s => s.delay)).toEqual([0, 0.05, 0.1])
  })

  it('holds every toast at full opacity until the same moment', () => {
    // holdUntil = (2 * 0.05 + 0.2) + 0.6 + 0.2 = 1.1s, measured from the press.
    // Each toast's hold ends at holdUntil + index * delay.medium, so converting
    // back to absolute time should give the staggered exit starts.
    const t = buildTimeline(STANDARD, 3)
    const exitStarts = t.map(s => s.delay + s.duration - STANDARD.duration.base)
    expect(exitStarts[0]).toBeCloseTo(1.1, 5)
    expect(exitStarts[1]).toBeCloseTo(1.2, 5)
    expect(exitStarts[2]).toBeCloseTo(1.3, 5)
  })

  it('separates the exit cascade by delay.medium, not delay.short', () => {
    const t = buildTimeline(STANDARD, 3)
    const exitStarts = t.map(s => s.delay + s.duration - STANDARD.duration.base)
    expect(exitStarts[1] - exitStarts[0]).toBeCloseTo(STANDARD.delay.medium, 5)
    expect(exitStarts[2] - exitStarts[1]).toBeCloseTo(STANDARD.delay.medium, 5)
  })

  it('keeps times ascending and within [0, 1]', () => {
    for (const step of buildTimeline(STANDARD, 3)) {
      expect(step.times[0]).toBe(0)
      expect(step.times[3]).toBe(1)
      for (let i = 1; i < step.times.length; i++) {
        expect(step.times[i]).toBeGreaterThanOrEqual(step.times[i - 1])
      }
    }
  })

  it('never returns a negative segment when Explore inverts the delays', () => {
    // delay.short far longer than delay.medium is reachable in Explore mode and
    // is what drives the hold negative without the clamp.
    const inverted = {
      duration: { base: 2, slower: 0.05 },
      delay: { short: 2, medium: 0.05, long: 0.05 },
    }
    for (const step of buildTimeline(inverted, 3)) {
      expect(step.duration).toBeGreaterThan(0)
      expect(step.times.every(Number.isFinite)).toBe(true)
    }
  })

  it('produces a finite timeline when every duration floors at zero', () => {
    const zeroed = {
      duration: { base: 0, slower: 0 },
      delay: { short: 0, medium: 0, long: 0 },
    }
    for (const step of buildTimeline(zeroed, 3)) {
      expect(step.times.every(Number.isFinite)).toBe(true)
      expect(step.duration).toBe(0)
    }
  })
})
