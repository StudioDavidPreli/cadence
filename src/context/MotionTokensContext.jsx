import { createContext, useContext } from 'react'

// This context enables TokenLab to push live token values into components
// that would otherwise read tokens once from CSS on mount.
//
// When a component calls useMotionTokens() and this context is present above
// it in the tree, the hook returns context values instead of reading CSS.
// When the context is absent (everywhere except TokenLab's demo area),
// the hook reads from CSS as normal.
//
// This is the bridge between Channel 2 (React state) and Framer Motion.
export const MotionTokensContext = createContext(null)

export function MotionTokensProvider({ children, tokens }) {
  return (
    <MotionTokensContext.Provider value={tokens}>
      {children}
    </MotionTokensContext.Provider>
  )
}
