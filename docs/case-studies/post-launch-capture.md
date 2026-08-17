# Post-Launch Capture

The operating checklist for the post-launch amendment. The case study stands on design, method, and build; this document exists so that, when the amendment is written, every number in it has a date, a source, and a denominator. Day zero is the LinkedIn post date. Nothing here is published; the amendment is.

The amendment gets its own posting round when it lands. Target: first update at 30 days, then 60, then 90.

---

## Before launch

**One week out, or earlier:**

- [x] **Enable Cloudflare Web Analytics** on the Worker (dashboard, Analytics tab). Free, cookie-less, no consent banner. Verify the beacon appears on production by viewing source. This must be live before the post goes out; day one is the biggest day and cannot be recaptured.
- [x] **Build and deploy the export/import event counter** (`/api/event`). Separate app-code session; the prompt is queued. Verify end-to-end on built output before launch: press each export button on production, watch the counts move.
- [x] **Stand up the GitHub traffic snapshotter.** The traffic API (clones, views, referrers) retains only 14 days, so unsnapshotted weeks are gone forever. A scheduled GitHub Action on a weekly cron, committing `metrics/traffic.json` to the repo, is enough. Run it once manually to confirm the file lands.
- [x] **Decide the posting plan.** Which channels beyond LinkedIn, in what order, and the exact posting time. Day zero must be unambiguous for every later denominator. Decided 2026-08-16; the plan is the next section.
- [x] **Build the trace-link set.** Built 2026-08-17, and not as UTM links: Cloudflare Web Analytics never logs query strings, on either domain, so `?utm_source=` would have measured nothing. Instead the channel rides in the path and the Worker counts it server-side: `cadence.davidpreli.com/l/<channel>` writes one visit data point to the `cadence_events` store and 302s to the tool; the `-cs` suffix 302s to the case study on davidpreli.com, which has no Worker of its own, so its counting lives here too. Link-preview crawlers redirect uncounted, so unfurls are not phantom visits. Reasoning and query recipe: `docs/decisions/trace-links-2026-08-17.md`. The full set is in the ledger notes; before any post goes out, click its link once and confirm the redirect lands.

**Two days out:**

- [ ] **Every destination surface finished.** Contra project live, portfolio integration done, LinkedIn Featured section pointing at the tool and the case study, repo README current, the four hosted case-study pages reachable from the index. These are where a stranger lands after a post, and day zero is the day the most strangers will ever look up the name at once. None of them belong on the posting calendar; a half-built profile found on day zero cannot be un-found.

**The day before:**

- [ ] **Baseline capture.** Stars, forks, watchers; any existing site traffic; the zero state of the event counters. Enter the baseline row in the ledger below. Screenshot the GitHub traffic graphs as backup.

## The posting plan

Day zero is a Tuesday. The weekday anchors carry more weight than the day numbers: Tuesday morning is the strongest LinkedIn slot, Friday the weakest, and the second Tuesday is where the case study lands. If the calendar slips, slip it a week, not a day.

| Day | Weekday | Channel | What |
|---|---|---|---|
| 0 | Tue | LinkedIn | Launch. Native video upload, captions burned in. Tool link and case-study link both in the body. |
| 1 | Wed | School of Motion Circle | Short overview, tool link. |
| 2 | Thu | r/ClaudeAI | Video and tool link. Technical detail in a top-level comment from OP. |
| 3 | Fri | Rive community | The tile work as the subject. First direct-outreach batch, ten messages. |
| 4-5 | Sat/Sun | none | Monitor, reply. |
| 6 | Mon | none | Reply day. |
| 7 | Tue | LinkedIn | Case study: The Token System, Fields and Canvas. Tag Rive. |
| 8 | Wed | r/webdev or r/Frontend | The receiving-end question, below. |
| 9 | Thu | LinkedIn | Case study: Working with Claude. Tag Anthropic. |
| 10 | Fri | none | Reply day. |
| 11-12 | Sat/Sun | none | Monitor. |
| 13 | Mon | none | Reply day. Second outreach batch. |
| 14 | Tue | LinkedIn | The open question, below. Soft signal for v2. |
| 21 | Tue | LinkedIn | Figma design-system file, if it exists by then. Tag Figma. |
| 30 | | all | Amendment round, per the top of this document. |

Four LinkedIn posts in fourteen days is the ceiling on one subject. Past that each post reaches fewer people than the last, and the case-study posts are the two that have to travel.

Replies are same-day, every day, not a task at the end. On LinkedIn the first sixty to ninety minutes of replies decide whether a post keeps distributing. Days 6, 10 and 13 exist to keep that habit from competing with a publish.

The Figma file is off the launch calendar on purpose. It was not started as of 2026-08-16, and an unbuilt deliverable scheduled inside a window where a slip is publicly visible is the item most likely to break the cadence. It ships on its own Tuesday or it waits.

### The questions, matched to their audience

Each channel gets one question, and it has to be a question that channel can actually answer.

- **LinkedIn, day zero:** *How has handing off motion spec sheets to engineers gone for you?* This is the thesis stated as a question. It presupposes the problem without claiming to have solved it, and the audience skews motion and agency, so it will land. The answers give the day 7 post something to point back at.
- **School of Motion, day 1:** a sharper variant of the same, for an audience that has lived it in more detail. Warmest room, most likely to produce the substantive comment the amendment needs.
- **r/ClaudeAI, day 2:** neither of the above. That room has no spec-sheet experience and no stake in motion handoff. Ask where the wall was in their own builds, and put the Cadence answer in the comment: the converters the MCP could not edit, the Script nodes it could not place, the production-only NaN crash the dev server hid for a day.
- **r/webdev or r/Frontend, day 8:** *What has receiving timelines from motion designers been like?* The mirror question, and the one worth asking of engineers. Blunt answers under a post about a tool that addresses that exact handoff are the most useful comments available.
- **LinkedIn, day 14:** *What would you want in a motion token tool?* Open text, not a poll. At this audience size a poll returns a number too small to act on and reads as engagement bait; the text replies are specific enough to quote.

Post the answer to your own question in the replies once a few people have gone first, never in the original post.

### Tagging

Tag an organization only where that organization is the subject. A stack list of mentions reads as spam to the reader and to the classifier, and it dilutes the one mention that could have earned a reshare. Two org mentions per post, maximum, each defensible in a sentence.

- **Rive**, day 7. The highest reshare probability on the list. Per-tile view-model bindings driven through MCP against a single React clock is not something that feed sees often.
- **Anthropic**, day 9. On topic there and nowhere else. The version that gets carried is the methodology piece with the failures in it, which is the register `docs/claude-workflow.md` already holds.
- **School of Motion**, day zero, if the crossover is wanted.
- **Figma**, day 21 only, and only if the file is substantive. Tagging Figma for having used Figma is noise.

Do not tag Vite, Astro, React, or Cloudflare. No org account amplifies a post for naming its build tool, and Astro is invisible to the reader anyway. The stack belongs in the post as plain text, where it does its real job: a credibility signal for the engineer reading, not a distribution lever.

Verify the Framer Motion handle before using it. The library was renamed to Motion and split from Framer as an independent project at motion.dev; tagging Framer the design tool would be a mis-tag in front of the one audience certain to notice. This project's docs still say Framer Motion throughout, which is correct internally and should not reach the post copy.

Hashtags: three to five, at the end. `#designsystems #motiondesign #designengineering #rive`. They do very little now and cost nothing at that volume.

The tagging that moves the actual goal is people, not companies. Twenty direct messages carrying the case-study link, split across days 3 and 13, will outperform every org mention in this section. That channel is the reason the calendar has empty days in it.

## Day zero

- [ ] Publish. Record the exact timestamp and the post permalink in the ledger.
- [ ] End-of-day capture: LinkedIn impressions, reactions, comments, reposts; site unique visitors and page views; export and import counts; stars.

## After launch

**Daily, days 1 through 14** (the curve moves fastest here, then flattens):

- LinkedIn: impressions, reactions, comments, reposts.
- Site: unique visitors, page views, top referrers.
- Tool: export count per format, import count.
- GitHub: stars, forks, issues opened.
- **Comments and inbound:** log anything substantive verbatim with author and date. A design-systems person saying something specific is worth more than every count on this page; ask permission before quoting anyone in the amendment.

**Weekly, weeks 3 through 12:**

- Same metrics, one row per week.
- Confirm the traffic snapshotter ran (check the latest `metrics/traffic.json` commit date). A missed fortnight is unrecoverable.

**Milestone consolidations, for the amendment itself:**

- 48 hours, 1 week, 30 days, 60 days, 90 days: one consolidated row each.

## Data hygiene

- Every number enters the ledger with its capture date and source. No number in the amendment without a ledger row behind it.
- Attribute traffic by trace link, not by referrer. A referrer that arrives stripped is an unknown, and an unknown counted against a channel is a wrong number with a date on it. The trace-link counts are clicks on posted links; direct, search, and word-of-mouth traffic never touches `/l/` and shows up only in the Web Analytics totals. The two numbers answer different questions and do not reconcile; the ledger keeps both.
- Exports are counted as downloads and copies, not uses; say so in the amendment.
- Small numbers stay small. The amendment frames honestly or not at all.

## What the amendment can claim

The loop closing, in order of strength: a person who used a Cadence-tuned token set and said so; an import event (someone round-tripped a set); an export event (a spec left the building); a repeat visitor; a visit. The counts frame the story; the quotes carry it.

## The trace links

One link per channel per destination. The same link goes out every time a channel is used twice; a new channel gets a new slug added to `VISIT_CHANNELS` in `worker/index.js` before it posts. `dm` is the direct-outreach batches.

| Channel | Tool | Case study |
|---|---|---|
| LinkedIn | `cadence.davidpreli.com/l/linkedin` | `cadence.davidpreli.com/l/linkedin-cs` |
| School of Motion | `cadence.davidpreli.com/l/som` | `cadence.davidpreli.com/l/som-cs` |
| r/ClaudeAI | `cadence.davidpreli.com/l/claudeai` | `cadence.davidpreli.com/l/claudeai-cs` |
| Engineer subreddit | `cadence.davidpreli.com/l/webdev` | `cadence.davidpreli.com/l/webdev-cs` |
| Rive community | `cadence.davidpreli.com/l/rive` | `cadence.davidpreli.com/l/rive-cs` |
| Contra | `cadence.davidpreli.com/l/contra` | `cadence.davidpreli.com/l/contra-cs` |
| Direct outreach | `cadence.davidpreli.com/l/dm` | `cadence.davidpreli.com/l/dm-cs` |

Pre-post check clicks and any dry-run clicks land in the counts; the baseline row absorbs them, which is one more reason the baseline capture is not optional.

## The ledger

| Date | Day | LI impressions | LI reactions | LI comments | LI reposts | Uniques | Views | Link clicks (channel) | Exports (fmt) | Imports | Stars | Forks | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | baseline | | | | | | | | | | | | |
| | 0 | | | | | | | | | | | | |
