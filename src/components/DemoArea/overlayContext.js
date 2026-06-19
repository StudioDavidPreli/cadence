import { createContext, useContext } from 'react'

// ─── Demo overlay boundary context ──────────────────────────────────────────────
// Scoped overlay demos (the Drawer and Modal in Token Lab's Enter & Exit tab)
// must fill the visible demo column, not the whole viewport. They cannot just be
// scoped=true in place: they render inside .layer, which is the scroll container,
// so a position:absolute overlay would anchor to the scrolling content and slide
// away with it. Instead they portal into the mount node DemoArea provides here —
// a non-scrolling box that fills .demoArea — so the overlay stays put, clips to
// the column, and sits above the crossfade layers. useDemoOverlay returns null
// outside a DemoArea (e.g. the same Drawer/Modal used inside a principle card,
// which anchor to the card frame).
//
// This context lives in its own module, not in DemoArea/index.jsx, so that file
// exports only the DemoArea component. React Fast Refresh cannot hot-update a
// module that exports both a component and a non-component (a hook), so keeping
// them apart preserves clean HMR.
export const DemoOverlayContext = createContext(null)

export function useDemoOverlay() {
  return useContext(DemoOverlayContext)
}
