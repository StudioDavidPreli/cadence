import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Button.module.css'

export function Button({ children, className = '', ...props }) {
  const tokens = useMotionTokens()

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
      // The release: when the tap ends, scale animates back to rest using this
      // transition. Without it, Framer Motion falls back to its default spring
      // for transforms, an easing no token owns. One scale value does both
      // jobs: the press compresses on standard (the squash), the release rides
      // the overshoot curve back past rest (the stretch).
      transition={{
        duration: tokens.duration.fast,
        ease: tokens.ease.overshoot,
      }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
