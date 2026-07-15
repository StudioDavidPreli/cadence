# Mobile viewport gate (2026-07-14)

A hard viewport gate for Cadence. Below 720px the app shell does not render; in
its place the gate shows the hero3.riv animation over a short copy block
explaining the tool is built for a desktop screen, with a Studio David Preli
logo beneath it that links out to davidpreli.com. There is no way *into* the app
below 720px; the studio link is the one way *onward*. At or above 720px the app
renders exactly as before. This records the decisions behind
`src/components/MobileGate/` and its mount in `App.jsx`.

**Amended 2026-07-15:** added the studio logo exit (see "The exit" below). The
original gate was a pure dead end; a phone visitor now has one way out.

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

The gate carries its own copy of the hero3.riv wiring rather than reusing
`HeroAnimation` or extracting a shared hook. The tradeoff was surfaced and David
chose this: the landing hero stays single-purpose (its two-block layout and
canonical description copy are wrong for the gate), at the cost of duplicating
~50 lines of Rive wiring. The duplicated part must stay in step with
`HeroAnimation` if hero3's view model or binding changes:

- WebGL2 runtime (`@rive-app/react-webgl2`) — hero3 is authored for the Rive
  Renderer. The gate and the hero never co-mount (one is <720px, the other
  ≥720px), so the two webgl2 canvases never share a moment on screen.
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
lever is the `460px` `max-width` on `.riveContainer`.

## The exit (added 2026-07-15)

`StudioLogoLink` sits at the foot of the gate: the `singlelinelogo.riv` Studio
David Preli title, wrapped in an `<a href="https://davidpreli.com">`. A phone
visitor is otherwise stranded, and the studio home is the natural place to send
them — it is not an escape *into* the desktop-only app, so it does not soften the
hard gate.

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
  the hero box, kept modest (`max-width: 220px`) so it reads as a signature, not
  a second hero. `max-width` is the size lever.

## Copy (approved, verbatim)

> Cadence is a motion design system explorer. The tooling wants a desktop screen.
> Open this on your computer and everything will be where it should be.

## Dead-code note

The `@media (max-height: 600px)` body-scroll unlock in `App.module.css` stays.
Under the gate it never applies (the shell doesn't render), but it remains live
for a desktop window resized short mid-session at ≥720px wide. It is not dead —
left in place, no follow-up.

## Files

- `src/components/MobileGate/index.jsx` — component + own hero3 wiring
- `src/components/MobileGate/MobileGate.module.css` — styles, theme custom
  properties only
- `src/App.jsx` — gate query + early return mount
- Reused unchanged: `src/hooks/useMediaQuery.js`

## Manual verification (David, visual)

Narrow desktop window below / above 720px; phone portrait and landscape; a deep
link opened under the gate then at desktop width; reduced motion on; all three
theme families (light, dark, both high-contrast).
