import styles from './InPractice.module.css'

// ─── Chart stand-in ── TEMPORARY ─────────────────────────────────────────────
//
// A placeholder for the chart the Basis chart embed will draw inside the
// frame (docs/briefings/IN_PRACTICE_BASIS_CHART_EMBED_HANDOFF.md). It exists
// so the page can be judged at its real proportions while the frame still
// loads the chartless table-sort. BasisPractice renders it only while
// CHART_STAND_IN is true, which turns false the moment BASIS_EMBED_PATH moves
// to the chart embed; then this file is deleted.
//
// The lines are fixed, not random per render: a seeded generator (a linear
// congruential one, the smallest that gives a plausible walk) runs once at
// module load, so every visit and every test sees the same picture. Nothing
// here is data. The label says so.

const WIDTH = 800
const HEIGHT = 180
const POINTS = 40
const SERIES = 5

function walk(seed) {
  let state = seed
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
  let y = 0.3 + next() * 0.4
  const out = []
  for (let i = 0; i < POINTS; i++) {
    y = Math.min(0.92, Math.max(0.08, y + (next() - 0.5) * 0.12))
    out.push(`${((i / (POINTS - 1)) * WIDTH).toFixed(1)},${(y * HEIGHT).toFixed(1)}`)
  }
  return out.join(' ')
}

const LINES = Array.from({ length: SERIES }, (_, i) => walk(i * 7919 + 17))
const GRID = [0.25, 0.5, 0.75].map((f) => f * HEIGHT)

export function ChartStandIn() {
  return (
    <div className={styles.chartStandIn} data-testid="chart-stand-in">
      <span className={styles.chartLabel}>Chart stand-in. The Basis embed draws the real one.</span>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {GRID.map((y) => (
          <line key={y} className={styles.chartGrid} x1="0" x2={WIDTH} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
        ))}
        {LINES.map((points, i) => (
          <polyline
            key={i}
            className={`${styles.chartLine} ${i === 0 ? styles.chartLineFocus : ''}`}
            points={points}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  )
}
