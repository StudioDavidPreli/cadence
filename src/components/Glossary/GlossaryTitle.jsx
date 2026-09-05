// The glossary's animated view titles: the pinball loop for Tokens
// (tokensTitles.riv, 2026-09-05) and the claw-builder loop for Components
// (componentsTitles.riv, 2026-09-04), both David's. One generic component,
// two thin exports: the files share a structure (a single ScriptedDrawable
// scene on a 480x216 artboard, four authored per-theme instances), so the
// React side is one implementation with two configs, the same reasoning that
// keeps the two vocabularies in one tokens package.
//
// Structure follows TokenLabTitle: the display word is the artwork, React's
// only job is to bind the active theme's instance (display-title convention:
// no shared Contrast instance, no HC flip, no color writes). The <h2> keeps
// the plain word as the accessible name; the canvas is aria-hidden.
//
// Centering is authored in the files, not aligned here: each scene carries an
// origin input the word is centered through (the pinball scene shipped 14px
// left of true center and its originX was set to 14 through the Rive MCP,
// 2026-09-05; the claw's titleX 7 centers its 467px mask as closely as the
// 8px cell grid allows). This component centers the MOUNT: the artboard's
// natural 480x216 box, margin auto, Fit.Contain, so the pixel-cell art
// renders 1:1 and crisp.
//
// Reduced motion renders the per-theme static SVG poster instead of mounting
// the canvas, so the .riv is never fetched for users who will never see it
// play. The pinball posters were exported before the originX fix and carry
// the same +14 shift, applied to their translate transforms directly.
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
import styles from './Glossary.module.css'

// The authors' names in the files, confirmed via the Rive MCP against the
// open editor documents and pinned by the rivlint manifest. `surface` is the
// poster filename prefix in /public/fallBacks.
const TITLES = {
  tokens: {
    word: 'Tokens',
    surface: 'tokens',
    src: '/rive/tokensTitles.riv',
    artboard: 'tokensTitles',
    stateMachine: 'tokensSM',
    viewModel: 'TokensTitleVM',
  },
  components: {
    word: 'Components',
    surface: 'components',
    src: '/rive/componentsTitles.riv',
    artboard: 'componentsTitles',
    stateMachine: 'componentsSM',
    viewModel: 'ComponentsTitleVM',
  },
}

const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

export function TokensTitle() {
  return <GlossaryTitle config={TITLES.tokens} />
}

export function ComponentsTitle() {
  return <GlossaryTitle config={TITLES.components} />
}

function GlossaryTitle({ config }) {
  const { theme } = useTheme()
  const reduce = useReducedMotion()

  return (
    <h2 className={styles.title}>
      <span className={styles.srOnly}>{config.word}</span>
      <span className={styles.titleAnim} aria-hidden="true">
        {reduce ? (
          <img
            className={styles.titleCanvas}
            src={riveFallbackSrc(config.surface, theme)}
            alt=""
          />
        ) : (
          <TitleRive config={config} theme={theme} />
        )}
      </span>
    </h2>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed (the
// poster branch never fetches the .riv).
function TitleRive({ config, theme }) {
  const { rive, RiveComponent } = useRive({
    src: config.src,
    artboard: config.artboard,
    stateMachines: config.stateMachine,
    autoplay: true,
    autoBind: false,
    // Centered, unlike TokenLabTitle's CenterLeft: these titles are centered
    // stages (David's spec), and the box already sits centered in the page.
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  const viewModel = useViewModel(rive, { name: config.viewModel })
  useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  return (
    <>
      {/* Until rive loads (or if the file is absent) the plain word shows,
          centered where the art will land, so the view is legible before the
          canvas paints and a missing asset degrades to text. */}
      {!rive && <span className={styles.titleFallback}>{config.word}</span>}
      <RiveComponent className={styles.titleCanvas} />
    </>
  )
}
