import { useEffect, useRef, useState } from 'react'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { INITIAL_STATE, stateToTokens } from '../../data/motionPresets'
import { Toggle } from '../../components/Toggle'
import rigStyles from './CaptureRig.module.css'

// ─── PrincipleTriggerScene (V01 material, David's spec 2026-08-02) ───────────
//
// The spring-vs-overshoot pattern generalized: one expanded-card principle
// demo on stage, and a remote trigger toggle at the top of the screen, above
// the crop line, so the capture never contains the pointer that drives it.
//
// The demos are self-contained on purpose (their state resets when a card
// collapses), so the rig does not thread props into them. The trigger
// forwards a real click to the demo's own interactive element instead:
// HierarchyOfMotion's PARENT is a <button>, SolidDrawing's Card is a
// role="button", and .click() runs the same handler a finger would. Both
// demos toggle a binary state per click, so the trigger toggle's on/off
// stays an honest mirror as long as the demo is driven from the top.
//
// Space runs a hands-free cycle for looping takes; clicking the demo itself
// still works (it just leaves the trigger's visual state behind by one).

// Take knobs. HOLD_MS is the rest between auto-cycle clicks; it must outlast
// the demo's full cascade (Hierarchy's longest child delay plus its travel).
const HOLD_MS = 2500

export function PrincipleTriggerScene({ sceneName, demo: Demo }) {
  const stageRef = useRef(null)
  const [on, setOn] = useState(false)
  const [running, setRunning] = useState(false)

  const fire = () => {
    stageRef.current?.querySelector('button, [role="button"]')?.click()
  }

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setOn((o) => !o)
      fire()
    }, HOLD_MS)
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

  return (
    <div className={rigStyles.stage}>
      {/* Above the crop line: frame the recording below this block. */}
      <header className={rigStyles.hint}>
        capture rig · {sceneName} · Space {running ? 'stops' : 'starts'} the cycle · or click the trigger below
      </header>

      <div className={rigStyles.triggerRow}>
        <span className={rigStyles.compareSub}>trigger</span>
        <Toggle
          on={on}
          onChange={(next) => {
            setOn(next)
            fire()
          }}
          size="sm"
        />
      </div>

      <div className={rigStyles.scene}>
        {/* The stage holds the demo at the expanded card's demo width, then
            magnifies it for the camera (transform, so the demo lays out at
            its shipped geometry). respectReducedMotion={false} matches the
            demo column: the scene exists to show motion on camera. */}
        <div className={rigStyles.principleStage} ref={stageRef}>
          <MotionTokensProvider tokens={stateToTokens(INITIAL_STATE)} respectReducedMotion={false}>
            <Demo />
          </MotionTokensProvider>
        </div>
      </div>
    </div>
  )
}
