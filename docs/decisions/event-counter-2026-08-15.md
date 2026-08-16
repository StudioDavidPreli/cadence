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

## The deploy rejection (2026-08-15, same day)

The zero-dashboard-clicks claim above did not survive contact with the deploy pipeline. The push to main failed the Workers build twice: once on the merge commit, once on a clean empty-commit retry of the identical tree, while every prior commit built green and the same tree builds and serves locally. The only deploy-relevant change was the `analytics_engine_datasets` binding, so the deploy API is rejecting it; the build log is dashboard-only. Likely cause: Analytics Engine needing a one-time enablement on the account.

To keep the pipeline green (a red build means later pushes silently stop deploying), the binding is commented out in `wrangler.jsonc` and everything else shipped. The endpoint runs live with no store: 204s, counts nothing, and logs `event write failed` in the Worker's live logs. Nothing client-side knows the difference.

To finish (David):

1. Open the failed build's log and read the actual error: dashboard → **Workers & Pages** → **cadence** → **Deployments / Builds**, build `baf96e93` (or the direct link in the GitHub check on commit `cdb297d`).
2. If it names Analytics Engine: in the dashboard's account sidebar find **Analytics Engine** (under Workers & Pages / Storage & Databases, naming varies) and complete its enable/setup step. It is free-plan eligible, so this should be a confirmation, not a purchase.
3. Uncomment the `analytics_engine_datasets` block in `wrangler.jsonc`, commit, push. The dataset creates itself on the first event after deploy.

**Resolved same day, in two rounds.** The log confirmed Analytics Engine enablement was the cause (`code: 10089` from the versions API). Round one, creating the `cadence_events` dataset in the dashboard, was not enough: the config-declared binding still deployed into the same 10089, and the enable link in the error just looped back to dataset creation. What actually flipped the account flag was adding the binding manually on the Worker itself: **cadence → Settings → Bindings → Add → Analytics Engine dataset**, variable `EVENTS`, dataset `cadence_events`, the same pair the config declares so the two sides agree. The next build deployed green. So the honest version of the setup story: dataset creation plus one manual binding add on the Worker, once, then config-only from there.

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

## The disclosure (moved to the tool bar, 2026-08-16)

The disclosure went through three homes in two days, each David's call:

1. A footer line beside the © ("Exports and imports are counted anonymously." after his review trimmed a second sentence), left-aligned to the tool bar's labels.
2. Same line, same row, but the footer's balance never sat right.
3. Final: out of the footer entirely, into the Token Lab tool bar as an info glyph on the two section headings whose actions are counted, **Presets** (import lives there) and **Export**.

The glyph is `PrivacyInfoGlyph` in `src/components/TokenLab/index.jsx`: the Principles Library's circled-italic-`i` recipe (copied into TokenLab.module.css; `currentColor` makes it ride the header's theme and hover colors), rendered through `ControlSection`'s new optional `info` prop so the section label stays a string (it doubles as an animation key). Three ways in, covering every input:

- **Hover**: the one-liner as a `HoverTip` dropdown, the house tooltip the preset chips already use.
- **Keyboard**: the glyph is a focusable span with hand-built button semantics (span because it nests inside the sectionHeader `<button>`, and button-in-button is invalid HTML). Focus shows the tooltip (`HoverTip` grew focus/blur support, which the preset chips inherit); Enter or Space opens the modal; its `aria-label` carries the disclosure so a screen reader gets it without opening anything.
- **Click / tap**: a viewport-centered Modal titled **Privacy**, which is what makes the disclosure reachable on touch (a large tablet at ≥720px passes the MobileGate and has no hover). Body: "Exports and imports are counted anonymously. Each event records the format and nothing else: no cookies, no identifiers, no IP address." `stopPropagation` keeps the click from also toggling the section.

Scoping the disclosure to the tool is also more accurate than the footer was: the counter only counts Token Lab actions, and the footer line rode along on the Motion Tiles view where nothing is counted.

David's visual pass (2026-08-16, after an out-of-process push he rightly called out) corrected three things: the glyph's `i` was rendering uppercase because the section header composes `type-eyebrow`, whose `text-transform: uppercase` reached the glyph (reset in `.infoGlyph`, a context the Principles original never sits in); the tooltip grew leftward from the glyph, the wrong side of the pointer near the window's left edge (`HoverTip` gained a `side` prop: preset chips keep the left-growing anchor, the glyph uses `side="right"`); and both the tooltip bubble and the Modal panel moved from `--color-surface-raised` to `--color-bg`, because light mode's raised surface is pure white against the `#f5f5f5` page and read as the wrong white. That last change is app-wide chrome: every modal in every theme now sits on the mode's own ground (dark shifts `#1a1a1a` to `#141414`; both HC themes are unchanged since raised and bg share a value there), with borders and the backdrop dim carrying the separation.
