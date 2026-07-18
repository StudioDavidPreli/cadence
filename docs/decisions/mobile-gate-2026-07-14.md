# Mobile viewport gate (2026-07-14)

A hard viewport gate for Cadence. Below 720px the app shell does not render; in
its place the gate stacks a Studio David Preli logo that links out to
davidpreli.com, the mobile hero animation, and a short copy block explaining the
tool is built for a desktop screen. There is no way *into* the app below 720px;
the studio link is the one way *onward*. At or above 720px the app renders
exactly as before. This records the decisions behind `src/components/MobileGate/`
and its mount in `App.jsx`.

**Amended 2026-07-15:** added the studio logo exit (see "The exit" below), so the
gate is no longer a pure dead end. The three elements share one width
(`--gate-content-width`, 460px) and the logo sits at the top of the stack, above
the hero and copy. Outer padding is 16px, matching the 16px inter-element gap.

## Why a hard gate

Cadence is a three-column desktop tool: a controls rail, a nav column, and a
demo area, with breakpoints already collapsing the nav to a rail at ≤1024px and
the controls to a rail at ≤720px. Below 720px the layout has nowhere left to go
— the tool is not usable on a phone, and a degraded-but-present shell would
invite interaction the tool can't honor. The gate states that plainly instead.
No "continue anyway" link: the decision is that a phone visitor is better served
by a clear redirect to desktop than by a broken workspace.

## Mount point: above NavigationProvider

The gate is an early return at the top of `App()`, before `NavigationProvider`:

```jsx
export default function App() {
  const gated = useMediaQuery('(max-width: 719px)')
  if (gated) return <MobileGate />
  return <NavigationProvider>…</NavigationProvider>
}
```

Returning above the provider suppresses the entire shell at once — Wordmark,
ThemeSwitcher, TokenLab, nav, demo area — because none of them mount. It also
makes route safety structural rather than careful: `useHashSync` lives inside
`NavigationProvider`, so under the gate the routing machinery never mounts and
*cannot* consume or rewrite the hash (not even the cosmetic `#/` normalization).
A phone deep link like `#/motion-tiles/grid` stays byte-for-byte intact; opened
at desktop width, `NavigationProvider` mounts fresh and `parseHash` resolves it.
A live resize from gate → shell seeds the same way from the untouched hash.

Theme still comes from `ThemeProvider`, which wraps `App` one level up in
`main.jsx`, so the gate reflects the persisted theme even though the switcher UI
is gone.

## Breakpoint: 719, not 720

The gate query is `(max-width: 719px)` — "below 720". TokenLab's controls rail
uses `(max-width: 720px)`, which *includes* 720. These are deliberately
different boundaries around the same 720 number, not a second nearby number: the
feature requires that at exactly 720px the app still renders (with its rails), so
the gate must activate strictly below it. `useMediaQuery` re-renders on the
`change` event, so rotation and window resize flip the gate live.

## Rive: own thin instance, not a shared component

The gate carries its own copy of the desktop hero's Rive wiring rather than
reusing `HeroAnimation` or extracting a shared hook. The tradeoff was surfaced
and David chose this: the landing hero stays single-purpose (its two-block layout
and canonical description copy are wrong for the gate), at the cost of
duplicating ~50 lines of Rive wiring.

The gate renders a **mobile-specific asset** — `heromobile.riv` (artboard
`heroMobile`, state machine `heroMobileSM`), a shorter composition sized for a
phone. The desktop hero3.riv turned out wrong for the gate on deploy (its
proportions did not sit well in the narrow stack), so it was replaced
2026-07-15. The asset differs, but it keeps the same `Hero3ViewModel` /
theme-instance / reduced-motion contract as `HeroAnimation`, so the wiring below
must still stay in step with that view model if it changes:

- WebGL2 runtime (`@rive-app/react-webgl2`) — the asset is authored for the Rive
  Renderer. The gate and the desktop hero never co-mount (one is <720px, the
  other ≥720px), so their webgl2 canvases never share a moment on screen.
- `Hero3ViewModel` with Light / Dark / Contrast instances; the high-contrast-
  dark stroke/fill flip through webgl2's own `useViewModelInstanceColor`.
- Reduced motion via framer-motion's `useReducedMotion()` → `autoplay={!reduce}`,
  matching the hero. Note this is a *different* path from the MotionTokens
  provider that governs token durations; the hero's Rive autoplay uses the
  framer-motion hook directly, so the gate does too.
- The `!rive` fallback (a quiet "Cadence" line the canvas paints over).

## Sizing: the part that took three passes

The layout went through three corrections after the wiring was right, all in the
art box. The final rule is: **one definite dimension, plus `overflow: hidden`** —
exactly the grid logo box's approach (`MotionTilesGrid.module.css`).

1. **Too small.** The box was `flex: 1`, so hero3 `contain`-fit to a small band
   stranded in a tall column. Fixed by deriving the box aspect from `rive.bounds`
   (the `EnterGridButton` / grid-logo pattern) and driving it via `aspect-ratio`,
   so the art fills its width with no letterbox. Art and copy center as a group.
2. **Copy clipped.** `overflow: hidden` on the centered group cut the copy off
   when art + copy exceeded the viewport. Switched to `overflow-y: auto` so a
   short/landscape screen scrolls instead of clipping.
3. **Canvas over the copy.** The box mixed `aspect-ratio` with `max-height`. When
   max-height clamped the aspect-derived height, the canvas kept painting at the
   taller size and spilled over the copy — and the box had no `overflow: hidden`.
   Fixed by dropping `max-height` (one definite dimension: width, capped at
   460px; height from aspect) and clipping the box.

Consequence to know: with `max-height` gone, the art is bounded by width, not
viewport height. For hero3's landscape wordmark this stays compact; if the
artboard were portrait it could get tall on a short window. The single tuning
lever is `--gate-content-width` on `.gate` (460px), which the hero box, the
studio logo, and the copy all read — so it moves the whole stack's width at once.

## The exit (added 2026-07-15)

`StudioLogoLink` sits at the top of the gate, above the hero and copy: the
`singlelinelogo.riv` Studio David Preli title, wrapped in an
`<a href="https://davidpreli.com">`. A phone visitor is otherwise stranded, and
the studio home is the natural place to send them — it is not an escape *into*
the desktop-only app, so it does not soften the hard gate.

- **Its own component**, not a second `useRive` inside `MobileGate`, to keep the
  Rive-hook isolation the rest of the app uses. Two webgl2 canvases co-mount in
  the gate (hero3 + this); fine, the Motion Tiles grid mounts many at once.
- **Four distinct view-model instances** — `darkMode`, `lightMode`,
  `contrastDark`, `contrastLight`, one per display mode. Unlike hero3 (which
  shares one `Contrast` instance and flips its colors at runtime), each theme
  binds its own instance, so there is no color write here.
- **`<a>`, not a button**, because it navigates externally; same tab, since the
  visitor is leaving Cadence, not opening a side trip. `pointer-events: none` on
  the canvas so the click reaches the anchor, and a `:focus-visible` accent ring
  since the Rive title carries no default focus outline. Reduced motion follows
  the hero (`autoplay={!reduce}`).
- Sized by the same `rive.bounds` → `aspect-ratio` + `overflow: hidden` setup as
  the hero box. It shares the hero's width cap (`--gate-content-width`), so the
  logo, hero, and copy are the same width by construction — tune that one value
  to move all three. Its own artboard aspect keeps it a slim line, not a second
  hero.

## Copy (approved, verbatim)

> Cadence is a motion design system explorer. The tooling wants a desktop screen.
> Open this on your computer and everything will be where it should be.

## Dead-code note

The `@media (max-height: 600px)` body-scroll unlock in `App.module.css` stays.
Under the gate it never applies (the shell doesn't render), but it remains live
for a desktop window resized short mid-session at ≥720px wide. It is not dead —
left in place, no follow-up.

## Files

- `src/components/MobileGate/index.jsx` — component + own mobile-hero wiring
  (heromobile.riv); stacks studio logo, hero, copy
- `src/components/MobileGate/StudioLogoLink.jsx` — the davidpreli.com exit logo
- `src/components/MobileGate/MobileGate.module.css` — styles, theme custom
  properties only
- `src/App.jsx` — gate query + early return mount
- Reused unchanged: `src/hooks/useMediaQuery.js`

## Manual verification (David, visual)

Narrow desktop window below / above 720px; phone portrait and landscape; a deep
link opened under the gate then at desktop width; reduced motion on; all three
theme families (light, dark, both high-contrast).

---

## Addendum (2026-07-18): the hero contract homogenized; a poster under reduce-motion

Two changes, one session:

- **`heromobile.riv` joined the four-instance convention.** David re-exported
  the file with `darkMode` / `lightMode` / `contrastDark` / `contrastLight`
  (the same homogenized set as `hero3.riv`, and the same convention the
  Studio logo link used from day one), and `MobileGate/index.jsx` moved to
  the clean 1:1 map: the `Dark`/`Light`/`Contrast` instances and the runtime
  stroke/fill flip are gone. The "keep the two heroes in step" warning in the
  hero wiring doc is closed; there is now one contract to keep.
- **Reduced motion renders a poster, not a paused canvas.** Under the OS
  preference the gate shows a per-theme static SVG
  (`/public/fallBacks/hero3Mobile<Theme>.svg`, `riveFallbackSrc`) instead of
  mounting the Rive canvas, so the `.riv` and the WebGL surface are skipped
  entirely. The box's aspect var comes from the SVG's natural size on load,
  mirroring the `rive.bounds` read on the Rive path. The Studio logo link
  followed the same evening once David exported its four posters
  (`singleLineLogo<Theme>.svg`), so the whole gate is Rive-free under the
  preference.
