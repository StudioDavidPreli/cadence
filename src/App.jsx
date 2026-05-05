// Root application shell.
// Layout: app-shell pattern. body and .appShell are bounded to the viewport
// so the tool fills the screen rather than living inside a scrolling page.
// Each TokenLab column owns its own scroll. Reasoning lives in
// docs/decisions/tokenlab-scroll-architecture-2026-05-05.md.

import { ThemeSwitcher } from './components/ThemeSwitcher'
import { TokenLab } from './components/TokenLab'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.appShell}>
      <ThemeSwitcher />
      <div className={styles.tool}>
        <TokenLab />
      </div>
    </div>
  )
}
