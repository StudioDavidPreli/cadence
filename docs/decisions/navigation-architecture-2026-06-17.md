# Navigation architecture: three-column shell, accordion nav, Rive hero

**Date:** 2026-06-17
**Status:** Accepted, in build
**Context:** Cadence is framed as two interactive tools, Token Lab and Principles Library, but the implementation buried the Principles Library as the fifth tab in TokenLab's horizontal demo-tab strip. A tab strip cannot grow: every new category competes for horizontal space and the labels wrap. The product framing and the layout disagreed. This change promotes the two tools to a top-level navigation surface, moves category selection into a vertical column that scales with growth, and gives the tool a landing state built on a Rive animation.

The tool bar (the controls column) must remain mounted across both tools. Many Principles Library demos read live token values from it, so hiding it on the Principles view would break those demonstrations. That constraint is the spine of every decision below.

---

## The three-column shell

`.tokenLab` goes from two columns to three:

```
TOOL BAR        |  NAVIGATION         |  DEMO AREA
(controls)      |  (accordion)        |  hero | category demo | grid
```

1. **Tool bar** (`.controls`) is unchanged and always mounted. It sits outside `MotionTokensProvider` because it is the source of token values, not a consumer.
2. **Navigation** is a new vertical accordion. A column gives each category its own full-width row, so a long label wraps inside its row instead of fighting for horizontal space, and adding a category adds a row rather than crowding a strip.
3. **Demo area** renders one of three things, decided entirely by navigation state.

`MotionTokensProvider` continues to wrap only the demo area, so every demo inside it (category demos and the Principles grid) reads live tokens. `ActiveTokenProvider` and `TitlePulseProvider` continue to span the columns so the P06 title-flash channel still connects the tool bar title to the Principles demo.

## Navigation state

A new `NavigationContext` provided at the `App` level, built as the split state/dispatch pattern already used by `ActiveTokenContext`. It lives at `App` rather than inside TokenLab because the Cadence wordmark in the top bar also drives it, and the wordmark is a sibling of TokenLab, not a child. Token reducer state stays inside TokenLab and never unmounts, which is what makes "Token Lab state persists across the Principles Library" true by construction: the tool bar is always on screen, so the reducer it edits is never torn down.

State shape:

```
section:         'token-lab' | 'principles' | null   // null = landing (hero)
destination:     <categoryId> | 'principles' | null   // what the demo area shows
expandedSection: 'token-lab' | 'principles' | null   // single-open accordion
principleFilter: 'all' | 'classic' | 'extended'
```

**The rule the demo area follows:** render the `destination`'s content; if `destination` is `null`, render the hero. Destinations are a Token Lab category, or the Principles grid. There is no separate "is the hero showing" flag; the hero is simply the absence of a destination.

## Accordion behavior

Single-open. Opening one section collapses the other. Both start collapsed, so the Principles header is visible at the top fold regardless of how long Token Lab's category list grows later.

The two sections behave differently, and that asymmetry is correct because their content models differ:

- **Token Lab header is disclosure only.** Clicking it expands or collapses its four categories. It loads no content of its own; it has no single surface to show. The hero stays until a category leaf is clicked.
- **Principles header is disclosure and destination.** Clicking it sets `destination` to the grid (the hero crosses off), and expands to reveal Classic (principles 1 to 12) and Extended (principles 13 to 18). Selecting a filter subsets the grid in place. Re-clicking the active filter toggles it off, back to all eighteen. There is no separate "All" row.

### The emergent return-to-hero

Single-open accordion plus the destination rule produces one behavior worth naming, because it can surprise. If the Principles grid is showing and the user clicks the Token Lab header to browse, single-open collapses Principles. Token Lab's header loads no content, and no category is selected yet, so there is no active destination. The hero returns. This is coherent: the hero is the rest state, and collapsing the only content-bearing section leaves nothing to show. The alternative, "last content sticks until replaced," was rejected because it leaves the navigation and the demo area describing different things.

## The active indicator uses CSS, not layoutId

The old horizontal `tabPill` was a `layoutId` element in a named `LayoutGroup`. The new vertical indicator in the navigation column is a CSS transition instead. This follows the carousel-dot precedent documented in CLAUDE.md: when an indicator animates alongside a concurrent animation, CSS is safer than `layoutId` because it sits outside Framer Motion's projection system and cannot corrupt a concurrent FLIP snapshot. Here the concurrent animation is the hero crossfade. A `layoutId` indicator sliding while the hero fades on is exactly the conflict the precedent warns against.

## Transitions: layered crossfade, fixed duration

Both directions use the same mechanic. The incoming layer fades on as the top layer; the outgoing layer unmounts on the incoming layer's `onAnimationComplete`. During the transition both layers are mounted and stacked, the incoming one wins z-order, and the outgoing one is removed once the incoming layer is opaque, so its departure is hidden. There is no visible exit animation and no gap.

The crossfade reads a new `--feedback-nav-duration`, a fixed value in `motion.css` alongside `--feedback-flash-duration`, not the editable `--motion-*` tokens. The reasoning is the same as the title flash: Explore mode lets a user drag duration tokens to near zero, which would collapse the navigation transition into an imperceptible jump and make the tool feel broken. Structural navigation chrome should not be at the mercy of the values the tool exists to let people experiment with. Default 360ms.

Under `prefers-reduced-motion`, the crossfade snaps with no fade and the hero holds a static frame.

## The Rive hero

A landing animation built in Rive rather than p5.js. Rive reuses the theme-binding and isolation patterns already proven across the eighteen principle files, adds no dependency, and its state machine gives the idle state real interactivity.

The hero lives in an isolated `HeroAnimation` component that wraps `useRive`, the same isolation the `PrincipleAnimation` / `RiveCanvas` split uses, so the canvas lifecycle is contained and unmounts cleanly when a destination takes over the demo area.

**It needs no exit choreography.** Because every transition is a layered crossfade where the incoming content covers the outgoing one, the hero never plays a procedural off-animation; it is covered and then unmounted. This drops the `exit` trigger and `exitComplete` event that an earlier draft assumed, and simplifies the authoring spec to entrance, idle, hover, and theme.

### Authoring spec

- **File:** `/public/rive/hero.riv`. The React side reads the state machine name from its `RIV_FILES`-style entry, so the name is the author's choice.
- **View model:** `ViewModel1` with `Light` / `Dark` / `Contrast` instances and `colorPropertyFill` + `colorPropertyStroke`, matching every principle file. React binds the instance off `ThemeContext`; stroke and fill colors live in Rive.
- **Idle loop:** autoplays on mount.
- **Hover:** handled internally by the state machine via Rive's own pointer listeners. React passes nothing in for now. Feeding React-side data (cursor position, token values) into the hover is tabled for a later build.
- **Reduced motion:** under `prefers-reduced-motion`, React does not autoplay the loop; the hero holds a static frame.

React wires a graceful fallback so the build runs before the asset is authored: a missing `hero.riv` renders an empty themed surface, not an error.

## The Cadence wordmark

A home button in the top bar next to the ThemeSwitcher. Clicking it is a full return to the landing state: the hero fades on, both accordion sections collapse, and the active destination clears. It does not reset token values. The tool bar already owns reset, and adding a second reset path would fork the user's model of what "reset" means in this tool.

## Deep linking

Hash-based, no router dependency, via a `useHashRoute` hook that syncs navigation state to `location.hash` and listens for `hashchange` so the browser back button works. Routes:

```
#/                              landing (hero)
#/token-lab/<categoryId>        a Token Lab category demo
#/principles                    the grid, all eighteen
#/principles/classic            grid filtered to 1 to 12
#/principles/extended           grid filtered to 13 to 18
#/principles/<filter>/<id>      a specific expanded principle
```

Section, category, and filter routing is in scope for this build. Deep-linking to a specific expanded principle is the most involved piece, because `PrinciplesLibrary` currently owns its expansion state internally and it has to sync that to the hash. If it grows past a clean change it ships as a follow-up; the rest of the routing lands regardless.

## Desktop width handling (resolved 2026-06-17)

The third column changes the width budget. With `300px` controls + `220px` nav fixed, a plain `1fr` demo area collapses toward zero around `~600px` viewport and drops below the principles grid's `420px` floor by `~1020px`. The two fixed columns were eating the width the demo area needs.

This is a desktop-first tool, so the stance is: **the demo area is the star and never yields.** The pieces, by breakpoint:

- **Demo floor (always).** The demo column is `minmax(420px, 1fr)`, so it never shrinks below the principles grid's floor.
- **≤1024px — nav collapses.** The last width where `300 + 220 + 420 + 80 padding ≈ 1020` fits. The nav column becomes a 44px "Navigation" rail; the full controls stay.
- **≤720px — controls collapse too.** The tool bar becomes a 44px "Tokens" rail, sitting left of the Navigation rail. Below this both columns are rails (`44 + 44 + 420 + 80`), so the demo area still has its full floor.

Each rail opens its content (the controls, or the nav accordion) as a drawer over the demo area. The two drawers are **mutually exclusive**: TokenLab owns a single `openDrawer` value (`'tokens' | 'nav' | null`), so opening one closes the other, which is the requested switch behavior. The generic `RailDrawer` component renders both. The earlier column-trim (Option C) was dropped; the collapses solve the width pressure more completely.

**Drawers open over the demo, not over the controls.** The backdrop and drawer start at `--drawer-left` (the combined width of the rail strip to their left: `344px` while controls are full, `88px` once both collapse), so the rails to their left stay uncovered and clickable. That is what lets you click the other rail to switch while a drawer is open; a full-width backdrop would trap you in one drawer.

The horizontal pan (`overflow-x: auto` on `.tool`) remains only as a deep fallback below ~588px, where even two rails plus the demo floor no longer fit. The body-scroll unlock is now **height-only** (`max-height: 600px`): the old `max-width: 720px` trigger was removed because it released the height lock at 720px wide and ballooned the controls column to full content height. Narrow width is handled by the collapses and the pan instead.

A documented side effect: because the demo column can no longer fall below `420px`, the principles grid always resolves to at least two columns, so the latent `getExpandedFootprint` `columnCount === 1` edge case can no longer trigger.

### Drawer behavior and accessibility

Each rail is a grid item; its drawer and backdrop are absolutely positioned against `.tokenLab` (`position: relative`), so they sit outside grid flow and add no column. The drawer is `role="dialog"` / `aria-modal`, takes focus on open, restores focus to its rail on close, contains Tab within itself (a focus trap), and closes on Escape or backdrop click. Rail clicks toggle (and close the sibling). Drawers animate on the fixed `--feedback-nav-duration` and snap under `prefers-reduced-motion`. `useMediaQuery` drives each collapse so the rendered form matches the grid width at the same breakpoint.

Because the controls live inside the Tokens drawer when collapsed, they unmount while it is closed; the token reducer lives in TokenLab and never unmounts, so token VALUES persist (only transient slider UI state, like the active easing slot, resets on reopen).

Known gap: the `max-height: 600px` unlock makes `.tokenLab` auto-height, which collapses the demo area's absolutely-positioned crossfade layers. Short viewports are unaddressed and pair with the future true-phone layout work (vertical stacking of all three regions).
