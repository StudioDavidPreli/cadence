# One chrome curve in CSS

**Date:** 2026-09-15
**Status:** Built. Gate and drift test added. David's visual pass pending.

## The finding

A scan of every transition in `components/` and `principles/` for a duration
with no curve (the pass that found Stepper's four Framer transitions and the
rail drawer's backdrop) also read the module CSS. Chrome transitions there,
the ones on a `--feedback-*-duration`, ran three ways at once:

| Class | Count | What the curve was |
|---|---|---|
| No timing function | 80 | the browser's default `ease` |
| `var(--motion-ease-standard, cubic-bezier(0.4, 0, 0.2, 1))` | 48 | the editable standard curve, which Explore mode can reshape |
| The `ease` keyword | 21 | the browser's `ease`, chosen by name |

The middle class was the real fault. The chrome rule (`chrome-timing-and-token-integrity-2026-06-23.md`) moved chrome's durations off the editable tokens so a near-zero `--motion-duration-*` could never collapse the tool's own feedback. The curve had the same exposure and no such rule: drag the custom curve in Explore mode and 48 hovers and reveals changed shape with it. The other two classes were not faults, only drift: a hover in one panel decelerated on Chrome's `ease` while the same hover next door ran the standard curve.

On the JavaScript side this was already settled. `FEEDBACK_EASE` in `feedbackDuration.js` is the chrome curve for every Framer transition, through `useChromeTransition`. CSS had no twin, which is why the three classes grew.

## What changed

- `--feedback-ease: cubic-bezier(0.4, 0, 0.2, 1)` joins the fixed chrome
  values in `motion.css`, the fifth after the flash, nav, background-idle and
  ui durations. Same coordinates as `ease.standard`'s default, deliberately
  independent of it, the same posture `FEEDBACK_EASE` takes.
- Every `transition` part on a `--feedback-*-duration` in module CSS names
  `var(--feedback-ease)`: 149 parts across 26 stylesheets, rewritten by a
  script that split declarations on top-level commas (a `var()` fallback
  carries a `cubic-bezier()` with commas of its own) and reviewed in a dry run
  before applying. The two `visibility 0s var(--feedback-nav-duration)` parts
  stay as they were: visibility is discrete, the `0s` is its duration and the
  var its delay, and there is nothing to ease.
- The token-integrity gate gains a check: any chrome transition part that
  names another curve, or none, fails the build.
- The drift test gains a check: the numbers inside `--feedback-ease` equal
  `FEEDBACK_EASE`, so the two engines cannot run two chrome curves.

## Not changed

- Keyframe `animation` declarations on `--feedback-flash-duration` (the
  Tokens title pulse: `ease-in-out`, and `steps(1, end)` for its static and
  forced-colors variants). A pulse is a shape, not a hover, and the steps
  variants are the reduced-motion and forced-colors forms of it.
- Toggle's `transition-timing-function: var(--motion-ease-standard, ...)`.
  Its duration is a `--motion-*` token injected inline; it is demonstration
  motion and reads the editable curve on purpose.
- Any transition on a `--motion-*` duration. Demonstration motion reads the
  tokens; that is the point of it.

## Verification

- Unit: the gate and the drift pin pass; the full suite passes.
- Built output: a chrome hover's computed `transition-timing-function`
  resolves to `cubic-bezier(0.4, 0, 0.2, 1)` in the page, and Explore mode's
  custom curve leaves it unchanged.
- David's visual pass: pending, before commit. The change is a curve on
  100ms and 360ms transitions, so the diff is subtle by construction; the
  place to feel it is a tool bar hover and the nav accordion.
