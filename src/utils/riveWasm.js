// Pin both Rive runtimes' WASM to files bundled with the app and served from
// our own origin. Without this, each RuntimeLoader fetches rive.wasm from
// unpkg at runtime (jsdelivr as fallback), and a blocked CDN (ad blocker,
// corporate firewall, strict CSP) silently blanks every Rive canvas: the
// hero, the mobile gate, the Token Lab title, and all of Motion Tiles.
// The fix was documented as "one edit away" in
// docs/decisions/hero-webgl2-wiring-2026-07-02.md; applied 2026-07-16.
//
// The two runtimes are separate module graphs with separate RuntimeLoader
// classes and different WASM binaries, so each is pinned with its own file.
// `?url` makes Vite emit the .wasm as a hashed static asset and resolve to
// its served path. The fetch still happens lazily when the first canvas of
// that runtime initializes, so first paint is unchanged.
//
// If the Principles Library is ever retrofitted to React.lazy (the
// rive-scaling plan), move the canvas pin into that subtree so importing
// @rive-app/canvas here does not hold the runtime in the entry chunk. Today
// both runtimes are already on the eager path, so this costs nothing.
import { RuntimeLoader as WebGL2RuntimeLoader } from '@rive-app/webgl2'
import { RuntimeLoader as CanvasRuntimeLoader } from '@rive-app/canvas'
import webgl2WasmUrl from '@rive-app/webgl2/rive.wasm?url'
import canvasWasmUrl from '@rive-app/canvas/rive.wasm?url'

WebGL2RuntimeLoader.setWasmUrl(webgl2WasmUrl)
CanvasRuntimeLoader.setWasmUrl(canvasWasmUrl)
