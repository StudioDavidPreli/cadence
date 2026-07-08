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
