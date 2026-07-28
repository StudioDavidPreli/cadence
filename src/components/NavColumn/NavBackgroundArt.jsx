import { useEffect, useState } from 'react'
import { BackgroundArt } from '../BackgroundArt'
import { loadColorway, cachedColorway, CANONICAL_COLORWAY } from '../../background/library'
import { hash32 } from '../../background/rng'
import { useMotionPresetEpoch } from '../../context/MotionPresetContext'
import { SECTIONS } from '../../data/navigation'
import { BACKGROUND_SEED_PARAM, BACKGROUND_TUNING } from './backgroundFlag'

// The lazy chunk's contents. Everything the background system needs is imported
// HERE rather than in NavBackground, so the flag-off path pulls none of it into
// the main bundle: not the mark loader, not the L-system, not the sampler.
//
// Splitting the boundary this way (a thin flagged wrapper that dynamically
// imports a module holding the real imports) is the same shape the Motion Tiles
// grid uses for its own chunk.
//
// The MARKS are a second boundary below this one. They are the bulk of the
// weight and only one folder is ever drawn, so library.js fetches them per
// (library, colorway) rather than shipping all twelve in this chunk. See the
// note there.

// ── The seed, resolved once per visit ─────────────────────────────────────────
//
// A new drawing on every load, and the choice of when is mechanical rather than
// aesthetic. BackgroundArt reveals ONCE on mount and never again (ruling A, so a
// theme switch cannot re-reveal): a seed set at mount is choreographed by the
// arrival that already exists, and a seed changed at any later moment is an
// unmotivated hard cut. So it is drawn here, at chunk load, which happens once
// when the background first mounts. No timer, no reroll button, no crossfade to
// build.
//
// From the full timestamp (date AND time), so it changes every visit rather
// than once a day, then hashed to a clean 32-bit integer so consecutive loads
// do not hand neighbouring numbers to the sampler. Still fully deterministic in
// the sense that matters: the drawing is reproducible from its seed, and the
// seed is printed (dev console) and carried on the layer (data-seed) so a plant
// worth keeping can be pinned with ?seed=<that number>.
//
// The override wins when present. It is resolved in backgroundFlag (a URL read
// with no background import) and only HASHED-or-not here, because this is the
// first point in the chain where rng is allowed to load.
const VISIT_SEED = BACKGROUND_SEED_PARAM ?? hash32(String(Date.now()))

// ── The settled composition ───────────────────────────────────────────────────
//
// David's values, 2026-07-27, promoted from the tuning lab's seed state when the
// lab was deleted. They were adjustable while the art was still moving and the
// art has stopped moving.
//
// The URL knobs below still reach `budget` and `stampScale`, which is the
// version of the lab worth keeping: a value you can already name, passed without
// a rebuild. The knobs that only fed the deleted faces (cell size, arrival,
// grid, face, ink mode) went with them.
const COMPOSITION = {
  budget: 40,
  stampScale: 0.45,
  minSpacing: 30,
}

// URL tuning overrides, mapped to BackgroundArt's prop names, each present only
// when its param was. Anything absent is simply not passed, so the constant
// above stands. Built once at module scope like the seed.
//
// Spreading a conditional like this is the idiom for "pass this prop only if I
// have a value": `false && {...}` spreads to nothing, so an absent param leaves
// the key off the object entirely rather than passing `undefined`.
const TUNING = {
  ...(BACKGROUND_TUNING.budget != null && { budget: BACKGROUND_TUNING.budget }),
  ...(BACKGROUND_TUNING.scale != null && { stampScale: BACKGROUND_TUNING.scale }),
}

// ── Which library each tool draws from ────────────────────────────────────────
//
// One library per tool, and the mapping lives HERE rather than in NavBackground
// for the same reason every heavy import does: NavBackground is in the eager
// bundle.
//
// `null` is the landing/hero, where no section is open. It draws the Token Lab
// library, which is David's call: the landing is the Token Lab's front door and
// the two should not change marks under you when you open the first section.
const SECTION_LIBRARY = {
  [SECTIONS.TOKEN_LAB]: 'tokenLab',
  [SECTIONS.PRINCIPLES]: 'principles',
  [SECTIONS.MOTION_TILES]: 'motionTiles',
}
const LANDING_LIBRARY = 'tokenLab'

// ── Colorways: which authored file set each theme draws ───────────────────────
//
// Every library is authored four times, once per theme. This map is the whole
// theme policy: no runtime ink transform, no high-contrast blanket, no palette.
// The file says what colour it is because the theme has its own file.
const THEME_COLORWAY = {
  light: 'lightMode',
  dark: 'darkMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

// ── Holding the old drawing while the new one is in flight ────────────────────
//
// A colorway is a fetch now, so there is a gap between asking for one and having
// it. What fills that gap is the whole behavioural question, and the answer is
// that nothing does: the state is NOT cleared when the key changes, so the
// previous colorway stays on screen until the next one has parsed and then the
// swap happens in a single render.
//
// Clearing first would be a flash of empty column on every theme switch, which
// is worse than the thing lazy loading was fixing. The first load is the one
// case with nothing to hold, and there the column is simply bare for a moment,
// which is what it looked like before the artwork existed.
//
// The cache is checked synchronously in the initializer as well as in the
// effect, so a theme switched away from and back to repaints without a frame of
// the wrong colourway.
function useColorwayShapes(libraryKey, colorway) {
  const [shapes, setShapes] = useState(() => cachedColorway(libraryKey, colorway))

  useEffect(() => {
    const cached = cachedColorway(libraryKey, colorway)
    if (cached) {
      setShapes(cached)
      return
    }
    // `cancelled` rather than an AbortController: the work being raced is a
    // module fetch and a parse, neither of which is abortable, and the only
    // thing that must not happen is a late resolve writing a stale colorway
    // over a newer one. A flag read at resolve time is exactly that guard.
    let cancelled = false
    loadColorway(libraryKey, colorway)
      .then((next) => { if (!cancelled) setShapes(next) })
      .catch((error) => {
        // The artwork is decorative and the column works without it, so a
        // failed fetch leaves the previous drawing up and says why, rather than
        // taking the nav down with it.
        console.error('[NavBackgroundArt] colorway failed to load', error)
      })
    return () => { cancelled = true }
  }, [libraryKey, colorway])

  return shapes
}

export default function NavBackgroundArt(props) {
  // The one line by which the Token Lab tool bar reaches the background. It
  // moves on a preset load or a reset and on nothing else, so a slider drag
  // still changes nothing here. BackgroundArt turns each change into a fresh
  // token read and one replayed reveal.
  const revealKey = useMotionPresetEpoch()

  const libraryKey = SECTION_LIBRARY[props.section] || LANDING_LIBRARY

  // Falls back to the canonical colorway for an unknown theme name, which paints
  // the art as drawn rather than as nothing.
  const colorway = THEME_COLORWAY[props.palette?.theme] || CANONICAL_COLORWAY
  const shapes = useColorwayShapes(libraryKey, colorway)

  // Roots are the one override that cannot be resolved at module scope: they
  // arrive as fractions of the column and the column is only measured by the
  // time this renders. Resolved here against the width the surface passed in,
  // so the same URL means the same composition at any viewport width.
  const roots = BACKGROUND_TUNING.roots
    ? BACKGROUND_TUNING.roots.map((f) => f * props.width)
    : undefined

  return (
    <BackgroundArt
      {...props}
      libraryKey={libraryKey}
      shapes={shapes}
      // From the shapes actually held rather than from a table, so the count and
      // the art can never disagree mid-swap. A theme switch does not change it
      // (the colorways are parity-checked to equal length), so it does not
      // regenerate the composition; a section switch does, which is correct.
      markCount={shapes?.length ?? 0}
      seed={VISIT_SEED}
      {...(roots && { roots })}
      {...COMPOSITION}
      {...TUNING}
      revealKey={revealKey}
    />
  )
}
