import { createContext, useContext, useState, useEffect } from 'react'

// createContext creates the context object. The argument (null) is the default
// value — only used when a component calls useTheme() with no Provider anywhere
// above it in the tree. We use null intentionally so useTheme can detect this
// and throw a helpful error rather than silently returning garbage.
const ThemeContext = createContext(null)

export const THEMES = ['light', 'dark', 'high-contrast']

// ThemeProvider holds the theme state and broadcasts it to the whole tree.
// Wrap this around your root component so every descendant can access the theme.
// defaultTheme prop lets tests or demos start in a specific theme.
export function ThemeProvider({ children, defaultTheme = 'dark' }) {
  const [theme, setTheme] = useState(defaultTheme)

  useEffect(() => {
    // Sync the theme state to the DOM attribute that color.css reads.
    // This lives in useEffect (not directly in render) because it's a side
    // effect — it touches the DOM outside React's control. React's render
    // phase should be pure; side effects belong in useEffect.
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  // The dependency array [theme] means this effect re-runs whenever theme
  // changes. On the first render it runs once to set the initial attribute.

  return (
    // ThemeContext.Provider broadcasts { theme, setTheme, themes } to all
    // descendants. Any component below this in the tree can read these values
    // by calling useTheme() — without props being passed through intermediaries.
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

// useTheme is the consumer hook. Components import this instead of importing
// ThemeContext directly — it's a cleaner API and the right place to add guards.
export function useTheme() {
  const context = useContext(ThemeContext)

  // If context is null, useTheme was called outside a ThemeProvider.
  // Throwing here gives a clear error message instead of a cryptic
  // "cannot read property of null" somewhere down the line.
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider.')
  }

  return context
}
