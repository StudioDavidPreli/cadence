// ─── library ──────────────────────────────────────────────────────────────────
//
// Build-time load of the mark library. This is the `glyphs/` boundary's last
// piece: the SVG files come in through Vite's glob, `parseMarkSvg` reads their
// structure and paint, and the owned flattener turns them into polylines.
//
// Eager, not lazy. The whole library is a few kilobytes of path data, and the
// surface that uses it is already behind a flag and a dynamic import, so the
// chunk boundary that matters is above this module rather than inside it.
//
// Authoring spec and the constraints that matter: src/background/marks/README.md

// ── One library per tool ──────────────────────────────────────────────────────
//
// Three libraries rather than one, keyed by the surface that draws them, so each
// tool's background is made of its own marks. The mapping from a nav section to
// a key lives with the rest of the per-section decisions in NavBackgroundArt;
// this module only loads what is on disk.
//
// The globs are literal and separate because that is Vite's requirement: the
// pattern has to be statically analysable, so a loop over directory names would
// resolve to nothing at build time and the libraries would silently be empty.
//
// `marks/*.svg` at the top level is deliberately NOT globbed any more. The six
// files still sitting there are the authoring reference the README documents,
// not a library any surface draws.

import { parseMarkSvg, buildLibrary } from './glyphs'

const SOURCES = {
  tokenLab: import.meta.glob('./marks/tokenLab/*.svg', { query: '?raw', import: 'default', eager: true }),
  principles: import.meta.glob('./marks/principles/*.svg', { query: '?raw', import: 'default', eager: true }),
  motionTiles: import.meta.glob('./marks/motionTiles/*.svg', { query: '?raw', import: 'default', eager: true }),
}

const warnings = []

function libraryFrom(files, key) {
  const defs = []
  // Natural sort, so mark-6 precedes mark-10 and `Asset 2` precedes `Asset 10`.
  // Order matters: the sampler picks a mark by index from a hash draw, so a
  // reordered library redraws every composition.
  for (const path of Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
    const name = path.replace(/^.*\//, '').replace(/\.svg$/i, '')
    const { mark, warnings: markWarnings } = parseMarkSvg(files[path], `${key}/${name}`)
    warnings.push(...markWarnings)
    if (mark) defs.push(mark)
  }
  return buildLibrary(defs)
}

export const MARK_LIBRARIES = {
  tokenLab: libraryFrom(SOURCES.tokenLab, 'tokenLab'),
  principles: libraryFrom(SOURCES.principles, 'principles'),
  motionTiles: libraryFrom(SOURCES.motionTiles, 'motionTiles'),
}

if (import.meta.env.DEV) {
  const counts = Object.entries(MARK_LIBRARIES).map(([k, v]) => `${k} ${v.length}`).join(', ')
  console.info(`[background/library] ${counts}`)
  if (warnings.length) console.warn('[background/library] ' + warnings.join('\n[background/library] '))
}

export const LIBRARY_WARNINGS = warnings
