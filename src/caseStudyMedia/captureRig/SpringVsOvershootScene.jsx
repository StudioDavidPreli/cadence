import { useEffect, useState } from 'react'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { EASING_CURVES, INITIAL_STATE, stateToTokens } from '../../data/motionPresets'
import { Toggle } from '../../components/Toggle'
import { EasingVisualizer } from '../../components/EasingVisualizer'
import { SpringVisualizer } from '../../components/SpringVisualizer'
import rigStyles from './CaptureRig.module.css'

// ─── SpringVsOvershootScene (V04, David's spec 2026-07-31, revised 08-01) ────
//
// The imitation next to the physics: two Toggles flipped by one shared state,
// the left riding the overshoot bezier release (duration.fast on
// ease.overshoot), the right riding the real spring (stiffness, damping,
// mass, no duration anywhere). Above each toggle, the tool's own graphic for
// its curve: the bezier editor showing the overshoot handles (read-only here,
// a no-op onCurveChange) and the settle-curve plot of the same spring values
// the toggle consumes.
//
// The trigger toggle sits alone at the top of the screen, outside the
// recording frame: David clicks it there, both demonstration toggles flip,
// and the captured region never contains a mouse pointer. Space still runs
// the hands-free auto-flip cycle.

// Take knobs. HOLD_MS must outlast the spring's settle or the ring gets cut
// off mid-take; COMPARE_SCALE magnifies the 44×26 toggles for the camera.
const HOLD_MS = 2000
const COMPARE_SCALE = 2

export function SpringVsOvershootScene() {
  const [on, setOn] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setOn((o) => !o), HOLD_MS)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setRunning((r) => !r)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { spring, duration } = INITIAL_STATE

  return (
    <div className={rigStyles.stage}>
      {/* Everything above the crop line: the operator strip and the remote
          trigger. Frame the recording below this block. */}
      <header className={rigStyles.hint}>
        capture rig · spring-vs-overshoot · Space {running ? 'stops' : 'starts'} the flip cycle · or click the trigger below
      </header>

      <MotionTokensProvider tokens={stateToTokens(INITIAL_STATE)} respectReducedMotion={false}>
        <div className={rigStyles.triggerRow}>
          <span className={rigStyles.compareSub}>trigger</span>
          <Toggle on={on} onChange={setOn} size="sm" />
        </div>

        <div className={rigStyles.scene}>
          {/* The CSS-var passthrough (the --plant-aspect pattern): the scale is
              a take knob, so it rides a variable instead of a hardcoded class. */}
          <div className={rigStyles.compareRow} style={{ '--compare-scale': COMPARE_SCALE }}>
            <div className={rigStyles.compareCol}>
              <span className={rigStyles.compareTitle}>ease.overshoot</span>
              <span className={rigStyles.compareSub}>{EASING_CURVES.overshoot.css}</span>
              <span className={rigStyles.compareSub}>duration.fast · {duration.fast}ms</span>
              <div className={`${rigStyles.compareCurve} ${rigStyles.curveBezier}`}>
                {/* The tool's bezier editor, held still: the curve prop is
                    fixed and the change handler drops the drag on the floor.
                    allowOvershoot buys the vertical headroom the 1.56 handle
                    needs, exactly as Explore mode does. */}
                <EasingVisualizer
                  curve={EASING_CURVES.overshoot.fm}
                  onCurveChange={() => {}}
                  allowOvershoot
                />
              </div>
              <div className={rigStyles.compareStage}>
                <Toggle on={on} onChange={setOn} motionMode="bezier" />
              </div>
            </div>

            <div className={rigStyles.compareCol}>
              <span className={rigStyles.compareTitle}>spring</span>
              <span className={rigStyles.compareSub}>stiffness {spring.stiffness} · damping {spring.damping}</span>
              <span className={rigStyles.compareSub}>mass {spring.mass} · no duration</span>
              <div className={`${rigStyles.compareCurve} ${rigStyles.curveSpring}`}>
                <SpringVisualizer spring={spring} />
              </div>
              <div className={rigStyles.compareStage}>
                <Toggle on={on} onChange={setOn} motionMode="spring" />
              </div>
            </div>
          </div>
        </div>
      </MotionTokensProvider>
    </div>
  )
}
