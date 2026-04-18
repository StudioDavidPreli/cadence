import { createContext, useContext, useState } from 'react'

// ─── Why two contexts ─────────────────────────────────────────────────────────
//
// A single context holding { activeToken, setActiveToken } would cause every
// consumer to re-render on every activeToken change — including SliderRow,
// which only needs the setter and never reads the value.
//
// Splitting into two contexts:
//   ActiveTokenValueContext  — the string or null. Updates on every interaction.
//   ActiveTokenSetterContext — the setter function. Never updates (useState
//                              setters are stable across renders by React's
//                              guarantee). Consumers pay zero re-render cost.
//
// This is the standard React pattern for separating read and write access.
const ActiveTokenValueContext  = createContext(null)
const ActiveTokenSetterContext = createContext(null)

export function ActiveTokenProvider({ children }) {
  const [activeToken, setActiveToken] = useState(null)
  return (
    // Setter context is the outer wrapper — it's stable, so wrapping order
    // doesn't matter for correctness, but outer-stable / inner-changing is
    // idiomatic.
    <ActiveTokenSetterContext.Provider value={setActiveToken}>
      <ActiveTokenValueContext.Provider value={activeToken}>
        {children}
      </ActiveTokenValueContext.Provider>
    </ActiveTokenSetterContext.Provider>
  )
}

// Returns the active token key string ('duration.fast', 'easing', etc.)
// or null when nothing is active. Re-renders on every activeToken change.
// Use this in components that render based on which token is active.
export function useActiveToken() {
  return useContext(ActiveTokenValueContext)
}

// Returns the setter function only. Never causes a re-render.
// Use this in controls that need to set the active token but don't care
// which token is currently active.
export function useSetActiveToken() {
  return useContext(ActiveTokenSetterContext)
}
