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
// who will not see it play. On the motion path the same poster shows until
// the canvas has painted once, and stays if the file never loads (David's
// call, 2026-09-08; the plain word was the stand-in before).
//
// `still` pauses the scene while the page is measuring. The video decoder
// reads presented frames, and a canvas redrawing at 60fps competes with the
// presenter for the compositor: under software WebGL (headless Chromium,
// and any machine without a usable GPU) the running title dropped nearly
// half the frames of a 17 kB recording, and its poster dropped none. A
// measurement tool that animates during a measurement would be measuring
// itself; the title holds while the work runs and resumes after.
import { useEffect } from 'react'
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

export function MeasureTitle({ still = false }) {
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
          <TitleRive theme={theme} still={still} />
        )}
      </span>
    </h2>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed.
function TitleRive({ theme, still }) {
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

  // Hold the scene while a measurement runs; resume when it is done. The
  // runtime keeps the last frame on the canvas while paused, so the title
  // stays visible, just still.
  useEffect(() => {
    if (!rive) return
    if (still) rive.pause()
    else rive.play()
  }, [rive, still])
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
