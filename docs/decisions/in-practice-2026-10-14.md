# In Practice: Cadence in other products

Decision record for the In Practice category (`#/in-practice`,
`src/components/InPractice/`), opened 2026-10-14 before any code and
reshaped by David on 2026-10-15, still before any code. The scope decisions
were David's on 2026-10-14, made in the Basis embeds review; the kickoff
answers came the same day; the reshape below supersedes four of them and is
marked where it does. The running record is the tracker's In Practice
section.

## What it is

A nav category like Tools. Its header opens to a list of products running
on `cadence-tokens`, one leaf each, and each leaf is a page on the Measure
and rivLint pattern: a Rive title loop, a description, and in place of the
tool, the product framed in use. Basis is the first leaf.

Basis (`basis.davidpreli.com`) is a sourced-data product built on
`cadence-tokens@2`, the first consumer of the package outside this repo. It
takes the tokens and nothing visual. Its page frames a simplified Basis
view, a chart over the ledger, and the frame runs whichever preset the
Token Lab tool bar has loaded. Token Lab shows a token moving a demo Cadence
built for the purpose. This page shows the same values moving a chart and a
table someone has to read.

The frame is cross-origin. Basis sends `frame-ancestors 'self'
https://cadence.davidpreli.com http://localhost:8787` on its embeds and
refuses framing everywhere else. Cadence's `public/_headers` sets no
`frame-src`; if one is ever added it must name
`https://basis.davidpreli.com`.

## Scope (David, 2026-10-14; 1 and 2 revised 2026-10-15)

1. **One frame, driven by the tool bar.** *(Revised.)* The 2026-10-14
   decision was a full-width `table-sort` frame with its own Standard /
   Snappy / Cinematic switcher. The presets already exist in the tool bar,
   so the page does not restate them: the description says the frame
   follows the tool bar, and the frame reloads with the tool bar's preset.
   Three frames side by side stay rejected on width and weight.
2. **A top-level category.** *(Revised.)* Its own `SECTIONS` entry and
   route, as decided, but a category with leaves like Tools rather than a
   single page, and no section title in the demo area: the leaf's Rive
   title is the page's title. Not Token Lab › Embeds, which is defined as
   demos that answer the token reducer; a Basis frame answers nothing.
3. **Cadence's colors.** The frame passes `?theme=cadence-*` and Basis
   paints one of four embed-only stocks restated from `color.css`. Company
   inks stay Basis's. Chosen over mapping to Basis's own two stocks; the
   cost is an exception in Basis's own rules, recorded there.
4. **Reduced motion.** Under `prefers-reduced-motion` the frame loads with
   `reduce=1` and the page offers "View motion"; a press reloads with
   `reduce=0`. Without a preference, `reduce` is omitted.
5. **Presets only.** No `postMessage`, no sort trigger from the parent, no
   live token values. Only a preset name crosses into the frame. The
   visitor sorts inside it.
6. **Two kinds of test.** The pre-push suite asserts the frame `src` and
   never needs Basis to be up. A separate spec checks the framed content
   against live Basis, on demand and before the visual pass.

## The reshape (David, 2026-10-15)

- **The graph belongs in the frame.** It is the context the sort runs in.
  `/embed/table-sort` charts nothing ("Selection works and charts nothing",
  Basis's `stage.tsx`), so Basis builds a new embed: a simplified chart
  above the ledger, from a frozen fixture snapshot committed in Basis, with
  no refresh and no provenance requests. That is a Basis session's work
  (brief: `docs/briefings/IN_PRACTICE_BASIS_CHART_EMBED_HANDOFF.md`);
  Cadence builds against the agreed path and its pre-push suite never needs
  the embed to exist.
- **Custom holds the last built-in preset.** Basis takes only Standard,
  Snappy and Cinematic. When the tool bar reads Custom (an edited slider, a
  saved user preset), the frame keeps the last built-in preset the visitor
  loaded, Standard on first entry. Loading Snappy and then nudging a slider
  neither reloads the frame nor drops it back to Standard. *(Supersedes
  kickoff answer 2, "always opens on Standard".)*
- **The tool bar stays open.** Measure and rivLint rail it; Token Lab does
  not. The description points at the presets, so they stay on screen beside
  the frame. The content column is then 574 px wide at a 1000 px window,
  678 at 1280, 838 at 1440 (measured on the live site, 2026-10-15), so the
  embed is designed for that range, not the ledger's 900.
- **The title exists.** David's `public/rive/basistitles.riv` with posters
  `public/fallBacks/basisTitle{DarkMode,LightMode,ContrastLight,ContrastDark}.svg`,
  on the display-title convention (four authored per-theme instances of
  `BasisTitleVM`, state machine `basisSM`). *(Supersedes kickoff answer 1,
  "text title until the art exists".)*

## The chart embed lands (2026-10-15)

Basis shipped `/embed/in-practice` (Basis `bbacfa4`): four companies' Level
over one year, charted over the ledger, from a frozen fixture snapshot dated
on the stage; the four charted rows are selected and locked, a row and its
line light together, and the sort never touches the chart. It is 820 px tall
at every width from 560 to 880 px. Cadence moved `BASIS_EMBED_PATH` to it,
set the frame to 820 px, and deleted the chart stand-in that had held the
layout while the frame still loaded `table-sort`. The live spec now also
checks that the chart draws and that the stage does not scroll inside its
box.

## Settled at kickoff (David, 2026-10-14), still standing

- **Nav order.** Token Lab, Principles, Motion Tiles, In Practice,
  Glossary, Tools. The header opens to its first leaf, as Tools opens to
  Measure.
- **A theme switch reloads the frame.** No message channel exists to
  repaint it in place. The cost is the visitor's current sort order.
- **No high-contrast note.** The description says the frame wears Cadence's
  colors here and Basis's own at its address. That covers the HC themes.
- **The frame outlives the category.** In Practice is the first section
  that stays mounted after the visitor leaves it. The right region was a
  ternary and every section change a teardown; the Tools leaves persist
  only while Tools is open. A frame is a whole Next app, and the remount
  rule written for Rive canvases applies with more force. Each leaf mounts
  on first visit, sits beside the section ternary, and hides when another
  section or leaf is active. Chrome throttles a hidden cross-origin frame,
  so the standing cost is memory, not frames. The tool bar's preset can
  change while the page is hidden, and the frame reloads then; that is the
  same reload the visitor would get on return, moved earlier.
- **"View motion" holds for the visit.** React state, surviving preset,
  theme and section swaps, ending with the page. Never stored.

## The frame URL is a pure function

`inPracticeModel.js` builds the `src` from `{ preset, theme, reducedMotion,
consented }`, and a second pure function resolves the preset from the tool
bar's active id and the last built-in seen. The pre-push spec reads the
attribute the page rendered and compares it to the same function's output.

| Cadence theme | `?theme=` |
|---|---|
| `light` | `cadence-light` |
| `dark` | `cadence-dark` |
| `high-contrast-light` | `cadence-hc-light` |
| `high-contrast-dark` | `cadence-hc-dark` |

| `prefers-reduced-motion` | consented | `reduce` |
|---|---|---|
| no | n/a | omitted |
| yes | no | `1` |
| yes | yes | `0` |

## What it does not do

- It does not request anything from Basis before the leaf is first
  entered. The landing and every other section stay off that origin.
- It does not read a `--motion-*` token, and it does not restate the
  preset switcher. The tool bar is the only control.
- It does not quote a number from the frame, though the snapshot is now
  fixed. The full sheet, linked from the description, is live.
