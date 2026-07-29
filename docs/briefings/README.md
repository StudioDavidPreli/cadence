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

**2026-07-28 split:** the working briefings (session kickoffs, closeouts, handoffs, recon
documents, and the whole `motionTiles/` set) moved to `archive/docs/briefings/`, which is on
disk but outside git. What stays here is the small set still cited from shipping code or from
tracked docs: interface contracts and rulings that code comments point at. If a file named in
an older document is missing from this folder, look in the archive path first.

## Index

- [Background system rulings](./background_system_rulings.md)
  David's rulings closing the background concept phase (2026-07-22): the split between
  bounded reveal (demonstration) and infinite idle (chrome), mark color per theme,
  dispositions on all twelve open questions, three amended engineering specs. Cited from
  `choreography.js`, `raster.js`, `BackgroundArt`, `NavColumn.module.css`, and `motion.css`.
  The recon and handoff documents it rules on are in the archive.
- [PrincipleCard expand/collapse animation](./principle-card-briefing.md)
  Symptoms and constraints for the PrincipleCard close animation. Read before proposing
  any changes to the expand/collapse machinery. Cited from `PrincipleCard/index.jsx`.
- [waterWilt token to VM map](./waterwilt-token-vm-map.md)
  The interface contract for the Water & Wilt Token Lab demo (2026-07-18): token
  consumption table, progress channels, instance gating, driver obligations, and
  invariants. Both the .riv authoring and the React driver build against it. The
  wiring inspection that preceded it (`waterwilt-react-wiring.md`) is in the archive.
- [pixelPlant token map](./pixelplant-token-map.md)
  The interface contract for the PixelPlant Token Lab demo: which tokens drive which
  view model inputs. Cited from `PixelPlant/index.jsx` and `TokenLab/index.jsx`.
- [Hygiene pair kickoff](./HYGIENE_PAIR_KICKOFF.md)
  Kickoff for the footprint and forced-colors hygiene session, kept because
  `docs/decisions/footprint-and-forced-colors-2026-07-21.md` cites it as the record
  of what that session was asked to do.

## How to use

At the start of a new session, read the relevant briefing before reading any code. The briefing
tells you which loops have already been run so you do not repeat them. It also tells you what
the current architecture looks like and why, so you can reason about proposed changes without
reconstructing that history from the file alone.

After a session concludes, update the briefing to reflect what was tried and what the outcome was.
If a problem is solved, mark it resolved and note the commit. If new symptoms appear, add them.

Briefings decay. An untouched briefing from three sessions ago may describe an architecture that
no longer exists. Verify the current file state before acting on a briefing's architectural claims.
