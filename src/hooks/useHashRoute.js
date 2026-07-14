import { useEffect, useRef } from 'react'
import {
  SECTIONS,
  CATEGORY_IDS,
  FILTERS,
  TOKEN_LAB_GUIDE,
  MOTION_TILES_LANDING,
  MOTION_TILES_GRID,
} from '../data/navigation'

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
//   #/motion-tiles                  Motion Tiles landing (the Enter gate)
//   #/motion-tiles/grid             the live Motion Tiles grid
//
// The expanded-principle segment (#/principles/<filter>/<id>) is reserved here
// but not yet produced or consumed — PrinciplesLibrary owns expansion state
// internally and wiring it to the hash is a separate step.

// The landing state, shared as the reducer's initial value and the RETURN_HOME
// target. Defined here (not in the context) because parseHash needs it as the
// fallback for any unrecognized route.
export const LANDING = {
  section: null,
  destination: null,
  expandedSection: null,
  principleFilter: FILTERS.ALL,
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

  const [first, second] = path.split('/')

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
    }
  }

  if (first === SECTIONS.PRINCIPLES) {
    // #/principles or #/principles/<filter>
    const filter = second === FILTERS.CLASSIC || second === FILTERS.EXTENDED
      ? second
      : FILTERS.ALL
    return {
      section: SECTIONS.PRINCIPLES,
      expandedSection: SECTIONS.PRINCIPLES,
      destination: SECTIONS.PRINCIPLES,
      principleFilter: filter,
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
export function useHashSync(state, dispatch) {
  const lastHashRef = useRef(null)
  const firstRunRef = useRef(true)

  // state -> hash
  useEffect(() => {
    const hash = stateToHash(state)
    if (hash !== getHash()) {
      if (firstRunRef.current) {
        // First sync uses replaceState: it updates the URL without a history
        // entry and without firing hashchange, so a fresh load can normalize
        // to '#/' silently. Subsequent navigation uses location.hash so each
        // move IS a history entry and the back button traverses them.
        window.history.replaceState(null, '', hash)
      } else {
        window.location.hash = hash
      }
    }
    lastHashRef.current = hash
    firstRunRef.current = false
  }, [state])

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
