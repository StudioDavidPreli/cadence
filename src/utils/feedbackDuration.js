// Chrome-timing helpers. Both read FIXED --feedback-* values from motion.css, not
// the editable --motion-* tokens, so Explore mode (which can drag the motion
// tokens toward zero) can never collapse the tool's own UI feedback into an
// imperceptible jump. Both return seconds for Framer Motion and snap to 0 under
// prefers-reduced-motion.

// Parsed through parseMs, NOT a bare parseFloat, and this is load-bearing.
//
// The production CSS minifier rewrites custom-property time values without
// changing their meaning: `--feedback-nav-duration: 360ms` ships as `.36s`.
// A bare `parseFloat(raw) / 1000` reads that as 0.00036 seconds instead of
// 0.36, so every JS-driven chrome transition ran a thousand times too fast in
// the built app while behaving correctly under `npm run dev`. Verified in
// dist/ on 2026-07-23; all three constants are rewritten to `s`.
//
// Note the asymmetry that hid it: the CSS-side uses of these variables
// (`transition: color var(--feedback-nav-duration)`) were always fine, because
// CSS consumes `.36s` correctly. Only the JS reads were wrong.
//
// parseMs already handles both spellings and exists because of the same
// minifier behavior on the --motion-* tokens
// (docs/decisions/motion-token-nan-crash-2026-07-15.md). This helper simply
// was not using it.
import { parseMs, parseTokenValue } from '../tokens/parse'

function feedbackSeconds(varName, fallbackMs) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName)
  return parseTokenValue(raw, parseMs, fallbackMs / 1000, varName)
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

// The background artwork's ambient idle period. Chrome rather than
// demonstration because the idle is infinite: an editable token dragged toward
// zero in Explore mode would set the nav column vibrating.
//
// Unlike the helpers above this does NOT snap to 0 under reduced motion. The
// idle is disabled outright there rather than run at zero duration, which is a
// deliberate asymmetry with the reveal: infinite drift is the vestibular
// trigger, and a background idle demonstrates nothing. The caller drops the
// animation entirely; a zero-duration infinite animation is still an
// infinite animation.
export function backgroundIdlePeriodSeconds() {
  return feedbackSeconds('--feedback-background-idle-period', 4800)
}

// The chrome easing curve, defined once. Chrome transitions use a FIXED curve
// rather than tokens.ease.standard so an edited easing curve in the lab never
// alters the tool's own feedback. Same coordinates as the standard token's
// default, but deliberately independent of it.
export const FEEDBACK_EASE = [0.4, 0, 0.2, 1]
