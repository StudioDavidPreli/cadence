# The scale rename: press in the name (2026-07-21)

The record of renaming the scale token family so a reader can tell direction from
the name. The last of the three 2026-07-08 harmonization deferrals to reach the
code, sequenced ahead of the public style guide so the guide inherits names
nobody intends to change. Written as a case-study source.

## What the old names hid

The family read as four siblings: `scale.subtle`, `scale.base`, `scale.expressive`,
`scale.lift`. Three of them compress below 1 on press. One grows above 1 on lift.
The names carry none of that. `base` reads as the neutral 1.0 it is not: its value
is 0.95, a press. A designer reading the four in a token file has to already know
the values to know which way each one moves.

The rename puts direction in the name. The three press compressions carry "press";
the lift keeps "lift". `base` scoped under press becomes `pressBase`, the standard
press, no longer a word that promises rest. Values do not move. A press that was
0.95 is still 0.95. This is a legibility change, and a diff that touched a value
would be the bug.

## Four forks, David's calls

The kickoff put four decisions in front of David and waited.

1. **The key set.** The straight 1:1 mapping: `subtle → pressSubtle`,
   `base → pressBase`, `expressive → pressExpressive`, `lift` unchanged. The
   alternative dropped "base" and made the middle value a bare `press`. The
   straight mapping keeps the subtle/base/expressive intensity ladder intact under
   a prefix, and it makes the import alias one-to-one, no key doing double duty.

2. **Import of old-named files.** Alias the old keys to the new on import, and
   report the rename. Easing never needed this: a curve canonicalizes by value, so
   a renamed slot re-identifies itself. Scale values are bare numbers with no such
   canonicalization, so under the untouched machinery an old `scale.subtle` would
   fall into the ignored pile and the new `pressSubtle` would fill from Standard.
   The user's tuned 0.91 would vanish and a default would sit in its place, quietly.
   Dropping a value on a rename the user never asked for is the wrong surprise, so
   the alias reads the old value into the new key and names the rename in the report.

3. **The card ceiling.** The 80-character ceiling governs `summary` and
   `componentSummary`, which hold no token names, so the rename cannot reach them.
   Token names live only in the `tokens` field, a wrapping line at the bottom of the
   expanded card. The longest grew from 59 characters to 64. It wraps, it does not
   break. No abbreviation was needed.

4. **The case study.** `case-study.md` names scale tokens and David is mid-edit in
   it. His edit pass absorbs the four references; this session left the file alone
   rather than write into a document being revised.

## The one seam: camelCase key, kebab property

The keys are camelCase, `pressSubtle`, because that is how the state object, the
schema, and the JSON exports spell them. The CSS custom property is kebab,
`--motion-scale-press-subtle`, because that is how `motion.css` spells everything.
The old single-word keys hid this: `base` and `--motion-scale-base` share a
spelling, so every dynamic `--motion-scale-${key}` write happened to land on the
right property. A compound key breaks that coincidence. `pressSubtle` interpolated
into the template gives `--motion-scale-pressSubtle`, a property no consumer reads.

`tokenKeyToCssSuffix` in `motionPresets.js` is the one bridge: it converts the
camelCase key to the kebab suffix, a no-op for every single-word key and the real
work for the three compound ones. Two dynamic write sites go through it, the live
slider write in `syncToCss` and the `toCssVars` export. A unit test pins
`--motion-scale-press-base: 0.95;` in the CSS export so the two spellings can never
drift apart unseen. `writeAllTokensToCss` writes the four names in full, so it
needs no bridge.

## The alias, on both paths

A saved value can arrive two ways, and both migrate. An imported file runs through
`buildState`: when a new scale key is absent and its old name is present, the old
value is read into the new key and a `renamed` line is added to the report.
`collectForeign` learns the three old scale keys are renamed, not foreign, so a
clean import of an old file reports the rename and nothing else. A preset saved in
localStorage runs through `migratePresetScale`, appended to the compose chain
beside `migratePresetScalar`, `migratePresetSpring`, and `migratePresetEasing`,
each of which backfilled a past change the same way. The import report gained a
section for the rename, "Renamed to current keys, values kept", so the user sees
the swap instead of guessing at it.

## The sweep, and what stayed

`lift` never changed, so every `scale.lift` read and every comment that names it is
still true, and the scoped-lift demos (Solid Drawing, Systematization, Reduced
Motion) were not touched. The rename swept the token layer, the schema, the
fallbacks, the component reads (Button, Card, Stepper, Notification Badge, the
Theme switcher, the Water and Wilt scene scale, the pixelPlant amplitude, the
Toggle's `:active` transform in CSS), the code-view snippets, the principle card
strings, the Token Lab control map and slider labels, and the tests. The live
docs moved with the code. The history did not: the decision records, the closeouts,
and the token-map briefings describe what was true when written, so they keep the
old names, and the two briefings that a reader might copy from carry a dated note
pointing at the new ones.

The style guide can publish the family now and never have to take a name back.
