import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate } from 'framer-motion'
import { PrincipleAnimation } from '../PrincipleAnimation'
import { PrincipleIcon } from '../PrincipleIcon'
import { Button } from '../Button'
import { Drawer } from '../Drawer'
import styles from './PrincipleCard.module.css'

// Hover animations only apply to pointer devices. Touch devices have no hover
// state and exposing scale feedback there would be distracting.
const supportsHover =
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

// Grid invariant. Mirrors grid-auto-rows: 234px in PrinciplesLibrary.module.css
// — the target height the close animation lands on (one collapsed cell). The
// expanded card's rendered height is read from getBoundingClientRect at the
// start of each open/close, so it absorbs vertical growth at stacked widths
// without needing a separate gap/ratio formula. cellWidth (the matching width
// target) is dynamic and arrives as a prop from PrinciplesLibrary.
const GRID_ROW_HEIGHT = 234

// ─── getExpandedFootprint ─────────────────────────────────────────────────────
//
// Computes the grid-column, grid-row span, and matching transform-origin for
// an expanded card.
//
// Bias rule (down-right): the expansion extends right and down from the card's
// natural 1-indexed position. Edge cases:
//   - Right edge (col === columnCount): extend left instead of right.
//   - Bottom row (row === totalRows): extend up instead of down.
//
// transformOrigin matches the natural cell's corner within the expanded
// footprint, so the close animation's scale shrinks toward the resting
// collapsed position with no horizontal or vertical jump:
//   - Interior:    "0% 0%"     (top-left)
//   - Right edge:  "100% 0%"   (top-right)
//   - Bottom row:  "0% 100%"   (bottom-left)
//   - Bottom-right corner: "100% 100%"
//
// Phase 2 hook: this function receives index, columnCount, and totalCards.
// It is the correct place to add neighborhood-relative logic when Phase 2
// card deformation is implemented.

function getExpandedFootprint(index, columnCount, totalCards) {
  const row       = Math.floor(index / columnCount) + 1  // 1-indexed
  const col       = (index % columnCount) + 1            // 1-indexed
  const totalRows = Math.ceil(totalCards / columnCount)

  const colStart = col === columnCount ? col - 1 : col
  const rowStart = row === totalRows ? row - 1 : row

  const transformOrigin =
    `${col === columnCount ? '100%' : '0%'} ${row === totalRows ? '100%' : '0%'}`

  return {
    gridColumn: `${colStart} / span 2`,
    gridRow:    `${rowStart} / span 2`,
    transformOrigin,
  }
}


// ─── getPrincipleComponent ────────────────────────────────────────────────────
//
// Returns the UI component demo for a given principle. Add cases here as
// Phase 2 components are built. The default renders the Phase 2 placeholder.
//
// drawerOpen / setDrawerOpen are passed for principles that use the Drawer.
// Each principle that needs local UI state receives it from PrincipleCard
// rather than managing its own state, keeping the state lifecycle tied to
// the card's isExpanded / uiMode resets.

function getPrincipleComponent(principleId, drawerOpen, setDrawerOpen) {
  switch (principleId) {
    case 1:
      return (
        <div className={styles.demoArea}>
          <Button>Press me</Button>
        </div>
      )
    case 2:
      return (
        <div className={styles.drawerDemo}>
          <button
            className={styles.drawerTrigger}
            onClick={() => setDrawerOpen(true)}
          >
            Open drawer
          </button>
          <Drawer
            scoped
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Anticipation"
          >
            The drawer dips slightly downward before sliding up. That small
            reverse motion is anticipation — preparing the eye for arrival.
          </Drawer>
        </div>
      )
    default:
      return (
        <div className={styles.demoArea}>
          <span className={styles.demoAreaText}>
            Component example coming in Phase 2
          </span>
        </div>
      )
  }
}

// ─── QuoteBlock ───────────────────────────────────────────────────────────────
//
// Renders the quote, attribution, and token row below the expanded card's main
// content area.
//
// When isStable is false (card is entering or exiting), content renders as plain
// elements — no inner animations. When isStable is true (card fully expanded),
// AnimatePresence activates and crossfades on uiMode toggle.

function QuoteBlock({ principle, uiMode, isStable, tokens: motionTokens }) {
  const quote = uiMode ? principle.componentQuote : principle.animationQuote
  const attribution = uiMode
    ? principle.componentQuoteAttribution
    : principle.animationQuoteAttribution

  return (
    <div className={styles.quoteBlock}>
      {isStable ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={uiMode ? 'component' : 'animation'}
            className={styles.quoteContent}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.standard }}
          >
            <p className={styles.quoteText}>{quote}</p>
            {attribution && (
              <p className={styles.quoteAttribution}>— {attribution}</p>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className={styles.quoteContent}>
          <p className={styles.quoteText}>{quote}</p>
          {attribution && (
            <p className={styles.quoteAttribution}>— {attribution}</p>
          )}
        </div>
      )}

      {isStable ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={uiMode ? 'ui-tokens' : 'anim-tokens'}
            className={styles.tokenRow}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease.enter }}
          >
            {principle.tokens}
          </motion.p>
        </AnimatePresence>
      ) : (
        <p className={styles.tokenRow}>{principle.tokens}</p>
      )}
    </div>
  )
}

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
//   OPEN      isExpanded=true, isStable=true. Inner AnimatePresence
//             crossfades on uiMode toggle are gated by isStable.
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
// Both directions use duration.slow + ease.standard. Spring is reserved for
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
  // The ratio targets are derived from the rendered bounding rect rather
  // than the GRID_ROW_HEIGHT formula. At wide widths the rect equals the
  // 2×2 footprint dims, so the ratio matches the formula exactly. At
  // stacked widths (@container library < 600px in PrincipleCard.module.css)
  // the card grows vertically beyond the 2×2 footprint to fit content;
  // the rect captures that growth, and the close animation lands precisely
  // on the single-cell target. scaleX/Y are at 1 at this moment (initial
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
    // so the rect captures the card's natural rendered size — including any
    // vertical growth at stacked widths.
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
      whileHover={isExpanded || !supportsHover ? undefined : { scale: tokens.scale.subtle }}
      transition={{
        opacity: { duration: dur.base },
        duration: dur.fast,
        ease: tokens.ease.spring,
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
            <PrincipleIcon principleId={principle.id} />
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
            <div className={styles.expandedContent}>
              {/* motion.button: whileTap spring is intentional — single-element
                  micro-interaction isolated from the layout animation. */}
              <motion.button
                className={styles.closeButton}
                onClick={handleClose}
                whileTap={{ scale: tokens.scale.subtle }}
                transition={{ duration: dur.fast, ease: tokens.ease.spring }}
              >
                ×
              </motion.button>

              {/* Left half: animation and UI component as continuously mounted
                  siblings. PrincipleAnimation stays mounted for the entire
                  expanded lifetime of the card. The Rive instance initializes
                  once on card expand and persists through uiMode toggles.

                  Crossfade between the two states is driven by direct opacity
                  animation on each sibling. pointerEvents prevents the invisible
                  layer from intercepting clicks intended for the visible layer. */}
              <div className={styles.animationHalf}>
                <div className={styles.animationStateWrapper}>
                  <motion.div
                    className={styles.animationState}
                    animate={{ opacity: uiMode ? 0 : 1 }}
                    transition={{ duration: dur.fast, ease: tokens.ease.enter }}
                    style={{ pointerEvents: uiMode ? 'none' : 'auto' }}
                  >
                    <PrincipleAnimation principleId={principle.id} />
                  </motion.div>
                  <motion.div
                    className={styles.animationState}
                    animate={{ opacity: uiMode ? 1 : 0 }}
                    transition={{ duration: dur.fast, ease: tokens.ease.enter }}
                    style={{ pointerEvents: uiMode ? 'auto' : 'none' }}
                  >
                    {getPrincipleComponent(principle.id, drawerOpen, setDrawerOpen)}
                  </motion.div>
                </div>
              </div>

              {/* Right half: meta, title, crossfading summary, toggle. */}
              <div className={styles.contentHalf}>
                <div className={styles.expandedMeta}>
                  <span className={styles.expandedNumber}>
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

                <h2 className={styles.expandedTitle}>{principle.title}</h2>

                {/* Summary crossfades on uiMode toggle only when isStable. */}
                {isStable ? (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={uiMode ? 'component' : 'principle'}
                      className={styles.expandedSummary}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: dur.fast, ease: tokens.ease.enter }}
                    >
                      {uiMode ? principle.componentSummary : principle.summary}
                    </motion.p>
                  </AnimatePresence>
                ) : (
                  <p className={styles.expandedSummary}>
                    {uiMode ? principle.componentSummary : principle.summary}
                  </p>
                )}

                <button className={styles.stateToggle} onClick={handleStateToggle}>
                  {uiMode ? 'See it in motion' : 'See it in UI'}
                </button>
              </div>
            </div>

            <QuoteBlock principle={principle} uiMode={uiMode} isStable={isStable} tokens={tokens} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
