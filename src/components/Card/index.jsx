import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Card.module.css'

// Card is a fixed-structure component: title and description are always present,
// tag is optional. No children prop — keeping the API tight ensures visual
// consistency across every card in the app.
//
// Selected state is managed internally (uncontrolled). If you ever need a parent
// to control which card is selected — e.g. "only one card active at a time" —
// replace useState here with isSelected and onSelect props, and lift the state up
// to the parent component.
export function Card({ title, description, tag, className = '', onClick, ...props }) {
  const [isSelected, setIsSelected] = useState(false)
  const tokens = useMotionTokens()

  return (
    <motion.div
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${className}`}
      // animate is state-driven: it moves to the target values and stays there
      // until the state changes again. This is different from whileTap, which
      // is gesture-driven and always returns to the default on release.
      //
      // scale gives the card a physical "lift" on selection. The color inversion
      // (background, border, text) is handled by CSS class swap — Framer Motion
      // can't interpolate CSS custom properties because it needs real color values
      // to tween between, not variable names.
      animate={{
        scale: isSelected ? tokens.scale.lift : 1,
      }}
      transition={{
        // Different curves for select vs deselect — spring in, standard out.
        // Spring communicates "something was chosen" (expressive).
        // Standard communicates "returning to rest" (neutral).
        duration: tokens.duration.base,
        ease: isSelected ? tokens.ease.spring : tokens.ease.standard,
      }}
      onClick={(e) => {
        setIsSelected(prev => !prev)
        onClick?.(e)
      }}
      aria-pressed={isSelected}
      {...props}
    >
      {tag && <span className={styles.tag}>{tag}</span>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </motion.div>
  )
}
