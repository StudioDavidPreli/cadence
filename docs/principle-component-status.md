# Principles &harr; UI Component Status

> **SUPERSEDED 2026-07-16.** This snapshot froze at 2026-05-05, mid-build. All
> 18 principles are complete, wired, and live; every "Built, not wired" and
> "Not built" row below is finished work, and the P03 notes on the focus trap
> and easing-slot tabs are both shipped. Rather than maintain a second copy of
> the mapping, this file is retired as a historical record. Current sources of
> truth: `src/components/PrinciplesLibrary/index.jsx` (summaries, tokens,
> wiring), `docs/principles/*.md` (per-principle record), and the case study's
> build notes (`docs/case-study.md`). Kept for the case-study history: it shows
> what mid-build looked like.

Snapshot of each principle's UI demo wiring: the component summary as it
renders in the expanded card, the tokens it consumes, the React module
that demonstrates the principle, and whether that module exists in
`src/components/` and is wired into `getPrincipleComponent` in
`src/components/PrincipleCard/index.jsx`.

Status values:

- **Wired**: component exists and renders inside the principle card's
  UI mode
- **Built, not wired**: component exists in `src/components/` but is
  not yet hooked into `getPrincipleComponent`
- **Not built**: component does not exist in `src/components/`

Sources of truth for this table:

- `src/components/PrinciplesLibrary/index.jsx` (componentSummary, tokens)
- `src/components/PrincipleCard/index.jsx` (`getPrincipleComponent` switch)
- `docs/references/principles-reference.md` (principle &rarr; component mapping)

Last refreshed: 2026-05-05 (P03 + P04 + P07 + P10 + P12 wired).

---

## Classic 12

| #  | Principle                       | UI component summary                                                  | Tokens                                          | React module             | Status            |
|----|---------------------------------|-----------------------------------------------------------------------|-------------------------------------------------|--------------------------|-------------------|
| 01 | Squash & Stretch                | Press compresses. Release returns. The button has weight.             | scale.base, duration.fast, ease.spring          | Button                   | Wired             |
| 02 | Anticipation                    | The drawer dips before it climbs. The motion announces itself.        | duration.base, ease.spring                      | Drawer                   | Wired             |
| 03 | Staging                         | The modal opens. The backdrop dims. The page narrows to one thing.    | duration.slow, ease.enter                       | Modal                    | Wired             |
| 04 | Straight Ahead & Pose to Pose   | Steps mark the poses. The bar fills between. Both are the same idea.  | duration.slow, delay.short, delay.medium        | Stepper (compact) + ProgressBar | Wired      |
| 05 | Follow Through                  | Slide snaps. Dot catches up. The lag is how the system admits to mass.| duration.base, ease.spring                      | Carousel (compact)       | Wired             |
| 06 | Slow In & Slow Out              | The bar fills, then settles at the end. Tokens is adjusted with the tool bar. | ease.standard, duration.slow               | ProgressBar              | Wired             |
| 07 | Arc                             | The tooltip leaves the trigger and arcs into place. Not a straight line. | duration.base, ease.enter                    | Tooltip                  | Wired             |
| 08 | Secondary Action                | The menu opens. The chevron rotates with it. The rotation confirms.   | duration.fast, ease.standard                    | Dropdown                 | Wired             |
| 09 | Timing                          | The character of the component changes when varying the easing duration. | duration.fast, duration.base, duration.slow   | Toggle ×2 (Default + Cinematic presets) | Wired |
| 10 | Exaggeration                    | The badge count climbs. The number overshoots before it lands.        | scale.expressive, ease.spring, duration.fast    | NotificationBadge        | Wired             |
| 11 | Solid Drawing                   | The card lifts. Shadow grows. What was flat is now above the page.    | scale.lift, duration.base, ease.standard        | Card                     | Wired             |
| 12 | Appeal                          | Shapes drift, settle, drift again. Tuned easing. The grid holds the eye. | All tokens in concert                        | Card grid (drift+settle) | Wired             |

## Extended 6

| #  | Principle              | UI component summary                                              | Tokens                          | React module                    | Status            |
|----|------------------------|-------------------------------------------------------------------|---------------------------------|---------------------------------|-------------------|
| 13 | Systematization        | One slider moves. Every component responds. The system has one voice. | The whole token set         | TokenLab overview               | Built, not wired  |
| 14 | Hierarchy of Motion    | The parent moves. The children follow. Authority flows downward.  | duration.base, ease.standard    | Parent/child container demo     | Not built         |
| 15 | Economy                | Three layers, three speeds. Depth from the smallest set of moves. | duration.slow, ease.standard    | Layered parallax scroll         | Not built         |
| 16 | Token Fidelity         | Wrong token. The motion reads off. Corrected through the system.  | The referenced token            | Live token-correction demo      | Not built         |
| 17 | Reduced Motion         | Toggle flips. Motions soften and fall to rest. The system meets the user. | All tokens, conditional     | Toggle (reduced-motion mode)    | Built, not wired  |
| 18 | Shared Vocabulary      | The preset is Snappy. The numbers are the same. The name is the unit. | All named presets           | TokenLab named-preset surface   | Built, not wired  |

---

## Notes

- "Wired" today means there is a `case` in
  `getPrincipleComponent(principleId, ...)` returning the demo. The default
  branch returns the "Component example coming in Phase 2" placeholder.
- P5 Carousel renders in a new `compact` mode: slide description omitted,
  slide padding tightened, edge-fade overlays shrunk from 48 px to 16 px.
  The full Carousel still renders in TokenLab's Gesture tab unchanged.
- P6 ProgressBar gained a `showLabel` prop (default `true`) so the demo
  can hide the percentage in this context.
- P9 Timing's two Toggles run with token sets resolved from the Default
  and Cinematic presets through `MotionTokensProvider`. Preset data lives
  in `src/data/motionPresets.js` (extracted from TokenLab to break a
  circular import).
- P4 Straight Ahead & Pose to Pose stacks Stepper above ProgressBar above
  a single Next/Reset trigger. Stepper gained a `compact` prop (hides
  labels, description, internal Next, completion overlay; shrinks
  stepItem to circle width) and an optional `currentStep` prop for
  controlled mode. The wrapper owns a single `step` counter that drives
  both demos: Stepper marks the poses; ProgressBar fills 0/25/50/75/100
  in lockstep. Same advance, two visualizations.
- P12 Appeal extends the existing Card with three optional props
  (`isSelected` controlled, `onSelect` callback, `dimmed`) — backward
  compatible; P11 (Solid Drawing) keeps its uncontrolled internal
  state. AppealDemo (inline in PrincipleCard) renders a 2x2 grid of
  compact Cards. Each is wrapped in a `motion.div` that owns y-drift
  (Y oscillation, ~5s cycle, per-card phase delay so the four never
  sync). When any card is selected the wrapper switches to `y: 0`
  (settle) and the unselected siblings dim via the new `dimmed` prop
  (`scale.subtle` + opacity 0.55). Six tokens visible in one
  composition: `duration.slower` (drift cycle), `duration.base`
  (settle/lift/dim), `ease.standard` (neutral states), `ease.spring`
  (selection), `scale.lift`, `scale.subtle`. The principle's "All
  tokens in concert" line is then literal in the demo. Card titles
  carry ASCII faces (`(ﾟ∩ﾟ)`, `(• ε •)`, `ʕ•̮͡•ʔ`, `(´°ω°`)`) rendered
  in `ui-monospace` so the parens align — the demo's compact CSS
  override flips Card's italic serif h3 to mono, normal weight,
  centered.
- P7 Arc uses a new Tooltip component (`src/components/Tooltip`). The
  bubble bends its trajectory through three keyframes for `x` and `y`:
  start below-right of rest, mid-keyframe above rest (biased right),
  end at rest. Two segments meeting at an elbow form the arc; ease.enter
  decelerates each segment. duration.base (200 ms) gives the bend time
  to read. Centered above trigger via CSS `translate` (separate from
  `transform`, so Framer Motion's `x`/`y` offsets compose with the
  centering). Bubble is sized with `width: max-content` to override the
  shrink-to-fit calculation against the trigger's narrow container.
  Lives in TokenLab's Enter & Exit between Modal and Dropdown.
  TokenLab also gained a local rename: the in-file `Tooltip` helper
  (a 400 ms hover-delay tip used on preset and Explore labels) is now
  `HoverTip` to avoid colliding with the new exported component.
  P07's principle data updated `duration.fast → duration.base` to match
  what the demo uses.
- P3 Staging uses a new Modal component (`src/components/Modal`).
  Backdrop fades opacity 0 → 0.8; panel scales 0.96 → 1 + opacity 0 → 1.
  Asymmetric durations: enter `duration.slow` + `ease.enter`; exit
  `duration.base` + `ease.exit`. Backdrop click and Escape both close.
  Centering uses CSS `top: 50%; left: 50%; translate: -50% -50%` (the
  CSS `translate` property — separate from `transform` — so Framer
  Motion's `scale` animation composes cleanly without overwriting the
  centering). Same `scoped` recipe as Drawer. Lives in TokenLab's Enter
  & Exit between Drawer and Dropdown. `TOKEN_COMPONENT_MAP` lights it
  up on `duration.slow` and `duration.base`; the easing slider only
  edits `--motion-ease-standard`, so Modal is correctly NOT in the
  `easing` row pending the deferred Standard / Enter / Exit tabs in
  the bezier visualizer (logged in tracker known issues). Focus trap
  is deferred (documented in component header).
- P10 Exaggeration uses a new NotificationBadge component
  (`src/components/NotificationBadge`). The badge re-keys on count change
  so the spring runs every increment. Initial scale is `scale.expressive`
  (0.9, a compress); it animates to 1 with `ease.spring`, whose bezier
  carries the value above 1 before settling. Compress + curve combine to
  produce the alert. Lives in TokenLab's Press & State tab next to Toggle
  and Spinner; `scale.expressive` and `duration.fast` now light it up
  in `TOKEN_COMPONENT_MAP`.
- The shells under `src/principles/<Name>/index.jsx` (one per classic 12)
  all return `null` and are not part of the rendered tree. They are
  scaffolding for future per-principle composition logic and do not affect
  the status above.
- P17 (Reduced Motion) reuses the existing Toggle in a new context; the
  module exists but the reduced-motion-mode demo wrapper does not.
- P13 and P18 lean on the already-built TokenLab; what is missing is the
  framing surface that turns TokenLab into a per-principle demo inside the
  expanded card.
