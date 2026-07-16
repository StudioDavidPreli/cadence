# Claude Workflow

How Claude figures in the development of Cadence: what each surface handles, what stays human, and how the collaboration is structured.

The first version of this document was written 2026-04-13, five days before the first commit, as a set of predictions about how the work would divide. It lives in `archive/claude-workflow.md`, on disk and outside git. This version replaces it with what thirteen weeks actually looked like.

---

## The two surfaces

Cadence runs on two Claude surfaces with different senses. The browser Project on claude.ai is the thinking and writing side: planning a feature before building it, learning a React concept through an analogy to motion, rubber-ducking a bug, drafting case-study and positioning prose. It cannot read the repository; it works from custom instructions and uploaded knowledge files, and `docs/browser-project/` documents the whole setup. Claude Code, in the terminal, is the building side. It reads the actual files, starts every session from `CLAUDE.md`, and implements what the planning settled.

The division did not hold in one respect. As the project record grew (twenty-two decision docs, the tracker, the build closeouts), planning moved into Claude Code too, because plans increasingly turned on facts only the repo held: which grid decision was load-bearing, what a `.riv` file's view model actually exposed, which layoutId removal was already made. The browser Project settled into the writing and the career positioning, where seeing the code matters less than knowing the story.

## The loop

Four steps, run in order, most sessions:

1. **Plan first.** A feature starts as a conversation about approach, not a request for code. When two approaches are valid, both get named and the choice gets reasons.
2. **Build in Claude Code.** Implementation follows the conventions in `CLAUDE.md`: tokens never hardcoded, one component per folder, comments on any non-obvious decision.
3. **Review everything.** No code lands that David has not read and understood. `CLAUDE.md` states it as a rule ("do not write code I won't understand"), and in practice it means asking for explanations until the reasoning is clear. Cadence is a React-fluency vehicle before it is a portfolio piece; unreviewed code would defeat the reason it exists.
4. **Document immediately.** Decisions get a dated file in `docs/decisions/` while the reasoning is fresh. The record is the collaboration's shared memory: a later session, human or Claude, reads the doc instead of re-deriving the decision.

## What stays human

- **Design verdicts.** Anything only eyes can close, David closes. The Motion Tiles Tier 3 sweep (preset feel, per-tile reads, optical sizes) was his, run against the live grid, verdicts recorded in the tracker. Claude Code does not sign off on how motion feels.
- **Architecture calls.** Claude proposes, explains, and pushes back; David decides. The two-channel token dispatch, the layoutId removals, and the mobile gate all went through that gate.
- **The prose.** Drafts are written against `docs/voice/voice-analysis.md`; the final pass is David's. The case study's What I Learned rewrite is his by design.
- **Git.** Solo project, direct commits to main, David's call on when.

## What Claude Code carries

- Implementation and refactoring under the `CLAUDE.md` constraints, with the token-integrity test gating the build behind them.
- The Rive MCP work: the Motion Tiles per-tile bindings were built by Claude Code driving the Rive editor over MCP, provisioning view models and bindings across dozens of tile files. The landing page presents this as part of the demonstration.
- Verification on built output (the standing rule below), including the Playwright passes against the deploy checklist.
- The record itself: decision docs, closeouts, the tracker, and the audits that reconcile them when they drift.

## Verification: exercise built output, not just the dev server

Standing rule (canonical copy in `CLAUDE.md`, under "Known Development Environment Issues"): every session's verification runs the changed UI paths against a **production build**, driven in a browser, because minification and code-splitting exist only there. HTTP and endpoint checks do not satisfy it; they never execute the minified client bundle. Origin: the 2026-07-15 motion-token NaN crash (`docs/decisions/motion-token-nan-crash-2026-07-15.md`), which was invisible in `npm run dev` and only surfaced on the minified deploy.

---

`CLAUDE.md` closes with a thank-you note to the collaborator. It was written mid-project and left in place. It still holds.
