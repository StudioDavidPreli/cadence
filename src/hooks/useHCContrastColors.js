import { useEffect } from 'react'

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
// The writes go through instance.color(name) directly, NOT through the
// useViewModelInstanceColor hook. The hook's setters carry an internal property
// handle that lags one render behind an instance rebind, so on a non-HC → HC
// theme switch (Light instance → Contrast instance) they write to the handle of
// the instance that was just discarded. The old canvas runtime happened to
// reject that stale write and fall through to a fresh lookup; the webgl2
// runtime accepts it silently and the flip is lost (found during the
// 2026-07-17 single-runtime consolidation). Reading the property off the
// current instance inside the effect cannot go stale: by the time this effect
// runs, useViewModelInstance has already bound this exact instance.
//
// Call this once per Rive canvas, passing the instance returned by
// useViewModelInstance and the current theme.
export function useHCContrastColors(instance, theme) {
  useEffect(() => {
    if (!instance) return
    const stroke = instance.color('colorPropertyStroke')
    const fill = instance.color('colorPropertyFill')
    if (!stroke || !fill) return
    if (theme === 'high-contrast-dark') {
      stroke.rgb(255, 255, 255)
      fill.rgb(0, 0, 0)
    } else if (theme === 'high-contrast-light') {
      stroke.rgb(0, 0, 0)
      fill.rgb(255, 255, 255)
    }
  }, [instance, theme])
}
