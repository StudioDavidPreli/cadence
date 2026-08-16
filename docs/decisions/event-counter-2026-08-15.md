# The export/import event counter (2026-08-15)

The pre-launch instrumentation from `docs/case-studies/post-launch-capture.md`: count how many times a token set leaves the tool (export, per format) or returns (import). Anonymous by construction. The counts frame the post-launch amendment; this document records how they are collected, why the storage is what it is, and how to read them back.

## What is collected

One event per action, nothing else:

| Action | Event body |
|---|---|
| Export download (any format) | `{"type":"export","format":"dtcg"\|"json"\|"css"\|"framer-motion"}` |
| Export copy (successful only) | same as download |
| Import (successful only) | `{"type":"import"}` |

No cookies, no identifiers, no session or visitor concept. The Worker never reads the request's IP or headers, and nothing from the body is echoed back. A failed clipboard copy and a failed import validation count nothing: neither put a token set anywhere.

The wire format names differ from the UI's internal keys on purpose: the UI says `flat` and `fm`, the counter says `json` and `framer-motion`, so the report reads without a decoder ring. `EXPORT_EVENT_FORMAT` in `src/components/TokenLab/index.jsx` is the single translation point.

## The pieces

- `worker/index.js`, `handleEvent`: `POST /api/event`. Allowlist validation in the bug-report handler's posture: two types, four formats, 400 for anything else, 405 for non-POST. A format on an import is a 400 too. Junk POSTs polluting the counts would be worse than no counts.
- `src/utils/trackEvent.js`: the client side. Fire-and-forget fetch, `credentials: 'omit'`, `keepalive`, every failure path swallowed. Metrics must never break the tool, in either direction: the Worker catches a failed `writeDataPoint` and still returns 204 (with a `console.error` that Workers observability surfaces in the dashboard's live logs, so a broken binding is loud to us and invisible to the visitor).
- `src/components/TokenLab/index.jsx`: three call sites. `handleExport` after the download, `handleCopy` after the clipboard write resolves, `handleImport` inside the `result.ok` branch.
- `wrangler.jsonc`: the `EVENTS` Analytics Engine binding, dataset `cadence_events`.
- `worker/index.test.js`: the validation matrix and the never-break rule, run through the Worker's real fetch handler.

## Storage: Analytics Engine, not KV

David's call, 2026-08-15, from this tradeoff:

- **Analytics Engine** appends one data point per event. No read-modify-write, so nothing races: launch-day bursts count exactly, and day zero is the day the capture doc calls unrecapturable. On the Workers free plan (100k data points/day included, unbilled as of this writing). The dataset creates itself on the first `writeDataPoint`, so the binding in `wrangler.jsonc` riding the next deploy is the entire setup: zero dashboard clicks, which matters because wrangler is unauthenticated locally. Retention is three months; the capture doc's daily/weekly ledger snapshots carry the numbers past that, and the last milestone is day 90.
- **KV** would show counts as plain numbers in the dashboard's KV browser, but has no atomic increment: two edge locations incrementing in the same window silently lose counts, worst exactly when it matters. It would also need the namespace created in the dashboard and its ID pasted into config before anything worked.
- **Durable Objects** would be exact and dashboard-readable, but a class, a binding, and request routing is a lot of machinery for four counters.

Each data point: `blobs: [type, format]` (format empty for imports), `doubles: [1]`, `indexes: [type]`. The index is the sampling key; at this volume the sample interval stays 1 and `SUM(_sample_interval)` returns exact counts.

## Reading the counts (David, one-time setup)

No setup is needed for writing. Reading goes through the Analytics Engine SQL API, which needs an API token once:

1. Cloudflare dashboard → profile icon (top right) → **My Profile** → **API Tokens** → **Create Token**.
2. **Create Custom Token**. Name it `cadence-analytics-read`. Under Permissions choose **Account** / **Account Analytics** / **Read**. Leave everything else default. **Continue to summary** → **Create Token**.
3. Copy the token somewhere safe (it shows once). Also note the **Account ID** (dashboard → Workers & Pages, right sidebar, or the URL after `dash.cloudflare.com/`).

Then the ledger queries are curl. Export counts per format:

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer API_TOKEN" \
  -d "SELECT blob1 AS type, blob2 AS format, SUM(_sample_interval) AS count FROM cadence_events GROUP BY type, format"
```

Same but limited to the last 7 days, for the weekly ledger row:

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer API_TOKEN" \
  -d "SELECT blob1 AS type, blob2 AS format, SUM(_sample_interval) AS count FROM cadence_events WHERE timestamp > NOW() - INTERVAL '7' DAY GROUP BY type, format"
```

Substitute the account ID and token; the dataset name `cadence_events` is fixed by `wrangler.jsonc`. Until the first event is written the dataset does not exist and the query errors; that is the auto-creation, not a bug.

## Verification (2026-08-15, built output)

`npm run build`, `npx wrangler dev -c dist/cadence/wrangler.json`, real buttons in a browser: all four export downloads, two clipboard copies, one round-trip import (the tool's own DTCG export fed back in, "Import complete"). The Worker log showed exactly 7 valid POSTs and zero write failures; request bodies carried the right type/format per press. Contract checks: 400 on unknown format and on non-JSON, 405 on GET. Unit suite: 16 new tests on the handler, 534 total passing.

One artifact worth recording: the browser's own network log showed every event twice while the server saw each once. `keepalive` fetches are reported by two processes in Chromium's devtools protocol; the duplication is in the observer, not the wire. The server log is the authority.

Miniflare accepts `writeDataPoint` locally but stores nothing queryable, so the counts-actually-in-the-dataset check runs on production after merge: press each export button on the live site, then run the first curl above and watch the counts move. That step is already on the pre-launch checklist in `post-launch-capture.md`.

## Footer disclosure (draft, not placed)

David suggested the footer for a one-line privacy disclosure. Draft, pending his approval and placement:

> Exports and imports are counted anonymously. No cookies, no identifiers.

Not placed in any component; the © line row in the app footer is the likely home when approved.
