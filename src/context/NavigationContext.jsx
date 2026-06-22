import { createContext, useContext, useMemo, useReducer } from 'react'
import { SECTIONS, FILTERS, TOKEN_LAB_GUIDE } from '../data/navigation'
import { LANDING, parseHash, useHashSync } from '../hooks/useHashRoute'

// ─── Navigation state ─────────────────────────────────────────────────────────
//
// Owns which tool is showing and which section of the accordion is open. Lives
// at App level (not inside TokenLab) because the Cadence wordmark in the top bar
// drives it too, and the wordmark is a sibling of TokenLab, not a child. The
// token reducer stays in TokenLab and never unmounts, which is what makes Token
// Lab state persist while the user is in the Principles Library.
//
// State shape:
//   section          'token-lab' | 'principles' | null   (null = landing/hero)
//   destination       categoryId | 'principles' | null    (what the demo shows)
//   expandedSection  'token-lab' | 'principles' | null    (single-open accordion)
//   principleFilter  'all' | 'classic' | 'extended'
//
// The demo area's rule: render the destination's content, else the hero. There
// is no separate "hero visible" flag — the hero is the absence of a destination.

// Split into two contexts so consumers that only fire actions (the nav rows, the
// wordmark) never re-render when the state object changes. Same pattern as
// ActiveTokenContext. Actions are stable across renders (useReducer's dispatch
// is stable, and the action object is memoized once), so the actions context
// never updates.
const NavStateContext   = createContext(null)
const NavActionsContext = createContext(null)

function navReducer(state, action) {
  switch (action.type) {
    // A Token Lab leaf clicked: one of the four categories, or the Overview leaf
    // (which passes TOKEN_LAB_GUIDE). Always opens Token Lab and sets the leaf as
    // the destination.
    case 'SELECT_CATEGORY':
      return {
        section: SECTIONS.TOKEN_LAB,
        expandedSection: SECTIONS.TOKEN_LAB,
        destination: action.id,
        principleFilter: FILTERS.ALL,
      }

    // A section header clicked. Single-open accordion.
    case 'TOGGLE_SECTION': {
      // Clicking the already-open section collapses it. Collapsing the only
      // content-bearing section clears the destination, so the hero returns.
      if (state.expandedSection === action.id) {
        return { ...LANDING }
      }
      // Opening Principles is both disclosure AND destination: it shows the
      // grid immediately and reveals the Classic/Extended filters.
      if (action.id === SECTIONS.PRINCIPLES) {
        return {
          section: SECTIONS.PRINCIPLES,
          expandedSection: SECTIONS.PRINCIPLES,
          destination: SECTIONS.PRINCIPLES,
          principleFilter: FILTERS.ALL,
        }
      }
      // Opening Token Lab reveals the four categories AND shows the guide as
      // its destination, symmetric to Principles opening to the grid. The guide
      // is the Token Lab landing: a how-to that crossfades in from the hero. A
      // category click then swaps the guide for that demo (SELECT_CATEGORY), and
      // the Overview leaf routes back here.
      return {
        section: SECTIONS.TOKEN_LAB,
        expandedSection: SECTIONS.TOKEN_LAB,
        destination: TOKEN_LAB_GUIDE,
        principleFilter: FILTERS.ALL,
      }
    }

    // Classic / Extended clicked. Re-clicking the active filter toggles back to
    // all. Section and destination are untouched — the grid is already up.
    case 'SET_FILTER':
      return {
        ...state,
        principleFilter:
          state.principleFilter === action.filter ? FILTERS.ALL : action.filter,
      }

    // Cadence wordmark. Full return to landing: hero on, both sections
    // collapsed, destination cleared. Does NOT touch token values — the tool
    // bar owns reset, and a second reset path would fork the user's model.
    case 'RETURN_HOME':
      return { ...LANDING }

    // Browser back button / manual URL edit, via useHashSync. The parsed route
    // is already a complete state object, so we adopt it wholesale.
    case 'SET_FROM_ROUTE':
      return action.state

    default:
      return state
  }
}

export function NavigationProvider({ children }) {
  // Seed initial state from the URL so a deep link survives first paint. The
  // lazy initializer runs once; parseHash falls back to LANDING for a clean URL.
  const [state, dispatch] = useReducer(navReducer, undefined, () =>
    parseHash(window.location.hash),
  )

  // dispatch is stable, so these action creators are created once and the
  // actions context value never changes identity.
  const actions = useMemo(
    () => ({
      selectCategory: id => dispatch({ type: 'SELECT_CATEGORY', id }),
      toggleSection: id => dispatch({ type: 'TOGGLE_SECTION', id }),
      setFilter: filter => dispatch({ type: 'SET_FILTER', filter }),
      returnHome: () => dispatch({ type: 'RETURN_HOME' }),
    }),
    [],
  )

  // Mirror state into the URL hash and adopt back-button navigation.
  useHashSync(state, dispatch)

  return (
    <NavActionsContext.Provider value={actions}>
      <NavStateContext.Provider value={state}>
        {children}
      </NavStateContext.Provider>
    </NavActionsContext.Provider>
  )
}

// Returns the navigation state object. Re-renders on every navigation change.
export function useNavState() {
  const ctx = useContext(NavStateContext)
  if (ctx === null) {
    throw new Error('useNavState must be used inside a NavigationProvider')
  }
  return ctx
}

// Returns the stable actions object. Never causes a re-render.
export function useNavActions() {
  const ctx = useContext(NavActionsContext)
  if (ctx === null) {
    throw new Error('useNavActions must be used inside a NavigationProvider')
  }
  return ctx
}
