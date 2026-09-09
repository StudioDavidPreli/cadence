# Off-system edits: the snippet becomes an input (2026-09-09)

The record of the Token Lab code view learning to take a value, and of what
the tool does when a component stops obeying the system. Written as a
case-study source.

## Where it started

David asked about a DRUIDS-style code sandbox for the components, the kind of
docs page where a rendered example sits over an editable block of source. Most
of one was already on the site. The Token Lab code view showed the source
behind each demo with live resolved values that ticked as a slider moved. The
Glossary generated a page per component. The Framer Motion export emitted a
pasteable module. The one thing missing, in his words: the only way to change
a value was a control in the tool bar. The snippet was an output that happened
to be text.

The generic answer would have been a full JSX sandbox, react-live or Sandpack.
Both were declined before any code. react-live puts a transpiler in the bundle
and runs the reader's code through the equivalent of `new Function`, which
forecloses a `script-src` policy without `'unsafe-eval'`. Sandpack bundles in
an iframe served from an external CDN, which contradicts the posture Measure and
rivLint had just established (nothing leaves the page) and would need the
token layer re-injected across the frame. Both add a runtime dependency, which
the V2 build order forbids.

What made the smaller version the better one is the core rule. A sandbox is an
invitation to type `duration: 0.3`. On any other docs site that is fine. Here it
is the exact bug the token-integrity gate exists to catch and the exact lesson
the TokenFidelity principle teaches by contrast. So the sandbox had to take a
position on literals, and that position became the feature.

## What an edit means

Two readings of "edit the snippet" teach opposite things. The snippet could be
a second control surface: type into the resolved comment and the slider moves.
Harmless, and it adds nothing the slider does not already say. Or the snippet
can take the component off the system: replace `tokens.duration.fast` with a
literal and that demo alone retimes, the slider stops driving it, its connection
border drops, and the code view names the drift. The second is the one built.
Token Lab used to show what a system looks like when every component obeys it.
Now the reader can break one component and watch the difference: one demo
drifts while the rest retime together.

David's three additions at the gate, in order: an undo in the snippet window; a
visible warning, a comment in the code block; and off-system values still
export. A preset load resets every demo, because a preset is a whole system.

## The mechanism

The override is per demo and per token PATH, not per line, and this is the
decision that kept every component untouched. A component reads its tokens
through one provider, so a path can only resolve to one value inside it.
DemoWrapper re-wraps a detached demo's body in its own `MotionTokensProvider`
carrying the live tokens with the literals written over them (`patchTokens`),
and the Button's source, which reads `tokens.duration.fast` like any other,
resolves this demo's value without knowing it is off-system. The gate still
passes: no component gained a literal. The cost is honesty of a slightly
surprising kind: Button reads `duration.fast` twice (the press and the
release), so typing a literal at one read shows it at both, because that is
what the component now runs. The file comment in `offSystem.js` says so.

The state is `{ [componentName]: { [runtimePath]: value } }` in Token Lab,
beside the reducer and never inside it, so `stateToTokens`, the presets, the
drift guard and the package know nothing about overrides. The dispatch wrapper
that already bumps the preset epoch on `LOAD_PRESET` and `RESET_TO_DEFAULTS`
clears the set in the same branch. `DemoOverridesContext` carries it down to
the two consumers, because DemoWrapper is rendered by a dozen demo functions and
CodeBlock sits two components below it. Outside Token Lab the context is null,
which is how the QuoteBlock code views on the principle cards stay read-only.

Editing is click-to-edit on the read itself, not a free textarea over the
transition object. Click `tokens.duration.fast`, an input replaces it prefilled
with the current value, Enter commits, Escape cancels, blur commits a valid
draft and cancels an invalid one. The parser accepts one number or a
four-number curve and bounds it to the Explore ranges, which is what makes
ADOPT exact: an accepted literal is always one a slider can show, so adopting
never clamps. An invalid draft stays open and the comment row says why, in
place of the value.

Splicing the editor into a Prism-highlighted line: the tokenizer's runs are
walked with a character cursor, and inside a read's range one element is
emitted at the first character and the rest skipped. Text outside ranges
renders exactly as before.

## The comment and the two words

The off-system comment reuses the mechanism the code view already had, the
live-value row under a read, for its opposite case. Three phrasings:

    // off-system: 0.25s, nearest duration.base (0.2s)
    // off-system: matches duration.base today
    // off-system: nearest ease.standard

"Today" is the Token Fidelity lesson in one word. A literal that equals a token
now is still not the token, and drifts the moment the token moves.

The green chip never lights for a literal, because nothing connected changed.
That absence is part of the signal. So is the connection border: while a
slider for an overridden path is dragged, the demo takes a fourth DemoWrapper
state, `detached`, its border stays down, and a muted note replaces the
instruction: "Off-system in this demo. The slider no longer drives it." Muted,
not amber, because the demo is not warning, it is reporting a state the reader
chose.

Then the two actions, David's spec verbatim: a separate class for each, the
size of the comment text, red and green respectively including their brackets,
not buttons that animate at all, the pointer the only affordance.
`[RECONNECT]` restores the token read. `[ADOPT]` moves the token to the literal
through one reducer action, so every consumer follows, and drops the override
so the demo reads the token again at the value it was running. Two one-click
resolutions in opposite directions; the reader picks which the value deserved.
If the adopted value sits outside the constrained slider range, Explore mode
comes on, the way import does, so the slider can show where the token went.
Adding a new named key was not built: the families are fixed and both the drift
guard and the package's completeness test assume it.

Red and green in all four themes was David's call, which means two new color
roles rather than reads of the per-theme accent (green only in dark; purple in
light, amber in HC-light). `--color-reconnect` and `--color-adopt`, text on
`--color-bg`:

| Theme | Reconnect | Ratio | Adopt | Ratio |
|---|---|---|---|---|
| dark | `#e5766a` | 6.3:1 | `#76c17d` | 8.5:1 |
| light | `#b8322a` | 5.5:1 | `#2a6e34` | 5.7:1 |
| high-contrast-light | `#9a2418` | 8.0:1 | `#1f5f2a` | 7.7:1 |
| high-contrast-dark | `#ff8a80` | 9.2:1 | `#7ee88a` | 13.8:1 |

The HC values sit away from the syntax hues those themes already use (salmon
keywords and mint strings in HC-dark, rust strings in HC-light) so the brackets
never read as source. The dark green shares the accent's hex on purpose: same
pixel, separate token, so an accent change can never move ADOPT. Ratios
confirmed on built output with computed styles, cycling all four themes.

## Export, import, and the audit

A deviation belongs to a component, not to the token set, so the token blocks
of every export are untouched and each format carries deviations as an appendix
in its own idiom, only when there are any. A clean export is byte-identical to
before, and the package test pins that. DTCG puts them in the root group's
`$extensions` under `com.davidpreli.cadence`, as typed leaves that name their
component; a consumer that does not know the key ignores the block, which is
what `$extensions` is for. The flat file gets a top-level `deviations` list in
its own conventions. CSS gets a trailing comment, since a per-component value
has no place among custom properties. The Framer Motion module gets
`export const deviations`, a list an engineer can read or lint against, with
the runtime path spelling the components use. Each file spells the path the way
its own token documents do (`easing.overshoot` in the token files,
`ease.overshoot` in the Framer module).

Import reads the list back beside the state, never inside it, and Token Lab
restores it as this session's overrides after the preset load that clears
them. The report gains a line: "Restored 2 off-system values." Malformed
entries throw like any other broken leaf; a scalar outside the Explore bounds
clamps silently, because the app bounds a typed literal the same way on entry.
Verified on built output: two literals typed, all four formats downloaded with
the appendix, a Snappy load clearing them, the DTCG file imported back, the
report line, both literals standing again in the Button view.

Not built: the audit dialog listing detached demos. It judges the token set,
and the set is unchanged by a deviation. Worth a row if the feature earns one.

## Verified

Unit: `offSystem.test.js` (parse, format, nearest, comment wording, patch,
adopt action, the override/deviation translation), package tests for the
deviation appendix and round trip (98 in the package, 864 in the suite
including the token-integrity gate). Built output, headless Chromium against
`wrangler dev`: click-to-edit at the second `duration.fast` read shows the
literal at both reads with the comment and actions; a `duration.fast` drag
leaves Button out of the highlighted set and shows the detached note; `fast`
typed into the editor holds the row with "Expected a number."; ADOPT moves the
slider to 250 and the literals back to reads at 0.25s; RECONNECT restores
0.1s; a Snappy load clears everything. Colors read off computed styles in all
four themes. David's visual pass is still ahead of any commit.

## David's pass, same day

The edited stretch gets its plate back. The first build marked an off-system
read only by its literal and its comment; the mock had shown the edited rows on
the block's second surface with a rule down the left, and David asked where it
went. It is back as `.linePlated` on the source row and its comment row (and on
the row holding the open editor), bled to the block's edges, so the stretch
reads as one band even where the comment wraps, which also answers the
wrapped-remainder question: the action pair now wraps inside the band.

ADOPT stays on curves. The tool can reset anything, so nothing gets far, and
the trouble a curve adoption causes is part of the lesson.

The import report names components a file's deviations name that no demo
carries. The consumption map's values are the objective list of demo labels;
a name outside it loads (nothing reads it) and is reported by name, so a typo
in a hand-edited file does not land silently.

An e2e spec, `e2e/tokenlab-offsystem.spec.js`, now pins the loop on built
output as part of the pre-push gate: the edit at both reads, the invalid draft,
the detached state under a drag, ADOPT, RECONNECT, the preset clear, the DTCG
appendix, and the import round trip with an unmatched name.

## Limitations

**One path, one value.** Button reads `duration.fast` for the press and again
for the release, and an override on the path reaches both, so the tool cannot
express a press that runs one value and a release that runs another. That is
not a bug in the override; it is the system's own vocabulary showing its edge.
David's read: the system is saying press and release must share a value, which
is too narrow, and the gap is something the token system needs to grow into.
The direction he named is a way to bypass the token at a specific site and
have the system recognize the site itself, something like "user input @ button
press", which would need components to expose their motion sites by name and
overrides keyed by site rather than by token path. Not built; recorded in the
tracker's future work as its own question.

**The audit does not see deviations.** It judges the token set, and the set is
unchanged by a demo running a literal. A "running off-system" row is a future
row if the feature earns one.
