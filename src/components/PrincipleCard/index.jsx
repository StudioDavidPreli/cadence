import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { PrincipleAnimation } from '../PrincipleAnimation'
import { Button } from '../Button'
import { Drawer } from '../Drawer'
import styles from './PrincipleCard.module.css'

// Hover animations only apply to pointer devices. Touch devices have no hover
// state and exposing scale feedback there would be distracting.
const supportsHover =
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

// ─── getExpandedFootprint ─────────────────────────────────────────────────────
//
// Computes the grid-column and grid-row span for an expanded card.
//
// Bias rule (down-right): the expansion extends right and down from the card's
// natural 1-indexed position. Edge cases:
//   - Right edge (col === columnCount): extend left instead of right.
//   - Bottom row (row === totalRows): extend up instead of down.
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

  return {
    gridColumn: `${colStart} / span 2`,
    gridRow:    `${rowStart} / span 2`,
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

// ─── PrincipleCard ────────────────────────────────────────────────────────────
//
// Renders a single principle card in a CSS Grid context. The card occupies one
// grid cell when collapsed and a 2×2 footprint when expanded.
//
// ── Expand ────────────────────────────────────────────────────────────────────
// Framer Motion's layout prop FLIP-animates the card from 1×1 to 2×2. The
// expandedWrapper fades in over duration.slow. isStable gates inner AnimatePresence
// crossfades so they don't fire during the enter animation.
//
// ── Close ─────────────────────────────────────────────────────────────────────
// Also uses FLIP. The footprint inline style clears on the same render that
// isExpanded becomes false, so the FLIP records the correct before/after rects.
// expandedDimensions fixes the wrapper at its measured expanded size during exit
// so the FLIP shrink does not compress the wrapper's flex layout. The card's
// overflow:hidden clips the wrapper progressively as the visual clip shrinks —
// this wipe is mostly imperceptible behind the simultaneous opacity fade.
//
// Both expand and collapse use the same one mechanism. The close animation is
// not a separate scale+translate implementation — it is FLIP running in reverse.
//
// ── Layout animation timing ───────────────────────────────────────────────────
// Layout transitions use duration.slow + ease.standard so all reflowing cards
// arrive together. Spring is reserved for whileHover and whileTap.
// See CLAUDE.md: "ease.standard (not spring) for concurrent layout animations."
//
// ── isStable ─────────────────────────────────────────────────────────────────
// Resets to false on collapse so every expansion starts at State 1 (animation).
//
// ── expandedDimensions ───────────────────────────────────────────────────────
// Measured when isStable first becomes true (card fully settled). During exit,
// these are applied as fixed width/height on the wrapper. Combined with
// `right: auto; bottom: auto` to override the CSS `inset: 0` stretch on those
// axes, the wrapper holds its expanded size while FLIP shrinks the card around it.

export function PrincipleCard({
  principle,
  isExpanded,
  onSelect,
  onClose,
  tokens,
  index,
  columnCount,
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
  // isAnimating: true for duration.slow after any expand/collapse toggle.
  // Prevents collapsed content from appearing during the close animation.
  const [isAnimating, setIsAnimating] = useState(false)
  // Ref mirror of isAnimating used in the click handler — refs don't cause
  // re-renders when read, which avoids unnecessary renders on fast clicks.
  const isAnimatingRef = useRef(false)
  // tokensRef keeps token values readable inside effects without listing tokens
  // as a dependency. Effects that use token values only for timer durations
  // must not re-fire when tokens change — that would trigger spurious close
  // animations on any previously-expanded card every time a preset is selected.
  const tokensRef = useRef(tokens)
  useEffect(() => { tokensRef.current = tokens })

  // Reset interactive state when card collapses.
  useEffect(() => {
    if (!isExpanded) {
      setUiMode(false)
      setDrawerOpen(false)
    }
  }, [isExpanded])

  // On any isExpanded change: block animation, update isStable, clear dimensions.
  // All three share the same duration so they fire in sync.
  useEffect(() => {
    const d = tokensRef.current.duration.slow * 1000

    isAnimatingRef.current = true
    setIsAnimating(true)
    const tUnblock = setTimeout(() => {
      isAnimatingRef.current = false
      setIsAnimating(false)
    }, d)

    // isStable becomes true after expand settles, false after collapse settles.
    const tStable = setTimeout(() => setIsStable(isExpanded), d)

    return () => {
      clearTimeout(tUnblock)
      clearTimeout(tStable)
    }
  }, [isExpanded])

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
    onClose()
  }

  function handleStateToggle(e) {
    e.stopPropagation()
    if (drawerOpen) setDrawerOpen(false)
    setUiMode(prev => !prev)
  }

  // Footprint clears immediately when isExpanded becomes false. FLIP records the
  // before rect (2×2) and after rect (1×1) on the same frame — no holdFootprint needed.
  const footprint = isExpanded ? getExpandedFootprint(index, columnCount, totalCards) : {}

  // isStable keeps zIndex elevated during the collapse animation even though
  // isExpanded is already false. It becomes false only after duration.slow, by
  // which time the FLIP has completed and neighboring cards have reflowed.
  const zIndex = isExpanded || isStable ? 10 : 1

  return (
    <motion.div
      layout
      className={[
        styles.card,
        isExpanded ? styles.cardExpanded : styles.cardCollapsed,
      ].join(' ')}
      style={{ ...footprint, zIndex }}
      animate={{
        opacity: selectedId && !isExpanded ? 0.5 : 1,
      }}
      onClick={handleCardClick}
      whileHover={isExpanded || !supportsHover ? undefined : { scale: tokens.scale.subtle }}
      transition={{
        layout:  { duration: dur.slow, ease: tokens.ease.standard },
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
          <div className={styles.placeholderIcon} />

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

          <h3 className={styles.cardTitle}>{principle.title}</h3>
        </motion.div>
      )}

      {/* ── Expanded state ────────────────────────────────────────────────── */}
      {/* AnimatePresence holds the wrapper through its exit animation so it
          fades out concurrently with the FLIP card shrink. */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded"
            className={styles.expandedWrapper}
            // The wrapper does not have its own layout prop. The card's
            // FLIP corrective transform is the visible scaling motion of
            // the contents. Contents inherit the corrective via CSS
            // transform and scale with the card, anchored at the card's
            // top-left.
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
