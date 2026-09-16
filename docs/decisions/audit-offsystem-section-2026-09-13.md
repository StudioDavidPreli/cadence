# The audit says which demos run off-system (2026-09-13)

The second of the audit upgrades. The tool bar used to read "Audit: nothing to
flag" while a demo had just declined the set.

## The defect

Type a literal into a Token Lab snippet and that demo runs off-system: a
deviation, per demo and per token path, held beside the reducer and never inside
it (the off-system edit, `off-system-edits-2026-09-09.md`). The audit judges the
token set, which a deviation leaves exactly as it was, so the tool bar said
nothing to flag, the downloaded `motion-token-audit.md` was silent, and the
token file exported in the same breath carried a `deviations` appendix. Two
documents about one session, disagreeing.

## Why none of it is a finding

A finding is the set contradicting itself. A deviation is a reader choosing to
step outside the set, and the set is unchanged underneath. The detached note
under the demo already takes this position: muted rather than amber, a state the
reader chose rather than a warning. Counting a deviation against a set that did
nothing wrong would be the audit contradicting the demo.

So the severity is its own, `off-system`, beside `finding` and `note`, and the
count rides its own clause. A set can be entirely coherent and still have a demo
running off it, and the report now says both without implying the second is a
fault. David's call, 2026-09-12, along with four others: the set measured
against its own consumers is not a third source of findings; the tool bar line
is where the count goes, because the tool bar line is where the silence was; the
shared-literal entry (two demos on one literal) waits for the per-site motion
values design; and the signature is an options object.

## The shape

`auditTokens(state, { deviations = [] } = {})`. An options object rather than a
positional argument, so A4's reduced-motion resolution and anything after can
join as another key without breaking a caller. The deviations are passed in
rather than read off the state, because they are not part of the token set: the
caller holds them, so the caller hands them over.

`checkOffSystem` runs last, after every judgment about the set, so the report
reads straight down from what the set does to what one demo is doing instead.
Each row names the component, the path, the literal, and the nearest token, in
the code view's own three phrasings:

```
Button runs duration.fast as 0.25s, nearest duration.base (0.2s).
Button runs duration.fast as 0.2s, which matches duration.base today.
Card runs ease.overshoot off-system, nearest ease.standard.
```

"Today" is the Token Fidelity lesson in one word: a literal equal to a token now
is still not the token, and drifts the moment the token moves. A curve names its
nearest and stops, because a four-number array printed twice buries the
sentence.

The nearest token is read from the state the audit was handed, so the same
literal reports differently against a different set. That is the point: the row
is the set measured against one of its consumers, not against a constant.

## What moved, and why it had to

The audit is a leaf layer and must not import upward into `components/`.
`nearestToken` lived in `CodeBlock/offSystem.js`, so it and the arithmetic around
it (`splitTokenPath`, `formatLiteral`, `formatDisplay`, `SCALAR_EPSILON`,
`CURVE_EPSILON`) moved down into `cadence-tokens`, with their tests.
`offSystem.js` imports them back and re-exports the three that were already
public, so CodeBlock and Token Lab are untouched.

The two surfaces now agree on the wording of a value by construction rather than
by discipline. A1's `TIME_FAMILIES` gained a third reader on the way: the set
that decides which families convert seconds to milliseconds, and which DTCG
types as `duration`, is the same set that decides which values print with a
unit.

`auditSummarySentence(counts)` is a second small consolidation. The modal and
the markdown each inlined the same ternary, and this change would have added the
same clause to both. One function, two callers, no way for the wording to land
on one and miss the other. The tool bar's line is a different sentence and
stays in Token Lab.

## The marker

A dash, 6 by 2, in `--color-text-muted`. The other two markers are a filled disc
(finding) and a ring (note) on `--color-text-base`; this is the one that is
muted, following the detached note under the demo for the same reason it is
muted there. Three shapes, no hue, so the sections stay apart at a glance
without color carrying any of the meaning. Measured on built output in all four
themes: 5.77:1 dark, 5.27:1 light, 21:1 in both high-contrast modes, against a
3:1 bar for a graphical mark and 4.5:1 for the caption beside it. No new color
token.

## What the report does not do

It repairs nothing. The section carries one sentence naming Adopt and Reconnect
and pointing back at the code view, which is where both live. An audit that
offered to fix a deviation would be answering a question nobody asked it.

The import report's audit line was deliberately left alone. It is a sentence
about the set the file describes, and the restored off-system values are the
subject of their own line three lines below; giving it the deviations too would
print the same number twice.

## Verification

935 unit tests, fourteen new: the three phrasings, the curve case, the count,
the stable order, the id keyed by component and path, the severity never
reaching the finding count, the shipped presets silent, and the summary
sentence's pluralization.

Built output, the full Playwright suite, with two tests added to
`e2e/tokenlab-offsystem.spec.js`: the tool bar reading "Audit: nothing to flag,
1 off-system" after a typed literal and returning to "nothing to flag" after a
preset load, and the downloaded markdown carrying the section, the row, and the
pointer. The four themes were read off the served build rather than the
stylesheet, because the stylesheet that ships is the minified one.

## Left for later

The shared-literal entry, two or more demos running the same value. It is the
duplicate-values smell in motion terms and the shared-vocabulary argument in the
small, and it waits on the per-site motion values design, where two sites
wanting one value is the stronger statement and the row's identity is settled.
A note when it lands, never a finding.

## Addendum, 2026-09-15: the shared-literal note

Landed once the site table existed and was rendered. `checkSharedLiterals`
runs after the off-system rows: deviations are grouped by family and value
(scalars within `SCALAR_EPSILON`, curves within `CURVE_SEPARATION`, families
never mixed), and any group of two or more raises one note:

```
Button (press, release) and Toggle (flip) run duration.fast as 0.25s off-system. One value in two places is a token that has not been named yet.
Button (press, release) runs duration.fast and Card (select, deselect) runs duration.base as 0.25s off-system. One value in two places is a token that has not been named yet.
Button (release) and Card (select) run ease.overshoot off-system on one curve. One value in two places is a token that has not been named yet.
```

Grouping is by value rather than path because the argument is about the
value: one number under two names, neither a token, is the case Shared
Vocabulary describes. A note, never a finding, per David's 2026-09-12
decision, so it joins the note count and the tool bar reads "Audit: 1 note,
2 off-system" for exactly the case it exists to name.

The row identity the per-site design settled, (component, site, path), is
carried by a new `sites` option on `auditTokens` and `auditToMarkdown`. The
app passes `MOTION_SITES`; the package stays site-agnostic, so an engineer
running the audit in their own CI gets component names and the same judgment.
A deviation is keyed by runtime path and the site table by control path;
`runtimeToControlPath`, now exported from the package, is the one crossing of
that seam. This is the site table's second consumer, after the Glossary.
