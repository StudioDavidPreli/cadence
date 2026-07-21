import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate } from 'framer-motion'
import { PrincipleIcon } from '../PrincipleIcon'
// The expanded card's inner content (× close, animation/UI crossfade, meta,
// summary, toggle, QuoteBlock) lives in a shared presentational component so the
// deep-link modal can render the exact same markup. The card keeps the state and
// the scale/footprint machinery; it passes state in. See ExpandedPrincipleBody.
import { ExpandedPrincipleBody } from './ExpandedPrincipleBody'
// getExpandedFootprint is a pure grid-math function, extracted here so it can be
// unit-tested on its own (footprint.test.js): the same reason parse.js and
// springCurve.js are separate modules. Its edge-case reasoning and the Phase 2
// hook comment live in footprint.js.
import { getExpandedFootprint } from './footprint'
import styles from './PrincipleCard.module.css'

// Hover animations only apply to pointer devices. Touch devices have no hover
// state and exposing scale feedback there would be distracting.
const supportsHover =
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

// Grid invariant. Mirrors grid-auto-rows: 234px in PrinciplesLibrary.module.css
// — the target height the close animation lands on (one collapsed cell).
// cellWidth (the matching width target) is dynamic and arrives as a prop
// from PrinciplesLibrary.
const GRID_ROW_HEIGHT = 234

// 2026-05-03 regression note: the card-to-card switch path was missed by the
// 2026-05-01 explicit-scale fix. handleClose engages isClosing synchronously,
// but selecting a different card only flips isExpanded false — isClosing was
// never set on the deselected card, the close animation never ran, and the
// card's elevated z-index dropped immediately. Both are addressed below: a
// render-time transition detector engages isClosing whenever isExpanded
// transitions true → false without our own handler, and the newly-expanding
// card sits one stack level above the closing card so it visually arrives
// over the collapse rather than under it.

// ─── PrincipleCard ────────────────────────────────────────────────────────────
//
// Renders a single principle card in a CSS Grid context. The card occupies one
// grid cell when collapsed and a 2×2 footprint when expanded.
//
// Background:
//   docs/case-studies/cadence-animation-chronology.md — eleven-day history of
//     iteration on this animation, including the loops that produced the
//     architecture below.
//   docs/briefings/principle-card-briefing.md — diagnostic captures and the
//     measurements that justified replacing FLIP with explicit scale.
//
// ── State machine ─────────────────────────────────────────────────────────────
//
//   RESTING   collapsed at 1×1 cell. scaleX=scaleY=1. footprint={}.
//   OPENING   isExpanded=true, isAnimating=true, isStable=false.
//             Footprint at 2×2 — CSS box at expanded dimensions on the same
//             render isExpanded flips. The open useLayoutEffect snaps
//             scaleX/Y to the cell ratio (visually 1×1 at frame 0), then
//             animates them to 1.
//   OPEN      isExpanded=true, isStable=true. isStable persists in the
//             zIndex calculation across the small tail after open completes;
//             inner crossfades (summary, quoteContent) are stack-grided and
//             animate opacity directly from uiMode without gating.
//   CLOSING   isExpanded=false (set by parent), isClosing=true (set in
//             handleClose). Both batch into one render. Footprint stays at
//             2×2 via the (isExpanded || isClosing) guard. Wrapper stays at
//             expanded dimensions; contents do not reflow. The close
//             useLayoutEffect animates scaleX/Y from 1 down to the cell
//             ratio. On animation completion: MotionValues snap back to 1,
//             then setIsClosing(false). On the next render, footprint clears
//             and the card returns to RESTING with no visible jump (the snap
//             and the clear happen on the same paint).
//
// ── Why explicit scale instead of layout-prop FLIP ───────────────────────────
//
// FLIP records before/after bounding rects and applies a corrective transform.
// On close, FLIP forced the card's CSS box to reflow to single-cell dimensions
// on the same render as isExpanded flipping false. At single-cell width the
// flex column inside the wrapper collapsed asymmetrically: quoteBlock claimed
// all available height, expandedContent collapsed to zero cross-axis,
// animationHalf collapsed to zero, the Rive canvas was rendered into a
// zero-height box, and contentHalf overflowed its parent at 332px intrinsic
// height. The FLIP corrective then scaled this collapsed-and-overflowing
// layout up by 2×, producing the symptoms documented in the case study and
// the diagnostic captures in the briefing.
//
// Explicit scale separates layout from visual size. The CSS box stays at
// expanded dimensions throughout the animation; the visible shrink is a
// transform that does not affect descendants' layout. transformOrigin
// (returned per-card from getExpandedFootprint to match the edge-case
// biasing) anchors the shrink at the natural cell's corner so the visual
// size at the end of the close (scale at cell ratio, footprint still at 2×2)
// equals the resting collapsed visual size (scale 1, footprint 1×1) on the
// next paint. No reflow, no FLIP corrective, no canvas collapse.
//
// ── Animation timing ──────────────────────────────────────────────────────────
// Both directions use duration.slow + ease.standard. Overshoot is reserved for
// whileHover and whileTap.
// See CLAUDE.md: "ease.standard (not spring) for concurrent layout animations."
//
// ── Neighbor reflow ───────────────────────────────────────────────────────────
// Cards no longer carry a layout prop, so neighbor cards do not FLIP-animate
// their position changes. When the closing card's footprint clears at the
// end of the close animation, all neighbors snap to their new grid positions
// in a single paint.

export function PrincipleCard({
  principle,
  isExpanded,
  onSelect,
  onClose,
  tokens,
  index,
  columnCount,
  cellWidth,
  totalCards,
  selectedId,
  iconsPaused,
}) {
  // Drop all animation durations to 0 when the user has prefers-reduced-motion set.
  const prefersReducedMotion = useReducedMotion()
  const dur = {
    slow: prefersReducedMotion ? 0 : tokens.duration.slow,
    base: prefersReducedMotion ? 0 : tokens.duration.base,
    fast: prefersReducedMotion ? 0 : tokens.duration.fast,
  }

  const [uiMode, setUiMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Reduced-motion consent for this card's demo area. One boolean governs
  // BOTH layers: the Rive animation (paused prop on PrincipleAnimation) and
  // the token-driven UI demo (DemoMotionGate flattens or restores tokens).
  // Only meaningful under OS prefers-reduced-motion; the control that flips
  // it renders only then. Reset on collapse below: consent is per-instance.
  const [showDemoMotion, setShowDemoMotion] = useState(false)
  // isStable: true only while card is fully expanded and settled. Gates inner
  // AnimatePresence crossfades so they don't fire during expand/collapse.
  const [isStable, setIsStable] = useState(false)
  // isAnimating: true during expand and close. Prevents collapsed content
  // from appearing during the close animation. Cleared in the imperative
  // animate() onComplete callbacks below.
  const [isAnimating, setIsAnimating] = useState(false)
  // isClosing: true only during the close animation. Holds the footprint at
  // the expanded 2×2 so the wrapper's CSS box stays at expanded dimensions
  // throughout — preventing the inner flex column from collapsing
  // asymmetrically at single-cell width. Set synchronously in handleClose
  // alongside the parent's onClose() (React 18 batches both into one commit).
  // Cleared in the close animation's onComplete.
  const [isClosing, setIsClosing] = useState(false)
  // Ref mirror of isAnimating used in the click handler — refs don't cause
  // re-renders when read, which avoids unnecessary renders on fast clicks.
  const isAnimatingRef = useRef(false)
  const cardRef = useRef(null)
  // MotionValues drive the card's inline transform. They are animated
  // imperatively via Framer Motion's animate(motionValue, target) in the
  // open/close useLayoutEffects below. Imperative animation avoids a race
  // with the animate prop reading a target on the same render the MotionValue
  // is set, and per CLAUDE.md is the recommended pattern for component-local
  // motion that should not broadcast through the global animation scope.
  const scaleX = useMotionValue(1)
  const scaleY = useMotionValue(1)

  // Reset interactive state when card collapses.
  useEffect(() => {
    if (!isExpanded) {
      setUiMode(false)
      setDrawerOpen(false)
      setShowDemoMotion(false)
    }
  }, [isExpanded])

  // ── External deselection detector (Issue C, 2026-05-03) ───────────────────
  // The X-button path engages isClosing synchronously inside handleClose. The
  // card-to-card path doesn't — it only flips isExpanded false via the parent.
  // Without isClosing, the footprint clears immediately, the close animation
  // never runs, and z-index drops to 1 mid-exit. We detect the transition
  // here in render and engage isClosing ourselves, which routes the card
  // through the same close path as the X-button. The render-time setState
  // (rather than useEffect) means React discards the in-progress render and
  // restarts with the corrected state — the footprint is never observed
  // cleared, so the wrapper doesn't reflow at single-cell width.
  const [prevIsExpanded, setPrevIsExpanded] = useState(isExpanded)
  if (isExpanded !== prevIsExpanded) {
    setPrevIsExpanded(isExpanded)
    if (prevIsExpanded && !isExpanded && !isClosing) {
      setIsClosing(true)
    }
  }

  // ── Open animation ─────────────────────────────────────────────────────────
  // On expand, snap scaleX/Y to the collapsed-cell ratio synchronously
  // (before paint) and animate to identity. The card's CSS box has already
  // reflowed to the 2×2 footprint at this point; the small initial scale
  // produces a visual size of one cell at frame 0, growing to two cells.
  // transformOrigin (set on the inline style via getExpandedFootprint)
  // anchors growth at the natural cell's corner.
  //
  // The ratio targets are derived from the rendered bounding rect. With
  // State 5's fixed 180px column tracks and grid-auto-rows: 234px, the
  // expanded card's rect equals 2×2 footprint dimensions at every library
  // width where 2 columns fit. scaleX/Y are at 1 at this moment (initial
  // value, or set to 1 in the previous close's onComplete), so the rect
  // reflects the natural box.
  useLayoutEffect(() => {
    if (!isExpanded || isClosing || !cellWidth || !cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const ratioX = cellWidth       / rect.width
    const ratioY = GRID_ROW_HEIGHT / rect.height

    scaleX.set(ratioX)
    scaleY.set(ratioY)

    isAnimatingRef.current = true
    setIsAnimating(true)
    setIsStable(false)

    const ax = animate(scaleX, 1, {
      duration: dur.slow,
      ease: tokens.ease.standard,
    })
    const ay = animate(scaleY, 1, {
      duration: dur.slow,
      ease: tokens.ease.standard,
    })

    // Both axes animate independently. State transitions run after both
    // complete, not after one. Without this, the animation that finishes
    // second can overwrite values set in the first's onComplete (Framer
    // Motion processes animations in registration order within a single
    // frame).
    Promise.all([ax, ay]).then(() => {
      isAnimatingRef.current = false
      setIsAnimating(false)
      setIsStable(true)
    })

    return () => { ax.stop(); ay.stop() }
    // Deps are the transition flag only, by design: cellWidth, dur.slow, and
    // ease.standard are read at transition time. Including them would restart
    // the open animation on a token edit or grid recolumn while expanded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded])

  // ── Close animation ────────────────────────────────────────────────────────
  // On close, animate scaleX/Y from identity down to the cell ratio. The
  // footprint stays at 2×2 (held by isClosing in the footprint guard below),
  // so the wrapper's CSS box does not reflow and contents do not rewrap. The
  // canvas does not reach 0 height. The toggle stays in position.
  //
  // onComplete: snap MotionValues back to 1 BEFORE clearing isClosing, so the
  // footprint clear and the scale reset land on the same paint with no jump.
  useLayoutEffect(() => {
    if (!isClosing || !cellWidth || !cardRef.current) return

    // Same rect-based ratio as the open path. Footprint is held at 2×2 by
    // isClosing and scaleX/Y are at 1 (set in the prior open's onComplete),
    // so the rect captures the card's natural rendered size.
    const rect = cardRef.current.getBoundingClientRect()
    const ratioX = cellWidth       / rect.width
    const ratioY = GRID_ROW_HEIGHT / rect.height

    isAnimatingRef.current = true
    setIsAnimating(true)
    setIsStable(false)

    const ax = animate(scaleX, ratioX, {
      duration: dur.slow,
      ease: tokens.ease.standard,
    })
    const ay = animate(scaleY, ratioY, {
      duration: dur.slow,
      ease: tokens.ease.standard,
    })

    // Both axes animate independently. State transitions run after both
    // complete, not after one. Without this, the animation that finishes
    // second can overwrite values set in the first's onComplete (Framer
    // Motion processes animations in registration order within a single
    // frame).
    Promise.all([ax, ay]).then(() => {
      scaleX.set(1)
      scaleY.set(1)
      isAnimatingRef.current = false
      setIsClosing(false)
      setIsAnimating(false)
    })

    return () => { ax.stop(); ay.stop() }
    // Same shape as the open path: the close animation fires on the isClosing
    // transition alone, with the scale targets read at transition time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClosing])

  // Two exit contexts for the drawer:
  //
  // Primary exit — user dismisses the drawer directly via backdrop or × while
  // the card stays open. The full anticipation animation plays out visibly.
  // This is the demonstration the card exists to show.
  //
  // Secondary exit — user closes the card or toggles state while the drawer is
  // open. The drawer's exit runs in parallel with the parent state change. The
  // drawer's tail-end descent is essentially invisible during the card collapse,
  // which is correct behavior — the user has moved on and is not watching the
  // drawer specifically.

  function handleCardClick() {
    // isAnimatingRef blocks re-expand while the close animation is running.
    if (!isExpanded && !isAnimatingRef.current) onSelect()
  }

  function handleClose(e) {
    e.stopPropagation()
    if (drawerOpen) setDrawerOpen(false)
    // setIsClosing(true) and onClose() (which sets selectedId=null in the
    // parent) batch into one React 18 commit. On that commit isExpanded is
    // false and isClosing is true, so the footprint guard below resolves to
    // expanded and the card's CSS box stays at 2×2 through the close.
    setIsClosing(true)
    onClose()
  }

  function handleStateToggle(e) {
    e.stopPropagation()
    if (drawerOpen) setDrawerOpen(false)
    setUiMode(prev => !prev)
  }

  // Footprint holds at 2×2 throughout the close animation via isClosing, so
  // the wrapper's CSS box stays at expanded dimensions and contents do not
  // reflow. It clears at the end of the close, in the same render that the
  // scale resets to 1 (see close useLayoutEffect's onComplete).
  const footprint = (isExpanded || isClosing)
    ? getExpandedFootprint(index, columnCount, totalCards)
    : {}

  // zIndex stays elevated across the full close animation. isStable is also
  // included for the open path's small tail (it is set true on open
  // completion and persists until the next close begins).
  //
  // Concurrent card-to-card stacking (Issue C, 2026-05-03). The newly-
  // expanding card sits on top (11) so it visually arrives over the card
  // the user is leaving. The closing card holds at 10 — above inactive
  // siblings (1) so its collapse isn't clipped by neighbor reflow, but
  // below the new selection.
  const zIndex = isClosing ? 10 : (isExpanded || isStable) ? 11 : 1

  return (
    <motion.div
      ref={cardRef}
      className={[
        styles.card,
        isExpanded ? styles.cardExpanded : styles.cardCollapsed,
      ].join(' ')}
      style={{ ...footprint, zIndex, scaleX, scaleY }}
      animate={{
        opacity: selectedId && !isExpanded ? 0.5 : 1,
      }}
      onClick={handleCardClick}
      whileHover={isExpanded || !supportsHover ? undefined : { scale: tokens.scale.pressSubtle }}
      transition={{
        opacity: { duration: dur.base },
        duration: dur.fast,
        ease: tokens.ease.overshoot,
      }}
    >
      {/* ── Collapsed state ───────────────────────────────────────────────── */}
      {/* Hidden while isAnimating so collapsed content does not appear while
          the close animation is running. Fades in after duration.slow. */}
      {!isExpanded && !isAnimating && (
        <motion.div
          className={styles.collapsedContent}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur.base, ease: tokens.ease.standard }}
        >
          <div className={styles.placeholderIcon}>
            <PrincipleIcon principleId={principle.id} paused={iconsPaused} />
          </div>

          <div className={styles.cardMeta}>
            <span className={styles.cardNumber}>
              {String(principle.id).padStart(2, '0')}
            </span>
            <span className={[
              styles.categoryBadge,
              principle.category === 'extended'
                ? styles.categoryExtended
                : styles.categoryClassic,
            ].join(' ')}>
              {principle.category === 'extended' ? 'Extended' : 'Classic'}
            </span>
          </div>

          <h3 className={styles.cardTitle}>{principle.gridTitle ?? principle.title}</h3>
        </motion.div>
      )}

      {/* ── Expanded state ────────────────────────────────────────────────── */}
      {/* AnimatePresence holds the wrapper through its exit animation so its
          opacity fades out concurrently with the card's scale-down. */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded"
            className={styles.expandedWrapper}
            // The wrapper has no transform of its own. It inherits the card's
            // scaleX/scaleY transform via CSS cascade, so wrapper and contents
            // shrink with the card as one unit. Because the card's CSS box
            // stays at expanded dimensions throughout the close (footprint
            // held by isClosing), the wrapper's flex column does not reflow,
            // contents do not rewrap, and the canvas keeps its full height.
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.slow, ease: tokens.ease.standard }}
          >
            <ExpandedPrincipleBody
              principle={principle}
              tokens={tokens}
              prefersReducedMotion={prefersReducedMotion}
              uiMode={uiMode}
              onToggleState={handleStateToggle}
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              showDemoMotion={showDemoMotion}
              setShowDemoMotion={setShowDemoMotion}
              onClose={handleClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
