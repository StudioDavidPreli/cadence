# Reduced motion, completed across every surface (2026-07-17 to 2026-07-18)

The session record for the work that took reduced motion from one honored media
query to a property of the whole application. Written as a case-study source.
The architecture it builds on is `reduced-motion-2026-05-06.md`; the decisions
made here live in that document's dated addenda. This file is the narrative:
what the question was, what the first build got wrong, and what David's sweep
did to the design.

---

## Where it started

The 2026-07-16 open-items audit carried one line under parked design questions:
three principle demos (Hierarchy of Motion, Economy, Token Fidelity) snapped
under OS reduce-motion while two others kept blanket opt-outs and animated
regardless. The wrap-everything-in-an-opt-out alternative had been documented
since May and never decided. Four themes deep, nobody's call but David's.

David's verdict settled it wider than asked: the principle library's demos are
real UI wired to the token system, so they follow the machine's setting like
any other UI. Opening a card is not consent to motion. Consent is a control the
user presses, per instance, never remembered.

## The first build, and what the sweep did to it

The first version put a "View motion" toggle inside each card's UI demo layer
and revoked the two blanket opt-outs. Forty-five tests passed on built output.
Then David turned on Reduce Motion at the OS level and toured the deployed app,
and the tour found what the tests could not.

The library led with its Rive layer: the expanded card shows the principle
animation first, the token-driven demo second, behind a toggle. The Rive layer
had no reduce handling at all, so the first thing a reduce-motion user saw was
motion, and the consent control sat invisible behind a view they had no reason
to open. The landing hero held a dead frame. The bug-report button kept waving.
The tile field ran at full tempo. Uneven, because the handling had grown
surface by surface as each shipped, with no policy behind it.

The fix was structural, not cosmetic. The toggle state moved up to the card,
one boolean governing both layers: the Rive animation pauses through the same
`rive.pause()` pattern the icon grid already used, the demo tokens flatten
through a controlled provider scope, and the control renders below the
crossfade where both views can reach it. The collapsed grid's universal icon
pause defaults on, with the header Play button as the override. State resets
when the card collapses.

## The policy, three lines

What the sweep produced was a policy where there had been accumulation:

1. The token layer flattens under the OS preference. Every demo, no literal
   opt-outs, and a per-card control restores real timing on request.
2. Demonstration Rive starts paused behind an explicit play affordance. The
   tile field arrives at rest, progress zero, and its Pause control reads Play.
3. Chrome Rive does not animate for a user who asked it not to. It freezes at
   a designed still, or it is not Rive at all.

## Posters instead of rest poses

The third line ended somewhere better than it began. The plan was authored
rest poses inside the Rive files, until the desktop hero made the case against
itself: its art is clock-driven and draws nothing designed at frame zero. A
paused canvas can never be that file's poster.

David exported static SVGs instead, one per surface per display mode,
twenty-eight files in `/public/fallBacks`. Seven surfaces render them under
the preference: the desktop hero, the mobile-gate hero, the Studio link, the
Token Lab title, the Motion Tiles overview title, the Enter button, and the
home bug-report button. Each component isolates its Rive hooks so the poster
branch never mounts a canvas, and the home page under reduce-motion loads zero
Rive bytes: no `.riv` files, no WASM binary, a network assertion in the suite.
The accessibility fallback turned out to be the performance work in disguise.

The same session retired a documented landmine. The mobile hero was the last
file on the old three-instance theme contract, kept alive by a runtime
stroke/fill flip and a warning in two docs that a half-made change would fail
silently. David re-exported it with the four homogenized instances, the flip
came out, and both heroes now speak one contract, guarded by a test that binds
high-contrast dark, the theme the flip existed for.

## What the tests were worth

Writing the suite's reduce-motion guards exposed that Playwright's
`reducedMotion` context option silently never applied in this project: the
in-page media query stayed false, and the one existing reduce test had been
passing vacuously since it was written. The block now applies
`page.emulateMedia` before navigation and tests the real thing. The suite grew
from 41 tests to 50 across the two days, nine of them reduce-motion guards,
and the discovery is recorded in session memory so no future test trusts the
option.

The larger lesson runs the other way. The suite caught none of the design
problems; David's tour caught all of them. Automation holds the floor. The
sweep decides where the floor is.

## The numbers

- Four commits: `d0d9f06` (the card-level gate), `d8c80cf` (the field pause
  and chrome freeze), `76fbbf9` (the posters and the hero contract),
  `0e14ce3` (the Studio link poster).
- 28 poster SVGs across 7 surfaces and 4 themes.
- Two blanket opt-outs revoked; one exemption kept, deliberately (P17, whose
  demo toggle is the affordance the rest of the system generalized).
- Zero Rive bytes on the home page under the preference, down from a `.riv`
  fetch and a 686 kB class WASM binary.
- Suite: 41 to 50, all on built output through the production Worker.

## For the case study

Principle 17 is titled Reduced Motion. Before these two days, it was a card in
the grid: a demo with a toggle, teaching a preference the rest of the
application handled where convenient. Now the card is the small copy of a
system-wide behavior. The demos ask permission. The field waits at rest. The
heroes hang a still. A visitor who tells their machine to hold the motion gets
an interface that heard them, and the one card about reduced motion no longer
has to explain itself: the whole tool is the demonstration.
