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
import styles from './EnterGridButton.module.css'

// The landing's "Enter the grid" call to action, authored as a looping Rive
// animation (enterthegrid.riv) instead of text and themed per display mode. Same
// theme-binding pattern as MotionTilesLogo / TokenLabTitle, wrapped in a real
// <button>:
//   - the canvas is the visible label and receives pointer events, so the SM's
//     hover scale (added 2026-07-16) runs; clicks still bubble to the <button>
//   - the button keeps a text accessible name (aria-label) and a plain-text
//     fallback until the canvas paints, so it degrades to a readable button if the
//     .riv is slow or absent
//   - four theme instances, one per display mode, bound and rebound by theme
//   - autoplay gated on prefers-reduced-motion, holding a static frame
const RIV = {
  src: '/riveTiles/enterthegrid.riv',
  artboard: 'enterTheGrid',
  stateMachine: 'enterTheGridSM',
  viewModel: 'EnterButtonVM',
}

// One instance per theme — a clean 1:1 map, no shared Contrast instance.
const themeToInstanceName = {
  light: 'lightMode',
  dark: 'darkMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function EnterGridButton({ onEnter }) {
  const { theme } = useTheme()
  // prefers-reduced-motion (2026-07-18): render the per-theme static SVG poster
  // instead of mounting the Rive canvas. The wrapping <button> keeps the click
  // and the accessible name either way, so Enter behaves identically.
  const reduce = useReducedMotion()
  // Size the button to the artwork's real aspect ratio: the height is fixed in
  // CSS, the width follows the ratio (the 4/1 fallback holds the box open until
  // it resolves). The Rive path reads it from rive.bounds; the poster path
  // reads it from the SVG's natural size on load. Same pattern as MobileGate.
  const [aspect, setAspect] = useState(null)

  return (
    <button
      type="button"
      className={styles.button}
      style={aspect ? { '--enter-aspect': aspect } : undefined}
      onClick={onEnter}
      aria-label="Enter the grid"
    >
      {reduce ? (
        <img
          className={`${styles.canvas} ${styles.fallbackImg}`}
          src={riveFallbackSrc('enter', theme)}
          alt=""
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget
            if (w > 0 && h > 0) setAspect(w / h)
          }}
        />
      ) : (
        <EnterRive theme={theme} onAspect={setAspect} />
      )}
    </button>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed (the
// poster branch above never fetches the .riv). Same isolation rule as
// HeroAnimation/HeroRive.
function EnterRive({ theme, onAspect }) {
  const { rive, RiveComponent } = useRive({
    src: RIV.src,
    artboard: RIV.artboard,
    stateMachines: RIV.stateMachine,
    autoplay: true,
    autoBind: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  const viewModel = useViewModel(rive, { name: RIV.viewModel })
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
      {!rive && (
        <span className={styles.fallback} aria-hidden="true">
          Enter the grid
        </span>
      )}
      <RiveComponent className={styles.canvas} />
    </>
  )
}
