// Rive Clock — the second Embeds demo. An interactive Rive state machine paints
// a plant; a React WebGL shader stacked on top displays a pixelated copy of it,
// and the pointer events fall through to the live machine underneath. On top of
// the mosaic runs mouse-driven chromatic aberration: three colour plates chase
// the cursor, and the LIVE motion tokens shape every part of that chase.
//
// The name states who holds time. In React Clock (Water & Wilt), React's rAF
// loop holds time and Rive holds poses. Here it inverts: Rive's own state
// machine holds the motion, and React paints a shader over it. The shader half
// is real content, but it is not the ownership fact, so it lives in the caption.
//
// ── The two aligned layers (promoted from PixelPlantLab, unchanged) ───────────
//   bottom  the Rive canvas, playing pixelPlantSM, at opacity 0. Opacity keeps
//           hit-testing alive (visibility/display would kill it), so the state
//           machine's listeners still receive hover and press even though the
//           layer is invisible. Canvas pointer events stay ON.
//   top     the shader canvas, pointer-events: none, so every pointer event
//           falls through to the Rive canvas underneath. It redraws the
//           pixelated copy of whatever the state machine painted that frame.
// Both layers fill the same box; the stage takes its aspect ratio from the
// artboard bounds, so pointer coordinates line up with the pixelated image the
// user thinks they are touching. Sampling is the G1-proven path: per-frame
// texImage2D of rive.canvas into this component's own webgl context.
//
// ── What the tokens drive (the reason this lives inside Token Lab) ────────────
// The lab's motion was self-contained: a magic 0.12 lerp, a local strength
// slider, no token anywhere near the shader. Each motion-token family now has
// one legible job, so a preset switch changes the effect's personality and a
// slider drag retimes it live:
//
//   duration.base   the FOLLOW clock. Each plate chases the cursor by
//                   exponential smoothing with a time constant derived from the
//                   token, integrated against real delta time so it is
//                   frame-rate independent (the old 0.12 per-frame lerp was
//                   both a magic number and frame-rate dependent).
//   duration.slow   the HOMECOMING length. When the pointer leaves the stage,
//                   the plates stop following and glide back to zero as a
//                   finite tween over this duration. Split from the follow
//                   clock on David's call, so tracking-tightness (base) and
//                   resolve-length (slow) tune independently.
//   ease.standard   the HOMECOMING curve. Continuous following is pure
//                   exponential (no bezier); the return is a real tween on this
//                   token's curve. That is where a bezier is perceivable as a
//                   bezier.
//   delay.short     the plate STAGGER. Blue tracks immediately, green lags one
//                   delay step, red two. While moving, the plates disagree in
//                   time and the fringe blooms; the pointer leaving lets them
//                   resolve in the same staggered order. During follow the lag
//                   is extra smoothing; during the homecoming it is a real
//                   per-plate start delay.
//   scale.expressive  the AMPLITUDE. Max plate travel maps to (1 - the token):
//                   the "largest departure from rest" slot drives the largest
//                   fringe. The local strength slider left the panel.
//
// The plate RATE ratios (blue 1, green 2/3, red 1/3) and the cell math stay as
// geometry constants: they are the misregistered-print reading, not motion
// timing, so they carry no token (Token Fidelity keeps time-domain tokens on
// time-domain jobs). cells and gap stay embed-local spatial controls for the
// same reason.
//
// ── Theme binding (write the palette, never rebind) ───────────────────────────
// pixelplant.riv authors one PixelPlantVM instance per display mode. The obvious
// approach, binding the active theme's instance and letting it carry its own
// baked colors, does not work here: pixelPlantSM is INTERACTIVE (a click-to-water
// plant), the watered state lives in a data-bound property, and rebinding the
// instance re-applies the new instance's baked value for that property, which the
// machine reads as a click. Not remounting and not pausing avoids that; only not
// rebinding does. Both a remount (state reset) and an in-place rebind (phantom
// click) were tried and rejected.
//
// So we bind ONE instance for the component's life and change themes by WRITING
// the target theme's colors into it, the useHCContrastColors mechanism generalized
// from the two HC-flip colors to the whole palette across all four themes. The
// four authored instances are harvested once at mount for their color values; a
// theme switch then copies the target palette into the bound instance. The data
// context never changes, so no click can fire, and the plant's interaction state
// persists because nothing touches its state properties. Reasoning at PlantRive.
//
// Contract and token map: docs/briefings/pixelplant-token-map.md.

import { useCallback, useEffect, useRef, useState } from 'react'
import { cubicBezier, useReducedMotion } from 'framer-motion'
import { useRive, useViewModel } from '@rive-app/react-webgl2'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { useTheme } from '../../context/ThemeContext'
import styles from './PixelPlant.module.css'

const RIV_SRC = '/rive/pixelplant.riv'
const ARTBOARD = 'pixelPlant'
const STATE_MACHINE = 'pixelPlantSM'
const VIEW_MODEL = 'PixelPlantVM'

// One baked instance per theme, all four covered — no fallback branch.
const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

// The three colour plates, in lag order. `rate` is the geometry constant (how
// far this plate travels along the offset, the misregistered-print reading);
// `lag` is the stagger multiple (delay steps behind blue). Blue leads on both:
// full travel, zero delay. Red trails on both. The array order is the uniform
// order the recombine expects (see the loop's uniform writes).
const PLATES = [
  { key: 'blue', rate: 1, lag: 0 },
  { key: 'green', rate: 2 / 3, lag: 1 },
  { key: 'red', rate: 1 / 3, lag: 2 },
]

// Maps the scale token's departure from rest into UV-offset space. scale.expressive
// defaults to 0.9, so (1 - 0.9) * 0.6 = 0.06, the lab's known-good default fringe.
// This is a geometry gain, not a timing value; final feel is tuned by hand with
// David by dragging scale.expressive against the live tool.
const AMPLITUDE_GAIN = 0.6

// Explore mode allows near-zero tokens. Clamp the time constant and the
// homecoming duration so a zero never reaches the integrator; both degrade to an
// effectively instant response rather than dividing by zero (the WaterWilt rule).
const MIN_S = 0.001

// Y is flipped: canvas texture sources have a top-left origin, GL clip space is
// bottom-left.
const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 1.0 - (a_pos.y * 0.5 + 0.5));
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

// Chromatic aberration model: three colour plates, each sampled at its OWN
// offset vector. The driver computes those three offsets in JS (per-plate rate,
// per-plate temporal lag), so the shader no longer scales one shared offset by a
// rate — it receives u_offR / u_offG / u_offB already resolved and samples each
// plate's mosaic at its own shifted UV. u_snap quantises a plate's offset to
// whole cells for the chunky pixel-art variant. u_maskAfter picks who owns the
// gutters: 1 carves one clean screen-space grid after the plates recombine; 0
// lets each plate carry its own gutter at its own offset, so fringes bleed into
// the gaps like ink outside registration marks.
//
// The premultiplied recombine and the out-of-range guard are load-bearing and
// unchanged from the lab: each channel keeps its own plate's alpha so a lone
// blue fringe ghosts past the silhouette without a halo, and the out-of-range
// guard stops CLAMP_TO_EDGE from streaking border pixels across a vacated edge.
const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_blocks;
uniform float u_pixelate;
uniform float u_gap;
uniform vec2 u_offR;
uniform vec2 u_offG;
uniform vec2 u_offB;
uniform float u_snap;
uniform float u_maskAfter;
varying vec2 v_uv;

// One colour plate: mosaic sampled at this plate's own offset. Returns the tap's
// premultiplied rgba (all four channels; the caller picks one). Signature
// changed from the lab's plate(float rate): the per-plate temporal stagger needs
// each plate to carry its own eased offset, which a single shared u_offset could
// not encode, so the rate scaling moved into the JS driver.
vec4 plate(vec2 off) {
  if (u_pixelate > 0.5 && u_snap > 0.5) {
    // Snap the plate's travel to whole cells so it jumps grid-aligned.
    off = floor(off * u_blocks + 0.5) / u_blocks;
  }
  vec2 uv = v_uv - off;
  // Outside the source reads transparent — without this, CLAMP_TO_EDGE would
  // streak the border pixels across the vacated edge.
  float inb = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  if (u_pixelate < 0.5) {
    return texture2D(u_tex, uv) * inb;
  }
  vec2 grid = uv * u_blocks;
  // Sample the block centre, so one source texel colours the whole block.
  vec4 c = texture2D(u_tex, (floor(grid) + 0.5) / u_blocks) * inb;
  if (u_maskAfter < 0.5) {
    // Per-plate gutter: the mask travels with the plate, so offset plates
    // leave colour behind in each other's gaps.
    vec2 f = fract(grid);
    float hg = u_gap * 0.5;
    if (f.x < hg || f.x > 1.0 - hg || f.y < hg || f.y > 1.0 - hg) {
      c = vec4(0.0);
    }
  }
  return c;
}

void main() {
  vec4 r = plate(u_offR);
  vec4 g = plate(u_offG);
  vec4 b = plate(u_offB);
  // Premultiplied recombine. Each channel is already multiplied by its own
  // plate's alpha (so it never exceeds it); output coverage is the strongest
  // plate's alpha, which keeps the result a valid premultiplied colour and
  // lets a lone blue fringe ghost past the silhouette instead of clipping.
  vec4 c = vec4(r.r, g.g, b.b, max(r.a, max(g.a, b.a)));
  if (u_pixelate > 0.5 && u_maskAfter > 0.5) {
    // Screen-space gutter: one clean grid carved after recombination, so the
    // gaps always read as background no matter where the plates sit.
    vec2 f = fract(v_uv * u_blocks);
    float hg = u_gap * 0.5;
    if (f.x < hg || f.x > 1.0 - hg || f.y < hg || f.y > 1.0 - hg) {
      c = vec4(0.0);
    }
  }
  gl_FragColor = c;
}`

function compileShader(gl, type, src, onError) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    onError(gl.getShaderInfoLog(s) || 'shader compile failed')
  }
  return s
}

// The Rive half. It binds ONE instance for its whole life and changes themes by
// writing colors into that instance, never rebinding (a rebind resets the state
// machine or fires a phantom click; see the theme-binding header). No key, so it
// also never remounts on a theme change.
function PlantRive({ theme, onCanvas, onAspect, onReady }) {
  const { rive, RiveComponent } = useRive({
    src: RIV_SRC,
    artboard: ARTBOARD,
    stateMachines: STATE_MACHINE,
    autoplay: false, // play once, after the mount bind (mount order)
    autoBind: false, // we bind and drive the palette ourselves
  })

  // useViewModel only RETRIEVES the view model (it binds no instance); it gates
  // the setup below on the VM being ready, more robust than reading
  // rive.viewModelByName on the first rive-ready tick and never retrying.
  const viewModel = useViewModel(rive, { name: VIEW_MODEL })

  // Set once at mount: the single bound instance, the per-theme palettes harvested
  // from the four authored instances, and the list of theme-varying property names
  // to write on a switch.
  const boundInstanceRef = useRef(null)
  const palettesRef = useRef({}) // theme -> { propertyName: value }
  const varyingRef = useRef({ colors: [], numbers: [] })

  useEffect(() => {
    if (!rive || !viewModel) return

    // ── One-time setup ──────────────────────────────────────────────────────
    if (!boundInstanceRef.current) {
      const colorNames = viewModel.properties.filter((p) => p.type === 'color').map((p) => p.name)
      const numberNames = viewModel.properties.filter((p) => p.type === 'number').map((p) => p.name)

      // Harvest each theme's values by READING the instances, never binding them.
      // instanceByName returns an instance with its own authored values, readable
      // without binding. Binding each in turn (an earlier version did) lets Rive's
      // reference counting clean up the previously bound instance, so the one we
      // keep ends up a dead handle whose colours no longer write — the bug that
      // made the whole theme switch silently do nothing.
      const palettes = {}
      for (const [t, instName] of Object.entries(themeToInstanceName)) {
        const inst = viewModel.instanceByName(instName)
        if (!inst) continue
        const vals = {}
        for (const n of colorNames) { const h = inst.color(n); if (h) vals[n] = h.value }
        for (const n of numberNames) { const h = inst.number(n); if (h) vals[n] = h.value }
        palettes[t] = vals
      }

      // A property is theme-varying iff its baked value differs across themes: the
      // colours (the palette) and the per-theme opacities (fillOpacity /
      // strokeOpacity) do; the interaction-state properties (waterMeBoole and the
      // rest) are identical in every instance, so they are never in this set and a
      // theme switch can never clobber the plant's state.
      const keys = Object.keys(palettes)
      const varies = (n) => keys.some((t) => palettes[t][n] !== palettes[keys[0]][n])
      varyingRef.current = {
        colors: colorNames.filter(varies),
        numbers: numberNames.filter(varies),
      }
      palettesRef.current = palettes

      // Bind EXACTLY ONE instance for the component's life and keep the reference.
      // Because we never rebind, this instance stays referenced (not cleaned up),
      // so its property handles stay live and colour writes keep landing. Its own
      // palette is the initial theme's, so no write is needed on mount.
      const bound = viewModel.instanceByName(themeToInstanceName[theme])
      if (!bound) return
      rive.bindViewModelInstance(bound)
      boundInstanceRef.current = bound
      rive.play(STATE_MACHINE)
      onReady(true)
      return
    }

    // ── Theme change ────────────────────────────────────────────────────────
    // Write the target theme's varying properties into the ALREADY-bound
    // instance. No rebind, so the data context (and the plant's interaction
    // state) is untouched and no click can fire. The machine also keeps playing
    // under reduced motion: the plant's motion is pointer-driven, not ambient, so
    // David's call is to keep it interactive (only the shader's aberration pins).
    const vals = palettesRef.current[theme]
    const bound = boundInstanceRef.current
    if (!vals) return
    for (const n of varyingRef.current.colors) {
      const h = bound.color(n)
      if (h && vals[n] != null) h.value = vals[n]
    }
    for (const n of varyingRef.current.numbers) {
      const h = bound.number(n)
      if (h && vals[n] != null) h.value = vals[n]
    }
  }, [rive, viewModel, theme, onReady])

  // Hand the live canvas up as the shader's texture source, and derive the
  // stage's aspect ratio from the artboard bounds so the contain-fit Rive
  // layout fills the box exactly and the shader copy aligns 1:1 with the
  // pointer's idea of where the plant is.
  useEffect(() => {
    if (!rive) return
    onCanvas(rive.canvas ?? null)
    const b = rive.bounds
    if (b) {
      const w = b.maxX - b.minX
      const h = b.maxY - b.minY
      if (w > 0 && h > 0) onAspect(w / h)
    }
    return () => onCanvas(null)
  }, [rive, onCanvas, onAspect])

  return <RiveComponent className={styles.plantCanvas} />
}

// A single toggle button that shows the current state as its label and switches
// that label on click (Smooth <-> Chunky, Clean <-> Bleed). Matches Token Lab's
// button vocabulary (bordered, surface fill, --color-text-primary; text on
// surface, never on the accent fill, so the 4.5:1 text bar holds). The row label
// on the left names what the button controls; the button's accessible name folds
// the two together so a screen reader announces "Plate travel: Smooth".
function StateToggle({ label, value, onLabel, offLabel, onToggle }) {
  const current = value ? onLabel : offLabel
  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        className={styles.toggleButton}
        aria-label={`${label}: ${current}`}
        onClick={onToggle}
      >
        {current}
      </button>
    </div>
  )
}

export function PixelPlant() {
  const { theme } = useTheme()

  // TokenLab wraps the demo area in a MotionTokensProvider with
  // respectReducedMotion={false} (the lab exists to perceive motion), so these
  // tokens are never flattened. The chromatic aberration is mouse-driven, which
  // the token layer does not know about, so reduced motion is honoured here by
  // reading the OS preference directly and pinning the plates to zero (the
  // WaterWilt pattern).
  const tokens = useMotionTokens()
  const prefersReduced = useReducedMotion()

  const canvasRef = useRef(null)
  const glRef = useRef(null)
  const riveCanvasRef = useRef(null) // the live Rive <canvas>, our texture source
  const rafRef = useRef(0)

  // Refs mirror control state so the rAF loop reads the latest without being
  // rebuilt on every slider tick.
  const cellsRef = useRef(42)
  const gapRef = useRef(0.07)
  const snapRef = useRef(false)
  const maskGapsRef = useRef(true)

  // The loop reads tokens through a ref because useMotionTokens() returns a new
  // object identity on every edit — holding it in a closure would rebuild the
  // loop per slider tick. The homecoming bezier is rebuilt on the same schedule;
  // construction is cheap and evaluation is per-frame.
  const tokensRef = useRef(tokens)
  const homeEaseRef = useRef(cubicBezier(...tokens.ease.standard))
  useEffect(() => {
    tokensRef.current = tokens
    homeEaseRef.current = cubicBezier(...tokens.ease.standard)
  }, [tokens])

  const reducedRef = useRef(prefersReduced)
  useEffect(() => {
    reducedRef.current = prefersReduced
  }, [prefersReduced])

  // Pointer state for the aberration. `inside` is the follow/homecoming switch:
  // true while the pointer is over the stage (plates follow), false once it
  // leaves (plates run the homecoming tween). x/y are normalized to the stage
  // box with centre at 0,0.
  const pointerRef = useRef({ x: 0, y: 0, inside: false })

  // Per-plate offset + homecoming state, the object the frame loop mutates.
  // `off` is the plate's current UV offset; `home` is null while following and
  // carries the tween state (captured start, progress, remaining stagger wait)
  // during the homecoming.
  const platesRef = useRef(
    PLATES.map((p) => ({ ...p, off: { x: 0, y: 0 }, home: null })),
  )

  const [aspect, setAspect] = useState(null) // artboard w/h, drives the stage box
  const [ready, setReady] = useState(false)
  const [cells, setCells] = useState(42) // cells across the mosaic
  const [gap, setGap] = useState(0.07) // fraction of a cell given to the gutter
  const [snap, setSnap] = useState(false) // false = smooth misregistration, true = chunky
  const [maskGaps, setMaskGaps] = useState(true) // true = clean gutters, false = fringe bleed
  const [error, setError] = useState('')

  useEffect(() => {
    cellsRef.current = cells
  }, [cells])
  useEffect(() => {
    gapRef.current = gap
  }, [gap])
  useEffect(() => {
    snapRef.current = snap
  }, [snap])
  useEffect(() => {
    maskGapsRef.current = maskGaps
  }, [maskGaps])

  // Pointer tracking. The listener sits on the stage wrapper, so it hears moves
  // over both layers without touching the pointer path to Rive (which keeps its
  // own canvas listeners). Leaving the stage flips `inside`, which the loop reads
  // as "start the homecoming"; the plates capture their own start values, so no
  // pointer position needs to be remembered here.
  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const p = pointerRef.current
    p.x = (e.clientX - rect.left) / rect.width - 0.5
    p.y = (e.clientY - rect.top) / rect.height - 0.5
    p.inside = true
  }
  const handlePointerLeave = () => {
    pointerRef.current.inside = false
  }

  // Stable identities so PlantRive's effects don't re-fire on our re-renders.
  const handleCanvas = useCallback((c) => {
    riveCanvasRef.current = c
  }, [])
  const handleAspect = useCallback((a) => setAspect(a), [])
  const handleReady = useCallback((r) => setReady(r), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl')
    if (!gl) {
      setError('WebGL context unavailable')
      return
    }

    const program = gl.createProgram()
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT, setError))
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG, setError))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setError(gl.getProgramInfoLog(program) || 'program link failed')
      return
    }
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    // Pixelation is always on in the shipped demo (it is the demo's identity, so
    // the lab's A/B toggle left the panel). NEAREST gives crisp block centres and
    // never changes, so it is set once here rather than per frame.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    // The Rive webgl2 canvas is already premultiplied; copying it into another
    // premultiplied-compositing canvas needs no unpack conversion.
    gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0)

    const g = {
      gl,
      texture,
      uBlocks: gl.getUniformLocation(program, 'u_blocks'),
      uPixelate: gl.getUniformLocation(program, 'u_pixelate'),
      uGap: gl.getUniformLocation(program, 'u_gap'),
      uOffR: gl.getUniformLocation(program, 'u_offR'),
      uOffG: gl.getUniformLocation(program, 'u_offG'),
      uOffB: gl.getUniformLocation(program, 'u_offB'),
      uSnap: gl.getUniformLocation(program, 'u_snap'),
      uMaskAfter: gl.getUniformLocation(program, 'u_maskAfter'),
    }
    glRef.current = g
    // Pixelate is constant; set it once. The full-res branch in the shader is
    // dead in this demo but kept so the proven sampling path stays byte-identical
    // to the lab's (the shader change was limited to the per-plate offsets).
    gl.uniform1f(g.uPixelate, 1)

    let last = performance.now()

    const loop = (now) => {
      const dt = (now - last) / 1000
      last = now

      // ── The per-plate driver ────────────────────────────────────────────────
      // Runs even when the Rive canvas is not yet ready, so the plate state is
      // always current by the time the first frame uploads. Reduced motion pins
      // every plate to zero (a clean image) and clears any in-flight homecoming.
      const t = tokensRef.current
      const ease = homeEaseRef.current
      const reduced = reducedRef.current
      const p = pointerRef.current
      const amp = (1 - t.scale.expressive) * AMPLITUDE_GAIN

      for (const plate of platesRef.current) {
        if (reduced) {
          plate.off.x = 0
          plate.off.y = 0
          plate.home = null
          continue
        }
        if (p.inside) {
          // Follow: exponential smoothing toward this plate's target (the
          // pointer vector, scaled by amplitude and the plate's rate). The time
          // constant is duration.base plus the plate's stagger lag, so green and
          // red trail blue in time. k = 1 - e^(-dt/tau) is the frame-rate
          // independent form: the same fraction of the remaining gap is closed
          // per unit of real time, whatever the frame rate.
          plate.home = null
          const targetX = p.x * amp * plate.rate
          const targetY = p.y * amp * plate.rate
          const tau = Math.max(t.duration.base + plate.lag * t.delay.short, MIN_S)
          const k = 1 - Math.exp(-dt / tau)
          plate.off.x += (targetX - plate.off.x) * k
          plate.off.y += (targetY - plate.off.y) * k
        } else {
          // Homecoming: a finite tween from the plate's captured offset back to
          // zero, over duration.slow on the ease.standard curve. `wait` holds
          // the plate at its start for its stagger step (blue 0, green one
          // delay.short, red two) so the plates resolve in the same order they
          // bloomed. duration.slow is read live each frame, so dragging it
          // retimes an in-flight return.
          if (!plate.home) {
            plate.home = {
              fromX: plate.off.x,
              fromY: plate.off.y,
              q: 0,
              wait: plate.lag * t.delay.short,
            }
          }
          const h = plate.home
          if (h.wait > 0) {
            h.wait -= dt // still staggered out; hold the aberrated pose
          } else {
            const dur = Math.max(t.duration.slow, MIN_S)
            h.q = Math.min(1, h.q + dt / dur)
            const e = ease(h.q)
            plate.off.x = h.fromX * (1 - e)
            plate.off.y = h.fromY * (1 - e)
          }
        }
      }

      // ── The shader pass ─────────────────────────────────────────────────────
      const src = riveCanvasRef.current
      // Only upload once the Rive canvas exists and has a real backing.
      if (src && src.width > 0 && src.height > 0) {
        // Size the display backing to the Rive canvas so passthrough is 1:1 (no
        // minification softness).
        if (canvas.width !== src.width || canvas.height !== src.height) {
          canvas.width = src.width
          canvas.height = src.height
        }

        gl.bindTexture(gl.TEXTURE_2D, g.texture)
        // The state machine repaints continuously, so upload every frame — this
        // is the live-Rive sampling the G1 probe proved, not the static-image
        // upload-on-change path.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
        gl.viewport(0, 0, canvas.width, canvas.height)
        // u_blocks is the shader's cell-count uniform; the control calls it
        // "cells across" in the UI. Same number, one name per layer.
        gl.uniform1f(g.uBlocks, cellsRef.current)
        gl.uniform1f(g.uGap, gapRef.current)
        const [b, gr, r] = platesRef.current // blue, green, red (PLATES order)
        gl.uniform2f(g.uOffB, b.off.x, b.off.y)
        gl.uniform2f(g.uOffG, gr.off.x, gr.off.y)
        gl.uniform2f(g.uOffR, r.off.x, r.off.y)
        gl.uniform1f(g.uSnap, snapRef.current ? 1 : 0)
        gl.uniform1f(g.uMaskAfter, maskGapsRef.current ? 1 : 0)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className={styles.embed}>
      <div
        className={styles.plantStage}
        style={aspect ? { '--plant-aspect': aspect } : undefined}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Layer order is load-bearing: Rive below (hit-testable, invisible),
            shader above (visible, pointer-transparent). No key: PlantRive
            rebinds the theme in place rather than remounting, so the machine
            keeps its state across a theme switch (see its header comment). */}
        <div className={styles.plantRive}>
          <PlantRive
            theme={theme}
            onCanvas={handleCanvas}
            onAspect={handleAspect}
            onReady={handleReady}
          />
        </div>
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className={styles.plantShader}
        />
      </div>

      {/* Embed-local controls. cells and gap are spatial grid vocabulary, not
          motion, so they stay here rather than crossing into the token rail
          (the Motion Tiles scoping call: one control vocabulary per tool). The
          sliders mirror Token Lab's SliderRow look and the segmented toggles
          mirror its easing-tab look — same classes, mirrored into this module —
          without SliderRow's active-token coupling, which is meaningless for a
          non-token control. */}
      <div className={styles.controls}>
        {error ? <p className={styles.status}>WebGL error: {error}</p> : null}
        {!ready ? <p className={styles.status}>Loading the plant…</p> : null}

        <div className={styles.sliderRow}>
          <div className={styles.sliderLabel}>
            <span className={styles.sliderName}>cells across</span>
            <span className={styles.sliderValue}>{cells}</span>
          </div>
          <input
            type="range"
            className={styles.slider}
            aria-label="cells across"
            min={8}
            max={240}
            step={1}
            value={cells}
            onChange={(e) => setCells(parseInt(e.target.value, 10))}
          />
        </div>

        <div className={styles.sliderRow}>
          <div className={styles.sliderLabel}>
            <span className={styles.sliderName}>cell gap</span>
            <span className={styles.sliderValue}>{Math.round(gap * 100)}%</span>
          </div>
          <input
            type="range"
            className={styles.slider}
            aria-label="cell gap"
            min={0}
            max={0.6}
            step={0.01}
            value={gap}
            onChange={(e) => setGap(parseFloat(e.target.value))}
          />
        </div>

        {/* The plate misregistration: smooth slides sub-cell, chunky snaps each
            plate's travel to whole cells (u_snap). */}
        <StateToggle
          label="Plate travel"
          value={snap}
          onLabel="Chunky"
          offLabel="Smooth"
          onToggle={() => setSnap((s) => !s)}
        />

        {/* The gutters: clean carves one screen-space grid after recombine,
            bleed lets each plate leave colour in the others' gaps (u_maskAfter). */}
        <StateToggle
          label="Cell gaps"
          value={maskGaps}
          onLabel="Clean"
          offLabel="Bleed"
          onToggle={() => setMaskGaps((m) => !m)}
        />
      </div>
    </div>
  )
}
