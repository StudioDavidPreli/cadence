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

// Token Lab's four behavior categories, in display order.
export const CATEGORIES = [
  { id: 'press-state',       label: 'Press & State' },
  { id: 'enter-exit',        label: 'Enter & Exit' },
  { id: 'sequence-progress', label: 'Sequence & Progress' },
  { id: 'gesture',           label: 'Gesture' },
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
