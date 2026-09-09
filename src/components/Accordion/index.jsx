import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Accordion.module.css'

// ─── Sections ─────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    label: 'Duration',
    lines: ['fast — 100ms', 'base — 200ms', 'slow — 400ms'],
  },
  {
    label: 'Easing',
    lines: ['standard', 'enter', 'exit'],
  },
  {
    label: 'Delay',
    lines: ['short — 50ms', 'medium — 100ms', 'long — 200ms'],
  },
]

// ─── Press scale is a function of surface size ────────────────────────────────
//
// This demo exists for the scale family, which had thinner coverage than any
// other: scale.pressSubtle was read by exactly one component, on a branch the
// tool never triggered.
//
// A row is the case that makes the subtle value make sense. Press scale reads as
// physical displacement, and displacement is judged against the size of the
// thing displaced. The same 0.95 that feels crisp on a 90px button is a lurch on
// a 280px row: the row's edges travel several times further to say exactly the
// same thing. So the wide surface takes scale.pressSubtle and the narrow control
// inside it takes scale.pressBase, and the two presses read as equal weight
// despite being different numbers.
//
// That is the argument for a named scale family over a single press value. The
// names are not three intensities to pick from by taste. They are the answer to
// how big the thing is.
//
// scale.lift on hover is the same idea inverted: the row rises by the system's
// one named lift, shared with Card and the Carousel, so "raised" means one
// distance everywhere rather than a number chosen per component.
//
// Note on chrome vs demonstration: the tool's own nav accordion and the tool bar
// disclosures are chrome and read the fixed --feedback-* constants, so a
// near-zero duration in Explore mode can never collapse the interface's own
// feedback. This one is a demonstration surface inside the demo column, so it
// reads the editable --motion-* tokens. Same widget, opposite timing source, and
// the difference is the whole point of the two-channel split.
export function Accordion() {
  const tokens = useMotionTokens()
  // Single-open. null means every section is closed.
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className={styles.accordion}>
      {SECTIONS.map((section, i) => {
        const isOpen = openIndex === i

        return (
          <div className={styles.section} key={section.label}>
            <motion.button
              type="button"
              className={styles.header}
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              // The wide surface: lift on hover, and the SUBTLE press, because
              // the row is ~280px and a base press on it overshoots.
              whileHover={{
                scale: tokens.scale.lift,
                transition: { duration: tokens.duration.fast, ease: tokens.ease.standard },
              }}
              whileTap={{
                scale: tokens.scale.pressSubtle,
                transition: { duration: tokens.duration.fast, ease: tokens.ease.standard },
              }}
            >
              <span className={styles.label}>{section.label}</span>
              {/* The chevron is a small control living inside the wide one, so
                  it rotates rather than scales — nesting a second press scale
                  inside the row's would compound the two transforms. */}
              <motion.span
                className={styles.chevron}
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: tokens.duration.base, ease: tokens.ease.standard }}
              >
                ▾
              </motion.span>
            </motion.button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="panel"
                  className={styles.panel}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: { duration: tokens.duration.base, ease: tokens.ease.exit },
                  }}
                  transition={{ duration: tokens.duration.base, ease: tokens.ease.enter }}
                  // overflow: hidden is what makes a height animation read as a
                  // reveal rather than a squash. Inline because Framer Motion is
                  // writing height on this element and the two belong together.
                  style={{ overflow: 'hidden' }}
                >
                  <div className={styles.panelBody}>
                    {section.lines.map((line, li) => (
                      <motion.span
                        className={styles.line}
                        key={line}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: tokens.duration.fast,
                          ease: tokens.ease.enter,
                          // Sibling stagger again, and deliberately the same
                          // token the toast stack and the skeleton reveal use.
                          // Three unrelated components arriving on one interval
                          // is what a shared vocabulary buys.
                          delay: li * tokens.delay.short,
                        }}
                      >
                        {line}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
