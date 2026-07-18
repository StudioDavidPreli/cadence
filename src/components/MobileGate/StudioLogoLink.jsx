// The studio logo at the foot of the mobile gate: a Studio David Preli title
// animation that links out to davidpreli.com. The gate is a hard stop for phone
// visitors — this is the one way onward, out to the studio home, not into the
// desktop-only app. Its own component (not a second useRive inside MobileGate)
// so this canvas keeps the Rive-hook isolation the rest of the app uses.
//
// Runtime: singlelinelogo.riv is authored for the Rive Renderer, so it loads on
// @rive-app/react-webgl2, same as the gate's hero3. The two webgl2 canvases
// co-mount here; that is fine (the Motion Tiles grid mounts many at once).
import { useEffect, useState } from 'react'
import {
  useRive,
  useViewModel,
  useViewModelInstance,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-webgl2'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { riveFallbackSrc } from '../../utils/riveFallbacks'
import styles from './MobileGate.module.css'

const LOGO_RIV = {
  src: '/titleSVGS/singlelinelogo.riv',
  artboard: 'singleLineLogo',
  stateMachine: 'singleLineLogoSM',
  viewModel: 'SingleLineLogoVM',
}

// Four distinct instances, one per display mode — so unlike hero3 (which shares
// one 'Contrast' instance and flips its colors at runtime), each theme just binds
// its own instance and no color write is needed.
const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

// Same tab: a phone visitor is leaving Cadence (unusable at this width) for the
// studio home, so there is nothing here to keep a tab open for.
const STUDIO_URL = 'https://davidpreli.com'

export function StudioLogoLink() {
  const { theme } = useTheme()
  // prefers-reduced-motion (2026-07-18): render the per-theme static SVG poster
  // instead of mounting the Rive canvas, same as the gate's hero. The anchor
  // keeps its href and accessible name either way.
  const reduce = useReducedMotion()

  // Size the link to the artboard's real aspect ratio (the 4/1 fallback holds a
  // wide single-line box open until it resolves). The Rive path reads it from
  // rive.bounds; the poster path reads it from the SVG's natural size on load.
  // Same pattern as the gate hero and the Enter button.
  const [aspect, setAspect] = useState(null)

  return (
    <a
      className={styles.studioLink}
      href={STUDIO_URL}
      style={aspect ? { '--studio-aspect': aspect } : undefined}
      aria-label="Visit Studio David Preli at davidpreli.com"
    >
      {reduce ? (
        <img
          className={`${styles.studioCanvas} ${styles.fallbackImg}`}
          src={riveFallbackSrc('singleLineLogo', theme)}
          alt=""
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget
            if (w > 0 && h > 0) setAspect(w / h)
          }}
        />
      ) : (
        <StudioRive theme={theme} onAspect={setAspect} />
      )}
    </a>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed (the
// poster branch above never fetches the .riv). Same isolation rule as
// MobileGate/MobileHeroRive.
function StudioRive({ theme, onAspect }) {
  const { rive, RiveComponent } = useRive({
    src: LOGO_RIV.src,
    artboard: LOGO_RIV.artboard,
    stateMachines: LOGO_RIV.stateMachine,
    autoplay: true,
    autoBind: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  const viewModel = useViewModel(rive, { name: LOGO_RIV.viewModel })
  // { rive } binds the instance and rebinds when the theme (name) changes.
  useViewModelInstance(viewModel, { name: themeToInstanceName[theme], rive })

  useEffect(() => {
    if (!rive) return
    const b = rive.bounds
    if (!b) return
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    if (w > 0 && h > 0) onAspect(w / h)
  }, [rive, onAspect])

  return (
    <>
      {/* Text stand-in until the canvas paints (or if the .riv is absent), so the
          link is legible immediately and a missing asset still reads as a link. */}
      {!rive && (
        <span className={styles.studioFallback} aria-hidden="true">
          Studio David Preli
        </span>
      )}
      {/* pointer-events: none so the click reaches the anchor, never Rive's own
          pointer handling on the canvas. The logo animates on its own. */}
      <RiveComponent className={styles.studioCanvas} />
    </>
  )
}
