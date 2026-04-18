import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Dropdown.module.css'

// ─── Menu items ───────────────────────────────────────────────────────────────
const MENU_ITEMS = [
  { icon: '✎', label: 'Edit',      destructive: false },
  { icon: '⊕', label: 'Duplicate', destructive: false },
  { icon: '↗', label: 'Share',     destructive: false },
  { icon: '✕', label: 'Delete',    destructive: true  },
]

// ─── Dropdown ─────────────────────────────────────────────────────────────────
//
// A contextual menu that toggles open/closed on its trigger button. Closes when
// clicking outside the component or on any menu item.
//
// ── Outside click detection ───────────────────────────────────────────────────
// Outside-click dismissal is implemented with a document-level mousedown
// listener. Three specific decisions are worth documenting:
//
// 1. Why mousedown, not click:
//    mousedown fires before click in the browser event sequence. If we listened
//    for click on the document, this sequence would occur when a user clicks
//    an item: item's click fires → closes dropdown → document's click fires.
//    Because the dropdown is already closed when the document handler runs,
//    there is no bug — but the ordering is fragile. More importantly: on some
//    touch devices, click carries a ~300ms synthetic delay that makes
//    mousedown-based dismissal feel noticeably more responsive. mousedown
//    also avoids subtle interactions with drag-and-release gestures where
//    mousedown and mouseup land on different elements (click never fires,
//    but mousedown did — the menu should still close).
//
// 2. Why the ref wraps the container (trigger + menu), not just the menu:
//    If the ref only wrapped the menu, clicking the trigger button would
//    register as an "outside" click (the trigger is outside the menu). That
//    would close the menu on the same mousedown that opened it — the menu
//    would flash briefly and vanish. Wrapping the entire component (trigger
//    included) means that mousedown on the trigger is "inside," so the toggle
//    in the trigger's onClick handler runs cleanly without interference.
//
// 3. Why the cleanup function in useEffect:
//    useEffect returns a cleanup function that removes the listener. Without
//    cleanup, every time the component mounts (e.g., navigating away and back
//    to the tab that contains Dropdown), a new listener is added without
//    removing the old one. After N mounts there would be N listeners, each
//    attempting to close the dropdown and calling setIsOpen — a memory leak
//    and a source of unpredictable behavior. The cleanup ensures exactly one
//    listener exists at any time.

export function Dropdown({ label = 'Options' }) {
  const tokens = useMotionTokens()
  const [isOpen, setIsOpen] = useState(false)

  // containerRef wraps the entire component (trigger + menu) so that clicks
  // on the trigger are correctly identified as "inside." See note above.
  const containerRef = useRef(null)

  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)

    // Cleanup: remove the listener when the component unmounts.
    // Without this, each mount would accumulate another listener.
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])
  // Empty dependency array: the listener is added once on mount and removed
  // on unmount. setIsOpen is a stable reference (React guarantees setState
  // functions don't change between renders), so it doesn't need to be in deps.

  function handleItemClick() {
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={containerRef}>

      {/* Trigger button */}
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        {/* Chevron rotates to signal open state — CSS transition, not Framer Motion,
            because this is a purely visual cue on a static element. */}
        <span
          className={styles.chevron}
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>

      {/* Menu — AnimatePresence handles mount/unmount with exit animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            key="dropdown-menu"
            role="listbox"
            className={styles.menu}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -6,
              // Exit uses ease.exit — quick start, long tail, signals intentional close.
              transition: { duration: tokens.duration.fast, ease: tokens.ease.exit },
            }}
            // Enter uses ease.enter — decelerates into position, reads as "arriving."
            transition={{ duration: tokens.duration.fast, ease: tokens.ease.enter }}
          >
            {MENU_ITEMS.map(item => (
              <li key={item.label}>
                <button
                  className={`${styles.menuItem} ${item.destructive ? styles.menuItemDestructive : ''}`}
                  onClick={handleItemClick}
                  role="option"
                >
                  <span className={styles.menuIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

    </div>
  )
}
