import { motion } from 'framer-motion'
import { PrincipleAnimation } from '../PrincipleAnimation'
// Principle demos. Each lives in its own folder under src/principles/* with a
// co-located CSS module. See docs/principles/conventions.md.
import { SquashAndStretch } from '../../principles/SquashAndStretch'
import { Anticipation } from '../../principles/Anticipation'
import { Staging } from '../../principles/Staging'
import { StraightAhead } from '../../principles/StraightAhead'
import { FollowThrough } from '../../principles/FollowThrough'
import { SlowInSlowOut } from '../../principles/SlowInSlowOut'
import { Arcs } from '../../principles/Arcs'
import { SecondaryAction } from '../../principles/SecondaryAction'
import { Timing } from '../../principles/Timing'
import { Exaggeration } from '../../principles/Exaggeration'
import { SolidDrawing } from '../../principles/SolidDrawing'
import { Appeal } from '../../principles/Appeal'
import { Systematization } from '../../principles/Systematization'
import { HierarchyOfMotion } from '../../principles/HierarchyOfMotion'
import { Economy } from '../../principles/Economy'
import { TokenFidelity } from '../../principles/TokenFidelity'
import { ReducedMotion } from '../../principles/ReducedMotion'
import { SharedVocabulary } from '../../principles/SharedVocabulary'
import { DemoMotionGate, DemoMotionControl } from '../DemoMotionGate'
import { QuoteBlock } from './QuoteBlock'
import styles from './PrincipleCard.module.css'

// ─── ExpandedPrincipleBody ────────────────────────────────────────────────────
//
// The inside of an expanded principle: the × close, the animation/UI crossfade
// (left), the meta/title/summary/toggle stack (right), and the QuoteBlock below.
// Extracted from PrincipleCard so two surfaces can render the SAME markup:
//
//   1. The in-grid expanded card (PrincipleCard), where this sits inside the
//      scale/footprint machinery that grows and shrinks the card.
//   2. The deep-link modal (PrinciplesLibrary), where it sits at the card's own
//      fixed 372×480 dimensions inside a dialog.
//
// It is deliberately presentational: it owns no state. Both callers pass in
// uiMode / drawerOpen / showDemoMotion and their setters, so each surface keeps
// its state where its own reset logic already lives (the card resets on collapse;
// the modal resets on unmount). That is why the extraction changes no in-grid
// behavior — the JSX moved, the state did not.
//
// The reduced-motion gate (PrincipleAnimation `paused`, the DemoMotionGate token
// scope, and the DemoMotionControl "View motion" button) is part of this markup,
// so it carries into the modal unchanged.

// P17 Reduced Motion is the one demo DemoMotionGate's token scope must not
// wrap: its own Reduce toggle already governs its demo, and a provider above
// it would break its raw-token read (useMotionTokens ignores the
// respectReducedMotion option when a provider is in scope). The View motion
// control still renders on P17 and still governs its Rive animation layer; only
// the UI demo's tokens are exempt. See
// docs/decisions/reduced-motion-2026-05-06.md (2026-07-17 addendum).
const REDUCED_MOTION_PRINCIPLE_ID = 17

// ─── getPrincipleComponent ────────────────────────────────────────────────────
//
// Routing table: maps a principle id to its demo component in src/principles/*.
// Each demo is self-contained and reads the token system itself. The body only
// supplies the two pieces of state it threads:
//   - drawerOpen / setDrawerOpen → Anticipation (P02), whose drawer resets in
//     lockstep with the card's collapse and Motion/UI toggle.
//   - uiMode → Slow In & Slow Out (P06), which flashes the "Tokens" title the
//     moment the UI (component) view becomes visible.
// Every other demo manages its own internal state, which resets naturally when
// the demo unmounts on card collapse (or modal close).
function getPrincipleComponent(principleId, drawerOpen, setDrawerOpen, uiMode) {
  switch (principleId) {
    case 1:  return <SquashAndStretch />
    case 2:  return <Anticipation drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />
    case 3:  return <Staging />
    case 4:  return <StraightAhead />
    case 5:  return <FollowThrough />
    case 6:  return <SlowInSlowOut uiMode={uiMode} />
    case 7:  return <Arcs />
    case 8:  return <SecondaryAction />
    case 9:  return <Timing />
    case 10: return <Exaggeration />
    case 11: return <SolidDrawing />
    case 12: return <Appeal />
    case 13: return <Systematization />
    case 14: return <HierarchyOfMotion />
    case 15: return <Economy />
    case 16: return <TokenFidelity />
    case 17: return <ReducedMotion />
    case 18: return <SharedVocabulary />
    default:
      // Defensive fallback for a principleId outside 1-18. Unreachable today
      // (all 18 have demos), kept so an out-of-range id degrades to a quiet
      // message rather than a blank panel.
      return (
        <div className={styles.demoArea}>
          <span className={styles.demoAreaText}>
            No component demo for this principle.
          </span>
        </div>
      )
  }
}

export function ExpandedPrincipleBody({
  principle,
  tokens,
  prefersReducedMotion,
  uiMode,
  onToggleState,
  drawerOpen,
  setDrawerOpen,
  showDemoMotion,
  setShowDemoMotion,
  onClose,
  // The third frame (the case-study principle embed) has nothing to close:
  // it is the whole document inside an iframe. It hides the × instead of
  // passing a dead onClose, so the button never renders unreachable.
  hideClose = false,
}) {
  // Drop the body's own transition durations to 0 under prefers-reduced-motion,
  // the same shape PrincipleCard uses for its card-level animations. Computed
  // here so the body is self-sufficient: both callers pass tokens +
  // prefersReducedMotion and nothing else timing-related.
  const dur = {
    slow: prefersReducedMotion ? 0 : tokens.duration.slow,
    base: prefersReducedMotion ? 0 : tokens.duration.base,
    fast: prefersReducedMotion ? 0 : tokens.duration.fast,
  }

  return (
    <>
      <div className={styles.expandedContent}>
        {/* motion.button: whileTap spring is intentional — single-element
            micro-interaction isolated from the layout animation. */}
        {!hideClose && (
          <motion.button
            className={styles.closeButton}
            onClick={onClose}
            whileTap={{ scale: tokens.scale.pressSubtle }}
            transition={{ duration: dur.fast, ease: tokens.ease.overshoot }}
            aria-label="Close"
          >
            ×
          </motion.button>
        )}

        {/* Left half: animation and UI component as continuously mounted
            siblings. PrincipleAnimation stays mounted for the entire expanded
            lifetime. Crossfade between the two states is driven by direct
            opacity animation on each sibling. pointerEvents prevents the
            invisible layer from intercepting clicks. */}
        <div className={styles.animationHalf}>
          <div className={styles.animationStateWrapper}>
            <motion.div
              className={styles.animationState}
              animate={{ opacity: uiMode ? 0 : 1 }}
              transition={{ duration: dur.fast, ease: tokens.ease.enter }}
              style={{ pointerEvents: uiMode ? 'none' : 'auto' }}
            >
              {/* Under OS reduce-motion the Rive layer holds still until the
                  View motion control (below) is toggled on. */}
              <PrincipleAnimation
                principleId={principle.id}
                paused={prefersReducedMotion && !showDemoMotion}
              />
            </motion.div>
            <motion.div
              className={styles.animationState}
              animate={{ opacity: uiMode ? 1 : 0 }}
              transition={{ duration: dur.fast, ease: tokens.ease.enter }}
              style={{ pointerEvents: uiMode ? 'auto' : 'none' }}
            >
              {/* The same showDemoMotion boolean governs the UI demo's tokens
                  through the gate. P17 is exempt from the token scope only (its
                  own Reduce toggle owns its demo); the control below still
                  governs its Rive layer. */}
              {principle.id === REDUCED_MOTION_PRINCIPLE_ID ? (
                getPrincipleComponent(principle.id, drawerOpen, setDrawerOpen, uiMode)
              ) : (
                <DemoMotionGate on={showDemoMotion}>
                  {getPrincipleComponent(principle.id, drawerOpen, setDrawerOpen, uiMode)}
                </DemoMotionGate>
              )}
            </motion.div>
          </div>
          {/* Below the crossfade wrapper, not inside a layer: the control must
              be reachable in BOTH views. Renders only under OS reduce-motion. */}
          {prefersReducedMotion && (
            <DemoMotionControl on={showDemoMotion} onChange={setShowDemoMotion} />
          )}
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

          {/* Stack-grid: both summaries render at the same grid cell,
              opacity-crossfaded on uiMode change. Pins height at the taller of
              the two states so the toggle below does not jump vertically. */}
          <div className={styles.summaryStack}>
            <motion.p
              className={styles.expandedSummary}
              animate={{ opacity: uiMode ? 0 : 1 }}
              transition={{ duration: dur.fast, ease: tokens.ease.enter }}
              aria-hidden={uiMode}
            >
              {principle.summary}
            </motion.p>
            <motion.p
              className={styles.expandedSummary}
              animate={{ opacity: uiMode ? 1 : 0 }}
              transition={{ duration: dur.fast, ease: tokens.ease.enter }}
              aria-hidden={!uiMode}
            >
              {principle.componentSummary}
            </motion.p>
          </div>

          <button className={styles.stateToggle} onClick={onToggleState}>
            {uiMode ? 'Motion' : 'UI'}
          </button>
        </div>
      </div>

      <QuoteBlock principle={principle} uiMode={uiMode} tokens={tokens} />
    </>
  )
}
