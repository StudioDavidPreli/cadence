// The animated "Token Lab" title for the guide (the Token Lab overview). It
// replaces the plain serif <h2> with tokenlabhero.riv, the same idea as the
// landing hero: the display word is the artwork, and React's only job is to
// bind the active theme.
//
// Runtime: tokenlabhero.riv is the sibling of hero3.riv and is authored for the
// Rive Renderer, so it loads on the WebGL2 runtime like HeroAnimation. This is
// the only other component on @rive-app/react-webgl2; every principle canvas
// stays on @rive-app/react-canvas. If the title area renders blank, the file was
// exported for the vector renderer instead: change the import below to
// '@rive-app/react-canvas' (no other change is needed).
//
// Theme binding differs from the principle files and the hero in one way that
// simplifies it: this file carries four view model instances (dark, light,
// contrastDark, contrastLight), one per theme, each with its own authored colors.
// So there is no shared 'Contrast' instance and no runtime stroke/fill flip
// (HeroAnimation and useHCContrastColors exist only because those files author a
// single Contrast instance for both high-contrast themes). Here we bind the
// theme's own instance and write no colors at all.
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
import styles from './TokenLabGuide.module.css'

// artboard / stateMachine / view model are the author's names in the file
// (confirmed against the .riv). The view model is 'TokenLabVM', not the
// 'ViewModel1' the principle files use.
const TITLE_RIV = {
  src: '/rive/tokenlabhero.riv',
  artboard: 'tokenLab',
  stateMachine: 'tokenLabSM',
}

// One instance per theme — a clean 1:1 map, no shared Contrast instance.
const themeToInstanceName = {
  dark: 'dark',
  light: 'light',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function TokenLabTitle() {
  const { theme } = useTheme()
  // prefers-reduced-motion: load the file but hold a static first frame instead
  // of playing, matching HeroAnimation and the principle demos' P17 behavior.
  const reduce = useReducedMotion()

  const { rive, RiveComponent } = useRive({
    src: TITLE_RIV.src,
    artboard: TITLE_RIV.artboard,
    stateMachines: TITLE_RIV.stateMachine,
    autoplay: !reduce,
    autoBind: false,
    // The guide is a left-aligned reading document, so the title reads from the
    // left edge rather than centering in its box (Rive's default alignment).
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.CenterLeft }),
  })

  const viewModel = useViewModel(rive, { name: 'TokenLabVM' })
  // { rive } makes the hook bind the instance and rebind when the theme (name)
  // changes — same pattern as HeroAnimation/RiveCanvas, no manual useEffect.
  useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  return (
    // The <h2> stays the document heading for the outline and AA: the visible
    // word is the canvas (aria-hidden), and the visually-hidden text carries the
    // accessible name, the same split the Wordmark uses for its inlined mark.
    <h2 className={styles.title}>
      <span className={styles.srOnly}>Token Lab</span>
      <span className={styles.titleAnim} aria-hidden="true">
        {/* Fallback: until rive loads (or if the file is absent) the plain
            title text shows, so the guide is legible before the canvas paints
            and a missing asset degrades to text rather than an empty box. */}
        {!rive && <span className={styles.titleFallback}>Token Lab</span>}
        <RiveComponent className={styles.titleCanvas} />
      </span>
    </h2>
  )
}
