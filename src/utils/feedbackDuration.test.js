import { describe, it, expect, afterEach } from 'vitest'
import {
  navDurationSeconds,
  uiDurationSeconds,
  backgroundIdlePeriodSeconds,
  FEEDBACK_EASE,
} from './feedbackDuration'

// These helpers read a CSS custom property off the document, so the test
// supplies one. No jsdom needed: the only DOM surface used is
// getComputedStyle(document.documentElement).getPropertyValue.
function withCssValue(value) {
  globalThis.document = { documentElement: {} }
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => value })
}

afterEach(() => {
  delete globalThis.document
  delete globalThis.getComputedStyle
})

describe('feedback durations', () => {
  it('reads the authored ms spelling', () => {
    withCssValue('360ms')
    expect(navDurationSeconds(false)).toBeCloseTo(0.36)
  })

  it('reads the MINIFIED seconds spelling', () => {
    // The regression this file exists for. The production CSS minifier rewrites
    // `--feedback-nav-duration: 360ms` to `.36s`, and a bare parseFloat(raw)/1000
    // read that as 0.00036 seconds: every JS-driven chrome transition ran a
    // thousand times too fast in the built app while behaving correctly under
    // the dev server. Verified in dist/ on 2026-07-23.
    withCssValue('.36s')
    expect(navDurationSeconds(false)).toBeCloseTo(0.36)
    withCssValue('.1s')
    expect(uiDurationSeconds(false)).toBeCloseTo(0.1)
    withCssValue('3s')
    expect(backgroundIdlePeriodSeconds()).toBeCloseTo(3)
  })

  it('agrees across both spellings of the same value', () => {
    withCssValue('360ms')
    const authored = navDurationSeconds(false)
    withCssValue('.36s')
    expect(navDurationSeconds(false)).toBeCloseTo(authored)
  })

  it('handles whole-second and zero values', () => {
    withCssValue('3s')
    expect(navDurationSeconds(false)).toBeCloseTo(3)
    withCssValue('0s')
    expect(navDurationSeconds(false)).toBe(0)
    withCssValue('0ms')
    expect(navDurationSeconds(false)).toBe(0)
  })

  it('falls back when the property is missing or unparseable', () => {
    withCssValue('')
    expect(navDurationSeconds(false)).toBeCloseTo(0.36)
    expect(uiDurationSeconds(false)).toBeCloseTo(0.1)
    expect(backgroundIdlePeriodSeconds()).toBeCloseTo(4.8)
    withCssValue('nonsense')
    expect(navDurationSeconds(false)).toBeCloseTo(0.36)
  })

  it('snaps the two feedback helpers to zero under reduced motion', () => {
    withCssValue('360ms')
    expect(navDurationSeconds(true)).toBe(0)
    expect(uiDurationSeconds(true)).toBe(0)
  })

  it('does not give the idle period a reduced-motion branch', () => {
    // Deliberate asymmetry: the background idle is disabled outright under
    // reduced motion rather than run at zero duration, because a zero-duration
    // infinite animation is still an infinite animation. The caller drops it.
    withCssValue('4800ms')
    expect(backgroundIdlePeriodSeconds()).toBeCloseTo(4.8)
    expect(backgroundIdlePeriodSeconds.length).toBe(0)
  })

  it('keeps the chrome ease independent of the editable easing tokens', () => {
    expect(FEEDBACK_EASE).toEqual([0.4, 0, 0.2, 1])
  })
})
