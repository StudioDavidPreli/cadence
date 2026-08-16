import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  useRive,
  useViewModel,
  useViewModelInstance,
} from '@rive-app/react-webgl2'
import { useTheme } from '../../context/ThemeContext'
import { riveFallbackSrc } from '../../utils/riveFallbacks'
import { useNavState } from '../../context/NavigationContext'
import { MOTION_TILES_GRID } from '../../data/navigation'
import { Modal } from '../Modal'
import styles from './BugReportButton.module.css'

// App-level bug-report affordance. It floats at the shell's bottom-right and opens
// the same minimal report dialog as the Motion Tiles "Problems?" button: the
// message posts to the /api/bug-report Worker route, which opens a GitHub issue
// server-side, so no email address ever ships to the client.
//
// This mirrors ProblemButton in MotionTiles/MotionTilesGrid.jsx, with two
// deliberate differences:
//   1. It is theme-bound, not preset-bound. The Motion Tiles button binds the
//      active motion preset (snappy/standard/cinematic) for palette; this one
//      binds the active display mode.
//   2. It lives at the app shell, fixed-positioned, rather than inside a panel.
//
// Runtime choice: @rive-app/react-webgl2, matching the Motion Tiles button. The
// webgl2 runtime is already justified on first paint by the landing hero, so an
// always-mounted button rides on a runtime that is loading anyway. (Since the
// 2026-07-17 single-runtime consolidation it is also the app's only runtime.)
const PROBLEM_SRC = '/titleSVGS/problembutton2.riv'
// Artboard name is camelCase with a capital B — verified against the .riv, not the
// lowercase spelling it is often referred to by. useRive silently renders nothing
// if the artboard name does not match exactly, so this casing is load-bearing.
const PROBLEM_ARTBOARD = 'problemButton2'
const PROBLEM_STATE_MACHINE = 'problemSM'
const PROBLEM_VIEW_MODEL = 'ProblemVM'

// problembutton2.riv authors one ProblemVM instance per theme, so — unlike the
// principle icons, which carry three instances (Dark/Light/Contrast) plus a
// runtime HC-dark color flip via useHCContrastColors — this button needs no flip.
// It binds the instance whose baked palette already matches the active display
// mode. All four themes are covered, so there is no fallback branch.
const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

// The Rive button itself. Chrome: it plays its own problemSM and binds the
// display-mode instance so its palette switches with the theme. The base (fill +
// rounded corners) is baked into the artboard, so the wrapping <button> is a bare
// click target with no frame of its own; its height follows the artboard's real
// aspect ratio at the fixed CSS width. The canvas keeps pointer events (no
// pointer-events:none) so problemSM runs its own hover-scale and pointer-down
// animation; the DOM click still bubbles up to the <button>, which opens the dialog.
function ProblemButton({ instanceName, onClick }) {
  const { theme } = useTheme()
  const [aspect, setAspect] = useState(null)
  // prefers-reduced-motion (2026-07-18): render the per-theme static SVG poster
  // instead of mounting the Rive canvas (upgrading the 2026-07-17 held-frame
  // freeze to a designed still). The wrapping <button> keeps the click and the
  // accessible name either way, so the report dialog opens identically.
  const reduce = useReducedMotion()

  return (
    <button
      type="button"
      className={styles.problemButton}
      style={aspect ? { '--problem-aspect': aspect } : undefined}
      onClick={onClick}
      aria-label="Report a problem"
    >
      {reduce ? (
        <img
          className={`${styles.problemCanvas} ${styles.fallbackImg}`}
          src={riveFallbackSrc('problems', theme)}
          alt=""
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget
            if (w > 0 && h > 0) setAspect(w / h)
          }}
        />
      ) : (
        <ProblemRive instanceName={instanceName} onAspect={setAspect} />
      )}
    </button>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed (the
// poster branch above never fetches the .riv). Same isolation rule as
// HeroAnimation/HeroRive.
function ProblemRive({ instanceName, onAspect }) {
  const { rive, RiveComponent } = useRive({
    src: PROBLEM_SRC,
    artboard: PROBLEM_ARTBOARD,
    stateMachines: PROBLEM_STATE_MACHINE,
    autoplay: false, // play once the theme instance is bound (same order as the tiles' buttons)
    autoBind: false, // we bind the theme instance ourselves so its baked palette applies
  })

  const viewModel = useViewModel(rive, { name: PROBLEM_VIEW_MODEL })
  const instance = useViewModelInstance(viewModel, { rive, name: instanceName })

  // Play once both the runtime and the theme instance are ready. instanceName
  // changes on a theme switch, so useViewModelInstance rebinds and this re-runs,
  // swapping the button's baked palette live.
  useEffect(() => {
    if (rive && instance) rive.play(PROBLEM_STATE_MACHINE)
  }, [rive, instance])

  // Derive the aspect ratio from the loaded artboard bounds (w/h). The CSS
  // fallback holds the box open until this resolves. Inline style sets ONLY the
  // custom property — no literal styling — the same convention the grid uses.
  useEffect(() => {
    if (!rive) return
    const b = rive.bounds
    if (!b) return
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    if (w > 0 && h > 0) onAspect(w / h)
  }, [rive, onAspect])

  return <RiveComponent className={styles.problemCanvas} />
}

export function BugReportButton() {
  const { theme } = useTheme()
  const { destination } = useNavState()
  const instanceName = themeToInstanceName[theme]

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  // Honeypot: kept empty by real users, so any value means a bot and the server
  // silently drops the report. State, not a ref, so React owns the input.
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
      // subdomain without knowing the origin. `tile` is the issue-title context;
      // the active display mode goes in so a theme-specific bug is traceable.
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tile: `Home (${theme})`, website }),
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

  // The button hides on the Motion Tiles grid: that section has its own in-grid
  // "Problems?" button, so an app-level one is redundant there, and dropping it
  // unmounts this button's webgl2 canvas while the heavy grid is up. The copyright
  // signature is not tied to the button, so it stays in the row and persists there.
  const showButton = destination !== MOTION_TILES_GRID

  return (
    <div className={styles.root}>
      {/* Privacy disclosure for the export/import counter (David's wording and
          placement, 2026-08-16; docs/decisions/event-counter-2026-08-15.md).
          Anchored to the row's left edge, under the tool-bar side of the
          window, while the © and button keep the right. It rides the footer
          row like the © line and, like it, persists on the Motion Tiles grid
          when the button hides: a site-level disclosure is not tied to the
          button. */}
      <span className={styles.privacy}>
        Exports and imports are counted anonymously.
      </span>
      <span className={styles.copyright}>© MMXXVI DAVID PRELI</span>

      {showButton && (
        <>
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
        </>
      )}
    </div>
  )
}
