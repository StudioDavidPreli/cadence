// Pin the canvas Rive runtime's WASM to our own origin, the sibling of the
// webgl2 pin in riveWasm.js. See that file for the full why (CDN outages
// silently blank Rive canvases) and for the rule on which pin lives where.
//
// This module is deliberately NOT imported from main.jsx. Since the
// 2026-07-16 lazy retrofit, @rive-app/react-canvas loads only with the lazy
// Principles and Carousel chunks; importing @rive-app/canvas eagerly just to
// pin its WASM would drag the whole runtime back into the entry chunk. The
// import lives in src/hooks/useHCContrastColors.js instead: every canvas-
// runtime component imports that hook (the CLAUDE.md Rive theme-binding
// convention), and ESM evaluates a module's imports before the module itself,
// so the pin is guaranteed to run before any useRive call can trigger the
// runtime's WASM fetch. No race, no eager cost.
import { RuntimeLoader as CanvasRuntimeLoader } from '@rive-app/canvas'
import canvasWasmUrl from '@rive-app/canvas/rive.wasm?url'

CanvasRuntimeLoader.setWasmUrl(canvasWasmUrl)
