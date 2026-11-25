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

## The description moves into the box (David, 2026-11-25)

The page loses its lede. The description is the first row of the guidance
box, in the box's own type (13 px, muted), above the three instructions. Two
clauses were cut with the move: "it takes the timing and nothing visual",
and the sentence that the frame wears Cadence's colors here and the full
sheet its own. The link out is now "Link to the full sheet." The page no
longer says in words why the frame is in Cadence's palette; the sheet shows
Basis's own.

## Settled at kickoff (David, 2026-10-14), still standing

- **Nav order.** Token Lab, Principles, Motion Tiles, In Practice,
  Glossary, Tools. The header opens to its first leaf, as Tools opens to
  Measure.
- **A theme switch reloads the frame.** No message channel exists to
  repaint it in place. The cost is the visitor's current sort order.
- **No high-contrast note.** The description said the frame wears Cadence's
  colors here and Basis's own at its address, which covered the HC themes.
  *(That sentence was cut 2026-11-25; there is still no note.)*
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

## CLNDR, the second leaf (David, 2026-11-25)

The studio's booking calendar, live at `https://calendar.davidpreli.com`, framed
from `/embed/booking`. It takes the same three parameters by the same names as
Basis. It takes real bookings, with the same checks and emails as the real
page. The contract is `docs/embed.md` in the booking-calendar repo.

**Decided by David:**

- Second in the nav, under Basis. `#/in-practice` still opens Basis;
  `#/in-practice/clndr` is the leaf. Label "CLNDR".
- The page is 976 px at most with 48 px each side, so the title, the guidance
  box and the frame are 880 together when there is room and keep the 48 below
  that. Basis's page stays 880. Under 720 px the page takes Basis's narrow
  padding (`composes: page`).
- No lede. The first row of the box is David's line, not bold, with the link out
  on `[here]`, in a new tab. The other three rows are the workflow. The second
  says a reload clears the form; the third says Book makes a real booking.
- The title is `clndrTitle.riv` (artboard `clndrTitle`, 920 by 355, its own box
  class), accessible name "CLNDR, studio booking". Its posters are final: the
  thin grid in them is in the art, and the live title draws it on a 2x screen
  and loses most of it on a 1x one.
- Nothing local may frame the calendar. A Cadence on `localhost` shows a refused
  frame, by design.

**How it is built:**

- A product is an entry in `inPracticeModel.js` (origin, embed path, link out)
  and `embedSrc(product, state)` builds any `src`. `frameSrc` is Basis's, kept as
  its tests call it, and its output is pinned byte for byte.
- `PracticePage` is the page both leaves are, and `PracticeTitle` the title both
  use. A leaf is its words, its title and its entry. The alternative, a copy of
  Basis's page, would have put the loading and consent rules in two places.
- The "View motion" consent is each leaf's own, for the visit.
- Both leaves mount on first visit and then hide, so both frames stay alive.
- A preset, theme or motion change while a leaf is hidden loads nothing until
  the leaf is shown again, in Chromium, WebKit and Firefox (`loading="lazy"` on
  a frame with no box). The 2026-10-14 text above says the reload happens while
  hidden; it does not. Changing presets elsewhere does not ask the calendar
  anything.
- Both alive, measured in Chromium on a Mac with Metal, the calendar a
  stand-in: the page's renderer held 285 MB on the Glossary with neither
  visited, 367 with Basis, 453 with both, 464 with both hidden. The GPU process
  held 151, 154, 175 and 176. Cadence stayed at 60 frames a second, its main
  thread 21 to 27% busy. The three sites are one site to the browser, so they
  share that one process.

**The frame's width** picks the embed's layout, with breaks at 560 and 660 px,
so the e2e pins it:

| Window | 1000 | 1120 | 1280 | 1360 | 1440 | 1536 | 1600 and up |
|---|---|---|---|---|---|---|---|
| Frame | 476 | 420 | 580 | 660 | 740 | 836 | 878 |

1280 is 20 px over a break and 1360 is exactly on one. A change of the column
that moves them moves the calendar's layout; tell the calendar repo. Windows
under 1000 px give frames of 322 to 497 px, which the calendar's contract does
not cover below 420.

**Tests.** `e2e/in-practice-clndr.spec.js` is its own file, so Basis's spec is
untouched. It answers `calendar.davidpreli.com` itself in every test: a refused
frame still sends a request. The live check is in `e2e-live/` and runs against
the deployed Cadence only. It looks and presses nothing inside the frame:
pressing a day loads Cloudflare's script and opening the form runs the real
Turnstile. Four loads in series, because the zone blocks an address after 15
requests in 10 seconds.

Cadence must never narrow the frame: no `sandbox`, no `credentialless`, no COEP,
and any future `frame-src` names `https://calendar.davidpreli.com` beside Basis.
