# Mark library

Hand-drawn marks for the background system. One mark per file. Loaded at build
time by `src/background/library.js` through `import.meta.glob`, flattened by the
owned flattener in `src/background/glyphs.js`, and scattered along an L-system
armature by `src/background/compose.js`.

**These six are placeholders.** They are David's own test marks, promoted from
`archive/backgroundSystem/testSVGS` so the system had a real library to run on.
Replace them with traced work; nothing here is precious, and the loader does not
care how many files there are.

## Authoring spec

Every file:

- **`viewBox`, always.** The attachment point is the viewBox **center**, and the
  author positions ink relative to it. This is the origin ruling: where a mark
  attaches is a design decision, not a bounding-box accident, so the loader
  scales by the viewBox and never re-centers on the ink. A mark drawn in one
  corner of its viewBox stays in that corner.
- **No `width`/`height` needed.** That requirement came from a Canvas
  `drawImage` bug this system never touches, since it renders inline SVG.
- **`<path>` only.** `circle`, `rect`, `line`, `polyline`, `polygon` and
  `ellipse` are skipped with a warning: only `path` carries a `d`. Convert
  primitives to paths on export.
- **One mark per file.**

## Paint

A mark's paint is either a literal colour it owns, or `currentColor` to take the
theme's ink.

```svg
<path fill="#e0563a" d="..."/>        <!-- keeps this ink in light and dark -->
<path fill="currentColor" d="..."/>   <!-- resolves to --color-text-base -->
```

Both are per **path**, not per file, so one mark can carry more than one ink.

`currentColor` is the marker, not the mechanism. The renderer resolves it in
data, once, ahead of aggregation, so the vector face and the pixel face cannot
disagree about what colour a mark is. Nothing relies on CSS inheritance.

In both high-contrast themes every mark is repainted to `--color-accent`
regardless of what it declares, so paint choices only differ in light and dark.

### The constraint that actually bites

**A literal ink has to survive two opposite backgrounds.** `--color-bg` is
`#141414` in dark and `#f5f5f5` in light, and the same ink sits on both. Measured
against both, the practical band is roughly 2:1 to 9:1; a background wants to be
quiet, so the low end is fine and the high end is loud.

Anything near white dies on the light background. Anything near black dies on the
dark one: `#232323` measures **1.17:1** on dark, which is invisible. That is why
`mark-30.svg` is authored `currentColor` here while it carries `#232323` in the
archive copy. If a mark wants to read as text-weight ink, declare
`currentColor` and let it flip with the theme rather than picking a dark hex.

Mid-luminance colours survive both. Check a new ink against both backgrounds
before committing it.

## Checking a library

`archive/backgroundSystem/build-marks.cjs` reports inks, multi-colour marks,
viewBox spread, skipped shapes and unresolvable paint for any directory:

```
node build-marks.cjs ../../src/background/marks /dev/null
```

`archive/backgroundSystem/background-route.html` renders a library in all four
themes with both faces.
