// Root application shell.
// Layout: app-shell pattern. body and .appShell are bounded to the viewport
// so the tool fills the screen rather than living inside a scrolling page.
// Each TokenLab column owns its own scroll. Reasoning lives in
// docs/decisions/tokenlab-scroll-architecture-2026-05-05.md.

import { NavigationProvider, useNavActions } from './context/NavigationContext'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { TokenLab } from './components/TokenLab'
import styles from './App.module.css'

// NavigationProvider wraps the whole shell so the Cadence wordmark and the nav
// column both drive the same navigation state. The token reducer stays inside
// TokenLab and never unmounts.
export default function App() {
  return (
    <NavigationProvider>
      <div className={styles.appShell}>
        <header className={styles.topBar}>
          <Wordmark />
          <ThemeSwitcher />
        </header>
        <div className={styles.tool}>
          <TokenLab />
        </div>
      </div>
    </NavigationProvider>
  )
}

// The Cadence wordmark doubles as the home button: it returns to the landing
// (hero), collapses both accordion sections, and clears the active destination.
// It does NOT reset token values — the tool bar owns reset, and a second reset
// path would fork the user's model. Defined here (not in App's body) so it sits
// inside NavigationProvider and can read the actions.
function Wordmark() {
  const { returnHome } = useNavActions()
  return (
    <button
      type="button"
      className={styles.wordmark}
      onClick={returnHome}
      aria-label="Cadence, return to start"
    >
      Cadence
    </button>
  )
}
