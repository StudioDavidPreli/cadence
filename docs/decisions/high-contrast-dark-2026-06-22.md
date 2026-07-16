# High-Contrast Dark Theme — 2026-06-22

Adds a fourth theme, `high-contrast-dark`, as the surface/text inversion of the
existing high-contrast theme. The existing `high-contrast` is renamed to
`high-contrast-light` so the pair is symmetric.

Standard: WCAG AA (4.5:1 normal text, 3:1 large text and UI components). All new
values clear AAA (7:1).

---

## What changed

- `src/tokens/color.css`: renamed `[data-theme="high-contrast"]` to
  `[data-theme="high-contrast-light"]`; added a `[data-theme="high-contrast-dark"]`
  block.
- `src/context/ThemeContext.jsx`: `THEMES` now
  `['light', 'dark', 'high-contrast-light', 'high-contrast-dark']`.
- `index.html` pre-paint resolver: valid list updated; a `prefers-contrast: more`
  request now honors `prefers-color-scheme` and resolves to `high-contrast-light`
  or `high-contrast-dark` accordingly.
- `src/components/ThemeSwitcher`: a `THEME_LABELS` map renders short button labels
  (`HC Light`, `HC Dark`) so four buttons fit the row. The persisted values stay
  the full ids.
- `Card.module.css` and `Toggle.module.css`: the HC-specific selectors changed
  from `[data-theme="high-contrast"]` to `[data-theme^="high-contrast"]` so they
  match both high-contrast themes. Same specificity (both attribute selectors), so
  no cascade change. The rules were already token-driven, so they invert correctly
  with no value edits.
- Rive: see "Rive color flip" below.

A stored `cadence-theme` value of `high-contrast` (the old id) is no longer in the
valid list, so it falls back once via the resolver. This is the only migration
cost and it is harmless.

---

## Token values

The surface and text tokens are the literal black/white inversion of
high-contrast-light. The accents are not literal hex inversions — inverting a hue
is meaningless — they are bright high-contrast siblings of the dark theme's
accents, chosen for AAA on the black background.

| Token | high-contrast-light | high-contrast-dark |
|---|---|---|
| bg | #ffffff | #000000 |
| bg2 | #f0f0f0 | #0f0f0f |
| surface | #000000 | #ffffff |
| surface-raised | #ffffff | #000000 |
| surface-active | #f0f0f0 | #0f0f0f |
| border / border2 | #000000 | #ffffff |
| text-base / muted / muted2 | #000000 | #ffffff |
| text-primary | #ffffff | #000000 |
| accent (green) | #006810 | #3ee06a |
| accent2 (purple) | #5a4fcf | #c2b6ff |
| accent3 (amber) | #6b4400 | #f5c563 |

---

## Verified contrast ratios

Computed from first principles (same method as the 2026-04-16 audit).
Linearization: c ≤ 0.04045 → c / 12.92, else ((c + 0.055) / 1.055) ^ 2.4.
Luminance: L = 0.2126·R + 0.7152·G + 0.0722·B. Ratio: (L1 + 0.05) / (L2 + 0.05).
On pure black the ratio reduces to 20·L + 1.

| Color | Luminance |
|---|---|
| #000000 | 0.00000 |
| #0f0f0f | 0.00478 |
| #ffffff | 1.00000 |
| #3ee06a | 0.55376 |
| #c2b6ff | 0.52145 |
| #f5c563 | 0.60246 |

| Foreground | Background | Ratio | Level |
|---|---|---|---|
| text-base #ffffff | bg #000000 | 21.0:1 | AAA |
| text-muted #ffffff | surface-active #0f0f0f | 19.2:1 | AAA |
| text-primary #000000 | surface #ffffff | 21.0:1 | AAA |
| accent #3ee06a | bg #000000 | 12.1:1 | AAA |
| accent2 #c2b6ff | bg #000000 | 11.4:1 | AAA (SVG stroke, 3:1 threshold) |
| accent3 #f5c563 | bg #000000 | 13.0:1 | AAA |

accent2 reaches AAA here, unlike the light HC variant which could only reach AA on
white. It is still used only as an SVG stroke, so the 3:1 graphical threshold is
met with wide margin.

---

## Rive color flip

The principle icons and animations are Rive files. Each `.riv` holds three view
model instances on `ViewModel1`: `Dark`, `Light`, `Contrast`, with two bindable
color properties, `colorPropertyStroke` and `colorPropertyFill`. There is no
`ContrastDark` instance.

Rather than author a fourth instance in 20+ `.riv` files, `high-contrast-dark`
reuses the `Contrast` instance and flips its two colors at runtime via
`@rive-app/react-canvas`'s `useViewModelInstanceColor`. The shared hook is
`src/hooks/useHCContrastColors.js`:

- high-contrast-light → stroke #000000, fill #ffffff (the authored Contrast values)
- high-contrast-dark → stroke #ffffff, fill #000000 (the inversion)

Both high-contrast themes bind the same `Contrast` instance, so switching between
them does not rebind (the instance name is unchanged). The colors must therefore
be asserted per theme, or the previous theme's colors would stay stuck on the
shared instance. The hook writes only for the two high-contrast themes, so the
`Dark` and `Light` instances keep their authored colors.

The hook is called once per Rive canvas in all four binding sites:
`PrincipleAnimation`, `PrincipleIcon`, `HeroAnimation`, `Carousel`.

Verified 2026-06-22: in `high-contrast-dark` the artwork paints white stroke on
black fill across the principle icons, the hero, and the carousel. The
`colorPropertyStroke` / `colorPropertyFill` names match every `.riv`, and
switching between the two high-contrast themes repaints the shared `Contrast`
instance correctly in both directions.

If dedicated `ContrastDark` instances are authored later, point the
`themeToInstanceName` maps at them and delete the `useHCContrastColors` call.


## Addendum 2026-07-16: accent is now light blue

The accent this doc tabled as green (`#3ee06a`) shipped as amber (`#e8b86d`,
per the contrast audit's 2026-06-22 addendum) and changed again 2026-07-16 to
light blue `#aaccf6` (12.7:1 AAA on black). The contrast audit doc carries the
full reasoning and ratios. `tokenlabhero2.riv` and `enterthegrid.riv` had their
`contrastDark` instances re-authored to match; the runtime stroke/fill flip
this doc defines is untouched (it never carried the accent).
