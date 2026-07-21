# The duration scalar, and the visualizer it turned out to already have (2026-07-21)

The record of adding `--motion-duration-scalar` to Cadence, the last of the three
2026-07-08 harmonization deferrals, and the first of the pre-launch queue's
engineering items to land. Promoted from Future work on David's call: the lesson
is worth having on day one. Written as a case-study source.

## The lesson, and the thing that already taught most of it

Cadence's durations are fixed. `duration.base` is 200ms whether an element
travels 40px or 400px. Material and Carbon both hold that duration should scale
with the distance travelled, and fixed tokens are the one place Cadence's model
simplifies away from both. The consequence is perceptual: two elements on the
same duration over different distances move at different speeds, and the longer
travel reads rushed.

The kickoff scoped a visualizer to make that visible. Reading the code first
turned up that the visualizer already exists. `DurationVisualizer` has sat in
Token Lab's Duration section for weeks: three dots travelling short, medium, and
far, a Constant-duration versus Constant-velocity toggle, and a chart of duration
against distance. Constant-duration runs every dot for the token's time, so the
far dot rushes to arrive together. Constant-velocity times each dot to its
distance, so speed steadies. That is the lesson, already built.

What it lacked was the token. The scaled path computed its factor in JS
(`fraction / NEAR_FRACTION`), a hardcoded multiplier sitting inside the very demo
that argues values like it should be tokens. So this session did not build a
visualizer. It closed that gap: it made the multiplier a real token the tool owns.

## Four calls, David's

The scoping surfaced a conceptual seam worth stating plainly, because it governs
what the token honestly means. A single global scalar is literally `base × scalar`,
a uniform multiplier. It does not by itself steady speed across distance: scrub it
and the far dot still rushes, just at a new overall tempo. Steadying speed across
distance needs the factor to track distance, which is what the visualizer's
constant-velocity mode already does. The harmonized doc welds the two ideas
together; the code keeps them apart. David chose, knowing that:

1. **Retrofit the existing visualizer, not a second one.** A second graphic
   teaching the same distance lesson beside the first is the redundancy Economy
   and Token Fidelity both argue against.
2. **A single editable token**, not a fixed reference held at 1 and not a
   per-preset family member. Every preset carries the same scalar, 1: speed
   already lives in each preset's duration ladder, so the scalar is not a
   personality axis. Making it a real, exported, importable token is what lets the
   tool claim the multiplier is a token rather than a demo constant.
3. **No shipped component consumes it.** The visualizer is the consumer. Rewiring
   shipped motion is never a side effect of a token pass. The token exports, so a
   downstream system could wire `base × scalar` into its own components, but
   Cadence's own motion stays untouched.
4. **The name `--motion-duration-scalar`**, held in its own unitless slot rather
   than inside the ms-valued duration family.

The shipped math is the literal one: `base × scalar`, applied uniformly in both
modes. The distance lesson stays the toggle. The two read as complementary, the
toggle showing why a system scales duration to distance, the scalar being the one
dial that retimes the whole set without editing every duration token. The pattern
carries no source attribution anywhere: an early draft of the harmonized doc
credited a named system, the attribution could not be verified, and it was removed.

## A lone value in a codebase built for families

Every editable token before this was a family: a map of keys sharing a range, a
serializer, a slider set. The scalar is one number. The name David kept,
`--motion-duration-scalar`, does not fit the `--motion-<family>-<key>` machinery
(family `duration` is ms-valued and its sliders are ms), so the scalar is handled
by dedicated branches rather than the family loops. It lives in `rawState.scalar`
as a bare number, and it carries one documented naming seam: the CSS custom
property is `--motion-duration-scalar`, the JSON export path is the shorter
`scalar`. That seam is the same kind the easing/ease boundary already carries.

## The blast radius, surface by surface

- **`motion.css`.** One unitless custom property, `--motion-duration-scalar: 1`.
- **`motionPresets.js`.** `INITIAL_STATE` and both other presets carry `scalar: 1`.
  `stateToExport` and all three stringifiers emit it: a DTCG `number` leaf at
  `motion.scalar`, a bare top-level flat number, a `--motion-duration-scalar` CSS
  line built outside `block()`. Import reads it in a dedicated branch that clamps
  to `SCALAR_BOUNDS` and reports like any scalar, but also rejects a value at or
  below zero as a structural error, the spring precedent, because a scalar of 0
  freezes every duration and a negative one inverts them. `collectForeign`
  suppresses it so a clean round trip reports nothing, and `detectFormat` learns
  a scalar-only file is still a flat file.
- **`stateToTokens` did NOT change.** It feeds the provider that drives the demo
  area, and nothing under a provider consumes the scalar. Keeping it out of the
  runtime token object also keeps the code-view drift guard meaningful: schema
  union fixed still equals every demo-consumed token, and the scalar is not one.
- **`TokenLab`.** A `SET_SCALAR` reducer case (value, no key), the CSS writes,
  `SCALAR_CONFIG` / `SCALAR_CONFIG_EXPLORE`, a `migratePresetScalar` backfill for
  presets saved before today, and the three new props handed to the visualizer.
  `statesMatch` did NOT change: the scalar joins spring and the overshoot slot as
  an editable extra that does not key preset identity, so scrubbing it keeps the
  active-preset highlight, the same as scrubbing spring.
- **`DurationVisualizer`.** Takes `scalar`, `onScalarChange`, and `scalarConfig`.
  `dotDuration` multiplies by the scalar in both modes. The scrub is its own row,
  deliberately not wired to the active-token highlight: no demo consumes the
  scalar, so lighting the active token would false-flag every demo with the
  "Token unused by present components" note. Control and effect sit together.

## What did not activate, and why

The kickoff's blast-radius list included `useMotionTokens` / `parse.js`, the code
view, `TOKEN_COMPONENT_MAP`, and `reduceMotion`. None activated, each for a reason:

- **No `useMotionTokens` read.** The addition workflow's step 2 makes a token
  available to every component through the hook. The scalar has no in-provider
  consumer, and its one consumer reads `rawState.scalar` as a prop the way the
  visualizer already reads `durations`. A hook read no one calls is dead code, so
  it was not added. No `getComputedStyle` read also means no minifier NaN risk;
  the built CSS carries `--motion-duration-scalar:1` unitless and uncorrupted.
- **No code view / `TOKEN_COMPONENT_MAP` / drift-guard change.** The scalar is not
  a demo-area token: no snippet reads `tokens.scalar`, so the token-reference
  regex, the connection-highlight map, and the drift guard are all untouched.
- **No `reduceMotion` branch.** Effective duration is `base × scalar` and the base
  already flattens to ~0, so the product flattens through the arithmetic. The
  visualizer does not flatten anyway, the same stance the whole demo column takes.

## Tests

`motionPresets.test.js` grew scalar coverage: the export in all three forms, the
import round-trip, the clamp-and-report, the non-positive rejection, and the fill
from Standard. The lossless round-trip tests exercise the scalar for free now that
`INITIAL_STATE` carries it. The drift guard stayed green, which is the proof the
scalar sits correctly outside the demo-token partition. All unit suites pass and
the e2e gate stays green on built output; the a11y axe floor covers the new
scrub's contrast and labeling on the Token Lab surface.

## Files

- `src/tokens/motion.css`
- `src/data/motionPresets.js`, `motionPresets.test.js`
- `src/components/TokenLab/index.jsx`
- `src/components/DurationVisualizer/index.jsx`, `DurationVisualizer.module.css`
- Docs: `token-architecture.md`, `references/motion-presets.md`,
  `references/motion-presets-harmonized.md`, this record

The scrub range (`SCALAR_CONFIG` and `SCALAR_BOUNDS`) and the visualizer's copy
are David's to tune by feel against the live strip.
