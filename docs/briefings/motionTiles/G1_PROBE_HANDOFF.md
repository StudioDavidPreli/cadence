# G1 Probe — Sampling the Live Rive Canvas for WebGL Pixelation

> **CONSUMED 2026-07-08. G1 PASSED** (Safari, high-level runtime samples
> reliably; State A not needed). Outcome and the tuning-lab follow-up are in
> `G1_PROBE_CLOSEOUT.md`. This handoff is kept as the record of the question.

**Date:** 2026-07-08
**Audience:** a fresh Claude Code session (no memory of the session that wrote this)
**One question to answer:** can the live `@rive-app/react-webgl2` Rive canvas be
sampled cross-context (uploaded as a WebGL texture every frame) so a proven
pixelation shader can post-process it, or does it read blank (the
`preserveDrawingBuffer` readback wall, especially on Safari)?

The answer picks the build path for the ingredient-grid pixel effect. Nothing
else in this task is uncertain: the shader is already proven, the Rive binding
already works. This probe is the single remaining gate.

---

## Why this matters (short)

The Token Lab landing page has a 36-tile ingredient grid (Rive). It needs an
After-Effects-style pixel-mosaic look. Two ways to get it:

- **In Rive** (`pixelMirror2` per artboard + restructuring 34 tiles into color
  groups): expensive per frame (~72 Luau rasterizations/frame) and heavy to
  author. Parked.
- **Browser-side WebGL post-process**: pixelate the whole composited Rive frame
  with a fragment shader. Zero per-frame Luau, no restructuring, and it retires
  the whole in-Rive rollout. This is the leading approach.

Full rationale, routes, and the empirical results from the prior session:
`docs/references/WEBGL_PIXELATION_HANDOFF.md`. Read its "Empirical update" section
first.

The shader is proven on a static SVG and on an animated SVG frame sequence
(per-frame `texImage2D`, ping-pong). The ONLY untested link is sampling a live
Rive canvas. That is G1.

---

## What is already built (reuse it, do not rebuild)

All under `src/components/IngredientGrid/`, gated behind query params in
`src/App.jsx` (temporary test mounts, they do not disturb the main Token Lab):

- **`index.jsx` (`IngredientGrid`)** binds the parametric grid via
  `@rive-app/react-webgl2`. Artboard `Parametric`, state machine `parametricSM`,
  view model `IngredientVM`, file `public/riveTiles/ingredients_v2.riv`. The
  underlying canvas is `rive.canvas` after load. (It also has a parked
  `backingSize` prop from the failed Route 1 attempt; ignore it.)
- **`PixelateShaderTest.jsx` (route `?pixeltest`)** is the WORKING shader
  pipeline: vertex + fragment shader, full-screen quad, per-frame `texImage2D` of
  an SVG frame sequence, ping-pong rAF loop, `blocks`/`fps`/`pixelate` controls.
  This is the exact machinery to copy. Only the texture SOURCE changes: SVG
  `Image` becomes `rive.canvas`.
- **`IngredientLab.jsx` (route `?ingredients`)** is the working control panel
  (preset buttons, speed/easing sliders) writing into the VM. Reuse for controls
  once the probe passes.

Routes in `src/App.jsx`: `?ingredients` (VM binding), `?pixel` (Route 1, renders
black, parked), `?pixeltest` (shader on sequence, works).

---

## The probe (concrete steps)

1. Add a new gated component and route (for example `?pixelrive`) in
   `src/App.jsx`, next to the others. Do not touch the working routes.
2. In it, render `IngredientGrid` so the Rive grid animates, AND a second WebGL
   display canvas running the proven shader from `PixelateShaderTest.jsx`.
3. Get the Rive canvas: `rive.canvas`. Expose `rive` from `IngredientGrid` via a
   new optional `onRive` callback prop (simplest), or duplicate the `useRive`
   binding inside the probe component.
4. In a rAF loop:
   `gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, riveCanvas)`
   then draw the quad with the pixelate shader.
5. Observe: does the pixelated output show the live animating grid, or is it
   blank / black?

**Critical:** the Rive canvas must stay visible and rendering. The high-level
runtime pauses when the canvas is off-screen (IntersectionObserver). Either keep
it on-screen (overlay the shader canvas above it, or place them side by side), or
pass `shouldUseIntersectionObserver: false` to `useRive`.

---

## Reading the result (decision tree)

- **Reads reliably (shows the live grid, pixelated):** best case. Build the pixel
  post-process on the high-level runtime as-is. Minimal rework. Then wire the
  preset buttons and a raw/pixelated toggle (controls already exist in
  `IngredientLab`).
- **Blanks / black (readback wall):** confirms the webgl2 drawing buffer is
  cleared before we sample. Move to **State A: `@rive-app/webgl2-advanced`**, the
  low-level runtime. Drive the render loop yourself (`advance -> draw -> flush`),
  sample immediately after flush (before compositing clears it), run the shader.
  This keeps the Luau driver. Cost: reimplement the ingredient VM binding through
  the imperative JS API instead of the React hooks. Details in the WEBGL doc,
  "State A".
- **Intermittent (works sometimes):** treat as blank. Timing is not guaranteed
  with the high-level runtime; go State A.

Record which read behavior you observed and on which browser, in the WEBGL doc
and in `tracker/TRACKER.md` (Token Lab Ingredient System section).

---

## Hard constraints (do not violate)

- **The driver is a Luau script that runs only on webgl2.** `compDriver` writes
  `progress` each frame; Luau execution needs the webgl2 renderer. So you cannot
  switch to the 2D `@rive-app/canvas` renderer to make sampling easier without
  ALSO porting the driver to a JS rAF clock (State B; the React-clock plan in
  `docs/briefings/TOKEN_LAB_PHASE2.md` §1/§5). Do not silently drop to
  react-canvas; the grid would freeze.
- **Token-integrity gate.** No hardcoded animation values in `components/` or
  `principles/`; the gate at `src/tokens/tokenIntegrity.test.js` fails the build
  on inline duration/ease literals. The probe uses no framer-motion, so it is
  clear; keep it that way. Run `npx vitest run src/tokens/tokenIntegrity.test.js`
  after edits.
- **Keep everything behind a query gate.** Do not disturb the main Token Lab, or
  the working `?ingredients` / `?pixeltest` labs.
- **No new animation libraries.**

---

## Environment notes

- **David runs the dev server himself** (`npm run dev`). Servers a Claude session
  starts are sandboxed and unreachable from his browser. Ask him to run it and
  report what he sees.
- **Visual checks are David's.** Do not drive a browser to verify UI.
- **New files or new imports need a Vite RESTART** (HMR misses them). Pure edits
  to existing files need only a reload. Tell David which applies.
- **He is on Safari.** Safari's strict WebGL readback behavior is exactly what
  this probe is testing, so his browser is the correct test target.

---

## Reference: the shader (copy from `PixelateShaderTest.jsx`)

- **Vertex:** full-screen quad; `uv = pos*0.5 + 0.5` with Y flipped for
  image/canvas top-left origin.
- **Fragment:** `uv = (floor(uv*u_blocks)+0.5)/u_blocks; gl_FragColor =
  texture2D(u_tex, uv);` gated on a `u_pixelate` uniform (1 = pixelate, 0 =
  passthrough).
- **Texture params:** `CLAMP_TO_EDGE` + `NEAREST` (non-power-of-two safe).
- **Bonus once it works (from the WEBGL doc):** palette-snap edge cells to the VM
  colors to kill antialiased blends and recover pure per-shape colors (closest to
  the `Pixelate.lua` look). Colors are the 7 shape-color + 1 bg VM properties.

---

## The VM contract (for wiring controls after the probe passes)

One `IngredientVM`: numbers `progress`, `speed`, `easing`; 8 color properties
(`bg` + 7 shape colors: `darkBlue`, `green`, `lightBlue`, `magenta`, `orange`,
`red`, `yellow`). Three instances are the presets, each baking its own palette:
speed/easing standard 1.0/1.70, snappy 1.25/3.6, cinematic 0.8/1.15. Preset
switch = swap the bound instance. Full contract:
`docs/briefings/TOKEN_LAB_INGREDIENTS.md` §6.

---

## File inventory

- `src/components/IngredientGrid/` — `index.jsx`, `IngredientLab.jsx`,
  `IngredientPixelLab.jsx`, `PixelateShaderTest.jsx`, `presets.js`,
  `IngredientGrid.module.css`
- `src/App.jsx` — query-param gates
- `public/riveTiles/ingredients_v2.riv` (the grid), `standard.svg` (static test),
  `testSequence/30.svg`..`60.svg` (sequence test)
- `docs/references/WEBGL_PIXELATION_HANDOFF.md` — routes, gotchas, empirical
  update, State A/B
- `docs/briefings/PIXEL_MIRROR_AUTOMATION_HANDOFF.md` — the in-Rive approach and
  why editor automation is ruled out
- `docs/briefings/TOKEN_LAB_INGREDIENTS.md` §6 — the React binding contract
- `tracker/TRACKER.md` — "Token Lab Ingredient System (Interactive Tiles)"
