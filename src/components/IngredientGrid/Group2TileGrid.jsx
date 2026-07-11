// Group2TileGrid — the multi-tile version of Group2TileLab: one React clock
// driving all 16 group-two tiles from "36 Tiles 2" at once.
//
// Group2TileLab proved a single React clock can drive ONE node-script tile the
// way TileGrid drives the converter grid. This is the next step up: 16 separate
// node-script .riv files (r1c1..r1c6, r2c1..r2c6, r3c1..r3c4), each ticking its
// own Luau node script, all fed by a single rAF loop that writes each tile a
// phase-offset eased 0→1→0 value. The grid is a MIX of two families: most tiles
// are path-effect pixelation (driven property `progress`); four are geometry
// tiles (r2c1/r2c2/r2c3/r3c4) driven by a linear `phase` property (see
// GEOMETRY_TILES below). The clock writes the same value to both — only the
// property name differs. It answers two questions at once:
//   1. Does one React clock cascade cleanly across many node-script tiles? (perf
//      + coherence — the group-two analog of TileGrid.)
//   2. Which of the 16 files actually bound their VM? The HUD lists any tile that
//      never handed back its driver setter. That is the on-screen version of
//      the provisioning check: a tile whose PathEffectVM instances / driven
//      property didn't survive export shows up here as "unbound", the same way
//      TileGrid surfaced the r4c1 omitted-instance case.
//
// Differences from TileGrid (group one):
//   - viewModel is ViewModel1 (group-two schema), not PathEffectVM.
//   - tiles carry a node script, so the runtime MUST be react-webgl2 (script
//     execution needs webgl2; react-canvas would render but never tick).
//   - the layout is ragged (6, 6, 4), so the offset weight tables are generated
//     from each tile's (row, col) rather than hardcoded 36-entry arrays.
//
// useOffscreenRenderer:true shares one GL context across all 16 instances, past
// the browser's per-page WebGL context cap — same as TileGrid.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceNumber,
} from '@rive-app/react-webgl2'
import {
  PATHEFFECT_PRESETS,
  SPEED_RANGE,
  EASING_RANGE,
  CELL_RANGE,
  GAP_RANGE,
} from './pathEffectPresets'
import styles from './IngredientGrid.module.css'

// Group-two schema: PathEffectVM, three instances (standard/snappy/cinematic),
// the progress/cellSize/gapSize number properties. (Group2TileLab's r1c1 still
// carries the older ViewModel1 name; these "36 Tiles 2" files were exported with
// the unified PathEffectVM name — the reconciliation step 1 that lab noted.)
const VIEW_MODEL = 'PathEffectVM'
const BASE_PERIOD = 2.0 // seconds per cycle at speed 1, matches TileGrid's clock

// The folder ships with a literal space in its name; encode it so the fetch URL
// is valid. Vite serves /public verbatim, so the on-disk name must be preserved.
const TILE_DIR = `/riveTiles/group2/${encodeURIComponent('36 Tiles 2')}`

// The ragged layout, row-major. Rows 1 and 2 are full (6 cols); row 3 has 4.
// This IS the tile manifest — add a tile by adding an entry, nothing else.
const TILE_LAYOUT = [
  { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
  { row: 1, col: 4 }, { row: 1, col: 5 }, { row: 1, col: 6 },
  { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
  { row: 2, col: 4 }, { row: 2, col: 5 }, { row: 2, col: 6 },
  { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 },
]
const ROWS = 3
const COLS = 6

// The "36 Tiles 2" grid is a MIX of two tile families sharing the PathEffectVM
// name but exposing different driven properties (verified from each .riv's VM
// props). Most tiles are path-effect pixelation and expose `progress` (an eased
// 0→1→0 driver). Four are geometry tiles whose motion channels (op*/opr*/sc*/
// colB-rowR) are driven INSIDE their Lua from a linear `phase` property; they
// carry no `progress`. Writing `progress` to those four (the old behavior) bound
// nothing — they showed as "unbound" and never animated. So each tile must be
// driven by the property IT exposes, not one hardcoded name.
//
// The VALUE is identical for both: cycleProgress gives a 0→1→0 envelope and both
// families consume that range. Only the property name differs. Grid-level spread
// still applies to the geometry tiles — their internal per-diagonal self-stagger
// is a finer scale that composes on top, not a double-stagger.
const GEOMETRY_TILES = new Set(['r2c1', 'r2c2', 'r2c3', 'r3c4'])
const tileDriverProp = (name) => (GEOMETRY_TILES.has(name) ? 'phase' : 'progress')

// Spatial easing exponent for the generated offset tables — same k TileGrid uses
// so a sweep lingers at its origin, whips through the middle, settles at the far
// edge, rather than moving at a constant rate.
const SPATIAL_K = 1.7
function easeK(t, k) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const a = t ** k
  const b = (1 - t) ** k
  return a / (a + b)
}

// Offset weight per tile, generated from its normalized (row, col) position over
// the 3x6 bounding grid. w in [0,1]; per-tile phase offset = spread * w, so a
// tile with w=0 leads and w=1 lags most. This is the ragged-layout equivalent of
// TileGrid's hardcoded 36-number arrays — same idea, computed instead of typed.
function buildTables(layout) {
  const nr = (row) => (ROWS > 1 ? (row - 1) / (ROWS - 1) : 0)
  const nc = (col) => (COLS > 1 ? (col - 1) / (COLS - 1) : 0)

  const sync = layout.map(() => 0)
  // Diagonal: corner r1c1 leads, far corner lags. Averaged then eased.
  const diagonal = layout.map(({ row, col }) => easeK((nr(row) + nc(col)) / 2, SPATIAL_K))
  const rows = layout.map(({ row }) => easeK(nr(row), SPATIAL_K))
  const columns = layout.map(({ col }) => easeK(nc(col), SPATIAL_K))
  // Ripple: distance from the grid center, normalized. Center leads (w≈0),
  // corners lag (w≈1) — the wave blooms outward.
  const cr = 0.5
  const cc = 0.5
  const maxDist = Math.hypot(cr, cc) // corner distance in normalized space
  const ripple = layout.map(({ row, col }) => {
    const d = Math.hypot(nr(row) - cr, nc(col) - cc) / maxDist
    return easeK(d, SPATIAL_K)
  })
  const centerin = ripple.map((w) => 1 - w)
  // Scatter: deterministic pseudo-random per index, same shimmer every load.
  const scatter = layout.map((_, i) => {
    const h = Math.sin(i * 12.9898) * 43758.5453
    return h - Math.floor(h)
  })

  return { sync, ripple, centerin, diagonal, rows, columns, scatter }
}
const TABLES = buildTables(TILE_LAYOUT)
const TABLE_ORDER = [
  ['sync', 'Sync'],
  ['ripple', 'Ripple'],
  ['centerin', 'Center-in'],
  ['diagonal', 'Diagonal'],
  ['rows', 'Rows'],
  ['columns', 'Columns'],
  ['scatter', 'Scatter'],
]

// Spread per preset (how far the cascade fans out). Reuses PATHEFFECT_PRESETS for
// speed/easing/cell/gap; spread lives here because it is the clock's to set, the
// same split TileGrid uses. Ordered loosest-cascade last.
const SPREAD = { snappy: 0.2, standard: 0.4, cinematic: 0.7 }
const PRESET_ORDER = ['snappy', 'standard', 'cinematic']

// Port of the shared cycleProgress: hold, ease up, hold, ease back — so progress
// breathes 0→1→0 each cycle rather than sawtoothing back to 0.
function cycleProgress(ph, k) {
  if (ph < 0.25) return 0
  if (ph < 0.5) return easeK((ph - 0.25) * 4, k)
  if (ph < 0.75) return 1
  return 1 - easeK((ph - 0.75) * 4, k)
}

// One tile = one node-script .riv. It registers its `progress` setter by index
// (the clock writes it every frame), writes its own cellSize/gapSize on change,
// and reports whether it bound at all. Nothing here re-renders per frame.
function Tile({ index, row, col, register, reportReady, instanceName, cellSize, gapSize }) {
  const name = `r${row}c${col}`
  const stateMachine = `${name}SM`

  const { rive, RiveComponent } = useRive(
    {
      src: `${TILE_DIR}/${name}.riv`,
      artboard: name,
      stateMachines: stateMachine,
      // autoBind:false / autoplay:false, then play once the instance is bound —
      // the node script must not tick before it has an instance to read. Same
      // freeze-avoidance as Group2TileLab and TileGrid.
      autoBind: false,
      autoplay: false,
    },
    { useOffscreenRenderer: true },
  )

  const viewModel = useViewModel(rive, { name: VIEW_MODEL })
  const instance = useViewModelInstance(viewModel, { rive, name: instanceName })

  useEffect(() => {
    if (rive && instance) rive.play(stateMachine)
  }, [rive, instance, stateMachine])

  // Both hooks run every render (hooks can't be conditional); the one whose
  // property this tile doesn't expose returns an undefined setter, which we drop.
  const driverProp = tileDriverProp(name)
  const { setValue: setProgress } = useViewModelInstanceNumber('progress', instance)
  const { setValue: setPhase } = useViewModelInstanceNumber('phase', instance)
  const setDrive = driverProp === 'phase' ? setPhase : setProgress
  const { setValue: setCell } = useViewModelInstanceNumber('cellSize', instance)
  const { setValue: setGap } = useViewModelInstanceNumber('gapSize', instance)

  useEffect(() => {
    register(index, setDrive ?? null)
    return () => register(index, null)
  }, [index, register, setDrive])

  // A tile is "bound" once its VM instance resolved and gave back its driver
  // setter (`phase` for geometry tiles, `progress` for path-effect tiles). A tile
  // that stays unbound is a file whose PathEffectVM instance or driven property
  // didn't survive export — the on-screen provisioning check.
  useEffect(() => {
    reportReady(name, Boolean(setDrive))
  }, [reportReady, name, setDrive])

  useEffect(() => {
    if (setCell) setCell(cellSize)
  }, [setCell, cellSize])

  useEffect(() => {
    if (setGap) setGap(gapSize)
  }, [setGap, gapSize])

  return <RiveComponent className={styles.perfTile} />
}

export function Group2TileGrid() {
  const [preset, setPreset] = useState('standard')
  const [speed, setSpeed] = useState(PATHEFFECT_PRESETS.standard.speed)
  const [easing, setEasing] = useState(PATHEFFECT_PRESETS.standard.easing)
  const [spread, setSpread] = useState(SPREAD.standard)
  const [cellSize, setCellSize] = useState(PATHEFFECT_PRESETS.standard.cellSize)
  const [gapSize, setGapSize] = useState(PATHEFFECT_PRESETS.standard.gapSize)
  const [table, setTable] = useState('ripple')

  // State doubles as ref for the rAF loop: the slider updates both, the loop
  // reads the ref so it never closes over a stale value or re-subscribes.
  const speedRef = useRef(speed)
  const easingRef = useRef(easing)
  const spreadRef = useRef(spread)
  const weightsRef = useRef(TABLES[table])

  const [fps, setFps] = useState(0)
  const [fpsMin, setFpsMin] = useState(60)

  const setters = useRef(new Array(TILE_LAYOUT.length).fill(null))
  const register = useCallback((i, fn) => {
    setters.current[i] = fn
  }, [])

  // Which tiles bound their VM. Starts all-missing and empties as the 16 files
  // load; anything left after load is a real binding failure worth naming.
  const readyRef = useRef({})
  const [notReady, setNotReady] = useState(TILE_LAYOUT.map(({ row, col }) => `r${row}c${col}`))
  const reportReady = useCallback((name, ok) => {
    readyRef.current[name] = ok
    const missing = TILE_LAYOUT
      .map(({ row, col }) => `r${row}c${col}`)
      .filter((n) => !readyRef.current[n])
    setNotReady(missing)
  }, [])

  // The single clock. Advances phase, writes each tile a phase-offset eased
  // progress, and samples its own frame rate. If 16 node-script draws bog the
  // main thread, this loop slows with them — the honest number for the grid.
  useEffect(() => {
    let raf
    const start = performance.now()
    let frames = 0
    let windowStart = start
    let worst = 60

    const loop = (now) => {
      const elapsed = (now - start) / 1000
      const period = BASE_PERIOD / Math.max(speedRef.current, 0.01)
      const ph = (elapsed % period) / period
      const spreadV = spreadRef.current
      const k = easingRef.current
      const w = weightsRef.current
      const s = setters.current

      for (let i = 0; i < s.length; i++) {
        const fn = s[i]
        if (!fn) continue
        // JS % keeps the dividend's sign, so add 1 and wrap again into [0,1).
        const phk = (((ph - spreadV * w[i]) % 1) + 1) % 1
        fn(cycleProgress(phk, k))
      }

      frames++
      const span = now - windowStart
      if (span >= 500) {
        const measured = Math.round((frames * 1000) / span)
        setFps(measured)
        worst = Math.min(worst, measured)
        setFpsMin(worst)
        frames = 0
        windowStart = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const selectTable = (key) => {
    setTable(key)
    weightsRef.current = TABLES[key]
  }

  // A preset sets both channels: the clock's speed/easing/spread (refs so the
  // loop sees them at once) and the per-tile cell/gap, while tiles rebind to its
  // instance for the palette. Sliders below still override live.
  const selectPreset = (key) => {
    const p = PATHEFFECT_PRESETS[key]
    setPreset(key)
    setSpeed(p.speed); speedRef.current = p.speed
    setEasing(p.easing); easingRef.current = p.easing
    setSpread(SPREAD[key]); spreadRef.current = SPREAD[key]
    setCellSize(p.cellSize)
    setGapSize(p.gapSize)
  }
  const instanceName = PATHEFFECT_PRESETS[preset].instance

  return (
    <div className={styles.perfLab}>
      <div className={styles.perfHud}>
        <strong className={styles.perfFps} data-warn={fps < 55}>{fps} fps</strong>
        <span>min {fpsMin}</span>
        <span>16 group-two files · React clock</span>
        {notReady.length > 0 && (
          <span className={styles.perfWarn}>unbound: {notReady.join(', ')}</span>
        )}

        <div className={styles.presets}>
          {TABLE_ORDER.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={table === key ? styles.presetActive : styles.preset}
              onClick={() => selectTable(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.presets}>
        {PRESET_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={key === preset ? styles.presetActive : styles.preset}
            onClick={() => selectPreset(key)}
          >
            {PATHEFFECT_PRESETS[key].label}
          </button>
        ))}
      </div>

      <div className={styles.perfControls}>
        <label className={styles.perfControl}>
          spread <code>{spread.toFixed(2)}</code>
          <input type="range" min={0} max={1} step={0.01} value={spread}
            onChange={(e) => { const v = parseFloat(e.target.value); setSpread(v); spreadRef.current = v }} />
        </label>
        <label className={styles.perfControl}>
          speed <code>{speed.toFixed(2)}</code>
          <input type="range" min={SPEED_RANGE.min} max={SPEED_RANGE.max} step={0.05} value={speed}
            onChange={(e) => { const v = parseFloat(e.target.value); setSpeed(v); speedRef.current = v }} />
        </label>
        <label className={styles.perfControl}>
          easing k <code>{easing.toFixed(2)}</code>
          <input type="range" min={EASING_RANGE.min} max={EASING_RANGE.max} step={0.05} value={easing}
            onChange={(e) => { const v = parseFloat(e.target.value); setEasing(v); easingRef.current = v }} />
        </label>
        <label className={styles.perfControl}>
          cell <code>{cellSize.toFixed(2)}</code>
          <input type="range" min={CELL_RANGE.min} max={CELL_RANGE.max} step={0.5} value={cellSize}
            onChange={(e) => setCellSize(parseFloat(e.target.value))} />
        </label>
        <label className={styles.perfControl}>
          gap <code>{gapSize.toFixed(2)}</code>
          <input type="range" min={GAP_RANGE.min} max={GAP_RANGE.max} step={0.05} value={gapSize}
            onChange={(e) => setGapSize(parseFloat(e.target.value))} />
        </label>
      </div>

      <div className={styles.perfGrid}>
        {TILE_LAYOUT.map(({ row, col }, index) => (
          <Tile
            key={`${row}-${col}`}
            index={index}
            row={row}
            col={col}
            register={register}
            reportReady={reportReady}
            instanceName={instanceName}
            cellSize={cellSize}
            gapSize={gapSize}
          />
        ))}
      </div>
    </div>
  )
}
