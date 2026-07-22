# Token Lab tool bar: typography roles and layout — 2026-07-21

The tool bar grew one section at a time (duration, easing, delay, scale, then the
spring editor and the duration scalar, then the preset row absorbing four export
formats and Import), and each addition styled its own text locally. Measured in
the committed stylesheet at the start of this session: five font sizes (9, 10, 11,
12, 13px) across 31 declarations, two weights, five letter-spacing rules and five
text-transforms all repeating the same value, and not one typographic value
defined in a shared place. That is the failure the tool argues against, turned on
its author: values that cannot be named cannot be systematized.

This session named them, then reorganized the column around the named set.

## The typographic roles

Definitions live in `src/tokens/type.css`, a global stylesheet imported once in
`main.jsx` beside `color.css`. Each module class pulls a role in with
`composes: type-<role> from global`, so the module keeps its own class name and
the JSX is unchanged, and no module file carries a bare font declaration of its
own.

Two rules keep the roles honest:

- **Roles carry type only** (size, weight, tracking, case, line-height). They do
  not set color. Color stays as the per-state declarations already in each module
  (a button is muted at rest, primary when filled), because color here is state
  logic, not typography. Keeping color out means no role introduced a new color
  pairing, so the contrast audit is untouched.
- **Roles do not set font-family.** IBM Plex Mono comes from `body`, and every
  non-form element inherits it. Form elements (button, input) keep an explicit
  `font-family: inherit` locally, because the browser gives them their own font
  otherwise. That one line is load-bearing, not drift.

| Role | Size token | Size | Weight | Other | Used by |
|---|---|---|---|---|---|
| `type-eyebrow` | `--type-size-base` | 11px | 600 | 0.06em, uppercase | every section header, panel/preset/import titles |
| `type-label` | `--type-size-label` | 12px | 500 | — | slider names, graph titles, the scalar label |
| `type-value` | `--type-size-base` | 11px | normal | tabular-nums | slider/graph readouts, curve values, track labels |
| `type-button` | `--type-size-base` | 11px | 500 | — | every chrome button, tab, segmented control |
| `type-microcopy` | `--type-size-base` | 11px | normal | line-height 1.5 | captions, tooltips, the mode drop-down |
| `type-glyph` | `--type-size-glyph` | 10px | normal | — | the preset delete ✕, the accordion chevron |
| `type-body` | `--type-size-body` | 13px | normal | — | the import-report modal prose |

The five arbitrary sizes collapse to a four-step named scale: 13 body, 12 label,
11 base (value / button / microcopy / eyebrow / tooltip / input), 10 glyph. The
5px SVG axis labels in the two graphs stay as they are: graphical, in SVG user
units, the same exemption the graph strokes carry.

What the sweep resolved on the way through: the accordion section header dropped
12px to join the 11px eyebrow; the 10px curve-values and kinetic-strip labels rose
to the 11px value role; the 9px delete ✕ rose to the 10px glyph; the import-modal
rows rose 12px to the 13px body; and the one hand-spelled `ui-monospace, monospace`
(on the import-modal inline code) moved onto the `--font-mono` token like
everywhere else. Everything already uniform (the twelve buttons, the four labels,
the captions) simply got named, with no pixel moved.

The home decision: with the scope spanning three module files (TokenLab,
DurationVisualizer, SpringVisualizer), module-local shared classes were not an
option. CSS Module class names are file-scoped, so a class defined in one
`.module.css` cannot be shared into another (DurationVisualizer already restates
`.slider` for exactly this reason). The definitions had to live in a shared layer.
`composes ... from global` against a plain global `type.css` is that layer, and it
is the table a public style guide inherits directly.

## The layout and organization

### Section order and collapse

The column reads Presets, Easing, Spring, Scale, Delay, Duration, Export. Presets
and Export bracket the token families as the bar's entry and exit points; Easing
leads the families. Presets, Easing, and Export open by default; the four token
families start collapsed, so the column opens short. Presets and Export are
collapsible `ControlSection`s now (Presets was previously an always-open block,
Export previously rode under the preset row), so every section header carries the
same `type-eyebrow` treatment.

### Save preset

Save preset moved onto the Import row and is always present. It reads its resting
dashed "potential action" border while the current state matches a preset, and
fills to the loaded-preset pill's solid look when the state has diverged: exactly
one control on the row is ever filled, standing for the current state (a loaded
preset, or this save affordance). Clicking it is a disclosure toggle that opens
the name field below and leaves the button in place; clicking again closes the
field.

### Explore toggle

The header Explore toggle shrank through an opt-in `size="sm"` prop on the shared
`Toggle` (36×22 track, 16px thumb, down from 44×26 / 18px). The default size is
unchanged, so every demonstrated Toggle is byte-identical; only the chrome
instance is small.

### Duration vs Distance

The chart is centered by giving the plot symmetric left/right margins inside the
viewBox (`PLOT.x0/x1` at 10 and 90), not by insetting the SVG element. Insetting
only centered the box while the plot stayed drawn right-of-center on its old 12/4
margins, which read as off-center. The duration scalar scrub shortened to an 80px
track and moved to a footer row below the chart, at the left with Replay pushed to
the right. The mode descriptions left the always-on caption and became a drop-down
tooltip on the Constant duration / Constant velocity toggle, shown on hover or
focus (the tip lives outside the toggle's clipped shell so it is not cut off, on
`--feedback-*` timing, text-base on surface-raised, audited AA).

### Easing curve

The Bézier curve carries `--color-accent` now, the theme's "currently affecting
the system" color, matching the SpringVisualizer settle curve and the
DurationVisualizer active line. Graphical stroke, so the 3:1 UI bar governs, and
accent clears it in every theme (dark 8.5, light 5.6, HC-light 6.1, HC-dark 12.7
on `--color-bg`). It replaced `--color-accent2` (the secondary purple).

### Titles

"Duration vs Distance" and "Settle Curve" capitalize both words.

## Verification

Build passes. 189 unit tests pass, including the token-integrity gate. The e2e
suite passes: the axe floors clear in all four themes across all five views (the
token-lab scan covers the new accent easing curve, since Easing opens by default),
and the token-propagation, keyboard, and theme tests pass. Five e2e specs that
drove now-collapsed sliders were updated to open the section first, targeting the
section header by class rather than by name (the demo spring-coil toggles also
carry "Spring" in their labels). David's visual pass across the four themes and the
720px rail collapse is the acceptance test, and it passed: he no longer calls the
tool bar unattractive.

## Files

- `src/tokens/type.css` (new): the role definitions.
- `src/main.jsx`: imports `type.css`.
- `src/components/TokenLab/{index.jsx, TokenLab.module.css}`: role sweep, section
  reorg, ExportSection split, Save-preset rework.
- `src/components/DurationVisualizer/{index.jsx, DurationVisualizer.module.css}`:
  role sweep, centered plot, scalar footer, mode tooltip.
- `src/components/SpringVisualizer/{index.jsx, SpringVisualizer.module.css}`: role
  sweep, "Settle Curve".
- `src/components/EasingVisualizer/EasingVisualizer.module.css`: curve to accent.
- `src/components/Toggle/{index.jsx, Toggle.module.css}`: the `size` prop.
- `e2e/{tokens,keyboard,themes}.spec.js`: open collapsed sections before driving
  their sliders.
