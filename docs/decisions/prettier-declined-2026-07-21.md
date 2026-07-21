# Prettier: declined (2026-07-21)

David's decision, recorded with its reasons and with the gap it exposed.

## What Prettier is

A code formatter. It rewrites source layout (line breaks, indentation, quotes,
trailing commas) to one mechanical style, usually on every save, so formatting
stops being a decision anyone makes. It changes nothing about what code does.
It complements ESLint rather than duplicating it: ESLint, adopted here
2026-07-16, flags likely bugs and pattern violations; Prettier only governs how
the code sits on the page.

## The decision

Declined. Three reasons, in order of weight:

1. The codebase is already consistently formatted. Every file was written
   through the same collaboration, so the uniformity Prettier enforces
   mechanically already exists by construction.
2. ESLint carries the correctness signal. Formatting carries none.
3. Adoption means one reformat commit touching nearly every file. That commit
   overwrites the line-by-line history (`git blame`, the record of who last
   touched a line and why) at the exact moment the commit record is becoming a
   portfolio artifact. The case study cites the history as evidence; a
   wall-to-wall reformat would put one commit's name on all of it.

If the calculus ever changes, the moment to adopt is immediately after the
repo-public decision, never immediately before.

## The gap this exposed

David, on the record: the tool was not introduced to him at the start, and he
was not aware of it until the end, when an audit line named its absence. That
is the finding worth keeping, and it is bigger than Prettier.

A designer learning to code through an AI collaborator inherits the
collaborator's defaults silently. The conventions the collaborator never names
do not exist for the learner: not as options declined, not as roads not taken,
just not at all. Prettier sat in that blind spot for thirteen weeks, beside a
linter that only surfaced in week nine and a test runner that arrived in week
seven. None of these absences cost this project much. The next project may not
be so lucky, and the designer will not know to ask.

The correction is a day-one toolchain conversation: formatter, linter, test
runner, named and decided even when every decision is no. A declined tool is a
known road; an unnamed one is not on the map. This document is one entry in
the institutional memory that conversation deserves, written for motion
designers working with AI to code, by one of them.
