import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './SpringDemo.module.css'

// ─── SpringDemo ───────────────────────────────────────────────────────────────
//
// The consumer that makes the physics-spring family real. Every other token in
// the tool is a duration plus a bezier: a fixed timeline with a fixed shape.
// A spring is neither. It has no duration. Stiffness, damping, and mass decide
// how the dot crosses, and its settle time emerges from those three.
//
// So this demo has no duration and no ease. It reads tokens.spring at runtime
// and hands Framer Motion { type: 'spring', stiffness, damping, mass }. Switch
// presets and the dot retimes with no timing value changing hands: Snappy
// bounces hard, Cinematic glides in heavy with almost no bounce, Standard
// settles with a hint of overshoot. That is the whole point ease.overshoot
// cannot make, because a bezier only imitates the look on a clock.
//
// Reduced motion: this lives in Token Lab's demo column, which is wrapped in
// MotionTokensProvider respectReducedMotion={false} on purpose (the user is
// there to perceive motion), so it does not flatten, the same posture as every
// sibling demo. It deliberately does NOT read useReducedMotion() itself, which
// would flatten it even inside that exempt column and split it from its
// siblings. See docs/decisions/physics-spring-2026-07-20.md for the one place
// this matters (a future spring consumer OUTSIDE Token Lab).

// The dot's travel, in px. Held constant so switching presets changes only the
// spring, never the distance. The lane in the CSS is sized to hold this plus
// the dot's own width.
const TRAVEL = 220

export function SpringDemo() {
  const [atEnd, setAtEnd] = useState(false)
  const tokens = useMotionTokens()

  return (
    <button
      type="button"
      className={styles.lane}
      aria-label="Send the dot across on a spring"
      aria-pressed={atEnd}
      onClick={() => setAtEnd(e => !e)}
    >
      {/* The rail the dot rides. Decorative, not the moving part. */}
      <span className={styles.rail} aria-hidden="true" />
      <motion.span
        className={styles.dot}
        animate={{ x: atEnd ? TRAVEL : 0 }}
        transition={{
          type: 'spring',
          stiffness: tokens.spring.stiffness,
          damping: tokens.spring.damping,
          mass: tokens.spring.mass,
        }}
      />
    </button>
  )
}
