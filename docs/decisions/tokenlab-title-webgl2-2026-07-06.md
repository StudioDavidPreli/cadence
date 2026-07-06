# Token Lab overview title: animated Rive wordmark (2026-07-06)

Status: RESOLVED. The Token Lab guide's plain serif `<h2>Token Lab</h2>` is now
the animated `tokenlabhero.riv`, wired into a new `TokenLabTitle` component. Runtime
rendering confirmed by David.

This is the sibling of the landing hero (`hero-webgl2-wiring-2026-07-02.md`): the
display word is the artwork, React binds only the theme. The wiring is simpler than
the hero's in one way, recorded below.

---

## The file

`public/rive/tokenlabhero.riv`. Names read directly from the binary
(`strings public/rive/tokenlabhero.riv`), so these are authoritative:

- Artboard: `tokenLab`
- State machine: `tokenLabSM`
- View model: `TokenLabVM` (not the `ViewModel1` the principle files use, nor the
  hero's `Hero3ViewModel`)
- View model instances: `dark`, `light`, `contrastDark`, `contrastLight` — one per
  theme
- Bindable colors: `colorPropertyFur1/2/3`, `colorPropertyPinks`,
  `colorPropertyPinks2`, `colorPropertyTEXT`, `colorPropertyExtrude`

All colors are authored inside each instance. React writes none.

---

## What was implemented

New component `src/components/TokenLabGuide/TokenLabTitle.jsx`, co-located beside
the guide's `index.jsx` the way `ThemedMark` sits beside `Wordmark`. Two small
edits alongside it: `TokenLabGuide/index.jsx` renders `<TokenLabTitle />` in place
of the text `<h2>`, and `TokenLabGuide.module.css` gains the canvas box, a
plain-text fallback, and a visually-hidden accessible name.

1. **Runtime.** On `@rive-app/react-webgl2`, matching the hero. `tokenlabhero.riv`
   is authored for the Rive Renderer, which the canvas runtime cannot draw. This
   is the second and only other component on the WebGL2 runtime; the ~30 principle,
   icon, and carousel canvases stay on `@rive-app/react-canvas`. If the title area
   ever renders blank, the file was exported for the vector renderer instead:
   change the one import in `TokenLabTitle.jsx` to `@rive-app/react-canvas`.

2. **Constants and view model.** `useRive` gets `src /rive/tokenlabhero.riv`,
   artboard `tokenLab`, state machine `tokenLabSM`. `useViewModel(rive, { name:
   'TokenLabVM' })`.

3. **No runtime color flip.** This is the divergence from the hero. The hero (and
   every principle file) authors a single `Contrast` instance shared by both
   high-contrast themes, so `high-contrast-dark` needs a runtime stroke/fill flip
   (`useHCContrastColors`, or the hero's inline `useViewModelInstanceColor`). This
   file authors four instances, one per theme, each with its own colors. So the
   theme-to-instance map is a clean 1:1 (`dark`, `light`, `high-contrast-light` ->
   `contrastLight`, `high-contrast-dark` -> `contrastDark`), the correct instance
   is bound by name, and no color is written from React at all. Simpler and with no
   cross-runtime color-hook coupling to reason about.

4. **Layout.** `new Layout({ fit: Fit.Contain, alignment: Alignment.CenterLeft })`
   so the word reads from the guide's left margin, matching the left-aligned
   reading copy below it rather than centering (Rive's default). The guide is a
   document, not a landing statement.

5. **Accessibility.** The `<h2>` stays as the document heading. Inside it a
   visually-hidden span carries the accessible name "Token Lab" for the outline and
   screen readers, and the canvas is `aria-hidden`, the same split the `Wordmark`
   uses for its inlined mark. A plain-text fallback shows until the canvas paints,
   so the heading is legible before load and a missing asset degrades to text.

`autoplay` is gated on `useReducedMotion()`: reduced motion loads the file and
holds a static first frame, consistent with the hero and the P17 behavior.

## Sizing

`.titleAnim` is a fixed-height box (currently 128px) so the heading holds its space
whether the canvas has painted or the fallback text is showing. The art fits
`Contain` inside it, so the box height sets the visible title size up to the guide's
640px reading width. Started at 64px, doubled to 128px on David's request the same
session. If the art ever looks width-limited rather than taller, it is wider than
the reading measure allows at that height and is already at full width.

---

## Verification

- `npx vite build` succeeds. The JS-chunk-over-500kB warning is unchanged (the
  second Rive runtime was already bundled for the hero).
- `npx vitest run src/tokens/tokenIntegrity.test.js` passes (4 tests). No inline
  animation literals were introduced.
- `Layout` / `Fit.Contain` / `Alignment.CenterLeft` confirmed exported from
  `@rive-app/react-webgl2`.
- Runtime rendering confirmed by David.
