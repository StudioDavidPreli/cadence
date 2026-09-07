// The measurement model against ground truth.
//
// The fixtures are motion-energy traces recorded from the built site's own
// Button (Token Lab, Press & State) with the tokens that were live at capture
// time stored as truth. They are the item 8 spike's evidence, frozen: the
// recovered numbers below are what the spike reported to David, so a change
// in the fit that moves them is a change in the tool's answer, and this file
// is where that shows up.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseMs, parseCubicBezier } from '../../tokens/parse'
import {
  NAMED_CURVES, bezierY, kformY, unsignedProgress, meanAbsDiff, accumulateChanged,
  changedBounds, dominantRegion, despike, detectSegments, analyzeTrace, nearestNamed, confidenceFor,
  FREE_FIT_MIN_SAMPLES, indistinctMargin, candidatesFor,
} from './measureModel'

const fixtureDir = path.join(__dirname, 'fixtures')
const fixtures = readdirSync(fixtureDir)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(path.join(fixtureDir, f), 'utf8')))

// One analysis per fixture, computed at collection time and shared: the free
// bezier grid over a 40-frame control takes seconds, and a test that re-ran
// all seven fixtures tripped the 5s per-test timeout.
const analyses = new Map(fixtures.map(fx => [fx.label, analyzeTrace(fx.t, fx.e)]))

// Truth per fixture, parsed the way the site parses tokens (parseMs returns
// seconds, ready for Framer Motion): the values were read from
// getComputedStyle on the minified build, so they arrive as '.1s' as often
// as '100ms'.
function truthOf(fx) {
  return {
    durationS: parseMs(fx.truth.durationFast),
    pressDown: parseCubicBezier(fx.truth.easeStandard),
    release: parseCubicBezier(fx.truth.easeOvershoot),
  }
}

describe('curves', () => {
  it('reads the named library from the package, not a local copy', () => {
    expect(Object.keys(NAMED_CURVES)).toEqual(['linear', 'standard', 'enter', 'exit', 'overshoot'])
    expect(NAMED_CURVES.standard).toEqual([0.4, 0, 0.2, 1])
  })
  it('bezierY pins the endpoints and inverts x for the standard curve', () => {
    expect(bezierY(NAMED_CURVES.standard, 0)).toBe(0)
    expect(bezierY(NAMED_CURVES.standard, 1)).toBe(1)
    expect(bezierY(NAMED_CURVES.linear, 0.3)).toBeCloseTo(0.3, 6)
    // Standard is past halfway at the midpoint (ease-in-out with a fast middle).
    expect(bezierY(NAMED_CURVES.standard, 0.5)).toBeGreaterThan(0.6)
  })
  it('kformY is symmetric about the midpoint', () => {
    expect(kformY(2, 0.5)).toBeCloseTo(0.5, 9)
    expect(kformY(3, 0.2) + kformY(3, 0.8)).toBeCloseTo(1, 9)
  })
  it('unsignedProgress equals y for a monotonic curve and reaches 1 for an overshoot', () => {
    const std = unsignedProgress(x => bezierY(NAMED_CURVES.standard, x))
    expect(std(0.5)).toBeCloseTo(bezierY(NAMED_CURVES.standard, 0.5), 3)
    const over = unsignedProgress(x => bezierY(NAMED_CURVES.overshoot, x))
    // The overshoot curve peaks above 1 then returns: unsigned travel keeps
    // rising through the return, so progress at the peak is below 1.
    expect(over(0.6)).toBeLessThan(1)
    expect(over(1)).toBe(1)
    let prev = 0
    for (let x = 0; x <= 1; x += 0.05) { expect(over(x)).toBeGreaterThanOrEqual(prev); prev = over(x) }
  })
  it('nearestNamed matches by shape, so an off-handle standard still reads standard', () => {
    expect(nearestNamed([0.45, 0.02, 0.18, 0.98])).toBe('standard')
    expect(nearestNamed([0.34, 1.56, 0.64, 1])).toBe('overshoot')
  })
})

describe('trace', () => {
  // 4x2 RGBA frames.
  const w = 4, h = 2
  const frame = fill => Uint8ClampedArray.from({ length: w * h * 4 }, (_, i) => (i % 4 === 3 ? 255 : fill(Math.floor(i / 4), i % 4)))
  it('meanAbsDiff averages RGB change per pixel and skips alpha', () => {
    const a = frame(() => 10)
    const b = frame(p => (p === 5 ? 40 : 10))   // one pixel moves by 30 on each channel
    expect(meanAbsDiff(a, b, w)).toBeCloseTo((30 * 3) / (w * h * 3), 9)
    expect(meanAbsDiff(a, b, w, { left: 1, top: 1, width: 1, height: 1 })).toBeCloseTo(30, 9)
    expect(meanAbsDiff(a, b, w, { left: 0, top: 0, width: 1, height: 1 })).toBe(0)
  })
  it('accumulateChanged and changedBounds find where anything moved', () => {
    const mask = new Uint8Array(w * h)
    const a = frame(() => 0)
    accumulateChanged(mask, a, frame(p => (p === 1 ? 50 : 0)))
    accumulateChanged(mask, a, frame(p => (p === 6 ? 50 : 0)))
    expect(Array.from(mask)).toEqual([0, 1, 0, 0, 0, 0, 1, 0])
    expect(changedBounds(mask, w, h, 0)).toEqual({ left: 1, top: 0, width: 2, height: 2 })
    expect(changedBounds(new Uint8Array(w * h), w, h)).toBeNull()
  })
  it('dominantRegion keeps the loudest cluster and drops scattered bystanders', () => {
    // 64x64 frame: a 12x8 block of change at (20, 20), and three lone pixels
    // far away (a focus ring, a tooltip, a cursor, in spirit).
    const W = 64, H = 64
    const mask = new Uint8Array(W * H)
    for (let y = 20; y < 28; y++) for (let x = 20; x < 32; x++) mask[y * W + x] = 1
    for (const [x, y] of [[2, 60], [60, 2], [61, 61]]) mask[y * W + x] = 1
    expect(dominantRegion(mask, W, H, { cell: 8, pad: 0 })).toEqual({ left: 20, top: 20, width: 12, height: 8 })
    // With nothing else moving, it agrees with the plain bounding box.
    const alone = new Uint8Array(W * H)
    for (let y = 20; y < 28; y++) for (let x = 20; x < 32; x++) alone[y * W + x] = 1
    expect(dominantRegion(alone, W, H, { cell: 8, pad: 2 })).toEqual(changedBounds(alone, W, H, 2))
    expect(dominantRegion(new Uint8Array(W * H), W, H)).toBeNull()
  })
})

describe('segmentation', () => {
  it('despike clips a loud frame only between two quiet neighbors', () => {
    const thr = 1
    expect(despike([0, 10, 0], thr)[1]).toBe(0)          // an isolated impulse
    expect(despike([0, 10, 8, 3, 0], thr)[1]).toBe(10)   // fast motion, left alone
  })
  it('detectSegments separates two transitions across a hold', () => {
    const e = [0, 0, 0, 3, 20, 15, 6, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 18, 4, 0, 0, 0]
    const { segments } = detectSegments(e)
    expect(segments.map(s => [s.start, s.end])).toEqual([[3, 7], [17, 19]])
  })
  it('merges bursty slow motion across short quiet gaps and drops single frames', () => {
    const e = [0, 0, 2, 3, 0, 0, 2, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0]
    const { segments } = detectSegments(e)
    expect(segments).toHaveLength(1)
    expect([segments[0].start, segments[0].end]).toEqual([2, 8])
  })
  it('the indistinct margin is relative to the winner, with a wide floor under eight frames', () => {
    // A clean twelve-frame fit at 0.018 separates a curve at 0.034 (twice as bad)...
    expect(0.034 <= 0.018 + indistinctMargin(0.018, 12)).toBe(false)
    // ...but the same pair at five frames stays indistinct: too short to rule out.
    expect(0.034 <= 0.018 + indistinctMargin(0.018, 5)).toBe(true)
    // Below eight frames the floor alone is 0.02; above, 0.005.
    expect(indistinctMargin(0, 4)).toBeCloseTo(0.02, 9)
    expect(indistinctMargin(0, 8)).toBeCloseTo(0.005, 9)
  })
  it('candidatesFor lists the indistinct curves winner-first with their own fits', () => {
    const fx = fixtures.find(f => f.label === 'cinematic-high-contrast-dark')
    const down = analyses.get(fx.label).segments[0]
    const cands = candidatesFor(down)
    expect(cands.map(c => c.name)).toEqual(down.indistinct)
    expect(cands[0].name).toBe(down.named[0].name)
    for (let i = 1; i < cands.length; i++) expect(cands[i].rms).toBeGreaterThanOrEqual(cands[i - 1].rms)
    for (const c of cands) expect(c.bezier).toHaveLength(4)
  })
  it('confidence is decided by frames and separability, never by residual', () => {
    expect(confidenceFor(12, 1)).toBe('high')
    expect(confidenceFor(6, 2)).toBe('medium')
    expect(confidenceFor(4, 1)).toBe('low')
    expect(confidenceFor(40, 3)).toBe('low')
  })
})

describe('ground truth: the recorded Button', () => {
  it('loads every spike fixture', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(6)
  })

  for (const fx of fixtures) {
    describe(fx.label, () => {
      const truth = truthOf(fx)
      const result = analyses.get(fx.label)
      const down = result.segments[0]

      it('finds at least the press-down and the release as separate transitions', () => {
        expect(result.segments.length).toBeGreaterThanOrEqual(2)
      })
      it('never excludes the true press-down curve', () => {
        // The best name can flip at five or six frames (a stuttered frame did
        // it on the clean Standard re-capture: overshoot first, standard
        // inside tolerance). The invariant the tool promises is weaker and
        // holds everywhere: the truth is in the indistinct set.
        expect(down.indistinct).toContain(nearestNamed(truth.pressDown))
      })
      it('keeps the true duration inside the reported band', () => {
        expect(down.named[0].band[0]).toBeLessThanOrEqual(truth.durationS)
        expect(down.named[0].band[1]).toBeGreaterThanOrEqual(truth.durationS)
      })
      it('flags the free bezier as underdetermined exactly when the samples are few', () => {
        expect(down.free.underdetermined).toBe(down.samples < FREE_FIT_MIN_SAMPLES)
      })
      it('reports the frame count the confidence rests on', () => {
        expect(down.frames).toBeGreaterThanOrEqual(4)
        expect(result.fps).toBeGreaterThan(50)
      })
    })
  }

  it('names the true press-down curve first on all but the stuttered capture', () => {
    const hits = fixtures.filter(fx => {
      const down = analyses.get(fx.label).segments[0]
      return down.named[0].name === nearestNamed(truthOf(fx).pressDown)
    })
    expect(hits.length).toBe(fixtures.length - 1)
    expect(fixtures.find(fx => !hits.includes(fx)).label).toBe('standard-high-contrast-dark-stutter')
  })

  // The point estimates the spike reported to David (ms), pinned to the
  // millisecond so a fit change that moves an answer is a visible diff.
  const pinned = {
    'standard-high-contrast-dark': 90,
    'standard-high-contrast-dark-stutter': 96,
    'cinematic-high-contrast-dark': 233,
    'snappy-high-contrast-dark': 56,
    'standard-dark': 99,
    'standard-high-contrast-dark-fast1000': 906,
    'standard-high-contrast-dark-fast500': 599,
    'standard-high-contrast-dark-run2': 80,
  }
  for (const [label, ms] of Object.entries(pinned)) {
    it(`${label}: press-down duration pins at ${ms}ms`, () => {
      const fx = fixtures.find(f => f.label === label)
      expect(fx, `fixture ${label} present`).toBeTruthy()
      const down = analyses.get(fx.label).segments[0]
      expect(Math.round(down.named[0].D * 1000)).toBe(ms)
    })
  }
})
