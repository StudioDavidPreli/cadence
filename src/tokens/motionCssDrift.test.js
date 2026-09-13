import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toCssVars, INITIAL_STATE, REDUCED_MOTION_RESOLUTION } from 'cadence-tokens'

// The site-side half of the item-2 extraction contract (decision D1): the
// package is the source of truth and motion.css must agree with it. This test
// reads the AUTHORED stylesheet (the built one gets minified, 400ms -> .4s,
// which is a serving concern parse.js handles; authored-vs-package is the
// drift this file guards). If a token value changes in one place and not the
// other, this fails naming the property.
//
// The comparison is declaration-by-declaration on the editable --motion-*
// set. The --feedback-* chrome constants are excluded by construction: the
// emitter never produces them, and the property-set equality below asserts
// that motion.css's --motion-* set and the package's emission are EXACTLY the
// same properties, so a token added to either side alone also fails here.

const cssPath = join(dirname(fileURLToPath(import.meta.url)), 'motion.css')

function declarations(cssText) {
  // Strip comments, then collect every `--motion-...: value;` declaration.
  // Values are normalized on internal whitespace only, so cosmetic alignment
  // (motion.css pads values into columns) does not read as drift.
  const stripped = cssText.replace(/\/\*[\s\S]*?\*\//g, '')
  const out = {}
  for (const match of stripped.matchAll(/(--motion-[\w-]+)\s*:\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim().replace(/\s+/g, ' ')
  }
  return out
}

// Everything up to the first closing brace: the `:root` block alone. Since
// 2026-09-13 the emitter also writes a `prefers-reduced-motion` block carrying
// the same property NAMES at their reduced values, and a flat declaration sweep
// would read those as the root's values and call it drift. The two blocks are
// asserted separately below.
function rootBlock(cssText) {
  return cssText.slice(0, cssText.indexOf('}') + 1)
}

describe('motion.css matches the cadence-tokens package (Standard preset)', () => {
  const sheet = toCssVars(INITIAL_STATE)
  const authored = declarations(readFileSync(cssPath, 'utf8'))
  const emitted = declarations(rootBlock(sheet))

  it('declares exactly the properties the package emits', () => {
    expect(Object.keys(authored).sort()).toEqual(Object.keys(emitted).sort())
  })

  it('agrees with the package on every value', () => {
    expect(authored).toEqual(emitted)
  })

  // The exported stylesheet carries a reduced-motion block and motion.css does
  // not, which is deliberate rather than drift. The site answers reduced motion
  // in the provider (reduceMotion in MotionTokensContext), and Token Lab opts
  // out of that on purpose, because a reader is there specifically to perceive
  // motion. A media block in motion.css would collapse the demos underneath
  // that opt-out and take the choice away. The export needs the block for the
  // opposite reason: the provider does not travel with the file.
  it('adds a reduced-motion block to the export that motion.css deliberately lacks', () => {
    expect(readFileSync(cssPath, 'utf8')).not.toContain('prefers-reduced-motion')
    expect(sheet).toContain('@media (prefers-reduced-motion: reduce)')

    const reduced = declarations(sheet.slice(sheet.indexOf('@media')))
    for (const [property, value] of Object.entries(reduced)) {
      const expected = property.startsWith('--motion-duration-')
        ? `${REDUCED_MOTION_RESOLUTION.duration}ms`
        : `${REDUCED_MOTION_RESOLUTION.delay}ms`
      expect(value, property).toBe(expected)
    }
    // Only the two time families are replaced. Easing, scale, spring and the
    // scalar are absent because the resolution does not touch them.
    // '--motion-duration-fast' splits to ['', '', 'motion', 'duration', 'fast'].
    const families = new Set(Object.keys(reduced).map(p => p.split('-')[3]))
    expect([...families].sort()).toEqual(['delay', 'duration'])
    // Every duration and delay the root block declares is answered.
    const timeProperties = Object.keys(emitted)
      .filter(p => /^--motion-(duration|delay)-/.test(p) && p !== '--motion-duration-scalar')
    expect(Object.keys(reduced).sort()).toEqual(timeProperties.sort())
  })
})
