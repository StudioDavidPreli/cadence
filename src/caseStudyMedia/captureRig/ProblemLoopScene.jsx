import { useCallback, useEffect, useState } from 'react'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { INITIAL_STATE, stateToTokens } from 'cadence-tokens'
import { Button } from '../../components/Button'
import tlStyles from '../../components/TokenLab/TokenLab.module.css'
import rigStyles from './CaptureRig.module.css'
import { useTokenRamp } from './useTokenRamp'

// ─── Ramp parameters (V02, David's spec 2026-07-31) ──────────────────────────
// 50ms → 350ms with pauses at the extremes. Leg and dwell lengths are take
// knobs: adjust here between takes, nothing else reads them. The 2s dwell is
// deliberate viewing room: long enough to press the button several times at
// each extreme, so the viewer gets the full press sequence at both endpoints.
const RAMP = { min: 50, max: 350, step: 10, legMs: 3000, dwellMs: 2000 }

// ─── ProblemLoopScene ────────────────────────────────────────────────────────
// The V02 capture scene: the duration.fast slider ramps itself while David
// clicks the button on camera. Isolated in layout, not in machinery — every
// ramp tick runs the same two-channel update TokenLab's dispatch wrapper runs
// (Channel 1: the CSS custom property; Channel 2: React state feeding
// MotionTokensProvider), so the Button retimes for exactly the reason it
// retimes in the shipped tool. Nothing here animates the slider thumb; the
// thumb moves because the state moved.
//
// The slider is the real <input type="range"> wearing TokenLab's own classes,
// but its range is narrowed to the ramp span (the shipped control runs
// 50–500 constrained). Camera staging: with track == ramp span, the thumb
// sweeps the full track and the motion reads at full scale.
export function ProblemLoopScene() {
  const [state, setState] = useState(() => ({
    ...INITIAL_STATE,
    duration: { ...INITIAL_STATE.duration, fast: RAMP.min },
  }))
  const [running, setRunning] = useState(false)

  // The two-channel write, mirroring TokenLab's dispatch(SET_DURATION):
  // CSS first for anything reading the document, then state for the provider.
  // Both derive from the same value, so the channels cannot disagree.
  const setDurationFast = useCallback((value) => {
    document.documentElement.style.setProperty('--motion-duration-fast', `${value}ms`)
    setState((s) => ({ ...s, duration: { ...s.duration, fast: value } }))
  }, [])

  // Channel 1 starts at the ramp floor too: state initializes to RAMP.min
  // above, and this writes the matching CSS value once on mount so the scene
  // never shows Standard's 100ms.
  useEffect(() => {
    setDurationFast(RAMP.min)
  }, [setDurationFast])

  useTokenRamp({ ...RAMP, running, onValue: setDurationFast })

  // Space toggles the ramp so a take can start with hands off the pointer
  // (the pointer belongs to the button once recording starts).
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
      {/* Above the crop line: frame the recording below this strip. */}
      <header className={rigStyles.hint}>
        capture rig · problem-loop · Space {running ? 'stops' : 'starts'} the ramp
      </header>

      <div className={rigStyles.scene}>
        <div className={rigStyles.sliderBox}>
          {/* TokenLab's SliderRow markup with its own classes, so the control
              is pixel-identical to the shipped tool bar. Not interactive:
              the ramp owns this control (pointer-events off in rig CSS), and
              the no-op onChange is only there because React requires a
              handler on a controlled input. */}
          <div className={tlStyles.sliderRow}>
            <div className={tlStyles.sliderLabel}>
              <span className={tlStyles.sliderName}>duration.fast</span>
              <span className={tlStyles.sliderValue}>{state.duration.fast}ms</span>
            </div>
            <input
              type="range"
              className={`${tlStyles.slider} ${rigStyles.rampSlider}`}
              aria-label="duration.fast (driven by the capture ramp)"
              min={RAMP.min}
              max={RAMP.max}
              step={RAMP.step}
              value={state.duration.fast}
              onChange={() => {}}
              tabIndex={-1}
            />
          </div>
        </div>

        {/* respectReducedMotion={false} matches TokenLab's demo column: the
            scene exists specifically to show motion on camera. */}
        <MotionTokensProvider tokens={stateToTokens(state)} respectReducedMotion={false}>
          <Button>Press me</Button>
        </MotionTokensProvider>
      </div>
    </div>
  )
}
