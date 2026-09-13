import { describe, it, expect } from 'vitest'
import {
  naturalFrequency,
  dampingRatio,
  springDisplacement,
  settleWindow,
  overshootFraction,
  sampleSettleCurve,
} from './springCurve'

// The three built-in presets, plus a critical and an overdamped set, exercise
// all three regimes of the damped oscillator.
const STANDARD = { stiffness: 170, damping: 20, mass: 1.5 } // zeta ~0.63, underdamped
const SNAPPY = { stiffness: 600, damping: 22, mass: 1 }     // zeta ~0.45, bigger bounce
const CRITICAL = { stiffness: 100, damping: 20, mass: 1 }   // zeta 1.0
const OVERDAMPED = { stiffness: 100, damping: 100, mass: 1 } // zeta 5, no bounce

describe('the two dimensionless numbers', () => {
  it('natural frequency is sqrt(k/m)', () => {
    expect(naturalFrequency({ stiffness: 400, mass: 1 })).toBeCloseTo(20, 6)
    expect(naturalFrequency({ stiffness: 400, mass: 4 })).toBeCloseTo(10, 6)
  })

  it('damping ratio is c / (2·sqrt(k·m))', () => {
    expect(dampingRatio(STANDARD)).toBeCloseTo(0.626, 3)
    expect(dampingRatio(CRITICAL)).toBeCloseTo(1, 6)
    expect(dampingRatio(OVERDAMPED)).toBeCloseTo(5, 6)
  })
})

describe('springDisplacement', () => {
  it('starts at rest (x = 0 at t = 0) in every regime', () => {
    for (const p of [STANDARD, SNAPPY, CRITICAL, OVERDAMPED]) {
      expect(springDisplacement(0, p)).toBeCloseTo(0, 10)
    }
  })

  it('settles to the target given enough time', () => {
    for (const p of [STANDARD, SNAPPY, CRITICAL, OVERDAMPED]) {
      expect(springDisplacement(6, p)).toBeCloseTo(1, 2)
    }
  })

  it('an underdamped spring crosses past the target before settling', () => {
    // Snappy (zeta ~0.45) has a clear overshoot; some sample must exceed 1.
    const { points } = sampleSettleCurve(SNAPPY)
    expect(Math.max(...points.map(pt => pt.x))).toBeGreaterThan(1.05)
  })

  it('an overdamped spring never crosses the target', () => {
    const { points } = sampleSettleCurve(OVERDAMPED)
    expect(Math.max(...points.map(pt => pt.x))).toBeLessThanOrEqual(1 + 1e-6)
  })

  it('degenerate params arrive instantly rather than returning NaN', () => {
    expect(springDisplacement(0.5, { stiffness: 0, damping: 1, mass: 1 })).toBe(1)
    expect(springDisplacement(0.5, { stiffness: 400, damping: -5, mass: 1 })).toBe(1)
  })
})

describe('overshootFraction', () => {
  it('is positive for underdamped springs and larger the softer the damping', () => {
    expect(overshootFraction(STANDARD)).toBeGreaterThan(0)
    expect(overshootFraction(SNAPPY)).toBeGreaterThan(overshootFraction(STANDARD))
  })

  it('is zero at and past critical damping', () => {
    expect(overshootFraction(CRITICAL)).toBe(0)
    expect(overshootFraction(OVERDAMPED)).toBe(0)
  })
})

describe('settleWindow', () => {
  it('is positive, finite, and clamped to a readable range', () => {
    for (const p of [STANDARD, SNAPPY, CRITICAL, OVERDAMPED]) {
      const w = settleWindow(p)
      expect(w).toBeGreaterThan(0)
      expect(Number.isFinite(w)).toBe(true)
      expect(w).toBeLessThanOrEqual(4)
    }
  })
})

describe('sampleSettleCurve', () => {
  it('samples from t = 0 to the window and reports the real peak', () => {
    const { points, window, yMax } = sampleSettleCurve(STANDARD, 32)
    expect(points).toHaveLength(33)
    expect(points[0]).toEqual({ t: 0, x: springDisplacement(0, STANDARD) })
    expect(points[points.length - 1].t).toBeCloseTo(window, 10)
    expect(yMax).toBeGreaterThanOrEqual(1) // an underdamped peak, at least the target
  })
})
