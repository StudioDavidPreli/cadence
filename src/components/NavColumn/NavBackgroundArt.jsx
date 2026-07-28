import { useCallback, useMemo, useState } from 'react'
import { BackgroundArt } from '../BackgroundArt'
import { BackgroundLab } from '../BackgroundLab'
import { MARK_LIBRARIES, MARK_PALETTES, MARK_SHAPES, CANONICAL_COLORWAY } from '../../background/library'
import { hash32 } from '../../background/rng'
import { CHOREOGRAPHY } from '../../background/choreography'
import { useMotionPresetEpoch } from '../../context/MotionPresetContext'
import { SECTIONS } from '../../data/navigation'
import { BACKGROUND_SEED_PARAM, BACKGROUND_TUNING, BACKGROUND_GRID } from './backgroundFlag'

// The lazy chunk's contents. Everything the background system needs is imported
// HERE rather than in NavBackground, so the flag-off path pulls none of it into
// the main bundle: not the mark library, not the L-system, not the flattener.
//
// Splitting the boundary this way (a thin flagged wrapper that dynamically
// imports a module holding the real imports) is the same shape the Motion Tiles
// grid uses for its own chunk.

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

// URL tuning overrides, mapped to BackgroundArt's prop names, each present only
// when its param was. Anything absent is simply not passed, so the component's
// own committed default stands. Built once at module scope like the seed.
//
// Spreading a conditional like this is the idiom for "pass this prop only if I
// have a value": `false && {...}` spreads to nothing, so an absent param leaves
// the key off the object entirely rather than passing `undefined`. That matters
// because `undefined` would override a default in some prop patterns and does
// not here, and leaving the key off is the version that is true either way.
const TUNING = {
  ...(BACKGROUND_TUNING.budget != null && { budget: BACKGROUND_TUNING.budget }),
  ...(BACKGROUND_TUNING.scale != null && { stampScale: BACKGROUND_TUNING.scale }),
  ...(BACKGROUND_TUNING.cell != null && { cellSize: BACKGROUND_TUNING.cell }),
  ...(BACKGROUND_TUNING.arrival != null && { cellReveal: BACKGROUND_TUNING.arrival }),
  ...(BACKGROUND_TUNING.gridWeight != null && { gridWeight: BACKGROUND_TUNING.gridWeight }),
  ...(BACKGROUND_TUNING.face != null && { face: BACKGROUND_TUNING.face }),
}

// ── Which library each tool draws from ────────────────────────────────────────
//
// One library per tool, and the mapping lives HERE rather than in NavBackground
// for the same reason every heavy import does: NavBackground is in the eager
// bundle, so a `MARK_LIBRARIES` import up there would put all three libraries in
// the main chunk with the flag off, which is the one property the lazy split
// exists to keep.
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
// Every library is authored four times, once per theme. The geometry is shared
// and loaded once; only the paint differs, and it arrives as a Map from the
// canonical ink to this theme's. The reasoning for that split, and the ruling it
// protects, are in library.js.
//
// This map is the whole theme policy now. What used to live here was a runtime
// ink transform: a mode, a theme to fire it in, and a set of rat inks to scope
// it to, all of it compensating for art that existed in one polarity. Four
// authored colorways answer that question at the source, so the policy reduces
// to a lookup and the transform survives only as a lab knob (see ink.js).
const THEME_COLORWAY = {
  light: 'lightMode',
  dark: 'darkMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export default function NavBackgroundArt(props) {
  // The one line by which the Token Lab tool bar reaches the background. It
  // moves on a preset load or a reset and on nothing else, so a slider drag
  // still changes nothing here. BackgroundArt turns each change into a fresh
  // token read and one replayed reveal.
  const revealKey = useMotionPresetEpoch()

  const libraryKey = SECTION_LIBRARY[props.section] || LANDING_LIBRARY
  const library = MARK_LIBRARIES[libraryKey]

  // The theme's authored colorway. Falls back to the canonical one for an
  // unknown theme name, which paints the art as drawn rather than as nothing.
  const colorway = THEME_COLORWAY[props.palette?.theme] || CANONICAL_COLORWAY
  const markPalette = MARK_PALETTES[libraryKey]?.[colorway] ?? null
  const shapes = MARK_SHAPES[libraryKey]?.[colorway] ?? null

  // No automatic transform any more: the colorways carry the theme. `?ink=` and
  // the lab's dropdown still reach it, which is what makes it an exploration
  // knob rather than a policy. It now applies on top of the authored colorway
  // rather than instead of it, so `?ink=invert` in light inverts the LIGHT art.
  const inkTransform = BACKGROUND_TUNING.ink ?? 'authored'

  // Roots are the one override that cannot be resolved at module scope: they
  // arrive as fractions of the column and the column is only measured by the
  // time this renders. Resolved here against the width the surface passed in,
  // so the same URL means the same composition at any viewport width.
  const roots = BACKGROUND_TUNING.roots
    ? BACKGROUND_TUNING.roots.map((f) => f * props.width)
    : undefined

  // ── Lab state ───────────────────────────────────────────────────────────────
  //
  // Owned HERE, one level above BackgroundArt, because the panel and the artwork
  // are siblings that have to agree: the panel writes a value, the artwork reads
  // it. This is the lowest node that sees both.
  //
  // Seeded from the committed defaults and the URL, so opening the lab changes
  // nothing on screen: it starts at whatever the page was already drawing, and
  // every knob is a departure from that rather than a fresh starting point.
  // David's settled values (2026-07-27), so the lab opens where he left off and
  // every knob is a departure from the drawing he chose rather than from a
  // neutral one. `inkNormalize` and `strokeWidth` apply to the TRACED face only:
  // the native face fills authored shapes and has no stroke to weight.
  const [lab, setLab] = useState(() => ({
    inkTransform,
    inkOverrides: {},
    inkNormalize: 1,
    strokeWidth: 1.3,
    minSpacing: 30,
    budget: BACKGROUND_TUNING.budget ?? 40,
    stampScale: BACKGROUND_TUNING.scale ?? 0.45,
    face: BACKGROUND_TUNING.face ?? 'vector',
    idleAmplitude: CHOREOGRAPHY.idleAmplitude,
    driftMin: CHOREOGRAPHY.driftPeriodClamp[0],
    driftMax: CHOREOGRAPHY.driftPeriodClamp[1],
  }))
  const [stats, setStats] = useState(null)

  // useCallback because this is a dependency of the effect in BackgroundArt that
  // reports the counts. A fresh function identity every render would re-run that
  // effect every render, and the setState inside it would loop.
  // A fresh array every render would re-run the idle memo every render, and the
  // memo is what holds the sway steady. Rebuilt only when a bound actually moves.
  const driftPeriodClamp = useMemo(
    () => [lab.driftMin, Math.max(lab.driftMin, lab.driftMax)],
    [lab.driftMin, lab.driftMax],
  )

  const handleStats = useCallback((next) => setStats(next), [])

  return (
    <>
      <BackgroundArt
        {...props}
        library={library}
        seed={VISIT_SEED}
        showGrid={BACKGROUND_GRID}
        {...(roots && { roots })}
        {...TUNING}
        // Lab values come LAST so they win over TUNING and over the committed
        // defaults. Until a knob is touched they hold those same values, so the
        // override is invisible.
        inkTransform={lab.inkTransform}
        markPalette={markPalette}
        shapes={shapes}
        inkOverrides={lab.inkOverrides}
        inkNormalize={lab.inkNormalize}
        strokeWidth={lab.strokeWidth}
        minSpacing={lab.minSpacing}
        budget={lab.budget}
        stampScale={lab.stampScale}
        face={lab.face}
        revealKey={revealKey}
        idleAmplitude={lab.idleAmplitude}
        driftPeriodClamp={driftPeriodClamp}
        onStats={handleStats}
      />
      <BackgroundLab
        library={library}
        libraryKey={libraryKey}
        colorway={colorway}
        markPalette={markPalette}
        state={lab}
        onChange={setLab}
        stats={stats}
      />
    </>
  )
}
