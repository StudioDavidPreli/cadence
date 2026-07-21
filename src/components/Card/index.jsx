import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Card.module.css'

// Card is a fixed-structure component: title and description are always present,
// tag is optional. No children prop — keeping the API tight ensures visual
// consistency across every card in the app.
//
// ── Controlled or uncontrolled ────────────────────────────────────────────────
// `isSelected` is optional. When undefined, Card owns its own selection via
// useState (the original Press & State, P11 behavior). When passed, parent
// owns selection — used by the P12 Appeal demo to coordinate spotlight-style
// reactions across a grid of Cards. `onSelect(next)` fires on every toggle
// regardless of mode.
//
// ── dimmed ────────────────────────────────────────────────────────────────────
// When true and not selected, the Card scales down to scale.pressSubtle and dims
// to opacity 0.55. Selected cards are never dimmed (selection wins). The
// Appeal demo passes dimmed=true to all unselected siblings whenever any
// card in the grid is selected, producing the "spotlight narrows" effect.
export function Card({
  title,
  description,
  tag,
  className = '',
  onClick,
  isSelected: isSelectedProp,
  onSelect,
  dimmed = false,
  motionMode = 'bezier',
  ...props
}) {
  const [internalSelected, setInternalSelected] = useState(false)
  const isControlled = isSelectedProp !== undefined
  const isSelected = isControlled ? isSelectedProp : internalSelected
  const tokens = useMotionTokens()

  // The select-in transition. 'spring' replaces the overshoot bezier with the
  // real spring on the way in only; deselecting always returns on standard, so
  // the switch changes how the card arrives, not how it lets go. motionMode is
  // passed only by Token Lab's per-demo switch, so shipped Cards are unchanged.
  const selectTransition = motionMode === 'spring'
    ? {
        type: 'spring',
        stiffness: tokens.spring.stiffness,
        damping: tokens.spring.damping,
        mass: tokens.spring.mass,
      }
    : { duration: tokens.duration.base, ease: tokens.ease.overshoot }

  // Selection wins over dim. When neither: rest. When dimmed and not
  // selected: shrink to scale.pressSubtle and ramp opacity down.
  const targetScale = isSelected
    ? tokens.scale.lift
    : dimmed
      ? tokens.scale.pressSubtle
      : 1
  const targetOpacity = !isSelected && dimmed ? 0.55 : 1

  function handleClick(e) {
    const next = !isSelected
    if (!isControlled) setInternalSelected(next)
    onSelect?.(next)
    onClick?.(e)
  }

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
        scale: targetScale,
        opacity: targetOpacity,
      }}
      // Different transitions for select vs deselect: overshoot (or a real
      // spring) in, standard out. In communicates "something was chosen"
      // (expressive); out communicates "returning to rest" (neutral).
      transition={
        isSelected
          ? selectTransition
          : { duration: tokens.duration.base, ease: tokens.ease.standard }
      }
      onClick={handleClick}
      // The card is a toggle, so it carries a button's full contract:
      // aria-pressed is only valid ARIA on role="button", and the role alone
      // does not make a div focusable or key-operable, so tabIndex and the
      // Enter/Space handler complete it (preventDefault stops Space from
      // scrolling the demo column instead of selecting).
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      {...props}
    >
      {tag && <span className={styles.tag}>{tag}</span>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </motion.div>
  )
}
