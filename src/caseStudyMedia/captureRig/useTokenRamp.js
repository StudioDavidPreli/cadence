import { useEffect, useRef } from 'react'

// ─── useTokenRamp ─────────────────────────────────────────────────────────────
// Drives a value along a triangle wave with dwells at both ends:
//
//   min ──(legMs)──▶ max ──(dwellMs hold)── max ──(legMs)──▶ min ──(hold)── …
//
// Built for the capture rig: the ramp plays the role of a human dragging a
// slider, so its output is quantized to the slider's own step. A real drag of
// the duration.fast control can only land on multiples of 10 (the input's
// step attribute), and the rig should not produce values the shipped control
// cannot. onValue fires only when the quantized value changes, so consumers
// re-render at the slider's grain, not at 60fps.
//
// The dwells exist for the camera: the viewer needs a beat at each extreme to
// register the endpoint before the ramp turns around.
//
// onValue is kept in a ref so a re-render of the caller never restarts the
// ramp mid-leg; the rAF loop starts and stops only when `running` flips.
export function useTokenRamp({ min, max, step, legMs, dwellMs, running, onValue }) {
  const onValueRef = useRef(onValue)
  onValueRef.current = onValue

  useEffect(() => {
    if (!running) return

    let raf
    let last = null
    const cycleMs = 2 * (legMs + dwellMs)
    const start = performance.now()

    const tick = (now) => {
      const t = (now - start) % cycleMs
      let value
      if (t < legMs) {
        value = min + (max - min) * (t / legMs)          // rising leg
      } else if (t < legMs + dwellMs) {
        value = max                                       // dwell at the top
      } else if (t < 2 * legMs + dwellMs) {
        value = max - (max - min) * ((t - legMs - dwellMs) / legMs) // falling leg
      } else {
        value = min                                       // dwell at the bottom
      }

      const quantized = Math.round(value / step) * step
      if (quantized !== last) {
        last = quantized
        onValueRef.current(quantized)
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, min, max, step, legMs, dwellMs])
}
