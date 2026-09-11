# One caption slot under each demo

**Date: 2026-09-11**
**Status: complete, verified on built output**

Press ArrowRight on the `duration.base` slider and the Carousel demo lost
fourteen pixels. The Reorder list under it slid up, held there as long as the
slider kept focus, and dropped back on blur. Nothing in either demo had
changed. The slider was driving a token neither of them was arguing about.

## What moved

`DemoWrapper` puts one caption under each demo, chosen from three: the
instruction the demo ships with, the amber note when the active token is one
this demo does not consume, and the off-system note when the demo runs a
literal in place of that token. Only the chosen one was in the DOM. Swap a
two-line face for a one-line face and the demo's box gets shorter.

Measured on the Gesture page at the default viewport, before the change:
Carousel's `.demoMain` 482.4px at rest, 467.9px while `duration.base` held
focus. Reorder's top followed it, 625.59 to 611.09. The only structural
difference between the two reads was the caption.

## Where it came from

The note arrived in `f20071b`, 2026-04-18, replacing a design that dimmed the
demos a token did not reach. Dimming gave no explanation, so the note took the
instruction's place and said why. One caption at a time was the point: two
would be two voices. In April every instruction was one line, so the swap moved
nothing.

On 2026-07-19 the two canvas demos got centered captions with width caps, 340px
for the Water & Wilt stage and 320px for the Carousel, so a caption sat under
its art instead of running the full column. The Carousel's wrapped to two
lines. The note stayed at one. Neither commit had a reason to mention caption
height, and neither did the off-system note that followed the same pattern in
September.

No earlier version stacked the faces. This is not a workaround coming back.

## The slot

All three faces mount, all three sit in one grid cell, one is visible. The row
is as tall as the tallest face, which is the instruction, in every state, so a
swap paints different text into a box that does not move.

The faces hide with the `hidden` attribute and `.demoCaption > p[hidden]`
overrides what `hidden` normally means. The browser's default is
`display: none`, which would drop the face out of the layout and take its
height with it. `visibility: hidden` keeps the box and drops the paint: no
reading order, no pointer, no pixels, and the row still knows how tall the
instruction is. The runner poster went wrong the other way in September, an
author display rule defeating `[hidden]` by accident. Here the override is the
mechanism, and the selector names it.

The three faces keep their own `margin-top: 4px`. Grid items are not flow
siblings, so the margins do not stack and the gap under the demo stays 4px.

Nothing animates. The swap is a hard cut, the way it was. A crossfade was
offered and David turned it down.

## What the always-mounted faces cost

Every demo now carries all three captions in its DOM, so a bare text locator
finds eight copies of the off-system note where it used to find one.
`e2e/tokenlab-offsystem.spec.js` asserted on the note by text; it now filters
to the visible one, which is what it meant to assert anyway. Worth knowing
before writing the next text locator in this tool.

The accessibility tree is unaffected. `visibility: hidden` removes an element
from it without help, so a screen reader still meets exactly one caption.

## Verification

Built output, served by wrangler on 8787, per the standing rule.

- Gesture, stepping `duration.base`: Carousel 482.4px before and after,
  Reorder's top 625.59 before and after. The note swaps in and nothing moves.
- Press & State with a Button running `0.25` in place of `tokens.duration.fast`,
  dragging `duration.fast`: zero geometry change across all eight demos on the
  page, and the off-system note is the only face showing.
- All four states read one `visible` face and two `hidden`, with `display:
  block` on all three. Computed style, not the attribute.
- The centered captions did not drift. Carousel, left 609, width 560, top
  555.59. Embeds, left 609, width 340, tops 631.59 and 1415.99. Identical to
  the same numbers taken off `45c3c52` built and served the same way, once the
  page was allowed to settle. A first read on Embeds caught a lazy demo
  mid-load and reported a top 43px off, which was the measurement moving, not
  the caption.
- The amber note keeps its `accent3` value in all four themes. No color rule
  was touched.
- `npx vitest run` 914 passed. `npx eslint .` no errors. Full Playwright suite
  118 passed, one flaky in rivLint's compare zone that is flaky on `45c3c52`
  too.

`e2e/tokenlab-caption.spec.js` holds three tests: the swap moves nothing, one
face visible and the others still boxes, and the detached note holds the demo
height. All three fail on the build before the change. The first one measures
the Carousel, whose slide canvases size themselves a beat after the chunk
loads, so it waits for two identical reads before taking a baseline. Without
that wait it raced the canvases and passed only on retry.

## Left alone

The Carousel's four slide canvases read 0px tall a second after load and 275 to
281px after a slider edit, inside a track whose height never changes. The
slides are visible the whole time. It is why the new spec waits. Not
investigated.

The notes still sit at the slot's start under a centered instruction, flush
left where the caption above them is centered under its art. That is how they
have always sat, and moving them is David's call to make, not this change's.

`e2e/reorder.spec.js` carries a comment that the column above the list may
reflow on a token change, and that this is not the rows moving. That was this
bug. The test measures the rows' own translates and is right either way, so it
stays as written.
