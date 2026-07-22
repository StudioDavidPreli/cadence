// MotionTilesGrid — a pooled motion-tile mosaic. (Formerly IngredientV8Grid; the
// "ingredient" name is dead legacy from the fixed 6x6 composition era.)
//
// This is the React.lazy chunk of the Motion Tiles section: it alone imports
// @rive-app/react-webgl2, so that runtime is code-split into this chunk and does
// not load until the user clicks Enter on the landing. See
// docs/decisions/motion-tiles-integration-2026-07-13.md.
//
// History: this started as a fixed 6x6 composition — 36 artboards (r1c1..r6c6) from
// ONE consolidated Rive file (ingredients_v8.riv), each cell a specific tile that
// together formed the ingredient-map picture. It is now a POOLED MOSAIC: the cells
// no longer form a fixed picture. Each cell is filled from a shared pool of sources
// (Rive animations + static SVGs) placed by an animation-to-static ratio.
//
// Two source kinds live in the animation pool:
//   - 'artboard': an artboard inside the shared ingredients_v8.riv file (the original
//     36). Loaded ONCE with useRiveFile at the grid level, instanced 36 ways.
//   - 'file': a standalone .riv file with its own URL. Each is loaded by useRive from
//     its src. New animations are added here (see EXTRA_ANIM_FILES).
//
// Both kinds follow the SAME convention as the original tiles: a PathEffectVM with a
// `progress`/`cellSize`/`gapSize` the tile exposes, plus snappy/standard/cinematic
// instances carrying the palette. The Luau path-effect script CONSUMES `progress` to
// rebuild the pixel geometry each frame but never generates it. Motion comes from a
// single React rAF clock writing a phase-offset `progress` into each animated tile's
// VM every frame — NOT from the state machine. Playing the SM only keeps the artboard
// advancing so each new `progress` value redraws. Static cells are plain <img> SVGs:
// no Rive instance, no clock setter, so lowering the animation ratio genuinely cuts
// the number of Rive draws — a real motion-density / performance lever.
//
// Runtime is @rive-app/react-webgl2. useOffscreenRenderer stays at its default true
// so all canvases share one offscreen GL context, past the browser's per-page cap.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  useRive,
  useRiveFile,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceNumber,
} from '@rive-app/react-webgl2'
import { Modal } from '../Modal'
import styles from './MotionTilesGrid.module.css'

const RIV_SRC = '/riveTiles/ingredients_v8.riv'

const VIEW_MODEL = 'PathEffectVM'
const BASE_PERIOD = 2.0 // seconds per cycle at speed 1, matches the old Lua driver

// Grid size is adjustable (N×N). MAX_N caps it so the clock's setter array can be a
// single fixed allocation — no reallocation races when the size changes, tiles just
// register into (or clear) their absolute slot. 8×8 = 64 is the ceiling.
const MIN_N = 1
const MAX_N = 8
const MAX_CELLS = MAX_N * MAX_N

// ── Stagger weight tables, generated for any N×N grid ──────────────────────────
// Each table is flat row-major (cell i = row*cols + col). Per-tile phase offset =
// spread * weight, so a table shapes how the wave travels across the grid. These
// were hardcoded 36-length arrays when the grid was fixed 6×6; generalizing them to
// generators keeps the exact same character at 6×6 while supporting any size. The
// wave is indexed by spatial position, so it reads the same whichever cells animate.
const SPATIAL_K = 1.70 // easing exponent for the spatial sweeps (matches Phase 2 tables)
function easeK(t, k) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const a = t ** k
  const b = (1 - t) ** k
  return a / (a + b)
}

function makeTables(rows, cols) {
  const total = rows * cols
  const sync = new Array(total).fill(0) // every offset zero → unison
  const ripple = new Array(total)
  const diagonal = new Array(total)
  const rowsweep = new Array(total)
  const colsweep = new Array(total)
  const scatter = new Array(total)

  const cx = (cols - 1) / 2
  const cy = (rows - 1) / 2
  const cornerDist = Math.hypot(cx, cy) || 1 // normalize radial distance into [0,1]
  const rowDen = rows > 1 ? rows - 1 : 1
  const colDen = cols > 1 ? cols - 1 : 1
  const diagDen = rowDen + colDen // max of (r + c)

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * cols + c
      // Ripple: eased radial distance from centre — corners lead, centre lags.
      const dist = Math.hypot(c - cx, r - cy) / cornerDist
      ripple[i] = easeK(dist, SPATIAL_K)
      // Diagonal: eased (r + c) sweep from the top-left corner to the bottom-right.
      diagonal[i] = easeK((r + c) / diagDen, SPATIAL_K)
      // Directional sweeps, eased to carry the same wave character.
      rowsweep[i] = easeK(r / rowDen, SPATIAL_K)
      colsweep[i] = easeK(c / colDen, SPATIAL_K)
      // Scatter: deterministic pseudo-random offset per cell (same shimmer per size).
      const h = Math.sin(i * 12.9898) * 43758.5453
      scatter[i] = h - Math.floor(h)
    }
  }
  const centerin = ripple.map((w) => 1 - w) // ripple inverted: edges lead, centre lags

  return {
    sync,
    ripple,
    centerin,
    diagonal,
    rows: rowsweep,
    columns: colsweep,
    scatter,
  }
}

const TABLE_ORDER = [
  ['sync', 'Sync'],
  ['ripple', 'Ripple'],
  ['centerin', 'Centroid'],
  ['diagonal', 'Diagonal'],
  ['rows', 'Rows'],
  ['columns', 'Columns'],
  ['scatter', 'Scatter'],
]

// ── Source pools ───────────────────────────────────────────────────────────────
// The animation pool the mosaic draws from. Each entry is one animation SOURCE, not
// one cell — cells are filled from the pool by the ratio, and the same source can
// appear in several cells (or none).

// The original 36: artboards inside the shared ingredients_v8.riv file. `kind`
// 'artboard' means "instance this artboard off the shared RiveFile" (no per-source
// fetch). The state-machine name follows the artboard, e.g. r1c1 → r1c1SM.
const SHARED_ARTBOARDS = []
for (let r = 1; r <= 6; r += 1) {
  for (let c = 1; c <= 6; c += 1) {
    const artboard = `r${r}c${c}`
    SHARED_ARTBOARDS.push({ id: artboard, kind: 'artboard', artboard, stateMachine: `${artboard}SM` })
  }
}

// ▸ ADD NEW STANDALONE .riv ANIMATIONS HERE.
// Each entry loads its own file by URL. It must carry a PathEffectVM with the
// cellSize/gapSize props and snappy/standard/cinematic instances. `artboard` and
// `stateMachine` are the names inside that file. `driverProp` is the number property
// the clock writes each frame — 'progress' for path-effect pixelation tiles (the
// default), 'phase' for geometry tiles that consume a linear phase instead. Both
// receive the same 0→1→0 envelope; only the property name differs.
// Example:
//   { id: 'wobble', kind: 'file', src: '/riveTiles/wobble.riv', artboard: 'Wobble', stateMachine: 'WobbleSM', driverProp: 'progress' },

// The group-two set: 16 node-script tiles. They share the PathEffectVM name but are
// a MIX of two families — most expose `progress`, four geometry tiles expose `phase`
// and no `progress`. Each must be driven by the property IT exposes, so the geometry
// four are tagged 'phase'. (The retired ?group2grid probe verified this set; the
// four geometry tiles are r2c1/r2c2/r2c3/r3c4.)
const GROUP2_GEOMETRY = new Set(['r2c1', 'r2c2', 'r2c3', 'r3c4'])
const GROUP2_NAMES = [
  'r1c1', 'r1c2', 'r1c3', 'r1c4', 'r1c5', 'r1c6',
  'r2c1', 'r2c2', 'r2c3', 'r2c4', 'r2c5', 'r2c6',
  'r3c1', 'r3c2', 'r3c3', 'r3c4',
]
const GROUP2_FILES = GROUP2_NAMES.map((name) => ({
  id: `g2-${name}`, // prefixed so it never collides with a shared-artboard id
  kind: 'file',
  src: `/riveTiles/group2/${name}.riv`,
  artboard: name,
  stateMachine: `${name}SM`,
  driverProp: GROUP2_GEOMETRY.has(name) ? 'phase' : 'progress',
}))

// Clawd — a self-driven interactive tile, and the easter egg. It is deliberately NOT
// in ANIM_POOL: the seeded mosaic must never place it, so the ONLY way a clawd reaches
// the grid is clicking the motion-tiles logo button (which calls addClawd). Its motion
// is NOT written by the React clock: the hitbox and the 7-animation advance/reset
// sequence live entirely in its own clawdSM state machine, triggered by clicking the
// tile. `interactive: true` tells Tile to skip clock registration AND the cell/gap
// writes (it ignores the pixelation controls), while still binding the active preset
// instance (standard/snappy/cinematic) for palette and playing clawdSM so the hitbox
// is live. No driverProp — nothing drives it but the pointer.
const CLAWD_FILE = {
  id: 'clawd',
  kind: 'file',
  src: '/riveTiles/clawd.riv',
  artboard: 'clawd',
  stateMachine: 'clawdSM',
  interactive: true,
}

const EXTRA_ANIM_FILES = [
  ...GROUP2_FILES,
  // (add further standalone .riv sources here)
  // NOTE: CLAWD_FILE is intentionally excluded — it is click-to-add only (see above).
]

const ANIM_POOL = [...SHARED_ARTBOARDS, ...EXTRA_ANIM_FILES]

// Statics are Rive stills, not SVGs, so they respond to preset changes the same way
// the animated tiles do. The v3 statics file (motiontilesstatics_v3.riv) is deployed
// exactly like the animation file (ingredients_v8.riv): loaded ONCE with useRiveFile at
// the grid level, then instanced per cell. It carries 32 SEPARATE artboards,
// asset1..asset32, one artwork per artboard, each with its own state machine
// (a1SM..a32SM) and the same PathEffectVM (three preset instances + cellSize/gapSize).
// Selecting a still is just naming its artboard, exactly like the animated tiles
// instance their artboards off the shared file — there is no frameIndex selector.
//
// What makes a static respond to controls lives IN THE RIVE FILE, not here. The pixelate
// PathEffect only rebuilds its mosaic geometry inside update(), and update() re-runs only
// on a script-Input or path change. cellSize/gapSize are VM reads (the self-binding
// pixelate reads them off the VM by name), not Inputs — so moving a slider updates the
// script's stored values but never triggers a rebuild, and the tile looks frozen once the
// artboard settles. The pixelate script must therefore call `self.context:markNeedsUpdate()`
// in its advance(), the documented pattern for a path effect that changes over time while
// the path stays the same. That single call keeps the artboard advancing on its own, which
// both keeps it composited in the shared offscreen renderer (fixing the earlier blank
// cells) and re-runs update() every frame so the live cellSize/gapSize take effect. With it
// in place the React side needs no clock keep-alive — just play the SM once on bind and
// write the tokens on change, exactly like an animated Tile minus the progress driver.
//
// Each pool entry is one still: its artboard name and state-machine name. They all
// share the one file, instanced per cell.
const STATIC_FILE = '/riveTiles/motiontilesstatics_v3.riv'
const STATIC_COUNT = 32 // asset1..asset32, one artwork per artboard
const STATIC_POOL = Array.from({ length: STATIC_COUNT }, (_, k) => {
  const n = k + 1 // artboards are 1-indexed: asset1..asset32, a1SM..a32SM
  return {
    id: `static-asset${n}`,
    artboard: `asset${n}`,
    stateMachine: `a${n}SM`,
  }
})

// Presets. `instance` is the PathEffectVM instance the tiles bind (its baked palette);
// speed/easing/spread feed the JS clock; cell/gap are written to each tile's VM.
const PRESETS = {
  snappy:    { label: 'Snappy',    instance: 'snappy',    speed: 1.25, easing: 3.60, spread: 0.20, cell: 2, gap: 0.25 },
  standard:  { label: 'Standard',  instance: 'standard',  speed: 1.0,  easing: 1.70, spread: 0.40, cell: 3.5, gap: 0.05 },
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

// ── Seeded randomness ──────────────────────────────────────────────────────────
// The mosaic layout must be deterministic per seed so that (a) raising the ratio only
// turns MORE cells on without reshuffling the ones already animating, and (b) a given
// seed always reproduces the same arrangement. Reshuffle just bumps the seed.
function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Fisher–Yates over [0..n-1] using a seeded RNG.
function seededPermutation(n, seed) {
  const rng = mulberry32(seed)
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
function seededShuffle(list, seed) {
  const rng = mulberry32(seed)
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Labelled slider row — the Token Lab control shape (name + live value on top, a
// full-width range below). `format` renders the value; `onChange` receives the number.
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

// One animated Tile. Its source is either a shared-file artboard (pass `riveFile`) or
// a standalone file (pass `src`) — useRive accepts either. Everything downstream is
// identical: bind the preset instance, expose progress/cellSize/gapSize, register the
// progress setter with the grid clock by absolute cell index. Nothing here re-renders
// per frame — the clock calls the setter directly.
function Tile({ source, riveFile, index, register, instanceName, cellSize, gapSize, onBind, paused }) {
  const isShared = source.kind === 'artboard'
  // Interactive tiles (clawd) drive themselves through their own state machine on
  // click. The grid clock must not write their progress/phase, and the pixelation
  // sliders must not write their cellSize/gapSize — they only bind the preset palette.
  const interactive = source.interactive === true
  const { rive, RiveComponent } = useRive(
    {
      // Shared-file artboards read the preloaded RiveFile; standalone files fetch src.
      ...(isShared ? { riveFile } : { src: source.src }),
      artboard: source.artboard,
      stateMachines: source.stateMachine,
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
    if (rive && instance) rive.play(source.stateMachine)
  }, [rive, instance, source.stateMachine])

  // Pause reaches self-driven (clawd) tiles too. Clock-driven tiles freeze because the
  // clock stops writing them, but an interactive tile runs its own state machine, so we
  // pause/resume that SM directly. Non-interactive tiles must keep their SM advancing
  // (each progress write needs a redraw), so this only touches interactive ones.
  useEffect(() => {
    if (!interactive || !rive || !instance) return
    if (paused) rive.pause(source.stateMachine)
    else rive.play(source.stateMachine)
  }, [interactive, paused, rive, instance, source.stateMachine])

  // Both hooks run every render (hooks can't be conditional); the tile drives the
  // one property it exposes — 'progress' for path-effect tiles, 'phase' for geometry
  // tiles — and the other returns an undefined setter we drop. Default 'progress'
  // covers the shared-file artboards, which have no driverProp.
  const { setValue: setProgress } = useViewModelInstanceNumber('progress', instance)
  const { setValue: setPhase } = useViewModelInstanceNumber('phase', instance)
  const setDrive = source.driverProp === 'phase' ? setPhase : setProgress
  const { setValue: setCell } = useViewModelInstanceNumber('cellSize', instance)
  const { setValue: setGap } = useViewModelInstanceNumber('gapSize', instance)

  // Self-driven tiles never register with the clock, so the loop skips their slot.
  useEffect(() => {
    if (interactive) return undefined
    register(index, setDrive ?? null)
    return () => register(index, null)
  }, [index, register, setDrive, interactive])

  // A normal tile is "bound" once it has a progress/phase setter; an interactive tile
  // exposes no driver, so its palette instance binding is the success signal instead.
  const bound = interactive ? Boolean(instance) : Boolean(setDrive)
  useEffect(() => {
    if (onBind) onBind(index, bound)
  }, [onBind, index, bound])

  useEffect(() => {
    if (!interactive && setCell) setCell(cellSize)
  }, [setCell, cellSize, interactive])

  useEffect(() => {
    if (!interactive && setGap) setGap(gapSize)
  }, [setGap, gapSize, interactive])

  return (
    <div className={styles.tile} data-artboard={source.id} data-bound={bound}>
      <RiveComponent className={styles.tile} />
    </div>
  )
}

// One static cell backed by the shared v3 statics file. The same shape as the animated
// Tile above, minus the clock: instance this still's artboard (asset1..asset32) off the
// shared RiveFile, play its state machine (a1SM..a32SM) once the instance is bound, bind
// the preset instance for palette, and write cellSize/gapSize on change.
//
// Live control response depends on a companion fix IN THE RIVE FILE, not here: the
// pixelate PathEffect script must call `self.context:markNeedsUpdate()` in its advance()
// so the runtime re-runs update() (which rebuilds the mosaic) each frame with the live
// cellSize/gapSize. Those tokens are VM reads, not script Inputs, so without that call
// the geometry never rebuilds when a slider moves and the tile looks frozen. With it,
// the artboard keeps advancing on its own — no React keep-alive, no clock registration.
function StaticRiveTile({ staticFile, source, instanceName, cellSize, gapSize }) {
  const { rive, RiveComponent } = useRive(
    {
      riveFile: staticFile,
      // Name the artboard and its state machine explicitly, same as the animated tiles.
      // In v3 the still IS the artboard — asset{N} carries state machine a{N}SM.
      artboard: source.artboard,
      stateMachines: source.stateMachine,
      // autoplay:false then play once the instance is bound — identical to the animated
      // tiles, so the palette instance exists before the SM advances.
      autoplay: false,
      // autoBind:false — bind the preset instance ourselves so its palette applies and
      // a preset switch rebinds, same as the animated tiles.
      autoBind: false,
    },
    // useOffscreenRenderer defaults to true — do NOT disable it.
  )

  const viewModel = useViewModel(rive, { name: VIEW_MODEL })
  const instance = useViewModelInstance(viewModel, { rive, name: instanceName })

  // Play the SM once the instance is bound — same order and reason as the animated Tile.
  // The script's markNeedsUpdate() then keeps the artboard advancing so cell/gap stay live.
  useEffect(() => {
    if (rive && instance) rive.play(source.stateMachine)
  }, [rive, instance, source.stateMachine])

  const { setValue: setCell } = useViewModelInstanceNumber('cellSize', instance)
  const { setValue: setGap } = useViewModelInstanceNumber('gapSize', instance)

  useEffect(() => {
    if (setCell) setCell(cellSize)
  }, [setCell, cellSize])
  useEffect(() => {
    if (setGap) setGap(gapSize)
  }, [setGap, gapSize])

  return (
    <div className={styles.tile} data-static={source.id}>
      <RiveComponent className={styles.tile} />
    </div>
  )
}

// Guard wrapper: render a muted placeholder until the shared statics file has loaded
// (or if a cell somehow has no source), then hand off to the hook-bearing tile. The
// split keeps StaticRiveTile's hooks unconditional.
function StaticTile({ staticFile, source, instanceName, cellSize, gapSize }) {
  if (!staticFile || !source) {
    return <div className={`${styles.tile} ${styles.tilePlaceholder}`} data-static="empty" />
  }
  return (
    <StaticRiveTile
      staticFile={staticFile}
      source={source}
      instanceName={instanceName}
      cellSize={cellSize}
      gapSize={gapSize}
    />
  )
}

// The waving-logo Rive button that replaces the plain text `clawd` button. Same job:
// clicking it adds a clawd tile to the grid (onClick → addClawd). It plays its own
// motionTilesLogoSM — its wave is self-contained, like the interactive clawd tile — and
// binds the active preset instance so its palette tracks the board. It is chrome, not a
// driven tile: no clock, no pixelation writes. The canvas keeps pointer events so the
// artboard's own hover-scale and pointer-down animation run; the click still bubbles to
// the wrapping <button> (addClawd), so the click behavior is unchanged.
const LOGO_SRC = '/riveTiles/motiontileslogo.riv'
// Artboard read from the .riv strings, NOT confirmed in the editor: the file carries
// both `motionTilesLogo` and `motionTilesLogoSM`, the same artboard/SM split as clawd,
// so the artboard is motionTilesLogo. If the button renders blank, try 'motionTilesLogoSM'.
const LOGO_ARTBOARD = 'motionTilesLogo'
const LOGO_STATE_MACHINE = 'motionTilesLogoSM'

// The bug-report affordance's Rive button (replaces the plain "Problems?" text
// button). Same chrome-button pattern as ClawdLogoButton: self-driven state
// machine, binds the active preset instance so its palette tracks the board's
// theme. Its own ViewModel (ProblemVM), not the tiles' PathEffectVM.
const PROBLEM_SRC = '/titleSVGS/problembutton.riv'
const PROBLEM_ARTBOARD = 'problemButton'
const PROBLEM_STATE_MACHINE = 'problemSM'
const PROBLEM_VIEW_MODEL = 'ProblemVM'

// Every .riv the grid fetches at mount, for the landing's asset prefetch. Built
// from the same constants the mount path reads, so the list cannot drift from
// what the grid actually loads — if a tile source is added above, it is
// prefetched with no second edit. clawd.riv is deliberately absent: it is
// click-gated behind the logo button and its 748 kB would nearly triple the
// prefetch payload for an easter egg most visitors never trigger.
// eslint-disable-next-line react-refresh/only-export-components -- deliberate non-component export; the landing imports it for the .riv prefetch
export const RIV_PREFETCH_MANIFEST = [
  RIV_SRC,
  ...GROUP2_FILES.map((f) => f.src),
  STATIC_FILE,
  LOGO_SRC,
  PROBLEM_SRC,
]

function ClawdLogoButton({ instanceName, onClick }) {
  // The button fills the column width and its height follows the logo's real aspect
  // ratio, so the logo scales up without letterboxing. We read the artboard bounds
  // once loaded and expose the ratio as a CSS custom property; the module CSS applies
  // it via aspect-ratio. Inline style sets ONLY the var (no literal styling), the same
  // convention the grid uses for --cols/--tile.
  const [aspect, setAspect] = useState(null)
  const reduce = useReducedMotion()
  const { rive, RiveComponent } = useRive({
    src: LOGO_SRC,
    artboard: LOGO_ARTBOARD,
    stateMachines: LOGO_STATE_MACHINE,
    autoplay: false, // play once the preset instance is bound, same order as the tiles
    autoBind: false, // we bind the chosen preset instance ourselves for its palette
  })

  const viewModel = useViewModel(rive, { name: VIEW_MODEL })
  const instance = useViewModelInstance(viewModel, { rive, name: instanceName })

  // Chrome freezes under OS reduce-motion (2026-07-17 policy): hold the bound
  // first frame instead of playing, same as the landing hero. A paused SM also
  // skips its hover/press responses; the wrapping <button> still owns the click.
  useEffect(() => {
    if (!rive || !instance) return
    if (reduce) rive.pause(LOGO_STATE_MACHINE)
    else rive.play(LOGO_STATE_MACHINE)
  }, [rive, instance, reduce])

  // Deliberately NOT wired to Pause: the logo is chrome, not part of the board's
  // motion, so its wave and hover/press keep running while the grid is paused.
  // (The OS reduce-motion freeze above is the one exception, and it is the
  // user's own machine-level signal, not the board's Pause.)

  // Derive the aspect ratio from the loaded artboard bounds (maxX-minX / maxY-minY).
  // Until this resolves, the CSS fallback ratio holds the box open.
  useEffect(() => {
    if (!rive) return
    const b = rive.bounds
    if (!b) return
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    if (w > 0 && h > 0) setAspect(w / h)
  }, [rive])

  return (
    <button
      type="button"
      className={styles.logoButton}
      style={aspect ? { '--logo-aspect': aspect } : undefined}
      onClick={onClick}
      aria-label="Add a clawd tile to the grid"
    >
      <RiveComponent className={styles.logoCanvas} />
    </button>
  )
}

// The Rive "Problems?" button. Chrome, like ClawdLogoButton: plays its own problemSM
// and binds the active preset instance (standard/snappy/cinematic) so its palette
// switches with the board theme. The button base (fill + rounded corners) is baked
// into the artboard, so the wrapping <button> is a bare click target with no frame of
// its own; its height follows the artboard's real aspect ratio at full width. The
// canvas keeps pointer events (no pointer-events:none) so problemSM runs its own
// hover-scale and pointer-down animation; the click bubbles up to the <button>, which
// opens the report dialog.
function ProblemButton({ instanceName, onClick }) {
  const [aspect, setAspect] = useState(null)
  const reduce = useReducedMotion()
  const { rive, RiveComponent } = useRive({
    src: PROBLEM_SRC,
    artboard: PROBLEM_ARTBOARD,
    stateMachines: PROBLEM_STATE_MACHINE,
    autoplay: false, // play once the preset instance is bound, same order as the tiles
    autoBind: false, // we bind the chosen preset instance ourselves for its palette
  })

  const viewModel = useViewModel(rive, { name: PROBLEM_VIEW_MODEL })
  const instance = useViewModelInstance(viewModel, { rive, name: instanceName })

  // Chrome freezes under OS reduce-motion (2026-07-17 policy): hold the bound
  // first frame instead of playing. The click still opens the dialog.
  useEffect(() => {
    if (!rive || !instance) return
    if (reduce) rive.pause(PROBLEM_STATE_MACHINE)
    else rive.play(PROBLEM_STATE_MACHINE)
  }, [rive, instance, reduce])

  // Derive the aspect ratio from the loaded artboard bounds; the CSS fallback holds
  // the box open until this resolves.
  useEffect(() => {
    if (!rive) return
    const b = rive.bounds
    if (!b) return
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    if (w > 0 && h > 0) setAspect(w / h)
  }, [rive])

  return (
    <button
      type="button"
      className={styles.problemButton}
      style={aspect ? { '--problem-aspect': aspect } : undefined}
      onClick={onClick}
      aria-label="Report a problem"
    >
      <RiveComponent className={styles.problemCanvas} />
    </button>
  )
}

// The "Problems?" affordance: a panel section whose button opens a minimal report
// dialog. The message posts to the /api/bug-report Worker route, which opens a
// GitHub issue server-side — no email address ever ships to the client. `tile` is a
// short context string (preset + grid size) the caller derives, so the issue title
// carries the composition the report was filed from. Reuses the shared Modal (the
// only overlay pattern); it renders viewport-fixed here because Motion Tiles sits
// outside DemoArea, so useDemoOverlay would return null.
function BugReport({ tile, instanceName }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  // Honeypot: kept empty by real users, so any value means a bot and the server
  // silently drops the report. A piece of state, not a ref, so React owns the input.
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  // Require a non-empty TRIMMED message, mirroring the server guard so a
  // spaces-only report can never be submitted in the first place.
  const canSubmit = message.trim().length > 0 && status !== 'sending'

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('sending')
    try {
      // Relative path so it resolves on both the .pages.dev URL and the custom
      // subdomain without knowing the origin.
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tile, website }),
      })
      if (res.ok) {
        setStatus('sent')
        setMessage('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const close = () => {
    setOpen(false)
    setStatus('idle')
    setWebsite('')
  }

  return (
    <div className={styles.section}>
      <ProblemButton instanceName={instanceName} onClick={() => setOpen(true)} />

      <Modal isOpen={open} onClose={close} title="Report a problem">
        <form className={styles.reportForm} onSubmit={submit}>
          <textarea
            className={styles.reportField}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              // Clear a stale result once the user starts a fresh message.
              if (status === 'sent' || status === 'error') setStatus('idle')
            }}
            maxLength={2000}
            rows={5}
            placeholder="What went wrong?"
            aria-label="Describe the problem"
          />

          {/* Off-screen honeypot: invisible to people, tempting to bots. */}
          <input
            type="text"
            name="website"
            className={styles.honeypot}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          {(status === 'sent' || status === 'error') && (
            <p className={styles.reportStatus} data-state={status} role="status">
              {status === 'sent' ? 'Sent, thank you.' : 'Could not send, try again.'}
            </p>
          )}

          <button type="submit" className={styles.actionButton} disabled={!canSubmit}>
            {status === 'sending' ? 'Sending…' : 'Send report'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

export function MotionTilesGrid() {
  const { riveFile, status } = useRiveFile({ src: RIV_SRC })
  // The statics file loads alongside the animation file. If it lags, static cells
  // show the placeholder until it arrives; the grid does not block on it.
  const { riveFile: staticFile } = useRiveFile({ src: STATIC_FILE })

  // The on-screen load error speaks to the visitor; the asset path only helps the
  // developer, so it goes to the console instead of the UI.
  useEffect(() => {
    if (status === 'failed') {
      console.error(`[MotionTilesGrid] failed to load ${RIV_SRC}`)
    }
  }, [status])

  // preset drives which instance the tiles bind; the sliders below start from the
  // preset's baked values and can override them live.
  const [preset, setPreset] = useState('standard')
  const [speed, setSpeed] = useState(PRESETS.standard.speed)
  const [easing, setEasing] = useState(PRESETS.standard.easing)
  const [spread, setSpread] = useState(PRESETS.standard.spread)
  const [cellSize, setCellSize] = useState(PRESETS.standard.cell)
  const [gapSize, setGapSize] = useState(PRESETS.standard.gap)
  const [table, setTable] = useState('ripple')

  // Composition: grid size, animation-to-static ratio, and the reshuffle seed.
  // Default 4×4 (16 cells) — a lighter default draw load, safer on older machines
  // than a full 8×8. The size slider still opens it up to MAX_N.
  const [gridN, setGridN] = useState(4)
  const [animRatio, setAnimRatio] = useState(1) // 1 = all animated, 0 = all static
  const [seed, setSeed] = useState(1)

  // Pause freezes the one clock. A ref so the rAF loop reads it without re-subscribing;
  // the state drives the button label. Freezing accumulated time (not just skipping
  // writes) means resume picks up exactly where it left off — no phase jump.
  //
  // Reduced motion (2026-07-17): under the OS preference the field starts
  // paused at its rest state (progress 0, blessed by the Tier 3 r1c6 scrub)
  // and the existing Pause/Play button is the explicit-playback affordance.
  // `pausedChoice` is the user's override (null until they press the button);
  // a press wins from then on, in either direction. Same pattern as the
  // principle library's icon pause.
  const prefersReduced = useReducedMotion()
  const [pausedChoice, setPausedChoice] = useState(null)
  const paused = pausedChoice ?? prefersReduced
  const pausedRef = useRef(paused)
  // Keep the clock's ref in step when `paused` changes without a button press
  // (the preference resolving after mount); the button's handler also writes
  // the ref synchronously so a press takes effect on the very next frame.
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // Forced clawd cells — the test scaffold for the future click-to-add easter egg.
  // A Set of absolute cell indices that render a self-driven clawd Tile, overriding
  // whatever the pooled assignment put there. The eventual toolbar clawd icon will
  // call the same handler; this button stands in for it. Kept OUTSIDE the seeded
  // `assignment` memo on purpose: adding a clawd is a user gesture, not part of the
  // deterministic layout, so it must not perturb the mosaic or depend on the seed.
  const [clawdCells, setClawdCells] = useState(() => new Set())

  // Refs the rAF loop reads, so the loop never closes over stale state.
  const speedRef = useRef(speed)
  const easingRef = useRef(easing)
  const spreadRef = useRef(spread)
  const gridNRef = useRef(gridN)
  const weightsRef = useRef(makeTables(gridN, gridN)[table])

  // Fixed-size setter array (MAX_CELLS). Tiles register into their absolute cell
  // index; static / unmounted cells stay null and the clock skips them. Fixed size
  // means changing gridN never reallocates this out from under registering tiles.
  const setters = useRef(new Array(MAX_CELLS).fill(null))
  const register = useCallback((i, fn) => {
    setters.current[i] = fn
  }, [])

  // Frame rate, sampled by the clock itself — the honest number, since if the draws
  // bog the main thread this same rAF loop slows with them.
  const [fps, setFps] = useState(0)
  const [fpsMin, setFpsMin] = useState(60)

  // Cell assignment: for the current size / ratio / seed, decide which cells animate
  // and which source fills each. A seeded permutation ranks the cells; the first
  // `nAnim` in that ranking animate, so raising the ratio only turns more cells on
  // without disturbing the ones already animating. Reshuffle (new seed) re-ranks the
  // cells AND re-picks which pool entries land where.
  const assignment = useMemo(() => {
    const total = gridN * gridN
    const perm = seededPermutation(total, seed)
    const nAnim = Math.round(animRatio * total)
    const animCells = perm.slice(0, nAnim)
    const staticCells = perm.slice(nAnim)
    // Per-seed pool orderings so reshuffle also varies which source sits where.
    const animOrder = seededShuffle(ANIM_POOL, seed ^ 0x9e3779b9)
    const staticOrder = seededShuffle(STATIC_POOL, seed ^ 0x85ebca6b)

    const cells = new Array(total)
    animCells.forEach((cell, k) => {
      cells[cell] = { type: 'anim', source: animOrder[k % animOrder.length] }
    })
    staticCells.forEach((cell, k) => {
      const source = staticOrder.length ? staticOrder[k % staticOrder.length] : null
      cells[cell] = { type: 'static', source }
    })
    return cells
  }, [gridN, animRatio, seed])

  const animatedCount = assignment.filter((a) => a.type === 'anim').length
  const staticCount = assignment.length - animatedCount

  // Bind diagnostics, keyed by cell index (only animated cells report).
  const boundRef = useRef({})
  const [unboundCount, setUnboundCount] = useState(0)
  const onBind = useCallback((i, ok) => {
    boundRef.current[i] = ok
    setUnboundCount(Object.values(boundRef.current).filter((v) => v === false).length)
  }, [])
  // Clear stale bind records when the layout changes, so unmounted cells don't count.
  useEffect(() => {
    boundRef.current = {}
    setUnboundCount(0)
  }, [gridN, animRatio, seed])

  // Drop forced clawds whose index falls outside a shrunken grid. Ratio/seed keep the
  // cell count fixed, so only gridN can invalidate an index. Returning the same Set when
  // nothing is dropped avoids a needless re-render.
  useEffect(() => {
    const total = gridN * gridN
    setClawdCells((prev) => {
      const kept = new Set([...prev].filter((i) => i < total))
      return kept.size === prev.size ? prev : kept
    })
  }, [gridN])

  // Add one clawd to a random cell that isn't already clawd, so repeated clicks scatter
  // them instead of stacking on the same spot. Math.random (not the seeded RNG) is
  // correct here: this is a live user gesture, not part of the reproducible layout.
  const addClawd = useCallback(() => {
    const total = gridN * gridN
    setClawdCells((prev) => {
      const open = []
      for (let i = 0; i < total; i += 1) if (!prev.has(i)) open.push(i)
      if (open.length === 0) return prev // whole board is clawd already
      const pick = open[Math.floor(Math.random() * open.length)]
      return new Set(prev).add(pick)
    })
  }, [gridN])

  // Keep the clock's refs in step with size and stagger table.
  useEffect(() => {
    gridNRef.current = gridN
    weightsRef.current = makeTables(gridN, gridN)[table]
  }, [gridN, table])

  // The single clock. Advances phase and writes each animated tile a phase-offset
  // eased `progress` every frame. This is the whole source of motion.
  useEffect(() => {
    let raf
    let last = performance.now()
    // Accumulate only un-paused time, so a pause freezes phase and resume continues
    // seamlessly. Equivalent to (now - start) when the clock is never paused.
    let elapsed = 0
    let frames = 0
    let windowStart = last
    let worst = 60
    const loop = (now) => {
      const dt = (now - last) / 1000
      last = now
      if (!pausedRef.current) {
        elapsed += dt
        const period = BASE_PERIOD / Math.max(speedRef.current, 0.01)
        const ph = (elapsed % period) / period
        const spreadV = spreadRef.current
        const k = easingRef.current
        const w = weightsRef.current
        const s = setters.current
        const count = gridNRef.current * gridNRef.current
        for (let i = 0; i < count; i += 1) {
          const fn = s[i]
          if (!fn) continue
          // JS % keeps the dividend's sign; add 1 and wrap again into [0,1).
          const phk = (((ph - spreadV * w[i]) % 1) + 1) % 1
          fn(cycleProgress(phk, k))
        }
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
    weightsRef.current = makeTables(gridN, gridN)[key]
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

  // Board sizing: keep the whole grid roughly constant footprint (~720px) as N
  // changes, so 3×3 and 8×8 both read at a comfortable size. Set as CSS custom
  // properties on the grid — the tiles inherit them (see the module CSS).
  const tilePx = Math.round(720 / gridN) - 4

  if (status !== 'success') {
    return (
      <div className={styles.tileLab}>
        <div className={styles.stage} />
        <aside className={styles.controls}>
          <div className={styles.section}>
            {status === 'failed' ? (
              <span className={styles.loadError} role="alert">
                The tile grid could not load. Check your connection and reload
                the page.
              </span>
            ) : (
              <span className={styles.sectionLabel}>Loading…</span>
            )}
          </div>
        </aside>
      </div>
    )
  }

  return (
    <div className={styles.tileLab}>
      {/* ── Left column: tile stage ─────────────────────────────────────── */}
      <div className={styles.stage}>
        <div
          className={styles.stageGrid}
          style={{ '--cols': gridN, '--tile': `${tilePx}px` }}
        >
          {assignment.map((cell, i) =>
            // A forced clawd wins over whatever the pool assigned to this cell. Its
            // distinct key remounts the slot onto the clawd source; clearing the force
            // remounts it back to the pooled tile.
            clawdCells.has(i) ? (
              <Tile
                key={`cell-${i}-clawd`}
                source={CLAWD_FILE}
                riveFile={riveFile}
                index={i}
                register={register}
                instanceName={instanceName}
                cellSize={cellSize}
                gapSize={gapSize}
                onBind={onBind}
                paused={paused}
              />
            ) : cell.type === 'anim' ? (
              <Tile
                // Key on source id so a cell that changes source (reshuffle / ratio)
                // remounts onto the new artboard; type change (anim↔static) already
                // forces a remount because the element type differs.
                key={`cell-${i}-anim-${cell.source.id}`}
                source={cell.source}
                riveFile={riveFile}
                index={i}
                register={register}
                instanceName={instanceName}
                cellSize={cellSize}
                gapSize={gapSize}
                onBind={onBind}
              />
            ) : (
              <StaticTile
                key={`cell-${i}-static-${cell.source?.id ?? 'empty'}`}
                staticFile={staticFile}
                source={cell.source}
                instanceName={instanceName}
                cellSize={cellSize}
                gapSize={gapSize}
              />
            ),
          )}
        </div>
      </div>

      {/* ── Right column: controls, Token-Lab styled. On the RIGHT so it never
          reads as the Token Lab tool bar (which lives on the left). ──────── */}
      <aside className={styles.controls}>
        {/* The motion-tiles logo heads the panel as its title. It is also the
            easter-egg affordance: the waving-logo Rive animation invites the
            click, and each click drops a self-driven clawd tile onto a random
            cell. */}
        <div className={styles.logoBay}>
          <ClawdLogoButton instanceName={instanceName} onClick={addClawd} />
        </div>

        {/* Composition — the pooled-mosaic controls: size, animation density, and a
            reshuffle that re-seeds the layout and source placement. */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Composition</div>
          <Slider label="grid size" value={gridN} min={MIN_N} max={MAX_N} step={1}
            format={(v) => `${v}×${v}`} onChange={(v) => setGridN(v)} />
          <Slider label="motion" value={animRatio} min={0} max={1} step={0.05}
            format={(v) => `${Math.round(v * 100)}%`} onChange={setAnimRatio} />
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              setSeed((s) => (s + 1) | 0)
              // Reshuffling re-seeds the whole board, so the easter-egg clawds reset too.
              setClawdCells((prev) => (prev.size ? new Set() : prev))
            }}
          >
            Reshuffle
          </button>
          <button
            type="button"
            className={styles.actionButton}
            aria-pressed={paused}
            onClick={() => {
              const next = !paused
              pausedRef.current = next
              setPausedChoice(next)
            }}
          >
            {paused ? 'Play' : 'Pause'}
          </button>
        </div>

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

        {/* Stagger — the weight table that shapes how the wave travels the grid.
            A fixed 4-column grid (not a flex-wrap) so the seven options always lay
            out as two rows (4 + 3, row-major so they still read Sync..Scatter in
            order), independent of which one is selected. */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Stagger</div>
          <div className={styles.staggerList}>
            {TABLE_ORDER.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`${styles.staggerPill} ${table === key ? styles.pillActive : styles.pill}`}
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

        {/* Feedback — the "Problems?" report affordance. tile carries the current
            composition (preset + grid size) into the GitHub issue title. */}
        <BugReport
          tile={`Motion Tiles · ${PRESETS[preset].label} · ${gridN}×${gridN}`}
          instanceName={instanceName}
        />

        <div className={styles.status}>
          <span className={styles.fps} data-warn={fps < 55}>{fps} fps</span>
          <span>min {fpsMin}</span>
          <span>{animatedCount} motion / {staticCount} static</span>
          {unboundCount > 0 && (
            <span className={styles.warn}>unbound: {unboundCount}</span>
          )}
        </div>
      </aside>
    </div>
  )
}
