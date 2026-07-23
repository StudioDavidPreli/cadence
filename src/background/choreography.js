// ─── choreography ─────────────────────────────────────────────────────────────
//
// When each piece of the composition arrives, and how the field breathes once
// it has. Pure: it computes numbers, and the renderer spends them on elements.
//
// This module is where the split ruling lives in code
// (background_system_rulings.md section 1), so it is worth stating plainly at
// the top, because the two halves take their timing from different places on
// purpose:
//
//   REVEAL — one-shot and bounded, so it is DEMONSTRATION. It reads the
//   editable --motion-* tokens through the caller, and Explore mode changing
//   those changes the reveal. A collapsed window degrades gracefully because
//   the animation runs once.
//
//   IDLE — infinite, so it is CHROME. It reads a fixed constant
//   (--feedback-background-idle-period) and frozen amplitudes, and Explore mode
//   cannot touch it. An editable duration dragged toward zero would otherwise
//   set the nav column vibrating.
//
// The amplitudes below were derived once from the Standard preset and frozen at
// that moment. They are no longer a function of any token, which is why they
// are plain numbers here with their provenance rather than reads.

import { draw } from './rng'

export const CHOREOGRAPHY = {
  // Spatially coherent groups, shared by both faces. Both derive membership
  // from ONE y-band partition rather than from their own sort order, so the
  // pixel shimmer moves with the glyph drift instead of merely near it.
  chunks: 12,

  // Reveal window = this many x delay.long. The one invented coefficient left
  // in demonstration territory; it is bounded and the reveal runs once, so a
  // collapsed window under Explore drag is harmless.
  revealWindowMultiple: 8,

  // Frozen from Standard, 2026-07-22. Provenance rather than live reads:
  //   amplitude = (1 - scale.pressSubtle) x 150 = (1 - 0.98) x 150
  //   dip       = (1 - scale.pressSubtle) x 12  = (1 - 0.98) x 12
  // The pressSubtle rename is history here, not a runtime dependency.
  idleAmplitude: 3,
  idleDip: 0.24,
  // Opacity never falls below this, however the per-chunk variance lands.
  idleDipFloor: 0.5,

  // Per-chunk variance. The sway periods differ per axis so the drift is
  // quasi-periodic (a Lissajous wander) rather than a visible loop.
  amplitudeVariance: [0.6, 1.4],
  periodVarianceX: [0.75, 1.35],
  periodVarianceY: [0.95, 1.65],
  dipVariance: [0.8, 1.2],

  // The pixel face breathes at this multiple of its chunk's x-sway period.
  // 0.5 gives two dips per sway cycle, which makes the pixel face the busier
  // of the two idles. Open question 6 has not been ruled; judge at the walk.
  breatheRate: 0.5,

  // Reduced motion: the reveal quantizes to this many discrete steps at this
  // duration. Not zero, because Framer Motion's onAnimationComplete does not
  // reliably fire at duration 0, and a stop-motion arrival still wants its
  // transition events. The idle is not quantized, it is dropped entirely.
  reducedSteps: 4,
  reducedDuration: 0.01,
  // The window the reduced-motion reveal spreads its steps across. FIXED and
  // token-independent, which is the fix for a real reduced-motion bug: the
  // non-reduced window is 8 x delay.long, and under reduced motion those tokens
  // flatten to 0 -- but useMotionTokens re-reads the CSS in an effect, a tick
  // AFTER first render. So a reduced window derived from tokens was either the
  // full non-reduced 1.6s on that first render (a flash of motion the
  // preference exists to prevent) or 0 once flattened. A fixed value makes the
  // reduced reveal deterministic from the first frame, independent of when the
  // tokens settle.
  //
  // 0 = instant appearance (David's call, 2026-07-23): with a zero window every
  // step lands at the same instant, so the quantization collapses to a single
  // pop and the whole composition arrives at once, each cell over the 0.01s
  // reduced duration (which keeps transition events firing). This overrides the
  // ruling's four-step stop-motion in favour of the gentler minimal-motion
  // reading for someone who has asked for less motion. Set to a small positive
  // value (0.24 gives four beats over 240ms) to restore the stop-motion.
  reducedWindow: 0,
}

// ── Grouping ──────────────────────────────────────────────────────────────────

// Which idle chunk a point belongs to, from its y alone.
//
// One explicit partition rather than two independent sorts. The lab chunked the
// vector face by stamp index and the pixel face by scanline index, which
// happened to co-locate because both sorts descend; that made the coupling
// emergent, and it would have silently decoupled the first time either face
// changed its reveal order.
export function bandOf(y, height, chunks = CHOREOGRAPHY.chunks) {
  if (!(height > 0) || !(chunks > 0)) return 0
  const band = Math.floor((y / height) * chunks)
  return Math.max(0, Math.min(chunks - 1, band))
}

// ── Reveal ────────────────────────────────────────────────────────────────────

// Per-item delays, in seconds, for a top-to-bottom reveal.
//
// `count` items arrive evenly across `windowSeconds`. The caller passes items
// already in reveal order (compose sorts its display list by y, and aggregate
// returns cells in scanline order), so this only needs the index.
//
// Under reduced motion the normalized position quantizes to `reducedSteps`
// bands, which is what makes the arrival read as stop-motion rather than as a
// smooth stagger.
//
// One obligation on the caller, stated here because getting it wrong is silent:
// if `windowSeconds` is derived from tokens that have ALREADY been flattened by
// reduceMotion (delay.long becomes 0), then the window is zero and every step
// lands at the same instant, so the quantization has nothing to spread. To get
// a visible stop-motion arrival the caller must supply an unflattened window,
// the way the P17 demo reads tokens with respectReducedMotion: false.
export function revealDelays(count, {
  windowSeconds,
  reducedMotion = false,
  steps = CHOREOGRAPHY.reducedSteps,
}) {
  if (count <= 0) return []
  const span = Math.max(0, windowSeconds || 0)
  const last = Math.max(1, count - 1)
  const delays = new Array(count)
  for (let i = 0; i < count; i++) {
    const t = i / last
    delays[i] = (reducedMotion ? Math.floor(t * steps) / steps : t) * span
  }
  return delays
}

// The reveal's timing, assembled from motion tokens. This is the demonstration
// half: every value here is a read or a formula over the editable token scale.
export function revealTiming(tokens, { reducedMotion = false } = {}) {
  // Under reduced motion the window is the fixed reducedWindow, NOT a formula
  // over delay.long: the tokens flatten a tick late, so a token-derived reduced
  // window races the flattening. See CHOREOGRAPHY.reducedWindow.
  const windowSeconds = reducedMotion
    ? CHOREOGRAPHY.reducedWindow
    : CHOREOGRAPHY.revealWindowMultiple * (tokens?.delay?.long ?? 0)
  return {
    windowSeconds,
    // Stamp and cell fade, and the armature's path draw when a grammar shows it.
    stampDuration: reducedMotion ? CHOREOGRAPHY.reducedDuration : (tokens?.duration?.base ?? 0),
    pathDuration: reducedMotion ? CHOREOGRAPHY.reducedDuration : (tokens?.duration?.slow ?? 0),
    // Outgoing composition on a regenerate. Exit curve, because it is leaving.
    crossfadeDuration: reducedMotion ? CHOREOGRAPHY.reducedDuration : (tokens?.duration?.base ?? 0),
    enterEase: tokens?.ease?.enter,
    exitEase: tokens?.ease?.exit,
  }
}

// ── Idle ──────────────────────────────────────────────────────────────────────

const lerp = (range, t) => range[0] + (range[1] - range[0]) * t

// Per-chunk idle timings, shared by both faces.
//
// One table drives the vector sway and the pixel breathe, which is the point:
// coupling them is what makes the shimmer move with the drift rather than
// alongside it.
//
// Draws are hash-keyed on the chunk index rather than pulled from a stream, so
// changing the chunk count keeps the surviving chunks' timings intact instead
// of reshuffling all of them. Same reasoning as the sampler.
//
// Returns null when the idle should not run at all. Under reduced motion the
// idle is DISABLED, not slowed and not quantized: infinite drift is the
// vestibular trigger, and a zero-duration infinite animation is still an
// infinite animation. This is the deliberate asymmetry with the reveal.
export function idleTimings({
  periodSeconds,
  seed = 0,
  chunks = CHOREOGRAPHY.chunks,
  reducedMotion = false,
}) {
  if (reducedMotion) return null
  if (!(periodSeconds > 0)) return null

  const table = new Array(chunks)
  for (let i = 0; i < chunks; i++) {
    const ampX = CHOREOGRAPHY.idleAmplitude * lerp(CHOREOGRAPHY.amplitudeVariance, draw(seed, i, 0, 1))
    const ampY = CHOREOGRAPHY.idleAmplitude * lerp(CHOREOGRAPHY.amplitudeVariance, draw(seed, i, 0, 2))
    const dx = periodSeconds * lerp(CHOREOGRAPHY.periodVarianceX, draw(seed, i, 0, 3))
    const dy = periodSeconds * lerp(CHOREOGRAPHY.periodVarianceY, draw(seed, i, 0, 4))
    const dip = CHOREOGRAPHY.idleDip * lerp(CHOREOGRAPHY.dipVariance, draw(seed, i, 0, 5))
    table[i] = {
      ampX,
      ampY,
      // Sway periods, seconds. Separate per axis so the two never resolve into
      // a visible ellipse.
      durationX: dx,
      durationY: dy,
      // Pixel breathe rides the x-sway period.
      breatheDuration: dx * CHOREOGRAPHY.breatheRate,
      // Opacity floor of the breathe, as a multiplier the keyframe reads.
      dim: Math.max(CHOREOGRAPHY.idleDipFloor, 1 - dip),
      // Alternate chunks run their sway backwards. Half the field leans the
      // other way from the first frame, which softens the communal lean that
      // starting every chunk together would otherwise produce (open question 9).
      reverse: i % 2 === 1,
    }
  }
  return table
}

// When the idle may start: after the last stamp has finished arriving, plus a
// beat so the two do not overlap. Seconds.
export function idleStartSeconds({ windowSeconds, stampDuration, settle = 0.08 }) {
  return Math.max(0, (windowSeconds || 0) + (stampDuration || 0) + settle)
}
