import { useEffect } from 'react'
// Side effect: pins the canvas runtime's WASM to our origin. It lives here,
// not in main.jsx, because this hook is the one module every canvas-runtime
// component imports (the CLAUDE.md theme-binding convention), and it must stay
// inside the lazy Principles/Carousel graph so @rive-app/canvas is not dragged
// back into the eager entry chunk. See src/utils/riveWasmCanvas.js.
import '../utils/riveWasmCanvas'
import { useViewModelInstanceColor } from '@rive-app/react-canvas'

// ─── useHCContrastColors ────────────────────────────────────────────────────
//
// high-contrast-dark reuses the 'Contrast' Rive view model instance instead of a
// separately authored 'ContrastDark' instance. Both high-contrast themes bind
// 'Contrast' (see each canvas's themeToInstanceName map), so within one canvas
// they share a single instance object. That means the stroke/fill colors must be
// asserted per theme: switching high-contrast-light <-> high-contrast-dark does
// not rebind (the instance name is unchanged), so without this the previous
// theme's colors would stay stuck on the shared instance.
//
// colorPropertyStroke / colorPropertyFill are the bindable color properties on
// ViewModel1 in every .riv (convention documented in HeroAnimation's header).
//   high-contrast-light: stroke #000, fill #fff   (the authored Contrast values)
//   high-contrast-dark:  stroke #fff, fill #000   (the inversion)
// The 'Dark' and 'Light' instances are never touched — the effect only writes
// for the two high-contrast themes, so non-HC themes keep their authored colors.
//
// Call this once per Rive canvas, passing the instance returned by
// useViewModelInstance and the current theme.
export function useHCContrastColors(instance, theme) {
  const stroke = useViewModelInstanceColor('colorPropertyStroke', instance)
  const fill = useViewModelInstanceColor('colorPropertyFill', instance)

  useEffect(() => {
    if (!instance) return
    if (theme === 'high-contrast-dark') {
      stroke.setRgb(255, 255, 255)
      fill.setRgb(0, 0, 0)
    } else if (theme === 'high-contrast-light') {
      stroke.setRgb(0, 0, 0)
      fill.setRgb(255, 255, 255)
    }
    // Re-run on theme/instance change only. The stroke/fill setter objects are
    // re-created each render; depending on them would write on every render. The
    // writes are idempotent, so theme and instance are the meaningful triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, theme])
}
