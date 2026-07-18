# Principle Component Conventions

This document covers the conventions every principle in the Principles Library must follow: the icon/animation split, the optional `gridTitle` field, the expanded-card content constraints, and the documentation each principle requires. The grid architecture that surrounds these components is in `docs/decisions/grid-architecture.md`.

---

## Required reading before building any principle

Read these two before starting work on a new principle component:

- `docs/references/principles-reference.md` is the authoritative mapping of principles to components and placeholders.
- `docs/references/animation-principles/` (cloned reference repo, local only) provides additional context on animation mechanics and implementation patterns.

Per-principle progress across all four delivery components is tracked in `tracker/TRACKER.md`.

---

## Icon vs animation: two parallel components

Each principle in the grid uses two parallel Rive components: `PrincipleIcon` and `PrincipleAnimation`. Both are theme-synced via `ViewModel1` with three named instances (`Light`, `Dark`, `Contrast`). They share no code by design. Duplication is intentional: their lifecycles, sizes, and interaction models differ enough that abstracting them into one component would obscure more than it would save.

**PrincipleIcon.** Small, decorative, lives in every collapsed grid card. File pattern: `/public/rive/principles_iconNN.riv` where `NN` is zero-padded and matches `principleId` (`01`–`18`). State machine name pattern: matches the principle's existing state machine name with `Icon` appended before `SM` (e.g. `squash&stretchIconSM`). No interaction. Rendered with `pointer-events: none` and `aria-hidden="true"` so clicks pass through to the card.

**PrincipleAnimation.** Larger, interactive, mounts only when a card expands. File pattern: `/public/rive/[principle-name].riv`. Internal hitboxes and state machine triggers handle interaction inside the Rive file. React does not attach `onClick` handlers.

The decision to build `PrincipleIcon` as a parallel component rather than a variant of `PrincipleAnimation` was deliberate. Future sessions: do not refactor these into one component without explicit instruction.

---

## Optional gridTitle field

Principle data may include a `gridTitle` field that overrides `title` in the collapsed grid card only. The expanded card always uses the full `title`. Used when a principle's full title wraps to two lines at the 180px card width and the second line's bottom edge would clip under `card { overflow: hidden }`. Currently used by principle id 4: full title "Straight Ahead & Pose to Pose", `gridTitle` "Pose to Pose".

The field is optional. When absent, the collapsed card falls back to `title` via `principle.gridTitle ?? principle.title` in `PrincipleCard/index.jsx`. Do not add `gridTitle` to a principle whose title fits one line at 180px.

---

## Expanded card content constraints

The expanded card is a fixed 372 × 480 px object at every library width where 2 columns fit (see `docs/decisions/grid-architecture.md`). Inside it, two text fields render in the right-half content column at 12 px mono and are bounded by the same column width.

### Toggle/divider invariant

The Motion/UI toggle button must never visually intersect the QuoteBlock divider. The divider is the horizontal `border-top` between the upper `.expandedContent` region and the lower `.quoteBlock`. The toggle sits at the bottom of `.contentHalf` (the right-half stack: meta, title, summary, toggle). When the summary content exceeds the column's vertical capacity, `.contentHalf` overflows downward (anchored by `align-items: flex-start` on `.expandedContent`) and the toggle's bottom edge crosses the divider. This reads as a layout collision and is not acceptable.

The invariant must hold for every principle in both motion and UI states. Verify with the Playwright protocol in `docs/decisions/expanded-card-restructure-plan-2026-05-04.md` (Phase 5) when adding or editing principle copy.

### Character ceiling for principle.summary and componentSummary

Both fields render in the same ~117 px right-half column at 12 px mono. The mono font wraps at roughly 12 characters per line. The `.summaryStack` grid pins both states at the height of the longer one, so the ceiling applies to whichever of `principle.summary` and `principle.componentSummary` is longer.

**Hard ceiling: 80 characters per field.** Above 80 chars the summary block exceeds the column's vertical capacity, contentHalf overflows, and the toggle/divider invariant fails. Verified empirically against all 18 principles 2026-05-04: at 80 chars the toggle/divider gap is ≥ 11 px. Above 80 chars (P1 at 122 chars) the gap goes negative.

When the principle requires more nuance than 80 chars supports, edit the copy. Don't widen the column or change the layout. Those changes would require revisiting the State 5 grid architecture and the breakpoint deletion documented in the same restructure plan. Copy is the cheaper degree of freedom.

### Em-dashes are forbidden in all copy

The "Hard rules" section of CLAUDE.md (Writing Style) prohibits em-dashes in any prose. This applies to principle data fields (`summary`, `componentSummary`, `animationQuote`, `componentQuote`) without exception. Use a comma, colon, or new sentence instead. Audited 2026-05-04: P1 `componentSummary` previously contained an em-dash and was edited to comply.

---

## Reduced motion in demos

Principle demos never pass a literal `respectReducedMotion={false}`. `PrincipleCard` owns one per-card `showDemoMotion` boolean that governs both layers of the demo area under OS `prefers-reduced-motion`: the Rive layer through `PrincipleAnimation`'s `paused` prop, and the UI demo's tokens through the controlled `DemoMotionGate` scope. The "View motion" control renders below the crossfade wrapper so it is reachable in both views; with no OS preference none of this renders and the demo mounts untouched. A demo that builds its own scoped `MotionTokensProvider` derives the prop from `useDemoMotionAllowed()` (`src/components/DemoMotionGate/motionGateContext.js`) so the card's control reaches it; Timing and Systematization are the reference examples. P17 is exempt from the token scope only (its own Reduce toggle owns its demo); the control still governs its Rive layer. Decision record: `docs/decisions/reduced-motion-2026-05-06.md` (2026-07-17 addendum).

---

## Documentation requirements

Every principle component requires:

1. A companion markdown file in `docs/principles/` explaining the principle, its UI application, and the token values driving it. Written for a motion designer audience.
2. Inline comments in the component for non-obvious logic.
3. An update to `docs/case-study.md` noting what was built and what was learned.
