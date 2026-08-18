// Cloudflare Worker: bug-report endpoint, event counter + static-asset server.
//
// Why a Worker and not a Pages Function: the Cloudflare project backing this
// repo is a Worker with static assets, not a Pages project, so the Pages-only
// `functions/` convention is ignored here. Pages routed by filename
// (functions/api/bug-report.js) and by export name (onRequestPost handled POST);
// a Worker instead owns every non-asset request and dispatches them itself. So
// the path match and method check that Pages performed implicitly are explicit
// below — including the 405 branch, which is new for exactly that reason (Pages
// returned 405 on its own when a non-POST request hit an onRequestPost handler).
//
// The request guards, honeypot, and GitHub call are unchanged from the former
// functions/api/bug-report.js. GH_TOKEN (a fine-grained PAT scoped to this repo,
// Issues: read & write) is a dashboard secret; GH_REPO ("owner/name") is a
// plaintext var in wrangler.jsonc. David's email never appears client-side.

async function handleBugReport(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { message, tile, website } = body;

  // Honeypot: real form leaves this empty, bots fill it. Drop silently.
  if (website) return new Response(null, { status: 204 });

  // Reject missing, non-string, whitespace-only, or over-long messages. The
  // trim check closes the gap where a spaces-only body passed the bare !message
  // guard; the typeof check keeps .trim() from throwing on a non-string payload.
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
    return new Response('Bad request', { status: 400 });
  }

  const res = await fetch(`https://api.github.com/repos/${env.GH_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'cadence-bug-report',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Bug report: ${tile || 'Motion Tiles'}`,
      body: message,
      labels: ['bug-report'],
    }),
  });

  if (!res.ok) return new Response('Upstream error', { status: 502 });
  return new Response(null, { status: 204 });
}

// POST /api/event: the anonymous export/import counter behind the post-launch
// report (docs/decisions/event-counter-2026-08-15.md). One Analytics Engine
// data point per event, nothing else: no cookies, no identifiers, and the
// request's IP and headers are never read. Analytics Engine over KV because a
// data point is an append (no read-modify-write to race under launch-day
// bursts, which KV increments would silently lose); the dataset creates itself
// on first write, so the binding in wrangler.jsonc is the whole setup.
//
// Validation is allowlist-only, same posture as the bug report above: two
// event types, four export formats, 400 for everything else. A format on an
// import is rejected too; letting unknown shapes through would let junk POSTs
// pollute the counts the report is built on. Nothing from the body is ever
// echoed back.

const EVENT_TYPES = ['export', 'import'];
const EXPORT_FORMATS = ['dtcg', 'json', 'css', 'framer-motion'];

async function handleEvent(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { type, format } = body;

  if (!EVENT_TYPES.includes(type)) {
    return new Response('Bad request', { status: 400 });
  }
  // Format is required on export (a per-format count is the whole point) and
  // must be absent on import (there is only one import path).
  if (type === 'export' && !EXPORT_FORMATS.includes(format)) {
    return new Response('Bad request', { status: 400 });
  }
  if (type === 'import' && format !== undefined) {
    return new Response('Bad request', { status: 400 });
  }

  // A metrics failure must never surface to the tool: the client fires and
  // forgets, and this catch keeps the server side to the same rule. The
  // console.error is not dead weight, observability.enabled in wrangler.jsonc
  // captures it in the dashboard's live logs, so a broken binding is loud to
  // us and invisible to the visitor.
  try {
    env.EVENTS.writeDataPoint({
      blobs: [type, type === 'export' ? format : ''],
      doubles: [1],
      indexes: [type],
    });
  } catch (err) {
    console.error('event write failed:', err);
  }
  return new Response(null, { status: 204 });
}

// GET /l/<channel> and /l/<channel>-cs: the launch trace links
// (docs/decisions/trace-links-2026-08-17.md). Cloudflare Web Analytics never
// logs query strings, so ?utm_source= tags are invisible on both domains; and
// the referrer header is stripped often enough by the LinkedIn and Reddit
// in-app browsers that channel attribution can't ride on it. So the channel
// name rides in the path instead, the Worker writes one visit data point to
// the same Analytics Engine dataset as the export counter, and the visitor is
// redirected on: bare slug to the tool, -cs suffix to the case study on
// davidpreli.com (which has no Worker of its own, so its counting lives here).
//
// The count happens server-side before any page loads. Nothing client-side
// (ad blockers, a bounce before the bundle runs) can prevent the row.
//
// Three deliberate choices:
// - 302, never 301. Browsers cache a 301 permanently, so a repeat click would
//   skip the Worker and go uncounted. Cache-Control: no-store for the same
//   reason, aimed at intermediaries.
// - Link-preview crawlers are not visits. When LinkedIn or Reddit unfurls a
//   posted link, their bot fetches it; without the guard, day zero starts
//   with phantom rows. This is the one place the Worker reads a request
//   header: the user-agent is tested and dropped, never stored, which keeps
//   the event counter's no-identifiers posture. Crawlers still get the
//   redirect so the preview unfurls from the real page.
// - An unknown slug (a typo'd link in a post) redirects home uncounted rather
//   than 404ing: a stranger's first impression must never be a dead page.
//   The pre-flight step of clicking every link before posting is what catches
//   the typo; this branch just keeps it from costing a visitor.

// 'featured' is the LinkedIn Featured section: profile-driven clicks (someone
// looking the profile up), kept separate from 'linkedin' (feed clicks on posts).
const VISIT_CHANNELS = ['linkedin', 'som', 'claudeai', 'webdev', 'rive', 'contra', 'dm', 'featured'];
// Trailing slash matters: the bare path answers a 308 to add it, so this
// spelling saves every case-study click a second redirect hop.
const CASE_STUDY_URL = 'https://davidpreli.com/cadence/';

function handleVisitLink(request, env, slug) {
  const toCaseStudy = slug.endsWith('-cs');
  const channel = toCaseStudy ? slug.slice(0, -3) : slug;
  const known = VISIT_CHANNELS.includes(channel);

  const ua = request.headers.get('user-agent') || '';
  const isCrawler = /bot|crawl|spider|preview|facebookexternalhit/i.test(ua);

  if (known && request.method === 'GET' && !isCrawler) {
    // Same never-break rule as handleEvent: a metrics failure logs for us and
    // stays invisible to the visitor, who gets the redirect regardless.
    try {
      env.EVENTS.writeDataPoint({
        blobs: ['visit', channel, toCaseStudy ? 'case-study' : 'tool'],
        doubles: [1],
        indexes: ['visit'],
      });
    } catch (err) {
      console.error('visit write failed:', err);
    }
  }

  const dest =
    known && toCaseStudy ? CASE_STUDY_URL : new URL('/', request.url).toString();
  return new Response(null, {
    status: 302,
    headers: { Location: dest, 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/l/')) {
      return handleVisitLink(request, env, url.pathname.slice(3));
    }
    if (url.pathname === '/api/bug-report') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      return handleBugReport(request, env);
    }
    if (url.pathname === '/api/event') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      return handleEvent(request, env);
    }
    // Response headers on pages (the frame-ancestors policy for the principle
    // embed) do NOT live here: wrangler.jsonc scopes run_worker_first to
    // /api/*, so the asset layer answers every page request before this worker
    // runs. They live in public/_headers, which the Workers asset server
    // applies itself. (David's spec, 2026-07-31.)
    return env.ASSETS.fetch(request);
  },
};
