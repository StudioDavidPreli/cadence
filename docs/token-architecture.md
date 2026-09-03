# Token Architecture

The token layer is CSS custom properties. Components do not hardcode animation values. They read tokens at runtime via `getComputedStyle`. This is the same pattern used by Material, Primer, and other production design systems, and it is what allows Token Lab to update component behavior in real time when a token value changes.

For the rule itself and the canonical read pattern, see CLAUDE.md, "Core Architecture Principle." This document covers what the tokens are and how to add a new one.

---

## Token Structure

Defined in `src/tokens/motion.css`.

```css
:root {
  /* Duration */
  --motion-duration-fast: 100ms;
  --motion-duration-base: 200ms;
  --motion-duration-slow: 400ms;
  --motion-duration-slower: 600ms;

  /* Easing */
  --motion-ease-linear: cubic-bezier(0, 0, 1, 1);
  --motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --motion-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --motion-ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Delay */
  --motion-delay-none: 0ms;
  --motion-delay-short: 50ms;
  --motion-delay-medium: 100ms;
  --motion-delay-long: 200ms;

  /* Scale (press keys renamed 2026-07-21; see docs/decisions/scale-rename-2026-07-21.md) */
  --motion-scale-press-subtle: 0.98;
  --motion-scale-press-base: 0.95;
  --motion-scale-press-expressive: 0.9;
  --motion-scale-lift: 1.02;

  /* Spring (physics) */
  --motion-spring-stiffness: 170;
  --motion-spring-damping: 20;
  --motion-spring-mass: 1.5;

  /* Duration scalar */
  --motion-duration-scalar: 1;
}
```

The spring family is the one token group that is not a duration plus a bezier. A
spring is not time-based: it has no duration, and its settle time emerges from
stiffness, damping, and mass. The three params are unitless numbers, so they read
from custom properties at runtime like everything else, and Framer Motion
consumes them as `{ type: 'spring', stiffness, damping, mass }`. `ease.overshoot`
stays alongside them as the CSS-only and reduced-motion fallback for anything that
cannot run a JS spring. Added 2026-07-20;
`docs/decisions/physics-spring-2026-07-20.md` carries the reasoning.

---

## Editable vs fixed reference tokens

Not every token is a dial. The token set splits in two, and the split governs how Token Lab and the live code view behave.

**Editable tokens** have a control in the tool bar. Drag the slider, the value changes, the demos retime. These are the four durations, the four easing slots (standard, enter, exit, overshoot), the three delays (short, medium, long), and the four scales (pressSubtle, pressBase, pressExpressive, lift). Overshoot is the one editable slot whose control only surfaces in Explore mode: its Y > 1 handle needs the visualizer's extended vertical range, so Constrained mode hides its tab and leaves it at the default curve. `EDITABLE_TOKEN_SCHEMA` in `packages/tokens/src/index.js` (the `cadence-tokens` package; `src/data/motionPresets.js` until the 2026-09-03 extraction) is the exact list and the single source of truth: the importer validates against it, and the code view reads it to decide what a slider can reach.

The three spring params (`spring.stiffness`, `spring.damping`, `spring.mass`) are a fourth editable family, and the newest. Spring varies per preset like duration, so it cannot be a fixed reference (those are identical across every preset); it lives in state, resolves per preset, and round-trips through import. It has its own Spring control section with three sliders and a settle-curve visualizer (`SpringVisualizer`, drawing displacement over time from the three params). The sliders dispatch `SET_SPRING`, the same shape as `SET_SCALE`. Constrained ranges (`SPRING_CONFIG`) cover the band that produces usable UI springs; Explore ranges (`SPRING_CONFIG_EXPLORE`) match the `SPRING_BOUNDS` an import clamps to, so an imported value always lands on the track.

A spring can also stand in for `ease.overshoot` on the components that carry a `motionMode` prop (Button, Card, Toggle, Carousel, Drawer). The prop defaults to `'bezier'`, so nothing ships rewired; Token Lab's per-demo spring toggle (a single coil icon in the demo's label row, left of the `</>` button) passes `'spring'`, and it flips the demo's transition to `{ type: 'spring', ...tokens.spring }` in place. The Carousel harmonizes: its snap and its dot indicator share one transition object, so the dot springs when the snap does. The P5 Follow Through principle demo runs the Carousel on `motionMode="spring"` (a real spring is the truest follow-through), which made it the first spring consumer in a reduced-motion-respecting context: `reduceMotion()` now sets a `reducedMotion` flag on the flattened tokens, and a spring consumer reads it to fall back to an instant transition, since a spring has no duration to flatten. It is a comparison affordance, the imitation next to the physics on one component, not a change to the tool's own shipped motion.

The duration scalar (`--motion-duration-scalar`, added 2026-07-21) is editable-class too, but it is not a family: it is one unitless number, a multiplier on top of the duration tokens (`effective = base × scalar`). It lives in `rawState.scalar` as a bare value, exports and imports like the families (a DTCG `number` leaf at `motion.scalar`, a flat top-level `scalar`, a `--motion-duration-scalar` CSS line), and clamps to `SCALAR_BOUNDS` with the same non-positive rejection spring uses (a scalar at or below zero freezes or inverts every duration). It carries one naming seam: the CSS property is `--motion-duration-scalar`, the JSON path is the shorter `scalar`. Two things it deliberately does NOT do. It is not in `EDITABLE_TOKEN_SCHEMA` or `stateToTokens`, because its only consumer, `DurationVisualizer`, reads `rawState.scalar` directly as a prop from the controls column (like `durations`), and no component under a provider reads it. Keeping it out of the runtime token object keeps the drift guard's invariant honest: schema ∪ fixed still equals every demo-consumed token, and the scalar is not one. And it does not key preset identity in `statesMatch`, joining spring and the overshoot slot as an editable extra that leaves the active-preset highlight alone when scrubbed. Full reasoning: `docs/decisions/duration-scalar-2026-07-21.md`.

**Fixed reference tokens** are real tokens components use, but no control reaches them: `ease.linear` and `delay.none`. `stateToTokens` wires these to constants instead of editor state, and `FIXED_REFERENCE_PATHS` lists them as the exact complement of the editable schema.

They are anchors, not dials. `ease.linear` is "no easing" itself, the constant-velocity baseline a curve is measured against, so a slider that bent it would unname it. `delay.none` is the system's named zero, so a component that starts immediately can say so in token terms: the Stepper's first beat reads `tokens.delay.none`, not a literal `0`. Make either editable and it stops anchoring the thing it names.

The fixed set used to be three. `ease.spring` was renamed to `ease.overshoot` on 2026-07-08 (a cubic-bezier approximates spring overshoot but is not a spring; `docs/references/motion-presets-harmonized.md` carries the reasoning) and moved into the editable schema as the Explore-only fourth slot described above.

This is why a value in the live code view can sit still while the sliders move. The code view tags every fixed read `(fixed)`. Spinner's rotation reads `tokens.ease.linear`, so its easing comment holds at `[0, 0, 1, 1]` no matter what the easing tabs do, while its duration comment still ticks. `isEditableToken` in `src/components/CodeBlock/resolveToken.js` makes the call, and a guard test in `resolveToken.test.js` asserts the editable schema and the fixed set together classify every token the runtime carries, with no overlap and none left over.

One naming seam to know. The control layer (the sliders, the schema) calls the easing family `easing`; the runtime token object components read calls it `ease`. The two are normalized to each other only at the point a path is compared. Duration, delay, and scale use the same word on both sides.

---

## Standard token addition workflow

When adding any new token to the project, follow this sequence:

1. Define it in `src/tokens/motion.css`. Single source of truth.
2. Add the fallback value and `getPropertyValue` read to `useMotionTokens`. This makes it available to all components without each one repeating the read.
3. Replace any hardcoded value in the component with the new token reference. The component now reads from the system.

The order matters. Defining the token first means step 2 has something to point at; doing step 2 before step 3 means the component swap is a one-line change rather than a coordinated edit.

---

## Token export

Token Lab exports the live token state as a downloadable file. Export is the inverse of the addition workflow: the addition workflow brings a value into the system, export hands the whole system back out in a portable form.

The export pipeline is five pure functions in `packages/tokens/src/index.js`:

1. `stateToExport(state)` normalizes the editor's `rawState` into a format-agnostic object in CSS-side units (ms numbers, four-number bezier arrays, unitless scale). It emits the complete token set, including the members the editor never exposes as sliders: `ease.linear` and `delay.none`. An export that dropped those would be a partial file, not a usable one.
2. `toDtcgJson(state)` serializes that object to the W3C Design Tokens Community Group format, wrapping each leaf in `$type` / `$value` under a top-level `motion` namespace. This is the shape Style Dictionary, Tokens Studio, and Figma Variables consume. The draft spec has no motion-specific delay type, so delays serialize as `duration`. It also has no spring type, so the three spring params serialize as plain `number` leaves (the same `$type` scale uses) under a `spring` group. A spring is not one composite value here, it is three unitless numbers, and the group name carries the "these compose one spring" meaning. No invented type, and it round-trips through `importTokens`.
3. `toFlatJson(state)` serializes the same object to a flat JSON mirroring the CSS variable names: ms strings, `cubic-bezier()` strings, bare scale numbers.
4. `toCssVars(state)` serializes the same object to a `:root` block of the editable `--motion-*` custom properties, in the exact variable names and units used by `src/tokens/motion.css`. It is a drop-in replacement for that block. Only the editable token scale is emitted; the `--feedback-*` chrome timings in `motion.css` are not design tokens and are left out.
5. `toFramerMotion(state)` serializes the same object to a JavaScript module of ready Framer Motion values (`packages/tokens/src/index.js`, added 2026-07-21). It is the only export that is not a token document: where the three above hand the token *set* to a pipeline, this hands the *motion* to an engineer, as named exports (`durations`, `easings`, `delays`, `scale`, `spring`) to spread into `transition` props, plus a small `transitions` block of composed duration-plus-ease examples. Two things set it apart from the others. It is the one export in Framer Motion's own units, seconds rather than ms (the same `/1000` `stateToTokens` performs, so the emitted values equal what the demos run), and it is the only one that states the spring as a native `{ type: 'spring', stiffness, damping, mass }` config rather than three loose numbers a consumer reassembles. The emitted file names `ease.overshoot` as the bezier fallback where a spring cannot run (CSS, reduced motion), the system's own documented posture. The duration scalar is deliberately absent: a Framer Motion transition takes a concrete `duration`, not a base × multiplier, and the scalar has no runtime consumer (it is out of `stateToTokens` for the same reason), so there is nowhere honest for it to live here.

All four stringifiers read from the single `stateToExport` object, so the outputs cannot drift apart. The Presets section UI (`PresetsSection` in `src/components/TokenLab/index.jsx`) picks the format and downloads via `downloadTextFile`, a client-side Blob download with no server round-trip. DTCG files use the `.tokens.json` extension, flat files use `.json`, the CSS block uses `.tokens.css` with a `text/css` mime, and the Framer Motion module uses `cadence.motion.js` with a `text/javascript` mime. CSS and the Framer Motion module are export-only: `importTokens` reads the DTCG and flat JSON shapes, not CSS and not the module. A Framer Motion module is a destination, not an interchange format (the same scoping decision CSS export took, recorded 2026-07-21; see `docs/decisions/framer-motion-export-2026-07-21.md`).

---

## Token import

Import is the inverse of export, plus validation. `importTokens(text)` in `packages/tokens/src/index.js` parses a file, detects the format (DTCG or flat), and returns a discriminated result. It never throws to the caller: internal helpers throw a named `ImportError` for fatal cases, caught at the boundary and returned as `{ ok: false, error }`. A successful import returns `{ ok: true, state, report }`.

The rules:

- **Always flips to Explore.** The widened slider ranges (`EXPLORE_BOUNDS`) double as the clamp bounds, so the flip is also what lets an imported value be displayed and edited. A 1500ms duration is unreachable on a constrained slider; in Explore it sits on the track.
- **Clamps scalars, never curves.** Duration, delay, and scale values outside `EXPLORE_BOUNDS` are pulled to the nearest edge and reported. Easing curves are not clamped: a control point with `y` outside `[0,1]` renders outside the visualizer's draggable region (the same state the Overshoot curve is in), so it loads and is reported as not-editable rather than bent. A curve with `x` outside `[0,1]` is a structural error (CSS rejects it) and fails the import.
- **Spring params clamp and also reject.** They are scalars, so a too-large value clamps to `SPRING_BOUNDS` (a separate per-key map, because stiffness, damping, and mass have three different ranges, unlike the range-per-family `EXPLORE_BOUNDS`) and is reported like any other scalar. But they also carry a validity gate the other scalars do not: stiffness, damping, and mass must all be greater than zero, or the spring never settles. A zero or negative value is rejected as a structural error, the same class as an out-of-range bezier `x`, rather than clamped.
- **Fills missing tokens from Standard** (the baseline preset, labeled Default until 2026-07-16) and reports each, so a partial file imports rather than failing.
- **Re-canonicalizes easing.** Export flattens named curves to arrays; import maps a matching array back to its named key, so a round-tripped preset keeps its identity and lights up as active.
- **Reports foreign keys** but suppresses the two expected constants (`ease.linear`, `delay.none`) so a clean round trip shows nothing.

On success, TokenLab writes the result into a single reserved "Imported" preset (replacing any previous one), loads it via `LOAD_PRESET`, and opens a report modal (`ImportReport`) listing every clamp, fill, ignored key, and non-editable curve. Fatal failures open the same modal with the error message. The shared `Modal` component gained a focus trap in this pass, since the report made it a real dialog rather than a visual demo.
