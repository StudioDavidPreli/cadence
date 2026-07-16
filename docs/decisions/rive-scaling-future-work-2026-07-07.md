# Rive scaling — future work (2026-07-07)

Recorded while the app is still a single tool loaded once. This is the plan for
when Cadence grows a second and third Rive-heavy section (the anticipated case:
an Interactive Tiles page, where a Rive animation is driven live by the control
bar). Read it before adding a new top-level destination or changing how `.riv`
files are loaded.

---

## What actually grows when Rive content grows

There are three separate weights, and they scale differently. The distinction is
the whole reason this doc exists.

1. **`.riv` binaries.** Referenced by URL string (`src: '/rive/...'`), stored in
   `public/`, copied verbatim to the deploy root at build. The Rive runtime
   fetches each one at runtime when its component mounts. They are **not** in the
   JS bundle. Verified 2026-07-07: 39 `.riv` files in `public/rive/`, zero bytes
   of them in the 731 kB JS chunk. Adding fifty interactive tiles adds fifty
   network requests **on the tiles page** and nothing to the initial JS. This is
   already the ideal loading model, for free, because they are static assets.

2. **The Rive runtime (WASM + JS glue).** The heavy fixed cost. It is a one-time
   cost per runtime: 18 canvases or 180 canvases on the same runtime load that
   runtime once. More Rive *usage* of a runtime already in the bundle adds close
   to nothing.

3. **Component JS.** The new page's JSX. Modest, and the only one of the three
   that per-section lazy loading actually targets.

Conclusion: more Rive content is nearly free to the bundle. Bundle growth comes
from new runtimes (#2) and new page code (#3), not from `.riv` volume (#1).

## The fixed constraint: two runtimes stay

Cadence ships two Rive runtimes:

- `@rive-app/react-canvas` — the principle icons, principle animations, and the
  Carousel.
- `@rive-app/react-webgl2` — the landing hero and the Token Lab title.

These cannot be consolidated. The `.riv` files were authored against different
Rive versions and do not run on a single shared runtime. Runtime consolidation
is **off the table** and any scaling plan has to assume both runtimes persist.
(This closes the "standardize on one runtime" lever that a naive bundle audit
would reach for. It is not available here.)

The consequence: since we cannot remove a runtime, the goal is to stop both
runtimes from loading on first paint. Today the whole app is one chunk, so both
load on the landing regardless of what the visitor opens. `react-webgl2` is
justified on the landing (the hero uses it). `react-canvas` is not: it lives
entirely in the Principles subtree, which is not on the landing path, yet it
ships in the initial chunk because `principlesContent` is built eagerly in
`TokenLab/index.jsx`.

## The route to scale

**Per-section lazy chunks, seeded on the new page.**

1. When Interactive Tiles is built, make it a **lazy destination from day one**
   (`React.lazy` + `Suspense` at the `DemoArea` content boundary). A brand-new
   destination is a greenfield split boundary. Prove the lazy pattern there, on
   code there is no fear of breaking, before touching anything older.

2. The delicate part is `Suspense` inside `DemoArea`'s frozen-crossfade
   `AnimatePresence` tree (see the projection-tree warnings in CLAUDE.md and
   `docs/decisions/navigation-architecture-2026-06-17.md`). Solve it once, on the
   new page: the `Suspense` fallback must be a stable-sized placeholder that
   matches the demo column's dimensions, so the incoming crossfade layer does not
   jump when the real chunk resolves.

3. Prefetch the active section's `.riv` set on nav open or nav hover
   (`<link rel="prefetch">` or Rive's own preload), so tiles do not pop in one at
   a time. No bundler involvement, since `.riv` are static assets.

4. Only after the pattern is proven on Tiles, decide whether Principles adopts it
   too. Principles is the one that would move `react-canvas` off the landing, so
   it is the highest-value retrofit, and the riskiest.

## Current-state decision (why nothing changes today)

For the single-tool state the bundle is left untouched. 223 kB gzipped, loaded
once, for a tool carrying two Rive runtimes and a full animation library, is not
a load a visitor feels. The Vite 500 kB warning is a fixed generic threshold,
not a diagnosis of this app. Splitting now would either reorganize chunks for a
caching benefit that barely registers on a once-visited site, or thread
`Suspense` into the crossfade tree the docs warn hardest about, to fix a load
time nobody is waiting on.

Revisit this doc when the second Rive-heavy section lands. That is the point
where a visitor might open only one of three sections, and per-section lazy
loading stops being premature and becomes correct.

---

## Addendum (2026-07-16): the Principles retrofit shipped

Step 4 is done. The record below corrects this doc where the app had moved
under it, and states what actually shipped.

**The premise correction.** "react-canvas lives entirely in the Principles
subtree" stopped being true after this doc was written. Two more eager
importers had appeared: the Carousel demo in Token Lab's Gesture category
(`src/components/Carousel`), and the 2026-07-16 WASM CDN pin
(`src/utils/riveWasm.js`), which imported `@rive-app/canvas` eagerly from
`main.jsx` to call `setWasmUrl`. Lazy-loading Principles alone would have
moved only its component JS and left the 67 kB (gzipped) runtime glue in the
entry chunk. All three moved together.

**What shipped.**

- `PrinciplesLibrary` and `Carousel` are `React.lazy` chunks, declared in
  `TokenLab/index.jsx` with the named-export shim `MotionTilesSection` uses.
  Each usage site is wrapped in `ErrorBoundary` (outside) and `Suspense`
  (inside), the Motion Tiles pattern.
- Both chunks prefetch on browser idle from a `TokenLab` mount effect
  (`requestIdleCallback`, `setTimeout` fallback for Safari), so the fetch
  happens after the hero's `.riv` and WASM requests and the Suspense fallback
  paints only on a cold deep link to `#/principles`.
- The WASM pin split: `riveWasm.js` now pins only webgl2 (eager, the hero
  needs it at first paint); the canvas pin lives in
  `src/utils/riveWasmCanvas.js`, imported for side effect by
  `useHCContrastColors`, the one module every canvas-runtime component
  imports. ESM evaluates imports before the importing module, so the pin
  always runs before any `useRive` call can start the WASM fetch.
- Rollup placed the canvas runtime in the Carousel chunk, which the
  PrinciplesLibrary chunk imports (FollowThrough renders a Carousel), so the
  runtime loads once, with whichever side is needed first.

**Measured on built output (gzipped).** Eager JS went from 225 kB (one chunk)
to 170 kB (130 kB index plus a 40 kB shared chunk). The lazy side is 10.7 kB
of PrinciplesLibrary, 50 kB of Carousel plus runtime, and the 686 kB canvas
WASM binary, none of it reachable from first paint. Verified with Playwright
against `wrangler dev` on `dist/`: first load fetches only the eager chunks,
the webgl2 WASM, and the hero `.riv`; the two lazy chunks arrive on idle a
beat later; the canvas WASM fetches only when Principles or the Carousel demo
mounts. All 18 cards render, a card expands, the Gesture Carousel renders,
zero console errors.

**The Suspense-inside-crossfade worry, resolved.** Step 2's concern was
sized for a fallback that could move the layout. It cannot: DemoArea's
crossfade layers are absolutely positioned, so the demo column's geometry
never depends on layer content, and the fallback only has to fill its slot
quietly. The boundary sits inside the layer's content, never around the
`AnimatePresence`, so the motion.div that the crossfade manages never
suspends. That constraint is commented at the `principlesContent` site in
`TokenLab/index.jsx` and is the rule for any future lazy destination.

## Addendum 2026-07-16 (later the same day): the `.riv` prefetch half

The prefetch item's second half shipped. `MotionTilesGrid.jsx` now exports
`RIV_PREFETCH_MANIFEST`, the exact URLs its mount path fetches, built from the
same constants (`RIV_SRC`, `GROUP2_FILES`, `STATIC_FILE`, `LOGO_SRC`,
`PROBLEM_SRC`) so the list cannot drift from what the grid loads. The landing's
existing chunk-prefetch effect chains onto it: when the dynamic import
resolves, it fetches all 20 files (~400 kB) fire-and-forget at low priority,
reading each body to completion so the response commits to the HTTP cache. It
skips under `navigator.connection.saveData`, and clawd.riv is deliberately
absent (748 kB, click-gated easter egg; prefetching it would nearly triple the
payload for a tile most visitors never summon).

The pairing rule this completes: lazy answers "has the user shown interest in
this section," prefetch answers "given they are at the door, fetch what is
behind it during the idle read." Nothing loads earlier than the landing; users
who never visit the section still pay zero bytes.

Measured on built output (`wrangler dev` on `dist/`, Playwright): all 20 files
fetch as full 200s while the landing is on screen; after Enter, every runtime
request for the same URLs is a ~3ms 304 revalidation served from the primed
cache, zero full downloads, zero console errors.
