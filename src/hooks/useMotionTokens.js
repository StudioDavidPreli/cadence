import { useState, useEffect, useContext } from 'react'
import { MotionTokensContext } from '../context/MotionTokensContext'

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
    spring:   [0.34, 1.56, 0.64, 1],
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
export function useMotionTokens() {
  // Check for a context override first.
  // TokenLab wraps its demo area in MotionTokensProvider with live reducer state.
  // When that context is present, return it directly — no CSS read needed.
  // Everywhere else in the app, the context is null and we fall through to CSS.
  const override = useContext(MotionTokensContext)

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
        spring:   get('--motion-ease-spring')   ? parseCubicBezier(get('--motion-ease-spring'))   : FALLBACKS.ease.spring,
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

  // Return context override if present, otherwise return CSS-read values.
  return override ?? tokens
}
