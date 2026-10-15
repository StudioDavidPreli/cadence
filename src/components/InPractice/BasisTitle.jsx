// The Basis page's animated title (basistitles.riv, David's, 2026-10-15), on
// the display-title convention MeasureTitle follows: four authored per-theme
// instances of one view model, so React binds the active theme's instance and
// writes nothing (no shared Contrast instance, no HC flip, no color writes).
// The <h2> keeps the plain word as the accessible name; the canvas is
// aria-hidden.
//
// Names were read from the file's own contents and are pinned by the rivLint
// contract manifest (e2e/rivlint/manifest.json): artboard `basisTitles`, state
// machine `basisSM`, view model `BasisTitleVM` with darkMode / lightMode /
// contrastLight / contrastDark. The file name is all lowercase
// (`basistitles.riv`), unlike the camelCase titles beside it; the URL below
// matches the file on disk, and the Worker serves paths case-sensitively.
//
// Sizing: the artboard is 1360x506, authored large. The box shows it at
// 480 px wide, the width the Measure and rivLint titles occupy, so the three
// pages read as one family; Fit.Contain scales the art into that box.
//
// Reduced motion renders the per-theme SVG poster (/fallBacks/basisTitle*.svg)
// instead of mounting the canvas, so the .riv is never fetched for a visitor
// who will not see it play. On the motion path the same poster shows until
// the canvas has painted once, and stays if the file never loads.
import {
  useRive,
  useViewModel,
  useViewModelInstance,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-webgl2'
import { useReducedMotion } from 'framer-motion'
import { useRivePainted } from '../../hooks/useRivePainted'
import { useTheme } from '../../context/ThemeContext'
import { riveFallbackSrc } from '../../utils/riveFallbacks'
import styles from './InPractice.module.css'

const TITLE = {
  word: 'Basis',
  surface: 'basisTitle',
  src: '/rive/basistitles.riv',
  artboard: 'basisTitles',
  stateMachine: 'basisSM',
  viewModel: 'BasisTitleVM',
}

const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function BasisTitle() {
  const { theme } = useTheme()
  const reduce = useReducedMotion()

  return (
    <h2 className={styles.title}>
      <span className={styles.srOnly}>{TITLE.word}</span>
      <span className={styles.titleAnim} aria-hidden="true">
        {reduce ? (
          <img
            className={styles.titleCanvas}
            src={riveFallbackSrc(TITLE.surface, theme)}
            alt=""
          />
        ) : (
          <TitleRive theme={theme} />
        )}
      </span>
    </h2>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed.
function TitleRive({ theme }) {
  const { rive, RiveComponent } = useRive({
    src: TITLE.src,
    artboard: TITLE.artboard,
    stateMachines: TITLE.stateMachine,
    autoplay: true,
    autoBind: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  const viewModel = useViewModel(rive, { name: TITLE.viewModel })
  useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })
  const painted = useRivePainted(rive)

  return (
    <>
      {/* The poster until the canvas has painted, or for good if the file
          never loads. */}
      {!painted && <img className={styles.titlePoster} src={riveFallbackSrc(TITLE.surface, theme)} alt="" />}
      <RiveComponent className={styles.titleCanvas} />
    </>
  )
}
