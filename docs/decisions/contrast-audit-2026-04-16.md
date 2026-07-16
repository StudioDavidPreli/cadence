# Contrast Audit — 2026-04-16

Scope: Button, Card, NavItem, ThemeSwitcher, TokenLab components.
Themes: dark (default), light, high-contrast.
Standard: WCAG AA — 4.5:1 for normal text, 3:1 for large text and UI components (borders, outlines, graphical elements).

---

## Luminance Reference

All contrast ratios were computed from first principles using the WCAG relative luminance formula.

Linearization: if sRGB channel value c ≤ 0.04045, linear = c / 12.92; otherwise linear = ((c + 0.055) / 1.055) ^ 2.4.
Luminance: L = 0.2126 * R_linear + 0.7152 * G_linear + 0.0722 * B_linear.
Contrast ratio: (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter value.

| Color   | Luminance |
|---------|-----------|
| #141414 | 0.00697   |
| #1e1e1e | 0.01306   |
| #262626 | 0.01937   |
| #1a1a1a | 0.01043   |
| #333333 | 0.03310   |
| #888888 | 0.24545   |
| #909090 | 0.27923   |
| #6b6b6b | 0.14699   |
| #666666 | 0.13287   |
| #e1e1e1 | 0.75268   |
| #ebebeb | 0.83097   |
| #f5f5f5 | 0.91317   |
| #ffffff | 1.00000   |
| #f0f0f0 | 0.87137   |
| #76c17d | 0.43448   |
| #4a9e52 | 0.26494   |
| #007a0c | 0.13946   |
| #006810 | 0.09942   |
| #e8b86d | 0.52542   |
| #c4882a | 0.29460   |
| #905e18 | 0.14012   |
| #6b4400 | 0.07274   |
| #5a4fcf | 0.12274   |

---

## Full Audit

Combinations tested across all three themes. Ratios shown as X.X:1.

| # | Text token | Background token | Dark | Light | HC | Components |
|---|---|---|---|---|---|---|
| 1 | text-base | bg | 14.1 AAA | 15.9 AAA | 21.0 AAA | All body text, slider names |
| 2 | text-base | surface-raised | 12.7 AAA | 17.4 AAA | 21.0 AAA | Card title, section labels, demo labels |
| 3 | text-muted | bg | 5.2 AA | 4.9 AA | 21.0 AAA | Section headers (default), slider names, ThemeSwitcher inactive |
| 4 | text-muted | surface-raised | 4.7 AA | 5.3 AA | 21.0 AAA | Card tag, Card description, demo instructions |
| 5 | text-muted | surface-active | **4.3 FAIL** | **4.5 FAIL** | 18.4 AAA | Card hover (tag + description), NavItem hover transition |
| 6 | text-primary | surface | 12.7 AAA | 17.4 AAA | 21.0 AAA | Button, ThemeSwitcher active, easeButtonActive |
| 7 | text-primary | surface-hover | 11.6 AAA | 12.6 AAA | 21.0 AAA | Button press, ThemeSwitcher active:hover, easeButtonActive:hover |
| 8 | accent | bg | 8.5 AAA | 3.1 UI only | 5.5 AA | demoGroupHighlighted outline |
| 9 | accent | surface-raised | 7.7 AAA | 3.3 UI only | 5.5 AA | demoGroupHighlighted outline |
| 10 | accent3 | bg | 10.1 AAA | **2.8 FAIL** | 8.6 AAA | noDemoNote text |
| 11 | accent3 | surface-raised | 9.1 AAA | **3.1 FAIL** | 8.6 AAA | noDemoNote text |

Notes on rows 8 and 9 (light accent, UI only):
The accent token in light mode is used exclusively as a UI component outline (outline: 1px solid var(--color-accent) on demoGroupHighlighted), not as text. The 3:1 UI component threshold applies. Both values clear it. If accent is ever used as text in light mode, the token will need to darken to reach 4.5:1.

---

## Failures Requiring Fixes

### Row 5 — text-muted on surface-active

**Dark: 4.26:1. Light: 4.47:1. Both fail normal-text AA (4.5:1).**

Root cause: Card.module.css hover state sets --color-surface-active as background but does not change the text color. The tag element (11px, uppercase) and the description element (14px, normal weight) both remain at --color-text-muted while the background shifts to surface-active. Both sizes require 4.5:1 under normal-text rules.

NavItem has the same surface-active background on hover and active states but was not affected — its CSS explicitly sets color: --color-text-base at the same time the background changes, so text-muted is never shown on surface-active as a steady state.

Fix: Raise --color-text-muted in dark and light themes until the combination passes on surface-active.

Dark: #888888 (L 0.24545, 4.26:1 on surface-active) raised to #909090 (L 0.27923, 4.75:1 on surface-active).
Light: #6b6b6b (L 0.14699, 4.47:1 on surface-active) darkened to #666666 (L 0.13287, 4.82:1 on surface-active).

All other combinations for text-muted remain passing after the change:

| Combination | Dark (new) | Light (new) |
|---|---|---|
| text-muted on bg | 5.8:1 AA | 5.3:1 AA |
| text-muted on surface-raised | 5.2:1 AA | 5.7:1 AA |
| text-muted on surface-active | 4.8:1 AA | 4.8:1 AA |

---

### Rows 10 and 11 — light accent3 as text

**Light: 2.79:1 on bg, 3.05:1 on surface-raised. Both fail normal-text AA (4.5:1). The 3:1 UI threshold is also missed on bg.**

Root cause: The noDemoNote element uses --color-accent3 as its text color and is 11px — normal text, requiring 4.5:1. In light mode it sits inside the demo column which has a surface-raised (#ffffff) background. The previous amber value (#c4882a, L 0.29460) gave only 3.05:1 on white.

Fix: Darken light --color-accent3 from #c4882a to #905e18.

#905e18 (L 0.14012):
- on surface-raised (#ffffff): 5.52:1 AA
- on bg (#f5f5f5): 5.07:1 AA

The color reads as a darker amber-ochre. Still recognizably warm, still semantically distinct from the green and purple accents.

---

### HC accent comment wrong — value also corrected

**The comment on --color-accent in the high-contrast block claimed 7.2:1 (AAA). Computed value: 5.54:1 (AA only).**

The value #007a0c (L 0.13946) gives 5.54:1 on white — AA, not AAA. The intent of the HC theme is maximum contrast, and the comment states AAA-verified. The value was wrong for the stated goal.

Fix: Change #007a0c to #006810 (L 0.09942, 7.03:1 on white, AAA).

---

### HC accent2 comment wrong — value retained

**The comment on --color-accent2 in the high-contrast block claimed 7.1:1 (AAA). Computed value: 6.08:1 (AA only).**

#5a4fcf (L 0.12274) gives 6.08:1 on white. This passes AA (4.5:1) but not AAA (7:1).

The value is not changed. Accent2 in high-contrast mode is used exclusively as an SVG stroke color for the easing curve — a graphical element where the 3:1 UI component threshold applies. 6.08:1 clears that threshold with substantial margin. Darkening the value to reach true AAA would require pushing it toward near-navy, making it visually indistinguishable from black in a high-contrast context where color differentiation is already compressed. The comment is updated to reflect the actual ratio and note the rationale.

---

## What Changed and Why

### color.css

**Dark --color-text-muted: #888888 → #909090**
Reason: Row 5 failure. Card hover (tag, description) shows text-muted on surface-active background. 4.26:1 failed normal-text AA. The new value (4.75:1 on surface-active) passes with a comfortable margin. The visual change is a shift of 8 points in gray value — imperceptible at reading scale.

**Light --color-text-muted: #6b6b6b → #666666**
Reason: Row 5 failure in light mode. Same Card hover failure. 4.47:1 was three hundredths under the 4.5:1 threshold. New value: 4.82:1. The five-point shift in gray is not visible.

**Light --color-accent3: #c4882a → #905e18**
Reason: Rows 10 and 11 failure. The noDemoNote is 11px text, color is accent3, background is surface-raised. 3.05:1 failed normal-text AA by a wide margin. New value: 5.52:1. The color shifts from a mid-tone amber to a darker amber-ochre but retains its semantic warmth.

**HC --color-accent: #007a0c → #006810**
Reason: The comment claimed AAA (7:1) but the value only achieved AA (5.54:1). The HC theme is intended to be maximum contrast throughout. Changed to a value that actually reaches the stated standard: 7.03:1.

**HC --color-accent-subtle updated to match new accent**
rgba(0, 122, 12, 0.10) → rgba(0, 104, 16, 0.10). The subtle tint matches the new accent base color.

**HC accent2 comment corrected**
#5a4fcf claimed 7.1:1. Actual: 6.08:1. Comment updated to state the correct ratio and explain why the value is retained despite not reaching AAA.

**All verified ratios added as inline comments**
Each theme block now documents the tested combinations and their computed ratios so future token edits have a baseline to compare against rather than requiring a re-audit from scratch.

---

## Accent palette change — 2026-06-22

`--color-accent` was repurposed from a single hue (green) to a per-theme hue:
green in dark (unchanged), purple in light, amber in both high-contrast themes.
The role is unchanged: accent still means active, connected, currently affecting
the system. Only the hue varies by theme.

David specified the dark theme's `accent2` (`#B9B0FF`) for light and the dark
theme's `accent3` (`#E8B86D`) for both contrasts. Both are tuned for dark
backgrounds and fail on light surfaces:

| Proposed | Background | Ratio | Bar | Result |
|----------|-----------|-------|-----|--------|
| `#B9B0FF` (light) | `#ffffff` / `#f5f5f5` | 2.0:1 / 1.8:1 | 3:1 UI | fail |
| `#E8B86D` (HC-light) | `#ffffff` | 1.8:1 | 3:1 UI | fail |
| `#E8B86D` (HC-dark) | `#000000` | 11.5:1 | AAA | pass |

The two light-background cases were retuned to contrast-safe members of the same
hue family; HC-dark took the value as given. `--color-accent` is used only as
UI / graphical strokes in this project (outlines, the carousel, the
DurationVisualizer dots), never as text, so the governing bar is 3:1. Final
values, computed from first principles:

| Theme | `--color-accent` | Background | Ratio | Standard |
|-------|------------------|-----------|-------|----------|
| dark | `#76c17d` (unchanged) | `#141414` | 8.5:1 | AAA |
| light | `#5a4fcf` (purple) | `#ffffff` / `#f5f5f5` | 6.1:1 / 5.6:1 | AA |
| high-contrast-light | `#855a0d` (amber) | `#ffffff` | 6.1:1 | AA |
| high-contrast-dark | `#e8b86d` (amber) | `#000000` | 11.5:1 | AAA |

`-subtle` versions are tints of each theme's final accent at that theme's
existing alpha: light `rgba(90, 79, 207, 0.10)`, HC-light
`rgba(133, 90, 13, 0.10)`, HC-dark `rgba(232, 184, 109, 0.12)`.

Notes for future edits:
- **Light purple is hue-faithful to `#B9B0FF`, darkened until it reads on white.**
  `#5a4fcf` is the same value HC-light uses for `accent2`; reused here because it
  is already verified at 6.1:1 on white. It is distinct from light's own `accent2`
  (`#7b6fd4`).
- **A golden amber cannot reach AAA on white.** Pushing `#E8B86D` to AAA collapses
  it into a dark brown indistinct from `accent3`. `#855a0d` holds the amber
  identity at AA (6.1:1), matching the bar `accent2` already runs at in HC-light.
  If HC-light should be AAA throughout, drop accent to `#6b4400` (8.6:1) and accept
  the browner tone. *(Closed: keep `#855a0d`, David, 2026-07-16. 6.1:1 clears every
  governing bar with margin, and the AAA option has since become impossible on its
  own terms: `#6b4400` is now HC-light's `accent3` hex, so taking it would make
  active and warning the same color.)*
- **Hue overlap is now a known property, not a bug.** In light, accent (purple)
  shares a family with `accent2` (easing/secondary purple). In both HC themes,
  accent (amber) shares a family with `accent3` (warning amber). Contrast is fine;
  the consequence is that "active" and "secondary/warning" read as the same hue
  within a theme.


## Addendum 2026-07-16: HC-dark accent re-hued amber to light blue

`--color-accent` in `high-contrast-dark` changed `#e8b86d` (amber, 11.5:1 on
black) to `#aaccf6` (light blue, 12.7:1 on black; 11.6:1 on `#0f0f0f`
surface-active). AAA with margin against every HC-dark surface; the accent
stays UI-strokes-only so the governing bar remains 3:1. `--color-accent-subtle`
followed to `rgba(170, 204, 246, 0.12)`. HC-light keeps its amber `#855a0d`.

Two knock-on notes:

- The hue-overlap map changes for HC-dark only: accent no longer shares the
  amber family with `accent3` there; it now sits near `accent2`'s blue-violet
  family (`#c2b6ff`). "Active" and "secondary" are the adjacent hues in HC-dark
  now, not "active" and "warning."
- The themed Rive chrome that carries accent color in its own instances was
  re-authored by David the same day: `tokenlabhero2.riv` and `enterthegrid.riv`
  (their `contrastDark` instances).
- **Follow-up, same day:** the wordmark titles' `--hero-glyph` followed. HC-dark
  now sets it to `#aaccf6` (12.7:1 on black, carries the titles' legibility with
  the outline receding as before) via an exact-match override after the
  starts-with HC block; HC-light keeps the amber glyph with the near-black
  outline carrying legibility. The hero's authored `colorAccent` remains the one
  amber carrier in HC-dark, David's to re-author or keep.

## Correction 2026-07-16: accent is no longer strokes-only

The "stays UI-strokes-only so the governing bar remains 3:1" line above (and the
same claim in CLAUDE.md) had drifted by the time it was written. A census during
the deploy-checklist accent row found seven `color: var(--color-accent)` text
uses: the bug-report sent status (app footer and Motion Tiles panel), the fps
warn readout and `.warn`, the grid load error, the custom-curve reset button in
the ease grid, and the PrincipleCard classic category chip. Six are state
signals consistent with the accent role. Computed ratios (scripted, not by
eye): accent as text clears 4.5:1 in all four themes on every surface it sits
on; worst case is the category chip on its `--color-accent-subtle` tint,
5.25:1 in light and HC-light. So the text bar governs those uses and passes.

Verdict, same day: David re-specified the chips per theme and they are now
decoupled from the accent role entirely. The chips read their own
`--color-chip-*` tokens (six per theme, defined in `color.css`); accent's
"active/connected only" role holds again with no exception needed. The spec:

- **Dark** keeps the original tinted-text style, now on chip tokens: `#76c17d`
  on its 12% tint (6.5:1), `#b9b0ff` on its 12% tint (7.0:1).
- **Light** shares the same brand hues as solid fills with near-black text,
  because the hues themselves read at ~2:1 as text on white: `#141414` on
  `#76c17d` (8.5:1) and on `#b9b0ff` (9.4:1).
- **HC-light**: classic is a black outline chip (no fill), extended is white
  text on a black fill. Both 21:1.
- **HC-dark**: the surface/text inversion — classic white outline chip,
  extended black on white. Both 21:1.

Every chip carries a constant 1px border (transparent where unused) so the
outline and filled variants share exact geometry. Verified on built output
2026-07-16: computed styles per theme match the spec in all four themes.
