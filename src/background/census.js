// ─── Library census ──────────────────────────────────────────────────────────
//
// Two measurements over a built library, both pure, both feeding the lab panel.
//
// They exist because the two problems the lab is for are invisible in the art
// itself. You can see that a composition is too heavy; you cannot see WHICH ink
// is carrying the weight, or that one mark is depositing a third of the ink of
// its neighbours. Both are one measurement away, and neither is guessable.
//
// Measured in stroke LENGTH, not element count, because the vector face strokes
// outlines: an ink that appears in one long path outweighs an ink that appears
// in forty short ones, and element count says the opposite.

import { inkKeyOf } from './ink'

function strokeLength(stroke) {
  let len = 0
  for (let i = 1; i < stroke.pts.length; i++) {
    len += Math.hypot(stroke.pts[i].x - stroke.pts[i - 1].x, stroke.pts[i].y - stroke.pts[i - 1].y)
  }
  return len
}

/**
 * Every distinct ink in the library, ordered by how much of the drawing it is.
 *
 * `share` is a fraction of total stroke length, which is the honest weight for
 * a stroked face: it answers "how much of what I see is this colour".
 *
 * @returns {{ink: string, share: number, length: number, tokenBound: boolean}[]}
 */
export function inkCensus(library) {
  const byKey = new Map()
  let total = 0
  for (const mark of library || []) {
    for (const stroke of mark.strokes || []) {
      const key = inkKeyOf(stroke)
      if (!key) continue
      const len = strokeLength(stroke)
      byKey.set(key, (byKey.get(key) || 0) + len)
      total += len
    }
  }
  return [...byKey.entries()]
    .map(([ink, length]) => ({
      ink,
      length,
      share: total > 0 ? length / total : 0,
      tokenBound: ink === 'currentColor',
    }))
    .sort((a, b) => b.length - a.length)
}

/**
 * Ink deposited per unit of mark size.
 *
 * Normalized by the SQUARE ROOT of the bounding-box area rather than the area
 * itself, so the number is a length-over-length ratio and does not change when
 * a mark is simply drawn bigger. Without that, a large mark would always look
 * denser than a small one and the measurement would describe scale instead of
 * authoring style.
 */
export function markDensity(mark) {
  let len = 0
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const stroke of mark.strokes || []) {
    for (let i = 0; i < stroke.pts.length; i++) {
      const p = stroke.pts[i]
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
      if (i) len += Math.hypot(p.x - stroke.pts[i - 1].x, p.y - stroke.pts[i - 1].y)
    }
  }
  const area = Math.max(1, (maxX - minX) * (maxY - minY))
  return { density: len / Math.sqrt(area), length: len, subpaths: (mark.strokes || []).length }
}

/**
 * Per-mark density plus the library median, which is the target normalization
 * pulls toward. Median rather than mean because the distribution is skewed by
 * exactly the outliers being measured, and a mean would be dragged toward them.
 */
export function markCensus(library) {
  const marks = (library || []).map((mark, index) => ({ index, name: mark.name, ...markDensity(mark) }))
  const sorted = marks.map((m) => m.density).sort((a, b) => a - b)
  const median = sorted.length
    ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : 0
  return {
    median,
    marks: marks.map((m) => ({ ...m, ratio: median > 0 ? m.density / median : 1 })),
  }
}

/**
 * Per-mark stroke-width multipliers that even out ink deposition.
 *
 * A mark below the median gets a thicker stroke and one above it gets a thinner
 * one, so every mark lands near the same ink-per-area. `strength` is 0 (leave
 * the library alone) to 1 (full correction), as an exponent rather than a lerp
 * so the midpoint is the geometric halfway rather than the arithmetic one,
 * which is the right middle for a ratio.
 *
 * Clamped, because the correction is only meaningful over a modest range and a
 * 10x multiplier on some future outlier would draw a blob rather than a mark.
 *
 * The bounds are asymmetric because the two failures are not symmetric. A factor
 * above 1 thickens, and enough of it draws a blob instead of a mark, so `max`
 * has to stay tight. A factor below 1 only thins, which degrades toward
 * invisible rather than toward wrong, so `min` can be loose and is: 0.25 covers
 * a mark depositing four times the median.
 *
 * Neither bound binds on the Token Lab library as it stands. Since the boxes
 * were evened on 2026-07-27 it spans 0.83x to 1.25x, so full strength asks for
 * factors between 0.80 and 1.20 and the clamp never speaks. It is a guard for a
 * library that has not been authored yet, not a correction this one relies on.
 */
export function normalizationFactors(library, strength = 0, { min = 0.25, max = 3 } = {}) {
  const { marks, median } = markCensus(library)
  return marks.map((m) => {
    if (!strength || !(m.density > 0) || !(median > 0)) return 1
    const factor = Math.pow(median / m.density, strength)
    return Math.min(max, Math.max(min, factor))
  })
}
