// Root application shell.
// Layout: app-shell pattern. body and .appShell are bounded to the viewport
// so the tool fills the screen rather than living inside a scrolling page.
// Each TokenLab column owns its own scroll. Reasoning lives in
// docs/decisions/tokenlab-scroll-architecture-2026-05-05.md.

import { NavigationProvider } from './context/NavigationContext'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { Wordmark } from './components/Wordmark'
import { TokenLab } from './components/TokenLab'
import { IngredientV8Grid, MotionTilesTitle } from './components/IngredientGrid/IngredientV8Grid'
import styles from './App.module.css'

// The motion-tiles direction landed on the pooled mosaic; the exploratory probe
// routes (?ingredients, ?patheffect, ?tileperf, ?tilegrid, ?pixel, ?pixeltest,
// ?pixelrive, ?group2) and their components were archived to /archive (gitignored).
//   localhost/?v8grid       → pooled motion-tile mosaic: cells filled from a pool of
//                             Rive animations + static SVGs by an animation ratio,
//                             adjustable grid size, reshuffle (IngredientV8Grid)
const PARAMS =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()
const SHOW_V8GRID = PARAMS.has('v8grid')

// NavigationProvider wraps the whole shell so the Cadence wordmark and the nav
// column both drive the same navigation state. The token reducer stays inside
// TokenLab and never unmounts. Wordmark reads the nav actions itself, so it must
// render inside the provider.
export default function App() {
  return (
    <NavigationProvider>
      <div className={styles.appShell}>
        <header className={styles.topBar}>
          {/* The motion-tiles view replaces the Cadence wordmark with its own
              themed title, so the page's upper-left title matches the tool. */}
          {SHOW_V8GRID ? <MotionTilesTitle /> : <Wordmark />}
          <ThemeSwitcher />
        </header>
        <div className={styles.tool}>
          {SHOW_V8GRID ? <IngredientV8Grid /> : <TokenLab />}
        </div>
      </div>
    </NavigationProvider>
  )
}
