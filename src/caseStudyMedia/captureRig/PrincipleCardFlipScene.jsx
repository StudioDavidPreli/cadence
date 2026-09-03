import { useEffect, useRef, useState } from 'react'
import { StaticThemeProvider } from '../../context/ThemeContext'
import { MotionTokensProvider } from '../../context/MotionTokensContext'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { INITIAL_STATE, stateToTokens } from 'cadence-tokens'
import { principleBySlug } from '../../data/principles'
import { ExpandedPrincipleBody } from '../../components/PrincipleCard/ExpandedPrincipleBody'
// Imported for one hashed class name, not for styling: `fire` needs a handle on
// the two crossfade layers inside the body. See the function.
import cardStyles from '../../components/PrincipleCard/PrincipleCard.module.css'
import { Toggle } from '../../components/Toggle'
import { Button } from '../../components/Button'
import rigStyles from './CaptureRig.module.css'

// ─── PrincipleCardFlipScene (V01 material, David's spec 2026-08-13) ──────────
//
// The whole expanded card on stage, flipping from the Rive principle animation
// to the UI component demo, with both triggers at the top of the screen above
// the crop line so the recording never contains the pointer that drives it.
//
// The companion to PrincipleTriggerScene, which mounts the bare demo at the
// card's demo width. That one is the UI half in close-up; this one is the card
// making its argument, which is the flip itself.
//
// It can drive the flip from outside the frame because ExpandedPrincipleBody
// owns no state: uiMode is a prop, and each of its three shipped hosts (the
// in-grid card, the deep-link modal, the case-study embed) holds it where its
// own reset logic lives. The rig is a fourth host under the same contract.
//
// Presentation is the embed's: the 460x520 body inside the accent-bordered
// raised panel. See .cardPanel in CaptureRig.module.css.

// Take knobs. The auto-cycle beats, in ms from the top of each cycle, and the
// cycle length. Two fires per cycle because the toggling demos flip a binary
// state per press: the first runs the demo out, the second returns it to rest,
// so the loop closes where it started and a take can run unattended. On a demo
// that returns by itself (Squash & Stretch's Button) the second press is simply
// a second press, which loops fine too.
const BEATS = [
  { at: 0, action: 'ui' },
  { at: 900, action: 'fire' },
  { at: 2400, action: 'fire' },
  { at: 3900, action: 'motion' },
  { at: 4500, action: 'rive' },
]
const CYCLE_MS = 6600

// Where the synthetic pointer lands on the Rive canvas, as a fraction of its
// box. A knob rather than a constant, because the hitboxes live inside the .riv
// files and the rig cannot read them.
//
// Not the center, which is the obvious guess and the wrong one. Both principles
// draw their own play control into the lower-left corner of the art, and on
// Solid Drawing that control is the only thing on the canvas a click reaches: a
// 7x7 grid of real clicks across the rest of it moved nothing (probed on built
// output, 2026-08-13). Hierarchy of Motion answers a click on the art as well,
// so the corner is the one point that works on both. If a file is re-authored
// with its control elsewhere, move this rather than the code.
const RIVE_HIT = { x: 0.14, y: 0.905 }

// How long the demo trigger holds the press down. A press-and-hold, not a
// click, because a demo can read either one: Solid Drawing's Card and
// Hierarchy's parent toggle on onClick, while Squash & Stretch's Button is
// whileTap, and whileTap never sees a synthetic click. The hold is also what
// makes the squash legible on camera rather than a single frame.
const PRESS_MS = 180

// A press and release on a DOM element, in the order a browser emits one:
// pointerdown, then pointerup and click PRESS_MS later. Both halves are load
// bearing, because the demos read different parts of a press. Framer Motion's
// whileTap opens on pointerdown and closes on a pointerup that reaches the
// window, which is why these bubble. A synthetic pointer sequence produces no
// click of its own, so the click is dispatched explicitly for the demos that
// toggle on onClick.
function press(el) {
  const rect = el.getBoundingClientRect()
  const at = {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    bubbles: true,
    cancelable: true,
    view: window,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
  }
  el.dispatchEvent(new PointerEvent('pointerdown', { ...at, buttons: 1 }))
  setTimeout(() => {
    el.dispatchEvent(new PointerEvent('pointerup', { ...at, buttons: 0 }))
    el.click()
  }, PRESS_MS)
}

export function PrincipleCardFlipScene({ sceneName, slug }) {
  const stageRef = useRef(null)
  const [uiMode, setUiMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [running, setRunning] = useState(false)

  // renderCaptureRig already resolved the theme (scene default, or the &theme=
  // override) and wrote it to the attribute. Read it back rather than restating
  // 'dark' here: the rig mounts no ThemeProvider, so StaticThemeProvider below
  // is what PrincipleAnimation's useTheme() sees, and if this scene named its
  // own theme the URL override would recolor the chrome and leave the Rive art
  // behind.
  const theme = document.documentElement.getAttribute('data-theme') ?? 'dark'
  const principle = principleBySlug(slug)

  // Same coupling as PrincipleCard.handleStateToggle and both other hosts:
  // flipping the view dismisses P02's drawer so it does not linger across the
  // switch. Neither principle here has a drawer; kept so the scene stays
  // repointable at any slug.
  const handleToggleState = () => {
    if (drawerOpen) setDrawerOpen(false)
    setUiMode(prev => !prev)
  }

  // Drive the demo's own interactive element, the way PrincipleTriggerScene
  // does: the demos are self-contained on purpose, so the rig presses what a
  // finger would rather than threading props into them.
  //
  // Scoped to the visible crossfade layer, because the card also contains the
  // Motion/UI button and a plain querySelector('button') would hit that
  // instead. The layer is chosen by computed pointer-events rather than by
  // reading uiMode: the body already sets it per layer, it is what decides
  // where a real click lands, and reading the DOM keeps this correct inside the
  // auto-cycle's timeouts, where a captured uiMode would be stale. In Motion
  // view the visible layer is the Rive canvas, which holds no button, so the
  // trigger is a no-op there.
  const fire = () => {
    const layers = stageRef.current?.querySelectorAll(`.${cardStyles.animationState}`)
    if (!layers) return
    for (const layer of layers) {
      if (getComputedStyle(layer).pointerEvents === 'none') continue
      const target = layer.querySelector('button, [role="button"]')
      if (target) press(target)
      return
    }
  }

  // The Rive layer's counterpart to `fire`, and it has to work differently.
  // There is no DOM element to click: the .riv file carries its own hitboxes
  // and state machine triggers, and React's only job in PrincipleAnimation is
  // theme binding (see that component's interaction-model note). So the rig
  // does what a finger does one level lower, and dispatches the mouse sequence
  // the Rive runtime listens for on the canvas, at the art's own play control
  // (RIVE_HIT).
  //
  // Coordinates come from the canvas's own bounding rect, which is also what
  // the runtime measures with (registerTouchInteractions maps clientX/clientY
  // through event.currentTarget.getBoundingClientRect()). Both sides therefore
  // read the same box, and the scene's 1.5x transform, which the rect includes,
  // cancels out.
  //
  // The sequence is mousemove, mousedown, mouseup rather than a click: the
  // runtime binds no click listener, a state machine trigger fires on pointer
  // down and up, and the move first puts the pointer somewhere before it
  // presses, which is what a hover-aware machine expects.
  const fireRive = () => {
    const canvas = stageRef.current?.querySelector('canvas')
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = rect.left + rect.width * RIVE_HIT.x
    const clientY = rect.top + rect.height * RIVE_HIT.y
    for (const type of ['mousemove', 'mousedown', 'mouseup']) {
      canvas.dispatchEvent(
        new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true, view: window }),
      )
    }
  }

  useEffect(() => {
    if (!running) return
    const timers = []
    const runCycle = () => {
      for (const { at, action } of BEATS) {
        timers.push(setTimeout(() => {
          if (action === 'fire') fire()
          else if (action === 'rive') fireRive()
          else setUiMode(action === 'ui')
        }, at))
      }
    }
    runCycle()
    const id = setInterval(runCycle, CYCLE_MS)
    return () => {
      clearInterval(id)
      timers.forEach(clearTimeout)
    }
    // `fire` is safe to leave out: it closes over a stable ref and reads the
    // DOM for everything else, so it never goes stale between cycles.
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
        capture rig · {sceneName} · Space {running ? 'stops' : 'starts'} the cycle · or drive it with the triggers below (demo fires the UI component, rive fires the animation)
      </header>

      <div className={rigStyles.triggerRow}>
        <span className={rigStyles.compareSub}>flip</span>
        <Toggle on={uiMode} onChange={handleToggleState} size="sm" />
        <span className={rigStyles.compareSub}>fire</span>
        <Button onClick={fire}>demo</Button>
        <Button onClick={fireRive}>rive</Button>
      </div>

      <div className={rigStyles.scene}>
        {principle ? (
          <StaticThemeProvider theme={theme}>
            {/* respectReducedMotion={false} matches the demo column and the
                other principle scenes: the scene exists to show motion on
                camera. */}
            <MotionTokensProvider tokens={stateToTokens(INITIAL_STATE)} respectReducedMotion={false}>
              <CardStage
                principle={principle}
                uiMode={uiMode}
                onToggleState={handleToggleState}
                drawerOpen={drawerOpen}
                setDrawerOpen={setDrawerOpen}
                stageRef={stageRef}
              />
            </MotionTokensProvider>
          </StaticThemeProvider>
        ) : (
          <p className={rigStyles.unknown}>No principle for slug "{slug}".</p>
        )}
      </div>
    </div>
  )
}

// Inside the provider so useMotionTokens reads the rig's tokens rather than the
// CSS channel, which is what makes the take independent of whatever the
// stylesheet defaults happen to be.
function CardStage({ principle, uiMode, onToggleState, drawerOpen, setDrawerOpen, stageRef }) {
  const tokens = useMotionTokens()

  return (
    <div className={rigStyles.cardScale}>
      <div className={rigStyles.cardPanel} ref={stageRef}>
        <ExpandedPrincipleBody
          principle={principle}
          tokens={tokens}
          // Both forced, and both are rig decisions rather than reads of the
          // machine. prefersReducedMotion={false} keeps the "View motion"
          // control out of frame and stops PrincipleAnimation pausing.
          // showDemoMotion={true} is needed alongside it because DemoMotionGate
          // reads the OS preference itself and would flatten the UI demo's
          // tokens no matter what this scene passes. Together they make the
          // take correct whether or not reduce-motion is on in System Settings.
          prefersReducedMotion={false}
          showDemoMotion={true}
          setShowDemoMotion={() => {}}
          uiMode={uiMode}
          onToggleState={onToggleState}
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          onClose={() => {}}
          hideClose
        />
      </div>
    </div>
  )
}
