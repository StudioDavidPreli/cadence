// IngredientV8Grid — 36 tiles from ONE consolidated Rive file (ingredients_v8.riv).
//
// Same architecture as TileGrid.jsx, with one difference: loading. TileGrid loads 36
// separate .riv files; here a single file holds 36 artboards (r1c1..r6c6), so we load
// it ONCE with useRiveFile at the grid level and hand the shared RiveFile to every
// Tile. One fetch, one parse, 36 artboard instances off the same file.
//
// Everything else matches TileGrid, because the tiles are the same no-driver
// pixelation tiles: the Luau path-effect script CONSUMES `progress` to rebuild the
// pixel geometry each frame but never generates it. Motion comes from a single React
// rAF clock writing `progress` into each tile's VM every frame — NOT from the state
// machine. Playing the SM only keeps the artboard advancing so each new `progress`
// value redraws. speed/easing/spread feed the JS clock; cellSize/gapSize are written
// to each tile's VM; the bound preset instance carries the palette.
//
// Runtime is @rive-app/react-webgl2. useOffscreenRenderer stays at its default true
// so all canvases share one offscreen GL context, past the browser's per-page cap.
//
// GATED ROLLOUT: the GATE constant scopes how many tiles render. Gate 1 = r1c1 only,
// Gate 2 = row 1, Gate 3 = all 36. Bump GATE once the previous gate is confirmed.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useRive,
  useRiveFile,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceNumber,
} from '@rive-app/react-webgl2'
import { useTheme } from '../../context/ThemeContext'
import styles from './IngredientV8Grid.module.css'

const RIV_SRC = '/riveTiles/ingredients_v8.riv'

// The motion-tiles Cadence title set — one pre-themed SVG per theme (David's
// artwork). Unlike the app Wordmark (CSS-var fills), these are baked per theme, so
// we swap the file by theme rather than recolor at runtime. The SVGs are
// background-free, so the title sits directly on the top bar like the Wordmark.
//
// Exported because it replaces the Wordmark in the app top bar (App.jsx) when the
// motion-tiles view is active — it is the page's upper-left title, not a panel
// element. Sized by height to match the Wordmark (48.2px) so the top-bar row
// height is unchanged when the title swaps in.
const TITLE_BY_THEME = {
  light: 'lightMode',
  dark: 'darkMode',
  'high-contrast-light': 'lightCon',
  'high-contrast-dark': 'darkCon',
}
export function MotionTilesTitle() {
  const { theme } = useTheme()
  const file = TITLE_BY_THEME[theme] ?? 'darkMode'
  return (
    <img
      className={styles.title}
      src={`/titleSVGS/motionTilesTitles/${file}.svg`}
      alt="Cadence Motion Tiles"
    />
  )
}
const VIEW_MODEL = 'PathEffectVM'
const BASE_PERIOD = 2.0 // seconds per cycle at speed 1, matches the old Lua driver
const ROWS = 6
const COLS = 6

// Gate scoping. Gate 1: r1c1 only. Gate 2: row 1. Gate 3: full 36.
const GATE = 3
function cellsForGate(gate) {
  if (gate === 1) return [[1, 1]]
  if (gate === 2) return Array.from({ length: COLS }, (_, c) => [1, c + 1])
  const all = []
  for (let r = 1; r <= ROWS; r += 1) {
    for (let c = 1; c <= COLS; c += 1) all.push([r, c])
  }
  return all
}

// Spatial easing exponent for the generated sweep tables, and the envelope easing
// default — same k the Phase 2 tables use.
const SPATIAL_K = 1.70
function easeK(t, k) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const a = t ** k
  const b = (1 - t) ** k
  return a / (a + b)
}

// Weight tables (from TileGrid), flat row-major r1c1..r6c6. Per-tile phase offset =
// spread * weight, so a table shapes how the wave travels across the grid.
const RIPPLE = [
  1.000, 0.933, 0.834, 0.834, 0.933, 1.000,
  0.933, 0.666, 0.411, 0.411, 0.666, 0.933,
  0.834, 0.411, 0.087, 0.087, 0.411, 0.834,
  0.834, 0.411, 0.087, 0.087, 0.411, 0.834,
  0.933, 0.666, 0.411, 0.411, 0.666, 0.933,
  1.000, 0.933, 0.834, 0.834, 0.933, 1.000,
]
const DIAGONAL = [
  0.000, 0.023, 0.087, 0.191, 0.334, 0.500,
  0.023, 0.087, 0.191, 0.334, 0.500, 0.666,
  0.087, 0.191, 0.334, 0.500, 0.666, 0.809,
  0.191, 0.334, 0.500, 0.666, 0.809, 0.913,
  0.334, 0.500, 0.666, 0.809, 0.913, 0.977,
  0.500, 0.666, 0.809, 0.913, 0.977, 1.000,
]
const SYNC = new Array(ROWS * COLS).fill(0) // every offset zero → unison
const CENTERIN = RIPPLE.map((w) => 1 - w) // ripple inverted: edges lead, center lags
// Directional sweeps, eased so they carry the same wave character as ripple/diagonal.
const ROWSWEEP = []
const COLSWEEP = []
for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    ROWSWEEP.push(easeK(r / (ROWS - 1), SPATIAL_K))
    COLSWEEP.push(easeK(c / (COLS - 1), SPATIAL_K))
  }
}
// Scatter: deterministic pseudo-random offset per tile (same shimmer every load).
const SCATTER = []
for (let i = 0; i < ROWS * COLS; i += 1) {
  const h = Math.sin(i * 12.9898) * 43758.5453
  SCATTER.push(h - Math.floor(h))
}
const TABLES = {
  sync: SYNC,
  ripple: RIPPLE,
  centerin: CENTERIN,
  diagonal: DIAGONAL,
  rows: ROWSWEEP,
  columns: COLSWEEP,
  scatter: SCATTER,
}
const TABLE_ORDER = [
  ['sync', 'Sync'],
  ['ripple', 'Ripple'],
  ['centerin', 'Center-in'],
  ['diagonal', 'Diagonal'],
  ['rows', 'Rows'],
  ['columns', 'Columns'],
  ['scatter', 'Scatter'],
]

// Presets. `instance` is the PathEffectVM instance the tiles bind (its baked palette);
// speed/easing/spread feed the JS clock; cell/gap are written to each tile's VM.
// Values from TileGrid, verified against the live instances.
const PRESETS = {
  snappy:    { label: 'Snappy',    instance: 'snappy',    speed: 1.25, easing: 3.60, spread: 0.20, cell: 2, gap: 0.25 },
  standard:  { label: 'Standard',  instance: 'standard',  speed: 1.0,  easing: 1.70, spread: 0.40, cell: 4, gap: 0.05 },
  cinematic: { label: 'Cinematic', instance: 'cinematic', speed: 0.8,  easing: 1.15, spread: 0.70, cell: 8, gap: 1.00 },
}
const PRESET_ORDER = ['snappy', 'standard', 'cinematic'] // lowest → greatest spread

// Envelope: hold, ease up, hold, ease back. k is the easing exponent.
function cycleProgress(ph, k) {
  if (ph < 0.25) return 0
  if (ph < 0.5) return easeK((ph - 0.25) * 4, k)
  if (ph < 0.75) return 1
  return 1 - easeK((ph - 0.75) * 4, k)
}

// Labelled slider row — the Token Lab control shape (name + live value on top, a
// full-width range below). Kept presentational so every control in the panel reads
// identically. `format` renders the value; `onChange` receives the parsed number.
function Slider({ label, value, min, max, step, format, onChange }) {
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderLabel}>
        <span className={styles.sliderName}>{label}</span>
        <span className={styles.sliderValue}>{format(value)}</span>
      </div>
      <input
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

// One Tile = one artboard instanced off the shared RiveFile. It registers its
// `progress` setter with the grid clock (by index) and writes its own cellSize/
// gapSize. Nothing here re-renders per frame — the clock calls the setter directly.
function Tile({ riveFile, row, col, index, register, instanceName, cellSize, gapSize, onBind }) {
  const artboard = `r${row}c${col}`
  const stateMachine = `${artboard}SM`

  const { rive, RiveComponent } = useRive(
    {
      riveFile,
      artboard,
      stateMachines: stateMachine,
      // autoplay:false then play once the instance is bound — the SM must advance so
      // each per-frame `progress` write redraws, but not before the VM exists.
      autoplay: false,
      // autoBind:false — we bind the chosen preset instance ourselves, so switching
      // presets rebinds and swaps that preset's baked palette.
      autoBind: false,
    },
    // useOffscreenRenderer defaults to true — do NOT disable it.
  )

  const viewModel = useViewModel(rive, { name: VIEW_MODEL })
  const instance = useViewModelInstance(viewModel, { rive, name: instanceName })

  useEffect(() => {
    if (rive && instance) rive.play(stateMachine)
  }, [rive, instance, stateMachine])

  const { setValue: setProgress } = useViewModelInstanceNumber('progress', instance)
  const { setValue: setCell } = useViewModelInstanceNumber('cellSize', instance)
  const { setValue: setGap } = useViewModelInstanceNumber('gapSize', instance)

  useEffect(() => {
    register(index, setProgress ?? null)
    return () => register(index, null)
  }, [index, register, setProgress])

  const bound = Boolean(setProgress)
  useEffect(() => {
    if (onBind) onBind(artboard, bound)
  }, [onBind, artboard, bound])

  useEffect(() => {
    if (setCell) setCell(cellSize)
  }, [setCell, cellSize])

  useEffect(() => {
    if (setGap) setGap(gapSize)
  }, [setGap, gapSize])

  return (
    <div className={styles.tile} data-artboard={artboard} data-bound={bound}>
      <RiveComponent className={styles.tile} />
    </div>
  )
}

export function IngredientV8Grid() {
  const { riveFile, status } = useRiveFile({ src: RIV_SRC })

  // preset drives which instance the tiles bind; the sliders below start from the
  // preset's baked values and can override them live.
  const [preset, setPreset] = useState('standard')
  const [speed, setSpeed] = useState(PRESETS.standard.speed)
  const [easing, setEasing] = useState(PRESETS.standard.easing)
  const [spread, setSpread] = useState(PRESETS.standard.spread)
  const [cellSize, setCellSize] = useState(PRESETS.standard.cell)
  const [gapSize, setGapSize] = useState(PRESETS.standard.gap)
  const [table, setTable] = useState('ripple')

  // Refs the rAF loop reads, so the loop never closes over stale state.
  const speedRef = useRef(speed)
  const easingRef = useRef(easing)
  const spreadRef = useRef(spread)
  const weightsRef = useRef(TABLES[table])

  const setters = useRef(new Array(ROWS * COLS).fill(null))
  const register = useCallback((i, fn) => {
    setters.current[i] = fn
  }, [])

  // Frame rate, sampled by the clock itself — the honest number, since if 36 draws
  // bog the main thread this same rAF loop slows with them.
  const [fps, setFps] = useState(0)
  const [fpsMin, setFpsMin] = useState(60)

  const boundRef = useRef({})
  const [unbound, setUnbound] = useState([])
  const onBind = useCallback((name, ok) => {
    boundRef.current[name] = ok
    setUnbound(Object.keys(boundRef.current).filter((n) => !boundRef.current[n]))
  }, [])

  // The single clock. Advances phase and writes each tile a phase-offset eased
  // `progress` every frame. This is the whole source of motion.
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
      for (let i = 0; i < s.length; i += 1) {
        const fn = s[i]
        if (!fn) continue
        // JS % keeps the dividend's sign; add 1 and wrap again into [0,1).
        const phk = (((ph - spreadV * w[i]) % 1) + 1) % 1
        fn(cycleProgress(phk, k))
      }
      frames += 1
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

  // A preset sets both channels at once: the JS clock's speed/easing/spread (refs so
  // the loop sees them immediately) and the per-tile cell/gap, while the tiles rebind
  // to its instance for the palette. Sliders below still override live.
  const selectPreset = (key) => {
    const p = PRESETS[key]
    setPreset(key)
    setSpeed(p.speed); speedRef.current = p.speed
    setEasing(p.easing); easingRef.current = p.easing
    setSpread(p.spread); spreadRef.current = p.spread
    setCellSize(p.cell)
    setGapSize(p.gap)
  }
  const instanceName = PRESETS[preset].instance

  if (status !== 'success') {
    return (
      <div className={styles.tileLab}>
        <div className={styles.stage} />
        <aside className={styles.controls}>
          <div className={styles.section}>
            {status === 'failed' ? (
              <span className={styles.loadError}>
                Failed to load {RIV_SRC}. Check the path and the export.
              </span>
            ) : (
              <span className={styles.sectionLabel}>Loading… ({status})</span>
            )}
          </div>
        </aside>
      </div>
    )
  }

  const cells = cellsForGate(GATE)

  return (
    <div className={styles.tileLab}>
      {/* ── Left column: tile stage ─────────────────────────────────────── */}
      <div className={styles.stage}>
        <div className={styles.stageGrid}>
          {cells.map(([r, c]) => (
            <Tile
              key={`r${r}c${c}`}
              riveFile={riveFile}
              row={r}
              col={c}
              index={(r - 1) * COLS + (c - 1)}
              register={register}
              instanceName={instanceName}
              cellSize={cellSize}
              gapSize={gapSize}
              onBind={onBind}
            />
          ))}
        </div>
      </div>

      {/* ── Right column: controls, Token-Lab styled. On the RIGHT so it never
          reads as the Token Lab tool bar (which lives on the left). The panel's
          own title is gone — the page title now lives in the top bar. ──────── */}
      <aside className={styles.controls}>
        {/* Presets — sets instance (palette) + all clock/geometry values at once. */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Preset</div>
          <div className={styles.pillList}>
            {PRESET_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                className={key === preset ? styles.pillActive : styles.pill}
                onClick={() => selectPreset(key)}
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Stagger — the weight table that shapes how the wave travels the grid. */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Stagger</div>
          <div className={styles.pillList}>
            {TABLE_ORDER.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={table === key ? styles.pillActive : styles.pill}
                onClick={() => selectTable(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Motion — feeds the JS clock (speed/easing/spread). */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Motion</div>
          <Slider label="speed" value={speed} min={0.25} max={4} step={0.05} format={(v) => v.toFixed(2)}
            onChange={(v) => { setSpeed(v); speedRef.current = v }} />
          <Slider label="easing k" value={easing} min={1} max={5} step={0.05} format={(v) => v.toFixed(2)}
            onChange={(v) => { setEasing(v); easingRef.current = v }} />
          <Slider label="spread" value={spread} min={0} max={1} step={0.01} format={(v) => v.toFixed(2)}
            onChange={(v) => { setSpread(v); spreadRef.current = v }} />
        </div>

        {/* Pixelation — written to each tile's VM (cellSize/gapSize). */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Pixelation</div>
          <Slider label="cellSize" value={cellSize} min={0} max={16} step={0.5} format={(v) => v.toFixed(2)}
            onChange={setCellSize} />
          <Slider label="gapSize" value={gapSize} min={0} max={2} step={0.05} format={(v) => v.toFixed(2)}
            onChange={setGapSize} />
        </div>

        <div className={styles.status}>
          <span className={styles.fps} data-warn={fps < 55}>{fps} fps</span>
          <span>min {fpsMin}</span>
          <span>{cells.length} tiles</span>
          {unbound.length > 0 && (
            <span className={styles.warn}>unbound: {unbound.join(', ')}</span>
          )}
        </div>
      </aside>
    </div>
  )
}
