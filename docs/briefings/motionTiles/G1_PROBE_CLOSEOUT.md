# G1 Probe — Closeout

**Date:** 2026-07-08
**Closes:** `G1_PROBE_HANDOFF.md` (the probe it asked for was built and run)
**Result:** G1 PASSED. The high-level runtime samples the live Rive canvas
cross-context on Safari. State A is not needed.

---

## The question, answered

Can the live `@rive-app/react-webgl2` canvas be sampled cross-context, uploaded
as a WebGL texture every frame, so the proven pixelation shader post-processes
it? Or does it read blank at the `preserveDrawingBuffer` readback wall on Safari?

It reads. A separate `webgl` context uploaded `rive.canvas` via per-frame
`texImage2D` and the shader pixelated it correctly. Presets recolor and retime
through live; the block-count slider reads through live. No blanking, no
intermittency, on the strict target browser.

That picks the build path: post-process on the existing high-level runtime. The
React VM binding from fork 1 stays as-is. No imperative `advance -> draw -> flush`
port, no `@rive-app/webgl2-advanced`, no `pixelMirror2`, no 34 artboard
restructures. The whole in-Rive rollout is retired.

---

## What was built this session

All behind the `?pixelrive` gate in `src/App.jsx`. Nothing in the main Token Lab
or the other labs was touched.

- **`IngredientPixelRiveProbe.jsx`** — the shader pipeline copied from
  `PixelateShaderTest.jsx`, sourcing `rive.canvas` instead of an SVG sequence.
  Two stages render side by side: raw Rive grid (left), shader output (right), so
  the read is verifiable by eye rather than inferred.
- **`IngredientGrid` (`index.jsx`)** gained two optional props, both default off,
  production path unchanged:
  - `onRive` — hands the loaded Rive instance up to the probe (for `rive.canvas`
    and the palette read).
  - `disableIntersectionObserver` — keeps the grid ticking when the shader canvas
    sits alongside it, so the runtime does not pause the driver.

Once the probe passed it became the standalone tuning lab, and two fixes landed
on top of the bare probe:

1. **Passthrough fidelity.** The shader canvas sizes its backing to `rive.canvas`
   each frame, so pixelate-off is a 1:1 copy with no minification. Filtering is
   `LINEAR` when passthrough, `NEAREST` when pixelating. The soft copy David
   noticed on the bare probe is gone; the right stage now matches the clean Rive
   line.
2. **Palette snap** (own checkbox). Each block's sampled color quantizes to the
   nearest of the 8 `IngredientVM` colors (`bg` + 7 shapes). The palette is read
   read-only from the same instance the active preset binds, so it recolors on a
   preset switch. Sampled alpha is kept, so transparent regions stay transparent.
   This kills the antialiased edge blends and recovers pure per-shape colors, the
   closest match to the `Pixelate.lua` look.

The palette read and the shader both live in the probe. No color plumbing was
added to `IngredientGrid`. Verified by David: all changes landed, passthrough
crisp, snap matches the per-shape reference.

---

## State at close

- **Tests:** 76 passed. Token-integrity gate green (the probe uses no
  framer-motion, so no inline animation literals).
- **Uncommitted:** the entire `src/components/IngredientGrid/` folder is
  untracked, along with the ingredient briefing docs and `public/riveTiles/`.
  Nothing is committed yet.
- **Still gated.** The pixel effect is deliberately standalone at `?pixelrive`
  for the tuning phase. It is not folded into the Token Lab panel.

---

## What is deferred (the promotion pass)

When the look is locked and the effect graduates out of the lab:

1. Fold the shader into the Token Lab presentation.
2. Wire the `IngredientLab` preset buttons and speed/easing sliders onto it, plus
   a raw/pixelated toggle and the block-count control.
3. Retire the `?pixel*` gates (`?pixel`, `?pixeltest`, `?pixelrive`) and the
   parked `backingSize` prop on `IngredientGrid`.
4. One open lever if high block counts read noisy: average over the block instead
   of point-sampling the center. Not built.

---

## Where the record lives

- `docs/references/WEBGL_PIXELATION_HANDOFF.md` — "G1 result" section: the read
  behavior, the chosen path, the fidelity note.
- `tracker/TRACKER.md` — Token Lab Ingredient System: "G1 PASSED" and the
  "Tuning lab landed" notes.
- `src/components/IngredientGrid/IngredientPixelRiveProbe.jsx` — the header
  comment carries the reasoning for both fixes.

The gate that split two build paths is closed. The grid animates on the left, the
same grid comes back pixelated on the right, and the color runs straight through.
