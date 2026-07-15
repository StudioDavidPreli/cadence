// MobileGate is the hard viewport gate. Below 720px the app shell does not
// render; App returns this instead (see App.jsx). No escape hatch: the tool is
// built for a desktop screen, and this states that plainly over the hero
// artwork. At or above 720px this never mounts and the shell renders as usual.
//
// This carries its OWN thin instance of the hero3.riv wiring rather than reusing
// HeroAnimation, so the landing hero stays single-purpose (its layout and
// canonical description copy are wrong for the gate). The Rive/theme/reduced-
// motion handling below is a deliberate mirror of HeroAnimation — keep the two
// in step if hero3's view model or binding ever changes.
//
// hero3.riv is authored for the Rive Renderer, so it needs the WebGL2 runtime,
// same as HeroAnimation. This is the only other component on
// @rive-app/react-webgl2; the gate and the hero never co-mount (one is <720px,
// the other ≥720px), so the two webgl2 canvases never share a moment on screen.
import { useEffect, useState } from 'react'
import {
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceColor,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-webgl2'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { StudioLogoLink } from './StudioLogoLink'
import styles from './MobileGate.module.css'

// Same asset, artboard, state machine, and view model as HeroAnimation.
const HERO_RIV = { src: '/rive/hero3.riv', artboard: 'Hero3', stateMachine: 'hero3SM' }

// Both high-contrast themes bind the single 'Contrast' instance; high-contrast-
// dark flips its stroke/fill at runtime (see the effect below). Mirrors the map
// in HeroAnimation.
const themeToInstanceName = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast-light': 'Contrast',
  'high-contrast-dark': 'Contrast',
}

export function MobileGate() {
  const { theme } = useTheme()

  // Match the hero: honor prefers-reduced-motion the same way, via framer-
  // motion's hook (NOT the MotionTokens provider, which governs token durations,
  // not this Rive autoplay). Load the file but hold a static first frame.
  const reduce = useReducedMotion()

  // Size the artwork box to the artboard's real aspect ratio, read once the file
  // loads (the fallback ratio holds the box open until then). This is the same
  // rive.bounds → aspect-ratio pattern EnterGridButton and the grid logo use: it
  // lets the art fill its box at full width instead of contain-fitting to a small
  // strip stranded in a tall column. The 2/1 fallback is landscape-ish so the
  // pre-load box is roughly the right shape.
  const [aspect, setAspect] = useState(null)

  const { rive, RiveComponent } = useRive({
    src: HERO_RIV.src,
    artboard: HERO_RIV.artboard,
    stateMachines: HERO_RIV.stateMachine,
    autoplay: !reduce,
    autoBind: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  useEffect(() => {
    if (!rive) return
    const b = rive.bounds
    if (!b) return
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    if (w > 0 && h > 0) setAspect(w / h)
  }, [rive])

  const viewModel = useViewModel(rive, { name: 'Hero3ViewModel' })
  const instance = useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  // high-contrast-dark flips the shared 'Contrast' instance's stroke/fill,
  // through webgl2's own color hook (this instance comes from the webgl2
  // runtime). Identical logic to HeroAnimation.
  const stroke = useViewModelInstanceColor('colorPropertyStroke', instance)
  const fill = useViewModelInstanceColor('colorPropertyFill', instance)
  useEffect(() => {
    if (!instance) return
    if (theme === 'high-contrast-dark') {
      stroke.setRgb(255, 255, 255)
      fill.setRgb(0, 0, 0)
    } else if (theme === 'high-contrast-light') {
      stroke.setRgb(0, 0, 0)
      fill.setRgb(255, 255, 255)
    }
    // Setter objects are re-created each render; theme + instance are the
    // meaningful triggers (writes are idempotent). Same reasoning as the hero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, theme])

  return (
    <div className={styles.gate}>
      {/* The one exit, at the top: a Studio David Preli title that links to
          davidpreli.com, so a phone visitor is not stranded. */}
      <StudioLogoLink />

      {/* Rive artwork. Its box follows the artboard's real aspect ratio
          (--gate-art-aspect) so the art fills the width instead of stranding a
          contain-fit strip in a tall column. The group centers as a whole. */}
      <div
        className={styles.riveContainer}
        style={aspect ? { '--gate-art-aspect': aspect } : undefined}
      >
        {/* Graceful fallback while the asset loads (or if it is absent): a quiet
            themed line the canvas paints over once it loads. Mirrors the hero. */}
        {!rive && <p className={styles.fallbackText}>Cadence</p>}
        <RiveComponent className={styles.canvas} />
      </div>

      {/* Approved gate copy, verbatim. No "continue anyway" into the app — the
          gate is hard; the only way onward is out to the studio, above. */}
      <p className={styles.copy}>
        Cadence is a motion design system explorer. The tooling wants a desktop
        screen. Open this on your computer and everything will be where it should
        be.
      </p>
    </div>
  )
}
