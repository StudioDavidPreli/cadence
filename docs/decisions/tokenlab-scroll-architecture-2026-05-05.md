# TokenLab scroll architecture: comparison of three approaches

**Date:** 2026-05-05
**Status:** Resolved. Option B (app-shell) shipped 2026-05-05; the viewport-locked shell, per-column scroll, and the short-viewport unlock are the live architecture (see navigation-architecture-2026-06-17.md). This header was never closed at the time; corrected 2026-07-16.
**Context:** TokenLab today scrolls at the page level. When the viewport is shorter than the content, scrolling to see a component pulls the controls column out of view as well. The functional complaint is that some tokens cannot be manipulated while looking directly at the components they affect.

---

## Approaches

Three approaches survive scrutiny. This doc captures the trade-offs in detail so the long-term architecture can be chosen deliberately rather than by inertia.

### A. Sticky controls

**Mechanism.** `.controls` becomes `position: sticky; top: 0; max-height: 100vh; overflow-y: auto`. The control column pins to the viewport top while the page scrolls underneath. Demo column flows naturally with the page.

**Where the scrollbar lives.** Page-level (window).

**Files touched.** `TokenLab.module.css` only, one selector edit.

**What changes for the user.** Sliders never leave view. Demos scroll into view as the page scrolls. The browser scrollbar acts on the page, which is the expected behavior for a webpage.

**What stays the same.** Page chrome (theme switcher, anything around the tool) behaves like a webpage. Mobile and tablet work without media queries: sticky just stops being meaningful when there is not enough vertical room and falls back to normal flow.

**Risks.** Sticky needs no `overflow:hidden` or `transform` on ancestors of `.controls`. Current chrome is clean, but every future change to the wrapper above `.tokenLab` has to remember this constraint. Sticky also has a known minor browser quirk: it can flicker on Safari during fast scroll on macOS trackpads.

**Portfolio signal.** "I know the lightweight CSS primitive for this problem." Reads competent but not ambitious.

**Effort.** 30 to 60 minutes including verification.

---

### B. App-shell layout

**Mechanism.** Lock `.tokenLab` to the viewport. `body { overflow: hidden }`. Both columns get their own scroll containers. The page itself never scrolls. The tool does.

**Where the scrollbar lives.** Inside each column.

**Files touched.** `TokenLab.module.css` (heights, overflow on both columns), the page wrapper around TokenLab (probably `App.css` or wherever the theme switcher row lives, made into a fixed-height region above the tool), maybe a small media-query gate for narrow viewports where stacking behaves differently.

**What changes for the user.** The tool fills the screen. Sliders and demos are always co-visible. Resizing the window does not reflow content; it changes how much of each column you can see before scrolling. Feels fundamentally different from a long article: this is a thing you use, not content you read.

**What stays the same.** All component-level behavior. The principle card's scroll container, the card expand animation, the bezier visualizer interactions.

**Risks.** Three real ones, all manageable but each one a real chunk of attention:

1. **Chrome budget.** You have to know what sits above the tool (theme switcher row) and reserve exact pixels, or restructure to use flex `min-height: 0` chains. Either path works; the flex chain is more robust to future additions but requires more thought.
2. **Mobile fallback.** `body { overflow: hidden }` breaks naively on phones. Below some breakpoint, you want columns to stack vertically and the page to scroll normally, which means a media-query-guarded layout. The `min-width: 420px` grid floor we already added pairs naturally with this: pick the same breakpoint for both rules.
3. **Browser zoom and accessibility.** Users who zoom to 200% on a 1080p display effectively see a 540px-wide viewport. A locked-height tool can become unusable at high zoom levels because content gets clipped without flow recovery. Mitigation: the same media-query fallback that handles mobile also catches zoom-to-narrow.

**Portfolio signal.** "I make tools." This is the design engineer move. A reviewer at a product company would notice. Every internal tool they ship looks like this, not like a blog post. Specifically: the gestalt of "this is a thing for working in" is what separates tool design from documentation design. App-shell is the load-bearing decision that earns you that read.

**Effort.** A focused session. Maybe 2 to 4 hours including the tablet and phone fallback, careful testing of card expansion and tab switches at multiple heights, and verification that scroll containers do not fight each other on the principles tab.

---

### C. Demo-pane scroll only

**Mechanism.** `.tokenLab` height-bound to the viewport. `body { overflow: hidden }`. `.tabPanelInner` (or `.demoContent`) gets `overflow-y: auto`. Controls column behaves as today.

**Where the scrollbar lives.** Inside the active demo pane (right column). Window does not scroll.

**Files touched.** `TokenLab.module.css`. Possibly `App.css` for the body rule, like B. Smaller surface than B, the same kind of changes.

**What changes for the user.** Sliders always visible. Scrolling within Press & State to find Notification Badge keeps every slider in place. Tab strip stays visible above the scrolling content.

**What stays the same.** Controls column behavior, exactly. PrinciplesLibrary's internal scroll. AnimatePresence horizontal slide between tabs (clipped by `.demoPanel { overflow: hidden }` which we keep).

**Risks.**

1. **Nested scroll on the Principles tab.** `.tabPanelInner` would scroll AND `.library` already scrolls, on the same axis. There is no content above the library inside the principles tab today, so in practice the outer scroll does nothing on that tab. But if you ever add chrome above the library (a tab description, a filter bar), you have a nested-scroll user-experience problem to solve.
2. **Mobile and zoom.** Same trade-off as B. `body { overflow: hidden }` needs a fallback at small sizes. Same mitigation.
3. **Sub-optimal feel.** The controls column STILL scrolls in its own little sub-window when content overflows it (today's behavior). Two scrollable regions of different visual weights: the one on the right is the "real" scroll, the one on the left is hidden until the user discovers it. Not broken, just slightly inconsistent.

**Portfolio signal.** "I solved the immediate UX problem." Readers will notice the right column scrolls cleanly. The fact that the left column has its own scroll surface that behaves differently is the kind of detail that does not actively register but does subtly read as "not quite finished."

**Effort.** 1 to 2 hours. Less than B mainly because you are not making a deliberate decision about the controls column's scroll model. You are inheriting it.

---

## Comparison at a glance

| | **A. Sticky** | **B. App-shell** | **C. Demo-pane only** |
|---|---|---|---|
| Effort | 30 to 60 min | 2 to 4 hr | 1 to 2 hr |
| Files changed | 1 | 3 to 4 | 2 to 3 |
| Scrollbar location | Window | Inside columns | Inside right column |
| Page feels like | Webpage | Tool | Hybrid (mostly tool) |
| Mobile out of the box | Yes | Needs media query | Needs media query |
| Risk surface | Very small | Real but bounded | Small |
| Architectural commitment | Reversible cheaply | Long-term | Reversible cheaply |
| What it says about the maker | "Pragmatic" | "Builds tools" | "Solves the bug" |

---

## Where the dimensions actually pull

**The functional problem (sliders co-visible with components) is solved by all three.** That is the floor.

**The differentiator is what the project tries to be.** Cadence's positioning, per `CLAUDE.md`: "demonstrate design engineering thinking to hiring managers at product companies". That argues for B. The case study you will write benefits enormously from "I built a tool" being the literal correct description, not a stretched metaphor. Token Lab gets to exist as an instrument on screen rather than as an article that happens to be interactive.

**Against B,** the cost is one focused session and a small permanent mobile and zoom complexity. Neither is a deal-breaker for a desktop-first tool that already documents `Minimum desktop viewport: 574 px`.

**The risk in deferring B** is that A or C are easy to ship today and become the load-bearing layout by inertia. Switching from A or C to B later is harder than building B once now, because the small CSS choices in A and C are not compatible with the height-bound chain B needs. You would be untangling assumptions.

---

## Recommendation

**B.** The effort gap is one session. The portfolio gap is the kind of detail a senior reviewer notices in five seconds and that a junior reviewer does not notice ever, and you are being read by the senior reviewer. The mobile and zoom fallback can be a media query that just unlocks `body { overflow }` and the column heights below 720 by 600 or so; that is not a separate design problem.

If you want to ship something tonight without a full session, ship **A** as a placeholder and rebuild as **B** in the dedicated session. They are cleanly separable. **C** can be skipped: more work than A without committing to the destination B reaches.
