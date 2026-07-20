# pixelPlant ships as Rive Clock, the second Embeds demo (2026-07-20)

The session record for folding the pixelPlant shader lab into Token Lab as the
second canvas demo, wired to the live motion tokens. Written as a case-study
source. The token contract is `docs/briefings/pixelplant-token-map.md`; this file
is the narrative of what the lab was, what it lacked, and what each decision did.

## Where it started

`?pixelplant` mounted a working experiment: an interactive Rive state machine
rendered at `opacity: 0`, a WebGL shader stacked on top displaying a pixelated
copy of it, the pointer falling through the pixels to the machine underneath. On
top of the mosaic ran mouse-driven chromatic aberration: three colour plates
translating toward the cursor.

The experiment worked. What it lacked was the reason to exist inside Token Lab.
Its motion was self-contained. The follow was a hardcoded `0.12` per-frame lerp, a
magic number that was also frame-rate dependent. The aberration strength was a
local slider. No token reached the shader. It was a shader demo sitting next to a
token system, touching none of it.

## The name

Rive Clock, David's call, not open for redesign. The Embeds category names demos by
who holds time. React Clock (Water & Wilt) has React's rAF loop holding time and
Rive holding poses. This one inverts: Rive's own state machine holds the motion and
React paints a shader over it. Two words each, exactly parallel the way Button and
Toggle are. The shader half is real content but it is not the ownership fact, so it
lives in the caption: "Rive owns the motion; a React WebGL shader paints over it."

## The token mapping

Each motion family got one legible job. The slots were David's call.

- **`duration.base` is the follow clock.** Each plate chases the cursor by
  exponential smoothing, `k = 1 - e^(-dt/tau)`, `tau` from the token. The `e^(-dt/tau)`
  form closes the same fraction of the remaining gap per unit of real time whatever
  the frame rate, so the magic `0.12` lerp is gone and with it the frame-rate
  dependence.
- **`duration.slow` is the homecoming length.** David split the follow and the
  return onto two slots so tracking-tightness and resolve-length tune apart. When
  the pointer leaves the stage the plates stop following and run a finite tween back
  to zero over this duration.
- **`ease.standard` is the homecoming curve.** The continuous follow is pure
  exponential and carries no bezier. The return is a real tween on the token's
  curve, so the curve is perceivable as a curve, the one place in the effect where
  a bezier reads as a bezier.
- **`delay.short` is the plate stagger.** Blue tracks immediately, green one step
  behind, red two. While moving the plates disagree in time and the fringe blooms;
  the pointer leaving lets them resolve in the same order. During follow the step is
  extra smoothing lag; during the homecoming it is a real per-plate start delay, so
  the token means the same thing in both phases.
- **`scale.expressive` is the amplitude.** Max plate travel is `(1 - the token) * GAIN`.
  The largest-departure-from-rest slot drives the largest fringe. The local strength
  slider left the panel.

Two boundaries held. Blocks and gap are spatial grid vocabulary, not motion, so they
stayed embed-local controls, the same scoping call recorded for Motion Tiles. The
plate rate ratios (blue 1, green 2/3, red 1/3) and the cell math stayed geometry
constants: the misregistered-print reading, not timing. The easing bezier is never
reinterpreted as a spatial falloff. Time-domain tokens keep time-domain jobs.

## What the split duration cost the shader

The temporal stagger is the reason the shader changed. The lab passed one offset
vector and scaled it by a per-plate rate inside the fragment shader. A single vector
holds one time state, and the stagger needs three, one per plate. So the driver now
computes three per-plate offsets in JS (each plate's rate and its own lag), and the
shader's `plate()` reads a `vec2 off` instead of a `float rate`. The rate scaling
moved out of the shader and into the driver. Everything else in the shader is
byte-identical to the lab: the premultiplied recombine that lets a blue fringe
ghost past the silhouette without a halo, and the out-of-range guard that stops
CLAMP_TO_EDGE from streaking a vacated edge.

## Reduced motion

The plates pin to zero, a clean image. The plant itself stays interactive. Its
motion is pointer-driven, not ambient: the machine only moves when the user hovers
or presses, which is a choice the user made, not motion played at them. David's call
was to keep it live there and pin only the shader's mouse-driven offset, which the
token layer does not know about and cannot flatten. This diverges from the app's
"demonstration Rive starts paused" line, and the divergence is deliberate: that line
governs ambient loops, and this machine has none. A poster asset for pixelPlant does
not exist, so the paused-poster route was never on the table this session.

## Theme switching without a reset

The lab bound the theme by keying the Rive half on the instance name, so a theme
switch remounted the whole runtime, which reset the state machine and threw away
the plant's interaction pose. David asked for the switch to stop resetting the
machine.

Getting there took three tries and turned into the session's real lesson.
`pixelPlantSM` is an interactive click-to-water plant, and its watered state lives
in a data-bound property. That is the thing that makes theming hard, and it is the
one `rive-for-react.md` already names under "Theme switch after growth erases the
plant": each named instance carries its own values, so binding a fresh instance
applies that instance's baked value for every property, the state property
included. To the machine, that write is byte-identical to what a real click
writes. The click listener is not ignored; the rebind is indistinguishable from a
click.

The keyed remount dodged the rebind by rebuilding the runtime, and reset the
machine doing it. The second attempt kept the rebind but paused around it and
replayed the state booleans read off the old instance; it still fired, because
naming the exact property the machine transitions on is a guess, and a trigger
fires on a rebind whatever value you write. The fix that holds does not rebind at
all. One instance stays bound for the component's life, and a theme switch writes
the target theme's colors into it, the `useHCContrastColors` mechanism the project
already uses for HC-dark, generalized from two flip colors to the full palette
across four themes. The four authored instances are harvested once at mount as the
palette source. A property is written on a switch only if its baked value differs
across the four themes: the colors and the per-theme opacities (`fillOpacity`,
`strokeOpacity`) do, the interaction-state properties do not, so the state can
never be clobbered without the code naming it. The data context never changes, so
no click can fire and the pose persists for free.

The structure was read straight off the built runtime, not guessed: `PixelPlantVM`
carries twenty-one top-level color properties, five numbers, and four booleans,
and the four state properties (`waterMeBoole`, `dryTimeBoole`, `clicked2`, `grow`)
are identical in every theme instance, which is what makes the theme-varying test
a safe filter. The first write-the-palette build still showed nothing switching,
and the runtime said why: harvesting by binding each instance in turn let Rive's
reference counting clean up the instance being kept, so its `.color()` handles came
back null and every write landed nowhere. Reading the instances without binding,
and binding exactly one, fixed it. Verified on built output: writing a theme's
colors turned the plant that theme, the state booleans held across every switch,
and the console stayed clean. The interactive-machine case and the harvest gotcha
are recorded in `rive-for-react.md`.

## The controls that shipped

Cells across (renamed from the lab's "blocks") and cell gap survived as sliders,
the two style switches as single toggle buttons. Strength left (it became the
scale token), pixelate left (it is always on, the demo's identity, so the A/B
toggle had no shipping role), and the reveal-the-raw-Rive debug toggle left. The
two surviving booleans became single toggle buttons rather than checkboxes
(David's call): one button whose label is the current state and switches on click,
plate travel between Smooth and Chunky, cell gaps between Clean and Bleed, because
each is a choice between two aesthetics, not an on/off. Initial settings are 42
cells across and a 7% gap.

The sliders render in Token Lab's SliderRow visual language and the toggle buttons
in its button language (bordered, surface fill, text-primary, never text on the
accent fill, so the 4.5:1 text bar holds in all four themes). The classes are
mirrored into the embed's own CSS module rather than the Token Lab components
imported, because SliderRow calls `setActiveToken` and couples to the token-highlight
map; a spatial control firing that would report a key the map has no row for. Same
look, no wrong behaviour.

## Verification

Unit suites green (141), including the token-integrity gate (no inline animation
literal in the promoted component) and the snippet drift guard (every token the code
view names resolves). The e2e deploy gate green (51) on built output. The
token-propagation thesis tests operate on the token rail and the code view, not per
demo, so they already cover the embed's propagation without extension; the snippet
guard and the integrity gate cover Rive Clock specifically. `TOKEN_COMPONENT_MAP`
gained five rows, one per token the driver reads, matching the driver exactly. The
map was rebuilt once before because it drifted, so the rows were checked against the
reads, not guessed.

The driver math (the exponential follow, the homecoming tween) was left inline in
the component, matching React Clock's precedent, rather than extracted to a pure
tested module. It reads live tokens through a ref and evaluates per frame; the pure
part is small and the visual verification is David's, at the tool.

## What is David's to tune

The final feel. The duration-to-lag mapping, the `AMPLITUDE_GAIN` constant, and the
stagger multiples are hand-tuned against the live tool, by David, with the plant
under his cursor.
