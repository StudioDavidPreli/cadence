import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../../components/Button'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './SharedVocabulary.module.css'

// P18 Shared Vocabulary. Two stacked tracks, each with a small dot that
// translates the same distance with the same curve. The first track's
// label is the preset's NAME ("Snappy"); the second track's label is the
// same curve's bezier numbers ("0.34, 1.56, 0.64, 1"). Identical motion,
// two descriptions. Click Cycle: the preset advances and the dots replay
// with the new curve. The name is the unit; the numbers are the same
// motion only no one can talk about it.
//
// ── Why hardcoded curves rather than tokens.ease ────────────────────────
// The argument is about NAMING — the canonical link between "Snappy" and
// (0.34, 1.56, 0.64, 1). Reading from tokens.ease would couple the demo
// to whatever preset is currently active in TokenLab; the labels would
// drift away from the canonical vocabulary the principle is teaching.
// Hardcoding keeps the name-to-numbers relationship fixed and the
// vocabulary intact regardless of active preset.
//
// ── Why both dots remount on cycle (key={runId}) ─────────────────────────
// Framer Motion's enter animation only fires on mount. Re-keying both
// dots on Cycle remounts them so the initial → animate transition
// replays at the new curve. Same pattern used by NotificationBadge for
// per-increment overshoot.
const VOCAB_PRESETS = [
  { name: 'Snappy',   curve: [0.34, 1.56, 0.64, 1] },
  { name: 'Standard', curve: [0.4, 0, 0.2, 1] },
  { name: 'Linear',   curve: [0, 0, 1, 1] },
]
const VOCAB_TRAVEL = 80

export function SharedVocabulary() {
  const tokens = useMotionTokens()
  const [presetIdx, setPresetIdx] = useState(0)
  const [runId, setRunId] = useState(0)

  const preset = VOCAB_PRESETS[presetIdx]

  // Ping-pong loop: animate forward to VOCAB_TRAVEL, then play in reverse
  // back to 0, repeating forever. The curve applies to interpolation in
  // both directions, so spring overshoot appears at both ends — the dot
  // briefly punches past the left edge on the return trip the same way it
  // punches past the right edge on the way out. The dashed frame is
  // decorative and a small overshoot past it reinforces the springiness.
  const transition = {
    duration: tokens.duration.slow,
    ease: preset.curve,
    repeat: Infinity,
    repeatType: 'reverse',
  }

  function cycle() {
    setPresetIdx(i => (i + 1) % VOCAB_PRESETS.length)
    // Bumping runId remounts both dots so the new curve takes effect
    // immediately rather than at the end of the current loop iteration.
    setRunId(r => r + 1)
  }

  return (
    <div className={styles.vocabDemo}>
      <div className={styles.vocabStack}>
        <div className={styles.vocabBlock}>
          <div className={styles.vocabTrack}>
            <motion.div
              className={styles.vocabDot}
              key={`n-${runId}`}
              initial={{ x: -VOCAB_TRAVEL / 2 }}
              animate={{ x: VOCAB_TRAVEL / 2 }}
              transition={transition}
            />
          </div>
          <span className={styles.vocabName}>{preset.name}</span>
        </div>
        <div className={styles.vocabBlock}>
          <div className={styles.vocabTrack}>
            <motion.div
              className={styles.vocabDot}
              key={`b-${runId}`}
              initial={{ x: -VOCAB_TRAVEL / 2 }}
              animate={{ x: VOCAB_TRAVEL / 2 }}
              transition={transition}
            />
          </div>
          <span className={styles.vocabNumbers}>{preset.curve.join(', ')}</span>
        </div>
      </div>
      <div className={styles.vocabCycleButton}>
        <Button onClick={cycle}>Cycle</Button>
      </div>
    </div>
  )
}
