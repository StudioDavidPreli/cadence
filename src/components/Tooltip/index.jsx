import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Tooltip.module.css'

// ─── Tooltip ──────────────────────────────────────────────────────────────────
//
// A small info bubble that arcs in above its trigger. Demonstrates Arc:
// natural motion follows curved paths, not straight lines.
//
// ── Why three keyframes for x and y ───────────────────────────────────────────
// Framer Motion's `animate={{ x, y }}` interpolates each axis linearly with a
// single easing curve. Two endpoints produce a straight-line trajectory with
// eased speed — the path is straight even when the velocity is not. To bend
// the trajectory itself, the keyframes need a midpoint that is OFF the line
// between start and end. Three keyframes create two segments that meet at an
// elbow; the elbow is the bend.
//
// Bubble travels from below-right of rest, swings up-and-over, drops to rest:
//
//   start (24, 16)  ──┐
//                    swings
//   mid (8, -10)  ────┼─── above rest, biased right
//                     │
//                     ▼
//   end (0, 0)        rest, centered above trigger
//
// The mid Y of -10 is above the bubble's resting Y of 0, so the path arcs up
// past the rest line before settling — the visual analogue of a thrown object
// reaching its apex before falling. ease.enter on each segment gives the
// motion deceleration into the elbow and into the rest.
//
// ── Centering survives the animation ──────────────────────────────────────────
// The bubble's resting position is set via CSS `translate: -50% 0` (a
// percentage shift relative to its own width). Framer Motion writes pixel
// offsets to `transform`. Because CSS `translate` and CSS `transform` are
// separate properties, both apply to the element — the centering composes
// with the animated offset. Using legacy `transform: translate(-50%, 0)` for
// centering would be overwritten on every frame.
//
// ── Outside-click dismiss, mousedown not click ────────────────────────────────
// Same recipe as Dropdown: a document-level mousedown listener checks whether
// the event originated outside the container. mousedown is more responsive
// than click on touch devices and survives drag-release gestures where click
// never fires.

export function Tooltip({ label = '?', text }) {
  const tokens = useMotionTokens()
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsVisible(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsVisible(v => !v)}
        aria-expanded={isVisible}
        aria-label="Show tooltip"
      >
        {label}
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.span
            role="tooltip"
            className={styles.bubble}
            initial={{ opacity: 0, x: 24, y: 16 }}
            animate={{
              opacity: [0, 1, 1],
              x: [24, 8, 0],
              y: [16, -10, 0],
            }}
            exit={{
              opacity: 0,
              x: 12,
              y: 8,
              transition: { duration: tokens.duration.fast, ease: tokens.ease.exit },
            }}
            transition={{
              duration: tokens.duration.base,
              times: [0, 0.6, 1],
              ease: tokens.ease.enter,
            }}
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
