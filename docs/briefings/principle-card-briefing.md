---
Subject: PrincipleCard expand/collapse animation
Last updated: 2026-05-01
Status: Resolved at commit 6b59838 — explicit-scale architecture in place
Related: docs/case-studies/cadence-animation-chronology.md
---

# PrincipleCard Briefing

Read `docs/case-studies/cadence-animation-chronology.md` before proposing any changes to the
expand/collapse machinery. That document records eleven days of iteration, three loops, one
hallucination, and the resolution at commit 6b59838.

---

## 1. Current architecture (as of 6b59838)

The card is a `motion.div` with explicit `scaleX`/`scaleY` MotionValues animated imperatively
via Framer Motion's `animate(motionValue, target)`. No `layout` prop. When `isExpanded` flips
true, an inline `gridColumn`/`gridRow` style sets the card's footprint to 2×2; on close, the
footprint is held at 2×2 by `isClosing` state until the close animation completes. The wrapper
fills the card via `inset: 0` and inherits the card's transform via CSS cascade.

State variables: `uiMode`, `drawerOpen`, `isStable`, `isAnimating`, `isClosing`
Refs: `isAnimatingRef`, `cardRef`
MotionValues: `scaleX`, `scaleY`

The two axis animations are coordinated via `Promise.all` so post-animation state transitions
run after both complete, not after one. `transformOrigin` is computed per-card from
`getExpandedFootprint` to match the edge-case biasing (right-edge cards extend left, bottom-row
cards extend up) so the shrink converges back to each card's natural cell position.

`cellWidth` is read from the resolved `gridTemplateColumns` in PrinciplesLibrary and passed to
each card. Combined with the `GRID_ROW_HEIGHT` and `GRID_GAP` constants in PrincipleCard, it
produces the close animation's target ratio.

What is NOT in the current code:
- `layout` prop on the card or wrapper
- FLIP corrective transforms
- `expandedDimensions`, `wrapperRef`, `hasExpandedRef`
- `tokensRef` (was only used by removed setTimeouts)
- setTimeout-driven state transitions
- `scale: 0.95` on the wrapper exit

---

## 2. What has been tried and failed (do not revert)

Read the chronology for full detail. Three loops are documented there. The architecture below
appears in those loops and was reverted twice before being applied at commit 6b59838 with
measurements justifying it.

**Explicit-scale architecture (current, do not revert).** Attempted April 30 (Loop 3 in the
chronology) and abandoned mid-iteration. Returned at commit 6b59838 with the following
differences from the prior attempts:
1. Diagnosis is settled with measurements (briefing diagnostic captures), not intuition.
2. Implementation is documented in a state-machine comment block in PrincipleCard.
3. Scoped to the card's expand/collapse animation only — no mixing with adjacent concerns.
4. Both axis animations coordinated via `Promise.all` to avoid the registration-order race
   that otherwise leaves scaleY frozen at the close target.

**layout on wrapper.** Added twice, removed twice. Same result both times: expansion animation
breaks. The wrapper's own layout animation conflicts with the inherited transform. Do not add.

**isClosing / holdFootprint on top of FLIP.** Introduced April 29, deleted April 30. Was a
patch on top of FLIP. The current implementation uses `isClosing` for footprint hold but
without FLIP underneath; the mechanism is the same name with a different role. Do not
reintroduce as a patch on top of any other architecture.

**`mode="wait"` on AnimatePresence.** Tried April 29. Produced overlapping crossfade. Reverted.

**`expandedDimensions` pinning.** Applied fixed width/height to the wrapper during exit.
Composed multiplicatively with the FLIP corrective, producing two simultaneous scaling motions
anchored at different origins. Removed at d636b93. Do not reintroduce.

---

## 3. Resolved symptoms (resolved at commit 6b59838)

Three symptoms were observed at d636b93 during the close animation. All are resolved by the
explicit-scale architecture:

**Symptom A — Rive disappears at frame zero of close.** Caused by the wrapper's flex column
collapsing to zero cross-axis at narrow CSS width when the footprint cleared. The Rive canvas
was rendered into a zero-height parent. Resolved: the footprint now holds at 2×2 throughout
the close, so the wrapper's CSS box stays at expanded dimensions and the canvas keeps its
full height.

**Symptom B — Text font sizes appear larger during collapse.** Caused by the FLIP corrective
inheriting through CSS cascade and visually scaling text by the before/after ratio (~2x).
Resolved: there is no FLIP corrective. The card's visible shrink is a transform that does not
affect the laid-out font size or wrapping.

**Symptom C — contentHalf drifts toward center, obscuring toggle button.** Caused by
contentHalf reflowing to single-cell width and rendering at 332px intrinsic height while the
flex container cross-axis collapsed to 0, with `align-items: center` overflowing it above
and below. Resolved: the card's CSS box does not reflow; contentHalf renders at expanded
width throughout, as it does in the open state.

Diagnostic captures (DevTools console snapshots at both 2000ms and production durations,
plus a screen recording confirming all three symptoms occurred on the same frame) are
preserved in the chronology document.

---

## 4. Constraints

Read `docs/case-studies/cadence-animation-chronology.md` sections "The loops" and
"What the code has never had" before proposing any change.

Constraints carried over from CLAUDE.md:
- `ease.standard` (not spring) for concurrent layout animations.
- All animation values must come from tokens — no hardcoded durations or easing values.
- `layoutId` removed from in-place card expansions — explicit transforms only.

Constraints from this resolution:
- Both axis animations must be coordinated (Promise.all or equivalent) so post-animation
  state transitions run after both complete, not after one. Framer Motion processes
  animations in registration order; relying on a single `onComplete` callback to coordinate
  both axes produces a race that leaves the second-completing axis frozen at its target.
- `transformOrigin` must match the per-card edge-case biasing in `getExpandedFootprint`. A
  fixed `'0 0'` origin produces a horizontal or vertical jump for right-edge or bottom-row
  cards.
- Footprint must clear in the same callback that resets the scale to 1, so neighbors reflow
  at the same paint as the visual identity reset.

---

## 5. What to read before starting

In order:
1. This document.
2. `docs/case-studies/cadence-animation-chronology.md` — full loop history, including the
   Resolution section at the end.
3. `src/components/PrincipleCard/index.jsx` — current implementation. The state-machine
   comment block at the top of the PrincipleCard component is authoritative.
4. `src/components/PrinciplesLibrary/index.jsx` — measures cellWidth from the resolved grid
   template columns and passes it to each card.

Do not propose a change without first answering:
- Does this approach appear in the chronology's loops? If yes, what makes this attempt
  different?
- What state holds the footprint during the proposed transition?
- What transform-origin is in effect for edge cards?
