// Chrome-timing helpers. Both read FIXED --feedback-* values from motion.css, not
// the editable --motion-* tokens, so Explore mode (which can drag the motion
// tokens toward zero) can never collapse the tool's own UI feedback into an
// imperceptible jump. Both return seconds for Framer Motion and snap to 0 under
// prefers-reduced-motion.

function feedbackSeconds(varName, fallbackMs) {
  const ms = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(varName),
  )
  return (Number.isFinite(ms) ? ms : fallbackMs) / 1000
}

// Navigation chrome: the hero/content crossfade, the rail drawers, and the
// control-section accordions. One timing keeps them in sync.
export function navDurationSeconds(reduce) {
  if (reduce) return 0
  return feedbackSeconds('--feedback-nav-duration', 360)
}

// UI micro-feedback: tooltips and small inline reveals driven from JS.
export function uiDurationSeconds(reduce) {
  if (reduce) return 0
  return feedbackSeconds('--feedback-ui-duration', 100)
}

// The chrome easing curve, defined once. Chrome transitions use a FIXED curve
// rather than tokens.ease.standard so an edited easing curve in the lab never
// alters the tool's own feedback. Same coordinates as the standard token's
// default, but deliberately independent of it.
export const FEEDBACK_EASE = [0.4, 0, 0.2, 1]
