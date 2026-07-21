# Token Lab Toolbar Audit: Session Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

**Sequencing gate:** the toolbar's files (`TokenLab.module.css`, `TokenLab/index.jsx`) are the busiest in the repo. Run `git status` and `git log --oneline` first; do not start while another session's TokenLab work is uncommitted or in flight, and expect the drift numbers below to have moved since they were measured.

**This session is design-led.** David is a senior motion designer; the finding is his and the eye that closes it is his. The session does the inventory, the mechanics, and the ratio math; David judges readability and attractiveness in the browser at each phase boundary. Do not iterate aesthetics autonomously, and do not drive browser automation to confirm how anything looks.

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session audits and repairs the CSS styling and layout of the Token Lab tool bar (the controls column).

## The finding (David, 2026-07-21)

The toolbar's text stylings were never defined as a set and have never been synced across the token subjects and their sections. The column grew one section at a time (duration, easing, delay, scale, then the spring editor and the duration scalar, plus the preset row absorbing four export formats and Import), and each addition styled itself locally. Measured in the committed stylesheet on 2026-07-21: five distinct font sizes (9, 10, 11, 12, 13px) across 31 declarations, two weights, five letter-spacing rules, five text-transforms, roughly 110 rules over 1,210 lines, and not one typographic value defined in a shared place. The result is not the easiest to read and has become unattractive. Both halves matter: this is a readability defect and an aesthetic one, in the first surface the case study sends a hiring manager to.

## Read first, in this order

1. `CLAUDE.md` (all of it; Contrast Requirements and the chrome-vs-demonstration rule are load-bearing here)
2. `docs/decisions/contrast-audit-2026-04-16.md`: mandated reading before changing color usage; the hover-state pattern and the accent rules live there
3. `docs/decisions/bug-report-button-and-theme-hover-2026-07-16.md` and the "one hover language" work it seeded: the unified invert-on-hover convention this audit must preserve, not dilute
4. `docs/decisions/chrome-timing-and-token-integrity-2026-06-23.md`: any transition touched in passing stays on the `--feedback-*` constants
5. `src/components/TokenLab/TokenLab.module.css` and the section components inside `TokenLab/index.jsx`: the subject itself
6. `src/tokens/color.css`: the precedent for a shared chrome token layer

## The shape of the work: three phases, David between each

### Phase 1: inventory

Enumerate every text-bearing role in the toolbar as shipped: section titles, control labels, value readouts, units, slider annotations, the Constrained/Explore toggles, preset buttons, the export and import row, the spring editor's labels, the scalar's row, helper microcopy, and anything the enumeration turns up that this list predates. Tabulate the computed styles per role per section (family, size, weight, case, spacing, color token) so the drift is visible in one table, and capture a screenshot set. Hand the table and the screenshots to David with no changes made. The inventory is the evidence the definition phase argues from.

### Phase 2: definition

Propose a named role set, aiming small: something like section title, control label, value readout, button, microcopy, and only what the inventory justifies beyond that. For each role, one full specification. Then the one structural fork, David's call:

- **Where the definitions live.** Chrome typography custom properties in a small shared layer (a `type.css` beside `color.css`; not `motion.css`, which holds motion tokens only) with one shared class per role, versus shared classes alone in the module. Recommend the custom-property layer: the tool's whole argument is that values which cannot be named cannot be systematized, its own toolbar should not be the counterexample, and the public style guide will want this exact table later.

David approves the role set, the values, and the home before anything is applied.

### Phase 3: application

Sweep every section onto the approved roles, deleting the local one-off declarations as each section converts. The layout half rides along: alignment and spacing rhythm between label, control, and readout; consistent section spacing; the preset/export/import row (recently restacked to stop the FM button clipping; make its arrangement deliberate rather than accommodated); and the ≤720px rail collapse re-checked after the changes. The demo column is out of scope: this is the tool bar only.

## Constraints that do not bend

- WCAG AA in all four themes: 4.5:1 for text, verified from computed luminance against the audit document's method, never by eye. Any rule that changes `background-color` sets `color` explicitly.
- The accent role is constant (active, connected, affecting the system; never decorative) and error text carries no accent. If a restyle wants accent text anywhere new, that is a contrast-audit conversation, not a styling choice.
- The hover language stays unified: chrome buttons invert like the theme switcher.
- No timing literals in module CSS; the token-integrity gate will fail the build if one lands.
- Nothing in this session changes a motion token, a demo, or demonstration behavior. If a diff touches `motionPresets.js` or a demo component, something went wrong.

## Verification

The axe floors in the e2e suite (four themes) are the net; run `npm run test:e2e` before every push and verify the restyled toolbar on built output in a browser across all four themes and at the 720px collapse. David's browser pass at each phase boundary is the acceptance test; the deploy checklist's toolbar-adjacent rows get re-dated where the restyle touches what they verified.

## Definition of done

- Every text style in the toolbar resolves to a named role defined in one place; the module's local font declarations are gone, and a grep for bare `font-size` in `TokenLab.module.css` returns only the role definitions (or nothing, if the layer won).
- The role table exists in a decision record at `docs/decisions/tokenlab-toolbar-type-<date>.md`, written to be inherited by the public style guide, with the layout-rhythm decisions recorded beside it.
- All four themes hold AA by computed ratio; the e2e suite passes; built-output verification done including the rail collapse.
- If a type layer was added, CLAUDE.md's file conventions and references note it.
- David has looked at the toolbar and no longer calls it unattractive. That is the acceptance criterion; write it in the closing commit only if it is true.
