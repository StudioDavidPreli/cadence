# Principle Deep Links: Session Kickoff

Paste this prompt into a fresh session, or point the session at this file and say "run this brief."

**Sequencing gate:** run after the hygiene-pair session has landed and pushed (it works in `PrincipleCard/`, this session works beside it in `PrinciplesLibrary/` and the shared e2e specs). No conflict with the scale-rename or Framer-Motion-export sessions, but read `git log --oneline` first and confirm what has landed. This item sits on the tracker's pre-launch engineering queue: the sharing posts should be able to assume per-principle links exist.

---

You are working in the Cadence repo (`/Users/david/Desktop/cadence`). Read `CLAUDE.md` in full before touching anything; it governs this project. This session builds the reserved deep-link route `#/principles/<filter>/<id>` with the design David settled on 2026-07-21: a direct link opens the principle as a modal over the grid. The grid mounts in its default state, unaware anything special happened; close the modal and the grid behaves as normal, with nothing to clean up.

## Read first, in this order

1. `CLAUDE.md` (all of it; the Modal centering section is the load-bearing one, and its auto-open-on-mount rule is the exact hazard this feature courts)
2. `src/hooks/useHashRoute.js`: the route table and the reserved-segment comment at the top
3. `src/components/PrinciplesLibrary/index.jsx`: the intro modal is the worked example of an overlay-gated auto-open modal in the very component this feature extends; the principle data (ids, titles, categories) lives here too
4. `docs/principles/conventions.md`: the expanded-card invariants the modal's content must carry
5. `src/components/DemoArea/overlayContext.js`: the overlay node and why it exists
6. `docs/decisions/reduced-motion-completion-2026-07-18.md`: the per-card motion gate that must work identically inside the modal

## The design, settled: do not reopen

David approved this shape 2026-07-21; the reasoning is in the decision it replaced (an expand-in-grid approach that would have needed column count, footprint math, and scroll position all resolved during mount under the lazy boundary).

- **Modal over the grid.** The route mounts the library normally and renders the principle's expanded content in a Modal above it. The grid is never expanded, scrolled, or indexed by the link.
- **Demo-column centering, gated open.** The Modal takes `portalTarget` from `useDemoOverlay()` and gates its auto-open on the overlay node existing, exactly as the intro modal does. Defaulting to viewport, or opening before the node arrives (the mount-jump that restarts the enter animation), are the two documented bugs this section of CLAUDE.md exists to prevent.
- **The intro modal is suppressed on deep-link entry.** Two auto-open modals cannot race. A visitor following a principle link was sent to a specific principle; the guide waits for their next ordinary visit (do not mark it as seen).
- **Close rewrites the hash; back closes the modal.** Closing the modal rewrites the hash to the plain grid route without adding a history entry (a close that pushes state would make the back button reopen the modal). The browser back button with the modal open pops the hash, the id segment goes, and the modal follows. `useHashRoute` owns hash-to-state; keep it that way.
- **The content is the expanded card's content.** Rive animation, UI demo, Motion/UI toggle, quote, token pill, in a container at the expanded card's own dimensions, so the conventions doc's invariants and the per-card reduced-motion gate (`DemoMotionGate`, the View-motion control) carry over unchanged. Do not design a new layout.
- **Bad links fail soft.** An unknown id drops the segment and lands on the normal grid, no error surface (consistent with `parseHash`'s existing fallback posture). A filter/id mismatch resolves in the id's favor and normalizes the filter to the card's family.
- **The asymmetry is chosen.** In-grid expansion stays URL-less and keeps its system-making-room pedagogy; the modal is the guest entrance for visitors arriving from outside. Record it in the decision doc as a decision, not an accident.
- **The copy-link affordance ships with the route.** The expanded card (in-grid) and the modal both offer a control that writes the principle's deep URL to the clipboard, so the links exist without anyone hand-assembling them. The affordance is chrome, not demonstration: its confirmation feedback runs on the `--feedback-*` constants through `useChromeTransition()` / `feedbackDuration.js`, never the editable motion tokens, and the token-integrity gate will hold you to that.

## Propose in plan mode, then wait

Two things get David's eyes before code; both are copy-adjacent, neither reopens the design.

1. **The slug table.** The data's ids are numeric; a shared URL should read like language (`#/principles/classic/follow-through` beats `/5` in a post). Propose a slug per principle, derived from the titles, as a field in the principle data so the mapping is authored, not computed. David approves the table; numeric ids can be accepted as silent aliases if it costs nothing, dropped if it costs anything.
2. **The copy-link control's placement and label.** The expanded card is governed by the conventions doc's toggle/divider invariant and the card's tight geometry; the modal has the same content in more room. Propose placement in both contexts with the layout evidence, and the label and confirmation copy (voice rules apply; the confirmation is one word, not a sentence).

## The work, surface by surface

- `src/hooks/useHashRoute.js`: produce and consume the third segment; the reserved-segment comment graduates to a description of live behavior.
- `src/components/PrinciplesLibrary/index.jsx`: the deep-link modal (overlay-gated, intro-suppressing), the slug field, the filter normalization.
- The copy-link control in both contexts, on the clipboard API, with its feedback on chrome timing.
- Reduced motion: nothing new to invent; verify the card gate behaves identically inside the modal on built output.
- Tests. Unit where logic is pure (slug resolution, hash parsing). New e2e rows: a deep link opens the modal over a default grid; close rewrites the hash and the grid behaves normally; back-button with the modal open closes it; an invalid id lands on the plain grid; the intro does not appear on deep-link entry; copy-link writes the URL (grant clipboard permissions in the Playwright context rather than fighting the prompt). The existing deep-link and back-traversal rows in the suite show the house style.
- Docs: the route table in any doc that lists routes, a decision record at `docs/decisions/principle-deep-links-<date>.md` (carrying the asymmetry rationale and the modal-over-grid reasoning), the tracker's pre-launch queue tick, and the deploy checklist's deep-link row extended to the new route.

## Process rules for this session

- David is learning React through this project. Explain non-obvious decisions briefly; when two approaches are valid, name both and say why you chose one.
- No hardcoded animation values in components. The modal's motion follows the Modal component's existing token reads; the copy affordance reads feedback constants.
- Main is production: `npm run test:e2e` before every push; verify on built output in a browser: a cold load of a deep URL (the lazy chunk must resolve first, then the overlay, then the modal, in that order with no jump), close, back-button, an invalid slug, and the copy control end to end.
- David does his own visual checks of feel; your built-output pass is for mechanism.
- Stage files individually; never `git add -A`. Commit directly to main; match the log's message style.
- Before writing any prose (labels, confirmation copy, decision record), read `docs/voice/voice-analysis.md`. No em-dashes, anywhere, in any form.

## Definition of done

- A cold load of `#/principles/<filter>/<slug>` opens the principle's modal over a default grid with no viewport flash and no animation restart; close and back both land on a normal grid with a clean hash.
- The intro modal never races the deep-link modal, and an ordinary visit still gets the intro.
- Copy-link works in both contexts with chrome-timed feedback, and the URLs it writes round-trip.
- All unit suites and `npm run test:e2e` pass, the new rows included; the cold-load path verified on built output.
- Docs, decision record, checklist row, and the queue tick all dated; the sharing pass can link any principle by name.
