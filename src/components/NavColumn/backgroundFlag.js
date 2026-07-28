// The background artwork ships ON, as of 2026-07-28. It spent five days opt-in
// behind `?bg=1` while the art was still moving; the finalization pass closed
// the last four questions and David flipped it after driving built output.
//
//   ?bg=0   turns it OFF for a page load, e.g.
//           https://cadence.davidpreli.com/?bg=0#/token-lab
//
// The escape hatch survives the flip, and it is the same argument that made this
// a query flag rather than a build-time constant in the first place: the checks
// that matter are on the deployed site, where a rebuild to flip a constant is a
// poor trade. That argument does not stop applying once the default changes. If
// the artwork misbehaves on someone's machine, `?bg=0` answers it without a
// deploy. The app's own routing lives in the hash, so a query parameter sits
// beside it without colliding.
//
// PRESENCE used to be the test (`has('bg')`), which is why the old spelling was
// `?bg=1` and why `?bg=0` would also have turned it on. Opting out has to read
// the VALUE, so it does. Anything other than the three off spellings leaves it
// on, including a bare `?bg`, because a typo should not silently remove the
// artwork.
//
// Read once at module scope: it cannot change without a reload, and nothing
// should re-render on it.
//
// Its own module so the flag can be imported by a component file without
// tripping the fast-refresh rule about mixed exports.
//
// NOTHING from src/background is imported here, and that is deliberate: this
// module is in the EAGER bundle (NavColumn imports the flag directly), so a
// background import would put background code in the main chunk even for a
// visitor who opted out, which is the one property the whole lazy split exists
// to keep. The seed is therefore only PARSED here (a URL read, no background
// code); it is HASHED in the lazy chunk, where rng is already loaded. See
// NavBackgroundArt.
const PARAMS =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

const OFF = ['0', 'off', 'false']

// The predicate, separated from the module-scope URL read so it can be tested.
// The read has to happen once, at import, and a test cannot restage that; the
// decision it feeds can be checked directly. Worth checking, because both ways
// of getting this backwards are quiet: an inverted default ships an invisible
// background, and a missed off-spelling ships one nobody can turn off.
export function backgroundEnabledFrom(search) {
  return !OFF.includes((new URLSearchParams(search).get('bg') ?? '').toLowerCase())
}

export const BACKGROUND_ENABLED = PARAMS ? backgroundEnabledFrom(PARAMS.toString()) : true

// Read a numeric query param, or null when absent or unparseable. `parse` is
// Number.parseInt or Number.parseFloat.
function numParam(name, parse) {
  const raw = PARAMS?.get(name)
  if (raw == null) return null
  const n = parse(raw, 10)
  return Number.isFinite(n) ? n : null
}

// The lab override. `?seed=<int>` pins the composition to one exact plant, which
// is how a committed seed would be chosen if the surface ever wants one specific
// drawing forever (ruling 4: reroll stays a lab affordance). Returns null when
// absent or unparseable, and the visit seed takes over.
export const BACKGROUND_SEED_PARAM = numParam('seed', Number.parseInt)

// The tuning overrides, same spirit as ?seed=. Each is null when absent, and the
// settled value in NavBackgroundArt stands. They exist so a variant can be
// looked at by URL rather than by editing a constant and rebuilding.
//
// This list is shorter than it was. `cell`, `arrival`, `gridw`, `face` and `ink`
// all steered the traced and pixel faces, which were deleted 2026-07-28 along
// with the tuning lab that grew them. What is left is the three that still name
// something the one remaining face draws.
//
//   ?budget=<int>     total mark count
//   ?scale=<float>    stamp scale, fraction of the 84-unit normalized mark span
//   ?roots=<a,b,...>  root positions as FRACTIONS of the column width, e.g.
//                     0.29,0.71 (the default) or 0.5 for a single stem
//
// e.g. ?budget=60&scale=0.5
export const BACKGROUND_TUNING = {
  budget: numParam('budget', Number.parseInt),
  scale: numParam('scale', Number.parseFloat),
  // Fractions, not pixels: the column width is not known here and the whole
  // point of the knob is that a value stays meaningful across viewport widths.
  // Anything unparseable drops the whole list rather than half of it.
  roots: (() => {
    const raw = PARAMS?.get('roots')
    if (!raw) return null
    const parts = raw.split(',').map((s) => Number.parseFloat(s))
    return parts.length && parts.every((n) => Number.isFinite(n)) ? parts : null
  })(),
}
