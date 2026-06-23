import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ─── Token-integrity gate ───────────────────────────────────────────────────────
//
// Cadence's core architectural rule (CLAUDE.md): components never hardcode
// animation values. Durations, easings, and delays live in the token layer
// (src/tokens/motion.css) or, for non-editable chrome, in the documented
// --feedback-* constants. A literal in a component is a bug, not a shortcut.
//
// This test executes that rule. It walks the component/principle source and
// fails on any inline animation literal. It is the cheapest, highest-value test
// in the suite: it cannot drift, needs no browser, and guards the one claim the
// whole project is built to demonstrate.
//
// Allowed (not violations):
//   - duration: 0            an instant cut, not a timing value
//   - tokens.duration.*, tokens.ease.*, dur.*  token reads
//   - ease: 'easeInOut' | 'linear'  framework-named curves (no token equivalent
//                                   for easeInOut; used only for chrome)
//   - a literal inside a CSS var() fallback, e.g. var(--motion-duration-slow, 400ms)
//   - the single documented exception below

const SRC = join(process.cwd(), 'src')
const SCAN_DIRS = ['components', 'principles']

// The one deliberate literal in the codebase: TokenFidelity demonstrates the
// principle BY CONTRAST, animating an un-tokenised "off the system" value so the
// corrected state can switch back to a token read. The literal is the lesson.
// Keyed by file path suffix so a refactor that moves the demo elsewhere re-trips
// the gate and forces a conscious re-allow.
const ALLOWED_JS = [
  { fileEndsWith: join('principles', 'TokenFidelity', 'index.jsx'), snippet: 'ease: [0, 0, 1, 1]' },
]

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function sourceFiles() {
  return SCAN_DIRS.flatMap((d) => walk(join(SRC, d)))
    .filter((f) => /\.(jsx?|css)$/.test(f))
    .filter((f) => !f.includes('.test.'))
}

// Strip CSS var() calls so a literal kept legitimately inside a fallback
// (the established pattern: var(--motion-duration-slow, 400ms)) is not flagged.
// var()s never nest in this codebase except a cubic-bezier inside an ease var,
// which carries no ms, so a single non-greedy pass is sufficient for ms hunting.
function stripCssVars(line) {
  return line.replace(/var\([^)]*\)/g, '')
}

describe('token integrity — no hardcoded animation values in components', () => {
  const files = sourceFiles()

  it('finds component and principle source to scan', () => {
    // Guards against a path/glob mistake silently turning the gate into a no-op.
    expect(files.length).toBeGreaterThan(20)
  })

  it('has no literal ms timings in module CSS (outside var() fallbacks)', () => {
    const offenders = []
    for (const file of files) {
      if (!file.endsWith('.module.css')) continue
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (/\d+ms/.test(stripCssVars(line))) {
          offenders.push(`${file}:${i + 1}  ${line.trim()}`)
        }
      })
    }
    expect(offenders, `\nHardcoded CSS timing — move to a --motion-* token or a --feedback-* constant:\n${offenders.join('\n')}\n`).toEqual([])
  })

  it('has no inline duration literals in JSX transitions (duration: 0 excepted)', () => {
    const offenders = []
    for (const file of files) {
      if (!/\.jsx?$/.test(file)) continue
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        const m = line.match(/duration:\s*([0-9][0-9.]*)/)
        if (m && parseFloat(m[1]) !== 0) {
          offenders.push(`${file}:${i + 1}  ${line.trim()}`)
        }
      })
    }
    expect(offenders, `\nHardcoded duration — read tokens.duration.* or a chrome helper:\n${offenders.join('\n')}\n`).toEqual([])
  })

  it('has no inline easing-array literals in JSX (the one TokenFidelity demo excepted)', () => {
    const offenders = []
    for (const file of files) {
      if (!/\.jsx?$/.test(file)) continue
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        // An ease bound to an inline numeric array, e.g. ease: [0.4, 0, 0.2, 1].
        // Token reads (ease: tokens.ease.x) and named curves (ease: 'linear')
        // do not match.
        if (!/ease:\s*\[\s*-?[0-9]/.test(line)) return
        const allowed = ALLOWED_JS.some(
          (a) => file.endsWith(a.fileEndsWith) && line.includes(a.snippet),
        )
        if (!allowed) offenders.push(`${file}:${i + 1}  ${line.trim()}`)
      })
    }
    expect(offenders, `\nHardcoded easing curve — read tokens.ease.* or FEEDBACK_EASE:\n${offenders.join('\n')}\n`).toEqual([])
  })
})
