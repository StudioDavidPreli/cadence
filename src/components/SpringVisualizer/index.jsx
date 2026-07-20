import { useMemo } from 'react'
import { sampleSettleCurve, dampingRatio } from './springCurve'
import styles from './SpringVisualizer.module.css'

// ─── SpringVisualizer ─────────────────────────────────────────────────────────
//
// Sits inside the Spring control section, below the three sliders, the way
// DurationVisualizer sits below the duration sliders. It draws the settle curve
// the three params describe: displacement over time, rising from rest, overshooting
// past the target if the spring is underdamped, and settling. Drag a slider and
// the curve redraws.
//
// It reads the spring params as a prop, not through useMotionTokens(): the controls
// column lives outside MotionTokensProvider, and the reducer already owns these
// numbers. Same stance DurationVisualizer takes. The live springing version of
// this is the SpringDemo in the demo column; this is the diagram of it.
//
// The math is pure and tested in springCurve.js.

// SVG plot box. Y is inverted (larger displacement sits higher).
const PLOT = { x0: 10, x1: 98, y0: 46, y1: 6 }

// Map a 0..1 time fraction to an x in the plot box.
function px(tFraction) {
  return PLOT.x0 + tFraction * (PLOT.x1 - PLOT.x0)
}

export function SpringVisualizer({ spring }) {
  const { points, window, yMax, overshoot, settleTime, zeta } = useMemo(() => {
    const sampled = sampleSettleCurve(spring)
    return { ...sampled, zeta: dampingRatio(spring) }
    // Deps are the three primitive params, not the spring object, by design.
    // The memo reads only spring.stiffness/damping/mass (through
    // sampleSettleCurve and dampingRatio), so keying on the primitives covers
    // everything it reads and is more precise than object identity: a new
    // spring object with identical values will not force a needless redraw.
    // Dragging any slider changes one primitive, so the settle curve still
    // redraws live as the reducer hands down a new spring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spring.stiffness, spring.damping, spring.mass])

  // Top of the Y range: the real peak plus headroom, floored so the rest line at
  // displacement 1 never pins to the very top when there is no overshoot.
  const yTop = Math.max(yMax * 1.05, 1.12)
  const py = x => PLOT.y0 - (x / yTop) * (PLOT.y0 - PLOT.y1)
  const restY = py(1)

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.t / window).toFixed(2)} ${py(p.x).toFixed(2)}`)
    .join(' ')

  const regime =
    zeta < 1 - 1e-3 ? 'underdamped' : zeta > 1 + 1e-3 ? 'overdamped' : 'critically damped'

  return (
    <div className={styles.visualizer}>
      <div className={styles.headerRow}>
        <span className={styles.title}>Settle curve</span>
        <span className={styles.tokenValue}>ζ {zeta.toFixed(2)} · {regime}</span>
      </div>

      <svg viewBox="0 0 100 52" className={styles.chart} aria-hidden="true">
        {/* Axes. */}
        <line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x0} y2={PLOT.y0} className={styles.axis} />
        <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x1} y2={PLOT.y0} className={styles.axis} />

        {/* The target the spring chases: a dashed line at displacement 1. */}
        <line x1={PLOT.x0} y1={restY} x2={PLOT.x1} y2={restY} className={styles.restLine} />
        <text x={PLOT.x1} y={restY - 1.6} textAnchor="end" className={styles.axisLabel}>rest</text>

        {/* The settle curve itself. */}
        <path d={path} className={styles.curve} />

        <text x={PLOT.x0} y={PLOT.y0 + 5} className={styles.axisLabel}>time →</text>
      </svg>

      <p className={styles.caption}>
        {overshoot > 0.001
          ? `Overshoots ${Math.round(overshoot * 100)}% past rest, settles in about ${settleTime.toFixed(2)}s.`
          : `No overshoot, settles in about ${settleTime.toFixed(2)}s.`}
      </p>
    </div>
  )
}
