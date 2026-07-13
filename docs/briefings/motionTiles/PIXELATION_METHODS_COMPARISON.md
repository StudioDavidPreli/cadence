# Pixelation Methods — Comparison & Running Status

**Date:** 2026-07-09
**Purpose:** Both routes to the pixelated ingredient grid are now built and
confirmed running. This document records how each works and its verified status,
so the choice of where to use each can be planned from one place instead of three
closeouts.
**Sources synthesized:** `G1_PROBE_CLOSEOUT.md`,
`PIXEL_PATHEFFECT_ROLLOUT_CLOSEOUT.md`, `docs/references/WEBGL_PIXELATION_HANDOFF.md`.

---

## At a glance

| | Method A — In-Rive PathEffect | Method B — WebGL post-process |
|---|---|---|
| Where the effect lives | Inside the `.riv` asset | Browser, web deployment only |
| Grid space | Per-shape, world-aligned (tracks transforms) | Screen-aligned, global |
| Per-frame cost | ~257 shapes rasterize on CPU (Luau) | One shader pass, zero per-shape cost |
| Portability | Works in every runtime, editor, share link | Cadence web app only; `.riv` stays un-pixelated elsewhere |
| Color fidelity | Native per-shape color/opacity, kept for free | Screen sample; edges need palette snap to match |
| Runtime status | Confirmed running, full grid, comparable frame rate | Confirmed running, G1 passed on Safari |
| Code gate | `?patheffect` | `?pixelrive` |

Both routes retired the abandoned alternatives: the `pixelMirror2` merged-geometry
rasterization, the 34-artboard restructure, and the State A imperative
`advance → draw → flush` port. Neither of those is needed by either surviving method.

---

## Method A — In-Rive per-shape PathEffect

### How it works

A `Pixelate` `ScriptedPathEffect` (`Pixelate.lua`) attaches as a child of each
shape's **Fill** or **Stroke**, sitting alongside the `SolidColor`. It runs inside
that shape's own render, so the shape keeps its color, opacity, and animation with
no extra wiring. Each effect's `cellSize` and `gap` inputs are data-bound to the
shared view model, so one VM value drives every shape's grid at once.

The look is asset-intrinsic: it ships inside the `.riv` and renders identically in
the Rive editor, in share links, and in any runtime, not only the web app.

### Rollout

Applied across all 36 tiles, ~257 shapes, automated through the Rive MCP. David
hand-built one template tile (`r1c3`), and the MCP cloned that effect onto every
other shape and rebound each clone's `cellSize`/`gap` to the VM. Rolled out in five
passes with a visual and frame-rate check between each. No script recompile at any
point, which avoids the recompile-while-live-rendering crash that drove the whole
approach. Full recipe and the shape-type rules (stroked shapes, cube clip masks,
skipped backgrounds) are in `PIXEL_PATHEFFECT_ROLLOUT_CLOSEOUT.md`.

### The cost

Each shape rasterizes on the CPU every frame. ~257 of them do so at once. Whether
that holds frame rate at full grid animation was the open question the rollout was
structured to answer. It is now answered (see status below).

### Confirmed running status — 2026-07-09

- Full grid exported to `public/riveTiles/ingredients_v6.riv`.
- The `pathEffect` artboard nests all 36 tiles under a `tiles` node and runs
  `compDriver 1`, so it drives the complete ~257-shape grid, not a sample tile.
- Bound to `PathEffectVM`, state machine `pathEffectSM`, with three instances
  (`standard`, `snappy`, `cinematic`) that each bake a palette, speed, easing,
  `cellSize`, and `gapSize`.
- Wired at `?patheffect` (`PathEffectLab` → `PathEffectGrid`) with three preset
  buttons and four live sliders: speed, easing, cell size, gap size.
- **David's check:** runs, and performance is very close to the WebGL version.
  This closes the open frame-rate question from the rollout: the per-shape route
  holds at full load. Its per-frame CPU cost is not the disqualifier it was framed
  as a risk to be.

---

## Method B — WebGL post-process shader

### How it works

Rive renders the finished composited frame to its `<canvas>`. A separate WebGL
context uploads that canvas as a texture every frame via `texImage2D(rive.canvas)`,
and a fragment shader mosaics it:
`texture2D(u_tex, (floor(uv * blocks) + 0.5) / blocks)`. The React VM binding stays
as-is; the shader is a second stage bolted after Rive, not a change to how Rive runs.

Rive's web runtime exposes no hook to inject a shader into its own GL pass, so
"WebGL over Rive" means treating the finished frame as an image source and
pixelating it downstream. The grid is screen-aligned and global: it does not track
each shape's world transform the way the PathEffect does, and edge cells are
antialiased color mixes unless snapped.

Two refinements landed on top of the bare shader:

- **Passthrough fidelity.** With the effect off, the shader canvas sizes its backing
  to `rive.canvas` for a 1:1 copy, `LINEAR` filtered, so raw mode matches the clean
  Rive line. `NEAREST` only when pixelating.
- **Palette snap.** Each block's sampled color quantizes to the nearest of the 8 VM
  colors, read-only from the active instance. This kills antialiased edge blends and
  recovers pure per-shape color, the closest match to the `Pixelate.lua` look.
  Sampled alpha is kept, so transparent regions stay transparent.

### The trade

The effect exists only in the web deployment. The `.riv` stays un-pixelated
everywhere else. Against that, there is zero per-shape cost: one shader pass covers
every shape, color, and artboard on the canvas regardless of shape count.

### Confirmed running status — 2026-07-08

- **G1 passed on Safari**, the strict readback target. A separate `webgl` context
  sampled the live `@rive-app/react-webgl2` canvas cross-context and pixelated it
  correctly. Presets recolor and retime through live; the block-count slider reads
  through live. No blanking, no intermittency. The high-level runtime samples
  reliably, so the `webgl2-advanced` imperative port (State A) is not needed.
- Built behind `?pixelrive` (`IngredientPixelRiveProbe.jsx`), now the standalone
  tuning lab. Two stages render side by side: raw grid left, shader output right.
- `IngredientGrid` gained two optional props, both default off, production path
  unchanged: `onRive` (hands up `rive.canvas` and the palette read) and
  `disableIntersectionObserver` (keeps the grid ticking under the overlaying shader
  canvas).
- Not folded into the Token Lab panel; deliberately gated for the tuning phase.

---

## The trade that decides it

Frame rate was the expected tiebreaker: if the per-shape route dragged, WebGL won by
default. It does not drag. With both routes confirmed at comparable performance, the
choice reopens on the axes that actually differ:

- **Where must the look exist?** Only inside the Cadence web app: either works. The
  `.riv` as a portfolio artifact, a share link, or any embed outside the app: only
  the PathEffect carries the look there.
- **Fidelity.** PathEffect is a per-shape world grid that tracks transforms and keeps
  native opacity exits. WebGL is a screen-aligned grid that needs palette snap to
  approach the same edges and cannot follow a shape's transform.
- **Control surface.** Both expose the same core knobs (cell/gap, or block count).
  WebGL can add deployment-only effects cheaply (dither, scanlines, per-region grids)
  because it is a shader. PathEffect's controls are the VM binding the ingredient
  fork already drives.
- **Integration work remaining.** PathEffect: export is done, point the production
  `IngredientGrid` at `ingredients_v6.riv`, fold the four controls into the Token Lab
  panel. WebGL: fold the shader into the panel, wire the preset buttons and a
  raw/pixelated toggle, retire the `?pixel*` gates. Passthrough backing and palette
  snap are already built.
- **Maintenance.** WebGL adds a second GL context and a shader to keep working across
  browsers. PathEffect adds ~257 live scripted effects to the asset, with the
  recompile-crash caution attached to any future edit of that file.

---

## Where each lives in code

| | Method A — PathEffect | Method B — WebGL |
|---|---|---|
| Gate | `?patheffect` | `?pixelrive` |
| Lab | `IngredientGrid/PathEffectLab.jsx` | `IngredientGrid/IngredientPixelRiveProbe.jsx` |
| Binding | `IngredientGrid/PathEffectGrid.jsx` | `IngredientGrid/index.jsx` (`onRive`, `disableIntersectionObserver`) |
| Presets | `IngredientGrid/pathEffectPresets.js` | `IngredientGrid/presets.js` (+ palette read in the probe) |
| Asset | `public/riveTiles/ingredients_v6.riv` | `public/riveTiles/ingredients_v2.riv` + live sampling |

Related test gates still parked: `?ingredients` (the fork-1 VM binding on v2),
`?pixel` and `?pixeltest` (the disproven low-res route and the SVG-sequence shader
isolation). These retire when a direction is chosen.

---

## Open items for the planning pass

1. **Pick the primary method** on the axes above, or decide both ship (PathEffect for
   the asset-intrinsic look, WebGL as a deployment-only variant with the extra
   shader effects).
2. **Stroked-shape read** on the three "Custom Shape" tiles, still flagged from the
   rollout: the `Pixelate` effect traces cell outlines on a stroke rather than
   filling them. Confirm that reads the way it should now that the tiles sit in
   context.
3. **Promotion pass** for whichever wins: fold the controls into the Token Lab panel
   and retire the test gates. Neither method is in the panel yet; both are gated
   labs.
