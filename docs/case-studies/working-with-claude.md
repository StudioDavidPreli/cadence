# Cadence: Working with Claude

**Status: Draft branch, 2026-07-30.** How the collaboration actually ran, drawn from [`claude-workflow.md`](../claude-workflow.md), the decision records, and the debugging chronology. The workflow doc records the mechanics; this branch is about which methods earned their keep.

---

## The rule everything else hangs on

Every line of code in Cadence was read by a person before it landed. The project instructions state it as a constraint on the tool ("do not write code I won't understand"), but in practice it is a constraint on me: I ask for explanations until the reasoning is clear, and a feature is not done when it works; it is done when I can defend it. Cadence is my React-fluency vehicle before it is a portfolio piece, and unreviewed code would defeat the reason it exists.

## Two surfaces

The work runs on two Claude surfaces with different senses. The browser Project on claude.ai is the thinking side: planning a feature before building it, learning a React concept through an analogy to motion, drafting prose. It cannot see the repository. Claude Code, in the terminal, is the building side: it reads the actual files, and it starts every session from CLAUDE.md, the instructions file that functions as a contract both sides have read.

The split drifted, and the drift was informative. As the record grew past twenty decision docs, planning moved into the terminal too, because plans increasingly turned on facts only the repo held: which grid decision was load-bearing, what a Rive file's view model actually exposed, which removals had already been made. The browser kept the writing and the career thinking, where knowing the story matters more than seeing the code.

## The loop

Most sessions run the same four steps. Plan first: a feature starts as a conversation about approach, and when two approaches are valid, both get named with reasons. Build under the CLAUDE.md constraints, with a test gate failing the build on any hardcoded animation value. Review everything. Document immediately: decisions get a dated file while the reasoning is fresh.

The documentation step is the one I would defend hardest. A Claude session begins with no memory of the previous one; a decision that lives only in a conversation is a decision the next session will re-litigate. Written down, it becomes a fact the next session reads and builds on instead. The record is the collaboration's shared memory, and it works on me the same way it works on Claude.

## What the failure taught

The method was priced by its absence. In late April, eleven days of work on one card's expand-and-collapse animation produced zero commits, and the chronology we assembled afterward reads as a study in amnesia: the same fix added, reverted, and added again across sessions with no learning carried between them; a state variable introduced, iterated, deleted, then proposed again as if new; an orphaned prop left behind by one session and reasoned about by the next as if it were intentional. Each session treated the current working tree as a settled design when it was actually a half-applied experiment.

The discipline that ended it is now the method: commits between every change, briefings between sessions, measurements before architectural decisions, and a stop-and-write rule when reasoning heads toward a pattern already tried and rejected. The same problem that consumed eleven undocumented days resolved in four documented ones.

## What stays human, and what Claude carries

The division of labor settled early and held. Design verdicts are mine: anything only eyes can close, I close, and Claude Code does not sign off on how motion feels. Architecture is a conversation with a fixed ending: Claude proposes, explains, and pushes back; I decide. The pushback is the part I would not trade. A collaborator that agrees with everything is a mirror, and I already had one of those.

Claude Code carries the implementation, the audits that keep the record honest, and the verification rule that every session exercises production builds, a rule that exists because a minified bundle once crashed in a way the dev server could not show. It also carried one workload I want to name because it surprised me: the Motion Tiles bindings were built by Claude Code driving the Rive editor itself over MCP, provisioning view models across dozens of tile files. The landing page presents that workflow as part of the demonstration.

## The contract wall

The method I would export to any team: when the Rive authoring and the React driver had to be built on opposite sides of a boundary neither tool can see across, we committed a contract document first, naming every property, its type, and who writes it. When the two sides disagreed about what a number meant, the disagreement went to the document, not the debugger. The same shape recurs everywhere in the project: CLAUDE.md is a contract about how to build, the decision docs are contracts about what was already settled, and the voice file is a contract about how to write. The collaboration works because the agreements are files, and files are the one thing every participant can read.

CLAUDE.md ends with a thank-you note I wrote to the collaborator mid-project. Every session reads it before getting to work. Nobody has had a reason to take it out.
