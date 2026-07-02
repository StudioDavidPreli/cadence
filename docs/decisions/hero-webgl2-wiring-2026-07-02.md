# Hero3 Rive wiring and the WebGL2 runtime (2026-07-02)

Status: RESOLVED. The hero renders and is fully functional. It began rendering
after the runtime was bumped to `@rive-app/react-webgl2@4.29.4` (from 4.28.1);
the exact trigger between the bump and a dev-server restart was not isolated, but
the blank canvas has not recurred since. The diagnostic sections below are kept
as a record of how the issue was worked and why the wiring diverges from the
principle files. The final wiring facts (runtime, view model name, HC handling)
are still current. See "Resolution and final shape" at the end.

---

## Reported symptom

The landing hero animation does not appear. The reported observation is that no
scripts are loading. The build compiles and the token-integrity gate passes, so
the failure is at runtime in the browser, not at compile time. See "Leading
hypothesis" below: the WebGL2 runtime is the one place in this app that fetches
its renderer WASM over the network, and a blocked fetch produces a blank canvas
with no thrown error.

---

## The file

`public/rive/hero3.riv`, 90,103 bytes, added 2026-07-02.

Names read directly from the binary (`strings public/rive/hero3.riv`), so these
are authoritative, not inferred from the title:

- Artboard: `Hero3`
- State machine: `hero3SM`
- View model: `Hero3ViewModel` (not the `ViewModel1` the principle files use)
- View model instances: `Dark`, `Light`, `Contrast`
- Bindable colors: `colorPropertyStroke`, `colorPropertyFill`, `colorAccent`

Interaction model, per David: a click reseeds the animation; mouse position drives
scale and speed. These live inside the state machine. React passes nothing in.

The file also contains several nested state machines (`titlesSM`, `bike1SM`,
`conductorSM`, `crewSM`, `marchingSM`, `dancersSM`, `runnersSM`, `horseSM`,
`birdsSM`). The React side drives only the top-level `hero3SM`.

---

## What was implemented

All changes are in `src/components/HeroAnimation/index.jsx`, plus one dependency.

1. **Runtime switch.** The import moved from `@rive-app/react-canvas` to
   `@rive-app/react-webgl2`. `hero3.riv` is authored for the Rive Renderer, which
   the canvas runtime cannot draw. Installed `@rive-app/react-webgl2@latest`,
   which resolved to `4.29.4`. Note the version skew: `@rive-app/react-canvas`
   stays at `4.28.1`, so the two React wrappers are on different minors. The hook
   API is compatible, and the skew is low-risk here because the hero's color
   binding runs entirely on the webgl2 runtime (point 4 below), so no instance
   object crosses between the two runtimes. The underlying low-level runtime for
   webgl2 is `@rive-app/webgl2@2.38.4`.

2. **Constants.** `HERO_RIV` now reads
   `{ src: '/rive/hero3.riv', artboard: 'Hero3', stateMachine: 'hero3SM' }`.
   `artboard` is passed to `useRive` explicitly. No other Rive component in the app
   passes `artboard` (they rely on the default), so this is a small divergence,
   made because the file was named to us and being explicit guards against the
   file carrying more than one artboard later.

3. **View model name.** `useViewModel(rive, { name: 'Hero3ViewModel' })`. Binding
   `ViewModel1` here would silently return null and no theme colors would apply.

4. **High-contrast color handling done on the WebGL2 runtime.** The rest of the
   app flips stroke and fill for `high-contrast-dark` through the shared
   `useHCContrastColors` hook. That hook binds color through the react-canvas
   runtime. The hero's instance comes from the react-webgl2 runtime. Passing an
   instance from one runtime into the color hook of the other works only by
   duck-typing and is fragile, so the hero does its own flip inline using
   react-webgl2's `useViewModelInstanceColor`. The logic mirrors the shared hook:
   both HC themes bind the single `Contrast` instance, so the colors are asserted
   per theme (HC-dark: white stroke, black fill; HC-light: the inverse).
   `colorAccent` is left at its authored value because accent is amber in both HC
   themes and does not flip.

`autoplay` remains gated on `useReducedMotion()`. The text fallback (`!rive`) and
the description copy below the canvas are unchanged.

---

## The two-runtime situation

The app now loads two Rive runtimes:

- `@rive-app/react-canvas` — every principle animation, principle icon, hero icon
  in the carousel, and the carousel statics. Roughly thirty canvases.
- `@rive-app/react-webgl2` — the hero alone.

Each ships its own WASM and initializes independently. The hero and the principle
grids never mount at the same time, so the two never share a moment on screen.
This is a real divergence from the single-runtime assumption in CLAUDE.md's Rive
section and should be recorded there once the hero renders.

---

## Leading hypothesis: the WebGL2 WASM fetch

This is the most likely cause of a blank hero and matches "no scripts are loading."

The react-canvas runtime, which every working animation uses, resolves its WASM
in a way that has always worked in this project. The react-webgl2 runtime does
**not** behave the same way. Its default is to fetch the renderer WASM from a CDN
at runtime. The URL is built from the package version:

```
https://cdn.jsdelivr.net/npm/@rive-app/webgl2@2.38.4/rive.wasm
```

(confirmed in `node_modules/@rive-app/webgl2/rive.js`: the default `wasmURL` is
`"https://cdn.jsdelivr.net/npm/".concat(package name, "@", version, "/rive.wasm")`,
which resolves to the low-level `@rive-app/webgl2@2.38.4` package, not the React
wrapper version). The 2026-07-02 bump to react-webgl2 `4.29.4` did not change this
behavior: the runtime still fetches its WASM from the CDN by default.

If that request fails — offline dev, a firewall or DNS block on jsdelivr, an ad or
tracker blocker, or a Content-Security-Policy `connect-src`/`script-src` that does
not allow jsdelivr — the renderer never initializes. There is no thrown error in
the component; `rive` stays null and the canvas stays blank. The already-cached
react-canvas WASM keeps working, which is why the principles still animate while
the hero does not.

### How to confirm

In the browser with the hero visible:

1. Open the Network tab, filter for `wasm` or `jsdelivr`, reload. Look for a
   request to `cdn.jsdelivr.net/.../@rive-app/webgl2@2.38.4/rive.wasm` and check
   whether it is blocked, failed, or pending.
2. Open the Console. A CSP violation or a failed fetch to jsdelivr names the
   blocked URL directly.

### The fix if confirmed

The WASM already exists locally at `node_modules/@rive-app/webgl2/rive.wasm`. Pin
the runtime to a locally served copy instead of the CDN, using the WebGL2
runtime's own loader, before any hero renders:

```javascript
import { RuntimeLoader } from '@rive-app/react-webgl2'
// riveWasmUrl resolves to a bundled asset Vite serves from our own origin.
import riveWasmUrl from '@rive-app/webgl2/rive.wasm?url'

RuntimeLoader.setWasmUrl(riveWasmUrl)
```

Run this once at app startup (module top level or an entry effect), ahead of the
first `useRive`. This removes the network dependency and the CSP surface in one
move. It also makes the hero work offline, which the CDN default does not.

Note: whichever path fixes this, react-canvas resolves its WASM the same way under
the hood, so if the local-pin route is taken it is worth pinning both runtimes for
consistency rather than leaving one on the CDN.

---

## Other angles, in order of likelihood

1. **Dev server not restarted after the new dependency.** A new package and new
   imports are not always picked up by an already-running Vite process or by HMR.
   Fully stop and restart `npm run dev` before trusting a blank result. This
   matches a known pattern in this project where HMR misses new files and imports.

2. **Pointer events, if it renders but does not react.** Click-to-reseed and
   mouse-driven scale and speed come from the state machine's hitboxes. If the art
   paints but does not respond, check that the `.riv` hitboxes cover the artboard
   and that no CSS layer above `.canvas` in `HeroAnimation.module.css` intercepts
   pointer events.

3. **Artboard name.** `artboard: 'Hero3'` is passed explicitly and matches the
   binary. If a future export renames it, `useRive` renders blank. Removing the
   `artboard` option falls back to the file's default artboard, which is a quick
   thing to try if the name is ever in doubt.

4. **WebGL2 context availability.** The runtime needs a WebGL2 context. Any browser
   this project targets has it, but a hardware-acceleration-disabled browser or a
   headless context would not. Low probability, listed for completeness.

---

## Verification state at time of writing

- Dependency bumped to `@rive-app/react-webgl2@4.29.4` on 2026-07-02 (was 4.28.1).
  `npm run build` and the token gate both still pass after the bump. The bump did
  not change the CDN WASM behavior described above.
- `npm run build` succeeds. Output warns the JS chunk is over 500 kB, expected
  now that a second Rive runtime is bundled.
- `npx vitest run src/tokens/tokenIntegrity.test.js` passes (4 tests).
- Runtime rendering confirmed by David: the hero renders and is fully functional.

---

## Resolution and final shape

The hero is live. Final wiring, all in `src/components/HeroAnimation/index.jsx`:

- Runtime: `@rive-app/react-webgl2` (the only component on it; the ~30 principle,
  icon, and carousel canvases stay on `@rive-app/react-canvas`).
- `useRive`: `src /rive/hero3.riv`, artboard `Hero3`, state machine `hero3SM`.
- View model: `Hero3ViewModel`; instances `Dark` / `Light` / `Contrast`.
- High-contrast: the stroke/fill flip for `high-contrast-dark` is done inline with
  react-webgl2's `useViewModelInstanceColor`, NOT the shared `useHCContrastColors`
  hook, because that hook binds through the react-canvas runtime and the hero's
  instance is a webgl2 object. `colorAccent` is left at its authored value (amber
  in both HC themes, so it does not flip).

The WASM-fetch hypothesis was not needed in the end, but the `RuntimeLoader`
`setWasmUrl` pin (local `rive.wasm` via a Vite `?url` import) remains the correct
fix if the hero ever goes blank in an offline or CSP-restricted deploy. Left
un-applied so as not to add machinery the working app does not need; noted here so
it is one edit away.

### Presentation pass (same session)

Padding and sizing, in `HeroAnimation.module.css`, tuned via three variables at
the top of `.hero`: `--hero-art-pad` (breathing room), `--hero-art-scale` (art
size inside the padded box), `--hero-text-span` (description width). One structural
detail worth keeping: an inner `.canvasClip` div owns the overflow clip. `overflow:
hidden` clips at a box's padding box (outer edge), so putting the clip on the
padded `.riveContainer` let a scaled-up canvas grow out over the padding and erase
it. The inner clip box sits at the padding line, so scaling the art grows it inside
the padding instead of past it.

---

## Wordmark: pixel-title SVG (same session)

The top-bar "Cadence" serif text was replaced by the themed pixel-title SVG
(`public/titleSVGS/titleThemed.svg`). New component `src/components/Wordmark/`
(button behavior unchanged: still the home button reading the nav actions).

- The SVG is inlined as JSX (108 rects, generated from the source file so no
  transcription error), NOT loaded through `<img>`. Its two fills read CSS custom
  properties, and an `<img>` renders only the authored fallback colors.
- Theme wiring: `--hero-glyph` and `--hero-outline`, defined once on `:root` in
  `src/tokens/color.css` as references to existing verified tokens —
  `--color-text-base` (letterform) and `--color-accent` (the dilated halo, a
  graphical-stroke role at the 3:1 bar). They re-resolve per theme automatically
  because the referenced tokens are themed; no per-theme block and no new contrast
  check needed. The accent mapping means the halo is green (dark) / purple (light)
  / amber (both HC).
- `shapeRendering="crispEdges"` on the `<svg>`. Without it, the abutting rects'
  shared horizontal edges anti-alias independently at the fractional render scale
  and a hairline of the layer beneath bleeds through every row boundary (visible
  as horizontal raster lines). Snapping edges to the pixel grid removes the seams
  and is the correct treatment for pixel art.
- Accessible name stays on the button; the `<svg>` is `aria-hidden` +
  `focusable="false"`. Dead `.wordmark` rules removed from `App.module.css`.

`titleThemed.svg` remains the source of truth for the artwork; `subTitleThemed.svg`
in the same folder is not yet used anywhere.
