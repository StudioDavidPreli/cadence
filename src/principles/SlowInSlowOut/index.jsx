import { useState, useEffect } from 'react'
import { Button } from '../../components/Button'
import { ProgressBar } from '../../components/ProgressBar'
import { Toggle } from '../../components/Toggle'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { usePulseTitle } from '../../context/TitlePulseContext'
import styles from './SlowInSlowOut.module.css'

// P06 Slow In & Slow Out. ProgressBar is presentational and accepts `value`
// from its parent. The demo owns the value so the user can Fill and Reset, and
// owns a `linear` toggle that swaps the fill curve.
//
// The principle is the contrast: identical duration, different curve. With the
// toggle off, the fill rides the curve from the Tokens panel (ease.standard) and
// decelerates into its target, it arrives. With the toggle on, easeOverride
// passes tokens.ease.linear, so the same fill marches at constant speed and
// stops flat. Same timing, categorically different character. Linear motion
// belongs to machines.
//
// The toggle reads "Tokens" / "Linear" to match the controls panel of the same
// name: "Tokens" means the bar follows whatever curve that panel currently holds
// (a preset or the user's edits), "Linear" overrides it. On expand the demo
// pulses the panel's "Tokens" title once (usePulseTitle) to draw the thread
// between the toggle word and where the value lives. This is a P06-specific cue.
//
// showLabel={false} because the principle is about the curve, not the numeric
// percentage. The bar is the signal here. The toggle is `subtle` (thumb-only,
// neutral track) on purpose: the accent-green expressive track means "connected
// to the system", and linear is the deviation, not a connection to it. Using
// accent there would invert the principle's meaning.
export function SlowInSlowOut({ uiMode }) {
  const tokens = useMotionTokens()
  const pulseTitle = usePulseTitle()
  const [value, setValue] = useState(0)
  const [linear, setLinear] = useState(false)
  const filled = value > 0

  // Flash the "Tokens" title when the UI (component) view becomes visible. The
  // card shows the animation view first on expand and keeps both views mounted
  // across the Motion/UI toggle, so we key the flash on uiMode rather than on
  // mount: it fires the moment the user clicks "UI" and lands on this demo, and
  // again on every return to UI. uiMode starts false, so nothing fires while
  // the animation view is showing.
  useEffect(() => {
    if (uiMode) pulseTitle()
  }, [uiMode, pulseTitle])

  // Switching the toggle BACK to "Tokens" (linear -> false) re-fires the flash,
  // because that is the moment the bar rejoins the panel's curve. Switching to
  // "Linear" does not flash: the demo is deviating from the system there, so
  // there is nothing in the panel to point at.
  function handleToggle(next) {
    setLinear(next)
    if (!next) pulseTitle()
  }

  return (
    <div className={styles.progressDemo}>
      <ProgressBar
        value={value}
        showLabel={false}
        easeOverride={linear ? tokens.ease.linear : undefined}
      />
      <div className={styles.easeToggleRow}>
        <Toggle
          label={linear ? 'Linear' : 'Tokens'}
          mode="subtle"
          on={linear}
          onChange={handleToggle}
        />
      </div>
      <div className={styles.progressDemoButtonRow}>
        <Button onClick={() => setValue(filled ? 0 : 100)}>
          {filled ? 'Reset' : 'Fill'}
        </Button>
      </div>
    </div>
  )
}
