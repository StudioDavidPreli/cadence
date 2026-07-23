# Background System: Session Handoff, 2026-07-23

**For:** a clean session picking this up cold
**Status:** the whole generation and render chain is built and committed across **five commits on `main`, none pushed** (section 7), mounted in the nav behind `?bg=1`, and **not deployed**. This session: built and mounted the system, then fixed the four bugs David reported driving it (section 6b), the clearance/glass (6c), added per-visit seeding (6d), the empty-cell grid behind `?grid=1` (6e), and the reduced-motion bug (6f). Everything on the pile at the start of the session is now closed except the three things that genuinely need a human or a deploy: **the deployed build, the glass in Firefox/Safari, and every question of visual judgment.** Those are the next session.

Read this first. Then `background_system_rulings.md` for what was decided and why (it is long; sections 14 to 18 are this session). `background_system_recon.md` only if you need the evidence behind a correction.

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

**424 unit tests, 60 e2e, lint and build clean at the last commit.** (`rng` gained tests and `choreography` grew to 35 across the session; the table above is the original slice.)

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

**The baseline is the worst case, from measured rows.** (Superseded 2026-07-23, see 6c: it is the collapsed nav now, and the glass covers what gets disclosed below it. Kept because the reasoning below is what the change had to answer for.) Three section headers plus the largest section's leaves (Token Lab: Overview plus every category), multiplied by heights read from the live DOM. The collapsed accordion clips its rows with `overflow` rather than unmounting them, so a real header and a real row are always measurable. Resolves to `8 + 3x43 + 6x37 = 359px` and does not move when a section opens, so the artwork never reflows on expand.

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

## 5. Known unverified, and leads for the next session

**This section is now mostly closed.** It was written before the bug session; the strikethroughs are what got resolved. What remains is genuinely a human's or a deploy's to do.

**Still unverified, and the reason each needs the next session:**

- **The deployed build.** Never deployed. The standing rule is that verification happens on built output; the build compiles and the e2e suite passes, and the bug-session verifications ran `wrangler dev` on `dist/cadence`, but nobody has driven the flagged surface on a real deploy. Pushing `main` deploys (Workers Builds), so this and the deploy are one act.
- **The glass in Firefox and Safari.** Masking a backdrop-filtered element is the combination most likely to drop the filter; ruling 4 names it as the risk and the fallback on record is stacked zones of decreasing blur (6c). Verified in Chromium only.
- **Visual judgment, everywhere.** Every check this session was structural (attributes, computed styles, counts, contrast ratios) or driven through Playwright. Nobody has *looked* at it with design eyes: whether the grid mesh weight reads right at 8px, whether the density and clearance feel right, whether the glass tint is too heavy, whether the marks want replacing. This is the largest remaining item and it is entirely David's.

**Resolved this session (was in this list):**

- ~~**Reduced motion.**~~ Verified and its bug fixed, 6f / rulings 18. Reveal is now instant under the preference, idle off, no non-reduced flash, both faces, on built output via Playwright `emulateMedia`.
- ~~**Regeneration on window resize.**~~ Was the core of the flicker loop; fixed in 6b with a settle interval and same-value bailout on the `ResizeObserver`.
- ~~**The glass on the expanded panel.**~~ Built, 6c. It wraps the whole accordion rather than the panel alone, for reasons recorded there.

**Still worth an eye, not yet a proven problem:**

- **Scroll behaviour.** The layer is `position: sticky; height: 0` inside a scrolling column, sized to `clientHeight - paddingTop`. The overflow loop that made this fragile is fixed (6b), but nobody has watched it while actually scrolling a long accordion on a real deploy.
- **StrictMode double-invocation against the reveal guard.** The guard is a `useRef` plus a `setTimeout`; effects run twice in development. The bug-session recorder saw the reveal fire twice in dev (StrictMode), which is expected, but production is single. Confirm on the deploy.
- **`import.meta.glob` in the Worker build.** `library.js` globs SVGs eagerly. It builds, but the Cloudflare plugin's environment has surprised this project before.

**Still unruled (open questions), none blocking:** 2 (pixel arrival, pop vs scale-in, both wired), 6 (breathe coupling rate), 8 (cell size is a per-surface value and was never formally ruled; the component defaults to 8), 11 (roots), 12 (high-contrast preview). Walk item 3 (flow align) is also unruled and does not block anything. These are judgment calls for the visual pass.

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
npm test          # 424 unit tests
npx playwright test   # 60 e2e on built output
npm run lint
```

---

## 6b. Bug session, 2026-07-23 (four reported, four fixed)

David drove the flagged nav and reported constant flicker, both faces painting at once, no face change between tools, and scrollbars flashing in and out of the column. Three of the four were one loop.

**The loop.** Measured on the dev server, the nav column alternated forever between two states 150ms apart:

| | clientWidth | clientHeight | scrollWidth | scrollHeight | paths | rects |
|---|---|---|---|---|---|---|
| A | 219 | 678 | 219 | 678 | 861 | 362 |
| B | 204 | 663 | 219 | 686 | 1221 | 395 |

Read it as a cycle. The artwork sized itself to `clientHeight` and sits `padding-top` down the column, so its box ended 8px past the scrollport and the column always had 8px of scrollable overflow: a vertical scrollbar over an artwork that is pinned and does not move when you scroll it. That bar cost 15px of width. The next measurement regenerated the composition 15px narrower, but the previous SVG's width was still on the element, and `.svg { overflow: visible }` let ink and the idle sway groups spill past the box anyway, so now the column overflowed horizontally too. `overflow-y: auto` alone leaves `overflow-x` at `visible`, which the spec computes to `auto` when the other axis is not visible, so a horizontal bar was always available to take 15px of height. New height, new measurement, new composition, and the vertical overflow condition flips. Round again, forever, at ResizeObserver rate. Every lap redrew a different composition, which is the flicker, and raised and dropped both bars, which is the scrollbar flashing.

Three edits, each closing one door:

- `.svg` no longer declares `overflow: visible`. An inline `<svg>` clips to its viewport by default, which is what keeps the artwork inside the surface it was measured for. Marks clipped at the column edge are the correct trade; a background must never be able to size its own container.
- `.nav` names both axes: `overflow-x: hidden`, `overflow-y: auto`. Nothing in the navigation can overflow sideways, so nothing should be able to raise a horizontal bar.
- The measured height is now `clientHeight - paddingTop`, so the layer's box ends exactly at the bottom of the column and contributes no scrollable overflow. A sticky box contributes its unshifted position, so this holds however far the accordion is scrolled.

  The first version of that line subtracted `paddingBottom` as well, and it cost 8px of reach for nothing: a scroll container's scrollable overflow area starts as its own **padding box**, so ink ending exactly at `clientHeight` ends inside a region the column already had. Only the top padding displaces the layer. Corrected the same session, after the measurement below showed an 8.2px strip of bare column under the artwork.

Two guards on top, both aimed at the suspect in section 5: `measure` returns the previous state object when the numbers are unchanged, and the observer waits 120ms for the drag to settle before rebuilding. The settle interval is not a token. It times a measurement, not a motion.

**The face.** `NavBackground` never passed one, so `BackgroundArt` ran its `face = 'both'` default and drew the composition twice, vector under pixel. `both` is a lab affordance for comparing the two renderings; it is not a state a surface should ever be in. The face now follows the active section, per the dialect split in the 2026-07-22 handoff: vector for Principles, pixel for Token Lab. Motion Tiles postdates that split and is mapped to pixel because the tool is a grid of cells, which is a reading rather than a ruling. Geometry does not depend on the face, so a section switch swaps the rendering and regenerates nothing.

The switch is a hard swap. The reveal is one-shot and long spent by then, so the incoming face appears without animation, the same way a high-contrast composition does. Whether it wants a crossfade on `--feedback-nav-duration` is open, and the argument against is that a crossfade puts both faces on screen at once, which is the state David just asked to be rid of.

**The bottom edge is a clip, and that is now the mechanism.** Density does not taper toward the bottom of the column: per 50px band the pixel face runs 31, 52, 49, 62, 59, 88, 42, with the heaviest band the one just above the edge. The vine grows from the baseline at y=359 down to y=1213, so at a 677px surface the field is still at full strength when it reaches the bottom and 14 rects (93 paths on the vector face) are cut by the viewport. Reaching the bottom by overdrawing and letting the SVG clip works, and it is free now that the SVG clips to its own viewport rather than spilling into the column's overflow. It is not free without bound: every mark generated below the surface is a DOM node that never paints, and the current overshoot is already about one cell row plus the mark reach.

**Verified on built output** (`npm run build`, `wrangler dev` on `dist/cadence`), at 1440x900: the column holds one state, `scrollWidth` equals `clientWidth` and `scrollHeight` equals `clientHeight` (zero overflow on both axes), the artwork's bottom edge sits 0.2px off the column's, Token Lab shows 395 rects and no paths, Principles shows paths and no rects, and a theme change into high contrast repaints and reduces the composition (123 stamps to 76) without touching the column's size. 422 unit tests, 60 e2e, lint clean.

## 6c. The clearance, and the glass that was missing, 2026-07-23

David asked where the clearance actually was. Measured in nav-column coordinates, with the accordion transition disabled so each state is its settled layout:

| state | last nav pixel | first ink | gap |
|---|---|---|---|
| Token Lab open | 357.5 | 368 | 10.5 |
| Motion Tiles open | 209.5 | 368 | **158.5** |
| Principles open | 209.5 | 374.3 | **164.8** |
| all collapsed | 135.5 | 374.3 | **238.8** |

The worst-case baseline was correct in exactly one state and drew itself to a nav that was not there in the other three.

**A wrong turn, kept on the record.** The first answer was to make the baseline track the live nav, and it worked by the numbers (10.5 / 38.5 / 42.7 / 19.2) while breaking the half of ruling 4 that matters: *the background never reflows on expand*. The baseline is not only the clearance line, it is the ROOT line, because `growArmature` plants at `y = baseline`. A shorter nav does not uncover more of the same drawing, it grows a new one further up, so every disclosure became a full redraw of the field. David caught it as "the artwork is hard cutting its position on nav expand and collapse", along with the thing that would have prevented the whole detour: **the glass was never built.** Reverted the same session.

**What shipped instead: the collapsed nav as a fixed baseline, plus the glass.** The line sits under the three headers, which are the only navigation always on screen, and it never moves. Rows disclosed below it are legible because the chrome now carries the glass. The two mechanisms do not know about each other, which is why neither reflows when the other changes.

Measured on built output, all four states: first ink at 152 (pixel face) or 154.7 (vector), glass bottom riding the accordion at 385.5 / 237.5 / 163.5 (last row plus the feather padding), **698 of 698 marks identical across a toggle**, zero scrollable overflow on both axes.

**The glass, and where it departs from ruling 4.** It wraps the accordion rather than sitting on the expanded panel. Under worst-case clearance the panel is the only chrome that can land on ink; under collapsed clearance a disclosure also pushes the section headers *below* it down onto artwork, so the glass has to cover the panel and everything after it. One element also leaves exactly one free bottom edge to feather, where per-panel glass would seam at every panel/header junction. Its height is the accordion's height, so the section transition carries it: no layer animates its own height, which was the part of the ruling that mattered. The feather is a fixed 28px rather than 22% of panel depth (a percentage of the whole stack would fade the last two headers, the one place the glass is load bearing), and `padding-bottom` equal to the feather holds the fade below the last row so no label ever sits in it.

**The tint is set by WCAG, not by taste.** The nav's idle text is `--color-text-muted`, which clears AA on the bare column with little room: 5.77:1 dark, 5.27:1 light. Against the worst case the artwork can produce (a solid pixel-face cell at full `--color-text-base` directly under a label), the handoff's translucent 72% glass measures **2.65:1 dark and 2.89:1 light**, which is a fail rather than a judgement call. The minimum tint that holds muted text at 4.5:1 is 90% dark, 92.5% light, so the default is 93%: the blur is real and the artwork reads through the feathered edge, but the panel is nearly opaque where text sits. The same worst case against `--color-text-base` measures 6.46:1 and 8.77:1, so real 72% glass is available the moment the nav's idle text stops being muted. That changes how the navigation looks with the flag off too, so it is David's call and it is one line (`--glass-tint`).

**High contrast runs the same glass** (David, 2026-07-23), and the contrast argument that constrains light and dark does not reach it. Both HC themes put every nav label at maximum separation, so against the worst case those themes can produce (a cell at full `--color-accent`, since HC repaints every mark) the same 72% tint measures **13.91:1 in HC-light and 11.69:1 in HC-dark**. The artwork is thinner there anyway: 0.6 of the budget, two tone levels instead of four. The first draft took HC opaque on the theory that a translucent panel is against the grain of flat maximum-separation fields; that was taste rather than measurement, and it was overruled. `forced-colors` still takes the panel to system colors and drops the filter, because that mode substitutes backgrounds and ignores the blur regardless.

Choosing a category touches none of this.

**Not yet checked:** the glass in Firefox and Safari. Masking a backdrop-filtered element is the combination most likely to drop the filter, ruling 4 names it as the risk, and the fallback on record is stacked zones of decreasing blur.

**Still unverified after this session:** reduced motion with the preference on, the deployed build, and every question of visual judgment. Section 5's list stands otherwise.

---

## 6d. Seeding: once per visit, from the clock, 2026-07-23

The seed was the fixed prop default (11). It is now drawn once per visit.

**Why mount and nothing else.** `BackgroundArt` reveals once, on mount, and never again (ruling A, so a theme switch cannot re-reveal). A seed set at mount is choreographed by the arrival that already exists; a seed changed at any later moment, by a timer or a reroll button, is an unmotivated hard cut with no crossfade to soften it. So the seed is drawn at chunk load, which happens once when the background first mounts. No new mechanism, no new motion.

**From the full timestamp, hashed.** `hash32(String(Date.now()))`: date and time, so a new plant every load rather than once a day, hashed to a clean 32-bit integer so consecutive loads do not hand the sampler neighbouring numbers. Verified on built output, two plain visits: `2902822263` then `2029805945`. Still deterministic in the sense that matters, the drawing is reproducible from its seed, and the seed is now discoverable so the drawing is reproducible from the visit.

**Discoverable and pinnable.** The resolved seed is on the layer as `data-seed` and printed to the dev console (`seed <n> — pin with ?seed=<n>`). `?seed=<int>` overrides the visit seed with an exact value, which is ruling 4's reroll-as-lab-affordance and the way a committed seed would be chosen if the surface ever wants one specific plant forever. Verified: `?seed=42` gives `data-seed="42"`, reproducible across loads.

**The lazy boundary held.** The `?seed=` value is parsed in `backgroundFlag.js` (eager, but a URL read with no `src/background` import) and only hashed in `NavBackgroundArt` (the lazy chunk, where `rng` is already loaded). Confirmed on the built bundles: the L-system axiom strings and the `currentColor` sentinel appear only in `NavBackgroundArt-*.js`, never in the main `index-*.js`.

**Considered and not built:** a seed per tool rather than per visit, folded into the section-switch hard swap that already happens. One line, and worth trying against the per-visit seed once the per-visit version has been lived with. Not in this pass: the nav is persistent chrome, and chrome that redraws on every tool change may read as instability rather than identity.

---

## 6e. The empty-cell grid, behind `?grid=1`, 2026-07-23

David asked whether the pixel face could show the whole grid, empty cells included, in the button-outline colour so it is not distracting. Built as an opt-in. Full record: rulings section 17.

**One patterned rect, not per-cell rects.** The full lattice is ~2400 cells at 8px against ~400 inked, so per-cell empty rects would 6x the DOM for pure structure. It is a single `<rect>` filled with an SVG `<pattern>` tiling from the origin, which aligns to the same cell lattice the inked rects use. Static: no reveal, no breathe, present from the first frame with the ink arriving into it.

**`--color-border`,** the subtle-outline role that grid lines genuinely are, quiet in light and dark (~1.3:1). That token is pure black/white in both HC themes, where a solid mesh would be a loud lattice, so **high contrast gets sparse dots at the intersections** instead of continuous lines (the DemoField HC-sparse philosophy). Grid top snaps to the first cell boundary at or below the collapsed baseline, so it never draws behind the always-visible headers; `crispEdges` keeps the lines from fuzzing.

Pixel face only, gated on `?grid=1` alongside `?bg=1`, and an Empty-grid control on the standalone route. The grid code stays in the lazy chunk (`bg-grid` is absent from the main bundle). Verified in the nav: line mesh at `#2e2e2e` / `#e2e2e2`, dots at `#ffffff` / `#000000`, grid top 136 against ink at 160. **Not verified: whether the mesh weight reads right — that is a visual-pass question.**

## 6f. The reduced-motion bug, 2026-07-23

The one unverified ruling, reproduced with Playwright `emulateMedia` (the in-app browser pane cannot emulate the preference). Two linked defects. Full record: rulings section 18.

**The race.** `BackgroundArt` read the preference through framer-motion's `useReducedMotion`, which resolves a tick after first render. On that first render it can report no-reduce even when the preference is on, so the reveal and idle briefly mount with full non-reduced timing before correcting: a flash of the motion the preference exists to suppress, timing-dependent and intermittent. Fixed by reading `useMediaQuery('(prefers-reduced-motion: reduce)')`, whose `useState` initializer reads `matchMedia` synchronously, so the first render already knows.

**The window.** The reduced reveal window was `8 x delay.long` from `useMotionTokens`, and those tokens flatten to 0 in an effect, a tick late as well. So the window raced the flattening (1.6s on first render, 0 after). Fixed by taking the reduced window from a fixed `CHOREOGRAPHY.reducedWindow`, token-independent, so it is deterministic from the first frame.

**Instant, David's call.** `reducedWindow` is set to **0**: under the preference the whole composition appears at once, each cell over the 0.01s reduced duration so transition events still fire. The gentler minimal-motion reading, overriding the handoff's four-step stop-motion. It is one constant away (`reducedWindow: 0.24`) if the call is revisited.

Verified on built output, both faces: reduced reveal shows a single `0s` delay across every cell, cells only ever pass through the `0.01s` reduced pop (never a `0.2s` non-reduced frame), the idle renders zero groups, and with the preference off the idle runs as before. **Follow-up owed:** a permanent e2e test under `page.emulateMedia({ reducedMotion: 'reduce' })` — `test.use({ reducedMotion })` no-ops in this suite. Skipped because the surface is unshipped and flag-gated; add it when the flag comes off.

---

## 7. Commits

**Five commits on `main`, none pushed.** Pushing deploys (Workers Builds rides pushes to `main`), and David asked for deploy to be its own session, so the whole session sits local and reviewable.

```
e08b5e2  feat(background): reduced-motion reveal is instant (reducedWindow 0)
b3746b2  fix(background): reduced-motion reveal race and instant-instead-of-stop-motion
f461e8f  feat(background): empty-cell grid behind ?grid=1, with a high-contrast branch
cbea508  fix(background): collapsed-nav baseline, glass, overflow, seed and tuning params
8698317  feat(background): glyph L-system background system, mounted in nav behind ?bg=1
```

`8698317` is the system and its mount. `cbea508` is the bug-session work (the flicker loop, the face-per-section, the seeding, the glass and clearance — 6b/6c/6d); it was split back out of the grid commit after `git add -A` swept it in, which is why its history is separate. `f461e8f` is the grid (6e). `b3746b2` and `e08b5e2` are the reduced-motion fix and the instant decision (6f).

To deploy, push `main`. There is nothing to stage: the working tree is clean.

`archive/` is gitignored, so the labs (`raster-harness.html`, `background-route.html`), `build-marks.cjs` and the 32-mark test library are **not in any commit**. They exist on this machine only; a clean checkout elsewhere will not have them, and the mark library that ships is the six in `src/background/marks/`.

---

## 8. Where a clean session starts

1. **Look at it.** `npm run dev`, open `http://localhost:5173/?bg=1#/token-lab` above 1024px, add `&grid=1` for the grid, switch themes, switch tools. This is the visual pass nobody has done. The open questions in section 5 are the specific calls waiting on it.
2. **Firefox and Safari,** for the glass (6c) — the one cross-engine risk on record.
3. **Deploy** when David is ready: push `main`, then drive the flagged surface on the real deploy. That closes the last standing verification (section 5).
4. Everything else — the still-unruled open questions, the seed-per-tool experiment (6d), the FM/grid follow-ups — is optional and downstream of the visual pass.

Nothing is blocked. The system is complete, tested, and off by default; the remaining work is judgment and a push.
