// Motion-token parsers, extracted from useMotionTokens so they can be unit
// tested directly (no jsdom, no React). Each token comes out of getPropertyValue
// as a string and needs a different conversion before Framer Motion can use it.
//
// The parsers MUST survive the production CSS minifier, which rewrites values
// without changing their meaning: "400ms" becomes ".4s", "0.4" becomes ".4", and
// the spaces after commas in cubic-bezier(...) may be dropped. A parser that
// assumed the authored spelling ("always ms", "always comma-space separated")
// yields NaN in the minified build — and a NaN duration reaching Framer Motion
// throws "Element.animate: Duration (nan)". See the incident record:
// docs/decisions/motion-token-nan-crash-2026-07-15.md.

// CSS time → seconds (Framer Motion uses seconds). Handles both the authored
// "400ms" and the minified ".4s" / "0s": parseFloat reads the leading number,
// and the unit suffix decides the scale (ms → divide by 1000; s stays as-is).
export function parseMs(raw) {
  const n = parseFloat(raw)
  if (Number.isNaN(n)) return NaN
  return /ms\s*$/i.test(raw) ? n / 1000 : n
}

// "cubic-bezier(0.4, 0, 0.2, 1)" → [0.4, 0, 0.2, 1]
// Framer Motion accepts easing as a four-number array [x1, y1, x2, y2]. Split on
// the comma alone (not ", ") and parseFloat each part, so it survives the
// minifier dropping the spaces after commas.
export function parseCubicBezier(raw) {
  return raw
    .replace('cubic-bezier(', '')
    .replace(')', '')
    .split(',')
    .map((part) => parseFloat(part))
}

// "0.95" → 0.95  (already unitless, just needs parseFloat).
export function parseUnitless(raw) {
  return parseFloat(raw)
}

// Parse `raw` with `parse`, falling back when the value is missing/empty OR the
// result is NaN (scalar) or an array containing NaN (easing). This is the last
// line of defense: a NaN token must never reach Framer Motion. In development we
// log the offending value and token name so a typo or an unexpected minified
// form is visible; production defaults silently to avoid console noise for end
// users. `name` is used only for that message.
export function parseTokenValue(raw, parse, fallback, name) {
  const trimmed = raw == null ? '' : String(raw).trim()
  if (!trimmed) return fallback
  const value = parse(trimmed)
  const bad = Array.isArray(value) ? value.some(Number.isNaN) : Number.isNaN(value)
  if (bad) {
    if (import.meta.env.DEV) {
      console.error(
        `[motion-tokens] could not parse ${name ? `${name} = ` : ''}${JSON.stringify(raw)}; using fallback`,
        fallback,
      )
    }
    return fallback
  }
  return value
}
