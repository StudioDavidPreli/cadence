import { useReducer, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { ActiveTokenProvider, useActiveToken, useSetActiveToken } from '../../context/ActiveTokenContext'
import { TitlePulseProvider, useTitlePulse } from '../../context/TitlePulseContext'
import { useNavState } from '../../context/NavigationContext'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { EasingVisualizer } from '../EasingVisualizer'
import { PrinciplesLibrary } from '../PrinciplesLibrary'
import { NavColumn } from '../NavColumn'
import { DemoArea } from '../DemoArea'
import { HeroAnimation } from '../HeroAnimation'
import { RailDrawer } from '../RailDrawer'
import { Button } from '../Button'
import { Card } from '../Card'
import { NavItem } from '../NavItem'
import { Toggle } from '../Toggle'
import { Spinner } from '../Spinner'
import { ProgressBar } from '../ProgressBar'
import { Stepper } from '../Stepper'
import { Drawer } from '../Drawer'
import { Modal } from '../Modal'
import { Tooltip } from '../Tooltip'
import { Dropdown } from '../Dropdown'
import { Carousel } from '../Carousel'
import { NotificationBadge } from '../NotificationBadge'
import {
  EASING_CURVES,
  INITIAL_STATE,
  BUILT_IN_PRESETS,
  stateToTokens,
} from '../../data/motionPresets'
import styles from './TokenLab.module.css'

// ─── Token → Component map ────────────────────────────────────────────────────
// Maps each slider's token key to the component names it affects across all tabs.
// DemoWrapper uses this to highlight or dim groups when a slider is active.
// Empty array means the token has no connected demo component anywhere in the
// tool — the "Token unused by present components." note is shown in all groups.
const TOKEN_COMPONENT_MAP = {
  'duration.fast':    ['Button', 'NavItem', 'Toggle', 'Dropdown', 'Tooltip'],
  'duration.base':    ['Card', 'Drawer', 'Modal', 'Tooltip'],
  'duration.slow':    ['Card', 'ProgressBar', 'Stepper', 'Carousel', 'Notification Badge', 'Modal'],
  'duration.slower':  ['Spinner', 'Stepper'],
  // Each easing slot lights its own consumers when its tab is active in the
  // visualizer. Components that read from CSS variables (--motion-ease-*)
  // OR from the React tokens object (tokens.ease.*) are listed under the
  // slot they reference. A component that touches more than one slot
  // appears in more than one list.
  'easing.standard':  ['Button', 'Card', 'NavItem', 'Toggle'],
  'easing.enter':     ['Drawer', 'Modal', 'Tooltip', 'Stepper', 'Dropdown'],
  'easing.exit':      ['Drawer', 'Modal', 'Stepper', 'Dropdown', 'Notification Badge'],
  'delay.short':      ['Stepper'],
  'delay.medium':     ['Stepper'],
  'delay.long':       ['Stepper'],
  'scale.subtle':     [],
  'scale.base':       ['Button', 'Toggle'],
  'scale.expressive': ['Notification Badge'],
  'scale.lift':       ['Card', 'Carousel'],
}

// EASING_CURVES, INITIAL_STATE, BUILT_IN_PRESETS, and stateToTokens now live
// in src/data/motionPresets.js and are imported above. They were extracted so
// PrincipleCard's Timing demo can read the same preset data without forming
// a circular import (TokenLab → PrinciplesLibrary → PrincipleCard → TokenLab).

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DURATION':
      return { ...state, duration: { ...state.duration, [action.key]: action.value } }
    case 'SET_EASING':
      return {
        ...state,
        easing: { ...state.easing, [action.slot]: action.value },
      }
    case 'SET_DELAY':
      return { ...state, delay: { ...state.delay, [action.key]: action.value } }
    case 'SET_SCALE':
      return { ...state, scale: { ...state.scale, [action.key]: action.value } }
    case 'RESET_TO_DEFAULTS':
      return { ...INITIAL_STATE }
    case 'LOAD_PRESET':
      return { ...action.payload }
    default:
      throw new Error(`TokenLab reducer: unknown action type "${action.type}"`)
  }
}

// ─── CSS bulk write ───────────────────────────────────────────────────────────
// Writes all token values to CSS custom properties in one pass.
// Used by RESET_TO_DEFAULTS and LOAD_PRESET, which change every property at once.
// Single-token changes still go through syncToCss (below) for efficiency.
// Per-slot easing CSS string. Custom curves come in as four-number arrays;
// preset keys map through EASING_CURVES.
function easingCss(slotValue) {
  return Array.isArray(slotValue)
    ? `cubic-bezier(${slotValue.join(', ')})`
    : EASING_CURVES[slotValue].css
}

function writeAllTokensToCss(state) {
  const el = document.documentElement
  el.style.setProperty('--motion-duration-fast',    `${state.duration.fast}ms`)
  el.style.setProperty('--motion-duration-base',    `${state.duration.base}ms`)
  el.style.setProperty('--motion-duration-slow',    `${state.duration.slow}ms`)
  el.style.setProperty('--motion-duration-slower',  `${state.duration.slower}ms`)
  el.style.setProperty('--motion-ease-standard',    easingCss(state.easing.standard))
  el.style.setProperty('--motion-ease-enter',       easingCss(state.easing.enter))
  el.style.setProperty('--motion-ease-exit',        easingCss(state.easing.exit))
  el.style.setProperty('--motion-delay-short',      `${state.delay.short}ms`)
  el.style.setProperty('--motion-delay-medium',     `${state.delay.medium}ms`)
  el.style.setProperty('--motion-delay-long',       `${state.delay.long}ms`)
  el.style.setProperty('--motion-scale-subtle',     `${state.scale.subtle}`)
  el.style.setProperty('--motion-scale-base',       `${state.scale.base}`)
  el.style.setProperty('--motion-scale-expressive', `${state.scale.expressive}`)
  el.style.setProperty('--motion-scale-lift',       `${state.scale.lift}`)
}

// ─── CSS sync (Channel 1) ─────────────────────────────────────────────────────
function syncToCss(action) {
  const el = document.documentElement
  switch (action.type) {
    case 'SET_DURATION':
      el.style.setProperty(`--motion-duration-${action.key}`, `${action.value}ms`)
      break
    case 'SET_EASING':
      el.style.setProperty(`--motion-ease-${action.slot}`, easingCss(action.value))
      break
    case 'SET_DELAY':
      el.style.setProperty(`--motion-delay-${action.key}`, `${action.value}ms`)
      break
    case 'SET_SCALE':
      el.style.setProperty(`--motion-scale-${action.key}`, `${action.value}`)
      break
    case 'RESET_TO_DEFAULTS':
      writeAllTokensToCss(INITIAL_STATE)
      break
    case 'LOAD_PRESET':
      writeAllTokensToCss(action.payload)
      break
    default:
      throw new Error(`syncToCss: unknown action type "${action.type}"`)
  }
}

// stateToTokens (the Channel 2 transform) lives in src/data/motionPresets.js
// alongside the preset data it transforms. Imported above.

// ─── Slider config ────────────────────────────────────────────────────────────
// Constrained ranges teach correct usage — values that produce legible,
// purposeful motion in production contexts.
const DURATION_CONFIG = {
  fast:   { min: 50,  max: 500,  step: 10,  unit: 'ms' },
  base:   { min: 100, max: 800,  step: 10,  unit: 'ms' },
  slow:   { min: 200, max: 1200, step: 25,  unit: 'ms' },
  slower: { min: 400, max: 2000, step: 50,  unit: 'ms' },
}
const DELAY_CONFIG = {
  short:  { min: 0, max: 200, step: 10, unit: 'ms' },
  medium: { min: 0, max: 400, step: 10, unit: 'ms' },
  long:   { min: 0, max: 600, step: 25, unit: 'ms' },
}
const SCALE_CONFIG = {
  subtle:     { min: 0.88, max: 1.00, step: 0.01, unit: '' },
  base:       { min: 0.80, max: 1.00, step: 0.01, unit: '' },
  expressive: { min: 0.70, max: 1.00, step: 0.01, unit: '' },
  lift:       { min: 1.00, max: 1.10, step: 0.01, unit: '' },
}

// Explore ranges — uniform across all tokens within each category.
// The range is intentionally the same for every sub-token: a user setting
// duration.slower to 50ms is previewing what a component looks like if piped
// to duration.fast instead. Semantic labels are constraints, not laws — explore
// mode makes this visible by letting any token occupy any position in the range.
//
// Duration: 0–2000ms, step 10. Delay: 0–2000ms, step 10.
// Scale: 0.5–1.2, step 0.01 (spans squash through lift — full behavioral range).
const DURATION_CONFIG_EXPLORE = {
  fast:   { min: 0, max: 2000, step: 10, unit: 'ms' },
  base:   { min: 0, max: 2000, step: 10, unit: 'ms' },
  slow:   { min: 0, max: 2000, step: 10, unit: 'ms' },
  slower: { min: 0, max: 2000, step: 10, unit: 'ms' },
}
const DELAY_CONFIG_EXPLORE = {
  short:  { min: 0, max: 2000, step: 10, unit: 'ms' },
  medium: { min: 0, max: 2000, step: 10, unit: 'ms' },
  long:   { min: 0, max: 2000, step: 10, unit: 'ms' },
}
// All four scale tokens share the same explore range, including lift (which has
// min: 1.00 in constrained mode). A user setting scale.subtle to 1.15 is
// exploring what a component would look like if its subtle interaction used the
// lift token's value instead — semantic reassignment, not a mistake.
const SCALE_CONFIG_EXPLORE = {
  subtle:     { min: 0.50, max: 1.20, step: 0.01, unit: '' },
  base:       { min: 0.50, max: 1.20, step: 0.01, unit: '' },
  expressive: { min: 0.50, max: 1.20, step: 0.01, unit: '' },
  lift:       { min: 0.50, max: 1.20, step: 0.01, unit: '' },
}

// ─── Preset helpers ───────────────────────────────────────────────────────────
// Slot equality: a slot's value is either a string (preset key) or an array
// (custom curve). Compare strings by identity, arrays element-by-element.
function easingSlotMatches(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return a.join(',') === b.join(',')
  return a === b
}

// statesMatch compares two token states by value across all three easing
// slots and every duration / delay / scale key.
function statesMatch(a, b) {
  for (const slot of ['standard', 'enter', 'exit']) {
    if (!easingSlotMatches(a.easing[slot], b.easing[slot])) return false
  }
  for (const k of ['fast', 'base', 'slow', 'slower']) {
    if (a.duration[k] !== b.duration[k]) return false
  }
  for (const k of ['short', 'medium', 'long']) {
    if (a.delay[k] !== b.delay[k]) return false
  }
  for (const k of ['subtle', 'base', 'expressive', 'lift']) {
    if (a.scale[k] !== b.scale[k]) return false
  }
  return true
}

function getActivePresetId(state, presets) {
  for (const preset of presets) {
    if (statesMatch(state, preset.state)) return preset.id
  }
  return null
}

// Migrate a preset's `state.easing` from the old single-value shape to the
// three-slot object shape. Older user presets persisted to localStorage
// hold either a string preset key or a four-number array on `state.easing`;
// we normalize those into `{ standard: <old>, enter: 'enter', exit: 'exit' }`
// so the reducer and visualizer can read uniformly. Already-new presets
// pass through unchanged.
function migratePresetEasing(preset) {
  const easing = preset?.state?.easing
  const isOldShape = typeof easing === 'string' || Array.isArray(easing)
  if (!isOldShape) return preset
  return {
    ...preset,
    state: {
      ...preset.state,
      easing: { standard: easing, enter: 'enter', exit: 'exit' },
    },
  }
}

// Auto-generates a compact token summary for user preset tooltips.
// Named easing keeps it readable; custom curves fall back to "custom".
// The standard slot leads in the label because it's the most visible curve
// across the system; users tuning enter/exit specifically can still read
// the visualizer for their per-slot values.
function generatePresetTooltip(state) {
  const standardLabel = Array.isArray(state.easing.standard)
    ? 'custom'
    : state.easing.standard
  return `fast ${state.duration.fast}ms · base ${state.duration.base}ms · ${standardLabel} easing`
}

// ─── HoverTip ────────────────────────────────────────────────────────────────
// 400ms hover delay prevents tips from firing on accidental pass-throughs.
// AnimatePresence fades the panel in/out. Distinct from the Tooltip component
// imported from `../Tooltip` — that one demonstrates Arc with a click trigger
// and an arcing entrance. HoverTip is the local TokenLab helper for preset
// labels and mode explanations.
//
// Why createPortal:
// .controls has overflow-y: auto, which establishes a stacking context that
// clips absolutely-positioned descendants at the column boundary. A tip
// anchored inside this column is cut off the moment it extends past the edge.
// createPortal appends the tip to document.body, outside the clipping
// ancestor entirely. Position is calculated from getBoundingClientRect() at
// hover time and expressed as fixed coordinates so it lands correctly
// regardless of scroll or nesting.
function HoverTip({ text, children }) {
  const [visible, setVisible]  = useState(false)
  const [coords, setCoords]    = useState({ top: 0, right: 0 })
  const wrapperRef = useRef(null)
  const timerRef   = useRef(null)

  function handleEnter() {
    timerRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        setCoords({
          // Position below the trigger with an 8px gap
          top:   rect.bottom + 8,
          // Right-align to the trigger's right edge, expressed as distance from
          // the viewport's right edge so the tooltip doesn't overflow leftward
          right: window.innerWidth - rect.right,
        })
      }
      setVisible(true)
    }, 400)
  }

  function handleLeave() {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <span ref={wrapperRef} className={styles.tooltipWrapper} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.span
              className={styles.tooltip}
              style={{ top: coords.top, right: coords.right }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            >
              {text}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  )
}

// ─── PresetsSection ───────────────────────────────────────────────────────────
// Always-visible (non-collapsible) section above Duration.
//
// Active preset detection is purely derived from rawState — no separate "which
// preset is loaded" state variable. This means the active highlight disappears
// automatically the moment any slider diverges from a preset's values, with no
// extra bookkeeping required.
//
// The save flow is intentionally minimal: show a text input inline rather than
// opening a modal or panel. The Escape key cancels without saving.
function PresetsSection({ rawState, allPresets, onLoad, onDelete, onSave }) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName]  = useState('')
  const activePresetId = getActivePresetId(rawState, allPresets)

  function handleSave() {
    const trimmed = saveName.trim()
    if (!trimmed) return
    onSave(trimmed)
    setSaveName('')
    setIsSaving(false)
  }

  return (
    <div className={styles.presetsSection}>
      <div className={styles.presetsSectionLabel}>Presets</div>

      <div className={styles.presetsList}>
        {allPresets.map(preset => (
          <HoverTip key={preset.id} text={preset.tooltip}>
            <button
              className={`${styles.presetItem} ${activePresetId === preset.id ? styles.presetItemActive : ''}`}
              onClick={() => onLoad(preset)}
            >
              {preset.label}
              {/* Built-in presets are not deletable. User presets show a ✕ button.
                  span + stopPropagation instead of nested <button> — <button> inside
                  <button> is invalid HTML; a span with click handler is safe here. */}
              {!preset.isBuiltIn && (
                <span
                  className={styles.presetDelete}
                  onClick={e => { e.stopPropagation(); onDelete(preset.id) }}
                  role="button"
                  aria-label={`Delete ${preset.label}`}
                >
                  ✕
                </span>
              )}
            </button>
          </HoverTip>
        ))}
      </div>

      {/* The save area is only visible when the current state diverges from all
          known presets. This signals clearly that there is something worth naming. */}
      <AnimatePresence initial={false}>
        {!activePresetId && !isSaving && (
          <motion.button
            key="save-btn"
            className={styles.presetSaveButton}
            onClick={() => setIsSaving(true)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            Save preset
          </motion.button>
        )}
        {isSaving && (
          <motion.div
            key="save-input"
            className={styles.presetSaveArea}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            <input
              className={styles.presetSaveInput}
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleSave()
                if (e.key === 'Escape') { setIsSaving(false); setSaveName('') }
              }}
              placeholder="Preset name"
            />
            <button className={styles.presetSaveConfirm} onClick={handleSave}>
              Save
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── SliderRow ────────────────────────────────────────────────────────────────
function SliderRow({ name, value, config, onChange, tokenKey }) {
  const setActiveToken = useSetActiveToken()
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderLabel}>
        <span className={styles.sliderName}>{name}</span>
        <span className={styles.sliderValue}>{value}{config.unit}</span>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onPointerDown={() => setActiveToken(tokenKey)}
        onPointerUp={() => setActiveToken(null)}
      />
    </div>
  )
}

// ─── DemoWrapper ──────────────────────────────────────────────────────────────
// Wraps each demo group. Reads the active token from context and computes
// a highlight/no-demo state by looking up TOKEN_COMPONENT_MAP.
//
// State transitions:
//   idle        — no slider is being dragged. All groups at full opacity.
//   highlighted — this component IS in TOKEN_COMPONENT_MAP[activeToken].
//                 Green outline.
//   no-demo     — this component is NOT in TOKEN_COMPONENT_MAP[activeToken],
//                 regardless of whether other components ARE. The warning
//                 "Token unused by present components." appears below the demo.
//
// Why no 'dimmed' state:
// The previous design dimmed non-matching groups when another group was
// highlighted. This was replaced with per-component warnings because dimming
// a Drawer demo when duration.slow is active on the Enter & Exit tab gave
// no explanation — the user could see something was happening but not why.
// The warning text is more informative. Dimming without explanation is noise.
//
// The warning triggers when this component is not in the affected list —
// not only when the list is globally empty. A token that affects Stepper but
// not Drawer should tell the Drawer: "Token unused by present components."
function DemoWrapper({ componentName, instruction, children }) {
  const activeToken = useActiveToken()

  let state = 'idle'
  if (activeToken !== null) {
    const affected = TOKEN_COMPONENT_MAP[activeToken] ?? []
    if (affected.includes(componentName)) {
      state = 'highlighted'
    } else {
      state = 'no-demo'
    }
  }

  return (
    <div
      className={[
        styles.demoGroup,
        state === 'highlighted' ? styles.demoGroupHighlighted : '',
      ].join(' ')}
    >
      <div className={styles.demoLabel}>{componentName}</div>
      {children}
      {state !== 'no-demo' && instruction && (
        <p className={styles.demoInstruction}>{instruction}</p>
      )}
      {state === 'no-demo' && (
        <p className={styles.noDemoNote}>Token unused by present components.</p>
      )}
    </div>
  )
}

// ─── ControlsTitle ────────────────────────────────────────────────────────────
// The controls panel title. Reads the pulse counter from TitlePulseContext and
// re-plays a one-shot accent pulse whenever it changes. Changing the `key`
// remounts the span so the CSS animation restarts (same key-to-replay pattern
// as Spinner). The pulse class is only applied once pulseId has advanced past
// its initial 0, so the title is static on first load and only pulses when the
// P06 card fires the trigger. The animation reads motion tokens from CSS custom
// properties and is disabled under prefers-reduced-motion (see the stylesheet).
function ControlsTitle() {
  const pulseId = useTitlePulse()
  return (
    <span
      key={pulseId}
      className={`${styles.controlsTitle} ${pulseId > 0 ? styles.controlsTitlePulse : ''}`}
    >
      Tokens
    </span>
  )
}

// ─── DrawerDemo ───────────────────────────────────────────────────────────────
// Manages local open/close state for the Drawer demo in the Enter & Exit tab.
// The Drawer renders position:fixed so it overlays the full viewport — this
// is intentional and demonstrates real production behavior.
function DrawerDemo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DemoWrapper
      componentName="Drawer"
      instruction="Open the drawer — duration.slow enters, duration.base exits"
    >
      <button
        className={styles.demoTrigger}
        onClick={() => setIsOpen(true)}
      >
        Open Drawer
      </button>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Enter & Exit"
      >
        <p>
          This drawer enters with <strong>duration.slow</strong> and{' '}
          <strong>ease.enter</strong> — arrival is deliberate, giving the eye
          time to track the panel before it settles.
        </p>
        <p style={{ marginTop: '12px' }}>
          It exits with <strong>duration.base</strong> and{' '}
          <strong>ease.exit</strong> — departure is quick. The user has already
          decided to close; keeping the panel on screen any longer is friction.
        </p>
        <p style={{ marginTop: '12px' }}>
          Drag the duration sliders to feel the difference between a slow,
          considered entrance and a snappy exit.
        </p>
      </Drawer>
    </DemoWrapper>
  )
}

// ─── ModalDemo ────────────────────────────────────────────────────────────────
// Sits in Enter & Exit between DrawerDemo and Dropdown. Same family of
// motion (panel + backdrop) but a different grammar than Drawer — Modal
// rises from rest at the center instead of sliding from an edge.
function ModalDemo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DemoWrapper
      componentName="Modal"
      instruction="Open the modal. Backdrop fades; panel rises from 0.96 to 1"
    >
      <button
        className={styles.demoTrigger}
        onClick={() => setIsOpen(true)}
      >
        Open Modal
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Discard changes?"
      >
        <p>
          The page narrows to one decision. <strong>duration.slow</strong> with{' '}
          <strong>ease.enter</strong> brings the panel up; the backdrop dims
          underneath. Exit drops to <strong>duration.base</strong> with{' '}
          <strong>ease.exit</strong>. Once you've decided, the system gets out
          of the way.
        </p>
        <p style={{ marginTop: '12px' }}>
          Click the backdrop or press Escape to close.
        </p>
      </Modal>
    </DemoWrapper>
  )
}

// ─── NotificationBadgeDemo ────────────────────────────────────────────────────
// Lives in Press & State next to Toggle and Spinner — a small status indicator
// whose motion is its alert mechanism. Increment fires the badge's compress →
// spring animation. Clear is the symmetric off-ramp that lets the user replay
// the gesture from zero. Local count state because, like ProgressBar's value,
// the count is display data, not a token.
function NotificationBadgeDemo() {
  const [count, setCount] = useState(0)

  return (
    <DemoWrapper
      componentName="Notification Badge"
      instruction="Click New message. The number compresses, climbs past 1, holds, settles"
    >
      <div className={styles.demoRow}>
        <NotificationBadge count={count} label="Inbox" />
        <button
          className={styles.demoTrigger}
          onClick={() => setCount(c => c + 1)}
        >
          New message
        </button>
        <button
          className={styles.demoTrigger}
          onClick={() => setCount(0)}
        >
          Clear
        </button>
      </div>
    </DemoWrapper>
  )
}

// ─── ProgressBarDemo ──────────────────────────────────────────────────────────
// Manages local state for the progress value slider in the Sequence & Progress tab.
//
// Why local state instead of the reducer:
// The reducer owns token values (duration, easing, delay, scale) — things that
// define how the system animates. The progress percentage shown in ProgressBar
// is display data: it represents a position in a process, not an animation
// parameter. Routing it through the reducer would conflate two different kinds
// of state. A user dragging the progress slider is controlling what the component
// shows, not how it animates. Local useState is the correct scope for this.
function ProgressBarDemo() {
  const [value, setValue] = useState(0)

  return (
    <DemoWrapper
      componentName="ProgressBar"
      instruction="Drag the value slider — watch easing change direction on increase vs decrease"
    >
      {/* Demo value control — not a token slider. Uses the same visual style as
          token sliders for consistency, but does NOT dispatch to the reducer.
          Labeled "Progress value" to distinguish it from token controls. */}
      <div className={styles.sliderRow}>
        <div className={styles.sliderLabel}>
          <span className={styles.sliderName}>Progress value</span>
          <span className={styles.sliderValue}>{value}%</span>
        </div>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
        />
      </div>
      <ProgressBar value={value} />
    </DemoWrapper>
  )
}

// ─── EasingSection ────────────────────────────────────────────────────────────
// Three editable curves under one visualizer. The tab strip selects which
// slot the visualizer reads / writes; preset buttons load into that same
// slot. Slot-specific reset target (e.g. resetting the Enter slot returns
// it to 'enter', not 'standard') keeps each slot's "go back to default"
// path matching its own conceptual home.
//
// Active token dispatch is per-slot (`easing.standard`, `easing.enter`,
// `easing.exit`) so the connection highlighting reflects which components
// actually consume each curve — see TOKEN_COMPONENT_MAP.
const EASING_TABS = [
  { id: 'standard', label: 'Standard' },
  { id: 'enter',    label: 'Enter'    },
  { id: 'exit',     label: 'Exit'     },
]

function EasingSection({ rawState, dispatch }) {
  const setActiveToken = useSetActiveToken()
  const [activeSlot, setActiveSlot] = useState('standard')
  const [resetHovered, setResetHovered] = useState(false)

  const slotValue   = rawState.easing[activeSlot]
  const isCustom    = Array.isArray(slotValue)
  const activeCurve = isCustom ? slotValue : EASING_CURVES[slotValue].fm

  function setSlot(value) {
    dispatch({ type: 'SET_EASING', slot: activeSlot, value })
  }

  return (
    <>
      <div className={styles.easingTabs} role="tablist">
        {EASING_TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeSlot === tab.id}
            className={`${styles.easingTab} ${activeSlot === tab.id ? styles.easingTabActive : ''}`}
            onClick={() => setActiveSlot(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {isCustom && (
          <motion.div
            key={`curveValues-${activeSlot}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={styles.curveValues}
          >
            [{activeCurve.map(v => v.toFixed(2)).join(', ')}]
          </motion.div>
        )}
      </AnimatePresence>

      <EasingVisualizer
        curve={activeCurve}
        onCurveChange={curve => setSlot(curve)}
        onDragStart={() => setActiveToken(`easing.${activeSlot}`)}
        onDragEnd={() => setActiveToken(null)}
      />

      <div className={styles.easeGrid}>
        {Object.entries(EASING_CURVES).map(([key, { label }]) => (
          <button
            key={key}
            className={`${styles.easeButton} ${slotValue === key ? styles.easeButtonActive : ''}`}
            onClick={() => setSlot(key)}
          >
            {label}
          </button>
        ))}

        <AnimatePresence initial={false}>
          {isCustom && (
            <motion.button
              key="customButton"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className={`${styles.easeButton} ${styles.easeButtonCustom}`}
              // Reset returns the active slot to its own named default —
              // Standard returns to 'standard', Enter to 'enter', Exit to
              // 'exit'. Each slot's home is the curve that shares its name.
              onClick={() => setSlot(activeSlot)}
              onMouseEnter={() => setResetHovered(true)}
              onMouseLeave={() => setResetHovered(false)}
            >
              {resetHovered ? 'Reset' : 'Custom'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// ─── ControlSection ───────────────────────────────────────────────────────────
function ControlSection({ label, isOpen, onToggle, children }) {
  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={onToggle}>
        {label}
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={label}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.sectionInner}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEMO_NAV_ITEMS = ['Overview', 'Token Lab', 'Principles']

export function TokenLab() {
  const [rawState, rawDispatch] = useReducer(reducer, INITIAL_STATE)
  const [openSections, setOpenSections] = useState(
    new Set(['duration', 'easing', 'scale'])
  )
  // Which Principles filter is active comes from NavigationContext (the nav
  // column owns it). TokenLab only needs it to pass through to PrinciplesLibrary.
  // The destination itself is read by DemoArea, not here.
  const { principleFilter } = useNavState()
  // NavItem demo selection — local to the Press & State category.
  const [activeNav, setActiveNav] = useState('Token Lab')

  // Responsive collapse. The nav column collapses to a rail at ≤1024px; the tool
  // bar (controls) collapses too at ≤720px. Breakpoints mirror the grid media
  // queries in TokenLab.module.css.
  const navCollapsed      = useMediaQuery('(max-width: 1024px)')
  const controlsCollapsed = useMediaQuery('(max-width: 720px)')

  // Which rail's drawer is open: 'tokens' | 'nav' | null. A single value makes
  // the two drawers mutually exclusive — opening one closes the other, which is
  // exactly the requested behavior. Clearing it when its breakpoint passes keeps
  // a drawer from being "open" in a form that no longer renders.
  const [openDrawer, setOpenDrawer] = useState(null)
  useEffect(() => {
    if (!navCollapsed && openDrawer === 'nav') setOpenDrawer(null)
    if (!controlsCollapsed && openDrawer === 'tokens') setOpenDrawer(null)
  }, [navCollapsed, controlsCollapsed, openDrawer])

  const toggleDrawer = id => setOpenDrawer(prev => (prev === id ? null : id))
  const closeDrawer  = () => setOpenDrawer(null)

  // Explore mode: expands slider ranges to 50–2000ms / 0–1000ms / 0.5–1.2.
  // Toggling always resets to defaults first so sliders start within the new range.
  const [exploreMode, setExploreMode] = useState(false)

  // User-saved presets — persisted to localStorage. Built-in presets are defined
  // as a constant; user presets are merged with them at render time.
  const [userPresets, setUserPresets] = useState([])

  // Load any saved user presets on mount. Presets saved before per-slot
  // easing landed have a single value at `state.easing` (string or array);
  // migrate those to the three-slot shape so they don't crash the reducer
  // or render with `state.easing.standard` undefined.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cadence-presets') || '[]')
      if (Array.isArray(stored)) {
        setUserPresets(stored.map(migratePresetEasing))
      }
    } catch (_) { /* ignore corrupt storage */ }
  }, [])

  const allPresets = [...BUILT_IN_PRESETS, ...userPresets]

  // Active config depends on explore mode.
  const durationConfig = exploreMode ? DURATION_CONFIG_EXPLORE : DURATION_CONFIG
  const delayConfig    = exploreMode ? DELAY_CONFIG_EXPLORE    : DELAY_CONFIG
  const scaleConfig    = exploreMode ? SCALE_CONFIG_EXPLORE    : SCALE_CONFIG

  function dispatch(action) {
    syncToCss(action)
    rawDispatch(action)
  }

  function toggleSection(key) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Explore toggle behavior:
  // ON  — expand range limits without resetting values. The Cinematic or Snappy
  //       preset remains loaded; the wider ranges just become reachable.
  // OFF — always reset to Default. This keeps the "toggle off = clean state"
  //       mental model consistent regardless of what was loaded in explore mode.
  // Explore mode removes semantic constraints. A user can set duration.slower
  // to 50ms to preview what a component would look like if piped to
  // duration.fast instead. The token system organizes motion — it doesn't
  // prescribe it. Explore mode makes the organizational layer visible.
  function handleExploreToggle(isOn) {
    setExploreMode(isOn)
    if (!isOn) {
      dispatch({ type: 'RESET_TO_DEFAULTS' })
    }
  }

  function handleLoadPreset(preset) {
    dispatch({ type: 'LOAD_PRESET', payload: preset.state })
  }

  function handleDeletePreset(id) {
    const next = userPresets.filter(p => p.id !== id)
    setUserPresets(next)
    localStorage.setItem('cadence-presets', JSON.stringify(next))
  }

  function handleSavePreset(name) {
    const id      = `user-${Date.now()}`
    const tooltip = generatePresetTooltip(rawState)
    const newPreset = { id, label: name, isBuiltIn: false, tooltip, state: { ...rawState } }
    const next = [...userPresets, newPreset]
    setUserPresets(next)
    localStorage.setItem('cadence-presets', JSON.stringify(next))
  }

  const liveTokens = stateToTokens(rawState)

  // The four Token Lab category demos, keyed by category id. DemoArea renders
  // exactly one based on the navigation destination and freezes the rest. These
  // are React elements (cheap to build); only the active one is mounted. Keys
  // match data/navigation CATEGORIES.
  const categoryContent = {
    'press-state': (
      <div className={styles.demoContent}>
        <DemoWrapper
          componentName="Button"
          instruction="Press to see scale and easing"
        >
          <div className={styles.demoRow}>
            <Button>Press me</Button>
            <Button>Action</Button>
          </div>
        </DemoWrapper>

        <DemoWrapper
          componentName="Card"
          instruction="Click to toggle selected state"
        >
          <div className={styles.demoCards}>
            <Card
              tag="Principle"
              title="Squash & Stretch"
              description="The illusion of weight and flexibility."
              style={{ maxWidth: '220px' }}
            />
            <Card
              title="Timing"
              description="Duration gives weight and personality."
              style={{ maxWidth: '220px' }}
            />
          </div>
        </DemoWrapper>

        <DemoWrapper
          componentName="NavItem"
          instruction="Click to see active transition"
        >
          <div className={styles.demoNavList}>
            {DEMO_NAV_ITEMS.map(item => (
              <NavItem
                key={item}
                label={item}
                isActive={activeNav === item}
                onClick={() => setActiveNav(item)}
              />
            ))}
          </div>
        </DemoWrapper>

        <DemoWrapper
          componentName="Toggle"
          instruction="Toggle to compare subtle vs expressive signaling"
        >
          <div className={styles.demoRow}>
            <Toggle label="Subtle"     mode="subtle" />
            <Toggle label="Expressive" mode="expressive" />
          </div>
        </DemoWrapper>

        <DemoWrapper
          componentName="Spinner"
          instruction="Duration slider controls rotation speed"
        >
          <div className={styles.demoRow}>
            <Spinner size="medium" />
          </div>
        </DemoWrapper>

        <NotificationBadgeDemo />
      </div>
    ),

    'enter-exit': (
      <div className={styles.demoContent}>
        <DrawerDemo />

        <ModalDemo />

        <DemoWrapper
          componentName="Tooltip"
          instruction="Click the ? The bubble arcs into place along a curved path, not a straight line"
        >
          {/* Centered so the bubble has runway on both sides — flush against
              demoContent's left padding the bubble's left half gets clipped
              by the demo layer's overflow. */}
          <div className={styles.tooltipDemoRow}>
            <Tooltip text="Natural motion follows arcs" />
          </div>
        </DemoWrapper>

        <DemoWrapper
          componentName="Dropdown"
          instruction="Open the menu — duration.fast keeps functional UI snappy"
        >
          <div className={styles.demoRow}>
            <Dropdown label="Context Menu" />
          </div>
        </DemoWrapper>
      </div>
    ),

    'sequence-progress': (
      <div className={styles.demoContent}>
        <ProgressBarDemo />

        <DemoWrapper
          componentName="Stepper"
          instruction="Click Next to see the three-beat cascade — delay sliders control the gaps"
        >
          <Stepper />
        </DemoWrapper>
      </div>
    ),

    'gesture': (
      <div className={styles.demoContent}>
        <DemoWrapper
          componentName="Carousel"
          instruction="Drag to advance — flick fast or drag far enough to commit"
        >
          <Carousel />
        </DemoWrapper>
      </div>
    ),
  }

  // The tool bar's inner content, rendered either in the full .controls aside
  // (wide) or inside the "Tokens" RailDrawer (≤720px). The token reducer lives
  // in this component and never unmounts, so token VALUES persist even while the
  // drawer (and thus these sliders) is closed; only transient slider UI state
  // resets when the drawer reopens.
  const controlsContent = (
    <>
      {/* Controls header — title on left, Explore toggle on right.
          The toggle resets all sliders to defaults and expands their ranges.
          Tip fires after 400ms hover delay to avoid accidental activation. */}
      <div className={styles.controlsHeader}>
        <ControlsTitle />
        <HoverTip text="Explore mode removes range limits. Toggle off to return to defaults.">
          <Toggle mode="expressive" label="Explore" onChange={handleExploreToggle} />
        </HoverTip>
      </div>

      {/* Presets — always visible, above the collapsible token sections.
          Active preset is detected by value-comparing rawState against each
          preset's stored state, so no "loaded preset" variable is needed. */}
      <PresetsSection
        rawState={rawState}
        allPresets={allPresets}
        onLoad={handleLoadPreset}
        onDelete={handleDeletePreset}
        onSave={handleSavePreset}
      />

      <ControlSection
        label="Duration"
        isOpen={openSections.has('duration')}
        onToggle={() => toggleSection('duration')}
      >
        {Object.entries(durationConfig).map(([key, config]) => (
          <SliderRow
            key={key}
            name={key}
            value={rawState.duration[key]}
            config={config}
            onChange={value => dispatch({ type: 'SET_DURATION', key, value })}
            tokenKey={`duration.${key}`}
          />
        ))}
      </ControlSection>

      <ControlSection
        label="Easing"
        isOpen={openSections.has('easing')}
        onToggle={() => toggleSection('easing')}
      >
        {/*
          ── Shared Vocabulary ────────────────────────────────────────────
          Named presets exist because design and engineering need a shared
          language. "Use spring easing on the modal" is a complete, precise
          instruction. "Use cubic-bezier(0.34, 1.56, 0.64, 1) on the modal"
          is the same instruction, but opaque to anyone not holding a
          reference sheet.

          Production design systems (Material Design, Primer, Spectrum) all
          name their easing curves for this reason. The names are vocabulary;
          the bezier values are implementation details.

          Dragging the control points above creates a custom curve — valid
          for exploration, but a curve without a name can't be systematized.
          If a custom curve is worth keeping, it should become a named token.
        */}
        <EasingSection rawState={rawState} dispatch={dispatch} />
      </ControlSection>

      <ControlSection
        label="Delay"
        isOpen={openSections.has('delay')}
        onToggle={() => toggleSection('delay')}
      >
        {Object.entries(delayConfig).map(([key, config]) => (
          <SliderRow
            key={key}
            name={key}
            value={rawState.delay[key]}
            config={config}
            onChange={value => dispatch({ type: 'SET_DELAY', key, value })}
            tokenKey={`delay.${key}`}
          />
        ))}
      </ControlSection>

      <ControlSection
        label="Scale"
        isOpen={openSections.has('scale')}
        onToggle={() => toggleSection('scale')}
      >
        {Object.entries(scaleConfig).map(([key, config]) => (
          <SliderRow
            key={key}
            name={key}
            value={rawState.scale[key]}
            config={config}
            onChange={value => dispatch({ type: 'SET_SCALE', key, value })}
            tokenKey={`scale.${key}`}
          />
        ))}
      </ControlSection>
    </>
  )

  return (
    <ActiveTokenProvider>
    <TitlePulseProvider>
    <div className={styles.tokenLab}>

      {/* ── Left column: controls (tool bar) ──────────────────────────── */}
      {/* ≤720px the tool bar collapses into a "Tokens" rail that opens the same
          controls as a drawer, sharing the mutually-exclusive drawer state with
          the nav. Above 720px it is the full always-visible column. */}
      {controlsCollapsed ? (
        <RailDrawer
          label="Tokens"
          drawerId="tokens-drawer"
          open={openDrawer === 'tokens'}
          onToggle={() => toggleDrawer('tokens')}
          onClose={closeDrawer}
        >
          {controlsContent}
        </RailDrawer>
      ) : (
        <aside className={styles.controls}>{controlsContent}</aside>
      )}

      {/* ── Middle column: navigation ─────────────────────────────────── */}
      {/* Outside MotionTokensProvider on purpose: the nav reads no motion
          tokens. Its transitions use the fixed --feedback-nav-duration so
          Explore mode can't collapse them. Collapse + drawer state are owned
          here so the Tokens and Navigation drawers stay mutually exclusive. */}
      <NavColumn
        collapsed={navCollapsed}
        open={openDrawer === 'nav'}
        onToggle={() => toggleDrawer('nav')}
        onClose={closeDrawer}
      />

      {/* ── Right column: demo area ───────────────────────────────────── */}
      {/* MotionTokensProvider wraps only this column — every demo inside
          DemoArea (the category demos and the Principles grid) calls
          useMotionTokens() and receives liveTokens, so the previews respond to
          the token sliders in real time.
          respectReducedMotion={false}: TokenLab is a motion-exploration tool;
          the user is here specifically to perceive motion. Honoring OS-level
          prefers-reduced-motion would flatten every preview to instant and
          defeat the tool's purpose. See docs/decisions/reduced-motion-2026-05-06.md. */}
      <MotionTokensProvider tokens={liveTokens} respectReducedMotion={false}>
        <DemoArea
          categoryContent={categoryContent}
          principlesContent={<PrinciplesLibrary filter={principleFilter} />}
          hero={<HeroAnimation />}
        />
      </MotionTokensProvider>

    </div>
    </TitlePulseProvider>
    </ActiveTokenProvider>
  )
}
