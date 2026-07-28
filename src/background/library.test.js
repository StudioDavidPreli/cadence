import { describe, it, expect } from 'vitest'
import {
  MARK_LIBRARIES,
  MARK_PALETTES,
  MARK_COLORWAYS,
  CANONICAL_COLORWAY,
  LIBRARY_WARNINGS,
} from './library'
import { inkKeyOf } from './ink'

// These run against the REAL files rather than fixtures, which is the point.
// Every way a colorway can drift is silent at runtime: a mark missing from one
// folder shortens that library and shifts every index above it, so each theme
// would draw a different creature with no error anywhere. A fixture would prove
// the loader works and prove nothing about the art. This fails the build the day
// an export goes out of step.
//
// vitest transforms through Vite, so `import.meta.glob` in library.js resolves
// here exactly as it does in the app. No mocking, and nothing to keep in sync.

const LIBRARIES = Object.keys(MARK_LIBRARIES)

describe('mark libraries', () => {
  it('loads all three', () => {
    expect(LIBRARIES.sort()).toEqual(['motionTiles', 'principles', 'tokenLab'])
  })

  it.each(LIBRARIES)('%s holds marks', (key) => {
    expect(MARK_LIBRARIES[key].length).toBeGreaterThan(0)
  })

  it.each(LIBRARIES)('%s gives every mark at least one stroke', (key) => {
    for (const mark of MARK_LIBRARIES[key]) {
      expect(mark.strokes.length, `${mark.name} flattened to nothing`).toBeGreaterThan(0)
    }
  })

  // The loader's own report. Anything it could not pair up or could not paint
  // lands here, so an empty list is the real assertion.
  //
  // One category is excluded, and it is excluded because it is true rather than
  // because it is inconvenient. `canonical ink X maps to both Y and Z` is not a
  // load failure and not an authoring mistake: the rats and the runners share a
  // green in dark and are given DIFFERENT high-contrast colours, which is a
  // drawing decision. It says the ink-keyed palette cannot represent that split,
  // which is a limit of a mechanism only the traced and pixel faces use. The
  // shipped native face reads each colorway's own fills per path and is
  // unaffected. Asserted on its own below so a new one still shows up.
  const SPLIT = /canonical ink .+ maps to both/
  it('loads with no unexpected warnings', () => {
    expect(LIBRARY_WARNINGS.filter((w) => !SPLIT.test(w))).toEqual([])
  })

  // Pinned rather than tolerated. If a fourth split appears, or one of these
  // three goes away, that is a change in the art worth noticing.
  it('records exactly the ink splits the palette cannot represent', () => {
    const split = new Set(
      LIBRARY_WARNINGS.filter((w) => SPLIT.test(w)).map((w) => w.split(':')[0]),
    )
    expect([...split].sort()).toEqual([
      'principles/contrastDark',
      'tokenLab/contrastDark',
      'tokenLab/contrastLight',
    ])
  })
})

describe('colorways', () => {
  it.each(LIBRARIES)('%s has an entry for every colorway', (key) => {
    expect(Object.keys(MARK_PALETTES[key]).sort()).toEqual([...MARK_COLORWAYS].sort())
  })

  it.each(LIBRARIES)('%s leaves the canonical colorway untranslated', (key) => {
    expect(MARK_PALETTES[key][CANONICAL_COLORWAY]).toBeNull()
  })

  it.each(LIBRARIES)('%s builds a real map for every other colorway', (key) => {
    for (const cw of MARK_COLORWAYS) {
      if (cw === CANONICAL_COLORWAY) continue
      const map = MARK_PALETTES[key][cw]
      expect(map, `${key}/${cw} failed to build`).toBeInstanceOf(Map)
      expect(map.size, `${key}/${cw} is empty`).toBeGreaterThan(0)
    }
  })

  // The invariant the renderer depends on. `inkFromKey` looks up the canonical
  // ink of a stroke and falls back when it misses, so a gap here does not throw,
  // it quietly paints one mark in the wrong theme's colour.
  it.each(LIBRARIES)('%s can resolve every canonical ink in every colorway', (key) => {
    const canonical = new Set()
    for (const mark of MARK_LIBRARIES[key]) {
      for (const stroke of mark.strokes) {
        const ink = inkKeyOf(stroke)
        // A token-bound stroke resolves through --color-text-base, never here.
        if (ink && ink !== 'currentColor') canonical.add(ink)
      }
    }
    expect(canonical.size).toBeGreaterThan(0)

    for (const cw of MARK_COLORWAYS) {
      if (cw === CANONICAL_COLORWAY) continue
      const map = MARK_PALETTES[key][cw]
      const missing = [...canonical].filter((ink) => !map.has(ink))
      expect(missing, `${key}/${cw} cannot paint ${missing.join(', ')}`).toEqual([])
    }
  })

  // Deliberately NOT asserted: that a colorway keeps its inks distinct. The
  // first version of this file did, and it failed on intent rather than on a
  // defect. `motionTiles/contrastDark` maps all eight of its inks onto one, and
  // `principles` is a single ink in every colorway, which is the same reduction
  // the high-contrast blanket used to perform at runtime and is now authored
  // instead. Collapsing is a drawing decision, so the loader records it and the
  // suite stays out of it.
})
