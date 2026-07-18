# Figma Variable Spec: Cadence Foundations Style Guide

Handoff spec for the Figma Community style guide build. The build session cannot
see this repo; every value it needs is in this file. Extracted and verified
against shipping code 2026-07-18.

**Source of truth:** the code. `src/tokens/color.css` and `src/tokens/motion.css`
define the tokens; `src/data/motionPresets.js` defines the presets. Docs were
cross-checked and every code/doc discrepancy is recorded at the end of this
file, none affects a value below.

**Provenance legend.** Every value carries one of:

- `[code]`: read from source, with file and line. Line numbers refer to the
  files as of commit `0f60c51` (2026-07-18).
- `[confirmed]`: approved by David during the extraction session, 2026-07-18.
- `[convention]`: not a token in code. Documents observed practice in the CSS
  Modules, with example locations. The Figma file may present these as
  variables, but the annotation must say the code does not read them as tokens.

**Confirmed for publication (David, 2026-07-18):** the motion values are final
per the 2026-07-08 review: the 100/200/400/600 duration ladder, the M2 easing
triad, the Spring to Overshoot rename, and the current delay and scale tokens.

**Naming convention.** CSS custom property names map to Figma slash names
mechanically: strip the leading `--`, convert remaining hyphens between
family segments to slashes. `--color-text-base` becomes `color/text/base`,
`--motion-duration-fast` becomes `motion/duration/fast`. The CSS name column
preserves the exact property so the mapping audits in both directions. One
caveat for the builder: some families have a bare variable beside a group
(`color/surface` next to `color/surface/hover`). If Figma rejects that
name adjacency, rename the bare leaf to `<family>/base` and record the rename
in the file's annotation layer.

---

## Collection: color

Four modes: `dark`, `light`, `hc-light`, `hc-dark`, matching the app's
`data-theme` values `dark`, `light`, `high-contrast-light`,
`high-contrast-dark`. All values `[code]` from `src/tokens/color.css`; the
"lines" column gives the defining line per mode in dark / light / hc-light /
hc-dark order.

The `-subtle` variables are rgba tints; Figma color variables carry alpha, so
enter them with their alpha, not flattened. `transparent` chip values are
`#000000` at 0% alpha.

Contrast ratios are the audit values shipped as inline comments in
`color.css` (dark block lines 84-95, light 152-164, hc-light 213-220, hc-dark
271-278) plus the chip spec in
`docs/decisions/contrast-audit-2026-04-16.md` (correction section,
2026-07-16). WCAG AA bars: 4.5:1 normal text, 3:1 large text and UI
components. These ratios ship in the Figma file as annotations on the color
pairs.

### Surfaces and structure

| Figma name | CSS name | dark | light | hc-light | hc-dark | lines | notes |
|---|---|---|---|---|---|---|---|
| `color/bg` | `--color-bg` | `#141414` | `#f5f5f5` | `#ffffff` | `#000000` | 106 / 168 / 224 / 282 | Page background. |
| `color/bg2` | `--color-bg2` | `#1a1a1a` | `#ebebeb` | `#f0f0f0` | `#0f0f0f` | 107 / 169 / 225 / 283 | Secondary background layer. |
| `color/surface` | `--color-surface` | `#1e1e1e` | `#1a1a1a` | `#000000` | `#ffffff` | 109 / 171 / 227 / 285 | Interactive element default. Light/HC surfaces invert against the page. |
| `color/surface/hover` | `--color-surface-hover` | `#262626` | `#333333` | `#000000` | `#ffffff` | 110 / 172 / 228 / 286 | Surface on pointer hover. |
| `color/surface/press` | `--color-surface-press` | `#111111` | `#111111` | `#000000` | `#ffffff` | 111 / 173 / 229 / 287 | Surface on active/press. |
| `color/surface/raised` | `--color-surface-raised` | `#1a1a1a` | `#ffffff` | `#ffffff` | `#000000` | 115 / 174 / 230 / 288 | Card / panel surface. |
| `color/surface/active` | `--color-surface-active` | `#262626` | `#ebebeb` | `#f0f0f0` | `#0f0f0f` | 116 / 175 / 231 / 289 | Persistent selected state. Tested background for `text/muted`. |
| `color/hero/bg` | `--color-hero-bg` | `#161616` | `#f5f5f5` | `#ffffff` | `#000000` | 117 / 176 / 232 / 290 | Landing panel. Sits at or near `color/bg` by design. |
| `color/border` | `--color-border` | `#2e2e2e` | `#e2e2e2` | `#000000` | `#ffffff` | 119 / 178 / 234 / 292 | Subtle outlines. |
| `color/border2` | `--color-border2` | `#3d3d3d` | `#cccccc` | `#000000` | `#ffffff` | 120 / 179 / 235 / 293 | More prominent borders. |

### Text

| Figma name | CSS name | dark | light | hc-light | hc-dark | lines | verified contrast pairs | notes |
|---|---|---|---|---|---|---|---|---|
| `color/text/primary` | `--color-text-primary` | `#e1e1e1` | `#ffffff` | `#ffffff` | `#000000` | 122 / 181 / 237 / 295 | on `surface`: dark 12.7:1 AAA, light 17.4:1 AAA, hc-light 21.0:1 AAA, hc-dark 21.0:1 AAA. on `surface/hover`: dark 11.6:1 AAA, light 12.6:1 AAA | Text on interactive (inverted) surfaces. |
| `color/text/base` | `--color-text-base` | `#e1e1e1` | `#1a1a1a` | `#000000` | `#ffffff` | 123 / 182 / 238 / 296 | on `bg`: dark 14.1:1 AAA, light 15.9:1 AAA, hc-light 21.0:1 AAA, hc-dark 21.0:1 AAA. on `surface/raised`: dark 12.7:1 AAA, light 17.4:1 AAA | Default body text. Also the error-text color: errors carry no accent (rule 2026-07-18, `docs/decisions/error-surfaces-2026-07-18.md`). |
| `color/text/muted` | `--color-text-muted` | `#909090` | `#666666` | `#000000` | `#ffffff` | 127 / 185 / 239 / 297 | on `bg`: dark 5.8:1 AA, light 5.3:1 AA. on `surface/raised`: dark 5.2:1 AA, light 5.7:1 AA. on `surface/active`: dark 4.8:1 AA, light 4.8:1 AA, hc-light 18.4:1 AAA, hc-dark 19.2:1 AAA | Secondary text. Both non-HC values were retuned in the 2026-04-16 audit to clear 4.5:1 on `surface/active` (the Card hover background). No grays in HC themes. |
| `color/text/muted2` | `--color-text-muted2` | `#aaaaaa` | `#888888` | `#000000` | `#ffffff` | 128 / 186 / 240 / 298 | not audited as a pair (no inline ratio in code) | Tertiary: captions, slider thumbs. |

### Accents

Accent role is constant across themes: active, connected, currently affecting
the system. Never decorative. The hue is per-theme. Primary use is UI /
graphical strokes (3:1 bar); a small set of state-signal text uses is governed
by the 4.5:1 bar and passes in every theme (verified 2026-07-16, audit
correction section).

| Figma name | CSS name | dark | light | hc-light | hc-dark | lines | verified contrast pairs | notes |
|---|---|---|---|---|---|---|---|---|
| `color/accent` | `--color-accent` | `#76c17d` | `#5a4fcf` | `#855a0d` | `#aaccf6` | 131 / 190 / 246 / 303 | on `bg`: dark 8.5:1 AAA, light 5.6:1 AA, hc-light 6.1:1 AA, hc-dark 12.7:1 AAA. on `surface/raised`: dark 7.7:1 AAA, light 6.1:1 AA | Green in dark, purple in light, amber in hc-light, light blue in hc-dark (re-hued from amber 2026-07-16). |
| `color/accent/subtle` | `--color-accent-subtle` | `rgba(118, 193, 125, 0.12)` | `rgba(90, 79, 207, 0.10)` | `rgba(133, 90, 13, 0.10)` | `rgba(170, 204, 246, 0.12)` | 132 / 191 / 247 / 304 | (tint, not a tested pair) | Highlight background; tint of the theme's accent. |
| `color/accent2` | `--color-accent2` | `#b9b0ff` | `#7b6fd4` | `#5a4fcf` | `#c2b6ff` | 133 / 192 / 248 / 305 | on `bg`: hc-light 6.1:1 AA, hc-dark 11.4:1 AAA (no inline ratio for dark/light) | Purple: easing curve, secondary. SVG stroke use, 3:1 bar. |
| `color/accent2/subtle` | `--color-accent2-subtle` | `rgba(185, 176, 255, 0.12)` | `rgba(123, 111, 212, 0.10)` | `rgba(90, 79, 207, 0.10)` | `rgba(194, 182, 255, 0.12)` | 134 / 193 / 249 / 306 | (tint, not a tested pair) | Extended-principle badge background. |
| `color/accent3` | `--color-accent3` | `#e8b86d` | `#905e18` | `#6b4400` | `#f5c563` | 135 / 196 / 250 / 307 | on `bg`: dark 10.1:1 AAA, light 5.1:1 AA, hc-light 8.6:1 AAA, hc-dark 13.0:1 AAA. on `surface/raised`: dark 9.1:1 AAA, light 5.5:1 AA | Amber: warnings, no-demo indicator. Light value darkened in the 2026-04-16 audit (was `#c4882a`, failed AA). |

Hue-overlap note for annotations: accent shares a family with `accent2`
(purple) in light, with `accent3` (amber) in hc-light, and sits near
`accent2`'s blue-violet family in hc-dark. Known property, not a bug.

### Category chips

Taxonomy color for PrincipleCard category chips, deliberately decoupled from
the accent role (David's spec 2026-07-16). Every chip carries a constant 1px
border, transparent where unused, so outline and filled variants share exact
geometry. Ratios from the audit correction section, verified on built output
2026-07-16.

| Figma name | CSS name | dark | light | hc-light | hc-dark | lines | verified contrast pairs |
|---|---|---|---|---|---|---|---|
| `color/chip/classic/text` | `--color-chip-classic-text` | `#76c17d` | `#141414` | `#000000` | `#ffffff` | 140 / 201 / 254 / 311 | dark: 6.5:1 on its tint. light: 8.5:1 on `#76c17d`. hc-light and hc-dark: 21:1 |
| `color/chip/classic/bg` | `--color-chip-classic-bg` | `rgba(118, 193, 125, 0.12)` | `#76c17d` | `transparent` | `transparent` | 141 / 202 / 255 / 312 | |
| `color/chip/classic/border` | `--color-chip-classic-border` | `transparent` | `transparent` | `#000000` | `#ffffff` | 142 / 203 / 256 / 313 | HC classic is an outline chip. |
| `color/chip/extended/text` | `--color-chip-extended-text` | `#b9b0ff` | `#141414` | `#ffffff` | `#000000` | 143 / 204 / 257 / 314 | dark: 7.0:1 on its tint. light: 9.4:1 on `#b9b0ff`. hc-light and hc-dark: 21:1 |
| `color/chip/extended/bg` | `--color-chip-extended-bg` | `rgba(185, 176, 255, 0.12)` | `#b9b0ff` | `#000000` | `#ffffff` | 144 / 205 / 258 / 315 | HC extended is a solid inversion. |
| `color/chip/extended/border` | `--color-chip-extended-border` | `transparent` | `transparent` | `#000000` | `#ffffff` | 145 / 206 / 259 / 316 | |

### Wordmark

Design-first color for the top-left "Cadence" pixel-title only; no other
element reads these. Intentionally decoupled from `color/accent`. In dark and
light the values resolve through other tokens (aliases); resolved hex given
beside each. Defined at `color.css:50-51` with overrides at 65, 68, 69, 74.

| Figma name | CSS name | dark | light | hc-light | hc-dark | notes |
|---|---|---|---|---|---|---|
| `color/hero/glyph` | `--hero-glyph` | `var(--color-text-base)` = `#e1e1e1` | `var(--color-text-base)` = `#1a1a1a` | `#e8b86d` | `#aaccf6` | Dark/light alias `color/text/base` (candidate for a Figma alias). hc-light amber is ~1.5:1 on white; the outline carries legibility there. Decorative, deliberately directed. |
| `color/hero/outline` | `--hero-outline` | `var(--color-accent)` = `#76c17d` | `#b9b0ff` | `#262626` | `#262626` | Dark aliases `color/accent`; light is a literal lavender, lighter than the light accent. HC near-black halo ~15:1 on white. |

### Typography color tokens

The two font-family tokens live in `color.css` (theme-independent, defined on
`:root`). They are specified in the type collection below; listed here only so
the color.css inventory is complete.

---

## Collection: motion

No modes. All values final `[confirmed]` per the 2026-07-08 review (David,
this session).

**Note for the builder (stated even though the build session knows it):
Figma has no easing variable type. The `cubic-bezier(...)` strings below are
documentation, not functional tokens. Duration and delay are number variables
in ms; scale tokens are unitless numbers; easing curves and preset names are
string variables.**

### Durations

`[code]` `src/tokens/motion.css:8-11`.

| Figma name | CSS name | value (ms) | role |
|---|---|---|---|
| `motion/duration/fast` | `--motion-duration-fast` | 100 | Micro-interactions (button press feedback). |
| `motion/duration/base` | `--motion-duration-base` | 200 | Most UI transitions (panel open, tab switch). |
| `motion/duration/slow` | `--motion-duration-slow` | 400 | Content reveals, modals. |
| `motion/duration/slower` | `--motion-duration-slower` | 600 | Complex sequenced animations. |

### Easing

`[code]` `src/tokens/motion.css:20-24`; the same values are `EASING_CURVES` in
`src/data/motionPresets.js:10-16`. String variables holding the full CSS value.

| Figma name | CSS name | value | character |
|---|---|---|---|
| `motion/ease/linear` | `--motion-ease-linear` | `cubic-bezier(0, 0, 1, 1)` | Constant velocity. Fixed reference token: no Token Lab control reaches it. |
| `motion/ease/standard` | `--motion-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Symmetric ease-in-out, the neutral default. M2 lineage, confirmed over M3 2026-07-16. |
| `motion/ease/enter` | `--motion-ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Decelerate into rest, for elements arriving. |
| `motion/ease/exit` | `--motion-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Accelerate away, for elements leaving. |
| `motion/ease/overshoot` | `--motion-ease-overshoot` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot past target, then settle. Renamed from `spring` 2026-07-08: a cubic-bezier approximates spring overshoot but is not a spring. |

### Delays

`[code]` `src/tokens/motion.css:31-34`.

| Figma name | CSS name | value (ms) | role |
|---|---|---|---|
| `motion/delay/none` | `--motion-delay-none` | 0 | The system's named zero. Fixed reference token. |
| `motion/delay/short` | `--motion-delay-short` | 50 | Tightest stagger step for lists. |
| `motion/delay/medium` | `--motion-delay-medium` | 100 | Second beat in a two-element sequence. |
| `motion/delay/long` | `--motion-delay-long` | 200 | Deliberate pause before a response or reveal. |

### Scale

`[code]` `src/tokens/motion.css:43-46`. Unitless numbers. Shipped names are
flat; the nested `scale.press.*` spelling in
`docs/references/motion-presets-harmonized.md` is a deferred proposal, not
code.

| Figma name | CSS name | value | role |
|---|---|---|---|
| `motion/scale/subtle` | `--motion-scale-subtle` | 0.98 | Press compression, density-heavy UI. |
| `motion/scale/base` | `--motion-scale-base` | 0.95 | Press compression, standard interactive elements. |
| `motion/scale/expressive` | `--motion-scale-expressive` | 0.9 | Press compression, hero elements and CTAs. |
| `motion/scale/lift` | `--motion-scale-lift` | 1.02 | Growth for persistent selected / elevated state. |

### Preset names

`[code]` `src/data/motionPresets.js:39-77` (ids and labels). String
variables. The three presets name the system's motion personalities, shared
with Motion Tiles; Standard was labeled Default until 2026-07-16. Per David's
Phase 2 decision the full per-preset value tables do not ship in the Figma
file; `docs/references/motion-presets.md` remains their reference.

| Figma name | source id | value |
|---|---|---|
| `motion/preset/standard` | `standard` | `Standard` |
| `motion/preset/snappy` | `snappy` | `Snappy` |
| `motion/preset/cinematic` | `cinematic` | `Cinematic` |

### Fixed chrome constants

`[code]` `src/tokens/motion.css:55, 64, 73`. Included per David's Phase 2
decision. Annotation must mark these as system chrome, not editable design
tokens: they are deliberately outside the editable scale so Token Lab's
Explore mode can never collapse the tool's own feedback to nothing. They are
excluded from Token Lab's exports.

| Figma name | CSS name | value (ms) | role |
|---|---|---|---|
| `motion/feedback/flash-duration` | `--feedback-flash-duration` | 3000 | The "Tokens" title flash system cue. |
| `motion/feedback/nav-duration` | `--feedback-nav-duration` | 360 | Navigation chrome: hero/content crossfade, accordion expand/collapse. |
| `motion/feedback/ui-duration` | `--feedback-ui-duration` | 100 | UI micro-feedback: hover, focus, color/theme shifts, tooltips, inline reveals. |

---

## Collection: space

**`[convention]` throughout. Spacing is not tokenized in code.** There is no
space token file and no `--space-*` custom property; every value below is a
literal in the CSS Modules. The Figma file documents the observed convention,
and its annotation must say so. Survey basis: all `padding`, `margin`, and
`gap` declarations across `src/**/*.module.css`, 2026-07-18.

The convention is a 4px grid, discernible but not strictly enforced. Per
David's Phase 2 decision the collection carries the 4px ladder only; the
recurring off-grid values are recorded as known deviations, not variables.

| Figma name | value (px) | uses | example locations |
|---|---|---|---|
| `space/4` | 4 | 20 | `src/components/Dropdown/Dropdown.module.css:63`, `src/components/TokenLab/TokenLab.module.css:494` |
| `space/8` | 8 | 34 | `src/components/PrinciplesLibrary/PrinciplesLibrary.module.css:26`, `src/components/Dropdown/Dropdown.module.css:15` |
| `space/12` | 12 | 30 | `src/components/PrinciplesLibrary/PrinciplesLibrary.module.css:150` |
| `space/16` | 16 | 43 | `src/components/TokenLab/TokenLab.module.css:112`, `src/components/Drawer/Drawer.module.css:33` |
| `space/20` | 20 | 15 | `src/components/PrincipleAnimation/PrincipleAnimation.module.css:28`, `src/components/Drawer/Drawer.module.css:76` |
| `space/24` | 24 | 18 | `src/components/PrinciplesLibrary/PrinciplesLibrary.module.css:151`, `src/components/TokenLab/TokenLab.module.css:943` |
| `space/32` | 32 | 11 | `src/App.module.css:28`, `src/components/TokenLab/TokenLab.module.css:772` |
| `space/40` | 40 | 3 | `src/App.module.css:25`, `src/components/TokenLab/TokenLab.module.css:775` |
| `space/48` | 48 | 6 | `src/components/MotionTiles/MotionTilesLanding.module.css:17`, `src/components/TokenLabGuide/TokenLabGuide.module.css:10` |
| `space/64` | 64 | 1 | `src/components/TokenLabGuide/TokenLabGuide.module.css:10` |

Known deviations (recorded in annotation, not as variables): a parallel
off-grid set is in heavy use, 10px (36 uses), 6px (24), 5px (16), 14px (16),
plus 18px (5), 7px (5), 22px (3), 28px (3, e.g.
`src/principles/Economy/Economy.module.css:16`), 56px (1,
`src/components/CodeBlock/CodeBlock.module.css:19`), scattered 2/3/9/11px, a
few rem values in ErrorBoundary and TokenLabGuide, and small negative offsets.

---

## Collection: type

Font families are tokens `[code]`; everything else is `[convention]`, literal
px in the CSS Modules. The annotation must state that sizes, weights, line
heights, and letter-spacing document convention, not tokens.

### Families

`[code]` `src/tokens/color.css:40-41`. Theme-independent.

| Figma name | CSS name | value | role |
|---|---|---|---|
| `type/family/mono` | `--font-mono` | `'IBM Plex Mono', monospace` | Default body font: all UI chrome, labels, values, controls. |
| `type/family/serif` | `--font-serif` | `'DM Serif Display', serif` | Display headings, editorial moments. |

Loaded webfont weights `[code]` `index.html:74`: IBM Plex Mono 400 and 500;
DM Serif Display 400 (upright and italic). **Flag for the Figma file: the
code declares `font-weight: 600` (20 uses) and `700` (4 uses), but neither
face is loaded at those weights, so browsers render synthetic bold. Figma
will substitute the fonts' true 600/700 cuts (or fail to, for DM Serif
Display, which has no bold), so rendered weight in Figma will differ from the
shipped site.** Two components bypass the family tokens with a literal
`ui-monospace, monospace` stack: `src/components/TokenLab/TokenLab.module.css:506`
and `src/principles/Appeal/Appeal.module.css:58`.

### Size ramp

`[convention]`. Number variables in px. Distinct values observed with usage
counts; the ramp is dominated by the 10-14px band.

| Figma name | value (px) | uses | example locations |
|---|---|---|---|
| `type/size/9` | 9 | 2 | `src/components/PrinciplesLibrary/PrinciplesLibrary.module.css:103`, `src/components/TokenLab/TokenLab.module.css:256` |
| `type/size/10` | 10 | 8 | `src/components/Dropdown/Dropdown.module.css:41`, `src/components/Modal/Modal.module.css:111` |
| `type/size/11` | 11 | 54 | `src/components/TokenLab/TokenLab.module.css:117`, `src/components/Card/Card.module.css:104` |
| `type/size/12` | 12 | 26 | `src/components/Dropdown/Dropdown.module.css:107`, `src/components/ThemeSwitcher/ThemeSwitcher.module.css:12` |
| `type/size/13` | 13 | 20 | `src/components/Dropdown/Dropdown.module.css:22`, `src/components/Tooltip/Tooltip.module.css:23` |
| `type/size/14` | 14 | 11 | `src/components/Button/Button.module.css:12`, `src/components/NavItem/NavItem.module.css:11` |
| `type/size/15` | 15 | 4 | `src/components/MobileGate/MobileGate.module.css:74`, `src/components/MotionTiles/MotionTilesLanding.module.css:33` |
| `type/size/16` | 16 | 4 | `src/components/Card/Card.module.css:114`, `src/components/Carousel/Carousel.module.css:35` |
| `type/size/18` | 18 | 1 | `src/components/PrincipleCard/PrincipleCard.module.css:193` |
| `type/size/20` | 20 | 1 | `src/components/Stepper/Stepper.module.css:207` |
| `type/size/22` | 22 | 2 | `src/components/Carousel/Carousel.module.css:136`, `src/components/PrincipleCard/PrincipleCard.module.css:270` |
| `type/size/32` | 32 | 2 | `src/components/MotionTiles/MotionTilesLogo.module.css:8`, `src/components/TokenLabGuide/TokenLabGuide.module.css:22` |

Outliers recorded in annotation, not as variables: `5px`
(`src/components/DurationVisualizer/DurationVisualizer.module.css:201`),
`1.25rem` (`src/components/ErrorBoundary/ErrorBoundary.module.css:33`),
`0.9em` (`src/components/TokenLabGuide/TokenLabGuide.module.css:134`).

### Weights

`[convention]`. See the synthetic-bold flag above.

| Figma name | value | uses | example locations |
|---|---|---|---|
| `type/weight/400` | 400 | 10 | `src/components/CodeBlock/CodeBlock.module.css:55`, `src/components/NavItem/NavItem.module.css:12` |
| `type/weight/500` | 500 | 33 | `src/components/Button/Button.module.css:13`, `src/components/Tooltip/Tooltip.module.css:24` |
| `type/weight/600` | 600 | 20 | `src/components/Card/Card.module.css:105`, `src/components/Modal/Modal.module.css:91` |
| `type/weight/700` | 700 | 4 | `src/components/Stepper/Stepper.module.css:116`, `src/components/NavColumn/NavColumn.module.css:26` |

### Line heights

`[convention]`. Unitless multipliers.

| Figma name | value | uses | example locations |
|---|---|---|---|
| `type/line-height/1` | 1 | 9 | `src/components/Tooltip/Tooltip.module.css:25`, `src/components/Stepper/Stepper.module.css:118` |
| `type/line-height/1.1` | 1.1 | 2 | `src/components/MotionTiles/MotionTilesLogo.module.css:9`, `src/components/TokenLabGuide/TokenLabGuide.module.css:23` |
| `type/line-height/1.2` | 1.2 | 2 | `src/components/Carousel/Carousel.module.css:139`, `src/components/PrincipleCard/PrincipleCard.module.css:274` |
| `type/line-height/1.3` | 1.3 | 3 | `src/components/Card/Card.module.css:117`, `src/components/Modal/Modal.module.css:94` |
| `type/line-height/1.4` | 1.4 | 6 | `src/components/PrincipleCard/PrincipleCard.module.css:94`, `src/components/Modal/Modal.module.css:134` |
| `type/line-height/1.5` | 1.5 | 8 | `src/components/Card/Card.module.css:124`, `src/components/Modal/Modal.module.css:129` |
| `type/line-height/1.6` | 1.6 | 9 | `src/components/CodeBlock/CodeBlock.module.css:23`, `src/components/HeroAnimation/HeroAnimation.module.css:77` |
| `type/line-height/1.65` | 1.65 | 1 | `src/components/TokenLabGuide/TokenLabGuide.module.css:103` |

### Letter spacing

`[convention]`. Values are em units in code; Figma letter-spacing is set in %
(1em = 100%). Conversion is exact, note it in the annotation.

| value (code) | Figma % | uses | example locations |
|---|---|---|---|
| 0.01em | 1% | 2 | `src/components/Button/Button.module.css:15`, `src/components/Stepper/Stepper.module.css:172` |
| 0.02em | 2% | 1 | `src/components/TokenLabGuide/TokenLabGuide.module.css:93` |
| 0.04em | 4% | 6 | `src/components/BugReportButton/BugReportButton.module.css:23`, `src/principles/Timing/Timing.module.css:27` |
| 0.06em | 6% | 10 | `src/components/Card/Card.module.css:106`, `src/components/TokenLab/TokenLab.module.css:119` |
| 0.08em | 8% | 2 | `src/components/NavColumn/NavColumn.module.css:27`, `src/principles/HierarchyOfMotion/HierarchyOfMotion.module.css:22` |
| 0.12em | 12% | 1 | `src/components/RailDrawer/RailDrawer.module.css:29` |

---

## Excluded by decision (David, 2026-07-18)

- **Per-preset value tables** (Snappy / Standard / Cinematic full token sets):
  preset names ship as string variables, the value tables stay in
  `docs/references/motion-presets.md` and `src/data/motionPresets.js`.
- **Component layout locals:** `--col-controls` (300px), `--col-nav` (220px),
  `--drawer-left` (both `src/components/TokenLab/TokenLab.module.css:28-31`),
  `--gate-content-width` (460px, `src/components/MobileGate/MobileGate.module.css:8`),
  and the `--hero-art-*` / `--hero-text-*` set
  (`src/components/HeroAnimation/HeroAnimation.module.css:16-22`). Tool
  furniture, not system.
- **Proposed-only tokens:** `--motion-spring-*` (stiffness/damping/mass) and
  `--motion-duration-scalar` appear in
  `docs/references/motion-presets-harmonized.md` as proposals. Verified absent
  from code 2026-07-18. They must not appear in the Figma file as tokens.

## Code/doc discrepancies found (flagged, not resolved)

1. The fixed-constants table in `docs/references/motion-presets-harmonized.md`
   still lists `ease.overshoot` as fixed. Code
   (`EDITABLE_TOKEN_SCHEMA`, `src/data/motionPresets.js:269-274`) and
   `docs/references/motion-presets.md` both have it editable since
   2026-07-08. The mirror doc's own precedence note says `motion-presets.md`
   wins; this spec follows the code.
2. Weights 600/700 are declared in components but no face is loaded at those
   weights (synthetic bold). Documented in the type collection flag.
3. Two literal `ui-monospace, monospace` stacks bypass the family tokens
   (locations in the type collection).
4. The head-section tables of `docs/decisions/contrast-audit-2026-04-16.md`
   predate the 2026-06-22 accent palette change and the HC-dark split; the
   appended sections are current and match code exactly. Historical, no live
   drift.

## Open questions

Each is one line for David to answer; none blocks the build of what is
specified above.

1. **Radius collection:** border-radius clusters at 8px (27 uses), 5px (24),
   6px (19), with 50% for circles. Add a `radius` collection on the same
   `[convention]` terms as space, or leave radii out?
2. **Real bold weights:** load IBM Plex Mono 600/700 on the site so shipped
   rendering matches the declared weights, or re-spec the 600/700 uses to 500?
   (The Figma file will show true cuts either way; this decides whether the
   site follows.)
3. **Hero wordmark aliases:** in dark/light, `--hero-glyph` and
   `--hero-outline` resolve through `color/text/base` and `color/accent`.
   Should the Figma variables alias those variables (mode-aware, mirrors the
   CSS) or hold flattened hex?
4. **`ui-monospace` stacks:** tokenize the two literal stacks to
   `var(--font-mono)` (a one-line change each) or keep them and let the spec's
   flag stand?
5. **`color/text/muted2` and non-HC `accent2` pairs** carry no audited ratio
   in code comments. Annotate as "not audited" in the Figma file, or run the
   numbers before publication?
