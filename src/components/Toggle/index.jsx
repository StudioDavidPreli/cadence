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
// Two sizes. Travel = width - thumb - (2 × padding), minus 2px for optical
// centering (the thumb looks centered a couple px short of the geometric end).
// These numbers MUST match the CSS: .track/.thumb for md, .trackSm/.thumbSm for
// sm (both in Toggle.module.css).
//   md — 44×26 track, 3px pad, 18px thumb → 44-18-6-2 = 18  (the shipped size;
//        every demonstrated Toggle uses it, so demos are unchanged by `sm`)
//   sm — 36×22 track, 3px pad, 16px thumb → 36-16-6-2 = 12  (chrome-only: the
//        Explore toggle in Token Lab's header, added so that one control could
//        shrink without resizing any demo Toggle)
const THUMB_TRAVEL = { md: 18, sm: 12 }

// `on` is optional. When undefined, Toggle owns its own state via useState
// (the original behavior used everywhere except the P13 Systematization demo).
// When passed, parent owns state; click still fires onChange so the parent
// can update. Mirrors the controlled/uncontrolled split in Card.
export function Toggle({ label, mode = 'subtle', onChange, on: onProp, motionMode = 'bezier', size = 'md' }) {
  const [internalOn, setInternalOn] = useState(false)
  const isControlled = onProp !== undefined
  const on = isControlled ? onProp : internalOn
  const tokens = useMotionTokens()

  const isExpressive = mode === 'expressive'
  const isSmall = size === 'sm'
  const travel = THUMB_TRAVEL[size]

  // The thumb slide. 'spring' rides the real physics spring instead of the
  // overshoot bezier; only Token Lab's per-demo switch passes it, so shipped
  // Toggles are unchanged. Both branches read tokens, no literals.
  const thumbTransition = motionMode === 'spring'
    ? {
        type: 'spring',
        stiffness: tokens.spring.stiffness,
        damping: tokens.spring.damping,
        mass: tokens.spring.mass,
      }
    : { duration: tokens.duration.fast, ease: tokens.ease.overshoot }

  function handleClick() {
    const next = !on
    if (!isControlled) setInternalOn(next)
    onChange?.(next)
  }

  return (
    <div className={styles.wrapper}>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`${styles.track} ${isSmall ? styles.trackSm : ''} ${isExpressive ? styles.trackExpressive : ''} ${on && isExpressive ? styles.trackOn : ''}`}
        onClick={handleClick}
        // CSS transition duration mirrors the token so track color and thumb
        // slide stay in sync even when the token slider is adjusted.
        style={{ transitionDuration: `${tokens.duration.fast * 1000}ms` }}
      >
        <motion.span
          className={`${styles.thumb} ${isSmall ? styles.thumbSm : ''}`}
          animate={{ x: on ? travel : 0 }}
          transition={thumbTransition}
        />
      </button>

      {label && (
        <span className={styles.label}>{label}</span>
      )}
    </div>
  )
}
