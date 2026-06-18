import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../../components/Button'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Economy.module.css'

// P15 Economy. Three horizontal bars stacked vertically. Click "Pan", all
// three translate the same distance, but each layer uses a different
// duration token — slow / base / fast — so the front bar arrives first
// and the back bar arrives last. Three layers, three speeds: the smallest
// set of moves that produces depth. A fourth layer would not add
// information; a single layer would not produce depth at all.
//
// ── Why opacity for depth, not stacking order or shadow ──────────────────
// The bars sit on three rows in a flex column — there is no painter's
// stack to imply distance. Opacity (0.4 / 0.7 / 1.0) does the work
// directly: the dim bar reads as "back", the bright one as "front". This
// is itself the principle in practice — the smallest visual cue that
// communicates the depth relationship.
const ECONOMY_TRAVEL = 40
const ECONOMY_LAYERS = ['slow', 'base', 'fast'] // back → mid → front

export function Economy() {
  const tokens = useMotionTokens()
  const [running, setRunning] = useState(false)

  return (
    <div className={styles.economyDemo}>
      <div className={styles.economyStack}>
        {ECONOMY_LAYERS.map((dur, i) => (
          <motion.div
            key={dur}
            className={`${styles.economyBar} ${styles[`economyBar${i}`]}`}
            animate={{ x: running ? ECONOMY_TRAVEL : 0 }}
            transition={{
              duration: tokens.duration[dur],
              ease: tokens.ease.standard,
            }}
          />
        ))}
      </div>
      <div className={styles.economyButtonRow}>
        <Button onClick={() => setRunning(r => !r)}>
          {running ? 'Reset' : 'Pan'}
        </Button>
      </div>
    </div>
  )
}
