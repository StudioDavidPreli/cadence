---
Purpose: Token-to-effect map for the pixelPlant embed (Rive Clock) in Token Lab
Source: David's slot decisions 2026-07-20 plus the promoted PixelPlantLab architecture
---

# pixelPlant — Token to Effect Map

> **Rename note, 2026-07-21.** This doc names `scale.expressive`, kept below as
> the historical record of the build. The token was renamed `scale.pressExpressive`
> on 2026-07-21 (press/lift legibility split); if you copy a token name from this
> map into live code, use the new name. Record: `docs/decisions/scale-rename-2026-07-21.md`.

The map between Token Lab's live motion tokens and the chromatic-aberration shader
that runs over the pixelPlant Rive machine. This is the Rive Clock counterpart to
`waterwilt-token-vm-map.md`, and it records where the token boundary sits when the
motion is a WebGL effect rather than a scrubbed timeline.

Rive Clock inverts React Clock. In React Clock the .riv holds poses and a React rAF
loop holds time. Here the Rive state machine `pixelPlantSM` holds the motion, and
React paints a shader over it. No token crosses into the .riv: every token shapes
the shader driver, never the machine.

## The two halves

- **The Rive machine** plays `pixelPlantSM`, interactive, at `opacity: 0` so it
  keeps hit-testing. It owns its own motion (hover and press reactions) and reads
  no token. Theme colors are baked per instance.
- **The shader driver** is a React rAF loop that uploads `rive.canvas` per frame
  and paints a pixelated copy, then moves three colour plates over it. Every
  motion token lands here.

## Token map

"Consumed by" is **driver** (the token shapes the JS shader computation; no Rive
property exists for it) or **not consumed** (with the reason). Every consumed token
is a driver read. Nothing reaches the machine.

| Token path | Consumed by | Job | Notes |
|---|---|---|---|
| `duration.base` | driver | The follow time constant. Each plate chases the cursor by exponential smoothing, `k = 1 - e^(-dt/tau)`, `tau` derived from this token. | Frame-rate independent, replacing the lab's magic `0.12` per-frame lerp. Split from the homecoming length on David's call (2026-07-20) so tracking-tightness and resolve-length tune apart. |
| `duration.slow` | driver | The homecoming length. On pointer-leave the plates run a finite tween back to zero over this duration. | Read live each frame, so dragging it retimes an in-flight return. |
| `duration.fast` | not consumed | — | Free. |
| `duration.slower` | not consumed | — | Free. |
| `ease.standard` | driver | The homecoming curve. The pointer-leave tween runs on this bezier. | The continuous follow is pure exponential and carries no bezier; the return is the one place a curve is perceivable as a curve. |
| `ease.linear` / `enter` / `exit` / `overshoot` | not consumed | — | Free. The follow is exponential, not a bezier, by design. |
| `delay.short` | driver | The plate stagger step. Blue immediate, green one step behind, red two. | During follow the step is extra smoothing lag (`tau + lag * delay.short`); during the homecoming it is a real per-plate start delay. So the plates disagree in time while moving and resolve in order at rest. |
| `delay.none` / `medium` / `long` | not consumed | — | Free. |
| `scale.expressive` | driver | The amplitude. Max plate travel is `(1 - scale.expressive) * GAIN`. | The "largest departure from rest" slot drives the largest fringe. Replaces the lab's local strength slider. `GAIN` (0.6) is a geometry constant tuned by hand; default lands at the lab's known-good 0.06 travel. |
| `scale.subtle` / `base` / `lift` | not consumed | — | Free. `scale.lift` is above 1, which has no amplitude meaning here. |

## Geometry constants (not tokens)

These shape the effect but are not motion, so they carry no token. Token Fidelity
keeps time-domain tokens on time-domain jobs; the bezier is never reinterpreted as
a spatial falloff.

| Constant | Value | Role |
|---|---|---|
| Plate rate ratios | blue 1, green 2/3, red 1/3 | Spatial misregistration: how far each plate travels along the offset. The misregistered-print reading, zero aberration with the cursor centred. |
| `AMPLITUDE_GAIN` | 0.6 | Maps the scale token's departure from rest into UV-offset space. |
| Cell math | `u_blocks`, `u_gap` | The mosaic grid, driven by the embed-local blocks and gap controls. |

## Embed-local controls (spatial, not motion)

Blocks and gap are spatial grid vocabulary, the Motion Tiles scoping call: one
control vocabulary per tool, the named preset the shared unit. They render in Token
Lab's SliderRow visual language (classes mirrored, not imported, because SliderRow
couples to the active-token highlight and would report a non-token key).

| Control | Range / states | Default | Effect |
|---|---|---|---|
| cells across | 8–240 | 42 | Cells across the mosaic (the `u_blocks` uniform). |
| cell gap | 0–60% | 7% | Fraction of each cell given to the gutter. |
| Plate travel | Smooth / Chunky (single toggle button) | Smooth | Chunky snaps each plate's travel to whole cells (grid-aligned misregistration); Smooth slides sub-cell. |
| Cell gaps | Clean / Bleed (single toggle button) | Clean | Clean carves one screen-space grid after recombine; Bleed lets each plate leave colour in the others' gaps. |

## Load-bearing constraints (carried from the lab)

1. **A theme change writes the palette; it never rebinds the instance.**
   `pixelPlantSM` is interactive and its watered state lives in a data-bound
   property, so any rebind applies the new instance's baked value for that property
   and the machine reads it as a click. One instance stays bound for the
   component's life; a theme switch copies the target theme instance's colors (and
   any theme-varying numbers, e.g. per-theme opacities) into the bound instance,
   the `useHCContrastColors` mechanism generalized to the whole palette across four
   themes. The four authored instances are harvested once at mount as the palette
   source. The interaction-state properties (`waterMeBoole`, `dryTimeBoole`, and
   the rest) default the same in every instance, so the theme-varying test never
   selects them and a switch cannot touch the plant's state. This is read off the
   built runtime, not guessed. The harvest reads the instances without binding
   them and binds exactly one: binding each in turn lets Rive's reference counting
   clean up the kept instance, whose handles then write nowhere (the bug that made
   the first write-the-palette build switch nothing). This replaced two rejected
   fixes (2026-07-20, David's calls): a keyed
   remount (reset the machine) and a pause-bracketed rebind with state replay
   (still fired the click). See `docs/references/rive-for-react.md`, "theming a
   machine that listens."
2. **The pointer overlay is exact.** Rive canvas below at `opacity: 0` (opacity
   keeps hit-testing; visibility or display kills it), shader canvas above with
   `pointer-events: none`, both filling a stage whose aspect comes from
   `rive.bounds`.
3. **The premultiplied recombine and the out-of-range guard** stay byte-identical.
   Each channel keeps its own plate's alpha so a blue fringe ghosts past the
   silhouette without a halo; the out-of-range guard stops CLAMP_TO_EDGE edge
   streaks. The one shader change is `plate(float rate)` becoming `plate(vec2 off)`:
   the per-plate temporal stagger needs each plate to carry its own eased offset,
   which a single shared `u_offset` could not encode, so the rate scaling moved
   into the JS driver.
4. **Per-frame `texImage2D` of `rive.canvas`** is the proven sampling path (the G1
   probe, 2026-07-08, Safari).
5. **Theme coverage is four for four.** `darkMode`, `lightMode`, `contrastLight`,
   `contrastDark`, one baked instance per theme, no runtime color flip.
6. **Reduced motion.** The plates pin to zero (a clean image). The plant stays
   interactive: its motion is pointer-driven, not ambient, so the machine keeps
   playing (David's call, 2026-07-20). Only the shader's mouse-driven offset pins.

## Runtime strings

| Thing | Value |
|---|---|
| File | `public/rive/pixelplant.riv` |
| Artboard | `pixelPlant` |
| State machine | `pixelPlantSM` |
| View model | `PixelPlantVM` |
| Instances | `darkMode`, `lightMode`, `contrastLight`, `contrastDark` |
| Runtime | `@rive-app/react-webgl2` (the only runtime) |

## Related documents

- `docs/decisions/pixelplant-embed-2026-07-20.md`: the session record.
- `docs/briefings/waterwilt-token-vm-map.md`: the React Clock precedent.
- `docs/references/rive-for-react.md`: the Rive-for-React workflow reference.
