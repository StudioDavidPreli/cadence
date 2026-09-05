// cadence-tokens: the Cadence motion token system as a package.
//
// This module was src/data/motionPresets.js until 2026-09-03, when it was
// extracted into a workspace package so the token system has a home outside
// the site (docs/briefings/V2_BUILD_ORDER_2026-09-03.md, item 2, decisions
// D1-D5). The site is now this package's first consumer: every app import
// that used to say '../../data/motionPresets' says 'cadence-tokens' instead,
// and the values live here alone. Nothing about the module's original reason
// changed: it is still a leaf with no imports, so any component can consume
// it without forming a cycle (the original motivation was that TokenLab
// imports PrinciplesLibrary imports PrincipleCard, so shared data could not
// live in TokenLab).
//
// Two vocabularies live here, deliberately namespaced apart (decision D5):
// the interaction tokens (duration / easing / delay / scale / spring, the
// Token Lab vocabulary) and the ambient presets (speed / easing k / spread /
// cell / gap, the Motion Tiles vocabulary). Snappy, Standard, and Cinematic
// name the same three personalities in both; the named preset is the unit
// the two vocabularies share.

// ─── Easing curves ────────────────────────────────────────────────────────────
// Each curve has a `css` form (cubic-bezier string, for setProperty calls) and
// an `fm` form (four-number array, for Framer Motion's transition.ease).
export const EASING_CURVES = {
  linear:   { label: 'Linear',   css: 'cubic-bezier(0, 0, 1, 1)',           fm: [0, 0, 1, 1] },
  standard: { label: 'Standard', css: 'cubic-bezier(0.4, 0, 0.2, 1)',       fm: [0.4, 0, 0.2, 1] },
  enter:    { label: 'Enter',    css: 'cubic-bezier(0, 0, 0.2, 1)',         fm: [0, 0, 0.2, 1] },
  exit:     { label: 'Exit',     css: 'cubic-bezier(0.4, 0, 1, 1)',         fm: [0.4, 0, 1, 1] },
  overshoot:   { label: 'Overshoot',   css: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fm: [0.34, 1.56, 0.64, 1] },
}

// ─── Initial state ────────────────────────────────────────────────────────────
// The "Standard" preset's state (labeled "Default" until 2026-07-16; renamed to
// align the preset family with Motion Tiles' Snappy / Standard / Cinematic, the
// same three personalities in both tools). Defined separately so the Standard
// entry in BUILT_IN_PRESETS can reference it without duplicating values.
//
// `easing` holds four independent slots — standard / enter / exit / overshoot —
// each editable through the TokenLab bezier visualizer. Each value is either a
// preset key (`'standard'`, `'enter'`, etc.) or a four-number bezier array
// for a custom curve. The overshoot slot only surfaces a control in Explore mode
// (see EasingSection); Linear stays a runtime constant with no editable slot.
export const INITIAL_STATE = {
  duration: { fast: 100, base: 200, slow: 400, slower: 600 },
  easing:   { standard: 'standard', enter: 'enter', exit: 'exit', overshoot: 'overshoot' },
  delay:    { short: 50, medium: 100, long: 200 },
  scale:    { pressSubtle: 0.98, pressBase: 0.95, pressExpressive: 0.9, lift: 1.02 },
  // Physics spring: unitless numbers fed to Framer Motion as
  // { type: 'spring', ... }. Varies per preset like duration does, so it lives
  // in state and resolves per preset (not a fixed reference). Standard is a soft,
  // weighted settle with a hint of overshoot (tuned by feel, David 2026-07-20).
  spring:   { stiffness: 170, damping: 20, mass: 1.5 },
  // Duration scalar: a single unitless multiplier on top of the duration
  // tokens (effective = base * scalar). Editable and round-tripping like the
  // families above, but a LONE value, not a family of keys, so it is handled
  // by dedicated branches rather than the family-map machinery. It is
  // deliberately the same (1) across every preset: speed already lives in each
  // preset's duration ladder, so the scalar is not a personality axis. Only
  // DurationVisualizer consumes it (2026-07-21); see
  // docs/decisions/duration-scalar-2026-07-21.md.
  scalar:   1,
}

// ─── Built-in presets ─────────────────────────────────────────────────────────
// Three presets that demonstrate meaningfully different motion personalities.
// isBuiltIn: true prevents these from being deleted by the user.
export const BUILT_IN_PRESETS = [
  {
    id: 'standard',
    label: 'Standard',
    isBuiltIn: true,
    tooltip: 'These values ship in most design systems without modification. Start here.',
    state: INITIAL_STATE,
  },
  {
    id: 'snappy',
    label: 'Snappy',
    isBuiltIn: true,
    tooltip: 'Short durations, overshoot easing, tight delays. High energy, confident.',
    state: {
      duration: { fast: 60, base: 120, slow: 200, slower: 350 },
      // Snappy is the personality where Standard reads as the Overshoot curve,
      // confident overshoot. Enter and Exit stay at their default decelerate /
      // accelerate shapes; bending those would dilute the contrast Snappy is built on.
      easing:   { standard: 'overshoot', enter: 'enter', exit: 'exit', overshoot: 'overshoot' },
      delay:    { short: 20, medium: 40, long: 80 },
      scale:    { pressSubtle: 0.97, pressBase: 0.93, pressExpressive: 0.87, lift: 1.04 },
      // Stiffer and lighter than Standard: it bounces harder and arrives faster.
      spring:   { stiffness: 600, damping: 22, mass: 1 },
      // Held at 1 like every preset: the scalar is not a personality axis.
      scalar:   1,
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
      easing:   { standard: 'enter', enter: 'enter', exit: 'exit', overshoot: 'overshoot' },
      delay:    { short: 100, medium: 200, long: 400 },
      scale:    { pressSubtle: 0.99, pressBase: 0.97, pressExpressive: 0.94, lift: 1.01 },
      // Near-critically damped: the extra damping over Standard buys a clean,
      // bounce-free settle. Cinematic's slowness lives in its duration ladder;
      // the spring's job here is composure, not weight.
      spring:   { stiffness: 180, damping: 26, mass: 1.2 },
      // Held at 1 like every preset: the scalar is not a personality axis.
      scalar:   1,
    },
  },
]

// ─── Ambient presets (the Motion Tiles vocabulary) ────────────────────────────
// The second vocabulary the three personalities speak. Where the interaction
// tokens above describe event-driven motion (a press, an enter, an exit), these
// set an ambient clock over a field of tiles: `speed` divides the base period
// (period = AMBIENT_BASE_PERIOD / speed), `easing` is the exponent k in the
// symmetric ease t^k / (t^k + (1 - t)^k) (k = 1.70 is the measured source
// easing, roughly CSS ease-in-out), `spread` staggers the field spatially,
// and `cell` / `gap` size the pixelation path effect. `riveInstance` is the
// name of the ViewModel instance each preset binds inside the .riv files, so
// a consumer wiring their own Rive file to these presets binds the same
// palette the site does.
//
// The values were lifted verbatim from the Motion Tiles grid's PRESETS table;
// since build-order item 3 (2026-09-03) the grid imports this export and its
// own table is gone, so this is the only copy outside the .riv files' baked
// VM instances. Tune a personality here and the field retimes with it.
export const AMBIENT_BASE_PERIOD = 2.0 // seconds per cycle at speed 1

export const AMBIENT_PRESETS = {
  snappy:    { label: 'Snappy',    riveInstance: 'snappy',    speed: 1.25, easing: 3.60, spread: 0.20, cell: 2,   gap: 0.25 },
  standard:  { label: 'Standard',  riveInstance: 'standard',  speed: 1.0,  easing: 1.70, spread: 0.40, cell: 3.5, gap: 0.05 },
  cinematic: { label: 'Cinematic', riveInstance: 'cinematic', speed: 0.8,  easing: 1.15, spread: 0.70, cell: 8,   gap: 1.00 },
}

// Provenance lives in its own module (it is prose-heavy documentation data)
// and re-exports here so consumers have one entry point. The After Effects
// emitter likewise (it is mostly an ExtendScript template); its import of
// stateToExport from this module is a benign cycle — function declarations
// hoist, and nothing runs at module top level.
export { provenance, PROVENANCE_TAGS } from './provenance.js'
export { toAfterEffects, toAfterEffectsControls } from './afterEffects.js'

// ─── The consumer entry point ─────────────────────────────────────────────────
// `import { presets } from 'cadence-tokens'` — the sentence the package exists
// to make true. BUILT_IN_PRESETS below is the EDITOR's shape: raw state in
// CSS-side units (ms, named easing keys), because Token Lab loads presets into
// sliders. A consumer outside the site wants resolved runtime values, so each
// entry here carries `tokens`, the same stateToTokens output the Cadence demos
// actually run (seconds, four-number bezier arrays, the spring as three
// numbers), and `ambient`, the field vocabulary with the k and speed the
// Motion Tiles grid runs. Both derive from the same sources as everything
// else in this module, so this surface cannot drift from the site.
// (stateToTokens is declared below; `export function` hoists.)
export const presets = Object.fromEntries(
  BUILT_IN_PRESETS.map(p => [p.id, {
    label: p.label,
    tokens: stateToTokens(p.state),
    ambient: AMBIENT_PRESETS[p.id],
  }])
)

// ─── stateToTokens ────────────────────────────────────────────────────────────
// Converts a preset's `state` object (CSS-side units: ms, named easing keys
// or four-number arrays per slot, unitless scale) into the React-side token
// shape that MotionTokensProvider expects (seconds for duration/delay,
// four-number arrays for easing).
//
// Each editable slot resolves independently, overshoot included: it is unlocked
// in Explore mode, where the visualizer gives its Y > 1 handle extra vertical
// headroom. Only Linear stays constant, because it has no draggable handles
// (corners only) and so nothing to read from state.
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
      overshoot: resolveCurve(state.easing.overshoot),
    },
    delay: {
      none:   0,
      short:  state.delay.short  / 1000,
      medium: state.delay.medium / 1000,
      long:   state.delay.long   / 1000,
    },
    scale: { ...state.scale },
    // Spring params are unitless, so they pass straight through (no /1000 like
    // duration/delay). Framer Motion consumes them as { type: 'spring', ... }.
    spring: { ...state.spring },
    // NOTE: state.scalar is deliberately NOT emitted here. stateToTokens feeds
    // the MotionTokensProvider that drives the demo area, and nothing in the
    // demo area (or anywhere under a provider) consumes the scalar: its sole
    // consumer, DurationVisualizer, lives in the controls column and reads
    // rawState.scalar directly as a prop. Keeping the scalar out of the runtime
    // token object also keeps the code-view drift guard meaningful (schema u
    // fixed = every demo-consumed token; see resolveToken.test.js).
  }
}

// ─── Token export ─────────────────────────────────────────────────────────────
// stateToExport is the third sibling transform alongside stateToTokens and
// TokenLab's writeAllTokensToCss. Where writeAllTokensToCss writes only the
// editable tokens to the DOM, the export must produce the COMPLETE token
// document a design system would consume — including the members the editor
// never exposes as a live-editable slider: ease.linear and delay.none. Those are
// real tokens in motion.css; an export that dropped them would be a partial file,
// not a usable one. (ease.overshoot is now an editable slot, exported from state.)
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
      overshoot: resolveCurve(state.easing.overshoot),
    },
    delay: {
      none:   0,
      short:  state.delay.short,
      medium: state.delay.medium,
      long:   state.delay.long,
    },
    scale: { ...state.scale },
    spring: { ...state.spring },
    // The duration scalar is a lone unitless value, not a family. It rides the
    // export as a top-level number so a Cadence file is complete and round-trips
    // through importTokens. (Its CSS custom property is --motion-duration-scalar;
    // the JSON path is the shorter `scalar`, a documented naming seam, the same
    // kind of seam the easing/ease boundary already carries.)
    scalar: state.scalar,
  }
}

// Map a flat { key: value } token group through a per-value transform, keeping
// the keys. Used by both stringifiers to wrap each leaf in its output form.
function mapGroup(group, fn) {
  return Object.fromEntries(Object.entries(group).map(([k, v]) => [k, fn(v)]))
}

const bezierCss = arr => `cubic-bezier(${arr.join(', ')})`

// Convert a camelCase token key to the kebab-case suffix its CSS custom property
// uses. Single-word keys are unchanged (fast -> fast); the compound scale keys
// need it (pressSubtle -> press-subtle), because the JS/state/JSON key stays
// camelCase `pressSubtle` while the CSS property is `--motion-scale-press-subtle`.
// This is the one seam between the two spellings; every dynamic `--motion-*`
// write goes through it so the two can never drift.
export function tokenKeyToCssSuffix(key) {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase()
}

// DTCG / W3C Design Tokens format: every leaf is a { $type, $value } pair.
// This is the interchange shape Style Dictionary, Tokens Studio, and Figma
// Variables consume. The draft spec has no motion-specific delay type, so
// delays serialize as `duration` (a delay is a duration measured from a
// trigger). It also has no spring type, so the three spring params serialize as
// plain `number` leaves under a `spring` group (the same $type scale already
// uses): a spring is not one composite value here, it is three unitless numbers,
// and the group name carries the "these compose one spring" meaning. No invented
// type, and it round-trips through importTokens. Tokens are grouped under a
// top-level `motion` namespace so the file composes cleanly if colour or spacing
// tokens are ever added beside it.
// toDtcgDoc returns the document as an object; toDtcgJson stringifies it. The
// split exists for the package's generator (buildTokensDocument), which embeds
// the DTCG tree of each preset inside cadence.tokens.json and must not embed a
// pre-stringified blob. The in-app export button still downloads the string.
export function toDtcgDoc(state) {
  const t = stateToExport(state)
  const duration = ms => ({ $type: 'duration', $value: `${ms}ms` })
  const bezier   = arr => ({ $type: 'cubicBezier', $value: arr })
  const number   = n => ({ $type: 'number', $value: n })
  return {
    motion: {
      duration: mapGroup(t.duration, duration),
      easing:   mapGroup(t.easing, bezier),
      delay:    mapGroup(t.delay, duration),
      scale:    mapGroup(t.scale, number),
      spring:   mapGroup(t.spring, number),
      // The duration scalar is a single number leaf (not a group): one unitless
      // multiplier, the same $type scale and spring already use.
      scalar:   number(t.scalar),
    },
  }
}

export function toDtcgJson(state) {
  return JSON.stringify(toDtcgDoc(state), null, 2)
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
    spring:   { ...t.spring },
    // Lone unitless multiplier, emitted as a bare top-level number.
    scalar:   t.scalar,
  }
  return JSON.stringify(doc, null, 2)
}

// CSS custom properties mirroring src/tokens/motion.css: a `:root` block of the
// editable `--motion-*` tokens, ready to paste into a stylesheet. Durations and
// delays carry `ms` units, easing serializes as `cubic-bezier()`, scale is
// unitless. Only the editable token scale is emitted — the `--feedback-*` vars
// in motion.css are tool chrome, not part of the exported token document. This
// is export-only: importTokens reads JSON, not CSS.
//
// `prefix` (decision D4): the property namespace. It defaults to '--motion-'
// so the in-app export and the site's own stylesheet stay on the spelling the
// whole codebase already reads. The published package file is generated at
// '--cadence-' instead, because in a stranger's codebase a bare '--motion-'
// namespace is a collision waiting to happen and 'cadence' says whose tokens
// these are. One emitter, two call sites, no fork to drift.
export function toCssVars(state, { prefix = '--motion-' } = {}) {
  const t = stateToExport(state)
  // Each family becomes a run of `  <prefix><family>-<key>: <value>;` lines.
  // The families are separated by a blank line, matching motion.css's grouping.
  const block = (family, group, fmt) =>
    Object.entries(group).map(([k, v]) => `  ${prefix}${family}-${tokenKeyToCssSuffix(k)}: ${fmt(v)};`)
  const lines = [
    ...block('duration', t.duration, ms => `${ms}ms`),
    '',
    ...block('ease', t.easing, bezierCss),
    '',
    ...block('delay', t.delay, ms => `${ms}ms`),
    '',
    ...block('scale', t.scale, n => n),
    '',
    ...block('spring', t.spring, n => n),
    '',
    // The duration scalar is a lone value, so it does not go through block()
    // (which builds <prefix><family>-<key> names). Its custom property keeps
    // the recorded duration-scalar spelling even though its JSON path is the
    // shorter `scalar`.
    `  ${prefix}duration-scalar: ${t.scalar};`,
  ]
  return `:root {\n${lines.join('\n')}\n}`
}

// ─── Flow export ──────────────────────────────────────────────────────────────
// Flow is a widely used After Effects plugin for applying and saving easing
// curves; its library format is a JSON object of curve name -> "x1,y1,x2,y2"
// strings at two decimals (per a real exported library; y is free to leave
// [0,1], which is how its anticipation curves work, so Overshoot's 1.56
// serializes as-is). This emits the current state's curve set as a library a
// Flow user imports once and then applies from the panel: the four editable
// slots plus Linear. Under the Standard preset the slots resolve 1:1 to the
// named curves, so the generated dist file IS the system's curve vocabulary;
// a custom-dragged curve exports its own numbers under its slot name, so the
// in-app export path stays open. Format only, no affiliation: the file is
// data Flow reads, the same posture as DTCG.
export function toFlow(state) {
  const t = stateToExport(state)
  const fmt = arr => arr.map(n => n.toFixed(2)).join(',')
  const doc = {
    linear: fmt(t.easing.linear),
    standard: fmt(t.easing.standard),
    enter: fmt(t.easing.enter),
    exit: fmt(t.easing.exit),
    overshoot: fmt(t.easing.overshoot),
  }
  return JSON.stringify(doc, null, 4) + '\n'
}

// ─── Framer Motion export ─────────────────────────────────────────────────────
// The fourth stringifier, and the only one that is not a token document. DTCG,
// flat, and CSS hand the token SET to a pipeline; this hands the MOTION to an
// engineer, as a JavaScript module of ready values to spread into Framer Motion
// `transition` props. It is the one export in Framer Motion's own units (seconds,
// four-number ease arrays), and the only one that can state the spring as what it
// is: a native { type: 'spring', ... } config, not three loose numbers a consumer
// has to reassemble.
//
// Like the other three it serializes from the single stateToExport object, so the
// four outputs cannot drift apart. The ms → seconds step is the same divide-by-1000
// stateToTokens performs, so the emitted values equal what the demos actually run
// (a no-drift unit test pins this against stateToTokens). Two deliberate choices:
// the duration scalar is absent, because a Framer Motion transition takes a
// concrete duration, not a base × multiplier, and the scalar has no runtime
// consumer (it is out of stateToTokens for the same reason); and this is
// export-only, like CSS, so importTokens does not learn to read it back. A
// Framer Motion module is a destination, not an interchange format.
//
// Header comment on the emitted file: generated text, voice-governed, no em-dashes.
const FM_HEADER = `// Cadence motion tokens, as Framer Motion configuration.
//
// Generated from the live token state in Token Lab. The values here are what the
// Cadence demos run: durations and delays in seconds, easing as four-number
// bezier arrays, scale unitless, and the spring as a native Framer Motion config.
// ease.overshoot is the bezier fallback for contexts that cannot run a spring
// (CSS, reduced motion). Import what you need and spread it into a transition.`

export function toFramerMotion(state) {
  const t = stateToExport(state)
  // The same ms → seconds conversion stateToTokens uses. Framer Motion measures
  // transition.duration in seconds, so this is the format's unit, not a rewrite.
  const sec = ms => ms / 1000
  // One key per line, keys unquoted (JSON.stringify would quote them, which reads
  // wrong in a hand-editable module). `fmt` maps each leaf to its printed form;
  // the default prints the value as-is, which is correct for the unitless numbers.
  const block = (group, fmt = v => v) =>
    Object.entries(group).map(([k, v]) => `  ${k}: ${fmt(v)},`).join('\n')
  const arr = a => `[${a.join(', ')}]`
  const named = (name, body) => `export const ${name} = {\n${body}\n}`

  const spring =
    `export const spring = { type: 'spring', ` +
    `stiffness: ${t.spring.stiffness}, damping: ${t.spring.damping}, mass: ${t.spring.mass} }`

  // Composed examples: duration paired with the ease the system pairs it with
  // (enter decelerates in, exit accelerates out), plus the spring by name. This
  // block is static text that references the exports above, so it stays correct
  // whatever the values are, and shows an engineer the intended usage.
  const transitions =
    'export const transitions = {\n' +
    '  enter: { duration: durations.base, ease: easings.enter },\n' +
    '  exit: { duration: durations.fast, ease: easings.exit },\n' +
    '  spring,\n' +
    '}'

  return [
    FM_HEADER,
    named('durations', block(t.duration, sec)),
    named('easings', block(t.easing, arr)),
    named('delays', block(t.delay, sec)),
    named('scale', block(t.scale)),
    spring,
    transitions,
  ].join('\n\n') + '\n'
}

// ─── The package document ─────────────────────────────────────────────────────
// buildTokensDocument composes cadence.tokens.json, the canonical published
// artifact: all three personalities, both vocabularies. It is a pure function
// (the generator script just writes its return value) so the document's shape
// is unit-testable without touching the filesystem.
//
// Shape decisions:
// - `interaction` is each preset's DTCG `motion` group, typed leaves and all.
//   Reusing toDtcgDoc means the published document and the in-app DTCG export
//   can never disagree about a value or a $type.
// - `ambient` is plain numbers plus the Rive instance name. DTCG has no types
//   for a clock vocabulary (period divisors, ease exponents, path-effect cell
//   sizes), and inventing $types would be costume, not compliance. The two
//   vocabularies keeping different shapes in the same file IS the scoping
//   decision (one tool bar per tool, 2026-07-16) expressed as data.
// - `version` is injected by the caller (the generator passes the package
//   version) rather than imported here, so the source module never reads its
//   own package.json at runtime.
export function buildTokensDocument({ version = '0.0.0' } = {}) {
  return {
    name: 'cadence-tokens',
    version,
    // Seconds per ambient cycle at speed 1; period = ambientBasePeriodSeconds / speed.
    ambientBasePeriodSeconds: AMBIENT_BASE_PERIOD,
    presets: Object.fromEntries(
      BUILT_IN_PRESETS.map(preset => {
        const { label, riveInstance, ...ambientValues } = AMBIENT_PRESETS[preset.id]
        return [preset.id, {
          label: preset.label,
          interaction: toDtcgDoc(preset.state).motion,
          ambient: { riveInstance, ...ambientValues },
        }]
      })
    ),
  }
}

// ─── Figma variables ──────────────────────────────────────────────────────────
// buildFigmaVariables composes cadence.figma.json (build-order item 7, D7):
// one collection, the three personalities as MODES, every interaction token
// as a variable with per-mode values. Modes are the reason this format earns
// its place: a Figma file bound to these variables flips through Snappy /
// Standard / Cinematic with the mode switcher, which is the preset argument
// in Figma's own native mechanism.
//
// D7 amendment (2026-09-05, discovered at build time): D7 was scoped on the
// belief that Figma variables carry only FLOAT / COLOR / STRING / BOOLEAN,
// forcing FLOAT-ms durations and four-FLOAT curve handles. Figma has since
// shipped native motion variable types, and this emitter uses them:
// durations and delays are TIMING variables (Figma's unit is SECONDS), each
// easing curve is ONE EASING variable carrying a real cubic-bezier object,
// and the spring's three physical parameters stay FLOATs with a note that
// figma.motion.physicalSpringToNormalized() converts them to a native
// CUSTOM_SPRING easing (lossy: three params to one bounce number). The shape
// mirrors Figma's own API vocabulary (collection, modes, variables with
// valuesByMode) so any import route — a plugin, a script, the Figma MCP —
// maps fields one to one.
//
// The ambient vocabulary is deliberately absent: a Figma variable exists to
// bind to something in a mock, and the field clock has no Figma consumer.
// Same class of call as the scalar's exclusion from the Framer Motion module
// — except the scalar IS here (identical across modes), because a complete
// interaction document round-trips and a missing lone value reads as an
// omission, not a decision.
export function buildFigmaVariables() {
  const modeIds = BUILT_IN_PRESETS.map(p => p.id)
  const exports_ = Object.fromEntries(modeIds.map(id =>
    [id, stateToExport(BUILT_IN_PRESETS.find(p => p.id === id).state)]
  ))
  const perMode = fn => Object.fromEntries(modeIds.map(id => [id, fn(exports_[id])]))

  const variables = []
  const addVar = (name, type, description, fn) =>
    variables.push({ name, type, description, valuesByMode: perMode(fn) })

  // TIMING values are seconds in Figma's own unit; the same /1000 conversion
  // stateToTokens performs, so the emitted values equal what the demos run.
  for (const key of Object.keys(exports_[modeIds[0]].duration)) {
    addVar(`duration/${key}`, 'TIMING', 'seconds (Figma TIMING unit)', t => t.duration[key] / 1000)
  }
  addVar('duration/scalar', 'FLOAT', 'unitless multiplier (effective = base x scalar)', t => t.scalar)
  for (const key of Object.keys(exports_[modeIds[0]].delay)) {
    addVar(`delay/${key}`, 'TIMING', 'seconds (Figma TIMING unit)', t => t.delay[key] / 1000)
  }
  // One EASING variable per curve, carrying Figma's native cubic-bezier
  // object. Slots re-point per mode (Snappy's standard slot carries the
  // overshoot handles), so the handles genuinely vary by mode even though
  // the named curves do not.
  for (const key of Object.keys(exports_[modeIds[0]].easing)) {
    addVar(`easing/${key}`, 'EASING', 'cubic-bezier', t => ({
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: {
        x1: t.easing[key][0], y1: t.easing[key][1],
        x2: t.easing[key][2], y2: t.easing[key][3],
      },
    }))
  }
  for (const key of Object.keys(exports_[modeIds[0]].scale)) {
    addVar(`scale/${key}`, 'FLOAT', 'unitless (1 = rest size)', t => t.scale[key])
  }
  for (const key of Object.keys(exports_[modeIds[0]].spring)) {
    addVar(`spring/${key}`, 'FLOAT', 'unitless physics-spring parameter', t => t.spring[key])
  }

  return {
    collection: 'Cadence Motion',
    modes: BUILT_IN_PRESETS.map(p => ({ id: p.id, name: p.label })),
    notes: [
      'Durations and delays are TIMING variables in SECONDS (Figma’s unit); each easing curve is one EASING variable carrying a native cubic-bezier object.',
      'The spring ships as its three physical FLOAT parameters; figma.motion.physicalSpringToNormalized({ mass, stiffness, damping }) converts them to a native CUSTOM_SPRING easing (lossy: three parameters become one bounce number).',
      'Bind a motion duration to duration/base (or the token your gesture uses) and switching the collection mode retimes it through the three personalities.',
      'The ambient (Motion Tiles) vocabulary is not included: a Figma variable exists to bind, and the field clock has no Figma consumer.',
    ],
    variables,
  }
}

// ─── Rive VM defaults ─────────────────────────────────────────────────────────
// buildRiveDefaults composes cadence.rive.json (build-order item 3): the three
// personalities as PathEffectVM values, for a consumer wiring their own Rive
// file to the Cadence presets. Like buildTokensDocument it is a pure function
// the generator script writes out.
//
// What it says and what it deliberately does not: `instance` is the named VM
// instance a preset binds (each bakes its own palette in the shipped files);
// `properties` are the four numbers a PathEffectVM carries per preset, under
// the property names the .riv files use (cellSize/gapSize, not the shorter
// cell/gap the ambient table speaks — the emitter owns that seam so neither
// side renames for the other). `spread` is NOT here: it is a field-level
// stagger the clock applies across tiles, not a VM property, so putting it in
// `properties` would document a binding that does not exist. It rides in
// `clock` beside the period math instead.
//
// The `notes` block carries the binding-unit lessons from the tile build
// (docs/principles/conventions.md and the group2 closeouts): data-binding
// units are per-property and the editor's display units do not predict them,
// so the three that burned us are stated for the next person.
export function buildRiveDefaults() {
  return {
    viewModel: 'PathEffectVM',
    presets: Object.fromEntries(
      Object.entries(AMBIENT_PRESETS).map(([id, p]) => [id, {
        instance: p.riveInstance,
        properties: {
          speed: p.speed,
          easing: p.easing,
          cellSize: p.cell,
          gapSize: p.gap,
        },
      }])
    ),
    clock: {
      // The shipped grid drives each tile's `progress` (0..1) from a React
      // rAF clock rather than an in-file driver; period = basePeriodSeconds /
      // speed, eased by t^k / (t^k + (1 - t)^k) with k = the preset's
      // `easing`. `spread` staggers the field spatially (0 = synced, 1 = the
      // full wave) and is applied clock-side, never written to a VM.
      basePeriodSeconds: AMBIENT_BASE_PERIOD,
      spread: Object.fromEntries(
        Object.entries(AMBIENT_PRESETS).map(([id, p]) => [id, p.spread])
      ),
    },
    notes: [
      'Data-binding units are per-property; the editor UI display units do not predict them. Probe a new property type with a test value before writing converter formulas.',
      'Rotation bindings take radians, not degrees (a degrees formula once produced a 15,469-degree spin).',
      'Opacity bindings take 0-100.',
      'Scale bindings take a factor (1.0 = 100%).',
    ],
  }
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

// Spring needs its own bounds map because its three params have three different
// ranges, unlike duration/delay/scale, where every key in a family shares one
// range, so EXPLORE_BOUNDS keys by family. These are per-key, and they double as
// the scope-B slider ranges when the spring editor lands. Import clamps a
// too-large value to the nearest edge and reports it (same as the other
// scalars); a structurally invalid value (<= 0) is rejected before clamping, in
// buildState, because a spring with no stiffness/mass or no damping never
// settles.
export const SPRING_BOUNDS = {
  stiffness: { min: 1,   max: 2000 },
  damping:   { min: 1,   max: 100  },
  mass:      { min: 0.1, max: 10   },
}

// The duration scalar's clamp range, and (like SPRING_BOUNDS) the explore-slider
// range it must stay in lockstep with (SCALAR_CONFIG_EXPLORE in TokenLab/index.jsx).
// A single range, not per-key: the scalar is one value. Import clamps a too-large
// value to the nearest edge and reports it; a non-positive value is rejected as a
// structural error before clamping (buildState), because a scalar of 0 freezes
// every duration and a negative one inverts them, neither of which is a token a
// clamp should quietly repair. The positive floor here (0.1) is the smallest
// multiplier the slider offers; the reject gate below is what stops 0 and below.
export const SCALAR_BOUNDS = { min: 0.1, max: 4 }

// The editable token schema — the exact keys each family carries in rawState,
// which is also the exact set the tool bar renders a control for. This is the
// single source of truth for "can the user tune this token?": the importer
// validates against it, and the live code view reads it (via isEditableToken in
// CodeBlock/resolveToken.js) to mark any token a slider cannot reach as a fixed
// reference. easing slots are beziers (no scalar clamp); the rest are clamped
// scalars. Uses control-layer naming (`easing`); the runtime token layer calls
// the same family `ease` (see the easing/ease note in resolveToken.js).
//
// `overshoot` is an editable easing slot but only surfaces a control in Explore
// mode (its Y > 1 handle needs the visualizer's extended vertical range). It is
// in the schema because it is a real editable token: it resolves from state,
// exports its edited value, and imports as a curve. Constrained mode simply
// hides its tab, leaving it at the default overshoot curve.
// `spring` is an editable-CLASS token: it varies per preset (so it cannot be a
// fixed reference, which are identical across presets), lives in state, and
// round-trips through import. It is listed here so the importer validates it and
// the drift guard (schema ∪ fixed = every runtime token) stays satisfied. It is
// edited through TokenLab's Spring section — three sliders plus the
// SpringVisualizer settle curve. Controls are rendered by explicit *Section
// components, not by iterating this schema, so listing spring adds no control on
// its own. Same posture as `overshoot`, which is schema-listed but Explore-gated.
export const EDITABLE_TOKEN_SCHEMA = {
  duration: ['fast', 'base', 'slow', 'slower'],
  easing:   ['standard', 'enter', 'exit', 'overshoot'],
  delay:    ['short', 'medium', 'long'],
  scale:    ['pressSubtle', 'pressBase', 'pressExpressive', 'lift'],
  spring:   ['stiffness', 'damping', 'mass'],
}

// Paths a Cadence export legitimately carries but the editor cannot hold: the
// non-editable constants. They are dropped on import WITHOUT being reported as
// foreign, so a clean round trip shows an empty "ignored" list instead of rows
// of expected noise. This is the exact complement of EDITABLE_TOKEN_SCHEMA:
// together they classify every token the runtime carries, which the drift guard
// in resolveToken.test.js asserts. Control-layer naming (`easing.`, matching the
// schema), normalized to the runtime `ease.` where it meets a token path.
// `linear` alone stays fixed among the easing curves: it has no draggable
// handles (corners only), so there is nothing to edit.
export const FIXED_REFERENCE_PATHS = new Set(['easing.linear', 'delay.none'])

// Old scale key names, mapped NEW -> OLD, for import compatibility after the
// 2026-07-21 press/lift rename (scale.subtle/base/expressive became
// pressSubtle/pressBase/pressExpressive; lift was unchanged). A file exported
// before the rename carries the old keys. Easing solved this differently: a
// curve canonicalizes by VALUE, so a renamed slot re-identifies itself with no
// name alias. Scale values are bare numbers with no such canonicalization, so
// without an explicit alias an old `scale.subtle` would land in collectForeign
// (ignored) and the new `pressSubtle` would fill from Standard, silently
// swapping the user's tuned value for a default. The alias reads the old value
// into the new key and reports the rename instead (David's fork-2 call).
const SCALE_KEY_ALIASES = { pressSubtle: 'subtle', pressBase: 'base', pressExpressive: 'expressive' }
// Keyed by family so the buildState loop can look up aliases generically;
// only scale has any (duration/delay are unchanged, so their entry is absent).
const KEY_ALIASES = { scale: SCALE_KEY_ALIASES }
// The old scale key names as a set, so collectForeign recognizes them as
// renamed-not-foreign and stays quiet on a clean import of an old file.
const RENAMED_SCALE_KEYS = new Set(Object.values(SCALE_KEY_ALIASES))

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
// export flattened away, so a round-tripped Standard lights up as Standard again.
function canonicalizeCurve(arr) {
  for (const [key, curve] of Object.entries(EASING_CURVES)) {
    if (curve.fm.every((v, i) => v === arr[i])) return key
  }
  return null
}

// A control point with y outside [0, 1] renders above/below the visualizer's
// draggable region (x is always clamped to [0, 1] in the editor). The curve
// still loads and animates correctly; the user just cannot drag it. Same state
// the Overshoot curve is in. Only reported for unnamed (custom) curves: named
// curves like overshoot are expected, not surprising.
function curveOutsideDraggableRegion(arr) {
  return arr[1] < 0 || arr[1] > 1 || arr[3] < 0 || arr[3] > 1
}

function detectFormat(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new ImportError('Unrecognized token file: expected a JSON object.')
  }
  if (parsed.motion && typeof parsed.motion === 'object') return 'dtcg'
  if (EDITABLE_TOKEN_SCHEMA.duration && (parsed.duration || parsed.easing || parsed.delay || parsed.scale || parsed.spring || parsed.scalar !== undefined)) {
    return 'flat'
  }
  throw new ImportError('Unrecognized token file: expected a Cadence DTCG or flat export.')
}

// Walk the editable schema, building a rawState-shaped object. Missing tokens
// are filled from Standard; present scalars are clamped to the explore bounds;
// present curves are canonicalized. Each adjustment is recorded for the report.
function buildState(parsed, format) {
  const state = { duration: {}, easing: {}, delay: {}, scale: {}, spring: {} }
  const clamped = []
  const filled = []
  const renamed = []
  const curvesOutOfRange = []

  for (const family of ['duration', 'delay', 'scale']) {
    const bounds = EXPLORE_BOUNDS[family]
    const group = getGroup(parsed, format, family)
    const aliases = KEY_ALIASES[family]   // only scale has any; undefined otherwise
    for (const key of EDITABLE_TOKEN_SCHEMA[family]) {
      const path = `${family}.${key}`
      let leaf = group?.[key]
      // Rename compatibility (scale only): if the current key is absent but its
      // old name is present, read the old value into the new key and record the
      // rename, so a tuned value is not dropped and refilled from Standard.
      if (leaf === undefined && aliases?.[key] !== undefined) {
        const oldKey = aliases[key]
        const oldLeaf = group?.[oldKey]
        if (oldLeaf !== undefined) {
          leaf = oldLeaf
          renamed.push({ from: `${family}.${oldKey}`, to: path })
        }
      }
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
  for (const slot of EDITABLE_TOKEN_SCHEMA.easing) {
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

  // Spring is a scalar family, but with per-key bounds and a validity gate the
  // range-only scalars above do not have: stiffness, damping, and mass must all
  // be positive or the spring never settles, so a <= 0 (or non-finite) value is
  // rejected as a structural error, the same class as a cubic-bezier with an
  // out-of-range x, rather than clamped. In-range-but-too-large values clamp to
  // SPRING_BOUNDS and report like every other scalar; missing keys fill from
  // Standard.
  const springGroup = getGroup(parsed, format, 'spring')
  for (const key of EDITABLE_TOKEN_SCHEMA.spring) {
    const path = `spring.${key}`
    const leaf = springGroup?.[key]
    if (leaf === undefined) {
      state.spring[key] = INITIAL_STATE.spring[key]
      filled.push({ path, to: INITIAL_STATE.spring[key] })
      continue
    }
    const raw = readScalar(leaf, format, path)
    if (raw <= 0) {
      throw new ImportError(`${path}: spring ${key} must be greater than 0.`)
    }
    const value = clampScalar(raw, SPRING_BOUNDS[key])
    if (value !== raw) clamped.push({ path, from: raw, to: value })
    state.spring[key] = value
  }

  // The duration scalar is a lone value, so it is read by a dedicated branch
  // rather than the family loops above. Missing fills from Standard; a value
  // <= 0 (or non-finite) is rejected as a structural error, the same class as a
  // spring param at zero or a cubic-bezier x out of range; an in-range-but-too-
  // large value clamps to SCALAR_BOUNDS and reports like every other scalar.
  const scalarLeaf = getGroup(parsed, format, 'scalar')
  if (scalarLeaf === undefined) {
    state.scalar = INITIAL_STATE.scalar
    filled.push({ path: 'scalar', to: INITIAL_STATE.scalar })
  } else {
    const raw = readScalar(scalarLeaf, format, 'scalar')
    if (raw <= 0) {
      throw new ImportError('scalar: must be greater than 0.')
    }
    const value = clampScalar(raw, SCALAR_BOUNDS)
    if (value !== raw) clamped.push({ path: 'scalar', from: raw, to: value })
    state.scalar = value
  }

  return { state, clamped, filled, renamed, curvesOutOfRange }
}

// Collect keys present in the file that the editor cannot hold, excluding the
// expected constants. Unknown families (e.g. a `color` group) and unknown keys
// (e.g. a misspelled `duration.fastt`) both surface here.
function collectForeign(parsed, format) {
  const root = format === 'dtcg' ? parsed.motion : parsed
  const foreign = []
  for (const [family, group] of Object.entries(root || {})) {
    // The duration scalar is a legitimate lone value the editor holds, but it is
    // not a family in EDITABLE_TOKEN_SCHEMA, so suppress it here the way the
    // fixed constants are suppressed below: a clean round trip must report nothing.
    if (family === 'scalar') continue
    const known = EDITABLE_TOKEN_SCHEMA[family]
    if (!known) {
      foreign.push({ path: family })
      continue
    }
    if (group && typeof group === 'object') {
      for (const key of Object.keys(group)) {
        const path = `${family}.${key}`
        // Old scale key names are recognized-but-renamed (buildState aliases
        // them into the new keys), not foreign, so suppress them here the way
        // the fixed constants are suppressed: a clean import of an old file
        // reports the rename, not noise.
        const isRenamedScaleKey = family === 'scale' && RENAMED_SCALE_KEYS.has(key)
        if (known.includes(key) || FIXED_REFERENCE_PATHS.has(path) || isRenamedScaleKey) continue
        foreign.push({ path })
      }
    }
  }
  return foreign
}

// Total editable tokens, for the report's summary line. The + 1 is the duration
// scalar: editable-class, but a lone value outside the family schema, so it is
// counted here explicitly rather than by a schema length.
const TOTAL_TOKENS =
  EDITABLE_TOKEN_SCHEMA.duration.length +
  EDITABLE_TOKEN_SCHEMA.easing.length +
  EDITABLE_TOKEN_SCHEMA.delay.length +
  EDITABLE_TOKEN_SCHEMA.scale.length +
  EDITABLE_TOKEN_SCHEMA.spring.length +
  1

export function importTokens(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  try {
    const format = detectFormat(parsed)
    const { state, clamped, filled, renamed, curvesOutOfRange } = buildState(parsed, format)
    const ignored = collectForeign(parsed, format)
    return {
      ok: true,
      state,
      report: { format, total: TOTAL_TOKENS, clamped, filled, renamed, ignored, curvesOutOfRange },
    }
  } catch (e) {
    if (e instanceof ImportError) return { ok: false, error: e.message }
    throw e
  }
}

// ─── The Token Lab reducer ────────────────────────────────────────────────────
// Moved here from TokenLab/index.jsx (2026-08-16). Two reasons. It transitions
// exactly the state shape this module owns (INITIAL_STATE and every preset's
// `state`), so this is where a reader looks for it. And the capture rig needs
// the REAL reducer — a preset load in a capture must be the same state
// transition a preset load in the app is — but exporting a non-component from
// the TokenLab component module disabled React Fast Refresh for that whole
// file. Note this is the bare reducer, not TokenLab's dispatch wrapper: the
// wrapper's second channel writes tokens to CSS, which non-app consumers have
// no use for.
export function reducer(state, action) {
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
    case 'SET_SCALAR':
      // The scalar is a lone value, not a family of keys, so the action carries
      // just a value (no key), unlike SET_DURATION / SET_SPRING.
      return { ...state, scalar: action.value }
    case 'RESET_TO_DEFAULTS':
      return { ...INITIAL_STATE }
    case 'LOAD_PRESET':
      return { ...action.payload }
    default:
      throw new Error(`TokenLab reducer: unknown action type "${action.type}"`)
  }
}
