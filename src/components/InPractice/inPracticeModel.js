// ─── In Practice: the frame model ────────────────────────────────────────────
//
// Pure functions that decide what the Basis frame loads. Kept out of the
// component so the three rules that matter (which preset, which paper, whether
// motion is reduced) live in one tested place, and so the e2e suite can build
// the expected `src` from the same function the page uses instead of
// restating the map. Decision record: docs/decisions/in-practice-2026-10-14.md.

export const BASIS_ORIGIN = 'https://basis.davidpreli.com'

// The embed the frame loads. A stand-in until Basis ships the chart embed
// (docs/briefings/IN_PRACTICE_BASIS_CHART_EMBED_HANDOFF.md): table-sort has
// the same parameters and no chart. One constant, so the switch is one line.
export const BASIS_EMBED_PATH = '/embed/table-sort'

// True while the frame loads the chartless stand-in: the page draws a
// placeholder chart above it so the layout can be judged at its real
// proportions. Derived, not set, so moving BASIS_EMBED_PATH retires it.
export const CHART_STAND_IN = BASIS_EMBED_PATH === '/embed/table-sort'

// The full, live sheet the description links to.
export const BASIS_SHEET_URL = `${BASIS_ORIGIN}/`

// The only presets Basis can run. They are the package's built-in ids, so
// the tool bar's active preset id can be checked against this list directly.
export const BUILT_IN_PRESETS = ['standard', 'snappy', 'cinematic']
export const DEFAULT_PRESET = 'standard'

// Cadence theme -> Basis's embed-only stock in Cadence's palette. Basis
// honors these only inside a frame.
export const THEME_TO_BASIS = {
  light: 'cadence-light',
  dark: 'cadence-dark',
  'high-contrast-light': 'cadence-hc-light',
  'high-contrast-dark': 'cadence-hc-dark',
}

// Which preset the frame runs. `activeId` is the tool bar's active preset id,
// or null when the bar reads Custom (an edited slider, a saved user preset).
// Basis takes only the built-ins, so Custom keeps whatever built-in the frame
// was last given (`lastBuiltIn`): loading Snappy and then nudging a slider
// leaves the frame on Snappy rather than reloading it onto Standard.
export function framePreset(activeId, lastBuiltIn) {
  if (BUILT_IN_PRESETS.includes(activeId)) return activeId
  if (BUILT_IN_PRESETS.includes(lastBuiltIn)) return lastBuiltIn
  return DEFAULT_PRESET
}

// The frame's `src`. `reduce` follows the DemoMotionGate consent model:
// omitted with no OS preference (Basis follows the visitor's own setting,
// which is none), `1` under the preference, `0` once the visitor has pressed
// "View motion" this visit. Basis reads `0` as an explicit override, framed
// only, never stored.
export function frameSrc({ preset, theme, reducedMotion, consented }) {
  const params = new URLSearchParams()
  params.set('preset', BUILT_IN_PRESETS.includes(preset) ? preset : DEFAULT_PRESET)
  params.set('theme', THEME_TO_BASIS[theme] ?? THEME_TO_BASIS.dark)
  if (reducedMotion) params.set('reduce', consented ? '0' : '1')
  return `${BASIS_ORIGIN}${BASIS_EMBED_PATH}?${params.toString()}`
}
