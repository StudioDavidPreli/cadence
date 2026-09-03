import { describe, it, expect } from 'vitest'
import {
  toDtcgDoc,
  toDtcgJson,
  toCssVars,
  buildTokensDocument,
  buildRiveDefaults,
  AMBIENT_PRESETS,
  AMBIENT_BASE_PERIOD,
  BUILT_IN_PRESETS,
  INITIAL_STATE,
} from './index.js'

// The item-2 additions to the package surface: the toDtcgDoc split, the CSS
// prefix argument, the ambient vocabulary, and the composed document. The
// existing index.test.js pins the original emitters; this file pins what the
// extraction added.

describe('toDtcgDoc / toDtcgJson', () => {
  it('toDtcgJson is exactly the stringified toDtcgDoc', () => {
    // The split exists so buildTokensDocument can embed the object form.
    // If the two ever diverge, the published document and the in-app DTCG
    // export could disagree, which is the drift the split must not introduce.
    expect(toDtcgJson(INITIAL_STATE)).toBe(JSON.stringify(toDtcgDoc(INITIAL_STATE), null, 2))
  })
})

describe('toCssVars prefix (decision D4)', () => {
  it('defaults to --motion- so the in-app export is unchanged', () => {
    const css = toCssVars(INITIAL_STATE)
    expect(css).toContain('--motion-duration-base: 200ms;')
    expect(css).toContain('--motion-duration-scalar: 1;')
    expect(css).not.toContain('--cadence-')
  })

  it('emits an alternate prefix on every property, including the lone scalar', () => {
    const css = toCssVars(INITIAL_STATE, { prefix: '--cadence-' })
    expect(css).toContain('--cadence-duration-base: 200ms;')
    expect(css).toContain('--cadence-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);')
    expect(css).toContain('--cadence-scale-press-subtle: 0.98;')
    expect(css).toContain('--cadence-duration-scalar: 1;')
    expect(css).not.toContain('--motion-')
  })

  it('changes nothing but the property names between prefixes', () => {
    const motion = toCssVars(INITIAL_STATE)
    const cadence = toCssVars(INITIAL_STATE, { prefix: '--cadence-' })
    expect(cadence.replaceAll('--cadence-', '--motion-')).toBe(motion)
  })
})

describe('ambient presets (decision D5)', () => {
  it('carries the three personalities under the same ids as the interaction presets', () => {
    expect(Object.keys(AMBIENT_PRESETS).sort()).toEqual(
      BUILT_IN_PRESETS.map(p => p.id).sort()
    )
  })

  it('orders spread snappy < standard < cinematic (the documented field ordering)', () => {
    expect(AMBIENT_PRESETS.snappy.spread).toBeLessThan(AMBIENT_PRESETS.standard.spread)
    expect(AMBIENT_PRESETS.standard.spread).toBeLessThan(AMBIENT_PRESETS.cinematic.spread)
  })

  it('every preset carries the full ambient vocabulary and a Rive instance name', () => {
    for (const preset of Object.values(AMBIENT_PRESETS)) {
      expect(preset).toMatchObject({
        label: expect.any(String),
        riveInstance: expect.any(String),
        speed: expect.any(Number),
        easing: expect.any(Number),
        spread: expect.any(Number),
        cell: expect.any(Number),
        gap: expect.any(Number),
      })
    }
  })
})

describe('buildTokensDocument', () => {
  const doc = buildTokensDocument({ version: '9.9.9' })

  it('carries the injected version and the ambient base period', () => {
    expect(doc.name).toBe('cadence-tokens')
    expect(doc.version).toBe('9.9.9')
    expect(doc.ambientBasePeriodSeconds).toBe(AMBIENT_BASE_PERIOD)
  })

  it('holds all three presets with both vocabularies each', () => {
    for (const preset of BUILT_IN_PRESETS) {
      const entry = doc.presets[preset.id]
      expect(entry.label).toBe(preset.label)
      // interaction is the preset's own DTCG motion group, byte-identical to
      // what the in-app export would produce for that preset's state.
      expect(entry.interaction).toEqual(toDtcgDoc(preset.state).motion)
      expect(entry.ambient.riveInstance).toBe(AMBIENT_PRESETS[preset.id].riveInstance)
      expect(entry.ambient.speed).toBe(AMBIENT_PRESETS[preset.id].speed)
    }
  })

  it('does not duplicate the label inside ambient', () => {
    // The preset-level label names the personality once; ambient carries the
    // values and the instance name only.
    expect(doc.presets.standard.ambient.label).toBeUndefined()
  })

  it('is JSON-serializable without loss', () => {
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc)
  })
})

describe('buildRiveDefaults (build-order item 3)', () => {
  const defaults = buildRiveDefaults()

  it('names the view model and carries all three presets', () => {
    expect(defaults.viewModel).toBe('PathEffectVM')
    expect(Object.keys(defaults.presets).sort()).toEqual(Object.keys(AMBIENT_PRESETS).sort())
  })

  it('maps each preset to its VM instance and the four VM properties, under the .riv property names', () => {
    for (const [id, ambient] of Object.entries(AMBIENT_PRESETS)) {
      const preset = defaults.presets[id]
      expect(preset.instance).toBe(ambient.riveInstance)
      // cell/gap (the ambient vocabulary) become cellSize/gapSize (the VM
      // property names in the shipped files); the emitter owns that seam.
      expect(preset.properties).toEqual({
        speed: ambient.speed,
        easing: ambient.easing,
        cellSize: ambient.cell,
        gapSize: ambient.gap,
      })
    }
  })

  it('keeps spread out of the VM properties and in the clock block', () => {
    // spread is a field-level stagger the clock applies, not a VM binding;
    // documenting it as a property would describe wiring that does not exist.
    for (const preset of Object.values(defaults.presets)) {
      expect(preset.properties.spread).toBeUndefined()
    }
    expect(defaults.clock.basePeriodSeconds).toBe(AMBIENT_BASE_PERIOD)
    expect(defaults.clock.spread.standard).toBe(AMBIENT_PRESETS.standard.spread)
  })

  it('is JSON-serializable without loss', () => {
    expect(JSON.parse(JSON.stringify(defaults))).toEqual(defaults)
  })
})
