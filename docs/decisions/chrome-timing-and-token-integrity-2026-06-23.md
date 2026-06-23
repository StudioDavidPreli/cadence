# Chrome Timing and Token Integrity — 2026-06-23

A pre-deploy audit of the token-integrity claim (deploy-verification-matrix
Tier 1), plus the doc/code and build-hygiene audits that followed. The audit
found that "components never hardcode animation values" held for every
demonstrated motion but leaked in two places: one genuine bug, and a category of
chrome transitions sitting in inline literals. Both are fixed, and a test now
enforces the rule.

---

## The distinction the audit made explicit

Two classes of motion live in the app, and the no-hardcoding rule applies
differently to each:

- **Demonstration motion**: what a principle teaches. Reads the editable
  `--motion-*` tokens, because editing a token must change it.
- **Chrome**: the tool's own UI (hover, focus, color/theme shifts, tooltips,
  reveals, the tool-switch crossfade, accordions). Reads fixed `--feedback-*`
  constants, so a near-zero `--motion-duration-*` in Explore mode cannot collapse
  the interface's own feedback to nothing.

Every literal the audit found was one class sitting in the wrong place.

## What changed

- **Dropdown chevron (the bug).** `Dropdown.module.css` hardcoded
  `transform 120ms` and contradicted its own doc, which calls for
  `duration.fast`. Now `var(--motion-duration-fast, 100ms)`. The chevron is the
  Secondary Action demonstration, so it reads the editable token.
- **New chrome constant.** `--feedback-ui-duration: 100ms` added to `motion.css`,
  joining `--feedback-nav-duration` and `--feedback-flash-duration`. About 24
  literal-ms CSS transitions across 13 files (hover, focus, color/theme, the
  slider thumb, control-section chevrons) now reference it. The 80/120/150/160ms
  spread was incidental and collapsed to one value.
- **Token Lab chrome.** Seven inline `{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }`
  transitions (tooltips, reveals) now use a `useChromeTransition()` hook that
  returns `chrome.ui` / `chrome.nav`. The control-section accordion moved to
  `chrome.nav` (360ms), which makes the `motion.css` comment that already claimed
  accordions read the nav value true.
- **Ad-hoc ease names removed.** `'easeInOut'` (DemoArea crossfade, RailDrawer)
  replaced with `FEEDBACK_EASE`; `'linear'` (DurationVisualizer) replaced with
  `EASING_CURVES.linear.fm` from the canonical preset data. DurationVisualizer
  renders outside `MotionTokensProvider`, so it takes the curve from data rather
  than a framework string or a fresh literal.
- **TokenFidelity literal documented.** Its `ease: [0, 0, 1, 1]` is the
  deliberate un-tokenized "off the system" value the principle contrasts against.
  Commented in place and allow-listed in the gate.

## The gate

`src/tokens/tokenIntegrity.test.js` walks `components/` and `principles/` and
fails the build on any inline ms literal, inline `duration:` number, or inline
`ease:` array. Allow-listed: `duration: 0` (an instant cut), literals inside a
CSS `var()` fallback, and the one TokenFidelity case. Verified to fire against
deliberate offenders before being relied on.

## New surfaces

- `src/utils/feedbackDuration.js`: `navDurationSeconds`, `uiDurationSeconds`,
  `FEEDBACK_EASE`.
- `src/hooks/useChromeTransition.js`: returns `{ ui, nav }` transition objects,
  reduced-motion aware.

---

## Doc/code drift audit

CLAUDE.md verified accurate on file conventions, dependency tightness, Rive
binding (the four components), grid rules, the four themes plus the
`[data-theme^="high-contrast"]` starts-with selector, Modal anchoring, and
React 18 + StrictMode.

One drift: the `layoutId` / `LayoutGroup` material presented a tab pill as a live
named-LayoutGroup use, but the codebase contains zero `layoutId`. Reframed as
history: `layoutId` was the first approach to the principle-grid card expand
mechanic and to the indicator pills (tabs since replaced by the navigation bar,
carousel dot moved to a CSS transition, Toggle thumb to direct `x`), all removed.
The reasoning is kept as case-study history and as the rule if `layoutId` is ever
reintroduced. Two dated "tab panels" references were updated to name the DemoArea
crossfade.

## Build-hygiene audit

- **No orphaned modules**: every JS/JSX and CSS file under `src/` is imported.
- **Dependencies tight**: only `framer-motion` and `@rive-app/react-canvas` at
  runtime, no stray animation libraries, nothing undeclared.
- **Rive assets**: all 18 principle animations, 18 icons, and 4 carousel statics
  present and correctly mapped; nothing unreferenced.
- **`hero.riv` is referenced but unauthored, by design**: `HeroAnimation`
  degrades to a themed text prompt when the file is absent, so the build runs
  before the Rive exists. The landing shows that prompt until the file is
  authored. Tracked in `docs/deploy-checklist.md`.
- **Stale placeholder removed**: `PrincipleCard`'s defensive default branch no
  longer renders "Component example coming in Phase 2"; it shows a neutral
  fallback and a comment noting the branch is unreachable today.

---

## Commits

- `a2cfe07` chrome-timing refactor and the token-integrity gate
- `7f5621e` doc-drift reframe and the Phase 2 placeholder cleanup

## Still open

The live Tier 1 suite from the deploy-verification matrix (token propagation
through the UI, axe-core, keyboard, theme emulation) needs a frozen UI and a
browser-test-substrate decision (Playwright Test vs jsdom). Deferred to
post-integration. `hero.riv` authoring is David's.
