import { lazy, Suspense, useReducer, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { ActiveTokenProvider, useActiveToken, useSetActiveToken } from '../../context/ActiveTokenContext'
import { TitlePulseProvider, useTitlePulse } from '../../context/TitlePulseContext'
import { useNavState } from '../../context/NavigationContext'
import { SECTIONS } from '../../data/navigation'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useChromeTransition } from '../../hooks/useChromeTransition'
import { EasingVisualizer } from '../EasingVisualizer'
import { DurationVisualizer } from '../DurationVisualizer'
import { SpringVisualizer } from '../SpringVisualizer'
import { MotionTilesSection } from '../MotionTiles/MotionTilesSection'
import { ErrorBoundary } from '../ErrorBoundary'
import { NavColumn } from '../NavColumn'
import { DemoArea } from '../DemoArea'
import { useDemoOverlay } from '../DemoArea/overlayContext'
import { CodeBlock } from '../CodeBlock'
import { DEMO_SNIPPETS } from './demoSnippets'
import { HeroAnimation } from '../HeroAnimation'
import { TokenLabGuide } from '../TokenLabGuide'
import { RailDrawer } from '../RailDrawer'
import { Button } from '../Button'
import { Card } from '../Card'
import { NavItem } from '../NavItem'
import { Toggle } from '../Toggle'
import { SpringDemo } from '../SpringDemo'
import { Spinner } from '../Spinner'
import { ProgressBar } from '../ProgressBar'
import { Stepper } from '../Stepper'
import { Drawer } from '../Drawer'
import { Modal } from '../Modal'
import { Tooltip } from '../Tooltip'
import { Dropdown } from '../Dropdown'
import { NotificationBadge } from '../NotificationBadge'
import { WaterWilt } from '../WaterWilt'
import {
  EASING_CURVES,
  INITIAL_STATE,
  BUILT_IN_PRESETS,
  stateToTokens,
  toDtcgJson,
  toFlatJson,
  toCssVars,
  importTokens,
} from '../../data/motionPresets'
import styles from './TokenLab.module.css'

// ─── Lazy boundaries: PrinciplesLibrary and Carousel ─────────────────────────
//
// PrinciplesLibrary (via PrincipleCard → PrincipleIcon/PrincipleAnimation) and
// Carousel load lazily so their component JS stays off first paint. Same
// pattern as MotionTilesSection's lazy grid; see
// docs/decisions/rive-scaling-future-work-2026-07-07.md (addendum). Until the
// 2026-07-17 single-runtime consolidation these chunks also carried the
// separate @rive-app/react-canvas runtime and its WASM; everything now runs on
// the webgl2 runtime the hero already loads eagerly, so the chunks are
// component JS only.
//
// Because both lazy chunks import Carousel (FollowThrough renders one inside
// the principles chunk), Rollup hoists Carousel + the HC color hook into a
// shared chunk loaded when either side first needs it. Neither lands in the
// eager index chunk.
//
// The importer functions are shared between React.lazy and the idle prefetch
// in TokenLab, so both resolve to the same chunk. React.lazy expects a default
// export, so the .then shim adapts our named exports (same as MotionTilesSection).
const importPrinciplesLibrary = () => import('../PrinciplesLibrary')
const importCarousel = () => import('../Carousel')

const PrinciplesLibrary = lazy(() =>
  importPrinciplesLibrary().then((m) => ({ default: m.PrinciplesLibrary })),
)
const Carousel = lazy(() =>
  importCarousel().then((m) => ({ default: m.Carousel })),
)

// ─── Token → Component map ────────────────────────────────────────────────────
// Maps each slider's token key to the component names it affects across all tabs.
// DemoWrapper uses this to highlight or dim groups when a slider is active.
// Empty array means the token has no connected demo component anywhere in the
// tool — the "Token unused by present components." note is shown in all groups.
// Maps each editable token to the demo components that read it. DemoWrapper uses
// this to highlight (green border) the demos a slider is connected to, and to show
// the "Token unused by present components" note on the rest. For easing, each slot
// lights its own consumers when that tab is active in the visualizer.
//
// Policy: a component is listed under a token if its source reads that token
// (tokens.<group>.<key>, or the matching --motion-* CSS variable). Objective and
// greppable. ease.linear has no slider (corners only), so reads of it produce no
// entry here. Two reads are wired but not exercised by the TokenLab demo itself —
// Card's scale.subtle (its dimmed branch, used by the Appeal principle) and
// Stepper's scale.base — and are listed because the component consumes them even
// though this demo never triggers that path.
//
// easing.overshoot became an editable slot (unlocked in Explore mode, 2026-07-08),
// so it now carries the components that read ease.overshoot: the Button release
// (explicit since 2026-07-16; it previously fell to Framer's default spring),
// Card's select lift, Carousel's snap, the Notification Badge launch, and the
// Toggle thumb.
//
// Rebuilt 2026-06-20 against each component's actual reads in the Token Fidelity
// audit. The prior table had drifted: NavItem was under easing.standard (it reads
// enter/exit), Toggle under easing.standard + scale.base (it reads
// duration.fast + ease.overshoot), Card under duration.slow (it reads base),
// and Notification Badge under easing.exit (it reads standard, not exit).
// React Clock (2026-07-18, the Embeds category's Water & Wilt demo)
// is the first canvas demo in the map. Its rows are exactly what the rAF
// driver reads (docs/briefings/waterwilt-token-vm-map.md): rain on
// fast+linear and growth on slower+enter together, flowers on slow+standard
// after delay.long, the wilt out on slow+exit. delay.short left the demo
// when rain and growth became simultaneous, and duration.base left when rain
// moved to fast and the wilt to slow (both 2026-07-18, David's reviews).
// ease.linear has no slider, so the rain scrub adds no easing row.
// scale.expressive is NOT listed: the planned plantScale bind was withdrawn
// (sceneScale covers composition scale, David's 2026-07-18 call), so the
// demo reads scale.base (scene + button overlay + Button squash) and no
// other scale token.
const TOKEN_COMPONENT_MAP = {
  'duration.fast':    ['Button', 'NavItem', 'Toggle', 'Dropdown', 'Tooltip', 'Stepper', 'Carousel', 'React Clock'],
  'duration.base':    ['Card', 'Drawer', 'Modal', 'Tooltip'],
  'duration.slow':    ['ProgressBar', 'Stepper', 'Carousel', 'Notification Badge', 'Modal', 'Drawer', 'React Clock'],
  'duration.slower':  ['Spinner', 'Stepper', 'React Clock'],
  'easing.standard':  ['Button', 'Card', 'ProgressBar', 'Stepper', 'Carousel', 'Notification Badge', 'React Clock'],
  'easing.enter':     ['NavItem', 'Drawer', 'Modal', 'Tooltip', 'Stepper', 'Dropdown', 'React Clock'],
  'easing.exit':      ['NavItem', 'Drawer', 'Modal', 'Tooltip', 'Stepper', 'Dropdown', 'ProgressBar', 'React Clock'],
  'easing.overshoot': ['Button', 'Card', 'Carousel', 'Notification Badge', 'Toggle'],
  'delay.short':      ['Stepper'],
  'delay.medium':     ['Stepper'],
  'delay.long':       ['Stepper', 'React Clock'],
  'scale.subtle':     ['Card'],
  'scale.base':       ['Button', 'Stepper', 'React Clock'],
  'scale.expressive': ['Notification Badge'],
  'scale.lift':       ['Card', 'Carousel'],
  // The physics-spring family. The SpringDemo always consumes it; Button, Card,
  // Toggle, Carousel, and Drawer consume it when their per-demo switch is flipped
  // to Spring. The switch is per-instance state the static map cannot read, so
  // these list every spring-capable demo: dragging a spring slider highlights the
  // components the spring can drive, whether or not each is currently switched.
  'spring.stiffness': ['Spring', 'Button', 'Card', 'Toggle', 'Carousel', 'Drawer'],
  'spring.damping':   ['Spring', 'Button', 'Card', 'Toggle', 'Carousel', 'Drawer'],
  'spring.mass':      ['Spring', 'Button', 'Card', 'Toggle', 'Carousel', 'Drawer'],
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
    case 'SET_SPRING':
      return { ...state, spring: { ...state.spring, [action.key]: action.value } }
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
  el.style.setProperty('--motion-ease-overshoot',   easingCss(state.easing.overshoot))
  el.style.setProperty('--motion-delay-short',      `${state.delay.short}ms`)
  el.style.setProperty('--motion-delay-medium',     `${state.delay.medium}ms`)
  el.style.setProperty('--motion-delay-long',       `${state.delay.long}ms`)
  el.style.setProperty('--motion-scale-subtle',     `${state.scale.subtle}`)
  el.style.setProperty('--motion-scale-base',       `${state.scale.base}`)
  el.style.setProperty('--motion-scale-expressive', `${state.scale.expressive}`)
  el.style.setProperty('--motion-scale-lift',       `${state.scale.lift}`)
  // Spring params are unitless (no ms), written so a preset switch carries the
  // spring to any CSS-reading consumer and to keep this in step with the export.
  el.style.setProperty('--motion-spring-stiffness', `${state.spring.stiffness}`)
  el.style.setProperty('--motion-spring-damping',   `${state.spring.damping}`)
  el.style.setProperty('--motion-spring-mass',      `${state.spring.mass}`)
}

// Triggers a client-side file download for a text payload. Builds a Blob, points
// a temporary object URL at it, clicks a synthetic <a download>, then revokes the
// URL so it is not leaked. Entirely in-browser: the exported token file never
// touches a server.
function downloadTextFile(filename, text, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
    case 'SET_SPRING':
      // Spring params are unitless (no ms suffix), like scale.
      el.style.setProperty(`--motion-spring-${action.key}`, `${action.value}`)
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

// Spring — unitless. Constrained ranges cover the band that produces usable UI
// springs (a legible arrival, a little bounce, not a rubber ball and not a
// door-closer). Explore ranges are the SPRING_BOUNDS from motionPresets.js, so an
// imported value always lands on the track. The three params carry different
// ranges, so unlike the families above each key is tuned on its own.
const SPRING_CONFIG = {
  stiffness: { min: 80,  max: 800, step: 10,  unit: '' },
  damping:   { min: 8,   max: 60,  step: 1,   unit: '' },
  mass:      { min: 0.5, max: 3,   step: 0.1, unit: '' },
}
const SPRING_CONFIG_EXPLORE = {
  stiffness: { min: 1,   max: 2000, step: 10,  unit: '' },
  damping:   { min: 1,   max: 100,  step: 1,   unit: '' },
  mass:      { min: 0.1, max: 10,   step: 0.1, unit: '' },
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

// Migrate a preset's `state.easing` to the current shape. Two migrations run
// here, so a preset saved under any past version loads cleanly:
//   1. Shape: older presets hold either a string preset key or a four-number
//      array on `state.easing`; we normalize those into the three-slot object
//      `{ standard: <old>, enter: 'enter', exit: 'exit' }`.
//   2. Key rename: the `'spring'` curve was renamed `'overshoot'` (a cubic-bezier
//      is not a real spring), so any slot still set to `'spring'` is remapped.
// Already-current presets with no `'spring'` slot pass through with the same
// values. A preset missing `state.easing` entirely is returned untouched.
function migratePresetEasing(preset) {
  const easing = preset?.state?.easing
  if (easing == null) return preset
  const isOldShape = typeof easing === 'string' || Array.isArray(easing)
  const slots = isOldShape
    ? { standard: easing, enter: 'enter', exit: 'exit' }
    : { ...easing }
  for (const slot of Object.keys(slots)) {
    if (slots[slot] === 'spring') slots[slot] = 'overshoot'
  }
  // The overshoot slot landed 2026-07-08 (editable in Explore mode). Presets
  // saved before it have no overshoot key; default it to the named curve so the
  // reducer and writeAllTokensToCss never read undefined.
  if (slots.overshoot === undefined) slots.overshoot = 'overshoot'
  return { ...preset, state: { ...preset.state, easing: slots } }
}

// Backfill state.spring for presets saved before the physics-spring family
// (2026-07-20). A pre-spring preset has no spring key at all; default the whole
// group from Standard so the reducer, writeAllTokensToCss, and stateToTokens
// never read undefined. Same precedent as the overshoot default above, kept a
// separate pass so it also covers a preset that migratePresetEasing returns
// early (one with no easing at all).
function migratePresetSpring(preset) {
  if (preset?.state == null || preset.state.spring != null) return preset
  return { ...preset, state: { ...preset.state, spring: { ...INITIAL_STATE.spring } } }
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
  const chrome     = useChromeTransition()

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
              transition={chrome.ui}
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
function PresetsSection({ rawState, allPresets, onLoad, onDelete, onSave, onImport }) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName]  = useState('')
  const fileInputRef = useRef(null)
  // Export format: 'dtcg' (W3C Design Tokens), 'flat' (CSS-mirroring JSON), or
  // 'css' (a drop-in :root block). All three serialize from the same
  // stateToExport object, so the toggle only selects which stringifier runs at
  // export time. Import handles dtcg/flat only; css is export-only.
  const [exportFormat, setExportFormat] = useState('dtcg')
  const [copied, setCopied] = useState(false)
  const activePresetId = getActivePresetId(rawState, allPresets)
  const chrome = useChromeTransition()

  function handleSave() {
    const trimmed = saveName.trim()
    if (!trimmed) return
    onSave(trimmed)
    setSaveName('')
    setIsSaving(false)
  }

  // The current token state serialized in the selected format. Computed on
  // demand (export and copy both call it) rather than held in state.
  function exportText() {
    if (exportFormat === 'dtcg') return toDtcgJson(rawState)
    if (exportFormat === 'css')  return toCssVars(rawState)
    return toFlatJson(rawState)
  }

  function handleExport() {
    // DTCG files conventionally carry the .tokens.json extension; the flat
    // shape is a plain .json; the css block is a .css with the matching mime so
    // the download opens as a stylesheet rather than plain text.
    const file = {
      dtcg: { name: 'cadence.tokens.json', mime: 'application/json' },
      flat: { name: 'cadence-tokens.json', mime: 'application/json' },
      css:  { name: 'cadence.tokens.css',  mime: 'text/css' },
    }[exportFormat]
    downloadTextFile(file.name, exportText(), file.mime)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportText())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API is unavailable in insecure contexts; the download button
      // is the reliable path, so a failed copy is a silent no-op.
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    // Reset the input so selecting the same file again still fires onChange.
    e.target.value = ''
    if (!file) return
    file.text().then(text => onImport(importTokens(text)))
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
            transition={chrome.ui}
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
            transition={chrome.ui}
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

      {/* Export the live token state as a downloadable file. The format toggle
          picks the serialization; Export downloads, Copy puts the same string on
          the clipboard. */}
      <div className={styles.exportRow}>
        <div
          className={styles.exportFormatToggle}
          role="group"
          aria-label="Export format"
        >
          <button
            type="button"
            className={`${styles.exportFormatOption} ${exportFormat === 'dtcg' ? styles.exportFormatOptionActive : ''}`}
            onClick={() => setExportFormat('dtcg')}
            aria-pressed={exportFormat === 'dtcg'}
          >
            DTCG
          </button>
          <button
            type="button"
            className={`${styles.exportFormatOption} ${exportFormat === 'flat' ? styles.exportFormatOptionActive : ''}`}
            onClick={() => setExportFormat('flat')}
            aria-pressed={exportFormat === 'flat'}
          >
            Flat
          </button>
          <button
            type="button"
            className={`${styles.exportFormatOption} ${exportFormat === 'css' ? styles.exportFormatOptionActive : ''}`}
            onClick={() => setExportFormat('css')}
            aria-pressed={exportFormat === 'css'}
          >
            CSS
          </button>
        </div>
        <button type="button" className={styles.exportButton} onClick={handleExport}>
          Export
        </button>
        <button type="button" className={styles.exportCopyButton} onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Import a token file (DTCG or flat). The hidden input is triggered by the
          button; format is auto-detected. The result, including any clamped,
          filled, or ignored tokens, is reported back through onImport. */}
      <div className={styles.importRow}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className={styles.importInput}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className={styles.importButton}
          onClick={() => fileInputRef.current?.click()}
        >
          Import tokens
        </button>
      </div>
    </div>
  )
}

// ─── ImportReport ─────────────────────────────────────────────────────────────
// The body of the import-complete modal. Renders only the sections that have
// something to say, with a terse summary line for the clean case. Failure (a
// fatal parse / validation error) shows the error message instead.
function ImportReport({ result }) {
  if (!result.ok) {
    return <p className={styles.importError}>{result.error}</p>
  }

  const { format, total, clamped, filled, ignored, curvesOutOfRange } = result.report
  const loaded = total - filled.length
  const formatLabel = format === 'dtcg' ? 'DTCG' : 'flat'

  return (
    <div className={styles.importReport}>
      <p className={styles.importSummary}>
        Loaded {loaded} of {total} tokens from a {formatLabel} file
        {filled.length > 0 && `, filled ${filled.length} from defaults`}.
      </p>

      {clamped.length > 0 && (
        <ImportReportSection title="Clamped to range">
          {clamped.map(c => (
            <li key={c.path} className={styles.importRow2}>
              <code>{c.path}</code>
              <span>{c.from} → {c.to}</span>
            </li>
          ))}
        </ImportReportSection>
      )}

      {filled.length > 0 && (
        <ImportReportSection title="Missing in file, set to default">
          {filled.map(f => (
            <li key={f.path} className={styles.importRow2}>
              <code>{f.path}</code>
              <span>{String(f.to)}</span>
            </li>
          ))}
        </ImportReportSection>
      )}

      {curvesOutOfRange.length > 0 && (
        <ImportReportSection title="Loaded, not editable in the curve editor">
          {curvesOutOfRange.map(c => (
            <li key={c.slot} className={styles.importRow2}>
              <code>easing.{c.slot}</code>
              <span>control point outside the draggable region</span>
            </li>
          ))}
        </ImportReportSection>
      )}

      {ignored.length > 0 && (
        <ImportReportSection title="Ignored (not editable here)">
          {ignored.map(i => (
            <li key={i.path} className={styles.importRow2}>
              <code>{i.path}</code>
            </li>
          ))}
        </ImportReportSection>
      )}
    </div>
  )
}

function ImportReportSection({ title, children }) {
  return (
    <div className={styles.importSection}>
      <div className={styles.importSectionTitle}>{title}</div>
      <ul className={styles.importList}>{children}</ul>
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
        // The visible label lives in a sibling span, which no accessible-name
        // algorithm reaches — without this a screen reader announces only
        // "slider". tokenKey ("duration.fast") over the bare name ("fast")
        // because the section prefix is what disambiguates it aloud.
        aria-label={tokenKey}
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onPointerDown={() => setActiveToken(tokenKey)}
        onPointerUp={() => setActiveToken(null)}
        // Keyboard parity for the active-token highlight: arrow keys fire no
        // pointer events, so before these two handlers a keyboard user never
        // saw the code view light up (the gap documented in
        // code-view-active-highlight-2026-06-19.md). Focus sustains the
        // highlight, blur clears it. After a mouse drag, pointer-up still
        // clears while the slider keeps focus, preserving pointer behavior;
        // a later arrow press still flashes via CodeBlock's value watcher.
        onFocus={() => setActiveToken(tokenKey)}
        onBlur={() => setActiveToken(null)}
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
// `code` (optional) is the source snippet for this demo. When present, a </>
// toggle sits beside the component name and reveals a CodeBlock below the demo.
// On-demand per demo: nothing renders until the user asks, so the column is not
// buried in syntax. See CodeBlock for the live-value behavior.
// `instructionClass` (optional) appends a layout variant to the instruction
// paragraph — the centered-caption classes the two canvas demos use.
// mainClass: optional extra class on .demoMain. The carousel demo uses it to
// make its .demoMain a CSS size container so the caption can follow the
// carousel's own container-query breakpoint. Opt-in per demo, not on .demoMain
// itself: container-type applies layout containment, which turns the element
// into the containing block for absolutely-positioned descendants — safe for
// the carousel (nothing in it positions absolutely), not something to impose
// on every demo at once.
function DemoWrapper({ componentName, instruction, children, code, instructionClass, mainClass, springCapable = false }) {
  const activeToken = useActiveToken()
  const [showCode, setShowCode] = useState(false)
  // springCapable demos carry a spring toggle in the label row (left of the </>
  // button). It flips the demo's components between ease.overshoot and the real
  // spring in place. children is a render prop for those demos, receiving the
  // mode; a plain-node child (every other demo) is rendered as-is.
  const [springOn, setSpringOn] = useState(false)
  const springMode = springOn ? 'spring' : 'bezier'
  const body = typeof children === 'function' ? children(springMode) : children
  const chrome = useChromeTransition()
  // ≥1280px an open code view sits in a column beside the demo (.demoGroupSplit)
  // instead of revealing beneath it, so the component and its source are visible
  // together without scrolling (the wide-layout feedback, 2026-07-19). Below
  // that, the inline height reveal stays. Breakpoint must mirror the
  // @media rule in TokenLab.module.css.
  const codeAside = useMediaQuery('(min-width: 1280px)')

  let state = 'idle'
  if (activeToken !== null) {
    const affected = TOKEN_COMPONENT_MAP[activeToken] ?? []
    if (affected.includes(componentName)) {
      state = 'highlighted'
    } else {
      state = 'no-demo'
    }
  }

  const codeOpen = Boolean(code) && showCode

  return (
    <div
      className={[
        styles.demoGroup,
        codeAside && codeOpen ? styles.demoGroupSplit : '',
        state === 'highlighted' ? styles.demoGroupHighlighted : '',
      ].join(' ')}
    >
      {/* The demo's own stack is wrapped so it can be the left grid column when
          the code view splits out beside it. Narrow layouts are unchanged:
          .demoMain mirrors .demoGroup's stacking. */}
      <div className={mainClass ? `${styles.demoMain} ${mainClass}` : styles.demoMain}>
        <div className={styles.demoLabelRow}>
          <span className={styles.demoLabel}>{componentName}</span>
          <div className={styles.demoLabelActions}>
            {springCapable && (
              <button
                type="button"
                className={`${styles.springToggle} ${springOn ? styles.springToggleOn : ''}`}
                onClick={() => setSpringOn(s => !s)}
                aria-pressed={springOn}
                aria-label={springOn ? 'Spring motion on' : 'Spring motion off'}
                title="Toggle spring motion"
              >
                <SpringIcon />
              </button>
            )}
            {code && (
              <button
                type="button"
                className={`${styles.codeToggle} ${showCode ? styles.codeToggleActive : ''}`}
                onClick={() => setShowCode(s => !s)}
                aria-expanded={showCode}
                aria-label={showCode ? 'Hide code' : 'Show code'}
              >
                {'</>'}
              </button>
            )}
          </div>
        </div>
        {body}
        {state !== 'no-demo' && instruction && (
          <p className={`${styles.demoInstruction} ${instructionClass ?? ''}`}>{instruction}</p>
        )}
        {state === 'no-demo' && (
          <p className={styles.noDemoNote}>Token unused by present components.</p>
        )}
      </div>
      {codeAside ? (
        // Side column: fade in at the tool-chrome timing. No exit animation on
        // purpose — the grid's second column collapses the moment showCode goes
        // false, so an exiting panel would reflow into a row under the demo
        // mid-fade. An instant close is the predictable form here.
        codeOpen && (
          <motion.div
            className={styles.demoCode}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={chrome.ui}
          >
            <CodeBlock code={code} />
          </motion.div>
        )
      ) : (
        // Inline reveal mirrors the Presets save-area reveal: height-auto at the
        // 0.15s tool-chrome timing, not an editable token.
        <AnimatePresence initial={false}>
          {codeOpen && (
            <motion.div
              key="code"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={chrome.ui}
              style={{ overflow: 'hidden' }}
            >
              <CodeBlock code={code} />
            </motion.div>
          )}
        </AnimatePresence>
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

// ─── SpringIcon ───────────────────────────────────────────────────────────────
// The metal-spring glyph for the per-demo spring toggle (public/titleSVGS/
// spring.svg, inlined). The path carries no fill, so it inherits currentColor,
// which the .springToggle CSS sets per state: muted at rest, the theme accent
// when engaged. Inlining rather than an <img> is what lets one asset track all
// four themes through the color token, the same reason the wordmark is inlined.
function SpringIcon() {
  return (
    <svg className={styles.springIcon} viewBox="0 0 79.34 47.16" aria-hidden="true">
      <path d="M30.57,41.02c-3.83-7.07-1.6-20.87,2.16-28.4-.81-1.22-1.89-2.26-3.21-3-2.64-1.49-6.04.56-7.93,3.09,3.26,5.56,4.77,12.59,4.37,18.94-.25,3.98-1.64,8.59-5.5,9.7-2.7.78-5.31-.38-6.56-2.89-3.38-6.79-.59-19.06,3.43-25.68-2.5-2.94-6.73-1.62-9.21,1.01-3.22,3.43-4.39,8.76-4.78,13.44-.08.99-.91,1.63-1.78,1.57S-.07,27.96,0,26.95c.4-5.68,2.13-12.28,6.33-16.14,3.59-3.31,9.29-4.52,13.03-.79,1.66-1.82,3.58-3.31,5.96-3.97,3.73-1.04,6.65.53,9.26,3.42,1.94-2.97,4.41-5.25,7.57-6.6,4.4-1.87,9.16-1.02,12.65,2.38,3.52-4.5,8.77-6.63,14.06-4.31,4.84,2.56,7.15,8.75,8.4,14.01,1.4,5.9,1.97,11.84,2.07,17.92.02,1.01-.84,1.7-1.69,1.7-.91,0-1.65-.69-1.67-1.7-.13-5.84-.65-11.54-2-17.21-1.02-4.28-3.18-10.51-7.27-11.95-3.65-1.28-7.31.87-9.56,3.98,5.22,6.96,7.66,16.97,7.66,25.56,0,5.83-1.77,13.7-7.96,13.89-4.28.13-6.84-3.45-8.02-7.54-2.7-9.34-.81-22.82,4.04-31.55-2.67-2.99-6.79-3.66-10.34-1.65-2.47,1.41-4.37,3.55-5.78,6.02,4.23,7.28,7.55,20.78,3.8,27.99-1.29,2.48-3.84,3.94-6.59,3.36-1.5-.32-2.65-1.42-3.39-2.77ZM59.14,42.5c.81-1.07,1.34-2.33,1.63-3.6,1.92-8.31-.61-20.87-5.56-28.09-3.42,6.79-4.56,14.84-4.15,22.19.33,3.37.93,7.57,3.24,9.84,1.4,1.38,3.59,1.32,4.84-.34ZM20.96,37.18c.88-1.46,1.39-2.98,1.56-4.7.57-5.64-.45-11.35-3-16.63-2.57,4.97-3.71,10.25-3.75,15.65.1,1.84.33,3.5.94,5.15.48.84,1.09,1.53,1.93,1.58s1.61-.35,2.31-1.04ZM34.72,40.48c3.05.71,4.13-4.5,4.06-7.81-.1-5.7-1.37-11.21-3.9-16.54-2.7,6.71-4.1,15.93-1.7,22.66.34.6.81,1.52,1.53,1.69Z" />
    </svg>
  )
}

// ─── DrawerDemo ───────────────────────────────────────────────────────────────
// Manages local open/close state for the Drawer demo in the Enter & Exit tab.
// portalTarget is the demo-area overlay node (see DemoArea.useDemoOverlay), so
// the drawer fills the visible demo column instead of overlaying the whole
// viewport and drawing under the navigation.
function DrawerDemo() {
  const [isOpen, setIsOpen] = useState(false)
  const overlay = useDemoOverlay()

  return (
    <DemoWrapper
      componentName="Drawer"
      instruction="Open the drawer. ease.enter brings it in, ease.exit takes it out; the spring toggle swaps the entrance for a real spring"
      code={DEMO_SNIPPETS.Drawer}
      springCapable
    >
      {mode => (
        <>
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
            scoped
            portalTarget={overlay}
            motionMode={mode}
          >
            <p>
              The drawer arrives on <strong>ease.enter</strong>, or a real spring
              when you flip the toggle. Either way it rises past its mark, then
              settles, so the eye catches it before it lands.
            </p>
            <p style={{ marginTop: '12px' }}>
              It leaves on <strong>ease.exit</strong>. Same{' '}
              <strong>duration.slow</strong>, a different shape: a short dip, then
              it drops and clears the frame.
            </p>
            <p style={{ marginTop: '12px' }}>
              Drag <strong>duration.slow</strong> and both halves retime together.
              Drag the enter and exit curves and they pull apart.
            </p>
          </Drawer>
        </>
      )}
    </DemoWrapper>
  )
}

// ─── ModalDemo ────────────────────────────────────────────────────────────────
// Sits in Enter & Exit between DrawerDemo and Dropdown. Same family of
// motion (panel + backdrop) but a different grammar than Drawer — Modal
// rises from rest at the center instead of sliding from an edge.
function ModalDemo() {
  const [isOpen, setIsOpen] = useState(false)
  const overlay = useDemoOverlay()

  return (
    <DemoWrapper
      componentName="Modal"
      instruction="Open the modal. Backdrop fades; panel rises from 0.96 to 1"
      code={DEMO_SNIPPETS.Modal}
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
        scoped
        portalTarget={overlay}
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
      code={DEMO_SNIPPETS.NotificationBadge}
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
      code={DEMO_SNIPPETS.ProgressBar}
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
          aria-label="Progress value"
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
// Overshoot is an editable slot but its tab only appears in Explore mode. Two
// reasons: its Y > 1 control point needs the visualizer's extended vertical
// range (allowOvershoot below), and gating it keeps overshoot a fixed anchor in
// constrained mode — the shared-vocabulary lesson that some curves are named
// constants you reference, not dials you turn.
const OVERSHOOT_TAB = { id: 'overshoot', label: 'Overshoot' }

function EasingSection({ rawState, dispatch, exploreMode }) {
  const setActiveToken = useSetActiveToken()
  const [activeSlot, setActiveSlot] = useState('standard')
  const [resetHovered, setResetHovered] = useState(false)
  const chrome = useChromeTransition()

  const tabs = exploreMode ? [...EASING_TABS, OVERSHOOT_TAB] : EASING_TABS

  // If Explore turns off while the Overshoot tab is active, fall back to Standard
  // so the visualizer never reads a slot whose tab is gone. RESET_TO_DEFAULTS on
  // Explore-off already returns the overshoot value itself to its anchor.
  useEffect(() => {
    if (!exploreMode && activeSlot === 'overshoot') setActiveSlot('standard')
  }, [exploreMode, activeSlot])

  const slotValue   = rawState.easing[activeSlot]
  const isCustom    = Array.isArray(slotValue)
  const activeCurve = isCustom ? slotValue : EASING_CURVES[slotValue].fm

  function setSlot(value) {
    dispatch({ type: 'SET_EASING', slot: activeSlot, value })
  }

  return (
    <>
      <div className={styles.easingTabs} role="tablist">
        {tabs.map(tab => (
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
            transition={chrome.ui}
            className={styles.curveValues}
          >
            [{activeCurve.map(v => v.toFixed(2)).join(', ')}]
          </motion.div>
        )}
      </AnimatePresence>

      <EasingVisualizer
        curve={activeCurve}
        allowOvershoot={activeSlot === 'overshoot'}
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
              transition={chrome.ui}
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
  const chrome = useChromeTransition()
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
            transition={chrome.nav}
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
    new Set(['duration', 'easing', 'scale', 'spring'])
  )
  // Which Principles filter is active comes from NavigationContext (the nav
  // column owns it). TokenLab only needs it to pass through to PrinciplesLibrary.
  // The destination itself is read by DemoArea, not here.
  const { principleFilter, section } = useNavState()
  // NavItem demo selection — local to the Press & State category.
  const [activeNav, setActiveNav] = useState('Token Lab')

  // Responsive collapse. The nav column collapses to a rail at ≤1024px; the tool
  // bar (controls) collapses too at ≤720px. Breakpoints mirror the grid media
  // queries in TokenLab.module.css.
  const navCollapsed      = useMediaQuery('(max-width: 1024px)')
  const controlsCollapsed = useMediaQuery('(max-width: 720px)')

  // Motion Tiles is a third tool that renders in the right region. While it is
  // active the Token Lab tool bar collapses to the "Tokens" rail regardless of
  // viewport width — the same form it takes at ≤720px — so the tile field gets
  // the room and the bar reads as set aside. The bar collapses but never
  // unmounts, so token state persists across a Motion Tiles visit for free.
  const isMotionTiles = section === SECTIONS.MOTION_TILES
  const controlsRailed = controlsCollapsed || isMotionTiles

  // Which rail's drawer is open: 'tokens' | 'nav' | null. A single value makes
  // the two drawers mutually exclusive — opening one closes the other, which is
  // exactly the requested behavior. Clearing it when its breakpoint passes keeps
  // a drawer from being "open" in a form that no longer renders.
  const [openDrawer, setOpenDrawer] = useState(null)
  useEffect(() => {
    if (!navCollapsed && openDrawer === 'nav') setOpenDrawer(null)
    // Close the Tokens drawer whenever the bar is no longer railed — including
    // on leaving Motion Tiles, not only on crossing the width breakpoint.
    if (!controlsRailed && openDrawer === 'tokens') setOpenDrawer(null)
  }, [navCollapsed, controlsRailed, openDrawer])

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
        setUserPresets(stored.map(p => migratePresetSpring(migratePresetEasing(p))))
      }
    } catch { /* ignore corrupt storage */ }
  }, [])

  // Prefetch the two lazy chunks (PrinciplesLibrary, Carousel) on browser idle, so
  // navigating to Principles or the Gesture category never waits on a fetch and
  // the Suspense fallbacks near-never paint. Idle (not mount): firing the fetch
  // immediately would compete with the hero .riv and webgl2 WASM requests that
  // first paint actually needs. requestIdleCallback is absent in Safari, so a
  // timer stands in there. Fire-and-forget: a failed prefetch just means the
  // boundary falls back to fetching on demand, exactly as if we had not
  // prefetched. Same idea as MotionTilesLanding's grid-chunk prefetch.
  useEffect(() => {
    const prefetch = () => {
      importPrinciplesLibrary().catch(() => {})
      importCarousel().catch(() => {})
    }
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = setTimeout(prefetch, 2000)
    return () => clearTimeout(t)
  }, [])

  const allPresets = [...BUILT_IN_PRESETS, ...userPresets]

  // Active config depends on explore mode.
  const durationConfig = exploreMode ? DURATION_CONFIG_EXPLORE : DURATION_CONFIG
  const delayConfig    = exploreMode ? DELAY_CONFIG_EXPLORE    : DELAY_CONFIG
  const scaleConfig    = exploreMode ? SCALE_CONFIG_EXPLORE    : SCALE_CONFIG
  const springConfig   = exploreMode ? SPRING_CONFIG_EXPLORE   : SPRING_CONFIG

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
  // OFF — always reset to Standard. This keeps the "toggle off = clean state"
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

  // Import result for the report modal. null = closed.
  const [importResult, setImportResult] = useState(null)

  function handleImport(result) {
    if (result.ok) {
      // Always flip to Explore so the widened ranges can represent any imported
      // value (a 1500ms duration is unreachable on a constrained slider).
      setExploreMode(true)
      // Land the import in a single reserved "Imported" preset, replacing any
      // previous one, so the user can switch between a built-in preset, their
      // own exploration, and the import. generatePresetTooltip summarizes it.
      const imported = {
        id: 'imported',
        label: 'Imported',
        isBuiltIn: false,
        tooltip: generatePresetTooltip(result.state),
        state: result.state,
      }
      const next = [...userPresets.filter(p => p.id !== 'imported'), imported]
      setUserPresets(next)
      localStorage.setItem('cadence-presets', JSON.stringify(next))
      // LOAD_PRESET fires both channels: CSS variables and the reducer state.
      dispatch({ type: 'LOAD_PRESET', payload: result.state })
    }
    setImportResult(result)
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
          instruction="Press to see scale and easing; the spring toggle swaps the release for a real spring"
          code={DEMO_SNIPPETS.Button}
          springCapable
        >
          {mode => (
            <div className={styles.demoRow}>
              <Button motionMode={mode}>Press me</Button>
              <Button motionMode={mode}>Action</Button>
            </div>
          )}
        </DemoWrapper>

        <DemoWrapper
          componentName="Card"
          instruction="Click to toggle selected state; the spring toggle swaps the select for a real spring"
          code={DEMO_SNIPPETS.Card}
          springCapable
        >
          {mode => (
            <div className={styles.demoCards}>
              <Card
                tag="Principle"
                title="Squash & Stretch"
                description="The illusion of weight and flexibility."
                style={{ maxWidth: '220px' }}
                motionMode={mode}
              />
              <Card
                title="Timing"
                description="Duration gives weight and personality."
                style={{ maxWidth: '220px' }}
                motionMode={mode}
              />
            </div>
          )}
        </DemoWrapper>

        <DemoWrapper
          componentName="NavItem"
          instruction="Click to see active transition"
          code={DEMO_SNIPPETS.NavItem}
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
          instruction="Compare subtle vs expressive signaling; the spring toggle swaps the thumb for a real spring"
          code={DEMO_SNIPPETS.Toggle}
          springCapable
        >
          {mode => (
            <div className={styles.demoRow}>
              <Toggle label="Subtle"     mode="subtle"     motionMode={mode} />
              <Toggle label="Expressive" mode="expressive" motionMode={mode} />
            </div>
          )}
        </DemoWrapper>

        <DemoWrapper
          componentName="Spring"
          instruction="Click to send the dot across on a spring; switch presets to feel it retime"
          code={DEMO_SNIPPETS.Spring}
        >
          <div className={styles.demoRow}>
            <SpringDemo />
          </div>
        </DemoWrapper>

        <DemoWrapper
          componentName="Spinner"
          instruction="Duration slider controls rotation speed"
          code={DEMO_SNIPPETS.Spinner}
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
          code={DEMO_SNIPPETS.Tooltip}
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
          code={DEMO_SNIPPETS.Dropdown}
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
          code={DEMO_SNIPPETS.Stepper}
        >
          <Stepper />
        </DemoWrapper>
      </div>
    ),

    'embeds': (
      <div className={styles.demoContent}>
        {/* The first canvas demo: a Rive plant scrubbed by a rAF driver that
            reads the same live tokens as every DOM demo. The file holds
            poses; the driver holds time. Contract:
            docs/briefings/waterwilt-token-vm-map.md. */}
        <DemoWrapper
          componentName="React Clock"
          instruction="Press Water me. Rain and growth run together, rain on duration.fast, growth on duration.slower; flowers wait out delay.long. Press again and the wilt runs out on duration.slow with ease.exit"
          code={DEMO_SNIPPETS.WaterWilt}
          instructionClass={styles.demoInstructionEmbed}
          mainClass={styles.demoMainEmbed}
        >
          <WaterWilt />
        </DemoWrapper>
      </div>
    ),

    'gesture': (
      <div className={styles.demoContent}>
        <DemoWrapper
          componentName="Carousel"
          instruction="Drag to advance: flick fast or drag far enough to commit; the spring toggle swaps the snap for a real spring"
          code={DEMO_SNIPPETS.Carousel}
          instructionClass={styles.demoInstructionCarousel}
          mainClass={styles.demoMainCarousel}
          springCapable
        >
          {/* Carousel is a lazy chunk (see the lazy-boundaries block up top).
              The idle prefetch usually resolves it long before this category is
              opened, so the fallback near-never paints; its min-height keeps the
              layer from collapsing for the rare frame it does. ErrorBoundary
              outside Suspense catches both a chunk-load failure and a render
              throw, degrading in place instead of blanking the app. */}
          {mode => (
            <ErrorBoundary
              title="The carousel demo hit a snag"
              message="The Carousel demo ran into an unexpected error. Reloading usually clears it."
            >
              <Suspense fallback={<div className={styles.carouselFallback}>Loading the carousel…</div>}>
                <Carousel motionMode={mode} />
              </Suspense>
            </ErrorBoundary>
          )}
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
          <Toggle mode="expressive" label="Explore" on={exploreMode} onChange={handleExploreToggle} />
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
        onImport={handleImport}
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
        {/* Reads the live duration values straight from rawState — the controls
            column is outside MotionTokensProvider, so the visualizer takes the
            numbers as a prop rather than through useMotionTokens(). */}
        <DurationVisualizer durations={rawState.duration} />
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
        <EasingSection rawState={rawState} dispatch={dispatch} exploreMode={exploreMode} />
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

      <ControlSection
        label="Spring"
        isOpen={openSections.has('spring')}
        onToggle={() => toggleSection('spring')}
      >
        {Object.entries(springConfig).map(([key, config]) => (
          <SliderRow
            key={key}
            name={key}
            value={rawState.spring[key]}
            config={config}
            onChange={value => dispatch({ type: 'SET_SPRING', key, value })}
            tokenKey={`spring.${key}`}
          />
        ))}
        {/* Reads the live spring values straight from rawState — the controls
            column is outside MotionTokensProvider, so the visualizer takes the
            numbers as a prop, the same as DurationVisualizer. */}
        <SpringVisualizer spring={rawState.spring} />
      </ControlSection>
    </>
  )

  return (
    <ActiveTokenProvider>
    <TitlePulseProvider>
    <div className={`${styles.tokenLab} ${controlsRailed ? styles.controlsRailed : ''}`}>

      {/* ── Left column: controls (tool bar) ──────────────────────────── */}
      {/* Railed (a "Tokens" rail that opens the same controls as a drawer) when
          the viewport is ≤720px OR Motion Tiles is active; a full always-visible
          column otherwise. The drawer shares the mutually-exclusive drawer state
          with the nav. */}
      {controlsRailed ? (
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
      {/* Right region swaps by section. Token Lab and Principles render the demo
          area (wrapped in MotionTokensProvider so their previews read live
          tokens). Motion Tiles renders its own section instead: the landing, then
          the lazy grid on Enter. It sits outside MotionTokensProvider on purpose,
          it reads no --motion-* tokens and runs its own preset system. */}
      {isMotionTiles ? (
        <MotionTilesSection />
      ) : (
        <MotionTokensProvider tokens={liveTokens} respectReducedMotion={false}>
          <DemoArea
            categoryContent={categoryContent}
            // The Suspense boundary lives INSIDE the crossfade layer's content,
            // never around DemoArea's AnimatePresence: the motion.div layer that
            // AnimatePresence manages must not suspend, or the crossfade state
            // machine would be interrupted. The layers are absolutely positioned,
            // so the column's geometry cannot jump when the chunk resolves; the
            // fallback only needs to fill the layer quietly. With the idle
            // prefetch it paints only on a cold deep link to #/principles.
            principlesContent={
              <ErrorBoundary
                title="The library hit a snag"
                message="The Principles Library ran into an unexpected error. Reloading usually clears it."
              >
                <Suspense fallback={<div className={styles.lazyFallback}>Loading the library…</div>}>
                  <PrinciplesLibrary filter={principleFilter} />
                </Suspense>
              </ErrorBoundary>
            }
            hero={<HeroAnimation />}
            guide={<TokenLabGuide />}
          />
        </MotionTokensProvider>
      )}

      {/* Import report. Opens after any import attempt; the title reflects
          success vs a fatal parse / validation failure. */}
      <Modal
        isOpen={importResult !== null}
        onClose={() => setImportResult(null)}
        title={importResult?.ok ? 'Import complete' : 'Import failed'}
      >
        {importResult && <ImportReport result={importResult} />}
      </Modal>

    </div>
    </TitlePulseProvider>
    </ActiveTokenProvider>
  )
}
