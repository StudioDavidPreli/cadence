# Cadence: Case Study

**Status: Draft, 2026-07-16.** Assembled from the project record in the Week 10 session. David's rewrite pass pending on What I Learned; every fact checked against the repo and the live site. **Updated 2026-07-20:** the physics-spring family and the Embeds canvas demos absorbed (sources: `decisions/physics-spring-2026-07-20.md`, `references/rive-for-react.md`); counts refreshed against the 2026-07-20 tree.

---

## Overview

Cadence is a motion design system explorer. It demonstrates how design tokens drive animation behavior across real UI components, using the classic 12 principles of animation, extended with 6 of my own, as a curriculum for designers learning how motion works at the system level.

**Role:** Solo. Design, architecture, development, documentation.
**Timeline:** Thirteen weeks to production. First commit April 18, 2026; live July 15, 2026, and still shipping. 230 commits as of July 20.
**Stack:** React, Framer Motion, CSS Custom Properties, Rive, Vite.
**Live:** [cadence.davidpreli.com](https://cadence.davidpreli.com)

---

## The Problem

Motion in design systems is underdocumented. A design system will specify every color to the hex digit and every spacing step to the pixel, then describe its motion in a paragraph: two duration values, an easing curve named "standard," and a sentence asking for restraint.

I spent eight years on the other side of that paragraph. A motion designer tunes timing in After Effects until it reads right, exports a spec, and hands it across a wall. What comes back rarely moves the way the spec did, and there is no shared surface where both sides can watch a value become a behavior. The relationship between a token and its perceptual result is invisible unless someone builds the thing that makes it visible.

Cadence is that thing. Drag `duration.fast` from 100ms to 350ms and watch a button's press change character in the same second. The argument underneath: the freedom motion designers have in After Effects is not lost when motion enters a design system. It is organized, named, and made legible, and the organizing is a skill motion designers already have.

---

## Goals

1. Build a tool that makes the token-to-behavior relationship visible and interactive
2. Apply the classic 12 principles of animation, plus 6 design-engineering extensions, to real UI components, not abstract shapes
3. Develop React and design systems fluency through a project with genuine utility
4. Produce a portfolio artifact that demonstrates design engineering thinking

---

## Approach

### Token Architecture

Tokens are CSS custom properties in one file, `src/tokens/motion.css`. Five families: duration (fast 100ms, base 200ms, slow 400ms, slower 600ms), easing (five named cubic-bezier curves), delay (a named zero plus short, medium, long), scale (three press compressions below 1 and a lift above it), and spring (stiffness, damping, and mass, unitless, because a real spring is not measured in time). Components never hardcode an animation value; they read tokens at runtime through `getComputedStyle`. This is the pattern Material and Primer use, which makes the tool's demonstration authentic rather than simulated: Token Lab edits the same layer a production system would ship.

The set splits into editable tokens and fixed references, and the split is doing real work. The durations, the four easing slots, the delays, the scales, and the spring parameters all have controls; the fourth easing slot, `ease.overshoot`, surfaces its control only in Explore mode, where the curve graph has the vertical room its above-one handle needs. Two tokens deliberately have no control at all: `ease.linear` is the constant-velocity baseline every curve is measured against, and `delay.none` is the system's named zero. A slider that could bend `ease.linear` would unname it. The live code view tags these reads `(fixed)`, and a guard test asserts the two classes partition the full token set with nothing shared and nothing left over.

Token sets export in three formats: W3C DTCG (`$type`/`$value`, the shape Style Dictionary and Figma Variables consume), flat JSON mirroring the CSS variable names, and a drop-in CSS `:root` block. All three serialize from one normalized object so they cannot drift. The spring family posed the one format question, because the DTCG draft has no spring type: it serializes as three `number` leaves under a `motion.spring` group, valid DTCG today with no invented type, and the group name carries the composition a custom type would have added. Import runs the pipeline in reverse with validation: scalars clamp to the Explore bounds and report, missing tokens fill from Standard and report, round-tripped curves re-canonicalize to their named keys, and the report modal lists every correction. One class of value refuses the clamp: a spring stiffness, damping, or mass at zero or below is a spring that never settles, so it fails the import as a structural error instead of being bent into something that looks valid and is not. A tuned token set leaves the tool as the artifact an engineer's pipeline consumes.

### The Hybrid Model: CSS Custom Properties + Framer Motion

CSS owns the values; Framer Motion executes the motion. The interesting part is keeping both honest while a slider is being dragged.

Token Lab runs a two-channel update. Every change writes the CSS custom property, so anything reading the document root sees the new value. Simultaneously, a React context provider hands the same values directly to components inside the demo area, bypassing the CSS read entirely, so a drag retimes the demos on the same frame instead of waiting for a re-read. Components outside the provider fall back to the CSS channel. One dispatch, both channels, no divergence: the context object is derived from the same state that wrote the CSS.

The system also draws a line the demonstration depends on. Demonstration motion, the thing a principle teaches, reads the editable `--motion-*` tokens, because the point is that editing a token changes it. The tool's own chrome (hover states, the nav crossfade, accordions) reads fixed `--feedback-*` constants instead, so dragging a duration to near zero in Explore mode can never collapse the interface's own feedback into nothing. A build-gating test enforces the whole arrangement: any inline animation literal in a component fails the suite. The claim "no hardcoded animation values" is not a convention here. It is a test that fails.

### The Spring That Is Not a Curve

For the first three months the token set carried an easing curve named `spring`: `(0.34, 1.56, 0.64, 1)`, a cubic-bezier whose control point climbs past 1 and comes back down. It gives the look of a spring on a fixed timeline. It is not one. A spring has no duration; you give it stiffness, damping, and mass, and the settle time falls out of those three. The July harmonization pass renamed the bezier to `overshoot`, because a tool that teaches designers to name motion should not label a bezier with a word that lies.

The rename left a debt, and the physics-spring family paid it. Three unitless custom properties join the token layer, read at runtime like every other token, and Framer Motion consumes them as `{ type: 'spring', stiffness, damping, mass }` instead of a duration plus a curve. Each preset bakes its own spring personality: Snappy is stiff and bounces hard, Cinematic arrives heavy and slow, Standard settles with a hint of ring. Material 3 Expressive moved its expressive motion to physics springs in 2025; Cadence follows without breaking its own read-at-runtime rule, because unitless numbers live fine in CSS custom properties.

The tool surface makes the difference visible. The Spring section carries three sliders and a settle-curve visualizer: a plot of displacement over time, rising, overshooting the target, settling, redrawn as the sliders move. The math underneath is the damped harmonic oscillator, the same second-order system Framer Motion integrates, kept in a pure module so the three regimes (underdamped rings, critical arrives clean, overdamped crawls) test without React. Switch a Button to Spring, drag stiffness, and the button, the chart, and the dedicated SpringDemo move together off one context.

One gap surfaced on the way and closed. Reduced-motion support here works by flattening durations to near zero, and a spring has no duration to flatten, so the preference slid right past it. The flattened token set now carries a flag the spring consumers read, falling back to the bezier branch whose timing is already collapsed. The principle demo that forced the fix is Follow Through, the first reduced-motion-respecting surface to run the real spring.

### The Principles as UI Curriculum

Every principle is demonstrated twice: a Rive illustration on the animation side, and a real UI component on the other, driven by the live token system. The pairing is the pedagogy. A motion designer already knows what anticipation looks like; what Cadence shows is where anticipation lives in an interface (a drawer that lifts before it leaves) and which tokens produce it (`ease.exit` at `duration.slow`, with keyframes carrying the countermotion).

Real components were chosen over abstract shapes because abstraction is the problem being solved. A bouncing ball demonstrates easing; it does not demonstrate why a dropdown's chevron should share its menu's timing. The demos use the same Button, Drawer, Modal, and Carousel the Token Lab exercises, so a principle learned in one tool is recognizable in the other, and every demo responds when a token changes.

The six extensions are the original contribution. The classic 12 teach how motion reads; the extensions teach how motion scales: Systematization, Hierarchy of Motion, Economy, Token Fidelity, Reduced Motion, and Shared Vocabulary. They are the principles I needed when I moved from animating one thing well to making motion consistent across a system, and they are in no textbook.

### Motion Tiles: One Vocabulary at Scale

The third tool answers the question the first two raise: what happens when a motion vocabulary has to cover a field instead of a button? Motion Tiles is a pooled mosaic of over fifty Rive tiles sharing one clock. Change a preset and every tile recolors and retimes together. Drag the stagger and the change crosses the grid in a wave.

The presets are the same three personalities Token Lab carries, Snappy, Standard, Cinematic, spoken in a different dialect. A button press wants a duration and a bezier. An ambient field wants a period, an envelope, a spread. The two control suites stay separate on purpose: the user works one tool bar at a time, and the values were tuned to their contexts (a field that slows the way Cinematic slows a button would put the room to sleep). What the system shares across motion classes is the names; what it scopes per class is the interpretation. A vocabulary is only usable if you also decide where it ends.

The architecture is the argument made physical. The tiles carry no clocks of their own: one React `requestAnimationFrame` loop computes each tile's phase-offset progress from a weight table and writes it into that tile's Rive view model every frame. Speed, easing, and stagger are consumed in React, not in the assets, which is exactly the token-to-behavior relationship from Token Lab operating on fifty canvases at once. The section is landing-gated so its WebGL2 grid loads only when entered, and the per-tile Rive bindings were built with Claude Code driving the Rive editor over MCP, a workflow the landing page walks through.

### Embeds: Tokens Across the Canvas Boundary

Token Lab's component demos read tokens into Framer Motion props, which is the easy case: everything speaks CSS. The Embeds category runs the same tokens into canvases that have never heard of it, and the two demos split the ownership of time between them.

React Clock is a Rive plant watered by a DOM button. The file holds poses; React holds time. Every animation in the `.riv` is a linear timeline scrubbed by a view-model number from 0 to 1, and a `requestAnimationFrame` driver integrates the live tokens into eased progress each frame: rain rides `duration.fast`, growth `duration.slower` on `ease.enter`, flowers arrive on `slow` and `standard` after `delay.long`. No duration, speed, or easing property exists inside the file at all, so a slider drag mid-growth bends the plant's pace on the very next frame. The Rive authoring and the React driver were built on opposite sides of a wall neither tool can see over, against a committed contract document naming every property, its type, and who writes it; when the two sides disagreed about what a number meant, the contract, not the code, was where the argument settled.

Rive Clock inverts the ownership. The plant is an interactive state machine that keeps its own clock (click it and it waters), rendered invisible; a WebGL shader stacked on top paints the pixelated copy the user actually sees, split into three color plates that chase the cursor. The tokens drive the chase: `duration.base` is the follow time constant, `duration.slow` the homecoming when the pointer leaves, `ease.standard` its curve, `delay.short` the per-plate stagger, `scale.expressive` the aberration amplitude. Block size and gap stay spatial controls with no token behind them, because Token Fidelity keeps time-domain tokens on time-domain jobs. One demo where React owns the clock, one where the file does, and the same token set reaches into both.

---

## Principles Library: Build Notes

### The Classic 12

### 01. Squash and Stretch
**UI Component:** Button (the same one from Token Lab's Press & State demo)
**Token values driving it:** `scale.base`, `duration.fast`, `ease.standard`, `ease.overshoot`
**Key decision:** One scale value carries both halves of the principle; the split lives in the easing, `ease.standard` down and `ease.overshoot` back. And reuse the component the user has already met rather than build a demo prop, so the principle attaches to something they have pressed before.
**What it demonstrates:** Weight. The press compresses, the release overshoots past rest before settling, and the travel is a few percent of scale doing the whole job.

### 02. Anticipation
**UI Component:** Drawer (scoped, from Enter & Exit)
**Token values driving it:** `duration.slow`, `ease.enter`, `ease.exit`
**Key decision:** Enter and exit share one duration; the character splits in the easing and the keyframe spacing, and the countermotion lives on the exit, a lift in the first fifth of the clock before the drop.
**What it demonstrates:** An action that is caused rather than one that merely happens. The drawer states its intent before it leaves.

### 03. Staging
**UI Component:** Modal with backdrop
**Token values driving it:** `duration.slow`, `ease.enter`
**Key decision:** The backdrop is the demonstration, not the panel. Staging is the darkening as much as the lighting.
**What it demonstrates:** Clearing the stage. The dim removes everywhere else the eye could land.

### 04. Straight Ahead and Pose to Pose
**UI Component:** Compact Stepper above a ProgressBar, one shared `step` counter
**Token values driving it:** `duration.base`, `ease.standard`, `delay.short/medium/long`, `duration.slow`
**Key decision:** Drive both components from a single counter so "two approaches to the same motion" is literal: one advance, one discrete visualization, one continuous.
**What it demonstrates:** The designer controls the poses; the system controls the in-betweens. UI animation is pose to pose almost by definition.

### 05. Follow Through and Overlapping Action
**UI Component:** Carousel (compact, text-only) with its dot indicator
**Token values driving it:** `spring.stiffness`, `spring.damping`, `spring.mass`: the snap runs the real physics spring, with the flattened bezier branch as the reduced-motion fallback
**Key decision:** The dot's width animates on the same transition object as the slide, so the follow-through is a property of the system, not a choreographed lag. The dot spent months on a CSS transition to stay clear of the projection system; it returned to Framer Motion as direct value animation, which never touches projection, once the original hazard was named precisely enough to know what was safe. (See Key Decisions.)
**What it demonstrates:** Settling as physics. The slide overshoots and rings down, the dot rides the same spring, and nothing here has a duration.

### 06. Slow In and Slow Out
**UI Component:** ProgressBar with a Tokens / Linear toggle
**Token values driving it:** `ease.standard` vs `ease.linear`, `duration.slow`
**Key decision:** Same duration on both settings, so the only variable is the curve. When the toggle returns to Tokens, the controls panel's title flashes once, drawing the thread to where the value lives.
**What it demonstrates:** Identical timing, different curve, categorically different character. Linear motion belongs to machines.

### 07. Arc
**UI Component:** Tooltip
**Token values driving it:** `duration.base`, `ease.enter`
**Key decision:** Three keyframes, not two. Two keyframes ease the speed but leave the path a straight line; the third bends the trajectory, and the bend is the principle.
**What it demonstrates:** A tooltip that rises straight up reads as a notification. One that arcs in reads as an answer arriving from somewhere.

### 08. Secondary Action
**UI Component:** Dropdown with rotating chevron
**Token values driving it:** `duration.fast`, `ease.standard`, shared by menu and chevron
**Key decision:** One timing for both motions so they read as a single gesture. The chevron carries no information the menu does not; confirmation is its entire job.
**What it demonstrates:** Subordination. The moment a secondary action pulls the eye from the thing it supports, it has become noise.

### 09. Timing
**UI Component:** Two Toggles, each scoped to a different preset via `MotionTokensProvider`
**Token values driving it:** `duration.fast/base/slow` compared across presets
**Key decision:** The real presets differ by only 100ms on the token the Toggle animates, too small to read in one flip, so the demo slows the Cinematic slot by a fixed, demo-scoped factor. The amplification is honest and documented; the preset keeps its true values everywhere else.
**What it demonstrates:** Duration alone changes personality. No easing difference, no path difference, and one Toggle feels decisive while the other feels considered.

### 10. Exaggeration
**UI Component:** NotificationBadge with New / Clear triggers
**Token values driving it:** `scale.expressive`, `ease.overshoot`, `duration.slow`
**Key decision:** Re-key the badge on every increment so the enter animation fires each time; the compress comes from the initial scale and the overshoot from the bezier, two motion sources composing one alert.
**What it demonstrates:** A badge that scales to exactly 1.0 registers as a state change. One that overshoots registers as an alert. The overshoot is the meaning.

### 11. Solid Drawing
**UI Component:** Card, centered with room around it
**Token values driving it:** `scale.lift`, `duration.base`, `ease.standard`
**Key decision:** Sixteen pixels of margin on every side so the 2% lift reads against empty space instead of against neighbors.
**What it demonstrates:** The implied z-axis. The selected card is not highlighted; it has come forward, and the surface it was embedded in is now behind it.

### 12. Appeal
**UI Component:** A 2x2 grid of compact Cards with ASCII faces
**Token values driving it:** All of them: `duration.slower` drives an ambient drift, `duration.base` the settle, `ease.standard` the neutral states, `ease.overshoot` the selection
**Key decision:** Per-card phase offsets on the idle drift so the four never sync. Selection freezes the drift, dims the siblings, lifts the chosen card.
**What it demonstrates:** Appeal is the other principles working in concert. Nothing here is remarkable alone; nothing is wrong, and that is the effect.

### The Extended Six

### 13. Systematization
**UI Component:** A Tempo slider over a Toggle, compact Card, and ProgressBar
**Token values driving it:** The whole duration family, scaled proportionally by the slider
**Key decision:** Scale durations only. Delays stay proportional and easing stays untouched, because the principle is temporal coherence, not curve shape.
**What it demonstrates:** One slider moves and every component responds at its own native speed. The system has one voice.

### 14. Hierarchy of Motion
**UI Component:** A PARENT pill above three indented CHILD rows, drawn as a tree
**Token values driving it:** `duration.base`, `ease.standard`, `delay.short/medium/long`
**Key decision:** The children are not interactive. Only the parent can initiate motion, so the demo's interaction model enforces the principle it teaches.
**What it demonstrates:** Authority flows downward, and the cascading delays are the hierarchy made visible.

### 15. Economy
**UI Component:** Three horizontal bars with a Pan trigger
**Token values driving it:** `duration.slow/base/fast`, `ease.standard`, one per bar
**Key decision:** Depth from three opacity levels and three speeds, no shadows, no stacking order. Three layers of parallax suggest a world; thirty just suggest thirty.
**What it demonstrates:** The smallest set of moves that produces the intended depth. Every motion element earns its place.

### 16. Token Fidelity
**UI Component:** Three identical pills, one deviant
**Token values driving it:** `duration.base` and `ease.standard` on two pills; a hardcoded 600ms linear on the third, and a Harmonize toggle that repairs it
**Key decision:** Make the wrongness perceptual before it is explained. The deviant pill arrives late at constant velocity and reads as mechanical before the viewer knows why.
**What it demonstrates:** A hardcoded value is not a shortcut, it is visible damage. The motion difference is the argument.

### 17. Reduced Motion
**UI Component:** A Reduce toggle over a Run button, ProgressBar, and Card
**Token values driving it:** All of them, conditionally: durations flatten to 0.01s, delays to zero; easing and scale stay, since they are not perceived at near-zero duration
**Key decision:** The demo's toggle is the single source of truth inside its scope, so both states are visible regardless of the viewer's OS setting. The support underneath is real: `prefers-reduced-motion` is wired through the entire codebase, not simulated in one card.
**What it demonstrates:** Reduced motion as a first-class state. The interface communicates the same information without requiring the user to process movement.

### 18. Shared Vocabulary
**UI Component:** Two tracks, two dots, one curve
**Token values driving it:** The named presets themselves; the demo pins canonical curve values so the binding between name and numbers stays fixed
**Key decision:** Label one track "Snappy" and the other "0.34, 1.56, 0.64, 1" and let them run identically. The comparison is the whole demo.
**What it demonstrates:** Motion values that cannot be named cannot be systematized. The name carries the intention the numbers cannot, and a named preset is the minimum unit of design-engineering communication.

---

## Key Decisions

**CSS custom properties as the token layer, Framer Motion as the execution layer.** The alternative was a JavaScript theme object, simpler to wire and invisible to the platform. Custom properties won because they are what production systems ship: the browser owns the values, CSS transitions can read them directly, and Token Lab's edits go through the same layer an engineer's build would. The cost is a parsing seam (values arrive as strings, in whatever format a build tool wrote), and that seam eventually produced the best bug in the project. See the last entry.

**A two-channel update system instead of one.** Reading CSS on every frame of a slider drag is too slow; updating only React state leaves the CSS layer stale. Token Lab dispatches once and updates both: the custom property for anything that reads the document, and a context override that hands demo components the same values with no read at all. The channels cannot diverge because both derive from one reducer state. Understanding why both must fire, and what breaks if either fires alone, was the moment React state architecture stopped being syntax for me.

**Chrome timing is not demonstration timing.** Explore mode lets a user drag durations to 50ms or 2000ms, which is the point of the tool and a denial-of-service attack on its own interface. The resolution is two classes of motion: demonstrations read the editable `--motion-*` tokens; the tool's own feedback reads fixed `--feedback-*` constants. A test gate fails the build on any inline animation literal in components, so the boundary is enforced, not remembered.

**The grid earned its architecture five times.** The principle grid's spec sounds trivial: cards in a grid, one expands to 2x2, neighbors reflow. The implementation went through five states, each fixing the failure the previous one revealed: flexbox with runtime width measurement (hundreds of lines of JS doing what CSS Grid does natively), `1fr` rows (collapse inside a scroll container), `minmax(234px, auto)` rows (animation overshoot against a moving target), flat 234px rows (icon deformation from flex growth), and finally fixed 180px columns with `scrollbar-gutter: stable`, because an expanding card summons a scrollbar, and the scrollbar recounts the auto-fit columns mid-animation. `grid-auto-flow: row` stayed over `dense` on an editorial judgment: the empty cells that appear when an expansion does not align with column boundaries are honest. They are the system making room.

**`layoutId` was removed from the codebase entirely.** It is Framer Motion's marquee feature and the obvious tool for indicator pills and card expansion, and every use was taken out. The diagnosis: motion elements register in a global ProjectionNode tree, and a `layoutId` spring that outlives its nominal duration keeps snapshotting layout while it settles. A component mounting mid-snapshot can have its enter animation interrupted and freeze at opacity 0 until reload. The Carousel dot moved to a CSS transition, fully outside the projection system; the Toggle thumb to a direct `x` animation; the card expansion to the plain `layout` prop. The dot's story has a second act. When the physics spring arrived, the dot needed to animate in Framer Motion again to share the snap's spring config, and the diagnosis held up under the pressure: the hazard was always FLIP, never animation as such, so the dot returned as a direct width animation, which writes a style value each frame and never touches projection. The general best practice was understood first, set aside for a stated reason, and understood precisely enough to know which half was safe to take back.

**Motion Tiles runs on one clock.** The first architecture gave each tile its own Luau driver script inside the Rive asset. At 36 tiles the frame rate sat near 40fps, and the instinct is to blame the tile count. Measurement said otherwise: 36 instances of the densest tile with no drivers held 60fps, so the per-instance script execution was the cost, not the instances. The shipped design inverts control: assets carry geometry and bindings only, and one React rAF loop writes every tile's progress each frame, with the stagger applied in JS before the write. An unplanned property emerged: the stagger smooths load, because staggered tiles never hit their expensive frames simultaneously.

**The spring shipped as a toggle, not a rewrite.** The obvious first consumer for the physics spring was the Button release, and it was off the table: that motion had been set, feel-checked, and recorded across five layers of documentation days earlier, and shipped feel does not change as a side effect of a token pass. So the spring got its own demo, and five components (Button, Card, Toggle, Carousel, Drawer) took an opt-in `motionMode` prop defaulting to the bezier, surfaced as a coil toggle in each demo's label row. Nothing shipped moving differently. The toggle puts the imitation and the physics on the same component one press apart, and the Drawer makes the cleanest case: its entrance was a keyframe overshoot, a spring faked by hand, and in spring mode the keyframes collapse to a single target the spring overshoots on its own.

**An interactive Rive machine cannot take a theme rebind.** Rive theming here follows a convention: four color instances baked in the file, and a theme switch rebinds to the matching one. Rive Clock broke it. The plant's watered state lives in a data-bound property, a rebind re-applies the new instance's baked value for it, and the state machine cannot distinguish that write from a click: switching themes watered the plant. A keyed remount dodged the rebind by resetting the machine, throwing away the pose. Replaying state across the rebind required naming the exact property the machine transitions on, a guess you lose. The fix that holds binds one instance for the component's life and changes themes by writing the target palette into it; a property is written only if its baked value varies across the four instances, which separates palette from state without naming a single state property. The rule that fell out is now on record: baked-instance rebinding is for art that only watches. A machine that listens gets its colors written.

**The deep link is a guest entrance, not a second front door.** In-grid expansion had held a reserved URL since June, and the obvious build was to give the expanded card one: paste a link, the grid opens that card in place. It shipped as the opposite. A direct link mounts the grid untouched and floats the principle in a modal above it, because in-grid expansion earns its meaning from the neighbors sliding and a cell going empty, the system making room, and reconstructing that during a lazy mount reconstructs a performance nobody is there to watch. So the two doors open differently: residents expand a card and the grid rearranges; guests arrive at a modal and the grid behind it waits. The URL carries a slug that reads like language and the state carries a number, with one function translating between them, so a bad link fails soft to the plain grid and a mismatched filter resolves in the principle's favor. Closing rewrites the hash in place, through `replaceState`, so the back button cannot reopen what was just dismissed. The expanded card's body was lifted into one component that serves both doors, its state left where each caller already reset it, so the card that had been tuned for a year did not move a pixel.

**The dev server lies; the built output tells the truth.** In production, opening any Modal blanked the entire page. The dev server was clean. The chain: the CSS minifier rewrites `400ms` as `.4s`, a token parser assumed the authored spelling and returned `NaN`, the `NaN` reached the Web Animations API and threw, and with no error boundary the whole tree unmounted. The fix was three layers deep: format-tolerant parsers extracted into a tested module (28 tests), an ErrorBoundary at the app root so one component's failure is no longer total, and a standing rule in the project's instructions that every session's verification exercises built output, not just `npm run dev`. The bug cost an evening. The rule it produced has already paid for it.

Twenty-plus further decisions, each with its reasoning and rejected alternatives, live in [`docs/decisions/`](decisions/). The eleven-day debugging stretch that produced zero commits and the process discipline that ended it is its own record: [`cadence-animation-chronology.md`](case-studies/cadence-animation-chronology.md).

---

## What I Built

Three tools sharing one token layer, live at [cadence.davidpreli.com](https://cadence.davidpreli.com).

**Token Lab** is a live editor for the motion token set: four duration sliders, three independently editable easing slots with a draggable bezier visualizer, delays, scales, and the physics spring, whose settle-curve chart redraws the damped oscillator as its three sliders move. Every control updates consuming components in real time through the two-channel system. A Constrained / Explore toggle per section switches between semantically bounded ranges and the full range. Presets (Standard, Snappy, Cinematic) swap whole motion personalities; user presets persist to localStorage; token sets export as DTCG, flat JSON, or a CSS `:root` block, and import back with a validating report. Five demos carry a coil toggle that swaps their bezier for the real spring in place, and an Embeds category runs the tokens into two canvases: a Rive plant timed by a React clock, and a shader-pixelated plant whose color plates chase the cursor on token timing. A live code view shows the actual Framer Motion calls with current values ticking in the comments.

**The Principles Library** is an 18-card grid, the classic 12 plus the extended 6. Each card expands to a 2x2 footprint. Inside: a Rive illustration of the principle on one side and a live, token-driven UI demo on the other, with a Motion/UI toggle, a sourced quote, and a pill naming exactly which tokens drive the demo. All 18 demos respond to Token Lab edits.

**Motion Tiles** is the vocabulary at scale: a pooled mosaic of 50-plus Rive tiles driven by one React clock, with presets, stagger patterns, an adjustable grid, and a reshuffle. Plus one easter egg reachable through the logo.

Underneath: 38 custom React components and zero from a UI library. Four themes (light, dark, and two high-contrast variants), WCAG AA verified from computed luminance, not by eye. Reduced motion wired globally as a first-class state. Hash routing with deep links, including per-principle links that open as a spotlight modal over the grid. A bug-report pipeline from an in-app Rive button through a Cloudflare Worker to a GitHub issue. 249 tests (189 unit, 60 end-to-end against built output), including the gate that fails the build on hardcoded animation values. Deployed as a Cloudflare Worker with the Rive WASM runtime pinned to the site's own origin.

---

## What I Learned

*(Draft assembled from the project record; David's rewrite pass pending.)*

React stopped being a syntax problem the day the two-channel system made sense. Context is for ambient data many unrelated components need; props configure a specific instance; and a Context default of `null` with a thrown error beats a fallback object, because a fallback that silently does nothing is a bug you find weeks later. Fail fast was a phrase I knew from the lab bench. It turned out to mean the same thing here.

The idiomatic-first rule held every time I doubted it. Start with `useState`, with the plain read, with the pattern the documentation suggests, and optimize only when something measurable hurts. The one place I inverted this (assuming the tile count was Motion Tiles' performance cost, when measurement showed it was the per-tile scripts) cost a week of building toward the wrong fix.

Animation libraries have architecture, and it can bite. Framer Motion's projection tree is global; its marquee feature can corrupt animations three components away; and the fix that survives is sometimes the boring one, a CSS transition, chosen because it is outside the system rather than in spite of that. When the spring work later needed that dot animating in Framer Motion again, the diagnosis was precise enough to permit it: the hazard was the projection system, not animation, so the dot came back as a direct value animation and nothing broke. Debugging this without commits for eleven days taught me more about process than about Framer Motion: small commits, one hypothesis at a time, write down what was ruled out.

The dev server is not the product. The minifier rewrote a token format, a parser trusted the authored spelling, and production blanked while `npm run dev` stayed green. What I would do differently from day one: the error boundary before the first component, verification on built output from the first deploy-shaped milestone, and the test suite started in week two rather than week nine.

And the argument held. I came in believing systematized motion was a compromise motion designers accept. Having now built the system end to end, tokens, presets, export pipeline, a field of fifty tiles retiming on one slider: the constraint was never the system. The system is what lets one person's timing judgment reach every component at once.

---

## What This Demonstrates

For the hiring manager reading this directly:

- **React fluency:** The two-channel Context architecture with a reducer behind it. Controlled and uncontrolled variants across Toggle, Card, and Stepper. ResizeObserver for column-count awareness. AnimatePresence orchestration with its documented sharp edges avoided for stated reasons. A class-component ErrorBoundary where the API demands one. `requestAnimationFrame` drivers feeding live tokens into Rive view models and a WebGL shader. All of it built, none of it from a library.
- **Design systems thinking:** A token architecture that matches Material and Primer patterns, split into editable tokens and fixed references with a test enforcing the partition. DTCG export, including a spring family the DTCG draft has no type for, serialized as plain number leaves rather than an invented one. The chrome/demonstration boundary. Naming as a design act: the bezier that claimed to be a spring was renamed, and then a real spring was built. Shared Vocabulary is a principle in the tool because it was a lesson in the build.
- **Motion expertise applied to product context:** Eighteen principles, each argued through a component a product actually ships. The `layoutId` and Carousel diagnoses show motion knowledge operating at the implementation layer, where it either works in the projection tree or it does not. The eye that tuned these curves won a 2024 Cannes Golden Lion as Animator and Editor; the point of Cadence is that the same eye now ships the system, not the spec.
- **Documentation discipline:** Twenty-plus decision records, each with alternatives and reasoning. A per-principle doc for all eighteen. An honest chronology of the worst debugging stretch, kept because the mistakes instruct. The project's own instructions file enforces the writing voice, the architecture rules, and the verification standard that caught the production crash.

---

## Links

- **Live tool:** [cadence.davidpreli.com](https://cadence.davidpreli.com)
- **GitHub:** [github.com/StudioDavidPreli/cadence](https://github.com/StudioDavidPreli/cadence)
- **Portfolio:** [davidpreli.com](https://davidpreli.com)
