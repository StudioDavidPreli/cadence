import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { Spinner } from '../Spinner'
import styles from './AsyncButton.module.css'

// How long the pretend request takes. Deliberately NOT a motion token: this is
// network time, not animation time, and the tool would be lying if a duration
// slider could make a server answer faster. It is the one interval on this
// button the design system does not get to name, which is worth seeing next to
// the four it does.
const LATENCY_MS = 900

// The shake, in pixels. Distance, not timing, so no token applies.
const SHAKE = [0, -5, 5, -3, 3, 0]

// ─── The state a press leads to ───────────────────────────────────────────────
//
// Every other demo in this tool animates a change the user makes directly. This
// one animates a change the user asks for and then waits on, which is the most
// common shape in product UI and the one where motion decisions get argued
// over. Four states, and the interesting question is not how any single
// transition looks but how long the button sits in each.
//
//   idle → pending    duration.fast. The press is acknowledged immediately;
//                     hesitating here reads as a dropped click.
//   pending           the Spinner's own duration.slower, reused rather than
//                     redrawn. A pending state has no known end, so a slow
//                     mechanical loop is the honest signal.
//   pending → result  the spinner leaves on ease.exit and the mark arrives
//                     delay.medium later. That beat is the point: swapping them
//                     on the same frame reads as one glyph mutating into
//                     another, and the two are not the same statement.
//   result → idle     held for duration.slower + delay.long, then out on
//                     ease.exit.
//
// The hold is the same construction Toast uses for its reading hold, on purpose.
// A system with one named way to say "long enough to register" is worth more
// than two components each inventing their own, and dragging duration.slower
// now moves both. That is the shared-vocabulary argument in the small.
//
// Success takes ease.overshoot because a confirmation is allowed to be
// expressive. Error does not: it shakes on ease.standard and carries no accent,
// per the house rule that error surfaces read plain --color-text-base (David's
// spec 2026-07-18). Colouring failure would make it decorative.
export function AsyncButton() {
  const tokens = useMotionTokens()
  const [phase, setPhase] = useState('idle')
  // The result face keeps rendering while it fades out, and by then `phase` is
  // already back to 'idle'. Reading the label off `phase` meant an error faded
  // out as the word "Saved" (David's catch). The last outcome is remembered
  // separately so the word that leaves is the word that arrived.
  const [lastOutcome, setLastOutcome] = useState('success')
  // Presses alternate outcome so both paths are reachable without a second
  // control. The instruction tells the user to press twice.
  const nextOutcome = useRef('success')
  const timers = useRef([])

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(() => clearTimers, [])

  function start() {
    // A press mid-flight is ignored rather than queued or restarted. A real
    // submit button must not fire twice, and it also means only one run can
    // ever be in progress, which is why the spinner below can mount and unmount
    // safely without generations piling up.
    if (phase !== 'idle') return
    clearTimers()

    // Sampled here, at the press, not read inside an effect. An effect that
    // depends on `tokens` re-runs whenever the provider re-renders, which makes
    // a preset switch or a slider drag play the animation on its own.
    const held = (tokens.duration.slower + tokens.delay.long) * 1000
    // Everything before the result is fully on screen: the spinner's exit, the
    // beat, and the result's own entrance. The hold is measured from the moment
    // the word has actually landed, the same way Toast measures its.
    const arrival = (tokens.duration.fast + tokens.delay.medium + tokens.duration.base) * 1000
    const outcome = nextOutcome.current
    nextOutcome.current = outcome === 'success' ? 'error' : 'success'

    setPhase('pending')
    timers.current.push(setTimeout(() => {
      setLastOutcome(outcome)
      setPhase(outcome)
      // The mark's own entrance is delayed by delay.medium in the transition
      // below, so the hold starts once it has actually arrived.
      timers.current.push(setTimeout(() => setPhase('idle'), held + arrival))
    }, LATENCY_MS))
  }

  const isResult = phase === 'success' || phase === 'error'

  return (
    <div className={styles.asyncButton}>
      {/* Fixed size. The four states have different content widths, and letting
          the button resize between them would animate layout, which is both a
          worse read and the class of animation this codebase has repeatedly
          moved away from. The box holds still; only what is inside it changes. */}
      <motion.button
        type="button"
        className={styles.button}
        onClick={start}
        disabled={phase !== 'idle'}
        aria-busy={phase === 'pending'}
        whileTap={phase === 'idle' ? {
          scale: tokens.scale.pressBase,
          transition: { duration: tokens.duration.fast, ease: tokens.ease.standard },
        } : undefined}
        // The shake runs on the button itself, so the failure moves the whole
        // control rather than just its label. Keyframes re-run when phase
        // changes, and only then.
        animate={{ x: phase === 'error' ? SHAKE : 0 }}
        transition={{
          duration: tokens.duration.base,
          ease: tokens.ease.standard,
          delay: phase === 'error' ? tokens.duration.fast + tokens.delay.medium : 0,
        }}
      >
        {/* Every state's content is stacked in the same cell. Because they
            overlap exactly, the swap between them is SEQUENCED, never
            cross-faded: two labels at 50% opacity in one box is unreadable
            overprinting, not a blend (David's catch). The rule below is that
            every entrance waits out the exit it replaces, so at most one face
            is ever above zero. FACE_OUT is that exit, and it is duration.fast
            for all of them: a label leaving is not the interesting part. */}
        <span className={styles.stack}>
          <motion.span
            className={styles.face}
            animate={{ opacity: phase === 'idle' ? 1 : 0 }}
            transition={{
              duration: tokens.duration.fast,
              ease: phase === 'idle' ? tokens.ease.enter : tokens.ease.exit,
              // Coming back, wait for the result to clear the box first.
              delay: phase === 'idle' ? tokens.duration.fast : 0,
            }}
          >
            Save changes
          </motion.span>

          {/* AnimatePresence so the spinner LEAVES rather than vanishing. The
              beat after it is the thing this demo is about, and a hard cut
              would put a blink where the beat should be. Only one can exist at
              a time, since a press mid-flight is ignored. */}
          <AnimatePresence>
            {phase === 'pending' && (
              <motion.span
                key="pending"
                className={styles.face}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  transition: { duration: tokens.duration.fast, ease: tokens.ease.exit },
                }}
                transition={{
                  duration: tokens.duration.fast,
                  ease: tokens.ease.enter,
                  // Wait for "Save changes" to leave.
                  delay: tokens.duration.fast,
                }}
              >
                <Spinner size="small" />
              </motion.span>
            )}
          </AnimatePresence>

          <motion.span
            className={`${styles.face} ${styles.result}`}
            animate={{
              opacity: isResult ? 1 : 0,
              scale: isResult ? 1 : 0.8,
            }}
            transition={{
              duration: isResult ? tokens.duration.base : tokens.duration.fast,
              // Success is allowed to overshoot. A failure that springs in
              // would read as pleased with itself.
              ease: !isResult              ? tokens.ease.exit
                  : phase === 'success'    ? tokens.ease.overshoot
                  :                          tokens.ease.standard,
              // The spinner's exit, then the beat. Swapping them on one frame
              // reads as a glyph mutating, and "working" and "done" are not the
              // same statement.
              delay: isResult ? tokens.duration.fast + tokens.delay.medium : 0,
            }}
          >
            {/* lastOutcome, not phase: this face is still on screen while it
                fades out, and by then phase is already 'idle'. */}
            {lastOutcome === 'error' ? 'Could not save' : 'Saved'}
          </motion.span>
        </span>
      </motion.button>
    </div>
  )
}
