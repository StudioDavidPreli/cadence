---
Purpose: Interface contract between the Token Lab react driver and waterwiltreact.riv
Source: Live Rive MCP inspection of the rebuilt file plus David's editor decisions, 2026-07-18
---

# waterWilt — Token to VM Map

This is the contract between the two halves of the Water & Wilt demo. David authors
`public/rive/waterwiltreact.riv` against it; a later session builds the React driver
against it. Neither side changes the interface without the other seeing it. Once
committed, this document is the single source of truth; the code and the file conform
to it, not the other way around.

The demo: a DOM button toggles between Water and Wilt. Water starts rain, grows the
plant, and after a delay blooms the flowers. Wilt runs a distinct authored die
animation back to the initial state. Every duration, easing, and delay comes from
Token Lab's live token reducer.

## Architecture rules (settled, condensed)

- **Rive keys stay linear.** All easing is evaluated in JS from the token bezier
  arrays (`cubicBezier` from framer-motion, no new library). The file holds poses;
  the driver holds time.
- **The driver is a React rAF loop**, the Motion Tiles director pattern pointed at
  the Token Lab reducer. It integrates `p += dt / duration` per frame, which is
  also the live-retiming rule: a token change mid-animation alters the rate from
  the current progress with no recompute step.
- **No script in the file, by design.** Verified: zero Luau. The number-to-timeline
  wiring is nested-artboard time remap, evaluated during advance. Keep it that way;
  a script would pick up the `markNeedsUpdate()` obligation from the statics-v3
  incident for nothing.
- **Reduced motion is driver-side.** The driver quantizes eased progress into
  discrete steps (stop-motion). No Rive-side reduced-motion logic. The two
  self-playing loops are the one open edge; see Planned work.
- **Scale binds directly.** One VM number written outside the frame loop, the
  tiles' cellSize/gapSize pattern.
- **The DOM button owns interaction.** Canvas gets `pointer-events: none`. The
  in-file button and all listeners were removed 2026-07-18.
- **No coupling to Motion Tiles.** No shared clock, presets, or control vocabulary.
  The air gap between the tools is a design decision.
- **State machine anchor.** `waterWiltSM` is an empty anchor. React plays it so the
  artboard advances; a paused artboard stops re-evaluating binds, so per-frame
  writes would stop painting (the tiles rule).

## Runtime strings

| Thing | Value |
|---|---|
| File | `public/rive/waterwiltreact.riv` |
| Artboards | `waterWilt` (main), `Plant`, `Rain` (nested sources) |
| State machine | `waterWiltSM` (empty anchor, play it) |
| View model | `WaterWiltVM` |
| Instances | `darkMode`, `lightMode`, `contrastLight`, `contrastDark` |
| Runtime | `@rive-app/react-webgl2` (the only runtime) |

```javascript
const themeToInstanceName = {
  dark: 'darkMode',
  light: 'lightMode',
  'high-contrast-light': 'contrastLight',
  'high-contrast-dark': 'contrastDark',
}
```

Four authored per-theme instances, the hero convention. All thirteen colors and the
planter opacities are instance-carried. React writes no colors and must not call
`useHCContrastColors`.

## Token map

"Consumed by" is one of: **driver clock** (the token shapes the JS computation; no
VM property exists for it), **direct bind** (React writes the value to a VM property
outside the frame loop), or **not consumed** (with the reason).

Most tokens map to no VM property. That absence is the point: the driver owns
duration, easing, and delay, so the timing tokens never cross the canvas boundary.
This table is the first document in the project that shows where the token boundary
sits when animation moves to canvas.

| Token path | Consumed by | VM property (name : type) | Write pattern | Notes |
|---|---|---|---|---|
| `duration.fast` | driver clock | — | — | Rain-fall ramp in (moved from `base` 2026-07-18, David's token-lab review: fast's default sits under the ~130ms window where the arrival reads as one transient). The DOM toggle Button also reads it under Button's own contract. |
| `duration.base` | not consumed | — | — | Re-owned away 2026-07-18: rain moved to `fast`, the wilt to `slow`, so base stopped driving two unrelated beats. |
| `duration.slow` | driver clock | — | — | Flower grow phase; and die, rain-stop, and flowers-die out on Wilt (moved from `base` 2026-07-18; 400ms is still faster than the 600ms entry, exit-faster holds). |
| `duration.slower` | driver clock | — | — | Growth, the hero beat. |
| `ease.linear` | driver clock | — | — | Rain-fall ramp scrub (2026-07-18 experiment): enter's flat tail made the drops stall before snapping to the loop's speed; linear holds the scrub speed steady into the handoff. Still a fixed reference, no slider. |
| `ease.standard` | driver clock | — | — | Flower grow phase. |
| `ease.enter` | driver clock | — | — | Growth, and the un-wilt reversal. |
| `ease.exit` | driver clock | — | — | Die, rain-stop, and flowers-die, together on Wilt. |
| `ease.overshoot` | not consumed | — | — | Eased progress above 1 clamps at the timeline end. Unlockable later by authoring headroom past the rest pose. |
| `delay.none` | not consumed | — | — | Fixed reference. |
| `delay.short` | not consumed | — | — | Was the rain-complete-to-growth soak. Dropped 2026-07-18 (David's visual review): rain and growth now trigger together on the press. |
| `delay.medium` | not consumed | — | — | Reserved for a specs cascade if that split ever happens. |
| `delay.long` | driver clock | — | — | Growth-complete to flower-start. |
| `scale.subtle` | not consumed | — | — | |
| `scale.base` | direct bind | `sceneScale : number` | On-change effect write, token × 100 | Whole-composition scale through the `scene` group (authored 2026-07-18). The property's neutral is 100, Rive's percent; the token stays a unitless multiplier and the driver converts at the boundary. The DOM toggle rides the same token twice: its overlay wrapper scales with the scene through a CSS custom property (2026-07-18, so the button tracks the composition it sits on), and Button's own press squash reads it under Button's contract. |
| `scale.expressive` | not consumed | — | — | The planned `plantScale` bind was withdrawn 2026-07-18 (David's call): composition scale is `sceneScale`'s job and the plant does not get a separate dial. |
| `scale.lift` | not consumed | — | — | |

## VM contract

All progress channels run 0 to 1, mapping to 0% to 100% of the target timeline's
scrub. 1 is the authored end of the animation. This holds only while every scrubbed
timeline's working area equals its full duration; see Invariants.

| VM property | Type | Owner | Written | Meaning |
|---|---|---|---|---|
| `growProgress` | number | driver, per frame | during growth | Scrubs `grow` in `PlantGrow`. 0 = dead pose, 1 = fully grown. |
| `flowersGrowProgress` | number | driver, per frame | after `delay.long` | Scrubs `flowersGrow` in `FlowerGrow`. 0 = no flowers, 1 = full bloom. |
| `flowersDieProgress` | number | driver, per frame | during wilt | Scrubs `flowersDie` in `FlowersDie`. Parks at 1 when inactive. |
| `dieProgress` | number | driver, per frame | during wilt | Scrubs `die` in `PlantDie`, authored from full bloom. Parks at 1 when inactive. |
| `rainFallProgress` | number | driver, per frame | during the fall ramp | Scrubs `rainFall` in `RainFall`. |
| `rainStopProgress` | number | driver, per frame | during wilt | Scrubs `rainStop` in `RainStop`. Parks at 1 when inactive. |
| `idleBoole` | boolean | driver, at phase boundaries | true at bloom rest | Gates both idle loops (playing and opacity together) and, inverted, the die/rain-stop instances. |
| `rainBoole` | boolean | driver, at phase boundaries | true from rain-ramp landing through bloom; false from any wilt or reversal | Authored and wired 2026-07-18 (the frozen-rain seam's fix). The driver holds it true across bloom, so `RainIdle` binds to `rainBoole` ALONE: a straight source swap from `idleBoole`, no OR converter (simplified from the original OR plan). Verified on built output: rain falls through the growth-to-flowers delay. |
| `postGrowthBoole` | boolean | driver, at phase boundaries | true from bloom until wilt completes | Gates the grow-era instances off. The flower-grow gate is compound; see Instance gating. |
| `sceneScale` | number | driver, on token change | outside the frame loop | Authored 2026-07-18. Scales the `scene` group (the whole composition); neutral 100 (Rive percent), written as `scale.base × 100`. |
| `plantIdleBoole` | boolean | driver, at phase boundaries | true from grow-scrub landing through bloom | Authored 2026-07-18 (the rain solution applied to the plant, David's call: sway may begin before flowersGrow finishes). Gates `PlantIdle` alone; the driver retires the landed grow scrub to 0 behind it and restores the scrub to 1 for reversals, exactly the rainBoole pattern. |
| 13 colors, 2 planter opacities, `artboardBG` | color / number | theme instances | never at runtime | Authored per instance, `flowerPetals` and `flowerFaces` included. React rebinds the instance on theme change and writes nothing. |
| completion signal | — | — | — | None, and none needed. The driver owns the clock, so React knows every phase boundary without a VM read-back. The button label flips on driver state. |

No trigger properties, no events out, no strings. The file cannot talk back, and
nothing in the file writes a driver-owned channel. Converters read only.

## Instance gating

Eight nested instances on the main artboard, each exposing one animation. Visibility
is the file's job, driven by the two booleans through hand-built converter groups
(boolean-to-number, multiply −1, add +1 for the inversions):

| Instance | Animation | Kind | Visible when |
|---|---|---|---|
| `PlantGrow` | `grow` | remap scrub | `postGrowthBoole` false |
| `RainFall` | `rainFall` | remap scrub | `postGrowthBoole` false |
| `FlowerGrow` | `flowersGrow` | remap scrub | **open**: `idleBoole` true OR `postGrowthBoole` false (see below) |
| `PlantIdle` | `idleGrow` | self-playing loop | `plantIdleBoole` true (re-bound from `idleBoole` 2026-07-18; see the plantIdleBoole row) |
| `RainIdle` | `rainingIdle` | self-playing loop | `rainBoole` true (re-bound from `idleBoole` 2026-07-18; see the rainBoole row) |
| `PlantDie` | `die` | remap scrub | `idleBoole` false |
| `RainStop` | `rainStop` | remap scrub | `idleBoole` false |
| `FlowersDie` | `flowersDie` | remap scrub | `idleBoole` false |

**The flower-grow gate, RESOLVED 2026-07-18, authored in the editor.**
`FlowerGrow` cannot take the plain `postGrowthBoole` gate the other grow-era
instances use: the flowers must stay visible through idle (parked at 1 while the
plant sways), and `postGrowthBoole` is true then. The one phase where it must
hide is wilt, the only phase with `postGrowthBoole` true and `idleBoole` false,
so the required logic is the compound `idleBoole OR NOT postGrowthBoole`, or an
equivalent found in the editor. David wired it (or its equivalent) across the
2026-07-18 export series; verified on built output the same day: mid-wilt frames
show `FlowersDie` animating the death in sync with the plant, no parked bloom
copies on top, and the wilt-completion capture shows no pop frame where the
driver's `flowersGrowProgress` reset used to flash. The exact editor wiring is
David's record. Related visual check, David's eye, not a contract term: during
idle the plant sways while the parked flowers hold still; judge whether that
reads as calm or as detached.

The scheme is safe because the dead pose is invisible content: trunk and leaves at
scale zero, shadows at opacity zero, rain gone. `PlantDie` and `RainStop` visible
but parked at 1 render nothing, which is what lets them sit "shown" through rest
and growth without a third gate. The Planter never animates and stays flat on the
main artboard.

## Driver obligations

**Mount init.** Write `dieProgress = 1`, `rainStopProgress = 1`, and
`flowersDieProgress = 1` before first paint (authored instance defaults of 1 are
the recommended second line of defense). Without this, first load shows the die
instances at 0: a full-bloom ghost.

**The full cycle.** (Steps 1 to 3 revised 2026-07-18 after David's visual
review: rain and growth trigger together, and the soak beat is gone.)

1. Water press: `rainFallProgress` 0 to 1 on `duration.fast` + `ease.linear` and
   `growProgress` 0 to 1 on `duration.slower` + `ease.enter`, together
   (rain re-owned from base+enter 2026-07-18). The beat completes when the
   slower channel lands. When the rain track lands,
   `rainBoole` goes true and, two settled frames later, the driver retires the
   ramp to 0 (added 2026-07-18): `RainFall`'s gate is `postGrowthBoole`, which
   flips only at bloom, so an unretired ramp parks its frozen last frame on
   top of the loop from here into idle. The handoff is pose-matched:
   `rainingIdle` starts playing the frame the ramp lands, and its first frame
   follows `rainFall`'s last.
2. `delay.long` elapses.
3. `flowersGrowProgress` 0 to 1 on `duration.slow` + `ease.standard`.
4. `idleBoole` and `postGrowthBoole` both go true. Idle loops appear at the bloom
   pose; grow-era instances hide (flowers stay, per their compound gate);
   die-era instances hide.
5. Wilt press: same frame, `idleBoole` false; `dieProgress`, `rainStopProgress`,
   and `flowersDieProgress` snap to 0. The die instances at 0 are the bloom the
   idle loop was orbiting, so the handoff is pose-matched.
6. `dieProgress`, `rainStopProgress`, and `flowersDieProgress` 0 to 1 together on
   `duration.slow` + `ease.exit` (moved from `base` 2026-07-18). Both interrupt
   reversals mirror this duration.
7. Wilt complete: reset `growProgress`, `flowersGrowProgress`, `rainFallProgress`
   to 0; die, rain-stop, and flowers-die stay parked at 1; then `postGrowthBoole`
   false. "Then" is load-bearing (2026-07-18): the driver holds two settled
   frames between the resets and the release, because flipping the gate in the
   same tick as the zeros paints the grow-era instances at their old poses for
   one frame, a full-bloom flash over the dead plant (reproduced frame-by-frame
   on built output). The grow-era instances return at their invisible 0 poses.
   Rest state now equals initial state.

**Interrupts.** (Revised 2026-07-19, David's testing: reversed travel narrowed
to strictly mid-growth. After the grow track lands, a wilt is a death, not a
rewind.)

Wilt pressed mid-growth (the grow track not yet landed): reverse the running
grow-era channels back down on `ease.exit`; the parked die/rain-stop are
visible but render nothing, so there is no interference. If the rain ramp was
already retired to 0, the driver restores it to 1 in the same frame
`rainBoole` drops, so the rain un-falls with the reversal instead of
vanishing (bounded swap, the mid-sway precedent).

Wilt pressed post-growth (delay.long or the flower beat; `plantIdleBoole` is
the boundary marker): the authored die runs for plant and rain, with
`flowersDieProgress` left parked at 1, because `flowersDie` is authored from
full bloom and flowers that never bloomed have no death to play (the
phantom-flower rule). Pressed mid-flower-beat, the wilt is two-stage: the
young flowers first pull back to 0 on `duration.fast` + `ease.exit` (reversed
travel for the young, authored death for the established), then the die runs.
`FlowerGrow` hides on the boolean flip while holding nothing.

Water pressed mid-wilt: reverse the active die channels back to 0 on
`ease.enter`. From a bloom wilt, continue at bloom, as before. From a
post-growth wilt, bloom would claim flowers that never grew, so the driver
re-enters the water sequence at the delay beat instead (delays ahead of a
resume run in full, the established rule); the sway and rain loop return over
the pose-matched die instances, and die/rain-stop re-park at 1 two settled
frames later. Water pressed mid-wilt: reverse `dieProgress`,
`rainStopProgress`, and `flowersDieProgress` back to 0 on `ease.enter`, then
continue from bloom. The wilt
animation from full bloom is the authored `die` timeline; a partial-state wilt is
reversed travel, which is the accepted policy, not a violation of the
distinct-wilt rule.

**Reduced motion.** Quantize the eased progress of every scrubbed channel into
discrete steps. The DOM button flattens like every other DOM component.

## Invariants

- **Working area equals duration** on every scrubbed timeline. The remap maps 0 to 1
  across the full duration; a working area shorter than the duration desynchronizes
  1 from the authored end. David trims all timelines to hold this (2026-07-18).
- **Every die-era timeline at 1 equals its rest state exactly** (`die` the dead
  plant, `flowersDie` and `rainStop` empty). The post-wilt resets must be invisible,
  and parked-at-1 must render nothing.
- **Idle frame 0 equals the bloom pose** (and its last frame blends into die's
  first), bounding the mid-sway snap by the sway's own amplitude.
- **Single writer per channel.** The driver writes progress and the booleans;
  the file's converters only read them. Nothing in the file writes a driver-owned
  property.

## Known seams, recorded as decisions

- **Frozen rain during growth, RESOLVED 2026-07-18.** `RainIdle` was gated by
  `idleBoole`, which goes true only at bloom, so `RainFall` held its last frame
  from the end of its ramp until bloom; David's visual review confirmed it read
  as a glitch. The fix landed in two halves the same day: the driver writes
  `rainBoole` (true when the ramp lands, held true through bloom, false the
  moment any wilt or reversal starts), and the file re-bound `RainIdle`'s
  playing and opacity to `rainBoole` alone, a one-source swap with no OR
  converter, because the driver covers bloom. Verified on built output: rain falls through
  the growth-to-flowers delay, rest is unchanged, and no interrupt path shows
  double rain.
- **Mid-sway snap on Wilt.** Bounded by sway amplitude; accepted without machinery.
- **Overshoot clamps.** `ease.overshoot` stays unconsumed until a timeline authors
  headroom past its rest pose.

## Not yet authored (tracked against this contract)

- `flowerPetals` and `flowerFaces` values verified in all four theme instances.
- Verify the nested instances' bindable `quantize` property as the reduced-motion
  mechanism for the two self-playing loops, which the driver cannot scrub.

## Related documents

- `docs/briefings/waterwilt-react-wiring.md`: full file inspection, 2026-07-18,
  partially superseded by the same-day rework this contract describes.
- `docs/decisions/motion-tiles-integration-2026-07-13.md`: the director pattern.
- `docs/decisions/chrome-timing-and-token-integrity-2026-06-23.md`: the gate the
  driver code must pass.
- `docs/decisions/webgl2-consolidation-2026-07-17.md`: the runtime and the rebind
  failure the color rule guards against.

The plant is still patient. Now it waits for a driver.
