# Demo overlay containment: portaling the Enter & Exit Drawer and Modal

**Date:** 2026-06-19
**Status:** Implemented
**Context:** In Token Lab's Enter & Exit tab, the Drawer and Modal demos rendered `position: fixed`, so they overlaid the whole viewport. The backdrop dimmed the entire app and the panels drew under the navigation rails instead of staying inside the demo column. The Modal also centered to the window, not to the area the user is looking at.

---

## The constraint that ruled out the obvious fix

Both components already carry a `scoped` prop (added for the principle cards) that switches them from `position: fixed` to `position: absolute`, anchoring to the nearest positioned ancestor. The principle-card frame is a fixed-size box with `position: relative; overflow: hidden`, so `scoped` contains the overlay cleanly there.

Setting `scoped` on the Token Lab demos does not work the same way. The demos render inside `.layer`, which is the scroll container (`position: absolute; overflow-y: auto`). An absolutely positioned overlay anchored to a scroll container is laid out relative to the scroll-origin and scrolls with the content. If the Enter & Exit panel is scrolled at all when the drawer opens, an `inset: 0` backdrop sits at the top of the scrollable content, above the visible area, not over it.

The fix has to anchor the overlay to a box that fills the visible column and does **not** scroll. That box is `.demoArea` (the column frame: `position: relative; overflow: hidden; height: 100%`). The demos cannot reach it by ordinary nesting because they live inside the scrolling `.layer`. The React-idiomatic way to render a descendant into a different DOM ancestor is a portal.

---

## What was built

**An overlay mount inside DemoArea.** `DemoArea` renders a `.overlayRoot` div as the last child of `.demoArea`, after the crossfade layers. It is `position: absolute; inset: 0` (fills the column, clipped to it by `.demoArea`'s `overflow: hidden`), `z-index: 100` (above the crossfade layers, whose z-index counts up from 1, one step per navigation), and `pointer-events: none` so it never intercepts clicks meant for the demos beneath it when nothing is open.

**A context exposing that node.** `DemoArea` provides the overlay node through `DemoOverlayContext`; `useDemoOverlay()` returns it, or `null` outside a DemoArea (the principle-card use). The node is captured by a callback ref into state so consumers re-render once it exists. Overlay demos only open on a user click, well after mount, so the node is always present by then.

**A `portalTarget` prop on Drawer and Modal.** When `portalTarget` is a DOM node, the component `createPortal`s its tree into that node and treats itself as anchored (absolute positioning). When `portalTarget` is null it renders in place exactly as before. The Token Lab `DrawerDemo` and `ModalDemo` read the overlay node and pass it; the principle cards (Anticipation, Staging) and the app-level import-report Modal pass nothing and are unchanged.

**Two pointer-events re-enables.** Because `.overlayRoot` is `pointer-events: none`, the portaled backdrop and panel set `pointer-events: auto` so the backdrop still closes the dialog on click. These declarations live on the scoped classes (`.backdropScoped`, `.drawerScoped`, `.panelScoped`) and are harmless in the in-place principle-card use, where the parent is interactive anyway.

---

## Sizing: why the Modal needed a third variant

The `scoped` styles were tuned for the ~165px principle-card frame.

- **Drawer.** `.drawerScoped` is container-relative (`max-height: 70%`, slightly tighter padding). Those values read correctly in the wider demo column too, so the Drawer reuses `.drawerScoped` for both the card and the demo overlay.
- **Modal backdrop.** `.backdropScoped` only sets `position: absolute; z-index: 1`. Correct for both. Reused.
- **Modal panel.** `.panelScoped` shrinks the panel to `max-width: 92%` and drops the elevation shadow, which suits the card frame but reads as an oversized dialog in a wide column. A new `.panelAnchored` variant keeps the default ~420px sizing and shadow while switching `position: fixed` to `absolute`. The panel className picks `panelAnchored` when `portalTarget` is set, `panelScoped` when only `scoped` is set.

---

## Files touched

- `src/components/DemoArea/index.jsx` — `DemoOverlayContext`, `useDemoOverlay`, the `.overlayRoot` mount node, callback-ref-into-state.
- `src/components/DemoArea/DemoArea.module.css` — `.overlayRoot`.
- `src/components/Drawer/index.jsx` — `portalTarget` prop, `createPortal`, `anchored = scoped || portalTarget != null`.
- `src/components/Drawer/Drawer.module.css` — `pointer-events: auto` on the scoped classes.
- `src/components/Modal/index.jsx` — `portalTarget` prop, `createPortal`, panel className picks `panelAnchored` vs `panelScoped`.
- `src/components/Modal/Modal.module.css` — `.panelAnchored`, `pointer-events: auto` on the scoped classes.
- `src/components/TokenLab/index.jsx` — `DrawerDemo` and `ModalDemo` read `useDemoOverlay()` and pass `scoped portalTarget={overlay}`.

## Left unchanged on purpose

The import-report Modal (`TokenLab/index.jsx`, rendered outside `DemoArea` at the app-shell level) stays viewport-centered. It is triggered from the controls column, not the demo area, so a window-centered dialog is the correct convention for it.
