// ─── library ──────────────────────────────────────────────────────────────────
//
// Build-time load of the mark library. This is the `glyphs/` boundary's last
// piece: the SVG files come in through Vite's glob, `parseMarkSvg` reads their
// structure and paint, and the owned flattener turns them into polylines.
//
// Eager, not lazy. The surface that uses it is already behind a flag and a
// dynamic import, so the chunk boundary that matters is above this module rather
// than inside it.
//
// Authoring spec and the constraints that matter: src/background/marks/README.md

// ── One library per tool, four colorways per library ──────────────────────────
//
// Three libraries, keyed by the surface that draws them, so each tool's
// background is made of its own marks. Each is authored four times, once per
// theme, in `darkMode/`, `lightMode/`, `contrastDark/` and `contrastLight/`.
//
// The globs are literal and separate because that is Vite's requirement: the
// pattern has to be statically analysable, so a loop over directory names would
// resolve to nothing at build time and the libraries would silently be empty.
// Twelve of them is the price of that rule, not a preference.
//
// `marks/*.svg` at the top level is deliberately NOT globbed. The files still
// sitting there are the authoring reference the README documents, not a library
// any surface draws.

import { parseMarkSvg, buildLibrary, GLYPHS } from './glyphs'

// ── Geometry once, paint per theme ────────────────────────────────────────────
//
// The four colorways of a mark are the same drawing in different inks, so this
// module loads the GEOMETRY from one of them and reduces the other three to an
// ink lookup. That is not a size optimization, it is what keeps ruling A true.
//
// Ruling A: a theme switch must not regenerate or re-reveal. The composition
// memo in BackgroundArt keys on `library`, so if the library object changed with
// the theme, every theme toggle would rebuild the L-system, the density map and
// the aggregation, and would remount the stamps. Holding geometry still and
// swapping only the paint means the memo never sees a theme change at all.
//
// It works because the colorways really are the same drawing. Verified across
// all twelve folders before this was written: identical stroke counts
// everywhere, and identical flattened geometry in tokenLab (10/10) and
// motionTiles (32/32). Principles agrees on 21 of 24; the three that differ are
// listed by the mismatch warning below rather than being silently averaged over.
//
// The lookup is keyed on the CANONICAL ink rather than on (mark, stroke) because
// both faces have to resolve it and only one of them knows where a stroke came
// from. The pixel face aggregates strokes into cells and keeps only the dominant
// ink key, so an index-keyed table would be unanswerable there. An ink-keyed one
// works for both, and it is well defined here: measured across all twelve
// pairings, no canonical ink maps to more than one ink in any colorway.
const COLORWAYS = ['darkMode', 'lightMode', 'contrastDark', 'contrastLight']

// Which colorway the geometry is taken from. Any of the four would do; darkMode
// is the one the art is authored against first.
const CANONICAL = 'darkMode'

const RAW = {
  tokenLab: {
    darkMode: import.meta.glob('./marks/tokenLab/darkMode/*.svg', { query: '?raw', import: 'default', eager: true }),
    lightMode: import.meta.glob('./marks/tokenLab/lightMode/*.svg', { query: '?raw', import: 'default', eager: true }),
    contrastDark: import.meta.glob('./marks/tokenLab/contrastDark/*.svg', { query: '?raw', import: 'default', eager: true }),
    contrastLight: import.meta.glob('./marks/tokenLab/contrastLight/*.svg', { query: '?raw', import: 'default', eager: true }),
  },
  principles: {
    darkMode: import.meta.glob('./marks/principles/darkMode/*.svg', { query: '?raw', import: 'default', eager: true }),
    lightMode: import.meta.glob('./marks/principles/lightMode/*.svg', { query: '?raw', import: 'default', eager: true }),
    contrastDark: import.meta.glob('./marks/principles/contrastDark/*.svg', { query: '?raw', import: 'default', eager: true }),
    contrastLight: import.meta.glob('./marks/principles/contrastLight/*.svg', { query: '?raw', import: 'default', eager: true }),
  },
  motionTiles: {
    darkMode: import.meta.glob('./marks/motionTiles/darkMode/*.svg', { query: '?raw', import: 'default', eager: true }),
    lightMode: import.meta.glob('./marks/motionTiles/lightMode/*.svg', { query: '?raw', import: 'default', eager: true }),
    contrastDark: import.meta.glob('./marks/motionTiles/contrastDark/*.svg', { query: '?raw', import: 'default', eager: true }),
    contrastLight: import.meta.glob('./marks/motionTiles/contrastLight/*.svg', { query: '?raw', import: 'default', eager: true }),
  },
}

const warnings = []

// Natural sort, so `mark-6` precedes `mark-10` and `Asset 2` precedes
// `Asset 10`. Order matters: the sampler picks a mark by index from a hash draw,
// so a reordered library redraws every composition. It matters twice over now,
// because index is also what pairs a mark with its other three colorways.
const sortedPaths = (files) =>
  Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const baseName = (path) => path.replace(/^.*\//, '').replace(/\.svg$/i, '')

// The ink a parsed path carries, in the same spelling `inkKeyOf` uses on a
// built stroke, so a key produced here and a key produced there are comparable.
const paintOf = (path) => (path.tokenBound ? 'currentColor' : path.color)

// Every colorway parsed once. The palette maps and the native shape sets are
// both derived from this, so no file is read twice and the two views of a
// library cannot disagree about what is in it.
const PARSED = Object.fromEntries(
  Object.keys(RAW).map((key) => [
    key,
    Object.fromEntries(COLORWAYS.map((cw) => {
      const files = RAW[key][cw]
      const marks = sortedPaths(files).map((path) => {
        const name = baseName(path)
        const label = cw === CANONICAL ? `${key}/${name}` : `${key}/${cw}/${name}`
        const { mark, warnings: markWarnings } = parseMarkSvg(files[path], label)
        warnings.push(...markWarnings)
        return { name, mark }
      })
      return [cw, marks]
    })),
  ]),
)

function libraryFrom(key) {
  return buildLibrary(PARSED[key][CANONICAL].map((entry) => entry.mark).filter(Boolean))
}

// Canonical ink -> this colorway's ink, for one library.
//
// Returns null for the canonical colorway itself: an identity map is the same
// thing as no map, and skipping it keeps the resolver's fast path honest rather
// than making every dark-theme stroke pay for a lookup that cannot change it.
//
// Parity is checked rather than assumed, because every way this can go wrong is
// silent. A mark missing from one colorway shortens that library and shifts
// every index above it, so the composition would draw different marks per theme
// with no error. A path count that disagrees means the two files are not the
// same drawing. Both warn and neither throws, for the reason parseMarkSvg gives:
// a library is authored art, and the useful behaviour is to load what is there
// and say what is wrong.
function paletteFrom(key, colorway) {
  if (colorway === CANONICAL) return null

  const canon = PARSED[key][CANONICAL]
  const theme = PARSED[key][colorway]
  const label = `${key}/${colorway}`

  const canonNames = canon.map((e) => e.name).join('|')
  const themeNames = theme.map((e) => e.name).join('|')
  if (canonNames !== themeNames) {
    warnings.push(
      `${label}: mark names do not match ${CANONICAL}. ` +
      'Indexes will not line up and each theme will draw different marks.',
    )
    return null
  }

  const map = new Map()
  for (let i = 0; i < canon.length; i++) {
    const a = canon[i].mark
    const b = theme[i].mark
    if (!a || !b) continue

    if (a.paths.length !== b.paths.length) {
      warnings.push(
        `${label}/${canon[i].name}: ${b.paths.length} shapes against ${a.paths.length} in ` +
        `${CANONICAL}, so the two files are not the same drawing. Skipped.`,
      )
      continue
    }

    for (let p = 0; p < a.paths.length; p++) {
      const from = paintOf(a.paths[p])
      const to = paintOf(b.paths[p])
      if (!from || !to) continue
      const seen = map.get(from)
      if (seen === undefined) map.set(from, to)
      else if (seen !== to) {
        // Two strokes sharing an ink in the canonical colorway that diverge in
        // this one. The ink-keyed lookup cannot express it, so the first mapping
        // stands and the conflict is named. If this ever fires, the table has to
        // become (mark, stroke) keyed and the pixel face needs another answer.
        warnings.push(
          `${label}: canonical ink ${from} maps to both ${seen} and ${to}. ` +
          `Keeping ${seen}; the ink-keyed palette cannot represent a split.`,
        )
      }
    }
  }
  return map
}

// ── Shapes for the native face ────────────────────────────────────────────────
//
// The traced face needs polylines because it strokes outlines and because the
// pixel face aggregates points. The native face needs neither: it draws the
// authored shapes, filled, exactly as the file describes them, so all it wants
// is the path data and the paint.
//
// Which means this is NOT the flattener's output. Nothing here is flattened,
// sampled or measured; `parseMarkSvg` already produced everything needed and
// `buildMark` is skipped entirely. That is the whole argument for the face: on
// pixel art an outline is a lattice, not a drawing.
//
// The normalization the flattener does in `buildMark` still has to happen, or a
// mark would land at its authored size in a viewBox nobody scaled. It is
// precomputed here as three numbers rather than applied to coordinates, so the
// renderer can express it as one SVG transform and let the browser do the
// arithmetic it is good at.
function shapesFrom(key, colorway) {
  return PARSED[key][colorway].map(({ name, mark }) => {
    if (!mark) return null
    const vb = String(mark.viewBox).trim().split(/[\s,]+/).map(Number)
    const [vx, vy, vw, vh] = vb.length === 4 && vb.every(Number.isFinite)
      ? vb
      : [0, 0, GLYPHS.span, GLYPHS.span]
    return {
      name,
      // Centre of the viewBox, which is the attachment point by ruling, and the
      // scale that maps the longest side onto the shared span. Same two
      // decisions buildMark makes, and they must stay the same or the two faces
      // would place the same mark differently.
      cx: vx + vw / 2,
      cy: vy + vh / 2,
      unit: GLYPHS.span / (Math.max(vw, vh) || 1),
      paths: mark.paths.map((path) => ({
        d: path.d,
        fill: path.tokenBound ? 'currentColor' : path.color,
        transform: path.transform ? `matrix(${path.transform.join(' ')})` : undefined,
      })),
    }
  }).filter(Boolean)
}

// The geometry, one array of marks per library, built from the canonical
// colorway. This is what the sampler indexes into and what the traced face
// draws.
export const MARK_LIBRARIES = {
  tokenLab: libraryFrom('tokenLab'),
  principles: libraryFrom('principles'),
  motionTiles: libraryFrom('motionTiles'),
}

// The paint, one Map per library per colorway. `null` for the canonical
// colorway, which needs no translation.
export const MARK_PALETTES = Object.fromEntries(
  Object.keys(RAW).map((key) => [
    key,
    Object.fromEntries(COLORWAYS.map((cw) => [cw, paletteFrom(key, cw)])),
  ]),
)

// The authored shapes, one set per library per colorway, for the native face.
export const MARK_SHAPES = Object.fromEntries(
  Object.keys(RAW).map((key) => [
    key,
    Object.fromEntries(COLORWAYS.map((cw) => [cw, shapesFrom(key, cw)])),
  ]),
)

export const MARK_COLORWAYS = COLORWAYS
export const CANONICAL_COLORWAY = CANONICAL

if (import.meta.env.DEV) {
  const counts = Object.entries(MARK_LIBRARIES)
    .map(([k, v]) => `${k} ${v.length}`)
    .join(', ')
  console.info(`[background/library] ${counts} (geometry from ${CANONICAL})`)
  if (warnings.length) console.warn('[background/library] ' + warnings.join('\n[background/library] '))
}

export const LIBRARY_WARNINGS = warnings
