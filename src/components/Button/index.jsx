import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Button.module.css'

// motionMode: 'bezier' (default) rides ease.overshoot back to rest; 'spring'
// rides the real physics spring instead. Only Token Lab passes it, through the
// per-demo Overshoot/Spring switch, so shipped Buttons are unchanged. Both
// branches read tokens at runtime, no literals.
export function Button({ children, className = '', motionMode = 'bezier', ...props }) {
  const tokens = useMotionTokens()

  // The release transition: how scale returns to rest when the tap ends. The
  // spring branch has no duration or ease; stiffness, damping, and mass decide
  // the return, the difference the spring switch exists to show.
  const releaseTransition = motionMode === 'spring'
    ? {
        type: 'spring',
        stiffness: tokens.spring.stiffness,
        damping: tokens.spring.damping,
        mass: tokens.spring.mass,
      }
    : { duration: tokens.duration.fast, ease: tokens.ease.overshoot }

  return (
    <motion.button
      className={`${styles.button} ${className}`}
      whileTap={{
        scale: tokens.scale.base,
        transition: {
          duration: tokens.duration.fast,
          ease: tokens.ease.standard,
        },
      }}
      // The press compresses on standard (the squash); the release rides the
      // overshoot curve, or the spring, back past rest (the stretch). Without a
      // release transition Framer Motion falls back to its own default spring,
      // an easing no token owns.
      transition={releaseTransition}
      {...props}
    >
      {children}
    </motion.button>
  )
}
