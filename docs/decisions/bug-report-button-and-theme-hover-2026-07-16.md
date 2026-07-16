# App-level bug-report button and the theme-switcher hover fix — 2026-07-16

Two changes landed this session. They are unrelated in code but shipped together:
a contrast fix to the display-mode buttons, and a new app-level bug-report
affordance on the home page.

## 1. Theme-switcher hover now inverts

The four display-mode buttons (top right, `ThemeSwitcher`) had a hover that was
nearly invisible in the two high-contrast themes. The old rule set
`background-color: var(--color-surface-active)`, which in HC resolves to `#0f0f0f`
on `#000000` (HC-dark) and `#f0f0f0` on `#ffffff` (HC-light). Both sit under the
3:1 UI floor, so there was no readable hover feedback.

The hover now inverts the button: `background-color` and `border-color` go to
`--color-surface-hover`, text to `--color-text-primary`. Resulting pairs, all
verified in `docs/decisions/contrast-audit-2026-04-16.md` (they are the same
combination already used by `.active:hover`):

| Theme | Hover fill + border | Hover text | Ratio |
|-------|--------------------|------------|-------|
| Dark | `#262626` | `#e1e1e1` | 11.6:1 |
| Light | `#333333` | `#ffffff` | 12.6:1 |
| HC Light | `#000000` | `#ffffff` | 21:1 |
| HC Dark | `#ffffff` | `#000000` | 21:1 |

`--color-surface-hover` was chosen over `--color-surface` (the active button's
resting fill) so a hovered button stays one step apart from the persistent active
button in the light and dark themes. In the HC themes the two coincide at pure
black/white, where the active button's `font-weight: 500` carries the
distinction. The now-redundant `.active:hover` rule was removed; the new
`.themeButton:hover` produces the identical result and covers the active button's
own hover.

## 2. Bug-report button on the home page

`src/components/BugReportButton/` is a new app-level affordance. It floats in the
shell's bottom-right footer row and opens the same report dialog as the Motion
Tiles "Problems?" button: the message posts to `/api/bug-report`, which opens a
GitHub issue server-side, so no email address ships to the client. It reuses the
shared `Modal` and the honeypot + trimmed-message guard.

### Rive wiring

The button loads `public/titleSVGS/problembutton2.riv` (artboard `problemButton2`,
state machine `problemSM`, view model `ProblemVM`). The names were verified
against the file through the Rive MCP, not assumed.

- **The artboard name is `problemButton2`, camelCase with a capital B.** The
  first build used the lowercase `problembutton2` it is usually referred to by,
  and `useRive` silently rendered nothing (no error, no canvas). That casing is
  load-bearing.
- **Four theme instances, no runtime flip.** `ProblemVM` carries one instance per
  display mode (`darkMode`, `lightMode`, `contrastDark`, `contrastLight`), each
  with a baked palette. This is different from the principle icons, which carry
  three instances (`Dark`/`Light`/`Contrast`) and flip the shared `Contrast`
  instance for HC-dark at runtime through `useHCContrastColors`. Because this
  file authors all four, the button just maps theme to instance name and binds;
  there is no `useHCContrastColors` call.
- **Runtime: `@rive-app/react-webgl2`.** webgl2 is already justified on first
  paint by the landing hero (see `rive-scaling-future-work-2026-07-07.md`), so an
  always-mounted button rides on a runtime that loads anyway. Using
  `react-canvas` would instead pin THAT runtime onto the always-mounted path and
  block its planned deferral.
- **Chrome-button pattern.** Same as the Motion Tiles buttons: a real `<button>`
  wraps the canvas, the canvas keeps pointer events so `problemSM` runs its own
  hover/press, and the DOM click bubbles to the `<button>`. Aspect ratio comes
  from `rive.bounds` (artboard is 430x90, so the CSS fallback is `43 / 9`).

### Placement: in flow, not fixed

The first version used `position: fixed; bottom/right: 20px`. It poked past the
content's right edge (fixed offsets are viewport-relative, so 20px sat outside the
40px shell padding) and clipped the tool's bottom-right corner.

The fix was to drop fixed positioning and make the button the shell's last in-flow
row. As a flex child of `.appShell`, the shell's own `gap: 32px` sets the space
above it (the same gap the theme-switcher row has), and the shell's `padding: 40px`
plus `justify-content: flex-end` aligns it to the same right edge every other
element uses. In flow, it cannot overlap the tool.

### Nav gating, and what persists

The button hides on the Motion Tiles grid (`destination === MOTION_TILES_GRID`):
that section has its own in-grid "Problems?" button, so an app-level one is
redundant there, and dropping it unmounts the webgl2 canvas while the heavy grid
is up. The gate is a `showButton` flag on the button and its `Modal` only, not an
early `return null` on the whole component, so the copyright line stays in the row
and persists on the grid.

### Copyright

`© MMXXVI DAVID PRELI`, IBM Plex Mono (`var(--font-mono)`), sits in the footer row
left of the button. Muted text, which clears AA on the page background in every
theme (`--color-text-muted` is >=5:1 on `--color-bg`, pure black/white in HC).
Non-selectable, so it reads as chrome.

## Verification

Build passes; all 104 unit tests pass; the token-integrity gate passes (the CSS
changes use `--feedback-*` timing, no inline animation literals). The visual pass
across the four themes and the Motion Tiles grid is David's, on the deployed build
per the standing verify-on-built-output rule.
