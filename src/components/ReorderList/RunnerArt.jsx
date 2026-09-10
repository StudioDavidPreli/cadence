// The runner at the end of each Reorder row (David's, 2026-09-10): four small
// Rive scenes, one per preset, that run while the row is held, by keyboard or
// pointer alike, and stand still otherwise. No display-mode instances: the
// files carry no theme binding and draw on a transparent canvas, so React
// binds nothing and writes nothing. Read through the web runtime the day they
// arrived: one artboard each (snappyRun, standardRun, cinematicRun,
// exploreRun), one timeline, one state machine (<name>SM) with no inputs.
// Play and pause are the whole interface.
//
// On the display-title convention (MeasureTitle, the Glossary titles):
// reduced motion renders the SVG poster and never fetches the .riv; on the
// motion path the same poster shows until the canvas has drawn once, and
// stays if the file never loads. The poster and the canvas are mounted
// together and the poster is toggled with `hidden`, never swapped with the
// canvas (the remount-flash rule). The poster's display rule in the module
// CSS is guarded with :not([hidden]); without the guard the attribute does
// nothing against an author display rule, and the first build shipped the
// poster under the running figure (David's catch, 2026-09-10).
//
// The still frame comes from the render loop, not from load. Measured in a
// raw harness the same day: with autoplay off the runtime's load-time
// drawFrame leaves the canvas blank, an explicit drawFrame() after sizing
// leaves it blank, and pausing at 0ms after load leaves it blank; only a
// pause after at least one rendered frame keeps a frame on the canvas. So
// the file autoplays, and the first frame event is the signal for both
// handoffs: the poster hides and, if the row is not held, the runner pauses
// on that frame. The event is EventType.Advance, not EventType.Draw: Draw is
// declared in this runtime (webgl2 2.x) and never fired, which a subscription
// to it demonstrated on built output; Advance fires from the per-frame path
// only (the load-time advanceIfPaused calls the state machine directly and
// fires nothing), and by the time React handles it the frame is on the
// canvas. A timer (useRivePainted) would be the wrong signal here:
// the React wrapper stops rendering for a canvas outside the viewport, and
// this demo loads below Carousel's fold, so a timer would hide the poster
// onto a canvas that has never drawn. With no draw, the poster stays, which
// is the truth.
//
// Pausing on release holds the stride where it was, so a row picked up again
// resumes mid-step rather than restarting.
import { useEffect, useState } from 'react'
import { useRive, EventType, Layout, Fit, Alignment } from '@rive-app/react-webgl2'
import { useReducedMotion } from 'framer-motion'
import styles from './ReorderList.module.css'

export function RunnerArt({ src, stateMachine, poster, playing }) {
  const reduce = useReducedMotion()
  return (
    <span className={styles.art} aria-hidden="true">
      {reduce ? (
        <img className={styles.artPoster} src={poster} alt="" draggable="false" />
      ) : (
        <RunnerRive src={src} stateMachine={stateMachine} poster={poster} playing={playing} />
      )}
    </span>
  )
}

// The Rive half, isolated so its hooks only run when motion is allowed.
function RunnerRive({ src, stateMachine, poster, playing }) {
  // The wrapper's viewport observer is off for these. It stops rendering for
  // a canvas outside the viewport and defers sizing it until it scrolls in,
  // and sizing writes the canvas's width and height, which clears the
  // bitmap; a paused instance is never told to redraw, so a runner that
  // paused below Carousel's fold came back blank on scroll-in (reproduced
  // on built output, 2026-09-10: the fully off-screen rows, every few
  // loads). The observer exists to save off-screen rendering, and these
  // render one frame and pause, so it saves nothing here.
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    autoplay: true,
    autoBind: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  }, { shouldUseIntersectionObserver: false })

  // True after the runtime's first draw of THIS instance. Resets when the
  // instance goes away, so a remount gets its poster back.
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    if (!rive) {
      setDrawn(false)
      return undefined
    }
    // Advance fires before the runtime checks the canvas size, and it skips
    // the draw on a zero-size canvas. Below the fold the React wrapper has
    // not sized the canvas yet when the first advances arrive, so an advance
    // counts only once the canvas has pixels (found on built output: with the
    // demo loading below Carousel's fold, three rows went blank on scroll-in
    // when the first advance was taken as a frame).
    const onFrame = () => {
      const canvas = rive.canvas
      if (!canvas || !(canvas.width > 0 && canvas.height > 0)) return
      setDrawn(true)
      rive.off(EventType.Advance, onFrame)
    }
    rive.on(EventType.Advance, onFrame)
    return () => rive.off(EventType.Advance, onFrame)
  }, [rive])

  // Play while held, pause otherwise, but only once a frame exists to hold:
  // a pause before the first draw leaves the canvas blank (see above). The
  // pause waits one animation frame so the frame the advance announced has
  // been flushed to the canvas before the loop stops.
  useEffect(() => {
    if (!rive || !drawn) return undefined
    if (playing) {
      rive.play()
      return undefined
    }
    const frame = requestAnimationFrame(() => rive.pause())
    return () => cancelAnimationFrame(frame)
  }, [rive, drawn, playing])

  return (
    <>
      <img
        className={styles.artPoster}
        src={poster}
        alt=""
        draggable="false"
        hidden={drawn}
      />
      <RiveComponent className={styles.artCanvas} />
    </>
  )
}
