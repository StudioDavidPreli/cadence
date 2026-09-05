import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  toAfterEffects,
  toAfterEffectsControls,
  stateToExport,
  INITIAL_STATE,
  BUILT_IN_PRESETS,
} from './index.js'

const snappy = BUILT_IN_PRESETS.find(p => p.id === 'snappy')

describe('toAfterEffectsControls', () => {
  const controls = toAfterEffectsControls(INITIAL_STATE)
  const byName = Object.fromEntries(controls.map(([name, type, value]) => [name, { type, value }]))

  it('carries the values stateToExport resolves', () => {
    const t = stateToExport(INITIAL_STATE)
    expect(byName['Duration Base (ms)'].value).toBe(t.duration.base)
    expect(byName['Delay Long (ms)'].value).toBe(t.delay.long)
    expect(byName['Scale Press Subtle'].value).toBe(t.scale.pressSubtle)
    expect(byName['Spring Stiffness (unused)'].value).toBe(t.spring.stiffness)
  })

  it('splits each four-number curve into P1/P2 point pairs', () => {
    const t = stateToExport(INITIAL_STATE)
    for (const label of ['Standard', 'Overshoot', 'Enter', 'Exit']) {
      const arr = t.easing[label.toLowerCase()]
      expect(byName[`Ease ${label} P1`]).toEqual({ type: 'point', value: [arr[0], arr[1]] })
      expect(byName[`Ease ${label} P2`]).toEqual({ type: 'point', value: [arr[2], arr[3]] })
    }
  })

  it('omits what the gate excluded: linear, delay.none, the scalar, and rig-owned controls', () => {
    const names = Object.keys(byName).join('|')
    expect(names).not.toMatch(/Linear/)
    expect(names).not.toMatch(/Delay None/)
    expect(names).not.toMatch(/Retime|Scalar/)
    expect(names).not.toMatch(/Token$/m) // the routing dropdowns end in "Token"
  })

  it('preset values flow through (Snappy differs from Standard)', () => {
    const snappyControls = Object.fromEntries(
      toAfterEffectsControls(snappy.state).map(([n, , v]) => [n, v])
    )
    expect(snappyControls['Duration Base (ms)']).toBe(120)
    expect(snappyControls['Spring Stiffness (unused)']).toBe(600)
    // Snappy re-points its standard slot at the overshoot curve.
    expect(snappyControls['Ease Standard P1']).toEqual([0.34, 1.56])
  })
})

describe('toAfterEffects (the emitted script)', () => {
  const script = toAfterEffects(INITIAL_STATE, { label: 'Standard', version: '9.9.9' })

  it('names the layer, the preset, and the generator version', () => {
    expect(script).toContain("var LAYER_NAME = 'TOKENS Motion';")
    expect(script).toContain("var PRESET = 'Standard';")
    expect(script).toContain('cadence-tokens 9.9.9')
  })

  it('embeds every control as a literal', () => {
    for (const [name] of toAfterEffectsControls(INITIAL_STATE)) {
      expect(script).toContain(`'${name}'`)
    }
    expect(script).toContain("['Duration Base (ms)', 'slider', 200]")
    expect(script).toContain("['Ease Overshoot P1', 'point', [0.34, 1.56]]")
  })

  it('is ES3: no arrows, no const/let, no template literals', () => {
    // ExtendScript predates all three; any of them would fail inside AE, not
    // here — so here is where they must fail.
    expect(script).not.toMatch(/=>/)
    expect(script).not.toMatch(/\bconst /)
    expect(script).not.toMatch(/\blet /)
    expect(script).not.toContain('`')
  })

  it('updates in place and never deletes (the Q1 semantics, textually pinned)', () => {
    expect(script).toContain('numKeys > 0')       // keyframed controls skip
    expect(script).toContain('addProperty')       // missing controls are added
    expect(script).not.toContain('.remove()')     // nothing is ever deleted
  })
})

// The naming seam with the rig, as a failing test instead of a convention:
// every control name the emitter writes must appear verbatim in the rig
// source, because AE expressions reach controls by name. Skipped (not passed)
// if the rig file is absent, so the published package's own tests do not
// depend on the repo layout.
const rigPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', 'tools', 'after-effects', 'CadenceButtonRig.jsx',
)

describe.skipIf(!existsSync(rigPath))('control names match CadenceButtonRig verbatim', () => {
  const rigSource = readFileSync(rigPath, 'utf8')
  // The emitter's Enter/Exit pairs are its own addition (gate Q2): they ride
  // along unread, so the rig has no line to match. Everything else must.
  const RIDE_ALONG = /^Ease (Enter|Exit) P[12]$/

  it('every rig-read control name appears in the rig source', () => {
    for (const [name] of toAfterEffectsControls(INITIAL_STATE)) {
      if (RIDE_ALONG.test(name)) continue
      expect(rigSource, `rig source does not name '${name}'`).toContain(`'${name}'`)
    }
  })
})
