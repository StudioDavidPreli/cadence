import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './PrincipleCard.module.css'

// ─── getExpandedFootprint ─────────────────────────────────────────────────────
//
// Computes the grid-column and grid-row span for an expanded card.
//
// Bias rule (down-right): the expansion extends right and down from the card's
// natural 1-indexed position. Edge cases:
//   - Right edge (col === columnCount): extend left instead of right.
//   - Bottom row (row === totalRows): extend up instead of down.
//
// This keeps the 2x2 footprint inside the grid at all positions without
// overflow or empty columns.
//
// Phase 2 hook: this function receives index, columnCount, and totalCards.
// It is the correct place to add neighborhood-relative logic when Phase 2
// card deformation is implemented — expanded card position is already
// available here to compute distance to any given card.

function getExpandedFootprint(index, columnCount, totalCards) {
  const row       = Math.floor(index / columnCount) + 1  // 1-indexed
  const col       = (index % columnCount) + 1            // 1-indexed
  const totalRows = Math.ceil(totalCards / columnCount)

  // Extend right unless at the right edge — then extend left.
  const colStart = col === columnCount ? col - 1 : col
  // Extend down unless at the bottom row — then extend up.
  const rowStart = row === totalRows ? row - 1 : row

  return {
    gridColumn: `${colStart} / span 2`,
    gridRow:    `${rowStart} / span 2`,
  }
}

// ─── PrincipleCard ────────────────────────────────────────────────────────────
//
// Renders a single principle card in a CSS Grid context. The card occupies one
// grid cell when collapsed and a 2x2 footprint when expanded. CSS Grid handles
// all sizing — the card sets no explicit width or height.
//
// ── Why no inline width/height ────────────────────────────────────────────────
// Sizing is owned by the grid. .card has aspect-ratio: 1/1.3, which shapes the
// collapsed card relative to its grid cell width. The expanded card gets
// aspect-ratio: auto so it fills the 2x2 grid area without constraint.
//
// ── Layout animation timing ───────────────────────────────────────────────────
// All layout transitions use duration.slow + ease.standard. ease.standard
// produces coordinated movement — all reflowing cards arrive together.
// Spring is reserved for whileHover (single isolated element). See CLAUDE.md.
//
// ── uiMode state ─────────────────────────────────────────────────────────────
// Resets to false when the card collapses so every expansion starts at
// State 1 (animation context).
//
// ── Bridge text ───────────────────────────────────────────────────────────────
// The bridge text is the core editorial argument of Cadence: the explicit
// connection between animation principle and UI component behavior. Write it
// per principle in Phase 2 with the same care as case study copy. Do not
// generate this automatically.

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
  const [uiMode, setUiMode] = useState(false)

  useEffect(() => {
    if (!isExpanded) setUiMode(false)
  }, [isExpanded])

  function handleCardClick() {
    if (!isExpanded) onSelect()
  }

  function handleClose(e) {
    e.stopPropagation()
    onClose()
  }

  function handleStateToggle(e) {
    e.stopPropagation()
    setUiMode(prev => !prev)
  }

  // Collapsed: no inline style — card takes its natural grid cell.
  // Expanded: explicit gridColumn/gridRow pins the 2x2 footprint at the
  // correct position, accounting for edge bias.
  const footprint = isExpanded
    ? getExpandedFootprint(index, columnCount, totalCards)
    : {}

  return (
    <motion.div
      layout
      className={[
        styles.card,
        isExpanded ? styles.cardExpanded : styles.cardCollapsed,
      ].join(' ')}
      style={footprint}
      // opacity goes through animate (not style) so Framer Motion applies the
      // transition.opacity timing when surrounding cards dim on selection.
      animate={{ opacity: selectedId && !isExpanded ? 0.5 : 1 }}
      onClick={handleCardClick}
      whileHover={isExpanded ? undefined : { scale: tokens.scale.subtle }}
      transition={{
        // layout governs the FLIP animation for all bounding box changes —
        // the expanding card and all siblings reflowing around it.
        // ease.standard: coordinated arrival, all cards land at the same time.
        layout: {
          duration: tokens.duration.slow,
          ease: tokens.ease.standard,
        },
        // opacity: dimming of non-selected cards.
        opacity: { duration: tokens.duration.base },
        // Default governs whileHover scale. ease.spring gives the single-element
        // scale a physical overshoot — appropriate here, not on concurrent layouts.
        duration: tokens.duration.fast,
        ease: tokens.ease.spring,
      }}
    >
      <AnimatePresence initial={false}>
        {isExpanded ? (
          // ── Expanded state ─────────────────────────────────────────────────
          <motion.div
            key="expanded"
            className={styles.expandedContent}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              // exit scale: 0.85 prevents the large expanded title from being
              // visible at full size while the card collapses. The scale
              // compression is timed to match the card's layout shrink animation.
              scale: 0.85,
              transition: {
                duration: tokens.duration.base,
                ease: tokens.ease.exit,
                delay: 0,
              },
            }}
            transition={{
              duration: tokens.duration.fast,
              ease: tokens.ease.enter,
              delay: tokens.delay.short,
            }}
          >
            {/* motion.button: whileTap spring is intentional — single-element
                micro-interaction, overshoot reads as physical responsiveness. */}
            <motion.button
              className={styles.closeButton}
              onClick={handleClose}
              whileTap={{ scale: tokens.scale.subtle }}
              transition={{ duration: tokens.duration.fast, ease: tokens.ease.spring }}
            >
              ×
            </motion.button>

            {/* Left half: AnimatePresence crossfades between animation placeholder
                (State 1) and component demo area (State 2) on uiMode toggle.
                Both states use position:absolute to fill the wrapper so the
                crossfade does not affect surrounding layout. */}
            <div className={styles.animationHalf}>
              <div className={styles.animationStateWrapper}>
                <AnimatePresence initial={false}>
                  {!uiMode ? (
                    <motion.div
                      key="anim"
                      className={styles.animationState}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: tokens.duration.fast, ease: tokens.ease.enter }}
                    >
                      <div className={styles.animationPlaceholder}>
                        <span className={styles.animationPlaceholderText}>
                          Animation placeholder
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ui"
                      className={styles.animationState}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: tokens.duration.fast, ease: tokens.ease.enter }}
                    >
                      <div className={styles.demoArea}>
                        <span className={styles.demoAreaText}>
                          Component example coming in Phase 2
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right half: principle info is always visible. Bridge text area
                below the toggle crossfades between animation context (State 1)
                and bridge text (State 2). Both sides switch on the same boolean. */}
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
              <p className={styles.expandedSummary}>{principle.summary}</p>

              {/* uiMode: false = State 1 (animation context), label "See it in UI"
                  uiMode: true  = State 2 (UI component),       label "See it in motion" */}
              <button className={styles.stateToggle} onClick={handleStateToggle}>
                {uiMode ? 'See it in motion' : 'See it in UI'}
              </button>

              <AnimatePresence initial={false}>
                {uiMode ? (
                  <motion.div
                    key="bridge"
                    className={styles.bridgeArea}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: tokens.duration.fast, ease: tokens.ease.enter }}
                  >
                    <span className={styles.bridgeAreaText}>
                      Bridge text coming in Phase 2
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="context"
                    className={styles.bridgeArea}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: tokens.duration.fast, ease: tokens.ease.enter }}
                  >
                    <span className={styles.bridgeAreaText}>
                      Animation context coming in Phase 2
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          // ── Collapsed state ─────────────────────────────────────────────────
          <motion.div
            key="collapsed"
            className={styles.collapsedContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: {
                duration: tokens.duration.fast,
                ease: tokens.ease.exit,
              },
            }}
            transition={{
              duration: tokens.duration.fast,
              ease: tokens.ease.enter,
              // Wait for 80% of the layout shrink (duration.slow) before fading
              // collapsed content in — prevents it from appearing in a still-large
              // card while the layout animation is still running.
              delay: tokens.duration.slow * 0.8,
            }}
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
      </AnimatePresence>
    </motion.div>
  )
}
