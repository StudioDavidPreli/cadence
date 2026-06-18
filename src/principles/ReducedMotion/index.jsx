import { useState } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { Toggle } from '../../components/Toggle'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { MotionTokensProvider, reduceMotion } from '../../context/MotionTokensContext'
import styles from './ReducedMotion.module.css'

// P17 Reduced Motion. A "Reduce" toggle controls whether the demo's two
// motion components (a Card that lifts, a ProgressBar that fills) animate
// normally or snap instantly. The system meets the user — when reduce is
// on, durations collapse to ~10 ms and every component reading from the
// scoped provider stops moving and starts arriving.
//
// ── Why the demo opts out of OS prefers-reduced-motion ───────────────────
// The provider passes respectReducedMotion={false}, so the demo's local
// toggle is the single source of truth within its scope. This lets users
// see both the "before" and "after" states regardless of their OS setting.
// The rest of the app honors the OS preference automatically — that is
// what the principle's wiring does globally. The demo is the tiny
// exception that proves the rule.
//
// ── Why useMotionTokens is called with respectReducedMotion: false ───────
// The demo needs an unreduced baseline to compute "reduced" from. If the
// hook returned already-flattened tokens (as it does for the rest of the
// app when the OS pref is reduce), the demo's "Full" state would also be
// flat. Reading raw tokens keeps both states meaningful.
//
// Architecture decision: docs/decisions/reduced-motion-2026-05-06.md
export function ReducedMotion() {
  const rawTokens = useMotionTokens({ respectReducedMotion: false })
  const [reduced, setReduced] = useState(false)
  const [running, setRunning] = useState(false)

  // Demo-scoped scale.lift override: 1.02 (system default) is too subtle in
  // a small principle frame where the user is meant to perceive the lift's
  // arrival as the system's response. 1.08 exaggerates the lift so the
  // contrast against the reduced state is unambiguous. Same pattern used by
  // P13 Systematization.
  const baseTokens = reduced ? reduceMotion(rawTokens) : rawTokens
  const tokens = {
    ...baseTokens,
    scale: { ...baseTokens.scale, lift: 1.08 },
  }

  return (
    <MotionTokensProvider tokens={tokens} respectReducedMotion={false}>
      <div className={styles.reducedDemo}>
        <Card
          className={styles.reducedCard}
          title="CARD"
          description=""
          isSelected={running}
        />
        <ProgressBar value={running ? 100 : 0} showLabel={false} />
        <Button onClick={() => setRunning(r => !r)}>
          {running ? 'Reset' : 'Run'}
        </Button>
        <div className={styles.reducedToggleRow}>
          <Toggle
            label="Reduce"
            mode="expressive"
            on={reduced}
            onChange={setReduced}
          />
        </div>
      </div>
    </MotionTokensProvider>
  )
}
