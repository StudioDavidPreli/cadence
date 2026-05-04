# Expanded card layout: scoping session, 2026-05-04

Scope: PrinciplesLibrary, PrincipleCard, and the @container library breakpoint that controls the expanded card's stacked fallback.
Outcome: revised session plan, three items moved off-scope, Playwright MCP added to enable real browser observation in the next pass.

---

## What the brief assumed

The session brief described a JavaScript-driven layout architecture: a `containerSize` measured from a `window.resize` listener, a `BREAKPOINT_STACKED` constant, an `isStacked` derivation, a `cardsPerRow = Math.max(1, ...)` calculation, and an `expandedWidth = containerSize.width * 0.60` projection.

None of those variables exist in the current codebase. The brief was assembled from prior session notes that no longer match the code.

## What reconnaissance found

`PrinciplesLibrary/index.jsx` measures column geometry, not container size. A single `ResizeObserver` watches the `.grid` element, reads `gridTemplateColumns` from `getComputedStyle`, and tracks `columnCount` and `cellWidth` only. No `window.resize` listener exists in either the library or the card.

The grid uses `repeat(auto-fit, 180px)` with `justify-content: center`. The expanded card spans two columns and two rows, so its rendered size is fixed at `2 × 180px + 12px gap = 372px wide × 480px tall` regardless of library width.

The breakpoint is a single `@container library (max-width: 600px)` block in `PrincipleCard.module.css:420`. Below 600px library width the expanded card flips to stacked. Above it, side-by-side. There is no JS-side parallel.

The motion/UI toggle swaps three regions, not one:

- `.animationHalf` already stack-grids both children at `position: absolute; inset: 0` and crossfades opacity. No height jump.
- `.expandedSummary` uses `AnimatePresence mode="wait"`. Content length differs per principle. Height jumps.
- `QuoteBlock` uses two separate `AnimatePresence mode="wait"` regions for `quoteContent` and `tokenRow`. The `tokenRow` swap is a no-op: the keyed motion changes but the rendered string `principle.tokens` is identical across both states.

## Adjudication of the brief's six findings

Five rest on variables that do not exist.

1. *`window.resize` misses container resize.* Invalid. The code uses `ResizeObserver` on `.grid`. Container-only resizes are already caught.

2. *Container query is on the wrong element.* Invalid. The card width is fixed at 372px. Moving the query onto `.expandedCard` would always satisfy `max-width: 600px`, which inverts the intent. The library scope is correct because library width is the only signal that varies.

3. *Two sources of breakpoint truth desync.* Invalid. There is one source: the container query. No `isStacked` JS state exists.

4. *Remove the stacked-column fallback and pin the card to `min-width: 560px`.* Incompatible with the grid model. The expanded card's width derives from spanning two 180px tracks. Forcing 560px requires either overflowing the grid cell, widening the column track to roughly 278px (which doubles the collapsed card width and breaks State 5), or detaching the card from the grid (which kills the explicit-scale animation contract). Out of scope for a polish session.

5. *Stack-grid the swaps.* Correct in spirit. Refinement: only `.expandedSummary` and the two `QuoteBlock` regions need the change. The left half is already stack-grided. Card height stays fixed at 480px; the taller of the two states pins layout for each region.

6. *Floor `cardsPerRow` at 2.* Invalid as written. No such variable exists. There is a latent edge case in `getExpandedFootprint`: at `columnCount === 1`, `colStart = col - 1 = 0` is an invalid index in a 1-indexed grid. Filed as a separate ticket.

## Revised session scope

In order:

1. Stack-grid `.expandedSummary`. Replace `AnimatePresence mode="wait"` with both states rendered, opacity-crossfaded.
2. Stack-grid `quoteContent` in QuoteBlock. Same pattern.
3. Drop the `tokenRow` `AnimatePresence` entirely. Content is invariant across modes; the wrapper does no work.
4. Apply `text-wrap: pretty` to body prose, `text-wrap: balance` to the toggle button label and short headings.
5. Audit `.expandedWrapper { overflow: hidden }` at `PrincipleCard.module.css:148`. The `.card` shell already clips at the same boundary, so the wrapper's rule is redundant. Remove as cleanup.
6. Add `min-height: calc(2 × 234px + 12px)` to `.library` so the grid floor stays at two rows even with thin test data.

## Regression targets

Principle 18 (Shared Vocabulary) is the worst case for the summary swap. Its `principle.summary` is 130 characters; `componentSummary` is the placeholder string at 35 characters. At 12px mono in the right-half content column, the delta resolves to roughly 60 to 80 pixels of vertical jump on toggle.

Principle 2 (Anticipation) is the secondary target for the `QuoteBlock` swap. Its `animationQuote` runs 118 characters with attribution; `componentQuote` runs 97 without.

## Items moved off-scope

**Goal 2: no single-column reflow on the expanded card.**
Holding side-by-side at every library width requires the card to remain at side-by-side proportions when the library is narrower than 600px. The card's 372px width derives from the 2 × 180px grid track. Holding side-by-side at narrow library widths means redesigning the grid track or detaching the expanded card from the grid. Either change is a session of its own. The `@container library (max-width: 600px)` stacked fallback stays in until that work happens.

**Latent `columnCount === 1` footprint bug.**
At one-column grids, `getExpandedFootprint` computes `colStart = 0`, which is invalid in a 1-indexed grid. The condition only triggers below the 574px documented minimum desktop viewport, so it is theoretical for this project. Logged in the tracker, not patched here.

**Pretext integration.**
Pretext is useful for animating a container between measured heights when the container is allowed to grow. The card height is fixed at 480px, so the runtime use case does not apply. The earlier TODO note remains as a dev-time fit-verification candidate, separate from runtime animation.

## Tooling: Playwright MCP

Phase 2 of the session brief asks for visual reproduction at four library widths. The current Claude Code session can read code and run shell commands but cannot drive a browser. Microsoft's Playwright MCP server was added at user scope:

```
claude mcp add playwright -s user -- npx @playwright/mcp@0.0.73
```

User scope so it is available across projects, not committed to this repo. Pinned to 0.0.73 for reproducibility. `npx playwright install chromium` was run once to cache the browser binaries at `~/Library/Caches/ms-playwright/`. The MCP server health check reports connected.

The next session picks up Phase 2 with browser tools available: `browser_navigate`, `browser_resize`, `browser_click`, `browser_take_screenshot`, `browser_evaluate`. The plan: expand principle 18, toggle motion to UI, capture the height delta at library widths 620, 700, 900, and 1400. Repeat for principle 2 against the `QuoteBlock`.

---

The reconnaissance step is what saved the session. Six paragraphs of scoped edits would have landed on a codebase where the targets did not exist. Future briefings on this project should be written against current code, not against prior session memory.

---

## Phase 2 capture — 2026-05-04

Captured before/after screenshots at library widths 620, 700, 900, 1400 for principle 18 (Shared Vocabulary, summary swap) and principle 2 (Anticipation, QuoteBlock swap). Output: `docs/recordings/phase2-2026-05-04/` with `log.json` for raw measurements.

### Tooling note

The Playwright MCP server in this user config is pinned to Chrome (`/Applications/Google Chrome.app`), which is not installed. Reconfigured to chromium via `claude mcp add playwright -s user -- npx @playwright/mcp@0.0.73 --browser chromium`, but the running MCP process holds the old config until Claude Code restarts. Worked around by writing a standalone Playwright script in `/tmp/cadence-playwright/capture.mjs` that uses `playwright-core` and points `executablePath` at the cached chromium binary at `~/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`. Future runs can use the MCP tools directly once the session is restarted.

### Library width is invariant for the card

The expanded card's measured box is 372 × 480 px at every library width tested. State 5 fixes column tracks at 180px, so the 2-track expanded footprint is fixed at 372px wide. Row height is fixed at 234px (× 2 + 12px gap = 480px). The card geometry does not depend on library width above 600px.

This is the first measurement that confirms it across multiple widths. The implication: the **height-jump regression target is invariant from 620 through 1400**. There is no width inside the side-by-side range where the jump is worse than another. The breakpoint where layout actually changes is `@container library (max-width: 600px)` — which is below the floor of this test set.

### Measured deltas (motion → UI)

| principle | region | width | regionHeight motion | regionHeight UI | delta |
|---|---|---|---|---|---|
| 18 Shared Vocabulary | `.expandedSummary` | 620  | 172.66 | 57.56 | **−115.10** |
| 18 Shared Vocabulary | `.expandedSummary` | 700  | 172.69 | 57.56 | **−115.13** |
| 18 Shared Vocabulary | `.expandedSummary` | 900  | 172.69 | 57.56 | **−115.13** |
| 18 Shared Vocabulary | `.expandedSummary` | 1400 | 172.69 | 57.56 | **−115.13** |
| 02 Anticipation | `QuoteBlock` (full) | 620  | 178.17 | 142.17 | **−36.00** |
| 02 Anticipation | `QuoteBlock` (full) | 700  | 178.17 | 142.17 | **−36.00** |
| 02 Anticipation | `QuoteBlock` (full) | 900  | 178.17 | 142.17 | **−36.00** |
| 02 Anticipation | `QuoteBlock` (full) | 1400 | 178.17 | 142.17 | **−36.00** |

`cardHeightDelta` is 0.00 in every row — the outer card box never grows or shrinks. The deltas are absorbed inside the card by the right-half flex column reflowing.

### Surprises

**P18 summary delta is larger than the brief estimated.** The scoping doc projected 60 to 80 px based on the character difference. The measured value is 115 px. The discrepancy is explained by the right-half being narrower than the brief assumed — 12px mono at the rendered column width wraps the 130-character `principle.summary` to nine lines, not five or six. The visible jump in `w620-p18-...-1-motion.png` vs `w620-p18-...-2-ui.png` shows the title block sliding from top to vertical center as the summary collapses, with the toggle button shifting up to follow. The displacement is large enough that the header (number badge + "Shared Vocabulary" title) reads as a different UI on toggle, not a stable frame around changing content.

**P2 QuoteBlock delta is exactly the attribution line.** 36px ≈ 2 lines of body text. The motion-side quote includes "— Frank Thomas & Ollie Johnston, The Illusion of Life" (2 wrapped lines at 372px); the UI-side quote drops attribution. The token row (`duration.base · ease.spring`) is identical across both states, so the entire delta lives in the attribution presence/absence inside `quoteContent`. This confirms the brief's note that the `tokenRow` swap is a no-op.

**Token row text is identical motion vs UI but the keyed `AnimatePresence` still mounts/unmounts on toggle.** Visible in screenshots: `duration.base · ease.spring` reads the same in `w620-p02-anticipation-1-motion.png` and `w620-p02-anticipation-2-ui.png`. The brief's call to drop the wrapper entirely is correct.

**`See it in motion` button has wider intrinsic width than `See it in UI`.** Visible at every width: the toggle button reflows to two lines on the UI side at 372px card width because "See it in motion" exceeds the column. `text-wrap: balance` on the button label (already in scope item 4) addresses this.

### Stack-grid pattern is the right answer

The before/after pairs make the case visually. The taller-state height is the natural floor — pinning the column at the taller of the two states and crossfading opacity holds the meta row, title, and toggle at fixed Y. The QuoteBlock case is smaller in absolute pixels but more visually disruptive because the quote text and attribution are the focal content of the lower band; a 36px shift directly under the card divider reads as the bottom band growing or shrinking.

Stack-grid both `.expandedSummary` and `quoteContent`. Drop `tokenRow`'s `AnimatePresence`. The scoping doc's items 1, 2, and 3 are correct as written.

### Capture script

`/tmp/cadence-playwright/capture.mjs`. Forces `[class*="_library_"]` to the target width via injected style override (sidesteps the TokenLab grid + App padding chain). Disables transitions and animations during capture so steady-state frames are clean. Crops each screenshot to the union of the before/after card bounding boxes so the two frames at a given width line up pixel-for-pixel for diffing. Re-runnable; output is reproducible because the override pins library width independent of viewport.
