# Pixel Mirror — Automation Handoff & Findings

## Purpose

We have a working PathEffect (`Pixelate.lua`) that re-renders a vector shape as
an After-Effects-style pixel mosaic, live, preserving the shape's data-bound
animation and its own fill color. The goal was to apply that effect across **36
artboards, some with up to 22 shapes**, *without* hand-attaching it to every
shape. This document records why straightforward automation is not possible in
Rive's current scripting surface, every workaround we tried and its outcome, and
the architecture we landed on (`PixelMirror2.lua`). Read the "Constraints" and
"Probe trail" sections before attempting a different approach — most obvious
routes are already ruled out here with evidence.

Everything below was verified in the live editor (the assistant cannot open Rive;
each result came back from a console run), or read from the generated type
surface `rive-globals.d.luau`. Treat the API facts as load-bearing.

---

## Starting point: the per-shape effect works, but doesn't scale

`Pixelate.lua` is a scripted **PathEffect**. Attached to a shape, its
`update(self, pathData, node)` receives the shape's live geometry plus
`node.worldTransform`, rasterizes the post-transform silhouette on a world grid
(nonzero winding), and emits clockwise cells. It preserves the animation (it runs
downstream of the converter graph) and the color (the shape's own fill paints the
cells). It was confirmed working per shape.

The only problem is application: the effect must be attached to each shape by
hand. With hundreds of shapes across 36 artboards, that is the entire difficulty.

---

## Constraints — why editor-level automation is unavailable

These were each confirmed, not assumed.

**C1 — Effects apply to one object at a time.** Selecting multiple shapes and
adding the effect is blocked by the editor: *"select a single object to add
another effect."* No multi-select apply.

**C2 — Effects can't be copied/pasted between shapes.** Confirmed in-editor.

**C3 — Shapes can't be merged to reduce the count.** Merging paths into one Shape
would dissolve the individual shape objects the converters are bound to, breaking
every per-piece binding — the exact rewiring the effort exists to avoid. (A
*Group* is a safe, non-destructive container, but a Group has no path and no
color of its own, so it can't carry the effect or a fill.)

**C4 — No author-time / macro API.** There is no scripting surface that reaches
into the editor to attach effects programmatically, and the `.riv`/editor files
are not safe to edit externally.

**C5 — Scripts cannot traverse the hierarchy by name.** `artboard:node(name)`
returned **nil for every name we tried** — individual shapes (`petal_se`,
`petal_sw`), color groups (`green`, `blue`), nested *and* top-level — on the
referenced `Input<Artboard>` **and** on an `:instance()` of it. There is no
`artboard.children` or root accessor. So there is no way to walk the tree and
pull shapes individually. The artboard exposes only `width`, `height`, `bounds`,
`node`, `addToPath`, `instance`, `advance`, `draw`, and pointer methods.

The combined effect of C1–C5: there is no path that keeps the per-shape effect
*and* automates its application. Automation had to come from a different
architecture entirely — extract and re-draw, rather than attach.

---

## Probe trail — what we tried, in order, and what each established

Each row is a diagnostic script that was run in the editor to answer one
question. This is the evidence trail; it's here so the dead ends aren't re-walked.

| Probe | Question | Result |
|---|---|---|
| `TreeProbe`, `TreeProbe2`, `TreeProbe3` | Can a script walk the artboard tree by name? | **No.** `node()` returns nil for all names, incl. top-level. Artboard identity confirmed (120×120, correct bounds), so it's not a wrong-target issue. |
| `MirrorGate` | Does `node()` resolve on an *instance* (vs the template)? | **No.** Still nil on an instance. |
| `MirrorPath` | Does `addToPath` extract geometry from an instance? | **Yes** (cmds=18) — but the instance is **frozen** at rest pose. |
| `MirrorPath2` | Does instancing bound to the live view model animate it? | **No.** The referenced artboard's live VM read back blank (`progress = 0`); sharing it gives nothing to animate from. |
| `MirrorPath3` | Does driving a *private VM copy's* `progress` animate the instance? | **Yes.** bbox tracked the written value deterministically (0.50→wide, 1.00→narrow, back to 0.50→identical). This is the key unlock. |
| `VisTest` | Does hiding a group (visibility **or** opacity) remove its geometry from `addToPath`? | **No.** cmds unchanged (22/22) either way. `addToPath` is geometry-only and ignores visibility. |
| `PosTest` | Does displacing a group's x remove it from the frame in `addToPath`? | **Yes.** Setting a bound x flung the bbox to ±thousands, out of the 0–120 frame. Position is the usable isolation lever. |

---

## The mechanism that worked

From the probe results, a viable pipeline emerged that avoids `node()` entirely:

1. **Extract, don't traverse.** `addToPath(path)` returns the whole artboard's
   geometry in one call, no names needed. All transforms are already baked in, so
   the extracted geometry is world-space — rasterize it directly, no
   inverse-transform, and rotation/scale stay axis-aligned for free.

2. **Drive a private instance.** A referenced artboard is a *template*;
   `:instance(vm)` makes a live copy. Passing a private `ViewModel` copy
   (`context:viewModel():instance()`) and writing `vm:getNumber('progress').value`
   each frame, then `instance:advance(dt)`, animates the copy deterministically.
   The mirror therefore **self-drives**; bind its `progress` input to the same
   live view-model value the original uses and it tracks the real loop.

3. **Isolate color by position, not visibility.** Since visibility/opacity don't
   affect `addToPath` but position does, each color is separated by shoving the
   *other* color groups far off-canvas via a bound x, then rasterizing with the
   grid **clamped to the artboard frame** so the displaced color falls outside the
   scan and contributes nothing.

4. **Displacement must be additive.** Binding a group's x *directly* to the push
   variable overwrites the group's animated x — you lose that axis of motion
   ("half the animation"). The push must go through a **Sum converter**:
   `finalX = animatedX + pushVar`. With `pushVar = 0` the animation is intact and
   in frame; with `pushVar = offVal` it's shifted off-canvas but still animating.

---

## Final solution — `PixelMirror2.lua`

One script per artboard (36 total, not hundreds of attachments). It keeps one
instance **per color**. In each instance the other color's group is displaced
off-canvas via its additive x-offset, so that instance's `addToPath` has only its
own color in frame; each pass is rasterized (frame-clamped) and painted in its own
color, in draw order. Both instances read the same `progress`, so they animate in
lockstep with each other and with the original.

### Per-artboard setup checklist

1. Add `PixelMirror2` as a Node/Drawable to the composition; assign the art
   artboard to `target`.
2. Bind the mirror's `progress` input to the live view-model number the driver
   writes 0→1 (`driverProp`, default `"progress"`).
3. Give each color group a **dedicated** push variable, and bind that group's x
   through a **Sum converter** (`animatedX + pushVar`). Put green's push property
   name in `aXProp`, blue's in `bXProp`. **Each group must reference its own push
   variable** — a green/blue mix-up here collapses everything to one color (see
   Gotchas).
4. Hide the original art (its group opacity to 0) so only the mosaic shows.
5. Set `aColor` / `bColor` (editor swatches; bind each to the artboard's own theme
   color to track it live), plus `cellSize` and `gap`. `offVal` is the
   displacement magnitude; the default is deliberately large.

### Gotchas

- **Only one color shows, animation/position correct** → both groups' Sum
  converters are reading the *same* push variable. Point each group's converter at
  its own variable. (This exact bug bit us: `bXProp`'s converter referenced
  `aXProp`.)
- **Half the animation missing** → a group's x is bound *directly* to the push
  variable instead of through an additive Sum converter. Fix per step 3.
- **Displaced color bleeds back into frame during part of the loop** → `offVal`
  too small for that phase's x-range. Raise it. Note the hierarchy scales the
  offset (we saw 10000 → ~1700 effective), so use a large value for headroom.
- **Draw order = input order.** Color A is painted first, B on top. Swap the
  A/B assignments to change stacking.
- **`Input<Color>` reliability.** Reading `Input<Color>` directly in-script has
  been flagged as occasionally unreliable (comes through black / ignores a bound
  value). It matches a pattern already working elsewhere in the suite
  (`parallax_components_color.lua`), so we use it — but if a color comes through
  wrong, the fix is to add a color-property-name input and read it via
  `context:viewModel():getColor(name).value`.
- **More than two colors.** Each additional color is the same triple —
  `xProp` + `color` + a draw slot — plus one more instance driven the same way in
  `advance`. The pattern is mechanical; widen the script per color count.

---

## Confirmed API facts (reference)

Load-bearing behavior established during this work:

| Fact | Detail |
|---|---|
| PathEffect entry | `update(self, pathData: PathData, node: NodeReadData): PathData`; `node.worldTransform` is a `Mat2D`; `Mat2D:invert()` exists. |
| Path commands | `PathData`/`Path` iterate via index (`#p`, `p[i]`); each `cmd.type` ∈ moveTo/lineTo/quadTo/cubicTo/close; points are `cmd[1..3]` Vectors. Use index loops, **not** `ipairs`, or the type checker yields `unknown`. |
| Winding | Renderer fills **clockwise** contours only (y-down). CCW renders invisible. **No fill-rule control** in scripting — do coverage yourself and emit CW cells. |
| Whole-artboard geometry | `artboard:addToPath(path, transform?)` — geometry only, ignores visibility/opacity, respects position. |
| Node lookup | `artboard:node(name)` returns nil in this project for all names, on template and instance alike. No children/root enumeration. |
| Instancing | `artboard:instance(viewModel?)` → live copy; `advance(dt)` steps it; a blank-VM instance is frozen at rest. |
| View models | `context:viewModel()` (may read blank on a referenced artboard); `ViewModel:instance()` makes an independent copy; `vm:getNumber(name).value` read/write; `vm:getBoolean`, `vm:getColor(name).value`. |
| Color | `Color` is a number; `Color.rgb(r,g,b)` / `Color.rgba(r,g,b,a)`, channels 0–255; raw `0xAARRGGBB` literals are valid. |
| Draw | `renderer:drawPath(path, paint)`; `Paint.with({ color = ..., style = "fill" })`. |

---

## Status & open items

- **Working:** two-color pixel mirror, per artboard, color-accurate, bindings
  untouched, driven by `progress`. Proven end to end in-editor on one piece.
- **Rollout:** the same three bindings per artboard (`progress` + two group-x
  sums) plus the two color swatches; repeat across the remaining pieces.
- **Not solved / not possible here:** keeping the original per-shape effect while
  automating its attachment (blocked by C1–C5); reading the original's live
  progress off a referenced artboard (VM reads blank — the mirror self-drives via
  its bound `progress` input instead); isolating color without displacement
  (visibility is ignored by `addToPath`).
- **Worth asking Rive directly:** whether nodes can be marked script-addressable /
  enumerable. If `node()`-by-name or child enumeration ever works, a simpler
  read-in-place traversal (no instancing, no displacement) becomes possible and
  much of this scaffolding could retire.

---

## File map

| File | Role |
|---|---|
| `Pixelate.lua` | Per-shape PathEffect. Works; doesn't scale (manual attach). Keep for one-off or hand-applied color-critical cases. |
| `PixelMirror2.lua` | **Current deliverable.** Per-artboard two-color mirror. |
| `TreeProbe*`, `MirrorGate`, `MirrorPath*`, `VisTest`, `PosTest` | Diagnostic probes. Not for production; retained as the evidence trail. |
