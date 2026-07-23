// ─── lsystem ──────────────────────────────────────────────────────────────────
//
// The armature: an alphabet rewritten N times, then walked by a turtle into
// world-space polylines. The armature is usually never drawn. Its job is to
// give raster.densityMap something to weight, so the glyphs scatter along a
// growth structure instead of over a rectangle.
//
// Pure, like the rest of src/background. All randomness comes from rng.js, and
// all of it here is the SEQUENTIAL stream rather than hash draws. That is the
// boundary rng.js names, and this module is the reason it exists: a production
// rule's choice depends on where it sits in the rewrite, and the turtle's
// jitter depends on which step of the walk it is on. Both belong to a position
// in a sequence, not to a position on a grid, and neither is ever re-run
// against a different count. A stream is correct here and a hash draw would be
// the wrong tool.
//
// Prior art, for the record: stamping a pre-authored shape at a turtle frame
// rather than drawing a segment is the "predefined surface" mechanism from
// Prusinkiewicz and Lindenmayer's The Algorithmic Beauty of Plants, chapter 5.
// The system here is the 2D, glyph-library instance of it.

import { mulberry32 } from './rng'

export const LSYSTEM = {
  // Rewriting stops here rather than growing without bound. A stochastic rule
  // set with a high iteration count can grow exponentially, and an armature
  // that eats the main thread is worse than one that stops early and says so.
  maxLength: 200000,
  // Turtle heading at a root, in radians. PI/2 points DOWN in screen
  // coordinates (y grows downward), which is what the nav column wants:
  // growth descends from under the navigation items.
  heading: Math.PI / 2,
}

// The three rulesets the handoff named as suited to a tall narrow column.
// Angles are degrees, step is world units, jitter is radians of wobble per
// step. Values confirmed by eye in the labs.
export const RULESETS = {
  // Stochastic. Three productions on F with the branch shape varying, so the
  // armature reads as grown rather than printed.
  cadence: {
    axiom: 'F',
    rules: {
      F: [
        { p: 0.7, out: 'F[+F]F[-F]F' },
        { p: 0.15, out: 'F[+F]F' },
        { p: 0.15, out: 'F[-F]F' },
      ],
    },
    angle: 22.5,
    iterations: 3,
    step: 24,
    jitter: 0.14,
  },
  weed: {
    axiom: 'X',
    rules: { X: 'F[+X][-X]FX', F: 'FF' },
    angle: 22.5,
    iterations: 5,
    step: 15,
    jitter: 0.1,
  },
  // Lean-and-curl. The handoff called this the best fit for a tall narrow
  // space, because its productions turn consistently one way and it climbs.
  vine: {
    axiom: 'X',
    rules: { X: 'F[+X]F[-X]+X', F: 'FF' },
    angle: 25,
    iterations: 5,
    step: 14,
    jitter: 0.1,
  },
}

// ── Rewriting ─────────────────────────────────────────────────────────────────

// Pick a stochastic production by walking the cumulative probability. The draw
// is taken ONCE per symbol whether or not the rule is stochastic, so that a
// deterministic and a stochastic rule set consume the stream identically and a
// seed means the same thing across both.
function chooseProduction(rule, roll) {
  if (typeof rule === 'string') return rule
  let remaining = roll
  for (const option of rule) {
    if (remaining < option.p) return option.out
    remaining -= option.p
  }
  // Probabilities that do not sum to 1 fall through to the last option rather
  // than returning nothing. Authoring slack, not silent corruption: the shape
  // is still one of the declared productions.
  return rule[rule.length - 1].out
}

// Rewrite `axiom` by `rules`, `iterations` times.
//
// Symbols with no rule pass through unchanged, which is how the pure-rewrite
// symbols (X, Y) survive to drive structure without ever drawing anything.
export function expand(axiom, rules, iterations, rng, { maxLength = LSYSTEM.maxLength } = {}) {
  let sequence = String(axiom || '')
  let truncated = false

  for (let step = 0; step < iterations; step++) {
    let next = ''
    for (const symbol of sequence) {
      const rule = rules[symbol]
      if (rule === undefined) {
        next += symbol
        continue
      }
      next += chooseProduction(rule, Array.isArray(rule) ? rng() : 0)
      if (next.length > maxLength) {
        truncated = true
        break
      }
    }
    sequence = next
    if (truncated) break
  }
  return { sequence, truncated }
}

// ── Turtle ────────────────────────────────────────────────────────────────────

// Walk a rewritten sequence into polylines.
//
// Alphabet:
//   F   forward, drawing
//   f   forward, not drawing (moves the pen without laying a segment)
//   +   turn one angle, one way
//   -   turn one angle, the other way
//   [   push position and heading, and start a new polyline
//   ]   pop, and start a new polyline from the restored position
//   anything else is ignored, which is what lets X and Y drive structure
//
// Returns three things because three consumers want different views of it:
//   lines     polylines, for densityMap to rasterize into weights
//   tips      branch ends, for grammars that stamp at the extremities
//   vertices  every drawn point with its heading, for grammars that stamp along
//
// A branch is its own polyline. Without that, popping the stack would draw a
// chord from the branch tip back to the fork, laying down length where the
// armature has none, and the density map would weight empty space.
export function interpret(sequence, {
  angle,
  step,
  jitter = 0,
  origin = { x: 0, y: 0 },
  heading = LSYSTEM.heading,
} = {}, rng) {
  const turn = (angle * Math.PI) / 180
  const draw = rng || (() => 0.5)

  let x = origin.x
  let y = origin.y
  let theta = heading
  let sinceBranch = 0

  const stack = []
  const lines = []
  const tips = []
  const vertices = []
  let current = [{ x, y }]

  const closeCurrent = () => {
    if (current.length > 1) lines.push(current)
  }

  for (const symbol of String(sequence || '')) {
    switch (symbol) {
      case 'F':
      case 'f': {
        // Jitter is added to the HEADING, not to the position, so it
        // accumulates: a long branch performs a random walk on its angle and
        // curls. That is deliberate and is most of what makes the armature
        // read as grown rather than ruled. Each step's wobble is symmetric
        // about zero, so the drift has no preferred direction across the
        // field and branches do not all bend the same way.
        theta += (draw() - 0.5) * jitter
        x += Math.cos(theta) * step
        y += Math.sin(theta) * step
        if (symbol === 'F') {
          current.push({ x, y })
          vertices.push({ x, y, heading: theta })
          sinceBranch++
        } else {
          closeCurrent()
          current = [{ x, y }]
        }
        break
      }
      case '+':
        theta += turn + (draw() - 0.5) * jitter * 0.7
        break
      case '-':
        theta -= turn + (draw() - 0.5) * jitter * 0.7
        break
      case '[':
        stack.push({ x, y, theta, sinceBranch })
        closeCurrent()
        current = [{ x, y }]
        sinceBranch = 0
        break
      case ']': {
        closeCurrent()
        // A tip is the end of a branch that actually drew something. One
        // segment is a stub, not a tip, so grammars stamping at extremities do
        // not decorate every fork.
        if (sinceBranch >= 2) tips.push({ x, y, heading: theta })
        const restored = stack.pop()
        if (restored) {
          x = restored.x
          y = restored.y
          theta = restored.theta
          sinceBranch = restored.sinceBranch
        }
        current = [{ x, y }]
        break
      }
      default:
        break
    }
  }
  closeCurrent()

  return { lines, tips, vertices }
}

// ── Armature ──────────────────────────────────────────────────────────────────

// Run a profile from one or more roots and merge the results.
//
// One stream drives every root in sequence rather than one stream per root.
// That is deliberate: two roots seeded identically would grow identical plants,
// and a field of clones reads as wallpaper. Sharing the stream makes each root
// continue where the last left off, so they differ without needing separate
// seeds to manage.
//
// `spread` widens the turn jitter, which is the single-root comparison case
// ruling 11 asks for: at 220px two roots may not have room to read as two, and
// a lone root with a wider spread is the alternative to test against.
export function growArmature(profile, {
  seed,
  roots,
  baseline = 0,
  spread = 1,
  rootScatter = 0,
} = {}) {
  const rng = mulberry32(seed * 7919 + 1)
  const merged = { lines: [], tips: [], vertices: [], truncated: false }

  for (const rootX of roots) {
    const { sequence, truncated } = expand(profile.axiom, profile.rules, profile.iterations, rng)
    if (truncated) merged.truncated = true
    const out = interpret(sequence, {
      angle: profile.angle,
      step: profile.step,
      jitter: profile.jitter * spread,
      origin: { x: rootX + (rng() - 0.5) * rootScatter, y: baseline },
    }, rng)
    merged.lines.push(...out.lines)
    merged.tips.push(...out.tips)
    merged.vertices.push(...out.vertices)
  }
  return merged
}
