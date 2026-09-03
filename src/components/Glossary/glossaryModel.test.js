import { describe, it, expect } from 'vitest'
import { buildGlossaryModel, PRESET_LABELS } from './glossaryModel'
import {
  EDITABLE_TOKEN_SCHEMA,
  FIXED_REFERENCE_PATHS,
  BUILT_IN_PRESETS,
} from 'cadence-tokens'
import { TOKEN_COMPONENT_MAP } from '../../data/tokenConsumption'

const model = buildGlossaryModel()
const allRows = model.families.flatMap(f => f.rows)

describe('buildGlossaryModel completeness (the item-5 exit criterion)', () => {
  it('every editable token appears as a row', () => {
    const rowKeys = new Set(
      model.families.flatMap(f => f.rows.map(r => `${f.id}.${r.key}`))
    )
    for (const [family, keys] of Object.entries(EDITABLE_TOKEN_SCHEMA)) {
      for (const key of keys) {
        expect(rowKeys.has(`${family}.${key}`), `${family}.${key} missing from the guide`).toBe(true)
      }
    }
  })

  it('the fixed references and the scalar appear too', () => {
    const rowKeys = new Set(
      model.families.flatMap(f => f.rows.map(r => `${f.id}.${r.key}`))
    )
    for (const fixed of FIXED_REFERENCE_PATHS) {
      expect(rowKeys.has(fixed), `${fixed} missing`).toBe(true)
    }
    expect(rowKeys.has('scalar.scalar')).toBe(true)
  })

  it('every row carries provenance and a value per preset', () => {
    for (const row of allRows) {
      expect(row.provenance, `${row.property}: no provenance`).not.toBeNull()
      for (const preset of BUILT_IN_PRESETS) {
        expect(row.values[preset.id], `${row.property}: no ${preset.id} value`).toBeTruthy()
      }
    }
  })
})

describe('row content', () => {
  it('formats durations with units and beziers with their curve names', () => {
    const duration = model.families.find(f => f.id === 'duration')
    expect(duration.rows.find(r => r.key === 'base').values.standard).toBe('200ms')
    const easing = model.families.find(f => f.id === 'easing')
    // Standard's standard slot resolves to the named Standard curve; Snappy's
    // re-points at Overshoot, and the annotation should say so.
    expect(easing.rows.find(r => r.key === 'standard').values.standard)
      .toBe('Standard · cubic-bezier(0.4, 0, 0.2, 1)')
    expect(easing.rows.find(r => r.key === 'standard').values.snappy)
      .toMatch(/^Overshoot · cubic-bezier/)
  })

  it('CSS property names ride the same key seam the exports use', () => {
    const scale = model.families.find(f => f.id === 'scale')
    expect(scale.rows.find(r => r.key === 'pressSubtle').property)
      .toBe('--motion-scale-press-subtle')
  })

  it('consumers come from the consumption map', () => {
    const duration = model.families.find(f => f.id === 'duration')
    expect(duration.rows.find(r => r.key === 'fast').consumers)
      .toEqual(TOKEN_COMPONENT_MAP['duration.fast'])
  })
})

describe('components view', () => {
  it('inverts the consumption map exactly', () => {
    // Every (path, component) pair in the map appears as (component, path),
    // and nothing else does.
    const pairsFromMap = new Set()
    for (const [path, comps] of Object.entries(TOKEN_COMPONENT_MAP)) {
      for (const c of comps) pairsFromMap.add(`${c}|${path}`)
    }
    const pairsFromModel = new Set()
    for (const comp of model.components) {
      for (const path of comp.reads) pairsFromModel.add(`${comp.name}|${path}`)
    }
    expect([...pairsFromModel].sort()).toEqual([...pairsFromMap].sort())
  })

  it('components are alphabetical', () => {
    const names = model.components.map(c => c.name)
    expect(names).toEqual([...names].sort())
  })
})

describe('preset labels', () => {
  it('mirror the built-in presets', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(PRESET_LABELS[p.id]).toBe(p.label)
    }
  })
})
