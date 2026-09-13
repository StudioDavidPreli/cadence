# The easing duplicate-curve note (2026-09-13)

The third audit upgrade, and the one that was gated on a measurement rather than
a decision. The measurement passed. The item it was measuring did not survive
contact with it unchanged.

## Why easing was absent

The August audit left easing alone on purpose. A curve's one structural rule, x
inside [0, 1], is enforced at import, and "is this curve's shape right for this
interaction" is taste. The audit's two sources of bars are the set measured
against itself and one cited external number, and curve shape answers to
neither.

Measure produced the exception. Recording the site's own Button, the five named
curves could be recovered from the frames and a free bezier could not, which is
the case study's lead finding: a small named vocabulary is the precondition for
measurement. On the way it fixed a distance under which two curves cannot be
told apart, `indistinctMargin`, and that distance makes exactly one easing
question answerable without taste. Do two of this set's slots draw the same
shape?

## The gate: does the tolerance transfer

Measure's margins are fit margins. They say how much worse a second named curve
may fit recorded frames than the winner. The audit compares two authored curves
with no frames and no best fit, so the metric survives the move (`nearestNamed`
already computes a curve-to-curve rms) but the bar had to be shown to.

The spike, `tools/easing-spike/`, untracked like the item 8 and item 9 probes.
It reports four tables and picks nothing. The numbers:

| what | rms | role |
| --- | --- | --- |
| one CSS pixel of drag on the visualizer | 0.0010 to 0.0020 | the floor. Under this and one pixel splits a curve in two |
| **the bar** | **0.005** | |
| a 0.1 move of one control point | 0.0239 to 0.0492 | over this and a real edit reads as no edit |
| closest pair in the named library | 0.1326 (linear vs exit) | over this and the audit calls Cadence's library a duplicate |

Any bar between about 0.002 and 0.024 satisfies all three. 0.005, the floor of
`indistinctMargin` at eight or more frames, sits 2.5x over a pixel of drag, 5x
under a real edit, and 26x under the library's closest pair. `BAND_TOL` at 0.02
also works but leaves 20% headroom against a 0.1 move, which is thin for a
number that has to hold while somebody drags a handle. David's call: 0.005.

The bezier evaluator is unbounded in y, so overshoot pairs need no special case.
The spike confirmed that rather than assuming it.

## What the spike found, and what it changed

The charter's smoke check failed, and not by a margin. Two of the three shipped
presets hold an exact duplicate:

```
Standard    standard / enter / exit / overshoot      all four separate
Snappy      overshoot / enter / exit / overshoot     standard = overshoot, distance 0
Cinematic   enter / enter / exit / overshoot         standard = enter,     distance 0
```

The handoff had scoped this to three slots. It is four: overshoot became
editable at the Explore unlock and `EDITABLE_TOKEN_SCHEMA.easing` lists it, so a
check over "the set's easing slots" that skipped it would be auditing a subset
it chose. With all four, Snappy is caught too.

The note as specified would have told a reader that Snappy has two names for one
curve. It would be right about the shape and wrong about the meaning. A slot is
a role, not a name for a shape: `ease.standard` means "what most things use" and
`ease.overshoot` means "the springy one", and Snappy says most things use the
springy one. That is a preset expressing a personality by assigning a role, and
it is the opposite of a vocabulary failure. Shared Vocabulary argues that values
which cannot be named cannot be systematized. Naming one curve for two roles is
the system working.

## The rule that shipped

Note when the distance is above zero and under the bar.

Distance zero is an alias somebody chose. The visualizer feeds continuous pixel
coordinates into those handles, so landing on an identical four numbers by
accident does not happen; a reader gets there by clicking a preset button into a
second slot, which is a decision. Distance above zero but under the bar is two
curves that drifted into one shape, which nobody chose: somebody hand-tuned
enter until it happened to land on standard, and the set now carries two roles
that behave identically without saying so. That is the duplicate-values smell in
motion terms, and the only half of it that is a smell.

The presets' closest non-identical pair is 0.1797, thirty-five times the bar, so
the shipped sets stay silent by a wide margin and the smoke check passes without
being written around them.

One note, severity `note`, in the existing Notes section:

```
ease.standard and ease.enter draw the same curve, within the separation a
recording can resolve. Two names, one shape.
```

## Where the pieces live

`curveDistance`, `bezierY` and `CURVE_SEPARATION` moved into `cadence-tokens`,
so Measure and the audit read one number and one implementation. Measure imports
them back and re-exports `bezierY`, because its fixture suite reads it from
there and that suite is frozen ground truth from the item 8 spike. It passes
unchanged, which is the proof that Measure's answers did not move.

The comment on `CURVE_SEPARATION` carries the corridor, so the next person to
consider moving it can see what it is holding apart.

## Verification

943 unit tests, eight new: the three presets silent, an exact match silent, a
pixel of drag noted, a 0.1 move ignored, all four slots covered, two overshooting
curves compared correctly, an unresolvable slot skipped rather than reported
twice, and the bar itself pinned with the corridor around it.

On built output: the Enter slot filled from the Standard preset button reports
nothing, and one drag of a control point from there brings the note up.

## What this is worth saying

A separation tolerance measured from screen recordings of a button transferred
cleanly to a comparison of two authored curves, and the first thing it found was
that two of Cadence's own presets alias a curve on purpose. The bar was fine.
The question needed narrowing.
