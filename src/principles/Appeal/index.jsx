import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../../components/Card'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Appeal.module.css'

// P12 Appeal. 2x2 grid of compact Cards. The grid drifts continuously when
// nothing is selected; selecting any card freezes the drift and dims the
// unselected siblings (scale.subtle + opacity 0.55) — the "spotlight narrows"
// composition. All four classic motion tokens read together: duration.slower
// drives the drift cycle, duration.base drives the settle/dim/lift, ease.standard
// smooths the neutral states, ease.spring marks selection. "All tokens in concert"
// is then literal in the demo, not just label.
//
// Card itself owns scale + opacity via the isSelected/dimmed props; the
// motion.div wrapper owns the y-drift. Two motion components, two
// responsibilities — they compose without fighting because they animate
// different properties.
// ASCII faces stand in for "shapes" — small characters that are unmistakably
// distinct from one another so the spotlight composition reads at a glance.
// Each face is its own identity; no tag or description is needed beneath.
const APPEAL_CARDS = [
  { id: 'a', title: '(ﾟ∩ﾟ)'   },
  { id: 'b', title: '(• ε •)' },
  { id: 'c', title: 'ʕ•̮͡•ʔ'   },
  { id: 'd', title: '(´°ω°`)' },
]

// Per-card phase delays for the drift loop. Picked by ear so the four cards
// never sync — the grid breathes as a system, not a metronome. Values are in
// seconds, distributed unevenly across the cycle.
const DRIFT_PHASES = [0, 1.1, 2.2, 0.6]

export function Appeal() {
  const tokens = useMotionTokens()
  const [selected, setSelected] = useState(() => new Set())
  const anySelected = selected.size > 0

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Drift cycle uses tokens.duration.slower (600 ms) as the base unit, scaled
  // up so the loop reads ambient (~5 s end to end). Fast drift would feel
  // anxious; slow drift feels like a system at rest.
  const driftDuration = tokens.duration.slower * 8

  return (
    <div className={styles.appealDemo}>
      <div className={styles.appealGrid}>
        {APPEAL_CARDS.map((card, i) => {
          const isSelected = selected.has(card.id)
          return (
            <motion.div
              key={card.id}
              className={styles.appealCardWrapper}
              animate={anySelected ? { y: 0 } : { y: [0, -3, 0, 3, 0] }}
              transition={
                anySelected
                  ? { duration: tokens.duration.base, ease: tokens.ease.standard }
                  : {
                      duration: driftDuration,
                      times: [0, 0.25, 0.5, 0.75, 1],
                      repeat: Infinity,
                      ease: tokens.ease.standard,
                      delay: DRIFT_PHASES[i],
                    }
              }
            >
              <Card
                className={styles.appealCard}
                title={card.title}
                description=""
                isSelected={isSelected}
                onSelect={() => toggle(card.id)}
                dimmed={anySelected && !isSelected}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
