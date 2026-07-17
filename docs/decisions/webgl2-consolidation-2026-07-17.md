# The webgl2 consolidation (2026-07-17)

Cadence runs one Rive runtime. `@rive-app/react-canvas` is gone from the
dependency tree, every canvas in the app renders through `@rive-app/react-webgl2`,
and the build ships a single WASM binary. Commits: `d08cfcb` (the consolidation),
`ed587ce` (a card-title clip found in the deployed diff), alongside `6e6fb93`
(David's editor-side `.riv` cleanup, which rode the same push).

This doc records why the two-runtime constraint fell, what the swap surfaced,
and the two rules that now apply when adding Rive-bound components.

---

## The constraint that did not hold

The scaling doc (`rive-scaling-future-work-2026-07-07.md`) recorded runtime
consolidation as off the table: "the `.riv` files were authored against
different Rive versions and do not run on a single shared runtime." No test
was ever recorded behind that sentence, and the format works against it. Rive
files are backwards compatible: a newer runtime plays older files in full, and
only a major format bump (6 to 7) hard-errors. The installed runtimes sat in
the same major era with the canvas side *older* (2.37.2) than the webgl2 side
(2.38.4), so the principle files were guaranteed to load. The direction that
genuinely breaks is the reverse: hero3.riv and the Motion Tiles files are
authored for the Rive Renderer and render blank on the old canvas runtime.
That one observed failure had been generalized into "runtimes cannot be
consolidated."

A spike settled it in an afternoon: four import swaps, a build, and a
Playwright pass on `wrangler dev` against `dist/`. All 18 icons, the expanded
animations, and the Gesture carousel rendered on webgl2 with zero console
errors and one WASM fetch for the whole session.

What the consolidation bought:

- The 686 kB (gz) canvas WASM is out of the build. Every Principles visitor
  used to download it on top of the 838 kB webgl2 binary the landing hero
  already required; now there is no second binary to fetch.
- The Carousel chunk fell from ~50 kB to 4 kB (gz): it had been carrying a
  private runtime. Eager JS is unchanged at ~170 kB.
- One WASM pin (`riveWasm.js`), one dependency version, one renderer to
  reason about. `riveWasmCanvas.js` and the pin-placement choreography from
  the 2026-07-16 lazy retrofit are deleted.

The lazy chunks survive unchanged. They now carry component JS only, which is
what per-section lazy loading was for in the first place.

## Finding one: the HC-dark flip lost its write on rebind

Switching Light → HC Dark left the principle icons in HC-light colors while
the chrome went dark. The baseline build handled the same switch correctly,
so this was a consolidation regression, and the mechanism turned out to be a
latent race the old runtime had been absorbing.

`useHCContrastColors` wrote the stroke/fill flip through the
`useViewModelInstanceColor` setters. Those setters hold a property handle that
lags one render behind an instance rebind: on a non-HC → HC switch the
binding moves from the `Light` instance to `Contrast`, and the write lands on
the handle of the instance just discarded. The old canvas runtime rejected
the stale write and fell through to a fresh lookup. The webgl2 runtime
accepts it silently, and the flip vanishes. HC Light ↔ HC Dark never broke:
both themes bind the same `Contrast` instance, so the handle is never stale.

The hook now writes through `instance.color(name)` directly. The instance in
hand at effect time is the one `useViewModelInstance` just bound, so the
write cannot go stale, and the hook no longer imports anything from the Rive
packages at all. Verified across the full theme matrix on built output.

## Finding two: the renderer draws thin strokes worse, and supersampling closes it

`npm run preview` showed the principle icons and carousel statics visibly
degraded. Not resolution: the offscreen renderer blits 1:1 and the backing
stores matched the baseline. Antialiasing. The Rive Renderer does its own AA,
and without Chrome's draft pixel-local-storage extension (which no shipping
browser enables) it falls back to MSAA, coarser than the browser 2D
rasterizer the canvas runtime used. The hand-drawn titles in the icons are
the worst case: single thin strokes on empty ground.

The fix is 2x supersampling: render at twice the device pixel ratio and let
the browser's downscale smooth the strokes. In pixel captures at 6x zoom the
supersampled webgl2 render is indistinguishable from the canvas baseline.
`src/hooks/useRiveSupersampling.js` applies it to the three thin-stroke
surfaces (`PrincipleIcon`, `PrincipleAnimation`, the Carousel's `SlideImage`)
and nothing else: the hero, the titles, and Motion Tiles were authored for
this renderer and keep plain device ratio.

Two dead ends are recorded in the hook so they are not retried:

1. `useRive({ customDevicePixelRatio })` is a verified no-op on
   `@rive-app/react-webgl2` 4.29.4. The backing store stays at 1x device
   ratio no matter what is passed.
2. `rive.resizeDrawingSurfaceToCanvas(ratio)` measures with
   `getBoundingClientRect`, which includes CSS transforms. The expanded card
   mounts its animation mid-FLIP, where the rect is a fraction of the final
   size, and the canvas locks in a tiny backing store. The hook reads
   `offsetWidth`/`offsetHeight` instead: layout size, already final during a
   FLIP, then re-asserts through a ResizeObserver so the library's own
   resize writes cannot silently undo it.

The cost is GPU fill: 4x the pixels per supersampled canvas at dpr 2,
roughly 6.8M pixels per frame with all 18 icons animating, in the same range
Motion Tiles already spends on 52 tiles. The ratio is capped at 4x total
(device ratio capped at 2, times 2), so 1x displays pay a quarter of what a
retina Mac does. If a machine ever shows jank, the whole trade is the `* 2`
in the hook.

## The deployed diff's one find: sheared descenders

David's diff of the deployed version surfaced clipped card titles: the g
loops in Exaggeration, Staging, Follow Through, Solid Drawing, Timing. Not
Rive. The HTML card title is a flex child of the fixed-height collapsed
column, flex shrink handed it 14px against a 16.9px line box, and the
`overflow: hidden` that `-webkit-line-clamp` requires sheared the bottom 3px.
`flex-shrink: 0` on `.cardTitle` exempts the title; the icon area, which
flexes, absorbs the difference. All 18 collapsed titles hold the full line
box on built output.

## Rules going forward

- A new Rive-bound component imports from `@rive-app/react-webgl2`. There is
  no other runtime, and the theme-binding convention (the four-entry map,
  `useHCContrastColors(instance, theme)` after binding) is unchanged.
- If the art is thin-stroke work not authored for the Rive Renderer, add
  `useRiveSupersampling(rive)` after `useRive`. If it was authored for the
  renderer, leave it at device ratio.
- The scaling doc's consolidation ban is corrected by its 2026-07-17
  addendum. The real constraint was never file compatibility: it was
  rendering quality, and it had a fix.

One runtime, one binary, and the icons keep their loops.
