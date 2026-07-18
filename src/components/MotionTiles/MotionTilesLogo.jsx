// The animated Motion Tiles title for the landing (the Motion Tiles overview). It
// replaces the plain text heading with motiontileslogooverview.riv, the same idea
// as the Token Lab title: the display word is the artwork, and React's only job is
// to bind the active theme. This mirrors TokenLabTitle deliberately, since that is
// the proven pattern for a themed title on the WebGL2 runtime.
//
// Runtime: authored for the Rive Renderer, so it loads on @rive-app/react-webgl2
// like the hero and the Token Lab title (and, since the 2026-07-17 single-runtime
// consolidation, every other Rive canvas in the app).
//
// Theme binding is the clean four-instance kind: the file carries one view model
// instance per theme (lightMode, darkMode, contrastLight, contrastDark), each with
// its own authored colors, so we bind the theme's own instance and write no colors
// at runtime (no shared Contrast instance, no stroke/fill flip).
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
import styles from './MotionTilesLogo.module.css'

// artboard / stateMachine / view model are the author's names in the file
// (confirmed against the .riv strings).
const TITLE_RIV = {
  src: '/riveTiles/motiontileslogooverview.riv',
  artboard: 'motionTilesLogoOverview',
  stateMachine: 'motionTilesLogoOverviewSM',
  viewModel: 'PathEffectVM',
}

// One instance per theme — a clean 1:1 map, no shared Contrast instance.
const themeToInstanceName = {
  light: 'lightMode',
  dark: 'darkMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function MotionTilesLogo() {
  const { theme } = useTheme()
  // prefers-reduced-motion (2026-07-18): render the per-theme static SVG poster
  // instead of mounting the Rive canvas, so the .riv is never fetched for users
  // who will never see it play. Same pattern as TokenLabTitle.
  const reduce = useReducedMotion()

  return (
    // The <h2> stays the section heading for the outline and AA: the visible word
    // is the canvas (aria-hidden), and the visually-hidden text carries the
    // accessible name, the same split TokenLabTitle and the Wordmark use.
    <h2 className={styles.title}>
      <span className={styles.srOnly}>Motion Tiles</span>
      <span className={styles.logoAnim} aria-hidden="true">
        {reduce ? (
          <img
            className={`${styles.canvas} ${styles.fallbackImg}`}
            src={riveFallbackSrc('motionTilesOverview', theme)}
            alt=""
          />
        ) : (
          <LogoRive theme={theme} />
        )}
      </span>
    </h2>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed (the
// poster branch above never fetches the .riv). Same isolation rule as
// TokenLabTitle/TitleRive.
function LogoRive({ theme }) {
  const { rive, RiveComponent } = useRive({
    src: TITLE_RIV.src,
    artboard: TITLE_RIV.artboard,
    stateMachines: TITLE_RIV.stateMachine,
    autoplay: true,
    autoBind: false,
    // The landing is a left-aligned reading column, so the title reads from the
    // left edge rather than centering in its box (Rive's default alignment).
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.CenterLeft }),
  })

  const viewModel = useViewModel(rive, { name: TITLE_RIV.viewModel })
  // { rive } makes the hook bind the instance and rebind when the theme (name)
  // changes — same fire-and-forget pattern as TokenLabTitle, no manual play gate.
  useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  return (
    <>
      {/* Fallback: until rive loads (or if the file is absent) the plain title
          text shows, so the landing is legible before the canvas paints and a
          missing asset degrades to text rather than an empty box. */}
      {!rive && <span className={styles.logoFallback}>Motion Tiles</span>}
      <RiveComponent className={styles.canvas} />
    </>
  )
}
