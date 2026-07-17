// Pin the WebGL2 Rive runtime's WASM to a file bundled with the app and served
// from our own origin. Without this, RuntimeLoader fetches rive.wasm from
// unpkg at runtime (jsdelivr as fallback), and a blocked CDN (ad blocker,
// corporate firewall, strict CSP) silently blanks every WebGL2 canvas: the
// hero, the mobile gate, the Token Lab title, and all of Motion Tiles.
// The fix was documented as "one edit away" in
// docs/decisions/hero-webgl2-wiring-2026-07-02.md; applied 2026-07-16.
//
// webgl2 is the app's only Rive runtime since the 2026-07-17 consolidation:
// every .riv in the app runs on it, and @rive-app/react-canvas (whose pin
// lived in src/utils/riveWasmCanvas.js) is removed. This file is imported
// first in main.jsx: the landing hero mounts at first paint, so the pin must
// be on the eager path. If a SECOND runtime is ever added back, decide which
// side of the lazy boundary it belongs on before pinning it (the rive-scaling
// doc's addendum records how the split worked when there were two).
//
// `?url` makes Vite emit the .wasm as a hashed static asset and resolve to
// its served path. The fetch still happens lazily when the first canvas of
// the runtime initializes, so first paint is unchanged.
import { RuntimeLoader as WebGL2RuntimeLoader } from '@rive-app/webgl2'
import webgl2WasmUrl from '@rive-app/webgl2/rive.wasm?url'

WebGL2RuntimeLoader.setWasmUrl(webgl2WasmUrl)
