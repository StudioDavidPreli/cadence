# Grid Architecture

The Cadence principle grid went through five architectural states before arriving at the current one. Each state was correct given what was known at the time. Each revealed a deeper constraint that the next state had to address. Preserving this path matters because the final solution looks arbitrary without the reasoning.

This document is the deep reference. For the short version of the current rules (column track, row height, scrollbar gutter, auto-flow), skip to "Current rules" at the bottom.

---

## How we got here

**State 1 — Flexbox with runtime width measurement.**
Original implementation used `display: flex` with `flex-wrap`, explicit card widths computed from `containerRef.getBoundingClientRect()`. Chosen because an earlier debugging session blamed CSS Grid for twitching during card expansion.

The twitching was real, but the cause was not CSS Grid itself. It was per-card physics (springs with slightly different timings) running concurrently during the reflow. `ease.standard` on the layout prop solves this regardless of whether the parent is flex or grid.

State 1 worked but required hundreds of lines of JavaScript to do what the browser does natively. Card count per row was hardcoded to 4 in the width calculation. The grid was not actually responsive.

**State 2 — CSS Grid with grid-auto-rows: 1fr.**
Reverted to CSS Grid with auto-fit columns. Added `grid-auto-rows: 1fr` in the belief that 1fr would produce consistent row heights.

Inside a scroll container (`overflow-y: auto`), 1fr resolves to `minmax(auto, 1fr)`. The auto lower bound means rows size to content. Cards with mostly padding and a placeholder icon have very short intrinsic heights. Rows collapsed to those heights, and the 2x2 expansion reserved two short rows' worth of space rather than a proportional 2x2 area. Expanded cards rendered wide-and-short.

**State 3 — minmax(234px, auto).**
Replaced 1fr with `minmax(234px, auto)`. The 234px floor (180px column × 1.3 portrait ratio) guaranteed a minimum row height. The auto upper bound preserved flexibility for cards whose content demanded more height.

State 3 fixed the wide-and-short bug but introduced a new one: the auto upper bound allowed rows to grow during the reflow triggered by expansion. Framer Motion's layout prop captures the "last" bounding box at the moment state flips, but row heights continued resolving after that capture as displaced cards settled. The expanded card animated toward an outdated target. It overshot its final size, then hard-cut to the correct size at animation end.

**State 4 — grid-auto-rows: 234px flat.**
Dropped the minmax entirely. Fixed row height at 234px. The expanded card's final bounding box is deterministic from the moment `isExpanded` flips true. No overshoot, no hard cut.

Flat row height is the correct answer specifically because of how Framer Motion's FLIP animation interacts with grid reflow: any dimension that can change mid-animation creates a race between the animation target and the layout engine. Fixed dimensions remove the race.

**State 5 — column track fixed at 180px (current).**
The `minmax(180px, 1fr)` column template let cards grow proportionally beyond their design width. The 1:1 aspect ratio on the placeholder icon meant the icon grew taller as the card grew wider, pushing the meta row and title past the card's `overflow: hidden` bottom edge. At viewports above roughly 574px the title was visibly clipped on cards whose two-line titles no longer fit the inner content height.

Switched `grid-template-columns` to `repeat(auto-fit, 180px)` with `justify-content: center`. Cards now resolve to exactly 180px wide regardless of viewport. Empty trailing tracks collapse via auto-fit; populated tracks center in available width.

The whitespace at wide viewports is intentional. The card design size is the card design size. Letting it grow to fill empty space deformed the content box.

State 5 is the same kind of fix as State 4, applied to the other axis. State 4 fixed row height to remove a moving animation target. State 5 fixes column width to prevent the icon from deforming the card. Both are "stop letting the grid grow into the content" decisions.

**grid-auto-flow decision.**
Along the way, `grid-auto-flow: dense` was used to pack the grid tight (no empty cells around the 2x2 footprint). Dense reorders cards by DOM sequence rather than visual continuity. When card 5 expanded, later cards teleported to hierarchical positions rather than neighbors shifting. This read as global reshuffle instead of neighbors-making-room, which contradicts Cadence's editorial argument that focusing on one principle requires visible flexibility from the system around it.

Switched to `grid-auto-flow: row`. Cards hold DOM sequence. The 2x2 footprint may leave one or two empty cells when it does not align with column boundaries. These cells are intentional: they are the visible evidence that the system yielded space for the expanded principle.

**scrollbar-gutter: stable.**
When the grid gains a row to accommodate the 2x2 expansion, total content height can cross the scrollbar threshold. Without `scrollbar-gutter: stable`, the scrollbar appears mid-animation, reduces `.library`'s width, changes column count via auto-fit, and resizes every card while the layout animation is in flight. Stable gutter reserves the scrollbar's width whether or not it is visible. Column count stays constant through all expansion and collapse transitions.

**What this path teaches.**
Layout debugging is layered. Each fix reveals the next constraint. The overshoot bug (State 3 → State 4) was invisible until the wide-and-short bug (State 2 → State 3) was resolved, because before that the card was not reaching a stable state at all. This is normal. The record of fixes is not a record of mistakes. It is a record of constraints becoming legible in sequence.

Phase 2 will add proportional deformation to cards in the expanded card's neighborhood. The current architecture leaves this seam clean: deformation attaches at the PrincipleCard level via scale transforms driven by position-relative-to-selected props. Phase 1's structural behavior, including the State 5 width fix, is the substrate Phase 2 builds on.

---

## Current rules

**Grid structure.** CSS Grid with `repeat(auto-fit, 180px)` and `justify-content: center`. Cards are fixed at 180px wide regardless of viewport. Empty trailing tracks collapse via auto-fit, populated tracks center in the available width.

Cards do not flex. The earlier `minmax(180px, 1fr)` approach allowed cards to grow to fill track space, which made the 1:1 icon grow proportionally tall and pushed meta and title content past the card's `overflow: hidden` boundary. The fix was to fix card width at the design size and accept centered whitespace at wide viewports as intentional.

**Minimum desktop viewport: 574px.** The Token Lab sidebar is persistent on desktop and pins the principle grid to a minimum effective width of 574px. Designs below that width are not required.

**Row height.** Set by `grid-auto-rows: 234px` (fixed value) on the grid container. 234px = 180 × 1.3, matching the portrait proportion of the narrowest column. This holds stable as columns grow wider. Cards fill their grid row with `height: 100%`, so the 2x2 expansion produces a correctly proportioned rectangle regardless of where it sits in the grid.

Row height is fixed at 234px, not `minmax(234px, auto)`. An earlier version used the flexible upper bound to accommodate cards whose content might exceed 234px. The flexibility caused an animation overshoot bug: when a card expanded, the auto upper bound allowed rows to continue resolving during the reflow triggered by the 2x2 footprint change. Framer Motion's `layout` prop captured the target bounding box at the start of the FLIP animation, but the rows kept growing as the auto resolution finished. The FLIP target moved after the animation started, producing an overshoot followed by a hard cut at the end. Fixing the row height at exactly 234px removes the moving target entirely. The expanded card's final size is deterministic the moment `isExpanded` flips true.

An even earlier version used `aspect-ratio: 1/1.3` on `.card` and `grid-auto-rows: 1fr`, which appeared correct but produced wide-and-short expanded cards because `1fr` inside a scrollable container resolves to `minmax(auto, 1fr)`. Rows were sized by content, not by design intent.

**Scrollbar gutter.** `.library` sets `scrollbar-gutter: stable`. Without it, when enough cards render to require a scrollbar, the scrollbar's appearance reduces `.library`'s available width. That width reduction causes `repeat(auto-fit, 180px)` to recompute the column count, possibly dropping from N columns to N-1. If this column recount happens while a layout animation is in flight, every card's target bounding box changes mid-animation. `scrollbar-gutter: stable` reserves the scrollbar lane permanently, whether a scrollbar is present or not, so available width stays constant across the full animation.

**2x2 expansion footprint.** When a card is expanded, it receives explicit `gridColumn` and `gridRow` inline styles computed by `getExpandedFootprint(index, columnCount, totalCards)` in PrincipleCard. The footprint biases down and right. Edge cases: right-column cards extend left, bottom-row cards extend up. Middle cards always bias down-right. Collapsed cards have no inline grid style. They take their natural auto-placed position.

**Auto-flow.** `grid-auto-flow: row` (default). Cards hold DOM sequence. Principle 5 is always visually before principle 6. A 2x2 expansion that does not align with column boundaries leaves one or two empty cells in the grid. This is intentional: the empty cells are the visible evidence that the system yielded space for the expanded principle. An earlier version used `grid-auto-flow: dense` to pack the grid tight, but dense rearranged cards by fill order rather than by visual continuity. Expansion read as global reshuffle rather than neighbors making room. The Cadence editorial argument that focusing on one principle requires flexibility in the system is better served by visible participation (neighbors yielding, small gaps appearing) than by tight packing (global reordering, no gaps).

**Column count awareness.** `PrinciplesLibrary` reads `getComputedStyle(gridRef).gridTemplateColumns` via `ResizeObserver`. The computed value resolves `repeat(auto-fit, ...)` to a space-separated list of pixel values (`"180px 180px 180px ..."`). Splitting by space gives the column count. This is the only JavaScript-side layout knowledge the components need. ResizeObserver (not window resize) catches panel resizes that don't change the window dimensions.

Since the column track is now fixed at 180px (no flex), `cellWidth` resolves cleanly to 180 at every viewport. The earlier flex-stretched template made `cellWidth` vary with viewport width, which the close-animation scale ratio then had to absorb. The current value is stable.

**Container queries on `.library`.** The `@container` rule that stacks the expanded card's internal layout below 600px lives in `PrincipleCard.module.css` (where the target classes live). CSS Modules hashes class names but not container-name values, so `library` is the same string in both files at runtime.

**Two-line clamp on .cardTitle.** `-webkit-line-clamp: 2` instead of `white-space: nowrap`. Multi-word titles can wrap to two lines at 180px width. Principles whose two-line title exceeds the card's available content height use the optional `gridTitle` field to render a shorter override in the collapsed grid card. See `docs/principles/conventions.md`.

**Phase 2 hook.** Card deformation based on distance from the expanded card attaches at the PrincipleCard level. `getExpandedFootprint` already has the expanded card's index, row, and column. Neighborhood distance math slots in here. Phase 1 leaves this seam clean; Phase 2 does not require restructuring Phase 1.
