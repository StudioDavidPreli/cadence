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

## How to use

At the start of a new session, read the relevant briefing before reading any code. The briefing
tells you which loops have already been run so you do not repeat them. It also tells you what
the current architecture looks like and why, so you can reason about proposed changes without
reconstructing that history from the file alone.

After a session concludes, update the briefing to reflect what was tried and what the outcome was.
If a problem is solved, mark it resolved and note the commit. If new symptoms appear, add them.

Briefings decay. An untouched briefing from three sessions ago may describe an architecture that
no longer exists. Verify the current file state before acting on a briefing's architectural claims.
