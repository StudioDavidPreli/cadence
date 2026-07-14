import { useTheme } from '../../context/ThemeContext'
import styles from './MotionTilesTitle.module.css'

// The motion-tiles Cadence title set — one pre-themed SVG per theme (David's
// artwork). Unlike the app Wordmark (CSS-var fills), these are baked per theme, so
// we swap the file by theme rather than recolor at runtime. The SVGs are
// background-free, so the title sits directly on the top bar like the Wordmark.
//
// This lives in its own module, deliberately apart from MotionTilesGrid: the app
// shell imports it eagerly to replace the Wordmark in the top bar when the
// motion-tiles section is active. MotionTilesGrid is the React.lazy chunk that
// carries the @rive-app/react-webgl2 runtime; if the title were exported from
// there, importing it would pull that whole chunk into first paint. Kept separate,
// the title costs the shell one <img> and no runtime.
//
// Sized by height to match the Wordmark (48.2px) so the top-bar row height is
// unchanged when the title swaps in.
const TITLE_BY_THEME = {
  light: 'lightMode',
  dark: 'darkMode',
  'high-contrast-light': 'lightCon',
  'high-contrast-dark': 'darkCon',
}

export function MotionTilesTitle() {
  const { theme } = useTheme()
  const file = TITLE_BY_THEME[theme] ?? 'darkMode'
  return (
    <img
      className={styles.title}
      src={`/titleSVGS/motionTilesTitles/${file}.svg`}
      alt="Cadence Motion Tiles"
    />
  )
}
