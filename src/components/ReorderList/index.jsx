import { useCallback, useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { motion, animate, useDragControls, useMotionValue } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import {
  announcement, indexFromOffset, initialState, keyToAction, reorderReducer, rowY,
} from './reorderModel'
import { RunnerArt } from './RunnerArt'
import styles from './ReorderList.module.css'

// The rows. Something the tool already means, where a different order is a
// legitimate preference rather than a wrong answer: the three named presets
// and the Explore slot. Not bound to the real preset order anywhere, on
// purpose. If it were, this demo would hold state the rest of the column
// does not, and a reorder here would rearrange the tool bar (David's gate,
// 2026-09-09: reset on mount, matching every other demo).
//
// Each row ends in a runner, a pixel figure per preset (David's, 2026-09-10):
// a .riv that runs while the row is held, by keyboard or pointer alike, with
// the static SVG poster under reduced motion and until the canvas paints. See
// RunnerArt. Names are the runtime's (artboard <id>Run, state machine
// <id>RunSM); the files carry no theme instances and draw on transparent.
const ROWS = [
  { id: 'snappy',    label: 'Snappy',    riv: '/runnerSVGS/snappyrun.riv',    stateMachine: 'snappyRunSM',    poster: '/runnerSVGS/fallbacks/snappy.svg' },
  { id: 'standard',  label: 'Standard',  riv: '/runnerSVGS/standardrun.riv',  stateMachine: 'standardRunSM',  poster: '/runnerSVGS/fallbacks/standard.svg' },
  { id: 'cinematic', label: 'Cinematic', riv: '/runnerSVGS/cinematicrun.riv', stateMachine: 'cinematicRunSM', poster: '/runnerSVGS/fallbacks/cinematic.svg' },
  { id: 'explore',   label: 'Explore',   riv: '/runnerSVGS/explorerun.riv',   stateMachine: 'exploreRunSM',   poster: '/runnerSVGS/fallbacks/explore.svg' },
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
// DOM order never changes. The rows render in ROWS order, always, and each one
// is translated to its slot: y = (slot - domIndex) * pitch. That is direct
// value animation, the same architecture as Carousel's x, and it keeps this
// demo off the projection system entirely (no `layout`, no `layoutId`; see the
// LayoutGroup history in CLAUDE.md). It also means a held row never remounts
// and a focused handle never loses focus: the element stays where it is in the
// tree while it moves on screen.
//
// Each row owns its y as a MotionValue (see ReorderRow) rather than taking it
// from the `animate` prop. Two reasons. Framer's drag writes the pointer's
// travel straight into that value, so the pointer and the settle share one
// number with no hand-off. And a drop has to animate from wherever the hand
// left the row, with the hand's velocity, which the declarative prop cannot
// express: its target is the slot, and the slot did not change at the drop.
// So the settle is imperative, animate(y, target, transition), the Carousel
// pattern, and never useAnimation() (CLAUDE.md: it broadcasts tree-wide).
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
//   dragging        nothing. The row is under the hand; its position is input.
//   rows making room duration.base, ease.standard: they are reacting, not held
//   keyboard move   duration.base, ease.standard (the held row too: no hand)
//   drop (pointer)  the spring family, from the hand's velocity. With the
//                   spring toggle off, duration.base on ease.overshoot, the
//                   system's bezier stand-in for a spring, which cannot take a
//                   velocity: that difference is what the toggle is for
//   drop (keyboard) the row is already in its slot; only the lift comes down
//   cancel          duration.fast, ease.exit, a deliberate return, the same
//                   reasoning as Stepper's reset, from either input
//
// The pitch (row height plus gap) is measured from the DOM, never typed:
// the second row's offsetTop minus the first's, read in a layout effect and
// again whenever the list resizes. Transforms do not move offsetTop, so the
// measurement is the flow pitch however the rows are translated.
export function ReorderList({ motionMode = 'bezier' }) {
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
  const count = order.length

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

  // Use the spring only when asked AND not in a flattening context: a spring
  // has no duration, so under reduced motion it would ignore the flattening
  // the rest of the UI honors. Carousel's rule, same reasoning.
  const useSpring = motionMode === 'spring' && !tokens.reducedMotion

  // The three settles a row can take. One set for every row: during a hold
  // each row that moves is answering the same input, and after a cancel the
  // whole list returns on the exit curve. Which one a row uses is decided in
  // ReorderRow, where it knows whether it was the row the hand just released.
  const transitions = {
    move:   { duration: tokens.duration.base, ease: tokens.ease.standard },
    cancel: { duration: tokens.duration.fast, ease: tokens.ease.exit },
    drop:   useSpring
      ? { type: 'spring', stiffness: tokens.spring.stiffness, damping: tokens.spring.damping, mass: tokens.spring.mass }
      : { duration: tokens.duration.base, ease: tokens.ease.overshoot },
    lift:   { duration: tokens.duration.fast, ease: tokens.ease.standard },
  }

  return (
    <div className={styles.reorderList}>
      <ul ref={listRef} className={styles.list} aria-label="Presets">
        {ROWS.map((row, domIndex) => (
          <ReorderRow
            key={row.id}
            row={row}
            domIndex={domIndex}
            slot={order.indexOf(row.id)}
            count={count}
            pitch={pitch}
            held={held}
            lastType={last?.type}
            transitions={transitions}
            lift={tokens.scale.lift}
            dispatch={dispatch}
            rowRef={el => { rowRefs.current[row.id] = el }}
            handleRef={el => { handleRefs.current[row.id] = el }}
            tabIndex={row.id === tabId ? 0 : -1}
            instructionsId={instructionsId}
            onFocus={() => setTabId(row.id)}
            onKeyDown={e => handleKeyDown(e, row.id)}
          />
        ))}
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

// ─── One row ──────────────────────────────────────────────────────────────────
//
// A row is its own component because it owns three things a mapped element
// cannot: a MotionValue for y, Framer's drag controls, and the effect that
// settles y into the slot. The handle is the one control for both inputs: the
// button the keyboard reaches, and the surface the pointer drags from.
//
// The drag is Framer's, started from the handle (`dragControls`) with
// `dragListener={false}` on the row itself, so the row keeps its scrolling
// and text selection and only the handle needs `touch-action: none` (read in
// the 11.18.2 source: the listener flag is what gates Framer's touch-action
// and user-select overrides). Momentum is off because the settle is ours.
function ReorderRow({
  row, domIndex, slot, count, pitch, held, lastType, transitions, lift, dispatch,
  rowRef, handleRef, tabIndex, instructionsId, onFocus, onKeyDown,
}) {
  const y = useMotionValue(0)
  const dragControls = useDragControls()
  const isHeld = held?.id === row.id
  const heldByPointer = isHeld && held.source === 'pointer'

  // Read by the settle effect, written every render, so the effect always
  // sees this render's tokens without re-running on every token change: a
  // slider drag in the tool bar must not move the rows (the item 11 rule).
  const transitionsRef = useRef(transitions)
  transitionsRef.current = transitions
  const lastTypeRef = useRef(lastType)
  lastTypeRef.current = lastType
  // The hand's velocity at release, px/s, for the spring to continue from.
  const dropVelocity = useRef(0)
  // Set by Escape during a pointer hold, so the drag's end does not also drop.
  const cancelled = useRef(false)

  // Settle y into the slot. Runs when the slot changes (a keyboard move, a row
  // making room, a cancel), when the pitch changes (first measurement, a
  // resize), and when the hand lets go. While the hand holds the row nothing
  // here touches y: Framer's drag is writing it. A pitch-only change jumps
  // rather than animates, since nothing happened that the user did.
  const prev = useRef({ slot, heldByPointer })
  useEffect(() => {
    const target = rowY(slot - domIndex, pitch)
    const wasPointer = prev.current.heldByPointer
    const slotChanged = prev.current.slot !== slot
    prev.current = { slot, heldByPointer }
    if (heldByPointer) return
    if (!slotChanged && !wasPointer) {
      y.jump(target)
      return
    }
    const t = transitionsRef.current
    const transition =
      lastTypeRef.current === 'cancel' ? t.cancel
      : wasPointer ? { ...t.drop, velocity: dropVelocity.current }
      : t.move
    // animate() on a value stops whatever was animating it before, so a move
    // that lands mid-settle just retargets. No cleanup on purpose: stopping
    // here would cut a settle short on any re-render.
    animate(y, target, transition)
  }, [slot, pitch, heldByPointer, domIndex, y])

  // Escape during a pointer hold. The model cancels; then the drag session
  // has to end too, or Framer keeps writing y from the pointer until release.
  // It has no cancel of its own, but it ends a session on a window
  // pointercancel (PanSession, 11.18.2), so one is dispatched. Framer filters
  // every pointer event through isPrimaryPointer, and a bare constructed
  // event has no pointer type and isPrimary false, so it is dispatched as a
  // primary mouse event or it is ignored (found on built output, 2026-09-10).
  // The drag's onDragEnd then fires and sees `cancelled`, so it does not also
  // DROP. Capture phase, and it matters: the handle has focus under the
  // pointer, so React sees the same keydown at its root first, cancels, and
  // flushes this effect's cleanup before the event would bubble to a window
  // listener. At capture the window hears it before React does.
  useEffect(() => {
    if (!heldByPointer) return
    const onKey = event => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      cancelled.current = true
      dispatch({ type: 'CANCEL' })
      window.dispatchEvent(new PointerEvent('pointercancel', {
        bubbles: true, pointerType: 'mouse', isPrimary: true, button: 0,
      }))
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [heldByPointer, dispatch])

  // The hand takes the row only if nothing is held: the model would ignore
  // the GRAB, and Framer would drag the row anyway.
  function handlePointerDown(event) {
    if (held) return
    dragControls.start(event)
  }

  return (
    <motion.li
      ref={rowRef}
      className={`${styles.row} ${isHeld ? styles.held : ''}`}
      style={{ y }}
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      // The value-space bounds are the first and last slots; a little give
      // past them so the ends feel like ends rather than walls.
      dragConstraints={{ top: rowY(-domIndex, pitch), bottom: rowY(count - 1 - domIndex, pitch) }}
      dragElastic={0.15}
      // Framer starts a drag after a few px of travel, so a plain click on the
      // handle never grabs. From here the pointer owns y until release.
      onDragStart={() => dispatch({ type: 'GRAB', id: row.id, source: 'pointer' })}
      onDrag={(_, info) => {
        if (!heldByPointer) return
        dispatch({
          type: 'MOVE_TO',
          index: indexFromOffset({ from: held.from, offset: info.offset.y, pitch, count }),
        })
      }}
      onDragEnd={(_, info) => {
        if (cancelled.current) { cancelled.current = false; return }
        dropVelocity.current = info.velocity.y
        dispatch({ type: 'DROP' })
      }}
      // A held row rises by the system's one named lift, shared with Card,
      // Carousel and Accordion, so "raised" is one distance everywhere.
      animate={{ scale: isHeld ? lift : 1 }}
      transition={transitions.lift}
    >
      <button
        type="button"
        ref={handleRef}
        className={styles.handle}
        aria-label={`Reorder ${row.label}`}
        aria-pressed={isHeld}
        aria-describedby={instructionsId}
        tabIndex={tabIndex}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onPointerDown={handlePointerDown}
      >
        <span className={styles.grip} aria-hidden="true">⠿</span>
      </button>
      <span className={styles.label}>{row.label}</span>
      <RunnerArt src={row.riv} stateMachine={row.stateMachine} poster={row.poster} playing={isHeld} />
    </motion.li>
  )
}
