// WaterWilt — the Water & Wilt demo: a plant that lives and dies by the token
// system. The .riv holds poses (linear timelines scrubbed by number properties);
// this file holds time. One rAF loop integrates p += dt / duration and writes
// eased progress into the view model every frame, so every duration, easing,
// and delay comes from Token Lab's live tokens and a slider drag retimes an
// animation mid-flight from its current progress, with no recompute step.
//
// The interface contract is docs/briefings/waterwilt-token-vm-map.md. The code
// conforms to the doc, not the other way around — if a change here needs a new
// VM property or a different write pattern, the contract changes first.
//
// This is the Motion Tiles director pattern (one clock, setters in refs,
// nothing re-renders per frame) adapted from an ambient loop to a one-shot
// sequencer: the clock runs phases to completion and then rests, instead of
// cycling forever.

import { useEffect, useRef, useState } from 'react'
import { cubicBezier, useReducedMotion } from 'framer-motion'
import {
  useRive,
  useViewModel,
  useViewModelInstance,
} from '@rive-app/react-webgl2'
import { useMotionTokens } from '../../hooks/useMotionTokens'
import { useTheme } from '../../context/ThemeContext'
import { Button } from '../Button'
import styles from './WaterWilt.module.css'

// Runtime strings from the contract's Runtime strings table.
const RIV = {
  src: '/rive/waterwiltreact.riv',
  artboard: 'waterWilt',
  // An empty anchor: playing it keeps the artboard advancing so the binds
  // re-evaluate each frame. A paused artboard stops painting per-frame writes
  // (the tiles rule).
  stateMachine: 'waterWiltSM',
  viewModel: 'WaterWiltVM',
}

// Four authored per-theme instances, the hero convention. All colors and the
// planter opacities are instance-carried: React rebinds the theme's own
// instance and writes no colors, ever. No useHCContrastColors here — there is
// a real contrastDark instance, so there is nothing to flip.
const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}

// The Water sequence, in order. An animation beat carries one or more
// parallel tracks, each naming the channel it scrubs and the duration/ease
// token that shapes it; the beat completes when its slowest track does.
// Delay beats just wait. This table is the demo's whole timing story — the
// snippet in the code view mirrors it, so keep the two in step.
//
// Revised 2026-07-18 (David's visual review): rain and growth trigger
// together on the press, each on its own tokens, instead of the contract's
// original rain-then-soak-then-grow sequence. delay.short left the cycle
// with the soak beat; the contract doc carries the dated revision.
const WATER_SEQUENCE = [
  {
    tracks: [
      { channel: 'rain', duration: 'base', ease: 'enter' },
      { channel: 'grow', duration: 'slower', ease: 'enter' }, // the hero beat
    ],
  },
  { delay: 'long' },
  { tracks: [{ channel: 'flowers', duration: 'slow', ease: 'standard' }] },
]

// Wilt runs the three authored die timelines together on duration.base +
// ease.exit — the exit-faster precedent (Modal enters slow, exits base).
const WILT_CHANNELS = ['die', 'rainStop', 'flowersDie']

// Reduced motion, driver-side: the eased progress of every scrubbed channel is
// quantized into discrete steps — stop-motion at the same tempo, not a faster
// or flattened cycle. A step count, not a timing, so no token governs it.
// Token Lab's provider passes respectReducedMotion={false} (the lab exists to
// perceive motion), so the tokens this driver reads are never flattened; the
// OS preference is read directly via useReducedMotion() instead.
const REDUCED_MOTION_STEPS = 5

// Explore mode allows 0ms durations; dt / 0 must not reach the integrator
// (0 / 0 is NaN, and a NaN write corrupts the scrub). Clamping the divisor to
// 1ms makes a zero-duration beat an effectively instant cut instead.
const MIN_DURATION_S = 0.001

// Frames held between the post-wilt channel resets and the postGrowthBoole
// release. Flipping the gate in the same tick as the zeros painted one frame
// of the grow-era instances at their OLD poses — a full-bloom flash over the
// dead plant, caught frame-by-frame on built output (2026-07-18). The file
// needs the resets consumed by an advance before the gates reopen; two held
// frames cover it with margin. During the hold the render is the dead pose,
// identical to rest, so the pause is invisible.
const SETTLE_FRAMES = 2

export function WaterWilt() {
  // The DOM button owns interaction; the canvas gets pointer-events: none.
  // `watered` is press-owned intent: each press toggles the target state, and
  // the label flips on it immediately — no VM read-back, no completion signal.
  // The driver knows every phase boundary because it owns the clock.
  const [watered, setWatered] = useState(false)

  // The button overlays the canvas (David's design, 2026-07-18) so it reads
  // as part of the artwork, the way the file's own in-art button did before
  // interaction moved to the DOM. The stage has pointer-events: none; the
  // overlay wrapper re-enables them, so the button is the only clickable
  // surface. The wrapper (not Button itself) carries the centering transform:
  // Button's press animates its own transform, and the two must not collide.
  return (
    <WaterWiltRive watered={watered}>
      <div className={styles.buttonOverlay}>
        <Button onClick={() => setWatered((w) => !w)}>
          {watered ? 'Dry time' : 'Water me'}
        </Button>
      </div>
    </WaterWiltRive>
  )
}

// All Rive hooks live in this inner wrapper (the HeroAnimation isolation
// pattern) so the canvas lifecycle is contained. Do not lift them to a parent.
function WaterWiltRive({ watered, children }) {
  const { theme } = useTheme()
  const tokens = useMotionTokens()
  const prefersReduced = useReducedMotion()
  const [aspect, setAspect] = useState(null)

  const { rive, RiveComponent } = useRive({
    src: RIV.src,
    artboard: RIV.artboard,
    stateMachines: RIV.stateMachine,
    // Play only after the theme instance binds, so the first painted frame
    // already carries the instance colors and the mount-init writes below.
    autoplay: false,
    autoBind: false,
  })

  const viewModel = useViewModel(rive, { name: RIV.viewModel })
  const instance = useViewModelInstance(viewModel, {
    rive,
    name: themeToInstanceName[theme],
  })

  // The six progress channels and two gate booleans from the VM contract, as
  // property HANDLES read off the bound instance, not useViewModelInstance*
  // hook setters. The hook setters carry a property handle that lags one
  // render behind an instance rebind, and the webgl2 runtime silently accepts
  // writes to the discarded instance (the 2026-07-17 consolidation records the
  // failure; useHCContrastColors documents the same rule for colors). Handles
  // are re-acquired from the fresh instance in the bind-sync effect below, so
  // a theme rebind can never strand the driver writing into the old theme.
  // Held in a ref so the frame loop writes without re-rendering anything.
  const settersRef = useRef({})

  // The loop reads tokens through a ref because useMotionTokens() returns a
  // new object identity on every edit — holding it in state or a closure would
  // re-subscribe the loop per slider tick. The bezier evaluators are rebuilt on
  // the same schedule; construction is cheap and evaluation is per-frame.
  const tokensRef = useRef(tokens)
  const easingsRef = useRef(null)
  useEffect(() => {
    tokensRef.current = tokens
    easingsRef.current = {
      standard: cubicBezier(...tokens.ease.standard),
      enter: cubicBezier(...tokens.ease.enter),
      exit: cubicBezier(...tokens.ease.exit),
    }
  }, [tokens])

  const reducedRef = useRef(prefersReduced)
  useEffect(() => {
    reducedRef.current = prefersReduced
  }, [prefersReduced])

  // ── Driver state ─────────────────────────────────────────────────────────
  // One mutable record the frame loop and the press handlers share. Modes:
  //   rest     initial state; die channels parked at 1, everything else 0
  //   water    running WATER_SEQUENCE forward, one beat at a time
  //   bloom    at rest in full bloom; the idle loops play (idleBoole true)
  //   wilt     die trio 0 → 1 together (the authored die from full bloom)
  //   settle   wilt done, zeros written, holding SETTLE_FRAMES before the
  //            postGrowthBoole release (the bloom-flash guard)
  //   unwilt   Water pressed mid-wilt: die trio reversed back toward bloom
  //   unwater  Wilt pressed mid-growth: grow-era channels reversed to 0
  // `values` mirrors every channel's last written (un-quantized) value, so a
  // theme rebind can restore the new instance and interrupts know where each
  // channel stands. `trackQ`/`trackFrom` are the per-track integrator state
  // of the current animation beat (a beat can run parallel tracks).
  const driver = useRef({
    mode: 'rest',
    step: 0,
    q: 0, // reversal progress 0..1, delay seconds, or settle frame count
    from: 0, // start value of the die trio's current travel
    trackQ: {},
    trackFrom: {},
    reversalFrom: null, // per-channel start values for the unwater reversal
    rainLooping: false, // mirrors the rainBoole write, restored on rebind
    rainHandoff: null, // frames until the landed rain ramp retires to 0
    values: { rain: 0, grow: 0, flowers: 0, die: 1, rainStop: 1, flowersDie: 1 },
  })

  // Channel write: track the true value, quantize only what the canvas sees.
  // Quantizing at the write (not in the integrator) keeps the clock exact, so
  // toggling the OS preference mid-flight changes rendering, never timing.
  function writeChannel(key, value) {
    const d = driver.current
    d.values[key] = value
    const handle = settersRef.current[key]
    if (!handle) return
    handle.value = reducedRef.current
      ? Math.round(value * REDUCED_MOTION_STEPS) / REDUCED_MOTION_STEPS
      : value
  }

  // The two gate booleans, derived from mode so a rebind can re-assert them.
  // postGrowthBoole holds true from bloom until wilt fully completes,
  // including the settle hold (contract step 9); idleBoole only at bloom rest.
  function writeBooleans() {
    const { mode } = driver.current
    const s = settersRef.current
    if (s.idle) s.idle.value = mode === 'bloom'
    if (s.postGrowth) {
      s.postGrowth.value =
        mode === 'bloom' || mode === 'wilt' || mode === 'unwilt' || mode === 'settle'
    }
  }

  // rainBoole, the frozen-rain seam's recorded fix (contract, Known seams):
  // rainFall is only the arrival ramp, so once it lands at 1 the rain hangs
  // frozen mid-air until idleBoole shows the rainingIdle loop at bloom. The
  // driver raises rainBoole when the ramp lands and drops it the moment any
  // wilt or reversal starts (RainStop and the reversing ramp own the rain
  // then; the loop on top would double it). File side pending: author the
  // boolean in WaterWiltVM and gate RainIdle on rainBoole OR idleBoole. The
  // handle is null until then, so this no-ops, same as plantScale.
  function writeRainLoop(on) {
    driver.current.rainLooping = on
    const handle = settersRef.current.rainLoop
    if (handle) handle.value = on
  }

  // ── Press handlers ───────────────────────────────────────────────────────
  // The contract's two interrupt policies, plus the one combination it leaves
  // open (Water pressed while a mid-growth wilt is still reversing), which
  // resumes the forward sequence from the earliest unfinished beat.

  // Arm an animation beat: every track integrates from its current value, so
  // a resume out of a partial reversal continues where the channel stands. A
  // track already at 1 (completed before an interrupt) starts done.
  function startBeat(index) {
    const d = driver.current
    d.step = index
    d.q = 0
    d.trackQ = {}
    d.trackFrom = {}
    const beat = WATER_SEQUENCE[index]
    if (beat.tracks) {
      for (const track of beat.tracks) {
        const v = d.values[track.channel]
        d.trackQ[track.channel] = v >= 1 ? 1 : 0
        d.trackFrom[track.channel] = v
      }
    }
  }

  function pressWater() {
    const d = driver.current
    if (d.mode === 'rest' || d.mode === 'settle') {
      // A press during the settle window releases the gate now: the zeros
      // were written at least one advance ago, so the reopen is safe, and
      // the new cycle must not start behind a closed gate.
      if (d.mode === 'settle') {
        d.mode = 'rest'
        writeBooleans()
      }
      d.mode = 'water'
      startBeat(0)
      return
    }
    if (d.mode === 'wilt') {
      // Reverse the die trio back to 0 on ease.enter, then continue from
      // bloom. The trio always travels together, so one channel's value
      // stands for all three.
      d.from = d.values.die
      d.q = 0
      d.mode = 'unwilt'
      writeBooleans()
      return
    }
    if (d.mode === 'unwater') {
      // Not in the contract: resume forward from wherever the reversal left
      // the plant. The earliest beat with any track short of 1 is the one to
      // re-enter; delays ahead of it run again in full.
      const beatIdx = WATER_SEQUENCE.findIndex(
        (b) => b.tracks && b.tracks.some((track) => d.values[track.channel] < 1),
      )
      if (beatIdx === -1) {
        enterBloom()
        return
      }
      d.mode = 'water'
      startBeat(beatIdx)
    }
    // 'water' and 'bloom' ignore a Water press; the toggle never offers it.
  }

  function pressWilt() {
    const d = driver.current
    if (d.mode === 'bloom') {
      // Contract wilt entry: same frame, idleBoole false and the die trio
      // snaps to 0. The die instances at 0 are the bloom the idle loop was
      // orbiting, so the handoff is pose-matched. The rain loop yields to
      // RainStop in the same frame.
      d.mode = 'wilt'
      d.q = 0
      d.from = 0
      d.rainHandoff = null // RainFall is hidden through wilt; step 9 zeroes it
      writeBooleans()
      writeRainLoop(false)
      for (const ch of WILT_CHANNELS) writeChannel(ch, 0)
      return
    }
    if (d.mode === 'water') {
      // Wilt mid-growth: every grow-era channel above 0 travels back to 0
      // together, one duration.base beat on ease.exit. Reversed travel is the
      // accepted policy; the parked die instances render nothing, so there is
      // no interference. The reversing rain ramp owns the rain again: if the
      // ramp was already retired to 0 (the loop handoff), restore it to its
      // full pose in the same frame the loop drops, so the rain un-falls
      // instead of vanishing. The swap is bounded like the mid-sway snap.
      d.mode = 'unwater'
      d.q = 0
      d.rainHandoff = null
      if (d.rainLooping) writeChannel('rain', 1)
      writeRainLoop(false)
      d.reversalFrom = {
        rain: d.values.rain,
        grow: d.values.grow,
        flowers: d.values.flowers,
      }
      return
    }
    if (d.mode === 'unwilt') {
      // Wilt again while un-wilting: resume the die travel forward from the
      // current pose.
      d.from = d.values.die
      d.q = 0
      d.mode = 'wilt'
      writeBooleans()
    }
    // 'rest', 'settle', and 'wilt' ignore a Wilt press: the first two are
    // already at (or finishing into) the dry state.
  }

  function enterBloom() {
    const d = driver.current
    d.mode = 'bloom'
    // Contract bloom entry: both booleans go true. The idle loops appear at
    // the bloom pose; the grow-era instances hide (flowers stay, per their
    // compound gate); the die-era instances hide. rainBoole re-asserts true
    // (idleBoole covers the loop at bloom either way; this keeps the mirror
    // honest for the next rebind restore).
    writeBooleans()
    writeRainLoop(true)
  }

  // Wilt's landing. The contract's step-9 "then" is literal: reset the
  // grow-era channels while the gates are still shut, hold SETTLE_FRAMES so
  // an advance consumes the zeros, and only then (in the loop's settle case)
  // release postGrowthBoole. Doing both in one tick painted the grow-era
  // instances at their old poses for a frame: the full-bloom flash.
  function beginRestSettle() {
    const d = driver.current
    writeChannel('rain', 0)
    writeChannel('grow', 0)
    writeChannel('flowers', 0)
    writeRainLoop(false) // already false since the wilt press; asserted for the mirror
    d.mode = 'settle'
    d.q = 0
  }

  // The unwater reversal's landing needs no settle: postGrowthBoole was
  // false the whole way down (the instances were visibly reversing), so
  // there is no gate flip to race.
  function enterRest() {
    const d = driver.current
    writeChannel('rain', 0)
    writeChannel('grow', 0)
    writeChannel('flowers', 0)
    d.mode = 'rest'
    writeBooleans()
  }

  // Presses arrive as flips of the `watered` prop. A ref skips the mount run
  // so first render never fires a phantom press.
  const firstPressRef = useRef(true)
  useEffect(() => {
    if (firstPressRef.current) {
      firstPressRef.current = false
      return
    }
    if (watered) pressWater()
    else pressWilt()
    // The handlers only touch refs, so the identities from this render are
    // interchangeable with any other render's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watered])

  // ── Bind sync ────────────────────────────────────────────────────────────
  // Runs on first bind and on every theme rebind. It re-acquires every
  // property handle from the fresh instance (the anti-stale rule in the
  // settersRef comment), then restores the driver's current state into it:
  // each named instance carries its own property values, so without the
  // restore a rebind would paint the new theme's authored defaults. On true
  // mount this is exactly the contract's init obligation: die trio at 1, or
  // first load shows the die instances at 0, a full-bloom ghost. Then play
  // the anchor.
  useEffect(() => {
    if (!rive || !instance) return
    settersRef.current = {
      rain: instance.number('rainFallProgress'),
      grow: instance.number('growProgress'),
      flowers: instance.number('flowersGrowProgress'),
      die: instance.number('dieProgress'),
      rainStop: instance.number('rainStopProgress'),
      flowersDie: instance.number('flowersDieProgress'),
      idle: instance.boolean('idleBoole'),
      postGrowth: instance.boolean('postGrowthBoole'),
      // In the contract as planned, not yet authored: null until the file
      // carries them, and every write guards on the handle existing.
      plantScale: instance.number('plantScale'),
      rainLoop: instance.boolean('rainBoole'),
    }
    const d = driver.current
    for (const key of Object.keys(d.values)) writeChannel(key, d.values[key])
    writeBooleans()
    writeRainLoop(d.rainLooping)
    rive.play(RIV.stateMachine)
  }, [rive, instance])

  // scale.expressive → plantScale, the one direct bind: a VM number written
  // outside the frame loop, on change only (the tiles' cellSize pattern).
  // 1 = authored size. No-op until the property is authored in the file.
  // `instance` is a dep so a rebind re-applies it to the fresh handle; this
  // effect is declared after bind sync, so the handle is already current.
  useEffect(() => {
    const handle = settersRef.current.plantScale
    if (handle) handle.value = tokens.scale.expressive
  }, [instance, tokens.scale.expressive])

  // Artboard aspect from the loaded bounds (the ClawdLogoButton pattern), so
  // the canvas box matches the art with no letterboxing and no literal guess.
  useEffect(() => {
    if (!rive) return
    const b = rive.bounds
    if (!b) return
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    if (w > 0 && h > 0) setAspect(w / h)
  }, [rive])

  // ── The clock ────────────────────────────────────────────────────────────
  // One rAF loop for the component's lifetime. It reads only refs, so it never
  // re-subscribes; rest and bloom frames do no work. dt integration against
  // the live token value each frame IS the retiming rule: a token edit
  // mid-beat changes the rate from the current progress.
  useEffect(() => {
    let raf
    let last = performance.now()

    const loop = (now) => {
      const dt = (now - last) / 1000
      last = now
      const d = driver.current
      const t = tokensRef.current
      const ease = easingsRef.current

      if (ease) {
        // Pending rain-ramp retirement (see the handoff in the water case).
        // Counted in advances so the loop is on screen before the frozen ramp
        // frame goes; cancelled by any wilt or reversal press, which reclaims
        // the ramp first.
        if (d.rainHandoff != null) {
          d.rainHandoff -= 1
          if (d.rainHandoff <= 0) {
            d.rainHandoff = null
            writeChannel('rain', 0)
          }
        }
        switch (d.mode) {
          case 'water': {
            const beat = WATER_SEQUENCE[d.step]
            let beatDone
            if (beat.delay) {
              // Delays accumulate seconds and compare against the live token,
              // so shortening a delay mid-wait ends the wait immediately.
              d.q += dt
              beatDone = d.q >= t.delay[beat.delay]
            } else {
              // Parallel tracks each integrate on their own duration; the
              // beat completes when the slowest track lands. trackFrom > 0
              // only when resuming out of an interrupted reversal; the
              // travel eases over the remaining distance so the value stays
              // continuous across the interrupt.
              beatDone = true
              for (const track of beat.tracks) {
                let q = d.trackQ[track.channel]
                if (q >= 1) continue
                const dur = Math.max(t.duration[track.duration], MIN_DURATION_S)
                q = Math.min(1, q + dt / dur)
                d.trackQ[track.channel] = q
                const from = d.trackFrom[track.channel]
                writeChannel(track.channel, from + (1 - from) * ease[track.ease](q))
                // The arrival ramp has landed: hand the rain to the looping
                // instance so it keeps falling through the rest of growth
                // (the frozen-rain seam's driver half). The parked ramp then
                // retires to 0 after two settled frames — its gate is
                // postGrowthBoole, which flips only at bloom, so without the
                // retirement the frozen last frame sits on top of the loop
                // from here into idle. Pose-matched: rainingIdle starts
                // playing this same frame, and its first frame is authored to
                // follow rainFall's last (the original SM's 100%-exit chain).
                if (q >= 1 && track.channel === 'rain') {
                  writeRainLoop(true)
                  d.rainHandoff = SETTLE_FRAMES
                }
                if (q < 1) beatDone = false
              }
            }
            if (beatDone) {
              const next = d.step + 1
              if (next >= WATER_SEQUENCE.length) enterBloom()
              else startBeat(next)
            }
            break
          }
          case 'wilt': {
            const dur = Math.max(t.duration.base, MIN_DURATION_S)
            d.q = Math.min(1, d.q + dt / dur)
            const v = d.from + (1 - d.from) * ease.exit(d.q)
            for (const ch of WILT_CHANNELS) writeChannel(ch, v)
            if (d.q >= 1) beginRestSettle()
            break
          }
          case 'settle': {
            // Count advances, not time: the guard exists so the runtime has
            // consumed the zeroed channels before the gates reopen.
            d.q += 1
            if (d.q >= SETTLE_FRAMES) {
              d.mode = 'rest'
              writeBooleans()
            }
            break
          }
          case 'unwilt': {
            const dur = Math.max(t.duration.base, MIN_DURATION_S)
            d.q = Math.min(1, d.q + dt / dur)
            const v = d.from * (1 - ease.enter(d.q))
            for (const ch of WILT_CHANNELS) writeChannel(ch, v)
            // The trio lands at 0 — the bloom pose — and the idle loops take
            // over. They stay at 0 through bloom (hidden while idleBoole is
            // true); the next Wilt press snaps them to 0 anyway, per step 7.
            if (d.q >= 1) enterBloom()
            break
          }
          case 'unwater': {
            const dur = Math.max(t.duration.base, MIN_DURATION_S)
            d.q = Math.min(1, d.q + dt / dur)
            const k = ease.exit(d.q)
            for (const ch of ['rain', 'grow', 'flowers']) {
              writeChannel(ch, d.reversalFrom[ch] * (1 - k))
            }
            if (d.q >= 1) {
              d.reversalFrom = null
              enterRest()
            }
            break
          }
          default:
            // rest / bloom: nothing to integrate.
            break
        }
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // Mount-once by design; everything the loop reads lives in refs, and the
    // phase-boundary helpers it calls only write through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // children is the DOM control overlay (the toggle button): rendered inside
  // the stage so it sits on the artwork, positioned by the module CSS.
  return (
    <div
      className={styles.stage}
      style={aspect ? { '--ww-aspect': aspect } : undefined}
    >
      <RiveComponent className={styles.canvas} />
      {children}
    </div>
  )
}
