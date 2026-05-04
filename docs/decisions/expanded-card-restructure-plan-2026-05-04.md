# Expanded card layout: restructure plan, 2026-05-04

Follow-up to `expanded-card-layout-scoping-2026-05-04.md` and the Phase 2 capture. The stack-grid attempt earlier today landed measurement-true but visually wrong. Reverted in working tree. This document is the plan for the next implementation pass.

## What the previous attempt got wrong

The fix addressed the summary swap delta (115 px on P18) and the QuoteBlock delta (36 px on P2) by stack-gridding both regions. Verification showed `regionDelta = 0` and `cardDelta = 0` at four library widths. Both true.

What the verification missed: `.contentHalf` was already too tall to fit inside the card. Pinning the summary at the max-of-two-states height (192 px) grew motion-state `.contentHalf` from ~253 to ~333 px. The card has 324 px available between `.expandedContent` and `.quoteBlock`. With `align-items: center`, the overflow split equally to top and bottom.

Measured at vw=1920 after the fix:

| | motion | ui |
|---|---|---|
| meta badge top vs card top | −4.2 px (clipped) | −11.2 px (clipped) |
| toggle bottom vs quoteBlock top | −5.2 px (overlap) | −12.2 px (overlap) |
| toggle height | 28 px | 42 px (label wrap) |
| contentHalf height | 332.7 px | 346.7 px |

Both states broken. Motion was not broken pre-fix; the fix made it strictly worse by holding it at the worst-case height. The `delta = 0` check confirmed only that the height was the same in both states, not that either state fit inside the card.

The lesson: the next pass needs absolute-position checks alongside deltas. Codified in Phase 5.

## What changed in this revision

The original plan included three Phase 0 decisions, a stacked-layout phase, and a breakpoint-tuning phase. David's gut check on the breakpoint collapsed the scope.

The card geometry is invariant at every library width where 2 columns fit. State 5 fixes the column track at flat 180 px, so the expanded card is `2 × 180 + 12 = 372 px` wide and `2 × 234 + 12 = 480 px` tall regardless of library width. The internal flex ratio (animation 1.4 : content 1) doesn't change either. The right-half content column is the same ~155 px wide whether the library is 600 px or 1400 px wide.

The `@container library (max-width: 600px)` block was justified in its own comment as compensation for halves "compressing below readability" — but at 600 px library the halves are the same size as at 1400 px library. The breakpoint is a fossil from before State 5 fixed the column tracks. It flips a layout for no reason.

Where stacking is structurally necessary is library width below ~390 px, where the grid drops to 1 column and the expanded card cannot span 2 tracks. That is the deferred-session item already in the tracker (`getExpandedFootprint` at `columnCount === 1`). Separate problem, separate fix.

This revision: scrap the breakpoint. Hold side-by-side at every width where 2 columns fit. The wide-width overflow that the original Phase 1 described was caused by the previous (reverted) stack-grid attempt; in the current working tree the side-by-side layout renders correctly at 1920, and shorter toggle labels free up enough height in `.contentHalf` to make the stack-grid fix safe to re-attempt.

## Decisions

1. **Toggle labels.** `Motion` / `UI`. Shorter, single-word, no wrap risk. Loses the verb but the toggle's job is unambiguous in context — it's the only toggle on the card. (Choice: option a from the original Phase 0.1.)

2. **Container query.** Delete `@container library (max-width: 600px)` block in `PrincipleCard.module.css:402–446` and its preceding header comment. Card geometry is invariant; the block does no architectural work.

3. **Stacked-layout proportions.** Moot — no separate stacked layout exists.

## Phase 1 — re-attempt the height-jump fix

The original problem: motion → UI toggle on P18 jumps `.expandedSummary` height by 115 px; on P2 jumps QuoteBlock height by 36 px. The previous attempt fixed the deltas but caused contentHalf overflow. Shorter toggle labels remove the overflow trap (the UI-state label no longer wraps to a second 14-px line).

Implementation, from the scoping doc:

1. Stack-grid `.expandedSummary`. Replace `AnimatePresence mode="wait"` with both states rendered, opacity-crossfaded. The taller of the two states pins layout.
2. Stack-grid `quoteContent` in `QuoteBlock`. Same pattern.
3. Drop the `tokenRow` `AnimatePresence` entirely. Content is invariant across motion/UI; the wrapper does no work.
4. Apply `text-wrap: balance` to the toggle button label and short headings, `text-wrap: pretty` to body prose.

Verify with Phase 5 protocol.

## Phase 2 — out of scope, flagged

Card-width collapse at viewport 608 → 799 (library 228 → 419, grid drops to 1 column, card renders at 180 px wide). Lives in the deferred-session bullet in the tracker: fix `getExpandedFootprint` for `columnCount === 1`, or widen the column track, or detach the expanded card from the grid. Pick one in that session.

For this session, the practical floor is viewport ≥ 800 px. Below that the layout will be visually broken regardless of Phase 1 — and was already broken before today's work.

## Phase 5 — verification protocol, codified

Extend `/tmp/cadence-playwright/capture.mjs` or commit a permanent script. For each candidate change, capture motion + UI at vw 1920, 1200, 1000, 950, 900, 850, 800 and assert:

- `meta.y - card.y ≥ 0` — badge top inside card bounds, both states
- `quoteBlock.y - (toggle.y + toggle.height) ≥ 0` — no overlap with the divider, both states
- `meta.y - card.y` consistent across motion and UI within a viewport — no badge jump on toggle
- Library width matches the expected value at each viewport

Delta checks stay; absolute checks added. The earlier pass passed deltas and shipped a regression. Both are required.

## Order

1. Rename toggle labels (Decision 1)
2. Delete container query block (Decision 2)
3. Phase 1 stack-grid implementation
4. Phase 5 verification

Phase 2 (1-column reflow) is a separate session.

---

## Verification results — 2026-05-04

Phase 5 protocol run via Playwright MCP. Captured motion + UI states for each of the 18 principles at vw=1920, plus card geometry checks for P18 across vw 800-1920.

**Card geometry invariance (P18, all viewports tested 800-1920):**

| vw | libW | cardW | cardH | badgeInsideCard | toggleQbGap |
|---|---|---|---|---|---|
| 1920 | 1540 | 372 | 480 | 25 | 30.4 |
| 1200 | 820  | 372 | 480 | 25 | 30.4 |
| 1000 | 620  | 372 | 480 | 25 | 30.4 |
| 950  | 570  | 372 | 480 | 25 | 30.4 |
| 900  | 520  | 372 | 480 | 25 | 30.4 |
| 850  | 470  | 372 | 480 | 25 | 30.4 |
| 800  | 420  | 372 | 480 | 25 | 30.4 |

Every value identical. Card is the same object at every library width above the 1-column threshold. Confirms David's gut check on the breakpoint.

**Motion/UI assertions (all 18 principles, vw=1920):**

| principle | gap (px) | summaryH | qbH | status |
|---|---|---|---|---|
| 1 Squash & Stretch | **−24.6** | 180 | 157 | **toggle overlaps quoteBlock** |
| 2 Anticipation | 51.4 | 108 | 180 | ok |
| 3 Staging | 91.8 | 90 | 157 | ok |
| 4 Straight Ahead & PtP | 35.6 | 108 | 143 | ok |
| 5 Follow Through | 11.4 | 144 | 157 | tight |
| 6 Slow In & Slow Out | 29.4 | 126 | 157 | ok |
| 7 Arc | 109.8 | 72 | 157 | ok |
| 8 Secondary Action | 44.0 | 126 | 143 | ok |
| 9 Timing | 33.4 | 126 | 180 | ok |
| 10 Exaggeration | 69.4 | 90 | 180 | ok |
| 11 Solid Drawing | 25.0 | 108 | 180 | ok |
| 12 Appeal | 73.8 | 108 | 157 | ok |
| 13 Systematization | 106.4 | 90 | 143 | ok |
| 14 Hierarchy of Motion | 80.0 | 90 | 143 | ok |
| 15 Economy | 106.4 | 90 | 143 | ok |
| 16 Token Fidelity | 26.0 | 144 | 143 | ok |
| 17 Reduced Motion | 25.9 | 144 | 143 | ok |
| 18 Shared Vocabulary | 30.4 | 162 | 120 | ok |

Every principle's gap is identical motion vs UI (stack-grid working as intended — taller-state pins layout in both states).

**P1 outlier: content, not architecture.**

P1's `componentSummary` is 122 characters and includes an em-dash. At 12 px mono in the ~117 px right-half column, it wraps to 10 lines (180 px). The summary stack pins both states at 180 px. Combined with `meta + title + toggle + gaps` (~141 px), `contentHalf` reaches 321 px against an available 297 px. The 24 px overflow pushes the toggle bottom below the QuoteBlock divider.

Tracked in `tracker/TRACKER.md` under "Content constraints surfaced 2026-05-04". Fix is a copy edit: cap `componentSummary` at ~80 characters and remove the em-dash. The em-dash also violates CLAUDE.md hard rules independently.

**What changed from the previous (reverted) attempt:**

Adding `align-items: flex-start` on `.expandedContent` is what made the difference. The previous attempt's stack-grid combined with `align-items: center` split overflow equally above and below — clipping the badge above the card while overlapping the toggle below. Anchoring at the top concentrates any overflow downward, where the QuoteBlock divider absorbs it visually (and only matters when the overflow exceeds the toggle/divider gap, which currently happens only on P1).

This means the architecture has a built-in headroom budget: ~30 px on most principles, 11 px on P5 (the next-tightest), 0 px on P1. Future content additions should respect the ~80-char ceiling to keep all principles in the comfortable range.

