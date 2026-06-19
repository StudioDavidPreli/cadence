// Token resolution for the live code view. A snippet is plain source text that
// contains real token reads like `tokens.duration.slow`. CodeBlock scans each
// line for those references and resolves them against the current token state so
// it can show the value as a trailing comment, updating as the user edits.
//
// The reads are the same shape useMotionTokens() returns:
//   duration / delay → seconds (number)
//   ease             → four-number bezier array
//   scale            → unitless number
// so resolution is a lookup plus a per-group display format.

// Matches `tokens.<group>.<key>` for the four editable families. Global so a
// single line with two reads (rare, snippets put one read per line) is fully
// scanned. matchAll does not depend on lastIndex carry-over, so sharing this
// constant across calls is safe.
export const TOKEN_REF = /tokens\.(duration|ease|delay|scale)\.([A-Za-z]+)/g

// Every `group.key` path referenced in a snippet, in source order. Used by the
// drift-guard test to assert each path resolves against the real token shape.
export function extractTokenPaths(code) {
  return [...code.matchAll(TOKEN_REF)].map(m => `${m[1]}.${m[2]}`)
}

// Does a snippet's token path name the token whose slider is being dragged?
//
// The two naming layers meet here. The control layer (slider keys, active-token
// values, TOKEN_COMPONENT_MAP) names the easing family "easing"; the runtime
// token object a snippet reads names it "ease" (matching --motion-ease-* and
// Framer Motion's input shape). duration / delay / scale use the same word on
// both sides; only easing differs. Normalize the control-layer "easing." prefix
// to the runtime "ease." before comparing, so an active `easing.enter` matches a
// snippet's `ease.enter`. This is the one place the boundary is crossed — see
// the easing/ease note. Returns false when nothing is active.
export function tokenPathMatchesActive(path, activeToken) {
  if (!activeToken) return false
  const normalized = activeToken.startsWith('easing.')
    ? activeToken.replace(/^easing\./, 'ease.')
    : activeToken
  return normalized === path
}

// Resolve one `group.key` path to its display string given a live tokens object.
// Returns null for a path the token set does not carry, so the guard test can
// catch a snippet that names a token that does not exist.
export function resolveTokenDisplay(path, tokens) {
  const [group, key] = path.split('.')
  const value = tokens?.[group]?.[key]
  if (value === undefined) return null

  // duration and delay are held in seconds, matching what Framer Motion gets.
  // toFixed(3) then unary-plus trims trailing zeros: 0.4 stays "0.4s", a dragged
  // 0.123 stays "0.123s".
  if (group === 'duration' || group === 'delay') return `${+value.toFixed(3)}s`

  // ease is a four-number bezier array.
  if (group === 'ease') return `[${value.join(', ')}]`

  // scale is unitless.
  return `${value}`
}
