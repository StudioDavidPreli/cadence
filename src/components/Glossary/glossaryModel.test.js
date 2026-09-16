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

  // The sites (2026-09-15): every component carries its moments from the site
  // table, and the union of their tokens is exactly the component's reads.
  // motionSites.test.js proves the same equality from the table's side; this
  // proves the model carried it through without dropping or inventing a site.
  it('every component has sites whose tokens union to its reads', () => {
    for (const comp of model.components) {
      expect(comp.sites.length, comp.name).toBeGreaterThan(0)
      const union = [...new Set(comp.sites.flatMap(s => s.tokens))].sort()
      expect(union, comp.name).toEqual([...comp.reads].sort())
      for (const site of comp.sites) {
        expect(site.name, `${comp.name}.${site.name}`).toMatch(/^[a-z][a-z-]*$/)
        expect(site.moment, `${comp.name}.${site.name}`).toMatch(/\.$/)
        expect(Array.isArray(site.fixed)).toBe(true)
      }
    }
  })

  it('fixed reads ride the sites for display and never join the reads', () => {
    const spinner = model.components.find(c => c.name === 'Spinner')
    expect(spinner.sites.some(s => s.fixed.includes('easing.linear'))).toBe(true)
    expect(spinner.reads).not.toContain('easing.linear')
  })

  it('a site with no transition of its own says whose timing it borrows', () => {
    const card = model.components.find(c => c.name === 'Card')
    const dim = card.sites.find(s => s.name === 'dim')
    expect(dim.timingFrom).toBe('deselect')
    expect(card.sites.some(s => s.name === 'deselect')).toBe(true)
  })
})

describe('preset labels', () => {
  it('mirror the built-in presets', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(PRESET_LABELS[p.id]).toBe(p.label)
    }
  })
})
