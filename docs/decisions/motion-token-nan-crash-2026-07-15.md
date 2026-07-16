# Motion-token NaN crash — incident record (2026-07-15)

Opening the Motion Tiles bug-report Modal on the **deployed** site threw
`Uncaught TypeError: Element.animate: Duration (nan) must be nonnegative` and
blanked the entire page. It worked in local `npm run dev`. Fixed in `b0218a9`
(the parser), then hardened in this session (parser extraction + tests, an error
boundary, and the standing rule below).

## The failure chain, corrected and evidenced

1. **The minifier rewrote the token values.** `src/tokens/motion.css` authors
   durations as `--motion-duration-slow: 400ms`. The production build's CSS
   minifier (Vite's default esbuild minifier — no `lightningcss`/`cssnano`/
   `postcss` in the project, no `build.cssMinify`/`css` override) rewrites time
   values to their shortest equivalent: `400ms` → `.4s`, `200ms` → `.2s`,
   `0ms`/`0s` → `0s`. It also shortens `0.4` → `.4`. (It happens to keep the
   spaces inside `cubic-bezier(…)`, but a different minifier need not — see the
   parser hardening.)

2. **The reader assumed the authored spelling.** The old `parseMs` in
   `useMotionTokens` did `parseFloat(raw.slice(0, -2)) / 1000` — strip exactly
   two trailing characters (assuming `ms`) and divide. On the minified `.4s`
   that is `parseFloat(".") / 1000` = **NaN**. Every duration, and most delays,
   became NaN in the minified build.

3. **NaN reached Framer Motion's accelerated path and threw.** The Modal opens by
   animating backdrop `opacity` and panel `scale`+`opacity`. Framer Motion routes
   simple opacity/transform tweens through the Web Animations API for GPU
   acceleration; the crash stack is the evidence (`initPlayback` → `Element.animate`).
   WAAPI multiplies the seconds duration by 1000 and calls
   `element.animate(keyframes, { duration: NaN })`, which throws. Framer Motion's
   main-thread path, by contrast, tolerates a NaN duration (the animation just
   misbehaves silently).

4. **With no error boundary, the throw blanked the whole app.** The throw
   happened during React's commit of the open state; nothing caught it, so React
   unmounted the entire root to a blank page. (This session adds the boundary.)

## Why exactly one surface was observed to crash

The intuitive theory — "Token Lab writes tokens via JS, so only out-of-provider
surfaces read the minified stylesheet" — is **half right, and its conclusion is
wrong**.

- **Provider-scoped surfaces are genuinely immune, but not because they read
  JS-authored `ms` strings.** They read *nothing*: `useMotionTokens` short-circuits
  `if (override) return override` before any `getComputedStyle` call. The provider
  is fed **numeric seconds** — `motionPresets.js` holds ms integers
  (`{ fast: 100, base: 200, slow: 400 }`) and `stateToTokens` divides by 1000 in
  JS. The parser is never invoked on this path. Immune surfaces: Token Lab's
  preview column and the Timing / ReducedMotion / SolidDrawing / Systematization
  principle demos.

- **The provider boundary does not explain the single observed crash.** The
  fallback (`:root` CSS read) path is the app-wide default: ~24 UI components
  (Modal, Dropdown, Drawer, Tooltip, Card, Stepper, Spinner, ProgressBar,
  Carousel, Toggle, Button, NotificationBadge, NavItem, …), every `PrincipleCard`,
  and the non-demo principles all read it. **All of them had NaN durations in
  prod.** They were not survivors — they were latent, unexercised crashes. The
  Motion Tiles Modal is simply the surface that was clicked on the deployed build.
  Any of the others would throw the same way once its accelerated animation fired.

## Why dev could not show it

The Vite dev server does not minify CSS. `getComputedStyle` returned the authored
`400ms`, which `parseMs` parsed correctly. The bug existed only in the minified
artifact — which is why the standing rule below requires verifying changed UI
paths on **built** output.

## Does it predate the Workers conversion?

**Yes.** The CSS minifier is Vite's esbuild default. The pre-merge `vite.config.js`
(`20e0272`, before `@cloudflare/vite-plugin`) was `plugins: [react()]` with no CSS
override — identical minification. The Cloudflare Vite plugin wraps the worker/asset
build and does not touch the CSS pipeline. The bug would have shipped on Cloudflare
Pages, on plain Vite, on any minified deploy. It is unrelated to the Pages→Workers
work; it surfaced then only because the Modal was first exercised on a minified
deploy.

## Process note (kept honest)

The fix itself (`b0218a9`) shipped **outside** the four-phase workflow: the prior
session made a unilateral containment decision (silent NaN fallback) and pushed
without a recon report or a gate. The fix was correct; the process debt was real.
This session paid it down — recon, gate, extraction, tests, boundary, docs — and
is recorded here so the timeline stays accurate.

## What this session changed

- `src/tokens/parse.js` — parsers extracted and unit tested
  (`src/tokens/parse.test.js`): `parseMs` reads the number and lets the unit
  suffix set the scale; `parseCubicBezier` splits on `,` (not `", "`);
  `parseTokenValue` falls back on NaN and, in dev only, `console.error`s the
  offending token (silent in prod).
- `src/components/ErrorBoundary/` — a class-component boundary. Wired at the app
  root (`main.jsx`) as a backstop and around the lazy `MotionTilesGrid`
  (`MotionTilesSection.jsx`) so a grid crash degrades in place.
- The standing built-output verification rule, recorded in `CLAUDE.md`.
