---
Subject: PrincipleCard expand/collapse animation
Period: 2026-04-20 to 2026-05-01
Status: Cheap fix applied 2026-05-01. Observation pending.
Author: Studio David Preli + Claude Code, debugging session chronology
---

This document records eleven days of iteration on the PrincipleCard animation that produced no commits. It exists because the iteration produced loops, orphans, and amnesia — patterns that future sessions need to be able to recognize and avoid. Read this document before proposing changes to PrincipleCard's expand/collapse machinery.

## Chronology of the Principles Library build

### What the git history actually shows

Three commits exist. Only three.

```
2a21b93  2026-04-20  docs: Grid architecture journey in CLAUDE.md
8492ffe  2026-04-20  Phase 1: responsive CSS Grid with 2x2 expansion
e494eef  2026-04-18  Fix Toggle FLIP, Carousel dot CSS, Spinner initial, DemoWrapper warning logic
```

Every animation architecture change in PrincipleCard since April 20 is in the working tree. Eleven days of animation work produced zero commits.

---

### What the last committed PrincipleCard looked like

Commit `8492ffe` created PrincipleCard with this state model:

```jsx
const [uiMode, setUiMode] = useState(false)
```

One state variable. No `isAnimating`, `isStable`, `isClosing`, `holdFootprint`, `expandedDimensions`, `wrapperRef`, `cardRef`, `isAnimatingRef`, `hasExpandedRef`, `tokensRef`. No `useReducedMotion`. No `supportsHover`. No `setTimeout`.

The expand/collapse used a single `AnimatePresence` with two keyed children — `key="expanded"` and `key="collapsed"` — both inside the wrapper. Exit animation on the expanded state: `scale: 0.85, duration: tokens.duration.base, ease: tokens.ease.exit, delay: 0`. Collapsed content faded in after a `tokens.duration.slow * 0.8` delay.

That was the architecture when the grid commit landed.

---

### The working-tree chronology (April 20 → May 1)

**April 24** — Rive integration. `PrincipleAnimation` component built and wired into the card. Card restructured: bridge text removed, crossfading summary added, `QuoteBlock` added. Typewriter effect added then immediately reverted to AnimatePresence crossfade. First introduction of `isStable` state (April 29 — see below).

**April 27** — Close button was not working. Root cause: button was positioned outside `expandedContent` which had `position: relative`. Fixed by moving the button inside. Scoped Drawer added for Anticipation card.

**April 28-29** — Drawer height, anticipation overshoot, simultaneous close with card collapse. These were contained to the Drawer and did not affect the card animation architecture.

---

**April 29, 14:08 — First explicit animation fix for collapse.**

User: "Content scales with card during collapse." Fix: changed expanded content exit from `tokens.duration.base` to `tokens.duration.slow`. This was the first attempt to address the close animation and it was purely about duration, not mechanism.

**April 29, 14:17–14:41 — Diagnostic phase 1: scale values and easing.**

Series of timing adjustments. Exit scale changed from 0.85 → 0.4, then both states made symmetric mirrors (scale 0.4, duration.base, no delays). No state machine changes yet.

**April 29, 16:38 — `isStable` introduced.**

First appearance of `isStable`. Purpose: prevent inner AnimatePresence crossfades from firing during the enter animation. Timer: `tokens.duration.slow` after `isExpanded` becomes true, reset immediately when `isExpanded` becomes false.

**April 29, 16:57 — PrincipleAnimation stays mounted.**

The inner AnimatePresence was removed. Both the animation div and UI component div became always-mounted siblings, crossfading via direct opacity animation. This is the current architecture for that part of the card.

**April 29, 17:21–17:43 — `mode="wait"` experiments.**

`mode="wait"` added to outer AnimatePresence. Then removed (overlapping crossfade tried). Then reinstated. Then the entire AnimatePresence structure was replaced with always-rendered position-absolute siblings. This is the structural change that removed the `key="collapsed"` / `key="expanded"` pattern from the committed code. Now both states coexist in the DOM and crossfade via opacity.

**April 29, 19:05–20:48 — The `holdFootprint` / `isClosing` / `isLayoutExpanded` era.**

First introduction of `holdFootprint`, `isClosing`, `isLayoutExpanded`, and `isLanding` states. These were introduced to address the core problem: when `isExpanded` flips false, the footprint clears immediately, causing the card to snap to 1×1 in the grid before the close animation runs.

Over this period the close approach cycled through:
- `isLayoutExpanded` clearing after a delay (sequential)
- `isLayoutExpanded` clearing immediately (simultaneous — broke content)
- `layout` added to the wrapper as "option 2" (broke expansion — reverted same session)
- `expandedSizeRef` capturing card dimensions to freeze wrapper during close
- `holdFootprint` holding the grid footprint during the scale animation
- `closeTransform` capturing scaleX, scaleY, x, y translation to correct center-origin drift

**April 30, 17:20 — Two-phase approach with `transformOrigin` computed from cell position.**

Computed `transformOrigin` from the card's grid position to make the scale shrink toward the correct corner. This added `isLanding` state and translation correction.

**April 30, 18:57 — "Architectural simplification."**

User: "Abandon the two-phase scale approach. Use FLIP layout for the close, but keep the wrapper at FIXED expanded dimensions."

Full rewrite. Deleted: `isClosing`, `holdFootprint`, `closeTransform`, `isLanding`, `isLayoutExpanded`, `cardRef`, `expandedSizeRef`. Added: `wrapperRef`, `expandedDimensions` (measured when `isStable`), `hasExpandedRef`. The wrapper received a `style` prop applying fixed inline `width`/`height` during exit. `isAnimating` and `isTransitioning` timeouts also introduced here.

**April 30, 19:05 — Immediately replaced with "scale the entire card uniformly."**

User: "Drop layout FLIP. Scale card uniformly on close. Content scales with frame as one motion."

Implemented. Card dimensions measured on close, scale computed, card animated down. Wrapper `inset: 0` restored.

**April 30, 19:19 — User asked to revert.**

User: "revert to the last build please" — then clarified: "I mean, undo the last changes, not return to the last commit."

Restored to the fixed-dimensions approach from 18:57.

**April 30, 20:38 — User provides diagnosis.**

User pastes analysis: "The code uses two different mechanisms for what should be one animation."

**April 30, 20:56 — Full rewrite in response to that diagnosis.**

This produced what became the pre-cheap-fix baseline. Deleted `isClosing`, `holdFootprint`, `closeTransform`, `isLanding`, `isLayoutExpanded`, `isTransitioning`. Kept `isAnimating`, `isStable`, `expandedDimensions`, `wrapperRef`, `hasExpandedRef`, `tokensRef`. The architecture became: `layout` on card, no `layout` on wrapper, `expandedDimensions` pinning the wrapper during exit.

**April 30, 23:29 — `layout` added to wrapper, `scale: 0.95` added to exit.**

User: "let's try the layout add to the wrapper and the explicit exit scale."

`layout` added to wrapper. `exit={{ opacity: 0, scale: 0.95 }}` added. User tested it and reported the expansion animation broke.

**April 30, 23:35–23:38 — Diagnosis then abandonment.**

User: "explain why this change breaks the previous build's expansion animation." Explanation provided. User: "can it only apply to the card content collapse?" Answer: no, not cleanly, because AnimatePresence can't distinguish enter from exit for the same motion.div.

Session ends here. No revert performed.

**May 1, 14:40 — Surgical edit removing `layout` from wrapper.**

Removed `layout` from the wrapper. Updated the comment. `scale: 0.95` on exit was explicitly left in place per an instruction that scoped the edit too narrowly.

This was the state of the file at the pre-cheap-fix baseline commit (`d5ed471`).

**May 1 (this session) — Two surgical removals applied as `d636b93`.**

- `scale: 0.95` removed from wrapper exit (orphan from the April 30, 23:29 experiment)
- `expandedDimensions` mechanism removed entirely (wrapperRef, hasExpandedRef, measurement useEffect, tClearDims timeout, inline style on wrapper)

---

### The loops

**Loop 1 — `layout` on the wrapper: added, reverted, added, removed.**

- April 29, 20:40: added as "option 2." Reverted April 29, 20:44.
- April 30, 23:29: added again. Not reverted cleanly — session ended.
- May 1, 14:40: removed again (surgical edit).

Same diagnosis both times. Same result both times. No learning transferred between sessions.

**Loop 2 — `isClosing` / `holdFootprint`: introduced, iterated, deleted, proposed again.**

- April 29 ~20:00: introduced.
- April 29–30: iterated across multiple sessions.
- April 30, 20:56: explicitly deleted as part of "architectural simplification."
- May 1, 15:13: the explicit scale proposal in that session proposed reintroducing `isClosing` for footprint hold — without noting it had already been through this exact lifecycle.

**Loop 3 — scale-driven close: implemented, reverted, proposed again.**

- April 30, 19:05: implemented. Reverted at 19:19.
- May 1, 15:13: the explicit scale proposal proposed the same mechanism (explicit `scaleX`/`scaleY` MotionValues, footprint held during animation).

---

### The hallucination

The `scale: 0.95` on the wrapper exit was an orphan from the April 30, 23:29 session when `layout` was on the wrapper. When `layout` was removed (May 1, 14:40), `scale: 0.95` was not removed. The surgical edit's reasoning ("wrapper layout prop is blocking FLIP corrective inheritance") had nothing to do with `scale: 0.95`, so it was left behind with no architectural justification. The comment added during the surgical edit described the wrapper as inheriting the card's FLIP corrective as "the visible scaling motion of the contents" — but `scale: 0.95` on exit composed with that inherited transform and added a second, center-anchored shrink. The comment and the exit prop were describing two different intended behaviors simultaneously.

---

### What the code has never had

The animation has never been observed working correctly and committed. Every version that was "working" — to whatever degree — existed only in the working tree and was either reverted or replaced before the next session began. There is no stable baseline to return to except the April 20 commit, which uses a different and significantly simpler architecture.

---

### The pattern that produced the loops

Each session began with a context summary describing the most recent architectural state. That summary was treated as ground truth. But the most recent state was frequently a diagnostic test, a partially-applied fix, or an abandoned experiment — not a settled design. The next session read that state, reasoned about it as if it were intentional, and proposed changes based on that reasoning. When those changes failed, the session ended and the cycle repeated.

The eleven days of uncommitted work made this worse. Without commits, there was no record of which states were tried and rejected — only the current working-tree state and whatever the context summary chose to include.

---

### What to do next

1. Observe the cheap fix (`d636b93`) in the browser. The close animation should now show the card and its contents shrinking as a single unit toward the top-left, driven entirely by the card's FLIP corrective cascading through CSS transform inheritance.

2. If the close animation looks correct: commit the observation note and move on to the next principle.

3. If the close animation still has visible artifacts: read this document before proposing a new approach. Check whether the proposed approach has already been tried (see the loops above). If it has, name why this attempt differs before implementing.

4. Do not propose reintroducing `isClosing`, `holdFootprint`, or explicit `scaleX`/`scaleY` MotionValues without first explaining how this attempt differs from the April 29–30 iterations that were explicitly deleted.
