// The math behind the settle-curve visualizer, kept pure and React-free so it
// unit-tests on its own, the same discipline parse.js follows. A spring token is
// three numbers; this turns them into the curve those numbers describe.
//
// The model is a damped harmonic oscillator answering a step: at t = 0 the target
// jumps from 0 to 1 and the mass, at rest, chases it. Stiffness pulls it toward
// the target, damping bleeds off velocity, mass resists the change. This is the
// same second-order system Framer Motion integrates for { type: 'spring', ... },
// so the plotted curve and the live SpringDemo describe one spring.
//
//   x'' + 2·zeta·wn·x' + wn²·x = wn²      (target 1, x(0) = 0, x'(0) = 0)
//
// with natural frequency wn = sqrt(k/m) and damping ratio zeta = c / (2·sqrt(k·m)).
// zeta names the three regimes: below 1 the spring overshoots and rings
// (underdamped), at 1 it arrives as fast as it can without overshoot (critical),
// above 1 it crawls in without ever crossing the target (overdamped).

// Guard against a non-positive param reaching the math (the sliders enforce
// positive bounds, but a direct caller might not). A flat zero curve is a safe,
// obviously-wrong fallback rather than a NaN.
function safe(params) {
  const stiffness = Number(params?.stiffness)
  const damping = Number(params?.damping)
  const mass = Number(params?.mass)
  if (!(stiffness > 0) || !(damping > 0) || !(mass > 0)) return null
  return { stiffness, damping, mass }
}

// wn = sqrt(k/m).
export function naturalFrequency({ stiffness, mass }) {
  return Math.sqrt(stiffness / mass)
}

// zeta = c / (2·sqrt(k·m)). < 1 underdamped, = 1 critical, > 1 overdamped.
export function dampingRatio({ stiffness, damping, mass }) {
  return damping / (2 * Math.sqrt(stiffness * mass))
}

// Treat |zeta - 1| under this as critical: the overdamped closed form divides by
// the gap between the two roots, which collapses to zero at exactly critical.
const CRITICAL_BAND = 1e-3

// Normalized displacement at time t (seconds), rising from 0 toward 1. Returns 1
// for a degenerate param set so the chart shows an instant arrival rather than
// breaking.
export function springDisplacement(t, params) {
  const p = safe(params)
  if (!p) return 1
  const wn = naturalFrequency(p)
  const zeta = dampingRatio(p)

  if (Math.abs(zeta - 1) < CRITICAL_BAND) {
    // Critical: fastest arrival with no overshoot.
    return 1 - Math.exp(-wn * t) * (1 + wn * t)
  }

  if (zeta < 1) {
    // Underdamped: decaying oscillation about the target.
    const wd = wn * Math.sqrt(1 - zeta * zeta)
    const decay = Math.exp(-zeta * wn * t)
    return 1 - decay * (Math.cos(wd * t) + (zeta * wn / wd) * Math.sin(wd * t))
  }

  // Overdamped: two real roots, no crossing. x = 1 + (s2·e^{s1 t} - s1·e^{s2 t})/(s1 - s2).
  const root = wn * Math.sqrt(zeta * zeta - 1)
  const s1 = -zeta * wn + root
  const s2 = -zeta * wn - root
  return 1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2)
}

// The envelope decay rate: how fast the transient dies. It sets the time scale of
// the plot. Underdamped and critical decay at zeta·wn (the exponential envelope);
// overdamped is governed by its slower root, the one nearest zero.
function decayRate(p) {
  const wn = naturalFrequency(p)
  const zeta = dampingRatio(p)
  if (zeta <= 1) return zeta * wn
  return wn * (zeta - Math.sqrt(zeta * zeta - 1)) // |slower root|
}

// A readable time window for the plot: long enough to show the spring settle,
// short enough that a stiff spring does not draw as a vertical line. Six time
// constants covers the settle; the clamp keeps both extremes legible.
const WINDOW_MIN = 0.2
const WINDOW_MAX = 4
export function settleWindow(params) {
  const p = safe(params)
  if (!p) return WINDOW_MIN
  const rate = decayRate(p)
  if (!(rate > 0)) return WINDOW_MAX
  return Math.min(WINDOW_MAX, Math.max(WINDOW_MIN, 6 / rate))
}

// Peak overshoot as a fraction of the target (0.12 = a 12% overshoot past rest).
// Only underdamped springs overshoot; the analytic peak is
// exp(-pi·zeta / sqrt(1 - zeta²)). Critical and overdamped return 0.
export function overshootFraction(params) {
  const p = safe(params)
  if (!p) return 0
  const zeta = dampingRatio(p)
  if (zeta >= 1 - CRITICAL_BAND) return 0
  return Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta))
}

// Time (seconds) for the spring to enter and stay within `band` of the target.
// Walks the analytic envelope rather than the samples so it is independent of how
// densely the chart is drawn. For under/critical the envelope is decay·e^{-r t};
// for overdamped the slow root dominates. Solve envelope = band for t.
//
// clamp (default true) exists because this function was written to label a chart,
// where a number past the plot window is not worth drawing and WINDOW_MAX is the
// honest edge of what the visualizer shows. The token audit asks a different
// question: it wants to report how long a spring actually rings, and a set of
// in-range values can describe a spring that takes a minute to settle. Clamping
// that to 4 would hide exactly the case the audit exists to surface, so it passes
// { clamp: false } and gets the raw solve. The visualizer is untouched.
export function settleTime(params, band = 0.02, { clamp = true } = {}) {
  const p = safe(params)
  if (!p) return 0
  const rate = decayRate(p)
  // Unreachable once safe() has guaranteed positive params (every branch of
  // decayRate is then positive), kept as a guard for a direct caller. Unclamped,
  // "the transient never decays" is honestly Infinity rather than a plot width.
  if (!(rate > 0)) return clamp ? settleWindow(p) : Infinity
  // Envelope amplitude at t=0 is ~1 for the underdamped cosine and for the
  // overdamped slow term; ln(1/band) / rate is the standard settle estimate.
  const t = Math.log(1 / band) / rate
  return clamp ? Math.min(t, WINDOW_MAX) : t
}

// Sample the curve for drawing: evenly spaced points across the settle window,
// plus the metadata the chart labels with. yMax tracks the real peak so an
// overshoot fits inside the plot box with a little headroom.
export function sampleSettleCurve(params, sampleCount = 64) {
  const window = settleWindow(params)
  const points = []
  let peak = 1
  for (let i = 0; i <= sampleCount; i++) {
    const t = (i / sampleCount) * window
    const x = springDisplacement(t, params)
    if (x > peak) peak = x
    points.push({ t, x })
  }
  return {
    points,
    window,
    yMax: peak,
    overshoot: overshootFraction(params),
    settleTime: settleTime(params),
  }
}
