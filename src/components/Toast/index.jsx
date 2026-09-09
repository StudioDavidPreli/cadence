import { useEffect, useState } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { buildTimeline } from './toastTimeline'
import styles from './Toast.module.css'

// How far each toast travels on the way in and out, in pixels. Distance, not
// timing, so it is not a motion token: the token layer names durations, easings,
// delays and scales, and a px offset is none of those.
const TRAVEL = 24

// ─── Messages ─────────────────────────────────────────────────────────────────
const MESSAGES = [
  { title: 'Tokens exported',  detail: 'cadence.motion.js written'  },
  { title: 'Preset saved',     detail: 'Standard, 4 families'       },
  { title: 'Build finished',   detail: 'No drift against motion.css' },
]

// ─── Why this demo exists: the delay family had one consumer ──────────────────
//
// Before this component the three delay tokens were read almost entirely by
// Stepper, so dragging delay.medium moved exactly one thing in the whole tool.
// A token nothing answers to cannot be demonstrated.
//
// A toast stack is the honest home for all three, because a stack genuinely
// needs different intervals doing different jobs:
//
//   delay.short  — the stagger BETWEEN siblings arriving. Tight on purpose. The
//                  three toasts are one event, and a gap wide enough to read as
//                  three events would misdescribe what happened.
//   delay.medium — the stagger on the way out. Wider than the entrance stagger:
//                  leaving is less urgent than arriving, so the cascade loosens.
//   delay.long   — part of the reading hold, added to duration.slower (below).
//
// The hold is the only interval here a person is meant to consciously spend: it
// is reading time, not animation time, which is why it takes the two longest
// names the system has rather than any single one of them. delay.long alone was
// the first version and it was wrong, 200ms in Standard, which is nobody's
// reading time. duration.slower + delay.long gives 800ms there. In Snappy it
// gives 430ms and the stack is gone before it can be read. That failure is left
// in deliberately (David's call, 2026-09-09): Snappy is a personality tuned for
// interface feedback, and a personality applied to something it was not shaped
// for should visibly not fit.
//
// ─── Why MotionValues and imperative animate(), not state + AnimatePresence ───
//
// The first version kept a `visible` array in state, gave each toast a key that
// included a run counter, and scheduled dismissal with setTimeout. Pressing
// Notify again bumped the counter, so every key changed, so AnimatePresence saw
// three removals and three additions: the outgoing three stayed mounted for
// their exit while three more mounted beside them. Five quick presses put
// fifteen toasts on screen and grew this stack from 148px to 900px, shoving the
// rest of the column down with it. The animation was never wrong. The mounting
// was.
//
// So nothing mounts or unmounts here any more. Exactly MESSAGES.length toasts
// exist for the life of the component, each holding its own opacity and x as
// MotionValues, and a press animates those values through one timeline: in,
// hold, out. Pressing again restarts that timeline on the same elements, which
// is what "a new animation on every press" should mean. The stack's height can
// no longer change, so no number of presses can move the column.
//
// MotionValues are the right tool because they live outside React state: writing
// one animates the DOM without re-rendering, so a running toast costs no renders
// and a second press cannot race a render. CLAUDE.md prefers imperative
// animate(motionValue, ...) over useAnimation() for exactly this: it has no
// AnimationScope and broadcasts nothing to the layout tree.
//
// It also deletes the timers. The dismissal is a segment of the animation now,
// not a setTimeout racing it, so there is nothing to clear, nothing to leak, and
// no wall-clock schedule to drift from the tokens it was built from.

// One toast. Owns its own values so a restart touches only itself.
//
// `step` is this toast's slice of the timeline, built by the parent at the
// moment Notify was pressed. It is a prop rather than something computed here on
// every render, and that is the whole fix for the retrigger bug described above:
// this effect depends on the run, not on the tokens.
function ToastItem({ message, step, runId, isLast, tokens, onFinished }) {
  // Created once and kept for the life of the component. Starting hidden and
  // offset means the idle state matches the timeline's first keyframe, so the
  // first press has nothing to correct.
  const opacity = useMotionValue(0)
  const x = useMotionValue(TRAVEL)

  useEffect(() => {
    // runId 0 is the idle state before any press, and step is null until then.
    if (runId === 0 || !step) return

    const shared = {
      duration: step.duration,
      times: step.times,
      delay: step.delay,
      // One ease per segment. The hold is linear because nothing moves there.
      ease: [tokens.ease.enter, tokens.ease.linear, tokens.ease.exit],
    }

    const runs = [
      animate(opacity, [0, 1, 1, 0], {
        ...shared,
        // Only the last toast reports back, and only to drop the stack out of
        // the accessibility tree once nothing is visible.
        onComplete: isLast ? onFinished : undefined,
      }),
      animate(x, [TRAVEL, 0, 0, TRAVEL], shared),
    ]

    // Stops the previous run when the run changes or the component unmounts.
    // This is what makes a repeat press a restart rather than an overlap.
    return () => runs.forEach(run => run.stop())
    // `step` is derived from runId (the parent rebuilds it only on a press), so
    // it changes exactly when runId does and adds no extra triggers. `tokens` is
    // deliberately absent: the curves, like the timings, are the ones that were
    // current when the button was pressed. Depending on it is what made a preset
    // change or a slider drag play the stack on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, step])

  return (
    <motion.div className={styles.item} style={{ opacity, x }}>
      <span className={styles.dot} />
      <div className={styles.copy}>
        <span className={styles.title}>{message.title}</span>
        <span className={styles.detail}>{message.detail}</span>
      </div>
    </motion.div>
  )
}

export function Toast() {
  const tokens = useMotionTokens()
  // One piece of state for the whole run: an id that identifies it, and the
  // timeline it was built with. They move together on purpose, so a toast can
  // never be animating one run's shape under another run's id.
  //
  // The timeline is captured HERE, at the press, rather than read continuously
  // by each toast. A demo in this tool should answer to the tokens on its next
  // interaction, the way Button does, not perform itself when a slider moves.
  const [run, setRun] = useState({ id: 0, steps: null })
  // Whether anything is on screen. Drives aria-hidden only: the toasts are
  // always in the DOM now, and three permanently announced notifications would
  // be wrong for a screen reader when the demo is sitting idle.
  const [live, setLive] = useState(false)

  // Stable identity so ToastItem's effect is not re-triggered by the parent
  // re-rendering, which it does on every token change.
  const [handleFinished] = useState(() => () => setLive(false))

  function launch() {
    setLive(true)
    setRun(prev => ({ id: prev.id + 1, steps: buildTimeline(tokens, MESSAGES.length) }))
  }

  return (
    <div className={styles.toast}>
      <motion.button
        type="button"
        className={styles.launch}
        whileTap={{
          scale: tokens.scale.pressBase,
          transition: { duration: tokens.duration.fast, ease: tokens.ease.standard },
        }}
        onClick={launch}
      >
        Notify
      </motion.button>
      {/* The trigger sits above the stack and the toasts grow downward from it.
          Every slot is always mounted, so this box has one height forever and
          the column below it cannot be moved by anything that happens here. */}
      <div className={styles.stack} aria-hidden={!live}>
        {MESSAGES.map((message, i) => (
          <ToastItem
            key={message.title}
            message={message}
            step={run.steps ? run.steps[i] : null}
            runId={run.id}
            isLast={i === MESSAGES.length - 1}
            tokens={tokens}
            onFinished={handleFinished}
          />
        ))}
      </div>
    </div>
  )
}
