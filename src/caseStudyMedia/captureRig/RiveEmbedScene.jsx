import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRive, useViewModel, useViewModelInstance } from '@rive-app/react-webgl2'
import { useRiveSupersampling } from '../../hooks/useRiveSupersampling'
import { useHCContrastColors } from '../../hooks/useHCContrastColors'
import { useRiveAccentColor } from '../../hooks/useRiveAccentColor'
import { readCssColor } from '../../utils/cssColor'
import { Button } from '../../components/Button'
import { ScrambleCode } from './ScrambleCode'
import rigStyles from './CaptureRig.module.css'

// ─── RiveEmbedScene (V01 material, David's spec 2026-08-11) ──────────────────
//
// The React-to-Rive boundary, shown as code beside the canvas that code
// renders. Stepping the theme swaps one string in the source and recolors the
// art in the same beat: the view model instance rebinds, and the two trailing
// comments in the block change to the values that drove it. That wire is the
// whole clip. Nothing else in frame moves.
//
// The composition answers the plate David measured off riveBlockReference.png:
// the red area is 1728 x 864, centered in a 1920 x 1080 frame (x 96, y 108).
// Landscape 2:1, so code and canvas sit side by side rather than stacking the
// way the export plate does.
//
// Transparency. The container is semi-transparent in the composite because it
// sits over an animated background; the code panel and the canvas are opaque.
// A browser screen recording has no alpha channel, so the rig cannot hand over
// a translucent plate. It offers three backdrops instead (BACKDROP below) and
// the recommended take is 'key' with CONTAINER_TINT off: only the two opaque
// panels carry pixels, the flat color keys out clean, and the tint gets drawn
// in the composite as a shape layer under them. Keying a semi-transparent
// surface is the one path that cannot be recovered cleanly, so the rig avoids
// asking for it.
//
// Why the canvas is a rig-local copy of the boundary rather than the shipped
// PrincipleIcon: PrincipleIcon reads the theme from context, and both providers
// that supply it write document.documentElement. Flipping the document would
// recolor the code panel and the plate along with the art, which is a different
// clip (the site has themes) and would make the container drift against the
// background it is composited over. Taking `theme` as a prop keeps the flip
// scoped to the one thing the code block is about. The lines below are a
// faithful transcription of PrincipleIcon/index.jsx; if that file's binding
// changes, this copy and CODE_LINES both follow.

// ── Take knobs ──────────────────────────────────────────────────────────────
// PLATE comes from the reference frame. Do not change it without re-measuring
// riveBlockReference.png.
const PLATE = { w: 1728, h: 864 }
// Outlines the plate so the crop is unambiguous. Off for the real take.
const SHOW_CROP_GUIDE = true
// What fills the rig window behind the plate.
//   'key'     flat chroma for pulling a matte in the composite (the real take)
//   'checker' alpha checkerboard, so the container tint is legible while framing
//   'page'    the theme's own background
const BACKDROP = 'checker'
// The key color. Magenta rather than green: none of the four themes, the syntax
// palette, or the hand-drawn Rive art carries a magenta, so nothing in frame
// falls into the matte.
const KEY_COLOR = '#ff00ff'
// Container tint, 0 to 1. 0 leaves the container empty so only the code panel
// and the canvas carry pixels, the recommended state for a keyed take, because
// the tint then belongs to the composite and stays adjustable there.
const CONTAINER_TINT = 0.55
// Canvas column. Square, so the icon's 1:1 art fills it without letterboxing.
const CANVAS_SIZE = 640
// The code panel is rig furniture, so it sets type directly rather than being
// scaled. Two constraints set this number, and both are tight enough that the
// scene measures itself at mount rather than trusting the arithmetic (see
// `overflowing` below).
//   Height: 28 lines at 16 x 1.5 is 672, and the panel's box is the plate
//           height less its padding, 864 - 96 = 768, less 56 of its own.
//   Width:  the block is padded to 72 characters, and mono advance is about
//           0.6em, so 72 x 9.6 = 691 inside a column of 944 - 64.
const CODE_FONT_PX = 16
const CODE_LINE_HEIGHT = 1.5
// Rest on each theme before the auto-cycle steps. Longer than the export
// scene's: the art has to finish recoloring and be read before it moves on.
const HOLD_MS = 3400
// Total length of one scramble-to-snap transition. Shorter than the export
// scene's 700ms because only two short spans of the block actually change.
const SCRAMBLE_MS = 520
const SETTLE_SPAN = 0.35
const SCRAMBLE_FPS = 24
// Characters shared between the old and new text hold still, which here is
// nearly the whole block: only the three comment values churn.
const HOLD_MATCHING = true

// The theme cycle. All four, in an order that exercises both binding paths the
// code shows: dark → light → high-contrast-light rebinds the instance by name,
// and high-contrast-light → high-contrast-dark keeps the same 'Contrast'
// instance and flips its colors through useHCContrastColors. That contrast is
// the reason the hook exists, so the cycle demonstrates it rather than
// asserting it.
const THEME_CYCLE = ['dark', 'light', 'high-contrast-light', 'high-contrast-dark']

// The same map the shipped component carries.
const themeToInstanceName = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast-light': 'Contrast',
  'high-contrast-dark': 'Contrast',
}

const ICON_SRC = '/rive/principles_icon11.riv'
const ICON_SM = 'solidDrawingIconSM'

// ── The code block ──────────────────────────────────────────────────────────
// Column the trailing comments start at, and the width every line is padded to.
// Constant line length is what keeps the block from reflowing when a comment
// value grows: 'dark' (4) and 'high-contrast-light' (19) leave the row the same
// width, so the scramble is glyph churn in place and never a shifting panel.
const COMMENT_COL = 46
const LINE_WIDTH = 72

const comment = (code, value) =>
  `${code.padEnd(COMMENT_COL)}// '${value}'`.padEnd(LINE_WIDTH)

// An excerpt, flattened out of the RiveIcon function body so the block is about
// the hook calls and not about React plumbing around them.
//
// `accentHex` is the value the accent hook actually wrote on this step, read
// back out of the DOM rather than restated here. That matters more than it
// looks: the comment beside a line claiming to write --color-accent has to BE
// --color-accent, or the clip is a diagram of itself.
function codeFor(theme, accentHex) {
  return [
    `// PrincipleIcon.jsx: where React hands a theme to Rive`,
    `const themeToInstanceName = {`,
    `  dark: 'Dark',`,
    `  light: 'Light',`,
    `  'high-contrast-light': 'Contrast',`,
    `  'high-contrast-dark': 'Contrast',`,
    `}`,
    ``,
    comment(`const { theme } = useTheme()`, theme),
    ``,
    `const { rive, RiveComponent } = useRive({`,
    `  src: '${ICON_SRC}',`,
    `  stateMachines: '${ICON_SM}',`,
    `  autoplay: true,`,
    `  autoBind: false,`,
    `})`,
    `useRiveSupersampling(rive)`,
    ``,
    `const viewModel = useViewModel(rive, { name: 'ViewModel1' })`,
    ``,
    `const instance = useViewModelInstance(viewModel, {`,
    comment(`  name: themeToInstanceName[theme],`, themeToInstanceName[theme]),
    `  rive,`,
    `})`,
    `useHCContrastColors(instance, theme)`,
    comment(`useRiveAccentColor(instance, theme)`, accentHex),
    ``,
    `return <RiveComponent className={styles.riveCanvas} />`,
  ].join('\n')
}

// A stand-in only for measuring: the real hex is read from the DOM at render.
// Six f's so the placeholder is the widest a hex can be and the line count and
// charset can never come out short.
const HEX_PLACEHOLDER = '#ffffff'

const VISIBLE_LINES = codeFor('dark', HEX_PLACEHOLDER).split('\n').length

// Noise alphabet, measured from the four texts this block actually takes rather
// than invented, the same reasoning ScrambleCode's export charset carries, so
// scrambled rows still look like the thing they are turning into. The space is
// excluded because a space in the noise reads as a hole in the row.
//
// The hex digits are unioned in explicitly because the accent values are read
// at render and are not available here. Without them the churn under a
// changing accent would be drawn from an alphabet that contains none of the
// characters it is turning into.
const CHARSET = [
  ...new Set(
    THEME_CYCLE.map((t) => codeFor(t, HEX_PLACEHOLDER)).join('').replace(/\s/g, '') +
      '#0123456789abcdef',
  ),
].join('')

// ── The canvas ──────────────────────────────────────────────────────────────
// A transcription of PrincipleIcon's RiveIcon boundary with `theme` as a prop
// instead of a context read. See the header for why the rig does not mount the
// shipped component here.
function RiveIcon({ theme, scope }) {
  const { rive, RiveComponent } = useRive({
    src: ICON_SRC,
    stateMachines: ICON_SM,
    autoplay: true,
    autoBind: false,
  })

  // 2x supersampling: the webgl2 renderer's MSAA is coarser than the browser's
  // 2D rasterizer on this thin-stroke art, and this canvas is 640px.
  useRiveSupersampling(rive)

  const viewModel = useViewModel(rive, { name: 'ViewModel1' })
  const instance = useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })
  useHCContrastColors(instance, theme)
  // `scope` is the canvas panel, which carries this scene's mirrored accent
  // tokens. The document root would report the rig's own theme instead of the
  // one the canvas is currently bound to.
  useRiveAccentColor(instance, theme, scope)

  return <RiveComponent className={rigStyles.riveCanvas} />
}

export function RiveEmbedScene() {
  const [index, setIndex] = useState(0)
  const [running, setRunning] = useState(false)

  // The panel clips what does not fit, and a clipped block is a ruined take
  // that looks fine in the viewfinder: the first and last rows are the ones
  // that go, and neither is where the eye is. So the scene measures itself and
  // says so in the operator strip. Both axes: `pre` rows overflow horizontally
  // without wrapping, which is just as silent.
  const codeRef = useRef(null)
  const [overflow, setOverflow] = useState(null)

  // The canvas panel, captured with a callback ref (the same way DemoArea takes
  // its overlay node) because two things downstream need the element itself,
  // not just a handle to it: the accent hook reads the scoped token off it, and
  // the code block prints the value that read produced.
  const [panelNode, setPanelNode] = useState(null)

  const step = () => setIndex((i) => (i + 1) % THEME_CYCLE.length)

  useEffect(() => {
    if (!running) return
    const id = setInterval(step, HOLD_MS)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setRunning((r) => !r)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const theme = THEME_CYCLE[index]

  // The accent the hook will write on this step, read from the same element
  // and the same token the hook reads, so the comment in the block cannot
  // claim a color the canvas did not get. Read AFTER commit, in a layout
  // effect: during the render that steps `theme`, panelNode still carries the
  // PREVIOUS committed data-theme (attributes update at commit), so the
  // original render-phase read printed the previous theme's accent for the
  // whole beat — permanently one theme behind, with nothing arriving later to
  // correct it. Theme and hex land in ONE state so the code text still changes
  // once per step; a lone hex state arriving a commit later would read to
  // ScrambleCode as a second text change and scramble twice. Layout effect,
  // not effect, so the corrected text commits before paint.
  const [palette, setPalette] = useState(null)
  useLayoutEffect(() => {
    if (!panelNode) return
    const accent = readCssColor('--color-accent', panelNode)
    setPalette({
      theme,
      hex: `#${[accent.r, accent.g, accent.b].map((c) => c.toString(16).padStart(2, '0')).join('')}`,
    })
  }, [theme, panelNode])

  // The clipping self-check, re-measured every beat (palette in deps): at
  // first commit palette is null and the code block is not mounted, so a
  // mount-only measure read an empty panel and the warning could never fire.
  // Per-beat re-measures also catch a clip that only one theme's longest line
  // produces.
  useLayoutEffect(() => {
    const el = codeRef.current
    if (!el) return
    const dy = el.scrollHeight - el.clientHeight
    const dx = el.scrollWidth - el.clientWidth
    setOverflow(dy > 1 || dx > 1 ? { dy, dx } : null)
  }, [palette])

  // The canvas panel carries the theme's own background, because that is what
  // the art was authored against: the Light instance on a dark plate would read
  // as a bug rather than as a theme. It writes data-theme on itself rather than
  // on the document, so the code panel and the container stay put.
  return (
    <div className={rigStyles.stage}>
      {/* Above the crop line: frame the recording on the plate below. */}
      <header className={rigStyles.hint}>
        capture rig · rive-embed · Space {running ? 'stops' : 'starts'} the cycle · or step below ·
        plate {PLATE.w}×{PLATE.h} centered in 1920×1080 · backdrop {BACKDROP}
        {overflow && (
          <strong className={rigStyles.overflowWarn}>
            {' '}· code panel clips: {overflow.dy > 1 ? `${overflow.dy}px tall` : ''}
            {overflow.dy > 1 && overflow.dx > 1 ? ' and ' : ''}
            {overflow.dx > 1 ? `${overflow.dx}px wide` : ''} · lower CODE_FONT_PX
          </strong>
        )}
      </header>

      <div className={rigStyles.triggerRow}>
        <span className={rigStyles.compareSub}>theme</span>
        <Button onClick={step}>{theme}</Button>
      </div>

      <div className={`${rigStyles.plateWrap} ${rigStyles[`backdrop_${BACKDROP}`]}`}
           style={{ '--key-color': KEY_COLOR }}>
        <div
          className={`${rigStyles.rivePlate} ${SHOW_CROP_GUIDE ? rigStyles.plateGuide : ''}`}
          style={{
            width: PLATE.w,
            height: PLATE.h,
            '--container-tint': CONTAINER_TINT,
          }}
        >
          <div
            ref={codeRef}
            className={rigStyles.riveCodePanel}
            style={{ fontSize: `${CODE_FONT_PX}px`, lineHeight: CODE_LINE_HEIGHT }}
          >
            {/* Held back until the palette has been read off the committed
                panel (one render after the callback ref lands). Mounting
                sooner would show a block with no hex in it, and ScrambleCode
                would then read the arriving hex as a text change and run a
                transition nobody asked for, at mount, before the operator has
                framed anything. */}
            {palette && (
              <ScrambleCode
                text={codeFor(palette.theme, palette.hex)}
                language="jsx"
                charset={CHARSET}
                visibleLines={VISIBLE_LINES}
                scrambleMs={SCRAMBLE_MS}
                settleSpan={SETTLE_SPAN}
                scrambleFps={SCRAMBLE_FPS}
                holdMatching={HOLD_MATCHING}
              />
            )}
          </div>

          <div
            ref={setPanelNode}
            className={rigStyles.riveCanvasPanel}
            data-theme={theme}
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
          >
            <RiveIcon theme={theme} scope={panelNode} />
          </div>
        </div>
      </div>
    </div>
  )
}
