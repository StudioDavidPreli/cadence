// Pin the WebGL2 Rive runtime's WASM to a file bundled with the app and served
// from our own origin. Without this, RuntimeLoader fetches rive.wasm from
// unpkg at runtime (jsdelivr as fallback), and a blocked CDN (ad blocker,
// corporate firewall, strict CSP) silently blanks every WebGL2 canvas: the
// hero, the mobile gate, the Token Lab title, and all of Motion Tiles.
// The fix was documented as "one edit away" in
// docs/decisions/hero-webgl2-wiring-2026-07-02.md; applied 2026-07-16.
//
// This file pins ONLY the webgl2 runtime and is imported first in main.jsx:
// the landing hero mounts at first paint, so webgl2 is justified on the eager
// path. The canvas runtime's pin lives in src/utils/riveWasmCanvas.js instead,
// imported by useHCContrastColors inside the lazy Principles/Carousel graph.
// Importing @rive-app/canvas here would hold that whole runtime in the entry
// chunk and undo the 2026-07-16 lazy retrofit (the rive-scaling doc's
// addendum records the split). If you add a THIRD runtime, decide which side
// of the lazy boundary it belongs on before pinning it.
//
// `?url` makes Vite emit the .wasm as a hashed static asset and resolve to
// its served path. The fetch still happens lazily when the first canvas of
// the runtime initializes, so first paint is unchanged.
import { RuntimeLoader as WebGL2RuntimeLoader } from '@rive-app/webgl2'
import webgl2WasmUrl from '@rive-app/webgl2/rive.wasm?url'

WebGL2RuntimeLoader.setWasmUrl(webgl2WasmUrl)
