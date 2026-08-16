# Post-Launch Capture

The operating checklist for the post-launch amendment. The case study stands on design, method, and build; this document exists so that, when the amendment is written, every number in it has a date, a source, and a denominator. Day zero is the LinkedIn post date. Nothing here is published; the amendment is.

The amendment gets its own posting round when it lands. Target: first update at 30 days, then 60, then 90.

---

## Before launch

**One week out, or earlier:**

- [x] **Enable Cloudflare Web Analytics** on the Worker (dashboard, Analytics tab). Free, cookie-less, no consent banner. Verify the beacon appears on production by viewing source. This must be live before the post goes out; day one is the biggest day and cannot be recaptured.
- [x] **Build and deploy the export/import event counter** (`/api/event`). Separate app-code session; the prompt is queued. Verify end-to-end on built output before launch: press each export button on production, watch the counts move.
- [x] **Stand up the GitHub traffic snapshotter.** The traffic API (clones, views, referrers) retains only 14 days, so unsnapshotted weeks are gone forever. A scheduled GitHub Action on a weekly cron, committing `metrics/traffic.json` to the repo, is enough. Run it once manually to confirm the file lands.
- [ ] **Decide the posting plan.** Which channels beyond LinkedIn, in what order, and the exact posting time. Day zero must be unambiguous for every later denominator.

**The day before:**

- [ ] **Baseline capture.** Stars, forks, watchers; any existing site traffic; the zero state of the event counters. Enter the baseline row in the ledger below. Screenshot the GitHub traffic graphs as backup.

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
- Exports are counted as downloads and copies, not uses; say so in the amendment.
- Small numbers stay small. The amendment frames honestly or not at all.

## What the amendment can claim

The loop closing, in order of strength: a person who used a Cadence-tuned token set and said so; an import event (someone round-tripped a set); an export event (a spec left the building); a repeat visitor; a visit. The counts frame the story; the quotes carry it.

## The ledger

| Date | Day | LI impressions | LI reactions | LI comments | LI reposts | Uniques | Views | Exports (fmt) | Imports | Stars | Forks | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | baseline | | | | | | | | | | | |
| | 0 | | | | | | | | | | | |
