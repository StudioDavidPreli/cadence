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

import { parseMarkSvg, buildLibrary } from './glyphs'

const files = import.meta.glob('./marks/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const defs = []
const warnings = []

// Natural sort, so mark-6 precedes mark-10 and the library order is stable
// across platforms. Order matters: the sampler picks a mark by index from a
// hash draw, so a reordered library redraws every composition.
for (const path of Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
  const name = path.replace(/^.*\//, '').replace(/\.svg$/i, '')
  const { mark, warnings: markWarnings } = parseMarkSvg(files[path], name)
  warnings.push(...markWarnings)
  if (mark) defs.push(mark)
}

if (import.meta.env.DEV && warnings.length) {
  console.warn('[background/library] ' + warnings.join('\n[background/library] '))
}

export const MARK_LIBRARY = buildLibrary(defs)
export const LIBRARY_WARNINGS = warnings
