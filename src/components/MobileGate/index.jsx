// MobileGate is the hard viewport gate. Below 720px the app shell does not
// render; App returns this instead (see App.jsx). No escape hatch: the tool is
// built for a desktop screen, and this states that plainly over the hero
// artwork. At or above 720px this never mounts and the shell renders as usual.
//
// This carries its OWN thin instance of the desktop hero's Rive wiring rather
// than reusing HeroAnimation, so the landing hero stays single-purpose (its
// layout and canonical description copy are wrong for the gate). It renders a
// mobile-specific asset — heromobile.riv, a shorter composition sized for a
// phone rather than the desktop hero3.riv — with the same Hero3ViewModel /
// theme-instance / reduced-motion contract as HeroAnimation, so keep the two in
// step if that view model or binding ever changes.
//
// Contract note (2026-07-18): David re-exported heromobile.riv with the same
// four homogenized instances as hero3.riv (darkMode / lightMode / contrastDark
// / contrastLight), so the old three-instance-plus-runtime-flip wiring is gone
// and the two heroes finally share one contract. The "make them match" landmine
// the docs warned about is retired.
//
// heromobile.riv is authored for the Rive Renderer, so it needs the WebGL2
// runtime, same as HeroAnimation. The gate and the desktop hero never co-mount
// (one is <720px, the other ≥720px), so their webgl2 canvases never share a
// moment on screen.
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
import { StudioLogoLink } from './StudioLogoLink'
import styles from './MobileGate.module.css'

// The mobile hero. Its own asset/artboard/state machine, but the same
// 'Hero3ViewModel' with the four homogenized theme instances as the desktop
// hero (bound below), so the theme wiring matches HeroAnimation exactly.
const HERO_RIV = { src: '/titleSVGS/heromobile.riv', artboard: 'heroMobile', stateMachine: 'heroMobileSM' }

// One instance per theme — a clean 1:1 map, no shared Contrast instance and no
// runtime stroke/fill flip. Mirrors HeroAnimation's map.
const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function MobileGate() {
  const { theme } = useTheme()

  // prefers-reduced-motion (2026-07-18): render the per-theme static SVG poster
  // instead of mounting the Rive canvas, same as HeroAnimation. Skips the .riv
  // fetch and the WebGL surface entirely for users who will never see motion.
  const reduce = useReducedMotion()

  // The artwork box follows the art's real aspect ratio so it fills the width
  // instead of contain-fitting to a strip (see .riveContainer). The Rive path
  // reads it from rive.bounds once loaded; the poster path reads it from the
  // SVG's natural size on load. Either setter feeds the same CSS var; the 2/1
  // fallback holds a landscape-ish box open until one resolves.
  const [aspect, setAspect] = useState(null)

  return (
    <div className={styles.gate}>
      {/* The one exit, at the top: a Studio David Preli title that links to
          davidpreli.com, so a phone visitor is not stranded. */}
      <StudioLogoLink />

      {/* Artwork. Its box follows the real aspect ratio (--gate-art-aspect) so
          the art fills the width instead of stranding a contain-fit strip in a
          tall column. The group centers as a whole. */}
      <div
        className={styles.riveContainer}
        style={aspect ? { '--gate-art-aspect': aspect } : undefined}
      >
        {reduce ? (
          <img
            className={`${styles.canvas} ${styles.fallbackImg}`}
            src={riveFallbackSrc('hero3Mobile', theme)}
            alt=""
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget
              if (w > 0 && h > 0) setAspect(w / h)
            }}
          />
        ) : (
          <MobileHeroRive theme={theme} onAspect={setAspect} />
        )}
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

// The Rive half, isolated so its hooks only run when motion is allowed: under
// reduce-motion the poster branch renders instead and the .riv is never
// fetched. Same isolation rule as HeroAnimation/HeroRive.
function MobileHeroRive({ theme, onAspect }) {
  const { rive, RiveComponent } = useRive({
    src: HERO_RIV.src,
    artboard: HERO_RIV.artboard,
    stateMachines: HERO_RIV.stateMachine,
    autoplay: true,
    autoBind: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  useEffect(() => {
    if (!rive) return
    const b = rive.bounds
    if (!b) return
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    if (w > 0 && h > 0) onAspect(w / h)
  }, [rive, onAspect])

  const viewModel = useViewModel(rive, { name: 'Hero3ViewModel' })
  // { rive } binds the theme's own homogenized instance and rebinds when the
  // theme changes. With per-theme instances there are no colors to write: the
  // old high-contrast-dark stroke/fill flip is retired with the 2026-07-18
  // re-export (see the contract note at the top of this file).
  useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  return (
    <>
      {/* Graceful fallback while the asset loads (or if it is absent): a quiet
          themed line the canvas paints over once it loads. Mirrors the hero. */}
      {!rive && <p className={styles.fallbackText}>Cadence</p>}
      <RiveComponent className={styles.canvas} />
    </>
  )
}
