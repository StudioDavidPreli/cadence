// The linter's model against two kinds of fixture: the e2e manifest's 74
// entries (the site's own files, as the gate recorded them on built output),
// and raw runtime reads saved from the item 9 probe (files from Rive's own
// repositories and one deliberately broken tile). Nothing here loads a .riv;
// that is the page's job, verified by e2e (e2e/rivlint-page.spec.js).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  normalizeInventory,
  toManifestEntry,
  handoff,
  lint,
  diffInventories,
  checkContract,
  buildReport,
  parseReport,
  defaultArtboardOf,
  INPUT_TYPE_NAMES,
  REPORT_FORMAT,
} from './lintModel'

const manifest = JSON.parse(readFileSync(path.join(__dirname, '..', '..', '..', 'e2e', 'rivlint', 'manifest.json'), 'utf8'))
const fixture = name => JSON.parse(readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'))

const unbound = normalizeInventory(fixture('r4c1-unbound'))
const healthy = normalizeInventory(fixture('r4c1-healthy'))
const ore = normalizeInventory(fixture('ore-duplicate-font'))
const assetCheck = normalizeInventory(fixture('asset-load-check'))
const globals = normalizeInventory(fixture('global-variables'))
const stocks = normalizeInventory(fixture('stocks'))
const nested = normalizeInventory(fixture('nested-default'))

const rules = (inv, rule) => lint(inv).filter(f => f.rule === rule)
const fails = inv => lint(inv).filter(f => f.severity === 'fail')

describe('the manifest round-trips (the site\'s 74 files as fixtures)', () => {
  it('has the expected number of entries', () => {
    expect(Object.keys(manifest).length).toBe(74)
  })

  for (const [file, entry] of Object.entries(manifest)) {
    it(`${file}: normalize then project equals the recorded entry`, () => {
      expect(toManifestEntry(parseReport(entry))).toEqual(entry)
    })
  }

  it('no site file fails a fail-level rule', () => {
    for (const [file, entry] of Object.entries(manifest)) {
      expect(fails(parseReport(entry)).map(f => `${file}: ${f.path}`)).toEqual([])
    }
  })

  it('every site file agrees with itself as a contract', () => {
    for (const entry of Object.values(manifest)) {
      const inv = parseReport(entry)
      expect(checkContract(inv, inv)).toEqual({ pass: true, failures: [], additions: [] })
    }
  })
})

describe('normalizeInventory', () => {
  it('turns input type codes into words', () => {
    const star = nested.artboards.find(a => a.name === 'Star')
    expect(star.stateMachines[0].inputs).toEqual([
      { name: 'Hover', type: 'boolean' },
      { name: 'Click', type: 'trigger' },
    ])
    expect(INPUT_TYPE_NAMES).toEqual({ 56: 'number', 58: 'trigger', 59: 'boolean' })
  })

  it('classifies assets as embedded, referenced, or hosted', () => {
    const byName = Object.fromEntries(assetCheck.assets.map(a => [a.name, a]))
    expect(byName['Copse']).toMatchObject({ kind: 'font', storage: 'embedded', bytes: 72252 })
    expect(byName['cat.jpg']).toMatchObject({ kind: 'image', storage: 'embedded' })
    expect(byName['Kenia']).toMatchObject({ kind: 'font', storage: 'referenced', bytes: 0 })
    expect(byName['Kite One']).toMatchObject({ kind: 'font', storage: 'hosted' })
    expect(byName['sloth.jpg']).toMatchObject({ kind: 'image', storage: 'hosted' })
  })

  it('reads the per-artboard default from the probe map', () => {
    expect(healthy.artboards[0].defaultViewModel).toBe('PathEffectVM')
    expect(unbound.artboards[0].defaultViewModel).toBe(null)
  })

  it('carries child view model properties and enums', () => {
    const dashboard = stocks.viewModels.find(v => v.name === 'Dashboard')
    const apple = dashboard.children.find(c => c.property === 'apple')
    expect(apple.properties.map(p => p.name)).toEqual(['currentColor', 'name', 'stockChange'])
    expect(stocks.enums).toEqual([{ name: 'shape', values: ['triangle', 'square', 'circle'] }])
  })

  it('leaves sections a partial read did not carry undefined, not empty', () => {
    const partial = parseReport(manifest['riveTiles/group2/r1c1.riv'])
    expect(partial.enums).toBeUndefined()
    expect(partial.assets).toBeUndefined()
    expect(partial.artboards[0].stateMachines[0].inputs).toBeUndefined()
  })
})

describe('the default artboard is a property of the file', () => {
  it('is read from the file, not from list position', () => {
    expect(stocks.defaultArtboard).toBe('Main')
    expect(defaultArtboardOf(stocks)).toEqual({ artboard: stocks.artboards[0], assumed: false })
    const reordered = { ...stocks, artboards: [...stocks.artboards].reverse() }
    expect(defaultArtboardOf(reordered).artboard.name).toBe('Main')
    expect(handoff(reordered).defaultArtboard.assumed).toBe(false)
  })

  it('falls back to the first listed, flagged as assumed, when the read did not carry it', () => {
    const bare = parseReport(manifest['rive/hero3.riv'])
    if (bare.defaultArtboard === undefined) {
      expect(defaultArtboardOf(bare)).toEqual({ artboard: bare.artboards[0], assumed: true })
      expect(handoff(bare).defaultArtboard.assumed).toBe(true)
    } else {
      expect(handoff(bare).defaultArtboard.assumed).toBe(false)
    }
  })

  it('the unbound rule follows the file\'s default artboard', () => {
    // Put a healthy artboard first and the unbound one as the file's default.
    const inv = { ...unbound, defaultArtboard: 'r4c1', artboards: [{ ...healthy.artboards[0], name: 'other' }, ...unbound.artboards] }
    expect(rules(inv, 'unbound-default-artboard').map(f => f.path)).toEqual(['artboard "r4c1"'])
  })

  it('a changed default artboard is a diff entry and a contract failure', () => {
    const moved = { ...stocks, defaultArtboard: 'Stock' }
    expect(diffInventories(stocks, moved)).toEqual([{ path: 'default artboard', change: 'changed', from: 'Main', to: 'Stock' }])
    expect(checkContract(stocks, moved).pass).toBe(false)
  })
})

describe('handoff (the facts a consumer needs first)', () => {
  it('leads with the default artboard, its machines and inputs, and every view model', () => {
    const h = handoff(stocks)
    expect(h.defaultArtboard.name).toBe('Main')
    expect(h.defaultArtboard.assumed).toBe(false)
    expect(h.defaultArtboard.defaultViewModel).toBe('Dashboard')
    expect(h.defaultArtboard.stateMachines.map(s => s.name)).toEqual(['State Machine 1'])
    expect(h.viewModels.map(v => v.name)).toEqual(['Dashboard', 'Stock'])
    expect(h.viewModels[0].properties.find(p => p.name === 'logoShape').type).toBe('enumType')
  })

  it('is null for a file with no artboards', () => {
    expect(handoff(normalizeInventory({ artboards: [], viewModels: [] })).defaultArtboard).toBe(null)
  })
})

describe('rules', () => {
  it('unbound-default-artboard: the reproduced r4c1 failure fails, its healthy twin does not', () => {
    const f = rules(unbound, 'unbound-default-artboard')
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ severity: 'fail', path: 'artboard "r4c1"' })
    expect(rules(healthy, 'unbound-default-artboard')).toEqual([])
    // On every key the manifest records, the two are identical: this is the
    // rule the site's own gate lacked until 2026-09-08.
    const strip = inv => toManifestEntry({ ...inv, artboards: inv.artboards.map(a => ({ ...a, defaultViewModel: undefined })) })
    expect(strip(unbound)).toEqual(strip(healthy))
  })

  it('unbound-default-artboard does not fire for a file with no view models', () => {
    expect(rules(nested, 'unbound-default-artboard')).toEqual([])
  })

  it('duplicate-name: instances that share a name fail, naming each', () => {
    const f = rules(globals, 'duplicate-name')
    expect(f.map(x => x.path)).toEqual([
      'view model "Child" / instance "Child Instance"',
      'view model "Colors" / instance "Colors Override"',
      'view model "Labels" / instance "Labels Override"',
    ])
    expect(f.every(x => x.severity === 'fail')).toBe(true)
  })

  it('duplicate-name covers artboards, machines, inputs and properties', () => {
    const inv = normalizeInventory({
      artboards: [
        { name: 'A', animations: [], stateMachines: [{ name: 'S', inputs: [{ name: 'x', type: 56 }, { name: 'x', type: 59 }] }, { name: 'S', inputs: [] }] },
        { name: 'A', animations: [], stateMachines: [] },
      ],
      viewModels: [{ name: 'V', instances: [], properties: [{ name: 'p', type: 'number' }, { name: 'p', type: 'color' }] }],
    })
    expect(rules(inv, 'duplicate-name').map(x => x.path)).toEqual([
      'artboard "A"',
      'artboard "A" / state machine "S"',
      'artboard "A" / state machine "S" / input "x"',
      'view model "V" / property "p"',
    ])
  })

  it('hosted-asset and referenced-asset warn per asset', () => {
    expect(rules(assetCheck, 'hosted-asset').map(x => x.path)).toEqual(['asset "Kite One"', 'asset "sloth.jpg"'])
    expect(rules(assetCheck, 'referenced-asset').map(x => x.path)).toEqual(['asset "flower.jpeg"', 'asset "Kenia"'])
    expect(lint(assetCheck).filter(f => f.rule.endsWith('-asset')).every(f => f.severity === 'warn')).toBe(true)
  })

  it('duplicate-embedded-asset and large-embedded-font: Inter three times in ore.riv', () => {
    const dup = rules(ore, 'duplicate-embedded-asset')
    expect(dup).toHaveLength(1)
    expect(dup[0].message).toContain('3 times')
    expect(dup[0].message).toContain('2.6 MB')
    expect(rules(ore, 'large-embedded-font')).toHaveLength(3)
    expect(rules(healthy, 'large-embedded-font')).toEqual([])
  })

  it('default-name notes the editor\'s names and nothing else', () => {
    const notes = rules(nested, 'default-name')
    expect(notes.every(n => n.severity === 'note')).toBe(true)
    expect(notes.map(n => n.path)).toContain('artboard "Start" / state machine "State Machine 1"')
    expect(notes.map(n => n.path)).toContain('artboard "Start" / timeline "Animation 1"')
    expect(notes.map(n => n.path)).not.toContain('artboard "Star"')
    // The site's own tiles carry the editor's timeline name: a note the page
    // will show on a Cadence file, honestly.
    expect(rules(healthy, 'default-name').map(n => n.path)).toEqual(['artboard "r4c1" / timeline "Timeline 1"'])
  })

  it('no-named-instance and no-state-machine are notes', () => {
    const inv = normalizeInventory({
      artboards: [{ name: 'Bare', animations: ['idle'], stateMachines: [] }],
      viewModels: [{ name: 'Model', instances: [], properties: [] }],
    })
    expect(rules(inv, 'no-state-machine')).toMatchObject([{ severity: 'note', path: 'artboard "Bare"' }])
    expect(rules(inv, 'no-named-instance')).toMatchObject([{ severity: 'note', path: 'view model "Model"' }])
  })

  it('default-name knows the input defaults too', () => {
    const inv = normalizeInventory({
      artboards: [{ name: 'Main', animations: [], stateMachines: [{ name: 'main', inputs: [{ name: 'Trigger 1', type: 58 }, { name: 'Number 2', type: 56 }, { name: 'Boolean 1', type: 59 }, { name: 'isOpen', type: 59 }] }] }],
      viewModels: [],
    })
    expect(rules(inv, 'default-name').map(n => n.path)).toEqual([
      'artboard "Main" / state machine "main" / input "Boolean 1"',
      'artboard "Main" / state machine "main" / input "Number 2"',
      'artboard "Main" / state machine "main" / input "Trigger 1"',
    ])
  })

  it('no-named-instance treats the editor\'s empty-string instance as none', () => {
    expect(stocks.viewModels.find(v => v.name === 'Dashboard').instances).toEqual([''])
    expect(rules(stocks, 'no-named-instance').map(n => n.path)).toEqual(['view model "Dashboard"'])
    expect(rules(healthy, 'no-named-instance')).toEqual([])
  })

  it('a partial inventory produces no asset or input findings', () => {
    const partial = parseReport(manifest['rive/hero3.riv'])
    expect(lint(partial).filter(f => f.rule.includes('asset'))).toEqual([])
  })

  it('sorts fail, then warn, then note', () => {
    const sev = lint(assetCheck).map(f => f.severity)
    const order = { fail: 0, warn: 1, note: 2 }
    for (let i = 1; i < sev.length; i++) expect(order[sev[i]]).toBeGreaterThanOrEqual(order[sev[i - 1]])
  })
})

describe('diffInventories', () => {
  it('reads the r4c1 break as one change: the default view model', () => {
    expect(diffInventories(healthy, unbound)).toEqual([
      { path: 'artboard "r4c1" default view model', change: 'changed', from: 'PathEffectVM', to: null },
    ])
  })

  it('is empty for identical inventories', () => {
    expect(diffInventories(stocks, stocks)).toEqual([])
  })

  it('reports vanished, appeared, and retyped by path', () => {
    const a = parseReport(manifest['riveTiles/group2/r1c1.riv'])
    const b = JSON.parse(JSON.stringify(manifest['riveTiles/group2/r1c1.riv']))
    b.viewModels[0].instances = b.viewModels[0].instances.filter(i => i !== 'snappy')
    b.viewModels[0].properties.push({ name: 'extra', type: 'number' })
    b.viewModels[0].properties.find(p => p.name === 'cellSize').type = 'string'
    b.artboards[0].animations.push('Timeline 2')
    const d = diffInventories(a, parseReport(b))
    expect(d).toEqual(expect.arrayContaining([
      { path: 'view model "PathEffectVM" / instance "snappy"', change: 'vanished', from: undefined, to: undefined },
      { path: 'view model "PathEffectVM" / property "extra"', change: 'appeared', from: undefined, to: undefined },
      { path: 'view model "PathEffectVM" / property "cellSize" type', change: 'changed', from: 'number', to: 'string' },
      { path: 'artboard "r1c1" / timeline "Timeline 2"', change: 'appeared', from: undefined, to: undefined },
    ]))
    expect(d).toHaveLength(4)
  })

  it('a rename reads as one vanished and one appeared', () => {
    const b = JSON.parse(JSON.stringify(manifest['rive/measureTitles.riv']))
    b.artboards[0].name = 'measureTitle'
    const d = diffInventories(parseReport(manifest['rive/measureTitles.riv']), parseReport(b))
    expect(d.map(e => `${e.change} ${e.path}`)).toEqual(['vanished artboard "measureTitles"', 'appeared artboard "measureTitle"'])
  })

  it('does not report a section one side does not carry', () => {
    // Full read on one side, bare manifest entry on the other: inputs, enums
    // and assets are unknown to the entry, not absent from it.
    const full = healthy
    const bare = parseReport(toManifestEntry(healthy))
    expect(diffInventories(full, bare)).toEqual([])
  })

  it('keys duplicate assets by occurrence', () => {
    const fewer = normalizeInventory({ ...fixture('ore-duplicate-font'), assets: fixture('ore-duplicate-font').assets.slice(0, 2) })
    expect(diffInventories(ore, fewer)).toEqual([{ path: 'asset "Inter (3)"', change: 'vanished', from: undefined, to: undefined }])
  })
})

describe('checkContract (a previous report as the definition, superset)', () => {
  it('the broken export fails its healthy report, naming the key', () => {
    const r = checkContract(healthy, unbound)
    expect(r.pass).toBe(false)
    expect(r.failures.map(f => f.path)).toEqual(['artboard "r4c1" default view model'])
  })

  it('a re-export that gains a property passes with the addition listed', () => {
    const b = JSON.parse(JSON.stringify(manifest['riveTiles/group2/r1c1.riv']))
    b.viewModels[0].properties.push({ name: 'extra', type: 'number' })
    const r = checkContract(parseReport(manifest['riveTiles/group2/r1c1.riv']), parseReport(b))
    expect(r.pass).toBe(true)
    expect(r.additions.map(a => a.path)).toEqual(['view model "PathEffectVM" / property "extra"'])
  })

  it('a lost instance fails; the doctored-baseline case the e2e proved', () => {
    const b = JSON.parse(JSON.stringify(manifest['riveTiles/group2/r1c2.riv']))
    b.viewModels[0].instances = b.viewModels[0].instances.filter(i => i !== 'snappy')
    const r = checkContract(parseReport(manifest['riveTiles/group2/r1c2.riv']), parseReport(b))
    expect(r.failures.map(f => f.path)).toEqual(['view model "PathEffectVM" / instance "snappy"'])
  })
})

describe('report i/o', () => {
  it('buildReport wraps the inventory with meta; parseReport reads it back', () => {
    const report = buildReport(fixture('stocks'), { file: 'stocks.riv', size: 808511, runtime: '2.38.4', date: '2026-09-08' })
    expect(report.meta).toEqual({ format: REPORT_FORMAT, file: 'stocks.riv', size: 808511, runtime: '2.38.4', date: '2026-09-08' })
    expect(parseReport(JSON.parse(JSON.stringify(report)))).toEqual(stocks)
  })

  it('a report projected onto the manifest keys is a valid baseline row', () => {
    const entry = toManifestEntry(parseReport(buildReport(fixture('r4c1-healthy'), { file: 'r4c1.riv', size: 11458, runtime: '2.38.4', date: '2026-09-08' })))
    expect(Object.keys(entry)).toEqual(['defaultArtboard', 'artboards', 'viewModels'])
    expect(entry.defaultArtboard).toBe('r4c1')
    expect(Object.keys(entry.artboards[0])).toEqual(['name', 'animations', 'stateMachines', 'defaultViewModel'])
    expect(entry.artboards[0].stateMachines).toEqual(['r4c1SM'])
  })

  it('rejects objects that are none of the three shapes', () => {
    expect(parseReport(null)).toBe(null)
    expect(parseReport({ hello: 1 })).toBe(null)
    expect(parseReport({ artboards: 'no', viewModels: [] })).toBe(null)
  })
})
