# Principle deep links: a modal over an unindexed grid (2026-07-21)

The route `#/principles/<filter>/<slug>` sat reserved in `useHashRoute.js` since
June, a comment holding a place. The pre-launch sharing pass needed it filled:
a post should be able to point at Follow Through by name, not send a reader to
the grid and ask them to hunt. This is the session that built it.

## What a deep link opens

A direct link mounts the Principles Library in its ordinary state and opens the
named principle in a Modal above it. The grid is never expanded, never scrolled,
never indexed by the link. Close the modal and the grid is what it always was,
with nothing to put back.

The design David settled the same morning replaced an earlier one. That earlier
approach opened the principle *in the grid*, the same 2×2 expansion a click
produces. It would have had to resolve column count, the expanded footprint's
edge biasing, and scroll position all during mount, under the lazy boundary,
before the first paint the visitor sees. The modal has none of that. It floats
in the demo column and asks the grid for nothing.

## The asymmetry is chosen

In-grid expansion stays URL-less. Its pedagogy is the system yielding space: the
neighbors slide, a cell goes empty, the card grows into the room the grid made.
That is a thing you do inside the tool, and giving it a URL would freight it with
a history entry it does not want.

The modal is the guest entrance. It is for the visitor arriving from outside, who
was sent to one principle and should land on it. Two doors, one for residents and
one for guests, and they do not open the same way. Recorded here as a decision,
not an accident.

## State in id-space, URL in slug-space

The navigation state carries a numeric `principleId`. The URL carries the
authored slug. `useHashRoute` is the one place the two meet: `parseHash` resolves
slug to id, `stateToHash` serializes id back to slug, and `principleHash` builds
the canonical string that both the serializer and the copy-link control read, so
the URL shape lives in exactly one function.

Two resolution rules follow the fail-soft posture the parser already had:

- A slug that resolves normalizes the filter to that principle's own family. The
  URL can say `extended` over a classic principle; the id wins and the filter
  becomes `classic`. The link is about the principle, so the principle decides.
- A slug that does not resolve drops away. The reader lands on the plain grid at
  the parsed filter, no error surface, the same way an unknown route lands on the
  hero. A bad link is a soft miss.

The slug is authored, not slugified at runtime. A shared URL should read like
language, and which words a principle answers to is a design call. The table
lives in `src/data/principles.js`, a leaf module with no component imports, so
the router can resolve a slug without pulling the component tree into a cycle.
Numeric ids resolve too, as a silent alias, so an early hand-typed `/5` still
lands and costs nothing to keep.

## Close rewrites; back closes

Closing the modal rewrites the hash to the plain grid in place, through
`replaceState`. The reason is the back button. If the close pushed a new entry,
Back would return to the entry the close came from, and the modal it dismissed
would open again. So the close leaves no entry behind: `closePrinciple` flags the
next hash write, and `useHashSync` honors it with `replaceState` instead of a
push, the same silent write the first-run normalize already used.

Back still closes the modal, through the browser's own history. Any real
navigation that reaches the deep link (a fresh load, a hash pushed from the grid)
is its own entry, so Back pops to `#/principles`, the id segment goes, and the
modal follows it out. `useHashRoute` stays the sole owner of the hash. Nothing
else writes it.

## The intro yields

Two auto-open modals cannot race. The library's first-visit intro is suppressed
on deep-link entry: a visitor who followed a principle link was not asking for
the guide. It is not marked seen, so their next ordinary visit still gets it. The
guide waits for a day the visitor came for the tool, not the one principle.

## One body, two frames

The expanded card's inside is the same object in both doors, so it was extracted:
`ExpandedPrincipleBody` holds the × close, the animation/UI crossfade, the meta
and title and summary, the toggle, and the QuoteBlock. `PrincipleCard` renders it
inside the scale-and-footprint machinery that grows the card; the deep-link modal
renders it at the card's own 372×480 dimensions inside a bare dialog.

The body owns no state. Each caller passes `uiMode` / `drawerOpen` /
`showDemoMotion` in, so each keeps its own reset where its reset already lived:
the card resets on collapse, the modal on unmount. The JSX moved and the state
did not, which is why the in-grid card behaves exactly as before. The
reduced-motion gate rode along unchanged, because it is part of the same markup.

## The copy-link control

The links have to exist without anyone assembling them by hand, so the expanded
card and the modal both carry a copy-link control. It sits on the QuoteBlock's
token row, the token pill on the left and the control on the right, below the
divider and clear of the toggle geometry the contentHalf column is held to. It
reads **Link**, and on a write it swaps to **Copied** and back.

It is chrome, not demonstration. Its confirmation fades on the fixed `--feedback-*`
timing through `useChromeTransition`, never the editable motion tokens, so Explore
mode dragging duration toward zero can never flatten it. The token-integrity gate
holds it there. A clipboard write that fails in an insecure context is a silent
no-op, the posture CodeBlock and the export Copy button already take.

## The slug table

| id | principle | slug |
|----|-----------|------|
| 1 | Squash & Stretch | `squash-and-stretch` |
| 2 | Anticipation | `anticipation` |
| 3 | Staging | `staging` |
| 4 | Straight Ahead & Pose to Pose | `pose-to-pose` |
| 5 | Follow Through | `follow-through` |
| 6 | Slow In & Slow Out | `slow-in-slow-out` |
| 7 | Arc | `arc` |
| 8 | Secondary Action | `secondary-action` |
| 9 | Timing | `timing` |
| 10 | Exaggeration | `exaggeration` |
| 11 | Solid Drawing | `solid-drawing` |
| 12 | Appeal | `appeal` |
| 13 | Systematization | `systematization` |
| 14 | Hierarchy of Motion | `hierarchy-of-motion` |
| 15 | Economy | `economy` |
| 16 | Token Fidelity | `token-fidelity` |
| 17 | Reduced Motion | `reduced-motion` |
| 18 | Shared Vocabulary | `shared-vocabulary` |

## What was verified

Unit suites cover the resolvers, the three-segment parse (slug resolution, filter
normalization, the numeric alias, the unknown-slug drop), the serializer, and the
round-trip. The e2e suite drives the built Worker: a deep link opens the modal
over a default grid, close rewrites the hash and the grid stays interactive, Back
closes the modal, an unknown slug fails soft, the intro is suppressed on deep-link
entry and still fires on an ordinary visit, and the copy-link control writes a URL
that round-trips. All unit suites and the full e2e gate pass on built output.

A visitor pastes a link and the one principle is already open, the grid behind it
waiting for the moment they close it.
