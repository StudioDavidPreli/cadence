# Ingredients v8 Single-File Grid — Closeout

**Date:** 2026-07-12
**Covers:** the React surface that renders `public/riveTiles/ingredients_v8.riv`
as 36 independent tile containers, one artboard per container, loaded from one
consolidated file. Includes the gated bring-up, the Token-Lab-styled control
panel, and the motion-tiles title in the app top bar.
**Status:** complete. All three gates passed. The view lives at
`localhost/?v8grid`.

---

## What shipped

- `src/components/IngredientGrid/IngredientV8Grid.jsx` — the grid, the `Tile`
  component, the React clock, the control panel, and the exported
  `MotionTilesTitle`.
- `src/components/IngredientGrid/IngredientV8Grid.module.css` — a mirror of the
  Token Lab visual language (bordered shell, pills, sliders, section labels),
  built on the same theme tokens.
- `src/App.jsx` — a `?v8grid` gate that mounts the grid, and a top-bar branch
  that swaps the Wordmark for `MotionTilesTitle` on this view.

## The loading model, and why it differs from TileGrid

`TileGrid.jsx` loads 36 separate `.riv` files. This grid loads one consolidated
file that holds 36 artboards (`r1c1`..`r6c6`). The file is loaded once at the
grid level with `useRiveFile({ src })`; the grid renders nothing until
`status === 'success'` and shows a visible error on `failed`. Each `Tile` calls
`useRive({ riveFile, artboard, stateMachines, autoplay: false, autoBind: false })`
against that shared `RiveFile`, so there is one fetch and one parse for all 36
instances. `useOffscreenRenderer` stays at its default `true` so every canvas
shares one offscreen GL context, past the browser's per-page context cap.

Everything downstream of loading is identical to `TileGrid`, because the tiles
are the same no-driver pixelation tiles.

## The three things that were not in the stated contract

Recon (via `strings` on the compiled `.riv`, since the runtime file is not the
editor file) turned up three divergences from the brief. They are the reason the
first passes did not animate.

1. **State-machine names.** The brief said `rXcXSM`. The first file shipped with
   every SM still named the editor default `State Machine 1`. David renamed them
   to `rXcXSM`; the code derives `${artboard}SM` per tile. Watch for individual
   missing SMs on re-export (`r3c1SM` and later `r1c4` were both absent in
   interim files and fixed in the editor). The HUD `unbound` list only catches
   VM-bind failures, not SM-play failures, so a tile can be bound yet frozen if
   its SM name is wrong.

2. **VM instances are three, not 36.** `PathEffectVM` has exactly three named
   instances: `standard`, `snappy`, `cinematic`. "Instances 1-36 following the
   grid naming" refers to the 36 **artboards** in grid order, not 36 VM
   instances. Each tile binds one preset instance (its palette); per-tile
   variation comes from the clock, not from per-tile instances.

3. **Motion comes from a React clock writing `progress`, not from the state
   machine.** The Luau script in the file is the `Pixelate` path-effect geometry:
   it consumes `progress` to rebuild the pixel grid each frame but never advances
   it. Playing the SM only keeps the artboard redrawing. So the single rAF clock
   in the grid writes a phase-offset, eased `progress` into every tile's VM each
   frame. `speed`/`easing`/`spread` feed that JS clock; `cellSize`/`gapSize` are
   written to each tile's VM; the bound instance carries the palette. This is
   ported straight from `TileGrid` (`cycleProgress`, `easeK`, `BASE_PERIOD`, the
   ripple/diagonal/sweep/scatter tables, the per-index `register`/`setters`).

Bind-then-play is load-bearing: `autoplay: false`, then `rive.play(stateMachine)`
in an effect once `rive && instance` both exist, so the geometry has data on its
first advanced frame. This is the documented `IngredientGrid`/`PathEffectGrid`
fix for the "renders but frozen" symptom.

## The design layer

- **Control panel** on the **right**, styled to Token Lab: a bordered rounded
  shell (`.tileLab` grid, stage left, 300px panel right), uppercase section
  labels, the preset/stagger pills, and the slider shape. It sits on the right
  on purpose, so it never reads as the Token Lab tool bar (which is on the left)
  when this view runs inside the shared app shell. Sections: Preset, Stagger,
  Motion (speed/easing/spread), Pixelation (cellSize/gapSize), and a status
  footer (fps/min/unbound). All panel transitions use `--feedback-ui-duration`,
  the chrome timing, never the editable `--motion-*` tokens.
- **Title** in the app top bar. `MotionTilesTitle` swaps one background-free SVG
  per theme (`light`→`lightMode`, `dark`→`darkMode`, `high-contrast-light`
  →`lightCon`, `high-contrast-dark`→`darkCon`), sized by height to the Wordmark's
  48.2px so the top-bar row height is unchanged. `App.jsx` renders it in place of
  the Wordmark only when `SHOW_V8GRID`.

## Gate results

- **Gate 1** (`r1c1`): file loads, artboard renders, SM plays after the progress
  clock was added, both number hooks read and write.
- **Gate 2** (row 1): six tiles independent; the phase cascade across the row
  confirms each artboard holds its own VM data rather than sharing one instance.
- **Gate 3** (all 36): full grid animates; presets recolor and retime all 36;
  the seven stagger tables shape the wave; fps/min readout added to the HUD.

## Open items

- `GATE` constant in `IngredientV8Grid.jsx` is at `3`. Leave it there for the
  full grid.
- Responsive rail-collapse (Token Lab's `≤720px` "Tokens" drawer) is not ported;
  the panel is fixed-width. Add only if this graduates from a lab route.
- Title optical size is height-matched to the Wordmark; adjust `.title` height if
  the glyphs read small once the artwork settles.
- The view is still a `?v8grid` gate alongside the other temporary tile-lab
  gates. Promoting it to a real section is a separate task.
