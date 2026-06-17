// HeroAnimation isolates useRive for the landing animation, the same isolation
// pattern PrincipleAnimation/RiveCanvas uses: all Rive hook calls live in one
// wrapper so the canvas lifecycle is contained and cleans up when a destination
// takes over the demo area. Do not lift the Rive hooks to a parent.
//
// Interaction model matches the principle files: the .riv carries its own
// hitboxes and pointer listeners, so hover/click are handled inside the state
// machine. React passes nothing in; its only job is theme synchronization.

import { useRive, useViewModel, useViewModelInstance } from '@rive-app/react-canvas'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import styles from './HeroAnimation.module.css'

// The landing .riv. stateMachine is the author's choice in Rive — rename here to
// match. Same view-model convention as every principle file: ViewModel1 with
// Light / Dark / Contrast instances and colorPropertyFill / colorPropertyStroke.
const HERO_RIV = { src: '/rive/hero.riv', stateMachine: 'heroSM' }

const themeToInstanceName = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast': 'Contrast',
}

export function HeroAnimation() {
  const { theme } = useTheme()

  // prefers-reduced-motion: load the file but do not play it, so the hero holds
  // a static first frame instead of looping. Consistent with P17.
  const reduce = useReducedMotion()

  const { rive, RiveComponent } = useRive({
    src: HERO_RIV.src,
    stateMachines: HERO_RIV.stateMachine,
    autoplay: !reduce,
    autoBind: false,
  })

  const viewModel = useViewModel(rive, { name: 'ViewModel1' })
  // { rive } makes the hook bind the instance and rebind when the name (theme)
  // changes. No manual useEffect needed — same as RiveCanvas.
  useViewModelInstance(viewModel, {
    name: themeToInstanceName[theme],
    rive,
  })

  return (
    <div className={styles.hero}>
      {/* Graceful fallback: until rive loads (or if hero.riv is absent), show a
          quiet themed prompt. Once the file loads, the canvas paints over it.
          A missing asset therefore degrades to this prompt rather than erroring,
          so the build runs before the .riv is authored. */}
      {!rive && (
        <p className={styles.fallbackText}>
          Pick a tool to begin. Token Lab edits the system; Principles shows it at work.
        </p>
      )}
      <RiveComponent className={styles.canvas} />
    </div>
  )
}
