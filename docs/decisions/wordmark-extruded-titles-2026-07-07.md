# Wordmark: extruded pixel + handwritten titles, scale, per-theme color (2026-07-07)

Status: RESOLVED. Both "Cadence" wordmarks in the top bar were re-authored by David
with an extruded shadow layer replacing the old dilated outline, re-scaled from a
mock, and given design-first per-theme colors. Rendering confirmed by David.

The top bar shows one of two marks depending on section (see `Wordmark/index.jsx`):
the pixel title in Token Lab / Overview, the handwritten script in Principles.

---

## The two artworks

Both are Illustrator exports authored to the same two-layer convention as each
other: an `#textExtruded` shadow layer drawn first, then `#text` letterforms on top.

- **Pixel title** — `public/titleSVGS/title2.svg`, viewBox `0 0 976 208`. Inlined in
  `Wordmark/index.jsx` (118 rects). Replaces the earlier outline+text pixel mark.
- **Handwritten script** — `public/titleSVGS/newCadenceHW.svg`, viewBox
  `0 0 1249.6 236.9` (~5.27:1). Inlined in `Wordmark/ThemedMark.jsx` (25 extrude
  paths + 1 polygon, 3 letterform paths). Replaces `cadence_handwritten_lower_themed.svg`.

**Inlining rule (unchanged from the prior marks).** Both are inlined, not loaded via
`<img>`, so the two fills can read the app's `--hero-*` custom properties and follow
the theme; an `<img>` is an isolated document and would freeze on the authored
colors. Inlining strips the Illustrator `<style>`/`.stN` classes and sets one fill
per group: the extrude collapses to `--hero-outline`, the letterforms to
`--hero-glyph`. No `fill-rule`: these are clean Illustrator exports whose compound
paths knock out their own counters under the default nonzero winding (the old
handwritten art needed `evenodd` because it was a potrace trace; this one does not).

---

## Scale (measured, not eyeballed)

David supplied `titleMock.png` (a 2636x1874 retina capture, DPR 2.0 confirmed by
measuring the fixed columns: controls 600px img / 300 CSS, nav 440 / 220) showing
the title at his preferred size.

- **`.mark` 36.3px -> 48.2px.** The preferred glyph reads ~26px CSS tall. `title2`'s
  ink fills only 112 of its 208 viewBox units in height (it carries internal vertical
  padding), so the element height is `26 x 208/112 ~ 48.2`. Height- and width-based
  measurements agreed at 48.2, so the value is solid. The old 36.3px suited the old
  outline art, which filled its viewBox nearly edge to edge; the extruded art needs a
  larger box to read at the same optical size.
- **`.themedMark` sized by HEIGHT to 48.2px** (was width 170px). There is a documented
  invariant that swapping sections must not change the top-bar row height, and the
  header sizes to the mark. Matching the pixel mark's element height guarantees a
  constant row height; the handwritten's ~5.27:1 viewBox then sets width (~254px). The
  two are kept in step by hand (separate literals, the existing pattern).
- **Known optical caveat.** Because `title2`'s glyph fills only ~54% of its box height
  while the handwritten fills more of its own, at equal element height the script word
  can read a little larger than the pixel word. That is a property of the two artworks,
  not a sizing error; matching element height is what holds the row height constant.

---

## Per-theme title color (design-first, decoupled from accent)

`src/tokens/color.css`. Previously `--hero-glyph`/`--hero-outline` were `:root`
references to `--color-text-base` / `--color-accent`, so the title tracked the accent.
David changed this: the wordmark is now treated as a design-first graphical element
whose title colors are decoupled from the system accent.

- Defaults (dark, and light glyph): `--hero-glyph: var(--color-text-base)`,
  `--hero-outline: var(--color-accent)`.
- `light`: `--hero-outline: #b9b0ff` (lavender, lighter than the light accent).
- `high-contrast-*`: `--hero-outline: #262626` (near-black halo),
  `--hero-glyph: #e8b86d` (amber letterforms), both HC modes.

Selector specificity: the `[data-theme=...]` overrides are (0,2,0), outranking the
`:root` defaults (0,1,0), so they win regardless of source order.

Contrast: these are decorative title colors, not body text, directed deliberately. In
HC-light the amber glyph is ~1.5:1 on white and the near-black outline (~15:1) carries
legibility; in HC-dark the amber glyph carries it (11.5:1 on black) and the outline
recedes. Because no element other than the pixel title reads `--hero-*`, this does not
touch the WCAG audit for accent-as-UI.

---

## Files / commits

- `public/titleSVGS/title2.svg`, `public/titleSVGS/newCadenceHW.svg` — new sources
- `src/components/Wordmark/index.jsx` — pixel title2 inlined, viewBox `0 0 976 208`
- `src/components/Wordmark/ThemedMark.jsx` — handwritten newCadenceHW inlined
- `src/components/Wordmark/Wordmark.module.css` — `.mark` 48.2px, `.themedMark`
  height-matched, comments
- `src/tokens/color.css` — per-theme `--hero-*` overrides

## Verification

- `npx vite build` succeeds (both large inlined SVGs parse as JSX).
- Rendering, counters (nonzero winding leaves the cursive holes open), all four
  themes, and the section swap confirmed by David.
