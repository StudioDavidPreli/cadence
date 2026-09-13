import { describe, it, expect } from 'vitest'
import {
  stateToTokens,
  stateToExport,
  toDtcgJson,
  toFlatJson,
  toCssVars,
  toFramerMotion,
  importTokens,
  toResolverJson,
  REDUCED_MOTION_RESOLUTION,
  EDITABLE_TOKEN_SCHEMA,
  formatLiteral,
  formatDisplay,
  nearestToken,
  INITIAL_STATE,
  BUILT_IN_PRESETS,
  EASING_CURVES,
} from './index.js'

// stateToTokens is the CSS-side -> React-side converter. These tests pin its
// contract: ms become seconds, delay.none is injected, named easing slots
// resolve to bezier arrays while custom arrays pass through, overshoot resolves
// from state (an editable slot since the Explore-mode unlock), and only the
// non-editable linear slot stays constant regardless of input.
describe('stateToTokens', () => {
  it('converts durations from ms to seconds', () => {
    const tokens = stateToTokens(INITIAL_STATE)
    expect(tokens.duration).toEqual({ fast: 0.1, base: 0.2, slow: 0.4, slower: 0.6 })
  })

  it('converts delays from ms to seconds and injects delay.none = 0', () => {
    // delay.none has no slider in the UI; the converter always supplies 0.
    const tokens = stateToTokens(INITIAL_STATE)
    expect(tokens.delay).toEqual({ none: 0, short: 0.05, medium: 0.1, long: 0.2 })
  })

  it('resolves named easing slots to their bezier arrays', () => {
    const tokens = stateToTokens(INITIAL_STATE)
    expect(tokens.ease.standard).toEqual(EASING_CURVES.standard.fm)
    expect(tokens.ease.enter).toEqual(EASING_CURVES.enter.fm)
    expect(tokens.ease.exit).toEqual(EASING_CURVES.exit.fm)
  })

  it('passes a custom bezier array slot through unchanged', () => {
    const custom = [0.1, 0.2, 0.3, 0.4]
    const state = {
      ...INITIAL_STATE,
      easing: { ...INITIAL_STATE.easing, standard: custom },
    }
    expect(stateToTokens(state).ease.standard).toEqual(custom)
  })

  it('keeps linear constant and resolves overshoot from state', () => {
    // Linear is not editable (corners only), so it is never read from state.
    // Overshoot became an editable slot (Explore mode), so it resolves like the
    // other slots — its default value is the named overshoot curve.
    const tokens = stateToTokens(INITIAL_STATE)
    expect(tokens.ease.linear).toEqual(EASING_CURVES.linear.fm)
    expect(tokens.ease.overshoot).toEqual(EASING_CURVES.overshoot.fm)

    // A custom overshoot slot now flows through, unlike before the unlock.
    const custom = [0.3, 1.7, 0.6, 1]
    const state = { ...INITIAL_STATE, easing: { ...INITIAL_STATE.easing, overshoot: custom } }
    expect(stateToTokens(state).ease.overshoot).toEqual(custom)
  })

  it('copies scale into a fresh object rather than aliasing state', () => {
    const tokens = stateToTokens(INITIAL_STATE)
    expect(tokens.scale).toEqual(INITIAL_STATE.scale)
    expect(tokens.scale).not.toBe(INITIAL_STATE.scale)
  })

  it('passes spring params through unitless (no ms → s conversion)', () => {
    // Spring is not time-based, so unlike duration it is not divided by 1000.
    const tokens = stateToTokens(INITIAL_STATE)
    expect(tokens.spring).toEqual({ stiffness: 170, damping: 20, mass: 1.5 })
    expect(tokens.spring).not.toBe(INITIAL_STATE.spring)
  })
})

// stateToExport is the format-agnostic serializer feeding both JSON exporters.
// Unlike writeAllTokensToCss it must emit the COMPLETE token set, including
// linear and delay.none (which have no slider) plus the overshoot slot, in
// CSS-side units.
describe('stateToExport', () => {
  const snappy = BUILT_IN_PRESETS.find(p => p.id === 'snappy').state

  it('keeps durations and delays as ms numbers (not seconds)', () => {
    const out = stateToExport(INITIAL_STATE)
    expect(out.duration).toEqual({ fast: 100, base: 200, slow: 400, slower: 600 })
    expect(out.delay).toEqual({ none: 0, short: 50, medium: 100, long: 200 })
  })

  it('includes linear, the overshoot slot, and delay.none', () => {
    const out = stateToExport(INITIAL_STATE)
    expect(out.easing.linear).toEqual(EASING_CURVES.linear.fm)
    expect(out.easing.overshoot).toEqual(EASING_CURVES.overshoot.fm)
    expect(out.delay.none).toBe(0)
  })

  it('resolves named easing slots and passes custom bezier arrays through', () => {
    const custom = [0.1, 0.2, 0.3, 0.4]
    const state = { ...INITIAL_STATE, easing: { ...INITIAL_STATE.easing, standard: custom } }
    const out = stateToExport(state)
    expect(out.easing.standard).toEqual(custom)         // custom array passes through
    expect(out.easing.enter).toEqual(EASING_CURVES.enter.fm) // named slot resolves
  })

  it('reflects a built-in preset (Snappy reads standard as the overshoot curve)', () => {
    const out = stateToExport(snappy)
    expect(out.easing.standard).toEqual(EASING_CURVES.overshoot.fm)
    expect(out.duration.fast).toBe(60)
  })

  it('includes the spring family, per preset', () => {
    expect(stateToExport(INITIAL_STATE).spring).toEqual({ stiffness: 170, damping: 20, mass: 1.5 })
    expect(stateToExport(snappy).spring).toEqual({ stiffness: 600, damping: 22, mass: 1 })
  })

  it('includes the duration scalar (1 in every built-in preset)', () => {
    expect(stateToExport(INITIAL_STATE).scalar).toBe(1)
    expect(stateToExport(snappy).scalar).toBe(1)
  })
})

describe('toDtcgJson', () => {
  it('wraps every leaf in $type / $value under a motion namespace', () => {
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    expect(doc.motion.duration.fast).toEqual({ $type: 'duration', $value: { value: 100, unit: 'ms' } })
    expect(doc.motion.easing.standard).toEqual({ $type: 'cubicBezier', $value: EASING_CURVES.standard.fm })
    expect(doc.motion.delay.short).toEqual({ $type: 'duration', $value: { value: 50, unit: 'ms' } })
    expect(doc.motion.scale.lift).toEqual({ $type: 'number', $value: 1.02 })
    // The renamed press keys keep their camelCase JSON spelling (the CSS-kebab
    // conversion is CSS-output-only; see toCssVars below).
    expect(doc.motion.scale.pressBase).toEqual({ $type: 'number', $value: 0.95 })
  })

  it('carries the non-editable constants into the document', () => {
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    expect(doc.motion.easing.linear.$value).toEqual(EASING_CURVES.linear.fm)
    expect(doc.motion.easing.overshoot.$value).toEqual(EASING_CURVES.overshoot.fm)
    expect(doc.motion.delay.none).toEqual({ $type: 'duration', $value: { value: 0, unit: 'ms' } })
  })

  it('serializes spring params as plain number leaves under motion.spring', () => {
    // DTCG has no spring type; the three params are unitless numbers, same $type
    // scale uses. The `spring` group name carries the composite meaning.
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    expect(doc.motion.spring.stiffness).toEqual({ $type: 'number', $value: 170 })
    expect(doc.motion.spring.damping).toEqual({ $type: 'number', $value: 20 })
    expect(doc.motion.spring.mass).toEqual({ $type: 'number', $value: 1.5 })
  })

  it('serializes the duration scalar as a single number leaf under motion.scalar', () => {
    // A lone unitless multiplier, not a group: one number leaf, same $type
    // scale and spring use.
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    expect(doc.motion.scalar).toEqual({ $type: 'number', $value: 1 })
  })
})

describe('toFlatJson', () => {
  it('emits ms strings, cubic-bezier() strings, and bare scale numbers', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    expect(doc.duration.fast).toBe('100ms')
    expect(doc.easing.standard).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
    expect(doc.delay.short).toBe('50ms')
    expect(doc.scale.lift).toBe(1.02)
    expect(doc.scale.pressBase).toBe(0.95)
  })

  it('serializes a custom bezier slot as a cubic-bezier() string', () => {
    const state = { ...INITIAL_STATE, easing: { ...INITIAL_STATE.easing, standard: [0.1, 0.2, 0.3, 0.4] } }
    const doc = JSON.parse(toFlatJson(state))
    expect(doc.easing.standard).toBe('cubic-bezier(0.1, 0.2, 0.3, 0.4)')
  })

  it('emits spring params as bare numbers', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    expect(doc.spring).toEqual({ stiffness: 170, damping: 20, mass: 1.5 })
  })

  it('emits the duration scalar as a bare top-level number', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    expect(doc.scalar).toBe(1)
  })
})

// toCssVars emits a :root block of the editable --motion-* tokens. Its lines must
// match the variable names and units in src/tokens/motion.css exactly, so an
// export is a drop-in replacement for that block.
describe('toCssVars', () => {
  it('emits a :root block with the canonical --motion-* names and units', () => {
    const css = toCssVars(INITIAL_STATE)
    expect(css.startsWith(':root {')).toBe(true)
    expect(css.trimEnd().endsWith('}')).toBe(true)
    expect(css).toContain('--motion-duration-base: 200ms;')
    expect(css).toContain('--motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);')
    expect(css).toContain('--motion-delay-short: 50ms;')
    expect(css).toContain('--motion-scale-lift: 1.02;')
    // The camelCase key pressBase becomes the kebab CSS property --motion-scale-press-base,
    // matching motion.css. This guards the one seam between the two spellings.
    expect(css).toContain('--motion-scale-press-base: 0.95;')
  })

  it('carries linear, the overshoot slot, and delay.none', () => {
    const css = toCssVars(INITIAL_STATE)
    expect(css).toContain('--motion-ease-linear: cubic-bezier(0, 0, 1, 1);')
    expect(css).toContain('--motion-ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);')
    expect(css).toContain('--motion-delay-none: 0ms;')
  })

  it('serializes a custom bezier slot as a cubic-bezier() value', () => {
    const state = { ...INITIAL_STATE, easing: { ...INITIAL_STATE.easing, standard: [0.1, 0.2, 0.3, 0.4] } }
    expect(toCssVars(state)).toContain('--motion-ease-standard: cubic-bezier(0.1, 0.2, 0.3, 0.4);')
  })

  it('emits the unitless spring custom properties', () => {
    const css = toCssVars(INITIAL_STATE)
    expect(css).toContain('--motion-spring-stiffness: 170;')
    expect(css).toContain('--motion-spring-damping: 20;')
    expect(css).toContain('--motion-spring-mass: 1.5;')
  })

  it('emits the --motion-duration-scalar custom property', () => {
    const css = toCssVars(INITIAL_STATE)
    expect(css).toContain('--motion-duration-scalar: 1;')
  })
})

// toFramerMotion emits a JavaScript module of ready Framer Motion values. It is
// the one export in Framer Motion's units (seconds, four-number ease arrays) and
// the only one that states the spring as a native { type: 'spring', ... } config.
// Like toCssVars it produces generated text, not JSON, so these tests assert on
// substrings of the emitted module.
describe('toFramerMotion', () => {
  const cinematic = BUILT_IN_PRESETS.find(p => p.id === 'cinematic').state

  it('emits named exports in seconds, bezier arrays, and unitless scale', () => {
    const js = toFramerMotion(INITIAL_STATE)
    expect(js).toContain('export const durations = {')
    expect(js).toContain('base: 0.2,')          // 200ms -> 0.2s
    expect(js).toContain('slower: 0.6,')        // 600ms -> 0.6s
    expect(js).toContain('export const easings = {')
    expect(js).toContain('standard: [0.4, 0, 0.2, 1],')
    expect(js).toContain('export const delays = {')
    expect(js).toContain('short: 0.05,')        // 50ms -> 0.05s
    expect(js).toContain('export const scale = {')
    expect(js).toContain('pressBase: 0.95,')
  })

  it('carries linear and delay.none, the non-editable constants', () => {
    const js = toFramerMotion(INITIAL_STATE)
    expect(js).toContain('linear: [0, 0, 1, 1],')
    expect(js).toContain('none: 0,')
  })

  it('states the spring as a native Framer Motion config', () => {
    const js = toFramerMotion(INITIAL_STATE)
    expect(js).toContain("export const spring = { type: 'spring', stiffness: 170, damping: 20, mass: 1.5 }")
  })

  it('serializes a custom bezier slot as a four-number array', () => {
    const state = { ...INITIAL_STATE, easing: { ...INITIAL_STATE.easing, standard: [0.1, 0.2, 0.3, 0.4] } }
    expect(toFramerMotion(state)).toContain('standard: [0.1, 0.2, 0.3, 0.4],')
  })

  it('composes transition examples that reference the token exports', () => {
    const js = toFramerMotion(INITIAL_STATE)
    expect(js).toContain('export const transitions = {')
    expect(js).toContain('enter: { duration: durations.base, ease: easings.enter },')
    expect(js).toContain('exit: { duration: durations.fast, ease: easings.exit },')
  })

  it('omits the duration scalar (a Framer Motion transition has no multiplier)', () => {
    expect(toFramerMotion(INITIAL_STATE)).not.toContain('scalar')
  })

  // No-drift: the module must equal what the demos actually run, which is
  // stateToTokens output, not a hardcoded set of values. Deriving the expected
  // seconds and spring from stateToTokens (on a non-default preset, so a constant
  // could not pass by coincidence) pins the two together.
  it('tracks stateToTokens output, never a constant', () => {
    const js = toFramerMotion(cinematic)
    const t = stateToTokens(cinematic)
    expect(js).toContain(`slow: ${t.duration.slow},`)     // 900ms -> 0.9s
    expect(js).toContain(`long: ${t.delay.long},`)        // 400ms -> 0.4s
    expect(js).toContain(
      `stiffness: ${t.spring.stiffness}, damping: ${t.spring.damping}, mass: ${t.spring.mass}`
    )
  })
})

// importTokens is the inverse pipeline: parse, validate, clamp, fill, report.
// It returns a discriminated result and never throws to the caller.
describe('importTokens', () => {
  const snappy = BUILT_IN_PRESETS.find(p => p.id === 'snappy').state

  it('round-trips a DTCG export losslessly, restoring named easing keys', () => {
    // Export flattens easing to arrays; import must canonicalize them back to
    // the named keys so the result deep-equals the original editor state.
    const res = importTokens(toDtcgJson(INITIAL_STATE))
    expect(res.ok).toBe(true)
    expect(res.state).toEqual(INITIAL_STATE)
    expect(res.report.clamped).toEqual([])
    expect(res.report.filled).toEqual([])
    expect(res.report.ignored).toEqual([])
  })

  it('round-trips a flat export losslessly', () => {
    const res = importTokens(toFlatJson(INITIAL_STATE))
    expect(res.ok).toBe(true)
    expect(res.state).toEqual(INITIAL_STATE)
  })

  it('round-trips Snappy, mapping the overshoot array back to the overshoot key', () => {
    const res = importTokens(toDtcgJson(snappy))
    expect(res.ok).toBe(true)
    expect(res.state.easing.standard).toBe('overshoot')
    // the overshoot curve has y 1.56 but it is a named curve, so it is NOT flagged.
    expect(res.report.curvesOutOfRange).toEqual([])
  })

  it('clamps out-of-range scalars to the explore bounds and reports them', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.duration.fast = '2500ms'  // above the 2000ms ceiling
    doc.scale.lift = 1.5          // above the 1.2 ceiling
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.duration.fast).toBe(2000)
    expect(res.state.scale.lift).toBe(1.2)
    expect(res.report.clamped).toEqual([
      { path: 'duration.fast', from: 2500, to: 2000 },
      { path: 'scale.lift', from: 1.5, to: 1.2 },
    ])
  })

  it('fills missing tokens from Standard and reports each one', () => {
    const res = importTokens(JSON.stringify({ duration: { fast: '100ms' } }))
    expect(res.ok).toBe(true)
    expect(res.state.scale).toEqual(INITIAL_STATE.scale)
    expect(res.report.filled).toContainEqual({ path: 'scale.lift', to: INITIAL_STATE.scale.lift })
    expect(res.report.filled).toContainEqual({ path: 'easing.enter', to: 'enter' })
  })

  it('aliases pre-rename scale keys to the new keys, keeping tuned values', () => {
    // A file exported before the 2026-07-21 press/lift rename carries the old
    // scale keys (subtle/base/expressive). Import reads their tuned values into
    // the new keys and reports the rename, rather than dropping the values and
    // refilling from Standard (David's fork-2 call). lift was not renamed.
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    // Non-default tuned values, so a silent refill-from-Standard would show.
    doc.scale = { subtle: 0.91, base: 0.82, expressive: 0.73, lift: 1.06 }
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.scale).toEqual({
      pressSubtle: 0.91, pressBase: 0.82, pressExpressive: 0.73, lift: 1.06,
    })
    expect(res.report.renamed).toEqual([
      { from: 'scale.subtle', to: 'scale.pressSubtle' },
      { from: 'scale.base', to: 'scale.pressBase' },
      { from: 'scale.expressive', to: 'scale.pressExpressive' },
    ])
    // Old keys are recognized-as-renamed, not foreign; nothing filled from Standard.
    expect(res.report.ignored).toEqual([])
    expect(res.report.filled).toEqual([])
  })

  it('reports foreign keys but suppresses the expected constants', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.color = { brand: '#0f0' }     // foreign family
    doc.duration.fastt = '100ms'      // misspelled key
    const res = importTokens(JSON.stringify(doc))
    expect(res.report.ignored).toContainEqual({ path: 'color' })
    expect(res.report.ignored).toContainEqual({ path: 'duration.fastt' })
    // A clean Cadence export carries linear, overshoot, and delay.none, and all
    // three are classified (linear + delay.none as fixed, overshoot as editable),
    // so a round-tripped file reports nothing ignored.
    const dtcg = JSON.parse(toDtcgJson(INITIAL_STATE))
    const res2 = importTokens(JSON.stringify(dtcg))
    expect(res2.report.ignored).toEqual([])
  })

  it('flags a custom overshooting curve as outside the draggable region', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.easing.standard = 'cubic-bezier(0.3, 1.4, 0.6, 1)'  // y 1.4, no preset match
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.easing.standard).toEqual([0.3, 1.4, 0.6, 1])
    expect(res.report.curvesOutOfRange).toEqual([{ slot: 'standard' }])
  })

  it('fails on invalid JSON without throwing', () => {
    const res = importTokens('{ not json')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/valid JSON/)
  })

  it('fails on a structurally unrecognized object', () => {
    expect(importTokens('{"hello":1}').ok).toBe(false)
  })

  it('fails on a curve whose x is out of the legal [0,1] range', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.easing.standard = 'cubic-bezier(1.2, 0, 0.2, 1)'
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/x values/)
  })

  it('round-trips the spring family, per preset', () => {
    const res = importTokens(toDtcgJson(snappy))
    expect(res.ok).toBe(true)
    expect(res.state.spring).toEqual({ stiffness: 600, damping: 22, mass: 1 })
  })

  it('clamps an out-of-range spring param to its bound and reports it', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.spring.stiffness = 5000  // above the 2000 ceiling
    doc.spring.mass = 20         // above the 10 ceiling
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.spring.stiffness).toBe(2000)
    expect(res.state.spring.mass).toBe(10)
    expect(res.report.clamped).toContainEqual({ path: 'spring.stiffness', from: 5000, to: 2000 })
    expect(res.report.clamped).toContainEqual({ path: 'spring.mass', from: 20, to: 10 })
  })

  it('rejects a non-positive spring param as a structural error', () => {
    // A spring with zero/negative stiffness, damping, or mass never settles, so
    // it is rejected (like an out-of-range bezier x), not clamped.
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.spring.damping = 0
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/greater than 0/)
  })

  it('fills a missing spring family from Standard and reports each param', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    delete doc.spring
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.spring).toEqual(INITIAL_STATE.spring)
    expect(res.report.filled).toContainEqual({ path: 'spring.stiffness', to: 170 })
  })

  it('reports a foreign spring key', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.spring.wobble = 3
    const res = importTokens(JSON.stringify(doc))
    expect(res.report.ignored).toContainEqual({ path: 'spring.wobble' })
  })

  it('round-trips the duration scalar and never reports it as foreign', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.scalar = 1.5
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.scalar).toBe(1.5)
    // scalar is a legitimate lone token, suppressed from the foreign report.
    expect(res.report.ignored).toEqual([])
  })

  it('clamps an out-of-range duration scalar to its bound and reports it', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.scalar = 10  // above the max of 4
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.scalar).toBe(4)
    expect(res.report.clamped).toContainEqual({ path: 'scalar', from: 10, to: 4 })
  })

  it('rejects a non-positive duration scalar as a structural error', () => {
    // A scalar of 0 freezes every duration and a negative one inverts them, so
    // it is rejected (like a spring param at zero), not clamped.
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    doc.scalar = 0
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/greater than 0/)
  })

  it('fills a missing duration scalar from Standard and reports it', () => {
    const doc = JSON.parse(toFlatJson(INITIAL_STATE))
    delete doc.scalar
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.scalar).toBe(1)
    expect(res.report.filled).toContainEqual({ path: 'scalar', to: 1 })
  })
})

// ─── Token value math and display ─────────────────────────────────────────────
// Moved here from src/components/CodeBlock/offSystem.js on 2026-09-13, with
// these tests, when the token audit needed the same arithmetic and could not
// import upward into components/.
describe('token value math', () => {
  const tokens = stateToTokens(INITIAL_STATE)

  it('prints the literal as source and the display with its unit', () => {
    expect(formatLiteral('duration.fast', 0.25)).toBe('0.25')
    expect(formatLiteral('duration.fast', 0.1234567)).toBe('0.123')
    expect(formatLiteral('ease.standard', [0.4, 0, 0.2, 1])).toBe('[0.4, 0, 0.2, 1]')
    expect(formatDisplay('duration.fast', 0.25)).toBe('0.25s')
    expect(formatDisplay('delay.short', 0.05)).toBe('0.05s')
    expect(formatDisplay('scale.lift', 1.02)).toBe('1.02')
  })

  it('finds the nearest key in the family and says whether it matches', () => {
    expect(nearestToken('duration.fast', 0.25, tokens)).toEqual({ key: 'duration.base', value: 0.2, matches: false })
    expect(nearestToken('duration.fast', 0.2, tokens).matches).toBe(true)
    expect(nearestToken('ease.overshoot', [0.34, 1.56, 0.64, 1], tokens)).toEqual({ key: 'ease.overshoot', value: [0.34, 1.56, 0.64, 1], matches: true })
    expect(nearestToken('ease.overshoot', [0.4, 0.1, 0.2, 1], tokens).key).toBe('ease.standard')
  })

  it('returns null where the family holds nothing comparable', () => {
    expect(nearestToken('duration.fast', 0.25, {})).toBe(null)
    expect(nearestToken('nonsense.key', 0.25, tokens)).toBe(null)
  })
})

// ─── DTCG 2025.10 leaf shape ──────────────────────────────────────────────────
// The Design Tokens Format Module 2025.10 (stable, 28 October 2025) requires a
// duration $value to be an object, { value, unit }. Cadence emitted the "100ms"
// string an earlier draft allowed, so export moved to the object and import
// learned to read the object, the old string, and a bare number. These pin all
// three, and pin the rule that only a duration-typed leaf may carry the object.
describe('DTCG duration leaves (2025.10)', () => {
  // What cadence-tokens 1.0.0 wrote for the same state: every duration-typed
  // leaf as a string. Downgraded from the current export rather than typed out,
  // so it stays a faithful old file of whatever the token set holds today.
  const legacyDtcg = state => {
    const doc = JSON.parse(toDtcgJson(state))
    for (const family of ['duration', 'delay']) {
      for (const [key, leaf] of Object.entries(doc.motion[family])) {
        doc.motion[family][key] = { $type: 'duration', $value: `${leaf.$value.value}ms` }
      }
    }
    return JSON.stringify(doc)
  }

  it('writes every duration and delay leaf as { value, unit: ms }', () => {
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    for (const family of ['duration', 'delay']) {
      for (const [key, leaf] of Object.entries(doc.motion[family])) {
        expect(leaf.$type, `${family}.${key}`).toBe('duration')
        expect(leaf.$value, `${family}.${key}`).toEqual({ value: expect.any(Number), unit: 'ms' })
      }
    }
  })

  it('round-trips the object form back to the same state', () => {
    const res = importTokens(toDtcgJson(INITIAL_STATE))
    expect(res.ok).toBe(true)
    expect(res.state).toEqual(INITIAL_STATE)
    expect(res.report.filled).toEqual([])
  })

  it('reads a seconds leaf as milliseconds', () => {
    // The spec permits 's' as well as 'ms'. Cadence never writes it; a file from
    // another tool may, and 0.4 * 1000 must land on 400, not 400.00000000000006.
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    doc.motion.duration.slow.$value = { value: 0.4, unit: 's' }
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(true)
    expect(res.state.duration.slow).toBe(400)
    expect(res.report.clamped).toEqual([])
  })

  it('still loads a legacy file whose duration leaves are strings', () => {
    const res = importTokens(legacyDtcg(INITIAL_STATE))
    expect(res.ok).toBe(true)
    expect(res.state).toEqual(INITIAL_STATE)
    expect(res.report.clamped).toEqual([])
    expect(res.report.filled).toEqual([])
    expect(res.report.ignored).toEqual([])
  })

  it('rejects an unknown unit, naming the leaf', () => {
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    doc.motion.duration.base.$value = { value: 200, unit: 'frames' }
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(false)
    expect(res.error).toContain('duration.base')
    expect(res.error).toContain('ms or s')
  })

  it('rejects a { value, unit } object on a number leaf', () => {
    // scale is DTCG `number`. An object there is a broken file, not a duration
    // in disguise, which is why import keys the object branch on the family.
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    doc.motion.scale.lift.$value = { value: 1.02, unit: 'ms' }
    const res = importTokens(JSON.stringify(doc))
    expect(res.ok).toBe(false)
    expect(res.error).toContain('scale.lift')
  })

  it('reads a deviation leaf in either form to the same override', () => {
    const deviations = [{ component: 'Button', token: 'duration.fast', value: 0.25 }]
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE, { deviations }))
    const modern = importTokens(JSON.stringify(doc))
    const entry = doc.$extensions['com.davidpreli.cadence'].deviations[0]
    entry.$value = `${entry.$value.value}ms`
    const legacy = importTokens(JSON.stringify(doc))
    expect(modern.ok).toBe(true)
    expect(modern.deviations).toEqual(deviations)
    expect(legacy.ok).toBe(true)
    expect(legacy.deviations).toEqual(modern.deviations)
  })
})

// ─── Reduced motion ───────────────────────────────────────────────────────────
// One resolution, three readers: the site's provider, the CSS export's media
// block, and the resolver document. The provider's half is pinned site-side in
// src/context/reducedMotionDrift.test.js.
describe('reduced motion', () => {
  it('writes a media block carrying the resolution, after the root block', () => {
    const css = toCssVars(INITIAL_STATE)
    expect(css.indexOf(':root {')).toBeLessThan(css.indexOf('@media'))
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain(`  --motion-duration-fast: ${REDUCED_MOTION_RESOLUTION.duration}ms;`)
    expect(css).toContain(`  --motion-delay-long: ${REDUCED_MOTION_RESOLUTION.delay}ms;`)
  })

  it('replaces the two time families and nothing else', () => {
    const css = toCssVars(INITIAL_STATE)
    const media = css.slice(css.indexOf('@media'))
    for (const family of ['ease', 'scale', 'spring']) {
      expect(media, family).not.toContain(`--motion-${family}-`)
    }
    expect(media).not.toContain('--motion-duration-scalar')
    expect(REDUCED_MOTION_RESOLUTION.unchanged).toEqual(['easing', 'scale', 'spring', 'scalar'])
  })

  it('carries the block into the published prefix too, one emitter', () => {
    const css = toCssVars(INITIAL_STATE, { prefix: '--cadence-' })
    expect(css).toContain(`  --cadence-duration-base: ${REDUCED_MOTION_RESOLUTION.duration}ms;`)
    expect(css).not.toContain('--motion-')
  })

  it('keeps the deviations comment after the media block', () => {
    const deviations = [{ component: 'Button', token: 'duration.fast', value: 0.25 }]
    const css = toCssVars(INITIAL_STATE, { deviations })
    expect(css.indexOf('@media')).toBeLessThan(css.indexOf('Button reads duration.fast'))
  })
})

describe('toResolverJson', () => {
  const doc = () => JSON.parse(toResolverJson())

  it('declares the 2025.10 root the spec requires', () => {
    const d = doc()
    expect(d.version).toBe('2025.10')
    expect(d.$schema).toBe('https://www.designtokens.org/schemas/2025.10/resolver.json')
    expect(Array.isArray(d.resolutionOrder)).toBe(true)
  })

  it('orders the set under the modifier, by reference not by name', () => {
    // resolutionOrder holds reference objects; later entries override earlier,
    // so the modifier has to come second or the context would never win.
    expect(doc().resolutionOrder).toEqual([
      { $ref: '#/sets/tokens' },
      { $ref: '#/modifiers/motion' },
    ])
  })

  it('points the set at the token document beside it', () => {
    expect(doc().sets.tokens.sources).toEqual([{ $ref: 'cadence.tokens.json' }])
    expect(JSON.parse(toResolverJson({ tokensFile: 'elsewhere.json' })).sets.tokens.sources)
      .toEqual([{ $ref: 'elsewhere.json' }])
  })

  it('gives full motion an empty context and defaults to it', () => {
    // The spec allows an empty context array explicitly. Full motion adds
    // nothing, so the set underneath stands as authored.
    const m = doc().modifiers.motion
    expect(m.contexts.full).toEqual([])
    expect(m.default).toBe('full')
    expect(Object.keys(m.contexts)).toContain(m.default)
  })

  it('carries the reduced values as 2025.10 duration leaves', () => {
    const [source] = doc().modifiers.motion.contexts.reduced
    const { duration, delay } = source.motion
    expect(Object.keys(duration).sort()).toEqual([...EDITABLE_TOKEN_SCHEMA.duration].sort())
    expect(Object.keys(delay).sort()).toEqual(['none', ...EDITABLE_TOKEN_SCHEMA.delay].sort())
    for (const leaf of Object.values(duration)) {
      expect(leaf).toEqual({ $type: 'duration', $value: { value: REDUCED_MOTION_RESOLUTION.duration, unit: 'ms' } })
    }
    for (const leaf of Object.values(delay)) {
      expect(leaf).toEqual({ $type: 'duration', $value: { value: REDUCED_MOTION_RESOLUTION.delay, unit: 'ms' } })
    }
  })

  it('names only what it replaces, so the rest resolves from the set', () => {
    const [source] = doc().modifiers.motion.contexts.reduced
    expect(Object.keys(source.motion).sort()).toEqual(['delay', 'duration'])
  })
})

// ─── Off-system deviations ────────────────────────────────────────────────────
// A deviation is one demo component running a literal in place of the token it
// names (the Token Lab off-system edit, 2026-09-09). It never enters state; each
// export carries it as an appendix in its own idiom, and import hands it back
// beside the state. These pin the translation both ways and the "absent when
// empty" rule that keeps a clean export byte-identical to before.
describe('deviations', () => {
  const deviations = [
    { component: 'Button', token: 'duration.fast', value: 0.25 },
    { component: 'Card', token: 'ease.overshoot', value: [0.3, 1.4, 0.6, 1] },
    { component: 'Toggle', token: 'spring.stiffness', value: 420 },
  ]

  it('leaves every format unchanged when there are none', () => {
    expect(toDtcgJson(INITIAL_STATE, { deviations: [] })).toBe(toDtcgJson(INITIAL_STATE))
    expect(toFlatJson(INITIAL_STATE, { deviations: [] })).toBe(toFlatJson(INITIAL_STATE))
    expect(toCssVars(INITIAL_STATE, { deviations: [] })).toBe(toCssVars(INITIAL_STATE))
    expect(toFramerMotion(INITIAL_STATE, { deviations: [] })).toBe(toFramerMotion(INITIAL_STATE))
    expect(toDtcgJson(INITIAL_STATE)).not.toContain('$extensions')
    expect(toFlatJson(INITIAL_STATE)).not.toContain('deviations')
  })

  it('does not touch the token blocks', () => {
    const plain = JSON.parse(toDtcgJson(INITIAL_STATE))
    const withDev = JSON.parse(toDtcgJson(INITIAL_STATE, { deviations }))
    expect(withDev.motion).toEqual(plain.motion)
    const flat = JSON.parse(toFlatJson(INITIAL_STATE, { deviations }))
    expect(flat.duration.fast).toBe('100ms')
  })

  it('serializes in each format\'s own units and family spelling', () => {
    const dtcg = JSON.parse(toDtcgJson(INITIAL_STATE, { deviations }))
    const list = dtcg.$extensions['com.davidpreli.cadence'].deviations
    expect(list[0]).toEqual({ component: 'Button', token: 'duration.fast', $type: 'duration', $value: { value: 250, unit: 'ms' } })
    expect(list[1]).toEqual({ component: 'Card', token: 'easing.overshoot', $type: 'cubicBezier', $value: [0.3, 1.4, 0.6, 1] })
    expect(list[2]).toEqual({ component: 'Toggle', token: 'spring.stiffness', $type: 'number', $value: 420 })

    const flat = JSON.parse(toFlatJson(INITIAL_STATE, { deviations }))
    expect(flat.deviations[0]).toEqual({ component: 'Button', token: 'duration.fast', value: '250ms' })
    expect(flat.deviations[1].value).toBe('cubic-bezier(0.3, 1.4, 0.6, 1)')

    const css = toCssVars(INITIAL_STATE, { deviations })
    expect(css).toContain('--motion-duration-fast: 100ms;')
    expect(css).toContain('Button reads duration.fast as 250ms')
    expect(css).toContain('Card reads easing.overshoot as cubic-bezier(0.3, 1.4, 0.6, 1)')

    const fm = toFramerMotion(INITIAL_STATE, { deviations })
    expect(fm).toContain('export const deviations = [')
    expect(fm).toContain("{ component: 'Button', token: 'duration.fast', value: 0.25 },")
    expect(fm).toContain("{ component: 'Card', token: 'ease.overshoot', value: [0.3, 1.4, 0.6, 1] },")
  })

  it('round-trips through DTCG and flat, back in runtime units', () => {
    for (const text of [toDtcgJson(INITIAL_STATE, { deviations }), toFlatJson(INITIAL_STATE, { deviations })]) {
      const result = importTokens(text)
      expect(result.ok).toBe(true)
      expect(result.state).toEqual(INITIAL_STATE)
      expect(result.deviations).toEqual(deviations)
      expect(result.report.deviations).toBe(3)
      expect(result.report.ignored).toEqual([])
    }
  })

  it('reports zero deviations on a file without any', () => {
    const result = importTokens(toFlatJson(INITIAL_STATE))
    expect(result.deviations).toEqual([])
    expect(result.report.deviations).toBe(0)
  })

  it('rejects a deviation naming a token the editor cannot hold', () => {
    const flat = JSON.parse(toFlatJson(INITIAL_STATE))
    flat.deviations = [{ component: 'Button', token: 'duration.glacial', value: '250ms' }]
    const result = importTokens(JSON.stringify(flat))
    expect(result.ok).toBe(false)
    expect(result.error).toContain('not an editable token')
  })

  it('rejects a deviation with no component and clamps a scalar to the Explore bounds', () => {
    const flat = JSON.parse(toFlatJson(INITIAL_STATE))
    flat.deviations = [{ token: 'duration.fast', value: '250ms' }]
    expect(importTokens(JSON.stringify(flat)).ok).toBe(false)
    flat.deviations = [{ component: 'Button', token: 'duration.fast', value: '9000ms' }]
    const result = importTokens(JSON.stringify(flat))
    expect(result.ok).toBe(true)
    expect(result.deviations[0].value).toBe(2)   // 2000ms cap, back to seconds
  })
})
