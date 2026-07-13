# Clawd Interactive Tile + Logo-Button Easter Egg — Session Closeout

Date: 2026-07-13
Surface: `?v8grid` (`src/components/IngredientGrid/IngredientV8Grid.jsx`)
Assets: `public/riveTiles/clawd.riv`, `public/riveTiles/motiontileslogo.riv`

## Goal for the session

Get clawd into the mosaic as a playable tile, then build the easter egg end to end:
clicking the animated motion-tiles logo drops a clawd into the grid. Clawd is a
click-driven character — clicking it advances through 7 animations then resets — and
none of that logic lives in React. Final scope pulled clawd OUT of the random population
so the logo click is its only entry point.

## What clawd is

One standalone `.riv`. Probed with `strings` (do not assume): artboard `clawd`, state
machine `clawdSM`, view model `PathEffectVM`, preset instances `standard` / `snappy` /
`cinematic`, nested character rig `clawdBody`. The seven animation states are baked in
the state machine: `jumpy2`, `looking2`, `confettiFix`, `flag2`, `tippytap`, `weights2`,
`walkingFix`. The hitbox (`hitBox`) and the advance/reset sequence are entirely inside
`clawdSM`; the `clicks` / `activeIndex` VM fields are the machine's own counters.

## What shipped and works

- **`interactive` tile class.** Clawd renders through the normal `Tile` with
  `interactive: true` on its source (`CLAWD_FILE`). This is the key architectural
  addition: a self-driven tile the grid clock and pixelation sliders must NOT touch.
  `Tile` branches on the flag:
  - skips clock registration → the rAF loop never writes its `progress`/`phase`, so
    nothing fights `clawdSM`
  - skips the `cellSize`/`gapSize` writes → it ignores the pixelation controls
  - still binds the active preset instance (palette) and still plays `clawdSM` (hitbox
    live)
  - reports `bound` off the VM instance existing, not off a driver setter — clawd
    exposes no driver, so the instance binding is its success signal (no false unbound
    flag).
- **Clawd is OUT of the population.** `CLAWD_FILE` is intentionally NOT in
  `EXTRA_ANIM_FILES` / `ANIM_POOL`, so the seeded mosaic never places it. The logo click
  is the sole entry point. (Excluded in code with a NOTE so it is not "helpfully"
  re-added.)
- **Logo-button easter egg.** `ClawdLogoButton` renders `motiontileslogo.riv` (artboard
  `motionTilesLogo`, SM `motionTilesLogoSM`, VM `PathEffectVM`, preset instances). It
  plays its own wave, binds the active preset for palette, and is wrapped in a `<button>`
  whose `onClick={addClawd}`. The canvas is `pointer-events:none` so every click lands on
  the button, never Rive's own pointer handling. It sits in a full-bleed `logoBay`
  (no side padding) and fills the whole tool-column width; its height comes from the
  logo's real aspect ratio, read from `rive.bounds` on load and exposed as
  `--logo-aspect` (inline style sets only the var, same convention as `--cols`/`--tile`;
  a `3 / 1` CSS fallback holds the box until bounds resolve).
- **Add / reset semantics.** Each logo click drops a self-driven clawd onto a random
  non-clawd cell via `addClawd`. Clicking **Reshuffle** re-seeds the board AND clears
  `clawdCells`, so the clawd count returns to zero with the reshuffle.
- **Forced-clawd state (`clawdCells`).** A `Set` of absolute cell indices held OUTSIDE
  the seeded `assignment` memo — adding a clawd is a user gesture, not part of the
  reproducible layout, so it must not perturb the mosaic or depend on the seed. Render
  checks `clawdCells.has(i)` first and renders a clawd `Tile` there regardless of the
  pool assignment. `Math.random` (not the seeded RNG) picks the cell, correct for a live
  gesture. A clamp effect on `gridN` drops indices that fall outside a shrunken grid;
  growing the grid preserves existing clawds.

Built clean, JSX parses, no inline animation literals (token-integrity gate safe).
Both artboard names (`clawd`, `motionTilesLogo`) confirmed correct in the running app.

## Design decisions worth remembering

- **"Add" means "replace a cell."** The grid is always fully populated N×N with no empty
  slots, so a click converts one existing cell to clawd rather than growing the board.
  That is the only reading of "add" against a fixed grid, and it fits the easter-egg feel.
- **Override at render, not inside the memo.** Folding `clawdCells` into the `assignment`
  memo would have made the status counts exact but coupled a user gesture to the seeded
  layout. The isolated override keeps the mosaic deterministic. Trade-off: the
  `N motion / M static` readout still counts by pool assignment, so a forced clawd on a
  former static cell reads as "static." Cosmetic; left as-is.
- **Height from bounds, not a guess.** The logo button fills the column width and its
  height follows `aspect-ratio: var(--logo-aspect)`, where the ratio is the artboard's
  own `(maxX-minX)/(maxY-minY)`. This scales any logo correctly without hardcoding
  dimensions; the only visible cost is a one-frame correction from the `3/1` fallback.

## Current code state

- `CLAWD_FILE`, the `interactive` branch in `Tile`, `ClawdLogoButton` + its `logoBay` /
  `logoButton` / `logoCanvas` styles, `clawdCells` + `addClawd` + the clamp effect, the
  render override, and the Reshuffle reset are all in `IngredientV8Grid.jsx` /
  `IngredientV8Grid.module.css`.
- Uncommitted at session close (staged with the prior pooled-mosaic work). Solo repo,
  commit direct to `main` when ready.

## Possible next steps (not requested)

- The `N motion / M static` readout ignores forced clawds — could count them if the
  mismatch ever bothers.
- The `3/1` logo-aspect fallback could be set to the logo's real ratio to remove the
  first-frame correction.
