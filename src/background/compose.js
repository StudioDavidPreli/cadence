// ─── compose ──────────────────────────────────────────────────────────────────
//
// Weighted cells in, a display list of world-space stamps out. This is the
// layer that decides WHERE the marks go and HOW they sit; raster decided where
// the armature ran, and render turns the result into two faces.
//
// Pure, like raster. The only randomness comes through rng.js, and all of it is
// hash-keyed on the cell, never sequential. That is the whole design of this
// module and the reason it looks the way it does, so it is worth stating the
// alternative it replaces:
//
//   The obvious sampler draws N times from a cumulative distribution over the
//   cells. It is simple, it hits the budget exactly, and it dies on resize: the
//   Nth draw depends on every draw before it, so a field that gains one cell at
//   the bottom margin reshuffles from the top. The lab used this form; it is
//   correct there, because a lab never resizes mid-judgment.
//
//   The form here inverts it. Each cell computes its OWN expected number of
//   stamps and resolves the fraction with a hash draw keyed on its grid
//   position. No cell's outcome depends on any other cell's draw order.
//
// What that costs, stated plainly because it is a real trade and not a free
// win: the budget becomes approximate rather than exact. See `stats.budget`.

import { draw, signedDraw } from './rng'

// Salts. Named so the correlation argument in rng.js is visible at the call
// site: every independent quality of a cell draws from its own salt, and
// anything that can occur more than once per cell folds the stamp index in.
const SALT = {
  count: 1,
  jitterX: 2,
  jitterY: 3,
  rotation: 4,
  scale: 5,
  mark: 6,
}
// Stride between one stamp's salts and the next stamp's in the same cell.
// Larger than the salt count so two stamps in one cell never collide.
const SALT_STRIDE = 16

export const COMPOSE = {
  // Exponent on the cell weight. Above 1 it tightens the scatter onto the
  // armature; below 1 it spreads. 1.4 was confirmed by eye as the
  // tracking-but-breathing middle (handoff, 2026-07-22).
  gamma: 1.4,
  // Fraction of a cell's width a stamp may be displaced from the cell center.
  // Keeps the scatter from reading as a grid without letting a stamp wander
  // into a neighbour it was not weighted for.
  jitter: 0.45,
  // Rotation jitter around the flow direction, radians.
  rotationJitter: 0.5,
  // Stamp scale varies around the caller's base scale by this fraction.
  scaleVariance: 0.28,
}

// ── Placement ─────────────────────────────────────────────────────────────────

// Weighted cells -> placements.
//
// `cells` comes from raster's densityMap: { ix, iy, cx, cy, weight, orientation }.
// `markCount` is how many marks the library holds; a placement stores an index
// rather than a mark so this module never touches glyph geometry.
//
// alignFlow rotates each stamp to its cell's mean orientation plus jitter. The
// alternative, a free random rotation, reads as confetti; the handoff confirmed
// flow alignment on, and walk item 3 has not re-ruled it.
export function samplePlacements(cells, {
  seed,
  budget,
  markCount,
  scale,
  gamma = COMPOSE.gamma,
  jitter = COMPOSE.jitter,
  rotationJitter = COMPOSE.rotationJitter,
  scaleVariance = COMPOSE.scaleVariance,
  alignFlow = true,
  cellSize,
  // Minimum distance in world px between two stamp centers. 0 keeps the old
  // behaviour exactly, which is why it is the default: the weighted sampler
  // decides WHERE stamps want to go, and this only decides how close two of
  // them may end up. See the rejection pass below.
  minSpacing = 0,
}) {
  const placements = []
  if (!cells.length || !(budget > 0) || !(markCount > 0)) {
    return { placements, stats: { budget: 0, cells: cells.length, occupied: 0 } }
  }

  let total = 0
  const weights = new Array(cells.length)
  for (let i = 0; i < cells.length; i++) {
    const w = Math.pow(cells[i].weight, gamma)
    weights[i] = w
    total += w
  }
  if (total <= 0) {
    return { placements, stats: { budget: 0, cells: cells.length, occupied: 0 } }
  }

  const span = cellSize * jitter
  let occupied = 0

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const expected = (budget * weights[i]) / total

    // Integer part is guaranteed, fractional part is a Bernoulli trial on a
    // hash draw. This is what preserves clustering: a cell weighted for 2.7
    // stamps reliably gets 2 and sometimes 3, rather than being capped at one.
    const whole = Math.floor(expected)
    const fraction = expected - whole
    const bonus = draw(seed, cell.ix, cell.iy, SALT.count) < fraction ? 1 : 0
    const count = whole + bonus
    if (count > 0) occupied++

    for (let k = 0; k < count; k++) {
      const s = k * SALT_STRIDE
      const rotation = alignFlow
        ? cell.orientation + signedDraw(seed, cell.ix, cell.iy, SALT.rotation + s) * rotationJitter * 0.5
        : draw(seed, cell.ix, cell.iy, SALT.rotation + s) * Math.PI * 2
      placements.push({
        ix: cell.ix,
        iy: cell.iy,
        k,
        x: cell.cx + signedDraw(seed, cell.ix, cell.iy, SALT.jitterX + s) * span,
        y: cell.cy + signedDraw(seed, cell.ix, cell.iy, SALT.jitterY + s) * span,
        rotation,
        scale: scale * (1 + signedDraw(seed, cell.ix, cell.iy, SALT.scale + s) * scaleVariance),
        markIndex: Math.min(
          markCount - 1,
          Math.floor(draw(seed, cell.ix, cell.iy, SALT.mark + s) * markCount),
        ),
      })
    }
  }

  // Reveal order for the nav column is top to bottom, so the display list is
  // sorted by y here rather than in the renderer. The (iy, ix, k) tiebreak
  // keeps the order total: two stamps at an identical y must not swap between
  // runs, or the reveal would restagger on every regeneration.
  placements.sort((a, b) => a.y - b.y || a.iy - b.iy || a.ix - b.ix || a.k - b.k)

  // ── Overlap rejection ───────────────────────────────────────────────────────
  //
  // The weighted sampler above is free to put several stamps in one cell, which
  // is what preserves clustering and is deliberate (see the Bernoulli comment).
  // What it cannot see is that two stamps from NEIGHBOURING cells can land on
  // top of each other after jitter, and at a large stampScale that reads as one
  // illegible smear rather than two marks.
  //
  // A greedy pass rather than a smarter Poisson-disk sampler, for two reasons.
  // It runs AFTER the total sort, so it is fully deterministic: the same seed
  // keeps the same stamps and drops the same ones, which the reveal depends on.
  // And it subtracts from the composition without redistributing, so raising
  // the spacing thins the field instead of rearranging it, which is the
  // behaviour that makes the knob legible while you drag it.
  //
  // O(n^2) against the accepted set. At a budget in the low hundreds that is a
  // few thousand comparisons on one regeneration, and the memo means it does
  // not run again until the composition inputs change.
  let kept = placements
  let rejected = 0
  if (minSpacing > 0) {
    const min2 = minSpacing * minSpacing
    const accepted = []
    for (const p of placements) {
      let clash = false
      for (const q of accepted) {
        const dx = p.x - q.x
        const dy = p.y - q.y
        if (dx * dx + dy * dy < min2) { clash = true; break }
      }
      if (clash) rejected++
      else accepted.push(p)
    }
    kept = accepted
  }

  return {
    placements: kept,
    stats: { budget: kept.length, cells: cells.length, occupied, rejected },
  }
}

// ── Stamp transform ───────────────────────────────────────────────────────────

// Local mark space -> world space. Rotate, scale, translate, in that order.
//
// Owned arithmetic rather than an SVG transform attribute, because both faces
// need the resulting POINTS: the vector face draws them and the pixel face
// rasterizes them. A transform attribute would only move the vector face's
// paint and leave the aggregation reading unrotated geometry, which is exactly
// the kind of drift the single-resolution-point discipline exists to prevent.
export function transformPoint(point, placement) {
  const c = Math.cos(placement.rotation)
  const s = Math.sin(placement.rotation)
  const k = placement.scale
  return {
    x: placement.x + k * (point.x * c - point.y * s),
    y: placement.y + k * (point.x * s + point.y * c),
  }
}

// ── Display list ──────────────────────────────────────────────────────────────

// Placements plus a library -> the display list both renderers consume.
//
// `library` is [{ strokes: [{ pts, color, tokenBound }] }] in local mark space,
// centered on the mark's attachment point. Per-stroke color rides through
// untouched: resolving it to a theme value is the renderer's job and has to
// happen once, ahead of aggregation, for both faces (amendment 2a).
export function composeStamps(placements, library) {
  const stamps = []
  let strokeCount = 0
  for (const placement of placements) {
    const mark = library[placement.markIndex]
    if (!mark) continue
    const strokes = mark.strokes.map((stroke) => {
      strokeCount++
      return {
        color: stroke.color,
        tokenBound: !!stroke.tokenBound,
        pts: stroke.pts.map((p) => transformPoint(p, placement)),
      }
    })
    stamps.push({ ...placement, strokes })
  }
  return { stamps, stats: { stamps: stamps.length, strokes: strokeCount } }
}

// Flatten a display list to the stroke array raster.aggregate expects. Kept
// here rather than in the renderer so both faces are fed from one function and
// cannot disagree about what the composition contains.
export function strokesOf(stamps) {
  const out = []
  for (const stamp of stamps) for (const stroke of stamp.strokes) out.push(stroke)
  return out
}
