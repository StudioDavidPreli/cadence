# The audit ships with the set (2026-09-13)

The last of the audit upgrades, and the one that is almost entirely a question
of ownership.

## Why

The audit is Cadence's judgment about a token set, written for the engineer who
receives the set. It ran only inside the tool, which meant the person it was
written for had to come back to a website to hear it. A check is worth more
where the work happens: in their repository, in their CI, on the file they were
handed.

The function was already pure and already took state, because the August record
built it that way on purpose (one implementation, two surfaces: the live sliders
and an imported file). Moving it was mostly a matter of deciding whose it is.

## The layering fix, which had to come first

`tokenAudit.js` imported the spring math from
`src/components/SpringVisualizer/springCurve.js`, a leaf layer reaching up into
`components/`. Its own header named that as a direction it would rather not have
and left it alone, because the spring math had one owner and the audit was its
second reader rather than its new home.

Shipping the audit in the package turned that from untidy into impossible. So
`springCurve.js` moved into `packages/tokens/src/`, with its tests, and the
package re-exports it. It imports nothing at all, by design, so it moved clean.
The handoff listed four site importers; only two were real
(`SpringVisualizer/index.jsx` and the audit itself), the other two only mention
the file in comments.

The site's visualizer now imports the math from the package, which is the same
arrangement every other piece of shared token math already had.

## What moved

`src/tokens/tokenAudit.js` to `packages/tokens/src/audit.js`, with its tests. The
package index exports `auditTokens`, `auditToMarkdown`, `auditSummarySentence`,
`THRESHOLDS` and `NIELSEN_RESPONSE_MS`. Token Lab and the report component import
them from `cadence-tokens` like everything else. No shim was left behind in
`src/tokens/`, which now holds only the stylesheets, the CSS value parser, and
the two guards that read them.

The API is the one settled before any of these items were built:
`auditTokens(state, { deviations })`, an options object, so what A4 added and
whatever comes next can join without breaking a caller.

## The cycle, and where the re-export sits

`audit.js` imports its inputs back from `index.js` (the named curves, the
editable schema, the curve metric, the reduced-motion resolution) while
`index.js` re-exports `audit.js`. That is a cycle, and a cycle is only safe
while everything it reaches has already been initialized.

Nothing in `audit.js` reads those bindings at module level today; its two
top-level constants are literals. So the order does not currently matter. The
re-export sits at the very end of `index.js` anyway, after every declaration, so
that it cannot start to matter later. The comment there says why, because the
next person to tidy the file into alphabetical order would otherwise be one
edit away from a load-order bug that only shows up at import time.

## What the README example taught

The handoff's example pointed at `dist/cadence.tokens.json`, and it does not
run. That file is the combined document carrying all three presets at once,
which is a different kind of artifact and not something `importTokens` reads.
The example was corrected to name what an engineer would actually have: a file
somebody exported from Token Lab, in the DTCG or the flat shape.

This was found by installing the packed tarball into a scratch directory and
running the example as a real script, which is also what proved the `files` list
is complete. The output carried A2's off-system section and A4's reduced-motion
measurement, so the whole chain works from a clean install rather than from the
workspace link.

Worth noting rather than fixing here: the package ships a `cadence.tokens.json`
that its own `importTokens` rejects. The two files have different jobs and both
names are defensible, but a reader could reasonably expect the package's own
document to load. Out of scope for a move that was supposed to add no rules.

## What did not change

Every number the audit produces. 961 unit tests pass before and after, the same
count and the same assertions, because the tests moved with the module and none
of them needed editing beyond their import lines. The site's audit modal, its
tool bar line, and the downloaded markdown are identical.

## Verification

Root and package unit suites green, with the moved tests in their new home and
nothing left in `src/tokens/` importing a moved module. `npm pack --dry-run`
lists `src/audit.js` and `src/springCurve.js` beside the index. The packed
tarball installs into a clean directory and the README example runs against a
real exported file. Build clean, full Playwright suite on built output.

Package stays at the unpublished 2.0.0, which now carries all four upgrades. The
publish is David's.

## Out of scope

A CLI: the README example is a script the reader writes. Any new rule: this move
carries A2's section and A4's measurement and nothing else. Publishing.
