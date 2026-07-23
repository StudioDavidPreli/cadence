# Background System: Session Handoff, 2026-07-23

**For:** a clean session picking this up cold
**Status:** the whole generation and render chain is built and committed, mounted in the nav behind `?bg=1`, and **not deployed**. David reports bugs. Deploy and debugging are deliberately a separate session.

Read this first. Then `background_system_rulings.md` for what was decided and why (it is long; sections 14 to 16 are this session). `background_system_recon.md` only if you need the evidence behind a correction.

---

## 1. What exists now

Seven modules under `src/background/`, all pure, all unit-tested. One React component. One flagged mount.

| module | owns | tests |
|---|---|---|
| `rng.js` | hash draws vs the sequential stream, and the boundary between them | 17 |
| `lsystem.js` | rewriting, turtle, ruleset profiles, growth guard | 42 |
| `glyphs.js` | path parsing, the owned flattener, paint resolution, viewBox normalization | 54 |
| `raster.js` | Amanatides-Woo traversal, density map, committed aggregation | 45 |
| `compose.js` | hash-keyed sampler, stamp transform, display list | 37 |
| `choreography.js` | reveal timing, idle table, y-band grouping | 33 |
| `library.js` | build-time `import.meta.glob` of the mark library | — |

Plus `src/background/marks/` (six placeholder marks and the authoring README) and `src/components/BackgroundArt/` (the renderer and its CSS module).

**422 unit tests, 60 e2e, lint and build clean at commit time.**

---

## 2. How it is placed into the nav

Four files, and the arrangement matters more than any of them individually.

```
NavColumn/index.jsx        holds navRef, renders <NavBackground> as a DIRECT child of <nav>
  └── backgroundFlag.js    BACKGROUND_ENABLED, read once at module scope
  └── NavBackground.jsx    measures the column, computes the baseline, resolves the palette
        └── NavBackgroundArt.jsx   the lazy chunk: holds every heavy import
              └── BackgroundArt     the renderer
```

**The flag.** `?bg=1` anywhere in the query string. `https://cadence.davidpreli.com/?bg=1#/token-lab`. A query flag rather than a build constant because the checks that matter are on the deployed site; the app's routing lives in the hash so a query parameter sits beside it without colliding.

**The lazy boundary is `NavBackgroundArt.jsx`, and it exists only to hold imports.** `NavBackground` imports it dynamically; every heavy import (the mark library, the L-system, the flattener, the renderer) lives inside it. That is what keeps the flag honest: with the flag off, the built main bundle contains none of the background code, and at runtime none of those modules is requested. Verified both ways. Same split shape the Motion Tiles grid chunk uses.

**`.nav` must be a stacking context, and this is the single most important line in the mount.**

```css
.nav { isolation: isolate; }   /* NavColumn.module.css */
```

The artwork layer paints at `z-index: -1`, which puts it behind the nav items while staying above the column's own background. The second half of that only holds if `.nav` is a stacking context. Without one, a negative-z child paints *behind* the parent's background, and `.nav` sets an opaque `--color-bg`, so the artwork vanishes with **no other symptom**: the DOM is full of correct paths and rects with correct fills, and every computed style on the artwork looks right. `position: relative` alone does not create a stacking context. `BackgroundArt` carries a dev-only `console.warn` for exactly this.

**No wrapper element.** `NavBackground` renders the artwork as a direct child of `<nav>`. A wrapper would sit between the layer and the element whose stacking context it depends on, and the dev-time host check would then inspect the wrapper and miss the real problem.

**Above 1024px only.** The mount is inside the `!collapsed` branch. Below that the nav is a rail and drawer, not a column, and the artwork surface is defined as existing only above the breakpoint. With the flag on at 960px, nothing mounts and the chunk is never requested.

**The baseline is the worst case, from measured rows.** Three section headers plus the largest section's leaves (Token Lab: Overview plus every category), multiplied by heights read from the live DOM. The collapsed accordion clips its rows with `overflow` rather than unmounting them, so a real header and a real row are always measurable. Resolves to `8 + 3x43 + 6x37 = 359px` and does not move when a section opens, so the artwork never reflows on expand.

**Clearance gates centers; ink has extent.** The density baseline is pushed down by the worst case a stamp can reach: half the normalized span along its diagonal (a rotated mark presents a corner, not an edge) at maximum scale, plus placement jitter. Without it, ink landed at y=334 against a 359 baseline, behind the last nav header.

**Palette via `MutationObserver`, not an effect.** `ThemeProvider` writes `data-theme` on the root. A child's effects run before its parent's, so reading tokens in `NavBackground`'s own effect samples one theme behind. Do not "fix" that with `requestAnimationFrame`: rAF does not run in a background tab, which leaves the palette on its initial value for anyone who switches away during load. The observer fires on the mutation and needs neither correct ordering nor a frame.

---

## 3. How this differs from the original lab tests

The labs are `archive/backgroundSystem/*.html` and `*.jsx`. **`archive/` is gitignored**, so they are on disk on this machine but not in git history. If you are on a different machine they will not be there.

Where production and the labs disagree, production is right and the difference is deliberate.

| | lab | production |
|---|---|---|
| **surface width** | 300px | **220px**. 300 was `--col-controls`, not `--col-nav`. Everything tuned before the retarget was tuned at the wrong width and does not count. |
| **flattening** | `getPointAtLength` on live DOM | owned flattener. Browser numerics are not bit-identical across engines and ignore element transforms, which breaks same-seed-same-drawing. Subdivision is the standard chord-error bound, not a heuristic. |
| **sampler** | N draws from a cumulative distribution | per-cell expected count with hash-keyed draws. The sequential form reshuffles the entire composition when the field gains one row (6% survives); the hash form degrades in proportion to growth (96% survives one added row). Budget becomes approximate, by design. |
| **idle grouping** | two independent sorts (vector by stamp index, pixel by scanline) that happened to co-locate | one explicit y-band partition both faces derive from. The lab's coupling was emergent and would have silently decoupled the first time either face changed its reveal order. |
| **ink resolution** | resolved before aggregation, in one place | aggregation runs on a stable ink **key**; the key resolves at paint time for both faces. Needed because the geometry memo must not depend on the theme (ruling A) while both faces must still agree. |
| **idle amplitudes** | derived per preset from `scale.subtle` | frozen constants (3px, 0.24, 4800ms) derived once from Standard. The idle is chrome; it must not answer Explore mode. The period lives in `motion.css` as `--feedback-background-idle-period`. |
| **reveal** | replayed freely on any regenerate | runs **once**, on mount. A mount-scoped guard drops the arrival class and inline timing after the first reveal lands, so a later composition simply appears. |
| **pixel arrival** | scale-in (`stampIn`) on both faces | **pop** (opacity only) is the default; scale-in is behind a prop. The pixel face is then transform-free for its whole lifetime. |
| **clearance** | fixed `NAV_Y = 140` | worst-case baseline measured from real rows, plus the mark-reach offset. |
| **traversal guard** | flat `4000` that truncated silently | derived per segment from its own length; callers tally truncation. |
| **tie-break** | inline `Math.round` | `bucketOf()`, a named exported function, so the ruling is testable in isolation. |
| **library** | 32 test SVGs with literal `#232323` | six committed marks; the failing ink is **authored** `fill="currentColor"`, which is ruling 2b expressed in the file rather than mapped at build time. |
| **theme change** | regenerated and re-revealed | no reveal on any theme switch (ruling A). Crossing into high contrast changes the composition but it appears without animation. |

The archive labs still have value: `raster-harness.html` renders the production modules with controls and a smoke test, `background-route.html` renders the real component standalone in all four themes, and `build-marks.cjs` reports inks, multi-colour marks, viewBox spread and skipped shapes for any directory.

---

## 4. Debugging steps taken, and what each one cost

Recorded because most of these look like something else when you hit them.

1. **Nothing rendered at all** on the standalone route. Cause: the host was not a stacking context, so the `z-index: -1` layer painted behind an opaque background. Symptom is indistinguishable from "the component is broken": 553 correct paths in the DOM, correct fills, correct computed styles. Diagnosed by checking whether the host created a stacking context, not by looking at the artwork.

2. **Stage collapsed to 2px wide.** A flex item with default shrink. Only visible because I was reading `getBoundingClientRect`, and partly an artifact of a zero-width viewport (see 9).

3. **High contrast coloured the vector face but not the pixel face.** Cause: ink resolved where each face paints. The pixel face does not paint strokes, it paints cells whose dominant ink was decided during aggregation. Fixed by aggregating on an ink key. Only visible in high contrast, because in light and dark the authored and resolved colours coincide.

4. **Marks ignored the `--color-text-base` binding.** The component was correct; the library declared zero token-bound paths. The six near-black marks still carried the literal hex. Fixed by authoring `currentColor` in the committed marks, and by a non-destructive `--bind=` flag in `build-marks.cjs` for the archive copy.

5. **Palette one theme behind.** Child effects run before parent effects, so the token read happened before `ThemeProvider` wrote `data-theme`. Light rendered dark's text-base; high contrast rendered light's accent.

6. **Palette stuck at `#000` entirely.** My fix for (5) used `requestAnimationFrame`, which does not run in a background tab. Worse than the bug it fixed, and it would have hit any user who switched tabs during load. Replaced with a `MutationObserver`.

7. **Ink behind the nav labels.** Clearance gates placement centers; stamps have extent. Fixed by offsetting the density baseline by the worst-case mark reach.

8. **A live production bug found en route.** `feedbackDuration.js` used a bare `parseFloat(raw) / 1000`, assuming `ms`. The minifier ships `--feedback-nav-duration` as `.36s`, so `navDurationSeconds()` returned 0.00036 instead of 0.36 in the built app. Every JS-driven chrome transition has been running a thousand times too fast in production. The CSS-side uses were always fine, which is why it survived. **This fix is unrelated to the background system and is worth a separate look.**

9. **Verification-environment traps**, all of which cost real time and all of which look like code bugs:
   - The Claude browser pane reported a **0x0 viewport**; a paragraph measured 1459px tall because text wrapped one word per line. `resize_window` fixes it. Any layout measurement taken before resizing is meaningless.
   - **rAF never ticks** in that pane (it is a hidden tab). This turned an intermittent real bug into a deterministic one, which was lucky.
   - The archive route path **307-redirects** to its extension-less form, so `curl` without `-L` grades an empty body and everything looks missing.
   - Vite extracts an inline `<script type="module">` into a separate **html-proxy** module, so grepping the served HTML for the page's own JavaScript finds nothing and proves nothing.
   - The dev server died mid-session and the page went blank. Console said "server connection lost", not anything about the code.
   - Minified identifiers are renamed, so verifying code-splitting needs markers that survive: string literals like `currentColor`, CSS class names like `swayX`.

Three bugs were also caught by tests during the build rather than in the browser: a draw-order dependence in per-cell dominant ink (two strokes crossing a cell by exactly equal length let `Map` insertion order decide), a wrong claim about what a cancelled cell's tone resolves to (`sin(PI)` is 1.2e-16, not 0, so it lands in bucket 1 rather than 0), and a flattener tolerance test that measured distance to the nearest polyline *vertex* rather than the nearest *segment*.

---

## 5. Known unverified, and leads for the bug session

David reports bugs but has not described them yet. **Get the symptoms first**; the list below is what I already know is unproven, not a diagnosis.

**Never verified at all:**

- **Reduced motion, with the preference actually on.** The last unverified ruling. `idleTimings` returning null and the four-step quantization are unit-tested and the CSS module has an `@media` block, but the real behaviour has never been exercised in a browser, on either surface. This is where I would look first if anything about motion is wrong.
- **The deployed build.** Never deployed. The standing rule is that verification happens on built output; the build compiles and the e2e suite passes, but nobody has driven the flagged surface on a real deploy.
- **Visual judgment.** I never saw this render. Every check was structural (attributes, computed styles, counts). Anything about how it *looks* is unassessed.

**Suspects I would investigate first:**

- **Regeneration on window resize.** `NavBackground` observes the nav with a `ResizeObserver` and sets `width`/`height` into state; the geometry memo depends on both. Dragging a window edge will regenerate the whole composition on every observed frame. Expect flicker or jank, and consider debouncing, quantizing the measured size, or regenerating only on a meaningful change.
- **Scroll behaviour.** The layer is `position: sticky; height: 0` inside a scrolling column, sized to `clientHeight`. Correct in principle (the DemoField pattern) but never watched while actually scrolling a long accordion.
- **StrictMode double-invocation against the reveal guard.** The guard is a `useRef` plus a `setTimeout`; effects run twice in development. It behaved correctly in the checks, but it is the kind of thing that differs between dev and prod.
- **`import.meta.glob` in the Worker build.** `library.js` globs SVGs eagerly. It builds, but the Cloudflare plugin's environment has surprised this project before.

**Ruled but unbuilt:**

- **The glass on the expanded panel.** Section 4 of the rulings: a property of the expanded panel, riding the accordion's own `grid-template-rows` transition on `--feedback-nav-duration`, with a feathered base via `mask-image`. Nothing in `NavColumn` implements it. The feather technique was proven in the 220px lab and carries a Firefox caveat.

**Still unruled (open questions):** 2 (pixel arrival, pop vs scale-in, both wired), 6 (breathe coupling rate), 8 (cell size is a per-surface value and was never formally ruled; the component defaults to 8), 11 (roots), 12 (high-contrast preview). Walk item 3 (flow align) is also unruled and does not block anything.

---

## 6. How to run it

```bash
npm run dev
```

- **In the nav:** `http://localhost:5173/?bg=1#/token-lab` — needs a viewport above 1024px, and drop `?bg=1` to turn it off.
- **Standalone, all four themes with controls:** `http://localhost:5173/archive/backgroundSystem/background-route.html`
- **The pure modules with a smoke test:** `http://localhost:5173/archive/backgroundSystem/raster-harness.html`

Use those exact paths. `/raster-harness.html` at the root returns 200 but silently serves the app's `index.html` via the SPA fallback, which looks like the harness being broken. Restart Vite rather than reloading after adding files or imports, and add a `?v=2` if a page looks stale.

```bash
npm test          # 422 unit tests
npx playwright test   # 60 e2e on built output
npm run lint
```

---

## 7. Commit

Everything above is committed to `main` in one commit, **not pushed**. Pushing deploys (Workers Builds rides pushes to main), and David asked for deploy to be a separate session.

`archive/` is gitignored, so the labs, the standalone route, `build-marks.cjs` and the 32-mark test library are **not in the commit**. They exist on this machine only.
