// True once a Rive instance has had a frame to draw (2026-09-08, David's
// call: the display titles show their SVG poster until the canvas paints,
// not the plain word).
//
// `rive` from useRive turns non-null when the file has loaded and the
// artboard is instantiated, which is one frame BEFORE anything is on the
// canvas: the first draw happens on the runtime's next animation frame.
// Dropping the poster on load alone leaves a blank box for that frame. Two
// animation frames after load, the canvas has painted at least once and the
// poster can go; the handoff is poster to art with nothing empty between.
//
// Resets to false if the instance goes away (a remount), so a re-created
// canvas gets its poster back for its own first paint.
import { useEffect, useState } from 'react'

export function useRivePainted(rive) {
  const [painted, setPainted] = useState(false)
  useEffect(() => {
    if (!rive) {
      setPainted(false)
      return undefined
    }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setPainted(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [rive])
  return painted
}
