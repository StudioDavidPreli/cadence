import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './HierarchyOfMotion.module.css'

// P14 Hierarchy of Motion. Click PARENT, the row translates right; three
// CHILD rows below follow with staggered delays so the cascade reads as
// authority flowing downward. Children are not interactive — only the
// parent has authority to initiate motion in the system. Clicking a child
// would invert the hierarchy and dilute the principle.
//
// ── Why three different delay tokens, not a stagger function ────────────
// delay.short / medium / long are real tokens in the system. Using them
// directly (rather than `delay: i * 50`) makes the demo a literal
// demonstration of how the delay token family is named: short means "the
// first follower," long means "the last." A stagger function would hide
// the token vocabulary that is the principle's argument.
//
// ── Why symmetric cascade on open and close ─────────────────────────────
// Both directions preserve "parent leads, children follow." The principle
// is the directional flow of authority, not enter/exit asymmetry.
const HIERARCHY_TRAVEL = 24
const CHILD_DELAY_KEYS = ['short', 'medium', 'long']

export function HierarchyOfMotion() {
  const tokens = useMotionTokens()
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.hierarchyDemo}>
      <motion.button
        className={styles.hierarchyParent}
        onClick={() => setOpen(o => !o)}
        animate={{ x: open ? HIERARCHY_TRAVEL : 0 }}
        transition={{
          duration: tokens.duration.base,
          ease: tokens.ease.standard,
        }}
      >
        PARENT
      </motion.button>
      {[1, 2, 3].map((n, i) => (
        <motion.div
          key={n}
          className={styles.hierarchyChild}
          animate={{ x: open ? HIERARCHY_TRAVEL : 0 }}
          transition={{
            duration: tokens.duration.base,
            ease: tokens.ease.standard,
            delay: tokens.delay[CHILD_DELAY_KEYS[i]],
          }}
        >
          └ CHILD 0{n}
        </motion.div>
      ))}
    </div>
  )
}
