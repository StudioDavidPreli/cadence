// The rivLint page's animated title (rivlintTitles.riv, David's, 2026-09-08),
// on the display-title convention the Glossary titles set and Measure
// followed: a single scene on a 480x216 artboard with four authored
// per-theme instances, so React binds the active theme's instance and writes
// nothing (no shared Contrast instance, no HC flip, no color writes). The
// <h2> keeps the plain word as the accessible name; the canvas is aria-hidden.
// The art sets the word as ".rivLint"; the accessible name is "rivLint".
//
// Names were read from the file through the web runtime (the item 9 probe
// harness, then the rivlint manifest regenerated the same day): artboard
// `rivLintTitles`, state machine `rivLintSM`, view model `RivLintTitleVM`
// with darkMode / lightMode / contrastLight / contrastDark.
//
// Centering follows Measure: the mount is the artboard's natural 480x216
// box, margin auto in the page measure, Fit.Contain + Alignment.Center, so
// the art renders 1:1 and sits centered.
//
// Reduced motion renders the per-theme SVG poster (/fallBacks/lint*.svg)
// instead of mounting the canvas, so the .riv is never fetched for a user
// who will not see it play. Unlike Measure's title there is no `still`: the
// page reads a file inside the WASM runtime on the main thread, which holds
// every canvas for the same milliseconds anyway, and nothing here presents
// video frames the title could compete with.
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
import styles from './RivLint.module.css'

const TITLE = {
  word: 'rivLint',
  surface: 'lint',
  src: '/rive/rivlintTitles.riv',
  artboard: 'rivLintTitles',
  stateMachine: 'rivLintSM',
  viewModel: 'RivLintTitleVM',
}

const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function RivLintTitle() {
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
