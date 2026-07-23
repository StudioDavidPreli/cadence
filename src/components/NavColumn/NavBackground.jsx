import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavState } from '../../context/NavigationContext'
import { SECTIONS } from '../../data/navigation'

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

// ── Which face each section wears ─────────────────────────────────────────────
//
// The two faces are one composition rendered two ways, and which way is a
// property of the tool you are in, not of the artwork: the vector face for the
// Principles dialect, the pixel face for the Token Lab dialect (handoff
// 2026-07-22, section 1). The nav column is shared by all three tools, so the
// face follows the active section rather than being fixed at the mount.
//
// Motion Tiles is the one this mapping was never given: it postdates the
// dialect split. Pixel, because the tool itself is a grid of cells, but that is
// a reading rather than a ruling, and David's call to overturn.
//
// 'both' is deliberately absent. It is a lab affordance for comparing the two
// renderings side by side; on a real surface it draws the same composition
// twice, once over the other.
const SECTION_FACE = {
  [SECTIONS.TOKEN_LAB]: 'pixel',
  [SECTIONS.PRINCIPLES]: 'vector',
  [SECTIONS.MOTION_TILES]: 'pixel',
}

// Read the column's own geometry: the top padding, and the line below which the
// artwork is allowed to grow.
//
// Everything comes from the live DOM rather than from constants, because every
// one of these numbers is a rendered consequence of the type scale.
//
// The baseline is the COLLAPSED nav: the three section headers, and no leaves.
// It does not move, in any state, which is the half of ruling 4 that matters
// most ("the background never reflows on expand"). Disclosed rows are dealt
// with by the glass, not by pushing the artwork out of their way.
function navMetrics(nav) {
  const headers = nav.querySelectorAll('button[aria-expanded]')
  const headerH = headers[0]?.offsetHeight ?? 0
  const padTop = parseFloat(getComputedStyle(nav).paddingTop) || 0
  return { padTop, baseline: padTop + headers.length * headerH }
}

// How long the measurements have to hold still before the composition is rebuilt.
// Not an animation value and not a token: it is a settle interval for a
// ResizeObserver, and its only job is to keep a window drag from regenerating
// the whole composition on every observed frame.
const RESIZE_SETTLE_MS = 120

// `navRef` is the <nav> element itself. The artwork renders as a direct child of
// it, with no wrapper: a wrapper would sit between the layer and the element
// whose stacking context it depends on, and BackgroundArt's dev-time host check
// would then inspect the wrapper and miss a nav that is not a stacking context.
export function NavBackground({ navRef }) {
  const [surface, setSurface] = useState(null)

  // The face is the only thing here that tracks navigation state. It changes
  // nothing about the composition: geometry does not depend on it, so a
  // section switch swaps which rendering of the same drawing is on screen and
  // regenerates nothing.
  const { section } = useNavState()
  const face = SECTION_FACE[section] || 'vector'

  // Measure the column and derive the protected baseline.
  //
  // ── Why the baseline is the collapsed nav, and not the other two candidates
  //
  // WORST CASE (the tallest the accordion can ever get) is what ruling 4 says,
  // and it is what shipped first. Measured in the nav, it is right in exactly
  // one state: Token Lab open leaves a 10px gap under the last row, and every
  // other state leaves between 158 and 239px of empty column. The artwork was
  // drawing itself to a nav that was not there.
  //
  // LIVE (three headers plus the open section's leaves) was tried on
  // 2026-07-23 and reverted the same day. It closes the gap and breaks the
  // other half of ruling 4, because the baseline is not only the clearance
  // line, it is the ROOT line: growArmature plants at y = baseline, so a nav
  // that gets shorter does not uncover more of the same drawing, it grows a new
  // one further up. Measured across a Token Lab to Motion Tiles toggle, both on
  // the pixel face: 395 cells before, 571 after, ZERO in common. Every
  // disclosure was a full redraw of the field.
  //
  // COLLAPSED is both. The line sits under the three headers, which are the
  // only navigation that is always on screen, and it never moves, so the field
  // is planted once and stays planted. Rows disclosed below it are legible
  // because the chrome carries the glass (NavColumn.module.css), which is the
  // mechanism the handoff specified for exactly this and which nothing had
  // built yet. The glass covers, the artwork holds still, and neither has to
  // know about the other.
  //
  // Read from the DOM rather than from constants because every one of these
  // numbers is a rendered consequence of the type scale.
  const measure = useCallback(() => {
    const nav = navRef.current
    if (!nav) return
    const { padTop, baseline } = navMetrics(nav)

    const next = {
      width: nav.clientWidth,
      // The column scrolls, so the artwork is sized to the SCROLLPORT, not the
      // content. The layer is sticky at height 0, which pins it to the visible
      // box while the accordion scrolls over it.
      //
      // Minus the TOP padding only, and that subtraction is the whole fix for
      // the scrollbars. The layer is the first in-flow child, so it starts at
      // padTop; an artwork a full clientHeight tall therefore ended padTop past
      // the bottom of the scrollport and gave the column a permanent 8px of
      // scrollable overflow, which is a vertical scrollbar over an artwork that
      // is pinned and does not move when you scroll it. (A sticky box
      // contributes its UNSHIFTED position to scrollable overflow, so this holds
      // however far the accordion is scrolled.)
      //
      // Not padBottom as well, which was the first version of this fix and cost
      // 8px of reach for nothing. A scroll container's scrollable overflow area
      // starts as its own PADDING box, so ink that ends exactly at clientHeight
      // ends inside a region the column already had. Starting at padTop and
      // running clientHeight - padTop tall puts the last row of marks flush with
      // the bottom edge of the column and still contributes zero overflow.
      height: Math.max(0, nav.clientHeight - padTop),
      baseline,
    }

    // Same numbers, same object. The observer fires for reasons that do not
    // change the surface (a section opening, a scrollbar arriving over on the
    // controls column), and a fresh object each time would re-render the whole
    // artwork for nothing.
    setSurface((prev) =>
      prev && prev.width === next.width && prev.height === next.height && prev.baseline === next.baseline
        ? prev
        : next)
  }, [navRef])

  // Measure once immediately, then on a trailing delay. Dragging a window edge
  // fires the observer every frame, and each measurement that lands rebuilds the
  // armature, the density map, the sampler and the aggregation. Let the drag
  // settle first.
  const settleRef = useRef(null)
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    measure()
    const observer = new ResizeObserver(() => {
      clearTimeout(settleRef.current)
      settleRef.current = setTimeout(measure, RESIZE_SETTLE_MS)
    })
    observer.observe(nav)
    return () => {
      clearTimeout(settleRef.current)
      observer.disconnect()
    }
  }, [measure, navRef])

  // Nothing listens for a section opening, and that is the point. The column is
  // a fixed grid track, so a disclosure changes what is inside the nav without
  // changing the nav's own box: the ResizeObserver above never fires, the
  // baseline does not depend on which section is open, and the composition
  // holds still through every accordion toggle.

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
        // The empty-cell grid ink. --color-border is the subtle-outline role,
        // which grid lines genuinely are. It is quiet in light and dark
        // (~1.3:1) and pure black/white in high contrast, which is why the
        // renderer draws a sparse dotted grid there instead of a solid mesh.
        grid: readToken('--color-border'),
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
        face={face}
      />
    </Suspense>
  )
}
