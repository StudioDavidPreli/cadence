// Provenance: where every value in the token system came from.
//
// The style guide (build-order item 5) renders this beside each token, because
// a spec that says where each number came from is the column most motion docs
// are missing. Three tags, and every value gets exactly one:
//
//   measured  Extracted from a source by measurement. The claim is specific
//             and falsifiable (an easing exponent fitted to source frames, a
//             cycle period read off a reference loop).
//   derived   Adopted from a named reference system, with the source named.
//             Derivation is on role and lineage, never a claim of value
//             equality with another system unless the numbers actually match
//             (docs/references/motion-presets-harmonized.md records the one
//             place that distinction bit: cross-system easing aliases share a
//             role, not a bezier).
//   tuned     Authored for Cadence by eye and ear against the running
//             components. No external source; the values are their own
//             record, and saying so plainly beats inventing lineage. (The
//             duration-scalar pattern once carried a named attribution that
//             could not be verified; it was removed. That lesson is why this
//             tag exists instead of a vaguer one.)
//
// "Proposed" (the tile-era fourth tag) is retired here on purpose: it marked
// values awaiting design sign-off, and nothing ships un-signed-off.
//
// Entries are keyed by export-document paths (duration.fast, easing.standard,
// spring.stiffness, scalar) plus the ambient vocabulary (ambient.speed …) and
// the two fixed constants. `source` names what a public reader can check;
// `note` is the one-sentence story. `presets`, where present, records that
// the Snappy/Cinematic variants carry different provenance than Standard.

export const PROVENANCE_TAGS = ['measured', 'derived', 'tuned']

// The shared story for the non-Standard personalities: authored as
// personalities, then blessed as final in the 2026-07-16 design sign-off pass.
const PERSONALITY_NOTE =
  'Snappy and Cinematic variants are tuned personalities, signed off 2026-07-16.'

export const provenance = {
  // ── Duration ──
  'duration.fast': {
    tag: 'derived',
    source: 'Material 3 duration scale (short2)',
    note: 'The Standard ladder is a four-stop subset of M3’s twelve: a teaching tool wants few, distinct steps.',
    presets: PERSONALITY_NOTE,
  },
  'duration.base': {
    tag: 'derived',
    source: 'Material 3 duration scale (short4)',
    note: 'Second stop of the four-stop M3 subset.',
    presets: PERSONALITY_NOTE,
  },
  'duration.slow': {
    tag: 'derived',
    source: 'Material 3 duration scale (medium4)',
    note: 'Third stop of the four-stop M3 subset.',
    presets: PERSONALITY_NOTE,
  },
  'duration.slower': {
    tag: 'derived',
    source: 'Material 3 duration scale (long4)',
    note: 'Fourth stop of the four-stop M3 subset.',
    presets: PERSONALITY_NOTE,
  },
  'scalar': {
    tag: 'derived',
    source: 'The duration-scalar pattern several design systems use',
    note: 'The pattern is common practice; a named origin could not be verified and is deliberately not claimed. The value 1 is the identity.',
  },

  // ── Easing ──
  'easing.linear': {
    tag: 'derived',
    source: 'The identity curve',
    note: 'cubic-bezier(0, 0, 1, 1) is linear in every system; there is nothing to attribute.',
  },
  'easing.standard': {
    tag: 'derived',
    source: 'Material 2-era standard easing',
    note: 'Same role as Material standard and Carbon standard. Role alias, not value equality: each system ships its own bezier.',
    presets: 'Snappy re-points this slot at Overshoot; Cinematic re-points it at Enter. Slot wiring is tuned; the curves keep their own lineage.',
  },
  'easing.enter': {
    tag: 'derived',
    source: 'Material 2-era decelerate easing',
    note: 'The arriving role: Material decelerate, Carbon entrance, CSS ease-out, AE ease-out. Same role, four vocabularies, different control points.',
  },
  'easing.exit': {
    tag: 'derived',
    source: 'Material 2-era accelerate easing',
    note: 'The leaving role: Material accelerate, Carbon exit, CSS ease-in, AE ease-in.',
  },
  'easing.overshoot': {
    tag: 'derived',
    source: 'The widely circulated overshoot bezier',
    note: 'A bezier approximation of spring overshoot, common web-animation practice with no single origin to cite. Renamed from Spring (2026-07-08) because a cubic-bezier is not a spring.',
  },

  // ── Delay ──
  'delay.none': {
    tag: 'derived',
    source: 'The identity delay',
    note: 'Zero is zero; the token exists so the scale is complete.',
  },
  'delay.short': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'Neither Material nor Carbon ships a named delay scale; Cadence adds one because naming the stagger steps makes choreography systematizable the way duration is.',
    presets: PERSONALITY_NOTE,
  },
  'delay.medium': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'Second beat of the authored stagger scale.',
    presets: PERSONALITY_NOTE,
  },
  'delay.long': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'The deliberate-pause step of the authored stagger scale.',
    presets: PERSONALITY_NOTE,
  },

  // ── Scale ──
  'scale.pressSubtle': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'Press compression for density-heavy UI, set against the live demos. Renamed from scale.subtle 2026-07-21; the value never changed.',
    presets: PERSONALITY_NOTE,
  },
  'scale.pressBase': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'The standard press, set against the live demos.',
    presets: PERSONALITY_NOTE,
  },
  'scale.pressExpressive': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'The hero-element press, set against the live demos.',
    presets: PERSONALITY_NOTE,
  },
  'scale.lift': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'The selected/elevated grow, set against the live demos.',
    presets: PERSONALITY_NOTE,
  },

  // ── Spring ──
  'spring.stiffness': {
    tag: 'tuned',
    source: 'docs/decisions/physics-spring-2026-07-20.md',
    note: 'First pass proposed 400; tuned by feel to 170 against the live SpringDemo the day the family shipped. Springs are tuned by feel, not by table.',
    presets: 'Snappy 600 (bounces harder, arrives faster); Cinematic 180 (composure, not weight). Authored with the family.',
  },
  'spring.damping': {
    tag: 'tuned',
    source: 'docs/decisions/physics-spring-2026-07-20.md',
    note: 'First pass proposed 30; tuned to 20 for a soft settle with a hint of overshoot.',
    presets: 'Snappy 22; Cinematic 26 (near-critically damped: the extra damping buys a bounce-free settle).',
  },
  'spring.mass': {
    tag: 'tuned',
    source: 'docs/decisions/physics-spring-2026-07-20.md',
    note: 'First pass proposed 1; tuned to 1.5 for a weighted settle.',
    presets: 'Snappy 1 (lighter, snappier); Cinematic 1.2.',
  },

  // ── Ambient (the Motion Tiles vocabulary) ──
  'ambient.basePeriod': {
    tag: 'measured',
    source: 'The source animation’s cycle',
    note: 'The 4-beat cycle (hold, ease up, hold, ease back) runs 2.0 seconds at speed 1, read off the reference loop the tile system was rebuilt from.',
  },
  'ambient.easing': {
    tag: 'measured',
    source: 'Fitted to the source animation’s frames',
    note: 'Standard’s k = 1.70 is the measured source easing, roughly CSS ease-in-out, fitted during the tile reconstruction.',
    presets: 'Snappy 3.60 and Cinematic 1.15 are tuned personalities, signed off 2026-07-16.',
  },
  'ambient.speed': {
    tag: 'measured',
    source: 'The source animation’s cycle',
    note: 'Standard’s 1.0 anchors the measured 2.0s period; speed divides it.',
    presets: 'Snappy 1.25 and Cinematic 0.8 are tuned personalities, signed off 2026-07-16.',
  },
  'ambient.spread': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'The field stagger, ordered snappy < standard < cinematic so the wave widens as the personality slows.',
  },
  'ambient.cell': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'Pixelation cell size per personality, set by eye on the live grid.',
  },
  'ambient.gap': {
    tag: 'tuned',
    source: 'Cadence',
    note: 'Pixelation gap per personality, set by eye on the live grid.',
  },
}
