import { useReducedMotion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { MotionTokensProvider, reduceMotion } from '../../context/MotionTokensContext'
import { DemoMotionGateContext } from './motionGateContext'
import styles from './DemoMotionGate.module.css'

// The expanded card's reduced-motion gate, in two controlled pieces owned by
// PrincipleCard. The card holds one `showDemoMotion` boolean and it governs
// BOTH layers of the demo area (David's design, 2026-07-17): the Rive
// animation layer, which PrincipleCard pauses directly via the `paused` prop
// on PrincipleAnimation, and the token-driven UI demo layer, which
// DemoMotionGate flattens or restores here. DemoMotionControl is the visible
// "View motion" button, rendered below the crossfade wrapper so it is present
// in both views, not buried behind the Motion/UI switch.
//
// The state lives in the card and resets when the card collapses: consent is
// per-instance, never remembered.
//
// Decision record: docs/decisions/reduced-motion-2026-05-06.md (2026-07-17
// addendum).

// Token scope for the UI demo layer. With no OS preference it renders children
// untouched, no provider at all, so the normal path is unchanged. Under
// prefers-reduced-motion it provides flattened tokens while `on` is false and
// raw tokens while `on` is true. The mechanism is P17's canonical pattern:
// read raw with { respectReducedMotion: false }, flatten or not locally,
// provide with respectReducedMotion={false} so the provider does not
// re-flatten what this component already decided.
export function DemoMotionGate({ on, children }) {
  const prefersReduced = useReducedMotion()
  const rawTokens = useMotionTokens({ respectReducedMotion: false })

  if (!prefersReduced) return children

  const tokens = on ? rawTokens : reduceMotion(rawTokens)
  return (
    <DemoMotionGateContext.Provider value={on}>
      <MotionTokensProvider tokens={tokens} respectReducedMotion={false}>
        {children}
      </MotionTokensProvider>
    </DemoMotionGateContext.Provider>
  )
}

// The "View motion" button. Purely presentational: PrincipleCard decides when
// it renders (only under prefers-reduced-motion, only while expanded) and owns
// the state. Chrome, not demonstration: it never animates on motion tokens
// (it would be frozen exactly when it is needed).
export function DemoMotionControl({ on, onChange }) {
  return (
    <button
      type="button"
      className={styles.control}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      View motion
    </button>
  )
}
