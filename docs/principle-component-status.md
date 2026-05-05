# Principles &harr; UI Component Status

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

Last refreshed: 2026-05-05.

---

## Classic 12

| #  | Principle                       | UI component summary                                                  | Tokens                                          | React module             | Status            |
|----|---------------------------------|-----------------------------------------------------------------------|-------------------------------------------------|--------------------------|-------------------|
| 01 | Squash & Stretch                | Press compresses. Release returns. The button has weight.             | scale.base, duration.fast, ease.spring          | Button                   | Wired             |
| 02 | Anticipation                    | The drawer dips before it climbs. The motion announces itself.        | duration.base, ease.spring                      | Drawer                   | Wired             |
| 03 | Staging                         | The modal opens. The backdrop dims. The page narrows to one thing.    | duration.slow, ease.enter                       | Modal / Dialog           | Not built         |
| 04 | Straight Ahead & Pose to Pose   | Steps mark the poses. The bar fills between. Both are the same idea.  | duration.slow, delay.short, delay.medium        | Stepper + ProgressBar    | Built, not wired  |
| 05 | Follow Through                  | Slide snaps. Dot catches up. The lag is how the system admits to mass.| duration.base, ease.spring                      | Carousel                 | Built, not wired  |
| 06 | Slow In & Slow Out              | The bar fills, then settles at the end. Linear motion belongs to machines. | ease.standard, duration.slow               | ProgressBar              | Built, not wired  |
| 07 | Arc                             | The tooltip leaves the trigger and arcs into place. Not a straight line. | duration.fast, ease.enter                    | Tooltip                  | Not built         |
| 08 | Secondary Action                | The menu opens. The chevron rotates with it. The rotation confirms.   | duration.fast, ease.standard                    | Dropdown                 | Built, not wired  |
| 09 | Timing                          | Same toggle. Different duration. The gesture changes character with it. | duration.fast, duration.base, duration.slow   | Toggle                   | Built, not wired  |
| 10 | Exaggeration                    | The badge count climbs. The number overshoots before it lands.        | scale.expressive, ease.spring, duration.fast    | Notification Badge       | Not built         |
| 11 | Solid Drawing                   | The card lifts. Shadow grows. What was flat is now above the page.    | scale.lift, duration.base, ease.standard        | Card                     | Built, not wired  |
| 12 | Appeal                          | Shapes drift, settle, drift again. Tuned easing. The grid holds the eye. | All tokens in concert                        | Lava-lamp grid           | Not built         |

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
- The shells under `src/principles/<Name>/index.jsx` (one per classic 12)
  all return `null` and are not part of the rendered tree. They are
  scaffolding for future per-principle composition logic and do not affect
  the status above.
- P17 (Reduced Motion) reuses the existing Toggle in a new context; the
  module exists but the reduced-motion-mode demo wrapper does not.
- P13 and P18 lean on the already-built TokenLab; what is missing is the
  framing surface that turns TokenLab into a per-principle demo inside the
  expanded card.
