import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FEEDBACK_EASE } from '../../utils/feedbackDuration'
import styles from './EasingVisualizer.module.css'

// ─── Bernstein polynomial ──────────────────────────────────────────────────────
//
// A cubic Bézier curve is defined by four control points. For CSS cubic-bezier,
// P0=(0,0) and P3=(1,1) are always fixed. Only P1=(x1,y1) and P2=(x2,y2) vary.
//
// The curve is parameterized by t ∈ [0,1]. At each t, the point on the curve is:
//
//   B(t) = (1-t)³·P0  +  3(1-t)²t·P1  +  3(1-t)t²·P2  +  t³·P3
//           ────────      ───────────      ───────────      ─────
//           B₀(t)·P0      B₁(t)·P1        B₂(t)·P2        B₃(t)·P3
//
// Since P0=0 and P3=1, the P0 term vanishes and P3 contributes t³:
//   coord(t) = 3(1-t)²t·p1  +  3(1-t)t²·p2  +  t³
function bernstein(t, p1, p2) {
  const mt = 1 - t
  return (
    3 * mt * mt * t * p1 +   // B₁(t) · P1
    3 * mt * t  * t * p2 +   // B₂(t) · P2
    t  * t  * t               // B₃(t) · P3=1
  )
}

function sampleCurve(x1, y1, x2, y2, steps = 30) {
  const points = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push({
      svgX: bernstein(t, x1, x2) * 100,
      svgY: (1 - bernstein(t, y1, y2)) * 100, // flip: y=1 → top, y=0 → bottom
    })
  }
  return points
}

function buildPath(points) {
  const [first, ...rest] = points
  const start = `M ${first.svgX.toFixed(2)} ${first.svgY.toFixed(2)}`
  const lines = rest.map(p => `L ${p.svgX.toFixed(2)} ${p.svgY.toFixed(2)}`).join(' ')
  return `${start} ${lines}`
}

// ─── Coordinate conversion ────────────────────────────────────────────────────
//
// The SVG has viewBox="0 -25 100 135":
//   vbMinX = 0,   vbWidth  = 100
//   vbMinY = -25, vbHeight = 135
//
// Given a pointer at (clientX, clientY) and the SVG's bounding rect:
//
//   Step 1 — normalize to [0,1] within the element's pixel bounds:
//     normX = (clientX - rect.left) / rect.width
//     normY = (clientY - rect.top)  / rect.height
//
//   Step 2 — scale to viewBox space (multiply by dimensions, add origin offset):
//     svgX = normX * 100           (vbWidth = 100, vbMinX = 0 → no offset)
//     svgY = normY * 135 + (-25)   (vbHeight = 135, vbMinY = -25)
//
//   Step 3 — convert SVG coordinates to bezier values:
//     bezierX = svgX / 100
//     bezierY = 1 - svgY / 100     (flip y: svgY=0 → bezierY=1, svgY=100 → bezierY=0)
//
// x is clamped to [0,1] — control points can't be placed outside the start/end.
// y is left unclamped — spring curves intentionally overshoot above y=1.
function pixelToBezier(clientX, clientY, rect) {
  const normX  = (clientX - rect.left) / rect.width
  const normY  = (clientY - rect.top)  / rect.height
  const svgX   = normX * 100
  const svgY   = normY * 135 - 25
  return {
    x: Math.max(0, Math.min(1, svgX / 100)),
    y: 1 - svgY / 100,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Pure in the data sense: curve values are owned by the parent.
// Internal state only tracks which point is being dragged — this is ephemeral
// UI state that has no meaning outside the interaction in progress.
//
// Why pointer events instead of Framer Motion's `drag` prop:
// Framer Motion's drag positions elements via CSS transform: translate().
// SVG cx/cy attributes are separate from CSS transforms — they occupy different
// coordinate systems. If you enable `drag` on a motion.circle, Framer Motion
// translates it but cx/cy remain unchanged, breaking every dependent calculation
// (handle lines, curve sampling, coordinate readback). Pointer events with
// setPointerCapture give direct clientX/clientY access and work correctly
// with SVG math. Framer Motion still drives all animations (path morphing,
// preset transitions) — just not the drag interaction mechanics.
// onDragStart / onDragEnd — optional callbacks fired when a control point drag
// begins or ends. TokenLab uses these to set the active token to 'easing' so
// DemoWrapper can highlight the components affected by easing changes.
export function EasingVisualizer({ curve, onCurveChange, onDragStart, onDragEnd }) {
  const [x1, y1, x2, y2] = curve
  const svgRef    = useRef(null)
  const [dragging, setDragging] = useState(null) // 'p1' | 'p2' | null

  const points = sampleCurve(x1, y1, x2, y2)
  const pathD  = buildPath(points)

  // Control points in SVG space — derived fresh each render from the curve prop.
  // During drag, onCurveChange fires → parent updates curve → these recompute.
  const p1 = { x: x1 * 100, y: (1 - y1) * 100 }
  const p2 = { x: x2 * 100, y: (1 - y2) * 100 }

  function startDrag(point) {
    return (e) => {
      e.preventDefault()
      // setPointerCapture ensures the SVG receives all subsequent pointer events
      // even if the cursor moves outside the element's bounds mid-drag.
      svgRef.current.setPointerCapture(e.pointerId)
      setDragging(point)
      onDragStart?.()
    }
  }

  function handlePointerMove(e) {
    if (!dragging || !onCurveChange) return
    const { x, y } = pixelToBezier(e.clientX, e.clientY, svgRef.current.getBoundingClientRect())
    if (dragging === 'p1') onCurveChange([x, y, x2, y2])
    else                   onCurveChange([x1, y1, x, y])
  }

  function handlePointerUp(e) {
    svgRef.current.releasePointerCapture(e.pointerId)
    setDragging(null)
    onDragEnd?.()
  }

  // During drag: transition duration is 0 so the curve tracks the cursor
  //             without animation lag.
  // During preset switch: transition duration is 0.35 for smooth morphing.
  //
  // The curve path uses duration 0 during any drag (dragging !== null),
  // since the path shape changes on every pointer move event.
  // Individual control points use duration 0 only for their own point's drag.
  const curveDuration = dragging ? 0 : 0.35
  const pointDuration = (point) => dragging === point ? 0 : 0.35
  // Chrome easing for the curve's own redraw — the standard curve, fixed (it is
  // the visualizer's UI, not a token demonstration). dur is the morph duration,
  // set by the caller above (0 during drag, 0.35 on preset switch).
  const transition = (dur) => ({ duration: dur, ease: FEEDBACK_EASE })

  return (
    <div className={styles.container}>
      <svg
        ref={svgRef}
        viewBox="0 -25 100 135"
        className={`${styles.svg} ${dragging ? styles.dragging : ''}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Grid — the [0,1]×[0,1] reference space */}
        <rect x={0} y={0} width={100} height={100} className={styles.grid} />

        {/* Diagonal — linear easing reference line */}
        <line x1={0} y1={100} x2={100} y2={0} className={styles.diagonal} />

        {/* Control handles: dotted lines from endpoints to control points.
            Plain <line> elements — no animation, always in sync with the curve prop. */}
        <line x1={0}   y1={100} x2={p1.x} y2={p1.y} className={styles.handle} />
        <line x1={100} y1={0}   x2={p2.x} y2={p2.y} className={styles.handle} />

        {/* The curve — morphs between shapes as the curve prop changes.
            During any drag: instant (duration 0) so the path tracks every
            pointer-move event without lag.
            On preset change: animated (0.35s) for smooth morphing. */}
        <motion.path
          d={pathD}
          animate={{ d: pathD }}
          transition={transition(curveDuration)}
          className={styles.curve}
        />

        {/* Fixed endpoints — P0 (bottom-left) and P3 (top-right).
            Rendered before control points so control points paint on top.
            SVG has no z-index — stacking order is strictly document order,
            last element wins. Endpoints were previously last, causing them
            to cover the draggable handles when a control point approached
            a corner position. */}
        <circle cx={0}   cy={100} r={3} className={styles.endPoint} />
        <circle cx={100} cy={0}   r={3} className={styles.endPoint} />

        {/* P1 control point — draggable, tethered to P0 handle */}
        <motion.circle
          r={4}
          cx={p1.x}
          cy={p1.y}
          animate={{ cx: p1.x, cy: p1.y }}
          transition={transition(pointDuration('p1'))}
          className={`${styles.controlPoint} ${dragging === 'p1' ? styles.controlPointActive : ''}`}
          onPointerDown={startDrag('p1')}
        />

        {/* P2 control point — draggable, tethered to P3 handle */}
        <motion.circle
          r={4}
          cx={p2.x}
          cy={p2.y}
          animate={{ cx: p2.x, cy: p2.y }}
          transition={transition(pointDuration('p2'))}
          className={`${styles.controlPoint} ${dragging === 'p2' ? styles.controlPointActive : ''}`}
          onPointerDown={startDrag('p2')}
        />

      </svg>
    </div>
  )
}
