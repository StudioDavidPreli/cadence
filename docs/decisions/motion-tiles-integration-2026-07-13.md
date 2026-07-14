# Motion Tiles integration: third tool, persistent tool bar, landing-gated lazy load

**Date:** 2026-07-13
**Status:** Built and shipped 2026-07-13. See "As built" at the end for what actually shipped and where it diverged from this plan.
**Context:** Motion Tiles has lived behind a `?v8grid` query gate since 2026-07-12 (`src/components/IngredientGrid/IngredientV8Grid.jsx`). `App.jsx` branches on the query param and renders either the Motion Tiles grid plus its `MotionTilesTitle`, or the `TokenLab` shell plus the `Wordmark`. The grid is complete and verified (Step 0 below); the gate is a scaffold. This document specs folding it in as a first-class third tool alongside Token Lab and Principles Library, and retiring the gate.

This extends `docs/decisions/navigation-architecture-2026-06-17.md`. Read that first. The three-column shell, the accordion nav, and the tool-bar-stays-mounted constraint it establishes are the spine of every decision here.

---

## What the current architecture actually is

The component named `TokenLab` is not only the Token Lab tool. It is the app shell. It owns the three columns (left tool bar, middle `NavColumn`, right `DemoArea`) and the provider tree (`ActiveTokenProvider`, `TitlePulseProvider`, `MotionTokensProvider`), and it holds the token reducer. Principles Library is not a peer of Token Lab in the render tree: it is a destination rendered inside `DemoArea` (`principlesContent={<PrinciplesLibrary />}`). The token reducer never unmounts, which is the single reason token values survive while the user is in Principles.

Navigation state already lives at `App` level (`NavigationContext`). What lives inside `TokenLab` is the visual shell (top bar structure, `NavColumn`, the outer grid) and the token reducer.

## Decisions

1. **Motion Tiles is a third top-level tool selected from the nav, not a `DemoArea` destination.** The 2026-07-07 rive-scaling note planned it as a lazy destination inside the `DemoArea` crossfade. That plan predates what the tool became. Motion Tiles is a full-width two-column layout (stage plus its own right-side controls), carries its own control vocabulary that shares nothing with Token Lab's sliders, runs on the second Rive runtime, and replaces the top-bar wordmark with its own title.

2. **The tool bar and nav become persistent shell chrome; only the right region swaps.** `TokenLab` becomes the shell. The left tool bar and the `NavColumn` render for every section. The right region renders `DemoArea` for `null`, `token-lab`, and `principles`, and `MotionTilesSection` for `motion-tiles`. This is a smaller change than splitting the shell from a tool body, and it leaves the delicate `DemoArea` crossfade tree undisturbed.

3. **When Motion Tiles is active, the tool bar collapses to the "Tokens" rail, exactly as it does at the ≤720px breakpoint.** The rail stays openable, identical to the breakpoint behavior. The tool bar collapses; it does not unmount. Because the reducer it edits stays mounted, token state survives a Motion Tiles visit with no extra machinery.

4. **A landing page gates the Motion Tiles runtime.** Entering the Motion Tiles section loads a cheap, runtime-free landing. The webgl2 runtime and the tile files load only on an explicit Enter, not on the nav click.

## Target architecture

```
App
├─ NavigationProvider           (exists; gains a MOTION_TILES section + route)
└─ AppShell                     (was TokenLab; owns the token reducer; never unmounts)
   ├─ header:  <Wordmark> | <MotionTilesTitle>   +  <ThemeSwitcher>    (title by section)
   ├─ controls   full .controls aside  →  44px "Tokens" RailDrawer   when (controlsCollapsed OR motion-tiles)
   ├─ NavColumn  (unchanged; its own ≤1024px rail behavior is independent of section)
   └─ right region (by section):
        • null | token-lab | principles →  MotionTokensProvider > DemoArea   (unchanged)
        • motion-tiles                  →  MotionTilesSection (landing + lazy grid)
```

Providers keep their current scope. `ActiveTokenProvider` and `TitlePulseProvider` span the tool bar and the right region (the active-token highlight and the P06 title-flash channel connect the two), so they wrap the whole grid content as they do today. `MotionTokensProvider` wraps only `DemoArea`. None reach `MotionTilesSection`, which reads no `--motion-*` tokens and runs its own preset system. Do not extend them to Motion Tiles.

### The tool-bar constraint, and how the collapse respects it

The navigation doc's spine: the tool bar must stay mounted across Token Lab and Principles, because many Principles demos read live token values from it through `MotionTokensProvider`. Unmounting it on the Principles view would break those demonstrations.

The collapse honors this and extends it. The tool bar is now mounted across all three sections. For Token Lab and Principles it renders in whatever form the viewport dictates (full aside above 720px, Tokens rail below). For Motion Tiles it renders as the Tokens rail regardless of viewport, driven by the section rather than the width. In every case the reducer is mounted, so:

- Token Lab and Principles behave exactly as they do today.
- A round trip Token Lab → Motion Tiles → Token Lab preserves slider positions, the loaded preset, and Explore mode by construction, because nothing that holds that state unmounts. The earlier concern about the CSS custom properties and `rawState` desyncing is moot: neither side is ever torn down.

### The collapse trigger and the grid modifier

`TokenLab` derives `controlsCollapsed = useMediaQuery('(max-width: 720px)')` and switches the tool bar between the full `.controls` aside and the `RailDrawer`. Generalize the trigger to `controlsCollapsed || section === 'motion-tiles'`, and drive the grid's first column width by a state class rather than only the media query, so the 44px track can be set by section at any viewport width. Above 1024px in Motion Tiles the grid reads `44px 220px minmax(420px, 1fr)` (Tokens rail, full nav, stage-plus-controls region), a state the current media queries do not express and the modifier adds.

The `RailDrawer` is reused unchanged. `openDrawer` state and its breakpoint-clear effect already exist in `TokenLab`; extend the clear so leaving Motion Tiles also closes an open Tokens drawer.

## The landing page and the lazy boundary

`React.lazy` splits code, but the cost that matters is the mount: the moment the grid mounts it fires `useRiveFile` for `ingredients_v8.riv` and `motiontilesstatics_v3.riv` plus the group-two files, spins up the shared offscreen webgl2 context, and starts the rAF clock. A bare nav click would pay all of that at once. The landing puts an explicit Enter gesture between the nav click and the heavy mount, so the runtime and the `.riv` fetches load only when the user commits to the grid. It also gives Motion Tiles the intro surface the other two tools already have (Token Lab's guide, the Principles intro), and a place to frame what the tool demonstrates before the interactive proof.

The split that makes the deferral real:

- **`MotionTilesLanding`** is eager and in the main bundle. It imports nothing from `@rive-app/react-webgl2`. Intro copy plus an Enter control. If it imported anything Rive, loading the landing would drag the runtime in and defeat the point.
- **`MotionTilesGrid`** (today's `IngredientV8Grid`) is the `React.lazy` chunk. It alone imports `@rive-app/react-webgl2`, so the runtime lands in this chunk and nowhere else.
- **Enter** navigates to `#/motion-tiles/grid`, which triggers the dynamic `import()`. A `Suspense` fallback covers the chunk fetch; then the grid mounts and the runtime spins up. Optional refinement: kick the `import()` on Enter hover so the click resolves instantly (the rive-scaling note's prefetch-on-hover idea).

Net effect: Token Lab and Principles never load webgl2. Entering the Motion Tiles section loads only the landing. The runtime and the tiles load on the explicit Enter.

### Two build gotchas the split forces

1. **`MotionTilesTitle` must be extracted into its own light module.** It is a per-theme `<img>` swap with no Rive, but it is currently exported from the grid file. The shell needs it eagerly for the top bar. If the shell imports it from the lazy grid file, the whole webgl2 chunk is pulled into first paint. Move it to `MotionTiles/MotionTilesTitle.jsx`, imported eagerly and separately from the lazy grid.
2. **The landing lives outside the lazy chunk.** Only the grid is lazy. The landing is part of the eager `MotionTilesSection` so the section can render the intro immediately while the grid chunk is still fetching.

## Navigation and routing

- Add `SECTIONS.MOTION_TILES = 'motion-tiles'` and a landing/grid destination pair to `src/data/navigation.js`, mirroring Token Lab's guide-versus-category split.
- Route grammar, extending `useHashRoute.js`:
  - `#/motion-tiles` renders the landing (destination = landing).
  - `#/motion-tiles/grid` renders the live grid (destination = grid).
  - A direct link to `/grid` opts straight into the runtime cost, which is a legitimate choice.
- `parseHash` gets a `motion-tiles` branch with an optional `grid` tail, the same shape as the `token-lab` branch's optional category tail. `stateToHash` serializes the pair back.
- The nav accordion gains a third section, Motion Tiles, with two leaves: Overview (the landing) and Grid (the live grid). Clicking the header opens the section on the landing, the way clicking Token Lab shows the guide; the leaves switch the view. (Shipped as an accordion, not the single leaf this line originally planned. See "As built.")
- The top-bar title swap (`Wordmark` versus `MotionTilesTitle`) moves from `App.jsx`'s query branch into the shell header, keyed on `section === 'motion-tiles'`. The header must read nav state, so it renders inside `NavigationProvider`.

## Migration sequence

Each step ships and verifies on its own, so a regression is easy to bisect.

**Step 0. Baseline check. DONE (David, 2026-07-13).** `?v8grid` renders perfectly: all functions wired, responsive, smooth, statics included. We integrate a known-good state.

**Step 1. Collapse the tool bar by section.** In `TokenLab`, generalize the collapse trigger to `controlsCollapsed || section === 'motion-tiles'`, add the grid state modifier for the 44px first track, and extend the `openDrawer` clear to close the Tokens drawer when leaving Motion Tiles. No new tool yet; verify the tool bar collapses to the Tokens rail on entering Motion Tiles and restores on leaving, and that the drawer opens. This proves the collapse mechanism before the section it serves exists.

Note: the earlier plan lifted the token reducer into a `TokenStateProvider` to survive a shell unmount. With the tool bar persistent that unmount never happens, so the lift is no longer required for correctness. Keep the reducer where it is unless a later step wants the ownership separation for its own sake.

**Step 2. Add the Motion Tiles section shell.** New `src/components/MotionTiles/` folder. Rename `IngredientV8Grid` to `MotionTilesGrid` and make it the `React.lazy` chunk. Add `MotionTilesLanding` (eager) and `MotionTilesSection` (landing plus Suspense-wrapped grid). Extract `MotionTilesTitle` into its own module. Add `SECTIONS.MOTION_TILES`, the `#/motion-tiles` and `#/motion-tiles/grid` routes, and the third nav header. Render `MotionTilesSection` as the right region when the section is active. Wire the title swap in the shell header. Verify the runtime does not load until Enter.

**Step 3. Retire the gate and update docs.** Delete the `?v8grid` branch in `App.jsx`. Update CLAUDE.md's two-tools framing, the docs index, and the tracker. Any new UI copy passes the voice rules in `docs/voice/voice-analysis.md`.

## Open decision: nav column placement

The nav is currently the middle column: tool bar, then `NavColumn`, then right region. With the tool bar collapsing to a 44px rail in Motion Tiles, the middle position still works (rail, nav, stage-plus-controls). Whether to also move the nav to the far left for a cleaner shell reading is a separate design call, David's to make, and it does not block Steps 1 and 2.

## Risks

- `DemoArea`'s crossfade is the documented-delicate tree. This plan swaps the right region between `DemoArea` and `MotionTilesSection` but never restructures `DemoArea` itself. Keep it whole.
- Both Rive runtimes end up loaded once the user has visited all three tools. Expected and acceptable per the rive-scaling note. Lazy loading protects first paint, which is the goal, not total loaded weight.
- Token state preservation is now automatic (the tool bar never unmounts), so the CSS-versus-`rawState` desync the earlier draft guarded against cannot occur. No mitigation needed.

## Future work

- **Prefetch the grid chunk on nav hover or landing mount**, so Enter resolves without a visible Suspense fallback.
- **Unify the preset vocabularies.** Motion Tiles carries its own Snappy, Standard, Cinematic presets with their own speed, easing, and spread. Token Lab has its own presets. Bridging them is a case-study thread (one motion vocabulary driving both a component set and a tile field at scale), but it is out of scope for integration.
- **Retrofit Principles to lazy** only after the pattern is proven on Motion Tiles, per the rive-scaling note. Principles is the higher-value split and the riskier one, since it touches the crossfade tree.

## Docs to update at Step 3

- `CLAUDE.md`: the two-interactive-tools framing becomes three; the References index gains this doc and the Motion Tiles component note.
- `tracker/TRACKER.md`: close the integration thread on the Token Lab Ingredient System section, add the Motion Tiles tool status.
- `docs/decisions/navigation-architecture-2026-06-17.md`: cross-reference this doc as the third-tool extension.
- Any Motion Tiles landing copy: written against `docs/voice/voice-analysis.md`.

---

## As built (2026-07-13)

The plan above shipped in full. It grew four refinements during the build, all at David's direction, that the plan did not anticipate. This section is the authoritative record of the shipped shape.

**File set (`src/components/MotionTiles/`).**

- `MotionTilesGrid.jsx` / `.module.css` — the grid (formerly `IngredientV8Grid`), the `React.lazy` chunk, the only importer of `@rive-app/react-webgl2` besides the hero and the Token Lab title. Its self border and radius were dropped so it sits flush in the shell's framed demo-area track.
- `MotionTilesSection.jsx` / `.module.css` — the tool region rendered when the section is active. Reads the destination and renders the landing, or the `Suspense`-wrapped lazy grid for the grid destination.
- `MotionTilesLanding.jsx` / `.module.css` — the eager, gate landing. Holds the overview title, four body paragraphs, and the Enter button.
- `MotionTilesLogo.jsx` / `.module.css` — the landing's overview title, `motiontileslogooverview.riv` on WebGL2, bound to one of four theme instances (`lightMode` / `darkMode` / `contrastLight` / `contrastDark`) on `PathEffectVM`. Mirrors `TokenLabTitle` exactly (fixed box, `Fit.Contain`, `autoplay: !reduce`, fire-and-forget instance bind, plain-text fallback). The earlier bespoke version rendered blank; the fix was matching `TokenLabTitle` rather than gating play on the instance.
- `EnterGridButton.jsx` / `.module.css` — the Enter call to action, `enterthegrid.riv` on WebGL2, a looping themed animation bound on `EnterButtonVM` (same four theme instances). Wrapped in a real `<button>`: `pointer-events: none` canvas so clicks reach the button, `aria-label` plus a plain-text fallback, `autoplay: !reduce`, a focus-visible ring. The button is a bare hit target with no surface of its own, so the Rive carries the themed look.
- `MotionTilesTitle.jsx` / `.module.css` — the per-theme top-bar title SVG set, extracted from the grid file so the shell imports it without pulling the webgl2 chunk.

**Refinement 1: the top-left title returns home.** Rather than a section branch in a `TopBar`, the section art swap moved into `Wordmark` itself, which already swaps its mark by section (pixel, Principles script) and is already a `returnHome` button. It now renders `MotionTilesTitle` in the motion-tiles section, so the top-left title is a home button in every section with one accessible name. `App.jsx` renders a plain `<Wordmark />` again; the top bar has no section logic.

**Refinement 2: the nav section is an accordion, not a leaf.** Motion Tiles has two leaves, Overview (landing) and Grid (live grid, skipping the Enter gate). Overview is also the in-app path back from the grid to the landing, which the leaf plan lacked. The `ENTER_MOTION_TILES_GRID` action became `SET_MOTION_TILES_VIEW(view)` with `showMotionTilesLanding` and `enterMotionTilesGrid` creators. The `leaf` `SectionHeader` variant and its `.caretHidden` style, added in Step 1 for the single-header plan, were reverted.

**Refinement 3: the landing title and Enter button are themed Rive, not text/CSS.** Both use the clean four-instance theme pattern (one authored instance per display mode, no shared Contrast instance, no runtime color flip), the `TokenLabTitle` model rather than the hero's. Both keep a plain-text fallback and respect reduced motion. Consequence for the lazy boundary: the landing now mounts two WebGL2 Rive instances (title, button). The runtime was already on first paint via the hero, so this adds no runtime cost, only two instances and two `.riv` fetches, still far below the grid's 40-plus mount. The gate still defers the expensive tile mount.

**Refinement 4: two grid-panel tweaks.** The motion-tiles logo button moved from the bottom of the grid's right controls to the top, as the panel's header (still the clawd easter-egg trigger). The Stagger options became a fixed four-column grid so they always lay out as two rows, independent of which is selected, replacing a flex-wrap that reflowed at the panel-width budget.

**Runtime honesty note.** The WebGL2 runtime is in the main chunk, not the lazy grid chunk, because the landing hero imports it and paints first. No lazy boundary on the grid can remove the runtime from first paint short of redesigning the hero (deferred in the rive-scaling note). What the landing gate defers is the grid code chunk plus the expensive mount: the 40-plus `.riv` fetches, the shared offscreen GL context, the 40-plus instances, and the rAF clock. That deferral is the real win; the runtime binary is shared and already warm.

**Not done, still open.** The `Future work` items above stand: prefetch the grid chunk on hover, unify the two preset vocabularies, retrofit Principles to lazy. One small UX option noted in build: the Enter button has no hover cue beyond the cursor and the loop, on the assumption the Rive may carry hover; a CSS hover can be added if wanted.
