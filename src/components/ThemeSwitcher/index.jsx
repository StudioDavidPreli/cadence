import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './ThemeSwitcher.module.css'

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
          whileTap={{
            scale: tokens.scale.base,
            transition: { duration: tokens.duration.fast, ease: tokens.ease.standard },
          }}
        >
          {t}
        </motion.button>
      ))}
    </div>
  )
}
