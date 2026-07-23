import { describe, it, expect } from 'vitest'
import {
  bandOf,
  revealDelays,
  revealTiming,
  idleTimings,
  idleStartSeconds,
  CHOREOGRAPHY,
} from './choreography'

// Standard preset, as useMotionTokens would hand it over (seconds).
const tokens = {
  duration: { fast: 0.1, base: 0.2, slow: 0.4, slower: 0.6 },
  delay: { none: 0, short: 0.05, medium: 0.1, long: 0.2 },
  ease: { enter: [0, 0, 0.2, 1], exit: [0.4, 0, 1, 1] },
}
const flattened = {
  duration: { fast: 0.01, base: 0.01, slow: 0.01, slower: 0.01 },
  delay: { none: 0, short: 0, medium: 0, long: 0 },
  ease: tokens.ease,
  reducedMotion: true,
}

describe('bandOf', () => {
  it('splits the surface into equal horizontal bands', () => {
    expect(bandOf(0, 1200, 12)).toBe(0)
    expect(bandOf(99, 1200, 12)).toBe(0)
    expect(bandOf(100, 1200, 12)).toBe(1)
    expect(bandOf(1100, 1200, 12)).toBe(11)
  })

  it('clamps the bottom edge into the last band', () => {
    // y === height would otherwise land one band past the end.
    expect(bandOf(1200, 1200, 12)).toBe(11)
    expect(bandOf(99999, 1200, 12)).toBe(11)
  })

  it('clamps above the surface into the first band', () => {
    expect(bandOf(-50, 1200, 12)).toBe(0)
  })

  it('gives both faces the same band for the same y', () => {
    // The whole point of one explicit partition: a stamp and the cells it
    // rasterizes into must breathe together, not merely near each other.
    for (const y of [0, 137, 480.5, 899, 1199]) {
      expect(bandOf(y, 1200, 12)).toBe(bandOf(y, 1200, 12))
    }
  })

  it('degrades safely on a zero height or chunk count', () => {
    expect(bandOf(100, 0, 12)).toBe(0)
    expect(bandOf(100, 1200, 0)).toBe(0)
  })
})

describe('revealDelays', () => {
  it('spreads items evenly across the window', () => {
    expect(revealDelays(5, { windowSeconds: 1 })).toEqual([0, 0.25, 0.5, 0.75, 1])
  })

  it('starts the first item immediately and lands the last at the window', () => {
    const delays = revealDelays(40, { windowSeconds: 1.6 })
    expect(delays[0]).toBe(0)
    expect(delays[delays.length - 1]).toBeCloseTo(1.6)
  })

  it('never goes backwards', () => {
    const delays = revealDelays(60, { windowSeconds: 1.6 })
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1])
    }
  })

  it('handles the degenerate counts', () => {
    expect(revealDelays(0, { windowSeconds: 1 })).toEqual([])
    expect(revealDelays(1, { windowSeconds: 1 })).toEqual([0])
  })

  it('treats a missing or zero window as an instant arrival', () => {
    expect(revealDelays(4, { windowSeconds: 0 })).toEqual([0, 0, 0, 0])
    expect(revealDelays(4, {})).toEqual([0, 0, 0, 0])
    expect(revealDelays(4, { windowSeconds: -5 })).toEqual([0, 0, 0, 0])
  })

  it('quantizes to four steps under reduced motion', () => {
    // Stop-motion arrival: many items, four distinct moments.
    const delays = revealDelays(41, { windowSeconds: 1, reducedMotion: true })
    const distinct = [...new Set(delays)]
    expect(distinct).toEqual([0, 0.25, 0.5, 0.75, 1])
    expect(distinct.length).toBe(CHOREOGRAPHY.reducedSteps + 1)
  })

  it('collapses to instant when reduced motion is given a flattened window', () => {
    // The caller obligation the module comment names: if the window came from
    // tokens reduceMotion already flattened, delay.long is 0 and there is
    // nothing for the quantization to spread. Pinned so the behavior is a
    // known consequence rather than a surprise.
    const window = CHOREOGRAPHY.revealWindowMultiple * flattened.delay.long
    expect(window).toBe(0)
    expect(revealDelays(20, { windowSeconds: window, reducedMotion: true }).every((d) => d === 0)).toBe(true)
  })
})

describe('revealTiming', () => {
  it('builds the window from delay.long, which is the demonstration read', () => {
    expect(revealTiming(tokens).windowSeconds).toBeCloseTo(8 * 0.2)
  })

  it('takes the stamp fade from duration.base and the path draw from duration.slow', () => {
    const t = revealTiming(tokens)
    expect(t.stampDuration).toBe(0.2)
    expect(t.pathDuration).toBe(0.4)
  })

  it('crossfades an outgoing composition on the exit curve', () => {
    const t = revealTiming(tokens)
    expect(t.crossfadeDuration).toBe(0.2)
    expect(t.exitEase).toEqual([0.4, 0, 1, 1])
    expect(t.enterEase).toEqual([0, 0, 0.2, 1])
  })

  it('follows a preset change, because the reveal is demonstration', () => {
    // Snappy: delay.long 80ms, duration.base 120ms.
    const snappy = { ...tokens, duration: { ...tokens.duration, base: 0.12 }, delay: { ...tokens.delay, long: 0.08 } }
    const t = revealTiming(snappy)
    expect(t.windowSeconds).toBeCloseTo(0.64)
    expect(t.stampDuration).toBeCloseTo(0.12)
  })

  it('uses the non-zero reduced duration rather than zero', () => {
    // duration 0 has edge cases in Framer Motion: onAnimationComplete does not
    // reliably fire, and a stop-motion arrival still wants its events.
    const t = revealTiming(tokens, { reducedMotion: true })
    expect(t.stampDuration).toBe(0.01)
    expect(t.pathDuration).toBe(0.01)
    expect(t.stampDuration).not.toBe(0)
  })

  it('takes the reduced-motion window from the fixed constant, not the tokens', () => {
    // The bug this fixes: under reduced motion useMotionTokens flattens
    // delay.long to 0 a tick after first render, so a token-derived window
    // raced the flattening (1.6s on first render, 0 after). The reduced window
    // is now token-independent, so it is the same whether the tokens are the
    // full preset or already flattened.
    const flat = revealTiming(flattened, { reducedMotion: true })
    const full = revealTiming(tokens, { reducedMotion: true })
    expect(flat.windowSeconds).toBe(CHOREOGRAPHY.reducedWindow)
    expect(full.windowSeconds).toBe(CHOREOGRAPHY.reducedWindow)
    // and it is NOT 8 x delay.long from either token set
    expect(full.windowSeconds).not.toBeCloseTo(8 * tokens.delay.long)
  })

  it('spreads the reduced reveal into the ruled number of discrete steps', () => {
    // Production now matches the ruling and the revealDelays test: a quick
    // four-step stop-motion, not the instant single pop the token-derived
    // window used to collapse to.
    const t = revealTiming(tokens, { reducedMotion: true })
    const delays = revealDelays(40, { windowSeconds: t.windowSeconds, reducedMotion: true })
    const distinct = [...new Set(delays)]
    expect(distinct.length).toBe(CHOREOGRAPHY.reducedSteps + 1)
    expect(Math.max(...delays)).toBeCloseTo(CHOREOGRAPHY.reducedWindow)
  })

  it('survives missing token families rather than emitting NaN', () => {
    // A NaN duration reaching Framer Motion throws. Same defensive posture as
    // parseTokenValue.
    const t = revealTiming({})
    expect(Number.isNaN(t.windowSeconds)).toBe(false)
    expect(Number.isNaN(t.stampDuration)).toBe(false)
    expect(revealTiming(undefined).windowSeconds).toBe(0)
  })
})

describe('idleTimings', () => {
  const base = { periodSeconds: 4.8, seed: 11 }

  it('returns one entry per chunk', () => {
    expect(idleTimings(base)).toHaveLength(CHOREOGRAPHY.chunks)
  })

  it('is null under reduced motion, not slowed and not quantized', () => {
    // The deliberate asymmetry with the reveal. Infinite drift is the
    // vestibular trigger, and a zero-duration infinite animation is still an
    // infinite animation, so the caller must drop it entirely.
    expect(idleTimings({ ...base, reducedMotion: true })).toBeNull()
  })

  it('is null for a missing or non-positive period', () => {
    expect(idleTimings({ ...base, periodSeconds: 0 })).toBeNull()
    expect(idleTimings({ periodSeconds: undefined })).toBeNull()
  })

  it('varies every chunk', () => {
    const table = idleTimings(base)
    expect(new Set(table.map((t) => t.durationX)).size).toBe(table.length)
    expect(new Set(table.map((t) => t.ampX)).size).toBe(table.length)
  })

  it('keeps sway periods inside the declared variance of the period', () => {
    for (const t of idleTimings(base)) {
      expect(t.durationX).toBeGreaterThanOrEqual(4.8 * CHOREOGRAPHY.periodVarianceX[0] - 1e-9)
      expect(t.durationX).toBeLessThanOrEqual(4.8 * CHOREOGRAPHY.periodVarianceX[1] + 1e-9)
      expect(t.durationY).toBeGreaterThanOrEqual(4.8 * CHOREOGRAPHY.periodVarianceY[0] - 1e-9)
      expect(t.durationY).toBeLessThanOrEqual(4.8 * CHOREOGRAPHY.periodVarianceY[1] + 1e-9)
    }
  })

  it('gives the two axes different periods, so the drift never loops visibly', () => {
    for (const t of idleTimings(base)) expect(t.durationX).not.toBe(t.durationY)
  })

  it('keeps amplitudes small and around the frozen constant', () => {
    const amps = idleTimings(base).flatMap((t) => [t.ampX, t.ampY])
    for (const a of amps) {
      expect(a).toBeGreaterThan(CHOREOGRAPHY.idleAmplitude * CHOREOGRAPHY.amplitudeVariance[0] - 1e-9)
      expect(a).toBeLessThan(CHOREOGRAPHY.idleAmplitude * CHOREOGRAPHY.amplitudeVariance[1] + 1e-9)
      expect(a).toBeLessThan(5)     // a background drifts, it does not travel
    }
  })

  it('floors the breathe so a chunk never fades out', () => {
    for (const t of idleTimings(base)) {
      expect(t.dim).toBeGreaterThanOrEqual(CHOREOGRAPHY.idleDipFloor)
      expect(t.dim).toBeLessThan(1)
    }
  })

  it('breathes at the ruled multiple of its own sway period', () => {
    for (const t of idleTimings(base)) {
      expect(t.breatheDuration).toBeCloseTo(t.durationX * CHOREOGRAPHY.breatheRate)
    }
  })

  it('alternates sway direction, so the field does not lean as one', () => {
    const table = idleTimings(base)
    expect(table.filter((t) => t.reverse).length).toBe(Math.floor(CHOREOGRAPHY.chunks / 2))
    expect(table[0].reverse).toBe(false)
    expect(table[1].reverse).toBe(true)
  })

  it('does not vary with the preset, because the idle is chrome', () => {
    // The whole reason the amplitudes are frozen numbers rather than token
    // reads: ambient keeps one temperament while foreground motion changes
    // personality (ruling 7, closed by the split).
    const a = idleTimings(base)
    const b = idleTimings(base)
    expect(a).toEqual(b)
  })

  it('is deterministic for a seed and differs across seeds', () => {
    expect(idleTimings({ ...base, seed: 11 })).toEqual(idleTimings({ ...base, seed: 11 }))
    expect(idleTimings({ ...base, seed: 12 })).not.toEqual(idleTimings({ ...base, seed: 11 }))
  })

  it('keeps surviving chunks intact when the chunk count changes', () => {
    // Hash-keyed on the chunk index rather than pulled from a stream, same
    // reasoning as the sampler.
    const twelve = idleTimings({ ...base, chunks: 12 })
    const sixteen = idleTimings({ ...base, chunks: 16 })
    expect(sixteen.slice(0, 12)).toEqual(twelve)
  })
})

describe('idleStartSeconds', () => {
  it('waits for the last stamp to finish arriving, plus a beat', () => {
    expect(idleStartSeconds({ windowSeconds: 1.6, stampDuration: 0.2, settle: 0.08 })).toBeCloseTo(1.88)
  })

  it('never returns a negative start', () => {
    expect(idleStartSeconds({ windowSeconds: 0, stampDuration: 0 })).toBeGreaterThanOrEqual(0)
    expect(idleStartSeconds({})).toBeGreaterThanOrEqual(0)
  })
})
