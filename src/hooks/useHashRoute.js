import { useEffect, useRef } from 'react'
import {
  SECTIONS,
  CATEGORY_IDS,
  FILTERS,
  TOKEN_LAB_GUIDE,
  MOTION_TILES_LANDING,
  MOTION_TILES_GRID,
} from '../data/navigation'
import { principleBySlug, principleById } from '../data/principles'

// ─── Hash routing ─────────────────────────────────────────────────────────────
//
// Deep linking without a router dependency. The navigation state is mirrored
// into location.hash so sections, categories, and grid filters are shareable
// and the browser back button works. No react-router: this project is
// deliberately lean, and the route space is small enough that a parse/serialize
// pair plus one hashchange listener covers it.
//
// Route grammar:
//   #/                              landing (hero)
//   #/token-lab                     Token Lab open, guide in demo
//   #/token-lab/<categoryId>        a Token Lab category demo
//   #/principles                    grid, all eighteen
//   #/principles/<filter>           grid filtered to classic | extended
//   #/principles/<filter>/<slug>    grid + one principle open as a deep-link modal
//   #/motion-tiles                  Motion Tiles landing (the Enter gate)
//   #/motion-tiles/grid             the live Motion Tiles grid
//
// The third principles segment is the deep-link entrance (designed 2026-07-21):
// a direct link mounts the grid in its default state and opens the named
// principle in a Modal above it. State carries the resolved numeric principleId;
// the URL carries the authored slug. This module is the single translation layer
// between the two — parseHash resolves slug -> id, stateToHash serializes id ->
// slug. In-grid expansion stays URL-less by design; only the modal has a route.
// Reasoning: docs/decisions/principle-deep-links-2026-07-21.md.

// The landing state, shared as the reducer's initial value and the RETURN_HOME
// target. Defined here (not in the context) because parseHash needs it as the
// fallback for any unrecognized route. principleId is null everywhere except a
// deep-link route: it names the one principle shown as a modal over the grid.
export const LANDING = {
  section: null,
  destination: null,
  expandedSection: null,
  principleFilter: FILTERS.ALL,
  principleId: null,
}

function getHash() {
  return window.location.hash
}

// Parse a hash string into a full navigation state object. Anything
// unrecognized falls back to LANDING — a bad URL lands you on the hero rather
// than throwing.
export function parseHash(hash) {
  // Strip the leading '#' and '/', then split into path segments.
  const path = (hash || '').replace(/^#\/?/, '')
  if (path === '') return { ...LANDING }

  const [first, second, third] = path.split('/')

  if (first === SECTIONS.TOKEN_LAB) {
    // #/token-lab (guide) or #/token-lab/<categoryId> (a demo). A non-category
    // tail (or none) falls back to the guide, so a stale category id lands on
    // the guide rather than a blank demo.
    const isCategory = second && CATEGORY_IDS.includes(second)
    return {
      section: SECTIONS.TOKEN_LAB,
      expandedSection: SECTIONS.TOKEN_LAB,
      destination: isCategory ? second : TOKEN_LAB_GUIDE,
      principleFilter: FILTERS.ALL,
      principleId: null,
    }
  }

  if (first === SECTIONS.PRINCIPLES) {
    // #/principles, #/principles/<filter>, or #/principles/<filter>/<slug>.
    const parsedFilter = second === FILTERS.CLASSIC || second === FILTERS.EXTENDED
      ? second
      : FILTERS.ALL

    // Third segment: a principle slug (or its numeric-id alias). A resolved
    // principle opens its deep-link modal AND normalizes the filter to that
    // principle's own family, so a mismatched filter (#/principles/extended/
    // staging) resolves in the id's favor. An unresolved slug drops away,
    // leaving the plain grid at the parsed filter — the same fail-soft posture
    // as an unknown route landing on LANDING.
    const principle = third ? principleBySlug(third) : null

    return {
      section: SECTIONS.PRINCIPLES,
      expandedSection: SECTIONS.PRINCIPLES,
      destination: SECTIONS.PRINCIPLES,
      principleFilter: principle ? principle.category : parsedFilter,
      principleId: principle ? principle.id : null,
    }
  }

  if (first === SECTIONS.MOTION_TILES) {
    // #/motion-tiles (landing) or #/motion-tiles/grid (the live grid). A
    // non-grid tail falls back to the landing, so a stale or bad tail lands on
    // the intro rather than paying the runtime cost unasked.
    const isGrid = second === MOTION_TILES_GRID
    return {
      section: SECTIONS.MOTION_TILES,
      expandedSection: SECTIONS.MOTION_TILES,
      destination: isGrid ? MOTION_TILES_GRID : MOTION_TILES_LANDING,
      principleFilter: FILTERS.ALL,
      principleId: null,
    }
  }

  return { ...LANDING }
}

// Serialize navigation state back into a hash string (with leading '#').
export function stateToHash(state) {
  if (state.section === SECTIONS.TOKEN_LAB) {
    // Only a real category fills the tail. The guide (and any non-category
    // destination) serializes to the bare #/token-lab.
    return CATEGORY_IDS.includes(state.destination)
      ? `#/${SECTIONS.TOKEN_LAB}/${state.destination}`
      : `#/${SECTIONS.TOKEN_LAB}`
  }
  if (state.section === SECTIONS.PRINCIPLES) {
    // A deep-link modal is open: emit the three-segment form with the authored
    // slug. principleHash carries the filter/slug pair so this branch and the
    // copy-link control build the same string from the same place.
    if (state.principleId != null) {
      const hash = principleHash(state.principleId)
      if (hash) return hash
      // slug missing for this id (should not happen): fall through to the grid.
    }
    return state.principleFilter && state.principleFilter !== FILTERS.ALL
      ? `#/${SECTIONS.PRINCIPLES}/${state.principleFilter}`
      : `#/${SECTIONS.PRINCIPLES}`
  }
  if (state.section === SECTIONS.MOTION_TILES) {
    // Only the grid destination fills the tail; the landing serializes to the
    // bare route.
    return state.destination === MOTION_TILES_GRID
      ? `#/${SECTIONS.MOTION_TILES}/${MOTION_TILES_GRID}`
      : `#/${SECTIONS.MOTION_TILES}`
  }
  return '#/'
}

// The canonical deep-link hash for one principle: #/principles/<category>/<slug>.
// The filter segment is the principle's own family (classic | extended), which is
// exactly what parseHash normalizes an incoming filter to, so a copied link round-
// trips to the same state it was built from. Returns null for an out-of-range id.
// Single source for both the serializer above and the copy-link control, so the
// two cannot drift on the URL shape.
export function principleHash(id) {
  const record = principleById(id)
  if (!record) return null
  return `#/${SECTIONS.PRINCIPLES}/${record.category}/${record.slug}`
}

// Two-way sync between navigation state and the URL hash.
//
// Loop avoidance: lastHashRef records the hash this hook last wrote. The
// hashchange listener ignores any change that matches it, so our own writes
// don't bounce back into a dispatch. Genuine browser navigation (back button,
// manual edit) never matches, so it does dispatch.
//
// The provider seeds the reducer's initial state from parseHash, so on first
// mount the state already agrees with the URL. The state->hash effect therefore
// finds them equal and writes nothing, which is what preserves a deep link on
// load. The one exception is the cosmetic '#/' on a clean URL, written once via
// replaceState so it doesn't add a spurious history entry.
//
// replaceNextRef is the provider's one-shot signal that the NEXT state->hash
// write should use replaceState instead of pushing a history entry. Closing a
// deep-link modal uses it: the close drops the principle segment in place, so
// the back button lands on whatever preceded the deep link rather than reopening
// the just-closed modal. The flag is consumed (cleared) on the first write it
// governs. Optional so the hook still works if a caller omits it.
export function useHashSync(state, dispatch, replaceNextRef) {
  const lastHashRef = useRef(null)
  const firstRunRef = useRef(true)

  // state -> hash
  useEffect(() => {
    const hash = stateToHash(state)
    if (hash !== getHash()) {
      if (firstRunRef.current || replaceNextRef?.current) {
        // replaceState updates the URL without a history entry and without
        // firing hashchange. Two callers want that: the first-run normalize to
        // '#/' on a clean URL, and a deep-link modal close (replaceNextRef).
        // Every other navigation uses location.hash so each move IS a history
        // entry the back button can traverse.
        window.history.replaceState(null, '', hash)
      } else {
        window.location.hash = hash
      }
    }
    // Consume the one-shot flag whether or not a write happened, so it never
    // leaks into a later, unrelated transition.
    if (replaceNextRef) replaceNextRef.current = false
    lastHashRef.current = hash
    firstRunRef.current = false
    // replaceNextRef is a stable ref (its identity never changes), so listing it
    // satisfies exhaustive-deps without adding a re-run trigger. The effect still
    // fires on state changes alone.
  }, [state, replaceNextRef])

  // hash -> state
  useEffect(() => {
    function onHashChange() {
      const hash = getHash()
      if (hash === lastHashRef.current) return // our own write, ignore
      lastHashRef.current = hash
      dispatch({ type: 'SET_FROM_ROUTE', state: parseHash(hash) })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [dispatch])
}
