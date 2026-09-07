// The two plots on the Measure page, as inline SVG in the visualizers'
// register (DurationVisualizer, SpringVisualizer): a bounded viewBox, axes on
// border2, the thing being read on accent. Static; nothing here animates.

import { bezierY, unsignedProgress } from './measureModel'
import styles from './Measure.module.css'

// ─── The energy trace ────────────────────────────────────────────────────────
// One bar per frame: the mean pixel change from the previous frame. Frames
// inside a detected transition draw on accent; holds stay muted. This is the
// recording as the model sees it, before any curve is fitted.
const TRACE = { w: 300, h: 56, x0: 2, x1: 298, y0: 50, y1: 4 }

export function TracePlot({ t, e, segments, thr }) {
  const n = e.length
  const peak = Math.max(...e, thr, 1e-6)
  const barW = (TRACE.x1 - TRACE.x0) / n
  const py = v => TRACE.y0 - (v / peak) * (TRACE.y0 - TRACE.y1)
  const inSegment = i => segments.some(s => i >= s.start && i <= s.end)
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${TRACE.w} ${TRACE.h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Motion energy per frame, ${n} frames, ${segments.length} transitions detected`}
    >
      <line className={styles.axis} x1={TRACE.x0} y1={TRACE.y0} x2={TRACE.x1} y2={TRACE.y0} />
      <line className={styles.threshold} x1={TRACE.x0} y1={py(thr)} x2={TRACE.x1} y2={py(thr)} />
      {e.map((v, i) => (
        <rect
          key={t[i]}
          className={inSegment(i) ? styles.barMoving : styles.barQuiet}
          x={TRACE.x0 + i * barW}
          y={py(v)}
          width={Math.max(barW - 0.3, 0.4)}
          height={TRACE.y0 - py(v)}
        />
      ))}
    </svg>
  )
}

// ─── One transition's progress ───────────────────────────────────────────────
// The recorded progress curve as dots (cumulative energy, normalized) against
// the fitted named curve as a line, both on the fit's own time base (onset t0,
// duration D). The dots are the evidence; the line is the claim. When they
// disagree the reader sees where.
const PROG = { w: 160, h: 100, x0: 8, x1: 152, y0: 92, y1: 8 }

export function ProgressPlot({ segment, curve }) {
  const { progress } = segment
  const yOf = unsignedProgress(x => bezierY(curve.bezier, x))
  const span = (progress.ts[progress.ts.length - 1] - progress.ts[0]) || 1
  const px = time => PROG.x0 + ((time - progress.ts[0]) / span) * (PROG.x1 - PROG.x0)
  const py = p => PROG.y0 - p * (PROG.y0 - PROG.y1)
  const steps = 60
  const line = Array.from({ length: steps + 1 }, (_, i) => {
    const time = progress.ts[0] + (span * i) / steps
    return `${i === 0 ? 'M' : 'L'} ${px(time).toFixed(1)} ${py(yOf((time - curve.t0) / curve.D)).toFixed(1)}`
  }).join(' ')
  return (
    <svg
      className={styles.progressChart}
      viewBox={`0 0 ${PROG.w} ${PROG.h}`}
      role="img"
      aria-label={`Recorded progress against the fitted ${curve.name} curve`}
    >
      <line className={styles.axis} x1={PROG.x0} y1={PROG.y0} x2={PROG.x1} y2={PROG.y0} />
      <line className={styles.axis} x1={PROG.x0} y1={PROG.y0} x2={PROG.x0} y2={PROG.y1} />
      <line className={styles.restLine} x1={PROG.x0} y1={py(1)} x2={PROG.x1} y2={py(1)} />
      <path className={styles.curve} d={line} />
      {progress.ts.map((time, i) => (
        <circle key={time} className={styles.sample} cx={px(time)} cy={py(progress.ps[i])} r={2} />
      ))}
    </svg>
  )
}
