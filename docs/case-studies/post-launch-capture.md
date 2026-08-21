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

- [ ] **Every destination surface finished.** Contra project live, portfolio integration done, LinkedIn Featured section pointing at the tool and the case study, repo README current, the four hosted case-study pages reachable from the index. These are where a stranger lands after a post, and day zero is the day the most strangers will ever look up the name at once. None of them belong on the posting calendar; a half-built profile found on day zero cannot be un-found. Progress 2026-08-17: portfolio integration and README done, both OG cards verified (they share one thumbnail image, worth splitting before the Featured section shows them side by side). Contra live 2026-08-18. Featured remains.

**The day before:**

- [ ] **Baseline capture.** Stars, forks, watchers; any existing site traffic; the zero state of the event counters. Enter the baseline row in the ledger below. Screenshot the GitHub traffic graphs as backup.

## The posting plan

Day zero is a Tuesday. The weekday anchors carry more weight than the day numbers: Tuesday morning is the strongest LinkedIn slot, Friday the weakest, and the second Tuesday is where the case study lands. If the calendar slips, slip it a week, not a day.

**Day zero is set: Tuesday 2026-08-18** (David, decided 2026-08-18). Every day number in the table counts from this date. **Actual publish: 9:34 AM Eastern.** The 9:15 scheduled post failed on link format: LinkedIn's scheduler rejects scheme-less URLs, so every link in a post must be written complete, `https://` included. The trace-link table below now carries the full spelling; paste from it, never retype. A second suspected factor (unconfirmed): the Vimeo video's embed-domain restriction, which would block any surface embedding the player rather than hosting a native upload. Lesson either way, found 2026-08-18: the video's embed allowlist is a pre-flight item; every posting surface that embeds the player must be allowed (the case-study page at davidpreli.com embeds it, confirmed), or the setting goes to Anywhere and the class of failure disappears.

| Day | Weekday | Channel | What |
|---|---|---|---|
| 0 | Tue | LinkedIn | Launch. Native video upload, captions burned in. Tool link and case-study link both in the body. |
| 1 | Wed | School of Motion Circle | Short overview, tool link. |
| 2 | Thu | r/ClaudeAI | POSTPONED (2026-08: Reddit gates new accounts on account age / time-in-community, and the account is brand new). Post when unlocked; draft holds. Interim: participate genuinely in the target subs, which ages the account and gives the eventual post a human posting history. |
| 2 | Thu | LinkedIn | Native-video post, motion-design angle, 9:15 AM, posted by hand, never scheduled (added 2026-08-18: the launch post shipped without its video; draft final in `~/Desktop/cadenceLaunch/posts/linkedin-day2-video.md`). |
| 3 | Fri | Rive community | The tile work as the subject. First direct-outreach batch, ten messages. |
| 4-5 | Sat/Sun | none | Monitor, reply. |
| 6 | Mon | none | Reply day. |
| 7 | Tue | LinkedIn | Case study: The Token System, Fields and Canvas. Tag Rive. |
| 8 | Wed | r/webdev or r/Frontend | POSTPONED, same Reddit account gates as day 2. Post when unlocked. |
| 9 | Thu | none | Reply day. |
| 10 | Fri | none | Reply day. |
| 11-12 | Sat/Sun | none | Monitor. |
| 13 | Mon | none | Reply day. Second outreach batch. |
| 14 | Tue | LinkedIn | Case study: Working with Claude. Tag Anthropic. (Moved from day 9, 2026-08-18: the day-2 video insertion made five posts in two weeks, so the schedule takes a third week instead.) |
| 16 | Thu | LinkedIn | The open question, below. Soft signal for v2. |
| 21 | Tue | LinkedIn | Figma design-system file, if it exists by then. Tag Figma. |
| 30 | | all | Amendment round, per the top of this document. |

Two LinkedIn posts in any seven-day window is the ceiling on one subject; past that each post reaches fewer people than the last, and the case-study posts are the two that have to travel. The day-2 video insertion broke the original four-in-fourteen plan, so the calendar runs three weeks instead (reset 2026-08-18): Tuesdays anchor, Thursdays are the only second slot.

Replies are same-day, every day, not a task at the end. On LinkedIn the first sixty to ninety minutes of replies decide whether a post keeps distributing. Days 6, 10 and 13 exist to keep that habit from competing with a publish.

The Figma file is off the launch calendar on purpose. It was not started as of 2026-08-16, and an unbuilt deliverable scheduled inside a window where a slip is publicly visible is the item most likely to break the cadence. It ships on its own Tuesday or it waits.

### The questions, matched to their audience

Each channel gets one question, and it has to be a question that channel can actually answer.

- **LinkedIn, day zero:** *How has handing off motion spec sheets to engineers gone for you?* This is the thesis stated as a question. It presupposes the problem without claiming to have solved it, and the audience skews motion and agency, so it will land. The answers give the day 7 post something to point back at.
- **School of Motion, day 1:** a sharper variant of the same, for an audience that has lived it in more detail. Warmest room, most likely to produce the substantive comment the amendment needs.
- **r/ClaudeAI, day 2:** neither of the above. That room has no spec-sheet experience and no stake in motion handoff. Ask where the wall was in their own builds, and put the Cadence answer in the comment: the converters the MCP could not edit, the Script nodes it could not place, the production-only NaN crash the dev server hid for a day.
- **r/webdev or r/Frontend, day 8:** *What has receiving timelines from motion designers been like?* The mirror question, and the one worth asking of engineers. Blunt answers under a post about a tool that addresses that exact handoff are the most useful comments available.
- **LinkedIn, day 16:** *What would you want in a motion token tool?* Open text, not a poll. At this audience size a poll returns a number too small to act on and reads as engagement bait; the text replies are specific enough to quote.

Post the answer to your own question in the replies once a few people have gone first, never in the original post.

### Tagging

Tag an organization only where that organization is the subject. A stack list of mentions reads as spam to the reader and to the classifier, and it dilutes the one mention that could have earned a reshare. Two org mentions per post, maximum, each defensible in a sentence.

- **Rive**, day 7. The highest reshare probability on the list. Per-tile view-model bindings driven through MCP against a single React clock is not something that feed sees often.
- **Anthropic**, day 14. On topic there and nowhere else. The version that gets carried is the methodology piece with the failures in it, which is the register `docs/claude-workflow.md` already holds.
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
| LinkedIn | `https://cadence.davidpreli.com/l/linkedin` | `https://cadence.davidpreli.com/l/linkedin-cs` |
| School of Motion | `https://cadence.davidpreli.com/l/som` | `https://cadence.davidpreli.com/l/som-cs` |
| r/ClaudeAI | `https://cadence.davidpreli.com/l/claudeai` | `https://cadence.davidpreli.com/l/claudeai-cs` |
| Engineer subreddit | `https://cadence.davidpreli.com/l/webdev` | `https://cadence.davidpreli.com/l/webdev-cs` |
| Rive community | `https://cadence.davidpreli.com/l/rive` | `https://cadence.davidpreli.com/l/rive-cs` |
| Contra | `https://cadence.davidpreli.com/l/contra` | `https://cadence.davidpreli.com/l/contra-cs` |
| Direct outreach | `https://cadence.davidpreli.com/l/dm` | `https://cadence.davidpreli.com/l/dm-cs` |
| LinkedIn Featured (profile) | `https://cadence.davidpreli.com/l/featured` | `https://cadence.davidpreli.com/l/featured-cs` |

Pre-post check clicks and any dry-run clicks land in the counts; the baseline row absorbs them, which is one more reason the baseline capture is not optional.

**Typo incident, found 2026-08-19:** the live Contra post carried `cadcadence.davidpreli.com/l/contra-cs` (hostname retyped at entry rather than pasted; the draft file was correct). Every case-study click from Contra between publish and the fix hit a dead hostname: uncounted, and worse, a dead end for the visitor. Fix: Contra project posts are NOT editable after publish (checked by David against the live product 2026-08-19; an edit-in-place fix was wrongly assumed possible at first), so the post was deleted and reposted with the correct link. The `cadcadence.davidpreli.com` custom-domain alias on the cadence Worker remains the net for anyone who copied the typo'd URL from the original post (same Worker, same counting, same redirect). Contra `-cs` counts before the fix are an undercount; the ledger reads them accordingly. Second confirmation of the paste-never-retype rule.

## The ledger

| Date | Day | LI impressions | LI reactions | LI comments | LI reposts | Uniques | Views | Link clicks (channel) | Exports (fmt) | Imports | Stars | Forks | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-08-17 | baseline | 0 | 0 | 0 | 0 | 19 | 7 | 16 (rive/tool 2, claudeai/cs 2, rest 1) | 1 | 1 | 0 | 0 | Pre-launch test clicks; subtract this row from day-0 totals. The two featured-card test clicks (2026-08-18) never counted: clicked in the minutes before the channel's deploy went live, so the old Worker dropped them as an unknown slug. Featured baseline is zero. Visits (19) exceeds views (7): read over different time ranges; day-0 capture reads both from one range. |
| 2026-08-18 | 0 | 526 | 4 | 1 | 0 | 22 | | 22 net (SoM 16: tool 11 / cs 5; Contra 3; LinkedIn 3, likely self-clicks during the 9:15 failure scramble, David not concerned) | | | 0 | 0 | LI members reached: 285. davidpreli.com: 231 uniques (VERIFY RANGE: if that is a 30-day read it includes pre-launch ambient traffic; portfolio baseline never captured). Vimeo: 18 plays, 17 unique viewers, 173 player impressions. Published 9:34 AM ET: linkedin.com/posts/davidpreli_designsystems-motiondesign-designengineering-share-7495472968685207552-jlSm. Body carries plain site URLs; the trace links did not survive the scheduler. LinkedIn-channel clicks for this post are therefore not counted in `l/linkedin`: read the launch post as analytics totals minus the tagged channels, corroborated by the linkedin.com referrer row. Featured-card trace links unaffected. Post shipped without the native video; its link card leads to the case study, which opens on the working Vimeo embed. Native-video LinkedIn post inserted day 2. SoM Circle post went live day 0 (ahead of its day-1 slot), video embed playing. |
