import { useEffect } from 'react'
import { readCssColor } from '../utils/cssColor'

// ─── useRiveAccentColor ─────────────────────────────────────────────────────
//
// Writes the active theme's `--color-accent` into a .riv's `colorPropertyOutline`
// view model property, so an outline authored in Rive carries the same accent
// the rest of the UI uses instead of a color baked at export time.
//
// This is the token architecture reaching one surface further. The accent is
// defined once in color.css, per theme; every other consumer reads it through
// the cascade. A canvas cannot, so this hook is the crossing point, and it
// still READS the token rather than restating it. Four hard-coded hex values in
// JavaScript would be the same class of bug as a hard-coded duration.
//
// The property is optional. `principles_icon11.riv` (Solid Drawing) is the
// first file authored with it; the other seventeen icons carry only
// colorPropertyStroke and colorPropertyFill, and `instance.color()` returns
// null for a property that is not there, so the hook no-ops on them. That is
// why PrincipleIcon can call it unconditionally for every principle: the .riv
// decides whether it has an outline to color, not a table in the component.
//
// Same two rules useHCContrastColors documents, for the same reasons:
//   - the write goes through `instance.color(name)` read fresh inside the
//     effect, never through a useViewModelInstanceColor setter, whose property
//     handle lags a render behind an instance rebind (the webgl2 runtime
//     accepts the stale write silently and the change is lost)
//   - call it AFTER useViewModelInstance, so by the time this effect runs the
//     instance it reads is the one that is bound
//
// `theme` is in the dependency list because it is what changes the token's
// value. On a dark → light step the instance rebinds AND the accent moves, and
// the effect has to re-run for both.
//
// `scope` is the element the token is read from, defaulting to the document
// root. Only the capture rig passes it: that scene scopes a theme to one panel,
// and every theme selector in color.css is :root-anchored, so the root would
// report the document's accent rather than the panel's.
export function useRiveAccentColor(instance, theme, scope) {
  useEffect(() => {
    if (!instance) return
    const outline = instance.color('colorPropertyOutline')
    if (!outline) return

    const accent = readCssColor('--color-accent', scope)
    // No accent resolved means the token is missing or in a syntax the resolver
    // does not handle. Leaving the .riv's authored color in place is the better
    // failure: a wrong outline color reads as a design decision, an unchanged
    // one reads as what it is.
    if (!accent) return

    outline.rgb(accent.r, accent.g, accent.b)
  }, [instance, theme, scope])
}
