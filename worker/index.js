// Cloudflare Worker: bug-report endpoint + static-asset server.
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/bug-report') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      return handleBugReport(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
