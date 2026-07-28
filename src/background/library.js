// ─── library ──────────────────────────────────────────────────────────────────
//
// The mark library, loaded one (library, colorway) folder at a time.
//
// Authoring spec and the constraints that matter: src/background/marks/README.md

// ── Why this is lazy, and why it is twelve modules ────────────────────────────
//
// This module used to eager-glob all twelve folders. That put 2.3 MB of SVG
// source into the background chunk as string literals, which minify to nothing
// (they are data) and gzip to 496 kB. The chunk was two and a half times the
// size of the entire rest of the app, fetched as soon as the nav column mounted,
// to draw ten marks in one theme.
//
// Only one folder is ever on screen: one library, chosen by the open section,
// in one colorway, chosen by the theme. So a folder is the unit that loads.
//
// It is twelve one-line modules rather than one lazy glob because of how Vite
// splits. `import.meta.glob` needs a statically analysable pattern, so the
// folder name cannot be a variable, and the LAZY form of a glob emits a chunk
// per file: a theme switch on motionTiles would be 32 requests. Each module here
// eager-globs its own folder and is itself dynamic-imported, so one folder is
// one chunk and one request.
//
// ── Parity moved to the test suite ────────────────────────────────────────────
//
// The four colorways of a mark are the same drawing in different inks, and the
// system depends on that: a mark missing from one folder shortens that colorway
// and shifts every index above it, so each theme would quietly draw a different
// animal. Nothing would error.
//
// That check used to run here, at load, and warn. It cannot any more, because
// the other three colorways are not loaded to compare against, and it should not
// have been a warning in the first place. It runs in library.test.js instead,
// against the real assets, where it fails the build the day an export goes out
// of step. Which is what the check was always for.

import { parseMarkSvg, GLYPHS } from './glyphs'

// The four authored colorways, and the one the geometry is authored against
// first. Every mark exists in all four; see the parity test.
export const MARK_COLORWAYS = ['darkMode', 'lightMode', 'contrastDark', 'contrastLight']
export const CANONICAL_COLORWAY = 'darkMode'

export const MARK_LIBRARY_KEYS = ['tokenLab', 'principles', 'motionTiles']

// The twelve folder modules, keyed `<library>.<colorway>`. Written out rather
// than built with a template literal because a dynamic import specifier has to
// be statically analysable for the same reason a glob pattern does: a
// fully-variable path defeats the bundler and resolves to nothing at build time.
const FOLDERS = {
  'tokenLab.darkMode': () => import('./colorways/tokenLab.darkMode.js'),
  'tokenLab.lightMode': () => import('./colorways/tokenLab.lightMode.js'),
  'tokenLab.contrastDark': () => import('./colorways/tokenLab.contrastDark.js'),
  'tokenLab.contrastLight': () => import('./colorways/tokenLab.contrastLight.js'),
  'principles.darkMode': () => import('./colorways/principles.darkMode.js'),
  'principles.lightMode': () => import('./colorways/principles.lightMode.js'),
  'principles.contrastDark': () => import('./colorways/principles.contrastDark.js'),
  'principles.contrastLight': () => import('./colorways/principles.contrastLight.js'),
  'motionTiles.darkMode': () => import('./colorways/motionTiles.darkMode.js'),
  'motionTiles.lightMode': () => import('./colorways/motionTiles.lightMode.js'),
  'motionTiles.contrastDark': () => import('./colorways/motionTiles.contrastDark.js'),
  'motionTiles.contrastLight': () => import('./colorways/motionTiles.contrastLight.js'),
}

// Natural sort, so `mark-6` precedes `mark-10` and `Asset 2` precedes
// `Asset 10`. Order matters: the sampler picks a mark by index from a hash draw,
// so a reordered library redraws every composition. It matters twice over,
// because index is also what pairs a mark with its other three colorways.
const sortedPaths = (files) =>
  Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const baseName = (path) => path.replace(/^.*\//, '').replace(/\.svg$/i, '')

// ── Shapes for the native face ────────────────────────────────────────────────
//
// The native face draws the authored shapes, filled, exactly as the file
// describes them, so all it wants is the path data and the paint. Nothing here
// is flattened, sampled or measured.
//
// The normalization still has to happen, or a mark would land at its authored
// size in a viewBox nobody scaled. It is precomputed as three numbers rather
// than applied to coordinates, so the renderer can express it as one SVG
// transform and let the browser do the arithmetic it is good at.
export function shapesFrom(files, label) {
  const warnings = []
  const shapes = sortedPaths(files).map((path) => {
    const name = baseName(path)
    const { mark, warnings: markWarnings } = parseMarkSvg(files[path], `${label}/${name}`)
    warnings.push(...markWarnings)
    if (!mark) return null

    const vb = String(mark.viewBox).trim().split(/[\s,]+/).map(Number)
    const [vx, vy, vw, vh] = vb.length === 4 && vb.every(Number.isFinite)
      ? vb
      : [0, 0, GLYPHS.span, GLYPHS.span]
    return {
      name,
      // Centre of the viewBox, which is the attachment point by ruling, and the
      // scale that maps the longest side onto the shared span.
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
  return { shapes, warnings }
}

// Parsed folders, kept so a theme switched away from and back to costs one
// render rather than a second fetch and a second parse. Twelve entries at the
// absolute ceiling, and a visitor reaches at most a handful.
const cache = new Map()

// Load one library in one colorway. Returns the shape array the native face
// indexes by markIndex.
//
// Rejects rather than resolving empty on an unknown key, because every caller of
// this is passing a value from a fixed map and a miss means the map and this
// file have gone out of step, which is a programming error and not a missing
// asset.
export async function loadColorway(libraryKey, colorway) {
  const key = `${libraryKey}.${colorway}`
  if (cache.has(key)) return cache.get(key)

  const load = FOLDERS[key]
  if (!load) throw new Error(`[background/library] no such colorway folder: ${key}`)

  const files = (await load()).default
  const { shapes, warnings } = shapesFrom(files, key)
  cache.set(key, shapes)

  if (import.meta.env.DEV) {
    console.info(`[background/library] ${key}: ${shapes.length} marks`)
    if (warnings.length) {
      console.warn('[background/library] ' + warnings.join('\n[background/library] '))
    }
  }
  return shapes
}

// Whether a folder is already parsed. The renderer uses this to tell a first
// paint (nothing to draw yet) from a theme switch (keep drawing the old colorway
// until the new one lands), which is the difference between a blank column and
// no visible change at all.
export function colorwayReady(libraryKey, colorway) {
  return cache.has(`${libraryKey}.${colorway}`)
}

export function cachedColorway(libraryKey, colorway) {
  return cache.get(`${libraryKey}.${colorway}`) ?? null
}

// Test seam: the parity test loads all twelve folders and needs the raw file
// maps, not the parsed shapes.
export const COLORWAY_FOLDERS = FOLDERS
