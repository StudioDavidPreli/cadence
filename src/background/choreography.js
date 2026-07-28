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
//   IDLE — infinite, so it is CHROME, but chrome turned out to mean BOUNDED
//   rather than FIXED, and the difference took two attempts to find.
//
//   The rule was written because an infinite animation whose duration is dragged
//   toward zero sets the nav column vibrating. The hazard there is unbounded
//   input, not input. So the idle reads one token, through one function that
//   cannot produce a degenerate value: `driftPeriodSeconds` scales the period by
//   --motion-duration-slower and CLAMPS it. The floor is the safety argument, no
//   editable value reaches below it, and the fixed constant survives as the
//   anchor that Standard maps to exactly.
//
//   The SHAPE of the swing is not a token and was tried as one. A `driftEase`
//   read --motion-ease-standard into the sway's timing function on 2026-07-27
//   and was removed the same day: these presets are made of duration, so a curve
//   carried almost none of what separates them (Standard and Cinematic differ by
//   one control point and decelerate into the same endpoint), and making the
//   difference visible took an amplitude that made the background distracting.
//   The sway is back on a plain ease-in-out. If the shape is ever revisited,
//   revisit it knowing that a speed reads at a size a curve does not.
//
// Amplitude is a plain number rather than a token read, but it is a look value
// now rather than a frozen derivation. See `idleAmplitude`.

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

  // Peak sway displacement in px, before the per-chunk variance below widens it
  // to [0.6, 1.4] of this.
  //
  // 3, and it went to 8 and back on 2026-07-27. Worth keeping the round trip,
  // because it is the same lesson `driftPeriodSeconds` records from the other
  // side: while the drift's only token was the easing curve, telling two presets
  // apart took an amplitude that made the whole background distracting, and 8
  // was still not enough. Once the PERIOD carried the preset, 3px was plenty,
  // because a speed difference is legible at a size a curve difference is not.
  // A background that has to shout to be understood is being asked the wrong
  // question.
  //
  // Whatever it becomes, it has to reach `markReach` in BackgroundArt too. The
  // protected baseline keeps ink out from behind the nav labels, and a stamp
  // that sways upward crosses it exactly as surely as one placed too high.
  // `maxSwayReach` below is that number; it exists so the two cannot drift
  // apart.
  idleAmplitude: 3,

  // The drift period scales with --motion-duration-slower against this
  // reference, which is Standard's own value. Standard therefore maps to the
  // chrome constant exactly and every other preset moves relative to it.
  // Seconds, because that is the unit useMotionTokens hands over.
  driftReferenceSlower: 0.6,

  // Hard floor and ceiling on the scaled period, seconds. The floor is the whole
  // safety argument: no editable value can drive the idle below it, so the
  // strobe the chrome rule exists to prevent is unreachable. The ceiling is a
  // look bound, not a safety one -- past roughly this, drift stops reading as
  // motion and starts reading as a rendering glitch noticed on second glance.
  driftPeriodClamp: [2.5, 12],

  // Frozen from Standard, 2026-07-22, and still frozen:
  //   dip = (1 - scale.pressSubtle) x 12 = (1 - 0.98) x 12
  // The pressSubtle rename is history here, not a runtime dependency.
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
  amplitude = CHOREOGRAPHY.idleAmplitude,
}) {
  if (reducedMotion) return null
  if (!(periodSeconds > 0)) return null

  const table = new Array(chunks)
  for (let i = 0; i < chunks; i++) {
    const ampX = amplitude * lerp(CHOREOGRAPHY.amplitudeVariance, draw(seed, i, 0, 1))
    const ampY = amplitude * lerp(CHOREOGRAPHY.amplitudeVariance, draw(seed, i, 0, 2))
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

// ── The drift period ──────────────────────────────────────────────────────────
//
// How long one swing takes, scaled by the active preset and clamped.
//
// This replaces a flat chrome constant, and the replacement is the honest
// version of the rule rather than a way around it. The rule says the idle is
// infinite so its duration must not be editable, because an infinite animation
// dragged toward zero sets the nav column vibrating. The hazard is UNBOUNDED
// INPUT, not input as such. A clamp bounds it: at a floor of 2.5s there is no
// value of --motion-duration-slower, in Explore mode or out of it, that produces
// anything a person would call a strobe.
//
// Why the period and not the curve. The first attempt shaped the drift with
// --motion-ease-standard and left the period fixed, on the reasoning that a
// curve has no degenerate value. True, and beside the point: these presets are
// made of duration, not of easing.
//
//   duration.base    Snappy 120ms   Standard 200ms   Cinematic 500ms
//   standard curve   overshoot      standard         enter
//                    [.34,1.56,...] [.4,0,.2,1]      [0,0,.2,1]
//
// Standard and Cinematic differ by one control point's x and decelerate into the
// same endpoint, so as drift they are the same drift. Holding the period fixed
// discarded the 4x that actually separates the presets and kept the part that
// barely registers, which is why Cinematic read as Snappy: identical speed, and
// a curve difference too small to correct the impression.
//
// It cost amplitude too. A curve difference is a difference in how a swing is
// distributed across its duration, so it needs distance to become visible; a
// speed difference is legible at almost any size. Paying with amplitude for what
// should have been paid with time is what made the background distracting.
//
// `duration.slower` is the read, not `base`: it is the slowest thing in the
// scale and the idle is the slowest thing on the surface. The reference is
// Standard's own 600ms, so Standard maps to the chrome constant exactly and the
// constant keeps its job as the anchor rather than being deleted.
export function driftPeriodSeconds(tokens, {
  basePeriod,
  reference = CHOREOGRAPHY.driftReferenceSlower,
  clamp = CHOREOGRAPHY.driftPeriodClamp,
} = {}) {
  if (!(basePeriod > 0)) return 0
  const slower = tokens?.duration?.slower
  // No usable token: the chrome constant stands, unscaled and unclamped. That is
  // the pre-token behaviour and the right answer when there is nothing to read.
  if (!(slower > 0) || !(reference > 0)) return basePeriod
  const scaled = basePeriod * (slower / reference)
  return Math.min(clamp[1], Math.max(clamp[0], scaled))
}

// The furthest a stamp can be displaced from its placement by the idle, in px.
// Callers that reserve space for a mark have to include this: the sway moves ink
// after the sampler has finished deciding where ink may go.
export function maxSwayReach(amplitude = CHOREOGRAPHY.idleAmplitude) {
  return amplitude * CHOREOGRAPHY.amplitudeVariance[1]
}

// When the idle may start: after the last stamp has finished arriving, plus a
// beat so the two do not overlap. Seconds.
export function idleStartSeconds({ windowSeconds, stampDuration, settle = 0.08 }) {
  return Math.max(0, (windowSeconds || 0) + (stampDuration || 0) + settle)
}
