import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toCssVars, INITIAL_STATE } from 'cadence-tokens'

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

describe('motion.css matches the cadence-tokens package (Standard preset)', () => {
  const authored = declarations(readFileSync(cssPath, 'utf8'))
  const emitted = declarations(toCssVars(INITIAL_STATE))

  it('declares exactly the properties the package emits', () => {
    expect(Object.keys(authored).sort()).toEqual(Object.keys(emitted).sort())
  })

  it('agrees with the package on every value', () => {
    expect(authored).toEqual(emitted)
  })
})
