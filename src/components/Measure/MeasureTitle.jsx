// The Measure page's animated title (measureTitles.riv, David's, 2026-09-07),
// on the display-title convention the Glossary titles set: a single scene on
// a 480x216 artboard with four authored per-theme instances, so React binds
// the active theme's instance and writes nothing (no shared Contrast
// instance, no HC flip, no color writes). The <h2> keeps the plain word as
// the accessible name; the canvas is aria-hidden.
//
// Names were read from the file through the web runtime (rivlint manifest,
// regenerated 2026-09-07): artboard `measureTitles`, state machine
// `measureSM`, view model `MeasureTitleVM` with darkMode / lightMode /
// contrastLight / contrastDark. The Rive MCP was unreachable that session,
// so the manifest, not the editor, is the source.
//
// Centering: the mount is the artboard's natural 480x216 box, margin auto in
// the page measure, Fit.Contain + Alignment.Center, so the art renders 1:1
// and sits centered. Anything off-center inside the artboard is authored in
// the file, the way the Glossary scenes carry an origin input.
//
// Reduced motion renders the per-theme SVG poster (/fallBacks/measure*.svg)
// instead of mounting the canvas, so the .riv is never fetched for a user
// who will not see it play.
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
import styles from './Measure.module.css'

const TITLE = {
  word: 'Measure',
  surface: 'measure',
  src: '/rive/measureTitles.riv',
  artboard: 'measureTitles',
  stateMachine: 'measureSM',
  viewModel: 'MeasureTitleVM',
}

const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function MeasureTitle() {
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

  return (
    <>
      {/* The plain word until the canvas paints, or if the file is absent. */}
      {!rive && <span className={styles.titleFallback}>{TITLE.word}</span>}
      <RiveComponent className={styles.titleCanvas} />
    </>
  )
}
