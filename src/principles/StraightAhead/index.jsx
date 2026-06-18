import { useState } from 'react'
import { Stepper } from '../../components/Stepper'
import { ProgressBar } from '../../components/ProgressBar'
import { Button } from '../../components/Button'
import styles from './StraightAhead.module.css'

// P04 Straight Ahead & Pose to Pose. Single trigger drives both demos:
// the compact Stepper marks the four poses; the ProgressBar fills 0/25/50/
// 75/100 in lockstep. Same advance, two visualizations — pose-to-pose
// above, straight-ahead below. State lives here (controlled Stepper)
// because the principle is the synchrony.
const STRAIGHT_AHEAD_TOTAL = 4

export function StraightAhead() {
  const [step, setStep] = useState(0)
  const completed = step >= STRAIGHT_AHEAD_TOTAL
  const progress = (Math.min(step, STRAIGHT_AHEAD_TOTAL) / STRAIGHT_AHEAD_TOTAL) * 100

  function onClick() {
    setStep(s => (s >= STRAIGHT_AHEAD_TOTAL ? 0 : s + 1))
  }

  return (
    <div className={styles.straightAheadDemo}>
      <Stepper compact currentStep={step} />
      <ProgressBar value={progress} showLabel={false} />
      <div className={styles.straightAheadButtonRow}>
        <Button onClick={onClick}>{completed ? 'Reset' : 'Next'}</Button>
      </div>
    </div>
  )
}
