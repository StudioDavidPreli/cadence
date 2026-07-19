// ─── Field generator for the Token Lab demo backdrop ─────────────────────────
//
// Pure function: (seed, width, height, options) → an array of tick marks.
// No DOM, no React, no time — which is what makes it testable and what makes
// the field reproducible. The DemoField component turns the marks into SVG.
//
// Determinism is the load-bearing property. Every random draw is a hash of
// (seed, grid index, salt), never a sequential PRNG: a vertex owns its numbers
// no matter what order it is visited in, so a resize re-derives the identical
// field and only gains or loses marks at the margins. The seed is the Token
// Lab category id, so each page always draws its own field — procedural but
// parametric, the same argument the tokens make.
//
// The numbers in FIELD are not arbitrary: they were tuned by David in the
// sandbox (archive/demo-grid-sandbox, session 2026-07-19) and approved as the
// spec. Change them there first, then port.

export const FIELD = {
  cell: 32,        // grid spacing, px
  jitter: 14,      // max vertex displacement in fully open space, px
  falloff: 237,    // distance over which order relaxes into entropy, px
  gamma: 1.7,      // falloff curve; > 1 widens the calm apron before the ramp
  drop: 0.3,       // max dropout probability in fully open space
  markSize: 4,     // tick arm span, px
  rot: 18,         // max mark rotation in fully open space, degrees
  weightVar: 0.9,  // stroke-width variance in open space (± fraction of 1)
  alpha: 0.6,      // ink opacity; 0.8 in the sandbox, lowered on the real page
                   // where text sits on the layer, not on a mock card (David,
                   // 2026-07-19, alongside the .demoMain clearing plates)
  sparseKeep: 0.2, // high-contrast sparse mode: fraction of marks that survive
  calmBand: 520,   // px from the layer's left edge where the demos live (f = 0)
}

// FNV-1a string hash → 32-bit uint. Seeds the per-vertex draws.
function hash(str) {
  let h = 2166136261
  for (let k = 0; k < str.length; k++) {
    h ^= str.charCodeAt(k)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// One deterministic draw in [0, 1) for a (seed, vertex, salt) triple. The salt
// separates independent qualities of the same vertex (x-jitter vs rotation vs
// survival) so they don't correlate.
function rnd(seed, i, j, salt) {
  let h =
    hash(seed) ^
    Math.imul(i + 374761393, 668265263) ^
    Math.imul(j + 1442695041, 2246822519) ^
    Math.imul(salt, 3266489917)
  h = Math.imul(h ^ (h >>> 15), 2654435761)
  h = Math.imul(h ^ (h >>> 13), 1541459225)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Signed variant in [-1, 1).
const srnd = (seed, i, j, salt) => rnd(seed, i, j, salt) * 2 - 1

// The freedom field. f = 0 inside the calm band where the demos sit, ramping
// to 1 in open space. The sandbox measured distance from a centered mock card;
// the real demo column is left-anchored (demoContent hugs the left padding),
// so here freedom is purely horizontal: distance past the band's right edge.
// Vertical position never matters, which is also what lets the backdrop stay
// pinned while the content scrolls — the zoning cannot drift.
function freedom(x) {
  const d = Math.max(0, x - FIELD.calmBand)
  return Math.pow(Math.min(d / FIELD.falloff, 1), FIELD.gamma)
}

// Generate the field. Returns marks as plain data:
//   { key, x, y, rot, sw }  — position, rotation (deg), stroke width.
// Grid indices anchor to the top-left corner, not the center as the sandbox
// did: the calm band is fixed to the left edge, so left-anchoring is what
// keeps every existing mark in place when the layer grows and new columns
// appear only on the right (and new rows only at the bottom).
export function generateField(seed, width, height, { sparse = false } = {}) {
  const { cell } = FIELD
  const cols = Math.floor(width / cell)
  const rows = Math.floor(height / cell)
  const marks = []

  for (let i = 1; i <= cols; i++) {
    for (let j = 1; j <= rows; j++) {
      const gx = i * cell
      const gy = j * cell
      const f = freedom(gx)

      // Survival: high-contrast sparse mode thins globally (HC has no quiet
      // gray, so the field reads as scattered ticks, not a mesh); dropout on
      // top of that scales with freedom, so the calm band keeps every mark.
      if (sparse && rnd(seed, i, j, 3) > FIELD.sparseKeep) continue
      if (rnd(seed, i, j, 4) < f * FIELD.drop) continue

      marks.push({
        key: `${i},${j}`,
        x: +(gx + srnd(seed, i, j, 1) * FIELD.jitter * f).toFixed(1),
        y: +(gy + srnd(seed, i, j, 2) * FIELD.jitter * f).toFixed(1),
        rot: +(srnd(seed, i, j, 6) * FIELD.rot * f).toFixed(1),
        sw: +(1 + srnd(seed, i, j, 5) * FIELD.weightVar * f).toFixed(2),
      })
    }
  }
  return marks
}
