import { describe, it, expect } from 'vitest'
import { expand, interpret, growArmature, RULESETS, LSYSTEM } from './lsystem'
import { mulberry32 } from './rng'

// A stream that yields a fixed list then repeats, so a stochastic choice can be
// steered exactly instead of probed statistically.
const scripted = (values) => {
  let i = 0
  return () => values[i++ % values.length]
}
const noJitter = () => 0.5   // (0.5 - 0.5) * jitter === 0

describe('expand', () => {
  it('returns the axiom at zero iterations', () => {
    expect(expand('X', { X: 'FF' }, 0, mulberry32(1)).sequence).toBe('X')
  })

  it('applies a deterministic rule', () => {
    expect(expand('F', { F: 'FF' }, 1, mulberry32(1)).sequence).toBe('FF')
    expect(expand('F', { F: 'FF' }, 3, mulberry32(1)).sequence).toBe('FFFFFFFF')
  })

  it('passes symbols with no rule through unchanged', () => {
    // How X and Y drive structure without ever drawing.
    expect(expand('X+Y', { X: 'F' }, 1, mulberry32(1)).sequence).toBe('F+Y')
    expect(expand('F[+F]', { F: 'FF' }, 1, mulberry32(1)).sequence).toBe('FF[+FF]')
  })

  it('rewrites every symbol each pass, not just the first', () => {
    expect(expand('XX', { X: 'AB' }, 1, mulberry32(1)).sequence).toBe('ABAB')
  })

  it('chooses a stochastic production by cumulative probability', () => {
    const rule = { F: [{ p: 0.5, out: 'A' }, { p: 0.3, out: 'B' }, { p: 0.2, out: 'C' }] }
    expect(expand('F', rule, 1, scripted([0.1])).sequence).toBe('A')   // < 0.5
    expect(expand('F', rule, 1, scripted([0.6])).sequence).toBe('B')   // 0.5..0.8
    expect(expand('F', rule, 1, scripted([0.9])).sequence).toBe('C')   // 0.8..1
  })

  it('falls through to the last production when probabilities under-sum', () => {
    // Authoring slack rather than silent corruption: the result is still one of
    // the declared shapes.
    const rule = { F: [{ p: 0.2, out: 'A' }, { p: 0.2, out: 'B' }] }
    expect(expand('F', rule, 1, scripted([0.99]).valueOf()).sequence).toBe('B')
  })

  it('draws once per stochastic symbol, in order', () => {
    const rule = { F: [{ p: 0.5, out: 'A' }, { p: 0.5, out: 'B' }] }
    expect(expand('FFF', rule, 1, scripted([0.1, 0.9, 0.1])).sequence).toBe('ABA')
  })

  it('does not consume the stream for a deterministic rule', () => {
    // A deterministic rule set must not advance the stream, or adding a
    // stochastic rule later would shift every draw after it.
    const rule = { F: 'FF', X: [{ p: 1, out: 'Q' }] }
    const rng = scripted([0.1, 0.9])
    expect(expand('FXFX', rule, 1, rng).sequence).toBe('FFQFFQ')
  })

  it('is deterministic for a seed', () => {
    const a = expand('F', RULESETS.cadence.rules, 3, mulberry32(11)).sequence
    const b = expand('F', RULESETS.cadence.rules, 3, mulberry32(11)).sequence
    expect(a).toBe(b)
  })

  it('differs on a different seed for a stochastic rule set', () => {
    const a = expand('F', RULESETS.cadence.rules, 3, mulberry32(11)).sequence
    const b = expand('F', RULESETS.cadence.rules, 3, mulberry32(12)).sequence
    expect(a).not.toBe(b)
  })

  it('stops and reports rather than growing without bound', () => {
    // The guard raster.walkSegment has, applied to the other unbounded loop in
    // the system. An armature that eats the main thread is worse than one that
    // stops early and says so.
    const { sequence, truncated } = expand('F', { F: 'FFFF' }, 40, mulberry32(1), { maxLength: 5000 })
    expect(truncated).toBe(true)
    expect(sequence.length).toBeLessThan(5000 + 8)
  })

  it('reports no truncation for the shipped rulesets', () => {
    for (const [name, profile] of Object.entries(RULESETS)) {
      const out = expand(profile.axiom, profile.rules, profile.iterations, mulberry32(11))
      expect(out.truncated, name).toBe(false)
      expect(out.sequence.length).toBeGreaterThan(0)
    }
  })

  it('handles an empty axiom', () => {
    expect(expand('', { F: 'FF' }, 3, mulberry32(1)).sequence).toBe('')
  })
})

describe('interpret', () => {
  const straight = { angle: 90, step: 10, jitter: 0, origin: { x: 0, y: 0 }, heading: 0 }

  it('draws a segment per F, along the heading', () => {
    const { lines } = interpret('FF', straight, noJitter)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }])
  })

  it('defaults to heading downward, which is where nav artwork grows', () => {
    const { lines } = interpret('F', { angle: 90, step: 10 }, noJitter)
    expect(lines[0][1].x).toBeCloseTo(0)
    expect(lines[0][1].y).toBeCloseTo(10)     // +y is down in screen space
  })

  it('turns on + and -', () => {
    const plus = interpret('+F', straight, noJitter).lines[0][1]
    expect(plus.x).toBeCloseTo(0)
    expect(plus.y).toBeCloseTo(10)
    const minus = interpret('-F', straight, noJitter).lines[0][1]
    expect(minus.x).toBeCloseTo(0)
    expect(minus.y).toBeCloseTo(-10)
  })

  it('ignores symbols outside the alphabet', () => {
    // X and Y are pure rewrite symbols and must not move the turtle.
    const withX = interpret('XFXY', straight, noJitter).lines[0]
    const without = interpret('F', straight, noJitter).lines[0]
    expect(withX).toEqual(without)
  })

  it('moves without drawing on lowercase f', () => {
    const { lines } = interpret('FfF', straight, noJitter)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }])
    expect(lines[1][0]).toEqual({ x: 20, y: 0 })
  })

  it('gives a branch its own polyline, never chording back to the fork', () => {
    // The reason for the closeCurrent calls. A chord from a branch tip back to
    // the fork would lay crossing length where the armature has none, and the
    // density map would weight empty space.
    const { lines } = interpret('F[+FF]FF', straight, noJitter)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const d = Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y)
        expect(d).toBeCloseTo(10)     // every drawn step is exactly one step
      }
    }
  })

  it('restores position and heading on ]', () => {
    const { lines } = interpret('F[+F]F', straight, noJitter)
    const last = lines[lines.length - 1]
    // The trunk resumes from (10,0) heading 0, so it ends at (20,0).
    expect(last[last.length - 1].x).toBeCloseTo(20)
    expect(last[last.length - 1].y).toBeCloseTo(0)
  })

  it('nests branches', () => {
    const { lines } = interpret('F[+F[+F]F]F', straight, noJitter)
    expect(lines.length).toBeGreaterThanOrEqual(4)
  })

  it('survives an unbalanced bracket rather than throwing', () => {
    expect(() => interpret('F]]]F', straight, noJitter)).not.toThrow()
    expect(() => interpret('F[[[F', straight, noJitter)).not.toThrow()
  })

  it('records a tip only where a branch actually drew', () => {
    // One segment is a stub, not a tip, so grammars stamping at extremities do
    // not decorate every fork.
    expect(interpret('F[+F]F', straight, noJitter).tips).toHaveLength(0)
    expect(interpret('F[+FF]F', straight, noJitter).tips).toHaveLength(1)
  })

  it('records every drawn vertex with its heading', () => {
    const { vertices } = interpret('FF+F', straight, noJitter)
    expect(vertices).toHaveLength(3)
    expect(vertices[0].heading).toBeCloseTo(0)
    expect(vertices[2].heading).toBeCloseTo(Math.PI / 2)
  })

  it('starts at the origin it is given', () => {
    const { lines } = interpret('F', { ...straight, origin: { x: 64, y: 128 } }, noJitter)
    expect(lines[0][0]).toEqual({ x: 64, y: 128 })
  })

  it('curls a long branch, because heading jitter accumulates', () => {
    // Jitter is added to the HEADING, not to the position, so it is a random
    // walk on the angle and a long branch wanders rather than staying on axis.
    // That is the point: it is what makes growth read as grown rather than
    // ruled. A zero-mean-per-step wobble on position would look mechanical.
    const straightRun = interpret('F'.repeat(200), { ...straight, jitter: 0 }, noJitter).lines[0]
    const curled = interpret('F'.repeat(200), { ...straight, jitter: 0.4 }, mulberry32(3)).lines[0]
    const end = (pts) => pts[pts.length - 1]
    expect(end(straightRun).x).toBeCloseTo(2000)
    expect(Math.abs(end(curled).x - 2000)).toBeGreaterThan(100)
  })

  it('gives the accumulated jitter no preferred direction', () => {
    // Each step's wobble is symmetric about zero, so across many seeds the
    // heading drift averages out. A biased jitter would bend every branch the
    // same way and the field would read as combed.
    let drift = 0
    const runs = 60
    for (let seed = 1; seed <= runs; seed++) {
      const { vertices } = interpret('F'.repeat(120), { ...straight, jitter: 0.4 }, mulberry32(seed))
      drift += vertices[vertices.length - 1].heading - straight.heading
    }
    expect(Math.abs(drift / runs)).toBeLessThan(0.35)
  })

  it('is deterministic for a seed and exact with no jitter', () => {
    const a = interpret('F[+F]F[-F]F', straight, mulberry32(5))
    const b = interpret('F[+F]F[-F]F', straight, mulberry32(5))
    expect(a).toEqual(b)
    const exact = interpret('F[+F]F[-F]F', straight, noJitter)
    expect(interpret('F[+F]F[-F]F', straight, noJitter)).toEqual(exact)
  })

  it('handles an empty sequence', () => {
    expect(interpret('', straight, noJitter)).toEqual({ lines: [], tips: [], vertices: [] })
  })
})

describe('growArmature', () => {
  const opts = { seed: 11, roots: [64, 156], baseline: 128 }

  it('grows from every root', () => {
    const { lines } = growArmature(RULESETS.vine, opts)
    expect(lines.length).toBeGreaterThan(4)
    const startYs = lines.map((l) => l[0].y)
    expect(Math.min(...startYs)).toBeGreaterThanOrEqual(128 - 1e-9)
  })

  it('starts every root at the baseline', () => {
    const { lines } = growArmature(RULESETS.vine, { ...opts, roots: [50] })
    expect(lines[0][0]).toEqual({ x: 50, y: 128 })
  })

  it('grows downward from the baseline', () => {
    // The nav column case: artwork descends beneath the items.
    const { vertices } = growArmature(RULESETS.vine, opts)
    const below = vertices.filter((v) => v.y > 128).length
    expect(below / vertices.length).toBeGreaterThan(0.9)
  })

  it('does not clone one root into the next', () => {
    // One shared stream across roots is what makes them differ. Two identical
    // plants side by side read as wallpaper.
    const { lines } = growArmature(RULESETS.vine, opts)
    const fromFirst = lines.filter((l) => l[0].x < 110)
    const fromSecond = lines.filter((l) => l[0].x >= 110)
    expect(fromFirst.length).toBeGreaterThan(0)
    expect(fromSecond.length).toBeGreaterThan(0)
    const shape = (ls) => ls.map((l) => l.length).join(',')
    expect(shape(fromFirst)).not.toBe(shape(fromSecond))
  })

  it('is deterministic for a seed', () => {
    expect(growArmature(RULESETS.vine, opts)).toEqual(growArmature(RULESETS.vine, opts))
  })

  it('differs on a different seed', () => {
    const a = growArmature(RULESETS.vine, opts)
    const b = growArmature(RULESETS.vine, { ...opts, seed: 12 })
    expect(a.lines.length === b.lines.length && JSON.stringify(a.lines) === JSON.stringify(b.lines)).toBe(false)
  })

  it('widens the walk with spread, for the single-root comparison', () => {
    // Ruling 11: at 220px two roots may not read as two, and a lone root with
    // a wider spread is the alternative to judge against.
    const tight = growArmature(RULESETS.vine, { ...opts, roots: [110], spread: 1 })
    const wide = growArmature(RULESETS.vine, { ...opts, roots: [110], spread: 2.5 })
    const width = (a) => {
      const xs = a.vertices.map((v) => v.x)
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(width(wide)).toBeGreaterThan(width(tight))
  })

  it('scatters root positions when asked', () => {
    const none = growArmature(RULESETS.vine, { ...opts, roots: [110], rootScatter: 0 })
    const some = growArmature(RULESETS.vine, { ...opts, roots: [110], rootScatter: 40 })
    expect(none.lines[0][0].x).toBe(110)
    expect(some.lines[0][0].x).not.toBe(110)
  })

  it('runs every shipped ruleset without truncating', () => {
    for (const [name, profile] of Object.entries(RULESETS)) {
      const out = growArmature(profile, opts)
      expect(out.truncated, name).toBe(false)
      expect(out.lines.length, name).toBeGreaterThan(0)
      expect(out.vertices.length, name).toBeGreaterThan(0)
    }
  })

  it('produces the polyline shape raster.densityMap consumes', () => {
    const { lines } = growArmature(RULESETS.vine, opts)
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(1)
      expect(line[0]).toHaveProperty('x')
      expect(line[0]).toHaveProperty('y')
    }
  })
})

describe('RULESETS', () => {
  it('declares the three the handoff named', () => {
    expect(Object.keys(RULESETS).sort()).toEqual(['cadence', 'vine', 'weed'])
  })

  it('gives every profile the fields the turtle needs', () => {
    for (const [name, p] of Object.entries(RULESETS)) {
      expect(typeof p.axiom, name).toBe('string')
      expect(typeof p.rules, name).toBe('object')
      expect(p.angle, name).toBeGreaterThan(0)
      expect(p.step, name).toBeGreaterThan(0)
      expect(p.iterations, name).toBeGreaterThan(0)
    }
  })

  it('points the default heading down the column', () => {
    expect(LSYSTEM.heading).toBeCloseTo(Math.PI / 2)
  })
})
