1# Cadence — Pre-Deploy Checklist

Run this before deployment. The risk for a system like Cadence is not a missing
component. It is a missing state, or a principle whose State 2 demo reads as
arbitrary. This checklist targets those.

Tick each item per component where it applies. Not every row applies to every
component; mark N/A and move on.

As of 2026-07-16 the machine-checkable rows are also guarded continuously by
the persisted Tier 1 suite: `npm run test:e2e` (41 tests, `e2e/`, built output
served by the real Worker). A dated tick below records the one-time
verification; the suite is what keeps it true.

---

## Principle legibility (the real audit)

The test: a hiring manager landing on a card with no label should name the
principle from the motion alone.

- [x] Squash and Stretch (Button): press compression and spring release read as weight
- [x] Anticipation (Drawer): the negative-y wind-up is visible, not swallowed
- [x] Staging (Modal): backdrop and focus containment direct the eye to one place
- [x] Pose to Pose (Stepper): the discrete poses are legible against a straight-ahead reading
- [x] Follow Through (Carousel): the dot offset trails the slide, not synced to it
- [x] Slow In/Slow Out (Progress Bar): deceleration to target is perceptible
- [x] Arc (Tooltip): the entrance traces an arc from the trigger, not a straight line
- [x] Secondary Action (Dropdown): chevron rotation reads as subordinate to the menu open
- [x] Timing (Toggle): the duration change visibly changes character
- [x] Exaggeration (Badge): the overshoot on increment is unmistakable
- [x] Solid Drawing (Card): the lift implies elevation, a real z-axis
- [x] Appeal (Lava-lamp grid): all tokens reading together, coherent
- [x] Systematization: one token change propagates across components on screen
- [x] Hierarchy of Motion: parent drives child, the order is legible
- [x] Economy: parallax layering reads as restraint, not decoration
- [x] Token Fidelity: the wrong-value correction is visible as a correction
- [x] Reduced Motion: the toggle shows reduced ambition, not absence of motion
- [x] Shared Vocabulary: the preset name communicates what the numbers cannot

---

## Landing, guide, and navigation (added 2026-06-22)

Surfaces added after the first draft. The guide is the project's largest block of
body text, the landing is the first thing a hiring manager sees, and the nav was
rebuilt to open Token Lab to the guide.

- [x] Landing renders the final `hero.riv`, not the fallback prompt: verified by David on the live site, Tier 3 sweep 2026-07-16
- [x] Token Lab guide: heading and body text meet 4.5:1 in all four modes (light, dark, high-contrast-light, high-contrast-dark): verified 2026-07-16, built output via Playwright: computed-style sweep, zero failures
- [x] Token Lab guide: copy reads in David's voice, em-dash count zero: David's read, Tier 3 sweep 2026-07-16
- [x] Token Lab guide: inline `code` chips legible in every theme (the accent-subtle background sets its own text color): verified 2026-07-16, built output via Playwright (in the same sweep)
- [x] Navigation keyboard operable: Tab into the accordion, Overview and category leaves reachable, Enter/Space activate: verified 2026-07-16, built output via Playwright: real Tab walk, Enter toggles aria-expanded, aria-current set
- [x] Opening Token Lab shows the guide; the Overview leaf returns to it after a category: verified 2026-07-16, built output via Playwright: nav click lands on the guide, category leaf swaps to the demo, Overview returns to the guide
- [x] Deep links resolve: `#/token-lab` (guide), `#/token-lab/<category>` (demo), back button traverses: verified 2026-07-16, built output via Playwright: both deep links resolve on fresh load; back traverses category -> guide -> home in order

---

## Interaction states

For every interactive demo (Button, Toggle, Dropdown, Stepper, sliders, tabs):

- [x] Disabled state defined and visually distinct: verified 2026-07-16, code audit. The demos define no disabled states (nothing renders disabled-but-live), so the row is N/A for them; the two real disabled controls (both bug-report submit buttons, `disabled={!canSubmit}`) style `:disabled` at opacity 0.5 + not-allowed cursor
- [x] Focus-visible ring present and meeting 3:1 against adjacent colors: verified 2026-07-16, built output via Playwright. Buttons: UA ring, correct per color-scheme (3.5:1 light / 12:1 dark). Sliders had NO ring (outline: none); fixed same day with a 2px accent :focus-visible outline
- [x] Keyboard operable: Tab order correct, Enter/Space/Arrow where expected: verified 2026-07-16, built output via Playwright: tab order logical, arrow keys drive sliders and update tokens live. Sliders had no accessible name; fixed same day (aria-label=tokenKey)
- [x] Hover state does not depend on hover alone to convey meaning: verified 2026-07-16, code + behavioral audit. Every persistent state carries a non-hover marker (nav `aria-current` + active class, Card selected surface, Toggle `aria-checked`, focus-visible outlines); the Tooltip demo opens on click, not hover; hover styling everywhere is surface emphasis only
- [x] Active/pressed state distinct from hover: verified 2026-07-16, built output via Playwright on the demo Button: rest #1a1a1a -> hover #333 -> pressed #111, three distinct surfaces (dark). In both HC themes hover and press share the inverted surface by design; there hover adds a text-primary outline and press removes it plus the whileTap compression, so the states stay distinct through a different channel

## In-flight and absent states

- [x] Loading state where a component can be mid-action (Progress Bar, any async demo): verified 2026-07-16, code + built output. Bug-report submit runs a four-state machine (idle/sending/sent/error) with the button disabled and relabeled "Sending…" in flight; every lazy boundary has a textual Suspense fallback; Motion Tiles renders `.tilePlaceholder` per tile before its Rive mounts
- [x] Error state where a value can be invalid (Token Lab inputs out of range): verified 2026-07-16, built output via Playwright: imported a file with four out-of-range scalars and an unknown family; the report modal itemized every clamp (9999 -> 2000, 3.5 -> 1.2, ...), the defaults filled, and the foreign family ignored
- [x] Empty state where a demo could render with no data: N/A for the demos (none render from variable data), 2026-07-16. The two data-driven surfaces degrade correctly when empty: the preset row shows built-ins with no user presets, and the bug-report form disables submit on an empty message
- [x] Out-of-range token input is handled, not silently dropped: verified 2026-07-16, same import run as the error-state row. Import clamps to the Explore bounds (the system's real range, per `motionPresets.js` buildState) and reports each adjustment with from -> to; sliders are min/max-bounded so no other input path can go out of range

## Theme and motion parity

There are four display modes: light, dark, high-contrast-light, high-contrast-dark.
The two high-contrast modes are surface/text inversions of each other; verify both,
not just one. Tokens and HC-specific CSS (`[data-theme^="high-contrast"]`) are shared,
so a regression in one HC mode usually shows in both.

- [x] Parity across all four modes: text-contrast sweep verified 2026-07-16, built output via Playwright on guide, Press & State, Principles, and Motion Tiles views; visual art parity stays a human check (Tier 3)
- [x] Every `background-color` rule also sets `color` (no inherited-color assumption): verified 2026-07-16, scripted CSS audit over `src/**/*.css`: 172 rules set a background; every text-bearing one pins color in the same state scope, the base rule of the same element, or explicit child rules (the Card `.selected` pattern). The remainder are non-text surfaces (tracks, pips, backdrops, gradients)
- [x] `--color-accent` reads as active/connected only, never decorative: closed 2026-07-16 in two halves. Contrast: scripted ratios, accent as text clears 4.5:1 in all four themes (the six remaining uses are state signals: sent status x2, fps warn, .warn, load error, custom-curve action). Census reduced 2026-07-18: error text carries no accent (David's spec, the error-surfaces pass), so the load error and both bug-report error states moved to plain `--color-text-base` and the accent-as-text set is four (sent status x2, fps warn, .warn, custom-curve action). Semantics: David re-specified the category chips per theme and they moved off the accent family onto their own `--color-chip-*` tokens (dark tinted-text, light solid fills with near-black text, HC monochrome outline/inversion pair; all AA or better, verified on built output). The stale "UI strokes only, never text" claim in CLAUDE.md and the contrast audit was corrected the same day; full chip spec and ratios in the contrast audit's 2026-07-16 correction section
- [x] Reduced-motion mode verified against `prefers-reduced-motion`: verified 2026-07-16, built output via Playwright via emulateMedia: Modal fully appears and fully leaves under reduce
- [x] Theme switch re-reads tokens: verified 2026-07-16, built output via Playwright: custom properties re-resolve on data-theme flip; chrome color transitions run (sample after the transition, not at t=0)
- [x] high-contrast-dark Rive artwork: icons, hero, and carousel paint white stroke on black (the shared `Contrast` instance flipped at runtime via `useHCContrastColors`). Verified 2026-06-22.
- [x] Switching high-contrast-light <-> high-contrast-dark repaints the Rive artwork in both directions: verified by David, Tier 3 sweep 2026-07-16 (with the HC-dark accent re-hue in place)
- [x] forced-colors (Windows HCM): accent/box-shadow state cues survive: verified 2026-07-16, built output via Playwright via emulateMedia: active leaf outline solid 2px, connection ring outline solid 2px. Now persisted (`e2e/themes.spec.js`, the forced-colors block, 2026-07-21): both cues asserted for outline-style solid and outline-width 2px, so dropping either `@media (forced-colors: active)` block fails the suite (proven by deleting each block and watching its test go red). The connection ring is raised the keyboard way (focus a token slider). Title pulse still not exercised. Rive canvases: acceptance re-affirmed 2026-07-21, David's statement: the pixels of a rasterized image do not change under forced colors, preserving information and intent, and the Rive surfaces retain the same degree of character; the two HC themes are the in-site answer
- [x] prefers-reduced-transparency: Modal and Drawer backdrops go to an opaque scrim: NOT automatable (no emulateMedia flag); verified by David under the OS setting, Tier 3 sweep 2026-07-16
- [x] First load with no stored choice follows the OS: verified 2026-07-16, built output via Playwright emulateMedia with cleared storage: dark -> `dark`, light -> `light`, contrast-more + dark -> `high-contrast-dark`, contrast-more + light -> `high-contrast-light`. Stored choice wins over conflicting OS preferences (stored `light` under emulated dark + contrast-more restored `light`), set synchronously by the inline head script before the stylesheets, with zero re-sets after mount

## Motion Tiles and the Worker (added 2026-07-16)

The third tool and the deployment host, absent from this checklist's original
row set (the coverage gap named in the 2026-07-16 open-items audit). Per-tile
art judgments were closed by David's Tier 3 sweep, recorded in the tracker;
these are the machine rows.

- [x] Landing gates the grid: no tile field before Enter: automated 2026-07-16, `e2e/motion-tiles.spec.js`
- [x] `#/motion-tiles/grid` mounts the default tile field, zero console/page errors: automated 2026-07-16, `e2e/motion-tiles.spec.js`
- [x] Rive WASM (both runtimes) fetches from our origin, zero CDN requests: automated 2026-07-16, `e2e/motion-tiles.spec.js`, guarding the 2026-07-16 pin
- [x] `/api/bug-report` guards: empty message 400, honeypot 204, non-POST 405: automated 2026-07-16, `e2e/motion-tiles.spec.js`, request-level with no GitHub side effects; the live end-to-end path (real issue opened) was verified 2026-07-15
- [x] Preset values (snappy, cinematic) blessed as final: David's Tier 3 sweep 2026-07-16; the retiming-signature test stays open as Tier 2 in the matrix
- [x] Grid-panel behavior between the mobile-gate width and 1024px: the v8 closeout's rail-collapse question, settled 2026-07-16 by automation: `e2e/motion-tiles.spec.js` renders the grid at 760px and 1024px and asserts zero horizontal overflow. No rail-collapse port needed

## Error surfaces (added 2026-07-18)

The crash card and the error copy postdate the April audit, and a crash screen
only renders when something else is already wrong, so no theme pass had reason
to see it. This section records the close. Session record:
`docs/decisions/error-surfaces-2026-07-18.md`.

- [x] ErrorBoundary card legible in all four themes: card on `--color-surface-raised` with a text-base title and muted message (5.5:1 dark, 5.7:1 light, 21:1 both HC); Reload wears the ghost-button pattern from the bug-report forms. Verified by David 2026-07-18 on built output through a temporary `?crash` render throw, all four themes, hook removed after the pass
- [x] Error text carries no accent: `.loadError`, both `.reportStatus[data-state='error']` rules, and the import-failure line all read plain `--color-text-base` (David's spec 2026-07-18: accent means active, and a failure is not). Sent status keeps accent
- [x] Grid load failure speaks to the visitor ("The tile grid could not load. Check your connection and reload the page."), carries `role="alert"`, asset path relocated to `console.error`; the loading label dropped its raw status interpolation. 2026-07-18
- [x] Every `background-color` rule in `ErrorBoundary.module.css` sets `color` in the same scope. 2026-07-18

## Token integrity (the core argument, under test)

- [x] No hardcoded duration, easing, or delay in any component (enforced by `src/tokens/tokenIntegrity.test.js`; chrome timing reads fixed `--feedback-*` constants, demonstration motion reads editable `--motion-*`). 2026-06-23
- [x] Every animated value traces to a CSS custom property: verified 2026-07-16, scoped. The token-integrity gate enforces it over `components/` and `principles/`; a sweep of the unscanned surfaces (App shell, hooks, utils, main) found zero inline animation literals. Two documented exceptions: TokenFidelity's deliberate off-system literal (the lesson), and Motion Tiles' Rive preset scalars (`MotionTilesGrid.jsx` PRESETS), a deliberately separate vocabulary (scoping decision 2026-07-16, recorded in the integration doc: shared preset names, per-class interpretation). Rive timelines are authored artwork, out of token scope
- [x] Token Lab changes propagate to consuming components live: verified 2026-07-16, built output via Playwright: slider drive rewrote --motion-duration-fast 100->350ms and the code view's live value followed (0.1s -> 0.35s). The matrix's T1 thesis test, run by hand; the automated version landed 2026-07-16 (`e2e/tokens.spec.js`) and runs on every `npm run test:e2e`
- [x] Constrained vs Explore mode toggles behave correctly per section: verified 2026-07-16, built output via Playwright: Explore expands the rail's bounds (durations 0-2000, scale 0.5-1.2) without resetting values; an Explore-only value (duration.fast 1800ms) drives the live token; Explore-off resets to the Standard preset (labeled Default at verification time) exactly as the documented "toggle off = clean state" model prescribes; other categories stay constrained

## Accessibility floors

- [x] 4.5:1 contrast on normal text, every theme (all four modes): verified 2026-07-16, built output via Playwright: computed-style sweep over four views x four themes. One failure found and fixed same day: DurationVisualizer .trackTime used muted2 (#888, 3.25:1 in light); now muted
- [x] 3:1 on large text and UI components: verified 2026-07-16, built output via Playwright for focus rings and the accent-stroke uses exercised; full UI-component census not run
- [x] Reduced motion does not strand a user without feedback: verified 2026-07-16, built output via Playwright: dialog reaches full opacity and closes under reduce
- [x] Focus never lost into a closed Modal or Drawer: verified 2026-07-16, built output via Playwright: focus trap cycles, Escape closes, focus lands on body after close (restore-to-trigger is a documented non-goal; soft follow-up)

## Build hygiene

- [x] Repo self-contained, no orphaned code (audit 2026-06-23: no orphaned JS/JSX or CSS modules; dependencies limited to `framer-motion` + `@rive-app/react-canvas`)
- [x] Commits clean between changes
- [x] SVG State 1 placeholders flagged where Rive will replace them post-launch (`hero.riv` referenced but unauthored; graceful text fallback, tracked above under Landing)
- [x] Known latent edge cases documented (single-column grid below 574px; in CLAUDE.md and `docs/decisions/grid-architecture.md`)
