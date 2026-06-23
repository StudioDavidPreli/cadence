import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../../components/Button'
import { Toggle } from '../../components/Toggle'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './TokenFidelity.module.css'

// P16 Token Fidelity. Three identical pills stacked vertically. Click Run,
// all three translate the same distance. The top and bottom pills use
// system tokens (duration.base + ease.standard); the middle pill defaults
// to a hardcoded 600 ms linear — a value not in the token set. The middle
// pill arrives much later than its siblings and slides at constant velocity,
// reading as mechanical and out of rhythm. Toggle "harmonize" to swap the
// middle pill's transition to the system pair; on the next Run it rejoins
// the others. The motion is showing you a system problem.
//
// ── Why a hardcoded number instead of a different token ─────────────────
// The principle is fidelity to the token system, not "use a faster token."
// The wrong value has to be a literal number to demonstrate the principle's
// argument: hardcoded values drift, token values hold. A different token
// (say duration.slower) would still be a system value and would not embody
// the deviation.
//
// ── Why linear easing for the wrong pill ────────────────────────────────
// Linear easing is the most legible deviation from system shape. Even when
// a fast preset is active and the duration delta narrows, the constant-
// velocity slide of linear remains visibly different from the eased
// neighbors. This keeps the demo's argument intact across presets.
const FIDELITY_TRAVEL = 40
const FIDELITY_OFF_DURATION = 0.6

export function TokenFidelity() {
  const tokens = useMotionTokens()
  const [running, setRunning] = useState(false)
  const [fixed, setFixed] = useState(false)

  const systemTransition = {
    duration: tokens.duration.base,
    ease: tokens.ease.standard,
  }
  // Deliberately OFF the token system. This principle demonstrates token
  // fidelity by contrast: offTransition is a raw, un-tokenised value (linear
  // curve, ad-hoc duration) so the "fixed" state can switch back to
  // systemTransition above and show the correction. The literal is the point;
  // do not replace it with a token. See docs/principles for Token Fidelity.
  const offTransition = {
    duration: FIDELITY_OFF_DURATION,
    ease: [0, 0, 1, 1],  // linear
  }
  const middleTransition = fixed ? systemTransition : offTransition

  return (
    <div className={styles.fidelityDemo}>
      <div className={styles.fidelityStack}>
        <motion.div
          className={styles.fidelityPill}
          animate={{ x: running ? FIDELITY_TRAVEL : 0 }}
          transition={systemTransition}
        />
        <motion.div
          className={styles.fidelityPill}
          animate={{ x: running ? FIDELITY_TRAVEL : 0 }}
          transition={middleTransition}
        />
        <motion.div
          className={styles.fidelityPill}
          animate={{ x: running ? FIDELITY_TRAVEL : 0 }}
          transition={systemTransition}
        />
      </div>
      <div className={styles.fidelityControls}>
        <Button onClick={() => setRunning(r => !r)}>
          {running ? 'Reset' : 'Run'}
        </Button>
        <div className={styles.fidelityToggleScale}>
          <Toggle
            mode="expressive"
            label="harmonize"
            on={fixed}
            onChange={setFixed}
          />
        </div>
      </div>
    </div>
  )
}
