// Root application shell.
// Layout: app-shell pattern. body and .appShell are bounded to the viewport
// so the tool fills the screen rather than living inside a scrolling page.
// Each TokenLab column owns its own scroll. Reasoning lives in
// docs/decisions/tokenlab-scroll-architecture-2026-05-05.md.

import { NavigationProvider } from './context/NavigationContext'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { Wordmark } from './components/Wordmark'
import { TokenLab } from './components/TokenLab'
import { IngredientLab } from './components/IngredientGrid/IngredientLab'
import { PathEffectLab } from './components/IngredientGrid/PathEffectLab'
import { TilePerfSpike } from './components/IngredientGrid/TilePerfSpike'
import { TileGrid } from './components/IngredientGrid/TileGrid'
import { IngredientPixelLab } from './components/IngredientGrid/IngredientPixelLab'
import { IngredientPixelRiveProbe } from './components/IngredientGrid/IngredientPixelRiveProbe'
import { PixelateShaderTest } from './components/IngredientGrid/PixelateShaderTest'
import { Group2TileLab } from './components/IngredientGrid/Group2TileLab'
import { Group2TileGrid } from './components/IngredientGrid/Group2TileGrid'
import { IngredientV8Grid, MotionTilesTitle } from './components/IngredientGrid/IngredientV8Grid'
import styles from './App.module.css'

// TEMPORARY test mounts, none disturbing the main Token Lab:
//   localhost/?ingredients  → the React ↔ VM binding (hang-up 2)
//   localhost/?patheffect   → the pathEffect board: speed/easing/cell/gap controls
//   localhost/?tileperf     → 36 separate .riv instances, one JS clock (perf spike)
//   localhost/?tilegrid     → the real 36-tile grid: React clock + ripple offset
//   localhost/?pixel        → the Rive low-res pixelation attempt (fork 2 spike)
//   localhost/?pixeltest    → WebGL shader pixelation on a static SVG (isolation)
//   localhost/?pixelrive    → G1 probe: shader samples the LIVE rive.canvas
//   localhost/?group2       → single group-two tile (r1c1): React clock drives a
//                             node-script tile — preset/speed/easing/cell/gap
//   localhost/?group2grid   → all 16 "36 Tiles 2" group-two tiles on one React
//                             clock: ripple/offset tables + per-tile bind report
//   localhost/?v8grid       → ingredients_v8.riv: 36 artboards from ONE file via
//                             useRiveFile; gated 1 → row → 36 (see GATE constant)
// Remove these gates once a direction is chosen.
const PARAMS =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()
const SHOW_INGREDIENTS = PARAMS.has('ingredients')
const SHOW_PATHEFFECT = PARAMS.has('patheffect')
const SHOW_TILEPERF = PARAMS.has('tileperf')
const SHOW_TILEGRID = PARAMS.has('tilegrid')
const SHOW_PIXEL = PARAMS.has('pixel')
const SHOW_PIXELTEST = PARAMS.has('pixeltest')
const SHOW_PIXELRIVE = PARAMS.has('pixelrive')
const SHOW_GROUP2 = PARAMS.has('group2')
const SHOW_GROUP2GRID = PARAMS.has('group2grid')
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
          {SHOW_PIXELRIVE ? (
            <IngredientPixelRiveProbe />
          ) : SHOW_PIXELTEST ? (
            <PixelateShaderTest />
          ) : SHOW_PIXEL ? (
            <IngredientPixelLab />
          ) : SHOW_INGREDIENTS ? (
            <IngredientLab />
          ) : SHOW_PATHEFFECT ? (
            <PathEffectLab />
          ) : SHOW_TILEPERF ? (
            <TilePerfSpike />
          ) : SHOW_TILEGRID ? (
            <TileGrid />
          ) : SHOW_V8GRID ? (
            <IngredientV8Grid />
          ) : SHOW_GROUP2GRID ? (
            <Group2TileGrid />
          ) : SHOW_GROUP2 ? (
            <Group2TileLab />
          ) : (
            <TokenLab />
          )}
        </div>
      </div>
    </NavigationProvider>
  )
}
