import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { PixelPlant } from '../PixelPlant'
import { navDurationSeconds } from '../../utils/feedbackDuration'
import pointerUrl from './mousePointer.svg'
import styles from './PrincipleEmbed.module.css'

// ─── RiveClockEmbed (V09) ─────────────────────────────────────────────────────
//
// The Rive Clock demo, canvas only, self-demonstrating: a ghost pointer tours
// the stage quadrant to quadrant so the plate chase and its stagger read
// without a person present. The ghost writes the same normalized {x, y,
// inside} object PixelPlant's own stage handlers write (pointerOverrideRef),
// so the plates chase it for exactly the reason they chase a person — the
// same inversion as the capture rig, the driver playing the human through the
// human's channel. No synthetic events anywhere.
//
// Yield: the moment a real pointer enters the stage the ghost stops writing
// and hides, and the visitor's own cursor drives the chase through
// PixelPlant's untouched handlers. On leave, the tour resumes from its
// off-stage rest, so the homecoming plays before the ghost walks back in.
// Clicks pass through to the Rive machine as always: watering still works.
//
// Under OS reduce-motion the tour never starts — an autonomous ghost is
// ambient motion, exactly what the preference declines. The embed then sits
// as the pointer-driven surface it is in the app, which that preference
// permits (motion the visitor causes).

// The tour, in the pointer contract's own coordinates (stage box, centre 0,0).
// dwellMs is the rest at each waypoint, and the rests are the demonstration:
// the plates arrive on duration.base with delay.short visible between them.
// The last waypoint stands off the stage (|x| > 0.5): the contract reads it
// as outside, and the homecoming on duration.slow gets its moment on every
// lap. Hop timing is chrome (the ghost is an operator, not a demo), so the
// hop length comes from the nav feedback constant, not an editable token.
const TOUR = [
  { x: -0.25, y: -0.25, dwellMs: 2000 },
  { x: 0.25, y: -0.25, dwellMs: 2000 },
  { x: 0.25, y: 0.25, dwellMs: 2000 },
  { x: -0.25, y: 0.25, dwellMs: 2000 },
  { x: -0.7, y: 0.25, dwellMs: 2600 },
]
const OFF_STAGE = TOUR.length - 1
const RESUME_DELAY_MS = 1200

// Symmetric ease-in-out for the hop: the code-side stand-in for the chrome
// curve, since a hand-run rAF interpolation cannot consume a bezier array.
// At hop length (the ~360ms nav constant) the difference is not readable.
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function RiveClockEmbed() {
  const prefersReduced = useReducedMotion()
  // The shared pointer contract. PixelPlant's handlers write it on real
  // events; the ghost writes it between them.
  const pointerRef = useRef({ x: 0, y: 0, inside: false })
  const ghostRef = useRef(null)
  const realInsideRef = useRef(false)
  const resumeAtRef = useRef(0)

  useEffect(() => {
    if (prefersReduced) return

    const hopMs = navDurationSeconds(false) * 1000
    let raf
    let idx = 0
    let from = TOUR[OFF_STAGE] // walk in from off the stage on the first lap
    let target = TOUR[idx]
    let phase = 'hop'
    let phaseStart = performance.now()
    let yielded = false

    const step = (now) => {
      raf = requestAnimationFrame(step)

      if (realInsideRef.current) {
        // A person has the stage. Hide the ghost, remember to restart the
        // tour from off-stage when they go.
        if (ghostRef.current) ghostRef.current.style.opacity = 0
        yielded = true
        return
      }
      if (now < resumeAtRef.current) return
      if (yielded) {
        // Resume: the visitor just left, PixelPlant's leave handler already
        // flipped inside=false, and the homecoming is running. Walk back in
        // from the rest position once it has had its moment.
        yielded = false
        idx = 0
        from = TOUR[OFF_STAGE]
        target = TOUR[idx]
        phase = 'hop'
        phaseStart = now
      }

      let x, y
      if (phase === 'hop') {
        const q = Math.min(1, (now - phaseStart) / hopMs)
        const e = easeInOut(q)
        x = from.x + (target.x - from.x) * e
        y = from.y + (target.y - from.y) * e
        if (q === 1) {
          phase = 'dwell'
          phaseStart = now
        }
      } else {
        x = target.x
        y = target.y
        if (now - phaseStart >= target.dwellMs) {
          from = target
          idx = (idx + 1) % TOUR.length
          target = TOUR[idx]
          phase = 'hop'
          phaseStart = now
        }
      }

      // One rule decides follow vs homecoming, for ghost and person alike:
      // you are inside when you are over the stage box.
      const inside = Math.abs(x) <= 0.5 && Math.abs(y) <= 0.5
      const p = pointerRef.current
      p.x = x
      p.y = y
      p.inside = inside

      // The visible ghost, positioned in stage percentages. Direct style
      // writes: sixty updates a second is rAF work, not React state.
      const g = ghostRef.current
      if (g) {
        g.style.left = `${(x + 0.5) * 100}%`
        g.style.top = `${(y + 0.5) * 100}%`
        g.style.opacity = inside ? 1 : 0
      }
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [prefersReduced])

  return (
    <div className={styles.clockStage}>
      {/* Real-pointer yield. These fire only for actual pointers (the ghost
          dispatches no events), and the ghost image itself is
          pointer-events: none so it can never trigger them. */}
      <div
        className={styles.clockYield}
        onPointerEnter={() => {
          realInsideRef.current = true
        }}
        onPointerLeave={() => {
          realInsideRef.current = false
          resumeAtRef.current = performance.now() + RESUME_DELAY_MS
        }}
      >
        <PixelPlant chromeless pointerOverrideRef={pointerRef} />
        <img
          ref={ghostRef}
          src={pointerUrl}
          alt=""
          aria-hidden="true"
          className={styles.ghostPointer}
        />
      </div>
    </div>
  )
}
