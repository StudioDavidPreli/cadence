import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { CATEGORIES } from '../../data/navigation'

// ─── NavBackground ────────────────────────────────────────────────────────────
//
// Mounts the background artwork inside the nav column. Everything surface-shaped
// lives here rather than in BackgroundArt, which knows nothing about navigation:
// measuring the column, deciding the protected baseline, and resolving the
// theme's palette.
//
// FLAGGED OFF BY DEFAULT via BACKGROUND_ENABLED (see ./backgroundFlag), which
// keeps this whole system behind a dynamic import: with the flag absent none
// of it reaches the main chunk.

const NavBackgroundArt = lazy(() => import('./NavBackgroundArt'))

// The tone ramp is the one thing not read from a token: it is a decorative
// gradient with no role in the colour system, and giving it four per-theme
// tokens would put taxonomy colour into the token layer for no benefit. It is
// only reached by cells whose strokes carried no ink at all.
const RAMPS = {
  light: ['#d8d8d8', '#b4b4b4', '#8a8a8a', '#5c5c5c'],
  dark: ['#3a3a3a', '#5c5c5c', '#8a8a8a', '#c4c4c4'],
  'high-contrast-light': ['#c2a878', '#855a0d'],
  'high-contrast-dark': ['#5a6f8c', '#aaccf6'],
}

const readToken = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// The tallest the nav items can ever get: three section headers plus the leaves
// of the largest section. Token Lab is the largest, at Overview plus every
// category.
const MAX_HEADERS = 3
const MAX_LEAVES = CATEGORIES.length + 1

// `navRef` is the <nav> element itself. The artwork renders as a direct child of
// it, with no wrapper: a wrapper would sit between the layer and the element
// whose stacking context it depends on, and BackgroundArt's dev-time host check
// would then inspect the wrapper and miss a nav that is not a stacking context.
export function NavBackground({ navRef }) {
  const [surface, setSurface] = useState(null)

  // Measure the column and derive the protected baseline.
  //
  // The baseline is the WORST CASE (the tallest expanded section), not the
  // current one. That is the ruling, and the reason is that a baseline tracking
  // the live nav height would make the artwork reflow every time a section
  // opened. Growth that rearranges itself when you touch the navigation is
  // exactly what a background should not do.
  //
  // Derived from measured row heights rather than hardcoded pixels: the
  // collapsed accordion clips its rows with overflow rather than unmounting
  // them, so a real header and a real row are always in the DOM to measure,
  // whatever the type scale does later.
  const measure = useCallback(() => {
    const nav = navRef.current
    if (!nav) return
    const headerH = nav.querySelector('button[aria-expanded]')?.offsetHeight ?? 0
    const rowH = nav.querySelector('[id] button:not([aria-expanded])')?.offsetHeight ?? 0
    const padTop = parseFloat(getComputedStyle(nav).paddingTop) || 0
    setSurface({
      width: nav.clientWidth,
      // The column scrolls, so the artwork is sized to the SCROLLPORT, not the
      // content. The layer is sticky at height 0, which pins it to the visible
      // box while the accordion scrolls over it.
      height: nav.clientHeight,
      baseline: padTop + MAX_HEADERS * headerH + MAX_LEAVES * rowH,
    })
  }, [navRef])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [measure, navRef])

  // Palette, watched rather than read in an effect. ThemeProvider writes
  // data-theme on the root, and a child's effects run before its parent's, so a
  // plain read samples one theme behind. A MutationObserver fires on the
  // mutation itself and needs neither correct effect ordering nor a frame
  // (requestAnimationFrame does not run in a background tab, which would leave
  // the palette on its initial value for anyone who switches away during load).
  const [palette, setPalette] = useState(null)
  useEffect(() => {
    const read = () => {
      const theme = document.documentElement.dataset.theme || 'dark'
      const highContrast = theme.startsWith('high-contrast')
      setPalette({
        theme,
        highContrast,
        // High contrast repaints every mark to the accent. Amendment E ruled
        // that reading --color-accent here is legitimate rather than a
        // decorative use of the accent role: the artwork is the token system
        // drawing itself.
        blanket: highContrast ? readToken('--color-accent') : null,
        // What an authored `currentColor` resolves to (ruling 2b).
        tokenInk: readToken('--color-text-base'),
        ramp: RAMPS[theme] || RAMPS.dark,
      })
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  if (!surface || !palette || surface.width <= 0) return null

  return (
    <Suspense fallback={null}>
      <NavBackgroundArt
        width={surface.width}
        height={surface.height}
        baseline={surface.baseline}
        palette={palette}
        highContrast={palette.highContrast}
      />
    </Suspense>
  )
}
