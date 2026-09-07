// The measurement model: pure functions from a recording to a token claim.
//
// Item 8 of the v1.1 build order. A screen recording of one transition comes
// in as frames; what leaves is a fitted (duration, curve) per detected
// transition, with a confidence the data actually supports. Nothing here
// touches the DOM, React, or a file: the browser page feeds it ImageData and
// the tests feed it recorded traces from the spike (fixtures/*.json), so the
// numbers the spike recovered are regression tests, not anecdotes.
//
// The spike record (why each rule exists, with the recording that taught it)
// is the tracker's item 8 entry. The short version, stage by stage:
//
//   frames  ─▶ trace     mean |ΔRGB| per frame inside a region of interest
//   trace   ─▶ segments  runs of motion between holds
//   segment ─▶ progress  cumulative energy, normalized: the curve as recorded
//   progress─▶ fits      named library (primary), free bezier (hint), k-form (null)
//
// Every fit through here is a fit of UNSIGNED travel. Motion energy has no
// sign: a frame that moves the button back toward rest counts the same as one
// that moves it away. So the recorded progress curve of an overshoot is its
// cumulative absolute travel, not y itself. For a monotonic curve the two are
// the same thing; for an overshoot they are not, and without this the
// overshoot curve can never be recovered from a recording.

import { EASING_CURVES } from 'cadence-tokens'

// The named library, as four-number arrays, read from the package so the
// measurement tool can never disagree with the tokens it is measuring against.
export const NAMED_CURVES = Object.fromEntries(
  Object.entries(EASING_CURVES).map(([key, curve]) => [key, curve.fm]),
)

// ─── Curves ──────────────────────────────────────────────────────────────────

// One cubic Bézier coordinate with endpoints 0 and 1 and handles a, b.
function cubic(a, b, s) {
  const u = 1 - s
  return 3 * u * u * s * a + 3 * u * s * s * b + s * s * s
}

// y as a function of x (time) for a CSS cubic-bezier. The curve is parametric
// in s, so x is inverted first: bisection is enough because x(s) is monotonic
// whenever x1, x2 ∈ [0, 1], which CSS guarantees. Same math as the easing
// visualizer's sampling, kept separate on purpose: this module must stay
// importable from node (tests, the spike) with no DOM in its import graph.
export function bezierY([x1, y1, x2, y2], x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let lo = 0, hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (cubic(x1, x2, mid) < x) lo = mid; else hi = mid
  }
  return cubic(y1, y2, (lo + hi) / 2)
}

// The k-form t^k / (t^k + (1-t)^k): one parameter, symmetric about the
// midpoint. It never won a fit in the spike (Cadence's curves are asymmetric,
// standard's handles are 0.4 and 0.2), so it serves as the null model: if the
// k-form fits as well as the library, the recording cannot tell the ease's
// shape apart from a symmetric one.
export function kformY(k, x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const a = Math.pow(x, k), b = Math.pow(1 - x, k)
  return a / (a + b)
}

// Wraps any y(x) as normalized cumulative |Δy|: the curve as a recording sees
// it. Tabulated once per curve because the fit evaluates it thousands of times.
export function unsignedProgress(yOf, n = 400) {
  const table = new Float64Array(n + 1)
  let acc = 0, prev = 0
  for (let i = 1; i <= n; i++) {
    const y = yOf(i / n)
    acc += Math.abs(y - prev)
    prev = y
    table[i] = acc
  }
  const total = table[n] || 1
  return x => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const f = x * n, i = Math.floor(f), w = f - i
    return (table[i] * (1 - w) + table[i + 1] * w) / total
  }
}

// ─── Trace: frames to energy ─────────────────────────────────────────────────

// Mean absolute RGB difference between two frames of equal size, inside an
// optional region { left, top, width, height } in pixels. `a` and `b` are
// RGBA byte arrays (ImageData.data, or anything shaped like it). Alpha is
// skipped: a screen recording's alpha is constant and would only dilute.
export function meanAbsDiff(a, b, width, region) {
  const r = region ?? { left: 0, top: 0, width, height: a.length / 4 / width }
  let sum = 0
  for (let y = r.top; y < r.top + r.height; y++) {
    let i = (y * width + r.left) * 4
    for (let x = 0; x < r.width; x++, i += 4) {
      sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
    }
  }
  return sum / (r.width * r.height * 3)
}

// Marks every pixel whose RGB changed by more than `tol` in ONE frame step
// into a Uint8Array mask (1 per pixel). Accumulated across a whole recording
// it says where something moved sharply, which is how the region of interest
// is found automatically (see changedBounds).
//
// The tolerance is high on purpose. "Any change at all" (tol 8) drew a box
// around most of the page in the session-one round trip: the site's
// background drifts a few levels per frame everywhere, and a slow drift
// crosses a low bar somewhere in every frame. A transition moves an edge by
// its full contrast in a frame or two; ambient motion does not. So the mask
// asks for a large single-step change, and the drift falls below it.
export const REGION_STEP_TOL = 48
export function accumulateChanged(mask, a, b, tol = REGION_STEP_TOL) {
  for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
    if (mask[p]) continue
    if (Math.abs(a[i] - b[i]) > tol || Math.abs(a[i + 1] - b[i + 1]) > tol || Math.abs(a[i + 2] - b[i + 2]) > tol) {
      mask[p] = 1
    }
  }
  return mask
}

// The bounding box of a changed-pixel mask, padded by `pad` pixels and clamped
// to the frame. Returns null when nothing changed.
export function changedBounds(mask, width, height, pad = 4) {
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad)
  return {
    left, top,
    width: Math.min(width, maxX + pad + 1) - left,
    height: Math.min(height, maxY + pad + 1) - top,
  }
}

// The region of interest as the DOMINANT cluster of sharp change, not the
// union of all of it. In the session-one round trip on a full-frame recording
// the union box covered the whole demo column: the button grew the mask by
// ~1300 pixels in two frames, then Token Lab's own chrome answered the press
// (the token highlights in the tool bar, the hover ring) with a few dozen
// scattered pixels each. Any real UI recording has that kind of bystander:
// a focus ring, a tooltip, a cursor. So the mask is counted on a coarse grid
// of `cell`-pixel squares, the loudest cell seeds a cluster that grows into
// neighbours holding at least `keep` of the seed's count, and the box is
// tightened to the masked pixels inside that cluster. When there is only one
// thing moving, this is the same box changedBounds gives.
export function dominantRegion(mask, width, height, { cell = 16, keep = 0.05, pad = 4 } = {}) {
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell)
  const counts = new Uint32Array(cols * rows)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) counts[Math.floor(y / cell) * cols + Math.floor(x / cell)]++
    }
  }
  let seed = -1, seedCount = 0
  for (let i = 0; i < counts.length; i++) if (counts[i] > seedCount) { seedCount = counts[i]; seed = i }
  if (seed < 0) return null
  const floor = Math.max(1, keep * seedCount)
  const inCluster = new Uint8Array(counts.length)
  const queue = [seed]
  inCluster[seed] = 1
  while (queue.length) {
    const c = queue.pop()
    const cx = c % cols, cy = Math.floor(c / cols)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const n = ny * cols + nx
      if (!inCluster[n] && counts[n] >= floor) { inCluster[n] = 1; queue.push(n) }
    }
  }
  // Tighten to the masked pixels whose cell is in the cluster.
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    const cy = Math.floor(y / cell) * cols
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x] || !inCluster[cy + Math.floor(x / cell)]) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad)
  return {
    left, top,
    width: Math.min(width, maxX + pad + 1) - left,
    height: Math.min(height, maxY + pad + 1) - top,
  }
}

// ─── Segmentation: energy to transitions ─────────────────────────────────────

// Two artefacts of real recordings, both seen in the spike's captures:
//   1. A one-frame impulse at the instant of a press (the compositor promotes
//      the element to its own layer and text anti-aliasing snaps). It is not
//      motion. A frame several times louder than BOTH neighbors, when both
//      neighbors are below the threshold, is clipped to the neighbor mean. A
//      loud frame beside other moving frames is fast motion and is left alone:
//      at three or four frames per transition the two are otherwise
//      indistinguishable, and clipping there erased Snappy's real peak.
//   2. Slow motion is bursty: sub-pixel steps snap to whole pixels, so a
//      1000ms press shows zero-energy frames inside the transition. The
//      threshold sits above the noise floor by a noise-scaled margin (never a
//      fraction of the peak, which the impulse would own), and runs separated
//      by a few quiet frames merge into one transition.
export function despike(e, thr, ratio = 4) {
  const out = [...e]
  for (let i = 1; i < e.length - 1; i++) {
    const a = e[i - 1], b = e[i + 1]
    if (a <= thr && b <= thr && e[i] > thr && e[i] > ratio * Math.max(a, b)) out[i] = (a + b) / 2
  }
  return out
}

export function detectSegments(eRaw, { mergeGap = 4, minFrames = 2 } = {}) {
  const sorted = [...eRaw].sort((a, b) => a - b)
  const q = f => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))]
  const floor = q(0.25)
  const noise = Math.max(q(0.5) - floor, 0.05)
  const peak = sorted[sorted.length - 1]
  const thr = floor + Math.max(4 * noise, 0.02 * (peak - floor))
  const e = despike(eRaw, thr)
  const runs = []
  let cur = null
  for (let i = 0; i < e.length; i++) {
    if (e[i] > thr) {
      if (cur && i - cur.end - 1 <= mergeGap) cur.end = i
      else { cur = { start: i, end: i }; runs.push(cur) }
    }
  }
  const segments = runs
    .map(r => ({ ...r, frames: r.end - r.start + 1 }))
    .filter(r => r.frames >= minFrames)
  return { e, floor, thr, segments }
}

// ─── Progress curve for one segment ──────────────────────────────────────────

// Cumulative energy above the floor, normalized to the segment's total. The
// sample at frame i is the progress reached by time t[i] (energy at i is the
// change between frames i-1 and i). Quiet frames are kept on both sides so the
// fit is anchored at 0 and 1; the leading pad is wider because the onset
// search reaches back into it (see onsetsFor), and those zeros are what keep
// an early onset honest.
export function progressCurve(t, e, seg, floor, pad = 1) {
  const lead = Math.max(pad, Math.ceil(seg.frames * 0.3))
  const s = Math.max(0, seg.start - lead), en = Math.min(e.length - 1, seg.end + pad)
  let total = 0
  for (let i = seg.start; i <= seg.end; i++) total += Math.max(0, e[i] - floor)
  const ts = [], ps = []
  let acc = 0
  for (let i = s; i <= en; i++) {
    if (i >= seg.start && i <= seg.end) acc += Math.max(0, e[i] - floor)
    ts.push(t[i])
    ps.push(acc / total)
  }
  const frameDt = t[1] - t[0]
  return { ts, ps, tPrev: t[seg.start - 1] ?? t[seg.start] - frameDt, tFirst: t[seg.start] }
}

// A note on stuttered frames, tried and rejected in session one: a zero-change
// frame inside a transition (one screencast frame arrived late in the clean
// Standard re-capture, and its motion landed on the next) shifts the progress
// curve enough to read as a fast-start curve. Weighting such frames out of
// the residual did not recover the truth and moved every other fixture's
// numbers, so the fit keeps every sample and the confidence label carries
// the doubt instead: the truth stayed inside the indistinct set and the band.

// ─── Fitting ─────────────────────────────────────────────────────────────────

// Unknowns per fit: the onset t0, the duration D, and the curve. The recording
// cannot say where inside the frame interval a transition began, and for a
// slow ease the head moves less than a pixel per frame and leaves no energy at
// all, so the onset window reaches back a fraction of the candidate duration
// before the first loud frame. What that freedom costs is stated in the
// duration band rather than hidden in a point estimate.
const ONSET_REACH = 0.25
const D_RANGE = [0.02, 2.5]      // seconds; the site's Explore range is 0 to 2000ms
const D_STEP = 1.03              // geometric grid, ~3% resolution
const BAND_TOL = 0.02            // rms margin that defines "the data cannot separate"

function onsetsFor(tPrev, tFirst, D, n = 12) {
  const lo = Math.min(tPrev, tFirst - ONSET_REACH * D)
  return Array.from({ length: n }, (_, o) => lo + (tFirst - lo) * (o / (n - 1)))
}

function rms(ts, ps, t0, D, yOf) {
  let s = 0
  for (let i = 0; i < ts.length; i++) {
    const d = ps[i] - yOf((ts[i] - t0) / D)
    s += d * d
  }
  return Math.sqrt(s / ts.length)
}

// Best (D, t0) for one curve over the grid; returns rms, D (seconds), t0.
function fitCurve(yOf, pc) {
  let best = { rms: Infinity }
  for (let D = D_RANGE[0]; D <= D_RANGE[1]; D *= D_STEP) {
    for (const t0 of onsetsFor(pc.tPrev, pc.tFirst, D)) {
      const r = rms(pc.ts, pc.ps, t0, D, yOf)
      if (r < best.rms) best = { rms: r, D, t0 }
    }
  }
  return best
}

// The duration band: every D (at its best onset) whose residual is within
// BAND_TOL of the best. Reported beside the point estimate, always.
function durationBand(yOf, pc, bestRms) {
  let lo = Infinity, hi = -Infinity
  for (let D = D_RANGE[0]; D <= D_RANGE[1]; D *= D_STEP) {
    let r = Infinity
    for (const t0 of onsetsFor(pc.tPrev, pc.tFirst, D)) r = Math.min(r, rms(pc.ts, pc.ps, t0, D, yOf))
    if (r <= bestRms + BAND_TOL) { lo = Math.min(lo, D); hi = Math.max(hi, D) }
  }
  return [lo, hi]
}

// How much worse than the winner a named curve may fit and still not be
// ruled out. Relative, not absolute: a curve that fits twice as badly as a
// good winner is separable, and a flat 0.02 margin called a clean twelve-frame
// Cinematic recovery ambiguous because 0.018 + 0.02 reached two curves that
// fit at 0.034 (2026-09-07). Below eight frames the floor stays wide, because
// at four to six frames a single stuttered frame moved the truth to second
// place by a whisker in the fixtures, and a fit that short has no business
// ruling anything out. David's call, 2026-09-07.
export function indistinctMargin(bestRms, frames) {
  return bestRms * 0.5 + (frames < 8 ? 0.02 : 0.005)
}

// The named curves the recording could not separate, winner first, with the
// fit each one got: what the page offers the user to choose between when the
// data alone cannot (the candidate chooser).
export function candidatesFor(segment) {
  return segment.named.filter(n => segment.indistinct.includes(n.name))
}

// Nearest named curve by shape (rms of sampled y), not by control points:
// two handle sets far apart can draw nearly the same curve.
export function nearestNamed(bezier) {
  let best = null, bd = Infinity
  for (const [name, nb] of Object.entries(NAMED_CURVES)) {
    let s = 0
    for (let i = 1; i < 40; i++) {
      const x = i / 40
      const d = bezierY(bezier, x) - bezierY(nb, x)
      s += d * d
    }
    const dist = Math.sqrt(s / 39)
    if (dist < bd) { bd = dist; best = name }
  }
  return best
}

// Below this many samples a free cubic-bezier (four handles + duration +
// onset, six parameters) can match anything; its low residual is the symptom.
export const FREE_FIT_MIN_SAMPLES = 12

export function fitSegment(t, e, seg, floor) {
  const pc = progressCurve(t, e, seg, floor)

  // Family 1: the named library. The primary result.
  const named = Object.entries(NAMED_CURVES).map(([name, b]) => {
    const yOf = unsignedProgress(x => bezierY(b, x))
    const f = fitCurve(yOf, pc)
    return { name, bezier: b, ...f, band: durationBand(yOf, pc, f.rms) }
  }).sort((a, b) => a.rms - b.rms)
  const indistinct = named
    .filter(n => n.rms <= named[0].rms + indistinctMargin(named[0].rms, seg.frames))
    .map(n => n.name)

  // Family 2: a free cubic-bezier. Coarse grid over the handles (y free past
  // [0, 1] so overshoot shapes are reachable), then three rounds of coordinate
  // refinement. A shape hint, flagged when the samples cannot support it.
  let free = { rms: Infinity }
  const xs = [0, 0.25, 0.5, 0.75, 1], ys = [-0.5, 0, 0.5, 1, 1.5]
  for (const x1 of xs) for (const y1 of ys) for (const x2 of xs) for (const y2 of ys) {
    const b = [x1, y1, x2, y2]
    const f = fitCurve(unsignedProgress(x => bezierY(b, x)), pc)
    if (f.rms < free.rms) free = { bezier: b, ...f }
  }
  for (let round = 0; round < 3; round++) {
    const step = 0.125 / (round + 1)
    for (let i = 0; i < 4; i++) for (const d of [-step, step]) {
      const b = [...free.bezier]
      b[i] += d
      if (i % 2 === 0 && (b[i] < 0 || b[i] > 1)) continue
      const f = fitCurve(unsignedProgress(x => bezierY(b, x)), pc)
      if (f.rms < free.rms) free = { bezier: b, ...f }
    }
  }
  free.band = durationBand(unsignedProgress(x => bezierY(free.bezier, x)), pc, free.rms)
  free.nearest = nearestNamed(free.bezier)
  free.underdetermined = pc.ts.length < FREE_FIT_MIN_SAMPLES

  // Family 3: the k-form null model.
  let kform = { rms: Infinity }
  for (let k = 0.5; k <= 6; k += 0.05) {
    const f = fitCurve(x => kformY(k, x), pc)
    if (f.rms < kform.rms) kform = { k, ...f }
  }
  kform.band = durationBand(x => kformY(kform.k, x), pc, kform.rms)

  return {
    start: seg.start, end: seg.end, frames: seg.frames, samples: pc.ts.length,
    spanMs: (t[seg.end] - t[seg.start]) * 1000,
    progress: pc,
    named, indistinct, free, kform,
    confidence: confidenceFor(seg.frames, indistinct.length),
  }
}

// A plain label the page can print: frames per transition and how many named
// curves the fit could not separate decide it, not the residual, because a
// low residual on four samples means nothing.
export function confidenceFor(frames, indistinctCount) {
  if (frames >= 10 && indistinctCount === 1) return 'high'
  if (frames >= 5 && indistinctCount <= 2) return 'medium'
  return 'low'
}

// ─── The whole pipeline from a trace ─────────────────────────────────────────

// t: seconds per frame (the time of frame i; energy[i] is the change from
// frame i-1 to i). Returns the segments with their fits, plus the floor and
// threshold so a page can draw them.
export function analyzeTrace(t, energy) {
  const { e, floor, thr, segments } = detectSegments(energy)
  return {
    floor, thr,
    fps: t.length > 1 ? (t.length - 1) / (t[t.length - 1] - t[0]) : 0,
    segments: segments.map(seg => fitSegment(t, e, seg, floor)),
  }
}
