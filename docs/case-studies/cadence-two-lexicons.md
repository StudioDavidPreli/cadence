# Cadence: Two Lexicons

**One system. Two dialects.**

The engineering companion to the [Cadence case study](hosted/index.md), organized as a translation table: each section takes one concept, states it in the motion designer's vocabulary and the design engineer's, and walks the machinery Cadence built to hold the two together. Facts and measurements are the main case study's; this paper rearranges them by concept.

---

## 00. Why a lexicon

Two people watch the same button compress. One sees a five-frame press with a two-frame settle; the other sees 200 milliseconds on an ease-out. Same event, no shared sentence.

Most of the friction attributed to design-engineering handoff is translation loss between these vocabularies. Cadence was built as a translation surface, and its token layer is the dictionary: every value has a name both dialects can use, and both tools of the trade (the timing chart and the stylesheet) resolve to the same entry. The sections below walk the shared concepts one pair at a time, with the engineering underneath each.

## 01. Timing: frames become milliseconds

| Motion design | Design engineering |
|---|---|
| Five frames at 24fps | `--motion-duration-base: 200ms` |
| "Tighten it two frames" | Edit one token; every consumer retimes |

A frame at 24fps is about 42 milliseconds, so `duration.base` at 200ms is a five-frame gesture and `duration.fast` at 100ms is two and a half. The family runs fast 100, base 200, slow 400, slower 600.

The engineering question is not the values but the plumbing. Tokens live as CSS custom properties, and components read them at runtime through `getComputedStyle`, which returns strings in whatever format a build tool wrote. That seam bit once in production: the CSS minifier rewrote `400ms` as `.4s`, a parser assumed the authored spelling, returned `NaN`, and every Modal blanked the deployed site while the dev server showed nothing wrong. The parsers now live in a tested module (28 tests) and accept any legal format.

Live editing needs a second path: a custom-property write is invisible to React, so nothing would retime until something else forced a render. Token Lab dispatches each change twice from one reducer: a write to the custom property for anything reading the document, and a React context override that hands demo components the same values with no read at all. Both channels are fed from the same reducer, so they cannot disagree.

## 02. The graph editor: curves become coordinates

| Motion design | Design engineering |
|---|---|
| Speed-graph handles, dragged by eye | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| "Ease it in harder" | Move a control point; the four numbers follow |

After Effects gives easing a graph editor; CSS gives it four numbers, the coordinates of two control points (x pinned inside the unit square, y free to leave it). Cadence's bezier visualizer is the graph editor rebuilt on the CSS primitive: draggable handles whose positions serialize directly to the token value, so the designer's gesture and the engineer's syntax are one artifact.

The named slots do the organizational work: `ease.enter`, `ease.exit`, and `ease.standard` are editable; `ease.overshoot` surfaces its control only where the interface has vertical room for a handle above 1; `ease.linear` has no control at all, because the constant-velocity baseline every curve is measured against should not be movable.

## 03. Follow-through: keyframes become physics

| Motion design | Design engineering |
|---|---|
| Overshoot animated by hand, pose by pose | `{ type: 'spring', stiffness, damping, mass }` |
| Settle time set on the timeline | Settle time falls out of the parameters |

For three months the token set carried a curve named `spring`: a cubic-bezier whose control point climbs past 1 and returns, the look of a spring on a fixed timeline. A true spring has no timeline. You give it stiffness, damping, and mass, and the duration is a consequence, not an input. The curve was renamed `overshoot`, and the freed name went to a real spring family: three unitless custom properties, read at runtime like every other token, consumed as a native spring config.

The math underneath is the damped harmonic oscillator, kept in a pure module so the three regimes (a ring, a clean arrival, a crawl) can be tested without a browser. The settle-curve chart in Token Lab plots displacement over time and redraws as the sliders move, which is the closest the engineering dialect comes to a graph editor for physics.

One translation gap surfaced and closed: reduced-motion support flattens durations to near zero, and a spring has no duration to flatten, so the preference slid past it until the flattened token set grew a flag the spring consumers read.

## 04. The hold: beats become delays

| Motion design | Design engineering |
|---|---|
| A two-frame hold before the move | `delay.short` |
| Staggered entrances, offset by feel | Delay arithmetic per index |

The quietest family, and the one with a named zero: `delay.none` exists so that "no delay" is a stated decision rather than an absence. The Hierarchy of Motion demonstration is the family at work, a parent element whose children answer in sequence on `short`, `medium`, and `long`; the cascade is the org chart made visible. In the shader demonstration the same idea runs per plate: three color layers chase the cursor, each one `delay.short` behind the last.

## 05. Squash and stretch: deformation becomes scale

| Motion design | Design engineering |
|---|---|
| Squash on contact, stretch on release | `scale.pressBase` down, `ease.overshoot` back |
| Weight, drawn | Weight, computed |

In drawn animation, deformation carries weight. In an interface the same job falls to a scale transform of a few percent, and the character splits across two families: the scale token sets how far the press compresses, and the easing sets how the release returns, `ease.standard` down and `ease.overshoot` back past rest. The family was renamed in July (`pressSubtle`, `pressBase`, `pressExpressive`, `lift`) so that direction lives in the key and no name implies a neutral the family does not have. Naming turned out to be an engineering act with a designer's failure mode: a key that reads wrong ships wrong.

## 06. The spec: handoff becomes export

| Motion design | Design engineering |
|---|---|
| A video and a timing chart, sent across a wall | Four export formats off one normalized object |
| "Match this" | A file the pipeline consumes directly |

The traditional deliverable is a rendering of the intent; the receiving engineer re-derives the values by inspection. Cadence exports the values themselves, four ways: the W3C Design Tokens Community Group format (DTCG, the shape Style Dictionary and Figma Variables consume), flat JSON, a drop-in CSS `:root` block, and a ready-to-use Framer Motion module with the spring as a native config. All four serialize from one normalized object so they cannot drift.

The spring posed the one format question, because the DTCG draft has no spring type. It ships as three `number` leaves under a `motion.spring` group: valid DTCG today, no invented type, the group name carrying the composition. Import runs the pipeline in reverse with validation, and the validation has manners: out-of-range scalars clamp and report, missing tokens fill from Standard and report, but a spring parameter at zero or below fails the import outright, because a spring that never settles should not be bent into something that merely looks valid.

## 07. Personality: direction becomes preset

| Motion design | Design engineering |
|---|---|
| "Make it snappier" | Load `Snappy`; every family updates |
| A feel, held in one person's head | A named binding, held in the system |

"Snappier" is legitimate direction and unexecutable spec. A preset makes it executable: Snappy, Standard, and Cinematic each bind values across every family at once, spring included, so a preset swap changes even the physics. The same three names appear in Motion Tiles speaking a different dialect, period and envelope and spread instead of duration and curve, because an ambient field and a button press interpret the same personality in different terms. The names are what the system shares; the interpretation is scoped per motion class.

This is the project's thesis in miniature: motion values that cannot be named cannot be systematized.

## 08. The render: timelines become frame loops

| Motion design | Design engineering |
|---|---|
| The comp owns time; export renders it | `requestAnimationFrame`; the browser hands you each frame |
| One timeline, one output | One clock, fifty canvases |

Motion Tiles began with each tile carrying its own driver script inside the asset, and the frame rate sat near 40fps at 36 tiles. Measurement, not instinct, found the cost: 36 instances of the densest tile with no drivers held 60fps, so the per-instance script execution was the expense, not the instance count. The shipped design inverts control. Assets carry geometry and bindings only; one React `requestAnimationFrame` loop computes every tile's phase-offset progress and writes it into each tile's view model every frame. The stagger, applied in JS before the write, turned out to smooth load as a side effect: offset tiles reach their expensive frames at different times.

The same inversion appears at single-component scale. The plant demonstration's Rive file holds poses, every animation a linear timeline scrubbed from 0 to 1, and a React driver integrates the live tokens into eased progress each frame. No duration or easing exists inside the file, so a slider drag mid-animation bends the motion on the next frame.

## Where the lexicons do not map

- **Neither dialect has the other's missing word.** A bezier cannot say weight; a spring cannot say duration. Cadence carries both token families rather than forcing one vocabulary through the other's grammar.
- **Feel has no unit.** Preset values were set by eye against live components, and the sign-off on how motion reads stayed human. The system distributes a judgment; it does not produce one.
- **The tool's own interface deliberately does not speak the editable lexicon.** Chrome timing reads fixed constants so that a demonstration value dragged to an extreme cannot disable the interface demonstrating it. A translation surface needs one part of the room to stay still.
- **Frames quantize and milliseconds do not.** A designer thinking in frames will produce values the token ladder does not contain. The constrained ranges teach the ladder; the Explore ranges admit the values a timing chart actually holds.

Two people watch the same button compress. There is still only one button; now there is one sentence for it too.
