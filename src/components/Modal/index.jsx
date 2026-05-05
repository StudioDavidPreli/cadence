import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Modal.module.css'

// ─── Modal ────────────────────────────────────────────────────────────────────
//
// Center-anchored dialog with a dimming backdrop. Demonstrates Staging:
// the backdrop clears the stage, the panel rises into focus.
//
// ── Motion grammar ────────────────────────────────────────────────────────────
// Drawer slides from an edge. Modal rises from rest at the center. The
// difference is meaningful — sliding implies "from somewhere else"; scaling
// implies "this thing was always going to live here, the system just had to
// commit to showing it." Use Modal for decisions and confirmations; use
// Drawer for content that arrives from a side.
//
// Backdrop: opacity 0 → 0.8 fade. duration.slow + ease.enter on enter so the
// dimming reads as the stage being deliberately cleared. Exit fades on
// duration.base + ease.exit — the user has decided, get out of the way.
//
// Panel: scale 0.96 → 1 + opacity 0 → 1 on enter. Same asymmetric durations
// as Drawer. Exit drops to 0.98 (a smaller delta than enter's 0.96) — the
// asymmetry makes departure feel inevitable rather than the reverse of a
// slow enter.
//
// ── Scoped vs global ──────────────────────────────────────────────────────────
// scoped=false (default): position:fixed, viewport-anchored. Backdrop
// covers the whole page. Used in TokenLab.
// scoped=true: position:absolute inside the nearest positioned ancestor.
// Parent must have position:relative and overflow:hidden for correct
// containment. Used in the principle card's narrow demo frame.
//
// ── Centering ─────────────────────────────────────────────────────────────────
// The panel uses CSS `top: 50%; left: 50%; translate: -50% -50%` for its
// resting position. The CSS `translate` property is separate from `transform`,
// so Framer Motion's `animate={{ scale }}` (which writes to `transform`)
// composes with it cleanly. Using the legacy `transform: translate(-50%,-50%)`
// would conflict — Framer Motion would overwrite the centering on every frame.
//
// ── Backdrop click vs panel click ─────────────────────────────────────────────
// Backdrop's onMouseDown closes. Panel's onMouseDown stops propagation so a
// click inside the panel does not bubble to the backdrop and trigger close.
// Using mousedown (not click) prevents text selection drags that end on the
// backdrop from closing the modal — a common usability bug with click handlers.
//
// ── Escape to close ───────────────────────────────────────────────────────────
// Standard dialog affordance. The listener is gated by isOpen so we don't
// burn a global keydown handler when closed.
//
// ── Deferred ──────────────────────────────────────────────────────────────────
// Focus trap. Real production modals trap Tab/Shift-Tab so focus cannot
// escape to the page behind. The demo doesn't need this for visual
// demonstration; it does need it before this Modal is used in any real
// product surface.

export function Modal({ isOpen, onClose, title, children, scoped = false }) {
  const tokens = useMotionTokens()

  // Escape closes — standard dialog affordance.
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className={[styles.backdrop, scoped && styles.backdropScoped].filter(Boolean).join(' ')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          exit={{
            opacity: 0,
            transition: { duration: tokens.duration.base, ease: tokens.ease.exit },
          }}
          transition={{ duration: tokens.duration.slow, ease: tokens.ease.enter }}
          onMouseDown={onClose}
        />
      )}

      {isOpen && (
        <motion.div
          key="modal-panel"
          className={[styles.panel, scoped && styles.panelScoped].filter(Boolean).join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{
            scale: 0.98,
            opacity: 0,
            transition: { duration: tokens.duration.base, ease: tokens.ease.exit },
          }}
          transition={{ duration: tokens.duration.slow, ease: tokens.ease.enter }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <div className={styles.content}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
