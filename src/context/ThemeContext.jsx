import { createContext, useContext, useState, useEffect } from 'react'

// createContext creates the context object. The argument (null) is the default
// value — only used when a component calls useTheme() with no Provider anywhere
// above it in the tree. We use null intentionally so useTheme can detect this
// and throw a helpful error rather than silently returning garbage.
const ThemeContext = createContext(null)

export const THEMES = ['light', 'dark', 'high-contrast']

// The localStorage key the choice is persisted under. The pre-paint script in
// index.html reads the same key, so the two must agree.
const STORAGE_KEY = 'cadence-theme'

// Resolve the theme to start in. The pre-paint script in index.html already
// resolved it (stored choice, else OS preference, else dark) and wrote it to
// data-theme, so the primary source is that attribute: adopting it keeps React
// and the DOM in agreement with no second, possibly-divergent resolution. The
// localStorage and defaultTheme fallbacks only matter if that script did not run
// (tests, or a stripped index.html), where a one-frame flash is acceptable.
function resolveInitialTheme(defaultTheme) {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (THEMES.includes(attr)) return attr
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (THEMES.includes(stored)) return stored
  } catch {
    // localStorage can throw in private-mode / sandboxed contexts; fall through.
  }
  return defaultTheme
}

// ThemeProvider holds the theme state and broadcasts it to the whole tree.
// Wrap this around your root component so every descendant can access the theme.
// defaultTheme prop is the last-resort fallback (tests, demos); the real app
// resolves from the pre-paint attribute or localStorage first.
export function ThemeProvider({ children, defaultTheme = 'dark' }) {
  // Lazy initializer so the resolution runs once, not on every render.
  const [theme, setTheme] = useState(() => resolveInitialTheme(defaultTheme))

  useEffect(() => {
    // Sync the theme state to the DOM attribute that color.css reads, and persist
    // the choice so the next load restores it. Both are side effects (they touch
    // the DOM and storage outside React's control), so they belong in useEffect,
    // not the render phase. Re-runs whenever theme changes; runs once on mount.
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Persistence is best-effort; ignore storage failures.
    }
  }, [theme])

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
