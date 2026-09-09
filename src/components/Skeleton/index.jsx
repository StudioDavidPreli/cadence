import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Skeleton.module.css'

// ─── Loaded content ───────────────────────────────────────────────────────────
const ROWS = [
  { label: 'Duration',  value: '200ms'              },
  { label: 'Easing',    value: 'cubic-bezier(...)'  },
  { label: 'Delay',     value: '100ms'              },
]

// ─── The placeholder-to-content swap ──────────────────────────────────────────
//
// The loading state is where a motion system is easiest to get wrong, because
// two different intervals are competing and only one of them is yours.
//
//   The shimmer runs on duration.slower. It is the system's slowest named
//   interval, and it is slow on purpose: a placeholder pulse that hurries reads
//   as a progress indicator, promising the wait is nearly over. It is not one.
//   It knows nothing about the network. A slow sweep says "still here", which is
//   the only honest thing a skeleton can say.
//
//   The reveal runs on delay.short per row. Rows are siblings arriving as one
//   response, so they take the sibling stagger — the same interval, and for the
//   same reason, as the toast stack's entrance.
//
// Those two are deliberately far apart in the scale. The wait is the longest
// thing in the system and the resolution is among the shortest, which is what
// makes the swap feel like an answer rather than another stage of loading.
//
// The skeleton exits on ease.exit while the content enters on ease.enter, and
// they overlap rather than queueing. A skeleton that fully departs before its
// content arrives leaves a hole, and the hole reads as a second load.
export function Skeleton() {
  const tokens = useMotionTokens()
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={styles.skeleton}>
      {/* Fixed height across both states so the swap does not reflow the column.
          The placeholder and the real rows are built to the same metrics — which
          is the other half of the lesson: a skeleton whose shape does not match
          its content animates into a jump. */}
      <div className={styles.panel}>
        <AnimatePresence initial={false}>
          {!loaded && (
            <motion.div
              key="placeholder"
              className={styles.layer}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: tokens.duration.base, ease: tokens.ease.exit },
              }}
            >
              {ROWS.map((_, i) => (
                <div className={styles.placeholderRow} key={i}>
                  <motion.span
                    className={`${styles.bar} ${styles.barLabel}`}
                    // The shimmer. animate on a repeating opacity cycle rather
                    // than a CSS keyframe animation so the duration stays a live
                    // token read — a @keyframes rule would need a hardcoded
                    // duration or a var() that cannot be re-read per drag.
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: tokens.duration.slower,
                      ease: tokens.ease.standard,
                      repeat: Infinity,
                      // Each row's sweep is offset by the sibling stagger, so the
                      // pulse travels down the stack instead of the three bars
                      // breathing in unison. Same token, same meaning as the
                      // reveal below: siblings are offset, never simultaneous.
                      delay: i * tokens.delay.short,
                    }}
                  />
                  <motion.span
                    className={`${styles.bar} ${styles.barValue}`}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: tokens.duration.slower,
                      ease: tokens.ease.standard,
                      repeat: Infinity,
                      delay: i * tokens.delay.short,
                    }}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {loaded && (
            <motion.div key="content" className={styles.layer}>
              {ROWS.map((row, i) => (
                <motion.div
                  className={styles.contentRow}
                  key={row.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: tokens.duration.fast, ease: tokens.ease.exit },
                  }}
                  transition={{
                    duration: tokens.duration.base,
                    ease: tokens.ease.enter,
                    delay: i * tokens.delay.short,
                  }}
                >
                  <span className={styles.rowLabel}>{row.label}</span>
                  <span className={styles.rowValue}>{row.value}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        className={styles.trigger}
        whileTap={{
          scale: tokens.scale.pressBase,
          transition: { duration: tokens.duration.fast, ease: tokens.ease.standard },
        }}
        onClick={() => setLoaded(l => !l)}
      >
        {loaded ? 'Reset' : 'Load'}
      </motion.button>
    </div>
  )
}
