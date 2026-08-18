import { describe, it, expect } from 'vitest'
import { auditTokens, auditToMarkdown, THRESHOLDS, NIELSEN_RESPONSE_MS } from './tokenAudit'
import { INITIAL_STATE, BUILT_IN_PRESETS } from '../data/motionPresets'

// Build a state by overriding one family of INITIAL_STATE, so each test states
// only the thing it is testing and everything else stays at a known-clean value.
function withState(overrides) {
  return {
    ...INITIAL_STATE,
    ...overrides,
    duration: { ...INITIAL_STATE.duration, ...overrides.duration },
    delay: { ...INITIAL_STATE.delay, ...overrides.delay },
    scale: { ...INITIAL_STATE.scale, ...overrides.scale },
    spring: { ...INITIAL_STATE.spring, ...overrides.spring },
  }
}

const ids = result => result.findings.map(f => f.id)

// ─── The bar the thresholds are anchored to ──────────────────────────────────
// This is the test the module is calibrated against, not just a smoke check. The
// three built-in presets are the system's own statement of what is reasonable, so
// any threshold that fires on one of them is measuring the wrong thing. If a
// preset is ever retuned and this fails, the question is which of the two is
// wrong, and the answer is not automatically the preset.
describe('the shipped presets audit clean', () => {
  for (const preset of BUILT_IN_PRESETS) {
    it(`${preset.label} produces no findings and no notes`, () => {
      expect(auditTokens(preset.state).findings).toEqual([])
    })
  }

  it('Cinematic sits past the response reference and is still clean', () => {
    // The point of the two-half design: an editorial set gets told where it
    // landed, and is not told it is wrong for landing there.
    const cinematic = BUILT_IN_PRESETS.find(p => p.id === 'cinematic').state
    const result = auditTokens(cinematic)
    const budget = result.measurements.find(m => m.id === 'budget.interaction')

    expect(budget.display).toBe('1800ms')
    expect(budget.reference.exceeded).toBe(true)
    expect(result.findings).toEqual([])
  })

  it('keeps every preset spring in proportion to its own duration ladder', () => {
    // The proportional bar is 5x. The shipped presets sit near 1x, which is the
    // smoke check that the ratio is not absurdly tight.
    for (const preset of BUILT_IN_PRESETS) {
      const settle = auditTokens(preset.state).measurements.find(m => m.id === 'spring.settle')
      expect(settle).toBeDefined()
      expect(preset.state.duration.slower).toBeGreaterThan(0)
    }
  })
})

// ─── The bars themselves ─────────────────────────────────────────────────────
// Pinned so that moving one is a deliberate edit with a failing test attached,
// rather than a quiet change to what the tool tells strangers about their work.

describe('thresholds and references', () => {
  it('cites one industry number and nothing else', () => {
    expect(NIELSEN_RESPONSE_MS).toBe(1000)
  })

  it('judges the spring by proportion, not by the clock', () => {
    expect(THRESHOLDS.springSettleRatio).toBe(5)
    expect(THRESHOLDS.springOvershootNote).toBe(0.5)
    // No absolute duration bar exists. If one is ever added, it needs an
    // authority behind it, and this assertion is where that argument lands.
    expect(Object.keys(THRESHOLDS)).toEqual(['springSettleRatio', 'springOvershootNote'])
  })
})

// ─── Measurements ────────────────────────────────────────────────────────────
// The half that is always present. A set with nothing wrong with it still reports
// what it does, which is what makes the output a report rather than a verdict.

describe('measurements', () => {
  const measureIds = state => auditTokens(state).measurements.map(m => m.id)

  it('reports every measurement for a clean set', () => {
    expect(measureIds(INITIAL_STATE)).toEqual([
      'spring.settle',
      'spring.overshoot',
      'spring.damping',
      'budget.interaction',
    ])
  })

  it('cites Nielsen on the interaction budget without failing the set', () => {
    // Cinematic sits at 1800ms, past the reference and clean.
    const cinematic = BUILT_IN_PRESETS.find(p => p.id === 'cinematic').state
    const result = auditTokens(cinematic)
    const budget = result.measurements.find(m => m.id === 'budget.interaction')

    expect(budget.display).toBe('1800ms')
    expect(budget.reference.value).toBe(NIELSEN_RESPONSE_MS)
    expect(budget.reference.exceeded).toBe(true)
    // Exceeding the industry reference is a fact, not a fault.
    expect(result.findings).toEqual([])
  })

  it('marks the reference unexceeded when the set stays inside it', () => {
    const result = auditTokens(withState({ duration: { slower: 400 }, delay: { long: 200 } }))
    const budget = result.measurements.find(m => m.id === 'budget.interaction')
    expect(budget.display).toBe('600ms')
    expect(budget.reference.exceeded).toBe(false)
  })

  it('names the spring regime alongside the damping ratio', () => {
    const under = auditTokens(withState({ spring: { stiffness: 170, damping: 20, mass: 1.5 } }))
    expect(under.measurements.find(m => m.id === 'spring.damping').display).toContain('underdamped')

    const over = auditTokens(withState({ spring: { stiffness: 100, damping: 90, mass: 1 } }))
    expect(over.measurements.find(m => m.id === 'spring.damping').display).toContain('overdamped')
  })

  it('omits spring measurements when the spring cannot be measured', () => {
    expect(measureIds({ duration: INITIAL_STATE.duration, delay: INITIAL_STATE.delay }))
      .toEqual(['budget.interaction'])
  })
})

// ─── Ladder coherence ────────────────────────────────────────────────────────

describe('duration ladder', () => {
  it('flags an inversion between adjacent rungs', () => {
    const result = auditTokens(withState({ duration: { fast: 900 } }))
    expect(ids(result)).toContain('duration.order.fast-base')
    expect(result.counts.finding).toBe(1)
  })

  it('flags every inversion the ladder contains, not just the first', () => {
    // A fully reversed ladder: 600 / 400 / 200 / 100. Scoped to the duration
    // family: this fixture also leaves a 587ms spring against a 100ms slowest
    // duration, which the proportional spring check correctly picks up, and that
    // is not what this test is about.
    const result = auditTokens(withState({
      duration: { fast: 600, base: 400, slow: 200, slower: 100 },
    }))
    expect(ids(result).filter(id => id.startsWith('duration.'))).toEqual([
      'duration.order.fast-base',
      'duration.order.base-slow',
      'duration.order.slow-slower',
    ])
  })

  it('treats equal neighbours as a note, not a finding', () => {
    const result = auditTokens(withState({ duration: { fast: 200 } }))
    expect(ids(result)).toContain('duration.duplicate.fast-base')
    expect(result.counts.finding).toBe(0)
    expect(result.counts.note).toBe(1)
  })

  it('says nothing about a ladder that climbs', () => {
    const result = auditTokens(withState({ duration: { fast: 100, base: 200, slow: 400, slower: 800 } }))
    expect(ids(result).filter(id => id.startsWith('duration.'))).toEqual([])
  })
})

describe('delay ladder', () => {
  it('flags an inversion', () => {
    const result = auditTokens(withState({ delay: { short: 500 } }))
    expect(ids(result)).toContain('delay.order.short-medium')
  })

  it('is silent on a clean ladder', () => {
    expect(auditTokens(withState({ delay: { short: 10, medium: 20, long: 30 } })).findings).toEqual([])
  })
})

// ─── Scale semantics ─────────────────────────────────────────────────────────

describe('scale semantics', () => {
  it('flags a press that grows', () => {
    // 1.15 is inside the Explore range (0.50 to 1.20), so import accepts it.
    const result = auditTokens(withState({ scale: { pressSubtle: 1.15 } }))
    expect(ids(result)).toContain('scale.press.pressSubtle')
  })

  it('flags a press sitting exactly at rest', () => {
    const result = auditTokens(withState({ scale: { pressBase: 1 } }))
    expect(ids(result)).toContain('scale.press.pressBase')
  })

  it('flags a lift that shrinks', () => {
    const result = auditTokens(withState({ scale: { lift: 0.6 } }))
    expect(ids(result)).toContain('scale.lift')
  })

  it('flags a press ladder whose intensity runs backwards', () => {
    // expressive presses less than base, so the two names describe each other.
    const result = auditTokens(withState({
      scale: { pressSubtle: 0.9, pressBase: 0.95, pressExpressive: 0.98 },
    }))
    expect(ids(result)).toEqual([
      'scale.order.pressSubtle-pressBase',
      'scale.order.pressBase-pressExpressive',
    ])
  })

  it('notes a duplicated press step', () => {
    const result = auditTokens(withState({ scale: { pressBase: 0.98 } }))
    expect(ids(result)).toContain('scale.duplicate.pressSubtle-pressBase')
    expect(result.counts.finding).toBe(0)
  })
})

// ─── Spring budget ───────────────────────────────────────────────────────────

describe('spring budget', () => {
  // The case the module exists for: all three values pass SPRING_BOUNDS
  // individually (stiffness >= 1, damping >= 1, mass <= 10) and together they
  // describe a spring that rings for over a minute.
  it('flags a spring assembled entirely from in-range values', () => {
    const result = auditTokens(withState({ spring: { stiffness: 1, damping: 1, mass: 10 } }))
    const finding = result.findings.find(f => f.id === 'spring.disproportionate')
    expect(finding.severity).toBe('finding')
    expect(finding.message).toMatch(/inside its own range/)
    // The finding names the duration it measured against, not just the spring.
    expect(finding.paths).toContain('duration.slower')
  })

  it('judges the spring against the set it lives in, not against the clock', () => {
    const spring = { stiffness: 12, damping: 6, mass: 2 }
    // Identical spring, two sets. Fast durations make it disproportionate;
    // editorial durations make it the correct choice for that system.
    const fast = auditTokens(withState({ spring, duration: { slower: 200 } }))
    const slow = auditTokens(withState({ spring, duration: { slower: 1400 } }))

    expect(ids(fast)).toContain('spring.disproportionate')
    expect(ids(slow)).not.toContain('spring.disproportionate')
  })

  it('skips the proportional check when there is no ratio to form', () => {
    const result = auditTokens(withState({
      spring: { stiffness: 1, damping: 1, mass: 10 },
      duration: { fast: 0, base: 0, slow: 0, slower: 0 },
    }))
    expect(ids(result)).not.toContain('spring.disproportionate')
    // The perceptual note still covers it.
    expect(ids(result)).toContain('spring.settle')
  })

  it('notes a spring that outlasts the response reference without being broken', () => {
    // Slow durations, so the spring is in proportion to its set and the only
    // thing said about it is the perceptual note.
    const result = auditTokens(withState({
      spring: { stiffness: 12, damping: 6, mass: 2 },
      duration: { slower: 1400 },
    }))
    const settle = result.findings.find(f => f.id === 'spring.settle')
    expect(settle.severity).toBe('note')
    expect(ids(result)).not.toContain('spring.disproportionate')
  })

  it('reports overshoot separately from settle time', () => {
    // Damping ratio 0.2 (a 53% overshoot) with a natural frequency of 40, so the
    // transient dies in about 0.49s. It overshoots hard and still settles fast.
    const result = auditTokens(withState({ spring: { stiffness: 1600, damping: 16, mass: 1 } }))
    const overshoot = result.findings.find(f => f.id === 'spring.overshoot')
    expect(overshoot).toBeDefined()
    expect(overshoot.severity).toBe('note')
    // Fast enough that settle never fires: the two checks are independent.
    expect(ids(result)).not.toContain('spring.settle')
  })

  it('says nothing about a well-damped spring', () => {
    expect(auditTokens(withState({ spring: { stiffness: 170, damping: 20, mass: 1.5 } })).findings)
      .toEqual([])
  })

  it('claims nothing about a non-positive spring (import rejects it first)', () => {
    expect(auditTokens(withState({ spring: { stiffness: 0 } })).findings).toEqual([])
  })
})

// ─── Interaction budget ──────────────────────────────────────────────────────

describe('interaction budget', () => {
  // Measurement only, by design. How slow a design language wants to be is the
  // author's call; the audit's job is to make sure they know the number.
  it('reports the slowest composition without ever failing it', () => {
    const result = auditTokens(withState({
      duration: { fast: 100, base: 200, slow: 400, slower: 2000 },
      delay: { short: 50, medium: 100, long: 1500 },
    }))
    const budget = result.measurements.find(m => m.id === 'budget.interaction')
    expect(budget.display).toBe('3500ms')
    expect(budget.reference.exceeded).toBe(true)
    expect(ids(result)).not.toContain('budget.interaction')
  })
})

// ─── Robustness ──────────────────────────────────────────────────────────────
// The audit runs on live editor state as well as on an import result, so a
// partial object must be skipped rather than guessed at or thrown on.

describe('partial and malformed state', () => {
  it('returns an empty result for undefined', () => {
    expect(auditTokens(undefined)).toEqual({
      findings: [],
      measurements: [],
      counts: { finding: 0, note: 0 },
    })
  })

  it('returns an empty result for an empty object', () => {
    expect(auditTokens({}).findings).toEqual([])
  })

  it('skips a family that is missing and still audits the rest', () => {
    const result = auditTokens({ duration: { fast: 900, base: 200 } })
    expect(ids(result)).toEqual(['duration.order.fast-base'])
  })

  it('skips non-numeric values without throwing', () => {
    expect(() => auditTokens({
      duration: { fast: '100ms', base: null, slow: undefined, slower: NaN },
      scale: { lift: 'big' },
      spring: { stiffness: 'stiff', damping: 20, mass: 1.5 },
    })).not.toThrow()
  })
})

// ─── The report as a document ────────────────────────────────────────────────

describe('auditToMarkdown', () => {
  it('says so plainly when a set is clean', () => {
    const md = auditToMarkdown(INITIAL_STATE)
    expect(md).toContain('# Motion token audit')
    expect(md).toContain('Nothing in this set contradicts itself.')
    expect(md).not.toContain('## Findings')
  })

  it('carries measurements even when there is nothing wrong', () => {
    const md = auditToMarkdown(INITIAL_STATE)
    expect(md).toContain('## Measurements')
    expect(md).toContain('| Slowest composition | 800ms |')
    expect(md).toContain('Nielsen response threshold')
  })

  it('marks an exceeded reference without calling it a failure', () => {
    const cinematic = BUILT_IN_PRESETS.find(p => p.id === 'cinematic').state
    const md = auditToMarkdown(cinematic)
    expect(md).toContain('exceeded')
    expect(md).toContain('Nothing in this set contradicts itself.')
  })

  it('separates findings from notes', () => {
    const md = auditToMarkdown(withState({
      duration: { fast: 900 },
      delay: { short: 100, medium: 100 },
    }))
    expect(md).toContain('## Findings')
    expect(md).toContain('## Notes')
    expect(md).toMatch(/\*\*duration\.fast, duration\.base\*\*: fast \(900ms\)/)
  })

  it('prints the audited values with their units', () => {
    const md = auditToMarkdown(INITIAL_STATE)
    expect(md).toContain('## Tokens audited')
    expect(md).toContain('| fast | 100ms |')
    expect(md).toContain('| pressBase | 0.95 |')
    expect(md).toContain('| stiffness | 170 |')
  })

  it('records easing as carried, not as audited', () => {
    const md = auditToMarkdown(INITIAL_STATE)
    expect(md).toContain('### easing (not audited)')
  })

  it('renders a custom curve as its cubic-bezier', () => {
    const md = auditToMarkdown(withState({ easing: { ...INITIAL_STATE.easing, standard: [0.1, 0.2, 0.3, 0.4] } }))
    expect(md).toContain('cubic-bezier(0.1, 0.2, 0.3, 0.4)')
  })

  it('takes the timestamp as a parameter so the output stays deterministic', () => {
    const a = auditToMarkdown(INITIAL_STATE, { presetLabel: 'Standard', generatedAt: '2026-08-18' })
    const b = auditToMarkdown(INITIAL_STATE, { presetLabel: 'Standard', generatedAt: '2026-08-18' })
    expect(a).toBe(b)
    expect(a).toContain('Standard · 2026-08-18')
  })

  it('survives a partial state', () => {
    expect(() => auditToMarkdown({ duration: { fast: 100 } })).not.toThrow()
  })
})
