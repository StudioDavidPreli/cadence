import { BackgroundArt } from '../BackgroundArt'
import { MARK_LIBRARY } from '../../background/library'
import { hash32 } from '../../background/rng'
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
const TUNING = {
  ...(BACKGROUND_TUNING.budget != null && { budget: BACKGROUND_TUNING.budget }),
  ...(BACKGROUND_TUNING.scale != null && { stampScale: BACKGROUND_TUNING.scale }),
  ...(BACKGROUND_TUNING.cell != null && { cellSize: BACKGROUND_TUNING.cell }),
}

export default function NavBackgroundArt(props) {
  return (
    <BackgroundArt {...props} library={MARK_LIBRARY} seed={VISIT_SEED} showGrid={BACKGROUND_GRID} {...TUNING} />
  )
}
