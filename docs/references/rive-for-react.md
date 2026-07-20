---
Purpose: Workflow and troubleshooting reference for driving Rive files from React
Source: The Water & Wilt build, one session, 2026-07-18 into 2026-07-19. Fifteen commits, 88f05e4 through bc78c3a.
---

# Rive for React

A plant lives in a canvas. A button lives in the DOM. Every duration, easing,
and delay between them comes from Token Lab's live reducer, and nothing in the
canvas knows what a token is. This document records how that works, how it was
built, and every place it broke on the way.

The demo is React Clock (the Embeds category). The interface contract
is `docs/briefings/waterwilt-token-vm-map.md`; the component is
`src/components/WaterWilt/index.jsx`. This document explains them. Where they
disagree with it, they win.

## The architecture in one line

The file holds poses; React holds time.

Every animation in the .riv is a linear timeline scrubbed by a view-model
number from 0 to 1. React integrates time, evaluates easing in JS, and writes
eased progress into those numbers each frame. The timing tokens never cross
the canvas boundary: there is no duration, speed, or easing property in the
file at all. Retiming the animation means changing what React writes, which is
why a slider drag mid-growth bends the plant's pace on the very next frame.

## The wall, and the workflow that respects it

The work splits across two tools that cannot see each other. David authors the
.riv in the Rive editor; React is built against a committed contract document.
Neither side changes the interface without the other seeing it. The loop that
built this demo, run about a dozen times in one day:

1. The contract names a property, its type, its neutral value, and who writes it.
2. React probes the exported binary before trusting it:

   ```bash
   strings - public/rive/waterwiltreact.riv | grep -c sceneScale
   ```

   A zero means the export lags the conversation. Diffing `strings` output
   against the previously committed .riv shows exactly what an export added,
   which settled more than one argument about what was wired.

3. The driver half ships first, null-guarded. Writing to a property that does
   not exist yet is a silent no-op, so React can land, verify, and wait.
4. David authors the property and re-exports. The feature lights up with no
   further React change.
5. Verification runs on built output, never the dev server, and the .riv is
   committed with the code that speaks to it.

The null-guard pattern carried three features across the wall in one session:
`rainBoole`, `plantIdleBoole`, and `sceneScale`. The one time the order
reversed, the property arrived with a surprise neutral value and the scene
collapsed to one percent of its size. Probe first.

## The hooks

Four hooks from `@rive-app/react-webgl2`, and a rule about what not to use.

```jsx
const { rive, RiveComponent } = useRive({
  src: '/rive/waterwiltreact.riv',
  artboard: 'waterWilt',
  stateMachines: 'waterWiltSM',
  autoplay: false,   // play only after the theme instance binds
  autoBind: false,   // bind the theme's own instance ourselves
})

const viewModel = useViewModel(rive, { name: 'WaterWiltVM' })
const instance = useViewModelInstance(viewModel, {
  rive,
  name: themeToInstanceName[theme],
})
```

`waterWiltSM` is an empty state machine. It exists to be played: a paused
artboard stops re-evaluating its data binds, so per-frame writes stop
painting. The machine has zero inputs, zero listeners, zero events. It is a
heartbeat.

The file carries four theme instances (`darkMode`, `lightMode`,
`contrastLight`, `contrastDark`), each with its own authored colors. React
maps the app theme to an instance name, binds it, and writes no colors, ever.
A theme change is a rebind, nothing more.

### The trap: value hooks go stale across a rebind

The runtime also exports `useViewModelInstanceNumber` and its siblings, which
return setters. Do not hold those setters across a theme rebind. Each setter
carries an internal property handle that lags one render behind the rebind,
and the webgl2 runtime silently accepts writes to the discarded instance. The
first build of this demo used them; switching themes at bloom froze the canvas
on a ghost and quietly routed every write into the old theme's instance. The
same failure was already on record for colors in the 2026-07-17 consolidation.

The correct pattern acquires property handles from the freshly bound instance,
inside the effect that reacts to the bind:

```jsx
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
  writeRainLoop(d.rainLooping)
  writePlantIdle(d.plantIdling)
  rive.play(RIV.stateMachine)
}, [rive, instance])
```

This effect is also the mount init and the rebind restore in one place. Each
named instance carries its own property values, so a rebind must replay the
driver's entire current state into the fresh instance before it paints. On
first mount, that replay is the contract's init obligation: the die channels
park at 1, because their instances at 0 would paint a full-bloom ghost over an
empty pot.

`instance.number()` returns null for a property the file does not carry, and
every write guards on the handle. That null is the wall's friend.

## The driver

One `requestAnimationFrame` loop for the component's lifetime, adapted from
the Motion Tiles director: setters in refs, tokens in refs, nothing re-renders
per frame. Where the tiles run an ambient loop forever, this driver is a
one-shot sequencer. It runs phases to completion and then does nothing at all.

### State

```jsx
const driver = useRef({
  mode: 'rest',        // rest | water | bloom | wilt | retract | settle | unwilt | unwater
  step: 0,             // index into WATER_SEQUENCE
  q: 0,                // beat progress, delay seconds, or settle frame count
  from: 0,             // start value of the die channels' current travel
  trackQ: {},          // per-track integrator state for parallel beats
  trackFrom: {},
  reversalFrom: null,  // per-channel start values for the unwater reversal
  rainLooping: false,  // mirrors of the boolean writes, restored on rebind
  plantIdling: false,
  rainHandoff: null,   // frames until a landed scrub retires to 0
  growHandoff: null,
  wiltFlowers: true,   // whether this wilt includes flowersDie
  parkDieHandoff: null, // frames until die channels re-park after a resume
  values: { rain: 0, grow: 0, flowers: 0, die: 1, rainStop: 1, flowersDie: 1 },
})
```

Interrupt policy splits at the grow-landing boundary, with `plantIdling` as
the marker (David's 2026-07-19 revision): a wilt before the plant finishes
growing is reversed travel, a wilt after is the authored death. Post-growth
deaths leave `flowersDieProgress` parked, because a death authored from full
bloom cannot play for flowers that never bloomed; a wilt pressed mid-flower-
beat retracts the young flowers first, then dies. Reversed travel for the
young, authored death for the established, decided per layer.

`values` mirrors every channel's last written value. It exists so a rebind can
restore the new instance and so interrupts know where each channel stands. The
boolean mirrors serve the same restore.

### The sequence table

```jsx
const WATER_SEQUENCE = [
  {
    tracks: [
      { channel: 'rain', duration: 'fast', ease: 'linear' },
      { channel: 'grow', duration: 'slower', ease: 'enter' },
    ],
  },
  { delay: 'long' },
  { tracks: [{ channel: 'flowers', duration: 'slow', ease: 'standard' }] },
]
```

A beat carries parallel tracks and completes when the slowest lands. A delay
beat accumulates seconds and compares against the live token each frame, so
shortening a delay mid-wait ends the wait immediately. The code-view snippet
in Token Lab mirrors this table; keep the two in step by hand.

### Integration

The heart of the loop, per animated track, per frame:

```jsx
const dur = Math.max(t.duration[track.duration], MIN_DURATION_S)
q = Math.min(1, q + dt / dur)
writeChannel(track.channel, from + (1 - from) * ease[track.ease](q))
```

`p += dt / duration` is the whole timing model. Because `t` is a ref holding
the live tokens, a token edit mid-beat changes the rate from the current
progress with no recompute step: that is the retiming rule, and it is the
demo's reason to exist. Easing evaluates in JS through `cubicBezier` from
framer-motion, rebuilt whenever the token object changes identity. The
`MIN_DURATION_S` clamp exists because Explore mode allows 0ms durations and
`0 / 0` is NaN, and a NaN write corrupts a scrub.

Interrupt reversals stay value-continuous: they capture the channel's current
displayed value and ease it to its target over the wilt duration, rather than
re-integrating `q` under a swapped curve, which would snap.

### Reduced motion

```jsx
handle.value = reducedRef.current
  ? Math.round(value * REDUCED_MOTION_STEPS) / REDUCED_MOTION_STEPS
  : value
```

Quantization happens at the write, never in the integrator, so the clock stays
exact and the OS preference changes rendering, not timing. Five steps, a
count, not a timing, so no token governs it. The preference is read straight
from `useReducedMotion()` because Token Lab's provider deliberately never
flattens tokens: the lab exists to perceive motion. Under the preference, the
cycle runs stop-motion at full tempo. The three self-playing loops are the
open edge; the driver cannot scrub what it does not clock.

## What crosses the boundary

Everything React writes, and the nothing it reads back:

| Direction | What | When |
|---|---|---|
| React to file | six progress channels, 0 to 1 | per frame, active phases only |
| React to file | `idleBoole`, `postGrowthBoole`, `rainBoole`, `plantIdleBoole` | at phase boundaries |
| React to file | `sceneScale` | on token change, outside the frame loop |
| File to React | nothing | ever |

There is no completion event, no trigger, no read-back. The driver owns the
clock, so it knows every phase boundary without asking. The button label flips
on press-owned React state. The single-writer rule holds everywhere: the
driver writes these properties, the file's converters and binds only read
them, and nothing in the file writes a driver-owned channel.

`sceneScale` carries the one unit conversion in the system. The token is a
unitless multiplier where 1 means authored size; the property's neutral is
100, Rive's percent convention for group scale. The driver writes
`tokens.scale.base * 100` and the file stays idiomatic. The first run without
that conversion scaled the scene to one percent, which is a memorable way to
learn a unit convention.

The DOM button rides the same `scale.base` twice more, entirely outside the
canvas: its overlay wrapper scales with a CSS custom property so it tracks the
composition it sits on, and Framer Motion's `whileTap` squashes to the token
on press. One token, one meaning, three surfaces.

## The handoff pattern

The file's scrubs are arrivals: `rainFall` is rain starting, `grow` is a plant
growing. What happens after an arrival is a self-playing loop in a separate
instance (`rainingIdle`, `idleGrow`). Chaining a driven scrub into a
self-playing loop turned out to be the session's recurring problem, and it has
one recurring answer:

1. The loop's gate (playing and opacity together) binds to a single
   driver-owned boolean: `rainBoole`, `plantIdleBoole`. No OR converters. The
   driver holds the boolean true through bloom, so one source suffices.
2. When the scrub lands, the driver raises the boolean. The handoff is
   pose-matched because the loop's first frame is authored to follow the
   scrub's last, and the loop starts playing the frame its gate opens.
3. Two settled frames later, the driver retires the scrub to 0. Frame 0 of an
   arrival renders nothing, so the parked last frame stops sitting on top of
   the loop. Without the retirement, the frozen frame holds until some other
   gate hides it, which is how the rain hung motionless in the air for a week
   of one afternoon.
4. Any wilt or reversal drops the boolean and restores the scrub to 1 in the
   same frame, so the reversal un-plays the arrival instead of blinking it
   out. Every wilt press also cancels a pending retirement: one owner per
   channel, always.

The two settled frames are load-bearing. Flipping a gate in the same tick as
the values it reveals paints the instances at their old poses for exactly one
frame. The wilt-completion flash was caught this way: a frame-by-frame capture
showed 133,894 bytes where rest is 26,654, the whole bloom superimposed on the
dead plant for one frame. `SETTLE_FRAMES = 2` is the guard, and the render
during the hold is identical to what follows, so the pause is invisible.

## The module CSS

The entire stylesheet, because every rule in it is a decision:

```css
/* WaterWilt: demo layout only. No timings here: the demonstration motion is
   the driver's, and the canvas paints it. */

.stage {
  position: relative;
  width: 100%;
  max-width: 340px;
  aspect-ratio: var(--ww-aspect, 4 / 3);
  pointer-events: none;
}

.canvas {
  width: 100%;
  height: 100%;
}

.buttonOverlay {
  position: absolute;
  left: 50%;
  bottom: 6%;
  transform: translateX(-50%) scale(var(--ww-scene-scale, 1));
  transform-origin: 50% 100%;
  pointer-events: auto;
}
```

`pointer-events: none` on the stage is a contract term: the DOM button owns
all interaction, the file's own listeners were removed, and the canvas must
never swallow a click. The overlay wrapper punches the one clickable hole
back through.

`--ww-aspect` comes from `rive.bounds` once the file loads, so the box matches
the artboard with no letterboxing and no hardcoded guess. `--ww-scene-scale`
is the `scale.base` token, set inline by the component, so the DOM button
shrinks toward its bottom-center anchor the way the art shrinks toward the
planter.

The wrapper, not the Button, carries every transform. Framer Motion animates
the Button's own transform on press, and inline transforms replace rather
than compose. Two elements, two transforms, no collision. The same reasoning
keeps hardcoded timings out of this file entirely: the token-integrity gate
fails the build on a literal `ms` in a module stylesheet.

## Verification

The standing rule: `npm run build`, serve the built output with wrangler,
drive the actual surface. The dev server does not minify, and minified CSS has
already rewritten token values into forms that broke a parser once. Endpoint
checks prove nothing about a canvas.

What worked, session-tested:

- **Playwright, not the in-app browser pane.** The pane is a hidden tab and
  rAF never ticks there; a rAF-driven demo freezes at its first frame.
- **`canvas.toDataURL().length` as a fingerprint.** Cheap, and byte-identical
  numbers are strong evidence: the rest state after every path through the
  driver, wilt, reversal, resume, always measured exactly equal to the
  initial rest. When the number is the same, the pose is the same.
- **Frame-by-frame capture across a boundary.** A `requestAnimationFrame`
  loop collecting `toDataURL().length` per frame catches one-frame artifacts
  no timed sample ever sees. It found the bloom flash and later proved its
  absence.
- **Isolating windows.** To verify one moving element among many, stretch a
  delay token until only that element can move, then diff frames inside the
  window. The rain loop was proven this way three separate times.
- **Screenshots when bytes cannot answer.** Byte lengths say something
  changed; only pixels say what. The flowers dying in sync with the plant was
  settled by looking.
- **Mind rAF throttling.** An occluded browser window drops rAF to one frame
  per second. The dt-based clock keeps state true through it, but paints lag,
  and one round of phantom regressions came from exactly this before
  `page.bringToFront()` joined the checklist.
- **Route through `about:blank`.** A `goto` that differs only in hash does
  not renavigate, and a stale bundle will happily fake a result.

### The deploy diff

The push is not the last gate. David runs the live site against the timing
chart and the contract after every deploy, and that pass caught three things
automated verification had structurally missed: an idle that read wrong
against the chart (an authoring issue, fixed in the editor), a fixed-size
button over a scaling scene (a design gap, one CSS variable), and a theme
switch that erased the plant (a missing mirror restore, one line). Each
report arrived as a precise symptom description, and twice the symptom alone
named the broken line before any tool ran. Byte fingerprints prove poses;
only a person who knows what the animation is supposed to feel like can
notice what it fails to say.

## Troubleshooting log

Every failure this build produced, in order of appearance:

| Symptom | Cause | Fix |
|---|---|---|
| Full-bloom ghost on first load | Die-era instances default to 0, which is their bloom pose | Mount init writes the die trio to 1 before playing the anchor |
| Theme switch freezes the canvas, state marooned in old theme | Hook setters lag one render behind a rebind; runtime accepts writes to the discarded instance | Acquire `instance.number()` handles in the bind effect; replay full state on every rebind |
| One-frame bloom flash at wilt completion | Channel resets and gate release in the same tick; gates open one advance before remaps consume the zeros | Two settled frames between the resets and the boolean release |
| Flowers pop off instead of dying | Parked `FlowerGrow` flowers sat on top of `FlowersDie` through the wilt | Compound gate in the editor: visible when `idleBoole OR NOT postGrowthBoole` |
| Rain frozen mid-air through growth | The loop's gate waited on `idleBoole`, true only at bloom | `rainBoole`, driver-raised at ramp landing, gate re-bound to it alone |
| Frozen ramp frame floating on the running loop | The landed scrub parked at 1 with its gate still open | Retire the scrub to 0 after the handoff; restore to 1 for reversals |
| Handoff seam visible above ~130ms | `ease.enter`'s flat tail stalls the drops, then the loop snaps them to speed; under ~130ms the whole ramp reads as one transient | `ease.linear` on the ramp scrub; the threshold matched the perceptual window `duration.fast` already encodes |
| Scene at one percent scale | Token neutral 1 written into a property whose neutral is 100 | Convert at the boundary: `token * 100`; the file speaks percent |
| Plant statue-still between growth and bloom | No timeline runs there; the sway waited on `idleBoole` | The rain solution again: `plantIdleBoole`, handoff, retirement, restore |
| Token highlight green with nothing moving | Map row claimed a null-guarded no-op write | Hold map rows and snippet lines back until the property exists |
| HC button hover invisible | Hover outline color equals the page background in both HC themes | Ring in the surface color, scoped to `[data-theme^="high-contrast"]` |
| Tests pass, deploy looks broken | Verification sampled while rAF was throttled to 1fps | `bringToFront()` before measuring; distrust plateaus |
| Theme switch after growth erases the plant; rain and flowers keep working | The rebind restore replayed every mirror except `plantIdling`, so the fresh instance held the gate's authored false over a retired scrub | Restore every driver-owned boolean in the bind effect; a rebind silently drops whatever the block forgets |

## What the demo argues

Token Lab's other demos read tokens into Framer Motion props. This one reads
the same tokens into a canvas that has never heard of CSS, through a driver
that is nothing but a clock and a contract. The token boundary held: duration,
easing, and delay never entered the file, and the file's colors never entered
React. The named preset stayed the unit of communication, and when the two
sides disagreed about what a number meant, the contract document, not the
code, was where the argument got settled.

Fifteen commits, two days, one wall. The plant waits in the pot for the next
press.
