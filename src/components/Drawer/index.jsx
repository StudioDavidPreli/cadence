import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Drawer.module.css'

// ─── Drawer ───────────────────────────────────────────────────────────────────
//
// A bottom-entry drawer with a dimming backdrop. Positioned fixed so it renders
// over the full viewport regardless of where in the DOM it is mounted.
//
// ── Asymmetric duration ───────────────────────────────────────────────────────
// Enter uses tokens.duration.slow. Exit uses tokens.duration.base.
// This asymmetry is deliberate and has a perceptual basis:
//
// Arrival deserves more time than departure.
//
// When a drawer opens, the user needs a moment to reorient — content is
// entering the visual field and competing for attention. A slower enter gives
// the eye time to track the panel before it settles, reducing the cognitive
// jolt of content appearing suddenly. It also communicates that what's
// arriving has weight — it matters enough to take up space.
//
// When a drawer closes, the user has already decided they're done with it.
// Keeping it on screen any longer than necessary introduces friction. A faster
// exit clears the path immediately. The user's intent was expressed in the
// close action; the animation should honor that intent and get out of the way.
//
// This pattern appears throughout well-considered UI systems: modals open
// slowly, dismiss quickly. Tooltips appear with a delay, vanish instantly.
// The direction of the animation carries meaning — arrival vs. departure.
//
// ── Two AnimatePresence children, independent timing ─────────────────────────
// The backdrop and the drawer panel are both direct keyed children of a single
// AnimatePresence. This allows them to animate independently:
// backdrop: symmetric fade (same timing enter/exit)
// drawer:   keyframe anticipation on both enter and exit
// AnimatePresence tracks each child by key and runs their exit animations
// before removing them from the DOM.
//
// Enter and exit both use keyframes to demonstrate anticipation. The component
// must exhibit the principle it teaches — exit without anticipation would
// contradict the lesson.

// scoped=true anchors the Drawer to its nearest positioned ancestor instead of
// the viewport. The parent container must have position:relative and
// overflow:hidden for correct containment. Default false preserves the existing
// fixed-to-viewport behavior used in Token Lab.
export function Drawer({ isOpen, onClose, title, children, scoped = false }) {
  const tokens = useMotionTokens()

  return (
    <AnimatePresence>
      {/* Backdrop — dims the page behind the drawer, closes on click */}
      {isOpen && (
        <motion.div
          key="drawer-backdrop"
          className={[styles.backdrop, scoped && styles.backdropScoped].filter(Boolean).join(' ')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          exit={{ opacity: 0 }}
          // Symmetric timing — the backdrop fade should feel ambient, not weighted.
          // Using duration.base matches the drawer's exit speed so they clear together.
          transition={{ duration: tokens.duration.base, ease: tokens.ease.enter }}
          onMouseDown={onClose}
        />
      )}

      {/* Drawer panel — enters from bottom, exits to bottom */}
      {isOpen && (
        <motion.div
          key="drawer-panel"
          className={[styles.drawer, scoped && styles.drawerScoped].filter(Boolean).join(' ')}
          initial={{ y: '100%', opacity: 0 }}
          animate={{
            y: ['100%', '-4%', '0%'],
            opacity: [0, 1, 1],
          }}
          exit={{
            y: ['0%', '-4%', '100%'],
            opacity: [1, 1, 0],
            transition: {
              duration: tokens.duration.slow,
              times: [0, 0.2, 1],
              ease: tokens.ease.exit,
            },
          }}
          transition={{
            duration: tokens.duration.slow,
            times: [0, 0.7, 1],
            ease: tokens.ease.enter,
          }}
        >

          {/* Drag handle — three stacked lines signal that the panel can be
              pulled. In this demo there is no actual drag gesture (that belongs
              in the Gesture tab), but the affordance should be present so the
              component is complete and accurate to production patterns. */}
          <div className={styles.handle}>
            <span className={styles.handleLine} />
            <span className={styles.handleLine} />
            <span className={styles.handleLine} />
          </div>

          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.closeButton} onClick={onClose} aria-label="Close drawer">
              ✕
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {children}
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
