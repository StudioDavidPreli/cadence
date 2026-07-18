import { createContext, useContext } from 'react'
import { useReducedMotion } from 'framer-motion'

// Carries the DemoMotionGate's toggle state down to demos that build their own
// scoped MotionTokensProvider (Timing's preset slots, Systematization). Those
// providers cannot see the gate's "View motion" state on their own, so without
// this context they would either always flatten under OS reduce-motion (gate
// toggle dead for them) or never flatten (the blanket opt-out this design
// removed).
//
// null default = "no gate above me": fall back to the OS preference alone.
export const DemoMotionGateContext = createContext(null)

// True when a demo is allowed to run at real timing: either the user has no
// OS-level reduced-motion preference, or the enclosing DemoMotionGate's
// "View motion" toggle is on. Scoped providers inside demos should pass
// respectReducedMotion={!useDemoMotionAllowed()} rather than a literal false;
// see docs/decisions/reduced-motion-2026-05-06.md (2026-07-17 addendum).
export function useDemoMotionAllowed() {
  const gateAllowed = useContext(DemoMotionGateContext)
  const prefersReduced = useReducedMotion()
  // ?? not ||: false is a real gate value (gate present, toggle off) and must
  // win over the OS fallback.
  return gateAllowed ?? !prefersReduced
}
