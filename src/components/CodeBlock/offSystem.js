import {
  EASING_CURVES, EXPLORE_BOUNDS, SPRING_BOUNDS,
  // The value math moved down to the package (2026-09-13) so the token audit, a
  // leaf layer that must not import upward into components/, can reach the same
  // arithmetic the code view uses. Re-exported below, so this module's public
  // surface is unchanged for CodeBlock and Token Lab.
  splitTokenPath as splitPath, nearestToken, formatLiteral, formatDisplay,
} from 'cadence-tokens'

export { nearestToken, formatLiteral, formatDisplay }

// ─── Off-system edits: the pure model ─────────────────────────────────────────
//
// A Token Lab code view lets the reader click a token read (tokens.duration.fast)
// and type a literal in its place. From then on THAT demo runs the literal
// instead of the token: the slider still drives every other demo, and this one
// has drifted. The demo's connection border drops, the comment row under the
// read names the drift, and two text actions resolve it: [RECONNECT] restores
// the token read; [ADOPT] moves the token to the literal so every consumer
// follows. A preset load resets every demo, because a preset is a whole system.
//
// This module is the arithmetic and the wording, kept pure so it is testable
// without a DOM: how a typed string becomes a value, what the nearest token to
// a value is, what the comment says, how an override set patches the live
// tokens, and how an override becomes a reducer action or an export deviation.
//
// Units are the RUNTIME units the components read (seconds, four-number arrays,
// unitless numbers), the same shape useMotionTokens returns, because the
// literal the reader types stands where the token read stood in the source,
// and the source is Framer Motion code that takes seconds.
//
// Override shape (Token Lab state): { [componentName]: { [path]: value } },
// keyed by the DemoWrapper's componentName and the runtime token path. The
// override is per demo and per PATH, not per line: the component reads its
// tokens through one provider, so a path can only resolve to one value inside
// it. A snippet that reads the same token twice (Button reads duration.fast in
// the press and the release) shows the literal at both reads, because that is
// what the component now runs. Honest, if a little surprising the first time.

const isTime = family => family === 'duration' || family === 'delay'

// Seconds -> ms without float noise (0.123 * 1000 is 123.00000000000001 in JS).
const secondsToMs = s => +(s * 1000).toFixed(3)

// Bounds a typed literal must land inside, in runtime units. These are the
// Explore-mode bounds, so an accepted literal is always one a slider can show,
// which is what makes [ADOPT] exact: adopting never has to clamp.
function scalarBounds(family, key) {
  if (family === 'spring') return SPRING_BOUNDS[key]
  const b = EXPLORE_BOUNDS[family]
  return isTime(family) ? { min: b.min / 1000, max: b.max / 1000 } : b
}

// Parse what the reader typed. Returns { ok: true, value } or { ok: false,
// reason }; the reason is a short sentence for the input's title. Curves take
// "[a, b, c, d]" or "a, b, c, d". Everything else is one number.
export function parseLiteral(path, text) {
  const { family, key } = splitPath(path)
  const raw = String(text).trim()
  if (family === 'ease') {
    const inner = raw.replace(/^\[/, '').replace(/\]$/, '')
    const parts = inner.split(',').map(s => parseFloat(s.trim()))
    if (parts.length !== 4 || !parts.every(Number.isFinite)) {
      return { ok: false, reason: 'A curve is four numbers: x1, y1, x2, y2.' }
    }
    if (parts[0] < 0 || parts[0] > 1 || parts[2] < 0 || parts[2] > 1) {
      return { ok: false, reason: 'x1 and x2 must be between 0 and 1.' }
    }
    return { ok: true, value: parts }
  }
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(raw)) {
    return { ok: false, reason: 'Expected a number.' }
  }
  const { min, max } = scalarBounds(family, key)
  if (n < min || n > max) {
    const unit = isTime(family) ? 's' : ''
    return { ok: false, reason: `${family}.${key} takes ${min}${unit} to ${max}${unit}.` }
  }
  return { ok: true, value: n }
}

// The comment row under an off-system read. Three phrasings:
//   off-system: matches duration.base today       (equal to a token right now)
//   off-system: 0.25s, nearest duration.fast (0.2s)
//   off-system: nearest ease.standard             (curves: the array is long)
// "today" is the Token Fidelity lesson in one word: a literal that equals a
// token now is still not the token, and drifts the moment the token moves.
export function offSystemComment(path, value, tokens) {
  const nearest = nearestToken(path, value, tokens)
  if (!nearest) return `off-system: ${formatDisplay(path, value)}`
  if (nearest.matches) return `off-system: matches ${nearest.key} today`
  if (Array.isArray(value)) return `off-system: nearest ${nearest.key}`
  return `off-system: ${formatDisplay(path, value)}, nearest ${nearest.key} (${formatDisplay(path, nearest.value)})`
}

// The live tokens with one demo's overrides written over them. Only the
// families that carry an override are copied, so a demo with none gets the
// original object back (referential identity preserved, no re-render churn).
export function patchTokens(tokens, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return tokens
  const patched = { ...tokens }
  for (const [path, value] of Object.entries(overrides)) {
    const { family, key } = splitPath(path)
    patched[family] = { ...patched[family], [key]: value }
  }
  return patched
}

// [ADOPT]: the reducer action that moves the token to the literal. Duration
// and delay go back to ms (the reducer's unit); a curve that equals a named
// curve canonicalizes to its key, the way import does, so the easing slot
// reads "Overshoot" rather than a custom copy of it.
export function adoptAction(path, value) {
  const { family, key } = splitPath(path)
  if (family === 'ease') {
    const named = Object.entries(EASING_CURVES).find(([, c]) => c.fm.every((n, i) => n === value[i]))
    return { type: 'SET_EASING', slot: key, value: named ? named[0] : value }
  }
  const type = { duration: 'SET_DURATION', delay: 'SET_DELAY', scale: 'SET_SCALE', spring: 'SET_SPRING' }[family]
  return { type, key, value: isTime(family) ? secondsToMs(value) : value }
}

// Override set <-> export deviations. The export list is flat and ordered by
// demo then path, so a file diff reads as a list of components.
export function deviationsFromOverrides(overrides) {
  return Object.entries(overrides ?? {}).flatMap(([component, paths]) =>
    Object.entries(paths).map(([token, value]) => ({ component, token, value })))
}

export function overridesFromDeviations(deviations) {
  const out = {}
  for (const { component, token, value } of deviations ?? []) {
    out[component] = { ...(out[component] ?? {}), [token]: value }
  }
  return out
}
