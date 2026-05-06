import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate } from 'framer-motion'
import { PrincipleAnimation } from '../PrincipleAnimation'
import { PrincipleIcon } from '../PrincipleIcon'
import { Button } from '../Button'
import { Drawer } from '../Drawer'
import { Carousel } from '../Carousel'
import { ProgressBar } from '../ProgressBar'
import { Dropdown } from '../Dropdown'
import { Toggle } from '../Toggle'
import { Card } from '../Card'
import { Stepper } from '../Stepper'
import { NotificationBadge } from '../NotificationBadge'
import { Modal } from '../Modal'
import { Tooltip } from '../Tooltip'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { BUILT_IN_PRESETS, stateToTokens } from '../../data/motionPresets'
import { MotionTokensProvider, reduceMotion } from '../../context/MotionTokensContext'
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


// ProgressBar is presentational and accepts `value` from its parent. The demo
// owns the value so the user can trigger fill and reset and see ease.standard
// vs ease.exit applied to the same fill. Declared at module scope so React
// does not treat it as a new component on every render of getPrincipleComponent.
//
// showLabel={false} because the principle is about acceleration and
// deceleration of the fill, not the numeric percentage. The bar is the
// signal here.
function ProgressBarDemo() {
  const [value, setValue] = useState(0)
  const filled = value > 0
  return (
    <div className={styles.progressDemo}>
      <ProgressBar value={value} showLabel={false} />
      <div className={styles.progressDemoButtonRow}>
        <Button onClick={() => setValue(filled ? 0 : 100)}>
          {filled ? 'Reset' : 'Fill'}
        </Button>
      </div>
    </div>
  )
}

// Pre-resolved token shapes for the two presets used by the Timing demo. We
// resolve once at module load (not per render) because BUILT_IN_PRESETS is
// static and stateToTokens is a pure transform. find() returns the matching
// preset object; we feed its `state` to stateToTokens to get the React-shape
// tokens that MotionTokensProvider expects.
const DEFAULT_TOKENS = stateToTokens(
  BUILT_IN_PRESETS.find(p => p.id === 'default').state
)
const CINEMATIC_TOKENS = stateToTokens(
  BUILT_IN_PRESETS.find(p => p.id === 'cinematic').state
)

// One Toggle scoped to a specific preset's motion tokens. Toggle owns its own
// on/off state internally; we mirror it here via onChange so the adjacent
// label can display "On" / "Off" reactively. The duplication is harmless: the
// two booleans only ever flip together because the parent never sets state
// except in response to the Toggle's onChange.
function TogglePresetSlot({ presetLabel, presetTokens }) {
  const [on, setOn] = useState(false)
  return (
    // respectReducedMotion={false}: this slot exists to demonstrate a preset's
    // motion personality. Flattening it under OS reduce-motion would erase the
    // distinction between Default and Cinematic and defeat the demo.
    <MotionTokensProvider tokens={presetTokens} respectReducedMotion={false}>
      <div className={styles.timingRow}>
        <span className={styles.timingPresetLabel}>{presetLabel}</span>
        <Toggle label={on ? 'On' : 'Off'} mode="expressive" onChange={setOn} />
      </div>
    </MotionTokensProvider>
  )
}

// P04 Straight Ahead & Pose to Pose. Single trigger drives both demos:
// the compact Stepper marks the four poses; the ProgressBar fills 0/25/50/
// 75/100 in lockstep. Same advance, two visualizations — pose-to-pose
// above, straight-ahead below. State lives here (controlled Stepper)
// because the principle is the synchrony.
const STRAIGHT_AHEAD_TOTAL = 4

function StraightAheadDemo() {
  const [step, setStep] = useState(0)
  const completed = step >= STRAIGHT_AHEAD_TOTAL
  const progress = (Math.min(step, STRAIGHT_AHEAD_TOTAL) / STRAIGHT_AHEAD_TOTAL) * 100

  function onClick() {
    setStep(s => (s >= STRAIGHT_AHEAD_TOTAL ? 0 : s + 1))
  }

  return (
    <div className={styles.straightAheadDemo}>
      <Stepper compact currentStep={step} />
      <ProgressBar value={progress} showLabel={false} />
      <div className={styles.straightAheadButtonRow}>
        <Button onClick={onClick}>{completed ? 'Reset' : 'Next'}</Button>
      </div>
    </div>
  )
}

// P12 Appeal. 2x2 grid of compact Cards. The grid drifts continuously when
// nothing is selected; selecting any card freezes the drift and dims the
// unselected siblings (scale.subtle + opacity 0.55) — the "spotlight narrows"
// composition. All four classic motion tokens read together: duration.slower
// drives the drift cycle, duration.base drives the settle/dim/lift, ease.standard
// smooths the neutral states, ease.spring marks selection. "All tokens in concert"
// is then literal in the demo, not just label.
//
// Card itself owns scale + opacity via the new isSelected/dimmed props; the
// motion.div wrapper owns the y-drift. Two motion components, two
// responsibilities — they compose without fighting because they animate
// different properties.
// ASCII faces stand in for "shapes" — small characters that are unmistakably
// distinct from one another so the spotlight composition reads at a glance.
// Each face is its own identity; no tag or description is needed beneath.
const APPEAL_CARDS = [
  { id: 'a', title: '(ﾟ∩ﾟ)'   },
  { id: 'b', title: '(• ε •)' },
  { id: 'c', title: 'ʕ•̮͡•ʔ'   },
  { id: 'd', title: '(´°ω°`)' },
]

// Per-card phase delays for the drift loop. Picked by ear so the four cards
// never sync — the grid breathes as a system, not a metronome. Values are in
// seconds, distributed unevenly across the cycle.
const DRIFT_PHASES = [0, 1.1, 2.2, 0.6]

function AppealDemo() {
  const tokens = useMotionTokens()
  const [selected, setSelected] = useState(() => new Set())
  const anySelected = selected.size > 0

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Drift cycle uses tokens.duration.slower (600 ms) as the base unit, scaled
  // up so the loop reads ambient (~5 s end to end). Fast drift would feel
  // anxious; slow drift feels like a system at rest.
  const driftDuration = tokens.duration.slower * 8

  return (
    <div className={styles.appealDemo}>
      <div className={styles.appealGrid}>
        {APPEAL_CARDS.map((card, i) => {
          const isSelected = selected.has(card.id)
          return (
            <motion.div
              key={card.id}
              className={styles.appealCardWrapper}
              animate={anySelected ? { y: 0 } : { y: [0, -3, 0, 3, 0] }}
              transition={
                anySelected
                  ? { duration: tokens.duration.base, ease: tokens.ease.standard }
                  : {
                      duration: driftDuration,
                      times: [0, 0.25, 0.5, 0.75, 1],
                      repeat: Infinity,
                      ease: tokens.ease.standard,
                      delay: DRIFT_PHASES[i],
                    }
              }
            >
              <Card
                className={styles.appealCard}
                title={card.title}
                description=""
                isSelected={isSelected}
                onSelect={() => toggle(card.id)}
                dimmed={anySelected && !isSelected}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// P03 Staging. Scoped Modal inside a position:relative; overflow:hidden
// frame. Open trigger raises the panel; backdrop dims the frame. Local
// state is sufficient — when the card collapses, the wrapper unmounts and
// isOpen resets. Modal handles its own Escape and backdrop-click closes.
function StagingDemo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={styles.modalDemo}>
      <button
        className={styles.drawerTrigger}
        onClick={() => setIsOpen(true)}
      >
        Open modal
      </button>
      <Modal
        scoped
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Discard changes?"
      >
        <p>
          The backdrop dims. The page narrows to one decision.
        </p>
      </Modal>
    </div>
  )
}

// P10 Exaggeration. The badge's overshoot on increment is the alert. Two
// triggers in the narrow demo column: New (climb) and Clear (return to
// rest). Disabling Clear at zero prevents a no-op press from looking like
// nothing happened.
function ExaggerationDemo() {
  const [count, setCount] = useState(0)
  return (
    <div className={styles.exaggerationDemo}>
      <NotificationBadge count={count} label="Inbox" />
      <div className={styles.exaggerationButtonRow}>
        <Button onClick={() => setCount(c => c + 1)}>New</Button>
        <Button onClick={() => setCount(0)}>Clear</Button>
      </div>
    </div>
  )
}

function TimingDemo() {
  return (
    <div className={styles.timingDemo}>
      <TogglePresetSlot presetLabel="Default"   presetTokens={DEFAULT_TOKENS} />
      <TogglePresetSlot presetLabel="Cinematic" presetTokens={CINEMATIC_TOKENS} />
    </div>
  )
}

// P18 Shared Vocabulary. Two stacked tracks, each with a small dot that
// translates the same distance with the same curve. The first track's
// label is the preset's NAME ("Snappy"); the second track's label is the
// same curve's bezier numbers ("0.34, 1.56, 0.64, 1"). Identical motion,
// two descriptions. Click Cycle: the preset advances and the dots replay
// with the new curve. The name is the unit; the numbers are the same
// motion only no one can talk about it.
//
// ── Why hardcoded curves rather than tokens.ease ────────────────────────
// The argument is about NAMING — the canonical link between "Snappy" and
// (0.34, 1.56, 0.64, 1). Reading from tokens.ease would couple the demo
// to whatever preset is currently active in TokenLab; the labels would
// drift away from the canonical vocabulary the principle is teaching.
// Hardcoding keeps the name-to-numbers relationship fixed and the
// vocabulary intact regardless of active preset.
//
// ── Why both dots remount on cycle (key={runId}) ─────────────────────────
// Framer Motion's enter animation only fires on mount. Re-keying both
// dots on Cycle remounts them so the initial → animate transition
// replays at the new curve. Same pattern used by NotificationBadge for
// per-increment overshoot.
const VOCAB_PRESETS = [
  { name: 'Snappy',   curve: [0.34, 1.56, 0.64, 1] },
  { name: 'Standard', curve: [0.4, 0, 0.2, 1] },
  { name: 'Linear',   curve: [0, 0, 1, 1] },
]
const VOCAB_TRAVEL = 80

function VocabularyDemo() {
  const tokens = useMotionTokens()
  const [presetIdx, setPresetIdx] = useState(0)
  const [runId, setRunId] = useState(0)

  const preset = VOCAB_PRESETS[presetIdx]

  // Ping-pong loop: animate forward to VOCAB_TRAVEL, then play in reverse
  // back to 0, repeating forever. The curve applies to interpolation in
  // both directions, so spring overshoot appears at both ends — the dot
  // briefly punches past the left edge on the return trip the same way it
  // punches past the right edge on the way out. The dashed frame is
  // decorative and a small overshoot past it reinforces the springiness.
  const transition = {
    duration: tokens.duration.slow,
    ease: preset.curve,
    repeat: Infinity,
    repeatType: 'reverse',
  }

  function cycle() {
    setPresetIdx(i => (i + 1) % VOCAB_PRESETS.length)
    // Bumping runId remounts both dots so the new curve takes effect
    // immediately rather than at the end of the current loop iteration.
    setRunId(r => r + 1)
  }

  return (
    <div className={styles.vocabDemo}>
      <div className={styles.vocabStack}>
        <div className={styles.vocabBlock}>
          <div className={styles.vocabTrack}>
            <motion.div
              className={styles.vocabDot}
              key={`n-${runId}`}
              initial={{ x: -VOCAB_TRAVEL / 2 }}
              animate={{ x: VOCAB_TRAVEL / 2 }}
              transition={transition}
            />
          </div>
          <span className={styles.vocabName}>{preset.name}</span>
        </div>
        <div className={styles.vocabBlock}>
          <div className={styles.vocabTrack}>
            <motion.div
              className={styles.vocabDot}
              key={`b-${runId}`}
              initial={{ x: -VOCAB_TRAVEL / 2 }}
              animate={{ x: VOCAB_TRAVEL / 2 }}
              transition={transition}
            />
          </div>
          <span className={styles.vocabNumbers}>{preset.curve.join(', ')}</span>
        </div>
      </div>
      <div className={styles.vocabCycleButton}>
        <Button onClick={cycle}>Cycle</Button>
      </div>
    </div>
  )
}

// P17 Reduced Motion. A "Reduce" toggle controls whether the demo's two
// motion components (a Card that lifts, a ProgressBar that fills) animate
// normally or snap instantly. The system meets the user — when reduce is
// on, durations collapse to ~10 ms and every component reading from the
// scoped provider stops moving and starts arriving.
//
// ── Why the demo opts out of OS prefers-reduced-motion ───────────────────
// The provider passes respectReducedMotion={false}, so the demo's local
// toggle is the single source of truth within its scope. This lets users
// see both the "before" and "after" states regardless of their OS setting.
// The rest of the app honors the OS preference automatically — that is
// what the principle's wiring does globally. The demo is the tiny
// exception that proves the rule.
//
// ── Why useMotionTokens is called with respectReducedMotion: false ───────
// The demo needs an unreduced baseline to compute "reduced" from. If the
// hook returned already-flattened tokens (as it does for the rest of the
// app when the OS pref is reduce), the demo's "Full" state would also be
// flat. Reading raw tokens keeps both states meaningful.
//
// Architecture decision: docs/decisions/reduced-motion-2026-05-06.md
function ReducedMotionDemo() {
  const rawTokens = useMotionTokens({ respectReducedMotion: false })
  const [reduced, setReduced] = useState(false)
  const [running, setRunning] = useState(false)

  // Demo-scoped scale.lift override: 1.02 (system default) is too subtle in
  // a small principle frame where the user is meant to perceive the lift's
  // arrival as the system's response. 1.08 exaggerates the lift so the
  // contrast against the reduced state is unambiguous. Same pattern used by
  // P13 SystematizationDemo.
  const baseTokens = reduced ? reduceMotion(rawTokens) : rawTokens
  const tokens = {
    ...baseTokens,
    scale: { ...baseTokens.scale, lift: 1.08 },
  }

  return (
    <MotionTokensProvider tokens={tokens} respectReducedMotion={false}>
      <div className={styles.reducedDemo}>
        <Card
          className={styles.reducedCard}
          title="CARD"
          description=""
          isSelected={running}
        />
        <ProgressBar value={running ? 100 : 0} showLabel={false} />
        <Button onClick={() => setRunning(r => !r)}>
          {running ? 'Reset' : 'Run'}
        </Button>
        <div className={styles.reducedToggleRow}>
          <Toggle
            label="Reduce"
            mode="expressive"
            on={reduced}
            onChange={setReduced}
          />
        </div>
      </div>
    </MotionTokensProvider>
  )
}

// P16 Token Fidelity. Three identical pills stacked vertically. Click Run,
// all three translate the same distance. The top and bottom pills use
// system tokens (duration.base + ease.standard); the middle pill defaults
// to a hardcoded 600 ms linear — a value not in the token set. The middle
// pill arrives much later than its siblings and slides at constant velocity,
// reading as mechanical and out of rhythm. Toggle "Use token" to swap the
// middle pill's transition to the system pair; on the next Run it rejoins
// the others. The motion is showing you a system problem.
//
// ── Why a hardcoded number instead of a different token ─────────────────
// The principle is fidelity to the token system, not "use a faster token."
// The wrong value has to be a literal number to demonstrate the principle's
// argument: hardcoded values drift, token values hold. A different token
// (say duration.slower) would still be a system value and would not embody
// the deviation.
//
// ── Why linear easing for the wrong pill ────────────────────────────────
// Linear easing is the most legible deviation from system shape. Even when
// a fast preset is active and the duration delta narrows, the constant-
// velocity slide of linear remains visibly different from the eased
// neighbors. This keeps the demo's argument intact across presets.
const FIDELITY_TRAVEL = 40
const FIDELITY_OFF_DURATION = 0.6

function FidelityDemo() {
  const tokens = useMotionTokens()
  const [running, setRunning] = useState(false)
  const [fixed, setFixed] = useState(false)

  const systemTransition = {
    duration: tokens.duration.base,
    ease: tokens.ease.standard,
  }
  const offTransition = {
    duration: FIDELITY_OFF_DURATION,
    ease: [0, 0, 1, 1],  // linear
  }
  const middleTransition = fixed ? systemTransition : offTransition

  return (
    <div className={styles.fidelityDemo}>
      <div className={styles.fidelityStack}>
        <motion.div
          className={styles.fidelityPill}
          animate={{ x: running ? FIDELITY_TRAVEL : 0 }}
          transition={systemTransition}
        />
        <motion.div
          className={styles.fidelityPill}
          animate={{ x: running ? FIDELITY_TRAVEL : 0 }}
          transition={middleTransition}
        />
        <motion.div
          className={styles.fidelityPill}
          animate={{ x: running ? FIDELITY_TRAVEL : 0 }}
          transition={systemTransition}
        />
      </div>
      <div className={styles.fidelityControls}>
        <Button onClick={() => setRunning(r => !r)}>
          {running ? 'Reset' : 'Run'}
        </Button>
        <div className={styles.fidelityToggleScale}>
          <Toggle
            mode="expressive"
            label="harmonize"
            on={fixed}
            onChange={setFixed}
          />
        </div>
      </div>
    </div>
  )
}

// P15 Economy. Three horizontal bars stacked vertically. Click "Pan", all
// three translate the same distance, but each layer uses a different
// duration token — slow / base / fast — so the front bar arrives first
// and the back bar arrives last. Three layers, three speeds: the smallest
// set of moves that produces depth. A fourth layer would not add
// information; a single layer would not produce depth at all.
//
// ── Why opacity for depth, not stacking order or shadow ──────────────────
// The bars sit on three rows in a flex column — there is no painter's
// stack to imply distance. Opacity (0.4 / 0.7 / 1.0) does the work
// directly: the dim bar reads as "back", the bright one as "front". This
// is itself the principle in practice — the smallest visual cue that
// communicates the depth relationship.
const ECONOMY_TRAVEL = 40
const ECONOMY_LAYERS = ['slow', 'base', 'fast'] // back → mid → front

function EconomyDemo() {
  const tokens = useMotionTokens()
  const [running, setRunning] = useState(false)

  return (
    <div className={styles.economyDemo}>
      <div className={styles.economyStack}>
        {ECONOMY_LAYERS.map((dur, i) => (
          <motion.div
            key={dur}
            className={`${styles.economyBar} ${styles[`economyBar${i}`]}`}
            animate={{ x: running ? ECONOMY_TRAVEL : 0 }}
            transition={{
              duration: tokens.duration[dur],
              ease: tokens.ease.standard,
            }}
          />
        ))}
      </div>
      <div className={styles.economyButtonRow}>
        <Button onClick={() => setRunning(r => !r)}>
          {running ? 'Reset' : 'Pan'}
        </Button>
      </div>
    </div>
  )
}

// P14 Hierarchy of Motion. Click PARENT, the row translates right; three
// CHILD rows below follow with staggered delays so the cascade reads as
// authority flowing downward. Children are not interactive — only the
// parent has authority to initiate motion in the system. Clicking a child
// would invert the hierarchy and dilute the principle.
//
// ── Why three different delay tokens, not a stagger function ────────────
// delay.short / medium / long are real tokens in the system. Using them
// directly (rather than `delay: i * 50`) makes the demo a literal
// demonstration of how the delay token family is named: short means "the
// first follower," long means "the last." A stagger function would hide
// the token vocabulary that is the principle's argument.
//
// ── Why symmetric cascade on open and close ─────────────────────────────
// Both directions preserve "parent leads, children follow." The principle
// is the directional flow of authority, not enter/exit asymmetry.
const HIERARCHY_TRAVEL = 24
const CHILD_DELAY_KEYS = ['short', 'medium', 'long']

function HierarchyDemo() {
  const tokens = useMotionTokens()
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.hierarchyDemo}>
      <motion.button
        className={styles.hierarchyParent}
        onClick={() => setOpen(o => !o)}
        animate={{ x: open ? HIERARCHY_TRAVEL : 0 }}
        transition={{
          duration: tokens.duration.base,
          ease: tokens.ease.standard,
        }}
      >
        PARENT
      </motion.button>
      {[1, 2, 3].map((n, i) => (
        <motion.div
          key={n}
          className={styles.hierarchyChild}
          animate={{ x: open ? HIERARCHY_TRAVEL : 0 }}
          transition={{
            duration: tokens.duration.base,
            ease: tokens.ease.standard,
            delay: tokens.delay[CHILD_DELAY_KEYS[i]],
          }}
        >
          └ CHILD 0{n}
        </motion.div>
      ))}
    </div>
  )
}

// P13 Systematization. One Tempo slider drives a scoped MotionTokensProvider
// whose duration tokens are scaled by the slider. Three different components
// — Toggle (duration.fast), Card (duration.base), ProgressBar (duration.slow)
// — share a single `running` boolean. Click any of the three triggers, the
// other two follow at their own native token speeds. Drag the slider, every
// component retimes proportionally. The system has one voice.
//
// ── Why scale durations rather than override one token ───────────────────────
// The principle is temporal coherence across a token set, not "components
// using duration.base." Scaling the whole duration family keeps each
// component's natural relationship to the others (fast < base < slow) while
// shifting the shared tempo. Easing and scale tokens stay untouched — this
// principle is about timing, not curve shape.
function SystematizationDemo() {
  const baseTokens = useMotionTokens()
  const [tempo, setTempo] = useState(1)
  const [running, setRunning] = useState(false)

  // Demo-scoped scale.lift override: the system's default lift is 1.02 (a
  // 2 % grow), correct for production but too subtle in a small principle
  // card where the user is being asked to perceive "the system responding".
  // Bumping to 1.08 makes the Card's selected-state animation legible
  // against the surrounding frame without leaving the bounds of the
  // dashed border at this column width.
  const tokens = useMemo(() => ({
    ...baseTokens,
    duration: {
      fast:   baseTokens.duration.fast   * tempo,
      base:   baseTokens.duration.base   * tempo,
      slow:   baseTokens.duration.slow   * tempo,
      slower: baseTokens.duration.slower * tempo,
    },
    scale: {
      ...baseTokens.scale,
      lift: 1.08,
    },
  }), [baseTokens, tempo])

  return (
    // respectReducedMotion={false}: the Tempo slider needs to drive visible
    // change across the three demo components. Flattening would freeze the
    // demo and obscure the principle.
    <MotionTokensProvider tokens={tokens} respectReducedMotion={false}>
      <div className={styles.systemDemo}>
        <label className={styles.systemSliderRow}>
          <span className={styles.systemSliderLabel}>Tempo</span>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.05"
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
            className={styles.systemSlider}
            aria-label="Demo tempo multiplier"
          />
        </label>
        <Toggle
          mode="expressive"
          label={running ? 'On' : 'Off'}
          on={running}
          onChange={setRunning}
        />
        <Card
          className={styles.systemCard}
          title="CARD 01"
          description=""
          isSelected={running}
          onSelect={setRunning}
        />
        <ProgressBar value={running ? 100 : 0} showLabel={false} />
      </div>
    </MotionTokensProvider>
  )
}

// ─── getPrincipleComponent ────────────────────────────────────────────────────
//
// Returns the UI component demo for a given principle. Add cases here as
// Phase 2 components are built. The default renders the Phase 2 placeholder.
//
// drawerOpen / setDrawerOpen are passed for principles that use the Drawer.
// Each principle that needs local UI state receives it from PrincipleCard
// rather than managing its own state, keeping the state lifecycle tied to
// the card's isExpanded / uiMode resets. Components whose state is purely
// internal (Dropdown, Toggle, Card, Carousel) need no such threading: the
// demo unmounts on card collapse and the component's own useState resets.

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
    case 3:
      return <StagingDemo />
    case 4:
      return <StraightAheadDemo />
    case 5:
      return (
        <div className={styles.carouselDemo}>
          <Carousel compact />
        </div>
      )
    case 7:
      return (
        <div className={styles.tooltipDemo}>
          <Tooltip text="Hello!" />
        </div>
      )
    case 6:
      return <ProgressBarDemo />
    case 8:
      return (
        <div className={styles.dropdownDemo}>
          <Dropdown label="Options" />
        </div>
      )
    case 9:
      return <TimingDemo />
    case 10:
      return <ExaggerationDemo />
    case 11:
      return (
        <div className={styles.cardDemo}>
          <Card
            className={styles.cardDemoCard}
            title="Solid drawing"
            description="Click to lift."
            tag="Demo"
          />
        </div>
      )
    case 12:
      return <AppealDemo />
    case 13:
      return <SystematizationDemo />
    case 14:
      return <HierarchyDemo />
    case 15:
      return <EconomyDemo />
    case 16:
      return <FidelityDemo />
    case 17:
      return <ReducedMotionDemo />
    case 18:
      return <VocabularyDemo />
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
// quoteContent is stack-grided: both motion-state and ui-state versions render
// at the same grid cell, opacity-crossfaded on uiMode change. This pins the
// quoteContent height at max(motion, ui), so the quoteBlock does not jump
// vertically when toggling and the expandedContent above retains its space.
//
// The inner crossfade does not need to be gated by isStable. The expandedWrapper
// itself fades opacity on enter/exit, so during the card's open/close the
// QuoteBlock's children inherit the wrapper's opacity ramp regardless of their
// own animate prop value.
//
// tokenRow is plain — principle.tokens is invariant across motion and ui, so
// the previous AnimatePresence wrapper did no work and is removed.

function QuoteBlock({ principle, uiMode, tokens: motionTokens }) {
  return (
    <div className={styles.quoteBlock}>
      <div className={styles.quoteStack}>
        <motion.div
          className={styles.quoteContent}
          animate={{ opacity: uiMode ? 0 : 1 }}
          transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.standard }}
          style={{ pointerEvents: uiMode ? 'none' : 'auto' }}
          aria-hidden={uiMode}
        >
          <p className={styles.quoteText}>{principle.animationQuote}</p>
          {principle.animationQuoteAttribution && (
            <p className={styles.quoteAttribution}>
              — {principle.animationQuoteAttribution}
            </p>
          )}
        </motion.div>
        <motion.div
          className={styles.quoteContent}
          animate={{ opacity: uiMode ? 1 : 0 }}
          transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.standard }}
          style={{ pointerEvents: uiMode ? 'auto' : 'none' }}
          aria-hidden={!uiMode}
        >
          <p className={styles.quoteText}>{principle.componentQuote}</p>
          {principle.componentQuoteAttribution && (
            <p className={styles.quoteAttribution}>
              — {principle.componentQuoteAttribution}
            </p>
          )}
        </motion.div>
      </div>

      <p className={styles.tokenRow}>{principle.tokens}</p>
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

                {/* Stack-grid: both summaries render at the same grid cell,
                    opacity-crossfaded on uiMode change. Pins height at the
                    taller of the two states so the toggle below does not jump
                    vertically when toggling. The expandedContent column is
                    align-items: flex-start, so any contentHalf overflow falls
                    downward (toward quoteBlock) rather than displacing the
                    badge and title above. */}
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

                <button className={styles.stateToggle} onClick={handleStateToggle}>
                  {uiMode ? 'Motion' : 'UI'}
                </button>
              </div>
            </div>

            <QuoteBlock principle={principle} uiMode={uiMode} tokens={tokens} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
