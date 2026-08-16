# caseStudyMedia

Media production for the hosted case study: the capture rig (code, tracked in
git) and the screen captures and media outputs David records with it (binaries,
gitignored via this folder's `.gitignore`, because deploys ride every push to
main and media never ships through the repo).

The item list, destinations, and priorities live in
`docs/case-studies/visual-aid-checklist.md`.

## The capture rig

Scenes that drive a Token Lab control by code while David records and interacts.
The rig mounts instead of the app, gated twice: the build must carry
`VITE_CAPTURE=1` (never set by the Cloudflare build, so the rig is dead-code
eliminated from every public deploy) and the URL must carry `?capture=<scene>`.

Run against built output (the standing rule):

```bash
VITE_CAPTURE=1 npm run build
npx wrangler dev -c dist/cadence/wrangler.json
```

then open `/?capture=problem-loop`.

## Scenes

- **`problem-loop`** (V02): the duration.fast slider ramps 50→350ms on a
  triangle wave with dwells at both ends; David clicks the Button on camera.
  Space starts and stops the ramp. Theme forces high-contrast-dark (the button
  carries an extra outline there). Ramp knobs are the `RAMP` constant at the
  top of `captureRig/ProblemLoopScene.jsx`.

- **`spring-vs-overshoot`** (V04): two Toggles flipped by one shared state,
  left on the overshoot bezier release, right on the real spring, magnified 2x
  for the camera with the driving values captioned per column. Above each: the
  tool's own curve graphic (the bezier editor held read-only, the settle-curve
  plot), in equal-height boxes so the toggles share a baseline. A third
  trigger toggle sits at the top of the screen above the crop line, so the
  recording never contains the pointer. Space starts and stops an auto-flip
  cycle (2s holds). Theme defaults dark; `&theme=` overrides (any scene
  accepts it).

- **`hierarchy-of-motion`** / **`solid-drawing`** (V01 material): one
  expanded-card principle demo each at 1.5x, dark theme, with a remote
  trigger toggle at the top of the screen that forwards a real click into
  the demo (the demos stay self-contained; the rig clicks what a finger
  would). Space runs a 2.5s auto-cycle. Captured individually.

- **`solid-drawing-card`** / **`hierarchy-of-motion-card`** /
  **`squash-and-stretch-card`** (V01 material): the
  card counterparts to the two above. The whole expanded card on stage, in the
  presentation the deep-link modal and the case-study embed share (the 460 × 520
  body inside the accent-bordered raised panel), flipping from the Rive
  principle animation to the UI component demo. Dark theme, `&theme=` overrides.

  Three triggers above the crop line: a toggle that flips Motion to UI, a
  `demo` button, and a `rive` button, one per layer.

  `demo` presses the demo's own interactive element in whichever layer is
  visible, choosing the layer by computed `pointer-events` (which is what
  decides where a real click lands), so it hits the demo and never the card's
  own Motion/UI control. It presses and releases rather than clicking, in the
  order a browser emits one: `pointerdown`, then `pointerup` and `click`
  `PRESS_MS` later. Both halves are load bearing, because the demos read
  different parts of a press. Solid Drawing's Card and Hierarchy's parent toggle
  on `onClick`; Squash & Stretch's Button is `whileTap`, which opens on
  `pointerdown` and never sees a synthetic click. The 180ms hold is also what
  makes the squash legible on camera instead of a single frame.

  `rive` has no DOM element to click, because the .riv carries its own hitboxes
  and state machine triggers and React only binds theme. So it goes one level
  lower and dispatches the mouse sequence the Rive runtime listens for on the
  canvas: mousemove, mousedown, mouseup, not a click, since the runtime binds no
  click listener and a trigger fires on pointer down and up. Coordinates come
  from the canvas's own bounding rect, which is also what the runtime measures
  with, so the scene's 1.5x transform cancels out on both sides.

  `RIVE_HIT` is where that pointer lands, as a fraction of the canvas box, and
  it is **not** the center. All three principles draw their own play control
  into the lower-left corner of the art, and on Solid Drawing that control is
  the only thing on the canvas a click reaches (a 7 × 7 grid of real clicks
  across the rest of it moved nothing). Hierarchy of Motion answers a click on
  the art as well, so the corner is the one point that works on every file.
  Move the knob if a file is re-authored with its control elsewhere.

  Space runs a five-beat cycle that closes where it starts: flip to UI, fire,
  fire again to return the demo to rest, flip back to Motion, fire the
  animation. `BEATS` and `CYCLE_MS` at the top of
  `captureRig/PrincipleCardFlipScene.jsx`.

  The scene can drive the flip from outside the frame because
  `ExpandedPrincipleBody` owns no state: `uiMode` is a prop, and each of its
  three shipped hosts holds it where its own reset logic lives. The rig is a
  fourth host under the same contract, forcing `prefersReducedMotion={false}`
  and `showDemoMotion={true}` so the take is right whether or not reduce-motion
  is on in System Settings.

  `--card-scale` defaults to 1.5. It has a ceiling of 2, which the other
  principle scenes do not: the card contains a Rive canvas, and a CSS transform
  scales a bitmap rather than re-rasterizing it. `useRiveSupersampling` sizes
  the backing store from `offsetWidth` (transforms excluded) at
  `min(dpr, 2) × 2`, so a retina display gets 4× layout size and a take at 2×
  needs `2 × scale`. Past 2, magnify with browser zoom instead, which moves
  `devicePixelRatio` and takes the backing store with it. At 1.5 the card paints
  690 × 780 and the window wants roughly 880px of height before the stage
  scrolls.

- **`export-formats`** (V01 material): the Export section stepping through its
  four output formats, with the file each one actually produces beneath it. The
  code randomizes per character and snaps into the new format; characters the
  two outputs share at the same position hold still, so common structure stays
  put while the rest churns. Panel is a fixed 34 rows, which is why CSS (28
  lines) and Flat (33) sit whole while FM (45) and DTCG (123) run past the
  bottom fade. The step button above the crop line advances the format; Space
  runs a 3s auto-cycle. The rig never clicks Export or Copy, because a download
  shelf or a clipboard prompt would land in frame.

  This one is a **plate, not a full frame**: it composites into the green area
  of `exportScene/sceneMap/exportMap.png`, which measures 864 × 978 at (94, 49)
  in 1920 × 1080. The rig draws the plate at exactly that size with a `#b9b0ff`
  crop guide (`SHOW_CROP_GUIDE` at the top of `ExportFormatsScene.jsx`, turn it
  off for the take). Record the plate at 2x, so 1728 × 1956 downscales to plate
  size and drops in 1:1 with no scaling.

- **`rive-embed`** (V01 material): the React-to-Rive boundary as code beside the
  canvas that code renders. Stepping the theme swaps strings in the source and
  recolors the art in the same beat, and the three trailing comments in the
  block change to the values that drove it: the theme name, the instance name
  it resolves to, and the accent hex written to the icon's outline. The cycle
  runs all four themes on purpose, because the code on screen contains three
  different paths and the cycle exercises all of them. dark → light →
  high-contrast-light rebinds the view model instance by name.
  high-contrast-light → high-contrast-dark keeps the same `Contrast` instance
  and flips its colors through `useHCContrastColors`. And every step writes
  `--color-accent` into `colorPropertyOutline` through `useRiveAccentColor`,
  which is the one that moves on all four. The theme button above the crop line
  steps it; Space runs a 3.4s auto-cycle.

  The accent hex in the block is read back out of the DOM, from the same
  element and the same token the hook reads, not restated in the scene. A
  comment beside a line claiming to write `--color-accent` has to be
  `--color-accent`, or the clip is a diagram of itself.

  The theme flip is scoped to the Rive canvas, not the document. Every theme
  selector in `color.css` is `:root`-anchored, so flipping the document would
  recolor the code panel and the container along with the art: a different
  clip, and one that would make the container drift against the background it
  is composited over. The canvas is therefore a rig-local transcription of
  `PrincipleIcon`'s `RiveIcon` taking `theme` as a prop, and the canvas panel
  carries its own per-theme background and accent (the `--color-bg` and
  `--color-accent` values are mirrored in `CaptureRig.module.css`; if either
  changes in `color.css`, that block follows). The mirrored accent is not
  decoration: `useRiveAccentColor` reads the token off that panel rather than
  off `:root`, which is the only reason the outline follows the canvas's theme
  instead of the rig's.

  This one is also a **plate, not a full frame**: 1728 × 864, centered in
  1920 × 1080 at (96, 108), measured off `preRenders/riveBlockReference.png`.
  Record at 2x. The plate holds its width rather than shrinking, so the window
  needs about 1730 CSS px; below that the page scrolls sideways, which is the
  point (a shrunk plate would land on the composite at the wrong size and look
  fine while doing it).

  **Transparency.** In the composite the container is semi-transparent over an
  animated background while the code panel and the canvas are opaque. A browser
  screen recording carries no alpha, so the rig offers a backdrop to record
  against instead. `BACKDROP` at the top of `RiveEmbedScene.jsx`:

  - `key`, flat magenta (`KEY_COLOR`). The take. Set `CONTAINER_TINT` to `0`
    so the container is genuinely empty and only the two opaque panels carry
    pixels; the matte then pulls clean and the tint gets drawn in the composite
    as a shape layer under them, where it stays adjustable.
  - `checker`, alpha checkerboard. Framing aid, so the tint is legible while
    composing. The default, and never a take.
  - `page`, the theme's own background, for reading the plate the way the app
    would render it.

  Keying a semi-transparent surface is the one path that does not recover
  cleanly, which is why the rig does not offer it.

  The code panel clips what does not fit, and the first and last rows go first.
  Neither is where the eye goes, so a ruined take looks fine in the viewfinder.
  The scene measures itself at mount and says so in the operator strip if
  either axis overflows. If it fires, lower `CODE_FONT_PX`.

- **`presets-explore`** (V01 material): presets and Explore mode, argued with
  the tool bar's own controls and nothing else. Three token families sit side by
  side as opaque panels, and every beat moves all three at once: the curve
  bends, the settle curve slackens, the four duration thumbs slide. One state
  change, the whole system retimed. Same plate as `rive-embed` (1728 x 864).

  Four beats, looping closed: Standard, Snappy, Cinematic, Explore. Space runs
  the cycle, or the button above the crop line steps it.

  Nothing in frame is labelled. No preset row, no toggle, no title (David's
  reconfiguration, 2026-08-11): the clip is the controls moving, and the names
  belong to the edit where they can be timed against the voiceover instead of
  competing with the graphs.

  **The Explore state.** The fourth beat is a state no preset could hold. Every
  value in `EXPLORE_STATE` sits outside its constrained range and inside its
  explore range, so it exists only because the ranges opened. The durations are
  the semantic ladder run backwards, `fast` at 1800ms and `slower` at 80ms,
  which is the illustration TokenLab's own explore comment gives. The names stop
  describing the values, and that is the argument the tool is making: the labels
  are conventions, not laws. The spring is the rubber ball the constrained band
  exists to exclude (its comment says the band covers "a legible arrival, a
  little bounce, not a rubber ball and not a door-closer"), tuned to a damping
  ratio of 0.20 so it overshoots about 53% and rings a few visible times rather
  than reading as noise. The easing slot is a curve with no name, anticipating
  below zero and overshooting to a 1.45 handle past the normal 1.25 ceiling.

  **Two props trim the shipped sections for the camera**, both defaulting to the
  app's behavior and both passed only from here. `EasingSection` `display`
  renders the section as a readout instead of an editor: the curve, and its four
  numbers underneath. No slot tabs, no curve grid, no drag, and the plot's
  coordinate space locked. It is one prop rather than three because the three
  things it turns off are one decision, and each was a moving part: the tab
  strip is a 3-column grid that gains a fourth tab in Explore and wraps to two
  rows, the curve grid grows a sixth button on a custom curve, and the
  coordinate readout mounts and unmounts on that same condition with a height
  animation attached. `DurationSection` `showVisualizer={false}` leaves the four
  token sliders, per David's spec; it also takes the tallest thing in the bar
  out of the plate, which is what let the panels grow from `COLUMN_SCALE` 1.32
  to 1.7.

  **The easing plot's bounds are locked and the handles are not.** The
  coordinate space follows the slot being edited, never the curve being shown,
  so stepping presets cannot rescale the grid (David, 2026-08-11: it was briefly
  the other way round and the curve jumped around). A control point above the
  ceiling draws above the frame; `.svg` is `overflow: visible`, so nothing
  clips it there. The one thing that would is an ancestor with
  `overflow: hidden`, which the rig's panel is, so display mode reserves
  headroom above the plot (`.curveDisplayRoom`, 30% of the column width, which
  is 40 svg units, which reaches bezierY 1.65: past the 1.56 the overshoot curve
  carries).

  **The panels are opaque because they have to be.** The field behind them is a
  flat red key (`#ff0000`, `CONTAINER_TINT` 0): a screen recording carries no
  alpha, so the container tint gets drawn in the composite instead, and anything
  not sitting on an opaque surface would key out with the field. Nothing in the
  four themes or the accent role is red, and the greens in frame are the
  opposite side of the wheel, so the pull is clean. `PANEL_ALIGN` switches the
  three panels between one even band (`stretch`, the default and the steadier
  shape over a moving background) and three cards ending at their own content
  (`flex-start`).

  Width now binds rather than height: three panels at 300 x 1.7 come to 1530 of
  the plate's 1632 inner width, leaving 51px in each gap. Going higher closes
  those gaps before it runs out of vertical room. The operator strip still
  reports the largest scale that fits by height, measured and held at the
  tightest beat.

  One thing visible in frame that is not a rig bug: Snappy's `duration.slower`
  is 350ms, below its constrained minimum of 400, so that thumb pins at zero
  while its readout says 350. It is the tool telling the truth about a preset
  that steps outside its own band, and it makes the Explore beat land harder.

  The sections are the shipped ones. `PresetsSection`, `EasingSection`,
  `SpringSection`, `DurationSection` and the reducer are exported from
  `TokenLab/index.jsx`, the same split `ExportSection` got for the export scene
  on 2026-07-21; Spring and Duration were lifted out of the main component's
  render at the same time. The rig runs the real reducer, so a beat here is the
  state transition it is in the app.

(V09 became a live embed instead of a capture: `?embed=rive-clock` on the app
itself, see `src/components/PrincipleEmbed/`.)
