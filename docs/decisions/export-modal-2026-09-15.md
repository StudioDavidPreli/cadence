# The export modal

**Date:** 2026-09-15
**Status:** Built. Unit and e2e verified on built output. David's visual pass pending.
**Tracker item:** "Filed 2026-09-05, the export modal."

## The problem

Token Lab's Export section was a four-segment toggle (DTCG, Flat, CSS, FM) with
Export and Copy beneath it, in a 300px tool bar column. The toggle had already
clipped its fourth segment once (the FM restack, 2026-07-21). The package
gained two more emitters after that, After Effects and Flow, and both take
state, so "export your tuned values as a script for the rig" was one wire away
from shipping and had nowhere to go. Six abbreviations in one row was not a
design anyone would defend, and a format chosen from an abbreviation with no
sight of the file is a guess.

## What was built

**One table.** `src/components/TokenLab/exportFormats.js` names the six
formats: key, label, a one-sentence description, filename, mime, the Prism
grammar the preview uses, the wire name the counter records, whether the file
reads back in, whether the off-system appendix rides it, and the stringifier.
Before this the same knowledge sat in five places (the toggle, an `exportText`
chain, a filename map, a wire-name map, and a second stringifier list in the
capture rig with the language added). Every surface reads the table now: the
modal, the tool bar, the rig, and the tests.

**One dialog.** `src/components/ExportModal/` renders the table as a format
list beside a highlighted preview of the selected file, then a line naming what
the file is of and whether a deviation rides it, then Export and Copy. The
preview is the output of the real stringifier for the live state, and an e2e
asserts the pane's text equals the download's bytes. Viewport-anchored, since
the tool bar is outside the demo column; `chrome`, for the reason the import
and audit reports carry it (a dialog handing over a token set must not be timed
by that set); and a new Modal prop, `wide`, lifts the 420px cap to 760px so the
preview has a column. The selected format persists across opens for the
session.

**The tool bar.** The Export section keeps the audit line and one button,
"Export…", whose ellipsis says a dialog follows. Nothing downloads from the
tool bar any more.

**The label.** The After Effects script is headed with the active preset's
name when the set matches one and "Custom" when it does not, the same rule the
audit's heading uses (`auditLabel`). A script headed "Standard preset" that
retimes a comp to something else would misdescribe itself. The script's header
also names the package version, read from the package manifest rather than
restated, so a version bump cannot leave the shipped script claiming an older
one.

**The counter.** The Worker's allowlist gains `after-effects` and `flow`. The
tracker's filing said `ae`; the wire names follow the endpoint's existing
convention (`json`, `framer-motion`), which is spelled out rather than
abbreviated so the metrics report reads without a decoder ring. The table's
test reads the Worker source and pins the two lists to each other, the way the
After Effects emitter's test reads the rig.

**The deviation note.** After Effects and Flow do not carry the off-system
appendix: the script writes a control layer and the library is a curve set,
and neither has a place for "this one demo declined the token". The table
says so per format, and the modal tells the reader beside the file rather than
letting them assume a deviation travelled when it did not.

## Decisions

- **A preview, not just a list.** The tracker asked for a modal where the user
  selects the format. The preview was added because the modal's reason to
  exist is focus, and a reader who can see the file needs no description of
  it. It cost a `wide` prop on Modal and one Prism grammar registration (json)
  in the app bundle; prism-css-extras stays out, per the rig's notes.
- **Buttons with aria-pressed, not a radio group.** The old toggle's contract,
  kept. A `radiogroup` would owe arrow-key navigation, and six focusable
  buttons in a column are the plainer contract for a list this short.
- **The picker is its own component.** The capture rig's export scene renders
  the same list the modal does, so the footage shows the shipped control. The
  rig lost its private four-entry format table in the same change.
- **The download helper moved.** `downloadTextFile` lived in TokenLab and the
  modal needed it; exporting it from TokenLab would have made a cycle
  (TokenLab imports the modal). It is a util now.
- **The preview fills the list's height.** A grid row sizes to its content,
  and a 147-line DTCG file would size the row to itself. `contain: size` on
  the preview box makes it contribute nothing, so the six-item list sets the
  row and the preview stretches to match and scrolls inside. The stacked
  layout under 640px gives the box a fixed height, since a size-contained box
  with nothing to stretch against is zero tall. (That breakpoint is below the
  mobile gate, so in practice the columns never stack; the rule is there so
  the component is correct on its own.)
- **Two light-theme misreads, caught on the theme pass.** The filename and
  the subject line were on `--color-text-primary`, which in light and HC-light
  is the text role for the dark interactive surface (near white), so both
  vanished on the page ground. Moved to `--color-text-base`. The role's
  comment in `color.css` says exactly this; the dark theme hid it because both
  roles are the same value there.
- **The Figma option is not here.** The tracker's item 7 filed a
  state-parameterized `buildFigmaVariables` as the export modal's Figma
  option; the modal's own filing named six formats and Figma is not among
  them. The table is where it would go, and nothing else would change.

## Verification

- Unit: 985 pass, including `exportFormats.test.js` (six formats, unique
  names, wire names pinned to the Worker source, the two interchange formats
  round-tripping through `importTokens`, the deviation appendix on exactly the
  four formats that carry it, the AE header's label and version) and the
  Worker's widened allowlist matrix.
- e2e on built output, `e2e/tokenlab-export.spec.js`: six formats each
  download under their own file name with a per-format signature; the preview
  text equals the download; the AE script reads "Standard preset" until a
  slider moves, then "Custom preset", with the format choice surviving the
  close; the counter receives `after-effects` and `flow`; the deviation note
  reads "rides this file" on DTCG and "do not ride this format" on After
  Effects. The reduced-motion e2e in `tokens.spec.js` now goes through the
  modal. The a11y and keyboard specs pass with the new dialog present.
- Screenshots on built output at 1280px, dark and light, DTCG and After
  Effects: the list and preview at equal height, the filename and subject
  legible in both themes after the text-role fix.
- David's visual pass: pending, before commit (the standing rule).

## Files

- `src/components/TokenLab/exportFormats.js`, `.test.js` (new)
- `src/components/ExportModal/index.jsx`, `ExportModal.module.css` (new)
- `src/utils/downloadTextFile.js` (moved out of TokenLab)
- `src/components/TokenLab/index.jsx` (ExportSection shrunk, modal mounted)
- `src/components/Modal/index.jsx`, `Modal.module.css` (the `wide` prop)
- `worker/index.js`, `worker/index.test.js` (two wire names)
- `src/caseStudyMedia/captureRig/ExportFormatsScene.jsx` (onto the table)
- `src/components/TokenLabGuide/index.jsx` (the export paragraph)
- `e2e/tokenlab-export.spec.js` (new), `e2e/tokens.spec.js`
