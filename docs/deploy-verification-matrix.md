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
  **Exists as of 2026-07-16: `e2e/` (`npm run test:e2e`), 41 tests over built
  output served by the real Worker (`playwright.config.js` builds first). Rows
  it covers are ticked below with a spec reference.**

Build the cheap Tier 1 tests that prove the thesis. Add Tier 2 signatures only where
overshoot or wind-up is the whole point. Leave the long tail to one human pass. Do
not build the exhaustive matrix.

---

# System-wide Tier 1 (write once, covers everything)

## Token integrity (the core argument, under test)

- [x] **T1** Static: grep source for hardcoded durations, easings, delays. Any literal
      ms value, cubic-bezier, or numeric delay in a component is a fail.
      **Done 2026-06-23: `src/tokens/tokenIntegrity.test.js` (Vitest, deploy gate).
      See `docs/decisions/chrome-timing-and-token-integrity-2026-06-23.md`.**
- [x] **T1** Live: Playwright edits a duration token through the Token Lab UI, then
      asserts a consuming component's running animation or `getComputedStyle` changed.
      This test is the thesis executed. Highest-value test in the suite.
      **Done 2026-07-16: `e2e/tokens.spec.js` (slider drive → custom property →
      the code view's resolved value follows).**
- [x] **T1** Live: same for an easing slot edit (standard, enter, exit).
      **Done 2026-07-16: `e2e/tokens.spec.js`, all three slots.**
- [x] **T1** Constrained vs Explore toggle changes the available range per section.
      **Done 2026-07-16: `e2e/tokens.spec.js`, including the toggle-off
      reset-to-Standard model and the Explore-only Overshoot tab.**
- [x] **T1** Out-of-range token input is handled, not silently dropped.
      **Done 2026-07-16: `e2e/tokens.spec.js`, import path: clamps itemized in
      the report modal, clamped values live on the root.**

## Accessibility floors (inject axe-core)

- [x] **T1** 4.5:1 on normal text, every theme.
      **Done 2026-07-16: `e2e/a11y.spec.js`, axe wcag2a+wcag2aa over four
      themes x five views (home, guide, press-state, principles grid,
      motion-tiles landing).**
- [x] **T1** 3:1 on large text and UI components, every theme.
      **Done 2026-07-16: same axe pass (color-contrast covers both floors).**
- [x] **T1** ARIA roles, name/role/value present on every interactive demo.
      **Done 2026-07-16: same axe pass. Two real findings fixed the day the
      suite landed: the DemoArea scroll layer was not keyboard-scrollable on
      focusable-element-free destinations (the guide), and the Card demo
      carried `aria-pressed` on a role-less, pointer-only div. Both fixed and
      re-verified; the Card has a keyboard regression test.**
- [ ] **T1** No information carried by color alone (accent = active is reinforced
      by shape, position, or text, not hue only). *(Not automatable by axe;
      closed manually 2026-07-16 by the checklist's hover-independence and
      accent-census rows. Stays a code-review rule, not a test.)*

## Keyboard operability (Playwright drives, reads activeElement)

- [ ] **T1** Tab order correct on every interactive demo. *(Partially automated
      2026-07-16: `e2e/keyboard.spec.js` walks the nav accordion and the Modal
      trap; the manual full-order walk is the 2026-07-16 checklist row. A
      per-demo walk is not built — the exhaustive matrix is explicitly out of
      scope above.)*
- [x] **T1** Enter / Space / Arrow behave where expected (Toggle, Stepper, Dropdown,
      Carousel, tabs, sliders).
      **Automated for the highest-traffic paths 2026-07-16:
      `e2e/keyboard.spec.js` (arrows drive sliders and the live token; Enter
      toggles the nav; Enter/Space toggle the Card). The remaining demos were
      verified manually in the 2026-07-16 checklist sessions.**
- [x] **T1** Focus-visible ring present, meets 3:1 against adjacent colors.
      **Presence automated 2026-07-16 (`e2e/keyboard.spec.js`, slider ring
      under keyboard focus); the 3:1 measurement is the checklist's dated
      manual row.**
- [x] **T1** Focus never lost into a closed Modal or Drawer.
      **Done 2026-07-16: `e2e/keyboard.spec.js`, 12-step trap walk, Escape
      close, focus lands somewhere real.**

## Theme and media emulation (emulateMedia, context flags)

- [ ] **T1** Light / dark / high-contrast parity. Screenshot each, diff, assert no
      component breaks. *(Not built as screenshot diffs; the axe pass covers all
      four themes structurally, and art parity stayed Tier 3 — David's
      2026-07-16 sweep. Screenshot baselines remain future work if drift ever
      bites.)*
- [x] **T1** First load with no stored preference reads `prefers-color-scheme` and
      follows OS. Launch with `colorScheme: 'dark'`, assert dark palette renders.
      **Done 2026-07-16: `e2e/themes.spec.js`, the full four-combination matrix
      (colorScheme x prefers-contrast) plus stored-choice-wins under
      conflicting OS preferences.**
- [x] **T1** `prefers-reduced-motion: reduce` triggers reduced-motion mode.
      **Done 2026-07-16: `e2e/themes.spec.js`, Modal fully appears and fully
      leaves under reduce.**
- [ ] **T1** `forced-colors: active` (Windows HCM) does not break layout or strand
      state that relied on background-color alone. *(Verified manually via
      emulateMedia in the 2026-07-16 checklist session; not yet in the
      persisted suite.)*
- [ ] ~~**T1?**~~ `prefers-reduced-transparency: reduce` makes the Modal backdrop
      opaque. **Answered 2026-07-16: Playwright cannot emulate it; permanently
      Tier 3 (manual). David verified under the OS setting, Tier 3 sweep
      2026-07-16.**
- [x] **T1** Every `background-color` rule also sets `color`.
      **Done 2026-07-16 as a scripted CSS audit (172 rules), recorded in the
      checklist; static analysis, not a browser test.**
- [x] **T1** Theme switch re-reads tokens (Framer Motion does not re-read on its own).
      **Done 2026-07-16: `e2e/themes.spec.js`, custom properties resolve to new
      values after the switch.**

## zeroheight scenario coverage (per component that renders variable content)

*(These rows are unautomated but not unverified: the checklist's Interaction
states and In-flight/absent sections carry dated manual closes for the
disabled, loading, error, and empty rows, 2026-07-16.)*

- [ ] **T1** Long text wraps or truncates as designed; truncation side is intentional.
- [ ] **T1** Many-items case (Carousel, any list) does not distort layout.
- [ ] **T1** Disabled state defined and visually distinct on every interactive component.
- [ ] **T1** Loading / error / empty states render where a component can be in flight
      or dataless.

## Motion Tiles and the Worker (added 2026-07-16)

The original matrix predates the third tool and the Worker host; this section
closes that gap (`docs/open-items-audit-2026-07-16.md`, Critical flag 2's last
remnant). Motion Tiles' per-tile art judgments stay Tier 3 and were closed by
David's 2026-07-16 sweep; these are the machine facts.

- [x] **T1** The landing gates the grid: no tile field mounts before Enter.
      **Done 2026-07-16: `e2e/motion-tiles.spec.js`.**
- [x] **T1** The grid deep link mounts the default tile field and stays
      console-clean (no page errors, no console errors).
      **Done 2026-07-16: `e2e/motion-tiles.spec.js`.**
- [x] **T1** Rive WASM loads from our origin, never a CDN (the 2026-07-16 pin,
      guarded against regression). **Done 2026-07-16: `e2e/motion-tiles.spec.js`
      asserts at least one .wasm fetch, all from baseURL, zero unpkg/jsdelivr.**
- [x] **T1** Worker guards hold without side effects: empty message 400,
      honeypot 204 (no GitHub call), non-POST 405.
      **Done 2026-07-16: `e2e/motion-tiles.spec.js`, request-level.**
- [ ] **T2** A preset switch retimes the visible tiles together (one vocabulary
      at scale — the section's argument). Machine signature: sample a tile's
      progress rate before/after. Not built; the preset values themselves are
      blessed (David's Tier 3 sweep).
- [ ] **T2** Stagger drag crosses the grid as a wave (per-tile phase offsets
      ordered by distance). Not built.

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
   **Done 2026-07-16: `e2e/` as specified, in that order, plus the Motion
   Tiles/Worker section above. Two real accessibility bugs surfaced on the
   suite's first run (the axe rows have the detail) — the gate earned its keep
   on day one.**
3. **Phase three, Tier 2 via MCP.** Exploratory pass on the principles flagged Strong
   or where overshoot/wind-up is the point. Expect flake; tune sampling.
4. **Phase four, hand the Tier 3 shortlist to David.** One human pass on legibility,
   voice, and feel. The cards where Tier 2 passed but the motion still does not land
   are tuning bugs, surfaced by the contrast between machine and eye.

Commit between phases. No edits during reconnaissance.
