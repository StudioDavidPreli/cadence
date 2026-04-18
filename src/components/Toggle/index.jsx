import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Toggle.module.css'

// ─── Toggle ───────────────────────────────────────────────────────────────────
//
// Two display modes illustrate the Hierarchy of Motion principle:
//
// subtle     — only the thumb position changes. The track stays neutral.
//              Use this when the toggle is part of a dense control surface
//              and calling attention to every state change would create noise.
//              The user must already know the affordance exists to read it.
//
// expressive — thumb position AND track color both change (border → accent).
//              The color change is legible from peripheral vision — useful when
//              the toggle is isolated or its state has significant consequence.
//              Costs more visual weight; earns it by being immediately readable.
//
// Neither mode is better. The right choice depends on how much the toggle's
// current state needs to communicate itself without the user actively looking.
// This is Hierarchy of Motion in practice: motion carries information, and more
// motion should mean more importance — not more decoration.
//
// ── Why direct x animation instead of layoutId ────────────────────────────────
// The thumb previously used layoutId + a two-slot pattern (thumb unmounts from
// the left slot, mounts in the right slot, Framer Motion animates between the
// two DOM positions via FLIP). This was abandoned because layoutId creates
// global FLIP connections that interfere with concurrent layout animations
// during tab mount. Even with LayoutGroup scoping, the thumb's FLIP position
// was being calculated against stale global ProjectionNode snapshots, causing
// it to animate in from outside the component boundary.
//
// Direct x animation is simpler, more predictable, and produces identical
// visual output. The thumb is a single element that never enters or exits the
// DOM — it only moves. No FLIP, no ProjectionNode interference, no global scope.
//
// ── Track geometry ────────────────────────────────────────────────────────────
// Track: 44px wide, 26px tall, 3px padding on all sides.
// Thumb: 18px diameter.
// Available travel: 44 - 18 - (2 × 3) = 20px. Subtract 2px for visual
// centering (the thumb looks optically centered at 18px of travel).
const THUMB_TRAVEL = 18

export function Toggle({ label, mode = 'subtle', onChange }) {
  const [on, setOn] = useState(false)
  const tokens = useMotionTokens()

  const isExpressive = mode === 'expressive'

  function handleClick() {
    const next = !on
    setOn(next)
    onChange?.(next)
  }

  return (
    <div className={styles.wrapper}>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`${styles.track} ${isExpressive ? styles.trackExpressive : ''} ${on && isExpressive ? styles.trackOn : ''}`}
        onClick={handleClick}
        // CSS transition duration mirrors the token so track color and thumb
        // slide stay in sync even when the token slider is adjusted.
        style={{ transitionDuration: `${tokens.duration.fast * 1000}ms` }}
      >
        <motion.span
          className={styles.thumb}
          animate={{ x: on ? THUMB_TRAVEL : 0 }}
          transition={{
            duration: tokens.duration.fast,
            ease: tokens.ease.spring,
          }}
        />
      </button>

      {label && (
        <span className={styles.label}>{label}</span>
      )}
    </div>
  )
}
