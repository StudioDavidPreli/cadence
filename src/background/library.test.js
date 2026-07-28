import { describe, it, expect } from 'vitest'
import {
  COLORWAY_FOLDERS,
  MARK_COLORWAYS,
  MARK_LIBRARY_KEYS,
  CANONICAL_COLORWAY,
  loadColorway,
  shapesFrom,
} from './library'

// These run against the REAL files rather than fixtures, which is the point.
// Every way a colorway can drift is silent at runtime: a mark missing from one
// folder shortens that colorway and shifts every index above it, so each theme
// would draw a different creature with no error anywhere. A fixture would prove
// the loader works and prove nothing about the art.
//
// This file is also where the parity check LIVES now. It used to run at load in
// library.js and push a warning. It cannot any more, because a visitor only ever
// loads one colorway and has nothing to compare it against, and a warning was
// always the wrong shape for it: the day an export goes out of step, the build
// should fail rather than a console line should appear in a browser nobody has
// open. So the suite loads all twelve folders, which it can afford to, and
// asserts what the runtime can no longer see.
//
// vitest transforms through Vite, so `import.meta.glob` inside each colorway
// module resolves here exactly as it does in the app. No mocking, nothing to
// keep in sync.

// Every folder, parsed once, keyed `<library>.<colorway>`.
const ALL = {}
for (const key of MARK_LIBRARY_KEYS) {
  for (const cw of MARK_COLORWAYS) {
    ALL[`${key}.${cw}`] = await loadColorway(key, cw)
  }
}

describe('colorway folders', () => {
  it('declares one module per library per colorway, and no more', () => {
    const expected = MARK_LIBRARY_KEYS.flatMap((k) => MARK_COLORWAYS.map((cw) => `${k}.${cw}`))
    expect(Object.keys(COLORWAY_FOLDERS).sort()).toEqual(expected.sort())
  })

  it.each(Object.keys(ALL))('%s holds marks', (key) => {
    expect(ALL[key].length).toBeGreaterThan(0)
  })

  it.each(Object.keys(ALL))('%s gives every mark at least one path', (key) => {
    for (const shape of ALL[key]) {
      expect(shape.paths.length, `${key}/${shape.name} parsed to nothing`).toBeGreaterThan(0)
    }
  })

  it.each(Object.keys(ALL))('%s gives every mark a usable normalization', (key) => {
    for (const shape of ALL[key]) {
      expect(Number.isFinite(shape.cx), `${shape.name} cx`).toBe(true)
      expect(Number.isFinite(shape.cy), `${shape.name} cy`).toBe(true)
      expect(shape.unit, `${shape.name} unit`).toBeGreaterThan(0)
    }
  })

  it('caches, so a second load of the same folder is the same array', async () => {
    const a = await loadColorway('tokenLab', CANONICAL_COLORWAY)
    const b = await loadColorway('tokenLab', CANONICAL_COLORWAY)
    expect(a).toBe(b)
  })

  it('throws on a folder that does not exist rather than resolving empty', async () => {
    await expect(loadColorway('tokenLab', 'duskMode')).rejects.toThrow(/no such colorway folder/)
  })
})

// ── Parity ────────────────────────────────────────────────────────────────────
//
// The three assertions the whole four-colorway design rests on. The renderer
// looks a mark up by INDEX, and the index is drawn from the seed before the
// theme is known, so the four folders have to agree about what is at each index.
describe.each(MARK_LIBRARY_KEYS)('%s parity across colorways', (key) => {
  const canonical = ALL[`${key}.${CANONICAL_COLORWAY}`]
  const others = MARK_COLORWAYS.filter((cw) => cw !== CANONICAL_COLORWAY)

  it.each(others)(`%s holds the same number of marks as ${CANONICAL_COLORWAY}`, (cw) => {
    expect(ALL[`${key}.${cw}`].length).toBe(canonical.length)
  })

  // Names, in order. A count that matches while the names do not means two files
  // were swapped, which draws the right number of the wrong animals.
  it.each(others)(`%s holds the same marks in the same order`, (cw) => {
    expect(ALL[`${key}.${cw}`].map((s) => s.name)).toEqual(canonical.map((s) => s.name))
  })

  // Same drawing, different inks. A path-count difference means the two files
  // are not the same artwork, and the mark will not merely be miscoloured in
  // that theme, it will be a different shape.
  it.each(others)(`%s draws the same shapes as ${CANONICAL_COLORWAY}`, (cw) => {
    const mismatched = ALL[`${key}.${cw}`]
      .map((shape, i) => ({ name: shape.name, here: shape.paths.length, canon: canonical[i].paths.length }))
      .filter((r) => r.here !== r.canon)
      .map((r) => `${r.name} (${r.here} against ${r.canon})`)
    expect(mismatched).toEqual([])
  })

  // Placement has to survive the swap too. Two colorways of one mark can be
  // authored on different viewBoxes (the contrast folders use absolute
  // coordinates where darkMode centres on the origin), which is fine, but the
  // NORMALIZATION they produce has to land the mark in the same place or the
  // field would shift on a theme switch. That is ruling A's other half.
  it.each(others)(`%s normalizes to the same size as ${CANONICAL_COLORWAY}`, (cw) => {
    ALL[`${key}.${cw}`].forEach((shape, i) => {
      expect(shape.unit, `${shape.name} in ${cw}`).toBeCloseTo(canonical[i].unit, 9)
    })
  })
})

describe('shapesFrom', () => {
  it('sorts naturally, so mark-6 precedes mark-10', () => {
    const files = {
      './a/mark-10.svg': '<svg viewBox="0 0 10 10"><path d="M0 0 L1 1" fill="#111"/></svg>',
      './a/mark-6.svg': '<svg viewBox="0 0 10 10"><path d="M0 0 L1 1" fill="#222"/></svg>',
    }
    expect(shapesFrom(files, 'test').shapes.map((s) => s.name)).toEqual(['mark-6', 'mark-10'])
  })

  it('centres on the viewBox and normalizes the longest side to the span', () => {
    const files = {
      './a/m.svg': '<svg viewBox="10 20 40 80"><path d="M0 0 L1 1" fill="#111"/></svg>',
    }
    const [shape] = shapesFrom(files, 'test').shapes
    expect(shape.cx).toBe(30)
    expect(shape.cy).toBe(60)
    expect(shape.unit).toBeCloseTo(84 / 80, 9)
  })

  it('carries an authored currentColor through as currentColor', () => {
    const files = {
      './a/m.svg': '<svg viewBox="0 0 10 10"><path d="M0 0 L1 1" fill="currentColor"/></svg>',
    }
    expect(shapesFrom(files, 'test').shapes[0].paths[0].fill).toBe('currentColor')
  })
})
