# The launch trace links (2026-08-17)

The channel-attribution half of the pre-launch instrumentation in `docs/case-studies/post-launch-capture.md`. The posting plan's daily ledger has one column with no reliable source: which channel a visitor came from. This document records why the standard answer (UTM parameters) was dead on arrival here, what shipped instead, and how to read the counts back.

## Why not UTM

Two facts, verified 2026-08-17, killed the conventional approach:

1. **Cloudflare Web Analytics never logs query strings.** A deliberate product decision on their side, to avoid collecting sensitive data. Both domains (the tool's Worker and davidpreli.com, which David confirmed also runs the same beacon) share the blindness, so a `?utm_source=linkedin` tag would ride every link and appear in no dashboard.
2. **The referrer header cannot carry the weight alone.** Most launch traffic arrives through the LinkedIn and Reddit in-app browsers, which strip or mangle the referrer often enough that the unknown bucket could plausibly outweigh any channel row. A number that reads "at least N" fails the capture doc's data-hygiene bar.

Client-side counting (the tool reading `utm_source` and posting to `/api/event`) was considered and declined: it counts only after the bundle downloads and executes, so ad blockers and pre-load bounces produce an unmeasurable undercount, and it does nothing for the case study, which lives on a domain with no Worker.

## What shipped

`GET /l/<channel>` on the tool's Worker (`handleVisitLink` in `worker/index.js`). The channel name rides in the path, where nothing can strip it. The Worker writes one data point to the same `cadence_events` Analytics Engine dataset as the export counter, then answers 302: bare slug to `/`, `-cs` suffix to `https://davidpreli.com/cadence`. The case study's counting lives on the tool's Worker because a redirect can point anywhere; the Astro site needed no changes.

The count happens server-side, before any page loads. Nothing client-side can prevent the row.

Channels: `linkedin`, `som`, `claudeai`, `webdev`, `rive`, `contra`, `dm` (`VISIT_CHANNELS`, allowlist-only in the event counter's posture). Fourteen links total; the full table is in the capture doc's ledger notes. A new channel is one array entry, committed before the post goes out.

Data point shape, matching the export counter's so one SQL grammar reads both: `blobs: ['visit', channel, 'tool' | 'case-study']`, `doubles: [1]`, `indexes: ['visit']`.

## Four choices worth recording

- **302, never 301.** Browsers cache a 301 permanently; a repeat click would skip the Worker and go uncounted. `Cache-Control: no-store` on the response aims the same rule at intermediaries.
- **Link-preview crawlers are not visits.** When LinkedIn or Reddit unfurls a posted link, their bot fetches it first; uncounted, or day zero starts with phantom rows. The user-agent is tested against a small pattern (`bot|crawl|spider|preview|facebookexternalhit`) and dropped, never stored. This is the one place the Worker reads a request header, and it narrows rather than widens what is collected, so the event counter's no-identifiers posture holds. Crawlers still get the redirect, so previews unfurl from the destination page's real metadata.
- **An unknown slug redirects home uncounted.** A typo'd link in a published post must not strand a stranger on a dead page. The pre-flight click on every link before posting is what catches the typo; the branch keeps it from costing a visitor. An unknown `-cs` slug also goes home, not to the case study: a typo has already forfeited its count, and home is the safer landing.
- **HEAD and non-GET redirect uncounted.** Only a plain GET from a non-crawler is a click.

`run_worker_first` in `wrangler.jsonc` gained `/l/*`; without it the asset layer answers first and the SPA fallback serves index.html instead of the redirect.

## Reading the counts

Same SQL API and token as the export counter (setup steps in `docs/decisions/event-counter-2026-08-15.md`). The per-channel ledger row:

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer API_TOKEN" \
  -d "SELECT blob2 AS channel, blob3 AS destination, SUM(_sample_interval) AS clicks FROM cadence_events WHERE blob1 = 'visit' GROUP BY channel, destination"
```

The existing export/import query is unaffected: its rows carry `blob1` of `export` or `import`, and the `WHERE` clauses keep the two families apart.

Two numbers, two questions. Trace-link counts are clicks on posted links; Web Analytics totals include direct, search, and word of mouth, which never touch `/l/`. They do not reconcile and are not supposed to; the ledger keeps both.

## Verification (2026-08-17, built output)

Unit: 12 new contract tests through the Worker's real fetch handler (count-and-redirect per channel, `-cs` destination and blob, unknown slug home uncounted, four crawler user-agents uncounted, HEAD uncounted, write-throws and binding-absent still redirect). 33 pass in `worker/index.test.js`.

Built output: `npm run build`, `npx wrangler dev -c dist/cadence/wrangler.json`, curl against every slug: eight known slugs 302 to `/`, `linkedin-cs` 302 to the case study URL, `typo` and `typo-cs` 302 home, a `LinkedInBot/1.0` user-agent still redirected, `/api/event` still 204s, the SPA still serves. The built `wrangler.json` carried the new `run_worker_first` entry through the Vite plugin, which was the specific thing this check existed to catch.

Miniflare stores nothing queryable, so the counts-in-the-dataset check runs on production after merge: click each of the fourteen links once, run the SQL query, expect fourteen rows of one. Those clicks land before the baseline capture and are absorbed by it.
