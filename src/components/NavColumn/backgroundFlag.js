// The background artwork is post-launch v1.x work on a shipped site, so it is
// opt-in per page load and off by default.
//
//   ?bg=1   anywhere in the query string, e.g.
//           https://cadence.davidpreli.com/?bg=1#/token-lab
//
// A query flag rather than a build-time constant because the checks that matter
// are on the deployed site and on built output, where a rebuild to flip a
// constant is a poor trade. The app's own routing lives in the hash, so a query
// parameter sits beside it without colliding.
//
// Read once at module scope: it cannot change without a reload, and nothing
// should re-render on it.
//
// Its own module so the flag can be imported by a component file without
// tripping the fast-refresh rule about mixed exports.
//
// NOTHING from src/background is imported here, and that is deliberate: this
// module is in the EAGER bundle (NavColumn imports the flag directly), so a
// background import would put background code in the main chunk with the flag
// off, which is the one property the whole lazy split exists to keep. The seed
// is therefore only PARSED here (a URL read, no background code); it is HASHED
// in the lazy chunk, where rng is already loaded. See NavBackgroundArt.
const PARAMS =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

export const BACKGROUND_ENABLED = PARAMS?.has('bg') ?? false

// The empty-cell grid: the pixel face's substrate, drawn as a full cell lattice
// in --color-border so the systematization the marks snap to is visible rather
// than implied. Off by default and its own flag, so the artwork can be judged
// with and without it.
//
//   ?grid=1   with ?bg=1, e.g. ?bg=1&grid=1
export const BACKGROUND_GRID = PARAMS?.has('grid') ?? false

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

// The tuning overrides, same lab-affordance spirit as ?seed=. Each is null when
// absent, and BackgroundArt's own committed default (budget 120, scale 0.21,
// cell 8) stands. They exist so a variant can be looked at by URL rather than by
// editing a constant and rebuilding:
//
//   ?budget=<int>   total glyph count before the high-contrast 0.6 multiplier
//   ?scale=<float>  stamp scale, fraction of the 84-unit normalized mark span
//   ?cell=<int>     pixel-face cell size in px (open question 8, never ruled)
//
// e.g. ?bg=1&budget=60&scale=0.34&cell=12
export const BACKGROUND_TUNING = {
  budget: numParam('budget', Number.parseInt),
  scale: numParam('scale', Number.parseFloat),
  cell: numParam('cell', Number.parseInt),
}
