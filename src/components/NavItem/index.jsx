import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './NavItem.module.css'

// NavItem renders as a <button> while routing is absent.
// When react-router is added, this should become <Link> or accept an `as` prop
// so it renders as an <a> with a proper href.
export function NavItem({ label, isActive = false, className = '', ...props }) {
  const tokens = useMotionTokens()

  return (
    <motion.button
      aria-current={isActive ? 'page' : undefined}
      className={`${styles.navItem} ${isActive ? styles.active : ''} ${className}`}
      // animate drives a 3px rightward nudge when active.
      // This reinforces the left-border indicator by moving the label
      // toward it, creating a visual relationship between the two.
      animate={{
        x: isActive ? 3 : 0,
      }}
      transition={{
        duration: tokens.duration.fast,
        // enter easing decelerates in — appropriate for arriving at a selected state.
        // exit easing accelerates out — appropriate for leaving a selected state.
        ease: isActive ? tokens.ease.enter : tokens.ease.exit,
      }}
      {...props}
    >
      {label}
    </motion.button>
  )
}
