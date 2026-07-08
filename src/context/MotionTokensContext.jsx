import { createContext } from 'react'
import { useReducedMotion } from 'framer-motion'

// This context enables TokenLab to push live token values into components
// that would otherwise read tokens once from CSS on mount.
//
// When a component calls useMotionTokens() and this context is present above
// it in the tree, the hook returns context values instead of reading CSS.
// When the context is absent (everywhere except TokenLab's demo area and
// principle-card demos), the hook reads from CSS as normal.
//
// This is the bridge between Channel 2 (React state) and Framer Motion.
export const MotionTokensContext = createContext(null)

// ─── reduceMotion ────────────────────────────────────────────────────────────
//
// Flattens motion tokens for users who prefer reduced motion. Durations and
// delays collapse to near-zero (effectively instant); easing curves and scale
// values stay unchanged because at this duration they are not perceived. Used
// by MotionTokensProvider when respectReducedMotion is true and the user has
// the OS-level prefers-reduced-motion preference set, and by useMotionTokens
// on the no-provider path.
//
// Why 0.01 s and not 0:
// duration: 0 has edge cases in Framer Motion — onAnimationComplete callbacks
// don't always fire, and some interruption logic short-circuits. 0.01 s is
// indistinguishable from instant to the eye but keeps the animation pipeline
// well-formed.
//
// Why ease and scale are not flattened:
// At 10 ms total duration, the curve shape and the start scale factor are
// imperceptible. Flattening them adds code without changing the user-visible
// behavior. Overshoot is a special case worth flagging — at 10 ms it
// resolves before the eye can register, so users who explicitly prefer no
// bounce still get effectively no bounce.
export function reduceMotion(tokens) {
  return {
    ...tokens,
    duration: { fast: 0.01, base: 0.01, slow: 0.01, slower: 0.01 },
    delay:    { none: 0, short: 0, medium: 0, long: 0 },
  }
}

// ─── MotionTokensProvider ────────────────────────────────────────────────────
//
// Wraps a subtree with a fixed set of motion tokens.
//
// respectReducedMotion (default true):
// When true and the user has OS-level prefers-reduced-motion enabled, the
// provider flattens its tokens via reduceMotion() before exposing them. This
// gives a free, app-wide reduced-motion implementation for any subtree that
// uses MotionTokensProvider.
//
// Pass false to opt out — the provider passes its tokens through unchanged.
// This is correct for motion-exploration scopes where the user's intent is
// to perceive motion (TokenLab's live demos, principle demos that teach by
// showing). The P17 Reduced Motion demo also opts out so its local toggle
// can be the single source of truth within its scope.
//
// Architecture decision: docs/decisions/reduced-motion-2026-05-06.md
export function MotionTokensProvider({ children, tokens, respectReducedMotion = true }) {
  const prefersReduced = useReducedMotion()
  const finalTokens = (respectReducedMotion && prefersReduced)
    ? reduceMotion(tokens)
    : tokens
  return (
    <MotionTokensContext.Provider value={finalTokens}>
      {children}
    </MotionTokensContext.Provider>
  )
}
