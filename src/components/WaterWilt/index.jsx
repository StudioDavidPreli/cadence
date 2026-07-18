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

// The Water sequence, in order. Each animation beat names the channel it
// scrubs and the duration/ease token that shapes it; delay beats just wait.
// This table is the demo's whole timing story — the snippet in the code view
// mirrors it, so keep the two in step.
const WATER_SEQUENCE = [
  { channel: 'rain', duration: 'base', ease: 'enter' },
  { delay: 'short' }, // the water soaks in
  { channel: 'grow', duration: 'slower', ease: 'enter' }, // the hero beat
  { delay: 'long' },
  { channel: 'flowers', duration: 'slow', ease: 'standard' },
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

export function WaterWilt() {
  // The DOM button owns interaction; the canvas gets pointer-events: none.
  // `watered` is press-owned intent: each press toggles the target state, and
  // the label flips on it immediately — no VM read-back, no completion signal.
  // The driver knows every phase boundary because it owns the clock.
  const [watered, setWatered] = useState(false)

  return (
    <div className={styles.demo}>
      <WaterWiltRive watered={watered} />
      <div className={styles.row}>
        <Button onClick={() => setWatered((w) => !w)}>
          {watered ? 'Dry time' : 'Water me'}
        </Button>
      </div>
    </div>
  )
}

// All Rive hooks live in this inner wrapper (the HeroAnimation isolation
// pattern) so the canvas lifecycle is contained. Do not lift them to a parent.
function WaterWiltRive({ watered }) {
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
  //   unwilt   Water pressed mid-wilt: die trio reversed back toward bloom
  //   unwater  Wilt pressed mid-growth: grow-era channels reversed to 0
  // `values` mirrors every channel's last written (un-quantized) value, so a
  // theme rebind can restore the new instance and interrupts know where each
  // channel stands.
  const driver = useRef({
    mode: 'rest',
    step: 0,
    q: 0, // progress of the current beat / reversal, 0..1 (seconds for delays)
    from: 0, // start value of the current travel (continuity across interrupts)
    reversalFrom: null, // per-channel start values for the unwater reversal
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
  // postGrowthBoole holds true from bloom until wilt completes (contract);
  // idleBoole only at bloom rest.
  function writeBooleans() {
    const { mode } = driver.current
    const s = settersRef.current
    if (s.idle) s.idle.value = mode === 'bloom'
    if (s.postGrowth) {
      s.postGrowth.value = mode === 'bloom' || mode === 'wilt' || mode === 'unwilt'
    }
  }

  // ── Press handlers ───────────────────────────────────────────────────────
  // The contract's two interrupt policies, plus the one combination it leaves
  // open (Water pressed while a mid-growth wilt is still reversing), which
  // resumes the forward sequence from the earliest unfinished beat.

  function pressWater() {
    const d = driver.current
    if (d.mode === 'rest') {
      d.mode = 'water'
      d.step = 0
      d.q = 0
      d.from = 0
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
      // the plant. The earliest channel still short of 1 is the beat to
      // re-enter; delays ahead of it run again in full.
      const stepIdx = WATER_SEQUENCE.findIndex(
        (s) => s.channel && d.values[s.channel] < 1,
      )
      if (stepIdx === -1) {
        enterBloom()
        return
      }
      d.mode = 'water'
      d.step = stepIdx
      d.q = 0
      d.from = d.values[WATER_SEQUENCE[stepIdx].channel]
    }
    // 'water' and 'bloom' ignore a Water press; the toggle never offers it.
  }

  function pressWilt() {
    const d = driver.current
    if (d.mode === 'bloom') {
      // Contract step 7: same frame, idleBoole false and the die trio snaps
      // to 0. The die instances at 0 are the bloom the idle loop was
      // orbiting, so the handoff is pose-matched.
      d.mode = 'wilt'
      d.q = 0
      d.from = 0
      writeBooleans()
      for (const ch of WILT_CHANNELS) writeChannel(ch, 0)
      return
    }
    if (d.mode === 'water') {
      // Wilt mid-growth: every grow-era channel above 0 travels back to 0
      // together, one duration.base beat on ease.exit. Reversed travel is the
      // accepted policy; the parked die instances render nothing, so there is
      // no interference.
      d.mode = 'unwater'
      d.q = 0
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
    // 'rest' and 'wilt' ignore a Wilt press.
  }

  function enterBloom() {
    const d = driver.current
    d.mode = 'bloom'
    // Contract step 6: both booleans go true. The idle loops appear at the
    // bloom pose; the grow-era instances hide (flowers stay, per their
    // compound gate); the die-era instances hide.
    writeBooleans()
  }

  function enterRest() {
    const d = driver.current
    // Contract step 9 order: reset the grow-era channels first (invisible,
    // their instances are still gated off), then release postGrowthBoole so
    // they return at their 0 poses. Rest state now equals initial state.
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
      // carries it, and every write guards on the handle existing.
      plantScale: instance.number('plantScale'),
    }
    const d = driver.current
    for (const key of Object.keys(d.values)) writeChannel(key, d.values[key])
    writeBooleans()
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
        switch (d.mode) {
          case 'water': {
            const beat = WATER_SEQUENCE[d.step]
            if (beat.delay) {
              // Delays accumulate seconds and compare against the live token,
              // so shortening a delay mid-wait ends the wait immediately.
              d.q += dt
              if (d.q >= t.delay[beat.delay]) {
                d.step += 1
                d.q = 0
                d.from = 0
              }
            } else {
              const dur = Math.max(t.duration[beat.duration], MIN_DURATION_S)
              d.q = Math.min(1, d.q + dt / dur)
              // from > 0 only when resuming out of an interrupted reversal;
              // the travel eases over the remaining distance so the value
              // stays continuous across the interrupt.
              writeChannel(beat.channel, d.from + (1 - d.from) * ease[beat.ease](d.q))
              if (d.q >= 1) {
                d.step += 1
                d.q = 0
                d.from = 0
                if (d.step >= WATER_SEQUENCE.length) enterBloom()
              }
            }
            break
          }
          case 'wilt': {
            const dur = Math.max(t.duration.base, MIN_DURATION_S)
            d.q = Math.min(1, d.q + dt / dur)
            const v = d.from + (1 - d.from) * ease.exit(d.q)
            for (const ch of WILT_CHANNELS) writeChannel(ch, v)
            if (d.q >= 1) enterRest()
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

  return (
    <div
      className={styles.stage}
      style={aspect ? { '--ww-aspect': aspect } : undefined}
    >
      <RiveComponent className={styles.canvas} />
    </div>
  )
}
