// ─── Navigation constants ─────────────────────────────────────────────────────
// Canonical list of Token Lab categories and the section identifiers, kept in a
// leaf module so NavColumn, DemoArea, TokenLab, and the hash-route parser can all
// import them without a circular dependency. The category ids match the old TABS
// ids exactly, so the four behavior demos keep their identity through the move
// out of the tab strip.

export const SECTIONS = {
  TOKEN_LAB: 'token-lab',
  PRINCIPLES: 'principles',
  MOTION_TILES: 'motion-tiles',
  GLOSSARY: 'glossary',
}

// The Token Lab guide is a destination, not a category. Opening the Token Lab
// header shows it, and the "Overview" nav leaf routes back to it. It is the
// destination value for the bare #/token-lab route (a category id fills
// #/token-lab/<id>). Kept distinct from CATEGORY_IDS so the router can tell a
// category from the guide: 'overview' is not in the category list.
export const TOKEN_LAB_GUIDE = 'overview'

// Motion Tiles has two destinations, mirroring the Token Lab guide/category
// split: the landing (an intro that gates the heavy webgl2 grid behind an
// explicit Enter) and the live grid itself. The landing is the bare
// #/motion-tiles route; the grid fills #/motion-tiles/grid. Kept as distinct
// constants so the router and the section can tell them apart, the same way
// TOKEN_LAB_GUIDE is distinct from the category ids.
export const MOTION_TILES_LANDING = 'landing'
export const MOTION_TILES_GRID = 'grid'

// The Glossary (build-order item 5) is the generated style guide: views over
// the same data. Tokens is per-family (values per preset, provenance,
// consumers); Components is the inverse read (per component, what it
// consumes). Named Glossary rather than Guide (David, 2026-09-03) so a third
// leaf of defined terms can join these two later. Same destination-constant
// pattern as Motion Tiles' two views.
export const GLOSSARY_TOKENS = 'tokens'
export const GLOSSARY_COMPONENTS = 'components'

// Token Lab's behavior categories, in display order. Embeds (2026-07-18) is
// the home for canvas-embedded demos: motion that lives in a Rive file but
// still answers the token reducer, starting with React Clock.
export const CATEGORIES = [
  { id: 'press-state',       label: 'Press & State' },
  { id: 'enter-exit',        label: 'Enter & Exit' },
  { id: 'sequence-progress', label: 'Sequence & Progress' },
  { id: 'gesture',           label: 'Gesture' },
  { id: 'embeds',            label: 'Embeds' },
]

export const CATEGORY_IDS = CATEGORIES.map(c => c.id)

// Principles grid filters. 'all' is the implicit default — there is no 'All'
// row; re-clicking the active filter toggles back to 'all'. Classic is the
// twelve principles of animation (1-12), Extended is Cadence's six design-
// engineering principles (13-18).
export const FILTERS = {
  ALL: 'all',
  CLASSIC: 'classic',
  EXTENDED: 'extended',
}
