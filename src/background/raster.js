// ─── raster ───────────────────────────────────────────────────────────────────
//
// The background system's grid layer: an analytic segment/grid traversal, the
// density map that weights where glyphs get scattered, and the committed
// aggregation that turns world-space strokes into pixel cells.
//
// Pure. No DOM, no React, no time, no randomness. That is what makes it
// unit-testable and what makes the same input produce the same drawing in every
// engine, which the whole system's determinism claim rests on. It follows the
// discipline parse.js, springCurve.js and footprint.js already use.
//
// Decisions this file implements, all ruled and recorded in
// docs/briefings/background_system_rulings.md:
//
//   presence   crossing LENGTH >= threshold x cell, never area coverage.
//              Hand-drawn strokes are thin: a hairline covers 5 to 10 percent
//              of a cell, so any sane area threshold erases the composition.
//   tone       blended orientation (section 9). The double-angle vector mean of
//              the crossing angles, quantized to `buckets` and inverted.
//   ties       round toward the higher bucket (open question 10, re-ruled
//              2026-07-23). Math.round already rounds halves toward +infinity,
//              so the rule is what the arithmetic does; the comment at the
//              quantization step is the ruling's required naming of it.
//   silhouette presence is measured on outlines, because blend needs angles,
//              angles need crossings, and crossings need ink that is a line
//              (section 9, item 1). Filled interiors never reach this file.
//
// Cell size is deliberately NOT a constant here. It is a per-surface value
// (open question 8), so every entry point takes it as a parameter and the
// surface's own config owns the number.

// Committed aggregation constants. Cell size is absent on purpose, see above.
export const AGGREGATION = {
  // Total crossing length in a cell, as a multiple of the cell size, below
  // which the cell is empty. Tuned by eye in the aggregation lab, 2026-07-22.
  threshold: 0.2,
  // Orientation buckets. Four in light and dark; high contrast drops to two
  // along with a reduced budget (ruling 12), because the HC themes have no
  // quiet grays to spend on a four-step ramp.
  buckets: 4,
  bucketsHighContrast: 2,
  // Inverted tone map: the highest orientation bucket reads as the dimmest
  // tone. Chosen in the aggregation lab at the same sitting as the rest.
  invert: true,
}

// A cell whose double-angle accumulator has near-zero magnitude has no
// meaningful orientation: its crossings cancelled. Perpendicular ink is the
// case that does it, because a horizontal crossing contributes (+l, 0) to the
// accumulator and a vertical one contributes (-l, 0).
//
// Such a cell still receives a tone, and the tone is arbitrary. Not zero:
// the vector does not cancel to exactly (0, 0), because sin(PI) evaluates to
// ~1.2e-16 rather than 0, so a perfectly balanced cell resolves to whatever
// direction the floating-point residue happens to point at. It is repeatable
// (the same input always yields the same residue and therefore the same
// bucket) but it is rounding noise rather than a reading of the ink.
//
// `stats.degenerate` counts these so a caller can see how much of a
// composition rests on noise. Measured at 6 to 9 percent on the axis-aligned
// test library, which is what kept the blend rule viable.
export const DEGENERATE_EPSILON = 0.06

// ── Angle helpers ─────────────────────────────────────────────────────────────

// Orientation is AXIAL, not directional: a stroke running north-east and one
// running south-west lie on the same axis and must land in the same bucket.
// Folding the angle into [0, PI) is what makes that true, and it is why the
// accumulator below doubles the angle before summing.
export function axial(angle) {
  const t = angle % Math.PI
  return t < 0 ? t + Math.PI : t
}

// Quantize an axial orientation into one of `buckets` bands.
//
// This function IS the tie-break ruling (open question 10), which is why it is
// named rather than inlined: an orientation landing exactly on a band boundary
// takes the HIGHER band, because Math.round breaks a half toward +infinity.
// The modulo folds the top edge (theta = PI) back to 0, which is correct
// because orientation is axial and PI is the same axis as 0.
//
// Worth knowing where the rule actually bites. Exact boundaries are not
// reliably reachable through the accumulator, because a mean orientation is
// computed through atan2 and lands a rounding error either side of the
// boundary. The rule is therefore about being DETERMINISTIC at the boundary,
// not about which side a knife-edge input falls on. Same input, same bucket,
// every engine.
export function bucketOf(theta, buckets) {
  return Math.round(theta / (Math.PI / buckets)) % buckets
}

// Hermite smoothstep, clamped. Used for the clearance ramp so the artwork fades
// in under the protected baseline instead of starting on a hard line.
export function smoothstep(edge0, edge1, x) {
  const span = edge1 - edge0
  const t = Math.max(0, Math.min(1, span === 0 ? (x >= edge1 ? 1 : 0) : (x - edge0) / span))
  return t * t * (3 - 2 * t)
}

// ── Traversal ─────────────────────────────────────────────────────────────────

// Amanatides & Woo grid walk. Visits every cell the segment p0 -> p1 passes
// through, exactly once, in order, reporting the true length of the crossing
// inside that cell and the segment's direction angle.
//
// Why analytic rather than sampling the segment at intervals: sampling gives
// approximate lengths and can skip a cell entirely on a shallow crossing, and
// it is not reproducible across engines. This is pure arithmetic on the inputs,
// so the same seed draws the same picture everywhere. It was the deciding
// factor over a canvas-readback approach.
//
// `visit(ix, iy, length, angle)` is a callback rather than a returned array so
// the two consumers below can accumulate differently with no allocation per
// cell. Returns false if the step guard tripped, which can only happen on
// malformed input; callers tally it rather than silently trusting the result.
export function walkSegment(p0, p1, cell, visit) {
  if (!(cell > 0)) return false
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  if (!Number.isFinite(dx) || !Number.isFinite(dy) ||
      !Number.isFinite(p0.x) || !Number.isFinite(p0.y)) return false

  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return true            // degenerate segment, nothing to visit

  let ix = Math.floor(p0.x / cell)
  let iy = Math.floor(p0.y / cell)
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0
  const tDeltaX = stepX !== 0 ? Math.abs(cell / dx) : Infinity
  const tDeltaY = stepY !== 0 ? Math.abs(cell / dy) : Infinity
  const nextX = stepX > 0 ? (ix + 1) * cell : ix * cell
  const nextY = stepY > 0 ? (iy + 1) * cell : iy * cell
  let tMaxX = stepX !== 0 ? (nextX - p0.x) / dx : Infinity
  let tMaxY = stepY !== 0 ? (nextY - p0.y) / dy : Infinity

  const angle = Math.atan2(dy, dx)

  // Tight per-segment bound, not a magic constant and not the surface diagonal:
  // a segment of length L crosses at most ceil(L/cell) vertical grid lines and
  // ceil(L/cell) horizontal ones, plus the cell it starts in. Slack of 4 covers
  // floating-point ties on exact grid lines. Exceeding this means the arithmetic
  // is wrong, not that the segment was long, so the caller hears about it.
  const maxSteps = 2 * Math.ceil(len / cell) + 5

  let tPrev = 0
  for (let step = 0; step < maxSteps; step++) {
    const tNext = Math.min(tMaxX, tMaxY, 1)
    const crossing = (tNext - tPrev) * len
    if (crossing > 1e-9) visit(ix, iy, crossing, angle)
    if (tNext >= 1 - 1e-12) return true
    if (tMaxX < tMaxY) { ix += stepX; tMaxX += tDeltaX }
    else { iy += stepY; tMaxY += tDeltaY }
    tPrev = tNext
  }
  return false
}

// Walk every segment of every polyline. Shared by both consumers below so the
// iteration and the truncation tally live in one place.
function walkLines(lines, cell, visit) {
  let truncated = 0
  for (const line of lines) {
    const pts = line.pts || line
    for (let i = 0; i < pts.length - 1; i++) {
      if (!walkSegment(pts[i], pts[i + 1], cell, visit)) truncated++
    }
  }
  return truncated
}

// A cell accumulator. `vx`/`vy` are the double-angle vector sum: each crossing
// contributes length * (cos 2θ, sin 2θ). Doubling is what makes the mean axial,
// so two crossings 180 degrees apart reinforce instead of cancelling. It is
// also why two crossings 90 degrees apart DO cancel, which is a real property
// of the rule and not a bug: see DEGENERATE_EPSILON.
function accumulate(store, key, ix, iy) {
  let c = store.get(key)
  if (!c) {
    c = { ix, iy, total: 0, vx: 0, vy: 0, colors: null }
    store.set(key, c)
  }
  return c
}

function addCrossing(c, length, angle) {
  const theta = axial(angle)
  c.total += length
  c.vx += length * Math.cos(2 * theta)
  c.vy += length * Math.sin(2 * theta)
}

// Mean axial orientation of a cell's crossings, in [0, PI).
function meanOrientation(c) {
  return axial(0.5 * Math.atan2(c.vy, c.vx))
}

// How strongly the crossings agree on an axis, 0 (fully cancelled) to 1 (all
// parallel). The ratio of the resultant's magnitude to the total length walked.
function coherence(c) {
  return c.total > 0 ? Math.hypot(c.vx, c.vy) / c.total : 0
}

// ── Density map ───────────────────────────────────────────────────────────────

// The armature rasterized into a weight field: where the L-system ran, and how
// densely. The sampler scatters glyphs against these weights; the armature
// itself is usually never drawn.
//
// `baseline` and `fade` are the clearance ramp. Weight is zero at the protected
// baseline (the nav items) and reaches full at baseline + fade, so growth
// descends out from under the navigation rather than colliding with it. A fade
// of 0 collapses the ramp to a hard step at the baseline, which is a legitimate
// setting and not an error.
//
// Returns cells in a stable order: ascending iy, then ix. Deterministic ordering
// matters because the sampler consumes this list, and any rng-consuming loop fed
// by an unstable sort would draw a different picture from the same seed.
export function densityMap(lines, { cell, width, height, baseline = 0, fade = 0 }) {
  const store = new Map()
  const truncated = walkLines(lines, cell, (ix, iy, length, angle) => {
    if (ix < 0 || iy < 0 || ix * cell >= width || iy * cell >= height) return
    addCrossing(accumulate(store, `${ix},${iy}`, ix, iy), length, angle)
  })

  const cells = []
  for (const c of store.values()) {
    const cx = c.ix * cell + cell / 2
    const cy = c.iy * cell + cell / 2
    const weight = c.total * smoothstep(baseline, baseline + fade, cy)
    if (weight <= 0) continue
    cells.push({ ix: c.ix, iy: c.iy, cx, cy, weight, orientation: meanOrientation(c) })
  }
  cells.sort((a, b) => a.iy - b.iy || a.ix - b.ix)
  return { cells, truncated }
}

// ── Committed aggregation ─────────────────────────────────────────────────────

// World-space strokes in, pixel cells out. This is the pixel face.
//
// `strokes` is [{ pts: [{x, y}], color }]. Color is per stroke, not per mark:
// a mark can carry more than one ink (amendment 2a), and the dominant ink in a
// cell is decided by crossing length, so the longest-crossing color wins.
//
// `buckets` is 4 in light and dark, 2 in high contrast. `invert` flips the tone
// map. Both come from AGGREGATION; they are parameters so a caller can run the
// high-contrast variant without a second code path.
export function aggregate(strokes, {
  cell,
  width,
  height,
  buckets = AGGREGATION.buckets,
  threshold = AGGREGATION.threshold,
  invert = AGGREGATION.invert,
}) {
  const store = new Map()
  let truncated = 0

  for (const stroke of strokes) {
    const color = stroke.color || null
    truncated += walkLines([stroke], cell, (ix, iy, length, angle) => {
      if (ix < 0 || iy < 0 || ix * cell >= width || iy * cell >= height) return
      const c = accumulate(store, `${ix},${iy}`, ix, iy)
      addCrossing(c, length, angle)
      if (color) {
        if (!c.colors) c.colors = new Map()
        c.colors.set(color, (c.colors.get(color) || 0) + length)
      }
    })
  }

  const cells = []
  let degenerate = 0

  for (const c of store.values()) {
    // Presence is crossing length against the cell size, so stroke WIDTH is
    // irrelevant: a hairline and a heavy line crossing the same cell the same
    // way register identically. That is the point of measuring length.
    if (c.total < threshold * cell) continue

    if (coherence(c) < DEGENERATE_EPSILON) degenerate++

    const level = bucketOf(meanOrientation(c), buckets)
    const tone = invert ? buckets - 1 - level : level

    // Dominant ink by crossing length. The tie-break is load-bearing, not
    // tidiness: where two strokes of different colors cross a cell by exactly
    // the same length (an intersection of one horizontal and one vertical
    // stroke does it exactly), comparing on length alone leaves the winner
    // decided by which stroke was walked first. That would make the drawing
    // depend on draw order, which is the one thing the determinism rules
    // forbid. Falling back to the lower color string makes the choice a
    // property of the ink rather than of the iteration.
    let color = null
    if (c.colors) {
      let best = 0
      for (const [ink, length] of c.colors) {
        if (length > best || (length === best && color !== null && ink < color)) {
          best = length
          color = ink
        }
      }
    }
    cells.push({ ix: c.ix, iy: c.iy, level, tone, color })
  }

  // Same stable ordering as densityMap, and for the same reason: the reveal
  // staggers cells by index, so an unstable order would restagger the whole
  // composition on any re-run.
  cells.sort((a, b) => a.iy - b.iy || a.ix - b.ix)
  return { cells, stats: { inked: cells.length, degenerate, truncated } }
}
