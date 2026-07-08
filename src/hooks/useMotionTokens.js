import { useState, useEffect, useContext } from 'react'
import { useReducedMotion } from 'framer-motion'
import { MotionTokensContext, reduceMotion } from '../context/MotionTokensContext'

// --- Parsers ---
// Each token type comes out of getPropertyValue as a string and needs
// a different conversion before Framer Motion can use it.

// "100ms" → 0.1  (Framer Motion uses seconds, CSS uses milliseconds)
function parseMs(raw) {
  return parseFloat(raw.slice(0, -2)) / 1000
}

// "cubic-bezier(0.4, 0, 0.2, 1)" → [0.4, 0, 0.2, 1]
// Framer Motion accepts easing as a four-number array [x1, y1, x2, y2].
function parseCubicBezier(raw) {
  return raw
    .replace('cubic-bezier(', '')
    .replace(')', '')
    .split(', ')
    .map(Number)
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

    // Helper: read a property, trim whitespace, return null if missing.
    const get = (name) => s.getPropertyValue(name).trim() || null

    setTokens({
      duration: {
        fast:   get('--motion-duration-fast')   ? parseMs(get('--motion-duration-fast'))   : FALLBACKS.duration.fast,
        base:   get('--motion-duration-base')   ? parseMs(get('--motion-duration-base'))   : FALLBACKS.duration.base,
        slow:   get('--motion-duration-slow')   ? parseMs(get('--motion-duration-slow'))   : FALLBACKS.duration.slow,
        slower: get('--motion-duration-slower') ? parseMs(get('--motion-duration-slower')) : FALLBACKS.duration.slower,
      },
      ease: {
        linear:   get('--motion-ease-linear')   ? parseCubicBezier(get('--motion-ease-linear'))   : FALLBACKS.ease.linear,
        standard: get('--motion-ease-standard') ? parseCubicBezier(get('--motion-ease-standard')) : FALLBACKS.ease.standard,
        enter:    get('--motion-ease-enter')    ? parseCubicBezier(get('--motion-ease-enter'))    : FALLBACKS.ease.enter,
        exit:     get('--motion-ease-exit')     ? parseCubicBezier(get('--motion-ease-exit'))     : FALLBACKS.ease.exit,
        overshoot:   get('--motion-ease-overshoot')   ? parseCubicBezier(get('--motion-ease-overshoot'))   : FALLBACKS.ease.overshoot,
      },
      delay: {
        none:   get('--motion-delay-none')   ? parseMs(get('--motion-delay-none'))   : FALLBACKS.delay.none,
        short:  get('--motion-delay-short')  ? parseMs(get('--motion-delay-short'))  : FALLBACKS.delay.short,
        medium: get('--motion-delay-medium') ? parseMs(get('--motion-delay-medium')) : FALLBACKS.delay.medium,
        long:   get('--motion-delay-long')   ? parseMs(get('--motion-delay-long'))   : FALLBACKS.delay.long,
      },
      scale: {
        subtle:     get('--motion-scale-subtle')     ? parseUnitless(get('--motion-scale-subtle'))     : FALLBACKS.scale.subtle,
        base:       get('--motion-scale-base')       ? parseUnitless(get('--motion-scale-base'))       : FALLBACKS.scale.base,
        expressive: get('--motion-scale-expressive') ? parseUnitless(get('--motion-scale-expressive')) : FALLBACKS.scale.expressive,
        lift:       get('--motion-scale-lift')       ? parseUnitless(get('--motion-scale-lift'))       : FALLBACKS.scale.lift,
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
