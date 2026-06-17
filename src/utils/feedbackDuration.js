// Reads the fixed --feedback-nav-duration (a navigation-chrome value kept OUT of
// the editable --motion-* token scale) as seconds for Framer Motion transitions.
// Returns 0 under reduced motion so navigation chrome snaps. Shared by the demo
// crossfade and the rail drawers so they stay on one timing.
export function navDurationSeconds(reduce) {
  if (reduce) return 0
  const ms = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--feedback-nav-duration'),
  )
  return (Number.isFinite(ms) ? ms : 360) / 1000
}
