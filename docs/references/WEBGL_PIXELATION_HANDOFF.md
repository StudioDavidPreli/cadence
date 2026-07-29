# WebGL Pixelation Over Rive — Findings & Handoff

**Date:** 2026-07-08
**Audience:** Claude Code (implementation session)
**Question answered:** Can WebGL pixelation run on top of a Rive animation to pixelate the Rive animation?
**Answer:** Yes — but only as a *post-process stage outside Rive's pipeline*, not inside it.

> **Superseded 2026-07-16 note:** the in-Rive per-shape PathEffect route won and shipped inside Motion Tiles (ingredients_v8 + the 16 group-2 tiles). The "remaining build steps" at the end of this doc describe the WebGL route's promotion pass and are not live work; the `?pixel*` test gates and the `IngredientGrid` harnesses were removed from the codebase during Motion Tiles integration. Kept as the record of the route that lost and why it was viable.

---

## Context: why this matters

We have a working per-shape scripted PathEffect (`Pixelate.lua`) that mosaics a
shape's silhouette on a world grid while preserving data-bound animation and
fill color. It does not scale: Rive's editor allows effect attachment only one
object at a time, effects can't be copied between shapes, and scripts cannot
traverse the node hierarchy (`artboard:node(name)` returns nil for all names).
Full evidence trail: `PIXEL_MIRROR_AUTOMATION_HANDOFF.md`. Applying the look
across **36 artboards (some with up to 22 shapes)** is the unsolved problem.

A browser-side post-process sidesteps all of that: it pixelates the **entire
composited frame** — every shape, every color, all artboards rendered to the
canvas — with zero editor work and zero changes to the .riv.

**The trade:** the effect exists only in the web deployment. The .riv itself
stays un-pixelated in the Rive editor, share links, and every other runtime.
Decision framing: if pixelation is a *deployment-time look*, post-process wins
and the 36-artboard problem dissolves. If it must be *asset-intrinsic* (survive
inside Rive), the PathEffect / PixelMirror routes remain the only options.

---

## Core finding

Rive's web runtime exposes **no hook to inject a shader pass** into its own GL
context or framebuffer. "WebGL pixelation on top of Rive" therefore means:
treat the finished Rive frame (its `<canvas>`) as an image source and pixelate
it in a second stage. `texImage2D` accepts an `HTMLCanvasElement` directly, so
a canvas is a first-class texture source for a separate WebGL context — this is
the standard bridge for post-processing any canvas/video content.

---

## Three implementation routes (cheapest first)

### Route 1 — No WebGL: render small, upscale nearest-neighbor
- Set the Rive canvas drawing surface to `artboardSize / cellSize`
  (e.g. 1080×1350 at cell 8 → 135×169).
- Display it scaled up with CSS `image-rendering: pixelated`, or `drawImage`
  onto a display canvas with `imageSmoothingEnabled = false`.
- Downsample + nearest-neighbor upscale *is* mosaic pixelation.
- ~5 lines. Rive renders far fewer pixels → cheaper than full-res.
- **Try this first.**

### Route 2 — Canvas-2D post-process (runtime-adjustable cell size)
- Rive renders full-res to a hidden canvas.
- Each frame: `drawImage` down to a small buffer, then back up to the display
  canvas, smoothing off both ways.
- Same visual as Route 1, but cell size becomes a live JS knob (bindable to
  UI), and Rive can keep rendering at full resolution.

### Route 3 — True WebGL fragment-shader pass (max control)
- Own GL context; upload the Rive canvas as a texture each frame via
  `texImage2D`.
- Fragment shader: `texture(u_tex, floor(uv * grid) / grid)`.
- Unlocks effects beyond plain mosaic:
  - **palette snapping** — quantize edge cells to the nearest palette color,
    killing antialiased blends and recovering pure per-shape colors (closest
    match to what `Pixelate.lua` produces);
  - dithering, scanlines, animated/gradient cell size, per-region grids.

---

## Empirical update — 2026-07-08 build session

The routes above were theory when written. This session tested them.

- **Route 3's shader is PROVEN.** A fragment-shader mosaic
  (`texture2D(u_tex, (floor(uv*blocks)+0.5)/blocks)`) runs correctly on a static
  SVG and on an animated SVG frame sequence (r1c4 frames 30-60, ping-pong,
  per-frame `texImage2D`). Both read cleanly and pixelate well, including under
  motion. Built as `src/components/IngredientGrid/PixelateShaderTest.jsx`, route
  `?pixeltest`.
- **Route 1 is DISPROVEN for our runtime.** Rendering Rive small and upscaling
  requires controlling the canvas backing, and the high-level
  `@rive-app/react-webgl2` runtime does not allow it. Two attempts, both failed:
  `customDevicePixelRatio` at a fractional value was ignored (full-res render, no
  pixelation); forcing `canvas.width/height` low with
  `shouldResizeCanvasToContainer:false` went black (setting the width reset Rive's
  GL viewport and it did not recover). Route 1 is only viable on a low-level
  runtime where we own the canvas.
- **G1 Mitigation 2 (2D renderer source) is not free for us.** The doc frames its
  cost as "no data-binding hooks." The deeper blocker: the ingredient
  composition's clock is a Luau script (`compDriver`), and Luau scripts run only
  on the webgl2 renderer. The 2D `@rive-app/canvas` renderer would not tick the
  driver, so the grid would sit frozen. Using it requires ALSO porting the driver
  to a JS rAF clock (the React-clock idea in `TOKEN_LAB_PHASE2.md` §1/§5).

**The decision now collapses to two end-states, both of which retire the 34 tile
restructures and pixelMirror2:**

- **State A: `@rive-app/webgl2-advanced`, imperative loop.** Keep the Luau driver
  (scripts run on webgl2). Drive `advance -> draw -> flush` yourself, sample the
  frame immediately after flush (G1 Mitigation 1, before compositing clears the
  buffer), run the proven shader. Cost: reimplement the ingredient VM binding
  through the imperative JS API instead of the React hooks.
- **State B: `@rive-app/canvas` 2D + JS driver clock.** Port the driver to JS,
  drop Luau/webgl2 for this view, use the reliably-sampleable 2D canvas. Cost:
  rewrite the driver in JS; upside: trivial sampling, and it aligns with the
  Phase 2 cross-canvas plan.

**Only unknown left: G1 for the live case.** The static and sequence tests never
touch a Rive canvas, so they sidestep the readback wall. The next step is the G1
probe (see `archive/docs/briefings/motionTiles/G1_PROBE_HANDOFF.md`, outside git since 2026-07-28): swap the texture source from SVG
frames to `rive.canvas` and see whether it reads or blanks. That result picks the
path: reads reliably -> build on the high-level runtime; blanks -> State A
(recommended, it keeps the driver).

---

## Gotchas (both matter for our stack)

### G1 — Source-canvas readability (`preserveDrawingBuffer`)
If the Rive side uses the WebGL/WebGL2 renderer — which Rive recommends for
quality/performance, and which **our React data-binding setup requires**
(`@rive-app/react-webgl2`; see `RIVE_SCRIPTING_INSTRUCTIONS.md` §7) — its
drawing buffer is cleared after the browser composites unless
`preserveDrawingBuffer` is set. Sampling it from another context can read blank.

Mitigations, in preference order:
1. **Sample in the same task, immediately after Rive draws.** With the
   low-level `@rive-app/canvas-advanced` / `webgl2-advanced` packages you drive
   the render loop yourself (`requestAnimationFrame` → `advance` → draw →
   flush), so you can copy right after the flush, before compositing clears it.
2. **Use the `@rive-app/canvas` 2D renderer as the source.** 2D canvas contents
   persist; sampling is always reliable. Cost: no react-webgl2 data-binding
   hooks — VM values must be driven through the JS API instead. (Note: even
   `canvas-lite` probes webgl contexts before settling on 2d — see rive-wasm
   issue #355 — but the final context is 2d and its contents persist.)
3. With the high-level runtime and a WebGL source, rAF-chasing works but timing
   is not guaranteed; treat as last resort.

Related: `useOffscreenRenderer: true` exists on the WebGL runtimes to share one
offscreen GL context across many Rive instances (browser context limits). If
multiple pixelated Rive instances end up on one page, this interacts with the
sampling strategy — verify.

### G2 — Grid space differs from the PathEffect
A post-process grid is **screen-aligned and global**. It will not track a
shape's world transform the way the PathEffect grid does (the Lua effect
rasterizes post-transform silhouettes on a world grid per shape). Edge cells in
the post-process are antialiased color mixes unless Route 3's palette snap is
applied — or the blend is accepted as part of the look.

---

## Suggested verification plan for the build session

1. Prototype Route 1 with any .riv (or a stand-in animated canvas) — confirm
   mosaic quality at target cell sizes (start at cell 6–8 on 1080×1350).
2. If the look holds, wire it to a real artboard using the current React
   integration. Confirm whether the small-canvas render degrades stroke/detail
   unacceptably vs. Route 2's full-res sample-down.
3. If Route 3 is pursued: verify G1 empirically — sample the webgl2 canvas
   cross-context (a) naively, (b) same-task after flush via canvas-advanced,
   (c) from a 2d-renderer source. Record which reads reliably.
4. If palette snap is added: source the palette from the same VM color
   properties the artboards already bind (channels 0–255).
5. Compare output side-by-side with a hand-applied `Pixelate.lua` shape to
   decide whether the screen-aligned grid + snapped edges is an acceptable
   substitute for the world-grid PathEffect look.

---

## Sources

**Rive documentation & packages**
- Canvas vs WebGL2 (renderer choice, `useOffscreenRenderer`, context limits,
  `WEBGL_shader_pixel_local_storage`):
  https://rive.app/docs/runtimes/web/canvas-vs-webgl
- Legacy Canvas vs WebGL guide (package family, -advanced low-level variants):
  https://help.rive.app/runtimes/overview/web-js/canvas-vs-webgl
- Web (JS) runtime overview (`@rive-app/canvas`, `@rive-app/webgl2`,
  `resizeDrawingSurfaceToCanvas`, cleanup):
  https://help.rive.app/runtimes/overview/web-js
- `@rive-app/webgl` on npm (WebGL renderer, context-limit note):
  https://www.npmjs.com/package/@rive-app/webgl
- rive-wasm issue #355 — canvas-lite probes webgl/webgl2 before settling on 2d:
  https://github.com/rive-app/rive-wasm/issues/355
- Rive Renderer (open-source, WebGL) — Khronos listing:
  https://www.khronos.org/developers/linkto/rive-render-for-webgl

**WebGL post-processing technique**
- Post-processing with WebGL (`texImage2D` accepts HTMLCanvas/HTMLVideo as
  texture sources; framebuffer/texture pipeline):
  https://webplatform.github.io/docs/tutorials/post-processing_with_webgl/
- Hendrik Erz, WebGL Series Part 6: Post-Processing (render-to-texture →
  full-screen quad → fragment-shader transform pattern):
  https://www.hendrik-erz.de/post/webgl-series-part-6-post-processing

**Project-internal (project knowledge, load-bearing)**
- `PIXEL_MIRROR_AUTOMATION_HANDOFF.md` — why editor/script automation of the
  PathEffect is ruled out (constraints C1–C5, probe trail, confirmed API facts).
- `RIVE_SCRIPTING_INSTRUCTIONS.md` §7 — React integration; data binding
  requires `@rive-app/react-webgl2`; VM hook patterns.

---

## Status

- **Proven (2026-07-08):** the WebGL pixelation shader, on both a static image
  and an animated SVG frame sequence. Route 1 (low-res render) disproven for the
  high-level webgl2 runtime. See the Empirical update above.
- **Open decision (unchanged):** deployment-time look (post-process) vs
  asset-intrinsic look (PathEffect/PixelMirror). Post-process is now the leading
  approach: the shader works, and the alternative is restructuring 34 artboards.
- **Next action:** the G1 probe, `archive/docs/briefings/motionTiles/G1_PROBE_HANDOFF.md`. Sample the
  live `rive.canvas` cross-context; the reliability of that read picks the build
  path (high-level runtime if it reads, State A / `webgl2-advanced` if it blanks).

---

## G1 result — 2026-07-08 (Safari): READS RELIABLY

The probe passed. A separate `webgl` context sampled the live
`@rive-app/react-webgl2` canvas via per-frame `texImage2D(rive.canvas)` and
pixelated it correctly on Safari, the strict readback target. Presets and the
block-count slider all read through live; no blanking, no intermittency. **The
high-level runtime samples reliably — State A (`webgl2-advanced`) is not needed.**

- **Build path chosen:** post-process on the existing high-level runtime. Keeps
  the React VM binding as-is; no imperative `advance → draw → flush` port.
- **Probe location:** `?pixelrive` gate in `src/App.jsx` →
  `IngredientGrid/IngredientPixelRiveProbe.jsx`. `IngredientGrid` gained an
  optional `onRive` callback (hands up `rive.canvas`) and
  `disableIntersectionObserver`; both default off, production path unchanged.
- **Passthrough fidelity note:** with pixelate off, the copy reads softer than the
  clean Rive line because the probe's shader canvas is a fixed 512² backing while
  Rive renders at Retina res (~720²) — the ~720 → 512 minification with `NEAREST`
  aliases detail. In the real build, size the shader backing to `rive.canvas`
  (1:1, no minification) and switch the texture to `LINEAR` when `u_pixelate` is
  0. The block look is unaffected (it samples at block centers).
- **Remaining build steps:** size-matched backing + LINEAR passthrough, palette-
  snap edge cells to the 8 VM colors (G2 / the `Pixelate.lua` match), wire the
  `IngredientLab` preset buttons and a raw/pixelated toggle, fold into the Token
  Lab panel, then retire the `?pixel*` test gates.
