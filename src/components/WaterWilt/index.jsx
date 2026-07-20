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
// with the soak beat; the contract doc carries the dated revisions.
//
// Rain rides duration.fast + ease.linear (re-owned 2026-07-18, David's
// token-lab session): fast keeps the arrival under the ~130ms window where
// the eye reads it as one transient, and linear removes ease.enter's flat
// tail, the decelerate-then-snap that made the loop handoff visible at
// longer durations. duration.base no longer drives anything here.
const WATER_SEQUENCE = [
  {
    tracks: [
      { channel: 'rain', duration: 'fast', ease: 'linear' },
      { channel: 'grow', duration: 'slower', ease: 'enter' }, // the hero beat
    ],
  },
  { delay: 'long' },
  { tracks: [{ channel: 'flowers', duration: 'slow', ease: 'standard' }] },
]

// Wilt runs the authored die timelines together on duration.slow + ease.exit
// (moved off duration.base 2026-07-18 so base stops owning two unrelated
// beats; 400ms is still faster than the 600ms entry, so the exit-faster
// precedent holds). Both reversals mirror the wilt's duration.
//
// Which channels participate depends on where the wilt began (David's
// 2026-07-19 review): from bloom, all three; from the post-growth region
// (delay.long or the flower beat), only die and rain-stop, because
// FlowersDie is authored from full bloom and flowers that never finished
// growing have no death to play. flowersDieProgress stays parked at 1 there,
// rendering nothing: the phantom-flower rule.
const WILT_CHANNELS = ['die', 'rainStop', 'flowersDie']
const POST_GROWTH_WILT_CHANNELS = ['die', 'rainStop']

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

  // The button rides scale.base with the scene (David's 2026-07-18 call: a
  // fixed-size button over a scaling composition read as unwired). The token
  // reaches CSS as a custom property; the module CSS applies it on the
  // overlay wrapper, whose transform is separate from Button's own press
  // transform, so Framer Motion and this scale never collide.
  const tokens = useMotionTokens()

  // The button overlays the canvas (David's design, 2026-07-18) so it reads
  // as part of the artwork, the way the file's own in-art button did before
  // interaction moved to the DOM. The stage has pointer-events: none; the
  // overlay wrapper re-enables them, so the button is the only clickable
  // surface. The wrapper (not Button itself) carries the centering and scene
  // transforms: Button's press animates its own transform, and the two must
  // not collide.
  return (
    <WaterWiltRive watered={watered}>
      <div
        className={styles.buttonOverlay}
        style={{ '--ww-scene-scale': tokens.scale.base }}
      >
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
      linear: cubicBezier(...tokens.ease.linear),
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
  //   wilt     die channels 0 → 1 together (the authored die); which
  //            channels depends on wiltFlowers, see the channel lists
  //   retract  Wilt pressed mid-flower-beat: the young flowers pull back to
  //            0 first, then the established plant dies (two-stage wilt)
  //   settle   wilt done, zeros written, holding SETTLE_FRAMES before the
  //            postGrowthBoole release (the bloom-flash guard)
  //   unwilt   Water pressed mid-wilt: die channels reversed back down
  //   unwater  Wilt pressed mid-GROWTH only: grow-era channels reversed to 0
  //            (after the grow track lands, a wilt is a death, not a rewind)
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
    plantIdling: false, // mirrors the plantIdleBoole write, restored on rebind
    growHandoff: null, // frames until the landed grow scrub retires to 0
    wiltFlowers: true, // whether the current wilt/unwilt includes flowersDie
    parkDieHandoff: null, // frames until die+rainStop re-park at 1 on a resume
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

  // plantIdleBoole — the rain solution applied to the plant (David's call,
  // 2026-07-18: the sway may begin before flowersGrow finishes). Once the
  // grow scrub lands, PlantGrow would hold a frozen still through delay.long
  // and the whole flower beat; instead the driver raises plantIdleBoole (the
  // sway appears pose-matched: idleGrow's first frame is the grown pose,
  // contract invariant), retires the grow scrub to 0 after a settle window
  // (grow at 0 renders nothing, so no double plant), and drops the boolean
  // the moment any wilt or reversal starts, restoring the scrub first so the
  // plant un-grows visibly. PlantIdle's gate reads this boolean alone;
  // idleBoole keeps its remaining jobs (die-era inverse gates, the compound
  // FlowerGrow gate).
  function writePlantIdle(on) {
    driver.current.plantIdling = on
    const handle = settersRef.current.plantIdle
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
      // Reverse the die channels back to 0 on ease.enter. Where they land
      // depends on wiltFlowers: a bloom wilt returns to bloom, a post-growth
      // wilt resumes the sequence (see the unwilt completion). The active
      // channels always travel together, so die's value stands for the set.
      d.from = d.values.die
      d.q = 0
      d.mode = 'unwilt'
      writeBooleans()
      return
    }
    if (d.mode === 'retract') {
      // Water again while the young flowers pull back: regrow them from
      // where they stand. The flowers beat is re-entered directly; rain and
      // grow are retired scrubs here and must not be re-run from 0.
      d.mode = 'water'
      startBeat(WATER_SEQUENCE.length - 1)
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
      d.wiltFlowers = true
      d.rainHandoff = null // RainFall is hidden through wilt; step 9 zeroes it
      d.growHandoff = null
      d.parkDieHandoff = null
      writeBooleans()
      writeRainLoop(false)
      // The sway yields to PlantDie in the same frame; the die instances at 0
      // are the bloom the sway was orbiting, so the snap is bounded by the
      // sway's own amplitude (the accepted mid-sway snap).
      writePlantIdle(false)
      for (const ch of WILT_CHANNELS) writeChannel(ch, 0)
      return
    }
    if (d.mode === 'water') {
      // After the grow track lands (plantIdling is the marker), a wilt is a
      // death, not a rewind (David's 2026-07-19 review): the established
      // plant runs the authored die. Young flowers mid-beat pull back first,
      // the two-stage wilt; flowers still at 0 skip straight to the die.
      if (d.plantIdling) {
        if (d.values.flowers > 0) {
          d.mode = 'retract'
          d.q = 0
          d.from = d.values.flowers
          return
        }
        beginPostGrowthWilt()
        return
      }
      // Wilt mid-growth: every grow-era channel above 0 travels back to 0
      // together, one duration.slow beat on ease.exit. Reversed travel is the
      // accepted policy for a plant still growing; the parked die instances
      // render nothing, so there is no interference. The reversing rain ramp
      // owns the rain again: if the ramp was already retired to 0 (the loop
      // handoff), restore it to its full pose in the same frame the loop
      // drops, so the rain un-falls instead of vanishing. The swap is bounded
      // like the mid-sway snap. (The grow scrub needs no such restore here:
      // pre-landing, it has never been retired.)
      d.mode = 'unwater'
      d.q = 0
      d.rainHandoff = null
      d.growHandoff = null
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
      // current pose. wiltFlowers carries over from the interrupted wilt.
      d.from = d.values.die
      d.q = 0
      d.mode = 'wilt'
      writeBooleans()
    }
    // 'rest', 'settle', 'retract', and 'wilt' ignore a Wilt press: they are
    // already at, or heading into, the dry state.
  }

  // The post-growth death: the authored die for plant and rain, with
  // flowersDie left parked at 1 because the flowers never reached bloom
  // (the phantom-flower rule). PlantDie at 0 is the grown plant and RainStop
  // at 0 is full rain, so the handoff from sway and loop is pose-matched;
  // FlowerGrow hides on the boolean flip while holding nothing, or having
  // just retracted to nothing.
  function beginPostGrowthWilt() {
    const d = driver.current
    d.mode = 'wilt'
    d.q = 0
    d.from = 0
    d.wiltFlowers = false
    d.rainHandoff = null
    d.growHandoff = null
    d.parkDieHandoff = null
    writeBooleans()
    writeRainLoop(false)
    writePlantIdle(false)
    writeChannel('die', 0)
    writeChannel('rainStop', 0)
  }

  // Water pressed while a post-growth wilt reverses back down: the plant is
  // grown but the flowers never were, so bloom is the wrong destination.
  // Re-enter the water sequence at the delay beat (delays ahead of a resume
  // run again in full, the established rule), bring the sway and rain loop
  // back over the pose-matched die instances, and re-park die and rain-stop
  // at 1 two settled frames later, once the loops are on screen.
  function resumePostGrowth() {
    const d = driver.current
    d.mode = 'water'
    startBeat(1)
    writeBooleans()
    writePlantIdle(true)
    writeRainLoop(true)
    d.parkDieHandoff = SETTLE_FRAMES
  }

  function enterBloom() {
    const d = driver.current
    d.mode = 'bloom'
    // Contract bloom entry: both booleans go true. The idle loops appear at
    // the bloom pose; the grow-era instances hide (flowers stay, per their
    // compound gate); the die-era instances hide. rainBoole and
    // plantIdleBoole re-assert true, keeping the mirrors honest for the next
    // rebind restore (after an un-wilt they are the writes that actually
    // bring the loops back).
    writeBooleans()
    writeRainLoop(true)
    writePlantIdle(true)
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
    // Both already false since the wilt press; asserted for the mirrors.
    writeRainLoop(false)
    writePlantIdle(false)
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
      sceneScale: instance.number('sceneScale'),
      rainLoop: instance.boolean('rainBoole'),
      plantIdle: instance.boolean('plantIdleBoole'),
    }
    const d = driver.current
    for (const key of Object.keys(d.values)) writeChannel(key, d.values[key])
    writeBooleans()
    // BOTH loop mirrors, always. plantIdling was missing here when the plant
    // handoff landed, and a theme switch after growth erased the plant: the
    // fresh instance held plantIdleBoole's authored false while the grow
    // scrub was already retired to 0, so neither instance drew (David's
    // deploy diff, 2026-07-19). Any future driver-owned boolean must be
    // restored in this block or a rebind silently drops it.
    writeRainLoop(d.rainLooping)
    writePlantIdle(d.plantIdling)
    rive.play(RIV.stateMachine)
  }, [rive, instance])

  // The one direct bind: a VM number written outside the frame loop, on
  // change only (the tiles' cellSize pattern). scale.base → sceneScale, the
  // whole composition through the scene group. (A separate plantScale bind
  // for scale.expressive was planned and withdrawn 2026-07-18: sceneScale
  // covers it, David's call.) `instance` is a dep so a rebind re-applies to
  // the fresh handle; declared after bind sync, so the handle is current.
  useEffect(() => {
    const handle = settersRef.current.sceneScale
    // The token is a unitless multiplier (1 = authored size); the property's
    // neutral is 100, Rive's native percent for group scale. The driver
    // converts at the boundary so the file stays idiomatic — writing the
    // token raw collapsed the scene to about 1% (found 2026-07-18, first
    // run against the authored property).
    if (handle) handle.value = tokens.scale.base * 100
  }, [instance, tokens.scale.base])

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
        // Pending scrub retirements (see the handoffs in the water case).
        // Counted in advances so each loop is on screen before its frozen
        // scrub frame goes; cancelled by any wilt or reversal press, which
        // reclaims the scrub first.
        if (d.rainHandoff != null) {
          d.rainHandoff -= 1
          if (d.rainHandoff <= 0) {
            d.rainHandoff = null
            writeChannel('rain', 0)
          }
        }
        if (d.growHandoff != null) {
          d.growHandoff -= 1
          if (d.growHandoff <= 0) {
            d.growHandoff = null
            writeChannel('grow', 0)
          }
        }
        // Pending die re-park after a post-growth resume: the loops are on
        // screen, so die and rain-stop can return to their invisible 1 pose.
        if (d.parkDieHandoff != null) {
          d.parkDieHandoff -= 1
          if (d.parkDieHandoff <= 0) {
            d.parkDieHandoff = null
            writeChannel('die', 1)
            writeChannel('rainStop', 1)
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
                // A landed scrub hands off to its self-playing loop, then
                // retires to 0 after two settled frames so its frozen last
                // frame never sits on top of the loop (the scrub gates read
                // postGrowthBoole, which flips only at bloom). Both handoffs
                // are pose-matched: each loop's first frame is authored to
                // follow its scrub's last, and the loop starts playing the
                // frame its boolean goes true.
                if (q >= 1 && track.channel === 'rain') {
                  writeRainLoop(true)
                  d.rainHandoff = SETTLE_FRAMES
                }
                if (q >= 1 && track.channel === 'grow') {
                  writePlantIdle(true)
                  d.growHandoff = SETTLE_FRAMES
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
            const dur = Math.max(t.duration.slow, MIN_DURATION_S)
            d.q = Math.min(1, d.q + dt / dur)
            const v = d.from + (1 - d.from) * ease.exit(d.q)
            const channels = d.wiltFlowers ? WILT_CHANNELS : POST_GROWTH_WILT_CHANNELS
            for (const ch of channels) writeChannel(ch, v)
            if (d.q >= 1) beginRestSettle()
            break
          }
          case 'retract': {
            // Stage one of the two-stage wilt: the young flowers pull back
            // to 0, quick, on the functional timing; then the die runs.
            const dur = Math.max(t.duration.fast, MIN_DURATION_S)
            d.q = Math.min(1, d.q + dt / dur)
            writeChannel('flowers', d.from * (1 - ease.exit(d.q)))
            if (d.q >= 1) {
              writeChannel('flowers', 0)
              beginPostGrowthWilt()
            }
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
            const dur = Math.max(t.duration.slow, MIN_DURATION_S)
            d.q = Math.min(1, d.q + dt / dur)
            const v = d.from * (1 - ease.enter(d.q))
            const channels = d.wiltFlowers ? WILT_CHANNELS : POST_GROWTH_WILT_CHANNELS
            for (const ch of channels) writeChannel(ch, v)
            // A bloom wilt reverses to bloom: the channels land at 0 (the
            // bloom pose, hidden once idleBoole is true) and the next Wilt
            // press snaps them there anyway. A post-growth wilt reverses
            // back into the sequence instead: the flowers were never grown,
            // so bloom would be a lie.
            if (d.q >= 1) {
              if (d.wiltFlowers) enterBloom()
              else resumePostGrowth()
            }
            break
          }
          case 'unwater': {
            const dur = Math.max(t.duration.slow, MIN_DURATION_S)
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
