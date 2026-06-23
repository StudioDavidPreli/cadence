import { useReducedMotion } from 'framer-motion'
import {
  uiDurationSeconds,
  navDurationSeconds,
  FEEDBACK_EASE,
} from '../utils/feedbackDuration'

// Ready-to-spread Framer Motion transitions for CHROME (the tool's own UI:
// tooltips, reveals, accordions), as opposed to demonstration motion. Chrome
// reads the fixed --feedback-* durations, never the editable --motion-* tokens,
// so Explore mode can't collapse the tool's feedback to nothing. Centralised in
// one hook so the useReducedMotion call and the two CSS reads aren't repeated in
// every sub-component that needs them.
//
//   transition={chrome.ui}   small inline reveals, tooltips
//   transition={chrome.nav}  structural control-section accordions
//
// Both snap to duration 0 under prefers-reduced-motion via the helpers.
export function useChromeTransition() {
  const reduce = useReducedMotion()
  return {
    ui: { duration: uiDurationSeconds(reduce), ease: FEEDBACK_EASE },
    nav: { duration: navDurationSeconds(reduce), ease: FEEDBACK_EASE },
  }
}
