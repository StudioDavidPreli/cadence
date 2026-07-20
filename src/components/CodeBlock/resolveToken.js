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

import { EDITABLE_TOKEN_SCHEMA } from '../../data/motionPresets'

// Matches `tokens.<group>.<key>` for the five editable families. Global so a
// single line with two reads (rare, snippets put one read per line) is fully
// scanned. matchAll does not depend on lastIndex carry-over, so sharing this
// constant across calls is safe.
export const TOKEN_REF = /tokens\.(duration|ease|delay|scale|spring)\.([A-Za-z]+)/g

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

// Can the tool bar edit this token, or is it a fixed reference?
//
// EDITABLE_TOKEN_SCHEMA (data/motionPresets.js) is the single source of truth for
// what the editor exposes a control for. A token whose key is not in the schema
// for its family is a fixed reference: ease.linear (corners only, nothing to
// drag) and delay.none. Overshoot is in the schema, an editable slot whose
// control surfaces only in Explore mode, so it is never marked. The code view
// marks the fixed pair so a comment that never moves while sliders are dragged
// (Spinner's ease.linear is the clearest case) reads as intentional, not broken.
//
// Same naming boundary as tokenPathMatchesActive: a snippet path names the easing
// family "ease"; the schema (control layer) names it "easing". Normalize before
// the lookup. A path the regex would never produce (unknown group) returns false.
export function isEditableToken(path) {
  const [group, key] = path.split('.')
  const controlGroup = group === 'ease' ? 'easing' : group
  return Boolean(EDITABLE_TOKEN_SCHEMA[controlGroup]?.includes(key))
}

// Resolve one `group.key` path to its display string given a live tokens object.
// Returns null for a path the token set does not carry, so the guard test can
// catch a snippet that names a token that does not exist.
export function resolveTokenDisplay(path, tokens) {
  const [group, key] = path.split('.')
  const value = tokens?.[group]?.[key]
  if (value === undefined) return null

  // All three families use the same display scheme: toFixed(3) caps the tail at
  // three places, then unary-plus trims trailing zeros. A dragged slider or curve
  // yields raw floats like 1.0299999999999998; without this they print in full.
  // 0.4 stays "0.4s", a dragged 0.123 stays "0.123s", scale 0.95 stays "0.95".

  // duration and delay are held in seconds, matching what Framer Motion gets.
  if (group === 'duration' || group === 'delay') return `${+value.toFixed(3)}s`

  // ease is a four-number bezier array; round each coordinate the same way.
  if (group === 'ease') return `[${value.map(n => +n.toFixed(3)).join(', ')}]`

  // scale and spring are unitless numbers.
  return `${+value.toFixed(3)}`
}
