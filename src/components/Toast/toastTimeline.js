// The toast stack's schedule, as a pure function of the tokens.
//
// Pulled out of the component for two reasons. It is the part with arithmetic in
// it, so it is the part worth testing directly (the same reason measureModel,
// lintModel and glossaryModel live beside their components). And keeping it a
// function of tokens-in makes the sampling moment explicit: the component calls
// this once, when Notify is pressed, with whatever the tokens are at that
// instant. Nothing recomputes while a run is in flight.
//
// Each toast gets one four-keyframe timeline: in, hold, out.
//
//   delay     when this toast's timeline starts, staggering the arrivals
//   duration  its whole life, entrance through exit
//   times     where each keyframe sits as a fraction of duration, which is how
//             one animation carries three segments of unequal length
//
// Two staggers are in play and they are deliberately different intervals.
// Arrivals are offset by delay.short, because the three toasts are one event and
// a wider gap would read as three. Exits are offset by delay.medium, because
// leaving is less urgent than arriving. Holding both means each toast's hold is
// slightly different: the schedule is absolute, measured from the press, and the
// per-toast hold is whatever is left after its own offset is subtracted.
export function buildTimeline(tokens, count) {
  const enter = tokens.duration.base
  const exit = tokens.duration.base

  // The hold begins once the LAST toast has finished arriving, not once each one
  // has. A stack that starts expiring while it is still assembling reads as
  // broken, and the reading time it owes is the same for all three.
  const lastArrival = (count - 1) * tokens.delay.short + enter
  // The two longest names the system has. delay.long alone was 200ms in
  // Standard, which is nobody's reading time.
  const holdUntil = lastArrival + tokens.duration.slower + tokens.delay.long

  return Array.from({ length: count }, (_, index) => {
    const delay = index * tokens.delay.short
    const exitStartsAt = holdUntil + index * tokens.delay.medium

    // Clamped because Explore mode moves all four tokens independently, and a
    // long delay.short against a short delay.medium can drive this negative. A
    // negative segment would reach Framer Motion as a negative duration, the
    // same failure class as the 2026-07-15 NaN crash.
    const hold = Math.max(0, exitStartsAt - delay - enter)
    const duration = enter + hold + exit

    // Explore mode can floor every duration at once. Dividing by a zero total
    // would put NaN in `times`, so fall back to a shape that is valid and
    // instant rather than one that throws.
    const times = duration > 0
      ? [0, enter / duration, (enter + hold) / duration, 1]
      : [0, 0, 1, 1]

    return { delay, duration, times }
  })
}
