import { useCallback, useId, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { announcement, initialState, keyToAction, reorderReducer, rowY } from './reorderModel'
import styles from './ReorderList.module.css'

// The rows. Something the tool already means, where a different order is a
// legitimate preference rather than a wrong answer: the three named presets
// and the Explore slot. Not bound to the real preset order anywhere, on
// purpose. If it were, this demo would hold state the rest of the column
// does not, and a reorder here would rearrange the tool bar (David's gate,
// 2026-09-09: reset on mount, matching every other demo).
//
// Each row ends in a runner, a pixel figure per preset. Today it is the static
// SVG poster (public/runnerSVGS/fallbacks/, served as-is, decorative so it has
// no alt text). Filed for later (David, 2026-09-10): the runner becomes a .riv
// that plays while the row is held, by keyboard or pointer alike, and this
// poster becomes its reduced-motion fallback on the display-title convention.
const ROWS = [
  { id: 'snappy',    label: 'Snappy',    art: '/runnerSVGS/fallbacks/snappy.svg' },
  { id: 'standard',  label: 'Standard',  art: '/runnerSVGS/fallbacks/standard.svg' },
  { id: 'cinematic', label: 'Cinematic', art: '/runnerSVGS/fallbacks/cinematic.svg' },
  { id: 'explore',   label: 'Explore',   art: '/runnerSVGS/fallbacks/explore.svg' },
]
const IDS = ROWS.map(r => r.id)
const LABELS = Object.fromEntries(ROWS.map(r => [r.id, r.label]))
const labelOf = id => LABELS[id]

// ─── Reorder: one list, two input modes ───────────────────────────────────────
//
// Every other demo in this tool animates a timed transition. This one has a
// stretch of time the token vocabulary cannot name: while a pointer holds a
// row, the row's position is input, and no duration, easing or delay applies.
// Let go and the row lands from whatever velocity the hand had, which only the
// spring family can express. Move the same row with the keyboard and there is
// no hand, no velocity, nothing to follow, so the motion goes straight back to
// being timed. Same operation, two motion models, and the input decides.
//
// This file is the keyboard half. The pointer half layers on top of it: the
// handle becomes a drag control as well as a button, and the model already
// carries `held.source` so the drop can pick its transition.
//
// DOM order never changes. The rows render in ROWS order, always, and each one
// is translated to its slot: y = (slot - domIndex) * pitch. That is direct
// value animation, the same architecture as Carousel's x, and it keeps this
// demo off the projection system entirely (no `layout`, no `layoutId`; see the
// LayoutGroup history in CLAUDE.md). It also means a held row never remounts
// and a focused handle never loses focus: the element stays where it is in the
// tree while it moves on screen.
//
// The one consequence of a fixed DOM order is that Tab order would not follow
// a reorder, so the handles use a roving tabindex: the list is one tab stop,
// and when nothing is held the arrows walk focus between handles in VISUAL
// order. While a row is held the same arrows move the row instead. Same keys,
// and what they do depends on whether you are holding something, which is how
// hands work.
//
// Timing, per the item 13 table:
//   grab            scale.lift on duration.fast, ease.standard
//   keyboard move   duration.base, ease.standard (held row and the rows
//                   making room alike: no gesture, so timed)
//   cancel          duration.fast, ease.exit, a deliberate return, the same
//                   reasoning as Stepper's reset
//   drop (keyboard) the row is already in its slot; only the lift comes down
//
// The pitch (row height plus gap) is measured from the DOM, never typed:
// the second row's offsetTop minus the first's, read in a layout effect and
// again whenever the list resizes. Transforms do not move offsetTop, so the
// measurement is the flow pitch however the rows are translated.
export function ReorderList() {
  const tokens = useMotionTokens()
  const [state, dispatch] = useReducer(reorderReducer, IDS, initialState)
  const [pitch, setPitch] = useState(0)
  // Roving tabindex: the one handle that is in the Tab sequence. Starts at the
  // top row and follows whatever was last focused, so leaving and re-entering
  // the list lands where the user was.
  const [tabId, setTabId] = useState(IDS[0])
  const listRef = useRef(null)
  const rowRefs = useRef({})
  const handleRefs = useRef({})
  const instructionsId = useId()

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const first = rowRefs.current[IDS[0]]
      const second = rowRefs.current[IDS[1]]
      if (first && second) setPitch(second.offsetTop - first.offsetTop)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [])

  const { held, order, last } = state

  const focusHandle = useCallback(id => {
    setTabId(id)
    handleRefs.current[id]?.focus()
  }, [])

  function handleKeyDown(event, id) {
    const action = keyToAction(event.key, state, id)
    if (action) {
      // Space on a button would also fire click; the keydown owns it here.
      event.preventDefault()
      dispatch(action)
      return
    }
    // Nothing held: the arrows walk focus in visual order. Home and End go
    // to the ends of the list as it looks, not as the DOM has it.
    if (held) return
    const slot = order.indexOf(id)
    const target =
      event.key === 'ArrowDown' ? order[Math.min(slot + 1, order.length - 1)]
      : event.key === 'ArrowUp' ? order[Math.max(slot - 1, 0)]
      : event.key === 'Home'    ? order[0]
      : event.key === 'End'     ? order[order.length - 1]
      : null
    if (target) {
      event.preventDefault()
      focusHandle(target)
    }
  }

  // The transition the rows take to their slots. One object for all of them:
  // during a keyboard hold every row that moves is answering the same
  // keypress. After a cancel the whole list returns on the exit curve.
  const moveTransition = last?.type === 'cancel'
    ? { duration: tokens.duration.fast, ease: tokens.ease.exit }
    : { duration: tokens.duration.base, ease: tokens.ease.standard }
  const liftTransition = { duration: tokens.duration.fast, ease: tokens.ease.standard }

  return (
    <div className={styles.reorderList}>
      <ul ref={listRef} className={styles.list} aria-label="Presets">
        {ROWS.map((row, domIndex) => {
          const slot = order.indexOf(row.id)
          const isHeld = held?.id === row.id
          return (
            <motion.li
              key={row.id}
              ref={el => { rowRefs.current[row.id] = el }}
              className={`${styles.row} ${isHeld ? styles.held : ''}`}
              // A held row rises by the system's one named lift, shared with
              // Card, Carousel and Accordion, so "raised" is one distance
              // everywhere. Per-property transitions: y and scale answer
              // different questions and take different timings.
              animate={{
                y: rowY(slot - domIndex, pitch),
                scale: isHeld ? tokens.scale.lift : 1,
              }}
              transition={{ y: moveTransition, scale: liftTransition }}
            >
              <button
                type="button"
                ref={el => { handleRefs.current[row.id] = el }}
                className={styles.handle}
                aria-label={`Reorder ${row.label}`}
                aria-pressed={isHeld}
                aria-describedby={instructionsId}
                tabIndex={row.id === tabId ? 0 : -1}
                onFocus={() => setTabId(row.id)}
                onKeyDown={e => handleKeyDown(e, row.id)}
              >
                <span className={styles.grip} aria-hidden="true">⠿</span>
              </button>
              <span className={styles.label}>{row.label}</span>
              <img className={styles.art} src={row.art} alt="" draggable="false" />
            </motion.li>
          )
        })}
      </ul>
      <p id={instructionsId} className={styles.srOnly}>
        Space grabs a row. Arrows move it. Space drops it. Escape cancels.
      </p>
      {/* Polite, so it never interrupts the keypress that caused it. The
          model returns the same state for a no-op, so this text only changes
          when something happened. */}
      <div className={styles.srOnly} aria-live="polite">
        {announcement(state, labelOf)}
      </div>
    </div>
  )
}
