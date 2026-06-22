import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import styles from './Drawer.module.css'

// ─── Drawer ───────────────────────────────────────────────────────────────────
//
// A bottom-entry drawer with a dimming backdrop. Positioned fixed so it renders
// over the full viewport regardless of where in the DOM it is mounted.
//
// ── Equal duration, asymmetric character ─────────────────────────────────────
// Enter and exit both run on tokens.duration.slow. The asymmetry is not in the
// time budget, it is in the easing and where the keyframes sit inside it.
//
// Enter uses ease.enter with times [0, 0.7, 1]: the panel spends most of the
// slow duration rising, overshoots a few percent near the end, then settles.
// The eye tracks it in and it arrives at rest gently.
//
// Exit uses ease.exit with times [0, 0.2, 1]: a short dip in the first fifth,
// then it accelerates down and clears the frame over the rest. Same clock,
// opposite shape. The dip reads as intent before the panel leaves.
//
// Two motions can share a duration and still feel unrelated. The curve and the
// keyframe spacing carry the character, not the length.
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
// overflow:hidden for correct containment. Default false is fixed-to-viewport.
//
// portalTarget (a DOM node) renders the Drawer into that node instead of in
// place, and implies scoped: Token Lab passes its demo-area overlay node so the
// drawer fills the visible demo column rather than escaping it to the viewport.
// When portalTarget is null the Drawer renders in place (the principle-card use,
// which anchors to the card frame).
export function Drawer({ isOpen, onClose, title, children, scoped = false, portalTarget = null }) {
  const tokens = useMotionTokens()
  const anchored = scoped || portalTarget != null

  // prefers-reduced-transparency: opaque scrim (1) instead of the translucent
  // 0.8. Same reasoning as Modal — the backdrop is --color-bg, so full opacity
  // hides the page behind it. Set in JS because Framer Motion animates opacity
  // inline, where CSS cannot override it.
  const reduceTransparency = useMediaQuery('(prefers-reduced-transparency: reduce)')
  const backdropOpacity = reduceTransparency ? 1 : 0.8

  const tree = (
    <AnimatePresence>
      {/* Backdrop — dims the page behind the drawer, closes on click */}
      {isOpen && (
        <motion.div
          key="drawer-backdrop"
          className={[styles.backdrop, anchored && styles.backdropScoped].filter(Boolean).join(' ')}
          initial={{ opacity: 0 }}
          animate={{ opacity: backdropOpacity }}
          exit={{ opacity: 0 }}
          // The backdrop fades on duration.base, faster than the panel's duration.slow,
          // so the dimming lifts while the panel is still on its way out. Ambient, not
          // weighted: the backdrop is atmosphere, the panel is the event.
          transition={{ duration: tokens.duration.base, ease: tokens.ease.enter }}
          onMouseDown={onClose}
        />
      )}

      {/* Drawer panel — enters from bottom, exits to bottom */}
      {isOpen && (
        <motion.div
          key="drawer-panel"
          className={[styles.drawer, anchored && styles.drawerScoped].filter(Boolean).join(' ')}
          initial={{ y: '100%', opacity: 0 }}
          animate={{
            y: ['100%', '-10%', '0%'],
            opacity: [0, 1, 1],
          }}
          exit={{
            y: ['0%', '-10%', '100%'],
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

  return portalTarget ? createPortal(tree, portalTarget) : tree
}
