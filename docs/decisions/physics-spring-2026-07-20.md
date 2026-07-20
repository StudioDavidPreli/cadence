# The physics-spring token family (2026-07-20)

The record of adding a real spring to Cadence. It closes the last deferred
proposal from the 2026-07-08 preset harmonization pass, the one the harmonized
doc called the strongest case-study beat in the table and the one everyone kept
putting off because the blast radius was larger than it looked. Written as a
case-study source.

## The thing overshoot could not say

`ease.overshoot` is a cubic-bezier: `(0.34, 1.56, 0.64, 1)`. It gives the look of
a spring on a fixed timeline. Its control point climbs past 1 and comes back, so
an element rides it out past its target and settles. That is the look. It is not
a spring.

A spring has no duration. You do not tell it how long to take. You give it
stiffness, damping, and mass, and the settle time falls out of those three. Push
a stiff spring and it snaps home and rings. Add mass and it lumbers in heavy and
slow. Material 3 Expressive moved its expressive motion to physics springs in
2025, so this is where the production web is going, and Cadence teaches motion at
the system level, so the tool should be able to say what a spring is instead of
labeling a bezier with the word and hoping nobody checks.

The move that makes it fit Cadence's rules: a spring's three params are unitless
numbers, and unitless numbers live fine in CSS custom properties. So the token
stays the source of truth, still read on mount, still theme-aware. What changes is
that Framer Motion consumes `{ type: 'spring', stiffness, damping, mass }` instead
of a duration plus a bezier.

```css
--motion-spring-stiffness: 170;
--motion-spring-damping:   20;
--motion-spring-mass:      1.5;
```

`ease.overshoot` stayed. It is the CSS-only fallback for anything that cannot run
a JS spring, and it is what the reduced-motion path falls back to. Renaming or
removing it was never on the table.

## Three calls, David's

**Scope A, the fixed family first.** Two honest scopes were on offer. A: tokens,
presets, exports, import, one consumer, docs, no new controls. B: all of that plus
the spring editor sliders and a settle-curve visualizer that plots displacement
over time from the three params. David took A. The reasoning is sequencing: the
invisible plumbing is the hard part and the same in both, so land it with one real
consumer, get the feel sign-off on the values against something moving, and design
the visualizer later against springs that already work. The data shape was built
so B is a pure additive pass with no data change.

**A new demo, not a rewired one.** The obvious consumer is the Button release. It
was off the table: that motion was set to `ease.overshoot` on 2026-07-16,
feel-checked, and recorded across five layers. Changing shipped motion is David's
call, never a side effect of a token pass. So the spring got its own demo, the
SpringDemo, which touches no existing feel. A dot on a rail springs to the far end
and back. Switch presets and it retimes with no timing value changing hands:
Snappy bounces hard, Cinematic glides in heavy, Standard settles with a hint. That
is the whole demonstration overshoot cannot make.

**DTCG as three number leaves.** The W3C Design Tokens draft has no spring type.
Three ways to handle that: invent a `$type`, use the spec's `$extensions` escape
hatch, or drop spring from the DTCG file. None were needed. Stiffness, damping,
and mass are unitless numbers, and DTCG has a `number` type, the same one `scale`
already uses. So they serialize as three `number` leaves under a `motion.spring`
group. No invented type, valid DTCG today, and the group name carries the "these
three compose one spring" meaning a composite type would have added. It round-trips
through our own importer.

## The blast radius, surface by surface

The family assumes nothing new until it hits code that assumed a token is a
duration plus a bezier. Every place that assumption lived:

- **`motion.css`.** Three unitless custom properties.
- **`motionPresets.js`.** `INITIAL_STATE` and the two other presets carry a
  `spring` block. `stateToTokens` passes it through unitless, with no divide-by-1000,
  because a spring is not measured in time. `stateToExport` and all three
  stringifiers emit it: DTCG number leaves, flat bare numbers, a CSS `:root` block.
- **The importer.** Spring is a new scalar class. It clamps to bounds like the
  others, but it also rejects: a stiffness, damping, or mass at zero or below is a
  spring that never settles, so it fails the import as a structural error, the same
  class as a cubic-bezier with an out-of-range `x`, instead of being clamped into
  something that looks valid and is not. The bounds are their own map,
  `SPRING_BOUNDS`, because the three params have three different ranges, unlike the
  range-per-family `EXPLORE_BOUNDS`.
- **`EDITABLE_TOKEN_SCHEMA`.** Spring is listed there even with no slider. It varies
  per preset, so it cannot be a fixed reference (those are identical across every
  preset); it lives in state and round-trips, so it is editable-class. Listing it
  keeps the drift guard honest (schema and fixed set together classify every runtime
  token) and lets the importer validate it. Controls are rendered by explicit
  `*Section` components, not by walking the schema, so listing spring surfaces no
  control. Same posture overshoot has held since its Explore-gating.
- **`parse.js` and `useMotionTokens`.** The unitless parser already handled it;
  spring got fallbacks and three reads. Unitless values are safe from the CSS
  minifier that rewrote `400ms` to `.4s` and blanked the site once, but the built
  CSS was checked anyway: the params stay unitless and uncorrupted.
- **The code view.** The token-reference regex learned a fifth family, and the
  unitless display branch already covered the numbers.
- **localStorage.** A preset saved before today has no spring key. A separate
  migration pass backfills the whole group from Standard, so the reducer never reads
  undefined. It runs even for a preset old enough that the easing migration returns
  early.
- **Tests.** The three unit suites grew spring coverage: the round-trip, the clamp,
  the rejection, the fill, a foreign key, the drift guard, the display format. The
  token-integrity gate scanned the SpringDemo and found no inline literal, because
  every value it animates on is read from the tokens.

## Reduced motion, and the one gap left open

The SpringDemo lives in Token Lab's demo column, which is wrapped in
`MotionTokensProvider respectReducedMotion={false}` on purpose: a person in Token
Lab is there to watch motion. So the demo does not flatten, the same as every
sibling in that column. It deliberately does not read `useReducedMotion()` itself,
which would flatten it inside the exempt column and split it from its neighbors.

There is a gap, named here so it is not a surprise later. `reduceMotion()` flattens
duration and delay to near zero and leaves the rest alone, which is correct for
everything shipped, because everything shipped is timed. A spring is not. If a
future consumer puts a spring under a flattening provider, outside Token Lab, the
spring would still run. The fix when that day comes is one of two small moves: the
consumer reads `useReducedMotion()` and swaps to a near-instant tween, or
`reduceMotion()` grows a spring branch that collapses it. Scope A has no such
consumer, so neither was built.

## Scope B, same day: the editor and the switch

David took the editor next, in the same session. Two pieces.

The spring editor. A Spring control section with three sliders (stiffness, damping,
mass) dispatching `SET_SPRING`, the same shape as `SET_SCALE`, and a settle-curve
visualizer. The visualizer is the beat scope A could not make in the tool bar: a
plot of displacement over time, the curve rising, overshooting the target, and
settling, redrawn as the sliders move. Its math is the damped harmonic oscillator,
the same second-order system Framer Motion integrates, kept in a pure
`springCurve.js` so the three regimes (underdamped rings, critical arrives clean,
overdamped crawls) test without React, the way `parse.js` does. The chart reads the
params as a prop because the controls column sits outside the provider, the stance
`DurationVisualizer` already takes. Constrained slider ranges cover usable UI
springs; Explore ranges are the `SPRING_BOUNDS` from scope A, so an import always
lands on the track.

The switch. David chose per-component toggles over a global mode, on Button, Card,
and Toggle. Each takes an optional `motionMode` prop defaulting to `'bezier'`. The
control is a single icon toggle, a metal-spring coil, sitting in the demo's label
row to the left of the `</>` button; `DemoWrapper` owns the state through a
`springCapable` prop and hands the mode to its render-prop child. The glyph is the
inlined `spring.svg` filled with `currentColor`, muted at rest and the theme accent
when engaged, so one asset tracks all four themes through the color token, the way
the wordmark does. When the mode reads `'spring'`, the component's overshoot-role
transition becomes `{ type: 'spring', ...tokens.spring }`; Button swaps its release,
Card its select-in only (deselect stays standard), Toggle its thumb. No shipped call
site passes the prop, so nothing ships rewired: the toggle is the imitation next to
the physics on one component, an exploration, not a decision. The `motionMode`
branch shows in each demo's code view, so the `</>` panel names the spring tokens
the moment a demo is switched, and the connection-highlight lists all four
spring-capable demos when a spring slider moves. The Token Lab overview documents
the section and the toggle.

The tight loop this builds: switch a Button to Spring, drag stiffness, and the
button, the settle-curve chart, and the SpringDemo all move together, every one
reading the same `tokens.spring` through the existing context. No new global
wiring. `springCurve` added eleven tests; the whole suite and the e2e gate stayed
green.

## Carousel, and the harmonized dot (same day)

David added the Carousel to the switchable set, and asked for the harder, better
version: not just the snap, but the dot indicator springing with it, and the P5
Follow Through principle demonstrating the real spring rather than the bezier.

The snap was the easy half: `goToSlide` already drives a MotionValue through the
imperative `animate()`, which takes a spring config natively, so the transition
became `{ type: 'spring', ...tokens.spring }` behind the same `motionMode` prop.

The dot was the point. It had been moved to a CSS transition on purpose, to stay
clear of the projection system a `layoutId` pill once corrupted. CSS cannot run a
JS spring, so harmonizing it meant driving its width from Framer Motion again, and
the record warned against exactly that. The distinction that makes it safe: the old
failure was `layoutId`, the FLIP projection system, not animation as such. A direct
`animate={{ width }}` writes a style value each frame and never touches projection.
So the pip now animates its width on the *same* `snapTransition` object the snap
uses, `initial={false}` to skip the mount, and the dot and the slide move as one
system. That shared transition is the harmonization made literal: one object, two
elements. Only width animates; the 4px border-radius and the accent fade stay in
CSS. CLAUDE.md's dot passages were updated to match.

P5 was the reason the reduced-motion gap finally had to close. Follow Through runs
the Carousel with `motionMode="spring"`, and P5 is a real reduced-motion-respecting
surface (its card gate flattens the tokens). A spring has no duration, so the
flattening slid right past it, the gap the scope-A record named. The fix is the one
that record proposed: `reduceMotion()` now sets a `reducedMotion: true` flag on the
flattened tokens, and the Carousel reads it (`useSpring = motionMode === 'spring'
&& !tokens.reducedMotion`), falling back to the bezier branch whose `duration.slow`
is already flattened to instant. In Token Lab, the demo column opts out of
flattening, so the flag is absent and the spring plays. One flag closed a gap that
had been sitting open since the family shipped.

## Drawer (same day)

The fifth switchable component, and the cleanest case for what the spring is: the
Drawer's entrance was already a keyframe overshoot (`y: 100% → -10% → 0%`), a
spring faked by hand. In spring mode that becomes a single 0% target on a real
spring, which overshoots on its own from the params; the opacity rides a short
tween beside it, and the exit keeps its keyframe anticipation (a spring is for
arriving, not for clearing the frame). Same `motionMode` prop, default `'bezier'`,
so the P02 Anticipation principle demo (which also renders the Drawer) is
untouched; only Token Lab's Enter & Exit toggle passes `'spring'`. Gated on
`!tokens.reducedMotion` like the Carousel, though the Drawer's spring only runs in
Token Lab's opt-out column today.

## Files

Scope A:

- `src/tokens/motion.css`
- `src/data/motionPresets.js`
- `src/hooks/useMotionTokens.js`
- `src/components/SpringDemo/` (new)
- `src/components/TokenLab/index.jsx`, `demoSnippets.js`
- `src/components/CodeBlock/resolveToken.js`
- Tests: `motionPresets.test.js`, `resolveToken.test.js`, `parse.test.js`
- Docs: `token-architecture.md`, `references/motion-presets.md`,
  `references/motion-presets-harmonized.md`, this record

Scope B (same day):

- `src/components/SpringVisualizer/` (new: `index.jsx`, `springCurve.js`,
  `springCurve.test.js`, `.module.css`)
- `src/components/Button/index.jsx`, `Card/index.jsx`, `Toggle/index.jsx`
  (the `motionMode` prop)
- `src/components/TokenLab/index.jsx` (`SET_SPRING`, the Spring section, the
  `SpringIcon` glyph, the `springCapable` toggle in `DemoWrapper`),
  `TokenLab.module.css`, `demoSnippets.js`
- `src/components/TokenLabGuide/index.jsx` (the overview's spring note),
  `public/titleSVGS/spring.svg` (the coil icon, David's)

Carousel + the reduced-motion flag (same day):

- `src/context/MotionTokensContext.jsx` (`reduceMotion()` sets `reducedMotion`),
  `MotionTokensContext.test.js`
- `src/components/Carousel/index.jsx` (the `motionMode` prop, the spring snap, the
  FM-driven dot), `Carousel.module.css`
- `src/principles/FollowThrough/index.jsx` (P5 runs the spring)
- `src/components/TokenLab/index.jsx` (Carousel in the map, `springCapable` on the
  Gesture demo), `demoSnippets.js`, and CLAUDE.md's dot passages

Drawer (same day):

- `src/components/Drawer/index.jsx` (the `motionMode` prop, spring entrance)
- `src/components/TokenLab/index.jsx` (Drawer in the map, `springCapable` on the
  Enter & Exit demo), `demoSnippets.js`
