import { useReducer, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { ActiveTokenProvider, useActiveToken, useSetActiveToken } from '../../context/ActiveTokenContext'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { EasingVisualizer } from '../EasingVisualizer'
import { Button } from '../Button'
import { Card } from '../Card'
import { NavItem } from '../NavItem'
import { Toggle } from '../Toggle'
import { Spinner } from '../Spinner'
import { ProgressBar } from '../ProgressBar'
import { Stepper } from '../Stepper'
import { Drawer } from '../Drawer'
import { Dropdown } from '../Dropdown'
import { Carousel } from '../Carousel'
import styles from './TokenLab.module.css'

// ─── Tab definitions ──────────────────────────────────────────────────────────
// Behavior-named tabs group demo components by motion concept rather than by
// component type. "Press & State" is populated now; the others are placeholders
// for future content.
const TABS = [
  { id: 'press-state',       label: 'Press & State' },
  { id: 'enter-exit',        label: 'Enter & Exit' },
  { id: 'sequence-progress', label: 'Sequence & Progress' },
  { id: 'gesture',           label: 'Gesture' },
]

// ─── Token → Component map ────────────────────────────────────────────────────
// Maps each slider's token key to the component names it affects across all tabs.
// DemoWrapper uses this to highlight or dim groups when a slider is active.
// Empty array means the token has no connected demo component anywhere in the
// tool — the "Token unused by present components." note is shown in all groups.
const TOKEN_COMPONENT_MAP = {
  'duration.fast':    ['Button', 'NavItem', 'Toggle', 'Dropdown'],
  'duration.base':    ['Card', 'Drawer'],
  'duration.slow':    ['Card', 'ProgressBar', 'Stepper', 'Carousel'],
  'duration.slower':  ['Spinner', 'Stepper'],
  'easing':           ['Button', 'Card', 'NavItem', 'Toggle'],
  'delay.short':      ['Stepper'],
  'delay.medium':     ['Stepper'],
  'delay.long':       ['Stepper'],
  'scale.subtle':     [],
  'scale.base':       ['Button', 'Toggle'],
  'scale.expressive': [],
  'scale.lift':       ['Card', 'Carousel'],
}

// ─── Easing presets ───────────────────────────────────────────────────────────
const EASING_CURVES = {
  linear:   { label: 'Linear',   css: 'cubic-bezier(0, 0, 1, 1)',           fm: [0, 0, 1, 1] },
  standard: { label: 'Standard', css: 'cubic-bezier(0.4, 0, 0.2, 1)',       fm: [0.4, 0, 0.2, 1] },
  enter:    { label: 'Enter',    css: 'cubic-bezier(0, 0, 0.2, 1)',         fm: [0, 0, 0.2, 1] },
  exit:     { label: 'Exit',     css: 'cubic-bezier(0.4, 0, 1, 1)',         fm: [0.4, 0, 1, 1] },
  spring:   { label: 'Spring',   css: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fm: [0.34, 1.56, 0.64, 1] },
}

// ─── Reducer ─────────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  duration: { fast: 100, base: 200, slow: 400, slower: 600 },
  easing:   'standard',
  delay:    { short: 50, medium: 100, long: 200 },
  scale:    { subtle: 0.98, base: 0.95, expressive: 0.9, lift: 1.02 },
}

// ─── Built-in presets ─────────────────────────────────────────────────────────
// Three presets that demonstrate meaningfully different motion personalities.
// isBuiltIn: true prevents these from being deleted by the user.
// They live here (below INITIAL_STATE) so Default can reference it directly.
const BUILT_IN_PRESETS = [
  {
    id: 'default',
    label: 'Default',
    isBuiltIn: true,
    tooltip: 'These values ship in most design systems without modification. Start here.',
    state: INITIAL_STATE,
  },
  {
    id: 'snappy',
    label: 'Snappy',
    isBuiltIn: true,
    tooltip: 'Short durations, spring easing, tight delays — high energy, confident.',
    state: {
      duration: { fast: 60, base: 120, slow: 200, slower: 350 },
      easing:   'spring',
      delay:    { short: 20, medium: 40, long: 80 },
      scale:    { subtle: 0.97, base: 0.93, expressive: 0.87, lift: 1.04 },
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    isBuiltIn: true,
    tooltip: 'Long durations, decelerating easing, generous delays — considered, editorial.',
    state: {
      duration: { fast: 200, base: 500, slow: 900, slower: 1400 },
      easing:   'enter',
      delay:    { short: 100, medium: 200, long: 400 },
      scale:    { subtle: 0.99, base: 0.97, expressive: 0.94, lift: 1.01 },
    },
  },
]

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DURATION':
      return { ...state, duration: { ...state.duration, [action.key]: action.value } }
    case 'SET_EASING':
      return { ...state, easing: action.value }
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
function writeAllTokensToCss(state) {
  const el = document.documentElement
  el.style.setProperty('--motion-duration-fast',    `${state.duration.fast}ms`)
  el.style.setProperty('--motion-duration-base',    `${state.duration.base}ms`)
  el.style.setProperty('--motion-duration-slow',    `${state.duration.slow}ms`)
  el.style.setProperty('--motion-duration-slower',  `${state.duration.slower}ms`)
  el.style.setProperty(
    '--motion-ease-standard',
    Array.isArray(state.easing)
      ? `cubic-bezier(${state.easing.join(', ')})`
      : EASING_CURVES[state.easing].css
  )
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
      el.style.setProperty(
        '--motion-ease-standard',
        Array.isArray(action.value)
          ? `cubic-bezier(${action.value.join(', ')})`
          : EASING_CURVES[action.value].css
      )
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

// ─── Token conversion (Channel 2) ────────────────────────────────────────────
function stateToTokens(state) {
  const activeCurve = Array.isArray(state.easing)
    ? state.easing
    : EASING_CURVES[state.easing].fm

  return {
    duration: {
      fast:   state.duration.fast   / 1000,
      base:   state.duration.base   / 1000,
      slow:   state.duration.slow   / 1000,
      slower: state.duration.slower / 1000,
    },
    ease: {
      linear:   EASING_CURVES.linear.fm,
      standard: activeCurve,
      enter:    EASING_CURVES.enter.fm,
      exit:     EASING_CURVES.exit.fm,
      spring:   EASING_CURVES.spring.fm,
    },
    delay: {
      none:   0,
      short:  state.delay.short  / 1000,
      medium: state.delay.medium / 1000,
      long:   state.delay.long   / 1000,
    },
    scale: { ...state.scale },
  }
}

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
// statesMatch compares two token states by value. Array easings (custom curves)
// are compared element-by-element; named easings by string equality.
function statesMatch(a, b) {
  const easingA = Array.isArray(a.easing) ? a.easing.join(',') : a.easing
  const easingB = Array.isArray(b.easing) ? b.easing.join(',') : b.easing
  if (easingA !== easingB) return false
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

// Auto-generates a compact token summary for user preset tooltips.
// Named easing keeps it readable; custom curves fall back to "custom".
function generatePresetTooltip(state) {
  const easingLabel = Array.isArray(state.easing) ? 'custom' : state.easing
  return `fast ${state.duration.fast}ms · base ${state.duration.base}ms · ${easingLabel} easing`
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
// 400ms hover delay prevents tooltips from firing on accidental pass-throughs.
// AnimatePresence fades the panel in/out.
//
// Why createPortal:
// .controls has overflow-y: auto, which establishes a stacking context that
// clips absolutely-positioned descendants at the column boundary. A tooltip
// anchored inside this column is cut off the moment it extends past the edge.
// createPortal appends the tooltip to document.body, outside the clipping
// ancestor entirely. Position is calculated from getBoundingClientRect() at
// hover time and expressed as fixed coordinates so it lands correctly
// regardless of scroll or nesting.
function Tooltip({ text, children }) {
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
          <Tooltip key={preset.id} text={preset.tooltip}>
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
          </Tooltip>
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

// ─── DemoTabs ─────────────────────────────────────────────────────────────────
// Tab bar with a sliding pill indicator driven by Framer Motion's layoutId.
//
// How layoutId produces the sliding behavior:
// The pill (<motion.span layoutId="tabPill">) only renders inside the active
// tab's button. When the active tab changes, React unmounts the pill from the
// old button and mounts it in the new one. Framer Motion intercepts this —
// it recognises that the same layoutId has appeared in a new DOM position,
// measures both bounding boxes, and animates the element between them using
// a layout transition. No position tracking, no coordinate math, no refs.
// The spring parameters come from the live token values so the tab indicator
// responds to whatever duration.fast and ease.spring the user has dialed in.
//
// DemoTabs renders inside MotionTokensProvider, so useMotionTokens() returns
// the live overrides rather than the CSS-read defaults.
function DemoTabs({ tabs, activeTab, onTabChange }) {
  const tokens = useMotionTokens()

  // LayoutGroup scopes the tabPill layoutId so its FLIP animation does not
  // trigger a global ProjectionNode snapshot. Without this, every tab switch
  // causes Framer Motion to snapshot ALL motion elements in the page —
  // including the PanelSlide motion.div that is in the middle of its
  // opacity: 0 → 1 enter animation. That snapshot can corrupt the animation,
  // leaving the panel stuck at opacity: 0 until page reload.
  return (
    <LayoutGroup id="demo-tabs">
      <nav className={styles.demoTabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={styles.tabButton}
            onClick={() => onTabChange(tab.id)}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId="tabPill"
                className={styles.tabPill}
                transition={{
                  duration: tokens.duration.fast,
                  ease: tokens.ease.spring,
                }}
              />
            )}
            <span className={[
              styles.tabLabel,
              activeTab === tab.id ? styles.tabLabelActive : '',
            ].join(' ')}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </LayoutGroup>
  )
}

// ─── PanelSlide ───────────────────────────────────────────────────────────────
// Each AnimatePresence child must be a separate component so it has its own
// React identity. PanelSlide reads its content from contentMap[tabId] — a ref
// slot that only updates while that tab is active. See TabPanel for why.
function PanelSlide({ tabId, contentMap, tokens }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: tokens.duration.fast,
        ease: tokens.ease.standard,
      }}
      className={styles.tabPanelInner}
    >
      {contentMap.current[tabId]}
    </motion.div>
  )
}

// ─── TabPanel ─────────────────────────────────────────────────────────────────
// Wraps tab content with an AnimatePresence cross-fade.
//
// ── Why the contentMap snapshot pattern ──────────────────────────────────────
// The children prop is computed in TokenLab based on activeTab. Without
// intervention, when activeTab changes, BOTH the exiting panel and the entering
// panel receive the NEW tab's children simultaneously (React re-renders all
// currently rendered children of AnimatePresence on every parent re-render).
//
// This causes the same components — Toggle with layoutId "toggleThumb-Subtle",
// etc. — to exist in two places at once. Framer Motion's ProjectionNode tree
// (a module-level singleton) records conflicting position snapshots for the
// same layoutId from two different DOM locations. The snapshot corruption
// persists until page reload because the ProjectionNode tree is never reset.
//
// Fix: contentMapRef stores a snapshot of children per tab key. The snapshot
// for a given key only updates while THAT tab is active. The exiting panel
// reads contentMap[itsOwnKey], which hasn't been updated since it became
// inactive — so it always shows its original content, never the new tab's.
// Each layoutId element exists in exactly one panel at a time.
//
// The active tab's content still updates correctly: when tokens change or
// internal state changes, contentMap[activeTab] is updated and PanelSlide
// re-renders. React reconciles against the same component instances (same
// position in the tree), so local state (Toggle on/off, etc.) is preserved.
function TabPanel({ activeTab, children }) {
  const tokens = useMotionTokens()

  // Only write to the slot for the currently active tab.
  // The exiting tab's slot is frozen from its last active render.
  const contentMap = useRef({})
  contentMap.current[activeTab] = children

  return (
    <div className={styles.demoPanel}>
      <AnimatePresence initial={false}>
        <PanelSlide
          key={activeTab}
          tabId={activeTab}
          contentMap={contentMap}
          tokens={tokens}
        />
      </AnimatePresence>
    </div>
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
// Extracted so it can call useSetActiveToken() inside ActiveTokenProvider.
function EasingSection({ rawState, dispatch }) {
  const setActiveToken = useSetActiveToken()
  const [resetHovered, setResetHovered] = useState(false)

  const isCustom    = Array.isArray(rawState.easing)
  const activeCurve = isCustom
    ? rawState.easing
    : EASING_CURVES[rawState.easing].fm

  return (
    <>
      <AnimatePresence initial={false}>
        {isCustom && (
          <motion.div
            key="curveValues"
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
        onCurveChange={(curve) => dispatch({ type: 'SET_EASING', value: curve })}
        onDragStart={() => setActiveToken('easing')}
        onDragEnd={() => setActiveToken(null)}
      />

      <div className={styles.easeGrid}>
        {Object.entries(EASING_CURVES).map(([key, { label }]) => (
          <button
            key={key}
            className={`${styles.easeButton} ${rawState.easing === key ? styles.easeButtonActive : ''}`}
            onClick={() => dispatch({ type: 'SET_EASING', value: key })}
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
              onClick={() => dispatch({ type: 'SET_EASING', value: 'standard' })}
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
  // Tab state is ephemeral UI state — no reducer involvement.
  const [activeTab, setActiveTab] = useState('press-state')
  // NavItem demo selection — local to the Press & State tab.
  const [activeNav, setActiveNav] = useState('Token Lab')

  // Explore mode: expands slider ranges to 50–2000ms / 0–1000ms / 0.5–1.2.
  // Toggling always resets to defaults first so sliders start within the new range.
  const [exploreMode, setExploreMode] = useState(false)

  // User-saved presets — persisted to localStorage. Built-in presets are defined
  // as a constant; user presets are merged with them at render time.
  const [userPresets, setUserPresets] = useState([])

  // Load any saved user presets on mount.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cadence-presets') || '[]')
      if (Array.isArray(stored)) setUserPresets(stored)
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

  return (
    <ActiveTokenProvider>
    <div className={styles.tokenLab}>

      {/* ── Left column: controls ─────────────────────────────────────── */}
      <aside className={styles.controls}>

        {/* Controls header — title on left, Explore toggle on right.
            The toggle resets all sliders to defaults and expands their ranges.
            Tooltip fires after 400ms hover delay to avoid accidental activation. */}
        <div className={styles.controlsHeader}>
          <span className={styles.controlsTitle}>Tokens</span>
          <Tooltip text="Explore mode removes range limits. Toggle off to return to defaults.">
            <Toggle mode="expressive" label="Explore" onChange={handleExploreToggle} />
          </Tooltip>
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

      </aside>

      {/* ── Right column: demo area ───────────────────────────────────── */}
      {/* MotionTokensProvider wraps only this column — DemoTabs and TabPanel
          call useMotionTokens() and receive liveTokens, so the tab indicator
          spring and panel fade both respond to the token sliders in real time. */}
      <MotionTokensProvider tokens={liveTokens}>
        <div className={styles.demo}>

          <DemoTabs
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <TabPanel activeTab={activeTab}>
            {activeTab === 'press-state' ? (
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

              </div>
            ) : activeTab === 'enter-exit' ? (
              <div className={styles.demoContent}>

                <DrawerDemo />

                <DemoWrapper
                  componentName="Dropdown"
                  instruction="Open the menu — duration.fast keeps functional UI snappy"
                >
                  <div className={styles.demoRow}>
                    <Dropdown label="Context Menu" />
                  </div>
                </DemoWrapper>

              </div>
            ) : activeTab === 'sequence-progress' ? (
              <div className={styles.demoContent}>

                <ProgressBarDemo />

                <DemoWrapper
                  componentName="Stepper"
                  instruction="Click Next to see the three-beat cascade — delay sliders control the gaps"
                >
                  <Stepper />
                </DemoWrapper>

              </div>
            ) : activeTab === 'gesture' ? (
              <div className={styles.demoContent}>

                <DemoWrapper
                  componentName="Carousel"
                  instruction="Drag to advance — flick fast or drag far enough to commit"
                >
                  <Carousel />
                </DemoWrapper>

              </div>
            ) : null}

          </TabPanel>

        </div>
      </MotionTokensProvider>

    </div>
    </ActiveTokenProvider>
  )
}
