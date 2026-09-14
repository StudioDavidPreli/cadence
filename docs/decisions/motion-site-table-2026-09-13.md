# The motion site table (2026-09-13)

The first half of the per-site motion values question, and the half that could
be built without answering it.

## What was missing

`tokenConsumption.js` says which components read `duration.fast`. Nothing said
where in a component that read happens. Button reads it twice, once for the
press and once for the release, so an override keyed by token path reaches both
and the system says press and release must share a value. David raised that out
of the off-system edit on 2026-09-09, and the tracker has carried it as "Per-site
motion values" since.

The recorded question assumes the answer is a binding mechanism. Before
designing one, something the code says and the tracker entry did not:

```
duration   fast, base, slow, slower          magnitude
delay      short, medium, long               magnitude
scale      pressSubtle, pressBase, ..., lift SITE, with intensity
easing     standard, enter, exit, overshoot  mixed: two sites, a default, a shape
```

`scale` already names sites. A press and a lift are moments, not sizes. `easing`
half does: `enter` and `exit` are moments, `standard` is a default and
`overshoot` is a curve shape. `duration` and `delay` name nothing but magnitude,
and the collapse is in `duration`.

At the Button it is sharper still. Press runs `duration.fast` with
`ease.standard`; release runs `duration.fast` with `ease.overshoot`. The system
can already say those two moments differ, and does, through easing. It cannot
say they differ in time.

## What was built, and what was deliberately not

`src/data/motionSites.js`: 21 components, 64 sites, each with a name, a sentence
saying what moment it is, and the tokens it reads.

It commits to nothing about binding. Three designs are open (a semantic token
tier, site-keyed overrides, or sites as a read-only structure with new
primitives where a site genuinely needs one) and all three need this table.
So do two checks already parked: the audit's shared-literal row, whose identity
is exactly (component, site, path), and choreography coherence, which cannot
compare staggers across consumers without knowing what the consumers' moments
are called. One structure, three blocked things, and building it decides none of
them.

## What a site is

A named moment at which the component runs a transition. Its tokens are every
editable token read to produce that moment: the timing values in the transition
and the animated values in the target.

Two conventions, both taken from the consumption map so the two tables can be
compared. A site lists the union over its branches, the way the map lists a
component under a token its source reads on a branch the demo never triggers.
And paths are in the control-layer spelling (`easing.standard`), not the runtime
spelling components read (`tokens.ease.standard`), which is the seam anything
joining this table to an off-system deviation has to cross.

Two shapes needed a field rather than a fudge. `fixed` carries the reads with no
slider behind them, `ease.linear` and `delay.none`, which the consumption map
excludes by policy and which a timing question about Spinner or Toast still has
to see. `timingFrom` carries a site that has no transition of its own: Card's
dim changes a target under deselect's timing, and calling it a site with no
tokens or folding it into deselect would both have been lies.

## The check that keeps it from becoming prose

The site table and the consumption map are the same fact from two sides, so they
can check each other. `motionSites.test.js` proves that the union of every token
the site table attributes to a component equals that component's row in the map,
in both directions. A site invented out of nothing, a token attributed to a
component whose source never reads it, or a read dropped from either file fails
there.

Which site a token belongs to is authored judgment and no test can check it. It
was read off each component's source, not off the code-view snippets, which are
trimmed by hand and can drift.

## What the check found on its first run

Toast was missing from `duration.fast` and `easing.standard`. Its launch button
runs a `whileTap` reading all three of `duration.fast`, `easing.standard` and
`scale.pressBase`, and only the scale had ever been recorded. Two thirds of that
press were invisible to Token Lab's connection highlighting and to the generated
Glossary, and had been since the map was rebuilt in the 2026-06-20 Token Fidelity
audit.

That is the argument for the cross-check in one example. The map's policy has
always been objective and greppable, and it still drifted, because nothing was
answerable to it.

## What it can now say

Fourteen of the twenty-one components read at least one token path at two or
more sites. Not all of those are problems: NavItem's activate and deactivate
share `duration.fast` and should, since the pair is symmetric in time and
differs in curve. Card's select and deselect share `duration.base` deliberately.

The number matters because it was a guess before. How many sites actually want a
value the ladder cannot give them is now a question with a list behind it rather
than an intuition, and that list is what the vocabulary decision should be made
against.

## Nothing is wired to it

No UI reads the table yet. It is data and a test, which is what "design first"
meant, and the next move is a reading of that list of fourteen rather than a
mechanism.
