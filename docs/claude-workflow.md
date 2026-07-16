# Claude Workflow

_To be written._

This document will describe how Claude Code is used in the development of Cadence — what it handles, what decisions are kept human, and how the collaboration is structured.

## Verification — exercise built output, not just the dev server

Standing rule (canonical copy in `CLAUDE.md` → "Known Development Environment Issues" → "Verify on built output, not just the dev server"): every session's verification runs the changed UI paths against a **production build**, driven in a browser — because minification and code-splitting exist only there. HTTP/endpoint checks do not satisfy it; they never execute the minified client bundle. Origin: the 2026-07-15 motion-token NaN crash (`docs/decisions/motion-token-nan-crash-2026-07-15.md`), which was invisible in `npm run dev` and only surfaced on the minified deploy.
