1# Cadence — Pre-Deploy Checklist

Run this before deployment. The risk for a system like Cadence is not a missing
component. It is a missing state, or a principle whose State 2 demo reads as
arbitrary. This checklist targets those.

Tick each item per component where it applies. Not every row applies to every
component; mark N/A and move on.

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

- [ ] Landing renders the final `hero.riv`, not the fallback prompt
- [ ] Token Lab guide: heading and body text meet 4.5:1 in all four modes (light, dark, high-contrast-light, high-contrast-dark)
- [ ] Token Lab guide: copy reads in David's voice, em-dash count zero
- [ ] Token Lab guide: inline `code` chips legible in every theme (the accent-subtle background sets its own text color)
- [ ] Navigation keyboard operable: Tab into the accordion, Overview and category leaves reachable, Enter/Space activate
- [ ] Opening Token Lab shows the guide; the Overview leaf returns to it after a category
- [ ] Deep links resolve: `#/token-lab` (guide), `#/token-lab/<category>` (demo), back button traverses

---

## Interaction states

For every interactive demo (Button, Toggle, Dropdown, Stepper, sliders, tabs):

- [ ] Disabled state defined and visually distinct
- [ ] Focus-visible ring present and meeting 3:1 against adjacent colors
- [ ] Keyboard operable: Tab order correct, Enter/Space/Arrow where expected
- [ ] Hover state does not depend on hover alone to convey meaning
- [ ] Active/pressed state distinct from hover

## In-flight and absent states

- [ ] Loading state where a component can be mid-action (Progress Bar, any async demo)
- [ ] Error state where a value can be invalid (Token Lab inputs out of range)
- [ ] Empty state where a demo could render with no data
- [ ] Out-of-range token input is handled, not silently dropped

## Theme and motion parity

There are four display modes: light, dark, high-contrast-light, high-contrast-dark.
The two high-contrast modes are surface/text inversions of each other; verify both,
not just one. Tokens and HC-specific CSS (`[data-theme^="high-contrast"]`) are shared,
so a regression in one HC mode usually shows in both.

- [ ] Parity on every component across all four modes (light, dark, high-contrast-light, high-contrast-dark)
- [ ] Every `background-color` rule also sets `color` (no inherited-color assumption)
- [ ] `--color-accent` reads as active/connected only, never decorative
- [ ] Reduced-motion mode verified against `prefers-reduced-motion`
- [ ] Theme switch re-reads tokens (Framer Motion values do not re-read on their own)
- [x] high-contrast-dark Rive artwork: icons, hero, and carousel paint white stroke on black (the shared `Contrast` instance flipped at runtime via `useHCContrastColors`). Verified 2026-06-22.
- [ ] Switching high-contrast-light <-> high-contrast-dark repaints the Rive artwork in both directions (the shared `Contrast` instance is re-asserted per theme)
- [ ] forced-colors (Windows HCM): accent/box-shadow state cues survive (nav active leaf, Token Lab connection ring, title pulse) via outline + system colors
- [ ] prefers-reduced-transparency: Modal and Drawer backdrops go to an opaque scrim, not the translucent 0.8
- [ ] First load with no stored choice follows the OS: `prefers-contrast: more` resolves to high-contrast-light or high-contrast-dark by `prefers-color-scheme`, otherwise light/dark by `prefers-color-scheme`; a stored choice is restored without a flash

## Token integrity (the core argument, under test)

- [x] No hardcoded duration, easing, or delay in any component (enforced by `src/tokens/tokenIntegrity.test.js`; chrome timing reads fixed `--feedback-*` constants, demonstration motion reads editable `--motion-*`). 2026-06-23
- [ ] Every animated value traces to a CSS custom property
- [ ] Token Lab changes propagate to all consuming components live
- [ ] Constrained vs Explore mode toggles behave correctly per section

## Accessibility floors

- [ ] 4.5:1 contrast on normal text, every theme (all four modes)
- [ ] 3:1 on large text and UI components, every theme (all four modes)
- [ ] Reduced motion does not strand a user without feedback
- [ ] Focus never lost into a closed Modal or Drawer

## Build hygiene

- [x] Repo self-contained, no orphaned code (audit 2026-06-23: no orphaned JS/JSX or CSS modules; dependencies limited to `framer-motion` + `@rive-app/react-canvas`)
- [x] Commits clean between changes
- [x] SVG State 1 placeholders flagged where Rive will replace them post-launch (`hero.riv` referenced but unauthored; graceful text fallback, tracked above under Landing)
- [x] Known latent edge cases documented (single-column grid below 574px; in CLAUDE.md and `docs/decisions/grid-architecture.md`)
