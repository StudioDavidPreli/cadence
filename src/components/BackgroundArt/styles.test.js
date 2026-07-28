import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// ─── Every class the component asks for must exist ────────────────────────────
//
// This file exists because of a deletion it would have caught. Collapsing the
// native-face arrival scaffolding truncated the stylesheet from a comment marker
// to the end, and `.swayX`, `.swayY`, `.breathe` and the reduced-motion block
// all lived below that marker. The component went on asking for
// `styles.breathe`, the CSS module went on resolving it to nothing, and the
// idle motion simply stopped. No error, no warning, no failing test: the markup
// was still correct, the animation just had no rule behind it.
//
// That is the shape of the whole class of bug. A CSS module is a contract
// between two files that nothing checks, and the failure is always silence.
//
// Read as TEXT rather than imported, deliberately. Importing gives whatever the
// test runner's CSS handling decides to give, which may be a proxy that answers
// every property and therefore proves nothing. The file on disk is the artifact
// that ships.

const read = (name) =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8')

const css = read('./BackgroundArt.module.css')
const jsx = read('./index.jsx')

const used = [...new Set([...jsx.matchAll(/styles\.([a-zA-Z][\w]*)/g)].map((m) => m[1]))].sort()
const defined = new Set([...css.matchAll(/^\.([a-zA-Z][\w]*)/gm)].map((m) => m[1]))

describe('BackgroundArt stylesheet', () => {
  it('finds the classes the component uses', () => {
    expect(used.length).toBeGreaterThan(4)
  })

  it.each(used)('defines .%s', (name) => {
    expect(defined.has(name), `styles.${name} is used but has no rule in the stylesheet`).toBe(true)
  })

  // The idle animations are the ones that went missing, and they are the ones
  // whose absence is hardest to notice: the artwork still draws, it just stops
  // moving. Named individually so the failure message says which.
  it.each(['swayX', 'swayY', 'breathe'])('binds .%s to an infinite animation', (name) => {
    const rule = css.match(new RegExp(`^\\.${name}\\s*\\{([^}]*)\\}`, 'm'))
    expect(rule, `.${name} has no rule`).not.toBeNull()
    expect(rule[1]).toMatch(/animation-name:/)
    expect(rule[1]).toMatch(/animation-iteration-count:\s*infinite/)
  })

  // Every animation-name has to point at a keyframes block that exists. A typo
  // here is the same silence as a missing class.
  it('points every animation-name at a real @keyframes', () => {
    const keyframes = new Set([...css.matchAll(/@keyframes\s+([a-zA-Z][\w]*)/g)].map((m) => m[1]))
    const named = [...css.matchAll(/animation-name:\s*([a-zA-Z][\w]*)/g)].map((m) => m[1])
    expect(named.length).toBeGreaterThan(0)
    expect(named.filter((n) => !keyframes.has(n))).toEqual([])
  })

  // Removed once already. The reduced-motion guard is the belt to the
  // component's suspenders, for the case where the preference flips after mount,
  // and losing it is an accessibility regression that nothing else would report.
  it('keeps the reduced-motion guard on the idle animations', () => {
    const block = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/)
    expect(block, 'the reduced-motion media block is gone').not.toBeNull()
    for (const name of ['swayX', 'swayY', 'breathe']) {
      expect(block[0]).toMatch(new RegExp(`\\.${name}\\b`))
    }
    expect(block[0]).toMatch(/animation:\s*none/)
  })
})
