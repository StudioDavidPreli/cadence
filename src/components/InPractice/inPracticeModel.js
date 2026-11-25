// ─── In Practice: the frame model ────────────────────────────────────────────
//
// Pure functions that decide what each product's frame loads. Kept out of the
// components so the three rules that matter (which preset, which palette,
// whether motion is reduced) live in one tested place, and so the e2e suite can
// build the expected `src` from the same function the page uses instead of
// restating the map. Decision record: docs/decisions/in-practice-2026-10-14.md.
//
// A product is an entry: where its embed lives and where its page links out to.
// The preset, theme and reduce rules are shared, because every product takes
// the same three parameters by the same names.

export const BASIS_ORIGIN = 'https://basis.davidpreli.com'

// The embed the frame loads: Basis's In Practice stage (live 2026-10-15,
// Basis bbacfa4), a simplified chart over the ledger from a frozen fixture
// snapshot, built for a 560 to 880 px frame and 820 px tall at every width
// in that range. One constant, so a later product page is one line too.
export const BASIS_EMBED_PATH = '/embed/in-practice'

// The full, live sheet the description links to.
export const BASIS_SHEET_URL = `${BASIS_ORIGIN}/`

// Basis as an entry, from the constants above.
export const BASIS = {
  origin: BASIS_ORIGIN,
  embedPath: BASIS_EMBED_PATH,
  linkOut: BASIS_SHEET_URL,
}

// CLNDR, the studio's booking calendar (2026-11-25). Contract: docs/embed.md in
// the booking-calendar repo. It takes real bookings, and only
// https://cadence.davidpreli.com may frame it: a Cadence on localhost shows a
// refused frame, by David's decision.
export const CLNDR = {
  origin: 'https://calendar.davidpreli.com',
  embedPath: '/embed/booking',
  linkOut: 'https://calendar.davidpreli.com',
}

// The only presets a product can run. They are the package's built-in ids, so
// the tool bar's active preset id can be checked against this list directly.
export const BUILT_IN_PRESETS = ['standard', 'snappy', 'cinematic']
export const DEFAULT_PRESET = 'standard'

// Cadence theme -> the embed's name for it. Basis's embed-only stocks were
// first; the calendar took the same four names, so one map serves both.
export const THEME_TO_EMBED = {
  light: 'cadence-light',
  dark: 'cadence-dark',
  'high-contrast-light': 'cadence-hc-light',
  'high-contrast-dark': 'cadence-hc-dark',
}

// The map under its first name, which Basis's tests read.
export const THEME_TO_BASIS = THEME_TO_EMBED

// Which preset the frame runs. `activeId` is the tool bar's active preset id,
// or null when the bar reads Custom (an edited slider, a saved user preset).
// A product takes only the built-ins, so Custom keeps whatever built-in the frame
// was last given (`lastBuiltIn`): loading Snappy and then nudging a slider
// leaves the frame on Snappy rather than reloading it onto Standard.
export function framePreset(activeId, lastBuiltIn) {
  if (BUILT_IN_PRESETS.includes(activeId)) return activeId
  if (BUILT_IN_PRESETS.includes(lastBuiltIn)) return lastBuiltIn
  return DEFAULT_PRESET
}

// A product's frame `src`. `reduce` follows the DemoMotionGate consent model:
// omitted with no OS preference (the product follows the visitor's own setting,
// which is none), `1` under the preference, `0` once the visitor has pressed
// "View motion" this visit. A product reads `0` as an explicit override, framed
// only, never stored.
export function embedSrc(product, { preset, theme, reducedMotion, consented }) {
  const params = new URLSearchParams()
  params.set('preset', BUILT_IN_PRESETS.includes(preset) ? preset : DEFAULT_PRESET)
  params.set('theme', THEME_TO_EMBED[theme] ?? THEME_TO_EMBED.dark)
  if (reducedMotion) params.set('reduce', consented ? '0' : '1')
  return `${product.origin}${product.embedPath}?${params.toString()}`
}

// Basis's `src`, the form its page and its tests call.
export function frameSrc(state) {
  return embedSrc(BASIS, state)
}
