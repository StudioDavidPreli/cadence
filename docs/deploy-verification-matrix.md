# Cadence — Deploy Verification Matrix

Carbon's per-component definition-of-done crossed with zeroheight's per-scenario
vetting, re-cut by who runs the check.

## The three tiers

- **Tier 1, machine fact.** Playwright or static analysis reads it directly. No
  perceptual judgment. Write these as persisted tests; they guard every future change.
- **Tier 2, machine signature.** The motion has a measurable mechanical fingerprint.
  Playwright confirms the mechanism is present. It proves the motion does the thing.
  It does not prove the thing lands. Flaky by nature; sample via Framer Motion values
  or Playwright clock control, not by scraping computed style each frame.
- **Tier 3, human judgment.** Perceptual. No tooling. Tier 2 hands this a shortlist.

The split is per cell, not per row. A button's disabled-contrast is Tier 1. The same
button's Squash and Stretch legibility is Tier 3. Same component, different tiers.

## Two artifacts, used differently

- **Playwright MCP**: CC drives a live browser now. Use for the exploratory Tier 2
  pass while tuning motion.
- **Persisted suite**: re-run on every change. Use for Tier 1 as a deploy gate.

Build the cheap Tier 1 tests that prove the thesis. Add Tier 2 signatures only where
overshoot or wind-up is the whole point. Leave the long tail to one human pass. Do
not build the exhaustive matrix.

---

# System-wide Tier 1 (write once, covers everything)

## Token integrity (the core argument, under test)

- [ ] **T1** Static: grep source for hardcoded durations, easings, delays. Any literal
      ms value, cubic-bezier, or numeric delay in a component is a fail.
- [ ] **T1** Live: Playwright edits a duration token through the Token Lab UI, then
      asserts a consuming component's running animation or `getComputedStyle` changed.
      This test is the thesis executed. Highest-value test in the suite.
- [ ] **T1** Live: same for an easing slot edit (standard, enter, exit).
- [ ] **T1** Constrained vs Explore toggle changes the available range per section.
- [ ] **T1** Out-of-range token input is handled, not silently dropped.

## Accessibility floors (inject axe-core)

- [ ] **T1** 4.5:1 on normal text, every theme.
- [ ] **T1** 3:1 on large text and UI components, every theme.
- [ ] **T1** ARIA roles, name/role/value present on every interactive demo.
- [ ] **T1** No information carried by color alone (accent = active is reinforced
      by shape, position, or text, not hue only).

## Keyboard operability (Playwright drives, reads activeElement)

- [ ] **T1** Tab order correct on every interactive demo.
- [ ] **T1** Enter / Space / Arrow behave where expected (Toggle, Stepper, Dropdown,
      Carousel, tabs, sliders).
- [ ] **T1** Focus-visible ring present, meets 3:1 against adjacent colors.
- [ ] **T1** Focus never lost into a closed Modal or Drawer.

## Theme and media emulation (emulateMedia, context flags)

- [ ] **T1** Light / dark / high-contrast parity. Screenshot each, diff, assert no
      component breaks.
- [ ] **T1** First load with no stored preference reads `prefers-color-scheme` and
      follows OS. Launch with `colorScheme: 'dark'`, assert dark palette renders.
- [ ] **T1** `prefers-reduced-motion: reduce` triggers reduced-motion mode.
- [ ] **T1** `forced-colors: active` (Windows HCM) does not break layout or strand
      state that relied on background-color alone.
- [ ] **T1?** `prefers-reduced-transparency: reduce` makes the Modal backdrop opaque.
      **Verify Playwright `emulateMedia` supports this feature before writing the
      test. If unsupported, this row drops to Tier 3 (manual).**
- [ ] **T1** Every `background-color` rule also sets `color`.
- [ ] **T1** Theme switch re-reads tokens (Framer Motion does not re-read on its own).

## zeroheight scenario coverage (per component that renders variable content)

- [ ] **T1** Long text wraps or truncates as designed; truncation side is intentional.
- [ ] **T1** Many-items case (Carousel, any list) does not distort layout.
- [ ] **T1** Disabled state defined and visually distinct on every interactive component.
- [ ] **T1** Loading / error / empty states render where a component can be in flight
      or dataless.

## Build hygiene

- [ ] **T1** Repo self-contained, no orphaned code.
- [ ] **T1** Commits clean between changes.
- [ ] **T1** SVG State 1 placeholders flagged where Rive replaces post-launch.
- [ ] **T1** Single-column grid edge case below 574px documented as unsupported.

---

# Per-principle matrix

Each card: the Tier 2 machine signature (assert the mechanism) and the Tier 3 human
judgment (does it read). Component-specific Tier 1 state checks noted where they add
to the system-wide set.

## Classic 12

| # | Principle / Component | Tier 2 machine signature | Tier 3 human judgment |
|---|---|---|---|
| 1 | Squash and Stretch / Button | Sample scale on press: assert it dips below 1.0 (compress) then overshoots above 1.0 on release before settling | Compression reads as weight, not just a size blip |
| 2 | Anticipation / Drawer | Assert y goes negative before positive. The wind-up is a sign change | The wind-up is visible, not swallowed by the entrance |
| 3 | Staging / Modal | T1: backdrop present, focus trapped inside, Esc closes, focus returns to trigger | Backdrop and containment pull the eye to one place |
| 4 | Pose to Pose / Stepper + Progress Bar | Assert discrete position holds at each step, not continuous drift | The poses read as discrete against a straight-ahead reading |
| 5 | Follow Through / Carousel | Assert dot-indicator offset lags the slide transform in time, not synced | The dot trails the slide, the offset is legible |
| 6 | Slow In/Slow Out / Progress Bar | Sample fill position over time: assert velocity is non-constant (decelerates to target) | The ease-in/out is perceptible vs ease.linear |
| 7 | Arc / Tooltip | Sample entrance path: assert deviation from the straight line between endpoints. Fragile, expect flake | The entrance traces an arc, not a diagonal |
| 8 | Secondary Action / Dropdown | Assert chevron rotation fires within the same window as menu open, subordinate duration | Chevron reads as secondary to the menu, not co-equal |
| 9 | Timing / Toggle | Assert thumb travel duration changes when the duration token changes | The duration change visibly changes character |
| 10 | Exaggeration / Badge | Sample scale on increment: assert it exceeds target then settles. Overshoot is a number past 1.0 returning | The overshoot is unmistakable, not a 1.02 nobody feels |
| 11 | Solid Drawing / Card | Assert scale lift on selection fires; T1: elevation token applied | The lift implies a real z-axis, says "solid drawing" |
| 12 | Appeal / Lava-lamp grid | Assert all token-driven values are live (no statics in the grid) | The whole reads as coherent, tokens working together |

## Extended 6

| # | Principle | Tier 2 machine signature | Tier 3 human judgment |
|---|---|---|---|
| 13 | Systematization | **Strong T1.** One token edit, assert multiple components on screen change in one pass. Same engine as the core token test | The propagation reads as systemic, not coincidental |
| 14 | Hierarchy of Motion | Assert parent animation starts before child responses, order is enforced in time | Parent-drives-child reads, the order is legible |
| 15 | Economy | Assert parallax layers move at different rates on scroll | Reads as restraint, not decoration |
| 16 | Token Fidelity | **Strong T1.** Inject a wrong value, assert the system surfaces/corrects it through the token path, not a patch | The correction is visible as a correction |
| 17 | Reduced Motion | **T1** for the trigger (emulateMedia fires the mode). Tier 3 for the result | Shows reduced ambition, not absence of motion |
| 18 | Shared Vocabulary | T1: named preset loads its values; export carries the name with the numbers | The name communicates what the numbers cannot |

---

# How CC should work this

1. **Phase one, reconnaissance.** Confirm current architecture before writing any
   test. Verify Framer Motion exposes motion values for Tier 2 sampling, and verify
   Playwright `emulateMedia` support for reduced-transparency. Predict before observe.
2. **Phase two, Tier 1 suite.** Token propagation first (it is the thesis), then
   axe-core, then keyboard, then theme emulation. These are the deploy gate.
3. **Phase three, Tier 2 via MCP.** Exploratory pass on the principles flagged Strong
   or where overshoot/wind-up is the point. Expect flake; tune sampling.
4. **Phase four, hand the Tier 3 shortlist to David.** One human pass on legibility,
   voice, and feel. The cards where Tier 2 passed but the motion still does not land
   are tuning bugs, surfaced by the contrast between machine and eye.

Commit between phases. No edits during reconnaissance.
