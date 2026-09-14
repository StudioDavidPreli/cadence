import { describe, it, expect } from 'vitest'
import { EDITABLE_TOKEN_SCHEMA } from 'cadence-tokens'
import { TOKEN_COMPONENT_MAP } from './tokenConsumption'
import {
  MOTION_SITES, SITE_COMPONENTS, tokensForComponent, componentsForToken, sitesForToken,
} from './motionSites'

// The site table says WHERE in a component a token is read. The consumption map
// says WHICH components read it. Those two are the same fact seen from two
// sides, so they can check each other, and this file is that check.
//
// What it proves: the union of every token the site table attributes to a
// component equals that component's row in the consumption map, in both
// directions. A site invented out of nothing, a token attributed to a component
// whose source never reads it, or a read dropped from either file fails here.
//
// What it cannot prove: which SITE a token belongs to. That is authored
// judgment, read off the components by hand. No test can tell whether
// duration.fast belongs to Button's press or its release, only that Button
// reads it somewhere.

// The control-layer paths with a slider behind them. easing.linear and
// delay.none are not among them, which is why the table keeps them in `fixed`
// and this file ignores that field.
const EDITABLE_PATHS = Object.entries(EDITABLE_TOKEN_SCHEMA)
  .flatMap(([family, keys]) => keys.map(key => `${family}.${key}`))

describe('the site table and the consumption map agree', () => {
  it('covers exactly the components the map knows', () => {
    const mapped = [...new Set(Object.values(TOKEN_COMPONENT_MAP).flat())].sort()
    expect(SITE_COMPONENTS.slice().sort()).toEqual(mapped)
  })

  it('attributes each token to exactly the components the map lists', () => {
    for (const [path, components] of Object.entries(TOKEN_COMPONENT_MAP)) {
      expect(componentsForToken(path), path).toEqual(components.slice().sort())
    }
  })

  it('attributes no token the map does not carry', () => {
    const known = new Set(Object.keys(TOKEN_COMPONENT_MAP))
    for (const component of SITE_COMPONENTS) {
      for (const path of tokensForComponent(component)) {
        expect(known.has(path), `${component} reads ${path}, which the map does not carry`).toBe(true)
      }
    }
  })
})

describe('every site is well formed', () => {
  it('names each site once per component, in a stable slug', () => {
    for (const [component, sites] of Object.entries(MOTION_SITES)) {
      const names = sites.map(s => s.name)
      expect(new Set(names).size, component).toBe(names.length)
      for (const name of names) {
        expect(name, `${component}.${name}`).toMatch(/^[a-z][a-z-]*$/)
      }
    }
  })

  it('says what moment it is, in a sentence', () => {
    // A sentence, not a word count. "The panel collapses." is a complete answer
    // and an earlier version of this check rejected it for being short, which
    // was the test arguing with the prose rather than reading it.
    for (const [component, sites] of Object.entries(MOTION_SITES)) {
      for (const site of sites) {
        const at = `${component}.${site.name}`
        expect(site.moment, at).toMatch(/^[A-Z]/)
        expect(site.moment, at).toMatch(/\.$/)
        expect(site.moment.trim().split(/\s+/).length, at).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('reads only real token paths, editable ones in tokens and fixed ones in fixed', () => {
    const editable = new Set(EDITABLE_PATHS)
    for (const [component, sites] of Object.entries(MOTION_SITES)) {
      for (const site of sites) {
        for (const path of site.tokens) {
          expect(editable.has(path), `${component}.${site.name} reads ${path}`).toBe(true)
        }
        for (const path of site.fixed ?? []) {
          expect(editable.has(path), `${component}.${site.name} lists editable ${path} as fixed`).toBe(false)
          expect(path, `${component}.${site.name}`).toMatch(/^(easing|delay)\./)
        }
      }
    }
  })

  it('gives every site something to read, or borrows its timing from a named sibling', () => {
    // A site with no tokens of its own is only coherent if it either carries a
    // fixed read (the indeterminate sweep is linear and nothing else) or names
    // the site whose transition it rides (Card's dim changes a target under
    // deselect's timing).
    for (const [component, sites] of Object.entries(MOTION_SITES)) {
      const names = new Set(sites.map(s => s.name))
      for (const site of sites) {
        const borrows = site.timingFrom
        if (borrows) expect(names.has(borrows), `${component}.${site.name} borrows ${borrows}`).toBe(true)
        const carries = site.tokens.length > 0 || (site.fixed ?? []).length > 0
        expect(carries, `${component}.${site.name} reads nothing`).toBe(true)
      }
    }
  })
})

describe('the reads the deferred work needs', () => {
  it('finds every site that reads one token, component and site together', () => {
    // The row identity the shared-literal audit entry was waiting on.
    const fast = sitesForToken('duration.fast')
    expect(fast).toContainEqual({ component: 'Button', site: 'press' })
    expect(fast).toContainEqual({ component: 'Button', site: 'release' })
    // The collapse this table exists to name: one path, two moments, one demo.
    const button = fast.filter(r => r.component === 'Button')
    expect(button).toHaveLength(2)
  })

  it('separates the two moments a per-path override cannot', () => {
    const [press, release] = MOTION_SITES.Button
    expect(press.tokens).toContain('easing.standard')
    expect(release.tokens).toContain('easing.overshoot')
    // Both read the same duration, which is the whole problem stated in data:
    // an override on duration.fast reaches both, and nothing distinguishes them.
    expect(press.tokens).toContain('duration.fast')
    expect(release.tokens).toContain('duration.fast')
  })

  it('carries the delays choreography coherence would compare', () => {
    // Every staggered site across the tool, which is the set that question is
    // about. Named here so a future check has something to read.
    const staggered = ['delay.short', 'delay.medium', 'delay.long']
      .flatMap(path => sitesForToken(path).map(r => `${r.component}.${r.site}`))
    expect(new Set(staggered).size).toBeGreaterThan(5)
    expect(staggered).toContain('Toast.stagger-in')
    expect(staggered).toContain('Toast.stagger-out')
  })
})
