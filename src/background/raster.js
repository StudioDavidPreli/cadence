// ─── raster ───────────────────────────────────────────────────────────────────
//
// The background system's grid layer: an analytic segment/grid traversal and the
// density map that weights where marks get scattered.
//
// Pure. No DOM, no React, no time, no randomness. That is what makes it
// unit-testable and what makes the same input produce the same drawing in every
// engine, which the whole system's determinism claim rests on. It follows the
// discipline parse.js, springCurve.js and footprint.js already use.
//
// This file used to hold a second half: the committed aggregation that turned
// world-space strokes into pixel cells, with its presence threshold, its blended
// orientation tone and its tie rule. That was the pixel face, deleted 2026-07-28.
// What it aggregated (flattened stroke polylines) is not produced any more
// either. The rulings it implemented are still recorded in
// docs/briefings/background_system_rulings.md.
//
// Cell size is deliberately NOT a constant here. It is a per-surface value, so
// every entry point takes it as a parameter and the surface's own config owns
// the number.


// ── Angle helpers ─────────────────────────────────────────────────────────────

// Orientation is AXIAL, not directional: a stroke running north-east and one
// running south-west lie on the same axis and must land in the same bucket.
// Folding the angle into [0, PI) is what makes that true, and it is why the
// accumulator below doubles the angle before summing.
export function axial(angle) {
  const t = angle % Math.PI
  return t < 0 ? t + Math.PI : t
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
