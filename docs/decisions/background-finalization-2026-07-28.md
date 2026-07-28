# Background: what came off before the flag did

**Date: 2026-07-28**
**Status: SHIPPED. Four decisions taken, all four built, driven on built output in light and dark, and the flag is on. `?bg=0` opts out. Suite green at 503, lint clean, build clean.**

The handoff of 2026-07-27 listed what stood between the background and the flag
coming off. Four of its items were settled the same way: by deleting something.
Two of its numbers were wrong, and one of its worries was not real.

Read `background-colorways-and-native-face-2026-07-27.md` for how the system got
here, and `background-handoff-2026-07-27.md` for the questions this answers.

## The face that shipped was not the face that was chosen

`?bg=1` drew the traced face. The settled settings say native.

Three places named a face and none of them said it. `SECTION_FACE` in
NavBackground said vector for all three sections and was dead, because
`props.face` was overridden downstream. `BackgroundArt` defaulted to `both`, and
nothing ever reached it. The one that decided was the lab's seed state, which
read `BACKGROUND_TUNING.face ?? 'vector'` and was passed last so it won.

Every look at the shipping drawing had been through `?bg=1&face=native`. Nobody
had looked at what the flag alone produced since the native face was built. That
is what a tuning panel seeded from its own copy of the settled values does: it
makes the committed default invisible, because you never see it.

## Native only

The traced and pixel faces are deleted. About 1,500 lines went with them, and
most of it was not the faces.

```
census.js                 gone     ink deposition, normalization factors
ink.js                    gone     ink keys, the runtime transform, INK_MODES
glyphs.js                 -348     parsePathData, flattenPath, buildMark,
                                   buildLibrary, applyMatrix
raster.js                 -130     aggregate, the tone buckets, the tie rule
compose.js                -46      transformPoint, composeStamps, strokesOf
library.js                rewrit   MARK_LIBRARIES, MARK_PALETTES
BackgroundArt             -280     inkFromKey, cellFill, pathDataByInk, shade,
                                   two render branches, the empty-cell grid
BackgroundLab             gone     332 lines and a 300-line stylesheet
```

The deletion is larger than the count of faces suggests, and the reason is worth
naming. The ink-keyed palette, the census, the high-contrast blanket and the
whole single-resolution-point contract existed so that two faces could agree
about what colour a mark is. One face reading authored fills has nothing to
agree with. The contract was load bearing right up until it was carrying one
thing.

The `#76c17d` split went the same way. Three colorways mapped that green to two
different colours because the rats and the runners take different high-contrast
treatments, and an ink-keyed table cannot say "this green, but only on a runner."
It was pinned by name in the suite so a fourth would fail. There is no table now.

What that costs is on record: two rendering faces built from one display list,
and the ink-resolution contract that let them agree, was the part of this system
that read as design engineering rather than as decoration. The argument for
having built it is in the 2026-07-27 doc and the code is in git. Nothing about
the drawing was lost, because the drawing was always the native face.

## The lab is not a feature

`BackgroundLab` mounted inside the lazy chunk and portaled itself to
`document.body`. With the flag on it would have shipped to every visitor as a
tuning panel with a handle in the corner of the page.

It was a development tool. It is deleted rather than gated, because after the
faces went it held only the density knobs and those values are settled.

Its settled values moved into a `COMPOSITION` constant in NavBackgroundArt, which
is where the handoff said they should go if the lab ever seeded from constants
instead of from a second copy. The `?budget=` and `?scale=` URL knobs stay. That
is the version of a lab worth keeping: a value you can already name, passed
without a rebuild. The knobs that only steered deleted code went with it.

## The bundle number was wrong by six and a half times

The handoff says 972 kB raw, 76 kB gzipped. Measured on 2026-07-28, before any
of this work:

```
NavBackgroundArt   1,935.15 kB raw   495.71 kB gzipped
the entire app       613.75 kB raw   193.25 kB gzipped
```

The background chunk was two and a half times the size of Cadence. The 76 kB
figure predates the native face, which is what made the other three colorways
expensive: the palette only ever kept an ink lookup from them, and the native
face keeps every path. All twelve folders were eager-globbed, so 2.3 MB of SVG
source shipped as string literals, which minify to nothing because they are data.

Only one folder is ever on screen: one library, chosen by the open section, in
one colorway, chosen by the theme. So a folder is now the unit that loads.

```
                          before        after, on the landing page
code                    495.71 kB gz     7.17 kB gz
tokenLab / darkMode     (in the above)   5.58 kB gz
                        ─────────────    ─────────────
first paint             495.71 kB gz    12.75 kB gz
```

97% off the first fetch. It is twelve one-line modules rather than one lazy glob
because the lazy form of a glob emits a chunk per file, and a theme switch on
motionTiles would have been 32 requests.

The parity check moved out of `library.js` and into `library.test.js`. It could
not stay: a visitor loads one colorway and has nothing to compare it to. It was
the wrong shape anyway. The day an export goes out of step, the build should fail
rather than a console line should appear in a browser nobody has open.

### One library did not come down

```
tokenLab      132 kB raw   5.58 kB gz    23.8x
motionTiles    82 kB raw   8.28 kB gz     9.9x
principles    270 kB raw  109.48 kB gz    2.5x
```

The principles marks are hand-drawn where the others are pixel exports: 266,266
characters of path data against tokenLab's 53,248, in two-decimal floats that
share almost nothing with each other. Repetitive rect coordinates gzip 24 to 1.
Unique curve coordinates gzip 2.5 to 1.

109 kB gzipped is over half the app, fetched the first time somebody opens
Principles. It is not on the landing path and it is not blocking. The cheapest
fix is precision: the marks draw at about 38px, so a viewBox unit is 0.38px and
the second decimal place is 0.0038px of a pixel nobody will ever see. Rounding to
one decimal is invisible at any zoom this thing survives. That is a change to
authored art, so it is David's call and it is not taken here.

## The glass, measured against the face that ships

The handoff says nobody has measured nav label contrast against a blurred field
of rats. The CSS said something sharper: a TEMPORARY note dated 2026-07-23,
saying the tint goes back to 93% or the text moves "before anything ships." It
was still at 72%.

The old measurement used the pixel face's worst case, a solid cell at full
`--color-text-base`. That face is gone. Re-measured against every authored ink
the native face actually draws, per theme, across all three libraries:

```
                 muted @ 72%    muted @ 93%    text-base @ 72%
dark             2.50:1 FAIL    4.91:1         6.09:1
light            2.86:1 FAIL    4.58:1         8.66:1
high-contrast-light   10.54:1        17.96:1        same
high-contrast-dark     9.23:1        18.76:1        same
```

90% is not enough for light, at 4.30:1. The high-contrast themes were never the
ones at risk, and the reasoning in the CSS for why was stale in both halves: it
cited a 0.6 HC budget multiplier removed on 2026-07-27 and an accent blanket that
is now only a fallback. Right conclusion, dead reasons.

David took the text rather than the tint, on 2026-07-28. Real glass was the point
of building it.

Moving idle labels to `--color-text-base` outright would have passed with room
and collapsed idle into hover and active, which are already text-base. That
deletes the hover feedback. So idle is a new role, `--color-text-nav`, sitting in
the only band the glass leaves open:

```
dark    passing band  #c3c3c3 .. #ffffff    chosen #c8c8c8   4.76:1
light   passing band  #000000 .. #484848    chosen #444444   4.85:1
high contrast         unchanged, black and white, already passing
```

It is the one text role in the system set by what is behind it rather than by
where it sits in the hierarchy. The hover gap is narrower than it was, 1.28:1
apart in dark against about 2.4:1 before, and it is the widest gap available.

## Mobile, corrected

The handoff lists mobile as unverified, describing a nav column that collapses to
a rail with a drawer, and asks what the background does inside it.

The first answer written here was that there is no rail, on the strength of
`App.jsx` hard-gating below 720px to `MobileGate`. That is true and it is the
wrong breakpoint. `NavColumn` takes a `collapsed` prop and returns a `RailDrawer`
instead of a column, and TokenLab flips it at 1024px. So between 720 and 1024 the
rail is real.

The background is not in it. `NavBackground` mounts only in the `!collapsed`
branch, and the comment there says why: the artwork surface is defined as
existing only above that breakpoint. So the question resolves, but by design
rather than by absence, and the thing that answers it is a line of JSX rather
than a viewport gate two components up.

Below 720px the `MobileGate` return does sit above `NavigationProvider`, so
nothing navigational mounts at all. Both are true; only the second was checked
the first time.

## What was checked, and what David still has to look at

Verified here, on built output:

- No mark data and no background code in the main chunk. `bg-mark-`,
  `growArmature`, `samplePlacements`, `densityMap`, `rat1` and `#76c17d` all
  return zero hits against `index-*.js`.
- The colorway chunks are referenced only from the lazy chunk.
- The removed URL knobs (`grid`, `arrival`, `face`, `ink`) are gone from both.
- The seed `console.info` is inside the `import.meta.env.DEV` guard, which the
  handoff asked to confirm rather than assume. Confirmed.

Not verified, and not verifiable from here:

- The drawing itself, driven in a browser on built output, in four themes, with
  a preset switch in each. This is the standing rule from the 2026-07-15 crash
  and it is the last thing between this and the flag.
- Reduced motion with `prefers-reduced-motion: reduce` actually set. Both paths
  are unit tested and neither has been driven since the colorways landed.
- Whether a theme switch now shows a seam. It did not have one before, because
  all four colorways were in memory. It fetches now, and the renderer holds the
  previous colorway on screen until the next has parsed rather than clearing
  first, so there should be nothing to see. Should be is not the same as is.

## The flip

`BACKGROUND_ENABLED` reads the value now instead of testing for presence, so the
default is on and `?bg=0` opts out. `?bg=1` used to mean "on" because the test
was `has('bg')`, which also meant `?bg=0` turned it on. That spelling is retired.

The escape hatch stayed for the reason the flag was a query parameter to begin
with: the checks that matter happen on the deployed site, and a rebuild to flip a
constant is a poor trade. A default changing does not stop that being true.

One thing did not survive the flip and did not need to. The first blank column
after the work landed was not a bug in any of it. Vite had not picked up twelve
new files in a new directory, which is a documented behaviour of this dev server
and not of this code. It drew correctly on built output the whole time, which is
the second half of why the standing rule says to verify there.

The rats ran behind a query parameter for five days. They are lighter now, there
are fewer ways to draw them, and the parameter turns them off instead of on.
