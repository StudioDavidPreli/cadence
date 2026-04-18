import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './ProgressBar.module.css'

// ─── ProgressBar ──────────────────────────────────────────────────────────────
//
// Accepts a value prop (0–100) from the parent. The component is purely
// presentational — it owns no internal state. The parent (TokenLab's
// ProgressBarDemo) owns the value and controls it via a local slider.
//
// This is the correct responsibility split: the ProgressBar demonstrates
// how fill animation responds to token changes, while the demo slider in
// TokenLab controls the display value that drives it. The demo slider is
// NOT a token slider — it controls display data, not token data. That
// distinction is important: mixing the two would make the component appear
// to control its own tokens, undermining the point of the demonstration.
//
// Directional easing:
// Increases use ease.standard — forward progress feels purposeful, with
// a natural deceleration at the target that reads as "arriving."
// Decreases use ease.exit — retreating value has a quick start and long
// tail, like something releasing or being undone. The two curves are
// perceptually distinguishable even at the same duration, which makes the
// direction of change legible from peripheral vision.

export function ProgressBar({ value }) {
  const tokens = useMotionTokens()

  // Track previous value to determine direction during each render.
  // prevValueRef.current holds the last committed value; it's updated
  // after each render via useEffect so the comparison is correct during
  // the render where value changes.
  const prevValueRef = useRef(value)
  const isIncreasing = value >= prevValueRef.current

  useEffect(() => {
    prevValueRef.current = value
  }, [value])

  return (
    <div className={styles.progressBar}>
      <div className={styles.row}>
        <div className={styles.trackContainer}>
          {/* Track — the full background rail at reduced opacity */}
          <div className={styles.track} />

          {/* Fill — animates width based on value.
              Easing direction changes based on whether value increased or decreased. */}
          <motion.div
            className={styles.fill}
            animate={{ width: `${value}%` }}
            transition={{
              duration: tokens.duration.slow,
              ease: isIncreasing ? tokens.ease.standard : tokens.ease.exit,
            }}
          />
        </div>

        {/* Percentage label — updates instantly with value, no animation.
            font-mono for technical legibility; tabular-nums prevents layout
            shift as the digit count changes (e.g. 9% → 10%). */}
        <span className={styles.label}>{value}%</span>
      </div>
    </div>
  )
}
