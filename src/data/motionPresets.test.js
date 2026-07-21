import { describe, it, expect } from 'vitest'
import {
  stateToTokens,
  stateToExport,
  toDtcgJson,
  toFlatJson,
  toCssVars,
  importTokens,
  INITIAL_STATE,
  BUILT_IN_PRESETS,
  EASING_CURVES,
} from './motionPresets'

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
    expect(doc.motion.duration.fast).toEqual({ $type: 'duration', $value: '100ms' })
    expect(doc.motion.easing.standard).toEqual({ $type: 'cubicBezier', $value: EASING_CURVES.standard.fm })
    expect(doc.motion.delay.short).toEqual({ $type: 'duration', $value: '50ms' })
    expect(doc.motion.scale.lift).toEqual({ $type: 'number', $value: 1.02 })
    // The renamed press keys keep their camelCase JSON spelling (the CSS-kebab
    // conversion is CSS-output-only; see toCssVars below).
    expect(doc.motion.scale.pressBase).toEqual({ $type: 'number', $value: 0.95 })
  })

  it('carries the non-editable constants into the document', () => {
    const doc = JSON.parse(toDtcgJson(INITIAL_STATE))
    expect(doc.motion.easing.linear.$value).toEqual(EASING_CURVES.linear.fm)
    expect(doc.motion.easing.overshoot.$value).toEqual(EASING_CURVES.overshoot.fm)
    expect(doc.motion.delay.none).toEqual({ $type: 'duration', $value: '0ms' })
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
