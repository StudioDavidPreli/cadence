import { useState, useMemo } from 'react'
import { Toggle } from '../../components/Toggle'
import { Card } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import styles from './Systematization.module.css'

// P13 Systematization. One Tempo slider drives a scoped MotionTokensProvider
// whose duration tokens are scaled by the slider. Three different components
// — Toggle (duration.fast), Card (duration.base), ProgressBar (duration.slow)
// — share a single `running` boolean. Click any of the three triggers, the
// other two follow at their own native token speeds. Drag the slider, every
// component retimes proportionally. The system has one voice.
//
// ── Why scale durations rather than override one token ───────────────────────
// The principle is temporal coherence across a token set, not "components
// using duration.base." Scaling the whole duration family keeps each
// component's natural relationship to the others (fast < base < slow) while
// shifting the shared tempo. Easing and scale tokens stay untouched — this
// principle is about timing, not curve shape.
export function Systematization() {
  const baseTokens = useMotionTokens()
  const [tempo, setTempo] = useState(1)
  const [running, setRunning] = useState(false)

  // Demo-scoped scale.lift override: the system's default lift is 1.02 (a
  // 2 % grow), correct for production but too subtle in a small principle
  // card where the user is being asked to perceive "the system responding".
  // Bumping to 1.08 makes the Card's selected-state animation legible
  // against the surrounding frame without leaving the bounds of the
  // dashed border at this column width.
  const tokens = useMemo(() => ({
    ...baseTokens,
    duration: {
      fast:   baseTokens.duration.fast   * tempo,
      base:   baseTokens.duration.base   * tempo,
      slow:   baseTokens.duration.slow   * tempo,
      slower: baseTokens.duration.slower * tempo,
    },
    scale: {
      ...baseTokens.scale,
      lift: 1.08,
    },
  }), [baseTokens, tempo])

  return (
    // respectReducedMotion={false}: the Tempo slider needs to drive visible
    // change across the three demo components. Flattening would freeze the
    // demo and obscure the principle.
    <MotionTokensProvider tokens={tokens} respectReducedMotion={false}>
      <div className={styles.systemDemo}>
        <label className={styles.systemSliderRow}>
          <span className={styles.systemSliderLabel}>Tempo</span>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.05"
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
            className={styles.systemSlider}
            aria-label="Demo tempo multiplier"
          />
        </label>
        <Toggle
          mode="expressive"
          label={running ? 'On' : 'Off'}
          on={running}
          onChange={setRunning}
        />
        <Card
          className={styles.systemCard}
          title="CARD 01"
          description=""
          isSelected={running}
          onSelect={setRunning}
        />
        <ProgressBar value={running ? 100 : 0} showLabel={false} />
      </div>
    </MotionTokensProvider>
  )
}
