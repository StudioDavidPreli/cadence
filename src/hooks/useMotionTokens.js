import { useState, useEffect, useContext } from 'react'
import { useReducedMotion } from 'framer-motion'
import { MotionTokensContext, reduceMotion } from '../context/MotionTokensContext'
import { parseMs, parseCubicBezier, parseUnitless, parseTokenValue } from '../tokens/parse'

// The parsers live in ../tokens/parse.js so they can be unit tested directly.
// They must survive the production CSS minifier (e.g. "400ms" → ".4s"); a parser
// that assumed the authored spelling yields NaN, and a NaN duration reaching
// Framer Motion throws "Element.animate: Duration (nan)". parseTokenValue is the
// NaN-fallback guard. See docs/decisions/motion-token-nan-crash-2026-07-15.md.

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
  scale:   { pressSubtle: 0.98, pressBase: 0.95, pressExpressive: 0.9, lift: 1.02 },
  spring:  { stiffness: 170, damping: 20, mass: 1.5 },
}

// --- Hook ---
// Returns all motion tokens as parsed values ready for Framer Motion.
// Structure mirrors src/tokens/motion.css so the mapping is direct:
//   --motion-duration-fast → tokens.duration.fast
//   --motion-ease-standard → tokens.ease.standard
//   --motion-scale-press-base → tokens.scale.pressBase
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
// ── readKey: asking for a fresh read ──────────────────────────────────────────
//
// The CSS read below happens once and never repeats, which is correct for almost
// every caller: a component inside TokenLab's demo column gets live values from
// the context instead, and a component outside it wants the values as they were
// when it mounted.
//
// The background is the exception, and it is the exception for a reason worth
// naming rather than special-casing. It reveals ONCE on mount, so its token read
// happens seconds before the user can reach a slider, and by the time a preset
// changes the read is long stale. It cannot subscribe to the context either:
// that would make it re-time on every drag frame, which is exactly what the
// mount-only reveal rule exists to prevent.
//
// So it asks for a re-read explicitly, by passing a value that changes only when
// something discrete has happened. `readKey` goes in the effect's dependency
// list and does nothing else. Absent, it is `undefined` forever and this hook
// behaves exactly as it did.
export function useMotionTokens({ respectReducedMotion = true, readKey } = {}) {
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

    // Read a property and parse it through parseTokenValue, which falls back
    // (and, in dev, logs) when the value is missing or parses to NaN — a NaN
    // token must never reach Framer Motion. See ../tokens/parse.js.
    const read = (name, parse, fallback) =>
      parseTokenValue(s.getPropertyValue(name), parse, fallback, name)

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
        pressSubtle:     read('--motion-scale-press-subtle',     parseUnitless, FALLBACKS.scale.pressSubtle),
        pressBase:       read('--motion-scale-press-base',       parseUnitless, FALLBACKS.scale.pressBase),
        pressExpressive: read('--motion-scale-press-expressive', parseUnitless, FALLBACKS.scale.pressExpressive),
        lift:            read('--motion-scale-lift',             parseUnitless, FALLBACKS.scale.lift),
      },
      // Spring params are unitless, read like scale. Fed to Framer Motion as
      // { type: 'spring', stiffness, damping, mass }.
      spring: {
        stiffness: read('--motion-spring-stiffness', parseUnitless, FALLBACKS.spring.stiffness),
        damping:   read('--motion-spring-damping',   parseUnitless, FALLBACKS.spring.damping),
        mass:      read('--motion-spring-mass',      parseUnitless, FALLBACKS.spring.mass),
      },
    })
  }, [override, readKey])
  // override in the dependency array: if TokenLab mounts and provides a context,
  // this effect re-runs but immediately returns (the guard above). If override
  // disappears (TokenLab unmounts), the effect re-runs and re-reads from CSS.
  // readKey alongside it: a caller that wants a fresh read changes it, and the
  // same effect runs again against whatever is now on :root. See the note above.

  // Provider in scope: trust it. The provider already applied (or skipped)
  // reduceMotion based on its own respectReducedMotion prop.
  if (override) return override

  // No provider: apply reduceMotion ourselves when the caller hasn't opted
  // out and the OS pref is reduce.
  return (respectReducedMotion && prefersReduced) ? reduceMotion(tokens) : tokens
}
