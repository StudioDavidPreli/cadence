// Motion-token preset data. Lives in its own leaf module so it can be imported
// by TokenLab (which authored these presets) and by PrincipleCard (the Timing
// principle demo) without forming a circular dependency. TokenLab imports
// PrinciplesLibrary, which imports PrincipleCard, so PrincipleCard cannot
// import from TokenLab without a cycle. A separate leaf module breaks the loop.

// ─── Easing curves ────────────────────────────────────────────────────────────
// Each curve has a `css` form (cubic-bezier string, for setProperty calls) and
// an `fm` form (four-number array, for Framer Motion's transition.ease).
export const EASING_CURVES = {
  linear:   { label: 'Linear',   css: 'cubic-bezier(0, 0, 1, 1)',           fm: [0, 0, 1, 1] },
  standard: { label: 'Standard', css: 'cubic-bezier(0.4, 0, 0.2, 1)',       fm: [0.4, 0, 0.2, 1] },
  enter:    { label: 'Enter',    css: 'cubic-bezier(0, 0, 0.2, 1)',         fm: [0, 0, 0.2, 1] },
  exit:     { label: 'Exit',     css: 'cubic-bezier(0.4, 0, 1, 1)',         fm: [0.4, 0, 1, 1] },
  spring:   { label: 'Spring',   css: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fm: [0.34, 1.56, 0.64, 1] },
}

// ─── Initial state ────────────────────────────────────────────────────────────
// The "Default" preset's state. Defined separately so the Default entry in
// BUILT_IN_PRESETS can reference it without duplicating values.
//
// `easing` holds three independent slots — standard / enter / exit — each
// editable through the TokenLab bezier visualizer. Each value is either a
// preset key (`'standard'`, `'enter'`, etc.) or a four-number bezier array
// for a custom curve. Linear and Spring stay as constants in the runtime
// (see stateToTokens below) and as quick-load preset buttons in the UI.
export const INITIAL_STATE = {
  duration: { fast: 100, base: 200, slow: 400, slower: 600 },
  easing:   { standard: 'standard', enter: 'enter', exit: 'exit' },
  delay:    { short: 50, medium: 100, long: 200 },
  scale:    { subtle: 0.98, base: 0.95, expressive: 0.9, lift: 1.02 },
}

// ─── Built-in presets ─────────────────────────────────────────────────────────
// Three presets that demonstrate meaningfully different motion personalities.
// isBuiltIn: true prevents these from being deleted by the user.
export const BUILT_IN_PRESETS = [
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
    tooltip: 'Short durations, spring easing, tight delays. High energy, confident.',
    state: {
      duration: { fast: 60, base: 120, slow: 200, slower: 350 },
      // Snappy is the personality where Standard reads as Spring — confident
      // overshoot. Enter and Exit stay at their default decelerate / accelerate
      // shapes; bending those would dilute the contrast Snappy is built on.
      easing:   { standard: 'spring', enter: 'enter', exit: 'exit' },
      delay:    { short: 20, medium: 40, long: 80 },
      scale:    { subtle: 0.97, base: 0.93, expressive: 0.87, lift: 1.04 },
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    isBuiltIn: true,
    tooltip: 'Long durations, decelerating easing, generous delays. Considered, editorial.',
    state: {
      duration: { fast: 200, base: 500, slow: 900, slower: 1400 },
      // Cinematic favours arrival — Standard becomes Enter so general motion
      // decelerates into rest. Enter keeps that shape. Exit stays sharp so
      // dismissals don't drag.
      easing:   { standard: 'enter', enter: 'enter', exit: 'exit' },
      delay:    { short: 100, medium: 200, long: 400 },
      scale:    { subtle: 0.99, base: 0.97, expressive: 0.94, lift: 1.01 },
    },
  },
]

// ─── stateToTokens ────────────────────────────────────────────────────────────
// Converts a preset's `state` object (CSS-side units: ms, named easing keys
// or four-number arrays per slot, unitless scale) into the React-side token
// shape that MotionTokensProvider expects (seconds for duration/delay,
// four-number arrays for easing).
//
// Each editable slot resolves independently. Linear and Spring stay constant
// because they are not editable through the UI — Linear has no draggable
// handles (corners only) and Spring's Y > 1 control point falls outside the
// visualizer's draggable region.
function resolveCurve(slot) {
  return Array.isArray(slot) ? slot : EASING_CURVES[slot].fm
}

export function stateToTokens(state) {
  return {
    duration: {
      fast:   state.duration.fast   / 1000,
      base:   state.duration.base   / 1000,
      slow:   state.duration.slow   / 1000,
      slower: state.duration.slower / 1000,
    },
    ease: {
      linear:   EASING_CURVES.linear.fm,
      standard: resolveCurve(state.easing.standard),
      enter:    resolveCurve(state.easing.enter),
      exit:     resolveCurve(state.easing.exit),
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

// ─── Token export ─────────────────────────────────────────────────────────────
// stateToExport is the third sibling transform alongside stateToTokens and
// TokenLab's writeAllTokensToCss. Where writeAllTokensToCss writes only the
// editable tokens to the DOM, the export must produce the COMPLETE token
// document a design system would consume — including the members the editor
// never exposes: ease.linear, ease.spring, and delay.none. Those are real
// tokens in motion.css; an export that dropped them would be a partial file,
// not a usable one.
//
// It returns a normalized, format-agnostic shape in CSS-side units: durations
// and delays as plain ms numbers, easing as canonical four-number bezier
// arrays, scale as unitless numbers. The two stringifiers below both read from
// this single object, so the DTCG and flat outputs can never drift apart.
export function stateToExport(state) {
  return {
    duration: {
      fast:   state.duration.fast,
      base:   state.duration.base,
      slow:   state.duration.slow,
      slower: state.duration.slower,
    },
    easing: {
      linear:   EASING_CURVES.linear.fm,
      standard: resolveCurve(state.easing.standard),
      enter:    resolveCurve(state.easing.enter),
      exit:     resolveCurve(state.easing.exit),
      spring:   EASING_CURVES.spring.fm,
    },
    delay: {
      none:   0,
      short:  state.delay.short,
      medium: state.delay.medium,
      long:   state.delay.long,
    },
    scale: { ...state.scale },
  }
}

// Map a flat { key: value } token group through a per-value transform, keeping
// the keys. Used by both stringifiers to wrap each leaf in its output form.
function mapGroup(group, fn) {
  return Object.fromEntries(Object.entries(group).map(([k, v]) => [k, fn(v)]))
}

const bezierCss = arr => `cubic-bezier(${arr.join(', ')})`

// DTCG / W3C Design Tokens format: every leaf is a { $type, $value } pair.
// This is the interchange shape Style Dictionary, Tokens Studio, and Figma
// Variables consume. The draft spec has no motion-specific delay type, so
// delays serialize as `duration` (a delay is a duration measured from a
// trigger). Tokens are grouped under a top-level `motion` namespace so the
// file composes cleanly if colour or spacing tokens are ever added beside it.
export function toDtcgJson(state) {
  const t = stateToExport(state)
  const duration = ms => ({ $type: 'duration', $value: `${ms}ms` })
  const bezier   = arr => ({ $type: 'cubicBezier', $value: arr })
  const number   = n => ({ $type: 'number', $value: n })
  const doc = {
    motion: {
      duration: mapGroup(t.duration, duration),
      easing:   mapGroup(t.easing, bezier),
      delay:    mapGroup(t.delay, duration),
      scale:    mapGroup(t.scale, number),
    },
  }
  return JSON.stringify(doc, null, 2)
}

// Flat JSON mirroring the CSS variable names and units: ms strings for
// duration / delay, cubic-bezier() strings for easing, bare numbers for the
// unitless scale tokens. Easy to read and hand-edit; not a recognized
// interchange standard.
export function toFlatJson(state) {
  const t = stateToExport(state)
  const doc = {
    duration: mapGroup(t.duration, ms => `${ms}ms`),
    easing:   mapGroup(t.easing, bezierCss),
    delay:    mapGroup(t.delay, ms => `${ms}ms`),
    scale:    { ...t.scale },
  }
  return JSON.stringify(doc, null, 2)
}

// CSS custom properties mirroring src/tokens/motion.css: a `:root` block of the
// editable `--motion-*` tokens, ready to paste into a stylesheet. Durations and
// delays carry `ms` units, easing serializes as `cubic-bezier()`, scale is
// unitless. Only the editable token scale is emitted — the `--feedback-*` vars
// in motion.css are tool chrome, not part of the exported token document. This
// is export-only: importTokens reads JSON, not CSS.
export function toCssVars(state) {
  const t = stateToExport(state)
  // Each family becomes a run of `  --motion-<family>-<key>: <value>;` lines.
  // The families are separated by a blank line, matching motion.css's grouping.
  const block = (family, group, fmt) =>
    Object.entries(group).map(([k, v]) => `  --motion-${family}-${k}: ${fmt(v)};`)
  const lines = [
    ...block('duration', t.duration, ms => `${ms}ms`),
    '',
    ...block('ease', t.easing, bezierCss),
    '',
    ...block('delay', t.delay, ms => `${ms}ms`),
    '',
    ...block('scale', t.scale, n => n),
  ]
  return `:root {\n${lines.join('\n')}\n}`
}

// ─── Token import ─────────────────────────────────────────────────────────────
// Import is the strict inverse of export, plus validation. The export pipeline
// discarded nothing the editor needs, so a Cadence file round-trips losslessly;
// a foreign or hand-edited file imports as far as it validly can and the rest is
// surfaced in a report. importTokens never throws to its caller — it returns a
// discriminated result so the UI can show a modal either way.

// A named error for the fatal cases (bad JSON, wrong types, structurally invalid
// curve). Thrown internally to fail fast at the point of misuse; caught at the
// importTokens boundary and turned into a result. Mirrors the fail-fast pattern
// used for the MotionTokensContext null default.
export class ImportError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ImportError'
  }
}

// Clamp bounds for the scalar token families. Import always flips TokenLab into
// Explore mode (the widest ranges), so these ARE the bounds an imported value is
// clamped to. A value inside survives intact; a value outside is pulled to the
// nearest edge and reported. These must stay in lockstep with the
// *_CONFIG_EXPLORE ranges in TokenLab/index.jsx — they live here because this
// leaf module cannot import from TokenLab without forming a cycle.
export const EXPLORE_BOUNDS = {
  duration: { min: 0,   max: 2000 },
  delay:    { min: 0,   max: 2000 },
  scale:    { min: 0.5, max: 1.2  },
}

// The editable token schema — the exact keys each family carries in rawState.
// easing slots are beziers (no scalar clamp); the rest are clamped scalars.
const IMPORT_SCHEMA = {
  duration: ['fast', 'base', 'slow', 'slower'],
  easing:   ['standard', 'enter', 'exit'],
  delay:    ['short', 'medium', 'long'],
  scale:    ['subtle', 'base', 'expressive', 'lift'],
}

// Paths a Cadence export legitimately carries but the editor cannot hold: the
// non-editable constants. They are dropped on import WITHOUT being reported as
// foreign, so a clean round trip shows an empty "ignored" list instead of three
// rows of expected noise.
const EXPECTED_EXTRA_PATHS = new Set(['easing.linear', 'easing.spring', 'delay.none'])

function clampScalar(n, { min, max }) {
  return Math.max(min, Math.min(max, n))
}

// Read the family object for `family` regardless of format. DTCG nests under a
// top-level `motion` group; flat puts the families at the root.
function getGroup(parsed, format, family) {
  return format === 'dtcg' ? parsed?.motion?.[family] : parsed?.[family]
}

// Pull a scalar leaf as a number. DTCG leaves are { $type, $value }; flat leaves
// are the bare value. Accepts "200ms" strings and bare numbers either way.
function readScalar(leaf, format, path) {
  const v = format === 'dtcg' ? leaf?.$value : leaf
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (!Number.isFinite(n)) throw new ImportError(`${path}: expected a number.`)
  return n
}

// Parse a "cubic-bezier(a, b, c, d)" string into a four-number array.
function parseCubicBezierString(str, path) {
  if (typeof str !== 'string') throw new ImportError(`${path}: expected a cubic-bezier() value.`)
  const match = str.match(/cubic-bezier\(([^)]+)\)/i)
  if (!match) throw new ImportError(`${path}: "${str}" is not a cubic-bezier() value.`)
  return match[1].split(',').map(s => parseFloat(s.trim()))
}

// Pull a curve leaf as a four-number array. DTCG stores the array directly under
// $value; flat stores a cubic-bezier() string. The x coordinates (indices 0, 2)
// must sit in [0, 1] — CSS rejects a cubic-bezier whose x is out of range, so an
// out-of-range x is a structural error, not something to silently bend. y is
// left free: overshoot above 1 is legal (that is how spring curves work).
function readCurve(leaf, format, path) {
  const arr = format === 'dtcg' ? leaf?.$value : parseCubicBezierString(leaf, path)
  if (!Array.isArray(arr) || arr.length !== 4 || !arr.every(Number.isFinite)) {
    throw new ImportError(`${path}: expected a cubic-bezier with four numbers.`)
  }
  if (arr[0] < 0 || arr[0] > 1 || arr[2] < 0 || arr[2] > 1) {
    throw new ImportError(`${path}: cubic-bezier x values must be between 0 and 1.`)
  }
  return arr
}

// If a bezier array exactly matches a named curve, return that key so the slot
// stores the name (not the array). This restores the named-preset identity the
// export flattened away, so a round-tripped Default lights up as Default again.
function canonicalizeCurve(arr) {
  for (const [key, curve] of Object.entries(EASING_CURVES)) {
    if (curve.fm.every((v, i) => v === arr[i])) return key
  }
  return null
}

// A control point with y outside [0, 1] renders above/below the visualizer's
// draggable region (x is always clamped to [0, 1] in the editor). The curve
// still loads and animates correctly; the user just cannot drag it. Same state
// the Spring preset is in. Only reported for unnamed (custom) curves — named
// curves like spring are expected, not surprising.
function curveOutsideDraggableRegion(arr) {
  return arr[1] < 0 || arr[1] > 1 || arr[3] < 0 || arr[3] > 1
}

function detectFormat(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new ImportError('Unrecognized token file: expected a JSON object.')
  }
  if (parsed.motion && typeof parsed.motion === 'object') return 'dtcg'
  if (IMPORT_SCHEMA.duration && (parsed.duration || parsed.easing || parsed.delay || parsed.scale)) {
    return 'flat'
  }
  throw new ImportError('Unrecognized token file: expected a Cadence DTCG or flat export.')
}

// Walk the editable schema, building a rawState-shaped object. Missing tokens
// are filled from Default; present scalars are clamped to the explore bounds;
// present curves are canonicalized. Each adjustment is recorded for the report.
function buildState(parsed, format) {
  const state = { duration: {}, easing: {}, delay: {}, scale: {} }
  const clamped = []
  const filled = []
  const curvesOutOfRange = []

  for (const family of ['duration', 'delay', 'scale']) {
    const bounds = EXPLORE_BOUNDS[family]
    const group = getGroup(parsed, format, family)
    for (const key of IMPORT_SCHEMA[family]) {
      const path = `${family}.${key}`
      const leaf = group?.[key]
      if (leaf === undefined) {
        state[family][key] = INITIAL_STATE[family][key]
        filled.push({ path, to: INITIAL_STATE[family][key] })
        continue
      }
      const raw = readScalar(leaf, format, path)
      const value = clampScalar(raw, bounds)
      if (value !== raw) clamped.push({ path, from: raw, to: value })
      state[family][key] = value
    }
  }

  const easingGroup = getGroup(parsed, format, 'easing')
  for (const slot of IMPORT_SCHEMA.easing) {
    const path = `easing.${slot}`
    const leaf = easingGroup?.[slot]
    if (leaf === undefined) {
      state.easing[slot] = INITIAL_STATE.easing[slot]
      filled.push({ path, to: INITIAL_STATE.easing[slot] })
      continue
    }
    const arr = readCurve(leaf, format, path)
    const named = canonicalizeCurve(arr)
    state.easing[slot] = named ?? arr
    if (named === null && curveOutsideDraggableRegion(arr)) {
      curvesOutOfRange.push({ slot })
    }
  }

  return { state, clamped, filled, curvesOutOfRange }
}

// Collect keys present in the file that the editor cannot hold, excluding the
// expected constants. Unknown families (e.g. a `color` group) and unknown keys
// (e.g. a misspelled `duration.fastt`) both surface here.
function collectForeign(parsed, format) {
  const root = format === 'dtcg' ? parsed.motion : parsed
  const foreign = []
  for (const [family, group] of Object.entries(root || {})) {
    const known = IMPORT_SCHEMA[family]
    if (!known) {
      foreign.push({ path: family })
      continue
    }
    if (group && typeof group === 'object') {
      for (const key of Object.keys(group)) {
        const path = `${family}.${key}`
        if (known.includes(key) || EXPECTED_EXTRA_PATHS.has(path)) continue
        foreign.push({ path })
      }
    }
  }
  return foreign
}

// Total editable tokens, for the report's summary line.
const TOTAL_TOKENS =
  IMPORT_SCHEMA.duration.length +
  IMPORT_SCHEMA.easing.length +
  IMPORT_SCHEMA.delay.length +
  IMPORT_SCHEMA.scale.length

export function importTokens(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  try {
    const format = detectFormat(parsed)
    const { state, clamped, filled, curvesOutOfRange } = buildState(parsed, format)
    const ignored = collectForeign(parsed, format)
    return {
      ok: true,
      state,
      report: { format, total: TOTAL_TOKENS, clamped, filled, ignored, curvesOutOfRange },
    }
  } catch (e) {
    if (e instanceof ImportError) return { ok: false, error: e.message }
    throw e
  }
}
