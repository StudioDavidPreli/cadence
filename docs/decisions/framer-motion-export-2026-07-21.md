# The fourth export: tokens as a Framer Motion module (2026-07-21)

The record of adding `toFramerMotion` to Token Lab, a fourth export format beside
DTCG, flat JSON, and CSS. Named in a 2026-06-18 handoff, never built, carried as
the untracked half of the CSS-import-asymmetry gap until the 2026-07-21 tracker
entry. Written as a case-study source.

## What the first three exports leave on the table

Token Lab exports the live token state three ways today, and all three serve the
same reader: a token pipeline. DTCG is the shape Style Dictionary and Figma
Variables consume. Flat JSON mirrors the CSS variable names for hand editing. The
CSS block is a drop-in `:root`. Each hands the token *set* to something that
processes tokens.

None serves the engineer who already works in Framer Motion. That reader does not
want a token document to transform. They want the values, in the units Framer
Motion measures, ready to spread into a `transition` prop. The live code view in
Token Lab already shows them real Framer Motion calls with the current values
ticking in the comments. The claim the case study makes is that a tuned token set
leaves the tool as the artifact an engineer's pipeline consumes. Three of the four
exports made that claim to the token side only.

The spring is the sharpest version of the gap. DTCG, flat, and CSS all carry
`stiffness`, `damping`, and `mass` as three loose numbers, because that is all a
token document can hold. A consumer has to know to reassemble them into
`{ type: 'spring', ... }`. A Framer Motion module can state the spring as what it
is and be finished. The one export that speaks Framer Motion's language is the one
that can say the spring in a single line.

## The four forks

**1. The artifact's shape (a JavaScript module).** Three candidates: a values file
of Framer-Motion-unit numbers, a JavaScript module of named exports, or both. The
module won. A file that drops into an engineer's project and is imported is the
pitch made literal; a values file is nearly the flat JSON that already exists with
different units. Both would have added a second button to an already-tight row for
a format that mostly duplicates.

**2. The register (mirrored, plus composed examples).** The module could mirror the
token layer honestly (`durations.fast`, `easings.enter`), or offer opinionated
semantic pairs (`transitions.enter` carrying duration and ease together). Mirrored
is truer to the tokens; composed is more useful on arrival. It does both: the
mirrored named exports carry the tokens straight, and a small `transitions` block
shows three composed examples (`enter`, `exit`, `spring`) so an engineer sees the
intended pairing without being forced into it. The examples reference the mirrored
exports, so they stay correct whatever the values are.

**3. Export-only (import stays JSON).** `importTokens` does not learn to read the
module. This is the scoping decision CSS export already took, recorded the same
way. A Framer Motion module is a destination, not an interchange format: an
engineer imports it and uses it, they do not edit it and feed it back into the
tool. The two import formats stay DTCG and flat JSON.

**4. File, mime, and label (`cadence.motion.js`, `text/javascript`, `FM`).** The
label needed layout evidence, because the export row is tight. The row lives in the
controls column, which is a fixed 300px and collapses to a 44px rail below 720px,
where the row is not rendered at all, so there is no narrow-viewport wrap risk. The
constraint is only the 300px column, and the existing `DTCG | Flat | CSS` toggle
plus Export and Copy already fills roughly ninety percent of it. `Motion` (six
characters) overflows and would force the row to wrap to two lines. `FM` (two)
fits with no CSS change and reads as Framer Motion in context beside the other
format names. The file is `cadence.motion.js`, following the `cadence.tokens.*`
naming of the others, with a `text/javascript` mime so the download opens as a
script.

## Correction: `FM` did not fit, and the two-row layout (2026-07-21)

The fork-4 claim above was wrong in practice. `FM` clipped. The estimate that the
row was at "roughly ninety percent" of the column understated it: the four
segments plus Export and Copy want more than the ~268px content width, and because
`.exportFormatToggle` carries `overflow: hidden` and the row has no `flex-wrap`,
the toggle absorbed the shortfall by shrinking and clipped its last segment out of
sight. The label was never the problem; the single-row arrangement was.

David asked for a layout playground to settle it (a published artifact that
renders the real 300px column and measures rendered widths live), then chose the
two-row layout. The export row is now `flex-direction: column`: the format toggle
spans the full column width on top with its four segments in equal `flex: 1`
columns, and Export (filling the row) plus Copy sit on a second row beneath. This
cannot clip regardless of how many formats are added later, which the single row
never guaranteed. In the same pass, the Import control moved from its own row below
export up into the preset row (a chip at the end, after Cinematic) and its label
shortened from "Import tokens" to "Import"; a file is brought in beside the presets
it becomes, and the dashed border keeps it reading as an input action apart from
the solid preset chips. Verified on built output: the FM segment's right edge sits
inside the toggle, the toggle spans the column, and Export stacks beneath it.

## The one deliberate exclusion: the duration scalar

The other three exports carry the duration scalar, the lone `--motion-duration-scalar`
multiplier added the same day. The Framer Motion module does not. A Framer Motion
`transition` takes a concrete `duration` in seconds, not a base value plus a
separate multiplier, so there is no field in the artifact for a lone scalar to
live in honestly. Baking it into the emitted seconds would have been the other
option, but the scalar is held at 1 in every preset and has no runtime consumer
(it is out of `stateToTokens` for exactly that reason). The module mirrors what the
demos actually run, which is `stateToTokens` output, and that output has no scalar.
Excluding it keeps the module honest and keeps the no-drift test exact.

## No drift, structurally

`toFramerMotion` is the fifth pure function in the export pipeline, and like the
three stringifiers before it, it serializes from the single `stateToExport` object.
That is what makes the four outputs unable to drift apart: they read one normalized
source. The Framer Motion module diverges from the others in one place only, units.
The token exports keep milliseconds; the module divides by 1000, the same
conversion `stateToTokens` performs to feed the demos. So the emitted seconds are,
by construction, the seconds the demos run. A unit test pins this directly: it
derives the expected values from `stateToTokens` on a non-default preset (Cinematic,
so a hardcoded set could not pass by coincidence) and asserts the emitted module
carries them. Edit a token, re-export, and the emitted seconds move with the slider.

## Where it lives

- `src/data/motionPresets.js`: `toFramerMotion(state)`, after `toCssVars`, before
  the import section. Reads `stateToExport`, converts ms to seconds, emits the
  named exports and the composed `transitions` block, states the spring natively,
  and names `ease.overshoot` as the bezier fallback for contexts that cannot run a
  spring (CSS, reduced motion) in the file's header comment.
- `src/components/TokenLab/index.jsx`: the `FM` toggle segment in `PresetsSection`,
  the `fm` branch in `exportText`, and the `cadence.motion.js` entry in
  `handleExport`'s file map.
- `src/data/motionPresets.test.js`: a `toFramerMotion` describe block pinning
  shape, units, the native spring, the composed transitions, the scalar exclusion,
  and the no-drift assertion against `stateToTokens`.
- The token-integrity gate is untouched: it scans `components/` and `principles/`,
  and the stringifier is in `src/data/`, emitting generated text that never lands
  in the repo.

The case study is left for David's edit pass. The feature is a clean argument for
it, but that is an edit-pass call, not this session's.
