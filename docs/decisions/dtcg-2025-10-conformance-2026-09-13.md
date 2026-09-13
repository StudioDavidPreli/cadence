# DTCG 2025.10 conformance: a duration stops being a string (2026-09-13)

The first of the audit upgrades, and the smallest one. The token file Cadence
hands an engineer now conforms to the interchange format their pipeline reads,
in the one place it had fallen behind.

## What the spec says

Read from the source on 2026-09-13: the Design Tokens Format Module 2025.10 at
`https://www.designtokens.org/TR/2025.10/format/`, published 28 October 2025,
a Final Community Group Report the group calls stable. It is a Community Group
report and not a W3C Standard, and the live drafts at `/TR/drafts/` carry a
do-not-implement warning, so 2025.10 is the thing to target.

On a `duration` leaf the spec is explicit: the value must be an object carrying
a numeric `value` and a `unit` of `"ms"` or `"s"`. The bare `"100ms"` string an
earlier draft allowed is not permitted.

Everything else Cadence emits already conformed. `cubicBezier` is the
four-number array. `number` is a JSON number. No group or token name carries a
`$`, a `{`, a `}`, or a `.`; the dotted paths in the flat file and in the
deviation `token` field are Cadence's own notation, not DTCG names. The
`$extensions` key is reverse-DNS, `com.davidpreli.cadence`. Two absences hold
as well. There is no spring type in 2025.10, so the three spring parameters stay
`number` leaves under a `spring` group, as the case study already records, and
the spec defines no `$schema` or root version marker, so the file carries
neither. Nothing was invented to fill either gap.

## The change

`toDtcgDoc`'s duration helper wrote `` `${ms}ms` ``. It now writes
`{ value: ms, unit: 'ms' }`: for the duration family, for the delay family (a
delay is a duration measured from a trigger, and DTCG has no delay type), and
for the deviation leaves that ride in `$extensions`. Always `ms`, never `s`.
The CSS file, the flat file and the DTCG document then read in one unit, which
is most of the point of shipping several formats off one state.

Nothing else moved. The flat, CSS, Framer Motion, After Effects, Flow, Rive and
Figma emitters read `stateToExport`, not the DTCG document. The `"150ms"` in
the flat file is that file's own convention, and the flat file is not a DTCG
file.

One small tidy came with it: the predicate `family === 'duration' || family ===
'delay'`, which appeared in four places, is now a named set, `TIME_FAMILIES`.
The two families that carry time are the two that convert between the runtime's
seconds and the file's milliseconds, and the two DTCG types as `duration`. One
fact, one name.

## What import accepts

Three shapes, on purpose. The 2025.10 object. The string every DTCG file
Cadence wrote before today carries. And a bare number, for a file somebody
typed by hand. Export emits one shape and import reads all three, so no file
the tool has ever produced stops loading. A `"s"` unit converts to milliseconds
through `secondsToMs`, the rounding helper the deviation path already used,
because 0.4 times 1000 is 400.00000000000006 in JavaScript.

`readScalar` takes a `timeValued` flag rather than sniffing the shape it finds.
Only duration and delay are typed `duration`; scale, spring and the duration
scalar are `number`, and a `{ value, unit }` object sitting on one of those is
a broken file, not a duration in disguise. The caller knows the family, so the
caller says. An unknown unit and an object on a number leaf each throw an
`ImportError` naming the leaf, and the boundary returns `{ ok: false, error }`
the way it always has.

## Why 2.0.0

A consumer that parsed `"150ms"` breaks on the object. That is what major is
for. `cadence-tokens` goes 1.0.0 to 2.0.0. `buildTokensDocument` reads the
version from the package, so the generated `dist/cadence.tokens.json` picks it
up on the next `npm run generate`. The publish is David's.

## Verification

Unit: 921 tests pass at the root, seven of them new. They pin the object on
every duration and delay leaf, the round trip, a `"s"` leaf read as ms, a
legacy string file loading with an empty report, an unknown unit throwing with
the leaf's path, an object on `scale.lift` throwing, and a deviation leaf
importing to the same override from either shape.

Built output: the full Playwright suite against `wrangler dev` on the compiled
bundle, 118 passed, one skipped, one flake in rivLint's pixel compare that went
green on its retry and touches none of this. The off-system spec drives the path
end to end, exporting a DTCG file with two deviations from a real Token Lab
session, reading the object form off the download, and importing the file back
with one deviation deliberately left in the old string form, so legacy
acceptance is proved on the minified bundle rather than in a unit test.

`npm run generate` in the package, and the embedded per-preset trees in
`dist/cadence.tokens.json` carry `{ "value": 100, "unit": "ms" }` with no
`$schema` anywhere in the file.

## Left alone

`docs/case-study.md` says "the DTCG draft has no spring type" in two places.
The claim is still true of 2025.10, but "draft" is now the wrong word for a
stable release. That is David's prose and his call.
