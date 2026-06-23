import { useState, useRef, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import { EASING_CURVES } from '../../data/motionPresets'
import styles from './DurationVisualizer.module.css'

// ─── DurationVisualizer ─────────────────────────────────────────────────────
//
// Shows that a duration token is not a speed. Velocity is distance / duration,
// so one duration value produces different perceived speeds depending on how
// far an element travels. Three dots travel different distances; a mode toggle
// switches between two readings of the same token:
//
//   constant duration  — every dot runs for the token's duration, so they
//                         arrive together and the far dot has to move faster.
//                         This is what a fixed duration token actually does.
//   constant velocity  — every dot moves at the same speed (the velocity the
//                         near dot has under constant duration), so the far dot
//                         takes proportionally longer. This is the "dynamic
//                         duration" model Material and Carbon use: scale the
//                         duration to the distance so velocity stays steady.
//
// The component reads token VALUES as a numeric prop. It does not read CSS
// custom properties: the tool bar (TokenLab's controls column) lives outside
// MotionTokensProvider, so useMotionTokens() is unavailable here, and the
// reducer already owns these numbers. Distance is local display state, the same
// "a position, not an animation parameter" distinction ProgressBarDemo draws.

// Three travel distances as fractions of the track. Abstract on purpose — the
// lesson is about the ratio between distances, not any specific component.
const DISTANCES = [
  { id: 'short',  label: 'short',  fraction: 0.25 },
  { id: 'medium', label: 'medium', fraction: 0.6  },
  { id: 'far',    label: 'far',    fraction: 1.0  },
]

const TOKEN_KEYS = ['fast', 'base', 'slow', 'slower']

// The near dot anchors constant-velocity mode. Every dot moves at the velocity
// the shortest distance has under constant duration, so each dot's time scales
// by (its fraction / the near fraction).
const NEAR_FRACTION = DISTANCES[0].fraction

// Dot diameter in px. Subtracted from the measured track width so the far dot
// (fraction 1.0) lands inside the track rather than half-off its right edge.
const DOT = 12

export function DurationVisualizer({ durations }) {
  const [selectedToken, setSelectedToken] = useState('base')
  // 'duration' = constant duration (the token). 'velocity' = constant velocity.
  const [mode, setMode] = useState('duration')
  // Bumping this remounts the dots (they are keyed on it) so Replay re-runs the
  // travel from the start. Same key-to-replay pattern Spinner uses.
  const [playKey, setPlayKey] = useState(0)

  // Travel distance in px for the far dot. Measured once (all three tracks share
  // a width) and kept current with a ResizeObserver. Animating transform x in px
  // is correct here: a percentage x in Framer Motion is relative to the dot's
  // own box, not the track, so it would not scale to the track width.
  const trackRef = useRef(null)
  const [travel, setTravel] = useState(0)

  useLayoutEffect(() => {
    if (!trackRef.current) return
    const measure = () => {
      setTravel(Math.max(0, trackRef.current.clientWidth - DOT))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(trackRef.current)
    return () => observer.disconnect()
  }, [])

  // Selected token's duration in seconds (Framer Motion takes seconds).
  const tokenMs = durations[selectedToken] ?? 0
  const T = tokenMs / 1000

  // Time a dot at this fraction takes in the active mode.
  //   constant duration: always T.
  //   constant velocity: T scaled by fraction / NEAR_FRACTION.
  function dotDuration(fraction) {
    return mode === 'duration' ? T : (fraction / NEAR_FRACTION) * T
  }

  return (
    <div className={styles.visualizer}>
      <div className={styles.headerRow}>
        <span className={styles.title}>Duration vs distance</span>
        <span className={styles.tokenValue}>
          {selectedToken} · {tokenMs}ms
        </span>
      </div>

      {/* Token selector. Mirrors the Easing slot tabs — same register, 4 columns. */}
      <div className={styles.tokenTabs} role="tablist" aria-label="Duration token">
        {TOKEN_KEYS.map(key => (
          <button
            key={key}
            role="tab"
            aria-selected={selectedToken === key}
            className={`${styles.tokenTab} ${selectedToken === key ? styles.tokenTabActive : ''}`}
            onClick={() => setSelectedToken(key)}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Mode toggle — the dynamic-duration concept made into a switch. */}
      <div className={styles.modeToggle} role="group" aria-label="Comparison mode">
        <button
          type="button"
          className={`${styles.modeOption} ${mode === 'duration' ? styles.modeOptionActive : ''}`}
          onClick={() => setMode('duration')}
          aria-pressed={mode === 'duration'}
        >
          Constant duration
        </button>
        <button
          type="button"
          className={`${styles.modeOption} ${mode === 'velocity' ? styles.modeOptionActive : ''}`}
          onClick={() => setMode('velocity')}
          aria-pressed={mode === 'velocity'}
        >
          Constant velocity
        </button>
      </div>

      {/* Kinetic strip. Three tracks; the dot in each travels its fraction of
          the measured width. Keyed on token + mode + playKey so any change (or
          Replay) remounts the dot and replays the travel from x = 0. */}
      <div className={styles.strip} ref={trackRef}>
        {DISTANCES.map(({ id, label, fraction }) => {
          const seconds = dotDuration(fraction)
          return (
            <div key={id} className={styles.track}>
              <div className={styles.trackHeader}>
                <span className={styles.trackLabel}>{label}</span>
                <span className={styles.trackTime}>{Math.round(seconds * 1000)}ms</span>
              </div>
              <div className={styles.rail}>
                <motion.span
                  key={`${selectedToken}-${mode}-${playKey}`}
                  className={styles.dot}
                  initial={{ x: 0 }}
                  animate={{ x: fraction * travel }}
                  // Linear, deliberately. Eased travel varies instantaneous
                  // velocity, which would muddy a graphic whose whole point is
                  // average velocity. A documented divergence from the project's
                  // natural-easing default, in the same family as the others in
                  // CLAUDE.md. (Reduced motion is intentionally not honored here:
                  // perceiving the motion is the purpose, same stance as the demo
                  // column's respectReducedMotion={false}.)
                  transition={{ duration: seconds, ease: EASING_CURVES.linear.fm }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <DurationDistanceChart mode={mode} />

      <p className={styles.caption}>
        {mode === 'duration'
          ? 'Same duration. The far dot moves faster to arrive on time.'
          : 'Same speed. The far dot takes longer to cover more ground.'}
      </p>

      <button
        type="button"
        className={styles.replayButton}
        onClick={() => setPlayKey(k => k + 1)}
      >
        Replay
      </button>
    </div>
  )
}

// ─── DurationDistanceChart ──────────────────────────────────────────────────
//
// Duration (Y) against distance (X). Two lines:
//
//   token line    — constant duration. Flat: the token's time is the same at
//                    every distance.
//   dynamic line  — constant velocity. Rises through the origin: time scales
//                    with distance.
//
// Both pass through the near dot, where the token happens to give the target
// velocity, and diverge to the right. For every distance past the near one the
// flat token line sits below the rising line: the token under-times the move,
// so it reads faster than the steady velocity wants.
//
// The chart shape is invariant to which token is selected — every duration and
// distance scales with T, so the dynamic line is always the diagonal and the
// token line always sits a quarter of the way up. That is honest (the
// relationship genuinely is scale-free); the ms labels are what tie it to the
// chosen token. Normalizing this way keeps both lines on screen for fast and
// slower alike without clipping the 4×T dynamic peak.
//
//   tokenNorm(d)   = 0.25                (T / 4T)
//   dynamicNorm(d) = d                   ((d / 0.25 · T) / 4T)
const PLOT = { x0: 12, x1: 96, y0: 46, y1: 6 }

// Map a distance fraction (0..1) and a normalized duration (0..1) into the SVG
// plot box. Y is inverted so larger durations sit higher.
function px(d) { return PLOT.x0 + d * (PLOT.x1 - PLOT.x0) }
function py(v) { return PLOT.y0 - v * (PLOT.y0 - PLOT.y1) }

function DurationDistanceChart({ mode }) {
  const tokenActive   = mode === 'duration'
  const dynamicActive = mode === 'velocity'

  // The near dot — where the two lines cross (d = 0.25, normalized v = 0.25).
  const cross = { x: px(0.25), y: py(0.25) }

  return (
    <svg viewBox="0 0 100 52" className={styles.chart} aria-hidden="true">
      {/* Axes */}
      <line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x0} y2={PLOT.y0} className={styles.axis} />
      <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x1} y2={PLOT.y0} className={styles.axis} />

      {/* Distance guide ticks at the three travelled fractions. */}
      {DISTANCES.map(({ id, fraction }) => (
        <line
          key={id}
          x1={px(fraction)} y1={PLOT.y0}
          x2={px(fraction)} y2={PLOT.y1}
          className={styles.gridline}
        />
      ))}

      {/* Dynamic line (constant velocity): origin to top-right. */}
      <line
        x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)}
        className={`${styles.line} ${dynamicActive ? styles.lineActive : ''}`}
      />
      {/* Token line (constant duration): flat at a quarter height. */}
      <line
        x1={px(0)} y1={py(0.25)} x2={px(1)} y2={py(0.25)}
        className={`${styles.line} ${tokenActive ? styles.lineActive : ''}`}
      />

      {/* Markers on the active line at each distance. */}
      {DISTANCES.map(({ id, fraction }) => {
        const v = tokenActive ? 0.25 : fraction
        return (
          <circle
            key={id}
            cx={px(fraction)} cy={py(v)} r={2.4}
            className={styles.marker}
          />
        )
      })}

      {/* Crossing point — the one distance the token is tuned for. */}
      <circle cx={cross.x} cy={cross.y} r={1.8} className={styles.crossPoint} />

      <text x={px(0)} y={PLOT.y0 + 5} className={styles.axisLabel}>distance →</text>
    </svg>
  )
}
