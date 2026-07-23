---
Purpose: Briefings for Claude Code sessions on active debugging and build work
Format: One file per subject. Each file is self-contained and can be handed to a fresh session.
---

# Briefings

A briefing is a self-contained document that gives a new Claude Code session the information
it needs to continue work on an active problem without re-reading the full conversation history.

Briefings are written after a problem is identified but before it is solved. They document the
current architecture state, what has been tried, active symptoms, and constraints the next
session must respect.

## Index

- [PrincipleCard expand/collapse animation](./principle-card-briefing.md)
  Current symptoms and constraints for the PrincipleCard close animation. Read before
  proposing any changes to the expand/collapse machinery.
- [waterWilt React wiring](./waterwilt-react-wiring.md)
  Full inspection of `public/rive/waterwiltreact.riv` (2026-07-18): view model surface,
  state machine logic, listener behavior, and the gaps the wiring session plans around.
  Read before writing the component.
- [waterWilt token to VM map](./waterwilt-token-vm-map.md)
  The interface contract for the Water & Wilt Token Lab demo (2026-07-18): token
  consumption table, progress channels, instance gating, driver obligations, and
  invariants. Both the .riv authoring and the React driver build against it.
- [Background system handoff](./background-system-handoff-2026-07-22.md)
  The planning-session concept for the glyph L-system background artwork (2026-07-22):
  committed decisions, open questions, module boundaries. Written before recon.
- [Background system recon](./background_system_recon.md)
  Recon of the handoff above against the working tree and the labs in
  `archive/backgroundSystem/` (2026-07-22): corrections, the chrome-vs-demonstration
  ruling that gates the build, findings the handoff omits, proposed sequence. Where the
  two disagree, this one is current.
- [Background system, next-session kickoff](./BACKGROUND_SYSTEM_NEXT_SESSION_KICKOFF.md)
  **Paste-ready prompt to open the next background-system session.** Sets the posture (visual
  pass + Firefox/Safari + deploy, not a build session), the three tasks in order, how to run
  it, and the environment traps. Points at the handoff below for detail.
- [Background system session handoff, 2026-07-23](./BACKGROUND_SYSTEM_SESSION_2026-07-23.md)
  **The detail behind the kickoff.** What was built, how it was mounted in the nav behind
  `?bg=1`, the four reported bugs and their fixes (6b), the clearance and glass (6c), seeding
  (6d), the empty-cell grid (6e), and the reduced-motion fix (6f). Five commits on `main`,
  none pushed. Section 8 is where a clean session starts.
- [Background system rulings](./background_system_rulings.md)
  David's rulings on the recon (2026-07-22), closing the concept phase: the split
  (bounded reveal demonstrates, infinite idle is chrome), mark color per theme (source
  colors and 4-step shading in light and dark, theme accent and 2 steps in high
  contrast, section 2a), dispositions on all twelve open questions, three amended
  engineering specs, and five amendments raised against the rulings.
  **Read this first** of the three.

## How to use

At the start of a new session, read the relevant briefing before reading any code. The briefing
tells you which loops have already been run so you do not repeat them. It also tells you what
the current architecture looks like and why, so you can reason about proposed changes without
reconstructing that history from the file alone.

After a session concludes, update the briefing to reflect what was tried and what the outcome was.
If a problem is solved, mark it resolved and note the commit. If new symptoms appear, add them.

Briefings decay. An untouched briefing from three sessions ago may describe an architecture that
no longer exists. Verify the current file state before acting on a briefing's architectural claims.
