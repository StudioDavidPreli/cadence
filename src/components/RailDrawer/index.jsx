import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { navDurationSeconds, FEEDBACK_EASE } from '../../utils/feedbackDuration'
import styles from './RailDrawer.module.css'

// ─── RailDrawer ───────────────────────────────────────────────────────────────
//
// A collapsed column: a slim vertical rail (a grid item) that opens its content
// as a drawer over the demo area. Used by both the tool bar ("Tokens") and the
// nav column ("Navigation") when they collapse at their breakpoints.
//
// Controlled: the parent owns which drawer is open, so opening one closes the
// other (mutual exclusivity). onToggle flips this drawer; onClose forces it shut
// (Escape / backdrop). The rail stays clickable while another drawer is open
// because the backdrop only covers the demo area (left of it sits the rail
// strip) — see --drawer-left in TokenLab.module.css.
//
// The drawer is role="dialog" / aria-modal with focus-in, a Tab focus trap,
// Escape-to-close, and focus restore to the rail on close. It animates on the
// fixed --feedback-nav-duration and snaps under prefers-reduced-motion.
export function RailDrawer({ label, drawerId, open, onToggle, onClose, children }) {
  const reduce = useReducedMotion()
  const railRef = useRef(null)
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const drawer = drawerRef.current

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !drawer) return
      const focusables = drawer.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    drawer?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Reading the ref at cleanup time is the point: focus returns to
      // whatever rail button exists when the drawer closes, not a node
      // captured at effect setup. Optional chaining covers unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      railRef.current?.focus()
    }
  }, [open, onClose])

  const dur = navDurationSeconds(reduce)

  return (
    <>
      <button
        ref={railRef}
        type="button"
        className={styles.rail}
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label={label}
        onClick={onToggle}
      >
        <span className={styles.railLabel}>{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur }}
              onClick={onClose}
            />
            <motion.div
              id={drawerId}
              ref={drawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className={styles.drawer}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: dur, ease: FEEDBACK_EASE }}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
