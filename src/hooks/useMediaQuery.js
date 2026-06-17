import { useEffect, useState } from 'react'

// Subscribe to a CSS media query from React. Returns whether it currently
// matches and re-renders when that changes. Used to switch the nav column
// between its full inline form and the collapsed rail + drawer form at the same
// breakpoint the grid CSS uses, so the JS render and the layout stay in sync.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = e => setMatches(e.matches)
    // Sync once in case the query changed between render and effect.
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
