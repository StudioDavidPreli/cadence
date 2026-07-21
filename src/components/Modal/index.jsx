import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { useMediaQuery } from '../../hooks/useMediaQuery'
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
// ── Focus trap ────────────────────────────────────────────────────────────────
// Tab/Shift-Tab are kept inside the panel so focus cannot escape to the page
// behind while the dialog is open. On open, focus moves to the first focusable
// element (or the panel itself). Added when the Token import report made this a
// real product surface rather than a visual demo. Minimal by design: it cycles
// the panel's focusable elements and does not restore focus to the trigger on
// close, which is acceptable for the surfaces this Modal serves here.

// portalTarget (a DOM node) renders the Modal into that node and implies scoped:
// Token Lab's Enter & Exit demo and the Principles Library intro pass the demo
// overlay node (useDemoOverlay) so the modal centers within the visible demo
// column instead of the viewport. Null renders in place (the principle-card use
// and the app-level import report).
//
// Consumer rule: any Modal rendered inside DemoArea should take its target from
// useDemoOverlay() rather than defaulting to the viewport. useDemoOverlay()
// returns null on the first render (the node is captured by a callback ref), so
// a Modal that auto-opens on mount must gate its open on the node existing —
// otherwise it mounts viewport-fixed for a frame, then jumps into the column.
// Full rationale: CLAUDE.md "Modal centering — viewport vs demo column".
//
// hideHeader drops the Modal's own header (the title text + ✕). The principle
// deep-link modal sets it because its content is the expanded-card body, which
// already carries the principle's title and its own × close; without this the
// two would double up. title is still used for the panel's aria-label even when
// the visible header is suppressed.
//
// bare shrink-wraps the panel to its child: it zeroes the default panel padding
// and lifts the 420px width cap so a fixed-size body (the deep-link modal's
// 372×480 card) sits flush inside the dialog frame. The class lives in
// Modal.module.css so its cascade order over .panel is controlled. Off by
// default, which keeps the standard dialog sizing.
export function Modal({ isOpen, onClose, title, children, scoped = false, portalTarget = null, hideHeader = false, bare = false }) {
  const tokens = useMotionTokens()
  const panelRef = useRef(null)
  const anchored = scoped || portalTarget != null

  // prefers-reduced-transparency: take the backdrop to a fully opaque scrim
  // instead of the translucent 0.8. The backdrop color is --color-bg, so opacity
  // 1 hides the page behind it entirely, which is the point of the preference.
  // The opacity is animated inline by Framer Motion, so this is set in JS rather
  // than overridden in CSS (CSS cannot beat the inline style).
  const reduceTransparency = useMediaQuery('(prefers-reduced-transparency: reduce)')
  const backdropOpacity = reduceTransparency ? 1 : 0.8

  // Escape closes — standard dialog affordance.
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // Focus trap. Runs while open; cleans up its keydown listener on close.
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusables = () => Array.from(panel.querySelectorAll(selector))
    // Move focus into the dialog on open.
    ;(focusables()[0] || panel).focus()
    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const tree = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className={[styles.backdrop, anchored && styles.backdropScoped].filter(Boolean).join(' ')}
          initial={{ opacity: 0 }}
          animate={{ opacity: backdropOpacity }}
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
          ref={panelRef}
          tabIndex={-1}
          // Portaled into the demo column (portalTarget): absolute but keep the
          // full 420px dialog sizing — the column is far wider than a principle
          // card, where panelScoped's 92% shrink belongs. Card use (scoped, no
          // portal) keeps the shrink.
          className={[
            styles.panel,
            portalTarget ? styles.panelAnchored : scoped && styles.panelScoped,
            bare && styles.panelBare,
          ].filter(Boolean).join(' ')}
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
          {!hideHeader && (
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
          )}

          <div className={styles.content}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return portalTarget ? createPortal(tree, portalTarget) : tree
}
