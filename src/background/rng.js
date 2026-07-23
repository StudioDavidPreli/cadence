// ─── rng ──────────────────────────────────────────────────────────────────────
//
// Two kinds of randomness, and the boundary between them, which the rulings
// asked to be named in one place rather than left to be inferred.
//
//   hash draws (draw / signedDraw)
//     For anything indexed by a position on the grid. Every value is a hash of
//     (seed, i, j, salt), so a cell owns its numbers no matter what order the
//     cells are visited in, and no matter how many other cells exist. This is
//     the idiom src/components/DemoField/generateField.js already uses, and the
//     reason is the same: the surface resizes, and a sequential stream
//     re-consumed over a different cell count produces a different drawing.
//
//   sequential stream (mulberry32)
//     For the L-system expansion, which is inherently ordered: a production
//     rule's choice depends on where it sits in the rewrite, and the string is
//     walked start to finish exactly once. There is no grid position to key on,
//     and re-running never happens against a different count, so a stream is
//     both correct and simpler here.
//
// The rule: if a value belongs to a CELL, hash it. If it belongs to a STEP in
// a sequence, stream it. Never mix Math.random into either path; both are
// reproducible only if every draw comes from one of these two functions.

// FNV-1a over a string, to 32-bit unsigned. Seeds the per-cell draws.
export function hash32(str) {
  let h = 2166136261
  for (let k = 0; k < str.length; k++) {
    h ^= str.charCodeAt(k)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// One deterministic draw in [0, 1) for a (seed, i, j, salt) quadruple.
//
// The salt separates independent qualities of the same cell. Without it, a
// cell's x-jitter and its rotation would be the same number, and the field
// would show a visible correlation between the two. Callers pass a different
// salt per quality, and a salt that includes the stamp index when one cell
// carries more than one stamp.
export function draw(seed, i, j, salt) {
  let h =
    hash32(String(seed)) ^
    Math.imul(i + 374761393, 668265263) ^
    Math.imul(j + 1442695041, 2246822519) ^
    Math.imul(salt + 1, 3266489917)
  h = Math.imul(h ^ (h >>> 15), 2654435761)
  h = Math.imul(h ^ (h >>> 13), 1541459225)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Signed variant in [-1, 1), for jitter that displaces either way.
export function signedDraw(seed, i, j, salt) {
  return draw(seed, i, j, salt) * 2 - 1
}

// The sequential stream. Seven lines, standard, and adequate for background
// art: it is not cryptographic and does not need to be. Returns a function so
// the caller holds the advancing state explicitly rather than through a module
// global, which is what keeps two concurrent expansions from interfering.
export function mulberry32(seed) {
  let a = seed | 0
  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
