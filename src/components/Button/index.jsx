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
      {...props}
    >
      {children}
    </motion.button>
  )
}
