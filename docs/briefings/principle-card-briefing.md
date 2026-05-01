---
Subject: PrincipleCard expand/collapse animation
Last updated: 2026-05-01
Status: Active — close animation symptoms remain after cheap fix (d636b93)
Related: docs/case-studies/cadence-animation-chronology.md
---

# PrincipleCard Briefing

Read `docs/case-studies/cadence-animation-chronology.md` before proposing any changes to the
expand/collapse machinery. That document records eleven days of iteration, three loops, and one
hallucination. This briefing summarizes the current state for a new session.

---

## 1. Current architecture (as of d636b93)

The card is a `motion.div` with the `layout` prop. When `isExpanded` flips true, an inline
`gridColumn` / `gridRow` style changes the card's footprint from 1x1 to 2x2. Framer Motion
records the before and after bounding rects and applies a FLIP corrective: a `scaleX`/`scaleY`
transform anchored at `transform-origin: 0 0` (top-left), animated from the corrective value
back to identity over `duration.slow`.

The expanded content lives in a `motion.div` (the expandedWrapper) inside `AnimatePresence`.
The wrapper has no `layout` prop. It has `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`,
`exit={{ opacity: 0 }}`. It inherits the card's FLIP corrective via CSS transform cascade.

On expand: the wrapper is invisible while the FLIP corrective is large. By the time it fades in,
the corrective has resolved and the content appears at natural size. Expansion looks correct.

On close: the wrapper is fully visible (opacity 1) at the moment the FLIP begins. The corrective
starts at ~2.0 (expanded/collapsed ratio). The wrapper inherits this transform, so all content
appears at ~2x its natural size on the first frame, then scales down as FLIP resolves.

State variables: `uiMode`, `drawerOpen`, `isStable`, `isAnimating`
Refs: `isAnimatingRef`, `tokensRef`
Timers: two `setTimeout` calls at `duration.slow * 1000` (tUnblock, tStable)

What is NOT in the current code (removed in d636b93):
- `expandedDimensions` (measured dimensions of the wrapper)
- `wrapperRef`
- `hasExpandedRef`
- `tClearDims` timeout
- `scale: 0.95` on wrapper exit
- `layout` on the wrapper

---

## 2. What has been tried and failed

Read the chronology for full detail. Short version:

**layout on wrapper** — added twice, removed twice. Same result both times: expansion animation
breaks. The wrapper's own layout animation conflicts with the inherited FLIP corrective.

**isClosing / holdFootprint** — introduced April 29, iterated across multiple sessions, explicitly
deleted April 30 as part of "architectural simplification." Re-proposed May 1 without noting the
prior lifecycle. Do not reintroduce without explaining how this attempt differs.

**scale-driven close (explicit scaleX/scaleY MotionValues)** — implemented April 30, reverted at
user request April 30, re-proposed May 1. Same mechanism. Do not reintroduce without explaining
how this attempt differs.

**expandedDimensions pinning** — applied fixed width/height to the wrapper during exit so the
FLIP corrective would not compress the wrapper's flex layout. Composed multiplicatively with the
FLIP corrective (e.g., 2.06 FLIP × 0.95 scale exit), producing two simultaneous scaling motions
anchored at different origins. Removed in d636b93.

**mode="wait" on AnimatePresence** — tried April 29. Produced overlapping crossfade. Reverted.

---

## 3. Active symptoms (observed 2026-05-01 at duration.slow = 2000ms)

The cheap fix (d636b93) was observed in the browser at an exaggerated duration. Three symptoms
appeared during card close that are not present during card open:

**Symptom A — Rive disappears at frame zero.**
The Rive canvas is visible in the expanded state. At the moment close is triggered, the Rive
animation disappears before the close animation begins. It is not fading out — it is gone
instantly. The rest of the expanded content remains visible and animates.

**Symptom B — Text font sizes increase during collapse.**
During the close animation, text elements (title, summary, quote) visibly increase in size.
This is consistent with the expected FLIP behavior: the card inherits a corrective of ~2x,
which makes text appear at ~2x its rendered size. The increase is visible because the wrapper
is fully opaque at frame zero of the close.

**Symptom C — Text drifts toward center during collapse.**
Text elements drift inward (toward the card's center) during the close animation. The collapse
appears to pull content toward center rather than scaling uniformly from a fixed anchor. The
toggle button (bottom-right of the content half) is obscured by the drifting text.

**Assessment:**
Symptoms B and C are consistent with the FLIP corrective cascade. The corrective is anchored
at the card's top-left. Content positioned in the right half of the 2x2 layout is far from
that anchor — the corrective at those coordinates is large, producing visible scale and
translation drift. This is a geometry problem: FLIP corrective + content-is-far-from-anchor.

Symptom A (Rive disappears) is not explained by the FLIP corrective alone. Possible causes:
- The Rive canvas renders at layout dimensions and the FLIP corrective would show it at 2x
  its canvas resolution, which may be causing Rive to dispose the canvas or re-initialize
- The `pointerEvents: uiMode ? 'none' : 'auto'` on the animationState div may be triggering
  a visibility event that Rive interprets as unmount
- `AnimatePresence` unmounting behavior may be interacting with Rive's canvas lifecycle
This symptom requires investigation before diagnosis.

---

## 4. Constraints

Read `docs/case-studies/cadence-animation-chronology.md` sections "The loops" and
"What the code has never had" before proposing any change.

Hard constraints for any proposed fix:
- Do not reintroduce `isClosing`, `holdFootprint`, or explicit `scaleX`/`scaleY` MotionValues
  without first explaining how this attempt differs from the April 29-30 iterations.
- Do not add `layout` to the expandedWrapper without first explaining why the prior two
  attempts broke expansion and why this attempt would not.
- Do not use `mode="wait"` on the outer AnimatePresence — tried and reverted April 29.
- The footprint (`gridColumn`/`gridRow`) must clear on the same render that `isExpanded`
  becomes false. This is required for FLIP to record the correct before/after rects.
  `holdFootprint` delays this clear and breaks the FLIP record.

Constraints from CLAUDE.md:
- `ease.standard` (not spring) for concurrent layout animations.
- All animation values must come from tokens — no hardcoded durations or easing values.
- `layoutId` removed from in-place card expansions — layout prop only.

---

## 5. What to try next

The root problem: the expandedWrapper is fully opaque when FLIP begins on close. The FLIP
corrective cascades to all children at ~2x, so all content appears oversized on frame zero.

Candidate approaches (not yet tried in current architecture):

**Candidate 1 — Fade wrapper before FLIP starts.**
Trigger the wrapper's exit opacity fade before the footprint clears. If the wrapper is
already at opacity 0 when FLIP begins, the 2x frame-zero artifact is invisible. Implementation
challenge: `isExpanded` and `footprint` are set on the same render. To fade first, the wrapper
would need to begin its exit animation one frame or one tick before the footprint clears.

**Candidate 2 — Opacity-only exit, no scale, accept the pop.**
The current exit is `opacity: 0` over `duration.slow`. The FLIP corrective is what produces
the visible scaling — not an explicit scale prop on the wrapper. If the opacity fade is fast
enough relative to the FLIP duration, the artifact may be imperceptible. At normal duration
(400ms), the initial 2x frame may be less visible. Observation at normal speed is needed
before concluding the symptom is unacceptable.

**Candidate 3 — counterScale on the wrapper.**
Apply a `scale` to the wrapper that is the inverse of the card's FLIP corrective. This
requires reading the corrective at runtime — not trivial. Previously the corrective was
approximated by measuring `expandedDimensions` and dividing by the collapsed size. This
brings back the measurement step, which was removed because it composed incorrectly with
`scale: 0.95`.

Before implementing any candidate: observe the animation at normal duration (tokens as set,
not 2000ms). The symptoms at 2000ms may not be visible at 400ms.

---

## 6. What to read before starting

In order:
1. This document (done)
2. `docs/case-studies/cadence-animation-chronology.md` — full loop history
3. `src/components/PrincipleCard/index.jsx` — current implementation
4. The stale comment block at lines 163-186 of PrincipleCard/index.jsx — these lines
   still mention `expandedDimensions` and describe the wrapper's behavior in terms of the
   removed mechanism. The description is inaccurate. Do not use it as ground truth.

Do not propose a change until you can answer:
- Does this approach appear in the chronology? If yes, what makes this attempt different?
- Where is the wrapper opacity at frame zero of the close animation under this approach?
- What happens to the footprint clear timing under this approach?
