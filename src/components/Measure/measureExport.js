// From a measurement to a token file. Pure, tested against the importer.
//
// One transition measures one duration and one curve; a token document has
// four of each. The page proposes a slot for both (the user confirms or
// changes them in the assignment row) and the file carries ONLY the assigned
// keys. `importTokens` fills the rest from Standard and reports them as
// `filled`, which is the honest document: it says which values were measured
// and which were not. Kickoff Q4.

import { INITIAL_STATE, EASING_CURVES } from 'cadence-tokens'
import { NAMED_CURVES } from './measureModel'

export const DURATION_SLOTS = ['fast', 'base', 'slow', 'slower']
export const CURVE_SLOTS = ['standard', 'enter', 'exit', 'overshoot']

// The duration slot whose Standard value is nearest on a log scale: 99ms
// proposes `fast`, 233ms proposes `base`, 599ms proposes `slower`. Log, not
// linear, so 140ms (between 100 and 200) is judged by ratio, the way durations
// are perceived.
export function proposeDurationSlot(ms, reference = INITIAL_STATE.duration) {
  let best = DURATION_SLOTS[0], bestDist = Infinity
  for (const slot of DURATION_SLOTS) {
    const d = Math.abs(Math.log(ms / reference[slot]))
    if (d < bestDist) { bestDist = d; best = slot }
  }
  return best
}

// The curve slot for a fitted named curve. The library's names and the slots
// coincide except linear, which has no editable slot (it is a fixed reference
// in the package) and reads as a standard-slot measurement.
export function proposeCurveSlot(curveName) {
  return CURVE_SLOTS.includes(curveName) ? curveName : 'standard'
}

// CSS spelling of a four-number bezier, matching the package's own emitters
// so a measured curve that equals a library curve imports back under its name.
export function bezierCss([x1, y1, x2, y2]) {
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`
}

// The flat token document the page downloads. `bezier` is the fitted curve as
// four numbers (a library curve's array, or the free fit's when the user
// chooses it). The note travels as a top-level key the importer reports as
// ignored, so it never affects the values and still reads in the file.
export function buildMeasuredTokens({ durationSlot, durationMs, curveSlot, bezier, note }) {
  if (!DURATION_SLOTS.includes(durationSlot)) throw new Error(`unknown duration slot: ${durationSlot}`)
  if (!CURVE_SLOTS.includes(curveSlot)) throw new Error(`unknown curve slot: ${curveSlot}`)
  const doc = {
    label: 'Measured',
    note: note ?? 'Measured from a screen recording with Cadence. Only the keys below were measured; an import fills the rest from Standard.',
    duration: { [durationSlot]: `${Math.round(durationMs)}ms` },
    easing: { [curveSlot]: bezierCss(bezier) },
  }
  return JSON.stringify(doc, null, 2)
}

// The note for a curve the user chose among candidates the recording could
// not separate: the file says it was a choice, from which set, with the
// residual each candidate fitted at, so the provenance is as honest as the
// filled-from-Standard report is for the keys that were not measured.
export function chosenCurveNote(candidates, chosen) {
  const list = candidates.map(c => `${c.name} (${c.rms.toFixed(3)})`).join(', ')
  return `Measured from a screen recording with Cadence. Only the keys below were measured; an import fills the rest from Standard. The recording could not separate ${candidates.length} curves, ${list}, and ${chosen} was chosen by eye against the site's Button at the measured duration.`
}

// The four numbers for a library curve by name, or null for anything else.
export function libraryBezier(name) {
  return NAMED_CURVES[name] ?? EASING_CURVES[name]?.fm ?? null
}
