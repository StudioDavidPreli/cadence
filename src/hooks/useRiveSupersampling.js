import { useEffect } from 'react'

// ─── useRiveSupersampling ───────────────────────────────────────────────────
//
// Renders a Rive canvas at twice the device pixel ratio so the browser's
// downscale to CSS size smooths the strokes (2x supersampling).
//
// Why this exists: the webgl2 Rive Renderer does its own antialiasing. In
// browsers without the draft pixel-local-storage extension (all of them, in
// practice) it uses an MSAA fallback that is visibly coarser than the 2D
// rasterizer the old canvas runtime used, and the thin hand-drawn strokes of
// the principle art show it. Found during the 2026-07-17 single-runtime
// consolidation: at 1x density the strokes read thinner and steppier than the
// canvas-runtime baseline; at 2x supersampling they match it. The hero and the
// Motion Tiles files were authored for the Rive Renderer and are not
// supersampled.
//
// Two implementation notes, both learned the hard way:
//
// 1. Not useRive({ customDevicePixelRatio }): verified a no-op on
//    @rive-app/react-webgl2 4.29.4 (the backing store stayed at 1x device
//    ratio).
// 2. Not rive.resizeDrawingSurfaceToCanvas(ratio): it measures with
//    getBoundingClientRect, which includes CSS transforms. The expanded
//    principle card mounts its animation mid-FLIP (Framer Motion animates the
//    expansion as a transform), so the rect is a fraction of the final size
//    and the canvas locks in a tiny backing store. offsetWidth/offsetHeight
//    report layout size, which is already final during a FLIP.
//
// The ResizeObserver re-asserts the supersampled backing whenever the
// canvas's layout size actually changes (column reflow, card expand). The
// library's own resize effect writes a 1x-device-ratio backing in those same
// moments, but it does so by setting the canvas style width, which is exactly
// the layout change the observer fires on, and observer callbacks run after
// the effect, so this write lands last. startRendering() is needed because
// setting canvas.width clears the bitmap; without it a paused canvas (the
// library's Pause button) would stay blank until resumed.
//
// The ratio is capped at 4x total (device ratio capped at 2, times 2): a
// retina display gets 4x backing pixels, a 1x display gets 2x, and a dpr-3
// phone is not asked for 6x (mobile is gated anyway).
export function useRiveSupersampling(rive) {
  useEffect(() => {
    if (!rive || !rive.canvas) return
    const canvas = rive.canvas

    const apply = () => {
      // The lint rule reads the canvas mutations below as modifying the
      // `rive` hook argument. The mutation target is a DOM canvas element,
      // not React-managed state; resizing its backing store is the whole
      // point of this hook.
      // eslint-disable-next-line react-hooks/immutability
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (!w || !h) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * 2
      const bw = Math.round(w * ratio)
      const bh = Math.round(h * ratio)
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw
        canvas.height = bh
        rive.resizeToCanvas()
        rive.startRendering()
      }
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [rive])
}
