// Root application shell.
// Layout: app-shell pattern. body and .appShell are bounded to the viewport
// so the tool fills the screen rather than living inside a scrolling page.
// Each TokenLab column owns its own scroll. Reasoning lives in
// docs/decisions/tokenlab-scroll-architecture-2026-05-05.md.
//
// Motion Tiles is the third tool. It is not a separate top-level render here:
// it is a section inside the shell, reached from the nav column, and TokenLab
// swaps it into the demo-area track. The top bar swaps the Cadence wordmark for
// the Motion Tiles title while that section is active. Full reasoning:
// docs/decisions/motion-tiles-integration-2026-07-13.md.

import { NavigationProvider } from './context/NavigationContext'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { Wordmark } from './components/Wordmark'
import { TokenLab } from './components/TokenLab'
import styles from './App.module.css'

// NavigationProvider wraps the whole shell so the Wordmark and the nav column both
// drive the same navigation state. The token reducer stays inside TokenLab and
// never unmounts, which is what makes Token Lab state persist while the user is in
// the Principles Library or Motion Tiles.
//
// The Wordmark is the top-left title and the home button. It swaps its own art by
// section (pixel mark, the Principles script mark, or the Motion Tiles title) and
// returns to the landing on click in every case, so the top bar needs no
// section logic of its own.
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
