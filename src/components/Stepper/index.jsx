import { useState, useRef, useEffect, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import styles from './Stepper.module.css'

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Initialize', description: 'Set up project environment' },
  { label: 'Configure',  description: 'Apply system settings'      },
  { label: 'Build',      description: 'Compile and bundle assets'   },
  { label: 'Deploy',     description: 'Push to production'         },
]

// ─── Three-beat cascade pattern ───────────────────────────────────────────────
//
// Each step advance plays three beats of animation in sequence. The beats are
// staggered using cumulative absolute delays measured from the moment Next is
// clicked. This is the cascade pattern — each beat waits for the previous one
// to complete before starting, without any manual timers or sequencing logic.
//
// Beat 1 — Step completion (delay: 0, duration: slow)
//   The completing step's checkmark fades and scales into the circle.
//   Starts immediately. The user just clicked Next — the first feedback is
//   confirmation that the current step is done. duration.slow gives it weight.
//
// Beat 2 — Connector fill (delay: slow + delay.short, duration: slow)
//   The connector line between the completed step and the next fills with
//   accent color, left to right. The short gap after beat 1 lets the checkmark
//   settle before the system signals forward momentum. This is the "bridging"
//   moment — the system is moving, not just marking done.
//
// Beat 3 — Next step activates (delay: slow + delay.short + delay.medium, duration: fast)
//   The next step's label brightens and its description fades in. The medium
//   gap after beat 2 gives the connection visual time to read before the new
//   target appears. duration.fast here — this is a reveal, not a transition.
//   The work is at the destination, not in transit.
//
// All three delays reference live token values from useMotionTokens(), so
// dragging any delay or duration slider changes the cascade timing in real time.
// This is the demonstration: the cascade is a system of named intervals, not
// hardcoded numbers.
//
// Why useRef for previous step tracking:
// To apply cascade delays only on forward advances (not on mount or reset),
// we compare currentStep against the previous value. useRef stores a value
// that persists across renders without causing re-renders. The ref is read
// during render (before useEffect updates it) so isAdvancing is computed
// correctly during the render that introduces the new currentStep value.
// useEffect then updates the ref after the render so it's correct for the next.

// `compact` strips labels, the step description, the internal Next button,
// and the completion overlay. The wrapper takes responsibility for advancing
// state and presenting "complete" feedback in its own surface.
//
// `currentStep` is optional. When undefined the Stepper owns its own counter
// (the TokenLab demo). When provided the parent owns state — used by the P04
// principle demo to drive Stepper and ProgressBar from a single trigger.
export function Stepper({ compact = false, currentStep: currentStepProp }) {
  const tokens = useMotionTokens()
  const [internalStep, setInternalStep] = useState(0)
  const isControlled = currentStepProp !== undefined
  const currentStep = isControlled ? currentStepProp : internalStep
  const prevStepRef = useRef(currentStep)

  // completed is derived, not separate state — avoids synchronization bugs.
  const completed = currentStep >= STEPS.length

  // Computed during render, before useEffect updates prevStepRef.
  // isAdvancing is true only on the render where currentStep just increased.
  // justCompleted is the index of the step that was active before advancing.
  const isAdvancing    = currentStep > prevStepRef.current
  const justCompleted  = prevStepRef.current

  useEffect(() => {
    prevStepRef.current = currentStep
  }, [currentStep])

  // Cumulative beat delays — all measured from when Next is clicked.
  const beat1Duration   = tokens.duration.slow
  const beat2Delay      = beat1Duration + tokens.delay.short
  const beat3Delay      = beat2Delay   + tokens.delay.medium
  // Completion message arrives after a long beat — the climactic final moment
  // gets more time to breathe than the incremental steps.
  const completionDelay = beat1Duration + tokens.delay.long

  function advance() {
    if (!isControlled) setInternalStep(s => s + 1)
  }

  function reset() {
    // Update the ref synchronously before setting state so that
    // isAdvancing = false on the next render (0 > 0 = false).
    // If we only used useEffect, the ref would still hold the old value
    // during the reset render, causing isAdvancing to be incorrectly true.
    if (!isControlled) {
      prevStepRef.current = 0
      setInternalStep(0)
    }
  }

  const rootClass = compact
    ? `${styles.stepper} ${styles.stepperCompact}`
    : styles.stepper

  return (
    <div className={rootClass}>
      {/* stepperBody is position:relative so the completion overlay can be
          positioned absolutely inside it, overlapping the step content. */}
      <div className={styles.stepperBody}>

        {/* Steps view — stays mounted so layout height is preserved while the
            completion overlay appears on top. Fades out after completionDelay
            so it's still visible during the full cascade before disappearing.
            In compact mode there is no completion overlay, so the fade is
            suppressed: all four checkmarks remain visible alongside the bar
            at 100 % until the wrapper resets. */}
        <motion.div
          animate={{ opacity: !compact && completed ? 0 : 1 }}
          transition={{
            duration: tokens.duration.fast,
            delay: !compact && completed ? completionDelay : 0,
          }}
          style={{ pointerEvents: !compact && completed ? 'none' : 'auto' }}
        >

          {/* ── Circle row ─────────────────────────────────────────────── */}
          <div className={styles.circleRow}>
            {STEPS.map((step, i) => {
              const isStepCompleted = i < currentStep
              const isStepActive    = i === currentStep

              return (
                <Fragment key={i}>
                  <div className={styles.stepItem}>

                    {/* Step circle — border and fill change as state progresses */}
                    <div className={[
                      styles.circle,
                      isStepCompleted ? styles.circleCompleted : '',
                      isStepActive    ? styles.circleActive    : '',
                    ].join(' ')}>

                      {/* Checkmark / number — AnimatePresence mode="wait" so the number
                          exits before the checkmark enters. initial={false} prevents
                          all already-completed steps from re-animating on mount. */}
                      <AnimatePresence mode="wait" initial={false}>
                        {isStepCompleted ? (
                          <motion.span
                            key="check"
                            className={styles.checkmark}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              duration: tokens.duration.slow,
                              // Beat 1: starts immediately. initial={false} ensures this
                              // only plays when the step first becomes completed, not on
                              // every render or on initial mount.
                              delay: 0,
                            }}
                          >✓</motion.span>
                        ) : (
                          <motion.span
                            key="number"
                            className={styles.stepNumber}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: tokens.duration.fast }}
                          >{i + 1}</motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Step label — brightens on active step (beat 3 timing) */}
                    <motion.span
                      className={[
                        styles.stepLabel,
                        isStepActive ? styles.stepLabelActive : '',
                      ].join(' ')}
                      animate={{
                        opacity: isStepActive ? 1 : isStepCompleted ? 0.5 : 0.3,
                      }}
                      transition={{
                        duration: tokens.duration.fast,
                        // Beat 3: the newly active step label brightens last,
                        // after the checkmark and connector have both resolved.
                        delay: isAdvancing && i === currentStep ? beat3Delay : 0,
                      }}
                    >
                      {step.label}
                    </motion.span>
                  </div>

                  {/* Connector between step i and step i+1 */}
                  {i < STEPS.length - 1 && (
                    <div className={styles.connectorWrapper}>
                      <div className={styles.connectorTrack}>
                        {/* Fill bar — scaleX from 0 to 1, origin left.
                            Beat 2: the connector that just became completable
                            gets the beat2 delay. All others (already filled)
                            animate with delay 0 but their target hasn't changed,
                            so Framer Motion skips the animation entirely. */}
                        <motion.div
                          className={styles.connectorFill}
                          initial={false}
                          animate={{ scaleX: isStepCompleted ? 1 : 0 }}
                          style={{ originX: 0 }}
                          transition={{
                            duration: tokens.duration.slow,
                            ease: tokens.ease.standard,
                            delay: isAdvancing && i === justCompleted ? beat2Delay : 0,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>

          {/* ── Active step description ─────────────────────────────────── */}
          {/* key={currentStep} causes AnimatePresence to treat each step's
              description as a new element — old exits, new enters (beat 3). */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={currentStep}
              className={styles.stepDescription}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                duration: tokens.duration.fast,
                ease: tokens.ease.enter,
                delay: isAdvancing ? beat3Delay : 0,
              }}
            >
              {STEPS[Math.min(currentStep, STEPS.length - 1)].description}
            </motion.p>
          </AnimatePresence>

          {/* ── Next / Deploy button ────────────────────────────────────── */}
          <motion.button
            className={styles.nextButton}
            whileTap={{
              scale: tokens.scale.base,
              transition: { duration: tokens.duration.fast, ease: tokens.ease.standard },
            }}
            onClick={advance}
          >
            {currentStep < STEPS.length - 1 ? 'Next' : 'Deploy'}
          </motion.button>

        </motion.div>

        {/* ── Completion overlay ─────────────────────────────────────────── */}
        {/* Absolutely positioned inside stepperBody so it overlaps the fading
            step view rather than pushing it down. AnimatePresence handles the
            enter (completionDelay) and exit (ease.exit — returning to default
            state is a deliberate action, not a casual dismiss).
            Suppressed in compact: the wrapper presents its own "complete"
            state (e.g. ProgressBar at 100% + Reset button). */}
        <AnimatePresence>
          {!compact && completed && (
            <motion.div
              key="completion"
              className={styles.completion}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: -8,
                transition: {
                  duration: tokens.duration.fast,
                  ease: tokens.ease.exit,
                },
              }}
              transition={{
                duration: tokens.duration.slower,
                ease: tokens.ease.enter,
                delay: completionDelay,
              }}
            >
              <span className={styles.completionCheck}>✓</span>
              <span className={styles.completionText}>Deployed successfully</span>
              <motion.button
                className={styles.resetButton}
                whileTap={{
                  scale: tokens.scale.base,
                  // ease.exit: the system is deliberately resetting to default —
                  // a purposeful return, not a casual tap. The quick-start curve
                  // signals decisiveness.
                  transition: { duration: tokens.duration.fast, ease: tokens.ease.exit },
                }}
                onClick={reset}
              >
                Reset
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
