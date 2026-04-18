import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Spinner.module.css'

// ─── Size variants ────────────────────────────────────────────────────────────
// Three fixed sizes. These map to pixel values rather than CSS custom properties
// because size is not a motion token — it's layout data, not timing data.
const SIZES = {
  small:  { diameter: 16, stroke: 2 },
  medium: { diameter: 28, stroke: 2.5 },
  large:  { diameter: 44, stroke: 3 },
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
//
// A continuous rotation loading indicator. Represents an ambient, ongoing
// process — the opposite of a press interaction. That distinction drives the
// token choices:
//
// duration.slower (600ms default) — the slowest token in the system.
//   A fast or medium spin reads as urgent or frantic. Slower feels mechanical
//   and calm, which is right for a loading state where user action is suspended.
//
// ease.linear — rotation must feel perfectly constant. Any easing (acceleration
//   or deceleration) makes the rotation feel like it's fighting itself as it
//   loops. Linear is the only easing that produces a smooth infinite spin.
//
// --color-accent (green) — consistent with the semantic we established: active,
//   connected, currently affecting the system. A loading spinner is exactly
//   that — the system is live and working.

export function Spinner({ size = 'medium' }) {
  const tokens = useMotionTokens()
  const { diameter, stroke } = SIZES[size] ?? SIZES.medium

  const radius    = (diameter - stroke) / 2
  const cx        = diameter / 2
  const cy        = diameter / 2
  // Circumference of the full circle — used to calculate the visible arc length.
  const circumference = 2 * Math.PI * radius
  // The arc covers ~75% of the circle. The remaining 25% is the gap that makes
  // it read as a spinner rather than a solid ring.
  const arcLength = circumference * 0.75

  // Why key={tokens.duration.slower}:
  // Framer Motion does not restart a repeat:Infinity animation when transition
  // props change on an already-mounted element. The animation is started once
  // on mount and runs indefinitely — subsequent prop changes are ignored for
  // the timing of the active loop.
  //
  // Changing the key forces React to unmount and remount the element entirely.
  // Framer Motion then starts a fresh animation with the current duration value.
  //
  // Tradeoff: the rotation resets to 0 on every token change (a brief visual
  // jump). This is acceptable here because token changes in the lab are
  // deliberate user actions — the reset confirms that the new duration is live.
  // For a production spinner where invisible token updates might occur, a
  // different approach (e.g. CSS animation with animation-duration updated via
  // inline style) would avoid the jump. In this demo context, the key approach
  // is the correct tradeoff: simple, correct, and the reset is expected.

  // Why initial={{ rotate: 0 }}:
  // AnimatePresence with initial={false} (used by TabPanel) sets a React context
  // that tells all descendant motion components to skip their initial animation
  // and start directly in their animate state. For a repeat:Infinity rotation
  // this means Framer Motion sees the element as "already at rotate:360" and
  // never starts the loop. Adding an explicit initial prop overrides this context,
  // giving Framer Motion an unambiguous start value regardless of the AnimatePresence
  // setting. The key remount on token change then works correctly as designed.
  return (
    <motion.svg
      key={tokens.duration.slower}
      width={diameter}
      height={diameter}
      viewBox={`0 0 ${diameter} ${diameter}`}
      className={styles.spinner}
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{
        duration: tokens.duration.slower,
        ease: tokens.ease.linear,
        repeat: Infinity,
        repeatType: 'loop',
      }}
      // Transform origin must be the center of the SVG for rotation to work.
      // Framer Motion applies transforms via CSS, so origin is set in style.
      style={{ originX: '50%', originY: '50%' }}
    >
      {/* Track ring — full circle at reduced opacity.
          Gives the spinner a sense of the total path it's traveling. */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        className={styles.track}
        strokeWidth={stroke}
      />

      {/* Arc — the moving visible portion.
          strokeDasharray: arcLength (visible) + gap (hidden).
          strokeDashoffset: 0 — arc starts at the top (12 o'clock) because
          the SVG's default origin is 3 o'clock and the rotate animation
          handles apparent movement. */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        className={styles.arc}
        strokeWidth={stroke}
        strokeDasharray={`${arcLength} ${circumference - arcLength}`}
        strokeLinecap="round"
      />
    </motion.svg>
  )
}
