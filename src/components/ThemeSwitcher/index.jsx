import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './ThemeSwitcher.module.css'

// Short button labels. The theme ids are the persisted/CSS values
// ('high-contrast-dark'); the switcher shows a compact label so four buttons fit
// the top-bar row. Falls back to the raw id if a theme has no entry.
const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark',
  'high-contrast-light': 'HC Light',
  'high-contrast-dark': 'HC Dark',
}

// ThemeSwitcher has no props — it reads everything it needs from context.
// This is what Context is for: a component that needs shared state but
// has no natural parent/child relationship with the state owner.
export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme()
  const tokens = useMotionTokens()

  return (
    <div className={styles.switcher}>
      {themes.map((t) => (
        <motion.button
          key={t}
          className={`${styles.themeButton} ${theme === t ? styles.active : ''}`}
          onClick={() => setTheme(t)}
          aria-label={`${THEME_LABELS[t] ?? t} theme`}
          whileTap={{
            scale: tokens.scale.pressBase,
            transition: { duration: tokens.duration.fast, ease: tokens.ease.standard },
          }}
        >
          {THEME_LABELS[t] ?? t}
        </motion.button>
      ))}
    </div>
  )
}
