// Root application shell.
// Layout: app-shell pattern. body and .appShell are bounded to the viewport
// so the tool fills the screen rather than living inside a scrolling page.
// Each TokenLab column owns its own scroll. Reasoning lives in
// docs/decisions/tokenlab-scroll-architecture-2026-05-05.md.

import { NavigationProvider } from './context/NavigationContext'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { Wordmark } from './components/Wordmark'
import { TokenLab } from './components/TokenLab'
import styles from './App.module.css'

// NavigationProvider wraps the whole shell so the Cadence wordmark and the nav
// column both drive the same navigation state. The token reducer stays inside
// TokenLab and never unmounts. Wordmark reads the nav actions itself, so it must
// render inside the provider.
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
