# Key Decisions

[Cadence: Case Study](index.md) · Chapter 4

---

**CSS custom properties as the token layer, Framer Motion as the execution layer.** The alternative was a JavaScript theme object, simpler to wire and invisible to the platform. Custom properties won because they are what production systems ship: the browser owns the values, CSS transitions can read them directly, and Token Lab's edits go through the same layer an engineer's build would. The cost is a parsing seam (values arrive as strings, in whatever format a build tool wrote), and that seam eventually broke production. See the last entry.

**A two-channel update system instead of one.** A custom-property write is invisible to React, so components would not retime until something else re-rendered them; updating only React state leaves the CSS layer stale. Token Lab dispatches once and updates both: the custom property for anything that reads the document, and a context override that hands demo components the same values with no read at all. The channels cannot diverge because both derive from one reducer state.

**Chrome timing is not demonstration timing.** Explore mode lets a user drag durations to 50ms or 2000ms, which is the point of the tool and a denial-of-service attack on its own interface. The resolution is two classes of motion: demonstrations read the editable `--motion-*` tokens; the tool's own feedback reads fixed `--feedback-*` constants. A test gate fails the build on any undocumented inline animation literal in components, so the boundary is enforced, not remembered. The boundary has exactly one argued crossing: the background field's drift period scales with `duration.slower` under a 2.5-to-12-second clamp, so a preset change reaches the ambient chrome while Explore's extremes never can. The chrome rule was written against unbounded input, not against input, and the clamp is its honest reading rather than a way around it.

<!-- V11: grid evolution strip. Inline SVG, dark theme baked, same style language as V07.
     Content mirrors the paragraph below; if the grid history prose changes, this follows. -->
<svg viewBox="0 0 880 260" role="img" aria-label="The principle grid's five states: flexbox with JS widths, 1fr rows, minmax rows, flat rows, and the shipped fixed columns, each labeled with the failure that ended it" style="max-width: 880px; width: 100%; height: auto; font-family: 'IBM Plex Mono', ui-monospace, monospace;">
  <title>The grid, five states</title>
  <defs>
    <marker id="v11-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0.5 0.5 L7.5 4 L0.5 7.5 Z" fill="#909090" /></marker>
  </defs>
  <text x="40" y="44" font-size="11" font-weight="600" letter-spacing="1.5" fill="#aaaaaa">THE GRID · FIVE STATES</text>
  <text x="110" y="78" font-size="11" fill="#e1e1e1" text-anchor="middle">flexbox + JS widths</text>
  <rect x="50" y="92" width="120" height="110" rx="6" fill="#1a1a1a" stroke="#3d3d3d" />
  <rect x="58" y="104" width="40" height="18" rx="2" fill="#262626" />
  <rect x="102" y="104" width="24" height="18" rx="2" fill="#262626" />
  <rect x="130" y="104" width="32" height="18" rx="2" fill="#262626" />
  <rect x="58" y="128" width="26" height="18" rx="2" fill="#262626" />
  <rect x="88" y="128" width="48" height="18" rx="2" fill="#262626" />
  <rect x="140" y="128" width="22" height="18" rx="2" fill="#262626" />
  <text x="110" y="224" font-size="10" fill="#909090" text-anchor="middle">hundreds of lines of JS</text>
  <text x="110" y="240" font-size="10" fill="#909090" text-anchor="middle">doing CSS Grid's job</text>
  <text x="275" y="78" font-size="11" fill="#e1e1e1" text-anchor="middle">1fr rows</text>
  <rect x="215" y="92" width="120" height="110" rx="6" fill="#1a1a1a" stroke="#3d3d3d" />
  <rect x="223" y="104" width="104" height="84" rx="4" fill="none" stroke="#3d3d3d" />
  <rect x="226" y="110" width="30" height="6" rx="2" fill="#262626" />
  <rect x="260" y="110" width="30" height="6" rx="2" fill="#262626" />
  <rect x="294" y="110" width="30" height="6" rx="2" fill="#262626" />
  <rect x="226" y="120" width="30" height="6" rx="2" fill="#262626" />
  <rect x="260" y="120" width="30" height="6" rx="2" fill="#262626" />
  <rect x="294" y="120" width="30" height="6" rx="2" fill="#262626" />
  <rect x="226" y="130" width="30" height="6" rx="2" fill="#262626" />
  <rect x="260" y="130" width="30" height="6" rx="2" fill="#262626" />
  <rect x="294" y="130" width="30" height="6" rx="2" fill="#262626" />
  <text x="275" y="224" font-size="10" fill="#909090" text-anchor="middle">rows collapse inside</text>
  <text x="275" y="240" font-size="10" fill="#909090" text-anchor="middle">a scroll container</text>
  <text x="440" y="78" font-size="11" fill="#e1e1e1" text-anchor="middle">minmax(234px, auto)</text>
  <rect x="380" y="92" width="120" height="110" rx="6" fill="#1a1a1a" stroke="#3d3d3d" />
  <rect x="388" y="104" width="32" height="26" rx="2" fill="#262626" />
  <rect x="424" y="104" width="32" height="26" rx="2" fill="#262626" />
  <rect x="460" y="104" width="32" height="26" rx="2" fill="#262626" />
  <rect x="388" y="134" width="32" height="26" rx="2" fill="#262626" />
  <rect x="424" y="134" width="32" height="26" rx="2" fill="#262626" />
  <rect x="460" y="134" width="32" height="26" rx="2" fill="#262626" />
  <rect x="424" y="104" width="32" height="44" rx="2" fill="#262626" stroke="#909090" />
  <text x="440" y="224" font-size="10" fill="#909090" text-anchor="middle">overshoot against a</text>
  <text x="440" y="240" font-size="10" fill="#909090" text-anchor="middle">moving target</text>
  <text x="605" y="78" font-size="11" fill="#e1e1e1" text-anchor="middle">flat 234px rows</text>
  <rect x="545" y="92" width="120" height="110" rx="6" fill="#1a1a1a" stroke="#3d3d3d" />
  <rect x="553" y="104" width="32" height="26" rx="2" fill="#262626" />
  <rect x="589" y="104" width="32" height="26" rx="2" fill="#262626" />
  <rect x="625" y="104" width="32" height="26" rx="2" fill="#262626" />
  <rect x="553" y="134" width="32" height="26" rx="2" fill="#262626" />
  <rect x="589" y="134" width="32" height="26" rx="2" fill="#262626" />
  <rect x="625" y="134" width="32" height="26" rx="2" fill="#262626" />
  <circle cx="569" cy="117" r="7" fill="none" stroke="#909090" />
  <circle cx="605" cy="117" r="7" fill="none" stroke="#909090" />
  <circle cx="641" cy="117" r="7" fill="none" stroke="#909090" />
  <circle cx="569" cy="147" r="7" fill="none" stroke="#909090" />
  <ellipse cx="605" cy="147" rx="13" ry="4" fill="none" stroke="#909090" />
  <circle cx="641" cy="147" r="7" fill="none" stroke="#909090" />
  <text x="605" y="224" font-size="10" fill="#909090" text-anchor="middle">icons deform under</text>
  <text x="605" y="240" font-size="10" fill="#909090" text-anchor="middle">flex growth</text>
  <text x="770" y="78" font-size="11" fill="#e1e1e1" text-anchor="middle">fixed 180px columns</text>
  <rect x="710" y="92" width="120" height="110" rx="6" fill="#1a1a1a" stroke="#3d3d3d" />
  <rect x="718" y="104" width="64" height="52" rx="3" fill="#1a1a1a" stroke="#76c17d" />
  <rect x="786" y="104" width="30" height="24" rx="2" fill="#262626" />
  <rect x="786" y="132" width="30" height="24" rx="2" fill="#262626" />
  <rect x="752" y="160" width="30" height="24" rx="2" fill="#262626" />
  <rect x="786" y="160" width="30" height="24" rx="2" fill="#262626" />
  <rect x="818" y="104" width="4" height="80" fill="#2e2e2e" />
  <text x="770" y="224" font-size="10" fill="#76c17d" text-anchor="middle">holds.</text>
  <text x="770" y="240" font-size="10" fill="#909090" text-anchor="middle">scrollbar-gutter: stable</text>
  <path d="M184 147 H194" stroke="#909090" stroke-width="1.5" fill="none" marker-end="url(#v11-arrow)" />
  <path d="M349 147 H359" stroke="#909090" stroke-width="1.5" fill="none" marker-end="url(#v11-arrow)" />
  <path d="M514 147 H524" stroke="#909090" stroke-width="1.5" fill="none" marker-end="url(#v11-arrow)" />
  <path d="M679 147 H689" stroke="#909090" stroke-width="1.5" fill="none" marker-end="url(#v11-arrow)" />
</svg>
**The grid earned its architecture five times.** The principle grid's spec sounds trivial: cards in a grid, one expands to 2x2, neighbors reflow. The implementation went through five states, each fixing the failure the previous one revealed: flexbox with runtime width measurement (hundreds of lines of JS doing what CSS Grid does natively), `1fr` rows (collapse inside a scroll container), `minmax(234px, auto)` rows (animation overshoot against a moving target), flat 234px rows (icon deformation from flex growth), and finally fixed 180px columns with `scrollbar-gutter: stable`, because an expanding card summons a scrollbar, and the scrollbar recounts the auto-fit columns mid-animation. `grid-auto-flow: row` stayed over `dense` on an editorial judgment: the empty cells that appear when an expansion does not align with column boundaries are honest. They are the system making room.

**`layoutId` was removed from the codebase entirely.** It is Framer Motion's marquee feature and the obvious tool for indicator pills and card expansion, and every use was taken out. The diagnosis: motion elements register in a global ProjectionNode tree, and a `layoutId` spring keeps snapshotting layout for the whole of its settle, long after the motion reads as finished. A component mounting mid-snapshot can have its enter animation interrupted and freeze at opacity 0 until reload. The Carousel dot moved to a CSS transition, fully outside the projection system; the Toggle thumb to a direct `x` animation; the card expansion to the plain `layout` prop. The dot's story has a second act. When the physics spring arrived, the dot needed to animate in Framer Motion again to share the snap's spring config, and the diagnosis held up under the pressure: the hazard was always FLIP (the snapshot-and-replay technique `layoutId` rides on), never animation as such, so the dot returned as a direct width animation, which writes a style value each frame and never touches projection.

**Motion Tiles runs on one clock.** The first architecture gave each tile its own driver script inside the Rive asset, written in Luau, Rive's embedded scripting language. At 36 tiles the frame rate sat near 40fps, and the instinct is to blame the tile count. Measurement said otherwise: 36 instances of the densest tile with no drivers held 60fps, so the per-instance script execution was the cost, not the instances. The shipped design inverts control: assets carry geometry and bindings only, and one React rAF loop writes every tile's progress each frame, with the stagger applied in JS before the write. An unplanned property emerged: the stagger smooths load, because staggered tiles never hit their expensive frames simultaneously.

**The spring shipped as a toggle, not a rewrite.** The obvious first consumer for the physics spring was the Button release, and it was off the table: that motion had been set, feel-checked, and recorded across five layers of documentation days earlier, and shipped feel does not change as a side effect of a token pass. So the spring got its own demo, and five components (Button, Card, Toggle, Carousel, Drawer) took an opt-in `motionMode` prop defaulting to the bezier, surfaced as a coil toggle in each demo's label row. Nothing shipped moving differently. The toggle puts the imitation and the physics on the same component one press apart, and the Drawer makes the cleanest case: its entrance was a keyframe overshoot, a spring faked by hand, and in spring mode the keyframes collapse to a single target the spring overshoots on its own.

**An interactive Rive machine cannot take a theme rebind.** Rive theming here follows a convention: four color instances baked in the file, and a theme switch rebinds to the matching one. Rive Clock broke it. The plant's watered state lives in a data-bound property, a rebind re-applies the new instance's baked value for it, and the state machine cannot distinguish that write from a click: switching themes watered the plant. A keyed remount dodged the rebind by resetting the machine, throwing away the pose. Replaying state across the rebind required naming the exact property the machine transitions on, a guess you lose. The fix that holds binds one instance for the component's life and changes themes by writing the target palette into it; a property is written only if its baked value varies across the four instances, which separates palette from state without naming a single state property. The rule that fell out is now on record: baked-instance rebinding is for art that only watches. A machine that listens gets its colors written.

**The deep link is a guest entrance, not a second front door.** In-grid expansion had held a reserved URL since June, and the obvious build was to give the expanded card one: paste a link, the grid opens that card in place. It shipped as the opposite. A direct link mounts the grid untouched and floats the principle in a modal above it, because in-grid expansion earns its meaning from the neighbors sliding and a cell going empty, the system making room, and reconstructing that during a lazy mount reconstructs a performance nobody is there to watch. So the two doors open differently: residents expand a card and the grid rearranges; guests arrive at a modal and the grid behind it waits. The URL carries a slug that reads like language and the state carries a number, with one function translating between them, so a bad link fails soft to the plain grid and a mismatched filter resolves in the principle's favor. Closing rewrites the hash in place, through `replaceState`, so the back button cannot reopen what was just dismissed. The expanded card's body was lifted into one component that serves both doors, its state left where each caller already reset it, so the card that had been tuned for months did not move a pixel.

**Some 1,500 lines of rendering machinery were removed with a single design decision.** The background originally kept two renderers in agreement off one display list, and the machinery that reconciled them, an ink census, a keyed palette, a runtime color transform, plus an in-page tuning panel, existed only to facilitate that agreement. When the shipped renderer began reading each colorway's authored fills directly, there was nothing left to reconcile, and all of it went. The tuning panel earned its deletion twice over: seeded with its own copy of the settled values, it had been hiding the committed default, so the wrong renderer shipped for days while every check looked through the panel's override instead of at the flag. The reasoning stays in the decision docs and the code stays in git.

**The dev server lies; the built output tells the truth.** In production, opening any Modal blanked the entire page. The dev server was clean. The chain: the CSS minifier rewrites `400ms` as `.4s`, a token parser assumed the authored spelling and returned `NaN`, the `NaN` reached the Web Animations API and threw, and with no error boundary the whole tree unmounted. The fix was three layers deep: format-tolerant parsers extracted into a tested module (28 tests), an ErrorBoundary at the app root so one component's failure is no longer total, and a standing rule in the project's instructions that every session's verification exercises built output, not just `npm run dev`. The bug cost an evening. The rule it produced has already paid for it.

Twenty-plus further decisions, each with its reasoning and rejected alternatives, live in [`docs/decisions/`](https://github.com/StudioDavidPreli/cadence/tree/main/docs/decisions). The eleven-day debugging stretch that produced zero commits and the process discipline that ended it is its own record: [`cadence-animation-chronology.md`](../cadence-animation-chronology.md).

---

**Companion:** [Working with Claude](../working-with-claude.md), the process these decisions came out of.

[← Fields and Canvases](fields-and-canvases.md) · [What I Built, What I Learned →](built-and-learned.md)
