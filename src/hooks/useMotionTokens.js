import { useState, useEffect, useContext } from 'react'
import { useReducedMotion } from 'framer-motion'
import { MotionTokensContext, reduceMotion } from '../context/MotionTokensContext'

// --- Parsers ---
// Each token type comes out of getPropertyValue as a string and needs
// a different conversion before Framer Motion can use it. The parsers must
// survive the production CSS minifier, which rewrites values without changing
// their meaning: "400ms" becomes ".4s", "0.4" becomes ".4", and the spaces
// after commas may be dropped. A parser that assumed the authored form (e.g.
// "always ms", "always comma-space separated") yields NaN in the minified
// build — and a NaN duration reaching Framer Motion throws
// "Element.animate: Duration (nan)", which with no error boundary blanks the app.

// CSS time → seconds (Framer Motion uses seconds). Handles both the authored
// "400ms" and the minified ".4s" / "0s": parseFloat reads the leading number,
// and the unit suffix decides the scale (ms → divide by 1000; s stays as-is).
function parseMs(raw) {
  const n = parseFloat(raw)
  if (Number.isNaN(n)) return NaN
  return /ms\s*$/i.test(raw) ? n / 1000 : n
}

// "cubic-bezier(0.4, 0, 0.2, 1)" → [0.4, 0, 0.2, 1]
// Framer Motion accepts easing as a four-number array [x1, y1, x2, y2]. Split
// on the comma alone (not ", ") and parseFloat each part, so it survives the
// minifier dropping the spaces after commas.
function parseCubicBezier(raw) {
  return raw
    .replace('cubic-bezier(', '')
    .replace(')', '')
    .split(',')
    .map((part) => parseFloat(part))
}

// "0.95" → 0.95  (already unitless, just needs parseFloat)
function parseUnitless(raw) {
  return parseFloat(raw)
}

// --- Fallback values ---
// Used on the first render, before useEffect has run and read the real tokens.
// These match the values defined in src/tokens/motion.css, so even if token
// reading fails entirely, the animations behave correctly.
const FALLBACKS = {
  duration: { fast: 0.1,  base: 0.2,  slow: 0.4,  slower: 0.6 },
  ease: {
    linear:   [0, 0, 1, 1],
    standard: [0.4, 0, 0.2, 1],
    enter:    [0, 0, 0.2, 1],
    exit:     [0.4, 0, 1, 1],
    overshoot:   [0.34, 1.56, 0.64, 1],
  },
  delay:   { none: 0, short: 0.05, medium: 0.1, long: 0.2 },
  scale:   { subtle: 0.98, base: 0.95, expressive: 0.9, lift: 1.02 },
}

// --- Hook ---
// Returns all motion tokens as parsed values ready for Framer Motion.
// Structure mirrors src/tokens/motion.css so the mapping is direct:
//   --motion-duration-fast → tokens.duration.fast
//   --motion-ease-standard → tokens.ease.standard
//   --motion-scale-base    → tokens.scale.base
//
// Why a hook and not a utility function:
// Token reading requires useEffect — it must run after the component mounts,
// because CSS custom properties only exist in the live DOM. A utility function
// called during render has no access to React's lifecycle and would either
// fail (DOM not ready on SSR or first paint) or re-run on every render with
// no way to store the result. A hook can schedule the read at the right moment
// and return stable values across renders via useState.
//
// ── respectReducedMotion ──────────────────────────────────────────────────────
// When the user has OS-level prefers-reduced-motion enabled and there is no
// MotionTokensProvider in scope, the hook flattens the CSS-read tokens via
// reduceMotion() so every component reading useMotionTokens() automatically
// honors the preference. Pass { respectReducedMotion: false } to read raw
// tokens without flattening — used by the P17 demo so it can construct both
// the "before" and "after" states regardless of OS setting.
//
// When a provider IS in scope, the hook trusts the provider — the provider
// has already decided whether to apply reduceMotion via its own
// respectReducedMotion prop. This keeps the responsibility in one place and
// avoids double-flattening.
export function useMotionTokens({ respectReducedMotion = true } = {}) {
  const override = useContext(MotionTokensContext)
  const prefersReduced = useReducedMotion()

  const [tokens, setTokens] = useState(FALLBACKS)

  useEffect(() => {
    // If a context override is providing values, skip the CSS read entirely.
    if (override) return
    // getComputedStyle(document.documentElement) reads resolved values from :root.
    // "Resolved" means the browser has already applied the cascade — so if
    // data-theme="dark" is set, we get the dark theme's values, not the defaults.
    const s = getComputedStyle(document.documentElement)

    // Read a property, parse it, and fall back when it is missing OR the parse
    // yields NaN (scalar) or an array containing NaN (easing). This is the last
    // line of defense: a NaN token must never reach Framer Motion, because a NaN
    // duration throws in Element.animate and the app has no error boundary.
    const read = (name, parse, fallback) => {
      const raw = s.getPropertyValue(name).trim()
      if (!raw) return fallback
      const value = parse(raw)
      const bad = Array.isArray(value) ? value.some(Number.isNaN) : Number.isNaN(value)
      return bad ? fallback : value
    }

    setTokens({
      duration: {
        fast:   read('--motion-duration-fast',   parseMs, FALLBACKS.duration.fast),
        base:   read('--motion-duration-base',   parseMs, FALLBACKS.duration.base),
        slow:   read('--motion-duration-slow',   parseMs, FALLBACKS.duration.slow),
        slower: read('--motion-duration-slower', parseMs, FALLBACKS.duration.slower),
      },
      ease: {
        linear:    read('--motion-ease-linear',    parseCubicBezier, FALLBACKS.ease.linear),
        standard:  read('--motion-ease-standard',  parseCubicBezier, FALLBACKS.ease.standard),
        enter:     read('--motion-ease-enter',     parseCubicBezier, FALLBACKS.ease.enter),
        exit:      read('--motion-ease-exit',      parseCubicBezier, FALLBACKS.ease.exit),
        overshoot: read('--motion-ease-overshoot', parseCubicBezier, FALLBACKS.ease.overshoot),
      },
      delay: {
        none:   read('--motion-delay-none',   parseMs, FALLBACKS.delay.none),
        short:  read('--motion-delay-short',  parseMs, FALLBACKS.delay.short),
        medium: read('--motion-delay-medium', parseMs, FALLBACKS.delay.medium),
        long:   read('--motion-delay-long',   parseMs, FALLBACKS.delay.long),
      },
      scale: {
        subtle:     read('--motion-scale-subtle',     parseUnitless, FALLBACKS.scale.subtle),
        base:       read('--motion-scale-base',       parseUnitless, FALLBACKS.scale.base),
        expressive: read('--motion-scale-expressive', parseUnitless, FALLBACKS.scale.expressive),
        lift:       read('--motion-scale-lift',       parseUnitless, FALLBACKS.scale.lift),
      },
    })
  }, [override])
  // override in the dependency array: if TokenLab mounts and provides a context,
  // this effect re-runs but immediately returns (the guard above). If override
  // disappears (TokenLab unmounts), the effect re-runs and re-reads from CSS.

  // Provider in scope: trust it. The provider already applied (or skipped)
  // reduceMotion based on its own respectReducedMotion prop.
  if (override) return override

  // No provider: apply reduceMotion ourselves when the caller hasn't opted
  // out and the OS pref is reduce.
  return (respectReducedMotion && prefersReduced) ? reduceMotion(tokens) : tokens
}
