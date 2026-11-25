// An In Practice leaf's animated title, on the display-title convention
// MeasureTitle follows: four authored per-theme instances of one view model, so
// React binds the active theme's instance and writes nothing (no shared
// Contrast instance, no HC flip, no color writes). The <h2> keeps the plain
// word as the accessible name; the canvas is aria-hidden.
//
// Each leaf passes its own file's names (`title`) and, where its artboard is
// not Basis's shape, its own box class.
//
// Reduced motion renders the per-theme SVG poster instead of mounting the
// canvas, so the .riv is never fetched for a visitor who will not see it play.
// On the motion path the same poster shows until the canvas has painted once,
// and stays if the file never loads.
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

const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function PracticeTitle({ title, boxClassName = styles.titleAnim }) {
  const { theme } = useTheme()
  const reduce = useReducedMotion()

  return (
    <h2 className={styles.title}>
      <span className={styles.srOnly}>{title.word}</span>
      <span className={boxClassName} aria-hidden="true">
        {reduce ? (
          <img
            className={styles.titleCanvas}
            src={riveFallbackSrc(title.surface, theme)}
            alt=""
          />
        ) : (
          <TitleRive title={title} theme={theme} />
        )}
      </span>
    </h2>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed.
function TitleRive({ title, theme }) {
  const { rive, RiveComponent } = useRive({
    src: title.src,
    artboard: title.artboard,
    stateMachines: title.stateMachine,
    autoplay: true,
    autoBind: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  const viewModel = useViewModel(rive, { name: title.viewModel })
  useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })
  const painted = useRivePainted(rive)

  return (
    <>
      {/* The poster until the canvas has painted, or for good if the file
          never loads. */}
      {!painted && <img className={styles.titlePoster} src={riveFallbackSrc(title.surface, theme)} alt="" />}
      <RiveComponent className={styles.titleCanvas} />
    </>
  )
}
